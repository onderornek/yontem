#!/usr/bin/env node
// Ağ biriminin testi: yerel bir HTTP sunucusu başlatır, ag_testleri/ag_testi.y programını JavaScript
// derleyicisiyle ve (varsa) Python yorumlayıcısıyla çalıştırır; çıktılar birbirine ve .beklenen dosyasına eşit olmalı.
//   node js/betikler/ag_testi.js [--guncelle]
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.resolve(__dirname, '..', '..');
// '.beklenen' değil '.beklenen.txt': 'yontem test' bu programları sunucusuz çalıştırır
const PROGRAMLAR = ['ag_testi.y', 'ayni_anda_testi.y', 'akis_testi.y'].map(f => path.join(KOK, 'ag_testleri', f));

let ucusta = 0, enFazla = 0, kapanan = 0;
const bekle = (ms) => new Promise(r => setTimeout(r, ms));
/** Parçaları aralıklarla yazar; bağlantı erken kapanırsa sayar (HttpAkış'ın bırakılan akışı kapattığını sınamak için) */
async function parcaParca(istek, yanit, tur, parcalar, ara = 30) {
  let bitti = false;
  yanit.on('close', () => { if (!bitti) kapanan++; });
  yanit.writeHead(200, { 'Content-Type': tur });
  for (const p of parcalar) {
    if (yanit.destroyed) return;
    if (typeof p === 'number') { await bekle(p); continue; }
    yanit.write(p);
    await bekle(ara);
  }
  bitti = true;
  yanit.end();
}
const sunucu = http.createServer((istek, yanit) => {
  const parcalar = [];
  istek.on('data', p => parcalar.push(p));
  istek.on('end', () => {
    const u = new URL(istek.url, 'http://x');
    const gonder = (durum, govde, basliklar = {}) => { yanit.writeHead(durum, { 'Content-Type': 'text/plain; charset=utf-8', ...basliklar }); yanit.end(govde); };
    if (u.pathname === '/merhaba') return gonder(200, 'Merhaba, dünya! çğıöşü');
    if (u.pathname === '/yanki') return gonder(200, JSON.stringify({
      'yöntem': istek.method, yol: u.pathname + u.search, 'gövde': Buffer.concat(parcalar).toString('utf-8'),
      'tür': istek.headers['content-type'] ?? '', 'x-deneme': encodeURIComponent(Buffer.from(istek.headers['x-deneme'] ?? '', 'latin1').toString('utf-8')),
      ajan: (istek.headers['user-agent'] ?? '').replace(/\/.*/, ''),
    }), { 'Content-Type': 'application/json' });
    if (u.pathname.startsWith('/durum/')) return gonder(Number(u.pathname.slice(7)), 'durum ' + u.pathname.slice(7));
    if (u.pathname === '/yonlendir') return gonder(302, '', { Location: '/merhaba' });
    if (u.pathname === '/bos') return gonder(204, '', { 'X-Ozel': 'evet' });
    if (u.pathname === '/yavas') return void setTimeout(() => gonder(200, 'geç'), 4000);
    // 'aynı anda' testi: yanıtı geciktirir ve aynı anda süren en çok istek sayısını tutar
    if (u.pathname === '/gecikme') {
      ucusta++; enFazla = Math.max(enFazla, ucusta);
      return void setTimeout(() => { ucusta--; gonder(200, (u.searchParams.get('ad') ?? '') + (istek.method === 'POST' ? '?' : '!')); }, 300);
    }
    // HttpAkış testleri: satırlar ve UTF-8 karakterleri parçaların arasında bölünür
    if (u.pathname === '/sse') {
      const b = Buffer.from('data: çğ\n\n', 'utf-8');
      return void parcaParca(istek, yanit, 'text/event-stream; charset=utf-8', [
        ': yorum satırı\n\n', 'data: {"type": "baş', 'la", "no": 1}\n\n',
        'event: parça\ndata: {"type": "delta", "metin": "Mer', 'haba"}\r\n\r\n',
        'data: birinci satır\ndata: ikinci satır\n\n', b.subarray(0, 8), b.subarray(8), 'data: [DONE]\n\n', 'data: son, boş satırsız',
      ]);
    }
    if (u.pathname === '/ndjson') return void parcaParca(istek, yanit, 'application/x-ndjson', ['{"a": 1}\n{"a": ', '2.5}\n\n', '{"b": [true, null]}\n']);
    if (u.pathname === '/duz') return void parcaParca(istek, yanit, 'text/plain; charset=utf-8', ['bir ', 'iki ', 'üç']);
    if (u.pathname === '/yanki-akis') return void parcaParca(istek, yanit, 'text/event-stream', [`data: ${JSON.stringify({ 'yöntem': istek.method, 'gövde': Buffer.concat(parcalar).toString('utf-8'), x: istek.headers['x-deneme'] ?? '' })}\n\n`]);
    if (u.pathname === '/sonsuz') return void parcaParca(istek, yanit, 'text/event-stream', Array.from({ length: 200 }, (_, i) => `data: ${i + 1}\n\n`), 20);
    if (u.pathname === '/takilan') return void parcaParca(istek, yanit, 'text/event-stream', ['data: ilk\n\n', 3000, 'data: geç\n\n']);
    if (u.pathname === '/ilk-hemen') return void parcaParca(istek, yanit, 'text/event-stream', ['data: ilk\n\n', 800, 'data: ikinci\n\n']);
    if (u.pathname === '/kapanan') { const n = kapanan; kapanan = 0; return gonder(200, String(n)); }
    if (u.pathname === '/enfazla') { const n = enFazla; enFazla = 0; return gonder(200, String(n)); }
    gonder(404, 'yok');
  });
});

function calistir(komut, argumanlar) {
  return new Promise((coz) => {
    const p = spawn(komut, argumanlar, { cwd: path.join(KOK, 'ag_testleri') });
    let cikti = '', hata = '';
    p.stdout.on('data', d => { cikti += d; });
    p.stderr.on('data', d => { hata += d; });
    p.on('error', () => coz(null));
    p.on('close', kod => coz({ kod, cikti, hata }));
  });
}

sunucu.listen(0, '127.0.0.1', async () => {
  const taban = `http://127.0.0.1:${sunucu.address().port}`;
  let basarisiz = 0;
  for (const PROGRAM of PROGRAMLAR) {
    const ad = path.basename(PROGRAM);
    const BEKLENEN = PROGRAM.replace(/\.y$/, '.beklenen.txt');
    const js = await calistir(process.execPath, [path.join(KOK, 'js', 'dist', 'cli.js'), PROGRAM, taban]);
    const py = await calistir('python3', [path.join(KOK, 'yontem.py'), PROGRAM, taban]);
    if (js.kod !== 0) { basarisiz++; console.log(`BAŞARISIZ  ${ad}: JavaScript (çıkış kodu ${js.kod})\n${js.cikti}${js.hata}`); }
    if (process.argv.includes('--guncelle') && js.kod === 0) { fs.writeFileSync(BEKLENEN, js.cikti); console.log(`yazıldı    ${BEKLENEN}`); }
    const beklenen = fs.existsSync(BEKLENEN) ? fs.readFileSync(BEKLENEN, 'utf-8') : null;
    const karsilastir = (baslik, a, b, bAd) => {
      if (a === b) { console.log(`geçti      ${ad}: ${baslik}`); return; }
      basarisiz++;
      const x = a.split('\n'), z = b.split('\n');
      let i = 0; while (i < x.length && i < z.length && x[i] === z[i]) i++;
      console.log(`BAŞARISIZ  ${ad}: ${baslik} (${i + 1}. satır)\n  ${bAd}: ${z[i]}\n  çıkan: ${x[i]}`);
    };
    if (beklenen !== null) karsilastir('JavaScript çıktısı beklenenle aynı', js.cikti, beklenen, 'beklenen');
    if (py === null) console.log('atlandı    Python (python3 bulunamadı)');
    else if (py.kod !== 0) { basarisiz++; console.log(`BAŞARISIZ  ${ad}: Python (çıkış kodu ${py.kod})\n${py.cikti}${py.hata}`); }
    else karsilastir('Python çıktısı JavaScript ile aynı', py.cikti, js.cikti, 'JavaScript');
  }
  sunucu.close(); sunucu.closeAllConnections?.();
  process.exitCode = basarisiz ? 1 : 0;
});
