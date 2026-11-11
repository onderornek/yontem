"""Yöntem Mobil birimi — benzetim kipi.

JavaScript sürümüyle (js/src/calisma/mobil.ts) aynı davranır. Python yorumlayıcısında telefon yoktur:
titreşim, bildirim ve paylaşma çıktıya bir satır olarak yazılır, konum ve hareket benzetilir,
depo bellekte tutulur. Gerçek telefonda çalıştırmak için 'yontem paketle program.y --mobil'.
"""
from .hatalar import YontemHatasi
from .pencere import _yf

BENZETIM_KONUM = (41.0082, 28.9784)   # İstanbul, Sultanahmet


def _tur_adi(v):
    from .yorumlayici import tur_adi
    return tur_adi(v)


def _sayi(v, ad):
    if type(v) in (int, float):
        return float(v) if type(v) is int else v
    raise YontemHatasi(f"'{ad}' sayı bekler, {_tur_adi(v)} verildi")


def _kopya(v):
    t = type(v)
    if t in (str, int, float, bool) or v is None:
        return v
    if t is list:
        return [_kopya(x) for x in v]
    raise YontemHatasi(f"'Sakla' metin, sayı, mantıksal değer ya da bunların listesini saklar, {_tur_adi(v)} verildi")


def mobil_modulu(y):
    from .sozcuk import katla
    metne = y.metne
    d = {'konum': BENZETIM_KONUM, 'yon': 'dikey', 'hareket': None, 'yon_f': None}
    depo = {}
    U = {}

    def uye(ad, en_az, en_cok, oto=False):
        def sar(f):
            U[katla(ad)] = _yf(ad, en_az, en_cok, f, oto)
            return f
        return sar

    def islev(f):
        if not y.cagrilabilir(f):
            raise YontemHatasi("Olay işleyicisi bir prosedür olmalı: '@Prosedür' ya da 'prosedür başla ... bitir'")
        return f

    def satir(s):
        y.yaz(s + '\n')

    @uye('Platform', 0, 0, oto=True)
    def _platform():
        return 'benzetim'

    @uye('Dokunmatik', 0, 0, oto=True)
    def _dokunmatik():
        return True

    @uye('EkranGenişliği', 0, 0, oto=True)
    def _genislik():
        return 390

    @uye('EkranYüksekliği', 0, 0, oto=True)
    def _yukseklik():
        return 844

    @uye('EkranYönü', 0, 0, oto=True)
    def _yon():
        return d['yon']

    @uye('Titreşim', 0, 1)
    def _titresim(ms=200):
        v = max(0, round(_sayi(ms, 'süre')))
        satir(f'[Titreşim {v} ms]')

    @uye('Bildirim', 1, 2)
    def _bildirim(b, m=''):
        baslik, metin = metne(b), metne(m)
        satir(f"[Bildirim] {baslik}{': ' + metin if metin else ''}")

    @uye('Paylaş', 1, 1)
    def _paylas(m):
        satir(f'[Paylaş] {metne(m)}')

    @uye('KonumAl', 1, 1)
    def _konum_al(f):
        y.cagir(islev(f), [d['konum'][0], d['konum'][1]])

    @uye('HareketOlunca', 1, 1)
    def _hareket(f):
        d['hareket'] = islev(f)

    @uye('YönDeğişince', 1, 1)
    def _yon_degisince(f):
        d['yon_f'] = islev(f)

    @uye('Sakla', 2, 2)
    def _sakla(a, v):
        depo[metne(a)] = _kopya(v)

    @uye('Getir', 1, 2)
    def _getir(a, vs=None):
        anahtar = metne(a)
        if anahtar not in depo:
            return vs
        return _kopya(depo[anahtar])

    @uye('Unut', 1, 1)
    def _unut(a):
        depo.pop(metne(a), None)

    @uye('BenzetimKonum', 2, 2)
    def _b_konum(a, b):
        d['konum'] = (_sayi(a, 'enlem'), _sayi(b, 'boylam'))

    @uye('BenzetimHareket', 3, 3)
    def _b_hareket(a, b, c):
        v = [_sayi(a, 'x'), _sayi(b, 'y'), _sayi(c, 'z')]
        if d['hareket'] is not None:
            y.cagir(d['hareket'], v)

    @uye('Salla', 0, 0, oto=True)
    def _salla():
        if d['hareket'] is not None:
            y.cagir(d['hareket'], [0.0, 0.0, 25.0])

    @uye('BenzetimYön', 1, 1)
    def _b_yon(v):
        s = metne(v)
        if s not in ('dikey', 'yatay'):
            raise YontemHatasi("Ekran yönü 'dikey' ya da 'yatay' olabilir")
        d['yon'] = s
        if d['yon_f'] is not None:
            y.cagir(d['yon_f'], [s])

    return U
