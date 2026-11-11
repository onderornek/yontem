"""Meşale birimi: PyTorch benzeri N boyutlu tensörler, otomatik türev, fonksiyonel işlemler,
kayıplar, optimizasyon, veri yükleyici, kaydet/yükle.

JavaScript sürümü (js/src/calisma/mesale.ts) ile aynı algoritmalar ve aynı kayan nokta işlem
sırası kullanılır; iki çalışma zamanı aynı çıktıyı üretir. Toplamalar hep soldan sağa, tek tek
yapılır (Python'un sum() fonksiyonu kullanılmaz, çünkü 3.12'den beri dengeli toplama yapar)."""
import json
import math
import random

from .degerler import YerelFonksiyon, KNesne, KSinif, PascalDizi
from .hatalar import YontemHatasi
from .sozcuk import katla

_rng = random.Random()
_grad_acik = [True]


def _hata(m):
    raise YontemHatasi(m)


def _tam(x, ad='değer'):
    if type(x) is int:
        return x
    if type(x) is float and x == int(x):
        return int(x)
    _hata(f"{ad} tamsayı olmalı")


def _sayi(x):
    t = type(x)
    if t is float:
        return x
    if t is int:
        return float(x)
    if t is bool:
        return 1.0 if x else 0.0
    if t is MTensor and len(x.v) == 1:
        return x.v[0]
    from .yorumlayici import tur_adi
    _hata(f"Sayı bekleniyordu, {tur_adi(x)} verildi")


def _dogru(v):
    return v is True


def _carpim(s):
    n = 1
    for x in s:
        n *= x
    return n


def _adimlar(s):
    r = [0] * len(s)
    a = 1
    for i in range(len(s) - 1, -1, -1):
        r[i] = a
        a *= s[i]
    return r


def _sekil_yaz(s):
    return '[' + ', '.join(str(x) for x in s) + ']'


def _yinele(v):
    from .yorumlayici import tur_adi
    t = type(v)
    if t is list:
        return list(v)
    if t is PascalDizi:
        return list(v.veri)
    if hasattr(v, 'yinele_'):
        return v.yinele_()
    _hata(f"{tur_adi(v)} üzerinde yinelenemez")


def _ondalik(x):
    return f"{x:.4f}"


# ======================================================================== tensör
class MTensor:
    __slots__ = ('v', 's', 'grad', 'ebeveyn', 'geri', 'gerekli')
    TUR_ADI = 'tensör'
    MESALE = True

    def __init__(self, v, s, gerekli=False):
        self.v = v
        self.s = list(s)
        self.grad = None
        self.ebeveyn = ()
        self.geri = None
        self.gerekli = gerekli

    @property
    def n(self):
        return len(self.v)

    def liste(self):
        s = self.s
        if not s:
            return self.v[0]
        ad = _adimlar(s)

        def yap(d, o):
            if d == len(s) - 1:
                return [self.v[o + i] for i in range(s[d])]
            return [yap(d + 1, o + i * ad[d]) for i in range(s[d])]
        return yap(0, 0)

    def ogeler(self):
        if not self.s:
            _hata('0 boyutlu tensör üzerinde yinelenemez')
        return [_secim(self, [i]) for i in range(self.s[0])]

    def yinele_(self):
        return self.ogeler()

    def indeks_al(self, idx):
        return _secim(self, [_tam(i, 'Tensör dizini') for i in idx])

    def indeks_ata(self, idx, deger):
        ii = [_tam(i, 'Tensör dizini') for i in idx]
        if len(ii) > len(self.s):
            _hata('Tensör dizini fazla')
        ad = _adimlar(self.s)
        o = 0
        for d, i in enumerate(ii):
            j = i + self.s[d] if i < 0 else i
            if j < 0 or j >= self.s[d]:
                _hata(f"Tensör dizini sınır dışı: {i} (boyut {d}, uzunluk {self.s[d]})")
            o += j * ad[d]
        kalan = self.s[len(ii):]
        n = _carpim(kalan)
        if type(deger) is MTensor:
            dv = _yay(deger, kalan)
            for k in range(n):
                self.v[o + k] = dv[k]
        else:
            x = _sayi(deger)
            for k in range(n):
                self.v[o + k] = x

    def k_al(self, ad, y):
        f = _TENSOR_UYE.get(ad)
        if f is not None:
            return f(self)
        _hata(f"Tensörde '{ad}' üyesi yok")

    def k_ata(self, ad, v, y):
        if ad in ('gradgerekli', 'requires_grad'):
            self.gerekli = _dogru(v)
            return
        if ad == 'grad':
            self.grad = None if v is None else list(_yay(_tensore(v), self.s))
            return
        _hata(f"Tensörün '{ad}' üyesine atama yapılamaz")

    def __str__(self):
        return _tensor_yaz(self)


def _tensor_yaz(t):
    ek = ', grad_gerekli=doğru' if t.gerekli else ''
    if not t.s:
        return f"tensör({_ondalik(t.v[0])}{ek})"
    metinler = [_ondalik(x) for x in t.v]
    gen = max((len(x) for x in metinler), default=0)
    s = t.s
    ad = _adimlar(s)

    def yap(d, o, girinti):
        if s[d] == 0:
            return '[]'
        if d == len(s) - 1:
            return '[' + ', '.join(metinler[o + i].rjust(gen) for i in range(s[d])) + ']'
        p = [yap(d + 1, o + i * ad[d], girinti + 1) for i in range(s[d])]
        ayrac = ',' + '\n' * (len(s) - d - 1) + ' ' * (girinti + 1)
        return '[' + ayrac.join(p) + ']'
    return 'tensör(' + yap(0, 0, 7) + ek + ')'


def _yeni(v, s, ebeveyn, geri):
    t = MTensor(v, s)
    if _grad_acik[0]:
        for p in ebeveyn:
            if p.gerekli:
                t.gerekli = True
                t.ebeveyn = ebeveyn
                t.geri = geri
                break
    return t


def _biriktir(p, g):
    if not p.gerekli:
        return
    if p.grad is None:
        p.grad = list(g)
    else:
        r = p.grad
        for i in range(len(r)):
            r[i] += g[i]


def _tensore(x, gerekli=False):
    t = type(x)
    if t is MTensor:
        return x
    if t in (int, float, bool):
        return MTensor([_sayi(x)], [], gerekli)
    if t is PascalDizi:
        x = x.veri
    if type(x) is list:
        sekil = []
        y = x
        while True:
            if type(y) is PascalDizi:
                y = y.veri
            if type(y) is list:
                sekil.append(len(y))
                if not y:
                    break
                y = y[0]
            elif type(y) is MTensor:
                sekil.extend(y.s)
                break
            else:
                break
        veri = []

        def dolas(z, d):
            if type(z) is PascalDizi:
                z = z.veri
            if type(z) is MTensor:
                if z.s != sekil[d:]:
                    _hata('Düzensiz liste: tüm alt listeler aynı şekilde olmalı')
                veri.extend(z.v)
                return
            if d == len(sekil):
                veri.append(_sayi(z))
                return
            if type(z) is not list or len(z) != sekil[d]:
                _hata('Düzensiz liste: tüm alt listeler aynı uzunlukta olmalı')
            for e in z:
                dolas(e, d + 1)
        dolas(x, 0)
        return MTensor(veri, sekil, gerekli)
    from .yorumlayici import tur_adi
    _hata(f"Tensöre çevrilemez: {tur_adi(x)}")


# ======================================================================== yayma
def _yay_sekil(a, b):
    n = max(len(a), len(b))
    r = []
    for i in range(n):
        ia, ib = len(a) - n + i, len(b) - n + i
        x = a[ia] if ia >= 0 else 1
        y = b[ib] if ib >= 0 else 1
        if x != y and x != 1 and y != 1:
            _hata(f"Tensör şekilleri uyumsuz: {_sekil_yaz(a)} ve {_sekil_yaz(b)}")
        r.append(y if x == 1 else x)
    return r


def _harita(cikis, giris):
    if list(cikis) == list(giris):
        return None
    n = _carpim(cikis)
    m = [0] * n
    fark = len(cikis) - len(giris)
    ga = _adimlar(giris)
    adim = [0 if (d < fark or giris[d - fark] == 1) else ga[d - fark] for d in range(len(cikis))]
    sayac = [0] * len(cikis)
    o = 0
    for i in range(n):
        m[i] = o
        for d in range(len(cikis) - 1, -1, -1):
            sayac[d] += 1
            o += adim[d]
            if sayac[d] < cikis[d]:
                break
            o -= adim[d] * cikis[d]
            sayac[d] = 0
    return m


def _yay(t, sekil):
    _yay_sekil(t.s, sekil)
    h = _harita(sekil, t.s)
    if h is None:
        return t.v
    return [t.v[j] for j in h]


def _indir(g, h, n):
    if h is None:
        return g
    r = [0.0] * n
    for i in range(len(h)):
        r[h[i]] += g[i]
    return r


def _ikili(a0, b0, f, dfa, dfb):
    a, b = _tensore(a0), _tensore(b0)
    s = _yay_sekil(a.s, b.s)
    ha, hb = _harita(s, a.s), _harita(s, b.s)
    n = _carpim(s)
    av, bv = a.v, b.v
    out = [f(av[ha[i] if ha else i], bv[hb[i] if hb else i]) for i in range(n)]

    def geri(g):
        if a.gerekli:
            ga = [g[i] * dfa(av[ha[i] if ha else i], bv[hb[i] if hb else i], out[i]) for i in range(n)]
            _biriktir(a, _indir(ga, ha, a.n))
        if b.gerekli:
            gb = [g[i] * dfb(av[ha[i] if ha else i], bv[hb[i] if hb else i], out[i]) for i in range(n)]
            _biriktir(b, _indir(gb, hb, b.n))
    return _yeni(out, s, (a, b), geri)


def _bolme(x, y):
    if y == 0:
        if x == 0 or x != x:
            return math.nan
        return math.copysign(math.inf, x) * math.copysign(1.0, y)
    return x / y


def _pow(x, y):
    try:
        r = math.pow(x, y)
    except ValueError:
        return math.nan
    except OverflowError:
        return math.inf
    return r


def _topla(a, b):
    return _ikili(a, b, lambda x, y: x + y, lambda x, y, z: 1.0, lambda x, y, z: 1.0)


def _cikar(a, b):
    return _ikili(a, b, lambda x, y: x - y, lambda x, y, z: 1.0, lambda x, y, z: -1.0)


def _carp(a, b):
    return _ikili(a, b, lambda x, y: x * y, lambda x, y, z: y, lambda x, y, z: x)


def _bol(a, b):
    return _ikili(a, b, _bolme, lambda x, y, z: _bolme(1.0, y), lambda x, y, z: _bolme(-x, y * y))


def _usal(a, b):
    return _ikili(a, b, _pow,
                  lambda x, y, z: 0.0 if y == 0 else y * _pow(x, y - 1),
                  lambda x, y, z: z * math.log(x) if x > 0 else 0.0)


def _karsilastir(a, b, f):
    A, B = _tensore(a), _tensore(b)
    s = _yay_sekil(A.s, B.s)
    x, y = _yay(A, s), _yay(B, s)
    return MTensor([1.0 if f(x[i], y[i]) else 0.0 for i in range(len(x))], s)


def _tekli(t0, f, df):
    t = _tensore(t0)
    tv = t.v
    out = [f(x) for x in tv]

    def geri(g):
        _biriktir(t, [g[i] * df(tv[i], out[i]) for i in range(len(tv))])
    return _yeni(out, list(t.s), (t,), geri)


def _sigmoid(x):
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    e = math.exp(x)
    return e / (1.0 + e)


def _exp(x):
    try:
        return math.exp(x)
    except OverflowError:
        return math.inf


_GELU_C = math.sqrt(2 / math.pi)


def _gelu(x):
    return 0.5 * x * (1 + math.tanh(_GELU_C * (x + 0.044715 * x * x * x)))


def _gelu_turev(x):
    u = _GELU_C * (x + 0.044715 * x * x * x)
    th = math.tanh(u)
    return 0.5 * (1 + th) + 0.5 * x * (1 - th * th) * _GELU_C * (1 + 3 * 0.044715 * x * x)


def _log_guvenli(x):
    if x < 0:
        _hata('log: negatif değer')
    return -math.inf if x == 0 else math.log(x)


def _sqrt(x):
    return math.sqrt(x) if x >= 0 else math.nan


def _abs_turev(x, y=None):
    return 1.0 if x > 0 else (-1.0 if x < 0 else 0.0)


# ======================================================================== şekil işlemleri
def _boyut_coz(d, n):
    x = _tam(d, 'Boyut')
    if x < 0:
        x += n
    if x < 0 or x >= n:
        _hata(f"Boyut sınır dışı: {d} (tensör {n} boyutlu)")
    return x


def _sekil_al(a):
    a = list(a)
    if len(a) == 1 and type(a[0]) in (list, PascalDizi):
        a = _yinele(a[0])
    return [_tam(x, 'Şekil') for x in a]


def _yeniden(t, sekil0):
    sekil = list(sekil0)
    if -1 in sekil:
        b = sekil.index(-1)
        diger = _carpim([x for i, x in enumerate(sekil) if i != b])
        if diger == 0 or t.n % diger != 0:
            _hata(f"Yeniden şekillendirme olanaksız: {t.n} öğe → {_sekil_yaz(sekil0)}")
        sekil[b] = t.n // diger
    if _carpim(sekil) != t.n:
        _hata(f"Yeniden şekillendirme olanaksız: {t.n} öğe → {_sekil_yaz(sekil0)}")
    return _yeni(list(t.v), sekil, (t,), lambda g: _biriktir(t, g))


def _permute(t, dizi):
    n = len(t.s)
    if len(dizi) != n or len(set(dizi)) != n:
        _hata(f"Boyut sıralaması {n} farklı boyut içermeli")
    s = [t.s[d] for d in dizi]
    ga = _adimlar(t.s)
    adim = [ga[d] for d in dizi]
    h = [0] * t.n
    sayac = [0] * n
    o = 0
    for i in range(t.n):
        h[i] = o
        for d in range(n - 1, -1, -1):
            sayac[d] += 1
            o += adim[d]
            if sayac[d] < s[d]:
                break
            o -= adim[d] * s[d]
            sayac[d] = 0
    tv = t.v
    out = [tv[j] for j in h]

    def geri(g):
        r = [0.0] * t.n
        for i in range(t.n):
            r[h[i]] += g[i]
        _biriktir(t, r)
    return _yeni(out, s, (t,), geri)


def _transpoze(t, a, b):
    d = list(range(len(t.s)))
    d[a] = b
    d[b] = a
    return _permute(t, d)


def _secim(t, idx):
    if len(idx) > len(t.s):
        _hata(f"Tensör {len(t.s)} boyutlu; {len(idx)} dizin verildi")
    ad = _adimlar(t.s)
    o = 0
    for d, i in enumerate(idx):
        j = i + t.s[d] if i < 0 else i
        if j < 0 or j >= t.s[d]:
            _hata(f"Tensör dizini sınır dışı: {i} (boyut {d}, uzunluk {t.s[d]})")
        o += j * ad[d]
    s = t.s[len(idx):]
    n = _carpim(s)
    if not s:
        return t.v[o]

    def geri(g):
        r = [0.0] * t.n
        for k in range(n):
            r[o + k] = g[k]
        _biriktir(t, r)
    return _yeni(t.v[o:o + n], s, (t,), geri)


def _daralt(t, d0, bas0, uz0):
    d = _boyut_coz(d0, len(t.s))
    bas = _tam(bas0, 'Başlangıç')
    if bas < 0:
        bas += t.s[d]
    uz = _tam(uz0, 'Uzunluk')
    if bas < 0 or uz < 0 or bas + uz > t.s[d]:
        _hata(f"Daraltma sınır dışı: boyut {d}, {bas}..{bas + uz} (uzunluk {t.s[d]})")
    return _dizin_sec(t, d, [bas + i for i in range(uz)])


def _dizin_sec(t, d, dizinler):
    s = list(t.s)
    s[d] = len(dizinler)
    once, sonra = _carpim(t.s[:d]), _carpim(t.s[d + 1:])
    out, h = [], []
    for a in range(once):
        for j0 in dizinler:
            j = j0 + t.s[d] if j0 < 0 else j0
            if j < 0 or j >= t.s[d]:
                _hata(f"Dizin sınır dışı: {j0} (uzunluk {t.s[d]})")
            o = (a * t.s[d] + j) * sonra
            for c in range(sonra):
                h.append(o + c)
                out.append(t.v[o + c])

    def geri(g):
        r = [0.0] * t.n
        for i in range(len(h)):
            r[h[i]] += g[i]
        _biriktir(t, r)
    return _yeni(out, s, (t,), geri)


def _bitistir(lst, d0=0):
    ts = [_tensore(x) for x in _yinele(lst)]
    if not ts:
        _hata('Birleştirilecek tensör yok')
    nb = len(ts[0].s)
    d = _boyut_coz(d0, nb)
    for t in ts:
        if len(t.s) != nb or any(i != d and x != ts[0].s[i] for i, x in enumerate(t.s)):
            _hata(f"Birleştirilen tensörlerin şekilleri uyumsuz: {_sekil_yaz(ts[0].s)} ve {_sekil_yaz(t.s)}")
    s = list(ts[0].s)
    s[d] = 0
    for t in ts:
        s[d] += t.s[d]
    once, sonra = _carpim(s[:d]), _carpim(s[d + 1:])
    out = []
    for a in range(once):
        for t in ts:
            parca = t.s[d] * sonra
            o = a * parca
            out.extend(t.v[o:o + parca])

    def geri(g):
        rs = [[0.0] * t.n for t in ts]
        w = 0
        for a in range(once):
            for k, t in enumerate(ts):
                parca = t.s[d] * sonra
                o = a * parca
                for c in range(parca):
                    rs[k][o + c] = g[w]
                    w += 1
        for k, t in enumerate(ts):
            _biriktir(t, rs[k])
    return _yeni(out, s, tuple(ts), geri)


def _yigma(lst, d0=0):
    ts = [_tensore(x) for x in _yinele(lst)]
    if not ts:
        _hata('Yığılacak tensör yok')
    d = _boyut_coz(d0, len(ts[0].s) + 1)
    return _bitistir([_boyut_ekle(t, d) for t in ts], d)


def _boyut_ekle(t, d):
    s = list(t.s)
    s.insert(d, 1)
    return _yeniden(t, s)


# ======================================================================== indirgemeler
def _top_indir(t, dims, tut):
    nb = len(t.s)
    ds = list(range(nb)) if dims is None else dims
    s_keep = [1 if i in ds else x for i, x in enumerate(t.s)]
    s = s_keep if tut else [x for i, x in enumerate(t.s) if i not in ds]
    sk = _adimlar(s_keep)
    ga = _adimlar(t.s)
    m = [0] * t.n
    for i in range(t.n):
        o, kalan = 0, i
        for d in range(nb):
            c = kalan // ga[d]
            kalan -= c * ga[d]
            if s_keep[d] != 1:
                o += c * sk[d]
        m[i] = o
    out = [0.0] * _carpim(s_keep)
    tv = t.v
    for i in range(t.n):
        out[m[i]] += tv[i]

    def geri(g):
        _biriktir(t, [g[m[i]] for i in range(t.n)])
    return _yeni(out, s, (t,), geri)


def _boyutlar(d, nb):
    if d is None:
        return None
    if type(d) is list:
        return [_boyut_coz(x, nb) for x in d]
    return [_boyut_coz(d, nb)]


def _ortalama(t, d, tut):
    ds = _boyutlar(d, len(t.s))
    if ds is None:
        n = t.n
    else:
        n = 1
        for x in ds:
            n *= t.s[x]
    return _bol(_top_indir(t, ds, tut), n)


def _varyans(t, d, duzeltme, tut):
    ds = _boyutlar(d, len(t.s))
    if ds is None:
        n = t.n
    else:
        n = 1
        for x in ds:
            n *= t.s[x]
    m = _ortalama(t, d, True)
    fark = _cikar(t, m)
    return _bol(_top_indir(_carp(fark, fark), ds, tut), n - duzeltme)


def _uc_deger(t, d0, tut, buyuk):
    if d0 is None:
        if not t.n:
            _hata('Boş tensörün en büyüğü yok')
        bi = 0
        for i in range(1, t.n):
            if (t.v[i] > t.v[bi]) if buyuk else (t.v[i] < t.v[bi]):
                bi = i

        def geri0(g):
            r = [0.0] * t.n
            r[bi] = g[0]
            _biriktir(t, r)
        return _yeni([t.v[bi]], [], (t,), geri0), MTensor([float(bi)], [])
    d = _boyut_coz(d0, len(t.s))
    once, L, sonra = _carpim(t.s[:d]), t.s[d], _carpim(t.s[d + 1:])
    n = once * sonra
    out, dz, kaynak = [0.0] * n, [0.0] * n, [0] * n
    for a in range(once):
        for c in range(sonra):
            taban = a * L * sonra + c
            bi = 0
            for j in range(1, L):
                x, y = t.v[taban + j * sonra], t.v[taban + bi * sonra]
                if (x > y) if buyuk else (x < y):
                    bi = j
            o = a * sonra + c
            out[o] = t.v[taban + bi * sonra]
            dz[o] = float(bi)
            kaynak[o] = taban + bi * sonra
    s = list(t.s)
    if tut:
        s[d] = 1
    else:
        del s[d]

    def geri(g):
        r = [0.0] * t.n
        for i in range(n):
            r[kaynak[i]] += g[i]
        _biriktir(t, r)
    return _yeni(out, s, (t,), geri), MTensor(dz, list(s))


# ======================================================================== matris çarpımı
def _mat_carp(a0, b0):
    a, b = _tensore(a0), _tensore(b0)
    if not a.s or not b.s:
        _hata('matmul 0 boyutlu tensör kabul etmez')
    a1, b1 = len(a.s) == 1, len(b.s) == 1
    if a1:
        a = _yeniden(a, [1, a.s[0]])
    if b1:
        b = _yeniden(b, [b.s[0], 1])
    n, k = a.s[-2:]
    k2, m = b.s[-2:]
    if k != k2:
        _hata(f"matmul şekilleri uyumsuz: {_sekil_yaz(a.s)} @ {_sekil_yaz(b.s)}")
    yb = _yay_sekil(a.s[:-2], b.s[:-2])
    nb = _carpim(yb)
    ha, hb = _harita(yb, a.s[:-2]), _harita(yb, b.s[:-2])
    out = [0.0] * (nb * n * m)
    A, Bv = a.v, b.v
    for q in range(nb):
        oa = (ha[q] if ha else q) * n * k
        ob = (hb[q] if hb else q) * k * m
        oc = q * n * m
        for i in range(n):
            for j in range(m):
                t = 0.0
                for p in range(k):
                    t += A[oa + i * k + p] * Bv[ob + p * m + j]
                out[oc + i * m + j] = t
    sekil = list(yb) + [n, m]
    aa, bb = a, b

    def geri(g):
        if aa.gerekli:
            ga = [0.0] * aa.n
            for q in range(nb):
                oa = (ha[q] if ha else q) * n * k
                ob = (hb[q] if hb else q) * k * m
                oc = q * n * m
                for i in range(n):
                    for p in range(k):
                        t = 0.0
                        for j in range(m):
                            t += g[oc + i * m + j] * Bv[ob + p * m + j]
                        ga[oa + i * k + p] += t
            _biriktir(aa, ga)
        if bb.gerekli:
            gb = [0.0] * bb.n
            for q in range(nb):
                oa = (ha[q] if ha else q) * n * k
                ob = (hb[q] if hb else q) * k * m
                oc = q * n * m
                for p in range(k):
                    for j in range(m):
                        t = 0.0
                        for i in range(n):
                            t += A[oa + i * k + p] * g[oc + i * m + j]
                        gb[ob + p * m + j] += t
            _biriktir(bb, gb)
    r = _yeni(out, sekil, (aa, bb), geri)
    if a1 or b1:
        sekil = list(yb) + ([] if a1 else [n]) + ([] if b1 else [m])
        r = _yeniden(r, sekil)
    return r


# ======================================================================== birleşik işlemler
def _son_boyut(t, d0):
    d = _boyut_coz(-1 if d0 is None else d0, len(t.s))
    return d, _carpim(t.s[:d]), t.s[d], _carpim(t.s[d + 1:])


def _softmaks(t0, d0, log):
    t = _tensore(t0)
    _, once, L, sonra = _son_boyut(t, d0)
    tv = t.v
    out = [0.0] * t.n
    for a in range(once):
        for c in range(sonra):
            o = a * L * sonra + c
            mx = -math.inf
            for j in range(L):
                if tv[o + j * sonra] > mx:
                    mx = tv[o + j * sonra]
            top = 0.0
            for j in range(L):
                top += math.exp(tv[o + j * sonra] - mx)
            lt = math.log(top)
            for j in range(L):
                z = tv[o + j * sonra] - mx
                out[o + j * sonra] = z - lt if log else math.exp(z) / top

    def geri(g):
        r = [0.0] * t.n
        for a in range(once):
            for c in range(sonra):
                o = a * L * sonra + c
                top = 0.0
                if log:
                    for j in range(L):
                        top += g[o + j * sonra]
                    for j in range(L):
                        r[o + j * sonra] = g[o + j * sonra] - math.exp(out[o + j * sonra]) * top
                else:
                    for j in range(L):
                        top += g[o + j * sonra] * out[o + j * sonra]
                    for j in range(L):
                        r[o + j * sonra] = out[o + j * sonra] * (g[o + j * sonra] - top)
        _biriktir(t, r)
    return _yeni(out, list(t.s), (t,), geri)


def _hedefler(y, n):
    lst = list(y.v) if type(y) is MTensor else [_sayi(x) for x in _yinele(y)]
    if len(lst) != n:
        _hata(f"Hedef sayısı ({len(lst)}) satır sayısına ({n}) eşit olmalı")
    r = []
    for x in lst:
        if x != int(x):
            _hata('Sınıf hedefleri tamsayı olmalı')
        r.append(int(x))
    return r


def _capraz_entropi(x0, y, yoksay=-100):
    x = _tensore(x0)
    if len(x.s) != 2:
        _hata(f"cross_entropy [N, C] şeklinde girdi bekler, {_sekil_yaz(x.s)} verildi (gerekirse .view(-1, C) kullanın)")
    N, C = x.s
    h = _hedefler(y, N)
    xv = x.v
    p = [0.0] * x.n
    kayip, sayilan = 0.0, 0
    for i in range(N):
        o = i * C
        mx = -math.inf
        for j in range(C):
            if xv[o + j] > mx:
                mx = xv[o + j]
        top = 0.0
        for j in range(C):
            top += math.exp(xv[o + j] - mx)
        for j in range(C):
            p[o + j] = math.exp(xv[o + j] - mx) / top
        if h[i] == yoksay:
            continue
        if h[i] < 0 or h[i] >= C:
            _hata(f"Sınıf hedefi sınır dışı: {h[i]} (sınıf sayısı {C})")
        kayip -= xv[o + h[i]] - mx - math.log(top)
        sayilan += 1
    bolen = sayilan or 1

    def geri(g):
        r = [0.0] * x.n
        for i in range(N):
            if h[i] == yoksay:
                continue
            for j in range(C):
                r[i * C + j] = g[0] * (p[i * C + j] - (1 if j == h[i] else 0)) / bolen
        _biriktir(x, r)
    return _yeni([kayip / bolen], [], (x,), geri)


def _nll_kaybi(x0, y):
    x = _tensore(x0)
    if len(x.s) != 2:
        _hata('nll_loss [N, C] şeklinde girdi bekler')
    N, C = x.s
    h = _hedefler(y, N)
    k = 0.0
    for i in range(N):
        k -= x.v[i * C + h[i]]

    def geri(g):
        r = [0.0] * x.n
        for i in range(N):
            r[i * C + h[i]] = -g[0] / N
        _biriktir(x, r)
    return _yeni([k / N], [], (x,), geri)


def _katman_norm(x0, w, b, eps):
    x = _tensore(x0)
    D = x.s[-1]
    N = x.n // D
    xv = x.v
    xh = [0.0] * x.n
    ist = [0.0] * N
    for i in range(N):
        o = i * D
        m = 0.0
        for j in range(D):
            m += xv[o + j]
        m /= D
        v = 0.0
        for j in range(D):
            f = xv[o + j] - m
            v += f * f
        v /= D
        is_ = 1 / math.sqrt(v + eps)
        ist[i] = is_
        for j in range(D):
            xh[o + j] = (xv[o + j] - m) * is_
    W = None if w is None else _tensore(w)
    Bb = None if b is None else _tensore(b)
    out = [xh[i] * (W.v[i % D] if W else 1) + (Bb.v[i % D] if Bb else 0) for i in range(x.n)]
    ebeveyn = (x,) + ((W,) if W else ()) + ((Bb,) if Bb else ())

    def geri(g):
        if W is not None and W.gerekli:
            r = [0.0] * D
            for i in range(x.n):
                r[i % D] += g[i] * xh[i]
            _biriktir(W, r)
        if Bb is not None and Bb.gerekli:
            r = [0.0] * D
            for i in range(x.n):
                r[i % D] += g[i]
            _biriktir(Bb, r)
        if x.gerekli:
            r = [0.0] * x.n
            for i in range(N):
                o = i * D
                t1 = t2 = 0.0
                for j in range(D):
                    gh = g[o + j] * (W.v[j] if W else 1)
                    t1 += gh
                    t2 += gh * xh[o + j]
                for j in range(D):
                    gh = g[o + j] * (W.v[j] if W else 1)
                    r[o + j] = ist[i] * (gh - t1 / D - xh[o + j] * t2 / D)
            _biriktir(x, r)
    return _yeni(out, list(x.s), ebeveyn, geri)


def _gomme(ids, W0):
    W = _tensore(W0)
    if len(W.s) != 2:
        _hata('embedding ağırlığı [sözlük boyu, boyut] şeklinde olmalı')
    it = _tensore(ids)
    V, D = W.s
    sira = []
    for x in it.v:
        if x != int(x) or x < 0 or x >= V:
            _hata(f"Gömme dizini sınır dışı: {x} (sözlük boyu {V})")
        sira.append(int(x))
    out = []
    for k in sira:
        out.extend(W.v[k * D:(k + 1) * D])

    def geri(g):
        r = [0.0] * W.n
        for i, k in enumerate(sira):
            for j in range(D):
                r[k * D + j] += g[i * D + j]
        _biriktir(W, r)
    return _yeni(out, list(it.s) + [D], (W,), geri)


def _birakma(x0, p, egitim):
    x = _tensore(x0)
    if not egitim or p == 0:
        return x
    if p < 0 or p >= 1:
        _hata('Bırakma oranı 0 ile 1 arasında olmalı')
    olcek = 1 / (1 - p)
    maske = [0.0 if _rng.random() < p else olcek for _ in range(x.n)]
    return _carp(x, MTensor(maske, list(x.s)))


def _maske_doldur(x0, maske0, deger):
    x = _tensore(x0)
    m = _yay(_tensore(maske0), x.s)
    out = [deger if m[i] != 0 else x.v[i] for i in range(x.n)]

    def geri(g):
        _biriktir(x, [0.0 if m[i] != 0 else g[i] for i in range(x.n)])
    return _yeni(out, list(x.s), (x,), geri)


def _nerede(kosul, a0, b0):
    k, a, b = _tensore(kosul), _tensore(a0), _tensore(b0)
    s = _yay_sekil(_yay_sekil(k.s, a.s), b.s)
    kv = _yay(k, s)
    return _topla(_carp(a, MTensor([1.0 if x != 0 else 0.0 for x in kv], s)),
                  _carp(b, MTensor([0.0 if x != 0 else 1.0 for x in kv], s)))


def _ucgen(t0, k0, alt):
    t = _tensore(t0)
    if len(t.s) < 2:
        _hata('tril/triu en az 2 boyutlu tensör bekler')
    k = _tam(0 if k0 is None else k0, 'Köşegen')
    R, C = t.s[-2:]
    m = []
    for i in range(t.n):
        r, c = (i % (R * C)) // C, i % C
        m.append(1.0 if ((c - r <= k) if alt else (c - r >= k)) else 0.0)
    return _carp(t, MTensor(m, list(t.s)))


# ======================================================================== geri yayılım
def _geri_yay(t, g0=None):
    if not t.gerekli:
        _hata('Bu tensör gradyan gerektirmiyor; geri yayılım yapılamaz')
    if g0 is None and t.n != 1:
        _hata('backward yalnızca tek öğeli (skaler) tensörde argümansız çağrılabilir')
    sira, gor = [], set()
    yigin = [(t, False)]
    while yigin:
        u, bitti = yigin.pop()
        if bitti:
            sira.append(u)
            continue
        if id(u) in gor:
            continue
        gor.add(id(u))
        yigin.append((u, True))
        for p in u.ebeveyn:
            if id(p) not in gor:
                yigin.append((p, False))
    for u in sira:
        if u.geri:
            u.grad = None
    tohum = [1.0] if g0 is None else list(_yay(_tensore(g0), t.s))
    if t.geri:
        t.grad = tohum
    else:
        _biriktir(t, tohum)
    for u in reversed(sira):
        if u.geri and u.grad:
            u.geri(u.grad)
    for u in sira:
        if u.geri:
            u.grad = None


# ======================================================================== optimizasyon
def _parametreler(p):
    r = [x for x in _yinele(p) if type(x) is MTensor]
    if not r:
        _hata('Optimizasyon için en az bir parametre tensörü gerekli')
    return r


class _Optim:
    TUR_ADI = 'optimizasyon'

    def __init__(self, p, oran, ad):
        self.params = _parametreler(p)
        self.oran = oran
        self.ad = ad

    def sifirla(self):
        for p in self.params:
            p.grad = None

    def adim(self):
        pass

    def k_al(self, ad, y):
        if ad in ('adim', 'step'):
            return YerelFonksiyon('Adım', lambda y_, a: self.adim(), True)
        if ad in ('sifirlagrad', 'zero_grad'):
            return YerelFonksiyon('SıfırlaGrad', lambda y_, a: self.sifirla(), True)
        if ad in ('oran', 'lr'):
            return self.oran
        if ad in ('parametreler', 'params'):
            return list(self.params)
        _hata(f"{self.ad} nesnesinde '{ad}' üyesi yok")

    def k_ata(self, ad, v, y):
        if ad in ('oran', 'lr'):
            self.oran = _sayi(v)
            return
        _hata(f"{self.ad} nesnesinin '{ad}' üyesine atama yapılamaz")

    def __str__(self):
        o = f"{self.oran:.6f}".rstrip('0')
        if o.endswith('.'):
            o += '0'
        return f"{self.ad}({len(self.params)} parametre, oran={o})"


class _SGD(_Optim):
    def __init__(self, p, oran, momentum, azalma):
        super().__init__(p, oran, 'SGD')
        self.momentum = momentum
        self.azalma = azalma
        self.hiz = [None] * len(self.params)

    def adim(self):
        for k, p in enumerate(self.params):
            if not p.grad:
                continue
            g = p.grad
            if self.azalma:
                for i in range(len(g)):
                    g[i] += self.azalma * p.v[i]
            d = g
            if self.momentum:
                h = self.hiz[k]
                if h is None:
                    self.hiz[k] = list(g)
                else:
                    for i in range(len(g)):
                        h[i] = self.momentum * h[i] + g[i]
                d = self.hiz[k]
            for i in range(p.n):
                p.v[i] -= self.oran * d[i]


class _Adam(_Optim):
    def __init__(self, p, oran, b1, b2, eps, azalma, ayrik, ad):
        super().__init__(p, oran, ad)
        self.b1, self.b2, self.eps, self.azalma, self.ayrik = b1, b2, eps, azalma, ayrik
        self.m = [None] * len(self.params)
        self.s2 = [None] * len(self.params)
        self.t = 0

    def adim(self):
        self.t += 1
        d1 = 1 - math.pow(self.b1, self.t)
        d2 = 1 - math.pow(self.b2, self.t)
        for k, p in enumerate(self.params):
            if not p.grad:
                continue
            g = p.grad
            if self.ayrik:
                if self.azalma:
                    for i in range(p.n):
                        p.v[i] -= self.oran * self.azalma * p.v[i]
            elif self.azalma:
                for i in range(len(g)):
                    g[i] += self.azalma * p.v[i]
            if self.m[k] is None:
                self.m[k] = [0.0] * p.n
                self.s2[k] = [0.0] * p.n
            m, s = self.m[k], self.s2[k]
            for i in range(p.n):
                m[i] = self.b1 * m[i] + (1 - self.b1) * g[i]
                s[i] = self.b2 * s[i] + (1 - self.b2) * g[i] * g[i]
                p.v[i] -= self.oran * (m[i] / d1) / (math.sqrt(s[i] / d2) + self.eps)


# ======================================================================== veri
class _VeriKumesi:
    TUR_ADI = 'TensörVeriKümesi'

    def __init__(self, tensorler):
        if not tensorler:
            _hata('TensörVeriKümesi en az bir tensör ister')
        n = tensorler[0].s[0] if tensorler[0].s else None
        for t in tensorler:
            if not t.s or t.s[0] != n:
                _hata('TensörVeriKümesi: tüm tensörlerin ilk boyutu aynı olmalı')
        self.tensorler = tensorler

    @property
    def uzunluk(self):
        return self.tensorler[0].s[0]

    def oge(self, i):
        return [_secim_tensor(t, i) for t in self.tensorler]

    def k_al(self, ad, y):
        if ad in ('uzunluk', 'len'):
            return self.uzunluk
        if ad in ('tensorler', 'tensors'):
            return list(self.tensorler)
        _hata(f"TensörVeriKümesi nesnesinde '{ad}' üyesi yok")

    def __str__(self):
        return f"TensörVeriKümesi({self.uzunluk} örnek)"

    def yinele_(self):
        return [self.oge(i) for i in range(self.uzunluk)]


def _secim_tensor(t, i):
    r = _secim(t, [i])
    return r if type(r) is MTensor else MTensor([r], [])


class _VeriYukleyici:
    TUR_ADI = 'VeriYükleyici'

    def __init__(self, kume, yigin, karistir, sonu_at):
        self.kume, self.yigin, self.karistir, self.sonu_at = kume, yigin, karistir, sonu_at

    def yiginlar(self):
        n = self.kume.uzunluk
        sira = list(range(n))
        if self.karistir:
            _rng.shuffle(sira)
        r = []
        for b in range(0, n, self.yigin):
            p = sira[b:b + self.yigin]
            if self.sonu_at and len(p) < self.yigin:
                break
            r.append([_dizin_sec(t, 0, p) for t in self.kume.tensorler])
        return r

    def k_al(self, ad, y):
        if ad in ('uzunluk', 'len'):
            n = self.kume.uzunluk
            return n // self.yigin if self.sonu_at else -(-n // self.yigin)
        if ad in ('yiginlar', 'batches'):
            return self.yiginlar()
        _hata(f"VeriYükleyici nesnesinde '{ad}' üyesi yok")

    def __str__(self):
        k = ', karıştırılmış' if self.karistir else ''
        return f"VeriYükleyici({self.kume.uzunluk} örnek, yığın {self.yigin}{k})"

    def yinele_(self):
        return self.yiginlar()


# ======================================================================== kaydet / yükle
def _kayit_yap(o, y):
    t = type(o)
    if t is MTensor:
        return {'tensor': list(o.v), 'sekil': list(o.s)}
    if t is dict:
        return {'sozluk': [[y.metne(k), _kayit_yap(v, y)] for k, v in o.items()]}
    if t is list:
        return {'liste': [_kayit_yap(x, y) for x in o]}
    if t is int and t is not bool:
        return {'tamsayi': str(o)}
    if t in (float, str, bool) or o is None:
        return {'deger': o}
    from .yorumlayici import tur_adi
    _hata(f"Kaydedilemez: {tur_adi(o)} (tensör, sözlük, liste ve sayılar kaydedilebilir)")


def _kayit_coz(o):
    if 'tensor' in o:
        return MTensor([float(x) for x in o['tensor']], o['sekil'])
    if 'sozluk' in o:
        return {k: _kayit_coz(v) for k, v in o['sozluk']}
    if 'liste' in o:
        return [_kayit_coz(x) for x in o['liste']]
    if 'tamsayi' in o:
        return int(o['tamsayi'])
    return o['deger']


def _json_yaz(o):
    return json.dumps(o, ensure_ascii=False, separators=(',', ':'))


def _dosya_yaz(yol, icerik):
    try:
        with open(yol, 'w', encoding='utf-8') as f:
            f.write(icerik)
    except OSError as e:
        _hata(f"Dosya yazılamadı: {yol} ({e.strerror})")


def _dosya_oku(yol):
    try:
        with open(yol, encoding='utf-8') as f:
            return f.read()
    except OSError:
        _hata(f"Dosya okunamadı: {yol}")


# ======================================================================== tensör üyeleri
def _fnu(ad, f, oto=True):
    return YerelFonksiyon(ad, lambda y, a: f(*a), oto)


_TENSOR_UYE = {}


def _uye(adlar, f):
    for a in adlar:
        _TENSOR_UYE[katla(a)] = f


def _item(t):
    if t.n != 1:
        _hata(f"item yalnızca tek öğeli tensörde kullanılabilir ({t.n} öğe var)")
    return t.v[0]


def _squeeze(t, d=None):
    if d is None:
        return _yeniden(t, [x for x in t.s if x != 1])
    k = _boyut_coz(d, len(t.s))
    return _yeniden(t, [x for i, x in enumerate(t.s) if i != k]) if t.s[k] == 1 else t


def _flatten(t, a=0, b=-1):
    if not t.s:
        return _yeniden(t, [1])
    x, y = _boyut_coz(a, len(t.s)), _boyut_coz(b, len(t.s))
    return _yeniden(t, t.s[:x] + [_carpim(t.s[x:y + 1])] + t.s[y + 1:])


def _clamp(t, a=None, b=None):
    lo = -math.inf if a is None else _sayi(a)
    hi = math.inf if b is None else _sayi(b)
    return _tekli(t, lambda x: min(hi, max(lo, x)),
                  lambda x, y: 0.0 if (a is not None and x < lo) or (b is not None and x > hi) else 1.0)


def _maks(t, d=None, tut=False, buyuk=True):
    v, i = _uc_deger(t, d, _dogru(tut), buyuk)
    return v if d is None else [v, i]


_uye(['Şekil', 'shape'], lambda t: list(t.s))
_uye(['size'], lambda t: _fnu('size', lambda d=None: list(t.s) if d is None else t.s[_boyut_coz(d, len(t.s))]))
_uye(['BoyutSayısı', 'ndim', 'dim'], lambda t: len(t.s))
_uye(['ÖğeSayısı', 'numel'], lambda t: t.n)
_uye(['grad'], lambda t: None if t.grad is None else MTensor(list(t.grad), list(t.s)))
_uye(['GradGerekli', 'requires_grad'], lambda t: t.gerekli)
_uye(['Öğe', 'item'], lambda t: _fnu('item', lambda: _item(t)))
_uye(['Liste', 'tolist'], lambda t: _fnu('tolist', lambda: t.liste()))
_uye(['GeriYay', 'backward'], lambda t: _fnu('backward', lambda g=None: _geri_yay(t, g)))
_uye(['Ayır', 'detach'], lambda t: _fnu('detach', lambda: MTensor(list(t.v), list(t.s))))
_uye(['Kopya', 'clone'], lambda t: _fnu('clone', lambda: _yeni(list(t.v), list(t.s), (t,), lambda g: _biriktir(t, g))))
_uye(['GradGereksin', 'requires_grad_'], lambda t: _fnu('requires_grad_', lambda b=True: (setattr(t, 'gerekli', _dogru(b)), t)[1]))
_uye(['GradSıfırla', 'zero_grad'], lambda t: _fnu('zero_grad', lambda: setattr(t, 'grad', None)))
_uye(['Toplam', 'sum'], lambda t: _fnu('sum', lambda d=None, tut=False: _top_indir(t, _boyutlar(d, len(t.s)), _dogru(tut))))
_uye(['Ortalama', 'mean'], lambda t: _fnu('mean', lambda d=None, tut=False: _ortalama(t, d, _dogru(tut))))
_uye(['Varyans', 'var'], lambda t: _fnu('var', lambda d=None, duz=1, tut=False: _varyans(t, d, _sayi(duz), _dogru(tut))))
_uye(['Sapma', 'std'], lambda t: _fnu('std', lambda d=None, duz=1, tut=False: _tekli(
    _varyans(t, d, _sayi(duz), _dogru(tut)), _sqrt, lambda x, y: _bolme(0.5, y))))
_uye(['Maks', 'max'], lambda t: _fnu('max', lambda d=None, tut=False: _maks(t, d, tut, True)))
_uye(['Min', 'min'], lambda t: _fnu('min', lambda d=None, tut=False: _maks(t, d, tut, False)))
_uye(['ArgMaks', 'argmax'], lambda t: _fnu('argmax', lambda d=None, tut=False: _uc_deger(t, d, _dogru(tut), True)[1]))
_uye(['ArgMin', 'argmin'], lambda t: _fnu('argmin', lambda d=None, tut=False: _uc_deger(t, d, _dogru(tut), False)[1]))
_uye(['Üstel', 'exp'], lambda t: _fnu('exp', lambda: _tekli(t, _exp, lambda x, y: y)))
_uye(['Log', 'log'], lambda t: _fnu('log', lambda: _tekli(t, _log_guvenli, lambda x, y: _bolme(1.0, x))))
_uye(['Kök', 'sqrt'], lambda t: _fnu('sqrt', lambda: _tekli(t, _sqrt, lambda x, y: _bolme(0.5, y))))
_uye(['Mutlak', 'abs'], lambda t: _fnu('abs', lambda: _tekli(t, abs, _abs_turev)))
_uye(['Sin', 'sin'], lambda t: _fnu('sin', lambda: _tekli(t, math.sin, lambda x, y: math.cos(x))))
_uye(['Cos', 'cos'], lambda t: _fnu('cos', lambda: _tekli(t, math.cos, lambda x, y: -math.sin(x))))
_uye(['Tanh', 'tanh'], lambda t: _fnu('tanh', lambda: _tekli(t, math.tanh, lambda x, y: 1 - y * y)))
_uye(['Sigmoid', 'sigmoid'], lambda t: _fnu('sigmoid', lambda: _tekli(t, _sigmoid, lambda x, y: y * (1 - y))))
_uye(['ReLU', 'relu'], lambda t: _fnu('relu', lambda: _tekli(t, lambda x: x if x > 0 else 0.0, lambda x, y: 1.0 if x > 0 else 0.0)))
_uye(['Softmaks', 'softmax'], lambda t: _fnu('softmax', lambda d=-1: _softmaks(t, d, False)))
_uye(['LogSoftmaks', 'log_softmax'], lambda t: _fnu('log_softmax', lambda d=-1: _softmaks(t, d, True)))
_uye(['Üs', 'pow'], lambda t: _fnu('pow', lambda u: _usal(t, u), False))
_uye(['Yeniden', 'reshape', 'view'], lambda t: _fnu('reshape', lambda *a: _yeniden(t, _sekil_al(a)), False))
_uye(['T'], lambda t: _permute(t, [len(t.s) - 1 - i for i in range(len(t.s))]))
_uye(['Çevir', 'transpose'], lambda t: _fnu('transpose', lambda a, b: _transpoze(
    t, _boyut_coz(a, len(t.s)), _boyut_coz(b, len(t.s))), False))
_uye(['Diz', 'permute'], lambda t: _fnu('permute', lambda *a: _permute(
    t, [_boyut_coz(d, len(t.s)) for d in _sekil_al(a)]), False))
_uye(['BoyutEkle', 'unsqueeze'], lambda t: _fnu('unsqueeze', lambda d: _boyut_ekle(t, _boyut_coz(d, len(t.s) + 1)), False))
_uye(['BoyutSil', 'squeeze'], lambda t: _fnu('squeeze', lambda d=None: _squeeze(t, d)))
_uye(['Düzleştir', 'flatten'], lambda t: _fnu('flatten', lambda a=0, b=-1: _flatten(t, a, b)))
_uye(['Daralt', 'narrow'], lambda t: _fnu('narrow', lambda d, b, u: _daralt(t, d, b, u), False))
_uye(['DizinSeç', 'index_select'], lambda t: _fnu('index_select', lambda d, idx: _dizin_sec(
    t, _boyut_coz(d, len(t.s)), [int(x) for x in _tensore(idx).v]), False))
_uye(['MaskeleDoldur', 'masked_fill'], lambda t: _fnu('masked_fill', lambda m, v: _maske_doldur(t, m, _sayi(v)), False))
_uye(['Kırp', 'clamp'], lambda t: _fnu('clamp', lambda a=None, b=None: _clamp(t, a, b)))
_uye(['Büyüktür', 'gt'], lambda t: _fnu('gt', lambda o: _karsilastir(t, o, lambda x, y: x > y), False))
_uye(['Küçüktür', 'lt'], lambda t: _fnu('lt', lambda o: _karsilastir(t, o, lambda x, y: x < y), False))
_uye(['BüyükEşit', 'ge'], lambda t: _fnu('ge', lambda o: _karsilastir(t, o, lambda x, y: x >= y), False))
_uye(['KüçükEşit', 'le'], lambda t: _fnu('le', lambda o: _karsilastir(t, o, lambda x, y: x <= y), False))
_uye(['Eşittir', 'eq'], lambda t: _fnu('eq', lambda o: _karsilastir(t, o, lambda x, y: x == y), False))
_uye(['Değildir', 'ne'], lambda t: _fnu('ne', lambda o: _karsilastir(t, o, lambda x, y: x != y), False))
_uye(['MatÇarp', 'matmul'], lambda t: _fnu('matmul', lambda o: _mat_carp(t, o), False))


# ======================================================================== işleçler
def islem(op, a, b):
    """Yorumlayıcı, işlenenlerden biri Meşale tensörüyse buraya gelir."""
    if op == '+':
        return _topla(a, b)
    if op == '-':
        return _cikar(a, b)
    if op == '*':
        return _carp(a, b)
    if op == '/':
        return _bol(a, b)
    if op == '**':
        return _usal(a, b)
    if op == '@':
        return _mat_carp(a, b)
    _hata(f"'{op}' işlemi tensör için tanımlı değil")


# ======================================================================== birim
def mesale_modulu(y):
    U = {}

    def ekle(adlar, en_az, en_cok):
        def sar(f):
            def calis(y_, args):
                n = len(args)
                if n < en_az or n > en_cok:
                    beklenen = en_az if en_az == en_cok else f"{en_az}..{en_cok}"
                    _hata(f"'{adlar[0]}' {beklenen} argüman bekler, {n} verildi")
                return f(*args)
            g = YerelFonksiyon(adlar[0], calis, en_az == 0)
            for a in adlar:
                U[katla(a)] = g
            return f
        return sar

    def sekil_ve_grad(a):
        a = list(a)
        g = False
        if a and type(a[-1]) is bool:
            g = a.pop()
        return _sekil_al(a), g

    def dolu(s, x, g):
        return MTensor([x] * _carpim(s), s, g)

    @ekle(['Tensör', 'tensor'], 1, 2)
    def _(v, g=False):
        t = _tensore(v)
        return MTensor(list(t.v), list(t.s), _dogru(g))

    @ekle(['Sıfırlar', 'zeros'], 1, 9)
    def _(*a):
        s, g = sekil_ve_grad(a)
        return dolu(s, 0.0, g)

    @ekle(['Birler', 'ones'], 1, 9)
    def _(*a):
        s, g = sekil_ve_grad(a)
        return dolu(s, 1.0, g)

    @ekle(['Dolu', 'full'], 2, 3)
    def _(s, x, g=False):
        return dolu(_sekil_al([s]), _sayi(x), _dogru(g))

    @ekle(['SıfırlarGibi', 'zeros_like'], 1, 1)
    def _(t):
        return dolu(list(_tensore(t).s), 0.0, False)

    @ekle(['BirlerGibi', 'ones_like'], 1, 1)
    def _(t):
        return dolu(list(_tensore(t).s), 1.0, False)

    @ekle(['RastgeleNormal', 'randn'], 1, 9)
    def _(*a):
        s, g = sekil_ve_grad(a)
        return MTensor([_rng.gauss(0, 1) for _ in range(_carpim(s))], s, g)

    @ekle(['RastgeleDüzgün', 'rand'], 1, 9)
    def _(*a):
        s, g = sekil_ve_grad(a)
        return MTensor([_rng.random() for _ in range(_carpim(s))], s, g)

    @ekle(['RastgeleNormalGibi', 'randn_like'], 1, 1)
    def _(t):
        x = _tensore(t)
        return MTensor([_rng.gauss(0, 1) for _ in range(x.n)], list(x.s))

    @ekle(['RastgeleTamsayı', 'randint'], 3, 3)
    def _(a, b, s):
        sk = _sekil_al([s])
        return MTensor([float(_rng.randrange(_tam(a), _tam(b))) for _ in range(_carpim(sk))], sk)

    @ekle(['Karıştırılmış', 'randperm'], 1, 1)
    def _(n):
        p = list(range(_tam(n)))
        _rng.shuffle(p)
        return MTensor([float(x) for x in p], [len(p)])

    @ekle(['SayıDizisi', 'arange'], 1, 3)
    def _(a, b=None, c=1):
        bas = _sayi(a)
        son = bas if b is None else _sayi(b)
        if b is None:
            bas = 0.0
        adim = _sayi(c)
        if adim == 0:
            _hata('arange adımı sıfır olamaz')
        v = []
        i = 0
        while True:
            x = bas + i * adim
            if (x >= son) if adim > 0 else (x <= son):
                break
            v.append(x)
            i += 1
        return MTensor(v, [len(v)])

    @ekle(['EşitAralıklı', 'linspace'], 3, 3)
    def _(a, b, n):
        x, yy, k = _sayi(a), _sayi(b), _tam(n)
        return MTensor([x if k == 1 else x + (yy - x) * i / (k - 1) for i in range(k)], [k])

    @ekle(['BirimMatris', 'eye'], 1, 2)
    def _(n, m=None):
        r = _tam(n)
        c = r if m is None else _tam(m)
        v = [0.0] * (r * c)
        for i in range(min(r, c)):
            v[i * c + i] = 1.0
        return MTensor(v, [r, c])

    @ekle(['Tohum', 'manual_seed'], 1, 1)
    def _(n):
        _rng.seed(n)
        from . import yerlesik, yz
        yerlesik._rng.seed(n)
        yz._rng.seed(n)

    @ekle(['GradKapat', 'no_grad'], 0, 0)
    def _():
        _grad_acik[0] = False

    @ekle(['GradAç', 'enable_grad'], 0, 0)
    def _():
        _grad_acik[0] = True

    @ekle(['GradAyarla', 'set_grad_enabled'], 1, 1)
    def _(b):
        _grad_acik[0] = _dogru(b)

    @ekle(['GradAçıkMı', 'is_grad_enabled'], 0, 0)
    def _():
        return _grad_acik[0]

    @ekle(['TensörMü', 'is_tensor'], 1, 1)
    def _(x):
        return type(x) is MTensor

    ekle(['MatÇarp', 'matmul', 'mm'], 2, 2)(_mat_carp)
    ekle(['Bitiştir', 'cat'], 1, 2)(_bitistir)
    ekle(['Yığ', 'stack'], 1, 2)(_yigma)
    ekle(['Nerede', 'where'], 3, 3)(_nerede)

    @ekle(['AltÜçgen', 'tril'], 1, 2)
    def _(t, k=0):
        return _ucgen(t, k, True)

    @ekle(['ÜstÜçgen', 'triu'], 1, 2)
    def _(t, k=0):
        return _ucgen(t, k, False)

    @ekle(['relu'], 1, 1)
    def _(x):
        return _tekli(x, lambda v: v if v > 0 else 0.0, lambda v, yy: 1.0 if v > 0 else 0.0)

    @ekle(['sigmoid'], 1, 1)
    def _(x):
        return _tekli(x, _sigmoid, lambda v, yy: yy * (1 - yy))

    @ekle(['tanh'], 1, 1)
    def _(x):
        return _tekli(x, math.tanh, lambda v, yy: 1 - yy * yy)

    @ekle(['gelu'], 1, 1)
    def _(x):
        return _tekli(x, _gelu, lambda v, yy: _gelu_turev(v))

    @ekle(['SızıntılıReLU', 'leaky_relu'], 1, 2)
    def _(x, a=0.01):
        e = _sayi(a)
        return _tekli(x, lambda v: v if v > 0 else e * v, lambda v, yy: 1.0 if v > 0 else e)

    @ekle(['Softmaks', 'softmax'], 1, 2)
    def _(x, d=-1):
        return _softmaks(x, d, False)

    @ekle(['LogSoftmaks', 'log_softmax'], 1, 2)
    def _(x, d=-1):
        return _softmaks(x, d, True)

    @ekle(['exp'], 1, 1)
    def _(x):
        return _tekli(x, _exp, lambda v, yy: yy)

    @ekle(['log'], 1, 1)
    def _(x):
        return _tekli(x, _log_guvenli, lambda v, yy: _bolme(1.0, v))

    @ekle(['sqrt'], 1, 1)
    def _(x):
        return _tekli(x, _sqrt, lambda v, yy: _bolme(0.5, yy))

    @ekle(['sum'], 1, 3)
    def _(x, d=None, tut=False):
        t = _tensore(x)
        return _top_indir(t, _boyutlar(d, len(t.s)), _dogru(tut))

    @ekle(['mean'], 1, 3)
    def _(x, d=None, tut=False):
        return _ortalama(_tensore(x), d, _dogru(tut))

    ekle(['GömmeAl', 'embedding'], 2, 2)(_gomme)

    @ekle(['KatmanNorm', 'layer_norm'], 1, 4)
    def _(x, w=None, b=None, eps=1e-5):
        return _katman_norm(x, w, b, _sayi(eps))

    @ekle(['Bırakma', 'dropout'], 1, 3)
    def _(x, p=0.5, e=True):
        return _birakma(x, _sayi(p), _dogru(e))

    @ekle(['DoğrusalDönüşüm', 'linear'], 2, 3)
    def _(x, W, b=None):
        yy = _mat_carp(x, _permute(_tensore(W), [1, 0]))
        return yy if b is None else _topla(yy, b)

    # kayıplar
    @ekle(['OKHKaybı', 'mse_loss'], 2, 2)
    def _(a, b):
        f = _cikar(a, b)
        return _ortalama(_carp(f, f), None, False)

    @ekle(['OMHKaybı', 'l1_loss'], 2, 2)
    def _(a, b):
        return _ortalama(_tekli(_cikar(a, b), abs, _abs_turev), None, False)

    @ekle(['ÇaprazEntropi', 'cross_entropy'], 2, 3)
    def _(x, yy, yok=-100):
        return _capraz_entropi(x, yy, _tam(yok))

    ekle(['NLLKaybı', 'nll_loss'], 2, 2)(_nll_kaybi)

    @ekle(['İkiliÇaprazEntropi', 'binary_cross_entropy'], 2, 2)
    def _(p0, y0):
        p, yy = _tensore(p0), _tensore(y0)
        eps = 1e-12

        def kirp(v):
            return min(max(v, eps), 1 - eps)
        k = _tekli(p, lambda v: math.log(kirp(v)), lambda v, z: 1 / kirp(v))
        k2 = _tekli(p, lambda v: math.log(1 - kirp(v)), lambda v, z: -1 / (1 - kirp(v)))
        return _ortalama(_tekli(_topla(_carp(yy, k), _carp(_cikar(1, yy), k2)), lambda v: -v, lambda v, z: -1.0), None, False)

    @ekle(['İkiliÇaprazEntropiLogit', 'binary_cross_entropy_with_logits'], 2, 2)
    def _(z0, y0):
        z = _tensore(z0)
        yy = _yay(_tensore(y0), z.s)
        out = [max(x, 0) - x * yy[i] + math.log(1 + math.exp(-abs(x))) for i, x in enumerate(z.v)]
        top = 0.0
        for x in out:
            top += x

        def geri(g):
            _biriktir(z, [g[0] * (_sigmoid(z.v[i]) - yy[i]) / z.n for i in range(z.n)])
        return _yeni([top / z.n], [], (z,), geri)

    # optimizasyon
    @ekle(['SGD'], 2, 4)
    def _(p, oran, mom=0, az=0):
        return _SGD(p, _sayi(oran), _sayi(mom), _sayi(az))

    @ekle(['Adam'], 1, 5)
    def _(p, oran=0.001, b=None, eps=1e-8, az=0):
        bb = [0.9, 0.999] if b is None else [_sayi(x) for x in _yinele(b)]
        return _Adam(p, _sayi(oran), bb[0], bb[1], _sayi(eps), _sayi(az), False, 'Adam')

    @ekle(['AdamW'], 1, 5)
    def _(p, oran=0.001, b=None, eps=1e-8, az=0.01):
        bb = [0.9, 0.999] if b is None else [_sayi(x) for x in _yinele(b)]
        return _Adam(p, _sayi(oran), bb[0], bb[1], _sayi(eps), _sayi(az), True, 'AdamW')

    @ekle(['GradNormKırp', 'clip_grad_norm_'], 2, 2)
    def _(p, en_cok):
        ps = [x for x in _yinele(p) if type(x) is MTensor and x.grad]
        top = 0.0
        for t in ps:
            for g in t.grad:
                top += g * g
        norm = math.sqrt(top)
        m = _sayi(en_cok)
        if norm > m:
            o = m / (norm + 1e-6)
            for t in ps:
                for i in range(len(t.grad)):
                    t.grad[i] *= o
        return norm

    # veri
    @ekle(['TensörVeriKümesi', 'TensorDataset'], 1, 9)
    def _(*ts):
        return _VeriKumesi([_tensore(x) for x in ts])

    @ekle(['VeriYükleyici', 'DataLoader'], 1, 4)
    def _(k, yg=1, kar=False, son=False):
        if type(k) is not _VeriKumesi:
            _hata('VeriYükleyici bir TensörVeriKümesi bekler')
        return _VeriYukleyici(k, _tam(yg, 'Yığın boyu'), _dogru(kar), _dogru(son))

    # kaydet / yükle
    @ekle(['Kaydet', 'save'], 2, 2)
    def _(o, yol):
        _dosya_yaz(y.metne(yol), _json_yaz(_kayit_yap(o, y)))

    @ekle(['Yükle', 'load'], 1, 1)
    def _(yol):
        return _kayit_coz(json.loads(_dosya_oku(y.metne(yol))))

    # Sinir biriminin kullandığı yansıma yardımcıları
    @ekle(['Alanlar'], 1, 1)
    def _(o):
        if type(o) is not KNesne:
            _hata('Alanlar bir nesne bekler')
        zincir = []
        s = o.sinif
        while s is not None:
            zincir.append(s)
            s = s.ebeveyn
        hamlar = {}
        for s in zincir:
            for a in s.alanlar:
                hamlar.setdefault(a[0], a[1])
        return {hamlar.get(k, k): v for k, v in o.alanlar.items()}

    @ekle(['VeriKopyala'], 2, 2)
    def _(hedef, kaynak):
        h, k = _tensore(hedef), _tensore(kaynak)
        if h.s != k.s:
            _hata(f"Şekiller uyuşmuyor: {_sekil_yaz(h.s)} ve {_sekil_yaz(k.s)}")
        h.v[:] = k.v
    return U
