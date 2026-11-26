"""Yöntem Ağ birimi — HTTP istekleri.

JavaScript sürümüyle (js/src/calisma/ag.ts) aynı denetimleri yapar, aynı sonuç sözlüğünü ve hata
iletilerini üretir. Bağlantı Python'un standart kitaplığıyla (urllib) kurulur; dış bağımlılık yoktur.
"""
import codecs
import json
import re
import socket
import urllib.error
import urllib.request

from .hatalar import YontemHatasi
from .pencere import _yf

YONTEMLER = ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD')
_SERBEST = set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*\'()')
_BOYUT_SINIRI = 10 * 1024 * 1024


def _hata(m):
    raise YontemHatasi(m)


def _tur_adi(v):
    from .yorumlayici import tur_adi
    return tur_adi(v)


def _metin_mi(v, ad):
    if type(v) is not str:
        _hata(f"'{ad}' metin bekler, {_tur_adi(v)} verildi")
    return v


def url_kodla(s):
    return ''.join(c if c in _SERBEST else ''.join('%%%02X' % b for b in c.encode('utf-8', 'surrogatepass')) for c in s)


def url_coz(s):
    baytlar = bytearray()
    i = 0
    while i < len(s):
        if s[i] == '%':
            h = s[i + 1:i + 3]
            if not re.fullmatch(r'[0-9a-fA-F]{2}', h):
                _hata(f"'UrlÇöz': geçersiz '%' dizisi ({i + 1}. karakter)")
            baytlar.append(int(h, 16))
            i += 3
        else:
            baytlar += s[i].encode('utf-8', 'surrogatepass')
            i += 1
    try:
        return baytlar.decode('utf-8')
    except UnicodeDecodeError:
        _hata("'UrlÇöz': çözülen veri geçerli UTF-8 metin değil")


def _gonder(yontem, adres, basliklar, govde, sure):
    """(durum, başlıklar, gövde) ya da hata türü ('baglanti' | 'zaman' | 'boyut') döndürür."""
    from . import __version__
    bs = {}
    if not any(a.lower() == 'user-agent' for a, _ in basliklar):
        bs['User-Agent'] = 'Yontem/' + __version__
    for a, d in basliklar:
        bs[a] = bs[a] + ', ' + d if a in bs else d
    veri = None if govde is None else govde.encode('utf-8', 'surrogatepass')
    istek = urllib.request.Request(adres, data=veri, headers=bs, method=yontem)
    try:
        try:
            yanit = urllib.request.urlopen(istek, timeout=sure)
        except urllib.error.HTTPError as e:      # 4xx ve 5xx de bir yanıttır
            yanit = e
        ham = yanit.read(_BOYUT_SINIRI + 1)
        if len(ham) > _BOYUT_SINIRI:
            return 'boyut'
        sonuc = {}
        for a, d in yanit.headers.items():
            a = a.lower()
            sonuc[a] = sonuc[a] + ', ' + d if a in sonuc else d
        return yanit.status if hasattr(yanit, 'status') else yanit.code, sonuc, ham.decode('utf-8', 'replace')
    except (socket.timeout, TimeoutError):
        return 'zaman'
    except urllib.error.URLError as e:
        return 'zaman' if isinstance(e.reason, (socket.timeout, TimeoutError)) else 'baglanti'
    except (OSError, ValueError):
        return 'baglanti'


# ---------------------------------------------------------------- HttpAkış
# JavaScript sürümüyle (ag.ts, AkisCozucu) aynı kurallar: text/event-stream → her olayın 'data' alanı (JSON nesnesi
# ya da dizisiyse çözülmüş), ndjson/jsonl → her satır çözülmüş JSON, öteki türler → gelen metin parçaları.
_OLAY_SINIRI = 10 * 1024 * 1024


def _json_coz(s):
    try:
        return json.loads(s)
    except json.JSONDecodeError as e:
        raise YontemHatasi(f"Geçersiz JSON: {e}")


def _olay_degeri(v):
    if not re.match(r'\s*[\[{]', v):
        return v
    try:
        return json.loads(v)
    except ValueError:
        return v


class _AkisCozucu:
    def __init__(self, tur):
        t = tur.lower()
        self.kip = 'sse' if 'text/event-stream' in t else 'satir' if re.search(r'ndjson|jsonl|json-seq|x-json-stream', t) else 'ham'
        self.tampon = ''
        self.veri = None

    def ekle(self, p):
        if self.kip == 'ham':
            return [p] if p else []
        self.tampon += p
        out = []
        while True:
            i = self.tampon.find('\n')
            if i < 0:
                break
            satir, self.tampon = self.tampon[:i], self.tampon[i + 1:]
            if satir.endswith('\r'):
                satir = satir[:-1]
            self._satir(satir, out)
        if len(self.tampon) > _OLAY_SINIRI:
            _hata('Ağ hatası: akıştaki bir olay çok büyük (en çok 10 MB)')
        return out

    def bitir(self):
        out = []
        if self.kip == 'ham':
            return out
        if self.tampon != '':
            self._satir(self.tampon[:-1] if self.tampon.endswith('\r') else self.tampon, out)
            self.tampon = ''
        if self.kip == 'sse':
            self._satir('', out)
        return out

    def _satir(self, satir, out):
        if self.kip == 'satir':
            if satir.strip(' \t\r\n') != '':
                out.append(_json_coz(satir))
            return
        if satir == '':
            if self.veri is not None:
                out.append(_olay_degeri('\n'.join(self.veri)))
                self.veri = None
            return
        if satir.startswith(':'):
            return
        k = satir.find(':')
        alan = satir if k < 0 else satir[:k]
        deger = '' if k < 0 else satir[k + 1:]
        if deger.startswith(' '):
            deger = deger[1:]
        if alan == 'data':
            if self.veri is None:
                self.veri = []
            self.veri.append(deger)


def _govde_basi(s):
    return ''.join(list(re.sub(r'^[ \t\r\n]+|[ \t\r\n]+$', '', s))[:200])


def _akis_g(yontem, adres, basliklar, govde, sure, sure_ham, metne):
    """HttpAkış'ın gövdesi: yanıtı parça parça okuyup değerleri üretir (akış yinelendikçe)."""
    from . import __version__

    def zaman():
        _hata(f"Ağ hatası: {adres} zaman aşımına uğradı ({metne(sure_ham)} sn)")

    bs = {}
    if not any(a.lower() == 'user-agent' for a, _ in basliklar):
        bs['User-Agent'] = 'Yontem/' + __version__
    for a, d in basliklar:
        bs[a] = bs[a] + ', ' + d if a in bs else d
    veri = None if govde is None else govde.encode('utf-8', 'surrogatepass')
    istek = urllib.request.Request(adres, data=veri, headers=bs, method=yontem)
    try:
        try:
            yanit = urllib.request.urlopen(istek, timeout=sure)
        except urllib.error.HTTPError as e:
            yanit = e
    except (socket.timeout, TimeoutError):
        zaman()
    except urllib.error.URLError as e:
        if isinstance(e.reason, (socket.timeout, TimeoutError)):
            zaman()
        _hata(f"Ağ hatası: {adres} adresine bağlanılamadı")
    except (OSError, ValueError):
        _hata(f"Ağ hatası: {adres} adresine bağlanılamadı")
    try:
        durum = yanit.status if hasattr(yanit, 'status') else yanit.code
        cozucu = codecs.getincrementaldecoder('utf-8')('replace')

        def oku():
            try:
                return yanit.read1(65536) if hasattr(yanit, 'read1') else yanit.read(65536)
            except (socket.timeout, TimeoutError):
                zaman()
            except (OSError, ValueError):
                _hata(f"Ağ hatası: {adres} bağlantısı yanıt sürerken koptu")

        if durum >= 400:
            g = ''
            while len(g) <= 4096:
                b = oku()
                if not b:
                    break
                g += cozucu.decode(b)
            g += cozucu.decode(b'', True)
            bas = _govde_basi(g)
            _hata(f"HttpAkış: {adres} {durum} durumuyla yanıt verdi" + (': ' + bas if bas else ''))
        c = _AkisCozucu(yanit.headers.get('content-type') or '')
        while True:
            b = oku()
            if not b:
                break
            for v in c.ekle(cozucu.decode(b)):
                yield v
        for v in c.ekle(cozucu.decode(b'', True)) + c.bitir():
            yield v
    finally:
        yanit.close()


def ag_modulu(y):
    from .sozcuk import katla
    metne = y.metne
    U = {}

    def uye(ad, en_az, en_cok):
        def sar(f):
            U[katla(ad)] = _yf(ad, en_az, en_cok, f)
            return f
        return sar

    def basliklari_hazirla(v):
        if v is None:
            return []
        if type(v) is not dict:
            _hata(f"'başlıklar' sözlük bekler, {_tur_adi(v)} verildi")
        out = []
        for ad, deger in v.items():
            a, d = _metin_mi(ad, 'başlık adı'), metne(deger)
            if not re.fullmatch(r"[A-Za-z0-9!#$%&'*+.^_`|~-]+", a):
                _hata(f"Geçersiz başlık adı: '{a}'")
            if re.search(r'[\r\n\0]', d):
                _hata(f"'{a}' başlığının değerinde satır sonu olamaz")
            if not re.fullmatch(r'[\x20-\x7e\t]*', d):
                _hata(f"'{a}' başlığının değerinde yalnızca ASCII karakterler olabilir (Türkçe karakterler için UrlKodla kullanın)")
            out.append((a, d))
        return out

    def istek(yontem_ham, adres_ham, govde_ham, basliklar_ham, sure_ham, akis=False):
        yontem = _metin_mi(yontem_ham, 'yöntem').upper()
        if yontem not in YONTEMLER:
            _hata(f"Bilinmeyen HTTP yöntemi: '{yontem_ham}' (GET, POST, PUT, PATCH, DELETE, HEAD)")
        adres = _metin_mi(adres_ham, 'adres')
        if not re.fullmatch(r'https?://[^\s\x00-\x1f]+', adres, re.I):
            _hata(f"Geçersiz adres: '{adres}' (http:// ya da https:// ile başlamalı, boşluk içermemeli)")
        govde = None if govde_ham is None else _metin_mi(govde_ham, 'gövde')
        if govde is not None and yontem in ('GET', 'HEAD'):
            if govde != '':
                _hata(f"{yontem} isteğinin gövdesi olamaz")
            govde = None
        basliklar = basliklari_hazirla(basliklar_ham)
        if type(sure_ham) not in (int, float):
            _hata(f"'zaman aşımı' sayı bekler, {_tur_adi(sure_ham)} verildi")
        if not 1 <= sure_ham <= 300:
            _hata("'zaman aşımı' 1 ile 300 saniye arasında olmalı")
        if akis:
            from .akis import Akis
            return Akis(y, 'HttpAkış', _akis_g(yontem, adres, basliklar, govde, sure_ham, sure_ham, metne))
        yn = y.ag_gonder((yontem, adres, basliklar, govde, sure_ham))
        if yn == 'zaman':
            _hata(f"Ağ hatası: {adres} zaman aşımına uğradı ({metne(sure_ham)} sn)")
        if yn == 'boyut':
            _hata('Ağ hatası: yanıt çok büyük (en çok 10 MB)')
        if yn == 'baglanti':
            _hata(f"Ağ hatası: {adres} adresine bağlanılamadı")
        durum, bs, govde_y = yn
        return {'durum': durum, 'gövde': govde_y, 'başlıklar': {a: bs[a] for a in sorted(bs)}}

    @uye('Httpİstek', 2, 5)
    def _istek(yn, adres, govde=None, basliklar=None, sure=30):
        return istek(yn, adres, govde, basliklar, sure)

    @uye('HttpAl', 1, 3)
    def _al(adres, basliklar=None, sure=30):
        return istek('GET', adres, None, basliklar, sure)

    @uye('HttpGönder', 2, 4)
    def _gonder_(adres, govde, basliklar=None, sure=30):
        return istek('POST', adres, govde, basliklar, sure)

    for ad in ('Httpİstek', 'HttpAl', 'HttpGönder'):
        U[katla(ad)].gc = True          # 'aynı anda' gövdesinde istek verip bekleyebilir

    @uye('HttpAkış', 1, 4)
    def _akis(adres, govde=None, basliklar=None, sure=30):
        return istek('GET' if govde is None else 'POST', adres, govde, basliklar, sure, True)

    @uye('UrlKodla', 1, 1)
    def _kodla(m):
        return url_kodla(metne(m))

    @uye('UrlÇöz', 1, 1)
    def _coz(m):
        return url_coz(_metin_mi(m, 'metin'))

    @uye('SorguYap', 1, 1)
    def _sorgu(v):
        if type(v) is not dict:
            _hata(f"'SorguYap' sözlük bekler, {_tur_adi(v)} verildi")
        return '&'.join(url_kodla(metne(a)) + '=' + url_kodla(metne(d)) for a, d in v.items())

    return U
