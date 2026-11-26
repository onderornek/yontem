"""Yöntem çalışma zamanı değer türleri."""
from .hatalar import YontemHatasi

YOK = object()   # "bulunamadı" işareti


class YerelFonksiyon:
    """Python ile yazılmış yerleşik fonksiyon. fn(yorumlayici, argumanlar)."""
    __slots__ = ('ad', 'fn', 'oto', 'ref', 'gc')

    def __init__(self, ad, fn, oto=False, ref=frozenset()):
        self.ad = ad
        self.fn = fn
        self.oto = oto          # parantezsiz anıldığında otomatik çağrılsın mı
        self.ref = ref          # referansla (değişken) alınan argüman sıraları
        self.gc = False         # 'aynı anda' gövdesinde ağ isteğinde bekleyebilir (Ağ birimi istekleri)


class KFonksiyon:
    """Yöntem dilinde tanımlanmış fonksiyon / prosedür / metod / lambda."""
    __slots__ = ('ad', 'tur', 'params', 'donus', 'yerel', 'govde', 'ifade', 'kapanis',
                 'sinif', 'oto', 'ref_indeksler', 'direktifler', 'uretec')

    def __init__(self, ad, tur, params, donus, yerel, govde, ifade, kapanis, sinif=None,
                 oto=True, direktifler=()):
        self.ad = ad
        self.tur = tur
        self.params = params
        self.donus = donus
        self.yerel = yerel
        self.govde = govde
        self.ifade = ifade
        self.kapanis = kapanis
        self.sinif = sinif
        self.oto = oto and not params
        self.ref_indeksler = frozenset(i for i, p in enumerate(params) if p.ref)
        self.direktifler = direktifler
        self.uretec = False     # gövdesinde 'üret' var: çağrı bir akış döndürür


class BagliMetod:
    __slots__ = ('fn', 'nesne')

    def __init__(self, fn, nesne):
        self.fn = fn
        self.nesne = nesne


class KurucuBagli:
    """`Sinif.Olustur` ifadesi: çağrıldığında yeni nesne üretir."""
    __slots__ = ('sinif', 'fn')

    def __init__(self, sinif, fn):
        self.sinif = sinif
        self.fn = fn


class KSinif:
    __slots__ = ('ad', 'ebeveyn', 'alanlar', 'metodlar', 'kayit', 'kapanis', 'tipler')

    def __init__(self, ad, ebeveyn, kayit, kapanis):
        self.ad = ad
        self.ebeveyn = ebeveyn
        self.alanlar = []       # (ad, ham, tip_dugumu, ilk_dugumu)
        self.metodlar = {}
        self.kayit = kayit
        self.kapanis = kapanis
        self.tipler = None      # çözülmüş alan tipleri (tembel)

    def metod_bul(self, ad):
        s = self
        while s is not None:
            m = s.metodlar.get(ad)
            if m is not None:
                return m
            s = s.ebeveyn
        return None

    def turevi_mi(self, diger):
        s = self
        while s is not None:
            if s is diger:
                return True
            s = s.ebeveyn
        return False

    def alan_tipi(self, ad):
        s = self
        while s is not None:
            if s.tipler and ad in s.tipler:
                return s.tipler[ad]
            s = s.ebeveyn
        return None


class KNesne:
    __slots__ = ('sinif', 'alanlar')

    def __init__(self, sinif):
        self.sinif = sinif
        self.alanlar = {}


class KModul:
    __slots__ = ('ad', 'uyeler', 'kapsam', 'disa')

    def __init__(self, ad, uyeler=None, kapsam=None, disa=None):
        self.ad = ad
        self.uyeler = uyeler
        self.kapsam = kapsam
        self.disa = disa

    def adlar(self):
        if self.uyeler is not None:
            return list(self.uyeler)
        return list(self.disa) if self.disa is not None else [
            a for a in self.kapsam.d if not a.startswith('__')]

    def al(self, ad):
        if self.uyeler is not None:
            v = self.uyeler.get(ad, YOK)
        else:
            if self.disa is not None and ad not in self.disa:
                raise YontemHatasi(f"'{self.ad}' biriminde '{ad}' dışa aktarılmamış")
            v = self.kapsam.d.get(ad, YOK)
        if v is YOK:
            raise YontemHatasi(f"'{self.ad}' biriminde '{ad}' yok")
        return v


class KTip:
    __slots__ = ('spec', 'ad', 'eleman')

    def __init__(self, spec, ad, eleman=None):
        self.spec = spec
        self.ad = ad
        self.eleman = eleman    # liste tipiyse eleman tipi (L.Uzunluk(n) yeni elemanları bununla doldurur)


class DiziTipi:
    __slots__ = ('alt', 'ust', 'eleman')

    def __init__(self, alt, ust, eleman):
        self.alt = alt
        self.ust = ust
        self.eleman = eleman


class PascalDizi:
    """Alt sınırı belirtilen sabit boyutlu dizi: tamsayı dizisi[1..10]."""
    __slots__ = ('alt', 'veri')

    def __init__(self, alt, veri):
        self.alt = alt
        self.veri = veri

    def _i(self, i):
        if type(i) is not int:
            raise YontemHatasi("Liste dizini tamsayı olmalı")
        j = i - self.alt
        if j < 0 or j >= len(self.veri):
            raise YontemHatasi(f"Liste dizini sınır dışı: {i} (geçerli {self.alt}..{self.alt + len(self.veri) - 1})")
        return j

    def al(self, i):
        return self.veri[self._i(i)]

    def ata(self, i, v):
        self.veri[self._i(i)] = v


class Ref:
    """Referans (değişken) parametreler için sol-değer sarmalayıcı."""
    __slots__ = ('al', 'ata')

    def __init__(self, al, ata):
        self.al = al
        self.ata = ata


class HataNesnesi:
    __slots__ = ('mesaj', 'tur', 'satir')

    def __init__(self, mesaj, tur='Hata', satir=None):
        self.mesaj = mesaj
        self.tur = tur
        self.satir = satir

    def k_al(self, ad, y):
        if ad == 'mesaj':
            return self.mesaj
        if ad == 'tur':
            return self.tur
        if ad == 'satir':
            return self.satir
        raise YontemHatasi(f"Hata nesnesinde '{ad}' üyesi yok")

    def __str__(self):
        return f"{self.tur}: {self.mesaj}"
