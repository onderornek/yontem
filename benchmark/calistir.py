#!/usr/bin/env python3
"""Yöntem benchmark çalıştırıcısı.

Her test (testler/<ad>/) aynı algoritmanın dört dildeki yazımını içerir: <ad>.y, <ad>.py,
<ad>.js, <ad>.cpp ve beklenen çıktı (beklenen.txt). Çalıştırıcı her testi şu ortamlarda
çalıştırır, çıktının beklenenle birebir aynı olduğunu denetler ve süreleri ölçer:

  yontem-cpp   Yöntem → C++ (gömülü arka uç, masaüstü derlemesi, g++ -O2)
  yontem-js    Yöntem → JavaScript (Node.js)
  yontem-py    Yöntem, Python yorumlayıcısı (yavaş; --hizli ile atlanır)
  cpp          Elle yazılmış C++ (g++ -O2)
  node         Elle yazılmış JavaScript (Node.js)
  python       Elle yazılmış Python

Her ölçüm bir ısınma çalıştırmasından sonra --tekrar kez yinelenir ve ortanca (medyan) süre
alınır. 'bos' testi her ortamın açılış süresini verir; oranlar bu süre çıkarılarak hesaplanır.
Sonuçlar sonuclar/ klasörüne yazılır: rapor.md (tablolar), rapor.svg (grafik), rapor.json (ham veri).

Kullanım:
  python3 benchmark/calistir.py                 # tüm testler, 5 tekrar
  python3 benchmark/calistir.py --hizli         # Yöntem Python yorumlayıcısını atla
  python3 benchmark/calistir.py --tekrar 10 --testler fib,matris
"""
import argparse
import json
import math
import os
import platform
import shutil
import statistics
import subprocess
import sys
import time

KOK = os.path.dirname(os.path.abspath(__file__))
DEPO = os.path.dirname(KOK)
TESTLER = os.path.join(KOK, 'testler')
DERLEME = os.path.join(KOK, 'derleme')
SONUC = os.path.join(KOK, 'sonuclar')
CLI = os.path.join(DEPO, 'js', 'dist', 'cli.js')
YONTEM_PY = os.path.join(DEPO, 'yontem.py')

ORTAMLAR = ['yontem-cpp', 'yontem-js', 'yontem-py', 'cpp', 'node', 'python']
ORTAM_ADI = {
    'yontem-cpp': 'Yöntem → C++',
    'yontem-js': 'Yöntem → JavaScript',
    'yontem-py': 'Yöntem, Python yorumlayıcısı',
    'cpp': 'C++ (g++ -O2)',
    'node': 'Node.js',
    'python': 'Python 3',
}
TEST_ACIKLAMA = {
    'bos': 'açılış süresi (boş program)',
    'fib': 'özyinelemeli Fibonacci(27): fonksiyon çağrısı',
    'matris': '100×100 matris çarpımı: ondalık aritmetik, dizi erişimi',
    'spektral': 'spektral norm (N=120): fonksiyon çağrısı, ondalık',
    'ikili_agac': 'tam ikili ağaçlar (derinlik 14): nesne oluşturma',
    'fannkuch': 'fannkuch (N=8): tamsayı dizileri',
    'nbody': 'beş cisim, 20000 adım: ondalık aritmetik',
    'siralama': '30000 sayıyı hızlı sıralama: karşılaştırma, takas',
    'sozcuk_sayma': '40000 sözcüğü sayma: metin ve sözlük',
}


def komut(ortam, test):
    d = os.path.join(TESTLER, test)
    if ortam == 'yontem-js':
        return ['node', CLI, os.path.join(d, test + '.y')]
    if ortam == 'yontem-py':
        return [sys.executable, YONTEM_PY, os.path.join(d, test + '.y')]
    if ortam == 'yontem-cpp':
        return [os.path.join(DERLEME, 'yontem_' + test)]
    if ortam == 'cpp':
        return [os.path.join(DERLEME, 'cpp_' + test)]
    if ortam == 'node':
        return ['node', os.path.join(d, test + '.js')]
    if ortam == 'python':
        return [sys.executable, os.path.join(d, test + '.py')]
    raise ValueError(ortam)


def derle(test, ortamlar, cxx):
    d = os.path.join(TESTLER, test)
    os.makedirs(DERLEME, exist_ok=True)
    if 'cpp' in ortamlar:
        subprocess.run([cxx, '-O2', '-std=c++17', '-o', os.path.join(DERLEME, 'cpp_' + test), os.path.join(d, test + '.cpp')],
                       check=True)
    if 'yontem-cpp' in ortamlar:
        p = subprocess.run(['node', CLI, 'gomulu', os.path.join(d, test + '.y'), '--masaustu',
                            '-o', os.path.join(DERLEME, 'yontem_' + test)], capture_output=True, text=True)
        if p.returncode != 0:
            raise RuntimeError(f"Yöntem → C++ derlemesi başarısız ({test}):\n{p.stderr}")


def olc(cmd, beklenen, tekrar):
    """Isınma + tekrar; (ortanca, en kısa, tüm süreler) döndürür. Çıktı yanlışsa hata."""
    sureler = []
    for k in range(tekrar + 1):
        bas = time.perf_counter()
        p = subprocess.run(cmd, capture_output=True, text=True)
        sure = time.perf_counter() - bas
        if p.returncode != 0:
            raise RuntimeError(f"{' '.join(cmd)} başarısız:\n{p.stderr[-2000:]}")
        if p.stdout != beklenen:
            raise RuntimeError(f"{' '.join(cmd)} beklenenden farklı çıktı verdi:\n{p.stdout[:500]}")
        if k > 0:
            sureler.append(sure)
    return statistics.median(sureler), min(sureler), sureler


def surum(cmd):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True)
        return (p.stdout or p.stderr).strip().splitlines()[0]
    except OSError:
        return 'bulunamadı'


def geo(xs):
    xs = [x for x in xs if x and x > 0]
    return math.exp(sum(math.log(x) for x in xs) / len(xs)) if xs else None


def sure_yaz(s):
    if s is None:
        return '—'
    if s < 0.1:
        return f"{s * 1000:.1f} ms".replace(".", ",")
    return f"{s:.3f} sn".replace('.', ',')


def oran_yaz(r):
    if r is None:
        return '—'
    return (f"{r:.1f}×" if r < 100 else f"{r:.0f}×").replace('.', ',')


# ---------------------------------------------------------------- rapor
def svg_grafik(ortamlar, oranlar):
    """Ortam başına geometrik ortalama yavaşlama (C++'a göre, logaritmik eksen)."""
    satirlar = [(o, oranlar[o]) for o in ortamlar if oranlar.get(o)]
    satirlar.sort(key=lambda x: x[1])
    sol, gen, y0, adim = 300, 400, 96, 38
    enb = max(r for _, r in satirlar)
    ust = 10 ** math.ceil(math.log10(max(enb, 10)))

    def X(v):
        return sol + math.log10(max(v, 1)) / math.log10(ust) * gen
    H = y0 + len(satirlar) * adim + 24
    p = [f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 760 {H}' font-family='sans-serif' font-size='12.5'>",
         "<rect width='760' height='%d' fill='white'/>" % H,
         "<text x='24' y='28' font-size='15' font-weight='600' fill='#1f2328'>C++'a göre kaç kat yavaş (geometrik ortalama)</text>",
         "<text x='24' y='50' fill='#57606a'>Açılış süresi çıkarılmış ortanca süreler; logaritmik eksen</text>"]
    t = 1
    while t <= ust:
        p.append(f"<line x1='{X(t):.1f}' x2='{X(t):.1f}' y1='{y0 - 18}' y2='{H - 20}' stroke='#e5e7eb'/>")
        p.append(f"<text x='{X(t):.1f}' y='{y0 - 24}' text-anchor='middle' font-size='11.5' fill='#57606a'>{t:g}×</text>")
        t *= 10
    for i, (o, r) in enumerate(satirlar):
        y = y0 + i * adim + 10
        renk = '#2f6fdb' if o.startswith('yontem') else '#9ca3af'
        agirlik = '600' if o.startswith('yontem') else '400'
        p.append(f"<text x='24' y='{y + 4}' fill='#1f2328' font-weight='{agirlik}'>{ORTAM_ADI[o]}</text>")
        p.append(f"<line x1='{sol}' x2='{X(r):.1f}' y1='{y}' y2='{y}' stroke='{renk}' stroke-opacity='0.35' stroke-width='2'/>")
        p.append(f"<circle cx='{X(r):.1f}' cy='{y}' r='6' fill='{renk}'/>")
        p.append(f"<text x='{X(r) + 12:.1f}' y='{y + 4}' fill='#1f2328'>{oran_yaz(r)}</text>")
    p.append('</svg>')
    return '\n'.join(p)


def rapor_yaz(veri):
    ortamlar, testler = veri['ortamlar'], veri['testler']
    S = veri['sonuclar']
    satir = ['# Yöntem benchmark raporu', '',
             f"Tarih: {veri['tarih']} · Tekrar: {veri['tekrar']} (ısınmadan sonra, ortanca alındı)", '',
             '| Ortam | Sürüm |', '|---|---|']
    for k, v in veri['surumler'].items():
        satir.append(f"| {k} | {v} |")
    satir += ['', f"İşletim sistemi: {veri['sistem']}", '',
              '## Geometrik ortalama: C++\'a göre kaç kat yavaş', '',
              '![Grafik](rapor.svg)', '',
              '| Ortam | Kat |', '|---|---|']
    for o in sorted(ortamlar, key=lambda o: veri['geo'].get(o) or 1e99):
        satir.append(f"| {ORTAM_ADI[o]} | {oran_yaz(veri['geo'].get(o))} |")
    satir += ['', '## Ortanca süreler (açılış dahil)', '',
              '| Test | ' + ' | '.join(ORTAM_ADI[o] for o in ortamlar) + ' |',
              '|---|' + '---|' * len(ortamlar)]
    for t in testler:
        satir.append(f"| `{t}` | " + ' | '.join(sure_yaz(S[t].get(o, {}).get('ortanca')) for o in ortamlar) + ' |')
    satir += ['', '## C++\'a göre kat (açılış süresi çıkarılmış)', '',
              '| Test | ' + ' | '.join(ORTAM_ADI[o] for o in ortamlar) + ' |',
              '|---|' + '---|' * len(ortamlar)]
    for t in testler:
        if t == 'bos':
            continue
        satir.append(f"| `{t}` | " + ' | '.join(oran_yaz(S[t].get(o, {}).get('oran')) for o in ortamlar) + ' |')
    satir += ['', '## Testler', '']
    for t in testler:
        satir.append(f"- `{t}`: {TEST_ACIKLAMA.get(t, '')}")
    satir += ['', '## Yöntem', '',
              '- Her test her ortamda aynı algoritmayla yazılmıştır ve aynı çıktıyı vermek zorundadır; '
              'çıktısı `beklenen.txt` ile birebir aynı olmayan ölçüm geçersiz sayılır.',
              '- Her ölçümden önce bir ısınma çalıştırması yapılır (dosya önbelleği, JIT derleyicisi).',
              '- Süre, sürecin başlatılmasından bitişine kadar geçen duvar saati süresidir (açılış dahil).',
              '- Oranlar için her ortamın `bos` testindeki açılış süresi çıkarılır; sonuç en az 1 ms sayılır, '
              'çünkü çok kısa sürelerde ölçüm gürültüsü baskın olur.',
              '- Testlerin özeti olarak oranların geometrik ortalaması verilir; böylece tek bir test '
              'genel sonucu çarpıtmaz.',
              '- C++ sürelerinin çoğu 10 ms\'nin altındadır; bu sürelerde işletim sisteminden gelen gürültü '
              'oranları birkaç on yüzde oynatabilir. Daha kararlı sonuç için `--tekrar` artırılabilir.', '']
    with open(os.path.join(SONUC, 'rapor.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(satir))
    with open(os.path.join(SONUC, 'rapor.svg'), 'w', encoding='utf-8') as f:
        f.write(svg_grafik(ortamlar, veri['geo']))
    with open(os.path.join(SONUC, 'rapor.json'), 'w', encoding='utf-8') as f:
        json.dump(veri, f, ensure_ascii=False, indent=1)


def main():
    ap = argparse.ArgumentParser(description='Yöntem benchmark çalıştırıcısı')
    ap.add_argument('--tekrar', type=int, default=5, help='her ölçümün tekrar sayısı (varsayılan 5)')
    ap.add_argument('--testler', help='virgülle ayrılmış test adları (varsayılan: hepsi)')
    ap.add_argument('--ortamlar', help='virgülle ayrılmış ortamlar: ' + ', '.join(ORTAMLAR))
    ap.add_argument('--hizli', action='store_true', help='Yöntem Python yorumlayıcısını atla')
    ap.add_argument('--yavas-tekrar', type=int, default=1,
                    help='Yöntem Python yorumlayıcısı için tekrar sayısı (varsayılan 1)')
    a = ap.parse_args()

    testler = sorted(os.listdir(TESTLER))
    if a.testler:
        istenen = a.testler.split(',')
        testler = [t for t in testler if t in istenen or t == 'bos']
    testler = ['bos'] + [t for t in testler if t != 'bos']
    ortamlar = a.ortamlar.split(',') if a.ortamlar else list(ORTAMLAR)
    if a.hizli and 'yontem-py' in ortamlar:
        ortamlar.remove('yontem-py')
    cxx = shutil.which('g++') or shutil.which('clang++')
    if not cxx:
        ortamlar = [o for o in ortamlar if o not in ('cpp', 'yontem-cpp')]
        print('uyarı: C++ derleyicisi bulunamadı; C++ ortamları atlanıyor')
    if not os.path.exists(CLI):
        sys.exit("js/dist/cli.js bulunamadı: önce 'cd js && npm install && npm run build' çalıştırın")

    os.makedirs(SONUC, exist_ok=True)
    S = {}
    for t in testler:
        derle(t, ortamlar, cxx)
        with open(os.path.join(TESTLER, t, 'beklenen.txt'), encoding='utf-8') as f:
            beklenen = f.read()
        S[t] = {}
        for o in ortamlar:
            n = a.yavas_tekrar if o == 'yontem-py' else a.tekrar
            ortanca, enaz, hepsi = olc(komut(o, t), beklenen, n)
            S[t][o] = {'ortanca': ortanca, 'en_kisa': enaz, 'sureler': hepsi}
            print(f"{t:14} {ORTAM_ADI[o]:30} {sure_yaz(ortanca):>12}", flush=True)

    # açılış süresi çıkarılmış oranlar (C++'a göre)
    referans = 'cpp' if 'cpp' in ortamlar else ortamlar[0]
    geo_oran = {}
    for o in ortamlar:
        oranlar = []
        for t in testler:
            if t == 'bos':
                continue
            net = max(S[t][o]['ortanca'] - S['bos'][o]['ortanca'], 0.001)
            ref = max(S[t][referans]['ortanca'] - S['bos'][referans]['ortanca'], 0.001)
            S[t][o]['oran'] = net / ref
            oranlar.append(net / ref)
        geo_oran[o] = geo(oranlar)

    veri = {
        'tarih': time.strftime('%Y-%m-%d %H:%M'),
        'tekrar': a.tekrar,
        'sistem': f"{platform.system()} {platform.release()} ({platform.machine()})",
        'surumler': {
            'Node.js': surum(['node', '--version']),
            'Python': platform.python_version(),
            'C++ derleyicisi': surum([cxx, '--version']) if cxx else 'yok',
            'Yöntem': surum(['node', CLI, '--surum']),
        },
        'ortamlar': ortamlar, 'testler': testler, 'referans': referans,
        'sonuclar': S, 'geo': geo_oran,
    }
    rapor_yaz(veri)
    print()
    print("C++'a göre geometrik ortalama (açılış süresi çıkarılmış):")
    for o in sorted(ortamlar, key=lambda o: geo_oran[o] or 1e99):
        print(f"  {ORTAM_ADI[o]:30} {oran_yaz(geo_oran[o]):>8}")
    print(f"\nRapor: {os.path.relpath(os.path.join(SONUC, 'rapor.md'), os.getcwd())}")


if __name__ == '__main__':
    main()
