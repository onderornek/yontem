#!/usr/bin/env python3
"""Birimler kılavuzunu üretir: basim/birimler.sablon.md içindeki <<kod:ad>>, <<cikti:ad>> ve <<oturum:ad>> yer tutucularına
birim_kilavuzu/ad.y programını ve ad.beklenen çıktısını koyar. Böylece kılavuzdaki her program ve çıktı,
testlerin çalıştırdığı dosyaların kendisidir.   python3 basim/birimler_uret.py"""
import os
import re

BURASI = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(BURASI)


def oku(ad, uzanti):
    with open(os.path.join(KOK, 'birim_kilavuzu', ad + uzanti), encoding='utf-8') as f:
        return f.read().rstrip('\n')


def koy(m):
    tur, ad = m.group(1), m.group(2)
    if tur == 'kod':
        return '```pascal\n' + oku(ad, '.y') + '\n```'
    # oturum: hata ayıklayıcı oturumu (js/betikler/ayiklayici_testi.js --guncelle ile üretilir ve sınanır)
    return '```\n' + oku(ad, '.beklenen' if tur == 'cikti' else '.oturum') + '\n```'


with open(os.path.join(BURASI, 'birimler.sablon.md'), encoding='utf-8') as f:
    md = re.sub(r'^<<(kod|cikti|oturum):([\w]+)>>$', koy, f.read(), flags=re.M)
for hedef in (os.path.join(BURASI, 'birimler.md'), os.path.join(KOK, 'site', 'kaynak', 'birimler.md')):
    with open(hedef, 'w', encoding='utf-8') as f:
        f.write(md)
    print('yazıldı:', os.path.relpath(hedef, KOK))
