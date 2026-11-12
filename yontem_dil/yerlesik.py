"""Yerleşik fonksiyonlar, tür metodları ve Python ile yazılmış birimler
(Matematik, Sistem, Veri). YZ birimi yz.py içindedir."""
import copy
import csv
import json
import math
import os
import random
import time

from .hatalar import YontemHatasi, DurSinyali
from .sozcuk import katla
from .degerler import (YerelFonksiyon, KFonksiyon, BagliMetod, KurucuBagli, KSinif, KNesne,
                       PascalDizi, HataNesnesi)

_rng = random.Random()


def _konum_tam(i):
    if isinstance(i, bool) or not isinstance(i, int):
        raise YontemHatasi('Ekle: konum tamsayı olmalı')
    return i


def _araya_kaldirildi():
    raise YontemHatasi("'Araya' kaldırıldı; şöyle yazın: L.Ekle(x, konum)")


def yf(ad, en_az=0, en_cok=None, oto=False, ref=()):
    """Python fonksiyonunu Yöntem yerleşiğine sarar; argüman sayısını denetler."""
    def sar(f):
        def calis(y, args):
            n = len(args)
            if n < en_az or (en_cok is not None and n > en_cok):
                aralik = str(en_az) if en_az == en_cok else (
                    f"{en_az}..{en_cok}" if en_cok is not None else f"en az {en_az}")
                raise YontemHatasi(f"'{ad}' {aralik} argüman bekler, {n} verildi")
            return f(y, *args)
        return YerelFonksiyon(ad, calis, oto, frozenset(ref))
    return sar


def _sayi(v, ad='değer'):
    if type(v) in (int, float):
        return v
    from .yz import Tensor
    if type(v) is Tensor and len(v.veri) == 1:
        return v.veri[0]
    raise YontemHatasi(f"{ad} sayı olmalı")


def _boyut_degisir(v, ad):
    """Boyutu değişen işlemler (Ekle, Sil, Araya) için: sabit boyutlu dizileri reddeder."""
    if type(v) is PascalDizi:
        raise YontemHatasi(f"{ad}: dizinin boyutu sabittir, eleman eklenemez ya da silinemez; "
                           "bunun için liste kullanın (liste(dizi) diziyi listeye kopyalar)")
    return _liste(v, ad)


def _liste(v, ad='değer'):
    if type(v) is list:
        return v
    if type(v) is PascalDizi:
        return v.veri
    raise YontemHatasi(f"{ad} liste olmalı")


def buyuk_harf(s):
    return s.replace('i', 'İ').replace('ı', 'I').upper()


def kucuk_harf(s):
    return s.replace('I', 'ı').replace('İ', 'i').lower()


def _satir_oku(y):
    satir = y.oku()
    if satir == '':
        raise YontemHatasi("Girdi sonuna ulaşıldı")
    return satir.rstrip('\n').rstrip('\r')


def _cagir(y, f, *args):
    return y.cagir(f, list(args))


# ======================================================================== genel
def kur(y):
    d = y.kok.d
    G = {}

    def ekle(ad, *takma):
        def sar(fobj):
            G[katla(ad)] = fobj
            for t in takma:
                G[katla(t)] = fobj
            return fobj
        return sar

    # ---- giriş / çıkış
    # yaz(değer, satır)   : değeri yazar, ardından 'satır' kadar yeni satıra geçer.
    # oku(değişken, satır): değişkene okur (sayılar için sözcük, metin için satırın
    #                       kalanı), ardından 'satır' kadar satır ilerler.
    def _satir_sayisi(ad, n):
        if type(n) is not int or n < 0:
            raise YontemHatasi(f"'{ad}' komutunun satır sayısı negatif olmayan bir tamsayı olmalı")
        return n

    @ekle('yaz')
    @yf('yaz', 0, 2, oto=True)
    def _yaz(y, deger='', satir=0):
        y.yaz(y.metne(deger) + '\n' * _satir_sayisi('yaz', satir))

    def _oku_fn(y, args):
        if not args or len(args) > 2:
            raise YontemHatasi("'oku' 1..2 argüman bekler: oku(değişken [, satır])")
        r = args[0]
        satir = _satir_sayisi('oku', args[1]) if len(args) > 1 else 0
        eski = r.al()
        if type(eski) in (int, float):
            # sayı: boşlukları (gerekirse satırları) atla, bir sözcük oku
            while y._girdi_tamponu is None or y._girdi_tamponu.strip() == '':
                y._girdi_tamponu = _satir_oku(y)
            t = y._girdi_tamponu.lstrip()
            parca = t.split(None, 1)
            sozcuk = parca[0]
            y._girdi_tamponu = parca[1] if len(parca) > 1 else ''
            try:
                r.ata(int(sozcuk) if type(eski) is int else float(sozcuk.replace(',', '.')))
            except ValueError:
                raise YontemHatasi(f"Girdi sayıya çevrilemedi: {sozcuk!r}")
        else:
            if y._girdi_tamponu is None:
                y._girdi_tamponu = _satir_oku(y)
            deger = y._girdi_tamponu
            y._girdi_tamponu = ''
            r.ata(deger)
        for i in range(satir):
            if i > 0:
                _satir_oku(y)
            y._girdi_tamponu = None
        return None
    G['oku'] = YerelFonksiyon('oku', _oku_fn, ref=frozenset({0}))

    # ---- dönüşümler (tip adları aynı zamanda dönüştürücüdür)
    @ekle('tamsayı', 'Tamsayıya')
    @yf('tamsayı', 1, 1)
    def _tamsayi(y, v):
        if type(v) is bool:
            return int(v)
        if type(v) is int:
            return v
        if type(v) is float:
            return int(v)
        if type(v) is str:
            try:
                return int(v.strip())
            except ValueError:
                try:
                    return int(float(v.strip().replace(',', '.')))
                except ValueError:
                    raise YontemHatasi(f"Tamsayıya çevrilemez: {v!r}")
        return int(_sayi(v))

    @ekle('ondalık', 'Ondalığa')
    @yf('ondalık', 1, 1)
    def _ondalik(y, v):
        if type(v) is str:
            try:
                return float(v.strip().replace(',', '.'))
            except ValueError:
                raise YontemHatasi(f"Ondalığa çevrilemez: {v!r}")
        return float(_sayi(v))

    @ekle('metin', 'Metne')
    @yf('metin', 1, 1)
    def _metin(y, v):
        return y.metne(v)

    @ekle('mantıksal')
    @yf('mantıksal', 1, 1)
    def _mantiksal(y, v):
        if type(v) is str:
            k = katla(v.strip())
            if k in ('dogru', 'evet', 'true', '1'):
                return True
            if k in ('yanlis', 'hayir', 'false', '0', ''):
                return False
            raise YontemHatasi(f"Mantıksala çevrilemez: {v!r}")
        if v is None:
            return False
        if type(v) in (list, dict):
            return len(v) > 0
        return bool(v)

    @ekle('liste')
    @yf('liste', 0, 1)
    def _liste_f(y, v=None):
        if v is None:
            return []
        return list(y.yinelenebilir(v))

    @ekle('Tür')
    @yf('Tür', 1, 1)
    def _tur(y, v):
        from .yorumlayici import tur_adi
        return tur_adi(v)

    @ekle('ÖrneğiMi')
    @yf('ÖrneğiMi', 2, 2)
    def _ornegi(y, v, s):
        if type(s) is not KSinif:
            raise YontemHatasi("ÖrneğiMi'nin ikinci argümanı sınıf olmalı")
        return type(v) is KNesne and v.sinif.turevi_mi(s)

    # ---- koleksiyonlar
    @ekle('Uzunluk')
    @yf('Uzunluk', 1, 1)
    def _uzunluk(y, v):
        from .yz import Tensor
        if type(v) in (list, str, dict):
            return len(v)
        if type(v) is PascalDizi:
            return len(v.veri)
        if type(v) is Tensor:
            return v.sekil[0] if v.sekil else 1
        raise YontemHatasi(f"Uzunluk tanımsız: {type(v).__name__}")

    @ekle('Ekle')
    @yf('Ekle', 2, 3)
    def _ekle(y, L, a, *b):
        # Ekle(L, x) sona ekler; Ekle(L, x, konum) verilen konuma yerleştirir
        D = _boyut_degisir(L, 'Ekle')
        if b:
            D.insert(_konum_tam(b[0]), a)
        else:
            D.append(a)

    @ekle('Sil')
    @yf('Sil', 2, 2)
    def _sil(y, L, i):
        if type(L) is dict:
            L.pop(i, None)
            return
        try:
            return _boyut_degisir(L, 'Sil').pop(i)
        except IndexError:
            raise YontemHatasi(f"Sil: dizin sınır dışı: {i}")

    y.yerlesik_sil = _sil

    @ekle('Araya')
    @yf('Araya', 0, 64)
    def _araya(y, *a):
        raise YontemHatasi("'Araya' kaldırıldı; şöyle yazın: Ekle(L, x, konum)")

    @ekle('Aralık')
    @yf('Aralık', 1, 3)
    def _aralik(y, a, b=None, c=1):
        if b is None:
            return list(range(a))
        if c == 0:
            raise YontemHatasi("Aralık adımı sıfır olamaz")
        return list(range(a, b, c))

    @ekle('Eşle')
    @yf('Eşle', 2, 2)
    def _esle(y, L, f):
        return [y.cagir(f, [x]) for x in y.yinelenebilir(L)]

    @ekle('Süz')
    @yf('Süz', 2, 2)
    def _suz(y, L, f):
        return [x for x in y.yinelenebilir(L) if y.cagir(f, [x]) is True]

    @ekle('İndirge')
    @yf('İndirge', 2, 3)
    def _indirge(y, L, f, bas=None):
        ogeler = y.yinelenebilir(L)
        if bas is None:
            if not ogeler:
                raise YontemHatasi("Boş liste başlangıç değeri olmadan indirgenemez")
            bas, ogeler = ogeler[0], ogeler[1:]
        for x in ogeler:
            bas = y.cagir(f, [bas, x])
        return bas

    @ekle('Sırala')
    @yf('Sırala', 1, 3)
    def _sirala(y, L, anahtar=None, ters=False):
        ogeler = list(y.yinelenebilir(L))
        try:
            if anahtar is None:
                return sorted(ogeler, reverse=ters)
            return sorted(ogeler, key=lambda x: y.cagir(anahtar, [x]), reverse=ters)
        except TypeError:
            raise YontemHatasi("Sırala: elemanlar karşılaştırılamıyor")

    @ekle('Ters')
    @yf('Ters', 1, 1)
    def _ters(y, L):
        if type(L) is str:
            return L[::-1]
        return list(reversed(y.yinelenebilir(L)))

    @ekle('Toplam')
    @yf('Toplam', 1, 1)
    def _toplam(y, L):
        from .yz import Tensor
        if type(L) is Tensor:
            return L.toplam()
        s = 0
        for x in y.yinelenebilir(L):
            s = y.ikili('+', s, x)
        return s

    @ekle('Maks')
    @yf('Maks', 1)
    def _maks(y, *a):
        ogeler = y.yinelenebilir(a[0]) if len(a) == 1 else list(a)
        if not ogeler:
            raise YontemHatasi("Maks: boş liste")
        return max(ogeler)

    @ekle('Min')
    @yf('Min', 1)
    def _min(y, *a):
        ogeler = y.yinelenebilir(a[0]) if len(a) == 1 else list(a)
        if not ogeler:
            raise YontemHatasi("Min: boş liste")
        return min(ogeler)

    @ekle('Eşleştir')
    @yf('Eşleştir', 2)
    def _zip(y, *ler):
        return [list(t) for t in zip(*[y.yinelenebilir(x) for x in ler])]

    @ekle('Numaralandır')
    @yf('Numaralandır', 1, 1)
    def _numara(y, L):
        return [[i, x] for i, x in enumerate(y.yinelenebilir(L))]

    @ekle('Dilim')
    @yf('Dilim', 2, 3)
    def _dilim(y, L, a, b=None):
        if type(L) is PascalDizi:
            L = L.veri
        if type(L) not in (list, str):
            raise YontemHatasi("Dilim liste veya metin bekler")
        return L[a:b]

    @ekle('Kopya')
    @yf('Kopya', 1, 1)
    def _kopya(y, v):
        if type(v) is KNesne:
            n = KNesne(v.sinif)
            n.alanlar = copy.copy(v.alanlar)
            return n
        if type(v) in (list, dict):
            return copy.deepcopy(v) if all(type(x) in (int, float, str, bool, list, dict) or x is None
                                           for x in (v if type(v) is list else v.values())) else copy.copy(v)
        return v

    @ekle('Anahtarlar')
    @yf('Anahtarlar', 1, 1)
    def _anahtarlar(y, s):
        return list(s.keys())

    @ekle('Değerler')
    @yf('Değerler', 1, 1)
    def _degerler(y, s):
        return list(s.values())

    @ekle('İçerir')
    @yf('İçerir', 2, 2)
    def _icerir(y, c, v):
        return y.ikili('icinde', v, c)

    @ekle('Benzersiz')
    @yf('Benzersiz', 1, 1)
    def _benzersiz(y, L):
        gor, out = set(), []
        for x in y.yinelenebilir(L):
            anahtar = x if type(x) in (int, float, str, bool) else id(x)
            if anahtar not in gor:
                gor.add(anahtar)
                out.append(x)
        return out

    @ekle('Say')
    @yf('Say', 1, 1)
    def _say(y, L):
        """Eleman sıklıkları: ['a': 2, 'b': 1]"""
        out = {}
        for x in y.yinelenebilir(L):
            out[x] = out.get(x, 0) + 1
        return out

    # ---- metin işlemleri (Turbo Pascal geleneği: dizinler 1'den başlar)
    @ekle('AltMetin', 'Kopyala')
    @yf('AltMetin', 2, 3)
    def _altmetin(y, s, bas, uz=None):
        bas = max(bas, 1)
        return s[bas - 1:] if uz is None else s[bas - 1:bas - 1 + uz]

    @ekle('Konum')
    @yf('Konum', 2, 2)
    def _konum(y, alt, s):
        return s.find(alt) + 1

    @ekle('BüyükHarf')
    @yf('BüyükHarf', 1, 1)
    def _buyuk(y, s):
        return buyuk_harf(s)

    @ekle('KüçükHarf')
    @yf('KüçükHarf', 1, 1)
    def _kucuk(y, s):
        return kucuk_harf(s)

    @ekle('Ayır')
    @yf('Ayır', 1, 2)
    def _ayir(y, s, ayrac=None):
        return s.split() if ayrac is None else s.split(ayrac)

    @ekle('Birleştir')
    @yf('Birleştir', 1, 2)
    def _birlestir(y, L, ayrac=''):
        return ayrac.join(y.metne(x) for x in y.yinelenebilir(L))

    @ekle('Kırp')
    @yf('Kırp', 1, 1)
    def _kirp(y, s):
        return s.strip()

    @ekle('Değiştir')
    @yf('Değiştir', 3, 3)
    def _degistir(y, s, a, b):
        return s.replace(a, b)

    @ekle('Biçimle')
    @yf('Biçimle', 1)
    def _bicimle(y, sablon, *args):
        """Biçimle('{} + {} = {}', 1, 2, 3); {:.2} ondalık basamak, {:8} genişlik, {:8.2} ikisi."""
        out, i, ai = [], 0, 0
        while i < len(sablon):
            c = sablon[i]
            if c == '{':
                j = sablon.find('}', i)
                if j < 0:
                    raise YontemHatasi("Biçimle: kapanmamış '{'")
                ozel = sablon[i + 1:j]
                if ai >= len(args):
                    raise YontemHatasi("Biçimle: yetersiz argüman")
                v = args[ai]
                ai += 1
                gen, hassas = 0, None
                if ozel.startswith(':'):
                    ozel = ozel[1:]
                    if '.' in ozel:
                        g, h = ozel.split('.', 1)
                        gen, hassas = int(g or 0), int(h)
                    elif ozel:
                        gen = int(ozel)
                if hassas is not None and type(v) in (int, float):
                    metin_ = f"{float(v):.{hassas}f}"
                else:
                    metin_ = y.metne(v)
                out.append(metin_.rjust(gen))
                i = j + 1
            else:
                out.append(c)
                i += 1
        return ''.join(out)

    @ekle('Sıra')
    @yf('Sıra', 1, 1)
    def _sira(y, c):
        if type(c) is bool:
            return int(c)
        if type(c) is not str or len(c) != 1:
            raise YontemHatasi("Sıra tek karakter bekler")
        return ord(c)

    @ekle('Karakter')
    @yf('Karakter', 1, 1)
    def _karakter(y, n):
        return chr(n)

    @ekle('HarfMi')
    @yf('HarfMi', 1, 1)
    def _harfmi(y, c):
        return type(c) is str and c != '' and c.isalpha()

    @ekle('RakamMı')
    @yf('RakamMı', 1, 1)
    def _rakammi(y, c):
        return type(c) is str and c != '' and c.isdigit()

    # ---- sayısal (Turbo Pascal System birimindeki temel işlevler)
    @ekle('Mutlak')
    @yf('Mutlak', 1, 1)
    def _mutlak(y, x):
        return abs(_sayi(x))

    @ekle('Kare')
    @yf('Kare', 1, 1)
    def _kare(y, x):
        return y.ikili('*', x, x)

    @ekle('Kök')
    @yf('Kök', 1, 1)
    def _kok(y, x):
        from .yz import Tensor
        if type(x) is Tensor:
            return x.kok()
        x = _sayi(x)
        if x < 0:
            raise YontemHatasi("Negatif sayının karekökü alınamaz")
        return math.sqrt(x)

    @ekle('Yuvarla')
    @yf('Yuvarla', 1, 2)
    def _yuvarla(y, x, basamak=None):
        x = _sayi(x)
        if basamak is None:
            return int(math.floor(x + 0.5)) if x >= 0 else -int(math.floor(-x + 0.5))
        return round(x, basamak)

    @ekle('Kes')
    @yf('Kes', 1, 1)
    def _kes(y, x):
        return int(_sayi(x))

    @ekle('Rastgele')
    @yf('Rastgele', 0, 2, oto=True)
    def _rastgele(y, a=None, b=None):
        if a is None:
            return _rng.random()
        if b is None:
            return _rng.randrange(a)
        return _rng.randint(a, b)

    @ekle('Rastgeleleştir')
    @yf('Rastgeleleştir', 0, 1, oto=True)
    def _tohum(y, n=None):
        _rng.seed(n)
        from . import yz
        yz._rng.seed(n)

    @ekle('Artır')
    @yf('Artır', 1, 2, ref=(0,))
    def _artir(y, r, n=1):
        r.ata(y.ikili('+', r.al(), n))

    @ekle('Azalt')
    @yf('Azalt', 1, 2, ref=(0,))
    def _azalt(y, r, n=1):
        r.ata(y.ikili('-', r.al(), n))

    @ekle('Değiş')
    @yf('Değiş', 2, 2, ref=(0, 1))
    def _degis(y, a, b):
        va, vb = a.al(), b.al()
        a.ata(vb)
        b.ata(va)

    # ---- hata ve denetim
    @ekle('Hata')
    @yf('Hata', 1, 2)
    def _hata(y, mesaj, tur='Hata'):
        return HataNesnesi(y.metne(mesaj), tur)

    @ekle('İddia')
    @yf('İddia', 1, 2)
    def _iddia(y, kosul, mesaj='İddia başarısız'):
        if kosul is not True:
            raise YontemHatasi(f"İddia başarısız: {y.metne(mesaj)}",
                               deger=HataNesnesi(y.metne(mesaj), 'İddiaHatası'))

    @ekle('Durdur')
    @yf('Durdur', 0, 1, oto=True)
    def _durdur(y, kod=0):
        raise DurSinyali(kod)

    @ekle('Çağır')
    @yf('Çağır', 1)
    def _cagir_f(y, f, *args):
        return y.cagir(f, list(args))

    @ekle('ParametreSayısı')
    @yf('ParametreSayısı', 0, 0, oto=True)
    def _ps(y):
        return len(y.argumanlar)

    @ekle('Parametre')
    @yf('Parametre', 1, 1)
    def _param(y, i):
        if i == 0:
            return 'yontem'
        return y.argumanlar[i - 1] if 1 <= i <= len(y.argumanlar) else ''

    d.update(G)
    d['pi'] = math.pi


# ======================================================================== tür metodları
def _m(ad, en_az=0, en_cok=None, oto=False):
    """Bir alıcıya bağlı metod üreticisi: f(alici) -> YerelFonksiyon"""
    def sar(f):
        def uret(o):
            def calis(y, args):
                n = len(args)
                if n < en_az or (en_cok is not None and n > en_cok):
                    raise YontemHatasi(f"'{ad}' metodu {en_az}..{en_cok} argüman bekler, {n} verildi")
                return f(y, o, *args)
            return YerelFonksiyon(ad, calis, oto)
        return uret
    return sar


def _tablolar():
    L, S, M = {}, {}, {}

    def tablo(t, ad):
        def sar(u):
            t[katla(ad)] = u
            return u
        return sar

    # ---------------- liste
    tablo(L, 'Uzunluk')(_m('Uzunluk', oto=True)(lambda y, o: len(o)))
    tablo(L, 'Ekle')(_m('Ekle', 1, 2)(lambda y, o, a, *b: o.insert(_konum_tam(b[0]), a) if b else o.append(a)))
    tablo(L, 'Çıkar')(_m('Çıkar', 0, 1, oto=True)(
        lambda y, o, i=-1: o.pop(i) if o else (_ for _ in ()).throw(YontemHatasi("Boş listeden çıkarılamaz"))))
    tablo(L, 'Sil')(_m('Sil', 1, 1)(lambda y, o, i: o.pop(i)))
    tablo(L, 'Araya')(_m('Araya', 0, 64)(lambda y, o, *a: _araya_kaldirildi()))
    tablo(L, 'Temizle')(_m('Temizle', oto=True)(lambda y, o: o.clear()))
    tablo(L, 'Bul')(_m('Bul', 1, 1)(lambda y, o, v: o.index(v) if v in o else -1))
    tablo(L, 'İçerir')(_m('İçerir', 1, 1)(lambda y, o, v: v in o))
    tablo(L, 'Sırala')(_m('Sırala', 0, 2, oto=True)(
        lambda y, o, a=None, t=False: y.kok.d['sirala'].fn(y, [o] + ([a] if a is not None else []) + ([t] if t else []))))
    tablo(L, 'Ters')(_m('Ters', oto=True)(lambda y, o: list(reversed(o))))
    tablo(L, 'Kopya')(_m('Kopya', oto=True)(lambda y, o: list(o)))
    tablo(L, 'Eşle')(_m('Eşle', 1, 1)(lambda y, o, f: [y.cagir(f, [x]) for x in o]))
    tablo(L, 'Süz')(_m('Süz', 1, 1)(lambda y, o, f: [x for x in o if y.cagir(f, [x]) is True]))
    tablo(L, 'İndirge')(_m('İndirge', 1, 2)(lambda y, o, f, b=None: y.kok.d['indirge'].fn(y, [o, f] + ([b] if b is not None else []))))
    tablo(L, 'Toplam')(_m('Toplam', oto=True)(lambda y, o: y.kok.d['toplam'].fn(y, [o])))
    tablo(L, 'Birleştir')(_m('Birleştir', 0, 1, oto=True)(lambda y, o, a='': a.join(y.metne(x) for x in o)))
    tablo(L, 'Dilim')(_m('Dilim', 1, 2)(lambda y, o, a, b=None: o[a:b]))
    tablo(L, 'İlk')(_m('İlk', oto=True)(lambda y, o: o[0] if o else None))
    tablo(L, 'Sonuncu')(_m('Sonuncu', oto=True)(lambda y, o: o[-1] if o else None))
    tablo(L, 'BoşMu')(_m('BoşMu', oto=True)(lambda y, o: len(o) == 0))

    # ---------------- metin
    tablo(S, 'Uzunluk')(_m('Uzunluk', oto=True)(lambda y, o: len(o)))
    tablo(S, 'BüyükHarf')(_m('BüyükHarf', oto=True)(lambda y, o: buyuk_harf(o)))
    tablo(S, 'KüçükHarf')(_m('KüçükHarf', oto=True)(lambda y, o: kucuk_harf(o)))
    tablo(S, 'Ayır')(_m('Ayır', 0, 1, oto=True)(lambda y, o, a=None: o.split() if a is None else o.split(a)))
    tablo(S, 'Kırp')(_m('Kırp', oto=True)(lambda y, o: o.strip()))
    tablo(S, 'Değiştir')(_m('Değiştir', 2, 2)(lambda y, o, a, b: o.replace(a, b)))
    tablo(S, 'İçerir')(_m('İçerir', 1, 1)(lambda y, o, a: a in o))
    tablo(S, 'Konum')(_m('Konum', 1, 1)(lambda y, o, a: o.find(a) + 1))
    tablo(S, 'BaşlarMı')(_m('BaşlarMı', 1, 1)(lambda y, o, a: o.startswith(a)))
    tablo(S, 'BiterMi')(_m('BiterMi', 1, 1)(lambda y, o, a: o.endswith(a)))
    tablo(S, 'Ters')(_m('Ters', oto=True)(lambda y, o: o[::-1]))
    tablo(S, 'AltMetin')(_m('AltMetin', 1, 2)(lambda y, o, b, u=None: o[max(b, 1) - 1:] if u is None else o[max(b, 1) - 1:max(b, 1) - 1 + u]))
    tablo(S, 'Karakterler')(_m('Karakterler', oto=True)(lambda y, o: list(o)))
    tablo(S, 'BoşMu')(_m('BoşMu', oto=True)(lambda y, o: len(o) == 0))

    # ---------------- sözlük
    tablo(M, 'Uzunluk')(_m('Uzunluk', oto=True)(lambda y, o: len(o)))
    tablo(M, 'Anahtarlar')(_m('Anahtarlar', oto=True)(lambda y, o: list(o.keys())))
    tablo(M, 'Değerler')(_m('Değerler', oto=True)(lambda y, o: list(o.values())))
    tablo(M, 'Çiftler')(_m('Çiftler', oto=True)(lambda y, o: [[a, b] for a, b in o.items()]))
    tablo(M, 'İçerir')(_m('İçerir', 1, 1)(lambda y, o, a: a in o))
    tablo(M, 'Al')(_m('Al', 1, 2)(lambda y, o, a, v=None: o.get(a, v)))
    tablo(M, 'Sil')(_m('Sil', 1, 1)(lambda y, o, a: o.pop(a, None)))
    tablo(M, 'Temizle')(_m('Temizle', oto=True)(lambda y, o: o.clear()))
    tablo(M, 'BoşMu')(_m('BoşMu', oto=True)(lambda y, o: len(o) == 0))

    D = {katla('Uzunluk'): _m('Uzunluk', oto=True)(lambda y, o: len(o.veri)),
         katla('Alt'): _m('Alt', oto=True)(lambda y, o: o.alt),
         katla('Üst'): _m('Üst', oto=True)(lambda y, o: o.alt + len(o.veri) - 1)}
    return {list: L, str: S, dict: M, PascalDizi: D}


YONTEMLER = _tablolar()


# ======================================================================== Matematik birimi
def matematik_modulu(y):
    from .yz import Tensor
    U = {}

    def tekli(ad, f, tensor_yontem=None):
        def calis(y, args):
            if len(args) != 1:
                raise YontemHatasi(f"'{ad}' 1 argüman bekler")
            x = args[0]
            if type(x) is Tensor and tensor_yontem:
                return getattr(x, tensor_yontem)()
            try:
                return f(_sayi(x, ad))
            except ValueError:
                raise YontemHatasi(f"'{ad}' bu değer için tanımsız: {x}")
        U[katla(ad)] = YerelFonksiyon(ad, calis)

    tekli('Sin', math.sin, 'sin')
    tekli('Cos', math.cos, 'cos')
    tekli('Tan', math.tan)
    tekli('ArkSin', math.asin)
    tekli('ArkCos', math.acos)
    tekli('ArkTan', math.atan)
    tekli('Ln', math.log, 'log')
    tekli('Log10', math.log10)
    tekli('Log2', math.log2)
    tekli('Üstel', lambda x: math.exp(min(x, 709.0)), 'us')
    tekli('Taban', math.floor)
    tekli('Tavan', math.ceil)
    tekli('Tanh', math.tanh, 'tanh')
    tekli('Sigmoid', lambda x: 1 / (1 + math.exp(-x)) if x >= 0 else math.exp(x) / (1 + math.exp(x)), 'sigmoid')
    tekli('Faktöriyel', lambda x: math.factorial(int(x)))
    U['kok'] = y.kok.d['kok']
    U['mutlak'] = y.kok.d['mutlak']
    U['yuvarla'] = y.kok.d['yuvarla']
    U['maks'] = y.kok.d['maks']
    U['min'] = y.kok.d['min']
    U['rastgele'] = y.kok.d['rastgele']
    U['pi'] = math.pi
    U['e'] = math.e
    U['sonsuz'] = float('inf')

    @yf('Üs', 2, 2)
    def _us(y, a, b):
        return y.ikili('**', a, b)
    U['us'] = _us

    @yf('ArkTan2', 2, 2)
    def _atan2(y, a, b):
        return math.atan2(a, b)
    U['arktan2'] = _atan2

    @yf('EBOB', 2, 2)
    def _ebob(y, a, b):
        return math.gcd(a, b)
    U['ebob'] = _ebob

    @yf('Kombinasyon', 2, 2)
    def _komb(y, n, r):
        return math.comb(n, r)
    U['kombinasyon'] = _komb

    @yf('Normal', 0, 2, oto=True)
    def _normal(y, ort=0.0, sapma=1.0):
        return _rng.gauss(ort, sapma)
    U['normal'] = _normal

    @yf('RastgeleSeç', 1, 1)
    def _sec(y, L):
        L = y.yinelenebilir(L)
        if not L:
            raise YontemHatasi("Boş listeden seçilemez")
        return _rng.choice(L)
    U['rastgelesec'] = _sec

    @yf('Karıştır', 1, 1)
    def _karistir(y, L):
        _rng.shuffle(_liste(L))
        return L
    U['karistir'] = _karistir

    @yf('Tohum', 1, 1)
    def _tohum(y, n):
        _rng.seed(n)
        from . import yz, mesale
        yz._rng.seed(n)
        mesale._rng.seed(n)
    U['tohum'] = _tohum
    return U


# ======================================================================== Sistem birimi
def sistem_modulu(y):
    U = {}

    @yf('Zaman', 0, 0, oto=True)
    def _zaman(y):
        return time.time()
    U['zaman'] = _zaman

    @yf('Saat', 0, 0, oto=True)
    def _saat(y):
        return time.strftime('%H:%M:%S')
    U['saat'] = _saat

    @yf('Tarih', 0, 0, oto=True)
    def _tarih(y):
        return time.strftime('%d.%m.%Y')
    U['tarih'] = _tarih

    @yf('Bekle', 1, 1)
    def _bekle(y, ms):
        time.sleep(ms / 1000.0)
    U['bekle'] = _bekle

    @yf('DosyaOku', 1, 1)
    def _dosya_oku(y, yol):
        try:
            with open(yol, encoding='utf-8') as f:
                return f.read()
        except OSError as e:
            raise YontemHatasi(f"Dosya okunamadı: {yol} ({e.strerror})")
    U['dosyaoku'] = _dosya_oku

    @yf('DosyaYaz', 2, 3)
    def _dosya_yaz(y, yol, icerik, ekle=False):
        try:
            with open(yol, 'a' if ekle else 'w', encoding='utf-8') as f:
                f.write(y.metne(icerik))
        except OSError as e:
            raise YontemHatasi(f"Dosya yazılamadı: {yol} ({e.strerror})")
    U['dosyayaz'] = _dosya_yaz

    @yf('DosyaVarMı', 1, 1)
    def _var(y, yol):
        return os.path.exists(yol)
    U['dosyavarmi'] = _var

    @yf('Satırlar', 1, 1)
    def _satirlar(y, yol):
        return _dosya_oku.fn(y, [yol]).splitlines()
    U['satirlar'] = _satirlar

    @yf('Ortam', 1, 2)
    def _ortam(y, ad, v=''):
        return os.environ.get(ad, v)
    U['ortam'] = _ortam

    @yf('Argümanlar', 0, 0, oto=True)
    def _args(y):
        return list(y.argumanlar)
    U['argumanlar'] = _args
    return U


# ======================================================================== Veri birimi
def _otomatik_sayi(s):
    t = s.strip()
    try:
        return int(t)
    except ValueError:
        try:
            return float(t)
        except ValueError:
            return s


def _json_icin(y, v):
    if type(v) in (list,):
        return [_json_icin(y, x) for x in v]
    if type(v) is PascalDizi:
        return [_json_icin(y, x) for x in v.veri]
    if type(v) is dict:
        return {y.metne(a): _json_icin(y, b) for a, b in v.items()}
    if type(v) is KNesne:
        return {a: _json_icin(y, b) for a, b in v.alanlar.items()}
    if type(v) in (int, float, str, bool) or v is None:
        return v
    from .yz import Tensor
    if type(v) is Tensor:
        return v.liste()
    return y.metne(v)


def veri_modulu(y):
    U = {}

    @yf('CSVOku', 1, 3)
    def _csv_oku(y, yol, baslikli=True, ayrac=','):
        try:
            with open(yol, encoding='utf-8', newline='') as f:
                satirlar = list(csv.reader(f, delimiter=ayrac))
        except OSError as e:
            raise YontemHatasi(f"CSV okunamadı: {yol} ({e.strerror})")
        satirlar = [s for s in satirlar if s]
        if not baslikli:
            return [[_otomatik_sayi(h) for h in s] for s in satirlar]
        basliklar = satirlar[0]
        return [{b: _otomatik_sayi(h) for b, h in zip(basliklar, s)} for s in satirlar[1:]]
    U['csvoku'] = _csv_oku

    @yf('CSVYaz', 2, 3)
    def _csv_yaz(y, yol, kayitlar, ayrac=','):
        with open(yol, 'w', encoding='utf-8', newline='') as f:
            w = csv.writer(f, delimiter=ayrac)
            if kayitlar and type(kayitlar[0]) is dict:
                basliklar = list(kayitlar[0].keys())
                w.writerow(basliklar)
                for r in kayitlar:
                    w.writerow([y.metne(r.get(b, '')) for b in basliklar])
            else:
                for r in kayitlar:
                    w.writerow([y.metne(x) for x in r])
    U['csvyaz'] = _csv_yaz

    @yf('JSONÇöz', 1, 1)
    def _json_coz(y, s):
        try:
            return json.loads(s)
        except json.JSONDecodeError as e:
            raise YontemHatasi(f"Geçersiz JSON: {e}")
    U['jsoncoz'] = _json_coz

    @yf('JSONYap', 1, 2)
    def _json_yap(y, v, girinti=None):
        return json.dumps(_json_icin(y, v), ensure_ascii=False, indent=girinti)
    U['jsonyap'] = _json_yap

    @yf('Sütun', 2, 2)
    def _sutun(y, kayitlar, ad):
        return [r[ad] if type(r) is dict else r[ad] for r in kayitlar]
    U['sutun'] = _sutun

    @yf('MinMaksÖlçekle', 1, 1)
    def _minmaks(y, L):
        L = [float(x) for x in y.yinelenebilir(L)]
        a, b = min(L), max(L)
        return [0.0 if b == a else (x - a) / (b - a) for x in L]
    U['minmaksolcekle'] = _minmaks

    @yf('Standartlaştır', 1, 1)
    def _standart(y, L):
        L = [float(x) for x in y.yinelenebilir(L)]
        m = sum(L) / len(L)
        s = math.sqrt(sum((x - m) ** 2 for x in L) / len(L)) or 1.0
        return [(x - m) / s for x in L]
    U['standartlastir'] = _standart

    @yf('EğitimTestBöl', 2, 4)
    def _bol(y, X, Y, oran=0.2, tohum=None):
        X, Y = list(y.yinelenebilir(X)), list(y.yinelenebilir(Y))
        if len(X) != len(Y):
            raise YontemHatasi("EğitimTestBöl: X ve Y aynı uzunlukta olmalı")
        idx = list(range(len(X)))
        random.Random(tohum).shuffle(idx)
        n_test = int(round(len(X) * oran))
        te, tr = idx[:n_test], idx[n_test:]
        return [[X[i] for i in tr], [Y[i] for i in tr], [X[i] for i in te], [Y[i] for i in te]]
    U['egitimtestbol'] = _bol
    return U


def _yz_modulu(y):
    from .yz import yz_modulu
    return yz_modulu(y)


def _mesale_modulu(y):
    from .mesale import mesale_modulu
    return mesale_modulu(y)


def _kuantum_modulu(y):
    from .kuantum import kuantum_modulu
    return kuantum_modulu(y)


def _donanim_modulu(y):
    from .donanim import donanim_modulu
    return donanim_modulu(y)


def _pencere_modulu(y):
    from .pencere import pencere_modulu
    return pencere_modulu(y)


def _mobil_modulu(y):
    from .mobil import mobil_modulu
    return mobil_modulu(y)


def _guvenlik_modulu(y):
    from .guvenlik import guvenlik_modulu
    return guvenlik_modulu(y)


def _takvim_modulu(y):
    from .takvim import takvim_modulu
    return takvim_modulu(y)


def _desen_modulu(y):
    from .desen import desen_modulu
    return desen_modulu(y)


def _ag_modulu(y):
    from .ag import ag_modulu
    return ag_modulu(y)


def _sunucu_modulu(y):
    from .sunucu import sunucu_modulu
    return sunucu_modulu(y)


def _veritabani_modulu(y):
    from .veritabani import veritabani_modulu
    return veritabani_modulu(y)


YEREL_MODULLER = {
    'donanim': _donanim_modulu,
    'pencere': _pencere_modulu,
    'ui': _pencere_modulu,
    'mobil': _mobil_modulu,
    'mobile': _mobil_modulu,
    'guvenlik': _guvenlik_modulu,
    'security': _guvenlik_modulu,
    'takvim': _takvim_modulu,
    'calendar': _takvim_modulu,
    'desen': _desen_modulu,
    'regex': _desen_modulu,
    'ag': _ag_modulu,
    'net': _ag_modulu,
    'http': _ag_modulu,
    'sunucu': _sunucu_modulu,
    'server': _sunucu_modulu,
    'web': _sunucu_modulu,
    'veritabani': _veritabani_modulu,
    'vt': _veritabani_modulu,
    'database': _veritabani_modulu,
    'db': _veritabani_modulu,
    'kuantum': _kuantum_modulu,
    'matematik': matematik_modulu,
    'sistem': sistem_modulu,
    'veri': veri_modulu,
    'yz': _yz_modulu,
    'mesale': _mesale_modulu,
}
