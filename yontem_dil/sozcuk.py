"""Yöntem sözcük çözümleyici (lexer).

Pascal geleneğine uygun olarak dil büyük/küçük harf duyarsızdır. Ayrıca Türkçe
karakterler katlanır: `Başla`, `BASLA`, `basla` aynı sözcüktür. Böylece Türkçe
klavyesi olmayan biri de program yazabilir.
"""
import re

from .hatalar import SozdizimHatasi

_TR = str.maketrans({'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
                     'â': 'a', 'î': 'i', 'û': 'u'})


def katla(s):
    """Tanımlayıcıyı karşılaştırma için normalleştirir."""
    return s.replace('İ', 'i').replace('I', 'ı').lower().translate(_TR)


ANAHTAR = {
    'program', 'birim', 'kullan', 'arayuz', 'uygulama',
    'degisken', 'sabit', 'tip', 'prosedur', 'fonksiyon', 'kurucu',
    'basla', 'bitir', 'eger', 'ise', 'degilse', 'iken', 'icin', 'kadar',
    'azalarak', 'her', 'icinde', 'icindeki', 'tekrarla', 'dene', 'yakala',
    'sonunda', 'firlat', 'don', 'cik', 'kir', 'devam', 'sinif', 'kayit',
    'miras', 'kendi', 'dogru', 'yanlis', 'bos', 've', 'veya', 'yada', 'degil',
    'mod', 'bol', 'dizi', 'turunde',
}

OPS = [':=', '+=', '-=', '*=', '/=', '**', '<>', '<=', '>=', '..', '|>', '=>',
       '+', '-', '*', '/', '@', '=', '<', '>', '(', ')', '[', ']', ',', ';',
       ':', '.', '^']

_HEX = set('0123456789abcdefABCDEF')

# Kesme işaretiyle eklenen ekler: 1'den 10'a, n'e, (n - 1)'e ...
EK_AYRILMA = {'den', 'dan', 'ten', 'tan', 'nden', 'ndan'}
EK_YONELME = {'e', 'a', 'ye', 'ya', 'ne', 'na'}
_KESME = "'\u2019"   # ' ve ’
_KACIS = {'n': '\n', 't': '\t', 'r': '\r', '\\': '\\', '"': '"', "'": "'", '0': '\0'}


class Sozcuk:
    __slots__ = ('tip', 'deger', 'ham', 'satir', 'sutun')

    def __init__(self, tip, deger, ham, satir, sutun):
        self.tip = tip        # 'AD', 'AS' (anahtar sözcük), 'SAYI', 'METIN', 'OP', 'SON'
        self.deger = deger
        self.ham = ham
        self.satir = satir
        self.sutun = sutun

    def __repr__(self):
        return f"Sozcuk({self.tip},{self.deger!r},{self.satir}:{self.sutun})"


def cok_satirli_icerik(ham):
    """Çok satırlı metnin içeriği: açılıştan hemen sonraki ve kapanıştan hemen önceki boş satır atılır,
    satırların ortak girintisi silinir."""
    satirlar = ham.replace('\r\n', '\n').replace('\r', '\n').split('\n')

    def bos(s):
        return s.strip(' \t') == ''
    if len(satirlar) > 1 and bos(satirlar[0]):
        satirlar.pop(0)
    if len(satirlar) > 1 and bos(satirlar[-1]):
        satirlar.pop()
    girintiler = [len(s) - len(s.lstrip(' \t')) for s in satirlar if not bos(s)]
    ortak = min(girintiler) if girintiler else 0
    return '\n'.join('' if bos(s) else s[ortak:] for s in satirlar)


def _cok_satirli(kaynak, bas, hata, sutun):
    e = kaynak.find('"""', bas + 3)
    if e < 0:
        hata('Kapanmamış çok satırlı metin; \'"""\' ile kapatın', sutun)
    return cok_satirli_icerik(kaynak[bas + 3:e]), e + 3


_BICIM_OZEL = re.compile(r'(?=.)[<>^]?\d*(?:\.\d+)?\Z', re.S)


def bicimli_parcala(icerik, hata, satir, sutun):
    """Biçimli metnin içeriğini parçalara ayırır: {{ ve }} tek ayraç, {ifade} ya da {ifade:biçim} yerleştirme.
    Düz parçalar str, yerleştirmeler (kaynak, biçim, satır, sütun) olur."""
    parcalar, buf, i, n = [], [], 0, len(icerik)
    while i < n:
        c = icerik[i]
        if c == '{' and icerik[i + 1:i + 2] == '{':
            buf.append('{')
            i += 2
            continue
        if c == '}' and icerik[i + 1:i + 2] == '}':
            buf.append('}')
            i += 2
            continue
        if c == '}':
            hata("Biçimli metinde tek '}' var; ayracın kendisi için '}}' yazın")
        if c != '{':
            buf.append(c)
            i += 1
            continue
        j, derinlik, iki_nokta = i + 1, 0, -1
        while True:
            if j >= n:
                hata("Biçimli metinde kapanmamış '{'; ayracın kendisi için '{{' yazın")
            d = icerik[j]
            if d in "'\"":
                k = icerik.find(d, j + 1)
                if k < 0:
                    hata("Biçimli metindeki ifadede kapanmamış metin")
                j = k + 1
                continue
            if d in '{([':
                derinlik += 1
            elif d in ')]':
                derinlik -= 1
            elif d == '}':
                if derinlik == 0:
                    break
                derinlik -= 1
            elif d == ':' and derinlik == 0:
                iki_nokta = j
            j += 1
        kaynak, ozel = icerik[i + 1:j], None
        if iki_nokta >= 0 and _BICIM_OZEL.match(icerik[iki_nokta + 1:j]):
            ozel = icerik[iki_nokta + 1:j]
            kaynak = icerik[i + 1:iki_nokta]
        if kaynak.strip(' \t\n') == '':
            hata("Biçimli metinde boş '{}'; yerleştirilecek ifadeyi yazın")
        if buf:
            parcalar.append(''.join(buf))
            buf = []
        parcalar.append((kaynak, ozel, satir, sutun))
        i = j + 1
    if buf or not parcalar:
        parcalar.append(''.join(buf))
    return parcalar


def sozcukle(kaynak, dosya='<girdi>'):
    out = []
    i, n = 0, len(kaynak)
    satir, sat_bas = 1, 0

    def hata(msg, sut=None):
        raise SozdizimHatasi(f"{msg} (sütun {sut or i - sat_bas + 1})", satir, dosya)

    son_bitis = -1
    onceki_adet = 0
    while i < n:
        if len(out) != onceki_adet:
            son_bitis = i
            onceki_adet = len(out)
        c = kaynak[i]
        # Ek: bir sayıya, ada ya da kapanış parantezine bitişik kesme işareti
        if c in _KESME and son_bitis == i and out and (
                out[-1].tip in ('SAYI', 'AD') or (out[-1].tip == 'OP' and out[-1].deger in (')', ']'))):
            j = i + 1
            while j < n and kaynak[j].isalpha():
                j += 1
            ek = katla(kaynak[i + 1:j])
            if ek in EK_AYRILMA or ek in EK_YONELME:
                tur = 'ayrilma' if ek in EK_AYRILMA else 'yonelme'
                out.append(Sozcuk('SONEK', tur, kaynak[i:j], satir, i - sat_bas + 1))
                i = j
                continue
        if c == '\n':
            satir += 1
            sat_bas = i + 1
            i += 1
            continue
        if c in ' \t\r﻿':
            i += 1
            continue
        # Yorumlar: { ... }  (* ... *)  // ...
        if c == '{' or (c == '(' and kaynak.startswith('(*', i)):
            bitis = '}' if c == '{' else '*)'
            j = kaynak.find(bitis, i + len(bitis) if c == '(' else i + 1)
            if j < 0:
                hata("Kapanmamış yorum")
            ara = kaynak.count('\n', i, j)
            if ara:
                satir += ara
                sat_bas = kaynak.rfind('\n', i, j) + 1
            i = j + len(bitis)
            continue
        if c == '/' and kaynak.startswith('//', i):
            j = kaynak.find('\n', i)
            i = n if j < 0 else j
            continue

        sutun = i - sat_bas + 1
        # Sayılar
        if c.isdigit() or (c == '$' and i + 1 < n and kaynak[i + 1] in _HEX):
            if c == '$':
                j = i + 1
                while j < n and kaynak[j] in _HEX:
                    j += 1
                out.append(Sozcuk('SAYI', int(kaynak[i + 1:j], 16), kaynak[i:j], satir, sutun))
                i = j
                continue
            j = i
            while j < n and (kaynak[j].isdigit() or kaynak[j] == '_'):
                j += 1
            ondalik = False
            if j + 1 < n and kaynak[j] == '.' and kaynak[j + 1].isdigit():
                ondalik = True
                j += 1
                while j < n and (kaynak[j].isdigit() or kaynak[j] == '_'):
                    j += 1
            if j < n and kaynak[j] in 'eE':
                k = j + 1
                if k < n and kaynak[k] in '+-':
                    k += 1
                if k < n and kaynak[k].isdigit():
                    ondalik = True
                    j = k
                    while j < n and kaynak[j].isdigit():
                        j += 1
            ham = kaynak[i:j].replace('_', '')
            out.append(Sozcuk('SAYI', float(ham) if ondalik else int(ham), ham, satir, sutun))
            i = j
            continue
        # Biçimli metin: $'Merhaba {ad}', $"...", $"""..."""
        if c == '$' and i + 1 < n and kaynak[i + 1] in "'\"":
            bas, bas_satir = i, satir
            if kaynak.startswith('"""', i + 1):
                icerik, e = _cok_satirli(kaynak, i + 1, hata, sutun)
                for k in range(i, e):
                    if kaynak[k] == '\n':
                        satir += 1
                        sat_bas = k + 1
                i = e
            elif kaynak[i + 1] == "'":
                j, buf = i + 2, []
                while True:
                    if j >= n or kaynak[j] == '\n':
                        hata("Kapanmamış metin", sutun)
                    if kaynak[j] == "'":
                        if j + 1 < n and kaynak[j + 1] == "'":
                            buf.append("'")
                            j += 2
                            continue
                        break
                    buf.append(kaynak[j])
                    j += 1
                icerik, i = ''.join(buf), j + 1
            else:
                j, buf = i + 2, []
                while True:
                    if j >= n or kaynak[j] == '\n':
                        hata("Kapanmamış metin", sutun)
                    ch = kaynak[j]
                    if ch == '\\' and j + 1 < n:
                        buf.append(_KACIS.get(kaynak[j + 1], kaynak[j + 1]))
                        j += 2
                        continue
                    if ch == '"':
                        break
                    buf.append(ch)
                    j += 1
                icerik, i = ''.join(buf), j + 1
            parcalar = bicimli_parcala(icerik, lambda m: hata(m, sutun), bas_satir, sutun)
            out.append(Sozcuk('BMETIN', parcalar, kaynak[bas:i], bas_satir, sutun))
            continue
        # Çok satırlı metin: """ ... """ (kaçış yok; ortak girinti silinir)
        if c == '"' and kaynak.startswith('"""', i):
            bas_satir = satir
            icerik, e = _cok_satirli(kaynak, i, hata, sutun)
            for k in range(i, e):
                if kaynak[k] == '\n':
                    satir += 1
                    sat_bas = k + 1
            i = e
            out.append(Sozcuk('METIN', icerik, '', bas_satir, sutun))
            continue
        # Metinler: 'Pascal ''tarzı''' #10 ve "kaçışlı\n"
        if c in "'#\"":
            parcalar = []
            while i < n and kaynak[i] in "'#\"" and not kaynak.startswith('"""', i):
                if kaynak[i] == "'":
                    j = i + 1
                    buf = []
                    while True:
                        if j >= n or kaynak[j] == '\n':
                            hata("Kapanmamış metin", sutun)
                        if kaynak[j] == "'":
                            if j + 1 < n and kaynak[j + 1] == "'":
                                buf.append("'")
                                j += 2
                                continue
                            break
                        buf.append(kaynak[j])
                        j += 1
                    parcalar.append(''.join(buf))
                    i = j + 1
                elif kaynak[i] == '"':
                    j = i + 1
                    buf = []
                    while True:
                        if j >= n or kaynak[j] == '\n':
                            hata("Kapanmamış metin", sutun)
                        ch = kaynak[j]
                        if ch == '\\' and j + 1 < n:
                            buf.append(_KACIS.get(kaynak[j + 1], kaynak[j + 1]))
                            j += 2
                            continue
                        if ch == '"':
                            break
                        buf.append(ch)
                        j += 1
                    parcalar.append(''.join(buf))
                    i = j + 1
                else:  # #65 karakter kodu
                    j = i + 1
                    while j < n and kaynak[j].isdigit():
                        j += 1
                    if j == i + 1:
                        hata("'#' sonrası karakter kodu bekleniyordu")
                    parcalar.append(chr(int(kaynak[i + 1:j])))
                    i = j
            out.append(Sozcuk('METIN', ''.join(parcalar), '', satir, sutun))
            continue
        # Tanımlayıcılar / anahtar sözcükler
        if c.isalpha() or c == '_':
            j = i
            while j < n and (kaynak[j].isalnum() or kaynak[j] == '_'):
                j += 1
            ham = kaynak[i:j]
            k = katla(ham)
            out.append(Sozcuk('AS' if k in ANAHTAR else 'AD', k, ham, satir, sutun))
            i = j
            continue
        for op in OPS:
            if kaynak.startswith(op, i):
                out.append(Sozcuk('OP', op, op, satir, sutun))
                i += len(op)
                break
        else:
            hata(f"Beklenmeyen karakter {c!r}")
    out.append(Sozcuk('SON', None, '<dosya sonu>', satir, 1))
    return out
