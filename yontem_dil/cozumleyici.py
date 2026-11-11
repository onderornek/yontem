"""Yöntem sözdizimi çözümleyici (özyinelemeli iniş ayrıştırıcı).

Üretilen soyut sözdizimi ağacı (SSA) düğümleri `N` nesneleridir; `tur` alanı
düğüm türünü belirtir.
"""
from .hatalar import SozdizimHatasi
from .sozcuk import katla

DIREKTIFLER = {'sanal', 'ezer', 'soyut', 'ileri', 'asiri', 'statik'}
GORUNURLUK = {'ozel', 'genel', 'korumali', 'yayinlanmis'}
ATAMA_OPLARI = (':=', '+=', '-=', '*=', '/=')
DEYIM_ANAHTARLARI = {'basla', 'eger', 'icin', 'her', 'iken', 'tekrarla', 'dene', 'firlat', 'don',
                     'cik', 'kir', 'devam', 'degisken'}
ILISKI_OPLARI = ('=', '<>', '<', '>', '<=', '>=')


class N:
    def __init__(self, tur, satir, **kw):
        self.tur = tur
        self.satir = satir
        self.__dict__.update(kw)

    def __repr__(self):
        alanlar = ', '.join(f"{k}={v!r}" for k, v in self.__dict__.items()
                            if k not in ('tur', 'satir'))
        return f"{self.tur}({alanlar})"


class Cozumleyici:
    def __init__(self, sozcukler, dosya='<girdi>'):
        self.s = sozcukler
        self.i = 0
        self.dosya = dosya

    # ---------------------------------------------------------- yardımcılar
    @property
    def t(self):
        return self.s[self.i]

    def bak(self, k=1):
        return self.s[min(self.i + k, len(self.s) - 1)]

    def ilerle(self):
        tok = self.s[self.i]
        if tok.tip != 'SON':
            self.i += 1
        return tok

    def as_mi(self, *kel):
        t = self.s[self.i]
        return t.tip == 'AS' and t.deger in kel

    def op_mu(self, *ops):
        t = self.s[self.i]
        return t.tip == 'OP' and t.deger in ops

    def ad_mi(self, *adlar):
        t = self.s[self.i]
        return t.tip == 'AD' and (not adlar or t.deger in adlar)

    def hata(self, msg, tok=None):
        tok = tok or self.t
        if tok.tip == 'AD' and tok.deger == 'son':
            msg += " — blokları kapatmak için 'son' yerine 'bitir' kullanın"
        elif tok.tip == 'AD' and tok.deger == 'baslangic':
            msg += " — birim başlatma bölümü 'başla' ile başlar"
        elif tok.tip == 'AD' and tok.deger == 'ki' and self.i > 0 and self.s[self.i - 1].deger == 'ta':
            msg += " — 'ta ki koşul' yerine 'koşul olana dek' yazın"
        elif tok.tip == 'AD' and tok.deger == 'yap':
            msg += " — döngü başlıkları artık 'yap' ile bitmez (ör. 'x < 10 iken', '1'den 10'a kadar her i için')"
        raise SozdizimHatasi(f"{msg} ('{tok.ham}' bulundu, sütun {tok.sutun})", tok.satir, self.dosya)

    def satir_sonu_mu(self):
        """Önceki sözcük ile şimdiki arasında satır sonu var mı?"""
        return self.i > 0 and self.t.satir > self.s[self.i - 1].satir

    def ayirici(self):
        """Komut/bildirim ayırıcısı: ';' ya da satır sonu."""
        if self.op_mu(';'):
            self.ilerle()
            return
        if self.t.tip == 'SON' or self.satir_sonu_mu():
            return
        self.hata("';' ya da satır sonu bekleniyordu")

    def bekle_as(self, kel):
        if not self.as_mi(kel):
            self.hata(f"'{kel}' bekleniyordu")
        return self.ilerle()

    def bekle_op(self, op):
        if not self.op_mu(op):
            self.hata(f"'{op}' bekleniyordu")
        return self.ilerle()

    def bekle_ad(self):
        if self.t.tip == 'AS':
            self.hata(f"Tanımlayıcı bekleniyordu; '{self.t.ham}' bir anahtar sözcüktür ve ad olarak kullanılamaz")
        if self.t.tip != 'AD':
            self.hata("Tanımlayıcı bekleniyordu")
        return self.ilerle()

    # ---------------------------------------------------------- dosya
    def dosya_coz(self):
        if self.as_mi('birim'):
            return self.birim_coz()
        satir = self.t.satir
        ad = None
        if self.as_mi('program'):
            self.ilerle()
            ad = self.bekle_ad().ham
            self.ayirici()
        kullan = self.kullan_coz()
        bildirimler = self.bildirimler_coz()
        govde = self.birlesik_coz()
        if self.op_mu('.'):
            self.ilerle()
        elif self.t.tip != 'SON':
            self.hata("Program sonunda 'bitir.' bekleniyordu")
        if self.t.tip != 'SON':
            self.hata("'bitir.' sonrasında beklenmeyen kod")
        return N('program', satir, ad=ad, kullan=kullan, bildirimler=bildirimler, govde=govde)

    def birim_coz(self):
        satir = self.t.satir
        self.bekle_as('birim')
        ad = self.bekle_ad().ham
        self.ayirici()
        kullan = self.kullan_coz()
        arayuz = None
        if self.as_mi('arayuz'):
            self.ilerle()
            kullan += self.kullan_coz()
            arayuz = self.bildirimler_coz('arayuz')
            self.bekle_as('uygulama')
            kullan += self.kullan_coz()
        uygulama = self.bildirimler_coz()
        baslangic = []
        if self.as_mi('basla'):
            self.ilerle()
            baslangic = self.deyimler_coz(('bitir',))
        self.bekle_as('bitir')
        if self.op_mu('.'):
            self.ilerle()
        return N('birim', satir, ad=ad, kullan=kullan, arayuz=arayuz,
                 uygulama=uygulama, baslangic=baslangic)

    def kullan_coz(self):
        lst = []
        while self.as_mi('kullan'):
            self.ilerle()
            while True:
                tok = self.bekle_ad()
                lst.append((tok.ham, tok.satir))
                if self.op_mu(','):
                    self.ilerle()
                    continue
                break
            self.ayirici()
        return lst

    # ---------------------------------------------------------- bildirimler
    def bildirimler_coz(self, baglam='normal'):
        lst = []
        while True:
            if self.as_mi('sabit'):
                self.ilerle()
                while self.t.tip == 'AD':
                    tok = self.ilerle()
                    tip = None
                    if self.op_mu(':'):
                        self.ilerle()
                        tip = self.tip_coz()
                    if not self.op_mu('=', ':='):
                        self.hata("Sabit için '=' bekleniyordu")
                    self.ilerle()
                    ifade = self.ifade()
                    self.ayirici()
                    lst.append(N('sabit', tok.satir, ad=tok.deger, ham=tok.ham, tip=tip, ifade=ifade))
            elif self.as_mi('degisken'):
                self.ilerle()
                while self.t.tip == 'AD':
                    lst.append(self.degisken_grubu())
                    self.ayirici()
            elif self.as_mi('tip'):
                self.ilerle()
                while self.t.tip == 'AD':
                    tok = self.ilerle()
                    self.bekle_op('=')
                    tanim = self.tip_tanimi_coz()
                    self.ayirici()
                    lst.append(N('tipdef', tok.satir, ad=tok.deger, ham=tok.ham, tanim=tanim))
            elif self.as_mi('prosedur', 'fonksiyon', 'kurucu'):
                lst.append(self.altprogram_coz(baglam))
            else:
                return lst

    def degisken_grubu(self):
        satir = self.t.satir
        adlar = [self.bekle_ad()]
        while self.op_mu(','):
            self.ilerle()
            adlar.append(self.bekle_ad())
        tip = None
        ilk = None
        if self.op_mu(':'):
            self.ilerle()
            tip = self.tip_coz()
        if self.op_mu('=', ':='):
            self.ilerle()
            ilk = self.ifade()
        if tip is None and ilk is None:
            self.hata("Değişken için ':' tip veya ':=' ilk değer bekleniyordu")
        return N('degisken', satir, adlar=[a.deger for a in adlar], hamlar=[a.ham for a in adlar],
                 tip=tip, ilk=ilk)

    def _dizi_sinirlari(self):
        if not self.op_mu('[') or self.satir_sonu_mu():
            return None, None
        self.ilerle()
        alt = self.ifade()
        self.bekle_op('..')
        ust = self.ifade()
        self.bekle_op(']')
        return alt, ust

    def tip_coz(self):
        """Tip: tamsayı · Birim.Ad · tamsayı dizisi · ondalık dizisi[1..3] · metin listesi · tamsayı sözlüğü"""
        satir = self.t.satir
        if self.as_mi('dizi'):
            # öğe tipi belirtilmemiş dizi: dizi · dizi[1..5]
            self.ilerle()
            alt, ust = self._dizi_sinirlari()
            if self.as_mi('turunde'):
                self.hata("'dizi türünde tip' yazımı kaldırıldı; öğe tipini başa yazın: 'tamsayı dizisi' "
                          "(sınırlıysa 'tamsayı dizisi[1..5]')")
            tip = N('tip_dizi', satir, alt=alt, ust=ust, eleman=None)
        else:
            tok = self.bekle_ad()
            modul = None
            ad, ham = tok.deger, tok.ham
            if self.op_mu('.'):
                self.ilerle()
                t2 = self.bekle_ad()
                modul, ad, ham = tok.deger, t2.deger, t2.ham
            if self.as_mi('turunde'):
                if ad == 'sozluk':
                    self.hata("'sözlük türünde tip' yazımı kaldırıldı; öğe tipini başa yazın: 'tamsayı sözlüğü'")
                self.hata("'liste türünde tip' yazımı kaldırıldı; öğe tipini başa yazın: 'tamsayı listesi'")
            tip = N('tip_ad', satir, ad=ad, ham=ham, modul=modul)
        # Öğe tipi başa yazılır, kap sona: tamsayı dizisi · metin listesi · tamsayı sözlüğü (aynı satırda).
        # Liste ve sözlük öğe tipi bilgi amaçlıdır; derleme zamanı denetimi JavaScript derleyicisinin katı kipindedir.
        while self.t.tip == 'AD' and not self.satir_sonu_mu() and self.t.deger in ('dizisi', 'listesi', 'sozlugu'):
            ek = self.ilerle().deger
            if ek == 'dizisi':
                alt, ust = self._dizi_sinirlari()
                tip = N('tip_dizi', satir, alt=alt, ust=ust, eleman=tip)
            else:
                tip = N('tip_ad', satir, ad='liste' if ek == 'listesi' else 'sozluk',
                        ham='liste' if ek == 'listesi' else 'sözlük', modul=None)
        return tip

    def tip_tanimi_coz(self):
        satir = self.t.satir
        if self.as_mi('sinif'):
            self.ilerle()
            ebeveyn = None
            if self.op_mu('('):
                self.ilerle()
                ebeveyn = self.bekle_ad().deger
                self.bekle_op(')')
            alanlar, metodlar = self.uyeler_coz(sinif=True)
            self.bekle_as('bitir')
            return N('sinif', satir, ebeveyn=ebeveyn, alanlar=alanlar, metodlar=metodlar)
        if self.as_mi('kayit'):
            self.ilerle()
            alanlar, metodlar = self.uyeler_coz(sinif=False)
            self.bekle_as('bitir')
            return N('kayit', satir, ebeveyn=None, alanlar=alanlar, metodlar=metodlar)
        return self.tip_coz()

    def uyeler_coz(self, sinif):
        alanlar, metodlar = [], []
        while not self.as_mi('bitir'):
            if self.t.tip == 'SON':
                self.hata("Sınıf/kayıt tanımı 'bitir' ile kapanmalı")
            if self.ad_mi(*GORUNURLUK) and not self.bak().deger in (':', ','):
                self.ilerle()
                continue
            if self.as_mi('degisken'):
                self.ilerle()
                continue
            if sinif and self.as_mi('prosedur', 'fonksiyon', 'kurucu'):
                metodlar.append(self.altprogram_coz('sinif'))
                continue
            grup = self.degisken_grubu()
            self.ayirici()
            for ad, ham in zip(grup.adlar, grup.hamlar):
                alanlar.append((ad, ham, grup.tip, grup.ilk))
        return alanlar, metodlar

    def parametreler_coz(self):
        params = []
        self.bekle_op('(')
        if self.op_mu(')'):
            self.ilerle()
            return params
        while True:
            ref = False
            if self.as_mi('degisken'):
                self.ilerle()
                ref = True
            elif self.as_mi('sabit'):
                self.ilerle()
            adlar = [self.bekle_ad()]
            while self.op_mu(','):
                self.ilerle()
                adlar.append(self.bekle_ad())
            tip = None
            if self.op_mu(':'):
                self.ilerle()
                tip = self.tip_coz()
            varsayilan = None
            if self.op_mu('=', ':='):
                self.ilerle()
                varsayilan = self.ifade()
            for a in adlar:
                params.append(N('param', a.satir, ad=a.deger, ham=a.ham, tip=tip, ref=ref,
                                varsayilan=varsayilan))
            if self.op_mu(';', ','):
                self.ilerle()
                continue
            break
        self.bekle_op(')')
        return params

    def altprogram_coz(self, baglam):
        tok = self.ilerle()
        tur = tok.deger
        ad_tok = self.bekle_ad()
        sinif_adi = None
        if self.op_mu('.'):
            self.ilerle()
            sinif_adi = ad_tok.deger
            ad_tok = self.bekle_ad()
        params = self.parametreler_coz() if self.op_mu('(') else []
        donus = None
        if self.op_mu(':'):
            self.ilerle()
            donus = self.tip_coz()
        if not self._direktif_mi():
            self.ayirici()
        direktifler = []
        while self._direktif_mi():
            direktifler.append(self.ilerle().deger)
            self.ayirici()
        govdeli = True
        if baglam == 'arayuz' or 'ileri' in direktifler or 'soyut' in direktifler:
            govdeli = False
        elif baglam == 'sinif':
            govdeli = self.as_mi('basla', 'degisken', 'sabit')
        yerel, govde = [], None
        if govdeli:
            yerel = self.bildirimler_coz('yerel')
            govde = self.birlesik_coz()
            self.ayirici()
        return N('altprogram', tok.satir, cesit=tur, ad=ad_tok.deger, ham=ad_tok.ham,
                 sinif_adi=sinif_adi, params=params, donus=donus, direktifler=direktifler,
                 yerel=yerel, govde=govde)

    def _direktif_mi(self):
        return self.ad_mi(*DIREKTIFLER) and not (self.bak().tip == 'OP' and self.bak().deger in (':', ','))

    # ---------------------------------------------------------- deyimler
    def birlesik_coz(self):
        tok = self.bekle_as('basla')
        d = self.deyimler_coz(('bitir',))
        self.bekle_as('bitir')
        return N('blok', tok.satir, deyimler=d)

    def deyimler_coz(self, bitis):
        lst = []
        while True:
            while self.op_mu(';'):
                self.ilerle()
            if self.as_mi(*bitis) or self.t.tip == 'SON':
                return lst
            lst.append(self.deyim())
            if self.op_mu(';'):
                continue
            if self.as_mi(*bitis) or self.t.tip == 'SON':
                return lst
            if self.satir_sonu_mu():
                continue
            onceki = self.s[self.i - 1]
            if onceki.tip == 'AD' and onceki.deger == 'son':
                self.hata("Blok sonu bekleniyordu", onceki)
            self.hata("';' ya da satır sonu bekleniyordu")

    def deyim_veya_bos(self):
        if self.op_mu(';') or self.as_mi('degilse', 'bitir', 'yakala', 'sonunda'):
            return N('bos', self.t.satir)
        return self.deyim()

    def deyim(self):
        d = self._deyim()
        d.dosya = self.dosya
        return d

    def _deyim(self):
        tok = self.t
        s = tok.satir
        if tok.tip == 'AS':
            k = tok.deger
            if k == 'basla':
                return self.birlesik_coz()
            if k == 'eger':
                self.ilerle()
                kosul = self.ifade()
                self.bekle_as('ise')
                o = self.deyim_veya_bos()
                d = None
                if self.op_mu(';') and self.bak().tip == 'AS' and self.bak().deger == 'degilse':
                    self.ilerle()
                if self.as_mi('degilse'):
                    self.ilerle()
                    d = self.deyim_veya_bos()
                return N('eger', s, kosul=kosul, o=o, degilse=d)
            if k == 'icin':
                self.hata("Sayaçlı döngü şöyle yazılır: 1'den 10'a kadar her i için")
            if k == 'her':
                self.hata("Liste döngüsü şöyle yazılır: liste içindeki her öğe için")
            if k == 'iken':
                self.hata("Koşullu döngüde koşul önce gelir: x < 10 iken")
            if k == 'tekrarla':
                return self.tekrarla_coz()
            if k == 'dene':
                return self.dene_coz()
            if k == 'firlat':
                self.ilerle()
                return N('firlat', s, ifade=self.ifade())
            if k == 'don':
                self.ilerle()
                deger = None
                if not (self.op_mu(';') or self.as_mi('bitir', 'degilse', 'yakala', 'sonunda')
                        or self.satir_sonu_mu() or self.t.tip == 'SON'):
                    deger = self.ifade()
                return N('don', s, ifade=deger)
            if k == 'cik':
                self.ilerle()
                return N('don', s, ifade=None)
            if k == 'kir':
                self.ilerle()
                return N('kir', s)
            if k == 'devam':
                self.ilerle()
                return N('devam', s)
            if k == 'degisken':
                self.ilerle()
                g = self.degisken_grubu()
                g.tur = 'yerel_degisken'
                return g
        return self.deyim_ifadeden(self.ifade(), s)

    def deyim_ifadeden(self, hedef, s):
        """Başı bir ifade olan deyimler: doğal döngüler, değerine göre, atama, çağrı."""
        t = self.t
        # 1'den 10'a kadar her i için
        if t.tip == 'SONEK' and t.deger == 'ayrilma':
            self.ilerle()
            bit = self.ifade()
            if not (self.t.tip == 'SONEK' and self.t.deger == 'yonelme'):
                self.hata("Bitiş değerinde yönelme eki bekleniyordu (ör. 10'a, n'e)")
            self.ilerle()
            if self.as_mi('kadar'):
                yon = 1
            elif self.as_mi('azalarak'):
                yon = -1
            else:
                self.hata("'kadar' ya da 'azalarak' bekleniyordu")
            self.ilerle()
            adim = None
            if self.ad_mi('adim'):
                self.ilerle()
                adim = self.ifade()
            self.bekle_as('her')
            v = self.bekle_ad()
            self.bekle_as('icin')
            return N('icin', s, ad=v.deger, bas=hedef, bit=bit, yon=yon, adim=adim,
                     govde=self.deyim_veya_bos())
        if t.tip == 'SONEK':
            self.hata("Burada ek beklenmiyordu")
        # liste içindeki her öğe için
        if self.as_mi('icindeki'):
            self.ilerle()
            self.bekle_as('her')
            v = self.bekle_ad()
            v2 = None
            if self.op_mu(','):
                self.ilerle()
                v2 = self.bekle_ad().deger
            self.bekle_as('icin')
            return N('her', s, ad=v.deger, ad2=v2, kaynak=hedef, govde=self.deyim_veya_bos())
        # koşul iken
        if self.as_mi('iken'):
            self.ilerle()
            return N('iken', s, kosul=hedef, govde=self.deyim_veya_bos())
        # n kez tekrarla
        if self.ad_mi('kez'):
            self.ilerle()
            self.bekle_as('tekrarla')
            return N('kez', s, sayi=hedef, govde=self.deyim_veya_bos())
        # x değerine göre
        if self.ad_mi('degerine') and self.bak().tip == 'AD' and self.bak().deger == 'gore':
            return self.deger_gore_coz(hedef, s)
        if self.ad_mi('olana'):
            self.hata("'olana dek' yalnızca 'tekrarla' döngüsünün sonunda kullanılır")
        if hedef.tur == 'ad' and hedef.ad == 'sec':
            self.hata("Çok seçenekli karar şöyle yazılır: x değerine göre … bitir")
        if self.op_mu(*ATAMA_OPLARI):
            op = self.ilerle().deger
            if hedef.tur not in ('ad', 'alan', 'indeks'):
                self.hata("Atamanın sol tarafı değişken, alan ya da dizin olmalı")
            return N('atama', s, hedef=hedef, op=op, deger=self.ifade())
        if hedef.tur == 'ikili' and hedef.op == '=':
            raise SozdizimHatasi("Atama için '=' değil ':=' kullanın", s, self.dosya)
        if hedef.tur not in ('cagri', 'ad', 'alan', 'miras', 'boru'):
            raise SozdizimHatasi("Bu ifade tek başına deyim olamaz", s, self.dosya)
        return N('cagri_deyim', s, ifade=hedef)

    def tekrarla_coz(self):
        """tekrarla … koşul olana dek"""
        s = self.ilerle().satir
        govde = []
        while True:
            while self.op_mu(';'):
                self.ilerle()
            if self.t.tip == 'SON' or self.as_mi('bitir'):
                self.hata("'tekrarla' döngüsü 'koşul olana dek' ile bitmeli")
            tok = self.t
            if tok.tip == 'AS' and tok.deger in DEYIM_ANAHTARLARI:
                d = self.deyim()
            else:
                e = self.ifade()
                if self.ad_mi('olana') and self.bak().tip == 'AD' and self.bak().deger == 'dek':
                    self.ilerle()
                    self.ilerle()
                    return N('tekrarla', s, govde=govde, kosul=e)
                d = self.deyim_ifadeden(e, tok.satir)
                d.dosya = self.dosya
            govde.append(d)
            if self.op_mu(';') or self.satir_sonu_mu():
                continue
            self.hata("';' ya da satır sonu bekleniyordu")

    def deger_gore_coz(self, secici, s):
        """x değerine göre  1: …  2..5: …  değilse: …  bitir"""
        self.ilerle()
        self.ilerle()
        kollar = []
        varsayilan = None
        while True:
            while self.op_mu(';'):
                self.ilerle()
            if self.as_mi('bitir'):
                break
            if self.as_mi('degilse'):
                self.ilerle()
                if self.op_mu(':'):
                    self.ilerle()
                varsayilan = self.deyimler_coz(('bitir',))
                break
            etiketler = []
            while True:
                a = self.ifade()
                if self.op_mu('..'):
                    self.ilerle()
                    etiketler.append((a, self.ifade()))
                else:
                    etiketler.append((a, None))
                if self.op_mu(','):
                    self.ilerle()
                    continue
                break
            self.bekle_op(':')
            kollar.append((etiketler, self.deyim_veya_bos()))
            if not (self.op_mu(';') or self.as_mi('bitir', 'degilse') or self.satir_sonu_mu()):
                self.hata("';' ya da satır sonu bekleniyordu")
        self.bekle_as('bitir')
        return N('sec', s, secici=secici, kollar=kollar, varsayilan=varsayilan)

    def dene_coz(self):
        s = self.ilerle().satir
        govde = self.deyimler_coz(('yakala', 'sonunda', 'bitir'))
        yakala_ad, yakala, sonunda = None, None, None
        if self.as_mi('yakala'):
            self.ilerle()
            if self.op_mu('('):
                self.ilerle()
                yakala_ad = self.bekle_ad().deger
                self.bekle_op(')')
            yakala = self.deyimler_coz(('sonunda', 'bitir'))
        if self.as_mi('sonunda'):
            self.ilerle()
            sonunda = self.deyimler_coz(('bitir',))
        self.bekle_as('bitir')
        return N('dene', s, govde=govde, yakala_ad=yakala_ad, yakala=yakala, sonunda=sonunda)

    # ---------------------------------------------------------- ifadeler
    def ifade(self):
        sol = self.veya_coz()
        while self.op_mu('|>'):
            s = self.ilerle().satir
            sol = N('boru', s, sol=sol, sag=self.veya_coz())
        return sol

    def veya_coz(self):
        sol = self.ve_coz()
        while self.as_mi('veya', 'yada'):
            tok = self.ilerle()
            sol = N('mantik', tok.satir, op=tok.deger, sol=sol, sag=self.ve_coz())
        return sol

    def ve_coz(self):
        sol = self.degil_coz()
        while self.as_mi('ve'):
            tok = self.ilerle()
            sol = N('mantik', tok.satir, op='ve', sol=sol, sag=self.degil_coz())
        return sol

    def degil_coz(self):
        if self.as_mi('degil'):
            tok = self.ilerle()
            return N('tekli', tok.satir, op='degil', ifade=self.degil_coz())
        return self.iliski_coz()

    def iliski_coz(self):
        sol = self.toplama_coz()
        if self.op_mu(*ILISKI_OPLARI) or self.as_mi('icinde'):
            tok = self.ilerle()
            sol = N('ikili', tok.satir, op=tok.deger, sol=sol, sag=self.toplama_coz())
        return sol

    def toplama_coz(self):
        sol = self.carpma_coz()
        while self.op_mu('+', '-'):
            tok = self.ilerle()
            sol = N('ikili', tok.satir, op=tok.deger, sol=sol, sag=self.carpma_coz())
        return sol

    def carpma_coz(self):
        sol = self.tekli_coz()
        while self.op_mu('*', '/', '@') or self.as_mi('bol', 'mod'):
            tok = self.ilerle()
            sol = N('ikili', tok.satir, op=tok.deger, sol=sol, sag=self.tekli_coz())
        return sol

    def tekli_coz(self):
        if self.op_mu('-', '+'):
            tok = self.ilerle()
            return N('tekli', tok.satir, op=tok.deger, ifade=self.tekli_coz())
        if self.op_mu('@'):
            tok = self.ilerle()
            return N('ref', tok.satir, ifade=self.sonek_coz())
        taban = self.sonek_coz()
        if self.op_mu('**'):
            tok = self.ilerle()
            return N('ikili', tok.satir, op='**', sol=taban, sag=self.tekli_coz())
        return taban

    def argumanlar_coz(self):
        self.bekle_op('(')
        args = []
        if self.op_mu(')'):
            self.ilerle()
            return args
        while True:
            a = self.ifade()
            if self.op_mu(':'):
                self.ilerle()
                gen = self.ifade()
                hassas = None
                if self.op_mu(':'):
                    self.ilerle()
                    hassas = self.ifade()
                a = N('bicim', a.satir, ifade=a, genislik=gen, hassasiyet=hassas)
            args.append(a)
            if self.op_mu(','):
                self.ilerle()
                continue
            break
        self.bekle_op(')')
        return args

    def sonek_coz(self):
        e = self.birincil_coz()
        while True:
            if self.op_mu('(', '[') and self.satir_sonu_mu():
                return e
            if self.op_mu('('):
                s = self.t.satir
                e = N('cagri', s, cagrilan=e, argumanlar=self.argumanlar_coz())
            elif self.op_mu('['):
                s = self.ilerle().satir
                idx = [self.ifade()]
                while self.op_mu(','):
                    self.ilerle()
                    idx.append(self.ifade())
                self.bekle_op(']')
                e = N('indeks', s, nesne=e, indeksler=idx)
            elif self.op_mu('.') and self.bak().tip in ('AD', 'AS'):
                s = self.ilerle().satir
                tok = self.ilerle()
                e = N('alan', s, nesne=e, ad=tok.deger, ham=tok.ham)
            else:
                return e

    def birincil_coz(self):
        tok = self.t
        s = tok.satir
        if tok.tip in ('SAYI', 'METIN'):
            self.ilerle()
            return N('sabitdeger', s, deger=tok.deger)
        if tok.tip == 'AD':
            self.ilerle()
            return N('ad', s, ad=tok.deger, ham=tok.ham)
        if tok.tip == 'AS':
            k = tok.deger
            if k in ('dogru', 'yanlis', 'bos'):
                self.ilerle()
                return N('sabitdeger', s, deger={'dogru': True, 'yanlis': False, 'bos': None}[k])
            if k == 'kendi':
                self.ilerle()
                return N('kendi', s)
            if k == 'eger':          # koşullu ifade: eğer k ise a değilse b
                self.ilerle()
                kosul = self.ifade()
                self.bekle_as('ise')
                a = self.ifade()
                self.bekle_as('degilse')
                return N('kosullu', s, kosul=kosul, a=a, b=self.ifade())
            if k == 'miras':
                self.ilerle()
                ad = None
                if self.t.tip == 'AD':
                    ad = self.ilerle().deger
                return N('miras', s, ad=ad)
            if k in ('fonksiyon', 'prosedur'):
                self.ilerle()
                params = self.parametreler_coz() if self.op_mu('(') else []
                donus = None
                if self.op_mu(':'):
                    self.ilerle()
                    donus = self.tip_coz()
                if self.op_mu('=>'):
                    self.ilerle()
                    return N('lambda', s, params=params, donus=donus, ifade=self.ifade(),
                             yerel=[], govde=None)
                yerel = self.bildirimler_coz('yerel')
                govde = self.birlesik_coz()
                return N('lambda', s, params=params, donus=donus, ifade=None, yerel=yerel,
                         govde=govde)
        if tok.tip == 'OP':
            if tok.deger == '(':
                self.ilerle()
                e = self.ifade()
                self.bekle_op(')')
                return e
            if tok.deger == '[':
                return self.koleksiyon_coz()
        self.hata("İfade bekleniyordu")

    def koleksiyon_coz(self):
        s = self.ilerle().satir
        if self.op_mu(']'):
            self.ilerle()
            return N('liste', s, elemanlar=[])
        if self.op_mu(':') and self.bak().tip == 'OP' and self.bak().deger == ']':
            self.ilerle()
            self.ilerle()
            return N('sozluk', s, ciftler=[])
        ilk = self.ifade()
        if self.op_mu(':'):
            ciftler = []
            self.ilerle()
            ciftler.append((ilk, self.ifade()))
            while self.op_mu(','):
                self.ilerle()
                if self.op_mu(']'):
                    break
                a = self.ifade()
                self.bekle_op(':')
                ciftler.append((a, self.ifade()))
            self.bekle_op(']')
            return N('sozluk', s, ciftler=ciftler)
        if self.op_mu('..'):
            self.ilerle()
            ust = self.ifade()
            self.bekle_op(']')
            return N('aralik_liste', s, alt=ilk, ust=ust)
        elemanlar = [ilk]
        while self.op_mu(','):
            self.ilerle()
            if self.op_mu(']'):
                break
            elemanlar.append(self.ifade())
        self.bekle_op(']')
        return N('liste', s, elemanlar=elemanlar)


def coz(kaynak, dosya='<girdi>'):
    from .sozcuk import sozcukle
    return Cozumleyici(sozcukle(kaynak, dosya), dosya).dosya_coz()
