#!/usr/bin/env node
// Ağ biriminin testi: yerel bir HTTP sunucusu başlatır, ag_testleri/ag_testi.y programını JavaScript
// derleyicisiyle ve (varsa) Python yorumlayıcısıyla çalıştırır; çıktılar birbirine ve .beklenen dosyasına eşit olmalı.
//   node js/betikler/ag_testi.js [--guncelle]
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.resolve(__dirname, '..', '..');
const PROGRAM = path.join(KOK, 'ag_testleri', 'ag_testi.y');
const BEKLENEN = PROGRAM.replace(/\.y$/, '.beklenen.txt');   // '.beklenen' değil: 'yontem test' sunucusuz çalıştırır

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
    gonder(404, 'yok');
  });
});

function calistir(komut, argumanlar) {
  return new Promise((coz) => {
    const p = spawn(komut, argumanlar, { cwd: path.dirname(PROGRAM) });
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
  const js = await calistir(process.execPath, [path.join(KOK, 'js', 'dist', 'cli.js'), PROGRAM, taban]);
  const py = await calistir('python3', [path.join(KOK, 'yontem.py'), PROGRAM, taban]);
  sunucu.close(); sunucu.closeAllConnections?.();
  if (js.kod !== 0) { basarisiz++; console.log(`BAŞARISIZ  JavaScript (çıkış kodu ${js.kod})\n${js.cikti}${js.hata}`); }
  if (process.argv.includes('--guncelle') && js.kod === 0) { fs.writeFileSync(BEKLENEN, js.cikti); console.log(`yazıldı    ${BEKLENEN}`); }
  const beklenen = fs.existsSync(BEKLENEN) ? fs.readFileSync(BEKLENEN, 'utf-8') : null;
  const karsilastir = (ad, a, b, bAd) => {
    if (a === b) { console.log(`geçti      ${ad}`); return; }
    basarisiz++;
    const x = a.split('\n'), z = b.split('\n');
    let i = 0; while (i < x.length && i < z.length && x[i] === z[i]) i++;
    console.log(`BAŞARISIZ  ${ad} (${i + 1}. satır)\n  ${bAd}: ${z[i]}\n  çıkan: ${x[i]}`);
  };
  if (beklenen !== null) karsilastir('JavaScript çıktısı beklenenle aynı', js.cikti, beklenen, 'beklenen');
  if (py === null) console.log('atlandı    Python (python3 bulunamadı)');
  else if (py.kod !== 0) { basarisiz++; console.log(`BAŞARISIZ  Python (çıkış kodu ${py.kod})\n${py.cikti}${py.hata}`); }
  else karsilastir('Python çıktısı JavaScript ile aynı', py.cikti, js.cikti, 'JavaScript');
  process.exitCode = basarisiz ? 1 : 0;
});
