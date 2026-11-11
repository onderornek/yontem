"""Yöntem Takvim birimi — tarih ve saat işlemleri.

JavaScript sürümüyle (js/src/calisma/takvim.ts) aynı davranır. Zaman, Unix saniyesi olarak tamsayıyla
tutulur; takvim hesapları UTC'de, Miladi takvimle ve yalnızca tamsayı aritmetiğiyle yapılır.
"""
import math
import re
import time

from .hatalar import YontemHatasi
from .pencere import _yf

AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
KISA_AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
KISA_GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
SIMGELER = ['YYYY', 'AAAA', 'GGGG', 'AAA', 'GGG', 'YY', 'AA', 'GG', 'SS', 'DD', 'SN', 'A', 'G']
VARSAYILAN = 'YYYY-AA-GG SS:DD:SN'
EN_AZ, EN_COK = -62135596800, 253402300799


def _hata(m):
    raise YontemHatasi(m)


def _tur_adi(v):
    from .yorumlayici import tur_adi
    return tur_adi(v)


def _artik(yil):
    return (yil % 4 == 0 and yil % 100 != 0) or yil % 400 == 0


def _ayda_gun(yil, ay):
    if ay == 2:
        return 29 if _artik(yil) else 28
    return 30 if ay in (4, 6, 9, 11) else 31


def _gun_no(yil, ay, gun):
    yy = yil - 1 if ay <= 2 else yil
    cag = yy // 400
    yoe = yy - cag * 400
    doy = (153 * (ay + (-3 if ay > 2 else 9)) + 2) // 5 + gun - 1
    return cag * 146097 + yoe * 365 + yoe // 4 - yoe // 100 + doy - 719468


def _gunden_tarih(z):
    z += 719468
    cag = z // 146097
    doe = z - cag * 146097
    yoe = (doe - doe // 1460 + doe // 36524 - doe // 146096) // 365
    doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
    mp = (5 * doy + 2) // 153
    gun = doy - (153 * mp + 2) // 5 + 1
    ay = mp + 3 if mp < 10 else mp - 9
    return yoe + cag * 400 + (1 if ay <= 2 else 0), ay, gun


def _tam(v, ad):
    if type(v) is not int:
        _hata(f"'{ad}' tamsayı bekler, {_tur_adi(v)} verildi")
    if v < -1000000000000 or v > 1000000000000:
        _hata(f"'{ad}' çok büyük: {v}")
    return v


def _zaman(v, ad='zaman'):
    if type(v) is int:
        z = _tam(v, ad)
    elif type(v) is float and math.isfinite(v):
        z = math.floor(v)
    else:
        _hata(f"'{ad}' Unix saniyesi (sayı) bekler, {_tur_adi(v)} verildi")
    if z < EN_AZ or z > EN_COK:
        _hata(f"'{ad}' 1 ile 9999 yılları arasında olmalı")
    return z


def _denetle(yil, ay, gun, saat=0, dk=0, sn=0):
    if yil < 1 or yil > 9999:
        _hata(f"Yıl 1 ile 9999 arasında olmalı, {yil} verildi")
    if ay < 1 or ay > 12:
        _hata(f"Ay 1 ile 12 arasında olmalı, {ay} verildi")
    if gun < 1 or gun > _ayda_gun(yil, ay):
        _hata(f"{yil} yılının {ay}. ayında {gun}. gün yok ({_ayda_gun(yil, ay)} gün var)")
    if saat < 0 or saat > 23:
        _hata(f"Saat 0 ile 23 arasında olmalı, {saat} verildi")
    if dk < 0 or dk > 59:
        _hata(f"Dakika 0 ile 59 arasında olmalı, {dk} verildi")
    if sn < 0 or sn > 59:
        _hata(f"Saniye 0 ile 59 arasında olmalı, {sn} verildi")


def _birlestir(yil, ay, gun, saat=0, dk=0, sn=0):
    return _gun_no(yil, ay, gun) * 86400 + saat * 3600 + dk * 60 + sn


def _parcala(z):
    g, s = divmod(z, 86400)
    yil, ay, gun = _gunden_tarih(g)
    return {'yil': yil, 'ay': ay, 'gun': gun, 'saat': s // 3600, 'dk': s % 3600 // 60, 'sn': s % 60,
            'hafta_gunu': (g + 3) % 7 + 1, 'yil_gunu': g - _gun_no(yil, 1, 1) + 1, 'g': g}


def _hafta_no(z):
    p = _parcala(z)
    persembe = p['g'] - (p['hafta_gunu'] - 1) + 3
    yil = _gunden_tarih(persembe)[0]
    return (persembe - _gun_no(yil, 1, 1)) // 7 + 1


def _ay_ekle(z, n):
    p = _parcala(z)
    toplam = p['yil'] * 12 + (p['ay'] - 1) + n
    yil, ay = toplam // 12, toplam % 12 + 1
    if yil < 1 or yil > 9999:
        _hata('Sonuç 1 ile 9999 yılları dışında kalıyor')
    return _birlestir(yil, ay, min(p['gun'], _ayda_gun(yil, ay)), p['saat'], p['dk'], p['sn'])


def _kalip_coz(kalip):
    out = []

    def duz_ekle(s):
        if out and out[-1][0] is None:
            out[-1] = (None, out[-1][1] + s)
        else:
            out.append((None, s))
    i = 0
    while i < len(kalip):
        if kalip[i] == '[':
            j = kalip.find(']', i)
            if j < 0:
                _hata("Tarih kalıbında kapanmamış '['")
            duz_ekle(kalip[i + 1:j])
            i = j + 1
            continue
        s = next((x for x in SIMGELER if kalip.startswith(x, i)), None)
        if s:
            out.append((s, None))
            i += len(s)
        else:
            duz_ekle(kalip[i])
            i += 1
    return out


def _yaz(z, kalip):
    p = _parcala(z)
    deger = {'YYYY': '%04d' % p['yil'], 'YY': '%02d' % (p['yil'] % 100), 'AAAA': AYLAR[p['ay'] - 1],
             'AAA': KISA_AYLAR[p['ay'] - 1], 'AA': '%02d' % p['ay'], 'A': str(p['ay']),
             'GGGG': GUNLER[p['hafta_gunu'] - 1], 'GGG': KISA_GUNLER[p['hafta_gunu'] - 1], 'GG': '%02d' % p['gun'],
             'G': str(p['gun']), 'SS': '%02d' % p['saat'], 'DD': '%02d' % p['dk'], 'SN': '%02d' % p['sn']}
    return ''.join(duz if simge is None else deger[simge] for simge, duz in _kalip_coz(kalip))


def _oku(metin, kalip):
    from .sozcuk import katla
    d = {'i': 0, 'yil': 1970, 'ay': 1, 'gun': 1, 'saat': 0, 'dk': 0, 'sn': 0}

    def bozuk():
        _hata(f"'{metin}' metni '{kalip}' kalıbına uymuyor")

    def sayi(en_az, en_cok):
        i = j = d['i']
        while j < len(metin) and j - i < en_cok and '0' <= metin[j] <= '9':
            j += 1
        if j - i < en_az:
            bozuk()
        d['i'] = j
        return int(metin[i:j])

    def ad(liste):
        kalan = katla(metin[d['i']:])
        en = -1
        for k, a in enumerate(liste):
            if kalan.startswith(katla(a)) and (en < 0 or len(a) > len(liste[en])):
                en = k
        if en < 0:
            bozuk()
        d['i'] += len(liste[en])
        return en + 1

    for simge, duz in _kalip_coz(kalip):
        if simge is None:
            if not metin.startswith(duz, d['i']):
                bozuk()
            d['i'] += len(duz)
        elif simge == 'YYYY':
            d['yil'] = sayi(4, 4)
        elif simge == 'YY':
            d['yil'] = 2000 + sayi(2, 2)
        elif simge == 'AAAA':
            d['ay'] = ad(AYLAR)
        elif simge == 'AAA':
            d['ay'] = ad(KISA_AYLAR)
        elif simge == 'AA':
            d['ay'] = sayi(2, 2)
        elif simge == 'A':
            d['ay'] = sayi(1, 2)
        elif simge == 'GGGG':
            ad(GUNLER)
        elif simge == 'GGG':
            ad(KISA_GUNLER)
        elif simge == 'GG':
            d['gun'] = sayi(2, 2)
        elif simge == 'G':
            d['gun'] = sayi(1, 2)
        elif simge == 'SS':
            d['saat'] = sayi(2, 2)
        elif simge == 'DD':
            d['dk'] = sayi(2, 2)
        else:
            d['sn'] = sayi(2, 2)
    if d['i'] != len(metin):
        bozuk()
    _denetle(d['yil'], d['ay'], d['gun'], d['saat'], d['dk'], d['sn'])
    return _birlestir(d['yil'], d['ay'], d['gun'], d['saat'], d['dk'], d['sn'])


def _metin_mi(v, ad):
    if type(v) is not str:
        _hata(f"'{ad}' metin bekler, {_tur_adi(v)} verildi")
    return v


_YOK = object()


def takvim_modulu(y):
    from .sozcuk import katla
    d = {'benzetim': None}
    U = {}

    def uye(ad, en_az, en_cok, oto=False):
        def sar(f):
            U[katla(ad)] = _yf(ad, en_az, en_cok, f, oto)
            return f
        return sar

    @uye('Şimdi', 0, 0, oto=True)
    def _simdi():
        return d['benzetim'][0] if d['benzetim'] else math.floor(time.time())

    @uye('YerelFark', 0, 0, oto=True)
    def _fark():
        if d['benzetim']:
            return d['benzetim'][1]
        t = time.localtime()
        return t.tm_gmtoff // 60

    @uye('BenzetimZamanı', 1, 2)
    def _benzetim(z, f=0):
        d['benzetim'] = (_zaman(z), _tam(f, 'fark'))

    @uye('TarihYap', 3, 6)
    def _yap(yil, ay, gun, saat=0, dk=0, sn=0):
        a = (_tam(yil, 'yıl'), _tam(ay, 'ay'), _tam(gun, 'gün'), _tam(saat, 'saat'), _tam(dk, 'dakika'), _tam(sn, 'saniye'))
        _denetle(*a)
        return _birlestir(*a)

    @uye('Parçala', 1, 1)
    def _parca(z):
        p = _parcala(_zaman(z))
        return {'yıl': p['yil'], 'ay': p['ay'], 'gün': p['gun'], 'saat': p['saat'], 'dakika': p['dk'], 'saniye': p['sn'],
                'haftaGünü': p['hafta_gunu'], 'yılGünü': p['yil_gunu']}

    @uye('TarihYaz', 1, 2)
    def _tarih_yaz(z, k=VARSAYILAN):
        return _yaz(_zaman(z), _metin_mi(k, 'kalıp'))

    @uye('TarihOku', 1, 2)
    def _tarih_oku(m, k=_YOK):
        metin = _metin_mi(m, 'metin').strip()
        if k is not _YOK:
            return _oku(metin, _metin_mi(k, 'kalıp'))
        if re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', metin):
            return _oku(metin, 'YYYY-AA-GG')
        if re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}', metin):
            return _oku(metin.replace('T', ' '), 'YYYY-AA-GG SS:DD')
        if re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}:[0-9]{2}', metin):
            return _oku(metin.replace('T', ' '), VARSAYILAN)
        _hata(f"'{metin}' tarih olarak okunamadı; 'YYYY-AA-GG' ya da 'YYYY-AA-GG SS:DD:SN' biçiminde yazın ya da kalıp verin")

    def sinirla(z):
        if z < EN_AZ or z > EN_COK:
            _hata('Sonuç 1 ile 9999 yılları dışında kalıyor')
        return z

    @uye('SaniyeEkle', 2, 2)
    def _sn_ekle(z, n):
        return sinirla(_zaman(z) + _tam(n, 'saniye'))

    @uye('GünEkle', 2, 2)
    def _gun_ekle(z, n):
        return sinirla(_zaman(z) + _tam(n, 'gün') * 86400)

    @uye('AyEkle', 2, 2)
    def _ay_ekle_(z, n):
        return _ay_ekle(_zaman(z), _tam(n, 'ay'))

    @uye('YılEkle', 2, 2)
    def _yil_ekle(z, n):
        return _ay_ekle(_zaman(z), _tam(n, 'yıl') * 12)

    @uye('GünFarkı', 2, 2)
    def _gun_farki(a, b):
        return _zaman(b, 'bitiş') // 86400 - _zaman(a, 'başlangıç') // 86400

    @uye('GünBaşı', 1, 1)
    def _gun_basi(z):
        return _zaman(z) // 86400 * 86400

    @uye('HaftaGünü', 1, 1)
    def _hafta_gunu(z):
        return _parcala(_zaman(z))['hafta_gunu']

    @uye('HaftaNo', 1, 1)
    def _hafta(z):
        return _hafta_no(_zaman(z))

    @uye('GünAdı', 1, 1)
    def _gun_adi(v):
        n = v if type(v) is int and 1 <= v <= 7 else _parcala(_zaman(v))['hafta_gunu']
        return GUNLER[n - 1]

    @uye('AyAdı', 1, 1)
    def _ay_adi(v):
        n = _tam(v, 'ay')
        if n < 1 or n > 12:
            _hata(f"Ay 1 ile 12 arasında olmalı, {n} verildi")
        return AYLAR[n - 1]

    @uye('ArtıkYıl', 1, 1)
    def _artik_yil(v):
        return _artik(_tam(v, 'yıl'))

    @uye('AydakiGünSayısı', 2, 2)
    def _aydaki(yy, a):
        yil, ay = _tam(yy, 'yıl'), _tam(a, 'ay')
        if ay < 1 or ay > 12:
            _hata(f"Ay 1 ile 12 arasında olmalı, {ay} verildi")
        return _ayda_gun(yil, ay)

    @uye('GeçerliTarih', 3, 3)
    def _gecerli(yy, a, g):
        yil, ay, gun = _tam(yy, 'yıl'), _tam(a, 'ay'), _tam(g, 'gün')
        return 1 <= yil <= 9999 and 1 <= ay <= 12 and 1 <= gun <= _ayda_gun(yil, ay)

    return U
