// 'yontem paketle': bir Yöntem programını tek başına çalışan bir web uygulamasına çevirir.
// --mobil ile telefona kurulabilen bir PWA (manifest, çevrim dışı çalışma, simgeler) üretir.
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

const VURGU = [0x0b, 0x7a, 0x75];

/** Basit PNG kodlayıcı (RGBA) */
function png(gen: number, yuk: number, piksel: (x: number, y: number) => number[]): Buffer {
  const satirlar: Buffer[] = [];
  for (let y = 0; y < yuk; y++) {
    const s = Buffer.alloc(1 + gen * 4);
    for (let x = 0; x < gen; x++) { const p = piksel(x, y); s[1 + x * 4] = p[0]; s[2 + x * 4] = p[1]; s[3 + x * 4] = p[2]; s[4 + x * 4] = p[3]; }
    satirlar.push(s);
  }
  const crcTablo = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b: Buffer) => { let c = -1; for (const v of b) c = crcTablo[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const parca = (tur: string, veri: Buffer) => {
    const u = Buffer.alloc(4); u.writeUInt32BE(veri.length);
    const tv = Buffer.concat([Buffer.from(tur, 'ascii'), veri]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(tv));
    return Buffer.concat([u, tv, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(gen, 0); ihdr.writeUInt32BE(yuk, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), parca('IHDR', ihdr),
    parca('IDAT', zlib.deflateSync(Buffer.concat(satirlar))), parca('IEND', Buffer.alloc(0))]);
}

/** Yöntem simgesi: vurgu renginde yuvarlak kare, beyaz '>_' işareti (maskable için kenar boşluklu) */
function simge(n: number, maskable: boolean): Buffer {
  const S = n / 32;
  const pay = maskable ? 0 : 0;
  const yaricap = maskable ? 0 : 8 * S;
  const icMi = (x: number, y: number) => {
    const r = yaricap, a = x - pay, b = y - pay, w = n - 2 * pay;
    if (a < 0 || b < 0 || a >= w || b >= w) return false;
    const cx = a < r ? r : a > w - r ? w - r : a, cy = b < r ? r : b > w - r ? w - r : b;
    return (a - cx) ** 2 + (b - cy) ** 2 <= r * r;
  };
  // işaret, maskable simgede güvenli bölgeye sığsın diye küçültülür
  const k = maskable ? 0.72 : 1, o = (1 - k) * n / 2;
  const segmentUzak = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };
  const P = (v: number) => o + v * S * k;
  return png(n, n, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    if (!icMi(px, py)) return [0, 0, 0, 0];
    const kalin = 1.2 * S * k;
    const d = Math.min(segmentUzak(px, py, P(9), P(11), P(15), P(16)), segmentUzak(px, py, P(15), P(16), P(9), P(21)),
      segmentUzak(px, py, P(17), P(21), P(24), P(21)));
    if (d <= kalin) return [255, 255, 255, 255];
    if (d <= kalin + 1) { const a = kalin + 1 - d; return [Math.round(VURGU[0] + (255 - VURGU[0]) * a), Math.round(VURGU[1] + (255 - VURGU[1]) * a), Math.round(VURGU[2] + (255 - VURGU[2]) * a), 255]; }
    return [...VURGU, 255];
  });
}

const e = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

export function uygulamaYaz(kod: string, ad: string, klasor: string, mobil: boolean, paketYolu: string) {
  fs.mkdirSync(klasor, { recursive: true });
  const paket = fs.readFileSync(paketYolu, 'utf-8').replace(/<\/script/gi, '<\\/script');
  const kodJson = JSON.stringify(kod).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const depoOnEki = 'yontem-depo:' + ad.toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]+/gu, '-') + ':';
  const html = `<!doctype html>
<!-- Yöntem ile yapıldı. Yöntem çalışma zamanı: (c) 2026 Önder Örnek, MIT lisansı — https://yontem.pro -->
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(ad)}</title>
<meta name="theme-color" content="#0B7A75">
${mobil ? `<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="simge-192.png">
<link rel="apple-touch-icon" href="simge-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
` : ''}<style>
html,body{margin:0;min-height:100%;background:#F5F7FA}
body{display:flex;justify-content:center;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
#uygulama{width:100%;max-width:${mobil ? 520 : 760}px;min-height:100vh;background:#fff}
@media (min-width:600px){#uygulama{min-height:auto;margin:32px 16px;border-radius:20px;box-shadow:0 20px 50px -30px rgba(15,27,45,.5);overflow:hidden}}
#konsol{margin:0;padding:12px 20px 20px;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#475569;white-space:pre-wrap;border-top:1px solid #E3E8EF}
#konsol:empty{display:none}
#konsol .hata{color:#B83A2A}
</style>
</head>
<body>
<main id="uygulama" aria-live="polite"></main>
<script>${paket}</script>
<script>
(function () {
  var kap = document.getElementById('uygulama');
  var konsol = document.createElement('pre'); konsol.id = 'konsol';
  var gorunum = new Yontem.ArayuzGorunumu(kap, function (tur, veri) {
    if (tur === 'olay') Yontem.olay(veri); else Yontem.mobilOlay(veri);
  }, ${JSON.stringify(depoOnEki)});
  kap.dataset.baslikAyarla = 'evet';
  kap.appendChild(konsol);
  function yaz(m, sinif) { var s = document.createElement('span'); if (sinif) s.className = sinif; s.textContent = m; konsol.appendChild(s); }
  var KOD = ${kodJson};
  Yontem.kodlaCalistir(KOD, {
    yaz: function (m) { yaz(m); },
    hata: function (m) { yaz(m + '\\n', 'hata'); },
    arayuz: function (op) { if (op.op === 'kapat') { gorunum.kapat(); return; } gorunum.uygula(op); },
    cihaz: Yontem.cihazBilgisi(${JSON.stringify(depoOnEki)})
  });
})();
${mobil ? `if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});` : ''}
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(klasor, 'index.html'), html);
  const dosyalar = ['index.html'];
  if (mobil) {
    const kisa = ad.length > 12 ? ad.slice(0, 12) : ad;
    fs.writeFileSync(path.join(klasor, 'manifest.webmanifest'), JSON.stringify({
      name: ad, short_name: kisa, lang: 'tr', start_url: '.', scope: '.', display: 'standalone',
      background_color: '#F5F7FA', theme_color: '#0B7A75',
      icons: [
        { src: 'simge-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'simge-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'simge-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }, null, 2));
    fs.writeFileSync(path.join(klasor, 'simge-180.png'), simge(180, false));
    fs.writeFileSync(path.join(klasor, 'simge-192.png'), simge(192, false));
    fs.writeFileSync(path.join(klasor, 'simge-512.png'), simge(512, false));
    fs.writeFileSync(path.join(klasor, 'simge-maskable-512.png'), simge(512, true));
    const surum = Date.now().toString(36);
    fs.writeFileSync(path.join(klasor, 'sw.js'), `// Çevrim dışı çalışma: uygulama dosyaları önbelleğe alınır
// Yöntem çalışma zamanı: (c) 2026 Önder Örnek, MIT lisansı
const ONBELLEK = 'yontem-${surum}';
const DOSYALAR = ['./', 'index.html', 'manifest.webmanifest', 'simge-192.png', 'simge-512.png', 'simge-maskable-512.png', 'simge-180.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(ONBELLEK).then((c) => c.addAll(DOSYALAR))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== ONBELLEK).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
`);
    dosyalar.push('manifest.webmanifest', 'sw.js', 'simge-180.png', 'simge-192.png', 'simge-512.png', 'simge-maskable-512.png');
  }
  return dosyalar;
}
