#!/usr/bin/env python3
"""Yerel asistan kılavuzunu üretir: basim/asistan.sablon.md içindeki yer tutucuları asistan_ornekleri/ klasöründeki
dosyalarla doldurur. Böylece kılavuzdaki her program ve çıktı, testin (js/betikler/asistan_testi.js) çalıştırdığı
dosyaların kendisidir.   python3 basim/asistan_uret.py
  <<kod:ad>>     ad.y programı ya da birimi
  <<cikti:ad>>   ad.beklenen.txt
  <<oturum:ad>>  ad.beklenen.txt; '> ' istemlerinin ardına sinama/ad.girdi.txt satırları eklenir
  <<dosya:yol>>  klasördeki bir dosyanın içeriği"""
import os
import re

BURASI = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(BURASI)
KLASOR = os.path.join(KOK, 'asistan_ornekleri')


def oku(yol):
    with open(os.path.join(KLASOR, yol), encoding='utf-8') as f:
        return f.read().rstrip('\n')


def koy(m):
    tur, ad = m.group(1), m.group(2)
    if tur == 'kod':
        return '```pascal\n' + oku(ad + '.y') + '\n```'
    if tur == 'dosya':
        return '```\n' + oku(ad) + '\n```'
    cikti = oku(ad + '.beklenen.txt')
    if tur == 'oturum':
        girdiler = iter(oku(f'sinama/{ad}.girdi.txt').split('\n'))
        cikti = re.sub(r'^> ', lambda _: '> ' + next(girdiler, '') + '\n', cikti, flags=re.M)
    return '```\n' + cikti + '\n```'


with open(os.path.join(BURASI, 'asistan.sablon.md'), encoding='utf-8') as f:
    md = re.sub(r'^<<(kod|cikti|oturum|dosya):([\w./]+)>>$', koy, f.read(), flags=re.M)
assert '<<' not in md, 'doldurulmamış yer tutucu kaldı'
hedef = os.path.join(BURASI, 'asistan.md')
with open(hedef, 'w', encoding='utf-8') as f:
    f.write(md)
print('yazıldı:', os.path.relpath(hedef, KOK))
