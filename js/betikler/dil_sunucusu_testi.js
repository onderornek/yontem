#!/usr/bin/env node
// Dil sunucusunun testi: 'yontem dil-sunucusu' sürecini başlatır, bir düzenleyici gibi LSP iletileri gönderir
// ve yanıtları denetler.   node js/betikler/dil_sunucusu_testi.js
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const CLI = path.resolve(__dirname, '..', 'dist', 'cli.js');
const dizin = fs.mkdtempSync(path.join(os.tmpdir(), 'yontem-lsp-'));
const HESAP = `birim Hesap

arayüz
  fonksiyon Topla(a, b: tamsayı): tamsayı
  sabit KDV = 20

uygulama

fonksiyon Topla(a, b: tamsayı): tamsayı
başla
  dön a + b
bitir

bitir.
`;
const ANA = `program Ana
kullan Hesap, Takvim

tip
  Nokta = kayıt
    x, y: ondalık
  bitir

değişken
  tutar: tamsayı
  an: tamsayı

fonksiyon İkiKat(sayı: tamsayı): tamsayı
değişken ara: tamsayı
başla
  ara := sayı * 2
  dön ara
bitir

başla
  tutar := Topla(2, 3)
  an := Şimdi
  yaz(TarihYaz(an) + ' ' + Uzunluk('abc') + ' ' + İkiKat(tutar), 1)
bitir.
`;
fs.writeFileSync(path.join(dizin, 'Hesap.y'), HESAP);
fs.writeFileSync(path.join(dizin, 'ana.y'), ANA);
const uri = pathToFileURL(path.join(dizin, 'ana.y')).toString();
const hesapUri = pathToFileURL(path.join(dizin, 'Hesap.y')).toString();

const p = spawn(process.execPath, [CLI, 'dil-sunucusu']);
let tampon = Buffer.alloc(0), kimlik = 0;
const bekleyen = new Map(), tanilar = new Map(), taniBekleyen = [];
p.stdout.on('data', (d) => {
  tampon = Buffer.concat([tampon, d]);
  for (;;) {
    const bs = tampon.indexOf('\r\n\r\n');
    if (bs < 0) return;
    const uz = Number(/Content-Length: (\d+)/.exec(tampon.subarray(0, bs).toString())[1]);
    if (tampon.length < bs + 4 + uz) return;
    const m = JSON.parse(tampon.subarray(bs + 4, bs + 4 + uz).toString('utf-8'));
    tampon = tampon.subarray(bs + 4 + uz);
    if (m.id !== undefined && bekleyen.has(m.id)) { bekleyen.get(m.id)(m); bekleyen.delete(m.id); }
    else if (m.method === 'textDocument/publishDiagnostics') { tanilar.set(m.params.uri, m.params.diagnostics); const f = taniBekleyen.shift(); if (f) f(m.params.diagnostics); }
  }
});
const yaz = (m) => { const g = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...m })); p.stdin.write(`Content-Length: ${g.length}\r\n\r\n`); p.stdin.write(g); };
const istek = (method, params) => new Promise((coz) => { const id = ++kimlik; bekleyen.set(id, (m) => coz(m.result)); yaz({ id, method, params }); });
const bildir = (method, params) => yaz({ method, params });
const taniBekle = () => new Promise((coz) => taniBekleyen.push(coz));
const konum = (metin, aranan, kaydir = 1) => { const i = metin.indexOf(aranan); const once = metin.slice(0, i).split('\n'); return { line: once.length - 1, character: once[once.length - 1].length + kaydir }; };

let basarisiz = 0, toplam = 0;
const denetle = (ad, kosul, ayrinti) => { toplam++; if (kosul) console.log(`geçti      ${ad}`); else { basarisiz++; console.log(`BAŞARISIZ  ${ad}${ayrinti !== undefined ? '\n  ' + JSON.stringify(ayrinti) : ''}`); } };
const degistir = async (metin) => { const t = taniBekle(); bildir('textDocument/didChange', { textDocument: { uri, version: ++kimlik }, contentChanges: [{ text: metin }] }); return t; };

(async () => {
  const bas = await istek('initialize', { processId: process.pid, rootUri: null, capabilities: {} });
  denetle('başlatma: yetenekler bildirildi', bas.capabilities.hoverProvider && bas.capabilities.definitionProvider && bas.capabilities.documentFormattingProvider, bas);
  bildir('initialized', {});
  let t = taniBekle();
  bildir('textDocument/didOpen', { textDocument: { uri, languageId: 'yontem', version: 1, text: ANA } });
  denetle('doğru programda tanı yok', (await t).length === 0, tanilar.get(uri));

  let d = await degistir(ANA.replace('Topla(2, 3)', 'Toplaa(2, 3)'));
  denetle('yazım hatası uyarısı', d.length === 1 && d[0].severity === 2 && /Toplaa/.test(d[0].message) && d[0].range.start.line === 20 && d[0].range.start.character === 11, d);
  d = await degistir(ANA.replace('tutar := Topla(2, 3)', 'tutar := Topla(2, 3'));
  denetle('sözdizimi hatası: hata olarak, doğru satırda', d.length === 1 && d[0].severity === 1 && d[0].range.start.line === 21, d);

  // Sözdizimi bozukken de son geçerli çözümlemeyle çalışır
  let h = await istek('textDocument/hover', { textDocument: { uri }, position: konum(ANA, 'İkiKat(tutar)') });
  denetle('bozuk belgede imza (son geçerli çözümleme)', h && /fonksiyon İkiKat\(sayı: tamsayı\): tamsayı/.test(h.contents.value), h);
  d = await degistir(ANA);
  denetle('düzeltince tanılar temizlenir', d.length === 0, d);

  h = await istek('textDocument/hover', { textDocument: { uri }, position: konum(ANA, 'TarihYaz(an)') });
  denetle('yerel birim üyesinin imzası', h && /Takvim\.TarihYaz — 1\.\.2 argüman/.test(h.contents.value), h);
  h = await istek('textDocument/hover', { textDocument: { uri }, position: konum(ANA, "Uzunluk('abc')") });
  denetle('yerleşik işlevin imzası', h && /yerleşik Uzunluk — 1 argüman/.test(h.contents.value), h);
  h = await istek('textDocument/hover', { textDocument: { uri }, position: konum(ANA, 'ara := sayı') });
  denetle('yerel değişkenin imzası', h && /değişken ara: tamsayı/.test(h.contents.value), h);
  h = await istek('textDocument/hover', { textDocument: { uri }, position: konum(ANA, 'sayı * 2') });
  denetle('parametrenin imzası', h && /parametre sayı: tamsayı/.test(h.contents.value), h);
  h = await istek('textDocument/hover', { textDocument: { uri }, position: konum(ANA, 'başla\n  tutar') });
  denetle('anahtar sözcükte imza yok', h === null, h);

  h = await istek('textDocument/hover', { textDocument: { uri }, position: konum(ANA, 'Topla(2') });
  denetle('birimdeki fonksiyonun imzası', h && /fonksiyon Topla\(a: tamsayı; b: tamsayı\): tamsayı/.test(h.contents.value), h);
  h = await istek('textDocument/hover', { textDocument: { uri }, position: konum(ANA, 'Takvim\n') });
  denetle('birim adında üyeler listelenir', h && /birim Takvim \(yerleşik\)/.test(h.contents.value) && /TarihYaz/.test(h.contents.value), h);
  let tb = await istek('textDocument/definition', { textDocument: { uri }, position: konum(ANA, 'Hesap, Takvim') });
  denetle('tanıma git: birim adından birim dosyasına', tb && tb.uri === hesapUri && tb.range.start.line === 0, tb);
  let tn = await istek('textDocument/definition', { textDocument: { uri }, position: konum(ANA, 'Topla(2') });
  denetle('tanıma git: birimdeki gövde', tn && tn.uri === hesapUri && tn.range.start.line === 8 && tn.range.start.character === 10, tn);
  tn = await istek('textDocument/definition', { textDocument: { uri }, position: konum(ANA, 'İkiKat(tutar)') });
  denetle('tanıma git: aynı dosyadaki fonksiyon', tn && tn.uri === uri && tn.range.start.line === 12, tn);
  tn = await istek('textDocument/definition', { textDocument: { uri }, position: konum(ANA, 'dön ara', 5) });
  denetle('tanıma git: yerel değişken', tn && tn.uri === uri && tn.range.start.line === 13, tn);
  tn = await istek('textDocument/definition', { textDocument: { uri }, position: konum(ANA, 'TarihYaz(an)') });
  denetle('yerel birim üyesinin kaynak konumu yok', tn === null, tn);

  const satirSonu = (metin, satirMetni) => { const s = metin.split('\n'); const i = s.findIndex(x => x.includes(satirMetni)); return { line: i, character: s[i].length }; };
  let ek = ANA.replace("  an := Şimdi\n", "  an := Şimdi\n  an := Tar\n");
  await degistir(ek);
  let tm = await istek('textDocument/completion', { textDocument: { uri }, position: satirSonu(ek, 'an := Tar') });
  const adlar = tm.map(x => x.label);
  denetle('tamamlama: birim üyeleri, yerleşikler, belge simgeleri ve anahtar sözcükler', ['TarihYaz', 'Topla', 'KDV', 'tutar', 'İkiKat', 'Uzunluk', 'değilse', 'Nokta'].every(a => adlar.includes(a)), adlar.length);
  denetle('tamamlama: başka kapsamın yerelleri önerilmez', !adlar.includes('ara') && !adlar.includes('sayı'), adlar.filter(a => a === 'ara' || a === 'sayı'));
  ek = ANA.replace("  an := Şimdi\n", "  an := Şimdi\n  an := Takvim.\n");
  await degistir(ek);
  tm = await istek('textDocument/completion', { textDocument: { uri }, position: satirSonu(ek, 'an := Takvim.') });
  denetle("tamamlama: 'Takvim.' sonrası yalnızca o birimin üyeleri", tm.length > 10 && tm.some(x => x.label === 'GünEkle') && !tm.some(x => x.label === 'Topla' || x.label === 'eğer'), tm.length);
  ek = ANA.replace("  dön ara\n", "  dön a\n");
  await degistir(ek);
  tm = await istek('textDocument/completion', { textDocument: { uri }, position: satirSonu(ek, '  dön a') });
  denetle('tamamlama: kapsamdaki yerel ve parametre', tm.some(x => x.label === 'ara') && tm.some(x => x.label === 'sayı'), tm.length);
  await degistir(ANA);

  const sm = await istek('textDocument/documentSymbol', { textDocument: { uri } });
  const nokta = sm.find(x => x.name === 'Nokta');
  denetle('belge simgeleri', sm.map(x => x.name).join(',') === 'Nokta,tutar,an,İkiKat' && nokta.children.map(x => x.name).join(',') === 'x,y' && sm[3].range.end.line > sm[3].range.start.line, sm.map(x => x.name));

  const dagin = ANA.replace('  ara := sayı * 2', 'ara := sayı * 2   ');
  await degistir(dagin);
  const bc = await istek('textDocument/formatting', { textDocument: { uri }, options: { tabSize: 2, insertSpaces: true } });
  denetle('biçimlendirme', bc.length === 1 && bc[0].newText === ANA, bc.length);
  await degistir(ANA);
  denetle('biçimli belgede düzenleme yok', (await istek('textDocument/formatting', { textDocument: { uri }, options: {} })).length === 0);

  // Açık birimdeki kaydedilmemiş değişiklik, onu kullanan programa yansır
  t = taniBekle();
  bildir('textDocument/didOpen', { textDocument: { uri: hesapUri, languageId: 'yontem', version: 1, text: HESAP.replace(/Topla/g, 'Ekle') } });
  await t;
  d = await degistir(ANA + '\n');
  denetle('açık birimdeki değişiklik programa yansır', d.length === 1 && /Topla/.test(d[0].message), d);

  await istek('shutdown', null);
  bildir('exit', null);
  console.log(`\n${toplam - basarisiz}/${toplam} denetim geçti.`);
  fs.rmSync(dizin, { recursive: true, force: true });
  process.exitCode = basarisiz ? 1 : 0;
})().catch((e) => { console.error(e); p.kill(); process.exit(1); });
setTimeout(() => { console.error('BAŞARISIZ  zaman aşımı (sunucu yanıt vermedi)'); p.kill(); process.exit(1); }, 30000).unref();
