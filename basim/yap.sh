#!/bin/bash
set -e
export LANG=C.UTF-8 LC_ALL=C.UTF-8
cd "$(dirname "$0")"
python3 hazirla.py kitap kitap.md kitap_h.md
python3 hazirla.py kilavuz kilavuz.md kilavuz_h.md
pandoc kitap_h.md -f markdown-auto_identifiers -t latex --columns=60 --lua-filter=kitap.lua --template=sablon.tex \
  -M title="Yöntem ile Programlamaya Giriş" -M author="Önder Örnek" -M kisa="Yöntem ile Programlamaya Giriş" -o kitap.tex
pandoc kilavuz_h.md -f markdown-auto_identifiers -t latex --columns=60 --lua-filter=kitap.lua --template=sablon.tex \
  -M title="Yöntem ile Makine Öğrenmesi" -M subtitle="20 Algoritma" -M author="Önder Örnek" -M kisa="Yöntem ile Makine Öğrenmesi" -o kilavuz.tex
python3 hazirla.py llm llm.md llm_h.md
pandoc llm_h.md -f markdown-auto_identifiers -t latex --columns=60 --lua-filter=kitap.lua --template=sablon.tex \
  -M title="Yöntem ile Sıfırdan Dil Modeli" -M author="Önder Örnek" -M kisa="Yöntem ile Sıfırdan Dil Modeli" -o llm.tex
python3 hazirla.py kurulum kurulum.md kurulum_h.md
pandoc kurulum_h.md -f markdown-auto_identifiers -t latex --columns=60 --lua-filter=kitap.lua --template=sablon.tex \
  -M title="Yöntem Kurulum Kılavuzu" -M author="Önder Örnek" -M kisa="Yöntem Kurulum Kılavuzu" -o kurulum.tex
python3 hazirla.py birimler birimler.md birimler_h.md     # birimler.md, birimler_uret.py ile üretilir
pandoc birimler_h.md -f markdown-auto_identifiers -t latex --columns=60 --lua-filter=kitap.lua --template=sablon.tex \
  -M title="Yöntem Birimler ve Araçlar Kılavuzu" -M author="Önder Örnek" -M kisa="Yöntem Birimler ve Araçlar Kılavuzu" -o birimler.tex
python3 hazirla.py basvuru basvuru.md basvuru_h.md
pandoc basvuru_h.md -f markdown-auto_identifiers -t latex --columns=60 --lua-filter=kitap.lua --template=sablon.tex \
  -M title="Yöntem Dil Başvurusu" -M author="Önder Örnek" -M kisa="Yöntem Dil Başvurusu" -o basvuru.tex
python3 hazirla.py asistan asistan.md asistan_h.md         # asistan.md, asistan_uret.py ile üretilir
pandoc asistan_h.md -f markdown-auto_identifiers -t latex --columns=60 --lua-filter=kitap.lua --template=sablon.tex \
  -M title="Yöntem ile Yerel Yapay Zekâ Asistanı" -M author="Önder Örnek" -M kisa="Yöntem ile Yerel Yapay Zekâ Asistanı" -o asistan.tex
for f in ${@:-kitap kilavuz llm kurulum birimler basvuru asistan}; do
  xelatex -interaction=nonstopmode -halt-on-error $f.tex > $f.log1 2>&1 || { tail -40 $f.log1; exit 1; }
  xelatex -interaction=nonstopmode -halt-on-error $f.tex > $f.log1 2>&1
  xelatex -interaction=nonstopmode -halt-on-error $f.tex > $f.log1 2>&1
done
