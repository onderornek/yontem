#!/usr/bin/env node
// Yerel asistan örneklerinin testi: sahte model servisini (sahte_ollama.js) başlatır, asistan_ornekleri/
// programlarını JavaScript derleyicisiyle ve (varsa) Python yorumlayıcısıyla çalıştırır; çıktılar birbirine
// ve .beklenen.txt dosyasına eşit olmalı. Gerçek bir dil modeli kullanılmaz.
//   node js/betikler/asistan_testi.js [--guncelle]
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { olustur } = require('./sahte_ollama.js');

const KOK = path.resolve(__dirname, '..', '..');
const KLASOR = path.join(KOK, 'asistan_ornekleri');
const BELGELER = ['belgeler/izin.md', 'belgeler/kargo.md', 'belgeler/iade.md'];
const PROGRAMLAR = [
  { ad: '01_beyin' }, { ad: '02_kumanda' }, { ad: '03_duzgun_cikti' }, { ad: '04_hafiza' }, { ad: '05_is_akisi' },
  { ad: '06_asistan', argumanlar: BELGELER, girdi: fs.readFileSync(path.join(KLASOR, 'sinama', '06_asistan.girdi.txt'), 'utf-8') },
];

// Her çalıştırma kendi sunucusunu alır: sırayla verilen kayıtlı yanıtlar baştan başlar.
function calistir(komut, on, p) {
  return new Promise((coz) => {
    const sunucu = olustur();
    sunucu.listen(0, '127.0.0.1', () => {
      const ortam = { ...process.env, YONTEM_MODEL_ADRESI: `http://127.0.0.1:${sunucu.address().port}`, ASISTAN_HAFIZASI: 'sqlite::bellek:' };
      const s = spawn(komut, [...on, p.ad + '.y', ...(p.argumanlar ?? [])], { cwd: KLASOR, env: ortam });
      let cikti = '', hata = '';
      s.stdout.on('data', d => { cikti += d; });
      s.stderr.on('data', d => { hata += d; });
      const bitir = (sonuc) => { sunucu.close(); sunucu.closeAllConnections?.(); coz(sonuc); };
      s.on('error', () => bitir(null));
      s.on('close', kod => bitir({ kod, cikti, hata, istekler: sunucu.istekler }));
      s.stdin.end(p.girdi ?? '');
    });
  });
}

(async () => {
  let basarisiz = 0;
  const kaydet = (ad, tamam, ayrinti = '') => { if (!tamam) basarisiz++; console.log(`${tamam ? 'geçti     ' : 'BAŞARISIZ '} ${ad}${tamam ? '' : '\n' + ayrinti}`); };
  const fark = (a, b) => { const x = a.split('\n'), z = b.split('\n'); let i = 0; while (i < x.length && i < z.length && x[i] === z[i]) i++; return `  ${i + 1}. satır\n  beklenen: ${z[i]}\n  çıkan:    ${x[i]}`; };
  for (const p of PROGRAMLAR) {
    const beklenenYol = path.join(KLASOR, p.ad + '.beklenen.txt');   // '.beklenen' değil: 'yontem test' servissiz çalıştırır
    const js = await calistir(process.execPath, [path.join(KOK, 'js', 'dist', 'cli.js')], p);
    if (js.kod !== 0) { kaydet(`${p.ad}: JavaScript`, false, js.cikti + js.hata); continue; }
    if (process.argv.includes('--guncelle')) fs.writeFileSync(beklenenYol, js.cikti);
    const beklenen = fs.existsSync(beklenenYol) ? fs.readFileSync(beklenenYol, 'utf-8') : null;
    if (beklenen === null) kaydet(`${p.ad}: beklenen çıktı dosyası yok`, false);
    else kaydet(`${p.ad}: JavaScript çıktısı beklenenle aynı`, js.cikti === beklenen, fark(js.cikti, beklenen));
    const py = await calistir('python3', [path.join(KOK, 'yontem.py')], p);
    if (py === null) console.log(`atlandı    ${p.ad}: Python (python3 bulunamadı)`);
    else if (py.kod !== 0) kaydet(`${p.ad}: Python`, false, py.cikti + py.hata);
    else kaydet(`${p.ad}: Python çıktısı JavaScript ile aynı`, py.cikti === js.cikti, fark(py.cikti, js.cikti));
    // İki uygulama servise aynı istekleri göndermeli (yol ve gövde)
    if (py && py.kod === 0) kaydet(`${p.ad}: gönderilen istekler aynı`, JSON.stringify(py.istekler) === JSON.stringify(js.istekler),
      `  JavaScript ${js.istekler.length} istek, Python ${py.istekler.length} istek`);
  }
  process.exitCode = basarisiz ? 1 : 0;
})();
