"""Yöntem Pencere (UI) birimi — benzetim kipi.

JavaScript sürümüyle (js/src/calisma/pencere.ts) aynı davranır. Python yorumlayıcısında canlı arayüz
yoktur: bileşenler bellekte tutulur, olaylar Tıkla/Gir/Seç/Dokun ile benzetilir, Ağaç ve Çalıştır
arayüzü metin olarak gösterir. Canlı arayüz için program tarayıcıda (oyun alanı) ya da
'yontem paketle' ile üretilen web/mobil uygulamada çalıştırılır.
"""
from .hatalar import YontemHatasi
from .degerler import YerelFonksiyon

TUR_GORUNUM = {
    'etiket': 'Etiket', 'dugme': 'Düğme', 'giris': 'GirişKutusu', 'onay': 'OnayKutusu', 'kaydirici': 'Kaydırıcı',
    'secim': 'SeçimKutusu', 'yatay': 'Yatay', 'dikey': 'Dikey', 'tuval': 'Tuval', 'pencere': 'Pencere',
}


def _tur_adi(v):
    from .yorumlayici import tur_adi
    return tur_adi(v)


def _hata(m):
    raise YontemHatasi(m)


def _yf(ad, en_az, en_cok, f, oto=False):
    def calis(y, args):
        n = len(args)
        if n < en_az or n > en_cok:
            aralik = str(en_az) if en_az == en_cok else f"{en_az}..{en_cok}"
            raise YontemHatasi(f"'{ad}' {aralik} argüman bekler, {n} verildi")
        return f(*args)
    return YerelFonksiyon(ad, calis, oto)


def _tamsayi(v, ad):
    if type(v) is not int:
        _hata(f"'{ad}' tamsayı bekler, {_tur_adi(v)} verildi")
    return v


def _sayi(v, ad):
    if type(v) in (int, float):
        return v
    _hata(f"'{ad}' sayı bekler, {_tur_adi(v)} verildi")


def _mantiksal(v, ad):
    if type(v) is not bool:
        _hata(f"'{ad}' mantıksal değer bekler, {_tur_adi(v)} verildi")
    return v


class Bilesen:
    def __init__(self, durum, tur, oz, gizli=False):
        self.d = durum
        self.tur = tur
        if gizli:
            self.id = 0
        else:
            durum['sayac'] += 1
            self.id = durum['sayac']
        self.oz = {'etkin': True, 'gorunur': True}
        self.oz.update(oz)
        self.cocuklar = []
        self.ust = None
        self.isleyici = {}
        self.cizimler = []

    @property
    def TUR_ADI(self):
        return TUR_GORUNUM[self.tur]

    def kap(self):
        return self.tur in ('yatay', 'dikey', 'pencere')

    def ekle(self, c):
        u = self
        while u is not None:
            if u is c:
                _hata('Bir bileşen kendi içine eklenemez')
            u = u.ust
        if c.ust is not None and c in c.ust.cocuklar:
            c.ust.cocuklar.remove(c)
        c.ust = self
        self.cocuklar.append(c)

    def temizle(self):
        if self.kap():
            for c in self.cocuklar:
                c.ust = None
            self.cocuklar = []
        elif self.tur == 'tuval':
            self.cizimler = []

    def islev(self, olay, ad):
        y = self.d['y']

        def kaydet(f):
            if not y.cagrilabilir(f):
                _hata("Olay işleyicisi bir prosedür olmalı: '@Prosedür' ya da 'prosedür başla ... bitir'")
            self.isleyici[olay] = f
            return self
        return _yf(ad, 1, 1, kaydet)

    def ciz(self, k):
        self.cizimler.append(k)
        return None

    def k_al(self, ad, y):
        t, A = self.tur, TUR_GORUNUM[self.tur]
        oz = self.oz
        metne = y.metne
        if ad in ('etkin', 'gorunur'):
            return oz[ad]
        if ad == 'metin' and t in ('etiket', 'dugme', 'giris', 'onay'):
            return oz['metin']
        if ad == 'ipucu' and t == 'giris':
            return oz['ipucu']
        if ad == 'isaretli' and t == 'onay':
            return oz['isaretli']
        if ad in ('deger', 'enaz', 'encok') and t == 'kaydirici':
            return oz[ad]
        if ad == 'secili' and t == 'secim':
            return oz['secili']
        if ad == 'secenekler' and t == 'secim':
            return list(oz['secenekler'])
        if ad == 'secilimetin' and t == 'secim':
            return oz['secenekler'][oz['secili']] if oz['secili'] >= 0 else ''
        if ad in ('genislik', 'yukseklik') and t == 'tuval':
            return oz[ad]
        if ad == 'cocuklar' and self.kap():
            return list(self.cocuklar)
        if ad == 'tiklaninca' and t == 'dugme':
            return self.islev('tikla', 'Tıklanınca')
        if ad == 'degisince' and t in ('giris', 'onay', 'kaydirici', 'secim'):
            return self.islev('degis', 'Değişince')
        if ad == 'dokununca' and t == 'tuval':
            return self.islev('dokun', 'Dokununca')
        if ad == 'ekle' and self.kap():
            def ekle(*cs):
                for c in cs:
                    self.ekle(_bilesen_mi(c, 'Ekle'))
                return self
            return _yf('Ekle', 1, 64, ekle)
        if ad == 'temizle' and (self.kap() or t == 'tuval'):
            return _yf('Temizle', 0, 0, lambda: self.temizle(), True)
        if t == 'tuval':
            if ad == 'renk':
                return _yf('Renk', 1, 1, lambda r: self.ciz(['renk', metne(r)]))
            if ad == 'cizgi':
                return _yf('Çizgi', 4, 4, lambda a, b, c, d: self.ciz(
                    ['cizgi', _sayi(a, 'x1'), _sayi(b, 'y1'), _sayi(c, 'x2'), _sayi(d, 'y2')]))
            if ad == 'dikdortgen':
                return _yf('Dikdörtgen', 4, 5, lambda a, b, c, d, dolu=False: self.ciz(
                    ['dikdortgen', _sayi(a, 'x'), _sayi(b, 'y'), _sayi(c, 'genişlik'), _sayi(d, 'yükseklik'),
                     _mantiksal(dolu, 'dolu')]))
            if ad == 'daire':
                return _yf('Daire', 3, 4, lambda a, b, r, dolu=False: self.ciz(
                    ['daire', _sayi(a, 'x'), _sayi(b, 'y'), _sayi(r, 'yarıçap'), _mantiksal(dolu, 'dolu')]))
            if ad == 'yazi':
                return _yf('Yazı', 3, 3, lambda a, b, m: self.ciz(['yazi', _sayi(a, 'x'), _sayi(b, 'y'), metne(m)]))
            if ad == 'cizimsayisi':
                return sum(1 for k in self.cizimler if k[0] != 'renk')
        _hata(f"{A} bileşeninde '{ad}' üyesi yok")

    def k_ata(self, ad, v, y):
        t, A = self.tur, TUR_GORUNUM[self.tur]
        if ad in ('etkin', 'gorunur'):
            self.oz[ad] = _mantiksal(v, f"{A}.{'Etkin' if ad == 'etkin' else 'Görünür'}")
            return
        if ad == 'metin' and t in ('etiket', 'dugme', 'giris', 'onay'):
            self.oz['metin'] = y.metne(v)
            return
        if ad == 'ipucu' and t == 'giris':
            self.oz['ipucu'] = y.metne(v)
            return
        if ad == 'isaretli' and t == 'onay':
            self.oz['isaretli'] = _mantiksal(v, 'OnayKutusu.İşaretli')
            return
        if ad == 'deger' and t == 'kaydirici':
            self.oz['deger'] = _sinirla(self, _tamsayi(v, 'Kaydırıcı.Değer'))
            return
        if ad == 'secili' and t == 'secim':
            self.oz['secili'] = _secili_denetle(self, _tamsayi(v, 'SeçimKutusu.Seçili'))
            return
        if ad == 'secenekler' and t == 'secim':
            s = _secenekler(v, y)
            self.oz['secenekler'] = s
            if self.oz['secili'] >= len(s):
                self.oz['secili'] = 0 if s else -1
            elif self.oz['secili'] < 0 and s:
                self.oz['secili'] = 0
            return
        _hata(f"{A} bileşeninin '{ad}' üyesine atama yapılamaz")

    def __str__(self):
        if self.tur in ('etiket', 'dugme', 'onay'):
            return f'{TUR_GORUNUM[self.tur]}("{self.oz["metin"]}")'
        return f'{TUR_GORUNUM[self.tur]}#{self.id}'


def _bilesen_mi(v, ad):
    if not isinstance(v, Bilesen):
        _hata(f"'{ad}' bir arayüz bileşeni bekler, {_tur_adi(v)} verildi")
    return v


def _sinirla(b, v):
    return max(b.oz['enaz'], min(b.oz['encok'], v))


def _secili_denetle(b, v):
    if v < -1 or v >= len(b.oz['secenekler']):
        _hata(f"SeçimKutusu dizini sınır dışı: {v} ({len(b.oz['secenekler'])} seçenek)")
    return v


def _secenekler(v, y):
    if type(v) is not list:
        _hata(f"'SeçimKutusu' seçenek listesi bekler, {_tur_adi(v)} verildi")
    return [y.metne(x) for x in v]


def pencere_modulu(y):
    from .sozcuk import katla
    metne = y.metne
    d = {'y': y, 'sayac': 0, 'baslik': '', 'saat': 0}
    kok = Bilesen(d, 'pencere', {}, gizli=True)
    araliklar = []
    U = {}

    def uye(ad, en_az, en_cok, oto=False):
        def sar(f):
            U[katla(ad)] = _yf(ad, en_az, en_cok, f, oto)
            return f
        return sar

    def kur(tur, oz, cocuklar=()):
        b = Bilesen(d, tur, oz)
        for c in cocuklar:
            b.ekle(_bilesen_mi(c, TUR_GORUNUM[tur]))
        return b

    # ------------------------------------------------------------ olaylar
    def tikla(b):
        if b.tur != 'dugme':
            _hata(f"'Tıkla' bir Düğme bekler, {TUR_GORUNUM[b.tur]} verildi")
        if not b.oz['etkin'] or not b.oz['gorunur']:
            return
        if 'tikla' in b.isleyici:
            y.cagir(b.isleyici['tikla'], [])

    def degistir(b, v):
        if not b.oz['etkin']:
            return
        if b.tur == 'giris':
            b.oz['metin'] = metne(v)
        elif b.tur == 'onay':
            b.oz['isaretli'] = _mantiksal(v, 'Seç')
        elif b.tur == 'kaydirici':
            b.oz['deger'] = _sinirla(b, _tamsayi(v, 'Seç'))
        elif b.tur == 'secim':
            if type(v) is str:
                if v not in b.oz['secenekler']:
                    _hata(f"SeçimKutusu'nda '{v}' seçeneği yok")
                b.oz['secili'] = b.oz['secenekler'].index(v)
            else:
                b.oz['secili'] = _secili_denetle(b, _tamsayi(v, 'Seç'))
        else:
            _hata(f"'{TUR_GORUNUM[b.tur]}' değer almaz")
        if 'degis' in b.isleyici:
            y.cagir(b.isleyici['degis'], [])

    def ilerle(ms):
        hedef = d['saat'] + ms
        while True:
            sec = -1
            for i, z in enumerate(araliklar):
                if z['etkin'] and z['sonraki'] <= hedef and (sec < 0 or z['sonraki'] < araliklar[sec]['sonraki']):
                    sec = i
            if sec < 0:
                break
            z = araliklar[sec]
            d['saat'] = z['sonraki']
            z['sonraki'] += z['aralik']
            y.cagir(z['f'], [])
        d['saat'] = hedef

    # ------------------------------------------------------------ metin görünümü
    def satir(b):
        t, o = b.tur, b.oz
        s = TUR_GORUNUM[t]
        if t == 'pencere':
            if d['baslik']:
                s += f' "{d["baslik"]}"'
        elif t in ('etiket', 'dugme'):
            s += f' "{o["metin"]}"'
        elif t == 'giris':
            s += f' "{o["metin"]}"' + (f' (ipucu "{o["ipucu"]}")' if o['ipucu'] else '')
        elif t == 'onay':
            s += f" {'[x]' if o['isaretli'] else '[ ]'} \"{o['metin']}\""
        elif t == 'kaydirici':
            s += f" {o['deger']} ({o['enaz']}..{o['encok']})"
        elif t == 'secim':
            secili = o['secenekler'][o['secili']] if o['secili'] >= 0 else ''
            s += f' "{secili}" ({" | ".join(o["secenekler"])})'
        elif t == 'tuval':
            n = sum(1 for k in b.cizimler if k[0] != 'renk')
            s += f" {o['genislik']}x{o['yukseklik']} ({n} çizim)"
        if not o['etkin']:
            s += ' (devre dışı)'
        if not o['gorunur']:
            s += ' (gizli)'
        return s

    def agac():
        out = []

        def gez(b, derin):
            out.append('  ' * derin + satir(b))
            for c in b.cocuklar:
                gez(c, derin + 1)
        gez(kok, 0)
        return '\n'.join(out)

    # ------------------------------------------------------------ üyeler
    @uye('Etiket', 0, 1)
    def _etiket(m=''):
        return kur('etiket', {'metin': metne(m)})

    @uye('Düğme', 1, 1)
    def _dugme(m):
        return kur('dugme', {'metin': metne(m)})

    @uye('GirişKutusu', 0, 1)
    def _giris(ip=''):
        return kur('giris', {'metin': '', 'ipucu': metne(ip)})

    @uye('OnayKutusu', 1, 2)
    def _onay(m, isaretli=False):
        return kur('onay', {'metin': metne(m), 'isaretli': _mantiksal(isaretli, 'işaretli')})

    @uye('Kaydırıcı', 2, 3)
    def _kaydirici(a, b, deger=None):
        enaz, encok = _tamsayi(a, 'en az'), _tamsayi(b, 'en çok')
        if encok < enaz:
            _hata("'Kaydırıcı' için en çok, en azdan küçük olamaz")
        v = enaz if deger is None else _tamsayi(deger, 'değer')
        v = max(enaz, min(encok, v))
        return kur('kaydirici', {'deger': v, 'enaz': enaz, 'encok': encok})

    @uye('SeçimKutusu', 1, 1)
    def _secim(s):
        liste = _secenekler(s, y)
        return kur('secim', {'secenekler': liste, 'secili': 0 if liste else -1})

    @uye('Yatay', 0, 64)
    def _yatay(*cs):
        return kur('yatay', {}, cs)

    @uye('Dikey', 0, 64)
    def _dikey(*cs):
        return kur('dikey', {}, cs)

    @uye('Tuval', 2, 2)
    def _tuval(g, h):
        return kur('tuval', {'genislik': _tamsayi(g, 'genişlik'), 'yukseklik': _tamsayi(h, 'yükseklik')})

    @uye('Başlık', 1, 1)
    def _baslik(m):
        d['baslik'] = metne(m)

    @uye('Yerleştir', 1, 64)
    def _yerlestir(*cs):
        for c in cs:
            kok.ekle(_bilesen_mi(c, 'Yerleştir'))

    @uye('Temizle', 0, 0, oto=True)
    def _temizle():
        kok.temizle()

    @uye('Ağaç', 0, 0, oto=True)
    def _agac():
        return agac()

    @uye('Çalıştır', 0, 0, oto=True)
    def _calistir():
        y.yaz(agac() + '\n')

    @uye('Canlı', 0, 0, oto=True)
    def _canli():
        return False

    @uye('Tıkla', 1, 1)
    def _tikla(b):
        tikla(_bilesen_mi(b, 'Tıkla'))

    @uye('Gir', 2, 2)
    def _gir(b, m):
        k = _bilesen_mi(b, 'Gir')
        if k.tur != 'giris':
            _hata(f"'Gir' bir GirişKutusu bekler, {TUR_GORUNUM[k.tur]} verildi")
        degistir(k, metne(m))

    @uye('Seç', 2, 2)
    def _sec(b, v):
        k = _bilesen_mi(b, 'Seç')
        if k.tur == 'giris':
            _hata("GirişKutusu'na metin 'Gir' ile yazılır")
        degistir(k, v)

    @uye('Dokun', 3, 3)
    def _dokun(b, x, yy):
        k = _bilesen_mi(b, 'Dokun')
        x, yy = _tamsayi(x, 'x'), _tamsayi(yy, 'y')
        if k.tur != 'tuval':
            _hata(f"'Dokun' bir Tuval bekler, {TUR_GORUNUM[k.tur]} verildi")
        if 'dokun' in k.isleyici:
            y.cagir(k.isleyici['dokun'], [x, yy])

    @uye('İlerle', 1, 1)
    def _ilerle(ms):
        v = _tamsayi(ms, 'süre')
        if v > 0:
            ilerle(v)

    @uye('Aralıkla', 2, 2)
    def _aralikla(ms, f):
        v = _tamsayi(ms, 'süre')
        if v <= 0:
            _hata('Aralık süresi pozitif olmalı')
        if not y.cagrilabilir(f):
            _hata("Olay işleyicisi bir prosedür olmalı: '@Prosedür' ya da 'prosedür başla ... bitir'")
        araliklar.append({'f': f, 'aralik': v, 'sonraki': d['saat'] + v, 'etkin': True})
        return len(araliklar) - 1

    @uye('AralığıDurdur', 1, 1)
    def _durdur(i):
        i = _tamsayi(i, 'kimlik')
        if 0 <= i < len(araliklar):
            araliklar[i]['etkin'] = False

    return U
