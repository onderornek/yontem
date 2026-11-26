#!/usr/bin/env node
// Yöntem komut satırı: yontem program.y [argümanlar] | yontem derle program.y [-o çıktı.js]
import './dugum_hazirlik';
import { paketDizinleri, projeKoku } from './paket';
import * as fs from 'fs';
import * as path from 'path';
import { katla } from './sozcuk';
import { derle, kodCalistir, hataIsle } from './calistir';
import { coz } from './cozumleyici';
import { Tani, YontemHatasi } from './hatalar';
import { projeYaz, masaustuDerle } from './gomulu/proje';
import { uygulamaYaz } from './paket_uygulama';
import { bicimle } from './bicimle';
import { spawnSync } from 'child_process';
import * as os from 'os';

const SURUM = '0.6.1';

function kutuphaneDizini(): string {
  // dist/cli.js → ../../kutuphane (depo kökü) ya da ../kutuphane (paket)
  const adaylar = [path.join(__dirname, '..', '..', 'kutuphane'), path.join(__dirname, '..', 'kutuphane')];
  return adaylar.find(d => fs.existsSync(d)) ?? adaylar[0];
}

export function birimBulucu(programYolu: string) {
  const dizin = path.dirname(path.resolve(programYolu));
  const ust = path.dirname(dizin);
  const dizinler = [dizin, path.join(dizin, 'kutuphane'), ...(/^(testler|tests?)$/i.test(path.basename(dizin)) ? [ust, path.join(ust, 'kutuphane')] : []), kutuphaneDizini()];
  for (const y of (process.env.YONTEM_YOL || '').split(path.delimiter)) if (y) dizinler.push(y);
  dizinler.push(...paketDizinleri(dizin));        // 'yontem paket' ile kurulan paketler (en son aranır)
  const bul = (ad: string) => {
    for (const dz of dizinler) {
      if (!fs.existsSync(dz) || !fs.statSync(dz).isDirectory()) continue;
      for (const f of fs.readdirSync(dz)) {
        const uz = path.extname(f);
        if (uz.toLowerCase() === '.y' && katla(path.basename(f, uz)) === ad) {
          const yol = path.join(dz, f);
          return { yol, kaynak: fs.readFileSync(yol, 'utf-8') };
        }
      }
    }
    return null;
  };
  return { bul, dizinler };
}

function stdinSatirlari() {
  let satirlar: string[] | null = null, i = 0;
  return () => {
    if (satirlar === null) {
      let metin = '';
      try { metin = fs.readFileSync(0, 'utf-8'); } catch { metin = ''; }
      satirlar = metin.split(/(?<=\n)/);
      if (satirlar.length && satirlar[satirlar.length - 1] === '') satirlar.pop();
    }
    return i < satirlar.length ? satirlar[i++] : null;
  };
}

function cikisYazici() {
  let tampon = '';
  const bosalt = () => { if (tampon) { fs.writeSync(1, tampon); tampon = ''; } };
  return { yaz: (s: string) => { tampon += s; if (tampon.length > 1 << 16) bosalt(); }, bosalt };
}

/** Projenin yontem.json dosyasında "kati": true varsa projenin kendi dosyaları (paketler hariç) katı kipte derlenir */
export function katiSecici(programYolu: string, zorla = false): ((dosya: string) => boolean) | undefined {
  const ana = path.resolve(programYolu);
  const kok = projeKoku(path.dirname(ana));
  let proje = false;
  if (kok) { try { proje = JSON.parse(fs.readFileSync(path.join(kok, 'yontem.json'), 'utf-8')).kati === true; } catch { /* bozuk bildirim: yok say */ } }
  if (!proje && !zorla) return undefined;
  return (dosya: string) => {
    const d = path.resolve(dosya);
    if (zorla && d === ana) return true;
    return proje && d.startsWith(kok + path.sep) && !d.startsWith(path.join(kok!, 'paketler') + path.sep);
  };
}

function derleDosya(yol: string, kati = false, uyarilar?: Tani[]): string {
  const kaynak = fs.readFileSync(yol, 'utf-8');
  const { bul, dizinler } = birimBulucu(yol);
  return derle(kaynak, yol, (ad) => bul(ad), dizinler, katiSecici(yol, kati), uyarilar);
}

function main(argv: string[]): number {
  if (!argv.length || argv[0] === '--yardim' || argv[0] === '-h') {
    console.log(`Yöntem ${SURUM} — Yöntem → JavaScript derleyicisi\n\nKullanım:\n  yontem program.y [argümanlar]     programı derleyip çalıştırır\n  yontem derle program.y [-o a.js]  JavaScript çıktısı üretir
  yontem gomulu program.y [-o klasör]   ESP32 (Arduino/PlatformIO) projesi üretir
  yontem gomulu program.y --calistir    C++ olarak derleyip masaüstü benzetiminde çalıştırır
  yontem paketle program.y [-o klasör] [--mobil] [--ad "Uygulama adı"]
                                        Pencere/Mobil programını web uygulamasına (--mobil: telefona kurulabilen PWA) çevirir
  yontem test [klasör ya da dosyalar] [--guncelle]
                                        .y dosyalarını çalıştırır, çıktıyı yanındaki .beklenen dosyasıyla karşılaştırır
  yontem sina program.y                 programdaki 'sına' bloklarını ayrı ayrı çalıştırıp geçen ve kalanları raporlar
  yontem bicimle <dosya ya da klasör>… [--denetle]
                                        girintiyi ve boşlukları düzenler (--denetle: değiştirmeden yalnızca bildirir)
  yontem yeni <ad>                      yeni proje klasörü oluşturur (program, test, BENIOKU)
  yontem denetle <dosya ya da klasör>… [--kati]
                                        programları çalıştırmadan derler; katı kipteki ({$katı}) dosyaların tip hatalarını listeler
                                        (--kati: yönerge olmasa da katı kipte denetler)
  yontem paket ekle|kur|kaldir|guncelle|liste
                                        paket yöneticisi: birimleri GitHub'dan, bir adresten ya da klasörden kurar
  yontem ayikla program.y [argümanlar]  hata ayıklayıcı: adım adım çalıştırma, kesme noktaları, değişkenler
  yontem dil-sunucusu  (ya da: lsp)     düzenleyiciler için dil sunucusu (LSP, standart girdi/çıktı)\n  yontem --surum`);
    return 0;
  }
  if (argv[0] === '--surum') { console.log(`Yöntem ${SURUM} (JavaScript)`); return 0; }
  const hataYaz = (m: string) => process.stderr.write(m + '\n');
  if (argv[0] === 'gomulu' || argv[0] === 'gömülü') return gomulu(argv.slice(1), hataYaz);
  if (argv[0] === 'paketle') return paketle(argv.slice(1), hataYaz);
  if (argv[0] === 'test') return test(argv.slice(1), hataYaz);
  if (argv[0] === 'sina' || argv[0] === 'sına') return sinaKomutu(argv.slice(1), hataYaz);
  if (argv[0] === 'yeni') return yeni(argv.slice(1), hataYaz);
  if (argv[0] === 'bicimle' || argv[0] === 'biçimle') return bicimleKomutu(argv.slice(1), hataYaz);
  if (argv[0] === 'dil-sunucusu' || argv[0] === 'lsp') {
    // Düzenleyiciler bu komutu başlatır ve standart girdi/çıktı üzerinden LSP konuşur
    require('./dil_sunucusu').sunucuyuBaslat(birimBulucu, process.stdin, process.stdout, SURUM, (yol: string) => katiSecici(yol));
    return 0;
  }
  if (argv[0] === 'denetle') return denetle(argv.slice(1), hataYaz);
  if (argv[0] === 'paket') {
    // İndirme eşzamansızdır; çıkış kodu iş bitince belirlenir
    require('./paket').paketKomutu(argv.slice(1), (m: string) => console.log(m), hataYaz)
      .then((k: number) => { process.exitCode = k; }, (e: any) => { hataYaz(`Paket hatası: ${e && e.stack ? e.stack : e}`); process.exitCode = 1; });
    return 0;
  }
  if (argv[0] === 'ayikla' || argv[0] === 'ayıkla') {
    if (argv[1] === '--dap') {                     // düzenleyiciler için: Debug Adapter Protocol
      require('./ayikla_dap').dapBaslat(process.stdin, process.stdout);
      return 0;
    }
    if (!argv[1]) { hataYaz('Kullanım: yontem ayikla program.y [argümanlar]'); return 1; }
    return require('./ayikla').ucbirimAyikla(argv[1], argv.slice(2), birimBulucu, dugumHttp);
  }
  if (argv[0] === 'derle') {
    const yol = argv[1];
    if (!yol) { hataYaz('Derlenecek dosya verilmedi'); return 1; }
    const oi = argv.indexOf('-o');
    const cikti = oi > 0 ? argv[oi + 1] : yol.replace(/\.y$/i, '') + '.js';
    try {
      const kod = derleDosya(yol);
      const calisma = path.relative(path.dirname(path.resolve(cikti)), path.join(__dirname, 'cli.js')).replace(/\\/g, '/');
      const kabuk = `#!/usr/bin/env node\n// Yöntem derleyicisiyle üretildi: ${path.basename(yol)}\n// Yöntem çalışma zamanı: (c) 2026 Önder Örnek, MIT lisansı\nconst Y_ = require(${JSON.stringify(calisma.startsWith('.') ? calisma : './' + calisma)});\nprocess.exitCode = Y_.dugumCalistir(${JSON.stringify(kod)});\n`;
      fs.writeFileSync(cikti, kabuk);
      console.log(`yazıldı: ${cikti}`);
      return 0;
    } catch (e) { return hataIsle(e, { hata: hataYaz }); }
  }
  const yol = argv[0];
  if (!fs.existsSync(yol)) { hataYaz(`Dosya bulunamadı: ${yol}`); return 1; }
  let kod: string;
  try { kod = derleDosya(yol); } catch (e) { return hataIsle(e, { hata: hataYaz }); }
  if (process.env.YONTEM_KOD) fs.writeFileSync(process.env.YONTEM_KOD, kod);
  return dugumCalistir(kod, argv.slice(1));
}

// ---------------------------------------------------------------- yontem test
// Her .y dosyası ayrı bir süreçte çalışır. Yanında aynı adlı .beklenen varsa çıktı onunla bayt bayt
// karşılaştırılır; yoksa programın hatasız bitmesi (çıkış kodu 0) yeterlidir. .girdi varsa standart
// girdi olarak verilir. 'birim' dosyaları (program olmayanlar) atlanır.
function testDosyalari(hedefler: string[]): string[] {
  const out: string[] = [];
  const gez = (yol: string) => {
    const st = fs.statSync(yol);
    if (st.isDirectory()) {
      for (const f of fs.readdirSync(yol).sort()) {
        if (f === 'node_modules' || f.startsWith('.')) continue;
        gez(path.join(yol, f));
      }
    } else if (/\.y$/i.test(yol)) out.push(yol);
  };
  for (const h of hedefler) gez(h);
  return out;
}
function test(argv: string[], hataYaz: (m: string) => void): number {
  const guncelle = argv.includes('--guncelle') || argv.includes('--güncelle');
  let hedefler = argv.filter(a => !a.startsWith('--'));
  if (!hedefler.length) hedefler = [fs.existsSync('testler') ? 'testler' : '.'];
  for (const h of hedefler) if (!fs.existsSync(h)) { hataYaz(`Bulunamadı: ${h}`); return 1; }
  let gecen = 0, kalan = 0, atlanan = 0;
  const t0 = Date.now();
  for (const yol of testDosyalari(hedefler)) {
    const kaynak = fs.readFileSync(yol, 'utf-8');
    if (!/^\s*(?:\{[^}]*\}\s*|\/\/[^\n]*\n\s*)*program(?![\p{L}\p{N}_])/iu.test(kaynak)) { atlanan++; continue; }
    const kok = yol.replace(/\.y$/i, '');
    const girdi = kok + '.girdi', bek = kok + '.beklenen';
    // 'sına' blokları: rapor .sina.beklenen ile karşılaştırılır; o yoksa bütün bloklar geçmelidir
    if (SINA_DESENI.test(kaynak) && !guncelle) {
      const s = spawnSync(process.execPath, [__filename, 'sina', path.resolve(yol)], { cwd: path.dirname(path.resolve(yol)), encoding: 'utf-8', timeout: 300000, maxBuffer: 1 << 28 });
      const rapor = s.stdout ?? '', sbek = kok + '.sina.beklenen';
      const ozet = /^(\d+) geçti, (\d+) kaldı\.$/m.exec(rapor);
      const tamam = fs.existsSync(sbek) ? rapor === fs.readFileSync(sbek, 'utf-8') && (s.status === 0 || s.status === 1) : s.status === 0;
      if (!tamam) {
        console.log(`BAŞARISIZ  ${yol}  (${ozet ? `${ozet[2]} sına bloğu kaldı` : `çıkış kodu ${s.status}`}${fs.existsSync(sbek) ? '; rapor .sina.beklenen ile aynı değil' : ''})`);
        const ic = (rapor + (s.stderr ?? '')).trimEnd();
        if (ic) console.log('  ' + ic.split('\n').filter(x => !x.startsWith('geçti  ')).join('\n  '));
        kalan++; continue;
      }
      if (!fs.existsSync(bek)) { console.log(`geçti      ${yol}  (${ozet ? ozet[1] : 0} sına bloğu)`); gecen++; continue; }
    }
    const p = spawnSync(process.execPath, [__filename, path.resolve(yol)], {
      cwd: path.dirname(path.resolve(yol)), encoding: 'utf-8', timeout: 300000, maxBuffer: 1 << 28,
      input: fs.existsSync(girdi) ? fs.readFileSync(girdi, 'utf-8') : '',
    });
    const cikti = p.stdout ?? '';
    if (guncelle) {
      if (p.status === 0) { fs.writeFileSync(bek, cikti); console.log(`yazıldı    ${bek}`); gecen++; }
      else { console.log(`BAŞARISIZ  ${yol}  (çıkış kodu ${p.status}; .beklenen yazılmadı)\n${(p.stderr ?? '').trimEnd()}`); kalan++; }
      continue;
    }
    if (p.error && (p.error as any).code === 'ETIMEDOUT') { console.log(`BAŞARISIZ  ${yol}  (zaman aşımı)`); kalan++; continue; }
    if (fs.existsSync(bek)) {
      const beklenen = fs.readFileSync(bek, 'utf-8');
      if (cikti === beklenen) { console.log(`geçti      ${yol}`); gecen++; continue; }
      const a = beklenen.split('\n'), b = cikti.split('\n');
      let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
      console.log(`BAŞARISIZ  ${yol}  (çıktı ${i + 1}. satırda farklı)\n  beklenen: ${a[i] ?? '<dosya sonu>'}\n  çıkan   : ${b[i] ?? '<dosya sonu>'}`);
      if (p.stderr) console.log('  ' + p.stderr.trimEnd().split('\n').join('\n  '));
      kalan++;
    } else if (p.status === 0) { console.log(`geçti      ${yol}  (.beklenen yok; hatasız bitti)`); gecen++; }
    else { console.log(`BAŞARISIZ  ${yol}  (çıkış kodu ${p.status})\n  ${(p.stderr ?? '').trimEnd().split('\n').join('\n  ')}`); kalan++; }
  }
  const toplam = gecen + kalan;
  if (!toplam) { hataYaz('Çalıştırılacak program bulunamadı (.y uzantılı, \'program\' ile başlayan dosyalar aranır)'); return 1; }
  console.log(`\n${gecen}/${toplam} test geçti${atlanan ? `, ${atlanan} birim dosyası atlandı` : ''} (${((Date.now() - t0) / 1000).toFixed(1)} sn).`);
  return kalan ? 1 : 0;
}

// ---------------------------------------------------------------- yontem sına
/** Kaynakta 'sına' bloğu var mı? (test komutu için hızlı ön bakış; asıl karar çözümleyicinindir) */
export const SINA_DESENI = /^[ \t]*[sS][ıiIİ][nN][aA][ \t]+['"#]/mu;
/** Her 'sına' bloğunu taze bir çalışmada ayrı ayrı yürütür; Python yorumlayıcısı da aynı raporu verir. */
function sinaKomutu(argv: string[], hataYaz: (m: string) => void): number {
  const yol = argv.find(a => !a.startsWith('--'));
  if (!yol) { hataYaz('Kullanım: yontem sına program.y'); return 1; }
  if (!fs.existsSync(yol)) { hataYaz(`Bulunamadı: ${yol}`); return 1; }
  let kod: string, sinamalar: { baslik: string }[];
  try {
    sinamalar = (coz(fs.readFileSync(yol, 'utf-8'), yol) as any).sinamalar ?? [];
    kod = derleDosya(yol);
  } catch (e) { return hataIsle(e, { hata: hataYaz }); }
  if (!sinamalar.length) { hataYaz(`'${yol}' içinde 'sına' bloğu yok`); return 1; }
  let gecen = 0, kalan = 0;
  sinamalar.forEach((t, i) => {
    let cikti = '', hata: string | null = null;
    const k = kodCalistir(kod, {
      yaz: (m) => { cikti += m; }, okuSatir: () => null, argumanlar: [],
      dosyaOku: (y) => fs.readFileSync(y, 'utf-8'), dosyaYaz: (y, c, e) => e ? fs.appendFileSync(y, c) : fs.writeFileSync(y, c),
      dosyaVarMi: (y) => fs.existsSync(y), ortam: (a) => process.env[a], http: dugumHttp,
      veritabani: require('./vt_dugum').dugumVeritabani(),
      hata: (m) => { hata = m.replace(/^Çalışma hatası /, '').split(`[${yol}, `).join('['); },
      sinaSec: i,
    } as any);
    if (hata === null && k !== 0) hata = `Durdur(${k}) ile bitti`;
    if (hata === null) { gecen++; console.log(`geçti  ${t.baslik}`); return; }
    kalan++;
    console.log(`KALDI  ${t.baslik}\n       ${hata}`);
    const satirlar = cikti.replace(/\n$/, '').split('\n');
    if (cikti) for (const s of satirlar) console.log(`       | ${s}`);
  });
  console.log(`${gecen} geçti, ${kalan} kaldı.`);
  return kalan ? 1 : 0;
}

// ---------------------------------------------------------------- yontem bicimle
function bicimleKomutu(argv: string[], hataYaz: (m: string) => void): number {
  const denetle = argv.includes('--denetle');
  if (argv.includes('--stdin')) {                  // düzenleyiciler için: girdiden oku, çıktıya yaz
    try { process.stdout.write(bicimle(fs.readFileSync(0, 'utf-8'), '<girdi>')); return 0; }
    catch (e) { return hataIsle(e, { hata: hataYaz }); }
  }
  const hedefler = argv.filter(a => !a.startsWith('--'));
  if (!hedefler.length) { hataYaz('Kullanım: yontem bicimle <dosya ya da klasör>… [--denetle]'); return 1; }
  for (const h of hedefler) if (!fs.existsSync(h)) { hataYaz(`Bulunamadı: ${h}`); return 1; }
  let degisen = 0, ayni = 0, hatali = 0;
  for (const yol of testDosyalari(hedefler)) {
    const kaynak = fs.readFileSync(yol, 'utf-8');
    let sonuc: string;
    try { sonuc = bicimle(kaynak, yol); }
    catch (e) { hatali++; hataIsle(e, { hata: hataYaz }); continue; }
    if (sonuc === kaynak) { ayni++; continue; }
    degisen++;
    if (denetle) console.log(`biçimlendirilmeli  ${yol}`);
    else { fs.writeFileSync(yol, sonuc); console.log(`biçimlendirildi    ${yol}`); }
  }
  if (!degisen && !ayni && !hatali) { hataYaz('Biçimlendirilecek .y dosyası bulunamadı'); return 1; }
  console.log(`${degisen} dosya ${denetle ? 'biçimlendirilmeli' : 'biçimlendirildi'}, ${ayni} dosya zaten düzgün${hatali ? `, ${hatali} dosyada sözdizimi hatası` : ''}.`);
  return hatali || (denetle && degisen) ? 1 : 0;
}

// ---------------------------------------------------------------- yontem denetle
function uyariSirala(t: Tani[]): Tani[] {
  return [...t].sort((a, b) => (a.dosya ?? '') < (b.dosya ?? '') ? -1 : (a.dosya ?? '') > (b.dosya ?? '') ? 1 : (a.satir ?? 0) - (b.satir ?? 0));
}
// Programları çalıştırmadan derler: sözdizimi hataları, bulunamayan birimler ve katı kipteki tip hataları.
function denetle(argv: string[], hataYaz: (m: string) => void): number {
  const kati = argv.includes('--kati') || argv.includes('--katı');
  const hedefler = argv.filter(a => !a.startsWith('--'));
  for (const h of hedefler) if (!fs.existsSync(h)) { hataYaz(`Bulunamadı: ${h}`); return 1; }
  const dosyalar = testDosyalari(hedefler.length ? hedefler : ['.']).filter(d => !/(^|[\\/])paketler[\\/]/.test(d));
  let temiz = 0, hatali = 0, uyarili = 0, birim = 0, uyariSayisi = 0;
  const gorulen = new Set<string>();   // aynı birim birden çok programda kullanılınca uyarısı bir kez yazılır
  for (const yol of dosyalar) {
    const kaynak = fs.readFileSync(yol, 'utf-8');
    if (/^\s*(?:(?:\{[^}]*\}|\(\*[\s\S]*?\*\)|\/\/[^\n]*)\s*)*(birim|unit)\b/i.test(kaynak)) { birim++; continue; }   // birimler, kullanan programla denetlenir
    const uyarilar: Tani[] = [];
    let basarili = false;
    try { derleDosya(yol, kati, uyarilar); basarili = true; }
    catch (e) { hatali++; hataIsle(e, { hata: (m) => hataYaz(m.replace(/^Çalışma hatası/, 'Derleme hatası').replace(/; program çalıştırılmadı\.$/, '.')) }); }
    const yeni = uyariSirala(uyarilar).filter(t => { const a = `${t.dosya}|${t.satir}|${t.mesaj}`; if (gorulen.has(a)) return false; gorulen.add(a); return true; });
    for (const t of yeni) hataYaz(`Uyarı ${new YontemHatasi(t.mesaj, t.satir, t.dosya).metin()}`);
    uyariSayisi += yeni.length;
    if (basarili) { if (uyarilar.length) uyarili++; else temiz++; }
  }
  if (!temiz && !hatali && !uyarili) { hataYaz('Denetlenecek program bulunamadı'); return 1; }
  const parcalar = [`${temiz} program temiz`];
  if (uyarili) parcalar.push(`${uyarili} programda uyarı`);
  if (hatali) parcalar.push(`${hatali} programda hata`);
  console.log(`${parcalar.join(', ')}${uyariSayisi ? ` (${uyariSayisi} uyarı)` : ''}${birim ? ` (${birim} birim dosyası, onu kullanan programla denetlenir)` : ''}.`);
  return hatali ? 2 : 0;
}

// ---------------------------------------------------------------- yontem yeni
function yeni(argv: string[], hataYaz: (m: string) => void): number {
  const ad = argv.find(a => !a.startsWith('-'));
  if (!ad) { hataYaz('Kullanım: yontem yeni <ad>'); return 1; }
  if (!/^[\p{L}_][\p{L}\p{N}_-]*$/u.test(ad)) { hataYaz(`Geçersiz proje adı: '${ad}' (harfle başlamalı; harf, rakam, alt çizgi ve tire içerebilir)`); return 1; }
  if (fs.existsSync(ad)) { hataYaz(`'${ad}' zaten var`); return 1; }
  const programAdi = ad.replace(/-+(.)?/g, (_m, c) => c ? c.toLocaleUpperCase('tr') : '').replace(/^./, c => c.toLocaleUpperCase('tr'));
  const yaz = (yol: string, icerik: string) => { fs.mkdirSync(path.dirname(path.join(ad, yol)), { recursive: true }); fs.writeFileSync(path.join(ad, yol), icerik); };
  yaz(`${ad}.y`, `program ${programAdi}\n{ Ana program. Çalıştırmak için: yontem ${ad}.y }\nkullan Selamlar\n\nbaşla\n  yaz(Selamla('dünya'), 1)\nbitir.\n`);
  yaz('Selamlar.y', `birim Selamlar\n{ Örnek birim: programın parçalarını birimlere bölüp 'kullan' ile çağırın. }\n\narayüz\n  fonksiyon Selamla(kime: metin): metin\n\nuygulama\n\nfonksiyon Selamla(kime: metin): metin\nbaşla\n  dön 'Merhaba, ' + kime + '!'\nbitir\n\nbitir.\n`);
  yaz('testler/selam_testi.y', `program SelamTesti\n{ 'yontem test' bu dosyayı çalıştırır ve çıktıyı selam_testi.beklenen ile karşılaştırır.\n  iddia(koşul, mesaj) koşul yanlışsa programı hatayla durdurur. }\nkullan Selamlar\n\nbaşla\n  iddia(Selamla('Ayşe') = 'Merhaba, Ayşe!', 'Selamla beklenen metni vermeli')\n  yaz(Selamla('test'), 1)\nbitir.\n`);
  yaz('testler/selam_testi.beklenen', 'Merhaba, test!\n');
  yaz('BENIOKU.md', `# ${programAdi}\n\n\`\`\`bash\nyontem ${ad}.y        # çalıştır\nyontem test          # testler/ klasöründeki testleri çalıştır\nyontem test --guncelle   # .beklenen dosyalarını şimdiki çıktıyla yenile\nyontem paket ekle github:kullanici/depo@v1.0.0   # başkasının birimlerini kur\nyontem paket kur         # yontem.json içindeki paketleri kur (paketler/ depoya konmaz)\n\`\`\`\n\nBirimler ana programın yanında ya da \`kutuphane/\` klasöründe aranır; testler bir üst klasördeki birimleri \`YONTEM_YOL\` gerekmeden bulur.\n`);
  yaz('.gitignore', '*.js\n!*.y\nnode_modules/\npaketler/\n.DS_Store\n');
  yaz('yontem.json', JSON.stringify({ ad, surum: '0.1.0', bagimliliklar: {} }, null, 2) + '\n');
  console.log(`'${ad}' oluşturuldu:\n  ${ad}/${ad}.y\n  ${ad}/Selamlar.y\n  ${ad}/testler/selam_testi.y (+ .beklenen)\n  ${ad}/BENIOKU.md\n  ${ad}/yontem.json\n\nBaşlamak için:\n  cd ${ad}\n  yontem ${ad}.y\n  yontem test`);
  return 0;
}

function paketle(argv: string[], hataYaz: (m: string) => void): number {
  const deger = (bayrak: string) => { const i = argv.indexOf(bayrak); return i >= 0 ? argv[i + 1] : undefined; };
  const yol = argv.find((a, i) => !a.startsWith('-') && argv[i - 1] !== '-o' && argv[i - 1] !== '--ad');
  if (!yol) { hataYaz('Paketlenecek dosya verilmedi'); return 1; }
  if (!fs.existsSync(yol)) { hataYaz(`Dosya bulunamadı: ${yol}`); return 1; }
  const kaynak = fs.readFileSync(yol, 'utf-8');
  let kod: string;
  try { kod = derleDosya(yol); } catch (e) { return hataIsle(e, { hata: (m) => hataYaz(m.replace(/^Çalışma hatası/, 'Derleme hatası')) }); }
  const m = /^\s*program\s+([^\s;{]+)/im.exec(kaynak);
  const ad = deger('--ad') ?? (m ? m[1] : path.basename(yol, '.y')).replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2');
  const mobil = argv.includes('--mobil');
  const klasor = deger('-o') ?? path.basename(yol, path.extname(yol)) + (mobil ? '_mobil' : '_web');
  const paketYolu = path.join(__dirname, 'yontem-tarayici.js');
  if (!fs.existsSync(paketYolu)) { hataYaz("Tarayıcı paketi bulunamadı; önce 'npm run build' çalıştırın"); return 1; }
  const dosyalar = uygulamaYaz(kod, ad, klasor, mobil, paketYolu);
  console.log(`yazıldı: ${klasor}/ (${dosyalar.join(', ')})`);
  if (mobil) console.log('Telefona kurmak için klasörü HTTPS ile yayımlayın (ör. GitHub Pages, Netlify) ya da aynı ağda\n' +
    "'npx serve' ile açıp telefonun tarayıcısında 'Ana ekrana ekle' deyin.");
  return 0;
}

function gomulu(argv: string[], hataYaz: (m: string) => void): number {
  const yol = argv.find(a => !a.startsWith('-') && argv[argv.indexOf(a) - 1] !== '-o');
  if (!yol) { hataYaz('Derlenecek dosya verilmedi'); return 1; }
  if (!fs.existsSync(yol)) { hataYaz(`Dosya bulunamadı: ${yol}`); return 1; }
  const kaynak = fs.readFileSync(yol, 'utf-8');
  const { bul, dizinler } = birimBulucu(yol);
  const sec = { birimBul: (ad: string) => bul(ad), aranan: dizinler };
  try {
    if (argv.includes('--calistir') || argv.includes('--masaustu')) {
      const oi = argv.indexOf('-o');
      const cikis = oi >= 0 ? path.resolve(argv[oi + 1]) : path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'yontem-')), path.basename(yol, '.y'));
      const c = masaustuDerle(kaynak, yol, cikis, sec);
      for (const u of c.uyarilar) hataYaz('uyarı: ' + u);
      if (!argv.includes('--calistir')) { console.log(`yazıldı: ${cikis}`); return 0; }
      const p = spawnSync(cikis, argv.slice(argv.indexOf('--calistir') + 1).filter(a => a !== yol), { stdio: 'inherit' });
      return p.status ?? 1;
    }
    const oi = argv.indexOf('-o');
    const klasor = oi >= 0 ? argv[oi + 1] : path.basename(yol, path.extname(yol));
    const { cikti, ino } = projeYaz(kaynak, yol, klasor, sec);
    for (const u of cikti.uyarilar) hataYaz('uyarı: ' + u);
    console.log(`yazıldı: ${ino} (+ başlıklar, platformio.ini)`);
    return 0;
  } catch (e: any) {
    if (e && e.cppHatasi) { hataYaz(e.message); return 3; }
    return hataIsle(e, { hata: (m) => hataYaz(m.replace(/^Çalışma hatası/, 'Derleme hatası')) });
  }
}

// Ağ birimi: istek ayrı bir Node sürecinde yapılır, böylece program yanıtı eşzamanlı bekleyebilir.
const HTTP_BETIGI = `
const i = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
const yaz = (o) => process.stdout.write(JSON.stringify(o));
const d = new AbortController();
const z = setTimeout(() => d.abort(), i.zamanAsimi * 1000);
const h = new Headers();
if (!i.basliklar.some(b => b[0].toLowerCase() === 'user-agent')) h.set('User-Agent', 'Yontem/' + i.surum);
for (const [a, v] of i.basliklar) h.append(a, v);
fetch(i.adres, { method: i.yontem, headers: h, body: i.govde === null ? undefined : i.govde, signal: d.signal, redirect: 'follow' })
  .then(async (r) => {
    const b = new Uint8Array(await r.arrayBuffer());
    if (b.length > 10 * 1024 * 1024) return yaz({ hata: 'boyut' });
    const bs = {};
    r.headers.forEach((v, a) => { bs[a.toLowerCase()] = v; });
    yaz({ durum: r.status, basliklar: bs, govde: new TextDecoder('utf-8').decode(b) });
  })
  .catch((e) => yaz({ hata: d.signal.aborted ? 'zaman' : 'baglanti' }))
  .finally(() => clearTimeout(z));
`;
export function dugumHttp(istek: any): any {
  const p = spawnSync(process.execPath, ['-e', HTTP_BETIGI], {
    input: JSON.stringify({ ...istek, surum: SURUM }), encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024, timeout: (istek.zamanAsimi + 5) * 1000,
  });
  if (p.error && (p.error as any).code === 'ETIMEDOUT') return { hata: 'zaman' };
  try { return JSON.parse(p.stdout); } catch { return { hata: 'baglanti' }; }
}

export function dugumCalistir(kod: string, argumanlar: string[] = process.argv.slice(2)): number {
  const c = cikisYazici();
  const kodu = kodCalistir(kod, {
    yaz: c.yaz,
    okuSatir: stdinSatirlari(),
    argumanlar,
    dosyaOku: (y) => fs.readFileSync(y, 'utf-8'),
    dosyaYaz: (y, i, e) => e ? fs.appendFileSync(y, i) : fs.writeFileSync(y, i),
    dosyaVarMi: (y) => fs.existsSync(y),
    ortam: (a) => process.env[a],
    http: dugumHttp,
    veritabani: require('./vt_dugum').dugumVeritabani(),
    sunucu: (ayar: any, isle: (i: any) => any) => require('./sunucu_dugum').dugumSunucu((m: string) => { c.bosalt(); process.stderr.write(m + '\n'); })(ayar, (i: any) => { const r = isle(i); c.bosalt(); return r; }),
    iz: process.env.YONTEM_IZ && process.env.YONTEM_IZ !== '0' ? (m: string) => { c.bosalt(); process.stderr.write(m + '\n'); } : undefined,
    hata: (m) => { c.bosalt(); process.stderr.write(m + '\n'); },
  });
  c.bosalt();
  return kodu;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
