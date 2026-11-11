"""YZ birimi: otomatik türevli tensörler, sinir ağı katmanları, kayıp fonksiyonları
ve optimizasyon algoritmaları. Saf Python ile yazılmıştır (dış bağımlılık yok).

Tensörler 0, 1 veya 2 boyutludur. Veriler düz bir listede satır öncelikli tutulur.
Her işlem, ebeveynlerinden en az biri gradyan gerektiriyorsa hesaplama grafiğine
eklenir; `GeriYay` çağrısı grafiği ters topolojik sırada dolaşarak gradyanları biriktirir.
"""
import math
import random
from operator import mul

from .hatalar import YontemHatasi
from .sozcuk import katla
from .degerler import YerelFonksiyon, KNesne, KFonksiyon, BagliMetod, PascalDizi

_rng = random.Random()


def _2d(s):
    if len(s) == 0:
        return 1, 1
    if len(s) == 1:
        return 1, s[0]
    return s[0], s[1]


def _f(v):
    t = type(v)
    if t is float:
        return v
    if t is int or t is bool:
        return float(v)
    if t is Tensor and len(v.veri) == 1:
        return v.veri[0]
    raise YontemHatasi(f"Tensör öğesi sayı olmalı, {t.__name__} verildi")


def _biriktir(p, g):
    if not p.gerekli:
        return
    if p.grad is None:
        p.grad = list(g)
    else:
        p.grad = [a + b for a, b in zip(p.grad, g)]


def _yeni(veri, sekil, ebeveyn, geri):
    t = Tensor(veri, sekil)
    for p in ebeveyn:
        if p.gerekli:
            t.gerekli = True
            t._ebeveyn = ebeveyn
            t._geri = geri
            break
    return t


def _mm(A, n, k, B, m):
    cols = [B[j::m] for j in range(m)]
    out = []
    ext = out.extend
    for i in range(n):
        row = A[i * k:(i + 1) * k]
        ext([sum(map(mul, row, col)) for col in cols])
    return out


def _T(A, n, m):
    return [A[i * m + j] for j in range(m) for i in range(n)]


def _guvenli_us(x):
    return math.exp(x if x < 709.0 else 709.0)


def _sigmoid(x):
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    e = math.exp(x)
    return e / (1.0 + e)


class Tensor:
    __slots__ = ('veri', 'sekil', 'grad', '_ebeveyn', '_geri', 'gerekli')
    TUR_ADI = 'tensör'

    def __init__(self, veri, sekil, gerekli=False):
        self.veri = veri
        self.sekil = tuple(sekil)
        self.grad = None
        self._ebeveyn = ()
        self._geri = None
        self.gerekli = gerekli

    # ------------------------------------------------------------ oluşturma
    @staticmethod
    def yap(x, gerekli=False):
        if type(x) is Tensor:
            return x
        if type(x) in (int, float, bool):
            return Tensor([float(x)], (), gerekli)
        if type(x) is PascalDizi:
            x = x.veri
        if type(x) is list:
            if not x:
                return Tensor([], (0,), gerekli)
            if type(x[0]) in (list, PascalDizi) or (type(x[0]) is Tensor and x[0].sekil):
                satirlar = [r.veri if type(r) is PascalDizi else (r.veri if type(r) is Tensor else r) for r in x]
                c = len(satirlar[0])
                veri = []
                for r in satirlar:
                    if type(r) is not list or len(r) != c:
                        raise YontemHatasi("Düzensiz matris: tüm satırlar aynı uzunlukta olmalı")
                    veri.extend(_f(v) for v in r)
                return Tensor(veri, (len(satirlar), c), gerekli)
            return Tensor([_f(v) for v in x], (len(x),), gerekli)
        raise YontemHatasi(f"Tensöre çevrilemez: {type(x).__name__}")

    def liste(self):
        if len(self.sekil) == 0:
            return self.veri[0]
        if len(self.sekil) == 1:
            return list(self.veri)
        r, c = self.sekil
        return [self.veri[i * c:(i + 1) * c] for i in range(r)]

    def ogeler(self):
        if len(self.sekil) == 2:
            r, c = self.sekil
            return [Tensor(self.veri[i * c:(i + 1) * c], (c,)) for i in range(r)]
        return list(self.veri)

    def ayir(self):
        return Tensor(list(self.veri), self.sekil)

    # ------------------------------------------------------------ geri yayılım
    def geri_yay(self):
        sira, gor = [], set()
        yigin = [(self, False)]
        while yigin:
            t, bitti = yigin.pop()
            if bitti:
                sira.append(t)
                continue
            if id(t) in gor:
                continue
            gor.add(id(t))
            yigin.append((t, True))
            for p in t._ebeveyn:
                if id(p) not in gor:
                    yigin.append((p, False))
        self.grad = [1.0] * len(self.veri)
        for t in reversed(sira):
            if t._geri is not None and t.grad is not None:
                t._geri(t.grad)

    # ------------------------------------------------------------ işlemler
    def __add__(self, o):
        return _ikili(self, o, '+')

    def __radd__(self, o):
        return _ikili(o, self, '+')

    def __sub__(self, o):
        return _ikili(self, o, '-')

    def __rsub__(self, o):
        return _ikili(o, self, '-')

    def __mul__(self, o):
        return _ikili(self, o, '*')

    def __rmul__(self, o):
        return _ikili(o, self, '*')

    def __truediv__(self, o):
        return _ikili(self, o, '/')

    def __rtruediv__(self, o):
        return _ikili(o, self, '/')

    def __neg__(self):
        return _tekli(self, lambda x: -x, lambda x, y: -1.0)

    def __pow__(self, p):
        if type(p) not in (int, float):
            raise YontemHatasi("Tensör üssü sayı olmalı")
        p = float(p)
        return _tekli(self, lambda x: x ** p, lambda x, y: p * x ** (p - 1) if x != 0 or p >= 1 else 0.0)

    def __matmul__(self, o):
        return matmul(self, o)

    def __rmatmul__(self, o):
        return matmul(o, self)

    def us(self):
        return _tekli(self, _guvenli_us, lambda x, y: y)

    def log(self):
        def f(x):
            if x <= 0:
                raise YontemHatasi("Log: pozitif olmayan değer")
            return math.log(x)
        return _tekli(self, f, lambda x, y: 1.0 / x)

    def relu(self):
        return _tekli(self, lambda x: x if x > 0 else 0.0, lambda x, y: 1.0 if x > 0 else 0.0)

    def sizintili_relu(self, a=0.01):
        return _tekli(self, lambda x: x if x > 0 else a * x, lambda x, y: 1.0 if x > 0 else a)

    def sigmoid(self):
        return _tekli(self, _sigmoid, lambda x, y: y * (1.0 - y))

    def tanh(self):
        return _tekli(self, math.tanh, lambda x, y: 1.0 - y * y)

    def sin(self):
        return _tekli(self, math.sin, lambda x, y: math.cos(x))

    def cos(self):
        return _tekli(self, math.cos, lambda x, y: -math.sin(x))

    def kok(self):
        return _tekli(self, lambda x: math.sqrt(max(x, 0.0)), lambda x, y: 0.5 / y if y > 0 else 0.0)

    def mutlak(self):
        return _tekli(self, abs, lambda x, y: 1.0 if x > 0 else (-1.0 if x < 0 else 0.0))

    def toplam(self, eksen=None):
        R, C = _2d(self.sekil)
        a = self
        if eksen is None or len(self.sekil) < 2:
            n = len(a.veri)

            def geri(g):
                _biriktir(a, [g[0]] * n)
            return _yeni([sum(a.veri)], (), (a,), geri)
        if eksen == 0:
            out = [sum(a.veri[r * C + c] for r in range(R)) for c in range(C)]

            def geri(g):
                _biriktir(a, [g[c] for r in range(R) for c in range(C)])
            return _yeni(out, (C,), (a,), geri)
        if eksen == 1:
            out = [sum(a.veri[r * C:(r + 1) * C]) for r in range(R)]

            def geri(g):
                _biriktir(a, [g[r] for r in range(R) for c in range(C)])
            return _yeni(out, (R,), (a,), geri)
        raise YontemHatasi("Eksen 0 veya 1 olmalı")

    def ortalama(self, eksen=None):
        R, C = _2d(self.sekil)
        if eksen is None or len(self.sekil) < 2:
            n = len(self.veri)
        else:
            n = R if eksen == 0 else C
        if n == 0:
            raise YontemHatasi("Boş tensörün ortalaması alınamaz")
        return self.toplam(eksen) / float(n)

    def softmaks(self):
        R, C = _2d(self.sekil)
        a = self
        out = []
        for r in range(R):
            row = a.veri[r * C:(r + 1) * C]
            m = max(row)
            e = [math.exp(x - m) for x in row]
            s = sum(e)
            out.extend(x / s for x in e)

        def geri(g):
            ga = []
            for r in range(R):
                yv = out[r * C:(r + 1) * C]
                gg = g[r * C:(r + 1) * C]
                d = sum(p * q for p, q in zip(yv, gg))
                ga.extend(yy * (gi - d) for yy, gi in zip(yv, gg))
            _biriktir(a, ga)
        return _yeni(out, a.sekil, (a,), geri)

    def transpoze(self):
        a = self
        if len(a.sekil) < 2:
            return a
        R, C = a.sekil

        def geri(g):
            _biriktir(a, _T(g, C, R))
        return _yeni(_T(a.veri, R, C), (C, R), (a,), geri)

    def yeniden(self, *sekil):
        sekil = tuple(int(s) for s in sekil)
        n = 1
        for s in sekil:
            n *= s
        if n != len(self.veri) or len(sekil) > 2:
            raise YontemHatasi(f"Yeniden şekillendirme olanaksız: {len(self.veri)} öğe -> {sekil}")
        a = self

        def geri(g):
            _biriktir(a, g)
        return _yeni(list(a.veri), sekil, (a,), geri)

    def argmaks(self):
        R, C = _2d(self.sekil)
        if len(self.sekil) < 2:
            v = self.veri
            return max(range(len(v)), key=v.__getitem__)
        return [max(range(C), key=lambda c, r=r: self.veri[r * C + c]) for r in range(R)]

    # ------------------------------------------------------------ dizinleme
    def indeks_al(self, idx):
        s = self.sekil
        if len(s) == 1 and len(idx) == 1:
            i = idx[0]
            if not -s[0] <= i < s[0]:
                raise YontemHatasi(f"Tensör dizini sınır dışı: {i}")
            return self.veri[i]
        if len(s) == 2:
            R, C = s
            if len(idx) == 1:
                i = idx[0]
                if not 0 <= i < R:
                    raise YontemHatasi(f"Tensör satır dizini sınır dışı: {i}")
                return Tensor(self.veri[i * C:(i + 1) * C], (C,))
            if len(idx) == 2:
                i, j = idx
                if not (0 <= i < R and 0 <= j < C):
                    raise YontemHatasi(f"Tensör dizini sınır dışı: [{i}, {j}]")
                return self.veri[i * C + j]
        raise YontemHatasi("Geçersiz tensör dizini")

    def indeks_ata(self, idx, v):
        s = self.sekil
        if len(s) == 1 and len(idx) == 1:
            self.veri[idx[0]] = _f(v)
        elif len(s) == 2 and len(idx) == 2:
            self.veri[idx[0] * s[1] + idx[1]] = _f(v)
        else:
            raise YontemHatasi("Geçersiz tensör dizini")

    # ------------------------------------------------------------ Yöntem üyeleri
    def k_al(self, ad, y):
        if ad == 'sekil':
            return list(self.sekil)
        if ad == 'veri':
            return self.liste()
        if ad == 'grad':
            return None if self.grad is None else Tensor(list(self.grad), self.sekil)
        if ad == 't':
            return self.transpoze()
        if ad == 'boyut':
            return len(self.veri)
        if ad == 'gradgerekli':
            return self.gerekli
        f = _TENSOR_METOD.get(ad)
        if f is not None:
            return f(self)
        raise YontemHatasi(f"Tensörde '{ad}' üyesi yok")

    def k_ata(self, ad, v, y):
        if ad == 'gradgerekli':
            self.gerekli = bool(v)
            return
        raise YontemHatasi(f"Tensörün '{ad}' üyesine atama yapılamaz")

    def __str__(self):
        def b(x):
            return f"{x:.4f}".rstrip('0').rstrip('.') if x == x else 'TS'
        if len(self.sekil) == 0:
            return f"tensör({b(self.veri[0])})"
        if len(self.sekil) == 1:
            return 'tensör([' + ', '.join(b(x) for x in self.veri) + '])'
        R, C = self.sekil
        satirlar = ['[' + ', '.join(b(x) for x in self.veri[r * C:(r + 1) * C]) + ']' for r in range(R)]
        return 'tensör([' + (',\n        '.join(satirlar)) + '])'


def _ikili(a, b, op):
    a = Tensor.yap(a)
    b = Tensor.yap(b)
    ar, ac = _2d(a.sekil)
    br, bc = _2d(b.sekil)
    if ar == br:
        R = ar
    elif ar == 1:
        R = br
    elif br == 1:
        R = ar
    else:
        raise YontemHatasi(f"Tensör şekilleri uyumsuz: {list(a.sekil)} ve {list(b.sekil)}")
    if ac == bc:
        C = ac
    elif ac == 1:
        C = bc
    elif bc == 1:
        C = ac
    else:
        raise YontemHatasi(f"Tensör şekilleri uyumsuz: {list(a.sekil)} ve {list(b.sekil)}")
    nd = max(len(a.sekil), len(b.sekil))
    if nd == 0:
        sekil = ()
    elif nd == 1:
        sekil = (C,) if R == 1 else (R, C)
    else:
        sekil = (R, C)
    av, bv = a.veri, b.veri
    if a.sekil == b.sekil:
        ia = ib = None
        ax, bx = av, bv
    else:
        ia = [(r if ar > 1 else 0) * ac + (c if ac > 1 else 0) for r in range(R) for c in range(C)]
        ib = [(r if br > 1 else 0) * bc + (c if bc > 1 else 0) for r in range(R) for c in range(C)]
        ax = [av[i] for i in ia]
        bx = [bv[j] for j in ib]
    if op == '+':
        out = [x + y for x, y in zip(ax, bx)]
    elif op == '-':
        out = [x - y for x, y in zip(ax, bx)]
    elif op == '*':
        out = [x * y for x, y in zip(ax, bx)]
    else:
        if 0.0 in bx:
            raise YontemHatasi("Tensör bölmesinde sıfıra bölme")
        out = [x / y for x, y in zip(ax, bx)]

    def geri(g):
        if op == '+':
            ga, gb = g, g
        elif op == '-':
            ga, gb = g, [-x for x in g]
        elif op == '*':
            ga = [x * y for x, y in zip(g, bx)]
            gb = [x * y for x, y in zip(g, ax)]
        else:
            ga = [x / y for x, y in zip(g, bx)]
            gb = [-x * p / (q * q) for x, p, q in zip(g, ax, bx)]
        if a.gerekli:
            _biriktir(a, _indir(ga, ia, len(av)))
        if b.gerekli:
            _biriktir(b, _indir(gb, ib, len(bv)))
    return _yeni(out, sekil, (a, b), geri)


def _indir(g, idx, n):
    if idx is None:
        return g
    r = [0.0] * n
    for k, i in enumerate(idx):
        r[i] += g[k]
    return r


def _tekli(a, f, df):
    out = [f(x) for x in a.veri]

    def geri(g):
        _biriktir(a, [gi * df(x, y) for gi, x, y in zip(g, a.veri, out)])
    return _yeni(out, a.sekil, (a,), geri)


def matmul(a, b):
    a = Tensor.yap(a)
    b = Tensor.yap(b)
    if len(a.sekil) == 0 or len(b.sekil) == 0:
        return _ikili(a, b, '*')
    a1, b1 = len(a.sekil) == 1, len(b.sekil) == 1
    n, k = (1, a.sekil[0]) if a1 else a.sekil
    k2, m = (b.sekil[0], 1) if b1 else b.sekil
    if k != k2:
        raise YontemHatasi(f"Matris çarpımı için şekiller uyumsuz: {list(a.sekil)} @ {list(b.sekil)}")
    out = _mm(a.veri, n, k, b.veri, m)
    if a1 and b1:
        sekil = ()
    elif a1:
        sekil = (m,)
    elif b1:
        sekil = (n,)
    else:
        sekil = (n, m)

    def geri(g):
        if a.gerekli:
            _biriktir(a, _mm(g, n, m, _T(b.veri, k, m), k))
        if b.gerekli:
            _biriktir(b, _mm(_T(a.veri, n, k), k, n, g, m))
    return _yeni(out, sekil, (a, b), geri)


# ======================================================================== kayıplar
def okh(p, y):
    """Ortalama kare hata."""
    d = Tensor.yap(p) - Tensor.yap(y)
    return (d * d).ortalama()


def omh(p, y):
    """Ortalama mutlak hata."""
    return (Tensor.yap(p) - Tensor.yap(y)).mutlak().ortalama()


def ikili_capraz_entropi(p, y):
    p = Tensor.yap(p)
    y = Tensor.yap(y)
    if len(p.veri) != len(y.veri):
        raise YontemHatasi("İkiliÇaprazEntropi: tahmin ve hedef aynı boyutta olmalı")
    eps = 1e-7
    n = len(p.veri)
    pv = [min(max(x, eps), 1 - eps) for x in p.veri]
    yv = y.veri
    kayip = -sum(t * math.log(q) + (1 - t) * math.log(1 - q) for q, t in zip(pv, yv)) / n

    def geri(g):
        _biriktir(p, [g[0] * (q - t) / (q * (1 - q)) / n for q, t in zip(pv, yv)])
    return _yeni([kayip], (), (p,), geri)


def capraz_entropi(logit, hedef):
    """Softmaks + çapraz entropi (sayısal olarak kararlı). Hedef: sınıf
    dizinleri listesi ya da bir-sıcak (one-hot) matris."""
    logit = Tensor.yap(logit)
    R, C = _2d(logit.sekil)
    if type(hedef) is list and hedef and type(hedef[0]) is int:
        if len(hedef) != R:
            raise YontemHatasi("ÇaprazEntropi: etiket sayısı satır sayısına eşit olmalı")
        t = [0.0] * (R * C)
        for r, c in enumerate(hedef):
            t[r * C + c] = 1.0
    else:
        t = Tensor.yap(hedef).veri
        if len(t) != R * C:
            raise YontemHatasi("ÇaprazEntropi: hedef şekli uyumsuz")
    p = []
    kayip = 0.0
    for r in range(R):
        row = logit.veri[r * C:(r + 1) * C]
        m = max(row)
        e = [math.exp(x - m) for x in row]
        s = sum(e)
        ls = math.log(s)
        for c in range(C):
            p.append(e[c] / s)
            if t[r * C + c]:
                kayip -= t[r * C + c] * (row[c] - m - ls)
    kayip /= R

    def geri(g):
        _biriktir(logit, [g[0] * (pi - ti) / R for pi, ti in zip(p, t)])
    return _yeni([kayip], (), (logit,), geri)


KAYIPLAR = {'okh': okh, 'mse': okh, 'omh': omh, 'mae': omh,
            'ikilicaprazentropi': ikili_capraz_entropi, 'bce': ikili_capraz_entropi,
            'caprazentropi': capraz_entropi, 'ce': capraz_entropi}


def aktive(t, ad):
    if not ad or ad in ('dogrusal', 'yok'):
        return t
    if ad == 'relu':
        return t.relu()
    if ad == 'sizintilirelu':
        return t.sizintili_relu()
    if ad == 'sigmoid':
        return t.sigmoid()
    if ad == 'tanh':
        return t.tanh()
    if ad == 'softmaks':
        return t.softmaks()
    raise YontemHatasi(f"Bilinmeyen aktivasyon: '{ad}' (relu, sızıntılıRelu, sigmoid, tanh, softmaks)")


# ======================================================================== katmanlar
def _yf(ad, f, oto=False):
    return YerelFonksiyon(ad, lambda y, a: f(*a), oto)


class Yogun:
    TUR_ADI = 'Yoğun'

    def __init__(self, girdi, cikti, akt=''):
        self.akt = katla(akt)
        olcek = math.sqrt(2.0 / girdi) if self.akt in ('relu', 'sizintilirelu') else math.sqrt(1.0 / girdi)
        self.W = Tensor([_rng.gauss(0.0, olcek) for _ in range(girdi * cikti)], (girdi, cikti), True)
        self.b = Tensor([0.0] * cikti, (cikti,), True)

    def ileri(self, x):
        return aktive(matmul(x, self.W) + self.b, self.akt)

    def parametreler(self):
        return [self.W, self.b]

    def k_al(self, ad, y):
        if ad == 'ileri':
            return _yf('İleri', self.ileri)
        if ad == 'parametreler':
            return _yf('Parametreler', self.parametreler, True)
        if ad == 'agirlik':
            return self.W
        if ad == 'sapma':
            return self.b
        raise YontemHatasi(f"Yoğun katmanda '{ad}' üyesi yok")

    def __str__(self):
        g, c = self.W.sekil
        return f"Yoğun({g} -> {c}{', ' + self.akt if self.akt else ''})"


class Ardisik:
    TUR_ADI = 'Ardışık'

    def __init__(self, y, katmanlar):
        self.y = y
        self.katmanlar = list(katmanlar)

    def ileri(self, x):
        y = self.y
        x = Tensor.yap(x)
        for k in self.katmanlar:
            if type(k) is str:
                x = aktive(x, katla(k))
            elif hasattr(k, 'ileri'):
                x = k.ileri(x)
            elif type(k) is KNesne:
                x = y.metod_cagir(k, 'ileri', [x])
            else:
                x = y.cagir(k, [x])
        return x

    def parametreler(self):
        out = []
        for k in self.katmanlar:
            if hasattr(k, 'parametreler'):
                out.extend(k.parametreler())
            elif type(k) is KNesne and k.sinif.metod_bul('parametreler'):
                out.extend(self.y.metod_cagir(k, 'parametreler', []))
        return out

    def k_al(self, ad, y):
        if ad == 'ileri':
            return _yf('İleri', self.ileri)
        if ad == 'tahmin':
            return _yf('Tahmin', lambda x: self.ileri(x).ayir())
        if ad == 'parametreler':
            return _yf('Parametreler', self.parametreler, True)
        if ad == 'ekle':
            return _yf('Ekle', self.katmanlar.append)
        if ad == 'katmanlar':
            return list(self.katmanlar)
        if ad == 'parametresayisi':
            return sum(len(p.veri) for p in self.parametreler())
        raise YontemHatasi(f"Ardışık modelde '{ad}' üyesi yok")

    def __str__(self):
        return 'Ardışık[' + ', '.join(self.y.metne(k) if type(k) is not str else k for k in self.katmanlar) + ']'


# ======================================================================== optimizasyon
class SGD:
    TUR_ADI = 'SGD'

    def __init__(self, params, oran=0.01, momentum=0.0):
        self.params = _param_listesi(params)
        self.oran = float(oran)
        self.momentum = float(momentum)
        self.hiz = [None] * len(self.params)

    def adim(self):
        lr, mom = self.oran, self.momentum
        for i, p in enumerate(self.params):
            if p.grad is None:
                continue
            g = p.grad
            if mom:
                v = self.hiz[i] or [0.0] * len(g)
                v = [mom * a + b for a, b in zip(v, g)]
                self.hiz[i] = v
                g = v
            p.veri = [w - lr * d for w, d in zip(p.veri, g)]

    def sifirla(self):
        for p in self.params:
            p.grad = None

    def k_al(self, ad, y):
        if ad == 'adim':
            return _yf('Adım', self.adim, True)
        if ad == 'sifirlagrad':
            return _yf('SıfırlaGrad', self.sifirla, True)
        if ad == 'oran':
            return self.oran
        raise YontemHatasi(f"Optimizasyon nesnesinde '{ad}' üyesi yok")

    def k_ata(self, ad, v, y):
        if ad == 'oran':
            self.oran = float(v)
            return
        raise YontemHatasi(f"'{ad}' atanamaz")


class Adam(SGD):
    TUR_ADI = 'Adam'

    def __init__(self, params, oran=0.001, b1=0.9, b2=0.999, eps=1e-8):
        super().__init__(params, oran)
        self.b1, self.b2, self.eps = b1, b2, eps
        self.m = [None] * len(self.params)
        self.v = [None] * len(self.params)
        self.t = 0

    def adim(self):
        self.t += 1
        b1, b2, eps, lr = self.b1, self.b2, self.eps, self.oran
        d1 = 1 - b1 ** self.t
        d2 = 1 - b2 ** self.t
        for i, p in enumerate(self.params):
            if p.grad is None:
                continue
            g = p.grad
            m = self.m[i] or [0.0] * len(g)
            v = self.v[i] or [0.0] * len(g)
            m = [b1 * a + (1 - b1) * x for a, x in zip(m, g)]
            v = [b2 * a + (1 - b2) * x * x for a, x in zip(v, g)]
            self.m[i], self.v[i] = m, v
            p.veri = [w - lr * (mi / d1) / (math.sqrt(vi / d2) + eps)
                      for w, mi, vi in zip(p.veri, m, v)]


def _param_listesi(params):
    if hasattr(params, 'parametreler'):
        params = params.parametreler()
    out = []
    for p in params:
        if type(p) is not Tensor:
            raise YontemHatasi("Optimizasyon parametreleri tensör olmalı")
        out.append(p)
    return out


# ======================================================================== tensör metod tablosu
def _tm(ad, f, oto=True):
    return lambda t: YerelFonksiyon(ad, lambda y, a: f(t, *a), oto)


_TENSOR_METOD = {
    'deger': lambda t: YerelFonksiyon('Değer', lambda y, a: _deger(t), True),
    'geriyay': _tm('GeriYay', lambda t: t.geri_yay()),
    'toplam': _tm('Toplam', lambda t, e=None: t.toplam(e)),
    'ortalama': _tm('Ortalama', lambda t, e=None: t.ortalama(e)),
    'maks': _tm('Maks', lambda t: max(t.veri)),
    'min': _tm('Min', lambda t: min(t.veri)),
    'argmaks': _tm('ArgMaks', lambda t: t.argmaks()),
    'us': _tm('Üs', lambda t: t.us()),
    'log': _tm('Log', lambda t: t.log()),
    'relu': _tm('ReLU', lambda t: t.relu()),
    'sigmoid': _tm('Sigmoid', lambda t: t.sigmoid()),
    'tanh': _tm('Tanh', lambda t: t.tanh()),
    'softmaks': _tm('Softmaks', lambda t: t.softmaks()),
    'sin': _tm('Sin', lambda t: t.sin()),
    'cos': _tm('Cos', lambda t: t.cos()),
    'kok': _tm('Kök', lambda t: t.kok()),
    'mutlak': _tm('Mutlak', lambda t: t.mutlak()),
    'yeniden': _tm('Yeniden', lambda t, *s: t.yeniden(*s), False),
    'sifirlagrad': _tm('SıfırlaGrad', lambda t: setattr(t, 'grad', None)),
    'ayir': _tm('Ayır', lambda t: t.ayir()),
    'kopya': _tm('Kopya', lambda t: t.ayir()),
    'liste': _tm('Liste', lambda t: t.liste()),
    'satir': _tm('Satır', lambda t, i: t.indeks_al([i]), False),
}


def _deger(t):
    if len(t.veri) != 1:
        raise YontemHatasi("Değer yalnızca tek öğeli tensörler için kullanılabilir")
    return t.veri[0]


# ======================================================================== YZ birimi
def yz_modulu(y):
    U = {}

    def ekle(ad, en_az=0, en_cok=None, oto=False):
        def sar(f):
            def calis(y_, args):
                n = len(args)
                if n < en_az or (en_cok is not None and n > en_cok):
                    raise YontemHatasi(f"'{ad}' {en_az}..{en_cok} argüman bekler, {n} verildi")
                return f(*args)
            U[katla(ad)] = YerelFonksiyon(ad, calis, oto)
            return f
        return sar

    @ekle('Tensör', 1, 2)
    def _tensor(veri, gerekli=False):
        t = Tensor.yap(veri)
        if t is veri:
            t = t.ayir()
        t.gerekli = bool(gerekli)
        return t

    def _sekil(r, c):
        return (int(r),) if c is None else (int(r), int(c))

    @ekle('Sıfırlar', 1, 3)
    def _sifirlar(r, c=None, gerekli=False):
        s = _sekil(r, c)
        n = s[0] * (s[1] if len(s) > 1 else 1)
        return Tensor([0.0] * n, s, bool(gerekli))

    @ekle('Birler', 1, 3)
    def _birler(r, c=None, gerekli=False):
        s = _sekil(r, c)
        n = s[0] * (s[1] if len(s) > 1 else 1)
        return Tensor([1.0] * n, s, bool(gerekli))

    @ekle('RastgeleTensör', 1, 4)
    def _rastgele(r, c=None, olcek=1.0, gerekli=False):
        s = _sekil(r, c)
        n = s[0] * (s[1] if len(s) > 1 else 1)
        return Tensor([_rng.gauss(0.0, olcek) for _ in range(n)], s, bool(gerekli))

    @ekle('Tohum', 1, 1)
    def _tohum(n):
        _rng.seed(n)
        from . import yerlesik, mesale
        yerlesik._rng.seed(n)
        mesale._rng.seed(n)

    @ekle('ReLU', 1, 1)
    def _relu(x):
        return Tensor.yap(x).relu()

    @ekle('Sigmoid', 1, 1)
    def _sig(x):
        return Tensor.yap(x).sigmoid()

    @ekle('Tanh', 1, 1)
    def _tanh(x):
        return Tensor.yap(x).tanh()

    @ekle('Softmaks', 1, 1)
    def _softmaks(x):
        return Tensor.yap(x).softmaks()

    @ekle('Üstel', 1, 1)
    def _us(x):
        return Tensor.yap(x).us()

    @ekle('Log', 1, 1)
    def _log(x):
        return Tensor.yap(x).log()

    @ekle('MatÇarp', 2, 2)
    def _mat(a, b):
        return matmul(a, b)

    @ekle('OKH', 2, 2)
    def _okh(p, h):
        return okh(p, h)

    @ekle('OMH', 2, 2)
    def _omh(p, h):
        return omh(p, h)

    @ekle('İkiliÇaprazEntropi', 2, 2)
    def _bce(p, h):
        return ikili_capraz_entropi(p, h)

    @ekle('ÇaprazEntropi', 2, 2)
    def _ce(p, h):
        return capraz_entropi(p, h)

    @ekle('Yoğun', 2, 3)
    def _yogun(g, c, akt=''):
        return Yogun(int(g), int(c), akt)

    @ekle('Ardışık', 0, 1)
    def _ardisik(katmanlar=None):
        return Ardisik(y, katmanlar or [])

    @ekle('SGD', 1, 3)
    def _sgd(params, oran=0.01, momentum=0.0):
        return SGD(params, oran, momentum)

    @ekle('Adam', 1, 2)
    def _adam(params, oran=0.001):
        return Adam(params, oran)

    @ekle('BirSıcak', 2, 2)
    def _bir_sicak(etiketler, n):
        etiketler = list(y.yinelenebilir(etiketler))
        veri = [0.0] * (len(etiketler) * n)
        for i, e in enumerate(etiketler):
            veri[i * n + int(e)] = 1.0
        return Tensor(veri, (len(etiketler), n))

    @ekle('ArgMaks', 1, 1)
    def _argmaks(t):
        return Tensor.yap(t).argmaks()

    @ekle('Doğruluk', 2, 2)
    def _dogruluk(tahmin, etiketler):
        t = Tensor.yap(tahmin)
        etiketler = [int(round(_f(e))) for e in y.yinelenebilir(etiketler)]
        R, C = _2d(t.sekil)
        if C == 1 or len(t.sekil) == 1:
            tah = [1 if v >= 0.5 else 0 for v in t.veri]
        else:
            tah = t.argmaks()
        if len(tah) != len(etiketler):
            raise YontemHatasi("Doğruluk: tahmin ve etiket sayıları farklı")
        return sum(1 for a, b in zip(tah, etiketler) if a == b) / len(etiketler)

    def _ileri(model, X):
        if hasattr(model, 'ileri'):
            return model.ileri(X)
        if type(model) is KNesne:
            return y.metod_cagir(model, 'ileri', [X])
        return y.cagir(model, [X])

    @ekle('Türev', 2, 2)
    def _turev(f, x):
        """f fonksiyonunun x noktasındaki türevi (gradyanı) — otomatik türev ile."""
        skaler = type(x) in (int, float)
        xt = Tensor.yap(x).ayir()
        xt.gerekli = True
        s = y.cagir(f, [xt])
        if type(s) is not Tensor:
            return 0.0 if skaler else Tensor([0.0] * len(xt.veri), xt.sekil)
        if len(s.veri) != 1:
            s = s.toplam()
        s.geri_yay()
        g = xt.grad or [0.0] * len(xt.veri)
        return g[0] if skaler else Tensor(g, xt.sekil)
    U['gradyan'] = U['turev']

    @ekle('ModeliDışaAktar', 2, 3)
    def _disa_aktar(model, yol, birim_adi=None):
        """Eğitilmiş Ardışık/Yoğun modeli, ağırlıklarıyla birlikte saf Yöntem birimi olarak yazar.
        Üretilen birim her arka uçta (JavaScript, Python, gömülü C++) çalışır: Tahmin(x)."""
        import os
        metin = model_birimi(model, birim_adi or os.path.splitext(os.path.basename(yol))[0])
        try:
            with open(yol, 'w', encoding='utf-8') as f:
                f.write(metin)
        except OSError as e:
            raise YontemHatasi(f"Dosya yazılamadı: {yol} ({e.strerror})")
        return None

    @ekle('Eğit', 5, 8)
    def _egit(model, X, Y, kayip, opt, epok=100, rapor=0, yigin=0):
        """Modeli eğitir; kayıp geçmişini liste olarak döndürür.
        kayip: 'okh' | 'omh' | 'ikiliÇaprazEntropi' | 'çaprazEntropi' veya bir fonksiyon.
        yigin > 0 ise mini-yığın (mini-batch) eğitimi yapılır."""
        if type(kayip) is str:
            kf_py = KAYIPLAR.get(katla(kayip))
            if kf_py is None:
                raise YontemHatasi(f"Bilinmeyen kayıp: '{kayip}'")

            def kf(p, h):
                return kf_py(p, h)
        else:
            def kf(p, h):
                return y.cagir(kayip, [p, h])
        Xt = Tensor.yap(X)
        etiket_listesi = type(Y) is list and Y and type(Y[0]) is int
        Yt = Y if etiket_listesi else Tensor.yap(Y)
        R = Xt.sekil[0] if Xt.sekil else 1
        gecmis = []
        epok = int(epok)
        for e in range(epok):
            if yigin and yigin < R:
                idx = list(range(R))
                _rng.shuffle(idx)
                top, say = 0.0, 0
                for b in range(0, R, int(yigin)):
                    parca = idx[b:b + int(yigin)]
                    xb = _satirlar(Xt, parca)
                    yb = [Yt[i] for i in parca] if etiket_listesi else _satirlar(Yt, parca)
                    opt.sifirla()
                    L = kf(_ileri(model, xb), yb)
                    L.geri_yay()
                    opt.adim()
                    top += L.veri[0]
                    say += 1
                deger = top / say
            else:
                opt.sifirla()
                L = kf(_ileri(model, Xt), Yt)
                L.geri_yay()
                opt.adim()
                deger = L.veri[0]
            gecmis.append(deger)
            if rapor and ((e + 1) % int(rapor) == 0 or e == 0):
                y.yaz(f"  Epok {e + 1:>5}/{epok}   kayıp = {deger:.6f}\n")
        return gecmis
    return U


def _satirlar(t, idx):
    if len(t.sekil) == 1:
        return Tensor([t.veri[i] for i in idx], (len(idx),))
    R, C = t.sekil
    veri = []
    for i in idx:
        veri.extend(t.veri[i * C:(i + 1) * C])
    return Tensor(veri, (len(idx), C))


# ======================================================================== modeli dışa aktarma
_AKT_FONK = {'relu': 'ReLU', 'sigmoid': 'Sigmoid', 'tanh': 'Tanh', 'softmaks': 'Softmaks'}


def model_birimi(model, ad):
    """Ardışık ya da Yoğun modeli Yöntem birimi metnine çevirir (JS sürümüyle aynı çıktı)."""
    katmanlar = model.katmanlar if isinstance(model, Ardisik) else [model]
    adimlar, degiskenler, atamalar, ozet = [], [], [], []
    for k in katmanlar:
        if type(k) is str:
            akt = katla(k)
            ozet.append(k)
        elif isinstance(k, Yogun):
            i = len(degiskenler) // 2 + 1
            degiskenler += [f'W{i}', f'b{i}']
            g, c = k.W.sekil
            satirlar = ['[' + ', '.join(repr(k.W.veri[r * c + j]) for j in range(c)) + ']' for r in range(g)]
            atamalar.append(f"  W{i} := Tensör([" + ',\n               '.join(satirlar) + '])')
            atamalar.append(f"  b{i} := Tensör([" + ', '.join(repr(v) for v in k.b.veri) + '])')
            adimlar.append(f'x @ W{i} + b{i}')
            akt = k.akt
            ozet.append(str(k))
        else:
            raise YontemHatasi('ModeliDışaAktar yalnızca Yoğun katmanları ve aktivasyon adlarını destekler')
        if akt in ('', 'dogrusal', 'yok'):
            pass
        elif akt in _AKT_FONK:
            if not adimlar:
                adimlar.append('x')
            adimlar[-1] = f'{_AKT_FONK[akt]}({adimlar[-1]})'
        else:
            raise YontemHatasi(f"'{akt}' aktivasyonu dışa aktarılamaz (relu, sigmoid, tanh, softmaks)")
    govde = '\n'.join(f'  x := {a}' for a in adimlar)
    return (f"birim {ad}\n"
            f"{{ YZ.ModeliDışaAktar ile üretildi: Ardışık[{', '.join(ozet)}] }}\n"
            f"kullan YZ\n\n"
            f"arayüz\n  fonksiyon Tahmin(x: tensör): tensör\n\n"
            f"uygulama\n"
            f"değişken\n  {', '.join(degiskenler)}: tensör\n\n"
            f"fonksiyon Tahmin(x: tensör): tensör\nbaşla\n{govde}\n  sonuç := x\nbitir\n\n"
            f"başla\n" + '\n'.join(atamalar) + "\nbitir.\n")
