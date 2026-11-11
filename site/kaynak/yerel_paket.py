#!/usr/bin/env python3
"""yontem.pro'nun yerelde denenebilen tam kopyasını üretir ve ZIP'ler.

İçerik:
  index.html            ana sayfa (site/tasarim/Main.dc.html tasarımından)
  kurulum.html          kurulum sayfası (site/tasarim/Kurulum.dc.html)
  dene/index.html       oyun alanı (tarayıcıda Yöntem derleyicisi)
  kitaplar/             kitaplık, tek dosyalık kitaplar, bölüm sayfaları, PDF'ler
  yakinda.html          henüz hazır olmayan sayfalar için

Bütün bağlantılar görelidir: klasör bir web sunucusuyla da (python3 -m http.server)
dosyaya çift tıklayarak da açılır.

Kullanım:  python3 site/kaynak/yerel_paket.py   → site/yerel/yontem-site.zip
"""
import html
import os
import re
import shutil
import zipfile

KAYNAK = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(KAYNAK, '..'))
KOK = os.path.normpath(os.path.join(SITE, '..'))
CIKTI = os.path.join(SITE, 'yerel', 'yontem-site')
VURGU = '#0B7A75'

KITAP_SAYFASI = {
    'TWa36NMVWcS6m8eQh6Fg6E': 'programlamaya-giris',
    'MmL9YnghS5zo5YmVcyhvXQ': 'makine-ogrenmesi',
    'PFm6tEM9VgLYiRy7A9a84h': 'sifirdan-dil-modeli',
    'LPRDbAoY6XB3t8L3BTQ5gX': 'kurulum',
    'XPXqtZDhLvh51vHnQan8Kc': 'birimler',
}


def baglantilar(s, kok):
    """Site içi mutlak bağlantıları bu dosyanın derinliğine göre göreli yapar."""
    for kimlik, kisa in KITAP_SAYFASI.items():
        s = s.replace(f'https://claude.ai/artifact/{kimlik}', f'{kok}kitaplar/{kisa}.html')
    esle = [
        ('https://yontem.pro/kitaplar/', 'kitaplar/index.html'),
        ('https://yontem.pro/dene', 'dene/index.html'),
        ('https://yontem.pro/', 'index.html'),
        ('Main.dc.html', 'index.html'),
        ('Kurulum.dc.html', 'kurulum.html'),
    ]
    for a, b in esle:
        s = s.replace(f'href="{a}', f'href="{kok}{b}')
    yol = {
        '/': 'index.html', '/dene': 'dene/index.html', '/kitaplar/': 'kitaplar/index.html',
        '/kitaplar': 'kitaplar/index.html', '/ogren': 'kitaplar/programlamaya-giris.html',
        '/gomulu': 'kitaplar/kurulum.html#b05', '/belgeler': 'kitaplar/index.html',
        '/indir': 'kurulum.html', '/ogretmen': 'yakinda.html', '/topluluk': 'yakinda.html',
        '/blog': 'yakinda.html', '/gizlilik': 'yakinda.html',
    }

    def degistir(m):
        h = m.group(1)
        if h in yol:
            return f'href="{kok}{yol[h]}"'
        if h.startswith('/kitaplar/'):
            return f'href="{kok}{h[1:]}"'
        return m.group(0)
    return re.sub(r'href="(/[^"]*)"', degistir, s)


# ------------------------------------------------------------------ tasarım dosyasını düz HTML'e çevirme
ANAHTAR = {'program', 'fonksiyon', 'prosedür', 'başla', 'bitir', 'eğer', 'ise', 'değilse', 'dön', 'kullan',
           'değişken', 'sabit', 'için', 'her', 'kadar', 'iken', 'tekrarla', 'değil', 've', 'veya', 'doğru', 'yanlış'}
RENK = {'k': 'color: #5EEAD4; font-weight: 600', 's': 'color: #FBBF77', 'c': 'color: #94A3B8; font-style: italic',
        'n': 'color: #F9A8D4', 'd': 'color: #E2E8F0'}


def harf(c):
    return bool(re.match(r"[A-Za-zÇĞİÖŞÜçğıöşüâ_0-9]", c))


def satir_parcala(satir):
    out, i = [], 0
    while i < len(satir):
        c = satir[i]
        if c == '{':
            j = satir.find('}', i)
            son = len(satir) if j < 0 else j + 1
            out.append((satir[i:son], 'c')); i = son; continue
        if c == "'" and not (i > 0 and harf(satir[i - 1])):
            j = satir.find("'", i + 1)
            son = len(satir) if j < 0 else j + 1
            out.append((satir[i:son], 's')); i = son; continue
        if c.isdigit():
            j = i
            while j < len(satir) and (satir[j].isdigit() or satir[j] == '.'):
                j += 1
            out.append((satir[i:j], 'n')); i = j; continue
        if harf(c) or c == "'":
            j = i
            while j < len(satir) and (harf(satir[j]) or satir[j] == "'"):
                j += 1
            w = satir[i:j]
            out.append((w, 'k' if w in ANAHTAR else 'd')); i = j; continue
        j = i
        while j < len(satir) and not harf(satir[j]) and satir[j] not in "{'":
            j += 1
        out.append((satir[i:j], 'd')); i = j
    return ''.join(f'<span style="{RENK[t]}">{html.escape(m)}</span>' for m, t in out)


def js_dizgi(s):
    """Tasarım betiğindeki "..." JS dizgisini çözer."""
    return bytes(s, 'utf-8').decode('unicode_escape').encode('latin-1').decode('utf-8')


def ornekleri_oku(kaynak):
    ornekler = []
    for m in re.finditer(r"\{ ad: '([^']*)', komut: '([^']*)',\s*cikti: '((?:[^'\\]|\\.)*)',\s*kod: \"((?:[^\"\\]|\\.)*)\" \}", kaynak):
        ornekler.append({'ad': m.group(1), 'komut': m.group(2), 'cikti': js_dizgi(m.group(3)),
                         'kod': js_dizgi(m.group(4))})
    assert len(ornekler) == 3, 'örnekler okunamadı'
    return ornekler


SEKME_STIL = {
    True: 'font: 600 14px Inter, sans-serif; padding: 12px 16px; min-height: 44px; border: none; border-radius: 10px 10px 0 0; background: #1B2A40; color: #FFFFFF; cursor: pointer',
    False: 'font: 500 14px Inter, sans-serif; padding: 12px 16px; min-height: 44px; border: none; border-radius: 10px 10px 0 0; background: transparent; color: #94A3B8; cursor: pointer',
}


def duz_html(dc, baslik):
    head_ic = re.search(r'<helmet>(.*?)</helmet>', dc, flags=re.S).group(1)
    govde = re.search(r'</helmet>(.*?)</x-dc>', dc, flags=re.S).group(1)
    return head_ic, govde.replace('{{accent}}', VURGU)


def ana_sayfa(dc):
    head_ic, govde = duz_html(dc, '')
    ornekler = ornekleri_oku(dc)
    sekmeler = ''.join(
        f'<button type="button" role="tab" aria-selected="{"true" if i == 0 else "false"}" data-sekme="{i}" style="{SEKME_STIL[i == 0]}">{html.escape(o["ad"])}</button>'
        for i, o in enumerate(ornekler))
    govde = re.sub(r'<sc-for list="\{\{tabs\}\}".*?</sc-for>', sekmeler, govde, count=1, flags=re.S)
    pre_ac = re.search(r'(<pre [^>]*>)<sc-for list="\{\{satirlar\}\}"', govde).group(1)
    kodlar = ''
    for i, o in enumerate(ornekler):
        satirlar = ''.join(f'<div style="white-space: pre; min-height: 1.65em">{satir_parcala(s) if s else " "}</div>'
                           for s in o['kod'].split('\n'))
        kodlar += pre_ac.replace('<pre ', f'<pre data-ornek="{i}"{"" if i == 0 else " hidden"} ', 1) + satirlar + '</pre>'
    govde = re.sub(r'<pre [^>]*><sc-for list="\{\{satirlar\}\}".*?</sc-for></pre>', lambda m: kodlar, govde, count=1, flags=re.S)
    for alan in ('komut', 'cikti'):
        m = re.search(r'(<div [^>]*>)(\$ )?\{\{' + alan + r'\}\}</div>', govde)
        parcalar = ''.join(
            m.group(1).replace('<div ', f'<div data-ornek="{i}"{"" if i == 0 else " hidden"} ', 1)
            + (m.group(2) or '') + html.escape(o[alan]) + '</div>' for i, o in enumerate(ornekler))
        govde = govde.replace(m.group(0), parcalar, 1)
    betik = f'''<script>
document.querySelectorAll('[data-sekme]').forEach(function (b) {{
  b.addEventListener('click', function () {{
    var n = b.getAttribute('data-sekme');
    document.querySelectorAll('[data-sekme]').forEach(function (x) {{
      var secili = x === b;
      x.setAttribute('aria-selected', secili ? 'true' : 'false');
      x.setAttribute('style', secili ? {SEKME_STIL[True]!r} : {SEKME_STIL[False]!r});
    }});
    document.querySelectorAll('[data-ornek]').forEach(function (x) {{ x.hidden = x.getAttribute('data-ornek') !== n; }});
  }});
}});
</script>'''
    return sayfa('Yöntem — Türkçe düşün, her yerde çalıştır', head_ic, govde, betik)


def kurulum_sayfasi(dc):
    head_ic, govde = duz_html(dc, '')
    sistemler = ['Windows', 'macOS', 'Linux']
    stil = {True: 'font: 600 15px Inter, sans-serif; padding: 12px 18px; min-height: 44px; border: 1px solid #E3E8EF; border-bottom: none; border-radius: 10px 10px 0 0; background: #FFFFFF; color: #0F1B2D; cursor: pointer; margin-bottom: -1px',
            False: 'font: 500 15px Inter, sans-serif; padding: 12px 18px; min-height: 44px; border: 1px solid transparent; border-radius: 10px 10px 0 0; background: transparent; color: #475569; cursor: pointer'}
    dugmeler = ''.join(f'<button type="button" role="tab" aria-selected="{"true" if i == 0 else "false"}" data-sistem-sec="{i}" style="{stil[i == 0]}">{s}</button>'
                       for i, s in enumerate(sistemler))
    govde = re.sub(r'<sc-for list="\{\{sistemler\}\}".*?</sc-for>', dugmeler, govde, count=1, flags=re.S)
    for i, ad in enumerate(['windows', 'macos', 'linux']):
        govde = re.sub(r'<sc-if value="\{\{' + ad + r'\}\}"[^>]*>', f'<div data-sistem="{i}"{"" if i == 0 else " hidden"}>', govde, count=1)
    govde = govde.replace('</sc-if>', '</div>')
    betik = f'''<script>
(function () {{
  var ua = navigator.userAgent, ilk = /Mac/.test(ua) ? 1 : /Linux|X11/.test(ua) && !/Android/.test(ua) ? 2 : 0;
  function sec(n) {{
    document.querySelectorAll('[data-sistem-sec]').forEach(function (x) {{
      var s = x.getAttribute('data-sistem-sec') === String(n);
      x.setAttribute('aria-selected', s ? 'true' : 'false');
      x.setAttribute('style', s ? {stil[True]!r} : {stil[False]!r});
    }});
    document.querySelectorAll('[data-sistem]').forEach(function (x) {{ x.hidden = x.getAttribute('data-sistem') !== String(n); }});
  }}
  document.querySelectorAll('[data-sistem-sec]').forEach(function (b) {{
    b.addEventListener('click', function () {{ sec(b.getAttribute('data-sistem-sec')); }});
  }});
  sec(ilk);
}})();
</script>'''
    return sayfa('Yöntem kurulumu', head_ic, govde, betik)


def sayfa(baslik, head_ic, govde, betik=''):
    return f'''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(baslik)}</title>
{head_ic.strip()}
</head>
<body>
{govde.strip()}
{betik}
</body>
</html>
'''


YAKINDA = '''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Yakında · yontem.pro</title>
<link rel="stylesheet" href="kitaplar/stil.css">
</head>
<body>
<header class="ust"><nav aria-label="Ana menü">
  <a class="logo" href="index.html"><svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0B7A75"/><path d="M9 11l6 5-6 5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 21h7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg><span>yöntem</span></a>
  <div class="menu"><a href="kitaplar/index.html">Kitaplar</a><a class="dugme" href="dene/index.html">Tarayıcıda dene</a></div>
</nav></header>
<main class="kitaplik-ana">
  <h1>Bu sayfa hazırlanıyor</h1>
  <p class="ozet">Öğretmen sayfası, topluluk, blog ve gizlilik metni yakında burada olacak. O zamana kadar kitapları okuyabilir ya da oyun alanında Yöntem'i deneyebilirsin.</p>
  <p style="margin-top: 32px"><a class="birincil" href="kitaplar/index.html">Kitaplara git</a></p>
</main>
</body>
</html>
'''

BENIOKU = '''yontem.pro — yerel deneme kopyası
==================================

Kopyayı iki yoldan biriyle açabilirsiniz:

1) En kolayı, index.html dosyasına çift tıklamaktır.

2) Gerçek siteye en yakın hâli (önerilen): bu klasörde bir terminal açıp
     python3 -m http.server 8000
   yazabilir, sonra tarayıcıda http://localhost:8000 adresini açabilirsiniz.
   (Windows'ta: py -m http.server 8000)
   Kapatmak için terminalde Ctrl+C tuşlarına basmanız yeterlidir.

İçerik
  index.html                 Ana sayfa
  kurulum.html               Kurulum sayfası
  dene/index.html            Oyun alanı: Yöntem programlarını tarayıcıda yaz ve çalıştır
  kitaplar/index.html        Kitaplık
  kitaplar/<kitap>.html      Her kitap tek dosya (bölümler arasında sol menüyle gezilir)
  kitaplar/<kitap>/          Aynı kitap bölüm bölüm sayfalar ve isteğe bağlı PDF
  yakinda.html               Henüz hazır olmayan sayfalar

Notlar
  - Yazı tipleri Google Fonts'tan yüklenir; internet yoksa sistem yazı tipi kullanılır.
  - "GitHub" bağlantısı https://github.com/onderornek/yontem adresine gider; depo herkese açılana kadar
    bağlantı yalnızca depo sahibine çalışır.

Yöntem yazılımı MIT lisanslıdır (LICENSE). Kitap ve kılavuz metinleri: telif hakkı © 2026
Önder Örnek, Creative Commons Atıf 4.0 (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/deed.tr
'''


def tek_dosya_yerel(s):
    s = s.replace('href="https://yontem.pro/kitaplar/"', 'href="index.html"')
    s = s.replace('href="https://yontem.pro/dene"', 'href="../dene/index.html"')
    s = s.replace('href="https://yontem.pro/"', 'href="../index.html"')
    return s


if __name__ == '__main__':
    if os.path.exists(CIKTI):
        shutil.rmtree(CIKTI)
    os.makedirs(CIKTI)
    tasarim = os.path.join(SITE, 'tasarim')
    ana = ana_sayfa(open(os.path.join(tasarim, 'Main.dc.html'), encoding='utf-8').read())
    open(os.path.join(CIKTI, 'index.html'), 'w', encoding='utf-8').write(baglantilar(ana, ''))
    kur = kurulum_sayfasi(open(os.path.join(tasarim, 'Kurulum.dc.html'), encoding='utf-8').read())
    open(os.path.join(CIKTI, 'kurulum.html'), 'w', encoding='utf-8').write(baglantilar(kur, ''))
    open(os.path.join(CIKTI, 'yakinda.html'), 'w', encoding='utf-8').write(YAKINDA)
    open(os.path.join(CIKTI, 'BENIOKU.txt'), 'w', encoding='utf-8').write(BENIOKU)
    shutil.copy(os.path.join(KOK, 'LICENSE'), os.path.join(CIKTI, 'LICENSE'))
    os.makedirs(os.path.join(CIKTI, 'dene'))
    shutil.copy(os.path.join(KOK, 'oyun_alani', 'index.html'), os.path.join(CIKTI, 'dene', 'index.html'))
    shutil.copytree(os.path.join(SITE, 'kitaplar'), os.path.join(CIKTI, 'kitaplar'))
    # kitap sayfalarındaki site bağlantıları
    for kok, _, dosyalar in os.walk(os.path.join(CIKTI, 'kitaplar')):
        for f in dosyalar:
            if not f.endswith('.html'):
                continue
            yol = os.path.join(kok, f)
            derinlik = os.path.relpath(yol, CIKTI).count(os.sep)
            s = open(yol, encoding='utf-8').read()
            if os.path.dirname(yol) == os.path.join(CIKTI, 'kitaplar') and f != 'index.html':
                s = tek_dosya_yerel(s)
            s = baglantilar(s, '../' * derinlik)
            # dizin bağlantıları dosya olarak açılınca da çalışsın
            s = re.sub(r'href="((?:\.\./)*)kitaplar/"', r'href="\1kitaplar/index.html"', s)
            open(yol, 'w', encoding='utf-8').write(s)
    zip_yolu = os.path.join(SITE, 'yerel', 'yontem-site.zip')
    with zipfile.ZipFile(zip_yolu, 'w', zipfile.ZIP_DEFLATED) as z:
        for kok, _, dosyalar in os.walk(CIKTI):
            for f in sorted(dosyalar):
                tam = os.path.join(kok, f)
                z.write(tam, os.path.join('yontem-site', os.path.relpath(tam, CIKTI)))
    print('yazıldı:', zip_yolu, f'({os.path.getsize(zip_yolu) / 1024 / 1024:.1f} MB)')
