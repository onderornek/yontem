"""Kuantum birimi: kuantum devrelerini programlamak için durum vektörü simülatörü.

- Kübitler 0'dan numaralanır. Bit dizilerinde q0 EN SOLDADIR: '10' -> q0=1, q1=0.
- Kapılar çağrıldıkları anda duruma uygulanır (anında yürütme). Böylece devre
  ortasında ölçüm yapıp sonucu Yöntem'in 'eğer' deyimiyle kullanmak (klasik
  denetim, ör. kuantum ışınlama) doğal olarak yazılır.
- Genlikler karmaşık sayıdır; Yöntem'e [gerçel, sanal] çiftleri olarak verilir.
"""
import cmath
import math
import random

from .hatalar import YontemHatasi
from .sozcuk import katla
from .degerler import YerelFonksiyon

_rng = random.Random()
EN_COK_KUBIT = 20
_S2 = 1 / math.sqrt(2)

KAPILAR = {
    'h': ((_S2, _S2), (_S2, -_S2)),
    'x': ((0, 1), (1, 0)),
    'y': ((0, -1j), (1j, 0)),
    'z': ((1, 0), (0, -1)),
    's': ((1, 0), (0, 1j)),
    'sd': ((1, 0), (0, -1j)),
    't': ((1, 0), (0, cmath.exp(1j * math.pi / 4))),
    'td': ((1, 0), (0, cmath.exp(-1j * math.pi / 4))),
    'kx': ((0.5 + 0.5j, 0.5 - 0.5j), (0.5 - 0.5j, 0.5 + 0.5j)),   # √X
}


def _rx(t):
    c, s = math.cos(t / 2), math.sin(t / 2)
    return ((c, -1j * s), (-1j * s, c))


def _ry(t):
    c, s = math.cos(t / 2), math.sin(t / 2)
    return ((c, -s), (s, c))


def _rz(t):
    return ((cmath.exp(-1j * t / 2), 0), (0, cmath.exp(1j * t / 2)))


def _faz(t):
    return ((1, 0), (0, cmath.exp(1j * t)))


def _u(t, f, l):
    c, s = math.cos(t / 2), math.sin(t / 2)
    return ((c, -cmath.exp(1j * l) * s),
            (cmath.exp(1j * f) * s, cmath.exp(1j * (f + l)) * c))


def _sayi(v, ad):
    if type(v) in (int, float):
        return float(v)
    raise YontemHatasi(f"'{ad}' için açı sayı olmalı")


def _kisa(x):
    s = f"{x:.4f}".rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


class Devre:
    TUR_ADI = 'kuantum devresi'

    def __init__(self, n, klasik=None):
        if type(n) is not int or n < 1:
            raise YontemHatasi("Kübit sayısı pozitif bir tamsayı olmalı")
        if n > EN_COK_KUBIT:
            raise YontemHatasi(f"Simülatör en çok {EN_COK_KUBIT} kübit destekler")
        self.n = n
        self.durum = [0j] * (1 << n)
        self.durum[0] = 1 + 0j
        self.klasik = [0] * (klasik if klasik is not None else n)
        self.kayit = []          # çizim için: (etiket, kontroller, hedefler)

    # ------------------------------------------------------------ yardımcılar
    def _q(self, q):
        if type(q) is not int or not 0 <= q < self.n:
            raise YontemHatasi(f"Geçersiz kübit dizini: {q} (0..{self.n - 1})")
        return q

    def _farkli(self, *qs):
        if len(set(qs)) != len(qs):
            raise YontemHatasi("Bir kapının kübitleri birbirinden farklı olmalı")

    def _tek(self, q, M, kontroller=(), etiket='?'):
        q = self._q(q)
        kontroller = tuple(self._q(c) for c in kontroller)
        self._farkli(q, *kontroller)
        (a, b), (c, d) = M
        adim = 1 << q
        maske = 0
        for k in kontroller:
            maske |= 1 << k
        s = self.durum
        for i in range(len(s)):
            if i & adim or (i & maske) != maske:
                continue
            j = i | adim
            x, y = s[i], s[j]
            s[i] = a * x + b * y
            s[j] = c * x + d * y
        self.kayit.append((etiket, kontroller, (q,)))

    def _olasilik1(self, q):
        adim = 1 << q
        return sum(abs(a) ** 2 for i, a in enumerate(self.durum) if i & adim)

    def _bitler(self, i):
        return ''.join('1' if i >> q & 1 else '0' for q in range(self.n))

    def olasiliklar(self):
        return {self._bitler(i): abs(a) ** 2 for i, a in enumerate(self.durum) if abs(a) ** 2 > 1e-12}

    # ------------------------------------------------------------ kapılar
    def kapi(self, ad, q):
        self._tek(q, KAPILAR[ad], (), ad.upper() if ad != 'kx' else '√X')

    def donus(self, tur, q, t):
        t = _sayi(t, tur)
        M = {'rx': _rx, 'ry': _ry, 'rz': _rz, 'faz': _faz}[tur](t)
        self._tek(q, M, (), f"{tur.upper() if tur != 'faz' else 'P'}({_kisa(t)})")

    def u(self, q, t, f, l):
        self._tek(q, _u(_sayi(t, 'U'), _sayi(f, 'U'), _sayi(l, 'U')), (), 'U')

    def kontrollu(self, ad, kontroller, hedef, t=None):
        if ad in ('rx', 'ry', 'rz', 'faz'):
            t = _sayi(t, ad)
            M = {'rx': _rx, 'ry': _ry, 'rz': _rz, 'faz': _faz}[ad](t)
            etiket = f"{ad.upper() if ad != 'faz' else 'P'}({_kisa(t)})"
        else:
            M = KAPILAR[ad]
            etiket = ad.upper()
        self._tek(hedef, M, kontroller, etiket)

    def takas(self, a, b):
        a, b = self._q(a), self._q(b)
        self._farkli(a, b)
        s = self.durum
        ma, mb = 1 << a, 1 << b
        for i in range(len(s)):
            if i & ma and not i & mb:
                j = (i & ~ma) | mb
                s[i], s[j] = s[j], s[i]
        self.kayit.append(('×', (), (a, b)))

    # ------------------------------------------------------------ ölçüm
    def olc(self, q, klasik_bit=None):
        q = self._q(q)
        p1 = self._olasilik1(q)
        sonuc = 1 if _rng.random() < p1 else 0
        p = p1 if sonuc else 1 - p1
        olcek = 1 / math.sqrt(p) if p > 0 else 0
        adim = 1 << q
        s = self.durum
        for i in range(len(s)):
            if bool(i & adim) == bool(sonuc):
                s[i] *= olcek
            else:
                s[i] = 0j
        hedef = q if klasik_bit is None else klasik_bit
        if type(hedef) is not int or not 0 <= hedef < len(self.klasik):
            raise YontemHatasi(f"Geçersiz klasik bit: {hedef}")
        self.klasik[hedef] = sonuc
        self.kayit.append(('Ö', (), (q,)))
        return sonuc

    def olc_hepsi(self):
        return ''.join(str(self.olc(q)) for q in range(self.n))

    def calistir(self, atis=1024):
        if type(atis) is not int or atis < 1:
            raise YontemHatasi("Atış sayısı pozitif bir tamsayı olmalı")
        ol = self.olasiliklar()
        anahtarlar = sorted(ol)
        agirliklar = [ol[k] for k in anahtarlar]
        sayim = {}
        for k in _rng.choices(anahtarlar, weights=agirliklar, k=atis):
            sayim[k] = sayim.get(k, 0) + 1
        return {k: sayim[k] for k in sorted(sayim)}

    def sifirla(self, q=None):
        if q is None:
            self.durum = [0j] * (1 << self.n)
            self.durum[0] = 1 + 0j
            self.kayit = []
            self.klasik = [0] * len(self.klasik)
            return
        if self.olc(q) == 1:
            self._tek(q, KAPILAR['x'], (), 'X')

    # ------------------------------------------------------------ gözlem
    def beklenen(self, pauli):
        if type(pauli) is not str or len(pauli) != self.n:
            raise YontemHatasi(f"Pauli dizisi {self.n} karakter olmalı (ör. 'Z' + 'I' * {self.n - 1})")
        s = self.durum
        p = [c.upper() for c in pauli]
        if any(c not in 'IXYZ' for c in p):
            raise YontemHatasi("Pauli dizisi yalnızca I, X, Y, Z içerebilir")
        top = 0j
        for i, a in enumerate(s):
            if a == 0:
                continue
            j = i
            katsayi = 1 + 0j
            for q, c in enumerate(p):
                bit = i >> q & 1
                if c == 'X':
                    j ^= 1 << q
                elif c == 'Y':
                    j ^= 1 << q
                    katsayi *= 1j if bit == 0 else -1j
                elif c == 'Z':
                    if bit:
                        katsayi = -katsayi
            top += s[j].conjugate() * katsayi * a
        return round(top.real, 12)

    def bloch(self, q):
        q = self._q(q)
        sonuc = []
        for c in 'XYZ':
            p = ['I'] * self.n
            p[q] = c
            sonuc.append(round(self.beklenen(''.join(p)), 10))
        return sonuc

    def durum_metni(self):
        parcalar = []
        for i, a in enumerate(self.durum):
            if abs(a) < 1e-9:
                continue
            re_, im = a.real, a.imag
            if abs(im) < 1e-9:
                k = _kisa(re_)
            elif abs(re_) < 1e-9:
                k = _kisa(im) + 'i'
            else:
                k = f"({_kisa(re_)}{'+' if im >= 0 else '-'}{_kisa(abs(im))}i)"
            parcalar.append(f"{k}|{self._bitler(i)}⟩")
        return ' + '.join(parcalar).replace('+ -', '- ')

    def ciz(self):
        sutunlar = []
        for etiket, kontroller, hedefler in self.kayit:
            hucre = {}
            for c in kontroller:
                hucre[c] = '●'
            for h in hedefler:
                hucre[h] = etiket if etiket != '×' else '×'
            tum = list(kontroller) + list(hedefler)
            if len(tum) > 1:
                for q in range(min(tum) + 1, max(tum)):
                    hucre.setdefault(q, '│')
            sutunlar.append(hucre)
        satirlar = []
        for q in range(self.n):
            parcalar = [f"q{q}: "]
            for hucre in sutunlar:
                gen = max(len(v) for v in hucre.values()) if hucre else 1
                v = hucre.get(q)
                if v is None:
                    parcalar.append('─' * (gen + 2))
                elif v == '│':
                    parcalar.append('─' + v.center(gen, '─') + '─')
                else:
                    parcalar.append('─' + v.center(gen, '─') + '─')
            satirlar.append(''.join(parcalar) + '─')
        return '\n'.join(satirlar)

    def kopya(self):
        d = Devre(self.n, len(self.klasik))
        d.durum = list(self.durum)
        d.klasik = list(self.klasik)
        d.kayit = list(self.kayit)
        return d

    # ------------------------------------------------------------ Yöntem üyeleri
    def k_al(self, ad, y):
        if ad == 'kubitsayisi':
            return self.n
        if ad == 'klasik':
            return list(self.klasik)
        f = _DEVRE_METOD.get(ad)
        if f is None:
            raise YontemHatasi(f"Kuantum devresinde '{ad}' üyesi yok")
        return f(self)

    def __str__(self):
        return self.durum_metni()


def _m(ad, f, oto=False):
    return lambda d: YerelFonksiyon(ad, lambda y, a: f(d, *a), oto)


def _liste(v):
    if type(v) is int:
        return (v,)
    if type(v) is list:
        return tuple(v)
    raise YontemHatasi("Kontrol kübitleri tamsayı ya da tamsayı listesi olmalı")


_DEVRE_METOD = {}
for _ad in ('h', 'x', 'y', 'z', 's', 'sd', 't', 'td', 'kx'):
    _DEVRE_METOD[_ad] = _m(_ad.upper(), lambda d, q, _a=_ad: d.kapi(_a, q))
for _ad in ('rx', 'ry', 'rz', 'faz'):
    _DEVRE_METOD[_ad] = _m(_ad, lambda d, q, t, _a=_ad: d.donus(_a, q, t))
    _DEVRE_METOD['k' + _ad] = _m('K' + _ad, lambda d, c, h, t, _a=_ad: d.kontrollu(_a, _liste(c), h, t))
_DEVRE_METOD.update({
    'u': _m('U', lambda d, q, t, f, l: d.u(q, t, f, l)),
    'cx': _m('CX', lambda d, c, h: d.kontrollu('x', (c,), h)),
    'cnot': _m('CNOT', lambda d, c, h: d.kontrollu('x', (c,), h)),
    'cy': _m('CY', lambda d, c, h: d.kontrollu('y', (c,), h)),
    'cz': _m('CZ', lambda d, c, h: d.kontrollu('z', (c,), h)),
    'ccx': _m('CCX', lambda d, a, b, h: d.kontrollu('x', (a, b), h)),
    'toffoli': _m('Toffoli', lambda d, a, b, h: d.kontrollu('x', (a, b), h)),
    'cokkontrollux': _m('ÇokKontrollüX', lambda d, c, h: d.kontrollu('x', _liste(c), h)),
    'cokkontrolluz': _m('ÇokKontrollüZ', lambda d, c, h: d.kontrollu('z', _liste(c), h)),
    'takas': _m('Takas', lambda d, a, b: d.takas(a, b)),
    'swap': _m('SWAP', lambda d, a, b: d.takas(a, b)),
    'olc': _m('Ölç', lambda d, q, k=None: d.olc(q, k)),
    'olchepsi': _m('ÖlçHepsi', lambda d: d.olc_hepsi(), True),
    'calistir': _m('Çalıştır', lambda d, atis=1024: d.calistir(atis), True),
    'olasiliklar': _m('Olasılıklar', lambda d: {k: round(v, 10) for k, v in d.olasiliklar().items()}, True),
    'olasilik': _m('Olasılık', lambda d, b: round(d.olasiliklar().get(b, 0.0), 10)),
    'genlikler': _m('Genlikler', lambda d: [[a.real, a.imag] for a in d.durum], True),
    'durum': _m('Durum', lambda d: d.durum_metni(), True),
    'beklenendeger': _m('BeklenenDeğer', lambda d, p: d.beklenen(p)),
    'blochvektoru': _m('BlochVektörü', lambda d, q: d.bloch(q)),
    'sifirla': _m('Sıfırla', lambda d, q=None: d.sifirla(q), True),
    'ciz': _m('Çiz', lambda d: d.ciz(), True),
    'kopya': _m('Kopya', lambda d: d.kopya(), True),
    'bariyer': _m('Bariyer', lambda d: d.kayit.append(('┊', (), tuple(range(d.n)))), True),
})


def kuantum_modulu(y):
    U = {}

    def ekle(ad, en_az, en_cok, f, oto=False):
        def calis(y_, args):
            if not en_az <= len(args) <= en_cok:
                raise YontemHatasi(f"'{ad}' {en_az}..{en_cok} argüman bekler, {len(args)} verildi")
            return f(*args)
        U[katla(ad)] = YerelFonksiyon(ad, calis, oto)

    ekle('Devre', 1, 2, lambda n, k=None: Devre(n, k))

    def _tohum(n):
        _rng.seed(n)
        from . import yerlesik, yz
        yerlesik._rng.seed(n)
        yz._rng.seed(n)
    ekle('KuantumTohum', 1, 1, _tohum)

    def _parametre_kaydirma(f, params):
        """Parametre kaydırma kuralı: d<f>/dθᵢ = [f(θ + π/2·eᵢ) − f(θ − π/2·eᵢ)] / 2.
        f, parametre listesi alıp sayı döndüren bir Yöntem fonksiyonudur."""
        if type(params) is not list:
            raise YontemHatasi("ParametreKaydırma ikinci argüman olarak liste bekler")
        grad = []
        for i in range(len(params)):
            arti = list(params)
            eksi = list(params)
            arti[i] = params[i] + math.pi / 2
            eksi[i] = params[i] - math.pi / 2
            fa = y.cagir(f, [arti])
            fe = y.cagir(f, [eksi])
            if type(fa) not in (int, float) or type(fe) not in (int, float):
                raise YontemHatasi("ParametreKaydırma: fonksiyon sayı döndürmeli")
            grad.append((fa - fe) / 2)
        return grad
    ekle('ParametreKaydırma', 2, 2, _parametre_kaydirma)

    def _sadakat(a, b):
        if type(a) is not Devre or type(b) is not Devre or a.n != b.n:
            raise YontemHatasi("Sadakat aynı boyutta iki devre bekler")
        ic = sum(x.conjugate() * z for x, z in zip(a.durum, b.durum))
        return abs(ic) ** 2
    ekle('Sadakat', 2, 2, _sadakat)

    U['enkokubit'] = EN_COK_KUBIT
    return U
