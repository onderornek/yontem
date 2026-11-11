#!/usr/bin/env python3
"""Doc'tan dışa aktarılan Markdown'ı kitap dizgisine hazırlar.
Başlık, tarih ve telif satırlarını atar; ön kısım / ana kısım / ekler ayrımını
ham LaTeX işaretleriyle ekler. Bölüm ve kesim başlıklarını Lua süzgeci işler."""
import re
import sys

RAW = lambda s: f"\n```{{=latex}}\n{s}\n```\n"


def temizle(md: str) -> str:
    satirlar = md.split('\n')
    assert satirlar[0].startswith('# ')
    govde = '\n'.join(satirlar[1:])
    govde = re.sub(r'^\s*\w{3} \d{1,2}, \d{4} · @.*\n', '', govde, count=1, flags=re.M)
    govde = re.sub(r'^\*Telif hakkı ©.*\*\s*\n', '', govde, count=1, flags=re.M)
    return govde.strip('\n') + '\n'


def kitap(md: str) -> str:
    g = temizle(md)
    # Önsöz: "Kurulum"dan önceki kısım ön kısımda kalır; Kurulum, İlk program ve
    # Etkileşimli kabuk ana kısmın başındaki "Başlamadan önce" bölümüne taşınır.
    g = g.replace('### Kurulum', RAW('\\mainmatter') + '\n## Başlamadan önce\n\n### Kurulum', 1)
    return g


def kilavuz(md: str) -> str:
    g = temizle(md)
    g = '## Önsöz\n\n' + g
    g = g.replace('## Başlarken', RAW('\\mainmatter') + '\n## Giriş\n\n### Başlarken', 1)
    g = g.replace('## Kodları çalıştırmak', '### Kodları çalıştırmak', 1)
    g = g.replace('## Kullanılan araçlar', '### Kullanılan araçlar', 1)
    g = g.replace('## Ek — ', '## Ek A — ', 1)
    return g


def llm(md: str) -> str:
    g = temizle(md)
    sayac = [0]
    def sekil(m):
        sayac[0] += 1
        alt = ['Dil modeli metni bir döngüyle, karakter karakter üretir',
               'Küçük GPT\'nin katmanları: iki Transformer bloğu',
               'Küçük GPT\'nin eğitimi: her 250 adımda ölçülen eğitim ve doğrulama kaybı'][sayac[0] - 1]
        return f'![{alt}](sekil{sayac[0]}.png){{width=100%}}'
    g = re.sub(r'&#91;embedded content: (.*?)\\\]', sekil, g)
    g = g.replace('## Bölüm 1 — ', RAW('\\mainmatter') + '\n## Bölüm 1 — ', 1)
    return g


def kurulum(md: str) -> str:
    g = temizle(md)
    g = g.replace('## Hangi kurulum size uygun?', RAW('\\mainmatter') + '\n## Hangi kurulum size uygun?', 1)
    return g


def birimler(md: str) -> str:
    g = temizle(md)
    g = g.replace('## Bu kılavuz ne anlatır?', RAW('\\mainmatter') + '\n## Bu kılavuz ne anlatır?', 1)
    return g


if __name__ == '__main__':
    tur, giris, cikis = sys.argv[1:4]
    md = open(giris, encoding='utf-8').read()
    out = {'kitap': kitap, 'kilavuz': kilavuz, 'llm': llm, 'kurulum': kurulum, 'birimler': birimler}[tur](md)
    open(cikis, 'w', encoding='utf-8').write(out)
