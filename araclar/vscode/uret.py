#!/usr/bin/env python3
"""VS Code eklentisinin sözdizimi dosyasını (syntaxes/yontem.tmLanguage.json) üretir.

Yöntem adları büyük/küçük harfe ve Türkçe karakterlere duyarsızdır ('değişken' = 'DEGISKEN').
TextMate düzenli ifadeleri bu katlamayı bilmediği için her harf, eşdeğerlerinin kümesine açılır.
Sözcük listeleri değişince:  python3 araclar/vscode/uret.py
"""
import json
import os

ESDEGER = {'c': 'cCçÇ', 'g': 'gGğĞ', 'i': 'iİıI', 'o': 'oOöÖ', 's': 'sSşŞ', 'u': 'uUüÜ'}
TR = str.maketrans('çğıöşü', 'cgiosu')


def katla(s):
    return s.replace('İ', 'i').replace('I', 'ı').lower().translate(TR)


def harf(c):
    if c in ESDEGER:
        return '[' + ESDEGER[c] + ']'
    if c.isalpha():
        return '[' + c + c.upper() + ']'
    return c


def secenek(sozcukler):
    return '|'.join(''.join(harf(c) for c in katla(s)) for s in sorted(set(sozcukler), key=lambda s: (-len(s), s)))


def sozcuk(sozcukler):
    return r'(?<![\p{L}\p{N}_])(?:' + secenek(sozcukler) + r')(?![\p{L}\p{N}_])'


DENETIM = ['eğer', 'ise', 'değilse', 'iken', 'için', 'kadar', 'adımda', 'artan', 'azalan', 'her', 'içinde', 'içindeki', 'tekrarla',
           'dene', 'yakala', 'sonunda', 'fırlat', 'dön', 'çık', 'kır', 'devam', 'başla', 'bitir', 'kez', 'adım',
           'olana', 'dek', 'değerine', 'göre']
BILDIRIM = ['program', 'birim', 'kullan', 'arayüz', 'uygulama', 'değişken', 'sabit', 'tip', 'prosedür', 'fonksiyon',
            'kurucu', 'sınıf', 'kayıt', 'dizi', 'dizisi', 'listesi', 'sözlüğü']
NITELEYICI = ['sanal', 'ezer', 'soyut', 'ileri', 'özel', 'genel', 'korumalı']
ISLEC = ['ve', 'veya', 'yada', 'değil', 'mod', 'böl']
SABIT = ['doğru', 'yanlış', 'boş']
OZEL = ['kendi', 'miras']
TIPLER = ['tamsayı', 'ondalık', 'gerçek', 'metin', 'karakter', 'mantıksal', 'liste', 'sözlük', 'tensör', 'herhangi',
          'nesne', 'işlev']
YERLESIK = ['yaz', 'oku', 'Uzunluk', 'Metin', 'Tamsayı', 'Ondalık', 'Ekle', 'Sil', 'İçerir', 'Sırala', 'Ters',
            'Aralık', 'Toplam', 'Min', 'Maks', 'Mutlak', 'Yuvarla', 'Kök', 'Kare', 'Rastgele', 'Biçimle', 'Ayır',
            'Birleştir', 'BüyükHarf', 'KüçükHarf', 'Kırp', 'Değiştir', 'AltMetin', 'Konum', 'Anahtarlar', 'Değerler',
            'Eşle', 'Süz', 'İndirge', 'Kopya', 'Tür', 'iddia', 'Hata', 'Durdur', 'Say', 'Benzersiz', 'Dilim',
            'Numaralandır', 'Eşleştir', 'Artır', 'Azalt', 'Değiş', 'Sıra', 'Karakter', 'ÖrneğiMi']
BIRIMLER = ['Matematik', 'Sistem', 'Veri', 'YZ', 'Kuantum', 'Meşale', 'Sinir', 'Donanım', 'Pencere', 'UI', 'Mobil',
            'Mobile', 'Güvenlik', 'Security', 'Takvim', 'Calendar', 'Desen', 'Regex', 'Ağ', 'Net', 'Http', 'Veritabanı', 'Sunucu', 'Arama', 'Dil', 'İstatistik', 'Istatistik', 'MakineÖğrenmesi', 'Uzman',
            'KuantumAlgoritmaları']

AD = r'[\p{L}_][\p{L}\p{N}_]*'
dilbilgisi = {
    '$schema': 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
    'name': 'Yöntem',
    'scopeName': 'source.yontem',
    'patterns': [{'include': '#yorum'}, {'include': '#metin'}, {'include': '#sayi'}, {'include': '#bildirim'},
                 {'include': '#sozcukler'}, {'include': '#islec'}, {'include': '#cagri'}],
    'repository': {
        'yorum': {'patterns': [
            {'name': 'comment.block.yontem', 'begin': r'\{', 'end': r'\}'},
            {'name': 'comment.block.yontem', 'begin': r'\(\*', 'end': r'\*\)'},
            {'name': 'comment.line.double-slash.yontem', 'match': r'//.*$'},
        ]},
        'metin': {'patterns': [
            # Ek: 1'den 10'a, n'e, (n - 1)'e — metin başlangıcı değildir
            {'match': r"(?<=[\p{L}\p{N}_\)\]])(['’](?:[nN]?[dD][eEaA][nN]|[tT][eEaA][nN]|[yYnN]?[eEaA]))(?![\p{L}])",
             'captures': {'1': {'name': 'keyword.other.ek.yontem'}}},
            # Biçimli metin: $'Merhaba {ad}', $"...", $"""..."""
            {'name': 'string.quoted.triple.interpolated.yontem', 'begin': r'\$"""', 'end': '"""',
             'patterns': [{'include': '#yerlestirme'}]},
            {'name': 'string.quoted.single.interpolated.yontem', 'begin': r"\$'", 'end': "'(?!')",
             'patterns': [{'name': 'constant.character.escape.yontem', 'match': "''"}, {'include': '#yerlestirme'}]},
            {'name': 'string.quoted.double.interpolated.yontem', 'begin': r'\$"', 'end': '"',
             'patterns': [{'name': 'constant.character.escape.yontem', 'match': r'\\.'}, {'include': '#yerlestirme'}]},
            # Çok satırlı metin: """ ... """ (kaçış yok)
            {'name': 'string.quoted.triple.yontem', 'begin': '"""', 'end': '"""'},
            {'name': 'string.quoted.single.yontem', 'begin': "'", 'end': "'(?!')",
             'patterns': [{'name': 'constant.character.escape.yontem', 'match': "''"}]},
            {'name': 'string.quoted.double.yontem', 'begin': '"', 'end': '"',
             'patterns': [{'name': 'constant.character.escape.yontem', 'match': r'\\.'}]},
            {'name': 'constant.character.yontem', 'match': r'#\d+'},
        ]},
        'yerlestirme': {'patterns': [
            {'name': 'constant.character.escape.yontem', 'match': r'\{\{|\}\}'},
            {'name': 'meta.embedded.expression.yontem', 'begin': r'\{', 'end': r'\}',
             'beginCaptures': {'0': {'name': 'punctuation.section.embedded.begin.yontem'}},
             'endCaptures': {'0': {'name': 'punctuation.section.embedded.end.yontem'}},
             'patterns': [{'include': '#metin'}, {'include': '#sayi'}, {'include': '#sozcukler'}, {'include': '#islec'}, {'include': '#cagri'}]},
        ]},
        'sayi': {'patterns': [
            {'name': 'constant.numeric.hex.yontem', 'match': r'\$[0-9a-fA-F]+'},
            {'name': 'constant.numeric.yontem', 'match': r'(?<![\p{L}_])\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?'},
        ]},
        'bildirim': {'patterns': [
            {'match': '(' + sozcuk(['program', 'birim']) + r')\s+(' + AD + ')',
             'captures': {'1': {'name': 'keyword.other.yontem'}, '2': {'name': 'entity.name.namespace.yontem'}}},
            {'match': '(' + sozcuk(['prosedür', 'fonksiyon', 'kurucu']) + r')\s+(' + AD + r'(?:\.' + AD + ')?)',
             'captures': {'1': {'name': 'storage.type.function.yontem'}, '2': {'name': 'entity.name.function.yontem'}}},
            {'match': '(' + AD + r')\s*(=)\s*(' + sozcuk(['sınıf', 'kayıt']) + ')',
             'captures': {'1': {'name': 'entity.name.type.yontem'}, '2': {'name': 'keyword.operator.yontem'},
                          '3': {'name': 'storage.type.class.yontem'}}},
        ]},
        'sozcukler': {'patterns': [
            {'name': 'keyword.control.yontem', 'match': sozcuk(DENETIM)},
            {'name': 'storage.type.function.yontem', 'match': sozcuk(['prosedür', 'fonksiyon', 'kurucu'])},
            {'name': 'keyword.other.yontem', 'match': sozcuk(BILDIRIM)},
            {'name': 'storage.modifier.yontem', 'match': sozcuk(NITELEYICI)},
            {'name': 'keyword.operator.word.yontem', 'match': sozcuk(ISLEC)},
            {'name': 'constant.language.yontem', 'match': sozcuk(SABIT)},
            {'name': 'variable.language.yontem', 'match': sozcuk(OZEL)},
            {'name': 'support.type.yontem', 'match': sozcuk(TIPLER)},
            {'name': 'support.class.yontem', 'match': sozcuk(BIRIMLER)},
            {'name': 'support.function.yontem', 'match': sozcuk(YERLESIK) + r'(?=\s*\()'},
        ]},
        'islec': {'patterns': [
            {'name': 'keyword.operator.assignment.yontem', 'match': r':=|\+=|-=|\*=|/='},
            {'name': 'keyword.operator.yontem', 'match': r'\|>|=>|\*\*|<>|<=|>=|\.\.|[+\-*/=<>@^]'},
        ]},
        'cagri': {'patterns': [
            {'match': '(' + AD + r')(?=\s*\()', 'captures': {'1': {'name': 'entity.name.function.call.yontem'}}},
        ]},
    },
}

yol = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'syntaxes', 'yontem.tmLanguage.json')
with open(yol, 'w', encoding='utf-8') as f:
    json.dump(dilbilgisi, f, ensure_ascii=False, indent=1)
    f.write('\n')
print('yazıldı:', yol)
