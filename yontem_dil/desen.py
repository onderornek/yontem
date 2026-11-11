"""Yöntem Desen birimi — düzenli ifadeler (regex).

JavaScript sürümüyle (js/src/calisma/desen.ts) aynı geri izlemeli motoru, aynı adım sayımıyla uygular;
Python'un 're' modülü kullanılmaz, böylece iki çalışma zamanı her desende aynı sonucu verir.
"""
from .hatalar import YontemHatasi
from .pencere import _yf

ADIM_SINIRI = 2000000
SONSUZ = 1 << 60
_COK_ADIM = 'Desen bu metinde çok fazla adım gerektiriyor; deseni sadeleştirin (iç içe tekrarlar: (a+)+ gibi)'
_KACIS = {'n': '\n', 't': '\t', 'r': '\r', 'f': '\f', 'v': '\v', '0': '\0'}
_BOSLUK = ' \t\n\r\f\v'


def _hata(m):
    raise YontemHatasi(m)


def _tur_adi(v):
    from .yorumlayici import tur_adi
    return tur_adi(v)


def _sinif_uyar(s, c):
    if s == 'd':
        return '0' <= c <= '9'
    if s == 'D':
        return not '0' <= c <= '9'
    if s == 'w':
        return c == '_' or '0' <= c <= '9' or c.isalpha()
    if s == 'W':
        return not (c == '_' or '0' <= c <= '9' or c.isalpha())
    if s == 's':
        return c in _BOSLUK
    return c not in _BOSLUK


def _kat(c):
    if c in 'İIı':
        return 'i'
    k = c.lower()
    return k if len(k) == 1 else c


def _buyut(c):
    b = c.upper()
    return b if len(b) == 1 else c


def derle(desen, secenek):
    for s in secenek:
        if s != 'i':
            _hata(f"Bilinmeyen desen seçeneği: '{s}' (yalnızca 'i' desteklenir)")
    k = desen
    d = {'i': 0, 'grup': 0}
    n = len(k)

    def yanlis(m):
        _hata(f"Desen hatası ({d['i'] + 1}. karakter): {m}")

    def al(j):
        return k[j] if j < n else None

    def kume():
        deg = False
        if al(d['i']) == '^':
            deg = True
            d['i'] += 1
        araliklar, siniflar = [], []
        ilk = True
        while True:
            if d['i'] >= n:
                yanlis("kapanmamış '['")
            c = k[d['i']]
            if c == ']' and not ilk:
                d['i'] += 1
                break
            ilk = False
            d['i'] += 1
            if c == '\\':
                if d['i'] >= n:
                    yanlis("desen '\\' ile bitemez")
                e = k[d['i']]
                d['i'] += 1
                if e in 'dwsDWS':
                    siniflar.append(e)
                    continue
                c = _KACIS.get(e, e)
            if al(d['i']) == '-' and d['i'] + 1 < n and k[d['i'] + 1] != ']':
                d['i'] += 1
                b = k[d['i']]
                d['i'] += 1
                if b == '\\':
                    if d['i'] >= n:
                        yanlis("desen '\\' ile bitemez")
                    e = k[d['i']]
                    d['i'] += 1
                    b = _KACIS.get(e, e)
                if ord(b) < ord(c):
                    yanlis(f"ters aralık: {c}-{b}")
                araliklar.append((c, b))
            else:
                araliklar.append((c, c))
        return ('kume', deg, araliklar, siniflar)

    def atom():
        c = k[d['i']]
        d['i'] += 1
        if c == '.':
            return ('her',)
        if c == '^':
            return ('bas',)
        if c == '$':
            return ('son',)
        if c == '[':
            return kume()
        if c == '(':
            no = 0
            if al(d['i']) == '?':
                if al(d['i'] + 1) != ':':
                    yanlis("'(?' sonrası yalnızca ':' desteklenir (yakalamayan grup)")
                d['i'] += 2
            else:
                d['grup'] += 1
                no = d['grup']
            secenekler = secim()
            if al(d['i']) != ')':
                yanlis("kapanmamış '('")
            d['i'] += 1
            return ('grup', no, secenekler)
        if c == '\\':
            if d['i'] >= n:
                yanlis("desen '\\' ile bitemez")
            e = k[d['i']]
            d['i'] += 1
            if e in 'dwsDWS':
                return ('kume', False, [], [e])
            if e == 'b':
                return ('ss',)
            if e == 'B':
                return ('ssd',)
            if '1' <= e <= '9':
                yanlis('geri başvurular (\\1) desteklenmez')
            return ('k', _KACIS.get(e, e))
        if c in '*+?':
            yanlis(f"'{c}' öncesinde tekrarlanacak bir şey yok")
        if c == ')':
            yanlis("eşi olmayan ')'")
        return ('k', c)

    def sayi():
        j = d['i']
        while j < n and '0' <= k[j] <= '9':
            j += 1
        if j == d['i']:
            return -1
        if j - d['i'] > 4:
            yanlis('tekrar sayısı çok büyük (en çok 9999)')
        v = int(k[d['i']:j])
        d['i'] = j
        return v

    def dizi():
        out = []
        while d['i'] < n and k[d['i']] not in '|)':
            dg = atom()
            while True:
                c = al(d['i'])
                if c == '*':
                    en_az, en_cok = 0, SONSUZ
                    d['i'] += 1
                elif c == '+':
                    en_az, en_cok = 1, SONSUZ
                    d['i'] += 1
                elif c == '?':
                    en_az, en_cok = 0, 1
                    d['i'] += 1
                elif c == '{':
                    geri = d['i']
                    d['i'] += 1
                    en_az = sayi()
                    if en_az < 0:
                        d['i'] = geri
                        break
                    if al(d['i']) == ',':
                        d['i'] += 1
                        u = sayi()
                        en_cok = SONSUZ if u < 0 else u
                    else:
                        en_cok = en_az
                    if al(d['i']) != '}':
                        d['i'] = geri
                        break
                    d['i'] += 1
                    if en_cok < en_az:
                        yanlis(f"ters tekrar aralığı: {{{en_az},{en_cok}}}")
                else:
                    break
                if dg[0] in ('bas', 'son', 'ss', 'ssd'):
                    yanlis('konum belirteçleri (^ $ \\b) tekrarlanamaz')
                tembel = False
                if al(d['i']) == '?':
                    tembel = True
                    d['i'] += 1
                dg = ('tekrar', dg, en_az, en_cok, tembel)
            out.append(dg)
        return out

    def secim():
        s = [dizi()]
        while al(d['i']) == '|':
            d['i'] += 1
            s.append(dizi())
        return s

    secenekler = secim()
    if d['i'] < n:
        yanlis("eşi olmayan ')'")
    return (secenekler, d['grup'], 'i' in secenek)


K, HER, KUME, AYRIL, ATLA, YAZ, BAS, SON, SS, SSD, IZ, DENET, BITTI = range(13)
PROGRAM_SINIRI, YIGIN_SINIRI = 50000, 3000000


def programla(p):
    """Ağacı geri izlemeli sanal makine komutlarına çevirir (JavaScript sürümüyle aynı komut dizisi)."""
    secenekler0, grup_sayisi, _ = p
    kod = []
    d_ = {'yuva': 2 * (grup_sayisi + 1)}

    def ekle(k):
        if len(kod) >= PROGRAM_SINIRI:
            _hata('Desen çok büyük; tekrar sayılarını küçültün')
        kod.append(k)
        return len(kod) - 1

    def secim(secenekler):
        sonlar = []
        for n, sec in enumerate(secenekler):
            ayr = -1
            if n < len(secenekler) - 1:
                ayr = ekle([AYRIL, len(kod) + 1, 0])
            for d in sec:
                dugum(d)
            if n < len(secenekler) - 1:
                sonlar.append(ekle([ATLA, 0, 0]))
                kod[ayr][2] = len(kod)
        for a in sonlar:
            kod[a][1] = len(kod)

    def dugum(d):
        t = d[0]
        if t == 'k':
            ekle([K, d[1], 0])
        elif t == 'her':
            ekle([HER, 0, 0])
        elif t == 'kume':
            ekle([KUME, d, 0])
        elif t == 'bas':
            ekle([BAS, 0, 0])
        elif t == 'son':
            ekle([SON, 0, 0])
        elif t == 'ss':
            ekle([SS, 0, 0])
        elif t == 'ssd':
            ekle([SSD, 0, 0])
        elif t == 'grup':
            if d[1]:
                ekle([YAZ, 2 * d[1], 0])
            secim(d[2])
            if d[1]:
                ekle([YAZ, 2 * d[1] + 1, 0])
        else:
            ic, en_az, en_cok, tembel = d[1], d[2], d[3], d[4]
            for _n in range(en_az):
                dugum(ic)
            if en_cok == SONSUZ:
                l1 = ekle([AYRIL, 0, 0])
                r = d_['yuva']
                d_['yuva'] += 1
                govde = ekle([IZ, r, 0])
                dugum(ic)
                dn = ekle([DENET, r, 0])
                ekle([ATLA, l1, 0])
                kod[dn][2] = len(kod)
                kod[l1][1] = len(kod) if tembel else govde
                kod[l1][2] = govde if tembel else len(kod)
            else:
                ayrimlar = []
                for _n in range(en_az, en_cok):
                    ayrimlar.append(ekle([AYRIL, 0, 0]))
                    dugum(ic)
                for a in ayrimlar:
                    kod[a][1] = len(kod) if tembel else a + 1
                    kod[a][2] = a + 1 if tembel else len(kod)

    ekle([YAZ, 0, 0])
    secim(secenekler0)
    ekle([YAZ, 1, 0])
    ekle([BITTI, 0, 0])
    return kod, d_['yuva']


_PROGRAMLAR = {}


class Eslestirici:
    def __init__(self, p, s):
        self.sec, self.grup_sayisi, self.bk = p
        self.s = s
        self.adim = 0
        pr = _PROGRAMLAR.get(id(p))
        if pr is None or pr[0] is not p:
            if len(_PROGRAMLAR) > 500:
                _PROGRAMLAR.clear()
            pr = (p,) + programla(p)
            _PROGRAMLAR[id(p)] = pr
        self.kod, self.yuva_sayisi = pr[1], pr[2]
        self.yak = [None] * (self.grup_sayisi + 1)

    def tek_uyar(self, d, c):
        if self.bk:
            adaylar = [c, _kat(c), _buyut(c)] + (['I', 'İ', 'ı'] if _kat(c) == 'i' else [])
        else:
            adaylar = [c]
        var = False
        for a in adaylar:
            if any(x <= a <= y for x, y in d[2]) or any(_sinif_uyar(s, a) for s in d[3]):
                var = True
                break
        return var != d[1]

    def sozcuk_karakteri(self, i):
        return 0 <= i < len(self.s) and _sinif_uyar('w', self.s[i])

    def dene(self, bas, tam):
        kod, s, bk = self.kod, self.s, self.bk
        n = len(s)
        yv = [-1] * self.yuva_sayisi
        self.yak = [None] * (self.grup_sayisi + 1)
        yigin = []
        pc, pos = 0, bas
        adim = self.adim
        while True:
            adim += 1
            if adim > ADIM_SINIRI:
                self.adim = adim
                _hata(_COK_ADIM)
            k = kod[pc]
            t = k[0]
            tamam = True
            if t == K:
                tamam = pos < n and ((_kat(k[1]) == _kat(s[pos])) if bk else k[1] == s[pos])
                if tamam:
                    pos += 1
                    pc += 1
            elif t == HER:
                tamam = pos < n and s[pos] != '\n'
                if tamam:
                    pos += 1
                    pc += 1
            elif t == KUME:
                tamam = pos < n and self.tek_uyar(k[1], s[pos])
                if tamam:
                    pos += 1
                    pc += 1
            elif t == AYRIL:
                if len(yigin) >= YIGIN_SINIRI:
                    self.adim = adim
                    _hata(_COK_ADIM)
                yigin.append(k[2])
                yigin.append(pos)
                yigin.append(0)
                pc = k[1]
            elif t == ATLA:
                pc = k[1]
            elif t == YAZ or t == IZ:
                yigin.append(-1)
                yigin.append(k[1])
                yigin.append(yv[k[1]])
                yv[k[1]] = pos
                pc += 1
            elif t == BAS:
                tamam = pos == 0
                pc += 1
            elif t == SON:
                tamam = pos == n
                pc += 1
            elif t == SS:
                tamam = self.sozcuk_karakteri(pos - 1) != self.sozcuk_karakteri(pos)
                pc += 1
            elif t == SSD:
                tamam = self.sozcuk_karakteri(pos - 1) == self.sozcuk_karakteri(pos)
                pc += 1
            elif t == DENET:
                pc = k[2] if yv[k[1]] == pos else pc + 1
            else:
                if not tam or pos == n:
                    self.adim = adim
                    self.yak = [(yv[2 * g], yv[2 * g + 1]) if yv[2 * g] >= 0 and yv[2 * g + 1] >= 0 else None
                                for g in range(self.grup_sayisi + 1)]
                    return pos
                tamam = False
            if tamam:
                continue
            while True:
                if not yigin:
                    self.adim = adim
                    return -1
                c = yigin.pop()
                b = yigin.pop()
                a = yigin.pop()
                if a == -1:
                    yv[b] = c
                    continue
                pc, pos = a, b
                break

    def ara(self, bas):
        for b in range(bas, len(self.s) + 1):
            if self.dene(b, False) >= 0:
                return True
        return False


def _hepsi(s, p):
    e = Eslestirici(p, s)
    out = []
    pos = 0
    while pos <= len(s) and e.ara(pos):
        b, son = e.yak[0]
        out.append(list(e.yak))
        pos = son if son > b else son + 1
    return out


def _dilim(s, a):
    return s[a[0]:a[1]] if a else None


def desen_modulu(y):
    from .sozcuk import katla
    onbellek = {}
    U = {}

    def hazirla(desen, secenek):
        if type(desen) is not str:
            _hata(f"'desen' metin bekler, {_tur_adi(desen)} verildi")
        if type(secenek) is not str:
            _hata(f"'seçenek' metin bekler, {_tur_adi(secenek)} verildi")
        a = (secenek, desen)
        p = onbellek.get(a)
        if p is None:
            p = derle(desen, secenek)
            if len(onbellek) > 500:
                onbellek.clear()
            onbellek[a] = p
        return p

    def metin_mi(v, ad):
        if type(v) is not str:
            _hata(f"'{ad}' metin bekler, {_tur_adi(v)} verildi")
        return v

    def uye(ad, en_az, en_cok):
        def sar(f):
            U[katla(ad)] = _yf(ad, en_az, en_cok, f)
            return f
        return sar

    @uye('Eşleşir', 2, 3)
    def _eslesir(m, d, o=''):
        p = hazirla(d, o)
        return Eslestirici(p, metin_mi(m, 'metin')).ara(0)

    @uye('TamEşleşir', 2, 3)
    def _tam(m, d, o=''):
        p = hazirla(d, o)
        return Eslestirici(p, metin_mi(m, 'metin')).dene(0, True) >= 0

    @uye('Bul', 2, 3)
    def _bul(m, d, o=''):
        s = metin_mi(m, 'metin')
        e = Eslestirici(hazirla(d, o), s)
        return _dilim(s, e.yak[0]) if e.ara(0) else None

    @uye('BulHepsi', 2, 3)
    def _bul_hepsi(m, d, o=''):
        s = metin_mi(m, 'metin')
        return [_dilim(s, yk[0]) for yk in _hepsi(s, hazirla(d, o))]

    @uye('Gruplar', 2, 3)
    def _gruplar(m, d, o=''):
        s = metin_mi(m, 'metin')
        e = Eslestirici(hazirla(d, o), s)
        return [_dilim(s, a) for a in e.yak] if e.ara(0) else None

    @uye('TümGruplar', 2, 3)
    def _tum_gruplar(m, d, o=''):
        s = metin_mi(m, 'metin')
        return [[_dilim(s, a) for a in yk] for yk in _hepsi(s, hazirla(d, o))]

    @uye('DesenKonumu', 2, 3)
    def _konum(m, d, o=''):
        s = metin_mi(m, 'metin')
        e = Eslestirici(hazirla(d, o), s)
        return e.yak[0][0] + 1 if e.ara(0) else 0

    @uye('DesenDeğiştir', 3, 4)
    def _degistir(m, d, yeni, o=''):
        s, yk = metin_mi(m, 'metin'), metin_mi(yeni, 'yeni')
        out = []
        son = 0
        for yak in _hepsi(s, hazirla(d, o)):
            out.append(s[son:yak[0][0]])
            i = 0
            while i < len(yk):
                if yk[i] == '$' and i + 1 < len(yk) and (yk[i + 1] == '$' or '0' <= yk[i + 1] <= '9'):
                    i += 1
                    if yk[i] == '$':
                        out.append('$')
                    else:
                        no = int(yk[i])
                        if no >= len(yak):
                            _hata(f"'DesenDeğiştir': desende {no}. grup yok (${no})")
                        out.append(_dilim(s, yak[no]) or '')
                else:
                    out.append(yk[i])
                i += 1
            son = yak[0][1]
        out.append(s[son:])
        return ''.join(out)

    @uye('DesenAyır', 2, 3)
    def _ayir(m, d, o=''):
        s = metin_mi(m, 'metin')
        out = []
        son = 0
        for yak in _hepsi(s, hazirla(d, o)):
            b, e = yak[0]
            if e == b:
                continue
            out.append(s[son:b])
            son = e
        out.append(s[son:])
        return out

    @uye('DesenKaçış', 1, 1)
    def _kacis(m):
        return ''.join('\\' + c if c in '\\^$.|?*+()[]{}' else c for c in metin_mi(m, 'metin'))

    @uye('DesenGeçerli', 1, 1)
    def _gecerli(d):
        if type(d) is not str:
            return False
        try:
            derle(d, '')
            return True
        except YontemHatasi:
            return False

    return U
