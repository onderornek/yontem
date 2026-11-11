// Veritabanı biriminin sınaması: vt_testleri/vt_testi.y programı her veritabanında JavaScript ve Python ile
// çalıştırılır, çıktılar karşılaştırılır. SQLite her zaman sınanır. PostgreSQL ve MySQL sunucu gerektirir:
//   YONTEM_TEST_PG=postgres://kullanıcı:parola@localhost/vt  YONTEM_TEST_MYSQL=mysql://…  npm run test:vt
// (Node için 'pg' ve 'mysql2', Python için 'pg8000' ve 'pymysql' paketleri kurulu olmalıdır.)
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const CLI = path.join(__dirname, '..', 'dist', 'cli.js'), KOK = path.join(__dirname, '..', '..'), PROGRAM = path.join(KOK, 'vt_testleri', 'vt_testi.y');
const dizin = fs.mkdtempSync(path.join(os.tmpdir(), 'yontem-vt-'));
let gecen = 0, kalan = 0;
function denetle(ad, kosul, ek) {
  if (kosul) { gecen++; console.log('geçti      ' + ad); }
  else { kalan++; console.log('BAŞARISIZ  ' + ad + (ek !== undefined ? '\n           ' + (typeof ek === 'string' ? ek : JSON.stringify(ek)) : '')); }
}
const pythonVar = !spawnSync('python3', ['--version']).error;
const hedefler = [['SQLite', 'sqlite:' + path.join(dizin, 'deneme.db')], ['PostgreSQL', process.env.YONTEM_TEST_PG], ['MySQL', process.env.YONTEM_TEST_MYSQL]];
for (const [ad, adres] of hedefler) {
  if (!adres) { console.log(`atlandı    ${ad} (adres verilmedi)`); continue; }
  const js = spawnSync(process.execPath, [CLI, PROGRAM, adres], { encoding: 'utf-8', cwd: dizin, timeout: 60000 });
  denetle(`${ad}: JavaScript`, js.status === 0 && js.stdout.endsWith('TAMAM\n') && js.stderr === '', js.stdout.slice(-300) + js.stderr);
  if (pythonVar) {
    const py = spawnSync('python3', [path.join(KOK, 'yontem.py'), PROGRAM, adres], { encoding: 'utf-8', cwd: dizin, timeout: 60000 });
    denetle(`${ad}: Python aynı çıktıyı verir`, py.status === 0 && py.stdout === js.stdout, py.stdout.slice(-300) + py.stderr);
  }
  if (ad === 'SQLite') {
    denetle('SQLite: veritabanı dosyası oluşur', fs.existsSync(path.join(dizin, 'deneme.db')));
    denetle('SQLite: deneysel modül uyarısı çıktıya karışmaz', !/Experimental/i.test(js.stderr), js.stderr);
  }
}
// Sürücü kurulu değilse ya da sunucuya ulaşılamıyorsa açık bir hata
const r = spawnSync(process.execPath, [CLI, PROGRAM, 'postgres://yok:yok@127.0.0.1:1/yok'], { encoding: 'utf-8', cwd: dizin, timeout: 60000 });
denetle('ulaşılamayan sunucu: Veritabanı hatası', r.status === 1 && /Veritabanı hatası: /.test(r.stderr) && !/yok:yok/.test(r.stderr), r.stderr);
fs.rmSync(dizin, { recursive: true, force: true });
console.log(`\n${gecen}/${gecen + kalan} denetim geçti.`);
process.exit(kalan ? 1 : 0);
