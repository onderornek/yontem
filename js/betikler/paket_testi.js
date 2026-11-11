// Paket yöneticisi sınaması: yerel bir HTTP sunucusu paketleri (tar.gz, zip, tek .y) sunar; 'yontem paket' komutları
// geçici bir projede çalıştırılır. Dış ağa çıkılmaz. Çalıştırma: npm run test:paket
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), zlib = require('zlib');
const { spawn, spawnSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'dist', 'cli.js');
const KOK = path.join(__dirname, '..', '..');
const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'yontem-paket-'));

let gecen = 0, kalan = 0;
function denetle(ad, kosul, ek) {
  if (kosul) { gecen++; console.log('geçti      ' + ad); }
  else { kalan++; console.log('BAŞARISIZ  ' + ad + (ek !== undefined ? '\n           ' + (typeof ek === 'string' ? ek : JSON.stringify(ek)) : '')); }
}

// ---------------------------------------------------------------- arşiv üreticileri
function tarGz(dosyalar, { pax = false } = {}) {
  const parcalar = [];
  const baslik = (ad, boyut, tip) => {
    const b = Buffer.alloc(512);
    b.write(ad, 0, 100, 'utf-8');
    b.write('0000644\0', 100); b.write('0000000\0', 108); b.write('0000000\0', 116);
    b.write(boyut.toString(8).padStart(11, '0') + '\0', 124);
    b.write('00000000000\0', 136);
    b.write('        ', 148);
    b.write(tip, 156);
    b.write('ustar\0' + '00', 257);
    let t = 0; for (const x of b) t += x;
    b.write(t.toString(8).padStart(6, '0') + '\0 ', 148);
    return b;
  };
  const ekle = (ad, veri, tip = '0') => { parcalar.push(baslik(ad, veri.length, tip), veri, Buffer.alloc((512 - veri.length % 512) % 512)); };
  if (pax) ekle('pax_global_header', Buffer.from('52 comment=0123456789012345678901234567890123456789\n'), 'g');
  for (const [ad, icerik] of Object.entries(dosyalar)) {
    if (icerik === null) parcalar.push(baslik(ad, 0, '5'));
    else ekle(ad, Buffer.from(icerik, 'utf-8'));
  }
  parcalar.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(parcalar));
}
function zip(dosyalar) {
  const yerel = [], merkez = [];
  let konum = 0;
  for (const [ad, icerik] of Object.entries(dosyalar)) {
    const adB = Buffer.from(ad, 'utf-8'), ham = Buffer.from(icerik, 'utf-8'), s = zlib.deflateRawSync(ham), crc = zlib.crc32 ? zlib.crc32(ham) : 0;
    const y = Buffer.alloc(30);
    y.writeUInt32LE(0x04034b50, 0); y.writeUInt16LE(20, 4); y.writeUInt16LE(0x0800, 6); y.writeUInt16LE(8, 8);
    y.writeUInt32LE(crc, 14); y.writeUInt32LE(s.length, 18); y.writeUInt32LE(ham.length, 22); y.writeUInt16LE(adB.length, 26);
    const m = Buffer.alloc(46);
    m.writeUInt32LE(0x02014b50, 0); m.writeUInt16LE(20, 4); m.writeUInt16LE(20, 6); m.writeUInt16LE(0x0800, 8); m.writeUInt16LE(8, 10);
    m.writeUInt32LE(crc, 16); m.writeUInt32LE(s.length, 20); m.writeUInt32LE(ham.length, 24); m.writeUInt16LE(adB.length, 28); m.writeUInt32LE(konum, 42);
    yerel.push(y, adB, s); merkez.push(m, adB);
    konum += 30 + adB.length + s.length;
  }
  const mB = Buffer.concat(merkez), son = Buffer.alloc(22);
  son.writeUInt32LE(0x06054b50, 0); son.writeUInt16LE(merkez.length / 2, 8); son.writeUInt16LE(merkez.length / 2, 10); son.writeUInt32LE(mB.length, 12); son.writeUInt32LE(konum, 16);
  return Buffer.concat([...yerel, mB, son]);
}

// ---------------------------------------------------------------- paket içerikleri
const SELAM = `birim Selam
kullan Metinler

arayüz
  fonksiyon Selamla(kime: metin): metin

uygulama

fonksiyon Selamla(kime: metin): metin
başla
  dön 'Merhaba, ' + Büyült(kime) + '!'
bitir

bitir.
`;
const metinler = (ek) => `birim Metinler

arayüz
  fonksiyon Büyült(m: metin): metin

uygulama

fonksiyon Büyült(m: metin): metin
başla
  dön BüyükHarf(m)${ek}
bitir

bitir.
`;
const SAYILAR = `birim Sayılar

arayüz
  fonksiyon İkiKat(n: tamsayı): tamsayı

uygulama

fonksiyon İkiKat(n: tamsayı): tamsayı
başla
  dön n * 2
bitir

bitir.
`;
const PROGRAM = `program Deneme
kullan Selam, Sayılar

başla
  yaz(Selamla('dünya'), 1)
  yaz(İkiKat(21), 1)
bitir.
`;

let sunulan = {};          // yol → Buffer
let istekler = [];
const sunucu = http.createServer((q, r) => {
  istekler.push(q.url);
  if (q.url === '/yonlendir') { r.writeHead(302, { Location: '/sayilar.y' }); r.end(); return; }
  const v = sunulan[q.url];
  if (!v) { r.writeHead(404); r.end('yok'); return; }
  r.writeHead(200, { 'Content-Type': 'application/octet-stream' }); r.end(v);
});

function calistir(arg, cwd, girdi) {
  return new Promise((coz) => {
    const p = spawn(process.execPath, [CLI, ...arg], { cwd, env: { ...process.env, NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' } });
    let cikti = '', hata = '';
    p.stdout.on('data', d => { cikti += d; }); p.stderr.on('data', d => { hata += d; });
    p.on('close', (kod) => coz({ kod, cikti, hata }));
    if (girdi !== undefined) p.stdin.end(girdi); else p.stdin.end();
  });
}
const oku = (...p) => fs.readFileSync(path.join(...p), 'utf-8');
const var_ = (...p) => fs.existsSync(path.join(...p));

(async () => {
  await new Promise(r => sunucu.listen(0, '127.0.0.1', r));
  const T = `http://127.0.0.1:${sunucu.address().port}`;
  // Selam: GitHub biçiminde arşiv (tek üst klasör, pax başlığı, .github klasörü), Metinler'e bağımlı
  const selamArsivi = () => tarGz({
    'selam-1.2.0/': null,
    'selam-1.2.0/yontem.json': JSON.stringify({ ad: 'Selam', surum: '1.2.0', bagimliliklar: { Metinler: `${T}/metinler.zip` } }),
    'selam-1.2.0/kutuphane/Selam.y': SELAM,
    'selam-1.2.0/README.md': '# Selam\n',
    'selam-1.2.0/.github/workflows/x.yml': 'gizli',
    'selam-1.2.0/paketler/Eski/Eski.y': 'birim Eski\nbitir.\n',
  }, { pax: true });
  sunulan = {
    '/selam-1.2.0.tar.gz': selamArsivi(),
    '/metinler.zip': zip({ 'Metinler.y': metinler(''), 'LISANS.txt': 'MIT\n' }),
    '/sayilar.y': Buffer.from(SAYILAR),
    '/kotu.tar.gz': tarGz({ 'p/../../kacak.y': 'birim Kacak\nbitir.\n' }),
    '/kotu.zip': zip({ '../kacak.y': 'birim Kacak\nbitir.\n' }),
    '/bos.tar.gz': tarGz({ 'p/README.md': 'birim yok' }),
    '/cop.bin': Buffer.from('ne arşiv ne birim'),
  };

  const proje = path.join(gecici, 'proje');
  let r = await calistir(['yeni', 'proje'], gecici);
  denetle("'yontem yeni' bildirim dosyası oluşturur", r.kod === 0 && JSON.parse(oku(proje, 'yontem.json')).ad === 'proje' && oku(proje, '.gitignore').includes('paketler/'), r);
  fs.writeFileSync(path.join(proje, 'deneme.y'), PROGRAM);

  r = await calistir(['paket', 'liste'], proje);
  denetle('boş projede liste', r.kod === 0 && r.cikti.includes('Paket yok'), r);
  r = await calistir(['deneme.y'], proje);
  denetle('paket kurulmadan birim bulunamaz', r.kod !== 0 && /Birim bulunamadı: 'Selam'/.test(r.hata), r);

  // ---- ekle: tar.gz + geçişli bağımlılık (zip)
  r = await calistir(['paket', 'ekle', `${T}/selam-1.2.0.tar.gz`], proje);
  denetle('ekle: tar.gz paketi, adı paketin bildiriminden', r.kod === 0 && /Selam eklendi\. Programınızda: kullan Selam/.test(r.cikti), r);
  denetle('ekle: birimler ve geçişli bağımlılık kurulur', var_(proje, 'paketler', 'Selam', 'kutuphane', 'Selam.y') && var_(proje, 'paketler', 'Metinler', 'Metinler.y') && var_(proje, 'paketler', 'Metinler', 'LISANS.txt'));
  denetle('ekle: gizli klasörler ve iç içe paketler alınmaz', !var_(proje, 'paketler', 'Selam', '.github') && !var_(proje, 'paketler', 'Selam', 'paketler') && var_(proje, 'paketler', 'Selam', 'README.md'));
  let bildirim = JSON.parse(oku(proje, 'yontem.json')), kilit = JSON.parse(oku(proje, 'yontem.kilit.json'));
  denetle('bildirim yalnızca doğrudan bağımlılığı içerir', JSON.stringify(Object.keys(bildirim.bagimliliklar)) === '["Selam"]' && bildirim.ad === 'proje', bildirim);
  denetle('kilit: iki paket, sürüm, özet ve isteyen', kilit.paketler.Selam.surum === '1.2.0' && /^[0-9a-f]{64}$/.test(kilit.paketler.Selam.sha256) && kilit.paketler.Metinler.isteyen === 'Selam' && !kilit.paketler.Selam.isteyen, kilit);

  // ---- ekle: tek .y dosyası, yönlendirme, --ad
  r = await calistir(['paket', 'ekle', `${T}/yonlendir`, '--ad', 'Sayılar'], proje);
  denetle('ekle: tek .y dosyası (yönlendirmeyle, --ad ile)', r.kod === 0 && var_(proje, 'paketler', 'Sayılar', 'sayilar.y'), r);

  // ---- program iki çalışma zamanında da paketleri bulur
  r = await calistir(['deneme.y'], proje);
  denetle('JavaScript: program paketlerdeki birimleri kullanır', r.kod === 0 && r.cikti === 'Merhaba, DÜNYA!\n42\n', r);
  const py = spawnSync('python3', [path.join(KOK, 'yontem.py'), 'deneme.y'], { cwd: proje, encoding: 'utf-8' });
  if (py.error) console.log('atlandı    Python bulunamadı');
  else denetle('Python: aynı çıktı', py.status === 0 && py.stdout === 'Merhaba, DÜNYA!\n42\n', py);
  fs.mkdirSync(path.join(proje, 'testler', 'alt'), { recursive: true });
  fs.writeFileSync(path.join(proje, 'testler', 'alt', 'ic.y'), PROGRAM);
  r = await calistir([path.join('testler', 'alt', 'ic.y')], proje);
  denetle('alt klasördeki program proje kökündeki paketleri bulur', r.kod === 0 && r.cikti.includes('42'), r);

  r = await calistir(['paket', 'liste'], proje);
  denetle('liste', /Metinler\s+\(Selam istiyor\)/.test(r.cikti) && r.cikti.includes('Selam 1.2.0') && r.cikti.includes('birimler: Selam') && r.cikti.includes('Sayılar'), r);

  // ---- kur: sıfırdan, kilitle doğrulayarak
  fs.rmSync(path.join(proje, 'paketler'), { recursive: true });
  istekler = [];
  r = await calistir(['paket', 'kur'], proje);
  denetle('kur: paketler/ silinince yeniden kurar', r.kod === 0 && /kuruldu: Selam, Sayılar, Metinler/.test(r.cikti) && var_(proje, 'paketler', 'Metinler', 'Metinler.y'), r);
  istekler = [];
  r = await calistir(['paket', 'kur'], proje);
  denetle('kur: her şey güncelse indirmez', r.kod === 0 && /3 paket zaten güncel/.test(r.cikti) && istekler.length === 0, { r, istekler });
  fs.appendFileSync(path.join(proje, 'paketler', 'Metinler', 'Metinler.y'), '{ elle değişiklik }\n');
  r = await calistir(['paket', 'kur'], proje);
  denetle('kur: elle değiştirilen paketi onarır', r.kod === 0 && /kuruldu: Metinler/.test(r.cikti) && !oku(proje, 'paketler', 'Metinler', 'Metinler.y').includes('elle'), r);

  // ---- bütünlük: kaynak değişirse kur reddeder, guncelle kabul eder
  sunulan['/metinler.zip'] = zip({ 'Metinler.y': metinler(" + '?'"), 'LISANS.txt': 'MIT\n' });
  fs.rmSync(path.join(proje, 'paketler'), { recursive: true });
  r = await calistir(['paket', 'kur'], proje);
  denetle('kur: içerik kilitten farklıysa reddeder', r.kod === 1 && /kilit dosyasındakiyle aynı değil/.test(r.hata) && /yontem paket guncelle Metinler/.test(r.hata) && !var_(proje, 'paketler', 'Metinler'), r);
  denetle('reddedilen kurulum kilidi değiştirmez', JSON.parse(oku(proje, 'yontem.kilit.json')).paketler.Metinler.sha256 === kilit.paketler.Metinler.sha256);
  r = await calistir(['paket', 'guncelle', 'Metinler'], proje);
  denetle('guncelle: yeni içeriği kabul eder', r.kod === 0 && /içeriği değişen: Metinler/.test(r.cikti), r);
  r = await calistir(['deneme.y'], proje);
  denetle('güncellenen paket kullanılır', r.cikti === 'Merhaba, DÜNYA?!\n42\n', r);
  r = await calistir(['paket', 'guncelle'], proje);
  denetle('guncelle: değişiklik yoksa söyler', r.kod === 0 && /Hiçbir paketin içeriği değişmedi/.test(r.cikti), r);

  // ---- yerel klasör kaynağı
  const yerel = path.join(gecici, 'yerel-paket');
  fs.mkdirSync(yerel);
  fs.writeFileSync(path.join(yerel, 'Yerel.y'), "birim Yerel\n\narayüz\n  fonksiyon Bir: tamsayı\n\nuygulama\n\nfonksiyon Bir: tamsayı\nbaşla\n  dön 1\nbitir\n\nbitir.\n");
  r = await calistir(['paket', 'ekle', '../yerel-paket', '--ad', 'Yerel'], proje);
  denetle('ekle: yerel klasör', r.kod === 0 && var_(proje, 'paketler', 'Yerel', 'Yerel.y'), r);
  fs.appendFileSync(path.join(yerel, 'Yerel.y'), '{ yeni }\n');
  r = await calistir(['paket', 'kur'], proje);
  denetle('kur: yerel kaynak değişince yeniden kopyalanır', r.kod === 0 && oku(proje, 'paketler', 'Yerel', 'Yerel.y').includes('{ yeni }'), r);

  // ---- kaldır
  r = await calistir(['paket', 'kaldir', 'Metinler'], proje);
  denetle('kaldir: dolaylı paket doğrudan kaldırılamaz', r.kod === 1 && /Selam paketi istiyor/.test(r.hata), r);
  r = await calistir(['paket', 'kaldir', 'selam'], proje);
  denetle('kaldir: paketi ve artık gerekmeyen bağımlılığını kaldırır', r.kod === 0 && !var_(proje, 'paketler', 'Selam') && !var_(proje, 'paketler', 'Metinler') && var_(proje, 'paketler', 'Sayılar') && /kaldırıldı: /.test(r.cikti), r);
  kilit = JSON.parse(oku(proje, 'yontem.kilit.json'));
  denetle('kaldir: kilit ve bildirim güncellenir', !kilit.paketler.Selam && !kilit.paketler.Metinler && kilit.paketler['Sayılar'] && !JSON.parse(oku(proje, 'yontem.json')).bagimliliklar.Selam, kilit);

  // ---- güvenlik ve hatalar
  const once = oku(proje, 'yontem.json');
  r = await calistir(['paket', 'ekle', `${T}/kotu.tar.gz`, '--ad', 'Kotu'], proje);
  denetle('tar: klasör dışına çıkan yol reddedilir', r.kod === 1 && /güvenli olmayan yol/.test(r.hata) && !var_(gecici, 'kacak.y') && !var_(proje, 'kacak.y'), r);
  r = await calistir(['paket', 'ekle', `${T}/kotu.zip`, '--ad', 'Kotu'], proje);
  denetle('zip: klasör dışına çıkan yol reddedilir', r.kod === 1 && /güvenli olmayan yol/.test(r.hata) && !var_(gecici, 'kacak.y'), r);
  denetle('başarısız ekleme bildirimi değiştirmez', oku(proje, 'yontem.json') === once && !var_(proje, 'paketler', 'Kotu'));
  r = await calistir(['paket', 'ekle', `${T}/bos.tar.gz`, '--ad', 'Bos'], proje);
  denetle('birim içermeyen paket reddedilir', r.kod === 1 && /Pakette birim yok/.test(r.hata), r);
  r = await calistir(['paket', 'ekle', `${T}/cop.bin`, '--ad', 'Cop'], proje);
  denetle('tanınmayan içerik reddedilir', r.kod === 1 && /Kaynak tanınmadı/.test(r.hata), r);
  r = await calistir(['paket', 'ekle', `${T}/yok.tar.gz`], proje);
  denetle('bulunamayan adres', r.kod === 1 && /İndirilemedi \(404\)/.test(r.hata), r);
  r = await calistir(['paket', 'ekle', 'http://example.com/paket.tar.gz'], proje);
  denetle('HTTPS olmayan adres reddedilir', r.kod === 1 && /yalnızca HTTPS/.test(r.hata), r);
  r = await calistir(['paket', 'ekle', 'ftp://example.com/x.y'], proje);
  denetle('bilinmeyen kaynak türü', r.kod === 1 && /Bilinmeyen kaynak türü/.test(r.hata), r);
  r = await calistir(['paket', 'ekle', `${T}/sayilar.y`, '--ad', '9kotu'], proje);
  denetle('geçersiz paket adı', r.kod === 1 && /Geçersiz paket adı/.test(r.hata), r);
  r = await calistir(['paket', 'zıpla'], proje);
  denetle('bilinmeyen komut', r.kod === 1 && /Bilinmeyen paket komutu/.test(r.hata), r);

  // ---- çakışma: aynı ad, iki farklı kaynak
  sunulan['/a.tar.gz'] = tarGz({ 'a/A.y': 'birim A\nbitir.\n', 'a/yontem.json': JSON.stringify({ ad: 'A', bagimliliklar: { 'Sayılar': `${T}/baska-sayilar.y` } }) });
  r = await calistir(['paket', 'ekle', `${T}/a.tar.gz`], proje);
  denetle('aynı paket iki farklı kaynaktan istenirse durur', r.kod === 1 && /iki farklı kaynaktan isteniyor/.test(r.hata) && oku(proje, 'yontem.json') === once, r);

  sunucu.close();
  fs.rmSync(gecici, { recursive: true, force: true });
  console.log(`\n${gecen}/${gecen + kalan} denetim geçti.`);
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error(e); sunucu.close(); process.exit(1); });
