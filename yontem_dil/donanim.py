"""Yöntem Donanım birimi — masaüstü benzetimi.

JavaScript (js/src/calisma/donanim.ts) ve C++ (js/gomulu/yontem_donanim.hpp) benzetimleriyle aynı davranır:
sanal saat, belirlenimci zamanlayıcılar, pin değişikliğiyle tetiklenen kesmeler, bellek tabanlı I2C aygıtı.
Gerçek donanım için program 'yontem gomulu' ile ESP32'ye derlenir.
"""
import os
import sys

from .hatalar import YontemHatasi
from .degerler import YerelFonksiyon

GIRIS, CIKIS, GIRIS_YUKARI, GIRIS_ASAGI = 1, 2, 3, 4
YUKSELEN, DUSEN, DEGISEN = 1, 2, 3


def donanim_modulu(y):
    from .yerlesik import yf
    metne = y.metne
    durum = {'saat': 0}
    pinler = {}
    zamanlar = []
    i2c = {}
    iz_acik = os.environ.get('YONTEM_IZ', '') not in ('', '0')

    def iz(m):
        if iz_acik:
            sys.stdout.flush()
            sys.stderr.write(f"[{durum['saat'] // 1000:7d} ms] {m}\n")

    def pin(p):
        if type(p) is not int:
            raise YontemHatasi("'pin' tamsayı bekler")
        if p not in pinler:
            pinler[p] = {'kip': GIRIS, 'deger': False, 'pwm': 0, 'isr': None, 'tur': 0}
        return pinler[p]

    def tam(v, ad):
        if type(v) is not int:
            raise YontemHatasi(f"'{ad}' tamsayı bekler")
        return v

    def ilerle(hedef):
        while True:
            sec = -1
            for i, z in enumerate(zamanlar):
                if z['etkin'] and z['sonraki'] <= hedef and (sec < 0 or z['sonraki'] < zamanlar[sec]['sonraki']):
                    sec = i
            if sec < 0:
                break
            z = zamanlar[sec]
            durum['saat'] = max(durum['saat'], z['sonraki'])
            if z['tekrar']:
                z['sonraki'] += z['aralik']
            else:
                z['etkin'] = False
            y.cagir(z['f'], [])
        durum['saat'] = max(durum['saat'], hedef)

    U = {'giris': GIRIS, 'cikis': CIKIS, 'girisyukari': GIRIS_YUKARI, 'girisasagi': GIRIS_ASAGI,
         'yukselen': YUKSELEN, 'dusen': DUSEN, 'degisen': DEGISEN,
         'yuksek': True, 'dusuk': False, 'yerlesikled': 2, 'benzetim': True}

    def ekle(ad, en_az, en_cok, oto=False):
        def sar(f):
            from .sozcuk import katla
            U[katla(ad)] = yf(ad, en_az, en_cok, oto)(lambda y_, *a: f(*a))
            return f
        return sar

    @ekle('PinKipi', 2, 2)
    def _pin_kipi(p, k):
        d = pin(p)
        d['kip'] = tam(k, 'kip')
        if k == GIRIS_YUKARI:
            d['deger'] = True
        iz(f"pin {p} kipi {k}")

    @ekle('PinYaz', 2, 2)
    def _pin_yaz(p, v):
        if type(v) not in (bool, int):
            raise YontemHatasi("'PinYaz' mantıksal ya da tamsayı değer bekler")
        yeni = v != 0 if type(v) is int else v
        d = pin(p)
        eski = d['deger']
        d['deger'] = yeni
        iz(f"pin {p} = {1 if yeni else 0}")
        if d['isr'] is not None and eski != yeni:
            if d['tur'] == DEGISEN or (d['tur'] == YUKSELEN and yeni) or (d['tur'] == DUSEN and not yeni):
                y.cagir(d['isr'], [])

    @ekle('PinOku', 1, 1)
    def _pin_oku(p):
        return pin(p)['deger']

    @ekle('AnalogOku', 1, 1)
    def _analog_oku(p):
        d = pin(p)
        return d['pwm'] * 16 if d['pwm'] else (4095 if d['deger'] else 0)

    @ekle('PWMYaz', 2, 2)
    def _pwm_yaz(p, o):
        v = min(max(tam(o, 'oran'), 0), 255)
        pin(p)['pwm'] = v
        iz(f"pin {p} pwm {v}")

    @ekle('Bekle', 1, 1)
    def _bekle(ms):
        v = tam(ms, 'süre')
        if v > 0:
            ilerle(durum['saat'] + v * 1000)

    @ekle('BekleMikro', 1, 1)
    def _bekle_mikro(us):
        v = tam(us, 'süre')
        if v > 0:
            ilerle(durum['saat'] + v)

    @ekle('Milisaniye', 0, 0, True)
    def _ms():
        return durum['saat'] // 1000

    @ekle('Mikrosaniye', 0, 0, True)
    def _us():
        return durum['saat']

    def islev_denetle(f):
        if not callable(getattr(f, '__call__', None)) and not hasattr(f, 'params') and not isinstance(f, YerelFonksiyon):
            raise YontemHatasi("Kesme ve zamanlayıcılara parametresiz bir prosedür verilir: '@Prosedür' ya da 'prosedür başla ... bitir'")

    @ekle('KesmeBağla', 3, 3)
    def _kesme_bagla(p, f, tur):
        d = pin(p)
        d['isr'] = f
        d['tur'] = tam(tur, 'tür')
        iz(f"pin {p} kesmesi bağlandı")

    @ekle('KesmeÇöz', 1, 1)
    def _kesme_coz(p):
        pin(p)['isr'] = None

    def kur(tekrar):
        def f(ms, islev):
            v = tam(ms, 'süre')
            if v <= 0:
                raise YontemHatasi('Zamanlayıcı süresi pozitif olmalı')
            zamanlar.append({'f': islev, 'sonraki': durum['saat'] + v * 1000, 'aralik': v * 1000, 'tekrar': tekrar, 'etkin': True})
            return len(zamanlar) - 1
        return f
    ekle('ZamanlayıcıKur', 2, 2)(kur(True))
    ekle('ZamanlayıcıTek', 2, 2)(kur(False))

    @ekle('ZamanlayıcıDurdur', 1, 1)
    def _durdur(i):
        i = tam(i, 'kimlik')
        if 0 <= i < len(zamanlar):
            zamanlar[i]['etkin'] = False

    @ekle('SeriBaşlat', 1, 1)
    def _seri(b):
        iz(f"seri {tam(b, 'hız')} baud")

    @ekle('SeriVarMı', 0, 0, True)
    def _seri_var():
        return 0

    @ekle('SeriBaytOku', 0, 0, True)
    def _seri_oku():
        return -1

    @ekle('SeriBaytYaz', 1, 1)
    def _seri_yaz(b):
        y.yaz(chr(tam(b, 'bayt') & 255))

    @ekle('I2CBaşlat', 2, 3)
    def _i2c_baslat(sda, scl, hiz=100000):
        iz(f"i2c sda={sda} scl={scl} {hiz} Hz")

    def aygit(a):
        a = tam(a, 'adres')
        if a not in i2c:
            i2c[a] = {'bellek': [0] * 256, 'yazmac': 0}
        return i2c[a]

    def i2c_yaz(a, veri):
        if type(veri) is not list:
            raise YontemHatasi("'I2CYaz' bayt listesi bekler")
        d = aygit(a)
        if veri:
            r = veri[0]
            for i in range(1, len(veri)):
                d['bellek'][(r + i - 1) & 255] = veri[i] & 255
            d['yazmac'] = r
        iz(f"i2c 0x{a} ← {metne(veri)}")
        return 0

    def i2c_oku(a, n):
        d = aygit(a)
        return [d['bellek'][(d['yazmac'] + i) & 255] for i in range(tam(n, 'bayt sayısı'))]

    ekle('I2CYaz', 2, 2)(i2c_yaz)
    ekle('I2COku', 2, 2)(i2c_oku)
    ekle('I2CYazOku', 3, 3)(lambda a, v, n: (i2c_yaz(a, v), i2c_oku(a, n))[1])

    @ekle('SPIBaşlat', 3, 4)
    def _spi(sck, miso, mosi, hiz=1000000):
        iz(f"spi {hiz} Hz")

    @ekle('SPIAktar', 1, 1)
    def _spi_aktar(b):
        return tam(b, 'bayt') & 255

    return U
