#!/usr/bin/env python3
"""Tüm testleri ve örnekleri çalıştırır.

Her .y dosyası çalıştırılır; yanında aynı adlı .beklenen dosyası varsa çıktı
onunla karşılaştırılır. Beklenen çıktıları yenilemek için: --guncelle
Python'da dakikalar süren örnekler yalnızca --yavas ile çalıştırılır.
"""
import os
import re
import subprocess
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YONTEM = os.path.join(KOK, 'yontem.py')
DIZINLER = [os.path.join(KOK, 'testler'), os.path.join(KOK, 'ornekler'), os.path.join(KOK, 'mesale_ornekleri'), os.path.join(KOK, 'arayuz_ornekleri'), os.path.join(KOK, 'guvenlik_ornekleri'), os.path.join(KOK, 'birim_kilavuzu')]
YAVAS = {'04_kucuk_gpt.y'}


def main():
    guncelle = '--guncelle' in sys.argv
    basarisiz = 0
    toplam = 0
    for dz in DIZINLER:
        for f in sorted(os.listdir(dz)):
            if not f.endswith('.y'):
                continue
            if f in YAVAS and '--yavas' not in sys.argv:
                continue
            with open(os.path.join(dz, f), encoding='utf-8') as kf:
                if re.match(r'\s*(?:\{[^}]*\}\s*)*birim\b', kf.read(400), re.I):
                    continue                     # birim dosyaları, onları kullanan programla sınanır
            toplam += 1
            yol = os.path.join(dz, f)
            beklenen_yol = yol[:-2] + '.beklenen'
            p = subprocess.run([sys.executable, YONTEM, yol], capture_output=True, text=True,
                               cwd=dz, timeout=900)
            ad = os.path.relpath(yol, KOK)
            if p.returncode != 0:
                basarisiz += 1
                print(f"BAŞARISIZ  {ad}  (çıkış kodu {p.returncode})\n{p.stderr}")
                continue
            if guncelle:
                with open(beklenen_yol, 'w', encoding='utf-8') as fh:
                    fh.write(p.stdout)
                print(f"güncellendi {ad}")
                continue
            if os.path.exists(beklenen_yol):
                with open(beklenen_yol, encoding='utf-8') as fh:
                    if fh.read() != p.stdout:
                        basarisiz += 1
                        print(f"BAŞARISIZ  {ad}  (çıktı beklenenden farklı)")
                        continue
            # 'sına' blokları: yanında .sina.beklenen varsa 'yontem sına' raporu da karşılaştırılır
            sina_yol = yol[:-2] + '.sina.beklenen'
            if os.path.exists(sina_yol):
                s = subprocess.run([sys.executable, YONTEM, 'sina', f], capture_output=True, text=True, cwd=dz, timeout=900)
                with open(sina_yol, encoding='utf-8') as fh:
                    if fh.read() != s.stdout or s.returncode > 1:
                        basarisiz += 1
                        print(f"BAŞARISIZ  {ad}  ('yontem sına' raporu beklenenden farklı)\n{s.stdout}{s.stderr}")
                        continue
            print(f"geçti      {ad}")
    print(f"\n{toplam - basarisiz}/{toplam} dosya geçti.")
    return 1 if basarisiz else 0


if __name__ == '__main__':
    sys.exit(main())
