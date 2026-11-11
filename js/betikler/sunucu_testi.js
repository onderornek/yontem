// Sunucu biriminin ağ sınaması: aynı program (veri/sunucu_ag.txt) JavaScript ve Python ile birer portta başlatılır,
// ikisine aynı istekler gönderilir ve yanıtlar karşılaştırılır. Dış ağa çıkılmaz. Çalıştırma: npm run test:sunucu
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http');
const { spawn, spawnSync } = require('child_process');
const CLI = path.join(__dirname, '..', 'dist', 'cli.js'), KOK = path.join(__dirname, '..', '..');
const dizin = fs.mkdtempSync(path.join(os.tmpdir(), 'yontem-sunucu-'));
fs.mkdirSync(path.join(dizin, 'web', 'alt'), { recursive: true });
fs.writeFileSync(path.join(dizin, 'web', 'index.html'), '<h1>Merhaba ğüş</h1>\n');
fs.writeFileSync(path.join(dizin, 'web', 'stil.css'), 'body{}\n');
fs.writeFileSync(path.join(dizin, 'web', 'a.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 255]));
fs.writeFileSync(path.join(dizin, 'web', 'alt', 'index.html'), 'alt sayfa\n');
fs.writeFileSync(path.join(dizin, 'web', '.gizli'), 'gizli\n');
fs.writeFileSync(path.join(dizin, 'gizli.txt'), 'klasör dışı\n');
fs.writeFileSync(path.join(dizin, 's.y'), fs.readFileSync(path.join(__dirname, 'veri', 'sunucu_ag.txt'), 'utf-8'));

let gecen = 0, kalan = 0;
function denetle(ad, kosul, ek) {
  if (kosul) { gecen++; console.log('geçti      ' + ad); }
  else { kalan++; console.log('BAŞARISIZ  ' + ad + (ek !== undefined ? '\n           ' + (typeof ek === 'string' ? ek : JSON.stringify(ek)) : '')); }
}
const bosPort = () => new Promise((coz) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => coz(p)); }); });
function iste(port, yontem, yol, govde, basliklar = {}) {
  return new Promise((coz) => {
    const q = http.request({ host: '127.0.0.1', port, method: yontem, path: yol, headers: basliklar }, (r) => {
      const p = []; r.on('data', d => p.push(d));
      r.on('end', () => { const b = Buffer.concat(p); coz({ durum: r.statusCode, tur: r.headers['content-type'], uzunluk: r.headers['content-length'], nosniff: r.headers['x-content-type-options'], konum: r.headers.location, govde: /^image\//.test(r.headers['content-type'] || '') ? b.toString('hex') : b.toString('utf-8') }); });
    });
    q.on('error', (e) => coz({ hata: String(e.code || e) }));
    if (govde !== undefined) q.write(govde);
    q.end();
  });
}
const ISTEKLER = [
  ['GET', '/urunler'], ['POST', '/urunler', '{"ad":"silgi ğ","fiyat":2}'], ['GET', '/urunler/1'], ['GET', '/urunler/9'],
  ['GET', '/selam?ad=Ay%C5%9Fe+Y%C4%B1lmaz', undefined, { 'X-Deneme': 'evet' }], ['PUT', '/selam'], ['HEAD', '/urunler'],
  ['DELETE', '/urunler'], ['GET', '/olmayan'], ['GET', '/bozuk'], ['GET', '/selam?ad=%ZZ'], ['GET', '/git'],
  ['GET', '/'], ['GET', '/stil.css'], ['HEAD', '/stil.css'], ['GET', '/a.png'], ['GET', '/alt'], ['GET', '/alt/'], ['GET', '/yok.css'],
  ['GET', '/../gizli.txt'], ['GET', '/%2e%2e/gizli.txt'], ['GET', '/..%2Fgizli.txt'], ['GET', '/.gizli'], ['GET', '/alt/../../gizli.txt'],
  ['POST', '/urunler', 'x'.repeat(1100000)], ['POST', '/urunler', 'bozuk json'], ['POST', '/dur'],
];
async function calistir(ad, komut, arg) {
  const port = await bosPort();
  const p = spawn(komut, [...arg, 's.y', String(port)], { cwd: dizin });
  let cikti = '', hata = '';
  p.stdout.on('data', d => { cikti += d; }); p.stderr.on('data', d => { hata += d; });
  const bitti = new Promise(r => p.on('close', r));
  for (let i = 0; i < 100 && !/Sunucu dinliyor/.test(hata); i++) await new Promise(r => setTimeout(r, 50));
  const yanitlar = [];
  for (const [y, yol, g, b] of ISTEKLER) yanitlar.push(await iste(port, y, yol, g, b));
  const kod = await Promise.race([bitti, new Promise(r => setTimeout(() => { p.kill(); r('zaman aşımı'); }, 5000))]);
  return { ad, yanitlar, kod, cikti, hata: hata.replace(String(port), 'PORT') };
}
(async () => {
  const js = await calistir('JavaScript', process.execPath, [CLI]);
  const y = (i) => js.yanitlar[i];
  denetle('JSON listesi', y(0).durum === 200 && y(0).tur === 'application/json; charset=utf-8' && y(0).nosniff === 'nosniff' && y(0).govde.startsWith('[{"ad": "defter"'), y(0));
  denetle('POST: gövde okunur, 201 döner', y(1).durum === 201 && y(1).govde === '{"no": 2, "ad": "silgi ğ"}', y(1));
  denetle('yol parametresi ve işleyicinin 404 yanıtı', y(2).durum === 200 && y(3).durum === 404 && y(3).govde === 'Ürün yok', [y(2), y(3)]);
  denetle('sorgu ve başlıklar çözülür', y(4).govde === '<p>Merhaba, Ayşe Yılmaz! GET evet</p>' && y(5).govde.includes('PUT'), [y(4), y(5)]);
  denetle('HEAD: gövdesiz, uzunluklu', y(6).durum === 200 && y(6).govde === '' && Number(y(6).uzunluk) > 0, y(6));
  denetle('405, 404, 400', y(7).durum === 405 && y(8).durum === 404 && y(10).durum === 400, [y(7), y(8), y(10)]);
  denetle('işleyici hatası 500 olur, ayrıntı sızmaz', y(9).durum === 500 && y(9).govde === 'Sunucu hatası' && /Sunucu: GET \/bozuk: Sıfıra bölme/.test(js.hata), [y(9), js.hata]);
  denetle('yönlendirme', y(11).durum === 302 && y(11).konum === '/selam?ad=y%C3%B6n', y(11));
  denetle('statik dosyalar: index, css, ikili, alt klasör', y(12).govde === '<h1>Merhaba ğüş</h1>\n' && y(13).tur === 'text/css; charset=utf-8' && y(14).govde === '' && y(14).uzunluk === '7' && y(15).govde === '89504e4700ff' && y(16).govde === 'alt sayfa\n' && y(17).govde === 'alt sayfa\n' && y(18).durum === 404, [y(12), y(13), y(14), y(15), y(16), y(17), y(18)]);
  denetle('statik: klasör dışına ve gizli dosyalara erişilemez', [19, 20, 21, 22, 23].every(i => y(i).durum === 404 && !/klasör dışı|gizli\n/.test(y(i).govde)), [19, 20, 21, 22, 23].map(y));
  denetle('büyük gövde 413, bozuk JSON 500', y(24).durum === 413 && y(25).durum === 500, [y(24), y(25)]);
  denetle('SunucuyuDurdur: yanıt gider, program sürer ve biter', y(26).govde === 'kapanıyor' && js.kod === 0 && js.cikti.endsWith('sunucu durdu\n'), { y: y(26), kod: js.kod, cikti: js.cikti.slice(-80) });
  const py = spawnSync('python3', ['--version']).error ? null : await calistir('Python', 'python3', [path.join(KOK, 'yontem.py')]);
  if (!py) console.log('atlandı    Python bulunamadı');
  else {
    const fark = ISTEKLER.map((q, i) => JSON.stringify(js.yanitlar[i]) === JSON.stringify(py.yanitlar[i]) ? null : { istek: q.slice(0, 2), js: js.yanitlar[i], py: py.yanitlar[i] }).filter(Boolean);
    denetle(`Python sunucusu ${ISTEKLER.length} isteğe aynı yanıtları verir`, fark.length === 0, fark.slice(0, 3));
    denetle('Python çıktısı ve günlüğü aynı', py.cikti === js.cikti && py.hata === js.hata && py.kod === 0, { js: js.hata, py: py.hata });
  }
  // port kullanımda
  const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r));
  const r = spawnSync(process.execPath, [CLI, 's.y', String(s.address().port)], { cwd: dizin, encoding: 'utf-8' });
  s.close();
  denetle('dolu port açık bir hata verir', r.status === 1 && /Sunucu hatası: \d+ numaralı port kullanımda/.test(r.stderr), r.stderr);
  fs.rmSync(dizin, { recursive: true, force: true });
  console.log(`\n${gecen}/${gecen + kalan} denetim geçti.`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
