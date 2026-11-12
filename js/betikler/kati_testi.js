// Katı kip sınaması: {$katı} yönergeli dosyalarda derleme zamanı tip denetimi. Çalıştırma: npm run test:kati
// veri/kati_hatali.txt her kuralı bir kez çiğneyen programdır; beklenen hata listesi veri/kati_hatali.beklenen.txt'tedir.
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const CLI = path.join(__dirname, '..', 'dist', 'cli.js'), VERI = path.join(__dirname, 'veri'), KOK = path.join(__dirname, '..', '..');
const dizin = fs.mkdtempSync(path.join(os.tmpdir(), 'yontem-kati-'));
let gecen = 0, kalan = 0;
function denetle(ad, kosul, ek) {
  if (kosul) { gecen++; console.log('geçti      ' + ad); }
  else { kalan++; console.log('BAŞARISIZ  ' + ad + (ek !== undefined ? '\n           ' + (typeof ek === 'string' ? ek : JSON.stringify(ek)) : '')); }
}
const y = (arg, cwd = dizin, girdi = '') => spawnSync(process.execPath, [CLI, ...arg], { cwd, encoding: 'utf-8', input: girdi });
const HATALI = fs.readFileSync(path.join(VERI, 'kati_hatali.txt'), 'utf-8');
fs.writeFileSync(path.join(dizin, 'hatali.y'), HATALI);
fs.writeFileSync(path.join(dizin, 'Arac.y'), fs.readFileSync(path.join(VERI, 'kati_arac.txt'), 'utf-8'));
const beklenen = fs.readFileSync(path.join(VERI, 'kati_hatali.beklenen.txt'), 'utf-8');

let r = y(['hatali.y']);
if (process.argv.includes('--guncelle')) fs.writeFileSync(path.join(VERI, 'kati_hatali.beklenen.txt'), r.stderr);
denetle('her kural için bir tip hatası, hepsi birden bildirilir', r.status === 2 && r.stderr === beklenen && r.stdout === '', r.stderr);
denetle('beklenen liste kuralların hepsini içerir', ['sabitinin tipi belirtilmeli', 'tipini belirtin', 'Dönüş değeri', 'parametresinin tipi', 'dönüş tipi belirtilmeli', 'bir değer atanamaz', 'Koşul mantıksal olmalı', 'işlemi metin ve tamsayı için tanımlı değil', 'argüman tamsayı olmalı', 'en az 2 argüman', 'en çok 2 argüman', 'Tanımsız tanımlayıcı'].every(p => beklenen.includes(p)));

// Öğe tipi bildirilmiş listeler/sözlükler ve yerleşik işlevlerin dönüş tipleri
fs.writeFileSync(path.join(dizin, 'liste.y'), fs.readFileSync(path.join(VERI, 'kati_liste.txt'), 'utf-8'));
r = y(['liste.y']);
if (process.argv.includes('--guncelle')) fs.writeFileSync(path.join(VERI, 'kati_liste.beklenen.txt'), r.stderr);
const listeBeklenen = fs.readFileSync(path.join(VERI, 'kati_liste.beklenen.txt'), 'utf-8');
denetle('tipli listeler: öğe, atama, Ekle, döngü ve argüman hataları', r.status === 2 && r.stderr === listeBeklenen, r.stderr);
denetle('tipli listeler: geçerli kullanımlar (satır 27-42) hata vermez', !/satır (2[7-9]|3\d|4[0-2])\]/.test(listeBeklenen) && /^16 tip hatası/m.test(listeBeklenen), listeBeklenen);

// Sınıf tipleri: atama uyumu, alan/metod erişimi, metod argümanları
fs.writeFileSync(path.join(dizin, 'sinif.y'), fs.readFileSync(path.join(VERI, 'kati_sinif.txt'), 'utf-8'));
r = y(['sinif.y']);
if (process.argv.includes('--guncelle')) fs.writeFileSync(path.join(VERI, 'kati_sinif.beklenen.txt'), r.stderr);
const sinifBeklenen = fs.readFileSync(path.join(VERI, 'kati_sinif.beklenen.txt'), 'utf-8');
denetle('sınıf tipleri: uyumsuz atama, olmayan üye, metod argümanları', r.status === 2 && r.stderr === sinifBeklenen && /^21 tip hatası/m.test(sinifBeklenen) && ['Hesap tipinde; Daire', "'çap' adında bir alan ya da metod yok", "'Daire.Taşı' en az 2 argüman", 'Şekil listesi; Nokta bir öğe konamaz'].every(p => sinifBeklenen.includes(p)), r.stderr);
denetle('sınıf tipleri: geçerli kullanımlar hata vermez', !sinifBeklenen.split('\n').some(l => { const m = /satır (\d+)\]/.exec(l); return m && Number(m[1]) < 93; }), sinifBeklenen);

// Yerleşik birimler: dönüş tipleri ve argüman sayıları
fs.writeFileSync(path.join(dizin, 'birim.y'), fs.readFileSync(path.join(VERI, 'kati_birim.txt'), 'utf-8'));
r = y(['birim.y']);
if (process.argv.includes('--guncelle')) fs.writeFileSync(path.join(VERI, 'kati_birim.beklenen.txt'), r.stderr);
const birimBeklenen = fs.readFileSync(path.join(VERI, 'kati_birim.beklenen.txt'), 'utf-8');
denetle('yerleşik birimler: dönüş tipleri ve argüman sayıları', r.status === 2 && r.stderr === birimBeklenen && /^14 tip hatası/m.test(birimBeklenen) && ["'TarihYap' en az 3 argüman", "'Maskele' en çok 2 argüman", "'Uzunluk' en az 1 argüman", "'gün' metin tipinde; tamsayı"].every(p => birimBeklenen.includes(p)), r.stderr);

// Dizi tipi yazımı: 'tip dizisi'; eski 'dizi türünde tip' yazımı iki çalışma zamanında da açıklayıcı hata verir
fs.writeFileSync(path.join(dizin, 'eski.y'), "program Eski\ndeğişken\n  a: dizi türünde tamsayı\nbaşla\nbitir.\n");
r = y(['eski.y']);
denetle("eski 'dizi türünde' yazımı yenisini gösteren hata verir", r.status === 2 && /satır 3\] 'dizi türünde tip' yazımı kaldırıldı; öğe tipini başa yazın: 'tamsayı dizisi'/.test(r.stderr), r.stderr);
for (const [eski, yeni] of [['liste türünde metin', 'tamsayı listesi'], ['sözlük türünde tamsayı', 'tamsayı sözlüğü']]) {
  fs.writeFileSync(path.join(dizin, 'eski2.y'), `program Eski\ndeğişken\n  a: ${eski}\nbaşla\nbitir.\n`);
  const e = y(['eski2.y']);
  const pe = spawnSync('python3', [path.join(KOK, 'yontem.py'), 'eski2.y'], { cwd: dizin, encoding: 'utf-8' });
  denetle(`eski '${eski.split(' ').slice(0, 2).join(' ')}' yazımı yenisini gösteren hata verir (iki çalışma zamanında)`, e.status === 2 && e.stderr.includes(`yazımı kaldırıldı; öğe tipini başa yazın: '${yeni}'`) && (pe.error || /yazımı kaldırıldı/.test(pe.stderr + pe.stdout)), e.stderr);
  fs.rmSync(path.join(dizin, 'eski2.y'));
}
const pyEski = spawnSync('python3', [path.join(KOK, 'yontem.py'), 'eski.y'], { cwd: dizin, encoding: 'utf-8' });
if (!pyEski.error) denetle('Python yorumlayıcısı da aynı hatayı verir', pyEski.status !== 0 && /yazımı kaldırıldı/.test(pyEski.stderr + pyEski.stdout), pyEski);
fs.writeFileSync(path.join(dizin, 'dizi.y'), "program Diziler\n{$katı}\ndeğişken\n  a: tamsayı dizisi\n  b: ondalık dizisi[1..3]\n  c: metin dizisi dizisi\n  d: tamsayı dizisi listesi\n  listesi: metin sözlüğü\n  dizisi: metin\nbaşla\n  a := [1, 2]\n  b[1] := 2.5\n  c := [['a'], ['b', 'c']]\n  d := [[1], [2, 3]]\n  listesi['a'] := 'b'\n  dizisi := c[1][0] + a[1] + b.Üst + Uzunluk(d)\n  yaz(dizisi, 1)\n  a := ['x']\nbitir.\n");
r = y(['dizi.y']);
denetle("'tip dizisi' yazımı: sınırlı, iç içe; öğeler katı kipte denetlenir", r.status === 2 && /satır 18\] 'a' tamsayı listesi; metin bir öğe konamaz/.test(r.stderr) && /^1 tip hatası/m.test(r.stderr), r.stderr);
fs.writeFileSync(path.join(dizin, 'dizi.y'), fs.readFileSync(path.join(dizin, 'dizi.y'), 'utf-8').replace("  a := ['x']\n", ''));
r = y(['dizi.y']);
const pyDizi = spawnSync('python3', [path.join(KOK, 'yontem.py'), 'dizi.y'], { cwd: dizin, encoding: 'utf-8' });
denetle("'tip dizisi' programı çalışır; 'dizisi' adlı değişken yeni satırda ad olarak kalır", r.status === 0 && r.stdout === 'b232\n' && (pyDizi.error || pyDizi.stdout === r.stdout), { r, py: pyDizi.stdout });
fs.rmSync(path.join(dizin, 'eski.y')); fs.rmSync(path.join(dizin, 'dizi.y'));

// Yönerge olmadan aynı program eskisi gibi derlenir (hatalar çalışırken çıkar)
fs.writeFileSync(path.join(dizin, 'gevsek.y'), HATALI.replace('{$katı}\n', ''));
r = y(['gevsek.y']);
denetle('yönerge yoksa derleme zamanı denetimi yapılmaz', r.status === 1 && /^Çalışma hatası/.test(r.stderr) && !/Tip hatası/.test(r.stderr), r.stderr);
r = y(['denetle', 'gevsek.y']);
denetle('denetle: yönergesiz program temiz sayılır', r.status === 0 && /1 program temiz/.test(r.stdout), r);
r = y(['denetle', 'gevsek.y', '--kati']);
denetle('denetle --kati: yönerge olmadan da denetler', r.status === 2 && (r.stderr.match(/Tip hatası/g) || []).length === 21 && /1 programda hata/.test(r.stdout), r.stderr);
r = y(['denetle', '.']);
denetle('denetle: klasör, birim dosyaları ayrı sayılır', r.status === 2 && /1 program temiz, 4 programda hata \(1 birim dosyası/.test(r.stdout), r.stdout);

// Birimdeki yönerge yalnızca o birimi katı yapar
fs.writeFileSync(path.join(dizin, 'Gevsek.y'), "birim Gevşek\n\narayüz\n  fonksiyon F(x)\n\nuygulama\n\nfonksiyon F(x)\nbaşla\n  dön x\nbitir\n\nbitir.\n");
fs.writeFileSync(path.join(dizin, 'kullanan.y'), "program K\n{$katı}\nkullan Gevşek\n\ndeğişken\n  a: tamsayı\n\nbaşla\n  a := F(3)\n  yaz(a, 1)\nbitir.\n");
r = y(['kullanan.y']);
denetle('katı program, katı olmayan birimi kullanabilir', r.status === 0 && r.stdout === '3\n', r);
fs.writeFileSync(path.join(dizin, 'KatiBirim.y'), "birim KatıBirim\n{$kati}\n\narayüz\n  fonksiyon G(x: tamsayı): metin\n\nuygulama\n\nfonksiyon G(x: tamsayı): metin\nbaşla\n  dön x\nbitir\n\nbitir.\n");
fs.writeFileSync(path.join(dizin, 'kullanan2.y'), "program K2\nkullan KatıBirim\n\nbaşla\n  yaz(G(1), 1)\nbitir.\n");
r = y(['kullanan2.y']);
denetle('katı birimdeki hata, onu kullanan program derlenirken bildirilir', r.status === 2 && /Tip hatası \[.*KatiBirim\.y, satır 11\] Dönüş değeri metin olmalı; tamsayı verildi/.test(r.stderr), r.stderr);

// yontem.json: "kati": true bütün projeyi katı yapar; paketler hariç
const proje = path.join(dizin, 'proje');
fs.mkdirSync(path.join(proje, 'paketler', 'Dis'), { recursive: true });
fs.writeFileSync(path.join(proje, 'yontem.json'), JSON.stringify({ ad: 'proje', kati: true }));
fs.writeFileSync(path.join(proje, 'paketler', 'Dis', 'Dis.y'), "birim Dış\n\narayüz\n  fonksiyon H(x)\n\nuygulama\n\nfonksiyon H(x)\nbaşla\n  dön x\nbitir\n\nbitir.\n");
fs.writeFileSync(path.join(proje, 'ana.y'), "program Ana\nkullan Dış\n\ndeğişken\n  a: tamsayı\n\nbaşla\n  a := 'x'\n  yaz(H(a), 1)\nbitir.\n");
r = y(['ana.y'], proje);
denetle('yontem.json "kati": proje dosyaları katı, paketler değil', r.status === 2 && /satır 8\] 'a' tamsayı tipinde; metin bir değer atanamaz/.test(r.stderr) && /^1 tip hatası/m.test(r.stderr), r.stderr);

// Geçerli katı program iki çalışma zamanında da çalışır (Python yönergeyi yorum olarak görür)
const gecerli = path.join(KOK, 'testler', 'kati_testi.y'), cikti = fs.readFileSync(gecerli.replace(/\.y$/, '.beklenen'), 'utf-8');
r = y([gecerli]);
denetle('geçerli katı program çalışır', r.status === 0 && r.stdout === cikti, r);
const py = spawnSync('python3', [path.join(KOK, 'yontem.py'), gecerli], { encoding: 'utf-8' });
if (py.error) console.log('atlandı    Python bulunamadı'); else denetle('Python aynı çıktıyı verir', py.status === 0 && py.stdout === cikti, py);

// Depodaki programlar --kati ile denetlenince yalnızca bilerek hata veren dokuz satır işaretlenir (yanlış alarm yok)
r = y(['denetle', 'ornekler', 'testler', 'kitap_ornekleri', 'birim_kilavuzu', 'guvenlik_ornekleri', 'ml_kilavuz', '--kati'], KOK);
const bulunan = (r.stderr.match(/Tip hatası \[[^\]]*\]/g) || []).map(s => s.replace(/\\/g, '/')).sort();
denetle('depodaki programlarda yanlış alarm yok', JSON.stringify(bulunan) === JSON.stringify(['Tip hatası [guvenlik_ornekleri/07_hatalar.y, satır 18]', 'Tip hatası [kitap_ornekleri/b3h.y, satır 3]', 'Tip hatası [ml_kilavuz/17_evrisimli_ag.y, satır 38]', 'Tip hatası [testler/desen_testi.y, satır 56]', 'Tip hatası [testler/dil_testi.y, satır 172]', 'Tip hatası [testler/dongu_dizi_testi.y, satır 62]', 'Tip hatası [testler/dongu_dizi_testi.y, satır 67]', 'Tip hatası [testler/dongu_dizi_testi.y, satır 72]', 'Tip hatası [testler/takvim_testi.y, satır 57]']), bulunan);

// Dil sunucusu ve hata ayıklayıcı
const { cozumle } = require(path.join(__dirname, '..', 'dist', 'dil_hizmeti.js'));
const { birimBulucu } = require(CLI);
const a = cozumle(HATALI, path.join(dizin, 'hatali.y'), (ad) => birimBulucu(path.join(dizin, 'hatali.y')).bul(ad));
denetle('dil sunucusu tip hatalarının hepsini gösterir', a.tanilar.filter(t => !t.uyari).length === 21 && a.tanilar.some(t => t.satir === 28 && /metin bir değer atanamaz/.test(t.mesaj)), a.tanilar.map(t => t.satir + ':' + t.mesaj));
r = y(['ayikla', 'hatali.y']);
denetle('hata ayıklayıcı katı kip hatalarını bildirir', r.status === 2 && /21 tip hatası/.test(r.stderr), r);

fs.rmSync(dizin, { recursive: true, force: true });
console.log(`\n${gecen}/${gecen + kalan} denetim geçti.`);
process.exit(kalan ? 1 : 0);
