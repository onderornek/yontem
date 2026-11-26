#!/usr/bin/env python3
"""Yöntem dili komut satırı aracı.

Kullanım:
    python3 yontem.py program.y [argümanlar...]   Programı çalıştırır
    python3 yontem.py                              Etkileşimli kabuk (REPL)
    python3 yontem.py test [klasör/dosya] [--guncelle]
                                                   .y dosyalarını çalıştırıp .beklenen ile karşılaştırır
    python3 yontem.py sına program.y               'sına' bloklarını ayrı ayrı çalıştırıp raporlar
    python3 yontem.py --surum                      Sürüm bilgisi
"""
import os
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from yontem_dil import __version__  # noqa: E402
from yontem_dil.yorumlayici import Yorumlayici, Kapsam, KUTUPHANE_DIZINI  # noqa: E402
from yontem_dil.hatalar import YontemHatasi, SozdizimHatasi, DurSinyali, DonSinyali  # noqa: E402
from yontem_dil.sozcuk import sozcukle  # noqa: E402
from yontem_dil.cozumleyici import Cozumleyici  # noqa: E402


def calistir_dosya(yol, args):
    y = Yorumlayici(argumanlar=args)
    try:
        y.dosya_calistir(yol)
        return 0
    except DurSinyali as d:
        return d.kod if isinstance(d.kod, int) else 0
    except SozdizimHatasi as e:
        print(f"Sözdizimi hatası {e}", file=sys.stderr)
        return 2
    except YontemHatasi as e:
        print(f"Çalışma hatası {e}", file=sys.stderr)
        return 1
    except FileNotFoundError:
        print(f"Dosya bulunamadı: {yol}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nDurduruldu.", file=sys.stderr)
        return 130


def kabuk():
    print(f"Yöntem {__version__} etkileşimli kabuk — çıkmak için 'çıkış' yazın.")
    print("Örnek: yaz('Merhaba', 1); | değişken x := 5; | x * 2")
    y = Yorumlayici()
    y.kabuk = True
    y.dizinler = [os.getcwd(), os.path.join(os.getcwd(), 'kutuphane'),
                  KUTUPHANE_DIZINI]
    k = Kapsam(y.kok)
    y.evrensel = k
    tampon = []
    while True:
        try:
            satir = input('... ' if tampon else 'y> ')
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not tampon and satir.strip().lower() in ('çıkış', 'cikis', 'çık', 'exit', 'quit'):
            break
        tampon.append(satir)
        kaynak = '\n'.join(tampon)
        if not kaynak.strip():
            tampon = []
            continue
        try:
            sozcukler = sozcukle(kaynak, '<kabuk>')
            # Tek ifade mi? Değerini yazdır.
            c = Cozumleyici(sozcukler, '<kabuk>')
            try:
                ifade = c.ifade()
                if c.op_mu(';'):
                    c.ilerle()
                tek_ifade = c.t.tip == 'SON'
            except SozdizimHatasi:
                tek_ifade = False
            if tek_ifade:
                tampon = []
                try:
                    if ifade.tur in ('ad', 'alan') and y.cagrilabilir(y.cagrilan(ifade, k)):
                        v = y.cagir(y.cagrilan(ifade, k), [])
                    else:
                        v = y.deg(ifade, k)
                    if v is not None or ifade.tur not in ('cagri', 'ad', 'alan', 'boru'):
                        print(y.temsil(v, 1))
                except YontemHatasi as e:
                    print(f"Hata {e}")
                continue
            c = Cozumleyici(sozcukler, '<kabuk>')
            kul = c.kullan_coz()
            bild = c.bildirimler_coz()
            deyimler = c.deyimler_coz(())
            if c.t.tip != 'SON':
                c.hata("Beklenmeyen sözcük")
        except SozdizimHatasi as e:
            if '<dosya sonu>' in e.mesaj and satir.strip():
                continue          # girdi henüz bitmemiş: devam satırı iste
            print(f"Sözdizimi hatası {e}")
            tampon = []
            continue
        tampon = []
        try:
            for ad, s in kul:
                y.kullan(k, ad, s, '<kabuk>')
            y.bildirimleri_isle(bild, k, '<kabuk>')
            y.yurut_blok(deyimler, k)
        except DurSinyali:
            break
        except DonSinyali:
            pass
        except YontemHatasi as e:
            print(f"Hata {e}")


def _test_dosyalari(hedefler):
    out = []
    for h in hedefler:
        if os.path.isdir(h):
            for kok, dizinler, dosyalar in os.walk(h):
                dizinler[:] = sorted(d for d in dizinler if d != 'node_modules' and not d.startswith('.'))
                out += [os.path.join(kok, f) for f in sorted(dosyalar) if f.lower().endswith('.y')]
        elif h.lower().endswith('.y'):
            out.append(h)
    return out


import re as _re  # noqa: E402
SINA_DESENI = _re.compile(r"^[ \t]*[sS][ıiIİ][nN][aA][ \t]+['\"#]", _re.M)


def sina(args):
    """'sına' bloklarını taze bir yorumlayıcıda ayrı ayrı yürütür; rapor JavaScript sürümüyle aynıdır."""
    yol = next((a for a in args if not a.startswith('--')), None)
    if yol is None:
        print("Kullanım: yontem sına program.y", file=sys.stderr)
        return 1
    if not os.path.exists(yol):
        print(f"Bulunamadı: {yol}", file=sys.stderr)
        return 1
    with open(yol, encoding='utf-8') as f:
        kaynak = f.read()
    try:
        sinamalar = Cozumleyici(sozcukle(kaynak, yol), yol).dosya_coz().sinamalar
    except SozdizimHatasi as e:
        print(f"Sözdizimi hatası {e}", file=sys.stderr)
        return 2
    if not sinamalar:
        print(f"'{yol}' içinde 'sına' bloğu yok", file=sys.stderr)
        return 1
    gecen = kalan = 0
    for i, (_, baslik, _) in enumerate(sinamalar):
        cikti = []
        y = Yorumlayici(yaz=cikti.append, oku=lambda: '')
        hata = None
        try:
            y.calistir(kaynak, yol, sina=i)
        except DurSinyali as d:
            kod = d.kod if isinstance(d.kod, int) else 0
            if kod != 0:
                hata = f"Durdur({kod}) ile bitti"
        except SozdizimHatasi as e:
            print(f"Sözdizimi hatası {e}", file=sys.stderr)
            return 2
        except YontemHatasi as e:
            hata = str(e).replace(f"[{yol}, ", "[")
        if hata is None:
            gecen += 1
            print(f"geçti  {baslik}")
            continue
        kalan += 1
        print(f"KALDI  {baslik}\n       {hata}")
        metin = ''.join(cikti)
        if metin:
            for satir in (metin[:-1] if metin.endswith('\n') else metin).split('\n'):
                print(f"       | {satir}")
    print(f"{gecen} geçti, {kalan} kaldı.")
    return 1 if kalan else 0


def test(args):
    """JavaScript sürümündeki 'yontem test' ile aynı kurallar: her program ayrı süreçte çalışır,
    yanındaki .beklenen ile bayt bayt karşılaştırılır; yoksa hatasız bitmesi yeterlidir."""
    import re
    import subprocess
    import time
    guncelle = '--guncelle' in args or '--güncelle' in args
    hedefler = [a for a in args if not a.startswith('--')] or ['testler' if os.path.isdir('testler') else '.']
    for h in hedefler:
        if not os.path.exists(h):
            print(f"Bulunamadı: {h}", file=sys.stderr)
            return 1
    program_mi = re.compile(r'\s*(?:\{[^}]*\}\s*|//[^\n]*\n\s*)*program(?![\w])', re.I)
    gecen = kalan = atlanan = 0
    t0 = time.time()
    for yol in _test_dosyalari(hedefler):
        with open(yol, encoding='utf-8') as f:
            icerik = f.read()
            if not program_mi.match(icerik):
                atlanan += 1
                continue
        sina_mi = bool(SINA_DESENI.search(icerik))
        kok = yol[:-2]
        # 'sına' blokları: rapor .sina.beklenen ile karşılaştırılır; o yoksa bütün bloklar geçmelidir
        if sina_mi and not guncelle:
            s = subprocess.run([sys.executable, os.path.abspath(__file__), 'sina', os.path.abspath(yol)], capture_output=True,
                               cwd=os.path.dirname(os.path.abspath(yol)), timeout=600)
            rapor = s.stdout.decode('utf-8', 'replace')
            sbek = kok + '.sina.beklenen'
            ozet = re.search(r'^(\d+) geçti, (\d+) kaldı\.$', rapor, re.M)
            if os.path.exists(sbek):
                with open(sbek, encoding='utf-8', newline='') as f:
                    tamam = rapor == f.read() and s.returncode in (0, 1)
            else:
                tamam = s.returncode == 0
            if not tamam:
                neden = f"{ozet.group(2)} sına bloğu kaldı" if ozet else f"çıkış kodu {s.returncode}"
                ek = '; rapor .sina.beklenen ile aynı değil' if os.path.exists(sbek) else ''
                print(f"BAŞARISIZ  {yol}  ({neden}{ek})")
                ic = (rapor + s.stderr.decode('utf-8', 'replace')).rstrip()
                if ic:
                    print('  ' + '\n  '.join(x for x in ic.split('\n') if not x.startswith('geçti  ')))
                kalan += 1
                continue
            if not os.path.exists(kok + '.beklenen'):
                print(f"geçti      {yol}  ({ozet.group(1) if ozet else 0} sına bloğu)")
                gecen += 1
                continue
        girdi = b''
        if os.path.exists(kok + '.girdi'):
            with open(kok + '.girdi', 'rb') as f:
                girdi = f.read()
        try:
            p = subprocess.run([sys.executable, os.path.abspath(__file__), os.path.abspath(yol)], input=girdi,
                               capture_output=True, cwd=os.path.dirname(os.path.abspath(yol)), timeout=600)
        except subprocess.TimeoutExpired:
            print(f"BAŞARISIZ  {yol}  (zaman aşımı)")
            kalan += 1
            continue
        cikti = p.stdout.decode('utf-8', 'replace')
        hata = p.stderr.decode('utf-8', 'replace').rstrip()
        bek = kok + '.beklenen'
        if guncelle:
            if p.returncode == 0:
                with open(bek, 'w', encoding='utf-8', newline='') as f:
                    f.write(cikti)
                print(f"yazıldı    {bek}")
                gecen += 1
            else:
                print(f"BAŞARISIZ  {yol}  (çıkış kodu {p.returncode}; .beklenen yazılmadı)\n{hata}")
                kalan += 1
            continue
        if os.path.exists(bek):
            with open(bek, encoding='utf-8', newline='') as f:
                beklenen = f.read()
            if cikti == beklenen:
                print(f"geçti      {yol}")
                gecen += 1
                continue
            a, b = beklenen.split('\n'), cikti.split('\n')
            i = 0
            while i < len(a) and i < len(b) and a[i] == b[i]:
                i += 1
            print(f"BAŞARISIZ  {yol}  (çıktı {i + 1}. satırda farklı)\n  beklenen: {a[i] if i < len(a) else '<dosya sonu>'}"
                  f"\n  çıkan   : {b[i] if i < len(b) else '<dosya sonu>'}")
            if hata:
                print('  ' + hata.replace('\n', '\n  '))
            kalan += 1
        elif p.returncode == 0:
            print(f"geçti      {yol}  (.beklenen yok; hatasız bitti)")
            gecen += 1
        else:
            print(f"BAŞARISIZ  {yol}  (çıkış kodu {p.returncode})\n  " + hata.replace('\n', '\n  '))
            kalan += 1
    toplam = gecen + kalan
    if not toplam:
        print("Çalıştırılacak program bulunamadı (.y uzantılı, 'program' ile başlayan dosyalar aranır)", file=sys.stderr)
        return 1
    ek = f", {atlanan} birim dosyası atlandı" if atlanan else ''
    print(f"\n{gecen}/{toplam} test geçti{ek} ({time.time() - t0:.1f} sn).")
    return 1 if kalan else 0


def main():
    args = sys.argv[1:]
    if args and args[0] in ('--surum', '--sürüm', '-v', '--version'):
        print(f"Yöntem {__version__}")
        return 0
    if args and args[0] in ('-h', '--yardim', '--yardım', '--help'):
        print(__doc__)
        return 0
    if not args:
        kabuk()
        return 0
    if args[0] == 'test' and not os.path.isfile('test'):
        return test(args[1:])
    if args[0] in ('sina', 'sına') and len(args) > 1:
        return sina(args[1:])
    return calistir_dosya(args[0], args[1:])


def _ana():
    sys.setrecursionlimit(200000)
    threading.stack_size(512 * 1024 * 1024)
    sonuc = [0]

    def hedef():
        sonuc[0] = main()
    t = threading.Thread(target=hedef)
    t.start()
    t.join()
    sys.stdout.flush()
    sys.exit(sonuc[0])


if __name__ == '__main__':
    _ana()
