"""Yöntem yorumlayıcısı (ağaç dolaşan yorumlayıcı)."""
import os
import sys

from .hatalar import (YontemHatasi, SozdizimHatasi, DonSinyali, KirSinyali, DevamSinyali,
                      DurSinyali, Sinyal)
from .sozcuk import katla, sozcukle
from .cozumleyici import Cozumleyici, N
from .degerler import (YOK, YerelFonksiyon, KFonksiyon, BagliMetod, KurucuBagli, KSinif,
                       KNesne, KModul, KTip, DiziTipi, PascalDizi, Ref, HataNesnesi)

TEMEL_TIPLER = {
    'tamsayi': 'tamsayi', 'ondalik': 'ondalik', 'gercek': 'ondalik', 'metin': 'metin',
    'karakter': 'karakter', 'mantiksal': 'mantiksal', 'liste': 'liste', 'sozluk': 'sozluk',
    'tensor': 'tensor', 'herhangi': None, 'nesne': None, 'islev': None,
}
TIP_ADLARI = {'tamsayi': 'tamsayı', 'ondalik': 'ondalık', 'metin': 'metin',
              'karakter': 'karakter', 'mantiksal': 'mantıksal', 'liste': 'liste',
              'sozluk': 'sözlük', 'tensor': 'tensör'}

def paket_dizinleri(dizin):
    """'yontem paket' ile kurulan paketlerin birim dizinleri (JavaScript derleyicisiyle aynı kural):
    yukarı doğru yontem.json içeren ilk klasörün paketler/<Ad> ve varsa paketler/<Ad>/kutuphane klasörleri."""
    d = os.path.abspath(dizin)
    while not os.path.isfile(os.path.join(d, 'yontem.json')):
        ust = os.path.dirname(d)
        if ust == d:
            return []
        d = ust
    pd = os.path.join(d, 'paketler')
    try:
        adlar = sorted(a for a in os.listdir(pd) if not a.startswith('.') and os.path.isdir(os.path.join(pd, a)))
    except OSError:
        return []
    out = []
    for a in adlar:
        out.append(os.path.join(pd, a))
        k = os.path.join(pd, a, 'kutuphane')
        if os.path.isdir(k):
            out.append(k)
    return out


KUTUPHANE_DIZINI = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'kutuphane')
if not os.path.isdir(KUTUPHANE_DIZINI):   # pip ile kurulduğunda standart birimler paketin içindedir
    KUTUPHANE_DIZINI = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_kutuphane')


class Kapsam:
    __slots__ = ('d', 'tip', 'sabit', 'ust', 'ithal', 'eleman')

    def __init__(self, ust=None):
        self.d = {}
        self.tip = {}
        self.eleman = {}     # liste değişkenlerinin eleman tipi
        self.sabit = set()
        self.ust = ust
        self.ithal = set()   # birimlerden gelen (gölgelenebilir) adlar


class NesneKapsami:
    """Metod gövdesinde alanlara ve metodlara niteliksiz erişim sağlar."""
    __slots__ = ('nesne', 'ust')

    def __init__(self, nesne, ust):
        self.nesne = nesne
        self.ust = ust


def tur_adi(v):
    from .yz import Tensor
    t = type(v)
    if t is bool:
        return 'mantıksal'
    if t is int:
        return 'tamsayı'
    if t is float:
        return 'ondalık'
    if t is str:
        return 'metin'
    if v is None:
        return 'boş'
    if t is list:
        return 'liste'
    if t is dict:
        return 'sözlük'
    if t is KNesne:
        return v.sinif.ad
    if t is PascalDizi:
        return 'dizi'
    if t is KSinif:
        return 'sınıf'
    if t is KModul:
        return 'birim'
    if t in (KFonksiyon, YerelFonksiyon, BagliMetod, KurucuBagli):
        return 'fonksiyon'
    if t is Tensor:
        return 'tensör'
    if t is HataNesnesi:
        return 'hata'
    return getattr(v, 'TUR_ADI', t.__name__)


def _ondalik_yaz(v):
    if v != v:
        return 'TS'          # tanımsız sayı (NaN)
    if v in (float('inf'), float('-inf')):
        return '∞' if v > 0 else '-∞'
    return repr(v)


class Yorumlayici:
    def __init__(self, argumanlar=(), yaz=None, oku=None):
        self.kok = Kapsam()
        self.birimler = {}
        self.yukleniyor = set()
        self.dizinler = []
        self.argumanlar = list(argumanlar)
        self.yaz = yaz or (lambda s: sys.stdout.write(s))
        self.oku = oku or (lambda: sys.stdin.readline())
        self.evrensel = None
        self.kabuk = False
        self._girdi_tamponu = None
        self._ifade = {
            'sabitdeger': self.i_sabit, 'ad': self.i_ad, 'alan': self.i_alan,
            'indeks': self.i_indeks, 'cagri': self.i_cagri, 'ikili': self.i_ikili,
            'tekli': self.i_tekli, 'mantik': self.i_mantik, 'kendi': self.i_kendi,
            'miras': self.i_miras, 'lambda': self.i_lambda, 'liste': self.i_liste,
            'sozluk': self.i_sozluk, 'aralik_liste': self.i_aralik, 'boru': self.i_boru,
            'bicim': self.i_bicim, 'ref': self.i_ref, 'kosullu': self.i_kosullu,
        }
        self._deyim = {
            'blok': self.d_blok, 'atama': self.d_atama, 'cagri_deyim': self.d_cagri,
            'eger': self.d_eger, 'iken': self.d_iken, 'icin': self.d_icin, 'her': self.d_her,
            'tekrarla': self.d_tekrarla, 'sec': self.d_sec, 'kez': self.d_kez, 'dene': self.d_dene,
            'firlat': self.d_firlat, 'don': self.d_don, 'kir': self.d_kir,
            'devam': self.d_devam, 'bos': self.d_bos, 'yerel_degisken': self.d_yerel_degisken,
        }
        from . import yerlesik
        yerlesik.kur(self)

    # ================================================================ çalıştırma
    def dosya_calistir(self, yol):
        with open(yol, encoding='utf-8') as f:
            kaynak = f.read()
        return self.calistir(kaynak, yol)

    def calistir(self, kaynak, dosya='<girdi>'):
        agac = Cozumleyici(sozcukle(kaynak, dosya), dosya).dosya_coz()
        if agac.tur == 'birim':
            raise YontemHatasi("Birim dosyaları doğrudan çalıştırılamaz; 'kullan' ile yükleyin", 1, dosya)
        dizin = os.path.dirname(os.path.abspath(dosya)) if dosya != '<girdi>' else os.getcwd()
        self.dizinler = [dizin, os.path.join(dizin, 'kutuphane')]
        if os.path.basename(dizin).lower() in ('testler', 'test', 'tests'):
            ust = os.path.dirname(dizin)
            self.dizinler += [ust, os.path.join(ust, 'kutuphane')]
        self.dizinler.append(KUTUPHANE_DIZINI)
        for yol in os.environ.get('YONTEM_YOL', '').split(os.pathsep):
            if yol:
                self.dizinler.append(yol)
        self.dizinler += paket_dizinleri(dizin)
        k = Kapsam(self.kok)
        self.evrensel = k
        for ad, satir in agac.kullan:
            self.kullan(k, ad, satir, dosya)
        self.bildirimleri_isle(agac.bildirimler, k, dosya)
        try:
            self.yurut_blok(agac.govde.deyimler, k)
        except DonSinyali:
            pass
        return 0

    # ================================================================ birimler
    def kullan(self, hedef, ad_ham, satir, dosya):
        try:
            mod = self.birim_yukle(ad_ham)
        except YontemHatasi as e:
            if e.satir is None:
                e.satir, e.dosya = satir, dosya
            raise
        for ad in mod.adlar():
            try:
                hedef.d[ad] = mod.al(ad)
                hedef.ithal.add(ad)
            except YontemHatasi:
                pass
        hedef.d[katla(ad_ham)] = mod
        hedef.ithal.add(katla(ad_ham))

    def birim_dosyasi_bul(self, ad):
        for dz in self.dizinler:
            if not os.path.isdir(dz):
                continue
            for f in os.listdir(dz):
                kok, uz = os.path.splitext(f)
                if uz.lower() == '.y' and katla(kok) == ad:
                    return os.path.join(dz, f)
        return None

    def birim_yukle(self, ad_ham):
        from .yerlesik import YEREL_MODULLER
        ad = katla(ad_ham)
        if ad in self.birimler:
            return self.birimler[ad]
        if ad in YEREL_MODULLER:
            mod = KModul(ad_ham, uyeler=YEREL_MODULLER[ad](self))
            self.birimler[ad] = mod
            return mod
        if ad in self.yukleniyor:
            raise YontemHatasi(f"Döngüsel birim kullanımı: '{ad_ham}'")
        yol = self.birim_dosyasi_bul(ad)
        if yol is None:
            raise YontemHatasi(f"Birim bulunamadı: '{ad_ham}' (aranan: {', '.join(self.dizinler)})")
        self.yukleniyor.add(ad)
        try:
            with open(yol, encoding='utf-8') as f:
                agac = Cozumleyici(sozcukle(f.read(), yol), yol).dosya_coz()
            if agac.tur != 'birim':
                raise YontemHatasi(f"'{yol}' bir birim değil (birim Ad; ile başlamalı)")
            k = Kapsam(self.kok)
            for kad, satir in agac.kullan:
                self.kullan(k, kad, satir, yol)
            disa = None
            if agac.arayuz is not None:
                disa = set()
                for b in agac.arayuz:
                    if b.tur == 'degisken':
                        disa.update(b.adlar)
                    elif b.tur == 'altprogram' and b.sinif_adi:
                        continue
                    else:
                        disa.add(b.ad)
                self.bildirimleri_isle([b for b in agac.arayuz if b.tur != 'altprogram'], k, yol)
            self.bildirimleri_isle(agac.uygulama, k, yol)
            mod = KModul(agac.ad, kapsam=k, disa=disa)
            self.birimler[ad] = mod
            if agac.baslangic:
                self.yurut_blok(agac.baslangic, k)
            return mod
        finally:
            self.yukleniyor.discard(ad)

    # ================================================================ bildirimler
    def bildirimleri_isle(self, lst, k, dosya=None):
        for b in lst:
            try:
                self.bildirim(b, k)
            except YontemHatasi as e:
                if e.satir is None:
                    e.satir, e.dosya = b.satir, dosya
                raise

    def tanimla(self, k, ad, v, ham=None):
        if ad in k.d and ad not in k.ithal and not self.kabuk:
            raise YontemHatasi(f"'{ham or ad}' bu kapsamda zaten tanımlı "
                               f"(Yöntem büyük/küçük harf ve ş/s, ç/c gibi farkları ayırt etmez)")
        k.ithal.discard(ad)
        k.d[ad] = v

    def bildirim(self, b, k):
        t = b.tur
        if t == 'sabit':
            v = self.deg(b.ifade, k)
            if b.tip is not None:
                v = self.uyumla(self.tip_coz(b.tip, k), v, b.ham)
            self.tanimla(k, b.ad, v, b.ham)
            k.sabit.add(b.ad)
        elif t == 'degisken':
            self.degisken_tanimla(b, k)
        elif t == 'tipdef':
            self.tip_tanimla(b, k)
        elif t == 'altprogram':
            if b.sinif_adi:
                s = self.ad_al(k, b.sinif_adi, b)
                if type(s) is not KSinif:
                    raise YontemHatasi(f"'{b.sinif_adi}' bir sınıf değil")
                if b.govde is not None:
                    s.metodlar[b.ad] = self.altprogram_fonk(b, k, s)
            elif b.govde is not None:
                self.tanimla(k, b.ad, self.altprogram_fonk(b, k, None), b.ham)

    def d_yerel_degisken(self, b, k):
        self.degisken_tanimla(b, k)

    def degisken_tanimla(self, b, k):
        tip = self.tip_coz(b.tip, k) if b.tip is not None else None
        for ad, ham in zip(b.adlar, b.hamlar):
            if b.ilk is not None:
                v = self.uyumla(tip, self.deg(b.ilk, k), ham)
            else:
                v = self.varsayilan(tip)
            self.tanimla(k, ad, v, ham)
            if tip is not None:
                k.tip[ad] = tip
                if tip == 'liste':
                    k.eleman[ad] = (b.tip, k)

    def altprogram_fonk(self, b, k, sinif):
        return KFonksiyon(b.ham, b.cesit, b.params, b.donus, b.yerel, b.govde, None, k, sinif,
                          oto=True, direktifler=b.direktifler)

    def tip_tanimla(self, b, k):
        t = b.tanim
        if t.tur in ('sinif', 'kayit'):
            eb = None
            if t.ebeveyn:
                eb = self.ad_al(k, t.ebeveyn, b)
                if type(eb) is not KSinif:
                    raise YontemHatasi(f"Ebeveyn '{t.ebeveyn}' bir sınıf değil")
            s = KSinif(b.ham, eb, t.tur == 'kayit', k)
            s.alanlar = t.alanlar
            for m in t.metodlar:
                f = self.altprogram_fonk(m, k, s)
                if m.govde is not None or m.ad not in s.metodlar:
                    s.metodlar[m.ad] = f
            self.tanimla(k, b.ad, s, b.ham)
        else:
            self.tanimla(k, b.ad, KTip(self.tip_coz(t, k), b.ham, self.eleman_coz(t, k)), b.ham)

    # ================================================================ tipler
    def tip_coz(self, n, k):
        if n is None:
            return None
        if n.tur == 'tip_dizi':
            el = self.tip_coz(n.eleman, k) if n.eleman is not None else None
            if n.alt is None:
                return 'liste'
            alt, ust = self.deg(n.alt, k), self.deg(n.ust, k)
            if type(alt) is not int or type(ust) is not int or ust < alt:
                raise YontemHatasi("Dizi sınırları geçersiz")
            return DiziTipi(alt, ust, el)
        if n.modul is None and n.ad in TEMEL_TIPLER:
            return TEMEL_TIPLER[n.ad]
        if n.modul is not None:
            mod = self.ad_al(k, n.modul, n)
            v = mod.al(n.ad) if type(mod) is KModul else YOK
        else:
            v = self.ad_bul(k, n.ad)
        if type(v) is KSinif:
            return v
        if type(v) is KTip:
            return v.spec
        raise YontemHatasi(f"Bilinmeyen tip: '{n.ham}'")

    def eleman_coz(self, n, k):
        """Liste tipinin eleman tipi (bilinmiyorsa None)."""
        if n is None:
            return None
        if n.tur == 'tip_dizi':
            return self.tip_coz(n.eleman, k) if n.eleman is not None else None
        if n.modul is None and n.ad in TEMEL_TIPLER:
            el = getattr(n, 'eleman', None)
            return self.tip_coz(el, k) if (TEMEL_TIPLER[n.ad] == 'liste' and el is not None) else None
        if n.modul is not None:
            mod = self.ad_al(k, n.modul, n)
            v = mod.al(n.ad) if type(mod) is KModul else YOK
        else:
            v = self.ad_bul(k, n.ad)
        return v.eleman if type(v) is KTip else None

    def _eleman_tipi(self, h, k):
        """h (ad düğümü) ile anılan liste değişkeninin ya da alanının eleman tipi."""
        if h.tur != 'ad':
            return None
        s = k
        while s is not None:
            if type(s) is Kapsam:
                if h.ad in s.d:
                    e = s.eleman.get(h.ad)
                    return self.eleman_coz(e[0], e[1]) if e else None
            elif h.ad in s.nesne.alanlar:
                sinif = s.nesne.sinif
                while sinif is not None:
                    for ad, _, tipn, _ in sinif.alanlar:
                        if ad == h.ad:
                            return self.eleman_coz(tipn, sinif.kapanis)
                    sinif = sinif.ebeveyn
                return None
            s = s.ust
        return None

    def _boyutla(self, n, k):
        """L.Uzunluk(n[, ilk]): listeyi sabit boyutlu yapar; L liste değilse YOK döner."""
        h = n.cagrilan.nesne
        x = self.ad_al(k, h.ad, h) if h.tur == 'ad' else self.deg(h, k)
        if type(x) not in (list, PascalDizi):
            return YOK
        args = [self.deg(a, k) for a in n.argumanlar]
        adet, ilk = args[0], (args[1] if len(args) > 1 else 0)
        if type(adet) is not int or adet < 0:
            raise YontemHatasi('Uzunluk: eleman sayısı sıfır ya da pozitif bir tamsayı olmalı')
        if type(ilk) is not int:
            raise YontemHatasi('Uzunluk: ilk eleman numarası tamsayı olmalı')
        eski = x if type(x) is list else x.veri
        el = self._eleman_tipi(h, k)
        veri = [eski[i] if i < len(eski) else self.varsayilan(el) for i in range(adet)]
        self.ata(h, PascalDizi(ilk, veri), k)
        return None

    def varsayilan(self, tip):
        if tip is None:
            return None
        if type(tip) is str:
            return {'tamsayi': 0, 'ondalik': 0.0, 'metin': '', 'karakter': '',
                    'mantiksal': False, 'liste': [], 'sozluk': {}, 'tensor': None}[tip] \
                if tip not in ('liste', 'sozluk') else ([] if tip == 'liste' else {})
        if type(tip) is KSinif:
            if tip.kayit:
                return self.nesne_olustur(tip, None, [], None)
            return None
        if type(tip) is DiziTipi:
            return PascalDizi(tip.alt, [self.varsayilan(tip.eleman) for _ in range(tip.ust - tip.alt + 1)])
        return None

    def uyumla(self, tip, v, ad):
        if tip is None:
            return v
        tv = type(v)
        if type(tip) is str:
            if tip == 'tamsayi':
                if tv is int:
                    return v
            elif tip == 'ondalik':
                if tv is float:
                    return v
                if tv is int:
                    return float(v)
            elif tip == 'metin':
                if tv is str:
                    return v
            elif tip == 'mantiksal':
                if tv is bool:
                    return v
            elif tip == 'karakter':
                if tv is str and len(v) <= 1:
                    return v
            elif tip == 'liste':
                if tv is list or tv is PascalDizi:
                    return v
            elif tip == 'sozluk':
                if tv is dict:
                    return v
            elif tip == 'tensor':
                from .yz import Tensor
                from .mesale import MTensor
                if tv is Tensor or tv is MTensor or v is None:
                    return v
            beklenen = TIP_ADLARI.get(tip, tip)
        elif type(tip) is KSinif:
            if v is None and not tip.kayit:
                return v
            if tv is KNesne and v.sinif.turevi_mi(tip):
                if tip.kayit:
                    kopya = KNesne(v.sinif)
                    kopya.alanlar = dict(v.alanlar)
                    return kopya
                return v
            beklenen = tip.ad
        elif type(tip) is DiziTipi:
            if tv is PascalDizi or tv is list:
                return v
            beklenen = 'dizi'
        else:
            return v
        raise YontemHatasi(f"'{ad}' için tip uyuşmazlığı: {beklenen} bekleniyordu, "
                           f"{tur_adi(v)} verildi")

    # ================================================================ adlar
    def ad_bul(self, k, ad):
        s = k
        while s is not None:
            if type(s) is Kapsam:
                v = s.d.get(ad, YOK)
                if v is not YOK:
                    return v
            else:
                n = s.nesne
                v = n.alanlar.get(ad, YOK)
                if v is not YOK:
                    return v
                m = n.sinif.metod_bul(ad)
                if m is not None:
                    return BagliMetod(m, n)
            s = s.ust
        return YOK

    def ad_al(self, k, ad, dugum):
        v = self.ad_bul(k, ad)
        if v is YOK:
            ham = getattr(dugum, 'ham', None) or ad
            ipucu = {'yazsatir': " — yeni satır için yaz(değer, 1) kullanın",
                     'okusatir': " — satır okumak için oku(değişken, 1) kullanın"}.get(ad, '')
            raise YontemHatasi(f"Tanımsız tanımlayıcı: '{ham}'{ipucu}")
        return v

    def ad_ata(self, k, ad, v, dugum=None):
        s = k
        while s is not None:
            if type(s) is Kapsam:
                if ad in s.d:
                    if ad in s.sabit:
                        raise YontemHatasi(f"Sabite atama yapılamaz: '{ad}'")
                    t = s.tip.get(ad)
                    if t is not None:
                        v = self.uyumla(t, v, ad)
                    s.d[ad] = v
                    return
            else:
                n = s.nesne
                if ad in n.alanlar:
                    t = n.sinif.alan_tipi(ad)
                    if t is not None:
                        v = self.uyumla(t, v, ad)
                    n.alanlar[ad] = v
                    return
            s = s.ust
        ham = getattr(dugum, 'ham', None) or ad
        raise YontemHatasi(f"Tanımsız değişken: '{ham}' (önce 'değişken' ile tanımlayın)")

    # ================================================================ deyimler
    def yurut(self, d, k):
        try:
            self._deyim[d.tur](d, k)
        except YontemHatasi as e:
            if e.satir is None:
                e.satir = d.satir
                e.dosya = getattr(d, 'dosya', None)
            raise
        except Sinyal:
            raise
        except RecursionError:
            raise YontemHatasi("Yığın taşması (çok derin özyineleme)", d.satir, getattr(d, 'dosya', None))
        except ZeroDivisionError:
            raise YontemHatasi("Sıfıra bölme", d.satir, getattr(d, 'dosya', None))
        except OverflowError:
            raise YontemHatasi("Sayısal taşma", d.satir, getattr(d, 'dosya', None))
        except Exception as e:  # pragma: no cover - beklenmeyen iç hatalar
            raise YontemHatasi(f"İç hata: {type(e).__name__}: {e}", d.satir, getattr(d, 'dosya', None))

    def yurut_blok(self, deyimler, k):
        y = self.yurut
        for d in deyimler:
            y(d, k)

    def d_bos(self, d, k):
        pass

    def d_blok(self, d, k):
        self.yurut_blok(d.deyimler, k)

    def d_atama(self, d, k):
        v = self.deg(d.deger, k)
        if d.op != ':=':
            eski = self.deg(d.hedef, k)
            v = self.ikili({'+=': '+', '-=': '-', '*=': '*', '/=': '/'}[d.op], eski, v)
        self.ata(d.hedef, v, k)

    def ata(self, h, v, k):
        t = h.tur
        if t == 'ad':
            self.ad_ata(k, h.ad, v, h)
        elif t == 'alan':
            self.alan_ata(self.deg(h.nesne, k), h.ad, v)
        elif t == 'indeks':
            c = self.deg(h.nesne, k)
            idx = [self.deg(i, k) for i in h.indeksler]
            if type(c) is str:
                if len(idx) != 1:
                    raise YontemHatasi("Metin tek dizinle erişilir")
                i = idx[0]
                if type(i) is not int or not 1 <= i <= len(c):
                    raise YontemHatasi(f"Metin dizini sınır dışı: {i}")
                self.ata(h.nesne, c[:i - 1] + self.metne(v) + c[i:], k)
                return
            self.indeks_ata(c, idx, v)
        else:
            raise YontemHatasi("Geçersiz atama hedefi")

    def d_cagri(self, d, k):
        e = d.ifade
        if e.tur in ('ad', 'alan', 'miras'):
            f = self.cagrilan(e, k)
            if self.cagrilabilir(f):
                self.cagir(f, [], d.satir)
                return
            raise YontemHatasi("Bu ifade deyim olarak kullanılamaz (çağrılabilir değil)")
        self.deg(e, k)

    def d_eger(self, d, k):
        if self.kosul(d.kosul, k):
            self.yurut(d.o, k)
        elif d.degilse is not None:
            self.yurut(d.degilse, k)

    def kosul(self, n, k):
        v = self.deg(n, k)
        if type(v) is not bool:
            raise YontemHatasi(f"Koşul mantıksal olmalı, {tur_adi(v)} verildi")
        return v

    def d_iken(self, d, k):
        kosul, govde, y = d.kosul, d.govde, self.yurut
        while self.kosul(kosul, k):
            try:
                y(govde, k)
            except KirSinyali:
                break
            except DevamSinyali:
                continue

    def d_tekrarla(self, d, k):
        while True:
            try:
                self.yurut_blok(d.govde, k)
            except KirSinyali:
                break
            except DevamSinyali:
                pass
            if self.kosul(d.kosul, k):
                break

    def d_kez(self, d, k):
        n = self.deg(d.sayi, k)
        if type(n) is not int:
            raise YontemHatasi(f"'kez tekrarla' tamsayı bekler, {tur_adi(n)} verildi")
        govde, y = d.govde, self.yurut
        for _ in range(n):
            try:
                y(govde, k)
            except KirSinyali:
                break
            except DevamSinyali:
                continue

    def _dongu_degiskeni(self, k, ad):
        if self.ad_bul(k, ad) is YOK:
            k.d[ad] = None

    def d_icin(self, d, k):
        bas, bit = self.deg(d.bas, k), self.deg(d.bit, k)
        adim = self.deg(d.adim, k) if d.adim is not None else 1
        if type(bas) is not int or type(bit) is not int or type(adim) is not int:
            raise YontemHatasi("'için' döngüsünde başlangıç, bitiş ve adım tamsayı olmalı")
        if adim <= 0:
            raise YontemHatasi(f"'için' döngüsünde adım pozitif olmalı ({adim} verildi); yön 'artan' ya da 'azalan' ile belirtilir")
        if d.yon < 0:
            aralik = range(bas, bit - 1, -adim)
        else:
            aralik = range(bas, bit + 1, adim)
        self._dongu_degiskeni(k, d.ad)
        ad, govde, y, ata = d.ad, d.govde, self.yurut, self.ad_ata
        for i in aralik:
            ata(k, ad, i, d)
            try:
                y(govde, k)
            except KirSinyali:
                break
            except DevamSinyali:
                continue

    def d_her(self, d, k):
        kaynak = self.deg(d.kaynak, k)
        if d.ad2 is not None:
            if type(kaynak) is dict:
                ogeler = list(kaynak.items())
            else:
                ogeler = list(enumerate(self.yinelenebilir(kaynak)))
        else:
            ogeler = self.yinelenebilir(kaynak)
        self._dongu_degiskeni(k, d.ad)
        if d.ad2 is not None:
            self._dongu_degiskeni(k, d.ad2)
        for o in ogeler:
            if d.ad2 is not None:
                self.ad_ata(k, d.ad, o[0], d)
                self.ad_ata(k, d.ad2, o[1], d)
            else:
                self.ad_ata(k, d.ad, o, d)
            try:
                self.yurut(d.govde, k)
            except KirSinyali:
                break
            except DevamSinyali:
                continue

    def yinelenebilir(self, v):
        from .yz import Tensor
        t = type(v)
        if t is list:
            return list(v)
        if t is dict:
            return list(v.keys())
        if t is str:
            return list(v)
        if t is PascalDizi:
            return list(v.veri)
        if t is Tensor:
            return v.ogeler()
        if hasattr(v, 'yinele_'):
            return v.yinele_()
        raise YontemHatasi(f"{tur_adi(v)} üzerinde yinelenemez")

    def d_sec(self, d, k):
        v = self.deg(d.secici, k)
        for etiketler, deyim in d.kollar:
            for a, b in etiketler:
                if b is None:
                    if v == self.deg(a, k):
                        self.yurut(deyim, k)
                        return
                else:
                    if self.deg(a, k) <= v <= self.deg(b, k):
                        self.yurut(deyim, k)
                        return
        if d.varsayilan is not None:
            self.yurut_blok(d.varsayilan, k)

    def d_dene(self, d, k):
        try:
            try:
                self.yurut_blok(d.govde, k)
            except YontemHatasi as e:
                if d.yakala is None:
                    raise
                if d.yakala_ad is not None:
                    if e.deger is not None:
                        hv = e.deger
                    else:
                        hv = HataNesnesi(e.mesaj, 'Hata', e.satir)
                    k.d[d.yakala_ad] = hv
                self.yurut_blok(d.yakala, k)
        finally:
            if d.sonunda is not None:
                self.yurut_blok(d.sonunda, k)

    def d_firlat(self, d, k):
        v = self.deg(d.ifade, k)
        if type(v) is str:
            v = HataNesnesi(v, 'Hata', d.satir)
        if type(v) is HataNesnesi:
            if v.satir is None:
                v.satir = d.satir
            raise YontemHatasi(v.mesaj, deger=v)
        if type(v) is KNesne:
            mesaj = v.alanlar.get('mesaj', v.sinif.ad)
            raise YontemHatasi(f"{v.sinif.ad}: {self.metne(mesaj)}", deger=v)
        raise YontemHatasi(self.metne(v), deger=v)

    def d_don(self, d, k):
        raise DonSinyali(self.deg(d.ifade, k) if d.ifade is not None else YOK)

    def d_kir(self, d, k):
        raise KirSinyali()

    def d_devam(self, d, k):
        raise DevamSinyali()

    # ================================================================ ifadeler
    def deg(self, n, k):
        return self._ifade[n.tur](n, k)

    def i_sabit(self, n, k):
        return n.deger

    def i_kendi(self, n, k):
        v = self.ad_bul(k, 'kendi')
        if v is YOK:
            raise YontemHatasi("'kendi' yalnızca metodlar içinde kullanılabilir")
        return v

    def i_ad(self, n, k):
        return self.oto(self.ad_al(k, n.ad, n), n.satir)

    def i_alan(self, n, k):
        ks = self._konum_sil(n, k)
        if ks is not None:
            return self.oto(ks, n.satir)
        return self.oto(self.alan_al(self.deg(n.nesne, k), n.ad, n.ham), n.satir)

    def _konum_sil(self, n, k):
        """L(2).Sil: L bir liste, dizi ya da sözlükse Sil(L, 2) ile aynıdır."""
        c = n.nesne
        if n.ad != 'sil' or c.tur != 'cagri' or c.cagrilan.tur != 'ad' or len(c.argumanlar) != 1:
            return None
        x = self.ad_al(k, c.cagrilan.ad, c.cagrilan)
        if type(x) not in (list, dict, PascalDizi):
            return None
        i = self.deg(c.argumanlar[0], k)
        sil = self.yerlesik_sil
        return YerelFonksiyon('Sil', lambda y, a: sil.fn(y, [x, i]), oto=True)

    def i_miras(self, n, k):
        return self.oto(self.miras_coz(n, k), n.satir)

    def i_kosullu(self, n, k):
        return self.deg(n.a, k) if self.kosul(n.kosul, k) else self.deg(n.b, k)

    def i_ref(self, n, k):
        return self.cagrilan(n.ifade, k)

    def oto(self, v, satir):
        t = type(v)
        if t is KFonksiyon:
            if v.oto:
                return self.kfonk_cagir(v, [], None, satir)
        elif t is BagliMetod:
            if v.fn.oto:
                return self.kfonk_cagir(v.fn, [], v.nesne, satir)
        elif t is YerelFonksiyon:
            if v.oto:
                return v.fn(self, [])
        elif t is KurucuBagli:
            if v.fn is None or not v.fn.params:
                return self.cagir(v, [], satir)
        return v

    def cagrilan(self, n, k):
        t = n.tur
        if t == 'ad':
            return self.ad_al(k, n.ad, n)
        if t == 'alan':
            ks = self._konum_sil(n, k)
            if ks is not None:
                return ks
            return self.alan_al(self.deg(n.nesne, k), n.ad, n.ham)
        if t == 'miras':
            return self.miras_coz(n, k)
        return self.deg(n, k)

    def miras_coz(self, n, k):
        nesne = self.ad_bul(k, 'kendi')
        sinif = self.ad_bul(k, '__sinif__')
        if nesne is YOK or sinif is YOK:
            raise YontemHatasi("'miras' yalnızca metodlar içinde kullanılabilir")
        ad = n.ad or self.ad_bul(k, '__metod__')
        eb = sinif.ebeveyn
        m = eb.metod_bul(ad) if eb is not None else None
        if m is None:
            # Ebeveynde karşılığı yoksa (ör. kurucu) etkisiz.
            return YerelFonksiyon('miras', lambda y, a: None, oto=True)
        if n.ad is None:
            argumanlar = self.ad_bul(k, '__argumanlar__')
            bm = BagliMetod(m, nesne)
            return YerelFonksiyon('miras', lambda y, a: y.cagir(bm, a or argumanlar, n.satir), oto=True)
        return BagliMetod(m, nesne)

    def i_lambda(self, n, k):
        return KFonksiyon('<lambda>', 'lambda', n.params, n.donus, n.yerel, n.govde, n.ifade, k,
                          None, oto=False)

    def i_liste(self, n, k):
        return [self.deg(e, k) for e in n.elemanlar]

    def i_sozluk(self, n, k):
        return {self.deg(a, k): self.deg(b, k) for a, b in n.ciftler}

    def i_aralik(self, n, k):
        a, b = self.deg(n.alt, k), self.deg(n.ust, k)
        if type(a) is int and type(b) is int:
            return list(range(a, b + 1))
        if type(a) is str and type(b) is str and len(a) == 1 and len(b) == 1:
            return [chr(c) for c in range(ord(a), ord(b) + 1)]
        raise YontemHatasi("[a..b] aralığında tamsayı veya karakter bekleniyordu")

    def i_boru(self, n, k):
        v = self.deg(n.sol, k)
        sag = n.sag
        if sag.tur == 'cagri':
            f = self.cagrilan(sag.cagrilan, k)
            return self.cagir(f, [v] + [self.deg(a, k) for a in sag.argumanlar], n.satir)
        return self.cagir(self.cagrilan(sag, k), [v], n.satir)

    def i_bicim(self, n, k):
        v = self.deg(n.ifade, k)
        gen = self.deg(n.genislik, k)
        if n.hassasiyet is not None:
            h = self.deg(n.hassasiyet, k)
            if type(v) in (int, float):
                return f"{float(v):>{gen}.{h}f}"
        return self.metne(v).rjust(gen)

    def i_mantik(self, n, k):
        a = self.deg(n.sol, k)
        op = n.op
        if type(a) is bool:
            if op == 've':
                if not a:
                    return False
                b = self.deg(n.sag, k)
            elif op == 'veya':
                if a:
                    return True
                b = self.deg(n.sag, k)
            else:
                b = self.deg(n.sag, k)
                if type(b) is not bool:
                    raise YontemHatasi("'yada' iki mantıksal değer bekler")
                return a != b
            if type(b) is not bool:
                raise YontemHatasi(f"'{op}' mantıksal değer bekler, {tur_adi(b)} verildi")
            return b
        b = self.deg(n.sag, k)
        if type(a) is int and type(b) is int:
            return a & b if op == 've' else (a | b if op == 'veya' else a ^ b)
        raise YontemHatasi(f"'{op}' mantıksal veya tamsayı bekler, {tur_adi(a)} verildi")

    def i_tekli(self, n, k):
        v = self.deg(n.ifade, k)
        op = n.op
        if op == 'degil':
            if type(v) is bool:
                return not v
            if type(v) is int:
                return ~v
            raise YontemHatasi(f"'değil' mantıksal değer bekler, {tur_adi(v)} verildi")
        if op == '-':
            if type(v) in (int, float) or type(v).__name__ == 'Tensor':
                return -v
            raise YontemHatasi(f"Tekli '-' sayı bekler, {tur_adi(v)} verildi")
        return v

    def i_ikili(self, n, k):
        return self.ikili(n.op, self.deg(n.sol, k), self.deg(n.sag, k))

    def ikili(self, op, a, b):
        ta, tb = type(a), type(b)
        sayi_a = ta is int or ta is float
        sayi_b = tb is int or tb is float
        if sayi_a and sayi_b:
            if op == '+':
                return a + b
            if op == '-':
                return a - b
            if op == '*':
                return a * b
            if op == '/':
                if b == 0:
                    raise YontemHatasi("Sıfıra bölme")
                return a / b
            if op == '<':
                return a < b
            if op == '>':
                return a > b
            if op == '<=':
                return a <= b
            if op == '>=':
                return a >= b
            if op == '=':
                return a == b
            if op == '<>':
                return a != b
            if op == 'bol':
                if ta is not int or tb is not int:
                    raise YontemHatasi("'böl' tamsayı bölmesidir; tamsayı bekler")
                if b == 0:
                    raise YontemHatasi("Sıfıra bölme")
                q = abs(a) // abs(b)
                return q if (a >= 0) == (b >= 0) else -q
            if op == 'mod':
                if ta is not int or tb is not int:
                    raise YontemHatasi("'mod' tamsayı bekler")
                if b == 0:
                    raise YontemHatasi("Sıfıra bölme")
                r = abs(a) % abs(b)
                return r if a >= 0 else -r
            if op == '**':
                if a == 0 and b < 0:
                    raise YontemHatasi("Sıfıra bölme")
                r = a ** b
                if type(r) is complex:
                    raise YontemHatasi("Negatif sayının kesirli kuvveti tanımsız")
                return r
            if op == '@':
                return a * b
            if op == 'icinde':
                raise YontemHatasi("'içinde' sağ tarafta koleksiyon bekler")
        if ta is KNesne and op in _OP_METOD:
            m = a.sinif.metod_bul(_OP_METOD[op])
            if m is not None:
                return self.kfonk_cagir(m, [b], a, None)
        if op == '=':
            return a == b
        if op == '<>':
            if ta is KNesne:
                m = a.sinif.metod_bul('esit')
                if m is not None:
                    return not self.kfonk_cagir(m, [b], a, None)
            return a != b
        if op == 'icinde':
            if tb is PascalDizi:
                return a in b.veri
            if tb in (list, dict, str):
                if tb is str and ta is not str:
                    raise YontemHatasi("Metin içinde yalnızca metin aranabilir")
                return a in b
            raise YontemHatasi(f"'içinde' sağ tarafta koleksiyon bekler, {tur_adi(b)} verildi")
        if op == '+':
            if ta is str or tb is str:
                return self.metne(a) + self.metne(b)
            if ta is list and tb is list:
                return a + b
        if op == '*' and ((ta is str and tb is int) or (ta is list and tb is int)):
            return a * b
        if op in ('<', '>', '<=', '>=') and ta is str and tb is str:
            return {'<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b}[op]
        from .mesale import MTensor
        if ta is MTensor or tb is MTensor:
            from .mesale import islem
            return islem(op, a, b)
        from .yz import Tensor
        if ta is Tensor or tb is Tensor or (op == '@' and ta is list and tb is list):
            if ta is list:
                a = Tensor.yap(a)
            if tb is list:
                b = Tensor.yap(b)
            if op == '+':
                return a + b
            if op == '-':
                return a - b
            if op == '*':
                return a * b
            if op == '/':
                return a / b
            if op == '@':
                return a @ b
            if op == '**':
                return a ** b
        raise YontemHatasi(f"'{_OP_GORUNUM.get(op, op)}' işlemi {tur_adi(a)} ve {tur_adi(b)} için tanımlı değil")

    # ---------------------------------------------------------------- alanlar
    def alan_al(self, o, ad, ham=None):
        t = type(o)
        if t is KNesne:
            v = o.alanlar.get(ad, YOK)
            if v is not YOK:
                return v
            m = o.sinif.metod_bul(ad)
            if m is not None:
                return BagliMetod(m, o)
            raise YontemHatasi(f"'{o.sinif.ad}' nesnesinde '{ham or ad}' üyesi yok")
        if t is KSinif:
            m = o.metod_bul(ad)
            if m is not None and m.tur == 'kurucu':
                return KurucuBagli(o, m)
            if m is None and ad in ('olustur', 'yeni'):
                return KurucuBagli(o, None)
            if m is not None:
                raise YontemHatasi(f"'{ham or ad}' bir kurucu değil; nesne üzerinden çağırın")
            raise YontemHatasi(f"'{o.ad}' sınıfında '{ham or ad}' kurucusu yok")
        if t is KModul:
            return o.al(ad)
        if o is None:
            raise YontemHatasi(f"'boş' değerin '{ham or ad}' üyesine erişilemez")
        from .yerlesik import YONTEMLER
        tablo = YONTEMLER.get(t)
        if tablo is not None:
            f = tablo.get(ad)
            if f is not None:
                return f(o)
        if hasattr(o, 'k_al'):
            return o.k_al(ad, self)
        raise YontemHatasi(f"{tur_adi(o)} türünde '{ham or ad}' üyesi yok")

    def alan_ata(self, o, ad, v):
        t = type(o)
        if t is KNesne:
            if ad not in o.alanlar:
                raise YontemHatasi(f"'{o.sinif.ad}' nesnesinde '{ad}' alanı yok")
            tip = o.sinif.alan_tipi(ad)
            if tip is not None:
                v = self.uyumla(tip, v, ad)
            o.alanlar[ad] = v
            return
        if hasattr(o, 'k_ata'):
            o.k_ata(ad, v, self)
            return
        raise YontemHatasi(f"{tur_adi(o)} türünde '{ad}' alanına atama yapılamaz")

    # ---------------------------------------------------------------- dizinler
    def i_indeks(self, n, k):
        c = self.deg(n.nesne, k)
        if len(n.indeksler) == 1 and not _tensor_mu(c):
            return self.indeks_al(c, self.deg(n.indeksler[0], k))
        return self._coklu_al(c, [self.deg(i, k) for i in n.indeksler])

    def indeks_al(self, c, i):
        t = type(c)
        if t is list:
            if type(i) is not int:
                raise YontemHatasi("Liste dizini tamsayı olmalı")
            try:
                return c[i]
            except IndexError:
                raise YontemHatasi(f"Liste dizini sınır dışı: {i} (uzunluk {len(c)})")
        if t is dict:
            try:
                return c[i]
            except KeyError:
                raise YontemHatasi(f"Sözlükte anahtar yok: {self.temsil(i, 1)}")
            except TypeError:
                raise YontemHatasi("Bu değer sözlük anahtarı olamaz")
        if t is str:
            if type(i) is not int or not 1 <= i <= len(c):
                raise YontemHatasi(f"Metin dizini sınır dışı: {i} (metin dizinleri 1'den başlar)")
            return c[i - 1]
        if t is PascalDizi:
            return c.al(i)
        if _tensor_mu(c):
            return c.indeks_al([i])
        if t is KNesne:
            m = c.sinif.metod_bul('indeksal')
            if m is not None:
                return self.kfonk_cagir(m, [i], c, None)
        raise YontemHatasi(f"{tur_adi(c)} dizinlenemez")

    def indeks_ata(self, c, idx, v):
        if _tensor_mu(c):
            c.indeks_ata(idx, v)
            return
        for i in idx[:-1]:
            c = self.indeks_al(c, i)
        i = idx[-1]
        t = type(c)
        if t is list:
            if type(i) is not int:
                raise YontemHatasi("Liste dizini tamsayı olmalı")
            try:
                c[i] = v
            except IndexError:
                raise YontemHatasi(f"Liste dizini sınır dışı: {i} (uzunluk {len(c)})")
        elif t is dict:
            try:
                c[i] = v
            except TypeError:
                raise YontemHatasi("Bu değer sözlük anahtarı olamaz")
        elif t is PascalDizi:
            c.ata(i, v)
        elif _tensor_mu(c):
            c.indeks_ata([i], v)
        elif t is KNesne and c.sinif.metod_bul('indeksata') is not None:
            self.kfonk_cagir(c.sinif.metod_bul('indeksata'), [i, v], c, None)
        else:
            raise YontemHatasi(f"{tur_adi(c)} dizinle değiştirilemez")

    # ---------------------------------------------------------------- çağrılar
    def ref_olustur(self, n, k):
        if n.tur == 'ad':
            ad = n.ad
            return Ref(lambda: self.ad_al(k, ad, n), lambda v: self.ad_ata(k, ad, v, n))
        if n.tur == 'alan':
            o = self.deg(n.nesne, k)
            return Ref(lambda: self.alan_al(o, n.ad), lambda v: self.alan_ata(o, n.ad, v))
        if n.tur == 'indeks':
            c = self.deg(n.nesne, k)
            idx = [self.deg(i, k) for i in n.indeksler]
            if type(c) is str:
                return Ref(lambda: self.indeks_al(c, idx[0]), lambda v: self.ata(n, v, k))
            return Ref(lambda: self._coklu_al(c, idx), lambda v: self.indeks_ata(c, idx, v))
        raise YontemHatasi("Referans (değişken) parametreye yalnızca değişken verilebilir")

    def _coklu_al(self, c, idx):
        if _tensor_mu(c):
            return c.indeks_al(idx)
        for i in idx:
            c = self.indeks_al(c, i)
        return c

    def i_cagri(self, n, k):
        c = n.cagrilan
        if (c.tur == 'alan' and c.ad == 'uzunluk' and 1 <= len(n.argumanlar) <= 2
                and c.nesne.tur in ('ad', 'alan', 'indeks')):
            r = self._boyutla(n, k)
            if r is not YOK:
                return r
        f = self.cagrilan(n.cagrilan, k)
        tf = type(f)
        fn = f.fn if tf is BagliMetod else f
        if type(fn) is KFonksiyon and fn.ref_indeksler:
            args, refs = [], {}
            for i, a in enumerate(n.argumanlar):
                if i in fn.ref_indeksler:
                    r = self.ref_olustur(a, k)
                    refs[i] = r
                    args.append(r.al())
                else:
                    args.append(self.deg(a, k))
            return self.cagir(f, args, n.satir, refs)
        if tf is YerelFonksiyon and f.ref:
            args = [self.ref_olustur(a, k) if i in f.ref else self.deg(a, k)
                    for i, a in enumerate(n.argumanlar)]
            return f.fn(self, args)
        return self.cagir(f, [self.deg(a, k) for a in n.argumanlar], n.satir)

    def cagrilabilir(self, f):
        return type(f) in (KFonksiyon, YerelFonksiyon, BagliMetod, KurucuBagli, KSinif)

    def cagir(self, f, args, satir=None, refs=None):
        t = type(f)
        if t is YerelFonksiyon:
            return f.fn(self, args)
        if t is KFonksiyon:
            return self.kfonk_cagir(f, args, None, satir, refs)
        if t is BagliMetod:
            return self.kfonk_cagir(f.fn, args, f.nesne, satir, refs)
        if t is KurucuBagli:
            return self.nesne_olustur(f.sinif, f.fn, args, satir)
        if t is KSinif:
            m = f.metod_bul('olustur')
            if m is None:
                for mm in f.metodlar.values():
                    if mm.tur == 'kurucu':
                        m = mm
                        break
            return self.nesne_olustur(f, m, args, satir)
        raise YontemHatasi(f"{tur_adi(f)} çağrılamaz")

    def metod_cagir(self, nesne, ad, args):
        m = nesne.sinif.metod_bul(katla(ad))
        if m is None:
            raise YontemHatasi(f"'{nesne.sinif.ad}' nesnesinde '{ad}' metodu yok")
        return self.kfonk_cagir(m, args, nesne, None)

    def kfonk_cagir(self, f, args, nesne, satir, refs=None):
        if f.govde is None and f.ifade is None:
            if 'soyut' in f.direktifler:
                raise YontemHatasi(f"Soyut metod çağrılamaz: '{f.ad}'")
            raise YontemHatasi(f"'{f.ad}' metodunun gövdesi tanımlanmamış")
        params = f.params
        if len(args) > len(params):
            raise YontemHatasi(f"'{f.ad}' en çok {len(params)} argüman alır, {len(args)} verildi")
        kap = f.kapanis
        k = Kapsam(NesneKapsami(nesne, kap) if nesne is not None else kap)
        d = k.d
        for i, p in enumerate(params):
            if i < len(args):
                v = args[i]
            elif p.varsayilan is not None:
                v = self.deg(p.varsayilan, kap)
            else:
                raise YontemHatasi(f"'{f.ad}' için '{p.ham}' argümanı eksik")
            if p.tip is not None:
                tip = self.tip_coz(p.tip, kap)
                v = self.uyumla(tip, v, p.ham)
                k.tip[p.ad] = tip
                if tip == 'liste':
                    k.eleman[p.ad] = (p.tip, kap)
            d[p.ad] = v
        if nesne is not None:
            d['kendi'] = nesne
            d['__sinif__'] = f.sinif
            d['__metod__'] = katla(f.ad)
            d['__argumanlar__'] = args
        sonuc_tipi = None
        if f.donus is not None:
            sonuc_tipi = self.tip_coz(f.donus, kap)
            d['sonuc'] = self.varsayilan(sonuc_tipi)
            k.tip['sonuc'] = sonuc_tipi
        elif f.tur in ('fonksiyon', 'lambda'):
            d['sonuc'] = None
        if f.ifade is not None:
            return self.uyumla(sonuc_tipi, self.deg(f.ifade, k), 'sonuç')
        if f.yerel:
            self.bildirimleri_isle(f.yerel, k)
        try:
            self.yurut_blok(f.govde.deyimler, k)
        except DonSinyali as s:
            if s.deger is not YOK:
                d['sonuc'] = self.uyumla(sonuc_tipi, s.deger, 'sonuç')
        except (KirSinyali, DevamSinyali):
            raise YontemHatasi("'kır'/'devam' döngü dışında kullanıldı")
        if refs:
            for i, r in refs.items():
                r.ata(d[params[i].ad])
        if f.tur == 'kurucu':
            return nesne
        return d.get('sonuc')

    def nesne_olustur(self, sinif, kurucu, args, satir):
        nesne = KNesne(sinif)
        self.alanlari_baslat(sinif, nesne)
        if kurucu is not None:
            self.kfonk_cagir(kurucu, args, nesne, satir)
        elif args:
            if sinif.kayit or not sinif.metod_bul('olustur'):
                # Kayıtlar / kurucusuz sınıflar: alanları sırayla doldur.
                adlar = self._tum_alanlar(sinif)
                if len(args) > len(adlar):
                    raise YontemHatasi(f"'{sinif.ad}' en çok {len(adlar)} alan alır")
                for ad, v in zip(adlar, args):
                    self.alan_ata(nesne, ad, v)
        return nesne

    def _tum_alanlar(self, sinif):
        zincir = []
        s = sinif
        while s is not None:
            zincir.append(s)
            s = s.ebeveyn
        return [a[0] for s in reversed(zincir) for a in s.alanlar]

    def alanlari_baslat(self, sinif, nesne):
        if sinif.ebeveyn is not None:
            self.alanlari_baslat(sinif.ebeveyn, nesne)
        if sinif.tipler is None:
            sinif.tipler = {ad: self.tip_coz(tip, sinif.kapanis) for ad, _, tip, _ in sinif.alanlar}
        for ad, ham, tip, ilk in sinif.alanlar:
            t = sinif.tipler[ad]
            if ilk is not None:
                nesne.alanlar[ad] = self.uyumla(t, self.deg(ilk, sinif.kapanis), ham)
            else:
                nesne.alanlar[ad] = self.varsayilan(t)

    # ================================================================ metne çevirme
    def metne(self, v):
        t = type(v)
        if t is str:
            return v
        if t is bool:
            return 'doğru' if v else 'yanlış'
        if t is int:
            return str(v)
        if t is float:
            return _ondalik_yaz(v)
        if v is None:
            return 'boş'
        return self.temsil(v)

    def temsil(self, v, derin=0):
        t = type(v)
        if t is str:
            return "'" + v.replace("'", "''") + "'" if derin else v
        if t in (bool, int, float) or v is None:
            return self.metne(v)
        if derin > 6:
            return '...'
        if t is list:
            return '[' + ', '.join(self.temsil(x, derin + 1) for x in v) + ']'
        if t is PascalDizi:
            return '[' + ', '.join(self.temsil(x, derin + 1) for x in v.veri) + ']'
        if t is dict:
            if not v:
                return '[:]'
            return '[' + ', '.join(f"{self.temsil(a, derin + 1)}: {self.temsil(b, derin + 1)}"
                                   for a, b in v.items()) + ']'
        if t is KNesne:
            m = v.sinif.metod_bul('metnecevir')
            if m is not None:
                return self.metne(self.kfonk_cagir(m, [], v, None))
            alanlar = ', '.join(f"{a}: {self.temsil(b, derin + 1)}" for a, b in v.alanlar.items())
            return f"{v.sinif.ad}({alanlar})"
        if t is KSinif:
            return f"<sınıf {v.ad}>"
        if t is KModul:
            return f"<birim {v.ad}>"
        if t in (KFonksiyon, YerelFonksiyon):
            return f"<fonksiyon {v.ad}>"
        if t is BagliMetod:
            return f"<metod {v.nesne.sinif.ad}.{v.fn.ad}>"
        if t is KurucuBagli:
            return f"<kurucu {v.sinif.ad}>"
        return str(v)


_OP_METOD = {'+': 'topla', '-': 'cikar', '*': 'carp', '/': 'bolme', '=': 'esit', '<': 'kucuk',
             '>': 'buyuk'}
_OP_GORUNUM = {'bol': 'böl', 'icinde': 'içinde'}

_TENSOR = None


def _tensor_tipi():
    global _TENSOR
    if _TENSOR is None:
        from .yz import Tensor
        _TENSOR = Tensor
    return _TENSOR


def _tensor_mu(c):
    from .mesale import MTensor
    t = type(c)
    return t is _tensor_tipi() or t is MTensor
