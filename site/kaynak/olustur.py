#!/usr/bin/env python3
"""yontem.pro için kitapların çevrim içi (HTML) sürümlerini üretir.

Kaynak: bu klasördeki Markdown dosyaları (Claude Docs'tan dışa aktarılan, PDF'lerle aynı metin).
Çıktı:  ../kitaplar/  — kitaplık sayfası, her kitap için içindekiler ve bölüm sayfaları,
        isteğe bağlı PDF indirme bağlantısı.

Kullanım:  python3 olustur.py          (pandoc 3 gerekir)
"""
import html
import os
import re
import shutil
import subprocess
import unicodedata

KAYNAK = os.path.dirname(os.path.abspath(__file__))
CIKTI = os.path.join(KAYNAK, '..', 'kitaplar')
TELIF = ('Telif hakkı © 2026 Önder Örnek. Metin <a rel="license" href="https://creativecommons.org/licenses/by/4.0/deed.tr">CC BY 4.0</a>, '
         'örnek programlar MIT lisanslıdır.')

KITAPLAR = [
    {'kisa': 'programlamaya-giris', 'md': 'kitap.md', 'baslik': 'Yöntem ile Programlamaya Giriş',
     'alt': 'Dilin tamamı, ilk programdan sınıflara, birimlere ve sinir ağlarına',
     'tur': 'Kitap', 'pdf': 'Yontem_ile_Programlamaya_Giris.pdf', 'renk': '#0F1B2D'},
    {'kisa': 'makine-ogrenmesi', 'md': 'kilavuz.md', 'baslik': 'Yöntem ile Makine Öğrenmesi',
     'alt': '20 algoritma, her biri baştan sona okunabilen bir programla',
     'tur': 'Kılavuz', 'pdf': 'Yontem_ile_Makine_Ogrenmesi.pdf', 'renk': '#0B7A75'},
    {'kisa': 'sifirdan-dil-modeli', 'md': 'llm.md', 'baslik': 'Yöntem ile Sıfırdan Dil Modeli',
     'alt': 'Tensörlerden Transformer\'a, küçük bir GPT\'yi baştan sona kurmak',
     'tur': 'Kitap', 'pdf': 'Yontem_ile_Sifirdan_Dil_Modeli.pdf', 'renk': '#334155'},
    {'kisa': 'kurulum', 'md': 'kurulum.md', 'baslik': 'Yöntem Kurulum Kılavuzu',
     'alt': 'Windows, macOS ve Linux\'ta kurulum, ESP32 desteği ve sık karşılaşılan sorunlar',
     'tur': 'Kılavuz', 'pdf': 'Yontem_Kurulum_Kilavuzu.pdf', 'renk': '#FFFFFF'},
    {'kisa': 'birimler', 'md': 'birimler.md', 'baslik': 'Yöntem Birimler ve Araçlar Kılavuzu',
     'alt': 'Arayüz, mobil, güvenlik, takvim, düzenli ifadeler ve ağ birimleri; test, biçimlendirme ve paketleme araçları',
     'tur': 'Kılavuz', 'pdf': 'Yontem_Birimler_ve_Araclar_Kilavuzu.pdf', 'renk': '#3B2F5C'},
    {'kisa': 'dil-basvurusu', 'md': 'basvuru.md', 'baslik': 'Yöntem Dil Başvurusu',
     'alt': 'Sözcük yapısı, tipler, ifadeler, deyimler, sınıflar ve birimler; dilbilgisinin tamamı',
     'tur': 'Başvuru', 'pdf': 'Yontem_Dil_Basvurusu.pdf', 'renk': '#7A3E0B'},
]


# ------------------------------------------------------------------ Markdown hazırlığı
def temizle(md):
    satirlar = md.split('\n')
    assert satirlar[0].startswith('# ')
    g = '\n'.join(satirlar[1:])
    g = re.sub(r'^\s*\w{3} \d{1,2}, \d{4} · @.*\n', '', g, count=1, flags=re.M)
    g = re.sub(r'^\*Telif hakkı ©.*\*\s*\n', '', g, count=1, flags=re.M)
    return g.strip('\n') + '\n'


def hazirla(kitap, md):
    g = temizle(md)
    if kitap['md'] == 'kitap.md':
        g = g.replace('### Kurulum', '## Başlamadan önce\n\n### Kurulum', 1)
    elif kitap['md'] == 'kilavuz.md':
        g = '## Önsöz\n\n' + g
        g = g.replace('## Başlarken', '## Giriş\n\n### Başlarken', 1)
        g = g.replace('## Kodları çalıştırmak', '### Kodları çalıştırmak', 1)
        g = g.replace('## Kullanılan araçlar', '### Kullanılan araçlar', 1)
        g = g.replace('## Ek — ', '## Ek A — ', 1)
    elif kitap['md'] == 'llm.md':
        alt = ['Dil modeli metni bir döngüyle, karakter karakter üretir',
               'Küçük GPT\'nin katmanları: iki Transformer bloğu',
               'Küçük GPT\'nin eğitimi: her 250 adımda ölçülen eğitim ve doğrulama kaybı']
        sayac = [0]

        def sekil(_m):
            sayac[0] += 1
            return f'![{alt[sayac[0] - 1]}](sekil{sayac[0]}.png)'
        g = re.sub(r'&#91;embedded content: (.*?)\\\]', sekil, g)
    return g


def html_uret(md):
    p = subprocess.run(['pandoc', '-f', 'markdown', '-t', 'html5', '--mathml', '--wrap=none',
                        '--lua-filter', os.path.join(KAYNAK, 'web.lua')],
                       input=md, capture_output=True, text=True, check=True)
    return p.stdout


# ------------------------------------------------------------------ yardımcılar
TR = str.maketrans('çğıöşüâîûÇĞİÖŞÜÂÎÛ', 'cgiosuaiuCGIOSUAIU')


def kisalt(s):
    s = s.translate(TR)
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()
    return s[:60] or 'bolum'


def etiketsiz(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def bol(govde):
    """HTML gövdesini <h2> başlıklarından bölümlere ayırır."""
    parcalar = re.split(r'(?=<h2[ >])', govde)
    bolumler = []
    for p in parcalar:
        m = re.match(r'<h2[^>]*>(.*?)</h2>', p, flags=re.S)
        if not m:
            if p.strip():
                raise SystemExit('h2 öncesinde içerik var')
            continue
        baslik = etiketsiz(m.group(1))
        altlar = [(re.search(r'id="([^"]+)"', a).group(1) if re.search(r'id="([^"]+)"', a) else '',
                   etiketsiz(b)) for a, b in re.findall(r'<h3([^>]*)>(.*?)</h3>', p, flags=re.S)]
        bolumler.append({'baslik': baslik, 'baslik_html': m.group(1), 'html': p, 'altlar': altlar})
    for i, b in enumerate(bolumler):
        b['dosya'] = f'{i + 1:02d}-{kisalt(b["baslik"])}.html'
    return bolumler


def e(s):
    return html.escape(s, quote=True)


# ------------------------------------------------------------------ sayfa iskeleti
def sayfa(baslik, aciklama, govde, kok, sinif=''):
    return f'''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(baslik)}</title>
<meta name="description" content="{e(aciklama)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@400;600&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&amp;family=Space+Grotesk:wght@500;600;700&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="{kok}stil.css">
</head>
<body class="{sinif}">
<a class="atla" href="#icerik">İçeriğe geç</a>
<header class="ust">
  <nav aria-label="Ana menü">
    <a class="logo" href="/">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0B7A75"/><path d="M8.5 11.5L16 19.5l7.5-8M16 19.5V25.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13.1" cy="8.3" r="1.75" fill="#fff"/><circle cx="18.9" cy="8.3" r="1.75" fill="#fff"/></svg>
      <span>yöntem</span>
    </a>
    <div class="menu">
      <a href="/ogren">Öğren</a>
      <a href="{kok}index.html" aria-current="{'page' if sinif == 'kitaplik' else 'true'}">Kitaplar</a>
      <a href="{kok}kurulum/index.html">Kurulum</a>
      <a class="dugme" href="/dene">Oyun alanı</a>
    </div>
  </nav>
</header>
{govde}
<footer class="alt">
  <span>{TELIF}</span>
  <span><a href="/">yontem.pro</a> · <a href="/gizlilik">Gizlilik</a> · <a href="/kunye">Künye</a></span>
</footer>
<script>
if (window.matchMedia('(max-width: 860px)').matches) {{
  document.querySelectorAll('.yan details').forEach(function (d) {{ d.removeAttribute('open'); }});
}}
document.querySelectorAll('.kopyala').forEach(function (d) {{
  d.addEventListener('click', function () {{
    var kod = d.parentNode.querySelector('code').innerText;
    navigator.clipboard.writeText(kod).then(function () {{
      d.textContent = 'Kopyalandı';
      setTimeout(function () {{ d.textContent = 'Kopyala'; }}, 1500);
    }});
  }});
}});
</script>
</body>
</html>
'''


def kapak(k, buyuk=False):
    acik = k['renk'].upper() == '#FFFFFF'
    return (f'<div class="kapak{" buyuk" if buyuk else ""}{" acik" if acik else ""}" style="background:{k["renk"]}" aria-hidden="true">'
            f'<span>{e(k["baslik"])}</span>'
            '<svg viewBox="5 5 22 22"><path d="M8.5 11.5L16 19.5l7.5-8M16 19.5V25.5" fill="none" stroke="currentColor" stroke-width="2.8" '
            'stroke-linecap="round" stroke-linejoin="round"/><circle cx="13.1" cy="8.3" r="1.75" fill="currentColor"/>'
            '<circle cx="18.9" cy="8.3" r="1.75" fill="currentColor"/></svg></div>')


def pdf_dugmesi(k, kok_pdf):
    if not k.get('pdf_var'):
        return ''
    boyut = k['pdf_boyut']
    return (f'<a class="pdf" href="{kok_pdf}{k["pdf"]}" download>'
            f'<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            f'PDF sürümü <small>(isteğe bağlı, {boyut})</small></a>')


def kitap_uret(k):
    md = open(os.path.join(KAYNAK, k['md']), encoding='utf-8').read()
    bolumler = bol(html_uret(hazirla(k, md)))
    hedef = os.path.join(CIKTI, k['kisa'])
    os.makedirs(hedef, exist_ok=True)
    for f in os.listdir(hedef):
        if f.endswith('.html'):
            os.remove(os.path.join(hedef, f))
    for i in (1, 2, 3):
        if k['md'] == 'llm.md':
            shutil.copy(os.path.join(KAYNAK, f'sekil{i}.png'), hedef)
    k['bolum_sayisi'] = len(bolumler)

    # İçindekiler (kitap ana sayfası)
    satirlar = []
    for b in bolumler:
        alt = ''.join(f'<li><a href="{b["dosya"]}#{a}">{e(t)}</a></li>' for a, t in b['altlar'])
        satirlar.append(f'<li><a class="bolum" href="{b["dosya"]}">{b["baslik_html"]}</a>'
                        + (f'<ul>{alt}</ul>' if alt else '') + '</li>')
    govde = f'''<main id="icerik" class="kitap-giris">
  <div class="kitap-ust">
    {kapak(k, True)}
    <div class="kitap-bilgi">
      <span class="tur">{k["tur"]} · {len(bolumler)} bölüm</span>
      <h1>{e(k["baslik"])}</h1>
      <p class="ozet">{e(k["alt"])}</p>
      <p class="yazar">Önder Örnek</p>
      <div class="eylemler">
        <a class="birincil" href="{bolumler[0]["dosya"]}">Çevrim içi sürüm</a>
        {pdf_dugmesi(k, '')}
      </div>
    </div>
  </div>
  <section class="icindekiler" aria-labelledby="icd">
    <h2 id="icd">İçindekiler</h2>
    <ol>{''.join(satirlar)}</ol>
  </section>
</main>'''
    open(os.path.join(hedef, 'index.html'), 'w', encoding='utf-8').write(
        sayfa(f'{k["baslik"]} · yontem.pro', k['alt'], govde, '../', 'kitap-ana'))

    # Bölüm sayfaları
    for i, b in enumerate(bolumler):
        yan = ''.join(f'<li><a href="{x["dosya"]}"{" aria-current=\"page\"" if x is b else ""}>{x["baslik_html"]}</a></li>'
                      for x in bolumler)
        bu = ''.join(f'<li><a href="#{a}">{e(t)}</a></li>' for a, t in b['altlar'])
        onceki = bolumler[i - 1] if i > 0 else None
        sonraki = bolumler[i + 1] if i + 1 < len(bolumler) else None
        gezinti = '<nav class="sayfala" aria-label="Bölümler arası">'
        gezinti += (f'<a class="onceki" href="{onceki["dosya"]}"><small>Önceki</small>{onceki["baslik_html"]}</a>'
                    if onceki else '<span></span>')
        gezinti += (f'<a class="sonraki" href="{sonraki["dosya"]}"><small>Sonraki</small>{sonraki["baslik_html"]}</a>'
                    if sonraki else f'<a class="sonraki" href="index.html"><small>Bitti</small>İçindekiler</a>')
        gezinti += '</nav>'
        govde = f'''<div class="okuma">
  <aside class="yan" aria-label="Kitabın bölümleri">
    <details open>
      <summary><a href="index.html">{e(k["baslik"])}</a></summary>
      <ol>{yan}</ol>
      {pdf_dugmesi(k, '')}
    </details>
  </aside>
  <main id="icerik" class="metin">
    <p class="iz"><a href="../index.html">Kitaplar</a> / <a href="index.html">{e(k["baslik"])}</a> / Bölüm {i + 1} / {len(bolumler)}</p>
    {b["html"]}
    {gezinti}
  </main>
  <aside class="bu-bolumde" aria-label="Bu bölümde">{('<span>Bu bölümde</span><ol>' + bu + '</ol>') if bu else ''}</aside>
</div>'''
        open(os.path.join(hedef, b['dosya']), 'w', encoding='utf-8').write(
            sayfa(f'{b["baslik"]} · {k["baslik"]}', k['alt'], govde, '../', 'bolum-sayfa'))
    return bolumler


# ------------------------------------------------------------------ tek dosyalık kitap
TEK_EK_CSS = """
.tek .okuma { grid-template-columns: 280px minmax(0, 1fr); }
.tek .bolum-blok { scroll-margin-top: 88px; }
.tek.js .bolum-blok { display: none; }
.tek.js .bolum-blok.acik { display: block; }
.tek .bolum-blok + .bolum-blok { margin-top: 72px; }
.tek.js .bolum-blok + .bolum-blok { margin-top: 0; }
.tek .sayfala button { display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; border: 1px solid var(--cizgi);
  border-radius: 12px; background: none; color: var(--murekkep); font: 600 16px 'Space Grotesk', sans-serif; text-align: left;
  line-height: 1.35; cursor: pointer; }
.tek .sayfala button:hover { border-color: var(--vurgu); }
.tek .sayfala button.sonraki { text-align: right; grid-column: 2; align-items: flex-end; }
.tek .sayfala small { font: 500 13px 'Inter', sans-serif; color: var(--soluk); }
.tek .sayfala { display: none; }
.tek.js .sayfala { display: grid; }
.tek-kapak { display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-end; padding: 8px 0 40px; margin-bottom: 40px; border-bottom: 1px solid var(--cizgi); }
.tek-kapak h1 { font-size: 40px; line-height: 1.08; margin: 8px 0 10px; letter-spacing: -0.03em; }
.tek-kapak .ozet { font-size: 18px; }
@media (max-width: 1200px) { .tek .okuma { grid-template-columns: 240px minmax(0, 1fr); } }
@media (max-width: 860px) { .tek .okuma { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .tek .sayfala button.sonraki { grid-column: 1; } }
@media print { .tek .bolum-blok { display: block !important; } .tek-kapak .eylemler { display: none; } }
"""

TEK_JS = """
(function () {
  var govde = document.body; govde.classList.add('js');
  var bloklar = Array.prototype.slice.call(document.querySelectorAll('.bolum-blok'));
  var linkler = Array.prototype.slice.call(document.querySelectorAll('.yan li a'));
  var onceki = document.getElementById('onceki'), sonraki = document.getElementById('sonraki');
  var aktif = 0;
  function goster(i, hedef) {
    aktif = Math.max(0, Math.min(bloklar.length - 1, i));
    bloklar.forEach(function (b, j) { b.classList.toggle('acik', j === aktif); });
    linkler.forEach(function (a, j) { if (j === aktif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var o = bloklar[aktif - 1], s = bloklar[aktif + 1];
    onceki.style.visibility = o ? 'visible' : 'hidden';
    if (o) onceki.querySelector('span').textContent = o.getAttribute('data-baslik');
    sonraki.style.visibility = s ? 'visible' : 'hidden';
    if (s) sonraki.querySelector('span').textContent = s.getAttribute('data-baslik');
    var kapak = document.querySelector('.tek-kapak');
    if (kapak) kapak.style.display = aktif === 0 ? '' : 'none';
    var t = hedef ? document.getElementById(hedef) : null;
    setTimeout(function () { if (t && t !== bloklar[aktif]) t.scrollIntoView(); else window.scrollTo(0, 0); }, 0);
  }
  function hashten() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) { goster(0); return; }
    var el = document.getElementById(id);
    if (!el) { goster(0); return; }
    var blok = el.closest('.bolum-blok');
    goster(blok ? bloklar.indexOf(blok) : 0, id);
  }
  window.addEventListener('hashchange', hashten);
  onceki.addEventListener('click', function () { location.hash = bloklar[aktif - 1].id; });
  sonraki.addEventListener('click', function () { location.hash = bloklar[aktif + 1].id; });
  if (window.matchMedia('(max-width: 860px)').matches) {
    document.querySelectorAll('.yan details').forEach(function (d) { d.removeAttribute('open'); });
  }
  hashten();
})();
document.querySelectorAll('.kopyala').forEach(function (d) {
  d.addEventListener('click', function () {
    var kod = d.parentNode.querySelector('code').innerText;
    navigator.clipboard.writeText(kod).then(function () {
      d.textContent = 'Kopyalandı';
      setTimeout(function () { d.textContent = 'Kopyala'; }, 1500);
    });
  });
});
"""


def tek_dosya(k, bolumler):
    """Kitabın tamamını tek, kendi kendine yeten bir HTML dosyasına yazar (stil, resimler ve betik içinde)."""
    import base64
    css = open(os.path.join(KAYNAK, 'stil.css'), encoding='utf-8').read() + TEK_EK_CSS
    yan, bloklar = [], []
    for i, b in enumerate(bolumler):
        bid = f'b{i + 1:02d}'
        yan.append(f'<li><a href="#{bid}">{b["baslik_html"]}</a></li>')
        ic = b['html']
        # h2'nin kendi id'sini blok id'si yap; resimleri gömülü veriye çevir
        ic = re.sub(r'<h2([^>]*)>', '<h2>', ic, count=1)
        def gom(m):
            yol = os.path.join(KAYNAK, m.group(1))
            if not os.path.exists(yol):
                return m.group(0)
            veri = base64.b64encode(open(yol, 'rb').read()).decode()
            return f'src="data:image/png;base64,{veri}"'
        ic = re.sub(r'src="([^"/:]+\.png)"', gom, ic)
        bloklar.append(f'<section class="bolum-blok" id="{bid}" data-baslik="{e(b["baslik"])}">{ic}</section>')
    pdf = (f'<a class="pdf" href="{k["kisa"]}/{k["pdf"]}" download>PDF sürümü <small>(isteğe bağlı, {k["pdf_boyut"]})</small></a>'
           if k.get('pdf_var') else '')
    return f'''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(k["baslik"])} · yontem.pro</title>
<meta name="description" content="{e(k["alt"])}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@400;600&amp;family=Space+Grotesk:wght@500;600;700&amp;display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body class="tek">
<a class="atla" href="#icerik">İçeriğe geç</a>
<header class="ust">
  <nav aria-label="Ana menü">
    <a class="logo" href="https://yontem.pro/">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0B7A75"/><path d="M8.5 11.5L16 19.5l7.5-8M16 19.5V25.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13.1" cy="8.3" r="1.75" fill="#fff"/><circle cx="18.9" cy="8.3" r="1.75" fill="#fff"/></svg>
      <span>yöntem</span>
    </a>
    <div class="menu">
      <a href="https://yontem.pro/kitaplar/">Kitaplar</a>
      <a class="dugme" href="https://yontem.pro/dene">Oyun alanı</a>
    </div>
  </nav>
</header>
<div class="okuma">
  <aside class="yan" aria-label="Kitabın bölümleri">
    <details open>
      <summary><a href="#b01">{e(k["baslik"])}</a></summary>
      <ol>{"".join(yan)}</ol>
      {pdf}
    </details>
  </aside>
  <main id="icerik" class="metin">
    <div class="tek-kapak">
      {kapak(k)}
      <div>
        <span class="tur">{k["tur"]} · {len(bolumler)} bölüm · Önder Örnek</span>
        <h1>{e(k["baslik"])}</h1>
        <p class="ozet">{e(k["alt"])}</p>
      </div>
    </div>
    {"".join(bloklar)}
    <nav class="sayfala" aria-label="Bölümler arası">
      <button type="button" id="onceki" class="onceki"><small>Önceki bölüm</small><span></span></button>
      <button type="button" id="sonraki" class="sonraki"><small>Sonraki bölüm</small><span></span></button>
    </nav>
  </main>
</div>
<footer class="alt">
  <span>{TELIF}</span>
  <span><a href="https://yontem.pro/">yontem.pro</a> · <a href="https://yontem.pro/gizlilik.html">Gizlilik</a> · <a href="https://yontem.pro/kunye.html">Künye</a></span>
</footer>
<script>
{TEK_JS}
</script>
</body>
</html>
'''


def kitaplik():
    kartlar = []
    for k in KITAPLAR:
        kartlar.append(f'''<li class="kart">
      <a class="kart-kapak" href="{k["kisa"]}/index.html" tabindex="-1" aria-hidden="true">{kapak(k)}</a>
      <div>
        <span class="tur">{k["tur"]} · {k["bolum_sayisi"]} bölüm</span>
        <h2><a href="{k["kisa"]}/index.html">{e(k["baslik"])}</a></h2>
        <p>{e(k["alt"])}</p>
        <div class="eylemler">
          <a class="birincil" href="{k["kisa"]}.html">Çevrim içi sürüm</a>
          {pdf_dugmesi(k, k["kisa"] + "/")}
        </div>
      </div>
    </li>''')
    govde = f'''<main id="icerik" class="kitaplik-ana">
  <h1>Kitaplar ve kılavuzlar</h1>
  <p class="ozet">Hepsi tarayıcıda, ücretsiz okunur. Kitaptaki her program gerçekten çalıştırılmıştır; altındaki çıktı onun kendi çıktısıdır. Basılı düzen isteyenler için PDF de indirilebilir.</p>
  <p class="ozet" style="margin-top: 12px; font-size: 16px">Kitaplar <a rel="license" href="https://creativecommons.org/licenses/by/4.0/deed.tr">Creative Commons Atıf 4.0 (CC BY 4.0)</a> lisanslıdır: yazar adı belirtilerek paylaşabilir, çevirebilir, uyarlayabilir ve derslerinizde kullanabilirsiniz. Örnek programlar MIT lisanslıdır.</p>
  <ul class="kartlar">{''.join(kartlar)}</ul>
</main>'''
    open(os.path.join(CIKTI, 'index.html'), 'w', encoding='utf-8').write(
        sayfa('Kitaplar · yontem.pro', 'Yöntem kitapları ve kılavuzları: çevrim içi okuyabilir ya da PDF olarak indirebilirsiniz.',
              govde, '', 'kitaplik'))


def boyut_yaz(n):
    return f'{n / 1024:.0f} KB' if n < 1024 * 1024 else f'{n / 1024 / 1024:.1f} MB'.replace('.', ',')


if __name__ == '__main__':
    os.makedirs(CIKTI, exist_ok=True)
    shutil.copy(os.path.join(KAYNAK, 'stil.css'), CIKTI)
    for k in KITAPLAR:
        pdf = os.path.join(CIKTI, k['kisa'], k['pdf'])
        k['pdf_var'] = os.path.exists(pdf)
        k['pdf_boyut'] = boyut_yaz(os.path.getsize(pdf)) if k['pdf_var'] else ''
        bl = kitap_uret(k)
        tek = os.path.join(CIKTI, k['kisa'] + '.html')
        open(tek, 'w', encoding='utf-8').write(tek_dosya(k, bl))
        k['tek'] = k['kisa'] + '.html'
        print(f'{k["baslik"]}: {len(bl)} bölüm' + ('' if k['pdf_var'] else ' (PDF yok)'))
    kitaplik()
    print('yazıldı:', os.path.normpath(CIKTI))
