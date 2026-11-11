"""Yöntem Güvenlik birimi — siber saldırılara karşı savunma araçları.

JavaScript sürümüyle (js/src/calisma/guvenlik.ts) birebir aynı davranır ve aynı çıktıyı üretir.
SHA-256, HMAC ve PBKDF2 için Python'un hashlib/hmac modülleri, rastgelelik için 'secrets'
kullanılır. ChaCha20-Poly1305 (RFC 8439) standart kitaplıkta olmadığından burada saf Python ile
yazılmıştır; JavaScript sürümünün ürettiği şifreli metinler burada çözülebilir, tersi de geçerlidir.
"""
import base64
import binascii
import hashlib
import hmac as _hmac
import math
import re
import secrets
import time

from .hatalar import YontemHatasi
from .pencere import _yf

VARSAYILAN_TEKRAR = 210000
YAYGIN = {'123456', '12345678', '123456789', '1234567890', 'password', 'password1', 'qwerty', 'qwerty123',
          'parola', 'parola123', 'sifre', 'şifre', 'sifre123', 'şifre123', 'admin', 'admin123', 'letmein', 'welcome',
          'iloveyou', 'abc123', '111111', '000000', 'galatasaray', 'fenerbahce', 'fenerbahçe', 'besiktas', 'beşiktaş',
          'trabzonspor', 'istanbul', 'ankara', 'türkiye', 'turkiye', 'yontem', 'yöntem'}


def _tur_adi(v):
    from .yorumlayici import tur_adi
    return tur_adi(v)


def _hata(m):
    raise YontemHatasi(m)


def _metin_mi(v, ad):
    if type(v) is not str:
        _hata(f"'{ad}' metin bekler, {_tur_adi(v)} verildi")
    return v


def _tamsayi(v, ad, en_az, en_cok):
    if type(v) is not int:
        _hata(f"'{ad}' tamsayı bekler, {_tur_adi(v)} verildi")
    if v < en_az or v > en_cok:
        _hata(f"'{ad}' {en_az} ile {en_cok} arasında olmalı, {v} verildi")
    return v


def _sayi(v, ad):
    if type(v) in (int, float):
        return float(v)
    _hata(f"'{ad}' sayı bekler, {_tur_adi(v)} verildi")


def _utf8(s):
    return s.encode('utf-8', 'surrogatepass')


def _utf8_coz(b, ad):
    try:
        return b.decode('utf-8')
    except UnicodeDecodeError:
        _hata(f"'{ad}': çözülen veri geçerli UTF-8 metin değil")


def _b64url(b):
    return base64.urlsafe_b64encode(b).decode('ascii').rstrip('=')


def _b64url_coz(s, ad):
    if not re.fullmatch(r'[A-Za-z0-9_-]*', s) or len(s) % 4 == 1:
        _hata(f"'{ad}' geçerli Base64 metin bekler")
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def _sabit_esit(a, b):
    return _hmac.compare_digest(a, b)


def _sha256(b):
    return hashlib.sha256(b).digest()


def _hmac256(k, m):
    return _hmac.new(k, m, hashlib.sha256).digest()


# ---------------------------------------------------------------- ChaCha20-Poly1305 (RFC 8439)
_M32 = 0xffffffff


def _chacha_blok(k, sayac, n):
    s = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574] + k + [sayac & _M32] + n
    x = list(s)

    def q(a, b, c, d):
        x[a] = (x[a] + x[b]) & _M32; x[d] ^= x[a]; x[d] = ((x[d] << 16) | (x[d] >> 16)) & _M32
        x[c] = (x[c] + x[d]) & _M32; x[b] ^= x[c]; x[b] = ((x[b] << 12) | (x[b] >> 20)) & _M32
        x[a] = (x[a] + x[b]) & _M32; x[d] ^= x[a]; x[d] = ((x[d] << 8) | (x[d] >> 24)) & _M32
        x[c] = (x[c] + x[d]) & _M32; x[b] ^= x[c]; x[b] = ((x[b] << 7) | (x[b] >> 25)) & _M32
    for _ in range(10):
        q(0, 4, 8, 12); q(1, 5, 9, 13); q(2, 6, 10, 14); q(3, 7, 11, 15)
        q(0, 5, 10, 15); q(1, 6, 11, 12); q(2, 7, 8, 13); q(3, 4, 9, 14)
    return b''.join(((x[i] + s[i]) & _M32).to_bytes(4, 'little') for i in range(16))


def _kelimeler(b):
    return [int.from_bytes(b[i:i + 4], 'little') for i in range(0, len(b), 4)]


def chacha20(anahtar, sayac, nonce, veri):
    k, n = _kelimeler(anahtar), _kelimeler(nonce)
    out = bytearray(len(veri))
    for o in range(0, len(veri), 64):
        ks = _chacha_blok(k, sayac, n)
        sayac += 1
        parca = veri[o:o + 64]
        out[o:o + len(parca)] = bytes(a ^ b for a, b in zip(parca, ks))
    return bytes(out)


def poly1305(anahtar, ileti):
    r = int.from_bytes(anahtar[:16], 'little') & 0x0ffffffc0ffffffc0ffffffc0fffffff
    s = int.from_bytes(anahtar[16:32], 'little')
    p = (1 << 130) - 5
    acc = 0
    for i in range(0, len(ileti), 16):
        parca = ileti[i:i + 16]
        acc = ((acc + int.from_bytes(parca, 'little') + (1 << (8 * len(parca)))) * r) % p
    return ((acc + s) & ((1 << 128) - 1)).to_bytes(16, 'little')


def _aead_etiket(k, nonce, aad, c):
    pk = chacha20(k, 0, nonce, bytes(32))

    def dolgu(n):
        return bytes((16 - n % 16) % 16)
    return poly1305(pk, aad + dolgu(len(aad)) + c + dolgu(len(c)) +
                    len(aad).to_bytes(8, 'little') + len(c).to_bytes(8, 'little'))


def aead_sifrele(k, nonce, acik, aad=b''):
    c = chacha20(k, 1, nonce, acik)
    return c + _aead_etiket(k, nonce, aad, c)


def aead_coz(k, nonce, veri, aad=b''):
    if len(veri) < 16:
        return None
    c, etiket = veri[:-16], veri[-16:]
    if not _sabit_esit(_aead_etiket(k, nonce, aad, c), etiket):
        return None
    return chacha20(k, 1, nonce, c)


# ---------------------------------------------------------------- yardımcı denetimler
def _kucuk(c):
    return c != c.upper() and c == c.lower()


def _buyuk(c):
    return c != c.lower() and c == c.upper()


def _rakam(c):
    return '0' <= c <= '9'


def _simge(c):
    return not _kucuk(c) and not _buyuk(c) and not _rakam(c) and c.lower() == c.upper()


def _tr_kucuk(s):
    return s.replace('İ', 'i').replace('I', 'ı').lower()


def parola_sorunlari(p):
    s = []
    n = len(p)
    if n < 8:
        s.append('en az 8 karakter olmalı')
    elif n < 12:
        s.append('12 karakter ya da daha uzun olması önerilir')
    if _tr_kucuk(p) in YAYGIN:
        s.append('çok yaygın bir parola')
    if p and all(c == p[0] for c in p):
        s.append('tek bir karakterin tekrarı')
    if not any(_kucuk(c) for c in p):
        s.append('küçük harf yok')
    if not any(_buyuk(c) for c in p):
        s.append('büyük harf yok')
    if not any(_rakam(c) for c in p):
        s.append('rakam yok')
    if not any(_simge(c) for c in p):
        s.append('simge yok')
    return s


def parola_gucu(p):
    if len(p) < 8 or _tr_kucuk(p) in YAYGIN or all(c == p[0] for c in p):
        return 0
    sinif = sum([any(_kucuk(c) for c in p), any(_buyuk(c) for c in p), any(_rakam(c) for c in p),
                 any(_simge(c) for c in p)])
    g = 1
    if len(p) >= 12:
        g += 1
    if sinif >= 3:
        g += 1
    if len(p) >= 16 and sinif >= 2:
        g += 1
    return min(4, g)


def _parola_kaydi(kayit):
    p = kayit.split('$')
    if len(p) != 4 or p[0] != 'pbkdf2-sha256' or not re.fullmatch(r'[0-9]{1,8}', p[1]):
        return None
    tekrar = int(p[1])
    if tekrar < 1000 or not re.fullmatch(r'(?:[0-9a-f]{2})+', p[2]) or not re.fullmatch(r'[0-9a-f]{64}', p[3]):
        return None
    return tekrar, bytes.fromhex(p[2]), bytes.fromhex(p[3])


def _anahtar(a, ad):
    s = _metin_mi(a, ad)
    if not re.fullmatch(r'[0-9a-fA-F]{64}', s):
        _hata(f"'{ad}' 64 onaltılık karakterlik (256 bit) bir anahtar bekler; 'AnahtarÜret' ya da 'ParoladanAnahtar' ile üret")
    return bytes.fromhex(s)


def yol_guvenli(yol):
    if not yol or '\0' in yol or yol.startswith('/') or yol.startswith('\\') or re.match(r'[A-Za-z]:', yol):
        return False
    if re.search(r'%2e|%2f|%5c|%00', yol, re.I):
        return False
    return not any(p == '..' for p in re.split(r'[\\/]', yol))


_KADI = re.compile(r'^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$')


def dosya_adi_temizle(ad):
    parca = re.split(r'[\\/]', ad)[-1]
    s = ''.join(c if (c.isalnum() or c in '._- ') else '_' for c in parca)
    s = re.sub(r'^[. ]+', '', s)
    s = re.sub(r'[. ]+$', '', s)
    s = re.sub(r'_{2,}', '_', s)
    if len(s) > 100:
        s = s[:100]
    if _KADI.match(s.split('.')[0].upper()):
        s = '_' + s
    return s or 'dosya'


_EPOSTA = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?'
                     r'(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}')


def eposta_gecerli(s):
    if len(s) > 254 or not _EPOSTA.fullmatch(s):
        return False
    yerel = s.split('@')[0]
    return len(yerel) <= 64 and not yerel.startswith('.') and not yerel.endswith('.') and '..' not in yerel


def url_guvenli(s):
    t = s.strip(' \t\n\r\f\v')
    if re.search(r'[\x00-\x1f\s]', t):
        return False
    if t.startswith('/'):
        return not t.startswith('//') and not t.startswith('/\\')
    return bool(re.match(r'https?://[^\s/?#@]+', t, re.I)) and not re.match(r'https?://[^/?#]*@', t, re.I)


def _gunluk_metni(s):
    s = s.replace('\\', '\\\\').replace('\r', '\\r').replace('\n', '\\n')
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', lambda m: '\\x%02x' % ord(m.group()), s)


# ---------------------------------------------------------------- Sınırlayıcı nesnesi
class Sinirlayici:
    TUR_ADI = 'Sınırlayıcı'

    def __init__(self, durum, en_cok, sure, sure_ham):
        self.d = durum
        self.en_cok = en_cok
        self.sure = sure
        self.sure_ham = sure_ham
        self.kayit = {}

    def _temizle(self, a):
        t = self.d['simdi']()
        l = [z for z in self.kayit.get(a, []) if z > t - self.sure]
        if l:
            self.kayit[a] = l
        else:
            self.kayit.pop(a, None)
        return l

    def k_al(self, ad, y):
        metne = y.metne
        if ad in ('enfazla', 'encok'):
            return self.en_cok
        if ad == 'sure':
            return self.sure_ham
        if ad == 'izinver':
            def izin(a):
                k = metne(a)
                l = self._temizle(k)
                if len(l) >= self.en_cok:
                    return False
                l.append(self.d['simdi']())
                self.kayit[k] = l
                return True
            return _yf('İzinVer', 1, 1, izin)
        if ad == 'kalan':
            return _yf('Kalan', 1, 1, lambda a: max(0, self.en_cok - len(self._temizle(metne(a)))))
        if ad == 'bekleme':
            def bekle(a):
                l = self._temizle(metne(a))
                if len(l) < self.en_cok:
                    return 0
                return max(0, math.ceil(l[len(l) - self.en_cok] + self.sure - self.d['simdi']()))
            return _yf('Bekleme', 1, 1, bekle)
        if ad == 'sifirla':
            def sifirla(a):
                self.kayit.pop(metne(a), None)
            return _yf('Sıfırla', 1, 1, sifirla)
        _hata(f"Sınırlayıcı nesnesinde '{ad}' üyesi yok")

    def k_ata(self, ad, v, y):
        _hata(f"Sınırlayıcı nesnesinin '{ad}' üyesine atama yapılamaz")

    def __str__(self):
        return f'Sınırlayıcı({self.en_cok} / {self.d["metne"](self.sure_ham)} sn)'


# ---------------------------------------------------------------- birim
def guvenlik_modulu(y):
    from .sozcuk import katla
    metne = y.metne
    d = {'benzetim': None, 'gunluk': [], 'metne': metne}
    d['simdi'] = lambda: d['benzetim'] if d['benzetim'] is not None else time.time()
    U = {}

    def uye(ad, en_az, en_cok, oto=False):
        def sar(f):
            U[katla(ad)] = _yf(ad, en_az, en_cok, f, oto)
            return f
        return sar

    # ---- bütünlük
    @uye('Özet', 1, 1)
    def _ozet(m):
        return _sha256(_utf8(metne(m))).hex()

    @uye('İmza', 2, 2)
    def _imza(a, m):
        return _hmac256(_utf8(_metin_mi(a, 'anahtar')), _utf8(metne(m))).hex()

    @uye('İmzaDoğru', 3, 3)
    def _imza_dogru(a, m, i):
        beklenen = _hmac256(_utf8(_metin_mi(a, 'anahtar')), _utf8(metne(m))).hex()
        return _sabit_esit(_utf8(beklenen), _utf8(_metin_mi(i, 'imza').lower()))

    @uye('GüvenliEşit', 2, 2)
    def _esit(a, b):
        return _sabit_esit(_utf8(metne(a)), _utf8(metne(b)))

    # ---- parolalar
    @uye('ParolaÖzeti', 1, 2)
    def _parola_ozeti(p, t=VARSAYILAN_TEKRAR):
        tekrar = _tamsayi(t, 'tekrar', 1000, 10000000)
        tuz = secrets.token_bytes(16)
        oz = hashlib.pbkdf2_hmac('sha256', _utf8(_metin_mi(p, 'parola')), tuz, tekrar, 32)
        return f'pbkdf2-sha256${tekrar}${tuz.hex()}${oz.hex()}'

    @uye('ParolaDoğrula', 2, 2)
    def _parola_dogrula(p, k):
        c = _parola_kaydi(_metin_mi(k, 'kayıt'))
        if c is None:
            return False
        _metin_mi(p, 'parola')
        return _sabit_esit(hashlib.pbkdf2_hmac('sha256', _utf8(p), c[1], c[0], 32), c[2])

    @uye('YenidenÖzetlenmeli', 1, 2)
    def _yeniden(k, t=VARSAYILAN_TEKRAR):
        c = _parola_kaydi(_metin_mi(k, 'kayıt'))
        return c is None or c[0] < _tamsayi(t, 'tekrar', 1000, 10000000)

    @uye('ParolaGücü', 1, 1)
    def _guc(p):
        return parola_gucu(_metin_mi(p, 'parola'))

    @uye('ParolaSorunları', 1, 1)
    def _sorunlar(p):
        return parola_sorunlari(_metin_mi(p, 'parola'))

    # ---- rastgelelik
    @uye('Tuz', 0, 1, oto=True)
    def _tuz(n=16):
        return secrets.token_bytes(_tamsayi(n, 'bayt sayısı', 1, 1024)).hex()

    @uye('Belirteç', 0, 1, oto=True)
    def _belirtec(n=32):
        return _b64url(secrets.token_bytes(_tamsayi(n, 'bayt sayısı', 1, 1024)))

    @uye('GüvenliRastgele', 2, 2)
    def _rastgele(a, b):
        if type(a) is not int or type(b) is not int:
            _hata("'GüvenliRastgele' iki tamsayı bekler")
        if a > b:
            _hata("'GüvenliRastgele': alt sınır üst sınırdan büyük olamaz")
        return a + secrets.randbelow(b - a + 1)

    @uye('Kimlik', 0, 0, oto=True)
    def _kimlik():
        b = bytearray(secrets.token_bytes(16))
        b[6] = (b[6] & 0x0f) | 0x40
        b[8] = (b[8] & 0x3f) | 0x80
        h = b.hex()
        return f'{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}'

    # ---- kodlama
    @uye('Base64Kodla', 1, 1)
    def _b64k(m):
        return base64.b64encode(_utf8(metne(m))).decode('ascii')

    @uye('Base64Çöz', 1, 1)
    def _b64c(m):
        s = _metin_mi(m, 'Base64Çöz').replace('\r', '').replace('\n', '')
        if len(s) % 4 or not re.fullmatch(r'[A-Za-z0-9+/]*={0,2}', s):
            _hata("'Base64Çöz' geçerli Base64 metin bekler")
        try:
            b = base64.b64decode(s, validate=True)
        except binascii.Error:
            _hata("'Base64Çöz' geçerli Base64 metin bekler")
        return _utf8_coz(b, 'Base64Çöz')

    # ---- şifreleme
    @uye('AnahtarÜret', 0, 0, oto=True)
    def _anahtar_uret():
        return secrets.token_bytes(32).hex()

    @uye('ParoladanAnahtar', 2, 3)
    def _paroladan(p, t, n=VARSAYILAN_TEKRAR):
        return hashlib.pbkdf2_hmac('sha256', _utf8(_metin_mi(p, 'parola')), _utf8(_metin_mi(t, 'tuz')),
                                   _tamsayi(n, 'tekrar', 1000, 10000000), 32).hex()

    @uye('Şifrele', 2, 2)
    def _sifrele(a, m):
        k = _anahtar(a, 'Şifrele')
        nonce = secrets.token_bytes(12)
        return _b64url(nonce + aead_sifrele(k, nonce, _utf8(metne(m))))

    @uye('ŞifreÇöz', 2, 2)
    def _sifre_coz(a, m):
        k = _anahtar(a, 'ŞifreÇöz')
        s = _metin_mi(m, 'şifreli')
        if not re.fullmatch(r'[A-Za-z0-9_-]+', s):
            _hata("'ŞifreÇöz': şifreli veri bozuk")
        v = _b64url_coz(s, 'ŞifreÇöz')
        acik = aead_coz(k, v[:12], v[12:]) if len(v) >= 28 else None
        if acik is None:
            _hata("'ŞifreÇöz': şifreli veri doğrulanamadı (anahtar yanlış ya da veri değiştirilmiş)")
        return _utf8_coz(acik, 'ŞifreÇöz')

    # ---- girdi
    @uye('HtmlKaçış', 1, 1)
    def _html(m):
        return (metne(m).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                .replace('"', '&quot;').replace("'", '&#39;'))

    @uye('SqlMetni', 1, 1)
    def _sql(m):
        s = metne(m)
        if '\0' in s:
            _hata("'SqlMetni': metinde boş karakter (\\0) olamaz")
        return "'" + s.replace("'", "''") + "'"

    @uye('YolGüvenli', 1, 1)
    def _yol(m):
        return yol_guvenli(_metin_mi(m, 'yol'))

    @uye('DosyaAdıTemizle', 1, 1)
    def _dosya(m):
        return dosya_adi_temizle(_metin_mi(m, 'dosya adı'))

    @uye('EpostaGeçerli', 1, 1)
    def _eposta(m):
        return eposta_gecerli(_metin_mi(m, 'e-posta'))

    @uye('UrlGüvenli', 1, 1)
    def _url(m):
        return url_guvenli(_metin_mi(m, 'adres'))

    @uye('İzinliKarakterler', 2, 2)
    def _izinli(m, i):
        izin = set(_metin_mi(i, 'izinli'))
        return all(c in izin for c in _metin_mi(m, 'metin'))

    @uye('Maskele', 1, 2)
    def _maskele(m, n=4):
        s = metne(m)
        g = min(len(s), _tamsayi(n, 'görünür', 0, 1000))
        return '*' * (len(s) - g) + s[len(s) - g:]

    # ---- saldırılara karşı
    @uye('Sınırlayıcı', 2, 2)
    def _sinirlayici(n, s):
        sure = _sayi(s, 'süre')
        if not sure > 0:
            _hata("'Sınırlayıcı': süre sıfırdan büyük olmalı")
        return Sinirlayici(d, _tamsayi(n, 'en çok', 1, 1000000), sure, s)

    @uye('BelirteçÜret', 2, 3)
    def _b_uret(a, v, o=3600):
        omur = _tamsayi(o, 'ömür', 1, 315360000)
        govde = _b64url(_utf8(metne(v))) + '.' + str(math.floor(d['simdi']() + omur))
        return govde + '.' + _b64url(_hmac256(_utf8(_metin_mi(a, 'anahtar')), _utf8(govde)))

    @uye('BelirteçDoğrula', 2, 2)
    def _b_dogrula(a, b):
        s = _metin_mi(b, 'belirteç')
        p = s.split('.')
        if (len(p) != 3 or not re.fullmatch(r'[A-Za-z0-9_-]*', p[0]) or not re.fullmatch(r'[0-9]{1,12}', p[1])
                or not re.fullmatch(r'[A-Za-z0-9_-]{43}', p[2])):
            return None
        govde = p[0] + '.' + p[1]
        beklenen = _b64url(_hmac256(_utf8(_metin_mi(a, 'anahtar')), _utf8(govde)))
        if not _sabit_esit(_utf8(beklenen), _utf8(p[2])):
            return None
        if d['simdi']() >= int(p[1]):
            return None
        if len(p[0]) % 4 == 1:
            return None
        try:
            return _b64url_coz(p[0], 'belirteç').decode('utf-8')
        except (UnicodeDecodeError, YontemHatasi):
            return None

    @uye('Günlük', 1, 2)
    def _gunluk(o, a=''):
        olay, ay = _gunluk_metni(metne(o)), _gunluk_metni(metne(a))
        satir = f"[Güvenlik] {olay}{': ' + ay if ay else ''}"
        d['gunluk'].append(satir)
        y.yaz(satir + '\n')

    @uye('GünlükKayıtları', 0, 0, oto=True)
    def _kayitlar():
        return list(d['gunluk'])

    @uye('BenzetimZamanı', 1, 1)
    def _benzetim(v):
        d['benzetim'] = _sayi(v, 'zaman')

    @uye('Zaman', 0, 0, oto=True)
    def _zaman():
        return float(d['simdi']())

    return U
