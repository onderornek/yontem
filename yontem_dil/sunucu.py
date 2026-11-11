"""Yöntem Sunucu birimi — HTTP isteklerini karşılayan küçük bir web sunucusu.

JavaScript sürümüyle (js/src/calisma/sunucu.ts) aynı yönlendirmeyi, denetimleri ve yanıtları üretir.
Ağ, Python'un standart kitaplığıyla (http.server) dinlenir; istekler sırayla işlenir.
"""
import json
import os
import re
import sys

from .hatalar import YontemHatasi
from .pencere import _yf

YONTEMLER = ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', '*')
DURUM_METNI = {400: 'Geçersiz istek', 404: 'Bulunamadı', 405: 'Bu yöntem desteklenmiyor', 413: 'İstek çok büyük', 500: 'Sunucu hatası'}
TURLER = {
    'html': 'text/html; charset=utf-8', 'htm': 'text/html; charset=utf-8', 'css': 'text/css; charset=utf-8',
    'js': 'text/javascript; charset=utf-8', 'json': 'application/json; charset=utf-8', 'txt': 'text/plain; charset=utf-8',
    'svg': 'image/svg+xml', 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif',
    'webp': 'image/webp', 'ico': 'image/x-icon', 'woff2': 'font/woff2', 'pdf': 'application/pdf',
    'webmanifest': 'application/manifest+json',
}
METIN, HTML, JSON_TURU = 'text/plain; charset=utf-8', 'text/html; charset=utf-8', 'application/json; charset=utf-8'


def _hata(m):
    raise YontemHatasi(m)


def _tur_adi(v):
    from .yorumlayici import tur_adi
    return tur_adi(v)


def _parcala(yol):
    return [p for p in yol.split('/') if p != '']


def sunucu_modulu(y):
    from .sozcuk import katla
    from .ag import url_coz
    from .yerlesik import _json_icin
    metne = y.metne
    U = {}
    d = {'kurallar': [], 'statik': [], 'durdur': False, 'govde_siniri': 1024 * 1024}

    def uye(ad, en_az, en_cok, oto=False):
        def sar(f):
            U[katla(ad)] = _yf(ad, en_az, en_cok, f, oto)
            return f
        return sar

    def metin(v, ad):
        if type(v) is not str:
            _hata(f"'{ad}' metin bekler, {_tur_adi(v)} verildi")
        return v

    def yanit_sozlugu(durum, govde, tur, ek=()):
        b = {'content-type': tur}
        for a, v in ek:
            b[a] = v
        return {'durum': durum, 'gövde': govde, 'başlıklar': b}

    def durum_sayisi(v, ad):
        if type(v) is not int or v < 100 or v > 599:
            _hata(f"'{ad}': durum 100..599 arasında bir tamsayı olmalı")
        return v

    def isle(ham):
        """→ (yanıt sözlüğü, dosya ya da None, günlük ya da None)"""
        def basit(durum):
            return yanit_sozlugu(durum, DURUM_METNI[durum], METIN), None, None
        if len(ham['govde']) > d['govde_siniri']:
            return basit(413)
        hedef = ham['hedef']
        si = hedef.find('?')
        ham_yol, ham_sorgu = (hedef, '') if si < 0 else (hedef[:si], hedef[si + 1:])
        sorgu = {}
        try:
            yol = url_coz(ham_yol)
            for p in ham_sorgu.split('&'):
                if not p:
                    continue
                e = p.find('=')
                sorgu[url_coz((p if e < 0 else p[:e]).replace('+', ' '))] = '' if e < 0 else url_coz(p[e + 1:].replace('+', ' '))
        except YontemHatasi:
            return basit(400)
        if not yol.startswith('/') or '\0' in yol:
            return basit(400)
        yontem = ham['yontem'].upper()
        parcalar = _parcala(yol)
        yol_eslesti = False
        for k in d['kurallar']:
            if len(k['parcalar']) != len(parcalar):
                continue
            prm, uydu = {}, True
            for p, g in zip(k['parcalar'], parcalar):
                if p.startswith(':'):
                    prm[p[1:]] = g
                elif p != g:
                    uydu = False
                    break
            if not uydu:
                continue
            yol_eslesti = True
            if not (k['yontem'] == '*' or k['yontem'] == yontem or (yontem == 'HEAD' and k['yontem'] == 'GET')):
                continue
            basliklar = {a.lower(): ham['basliklar'][a] for a in sorted(ham['basliklar'])}
            istek = {'yöntem': yontem, 'yol': yol, 'sorgu': sorgu, 'parametreler': prm, 'başlıklar': basliklar, 'gövde': ham['govde']}
            try:
                sonuc = y.cagir(k['isleyici'], [istek])
            except YontemHatasi as e:
                return yanit_sozlugu(500, DURUM_METNI[500], METIN), None, f"{yontem} {yol}: {e.mesaj}"
            except RecursionError:
                return yanit_sozlugu(500, DURUM_METNI[500], METIN), None, f"{yontem} {yol}: Yığın taşması (çok derin özyineleme)"
            if type(sonuc) is str:
                return yanit_sozlugu(200, sonuc, HTML), None, None
            if type(sonuc) is dict and type(sonuc.get('durum')) is int and type(sonuc.get('gövde')) is str and type(sonuc.get('başlıklar')) is dict:
                return sonuc, None, None
            return (yanit_sozlugu(500, DURUM_METNI[500], METIN), None,
                    f"{yontem} {yol}: işleyici metin ya da Yanıt/JsonYanıt/Yönlendir sonucu döndürmeli, {_tur_adi(sonuc)} döndürdü")
        if yol_eslesti:
            return basit(405)
        if yontem in ('GET', 'HEAD'):
            for s in d['statik']:
                on = _parcala(s['on_ek'])
                if len(parcalar) < len(on) or parcalar[:len(on)] != on:
                    continue
                kalan = parcalar[len(on):]
                if any(p == '..' or p.startswith('.') or '\\' in p or ':' in p for p in kalan):
                    return basit(404)
                kok, tam = re.sub(r'/+$', '', s['klasor']), '/'.join(kalan)
                if not kalan:
                    dosya = kok + '/index.html'
                elif re.search(r'\.[A-Za-z0-9]+$', tam):
                    dosya = kok + '/' + tam
                else:
                    dosya = kok + '/' + tam + '/index.html'
                if os.path.isfile(dosya):
                    m = re.search(r'\.([A-Za-z0-9]+)$', dosya)
                    return yanit_sozlugu(200, '', TURLER.get(m.group(1).lower() if m else '', 'application/octet-stream')), dosya, None
        return basit(404)

    def ham_yanit(r, yontem):
        yanit, dosya, gunluk = r
        durum = yanit['durum']
        basliklar = []
        for a, v in yanit['başlıklar'].items():
            ad, deger = metne(a).lower(), metne(v)
            if not re.fullmatch(r"[a-z0-9!#$%&'*+.^_`|~-]+", ad) or not re.fullmatch(r'[\x20-\x7e\t]*', deger):
                gunluk = gunluk or f"geçersiz yanıt başlığı atlandı: '{ad}'"
                continue
            if ad != 'content-length':
                basliklar.append((ad, deger))
        if not any(b[0] == 'x-content-type-options' for b in basliklar):
            basliklar.append(('x-content-type-options', 'nosniff'))
        if durum < 100 or durum > 599:
            return {'durum': 500, 'basliklar': [('content-type', METIN)], 'govde': DURUM_METNI[500], 'dosya': None, 'gunluk': 'geçersiz durum kodu'}
        bas = yontem.upper() == 'HEAD'
        return {'durum': durum, 'basliklar': basliklar, 'govde': yanit['gövde'], 'dosya': dosya, 'bos': bas, 'gunluk': gunluk}

    @uye('Yol', 3, 3)
    def _yol(yn, kalip, isleyici):
        yontem = metin(yn, 'yöntem').upper()
        if yontem not in YONTEMLER:
            _hata(f"Geçersiz HTTP yöntemi: '{yn}' ({', '.join(YONTEMLER)})")
        k = metin(kalip, 'yol')
        if not k.startswith('/'):
            _hata(f"Yol '/' ile başlamalı: '{k}'")
        parcalar = _parcala(k)
        for p in parcalar:
            if p.startswith(':') and not re.fullmatch(r':[^\W\d]\w*', p):
                _hata(f"Geçersiz yol parametresi: '{p}'")
        if not y.cagrilabilir(isleyici):
            _hata(f"'Yol': işleyici bir alt program olmalı, {_tur_adi(isleyici)} verildi")
        d['kurallar'].append({'yontem': yontem, 'parcalar': parcalar, 'isleyici': isleyici})

    @uye('Statik', 2, 2)
    def _statik(on_ek, klasor):
        o = metin(on_ek, 'ön ek')
        if not o.startswith('/'):
            _hata(f"Ön ek '/' ile başlamalı: '{o}'")
        kl = metin(klasor, 'klasör')
        if not kl:
            _hata("'Statik': klasör adı boş olamaz")
        d['statik'].append({'on_ek': o, 'klasor': kl})

    @uye('GövdeSınırı', 1, 1)
    def _govde_siniri(n):
        if type(n) is not int or n < 0 or n > 100 * 1024 * 1024:
            _hata("'GövdeSınırı': 0 ile 104857600 (100 MB) arasında bir tamsayı olmalı")
        d['govde_siniri'] = n

    @uye('Yanıt', 2, 3)
    def _yanit(durum, govde, tur=None):
        return yanit_sozlugu(durum_sayisi(durum, 'Yanıt'), metne(govde), METIN if tur is None else metin(tur, 'tür'))

    @uye('JsonYanıt', 1, 2)
    def _json_yanit(deger, durum=200):
        return yanit_sozlugu(durum_sayisi(durum, 'JsonYanıt'), json.dumps(_json_icin(y, deger), ensure_ascii=False), JSON_TURU)

    @uye('Yönlendir', 1, 2)
    def _yonlendir(adres, durum=302):
        a, n = metin(adres, 'adres'), durum_sayisi(durum, 'Yönlendir')
        if n not in (301, 302, 303, 307, 308):
            _hata("'Yönlendir': durum 301, 302, 303, 307 ya da 308 olmalı")
        if not re.fullmatch(r'[\x21-\x7e]+', a):
            _hata("'Yönlendir': adres yalnızca ASCII karakterler içerebilir (Türkçe karakterler için UrlKodla kullanın)")
        return yanit_sozlugu(n, '', METIN, [('location', a)])

    @uye('SunucuyuDurdur', 0, 0, True)
    def _durdur():
        d['durdur'] = True

    @uye('İstekİşle', 2, 4)
    def _istek_isle(yn, hedef, govde=None, basliklar=None):
        h = {}
        if basliklar is not None:
            if type(basliklar) is not dict:
                _hata(f"'başlıklar' sözlük bekler, {_tur_adi(basliklar)} verildi")
            for a, v in basliklar.items():
                h[metne(a)] = metne(v)
        ham = {'yontem': metin(yn, 'yöntem'), 'hedef': metin(hedef, 'yol'), 'basliklar': h, 'govde': '' if govde is None else metne(govde)}
        s = ham_yanit(isle(ham), ham['yontem'])
        g = '' if s.get('bos') else s['govde']
        if s['dosya'] and not s.get('bos'):
            with open(s['dosya'], encoding='utf-8') as f:
                g = f.read()
        return {'durum': s['durum'], 'gövde': g, 'başlıklar': dict(s['basliklar'])}

    @uye('Dinle', 1, 2)
    def _dinle(port, adres='127.0.0.1'):
        if type(port) is not int or port < 0 or port > 65535:
            _hata("'Dinle': port 0 ile 65535 arasında bir tamsayı olmalı")
        metin(adres, 'adres')
        from http.server import BaseHTTPRequestHandler, HTTPServer
        d['durdur'] = False

        class Isleyici(BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'

            def log_message(self, *a):
                pass

            def _gonder(self, durum, basliklar, govde, kapat=False):
                self.send_response_only(durum)
                for a, v in basliklar:
                    self.send_header(a, v)
                self.send_header('content-length', str(len(govde)))
                if kapat:
                    self.send_header('connection', 'close')
                    self.close_connection = True
                self.end_headers()
                if self.command != 'HEAD':
                    self.wfile.write(govde)

            def _isle(self):
                buyuk = lambda: self._gonder(413, [('content-type', METIN), ('x-content-type-options', 'nosniff')], 'İstek çok büyük'.encode('utf-8'), True)
                if 'chunked' in (self.headers.get('transfer-encoding') or '').lower():
                    ham_govde = b''
                    while True:                       # parçalı gövde: her parça onaltılık uzunlukla başlar
                        satir = self.rfile.readline(64).strip()
                        try:
                            k = int(satir.split(b';')[0] or b'0', 16)
                        except ValueError:
                            k = 0
                        if k == 0:
                            while self.rfile.readline(1024).strip():
                                pass
                            break
                        if len(ham_govde) + k > d['govde_siniri']:
                            return buyuk()
                        ham_govde += self.rfile.read(k)
                        self.rfile.readline(8)
                else:
                    try:
                        n = int(self.headers.get('content-length') or 0)
                    except ValueError:
                        n = 0
                    if n > d['govde_siniri']:
                        return buyuk()
                    ham_govde = self.rfile.read(n) if n else b''
                try:
                    govde = ham_govde.decode('utf-8')
                except UnicodeDecodeError:
                    return self._gonder(400, [('content-type', METIN), ('x-content-type-options', 'nosniff')], 'Geçersiz istek'.encode('utf-8'))
                basliklar = {}
                for a in self.headers.keys():
                    basliklar[a.lower()] = ', '.join(self.headers.get_all(a))
                sys.stdout.flush()
                s = ham_yanit(isle({'yontem': self.command, 'hedef': self.path, 'basliklar': basliklar, 'govde': govde}), self.command)
                sys.stdout.flush()
                if s['gunluk']:
                    sys.stderr.write(f"Sunucu: {s['gunluk']}\n")
                icerik = s['govde'].encode('utf-8')
                if s['dosya']:
                    try:
                        with open(s['dosya'], 'rb') as f:
                            icerik = f.read()
                    except OSError:
                        return self._gonder(404, [('content-type', METIN)], 'Bulunamadı'.encode('utf-8'))
                self._gonder(s['durum'], s['basliklar'], icerik, d['durdur'])

            do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = do_HEAD = _isle

        try:
            sunucu = HTTPServer((adres, port), Isleyici)
        except OSError as e:
            import errno
            if e.errno == errno.EADDRINUSE:
                _hata(f"Sunucu hatası: {port} numaralı port kullanımda")
            if e.errno == errno.EACCES:
                _hata(f"Sunucu hatası: {port} numaralı portu dinleme izni yok")
            _hata(f"Sunucu hatası: {e}")
        sys.stdout.flush()
        sys.stderr.write(f"Sunucu dinliyor: http://{'localhost' if adres == '0.0.0.0' else adres}:{sunucu.server_address[1]} (durdurmak için Ctrl+C)\n")
        try:
            while not d['durdur']:
                sunucu.handle_request()
        except KeyboardInterrupt:
            pass
        finally:
            sunucu.server_close()

    return U
