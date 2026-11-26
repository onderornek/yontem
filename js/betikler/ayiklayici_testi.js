// Hata ayıklayıcı sınaması: uçbirim arayüzü (komutlar standart girdiden) ve DAP arayüzü (VS Code'un konuştuğu protokol).
// Çalıştırma: npm run test:ayikla
const fs = require('fs'), os = require('os'), path = require('path');
const { spawn, spawnSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'dist', 'cli.js');
const dizin = fs.mkdtempSync(path.join(os.tmpdir(), 'yontem-ayikla-'));
const GEOMETRI = `birim Geometri

arayüz
  fonksiyon Kare(a: tamsayı): tamsayı

uygulama

fonksiyon Kare(a: tamsayı): tamsayı
değişken
  b: tamsayı
başla
  b := a * a
  dön b
bitir

bitir.
`;
const ANA = `program Ornek
kullan Geometri

tip
  Sayaç = sınıf
    değer: tamsayı
    kurucu Oluştur
    prosedür Artır(n: tamsayı)
  bitir

değişken
  i, toplam: tamsayı
  liste: liste
  s: Sayaç
  ayar: sözlük
  ad: metin

kurucu Sayaç.Oluştur
başla
  değer := 0
bitir

prosedür Sayaç.Artır(n: tamsayı)
başla
  değer := değer + n
bitir

başla
  toplam := 0
  liste := [1, 2, 3]
  ayar := ['ad': 'deneme', 'kat': 2]
  s := Sayaç.Oluştur
  oku(ad, 1)
  1'den 3'e kadar her i için
  başla
    toplam := toplam + Kare(i)
    s.Artır(i)
  bitir
  dene
    yaz(liste[7], 1)
  yakala (h)
    yaz('yakalandı', 1)
  bitir
  yaz(ad + ': ' + toplam, 1)
bitir.
`;
const ana = path.join(dizin, 'ornek.y'), geo = path.join(dizin, 'Geometri.y');
fs.writeFileSync(ana, ANA); fs.writeFileSync(geo, GEOMETRI);
fs.writeFileSync(path.join(dizin, 'girdi.txt'), 'Ayşe\n');
const satirNo = (kaynak, parca) => kaynak.split('\n').findIndex(s => s.includes(parca)) + 1;
const S_TOPLA = satirNo(ANA, 'toplam + Kare(i)'), S_ARTIR = satirNo(ANA, 'değer := değer + n'), S_KARE = satirNo(GEOMETRI, 'b := a * a');
const S_BASLA = satirNo(GEOMETRI, 'başla'), S_ILK = satirNo(ANA, 'toplam := 0'), S_HATA = satirNo(ANA, 'liste[7]'), S_SON = satirNo(ANA, "yaz(ad + ': '");

let gecen = 0, kalan = 0;
function denetle(ad, kosul, ek) {
  if (kosul) { gecen++; console.log('geçti      ' + ad); }
  else { kalan++; console.log('BAŞARISIZ  ' + ad + (ek !== undefined ? '\n           ' + (typeof ek === 'string' ? ek : JSON.stringify(ek)) : '')); }
}

// ================================================================ uçbirim arayüzü
function ucbirim(komutlar, ...arg) {
  const p = spawnSync(process.execPath, [CLI, 'ayikla', ana, ...arg], { input: komutlar.join('\n') + '\n', encoding: 'utf-8', cwd: dizin });
  return { cikti: p.stdout, hata: p.stderr, kod: p.status };
}
function ucbirimTestleri() {
  // Programın çıktısı ayıklayıcı olmadan da aynı olmalı
  const duz = spawnSync(process.execPath, [CLI, ana], { input: 'Ayşe\n', encoding: 'utf-8', cwd: dizin });
  denetle('ayıklayıcısız çıktı', duz.stdout === 'yakalandı\nAyşe: 14\n' && duz.status === 0, duz);

  let r = ucbirim(['hatalar kapat', 'devam', 'Ayşe']);
  denetle('devam: program sonuna kadar çalışır, oku girdiyi paylaşır', r.cikti.includes('yakalandı\nAyşe: 14\n') && r.cikti.includes('Program bitti (çıkış kodu 0).') && r.kod === 0, r);
  denetle('girişte ilk deyimde durur', r.cikti.includes(`→ ${String(S_ILK).padStart(4)}    toplam := 0`), r.cikti);

  r = ucbirim([`kes ${S_TOPLA}`, 'hatalar kapat', 'd', 'Ayşe', 'dğ', 'y toplam * 2 + 1', 'd', 'y i', 'y toplam', 'bitir']);
  denetle('kesme noktasında durur', r.cikti.includes(`Kesme noktası: ornek.y:${S_TOPLA}`), r.cikti);
  denetle('değişkenler listelenir', /i = 1\n\s+toplam = 0\n\s+liste = \[1, 2, 3\]/.test(r.cikti) && r.cikti.includes("ayar = ['ad': 'deneme', 'kat': 2]") && r.cikti.includes("ad = 'Ayşe'"), r.cikti);
  denetle('ifade değerlendirilir', r.cikti.includes('(ayıkla) 1\n'), r.cikti);
  denetle('döngüde kesme noktası her turda durur', r.cikti.includes('(ayıkla) 2\n(ayıkla) 1\n'), r.cikti);
  denetle('bitir: çıkış kodu 130', r.kod === 130 && r.cikti.includes('Program sonlandırıldı.'), r);

  r = ucbirim([`kes ${S_TOPLA}`, 'hatalar kapat', 'd', 'Ayşe', 'adım', 'yğ', 'dğ', 'yukarı', 'y i', 'aşağı', 'çık', 'adım', 'dğ', 'y değer + n', 'bitir']);
  denetle('adım: birimdeki fonksiyonun içine girer', r.cikti.includes(`Kare içinde, Geometri.y:${S_KARE}`), r.cikti);
  denetle('yığın', r.cikti.includes(`→ #0  Kare  Geometri.y:${S_KARE}\n  #1  program Ornek  ornek.y:${S_TOPLA}`), r.cikti);
  denetle('yerel değişkenler', /Kare:\n\s+a = 1\n\s+sonuç = 0\n\s+b = 0/.test(r.cikti), r.cikti);
  denetle('yukarı: çağıranın değişkenleri', r.cikti.includes(`#1  program Ornek  ornek.y:${S_TOPLA}`), r.cikti);
  denetle('çık: çağırana döner', r.cikti.includes('s.Artır(i)'), r.cikti);
  denetle('metod içinde nesnenin alanları', /Nesne \(ben\):\n\s+değer = 0\nSayaç\.Artır:\n\s+n = 1/.test(r.cikti), r.cikti);
  denetle('metod içinde alanlarla ifade', r.cikti.includes('(ayıkla) 1\n'), r.cikti);

  r = ucbirim([`kes Geometri:${S_BASLA} eğer a = 3`, 'kesmeler', 'hatalar kapat', 'd', 'Ayşe', 'y a', 'y a := 10', 'sil hepsi', 'd']);
  denetle('deyimsiz satırdaki kesme noktası sonraki deyime taşınır', r.cikti.includes(`Geometri.y:${S_KARE} (eğer a = 3)`) && r.cikti.includes('sonraki deyime taşındı'), r.cikti);
  denetle('koşullu kesme noktası yalnızca koşul doğruyken durur', r.cikti.includes('(ayıkla) 3\n'), r.cikti);
  denetle('atama programı etkiler', r.cikti.includes('Ayşe: 105\n'), r.cikti);   // 1 + 4 + 10*10

  r = ucbirim(['d', 'Ayşe', 'y liste', 'y Uzunluk(liste)', 'd']);
  denetle('çalışma hatasında durur (yakalanacak olsa bile)', r.cikti.includes('Hata: Liste dizini sınır dışı: 7 (uzunluk 3)') && r.cikti.includes(`ornek.y:${S_HATA}`), r.cikti);
  denetle('hata anında değerler incelenir, sonra program sürer', r.cikti.includes('(ayıkla) [1, 2, 3]\n(ayıkla) 3\n') && r.cikti.includes('yakalandı\nAyşe: 14\n'), r.cikti);

  r = ucbirim(['y yok + 1', 'y 1 +', 'kes 999', 'kes Baska:3', 'zıpla', 'bitir']);
  denetle('yanlış komutlar ayıklayıcıyı düşürmez', r.cikti.includes("Bilinmeyen komut: 'zıpla'") && r.cikti.includes('çalışan bir deyim yok') && r.cikti.includes("'Baska' bu programın dosyalarından biri değil") && (r.cikti.match(/Hata: /g) || []).length === 2 && r.kod === 130, r.cikti);

  // Akış ('üret'): gövdenin çerçevesi yalnızca gövde çalışırken yığındadır
  const AKIS = "program A\nfonksiyon Say(n: tamsayı): akış\nbaşla\n  1'den n'e kadar her i için\n    üret i * 10\nbitir\ndeğişken t: tamsayı\nbaşla\n  t := 0\n  Say(2) içindeki her x için\n    t := t + x\n  yaz(t, 1)\nbitir.\n";
  fs.writeFileSync(path.join(dizin, 'akis.y'), AKIS);
  const ak = spawnSync(process.execPath, [CLI, 'ayikla', path.join(dizin, 'akis.y')], { input: ['kes 5', 'd', 'yğ', 'dğ', 'sil hepsi', 'kes 11', 'd', 'yğ', 'sil hepsi', 'd'].join('\n') + '\n', encoding: 'utf-8', cwd: dizin });
  denetle('akış gövdesinde yığın ve yerel değişkenler', ak.stdout.includes('→ #0  Say  akis.y:5\n  #1  program A  akis.y:10') && /Say:\n\s+n = 2\n[^]*i = 1/.test(ak.stdout), ak.stdout);
  denetle('akıştan dönünce çerçeve yığından çıkar', ak.stdout.includes('→ #0  program A  akis.y:11\n(ayıkla)') && ak.stdout.includes('30\n') && ak.status === 0, ak.stdout);

  fs.writeFileSync(path.join(dizin, 'bozuk.y'), 'program B\nbaşla\n  yaz(\nbitir.\n');
  const b = spawnSync(process.execPath, [CLI, 'ayikla', path.join(dizin, 'bozuk.y')], { input: '', encoding: 'utf-8' });
  denetle('sözdizimi hatası bildirilir', b.status === 2 && b.stderr.includes('Sözdizimi hatası'), b);
}

// ================================================================ eşdeğerlik
// Ayıklama kipinde derlenen kod (her deyimde kanca, her gövdede çerçeve kaydı) programın davranışını
// değiştirmemeli: depodaki programlar iki kipte de çalıştırılır, çıktı ve çıkış kodu karşılaştırılır.
function esdegerlikTestleri() {
  const D = path.join(__dirname, '..', 'dist');
  const { ayiklamaDerle, ayiklayarakCalistir, Ayiklayici } = require(path.join(D, 'ayikla.js'));
  const { derle, kodCalistir } = require(path.join(D, 'calistir.js'));
  const { birimBulucu } = require(CLI);
  const kok = path.join(__dirname, '..', '..');
  const konak = (out, girdi) => {
    let i = 0; const g = girdi.split(/(?<=\n)/).filter(x => x !== '');
    return { yaz: s => out.push(s), okuSatir: () => i < g.length ? g[i++] : null, argumanlar: [], dosyaOku: y => fs.readFileSync(y, 'utf-8'), dosyaYaz: () => {}, dosyaVarMi: y => fs.existsSync(y), ortam: () => undefined, hata: m => out.push('!' + m + '\n') };
  };
  let ayni = 0; const farkli = [];
  for (const d of ['ornekler', 'testler', 'kitap_ornekleri', 'birim_kilavuzu', 'guvenlik_ornekleri', 'ml_kilavuz', 'gomulu_ornekler', 'arayuz_ornekleri']) {
    const klasor = path.join(kok, d);
    if (!fs.existsSync(klasor)) continue;
    for (const f of fs.readdirSync(klasor).filter(x => x.endsWith('.y')).sort()) {
      const yol = path.join(klasor, f), kaynak = fs.readFileSync(yol, 'utf-8');
      if (/^\s*(\{[^}]*\}\s*)*birim\s/i.test(kaynak)) continue;
      const girdi = fs.existsSync(yol.replace(/\.y$/, '.girdi')) ? fs.readFileSync(yol.replace(/\.y$/, '.girdi'), 'utf-8') : '';
      const { bul, dizinler } = birimBulucu(yol);
      const a = [], b = []; let ka, kb, adim = 0;
      try { ka = kodCalistir(derle(kaynak, yol, x => bul(x), dizinler), konak(a, girdi)); } catch (e) { a.push('DERLEME ' + e.message); }
      try {
        const dd = ayiklamaDerle(kaynak, yol, x => bul(x), dizinler);
        // ilk 500 duraklamada tek tek adımla (her çerçevenin değişkenlerini de oku), sonra serbest bırak
        const ayk = new Ayiklayici(dd.u, (q) => { adim++; q.cerceveler(); q.degiskenler(0, false); q.degiskenler(0, true); if (adim < 500) q.adim(); else q.devam(); }, true);
        ayk.hatadaDur = false;
        kb = ayiklayarakCalistir(dd.kod, ayk, konak(b, girdi));
      } catch (e) { b.push('DERLEME ' + e.message); }
      if (a.join('') === b.join('') && ka === kb) ayni++; else farkli.push(path.join(d, f));
    }
  }
  denetle(`ayıklama kipi programın davranışını değiştirmez (${ayni} program)`, ayni > 50 && !farkli.length, farkli);
}

// ================================================================ kılavuzdaki oturum
// Birimler ve Araçlar Kılavuzu'ndaki örnek ayıklama oturumu (birim_kilavuzu/07_ayiklama.oturum) gerçek çıktıdır:
// .komutlar dosyasındaki komutlar verilir, her istemin ardına yazılan komut eklenir. --guncelle ile yeniden üretilir.
function oturumTesti() {
  const klasor = path.join(__dirname, '..', '..', 'birim_kilavuzu');
  const komutlar = fs.readFileSync(path.join(klasor, '07_ayiklama.komutlar'), 'utf-8').split('\n').filter(Boolean);
  const p = spawnSync(process.execPath, [CLI, 'ayikla', '07_ayiklama.y'], { input: komutlar.join('\n') + '\n', encoding: 'utf-8', cwd: klasor });
  let i = 0;
  const oturum = '$ yontem ayikla 07_ayiklama.y\n' + p.stdout.replace(/\(ayıkla\) /g, (m) => i < komutlar.length ? m + komutlar[i++] + '\n' : m);
  const yol = path.join(klasor, '07_ayiklama.oturum');
  if (process.argv.includes('--guncelle')) fs.writeFileSync(yol, oturum);
  denetle('kılavuzdaki ayıklama oturumu güncel', fs.existsSync(yol) && fs.readFileSync(yol, 'utf-8') === oturum && i === komutlar.length && p.status === 0, oturum);
}

// ================================================================ DAP arayüzü
function dapIstemci() {
  const p = spawn(process.execPath, [CLI, 'ayikla', '--dap'], { stdio: ['pipe', 'pipe', 'pipe'], cwd: dizin });
  let tampon = Buffer.alloc(0), sira = 1;
  const bekleyen = new Map(), olaylar = [], olayBekleyen = [];
  let hataCiktisi = '';
  p.stderr.on('data', d => { hataCiktisi += d; });
  p.stdout.on('data', (d) => {
    tampon = Buffer.concat([tampon, d]);
    for (;;) {
      const bas = tampon.indexOf('\r\n\r\n');
      if (bas < 0) return;
      const n = Number(/Content-Length: (\d+)/.exec(tampon.subarray(0, bas).toString())[1]);
      if (tampon.length < bas + 4 + n) return;
      const m = JSON.parse(tampon.subarray(bas + 4, bas + 4 + n).toString('utf-8'));
      tampon = tampon.subarray(bas + 4 + n);
      if (m.type === 'response') { const f = bekleyen.get(m.request_seq); bekleyen.delete(m.request_seq); if (f) f(m); }
      else if (m.type === 'event') {
        const i = olayBekleyen.findIndex(b => b.ad === m.event);
        if (i >= 0) olayBekleyen.splice(i, 1)[0].coz(m.body); else olaylar.push(m);
      }
    }
  });
  const istek = (command, args = {}) => new Promise((coz) => {
    const no = sira++;
    bekleyen.set(no, coz);
    const g = Buffer.from(JSON.stringify({ seq: no, type: 'request', command, arguments: args }), 'utf-8');
    p.stdin.write(`Content-Length: ${g.length}\r\n\r\n`); p.stdin.write(g);
  });
  const olay = (ad, sure = 5000) => new Promise((coz, reddet) => {
    const i = olaylar.findIndex(o => o.event === ad);
    if (i >= 0) { coz(olaylar.splice(i, 1)[0].body); return; }
    const b = { ad, coz };
    olayBekleyen.push(b);
    setTimeout(() => { const j = olayBekleyen.indexOf(b); if (j >= 0) { olayBekleyen.splice(j, 1); reddet(new Error(`'${ad}' olayı gelmedi${hataCiktisi ? ' — ' + hataCiktisi : ''}`)); } }, sure);
  });
  const ciktilar = () => olaylar.filter(o => o.event === 'output').map(o => o.body.output).join('');
  return { p, istek, olay, ciktilar };
}

async function dapTestleri() {
  const c = dapIstemci();
  const baslangic = await c.istek('initialize', { adapterID: 'yontem', linesStartAt1: true, columnsStartAt1: true });
  denetle('DAP initialize', baslangic.success && baslangic.body.supportsConfigurationDoneRequest && baslangic.body.supportsConditionalBreakpoints, baslangic);
  await c.olay('initialized');
  const launch = c.istek('launch', { program: ana, girdi: 'girdi.txt', cwd: dizin });
  const kes = await c.istek('setBreakpoints', { source: { path: ana }, breakpoints: [{ line: S_TOPLA }, { line: S_SON }] });
  denetle('DAP kesme noktaları doğrulanır', kes.success && kes.body.breakpoints.length === 2 && kes.body.breakpoints.every(b => b.verified), kes);
  const kes2 = await c.istek('setBreakpoints', { source: { path: geo }, breakpoints: [{ line: S_BASLA, condition: 'a = 2' }] });
  denetle('DAP deyimsiz satır sonraki deyime taşınır', kes2.body.breakpoints[0].verified && kes2.body.breakpoints[0].line === S_KARE, kes2);
  await c.istek('setExceptionBreakpoints', { filters: [] });
  denetle('DAP launch', (await launch).success);
  await c.istek('configurationDone');

  let d = await c.olay('stopped');
  denetle('DAP kesme noktasında durur', d.reason === 'breakpoint', d);
  let yigin = (await c.istek('stackTrace', { threadId: 1 })).body.stackFrames;
  denetle('DAP yığın: program', yigin.length === 1 && yigin[0].line === S_TOPLA && yigin[0].source.path === ana, yigin);
  let kapsamlar = (await c.istek('scopes', { frameId: yigin[0].id })).body.scopes;
  let degiskenler = (await c.istek('variables', { variablesReference: kapsamlar[0].variablesReference })).body.variables;
  const bul = (l, ad) => l.find(v => v.name === ad);
  denetle('DAP değişkenler', bul(degiskenler, 'i').value === '1' && bul(degiskenler, 'toplam').value === '0' && bul(degiskenler, 'ad').value === "'Ayşe'" && bul(degiskenler, 'liste').variablesReference > 0, degiskenler);
  const ogeler = (await c.istek('variables', { variablesReference: bul(degiskenler, 'liste').variablesReference })).body.variables;
  denetle('DAP liste açılır', ogeler.length === 3 && ogeler[1].name === '[1]' && ogeler[1].value === '2', ogeler);
  const sozluk = (await c.istek('variables', { variablesReference: bul(degiskenler, 'ayar').variablesReference })).body.variables;
  denetle('DAP sözlük açılır', sozluk.length === 2 && sozluk[0].name === "['ad']" && sozluk[0].value === "'deneme'", sozluk);
  const nesne = (await c.istek('variables', { variablesReference: bul(degiskenler, 's').variablesReference })).body.variables;
  denetle('DAP nesne açılır', nesne.length === 1 && nesne[0].name === 'değer' && nesne[0].value === '0', nesne);
  let deger = await c.istek('evaluate', { expression: 'toplam + Uzunluk(liste)', frameId: yigin[0].id, context: 'watch' });
  denetle('DAP evaluate', deger.success && deger.body.result === '3', deger);
  deger = await c.istek('evaluate', { expression: 'yok * 2', frameId: yigin[0].id });
  denetle('DAP evaluate hatası', !deger.success && /yok/.test(deger.message), deger);

  await c.istek('stepIn', { threadId: 1 });
  d = await c.olay('stopped');
  yigin = (await c.istek('stackTrace', { threadId: 1 })).body.stackFrames;
  denetle('DAP stepIn: birimdeki fonksiyon', d.reason === 'step' && yigin.length === 2 && yigin[0].name === 'Kare' && yigin[0].line === S_KARE && yigin[0].source.path === geo && yigin[1].line === S_TOPLA, yigin);
  kapsamlar = (await c.istek('scopes', { frameId: yigin[0].id })).body.scopes;
  degiskenler = (await c.istek('variables', { variablesReference: kapsamlar[0].variablesReference })).body.variables;
  denetle('DAP yerel kapsam', kapsamlar[0].name === 'Yerel' && bul(degiskenler, 'a').value === '1', { kapsamlar, degiskenler });
  deger = await c.istek('evaluate', { expression: 'i', frameId: yigin[1].id });
  denetle('DAP evaluate: çağıranın çerçevesi', deger.body && deger.body.result === '1', deger);
  await c.istek('stepOut', { threadId: 1 });
  d = await c.olay('stopped');
  yigin = (await c.istek('stackTrace', { threadId: 1 })).body.stackFrames;
  denetle('DAP stepOut: çağırana döner', yigin.length === 1 && yigin[0].line === S_TOPLA + 1, yigin);
  await c.istek('stepIn', { threadId: 1 });
  await c.olay('stopped');
  yigin = (await c.istek('stackTrace', { threadId: 1 })).body.stackFrames;
  kapsamlar = (await c.istek('scopes', { frameId: yigin[0].id })).body.scopes;
  denetle('DAP metod: nesne kapsamı', yigin[0].name === 'Sayaç.Artır' && yigin[0].line === S_ARTIR && kapsamlar.some(k => k.name === 'Nesne (ben)'), { yigin, kapsamlar });

  // program kesme noktasını kaldır; koşullu olan (a = 2) kalsın
  await c.istek('setBreakpoints', { source: { path: ana }, breakpoints: [{ line: S_SON }] });
  await c.istek('next', { threadId: 1 });
  d = await c.olay('stopped');
  yigin = (await c.istek('stackTrace', { threadId: 1 })).body.stackFrames;
  denetle('DAP next: metottan çıkıp sonraki satıra geçer', yigin.length === 1 && yigin[0].line === S_TOPLA, yigin);
  await c.istek('continue', { threadId: 1 });
  d = await c.olay('stopped');
  yigin = (await c.istek('stackTrace', { threadId: 1 })).body.stackFrames;
  deger = await c.istek('evaluate', { expression: 'a', frameId: yigin[0].id });
  denetle('DAP koşullu kesme noktası', d.reason === 'breakpoint' && yigin[0].name === 'Kare' && deger.body.result === '2', { d, yigin, deger });

  await c.istek('setExceptionBreakpoints', { filters: ['hatalar'] });
  await c.istek('continue', { threadId: 1 });
  d = await c.olay('stopped');
  yigin = (await c.istek('stackTrace', { threadId: 1 })).body.stackFrames;
  denetle('DAP hatada durur', d.reason === 'exception' && /sınır dışı/.test(d.text) && yigin[0].line === S_HATA, { d, yigin });
  await c.istek('continue', { threadId: 1 });
  d = await c.olay('stopped');
  denetle('DAP son kesme noktası', d.reason === 'breakpoint');
  await c.istek('continue', { threadId: 1 });
  const cikis = await c.olay('exited');
  await c.olay('terminated');
  denetle('DAP program biter, çıktı iletilir', cikis.exitCode === 0 && c.ciktilar() === 'yakalandı\nAyşe: 14\n', { cikis, cikti: c.ciktilar() });
  await c.istek('disconnect');
  c.p.kill();

  // Çalışırken duraklatma ve sonlandırma
  const dongu = path.join(dizin, 'dongu.y');
  fs.writeFileSync(dongu, 'program Dongu\ndeğişken\n  n: tamsayı\nbaşla\n  n := 0\n  doğru iken\n  başla\n    n := n + 1\n  bitir\nbitir.\n');
  const c2 = dapIstemci();
  await c2.istek('initialize', {});
  await c2.olay('initialized');
  const l2 = await c2.istek('launch', { program: dongu });
  if (!l2.success) { denetle('DAP sonsuz döngü başlatılır', false, l2); c2.p.kill(); return; }
  await c2.istek('configurationDone');
  await new Promise(r => setTimeout(r, 300));
  await c2.istek('pause', { threadId: 1 });
  d = await c2.olay('stopped');
  yigin = (await c2.istek('stackTrace', { threadId: 1 })).body.stackFrames;
  deger = await c2.istek('evaluate', { expression: 'n > 1000', frameId: yigin[0].id });
  denetle('DAP çalışan program duraklatılır', d.reason === 'pause' && deger.body.result === 'doğru', { d, deger });
  await c2.istek('continue', { threadId: 1 });
  await c2.istek('terminate');
  const cikis2 = await c2.olay('exited');
  denetle('DAP çalışan program sonlandırılır', cikis2.exitCode === 130, cikis2);
  c2.p.kill();

  // Derleme hatası
  const c3 = dapIstemci();
  await c3.istek('initialize', {});
  await c3.olay('initialized');
  await c3.istek('launch', { program: path.join(dizin, 'bozuk.y') });
  await c3.istek('configurationDone');
  const cikis3 = await c3.olay('exited');
  denetle('DAP sözdizimi hatası', cikis3.exitCode === 2 && /Sözdizimi hatası/.test(c3.ciktilar()), { cikis3, cikti: c3.ciktilar() });
  c3.p.kill();
}

(async () => {
  ucbirimTestleri();
  esdegerlikTestleri();
  oturumTesti();
  try { await dapTestleri(); } catch (e) { denetle('DAP sınaması tamamlanır', false, String(e && e.stack || e)); }
  fs.rmSync(dizin, { recursive: true, force: true });
  console.log(`\n${gecen}/${gecen + kalan} denetim geçti.`);
  process.exit(kalan ? 1 : 0);
})();
