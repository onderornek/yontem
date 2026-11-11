// Hata ayıklayıcı çekirdeği ve uçbirim arayüzü ('yontem ayikla program.y').
// Program hata ayıklama kipinde derlenir: her deyimden önce $.A(), her gövdenin başında $.gir() çağrılır.
// Ayiklayici bu çağrılarda kesme noktalarını ve adımlamayı denetler; duracaksa 'durdu' geri çağrısını
// eşzamanlı çağırır. Uçbirim arayüzü komutları standart girdiden, VS Code arayüzü (ayikla_dap.ts) DAP'tan alır.
import * as fs from 'fs';
import * as path from 'path';
import { $, sifirla, Konak, temsil } from './calisma/cekirdek';
import { Y } from './calisma/yerlesik';
import { yerelBirim, hataIsle } from './calistir';
import { Uretici, DerlemeSecenekleri } from './uretici';
import { YontemHatasi, DurSinyali } from './hatalar';
import { YNesne, PascalDizi } from './calisma/deger';

export interface Cerceve { id: number; g: ((k: string) => any) | null; L: number }
export interface Kesme { satir: number; kosul?: string }
export interface Durma { neden: 'giris' | 'kesme' | 'adim' | 'hata' | 'duraklat'; mesaj?: string }
export interface CerceveBilgi { ad: string; dosya: string; satir: number }
export interface DegiskenBilgi { ad: string; deger: any }

/** Programı sonlandırmak için (ayıklayıcıdan 'bitir'); DurSinyali olduğundan programın dene/yakala blokları tutamaz */
export class AyiklamaBitti extends DurSinyali { constructor() { super(130); } }

export class Ayiklayici {
  yigin: Cerceve[] = [];
  hatadaDur = true;
  /** true iken kancalar hiçbir şey yapmaz (ifade değerlendirirken) */
  askida = false;
  /** Çalışırken dışarıdan gelen istekleri yoklar; true dönerse program duraklar */
  yokla: (() => boolean) | null = null;
  private kip: 'devam' | 'adim' | 'ustunden' | 'disari' = 'adim';
  private baz = 0;
  // Bir önceki deyimin konumu (satır kodu, derinlik, deyim numarası). Aynı satırda sonraki deyime geçmek yeni
  // bir durak sayılmaz; aynı deyime geri dönmek (tek satırlık döngü gövdesi) sayılır.
  private oL = -1; private oD = -1; private oNo = 0;
  private bL = -1; private bNo = 0;      // 'sonraki' için: başlangıç derinliğinde görülen son deyim
  private kesmeYol = new Map<string, Kesme[]>();
  private kesmeL = new Map<number, Kesme>();
  private girisBekliyor: boolean;

  constructor(public u: Uretici, public durdu: (a: Ayiklayici, d: Durma) => void, giristeDur = true) {
    this.girisBekliyor = giristeDur;
    this.kip = giristeDur ? 'adim' : 'devam';
  }

  // ------------------------------------------------------------ kesme noktaları
  private tamYol(d: string) { return path.resolve(d); }
  /** Bir dosyanın kesme noktalarını değiştirir */
  kesmeleriAyarla(dosya: string, kesmeler: Kesme[]) {
    const y = this.tamYol(dosya);
    if (kesmeler.length) this.kesmeYol.set(y, kesmeler); else this.kesmeYol.delete(y);
    this.kesmeleriKur();
  }
  kesmeler(): { dosya: string; kesme: Kesme }[] {
    const out: { dosya: string; kesme: Kesme }[] = [];
    for (const [d, l] of this.kesmeYol) for (const k of l) out.push({ dosya: d, kesme: k });
    return out;
  }
  /** Dosya adları derleme sırasında numaralanır; kesme noktaları $.L koduna çevrilir */
  kesmeleriKur() {
    this.kesmeL.clear();
    this.u.dosyalar.forEach((d, no) => {
      const l = this.kesmeYol.get(this.tamYol(d));
      if (l) for (const k of l) this.kesmeL.set(no * 1e6 + k.satir, k);
    });
  }
  /** Kesme noktasının gerçekten duracağı satır: verilen satırda deyim yoksa sonraki deyim satırı; yoksa null */
  kesmeSatiri(dosya: string, satir: number): number | null {
    const no = this.u.dosyalar.findIndex(d => this.tamYol(d) === this.tamYol(dosya));
    if (no < 0) return null;
    let en: number | null = null;
    for (const L of this.u.ayiklaSatirlar) {
      if (Math.floor(L / 1e6) !== no) continue;
      const s = L % 1e6;
      if (s >= satir && (en === null || s < en)) en = s;
    }
    return en;
  }
  /** Programdaki dosyalardan adı (ya da yolunun sonu) verilenle eşleşeni bulur */
  dosyaBul(ad: string): string | null {
    const hedef = ad.replace(/\\/g, '/').toLocaleLowerCase('tr');
    for (const d of this.u.dosyalar) {
      const n = d.replace(/\\/g, '/').toLocaleLowerCase('tr');
      if (n === hedef || n.endsWith('/' + hedef) || path.basename(n) === hedef || path.basename(n, '.y') === hedef) return d;
    }
    return null;
  }

  // ------------------------------------------------------------ kancalar
  deyim(no: number) {
    if (this.askida) return;
    const L = $.L, d = this.yigin.length;
    let neden: Durma['neden'] | null = null, mesaj: string | undefined;
    const yeniDurak = L !== this.oL || d !== this.oD || no <= this.oNo;
    if (this.kip === 'adim') { if (yeniDurak) neden = this.girisBekliyor ? 'giris' : 'adim'; }
    else if (this.kip === 'ustunden') {
      if (d < this.baz || (d === this.baz && (L !== this.bL || no <= this.bNo))) neden = 'adim';
      else if (d === this.baz) { this.bL = L; this.bNo = no; }
    }
    else if (this.kip === 'disari') { if (d < this.baz) neden = 'adim'; }
    if (!neden && this.kesmeL.size && yeniDurak) {
      const k = this.kesmeL.get(L);
      if (k) {
        if (!k.kosul) neden = 'kesme';
        else {
          try { if (this.degerlendir(0, k.kosul) === true) neden = 'kesme'; }
          catch (e: any) { neden = 'kesme'; mesaj = `Kesme koşulu değerlendirilemedi: ${hataMetni(e)}`; }
        }
      }
    }
    if (!neden && this.yokla && this.yokla()) neden = 'duraklat';
    this.oL = L; this.oD = d; this.oNo = no;
    if (neden) this.dur({ neden, mesaj });
  }
  hata(mesaj: string) {
    if (this.askida || !this.hatadaDur || !this.yigin.length) return;
    this.dur({ neden: 'hata', mesaj });
  }
  private dur(d: Durma) {
    this.girisBekliyor = false;
    this.kip = 'devam';
    const L = $.L;
    this.askida = true;
    try { this.durdu(this, d); } finally { this.askida = false; $.L = L; }
  }

  // ------------------------------------------------------------ sürdürme (durdu içinden çağrılır)
  devam() { this.kip = 'devam'; }
  adim() { this.kip = 'adim'; }
  ustunden() { this.kip = 'ustunden'; this.baz = this.yigin.length; this.bL = this.oL; this.bNo = this.oNo; }
  disari() { this.kip = 'disari'; this.baz = this.yigin.length; }

  // ------------------------------------------------------------ inceleme
  /** Çağrı yığını; 0 en içteki çerçeve */
  cerceveler(): CerceveBilgi[] {
    const out: CerceveBilgi[] = [];
    for (let i = this.yigin.length - 1; i >= 0; i--) {
      const f = this.yigin[i];
      const L = i === this.yigin.length - 1 ? $.L : this.yigin[i + 1].L;
      const k = this.u.ayiklaKapsamlar[f.id];
      out.push({ ad: k.tur === 'program' ? `program ${k.ad}` : k.tur === 'birim' ? `birim ${k.ad}` : k.ad, dosya: this.u.dosyalar[Math.floor(L / 1e6)] ?? k.dosya, satir: L % 1e6 });
    }
    return out;
  }
  private cerceve(no: number): Cerceve {
    const f = this.yigin[this.yigin.length - 1 - no];
    if (!f) throw new YontemHatasi('Böyle bir çerçeve yok');
    return f;
  }
  /** Çerçevenin yerel (genel=false) ya da dışındaki program/birim (genel=true) değişkenleri */
  degiskenler(no: number, genel: boolean): DegiskenBilgi[] {
    const f = this.cerceve(no);
    const out: DegiskenBilgi[] = [];
    if (!f.g) return out;
    for (const [ad, js] of this.u.ayiklaDegiskenler(f.id, genel)) {
      try { out.push({ ad, deger: f.g(js) }); } catch { /* henüz tanımlanmadı */ }
    }
    return out;
  }
  /** Metodlarda etkin nesne; yoksa undefined */
  ben(no: number): any {
    const f = this.cerceve(no);
    if (!f.g || !this.u.ayiklaKapsamlar[f.id].sinif) return undefined;
    try { const b = f.g('this'); return b instanceof YNesne ? b : undefined; } catch { return undefined; }
  }
  /** İfadeyi (ya da 'x := değer' atamasını) çerçevenin kapsamında değerlendirir */
  degerlendir(no: number, metin: string): any {
    const f = this.cerceve(no);
    if (!f.g) throw new YontemHatasi('Bu çerçeve henüz hazır değil');
    const js = this.u.ayiklaIfade(f.id, metin);
    const L = $.L, n = this.yigin.length, eski = this.askida;
    this.askida = true;
    try { return f.g(js); } finally { this.askida = eski; $.L = L; this.yigin.length = n; }
  }
}

export function hataMetni(e: any): string {
  if (e instanceof YontemHatasi) return e.mesaj;
  if (e instanceof RangeError && /call stack/i.test(e.message)) return 'Yığın taşması (çok derin özyineleme)';
  return e && e.message ? e.message : String(e);
}

/** Değerin alt öğeleri (liste öğeleri, sözlük girdileri, nesne alanları); yapısal değilse null */
export function altOgeler(v: any): DegiskenBilgi[] | null {
  if (Array.isArray(v)) return v.map((x, i) => ({ ad: `[${i}]`, deger: x }));
  if (v instanceof PascalDizi) return v.veri.map((x, i) => ({ ad: `[${v.alt + BigInt(i)}]`, deger: x }));
  if (v instanceof Map) { const o: DegiskenBilgi[] = []; v.forEach((d, a) => o.push({ ad: `[${temsil(a, 1)}]`, deger: d })); return o; }
  if (v instanceof YNesne) {
    const hamlar: Record<string, string> = {};
    for (let C: any = v.constructor; C && C.$sinif; C = C.$ebeveyn) Object.assign(hamlar, C.$hamlar, { ...hamlar });
    return Object.keys(v).filter(k => k.startsWith('f_')).map(k => ({ ad: hamlar[k.slice(2)] ?? k.slice(2), deger: (v as any)[k] }));
  }
  return null;
}
export function kisaTemsil(v: any, sinir = 200): string {
  let s: string;
  try { s = typeof v === 'function' ? `<işlev${(v as any).$ad ? ' ' + (v as any).$ad : ''}>` : temsil(v, 1); } catch (e) { s = `<gösterilemedi: ${hataMetni(e)}>`; }
  return s.length > sinir ? s.slice(0, sinir - 1) + '…' : s;
}

/** Programı hata ayıklama kipinde derler */
export function ayiklamaDerle(kaynak: string, dosya: string, birimBul: DerlemeSecenekleri['birimBul'], aranan?: string[], kati?: DerlemeSecenekleri['kati']): { kod: string; u: Uretici } {
  const u = new Uretici({ birimBul, yerelBirim, yerlesikler: Y, aranan, ayikla: true, kati });
  return { kod: u.programDerle(kaynak, dosya), u };
}

/** Derlenmiş kodu ayıklayıcıyla çalıştırır; çıkış kodunu döndürür */
export function ayiklayarakCalistir(kod: string, a: Ayiklayici, konak: Konak & { hata?(m: string): void }): number {
  sifirla(konak, []);
  $.ayk = a;
  a.kesmeleriKur();
  try {
    new Function('$', 'Y', kod)($, Y);
    return 0;
  } catch (e: any) {
    return hataIsle(e, konak);
  } finally { $.ayk = null; }
}

// ================================================================ uçbirim arayüzü
const YARDIM = `Komutlar (kısa adı parantez içinde; boş satır son adımlama komutunu yineler):
  adım (a)              sonraki deyime geç; çağrı varsa içine gir
  sonraki (s)           sonraki satıra geç; çağrıların içine girme
  çık (ç)               bulunulan alt programdan çıkana kadar çalış
  devam (d)             bir kesme noktasına ya da programın sonuna kadar çalış
  kes <satır>           kesme noktası koy: kes 12 · kes Birim:12 · kes 12 eğer i > 3
  sil <satır> | hepsi   kesme noktasını kaldır
  kesmeler              kesme noktalarını listele
  yaz <ifade> (y)       ifadeyi değerlendir: y toplam * 2 · y liste[0] · y x := 5 (atama)
  değişkenler (dğ)      bulunulan çerçevenin ve programın değişkenleri
  yığın (yğ)            çağrı yığını
  yukarı / aşağı        yığında çağırana / çağrılana geç
  liste [satır] (l)     kaynak kodu göster
  hatalar aç | kapat    çalışma hatasında durma (başlangıçta açık)
  bitir (q)             programı sonlandır`;

const KOMUT: Record<string, string> = {
  a: 'adim', adim: 'adim', adım: 'adim', s: 'sonraki', sonraki: 'sonraki', c: 'cik', ç: 'cik', cik: 'cik', çık: 'cik',
  d: 'devam', devam: 'devam', kes: 'kes', k: 'kes', sil: 'sil', kesmeler: 'kesmeler', y: 'yaz', yaz: 'yaz',
  dg: 'deg', dğ: 'deg', degiskenler: 'deg', değişkenler: 'deg', yg: 'yigin', yğ: 'yigin', yigin: 'yigin', yığın: 'yigin', nerede: 'yigin',
  yukari: 'yukari', yukarı: 'yukari', asagi: 'asagi', aşağı: 'asagi', l: 'liste', liste: 'liste', hatalar: 'hatalar',
  bitir: 'bitir', q: 'bitir', cikis: 'bitir', çıkış: 'bitir', yardim: 'yardim', yardım: 'yardim', '?': 'yardim',
};

/** Standart girdiden satır satır eşzamanlı okur (komutlar ve programın oku çağrıları aynı girdiyi paylaşır) */
function satirOkuyucu() {
  let tampon = Buffer.alloc(0), bitti = false;
  const parca = Buffer.alloc(4096);
  return (): string | null => {
    for (;;) {
      const i = tampon.indexOf(10);
      if (i >= 0) { const s = tampon.subarray(0, i + 1).toString('utf-8'); tampon = tampon.subarray(i + 1); return s; }
      if (bitti) { if (!tampon.length) return null; const s = tampon.toString('utf-8'); tampon = Buffer.alloc(0); return s; }
      let n = 0;
      try { n = fs.readSync(0, parca, 0, parca.length, null); }
      catch (e: any) {
        if (e.code === 'EAGAIN') { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20); continue; }
        if (e.code !== 'EOF') bitti = true;
        n = 0;
      }
      if (n === 0) bitti = true; else tampon = Buffer.concat([tampon, parca.subarray(0, n)]);
    }
  };
}

export function ucbirimAyikla(yol: string, argumanlar: string[], birimBulucu: (yol: string) => { bul: (ad: string) => any; dizinler: string[] }, http: Konak['http']): number {
  const yazE = (m: string) => process.stderr.write(m + '\n');
  if (!fs.existsSync(yol)) { yazE(`Dosya bulunamadı: ${yol}`); return 1; }
  const kaynak = fs.readFileSync(yol, 'utf-8');
  const { bul, dizinler } = birimBulucu(yol);
  let derlenen: { kod: string; u: Uretici };
  try { derlenen = ayiklamaDerle(kaynak, yol, (ad) => bul(ad), dizinler); }
  catch (e) { return hataIsle(e, { hata: yazE }); }

  const oku = satirOkuyucu();
  const yaz = (m: string) => fs.writeSync(1, m + '\n');
  const kaynaklar = new Map<string, string[]>();
  const satirlar = (d: string) => {
    if (!kaynaklar.has(d)) { let s: string[] = []; try { s = fs.readFileSync(d, 'utf-8').split(/\r?\n/); } catch { /* yerleşik */ } kaynaklar.set(d, s); }
    return kaynaklar.get(d)!;
  };
  const kisaYol = (d: string) => path.relative(process.cwd(), path.resolve(d)) || d;
  const goster = (d: string, satir: number, once = 0, sonra = 0, isaret = satir) => {
    const s = satirlar(d), a = Math.max(1, satir - once), b = Math.min(s.length, satir + sonra);
    const kes = new Set(ayk.kesmeler().filter(k => k.dosya === path.resolve(d)).map(k => k.kesme.satir));
    for (let i = a; i <= b; i++) yaz(`${i === isaret ? '→' : ' '}${kes.has(i) ? '●' : ' '}${String(i).padStart(4)}  ${s[i - 1] ?? ''}`);
  };
  let sonKomut = 'adim';

  const durdu = (a: Ayiklayici, d: Durma) => {
    let secili = 0;
    const cerceveler = a.cerceveler();
    const ust = cerceveler[0];
    if (d.neden === 'hata') yaz(`Hata: ${d.mesaj}`);
    else if (d.neden === 'kesme') yaz(d.mesaj ?? `Kesme noktası: ${kisaYol(ust.dosya)}:${ust.satir}`);
    else if (d.neden === 'giris') yaz(`Yöntem hata ayıklayıcı — ${kisaYol(ust.dosya)} (komutlar için: yardım)`);
    if (cerceveler.length > 1 || d.neden === 'hata') yaz(`${ust.ad} içinde, ${kisaYol(ust.dosya)}:${ust.satir}`);
    goster(ust.dosya, ust.satir);
    for (;;) {
      fs.writeSync(1, '(ayıkla) ');
      const ham = oku();
      if (ham === null) { yaz(''); throw new AyiklamaBitti(); }
      const satir = ham.trim();
      const m = /^(\S+)\s*(.*)$/s.exec(satir);
      const komut = m ? KOMUT[m[1].toLocaleLowerCase('tr')] : sonKomut;
      const arg = m ? m[2].trim() : '';
      const c = cerceveler[secili];
      try {
        switch (komut) {
          case 'adim': sonKomut = komut; a.adim(); return;
          case 'sonraki': sonKomut = komut; a.ustunden(); return;
          case 'cik': sonKomut = komut; a.disari(); return;
          case 'devam': sonKomut = komut; a.devam(); return;
          case 'bitir': throw new AyiklamaBitti();
          case 'yardim': yaz(YARDIM); break;
          case 'hatalar':
            if (/^(aç|ac)$/i.test(arg)) a.hatadaDur = true; else if (/^kapat$/i.test(arg)) a.hatadaDur = false;
            yaz(`Çalışma hatasında durma: ${a.hatadaDur ? 'açık' : 'kapalı'}`); break;
          case 'kes': {
            const km = /^(?:(.+?):)?(\d+)(?:\s+(?:eğer|eger)\s+(.+))?$/is.exec(arg);
            if (!km) { yaz('Kullanım: kes <satır> | kes <dosya>:<satır> [eğer <koşul>]'); break; }
            const dosya = km[1] ? a.dosyaBul(km[1]) : c.dosya;
            if (!dosya) { yaz(`'${km[1]}' bu programın dosyalarından biri değil (${a.u.dosyalar.map(kisaYol).join(', ')})`); break; }
            const istenen = Number(km[2]);
            const no = a.kesmeSatiri(dosya, istenen);
            if (no === null) { yaz(`${kisaYol(dosya)} dosyasında ${istenen}. satırda ya da sonrasında çalışan bir deyim yok`); break; }
            const l = a.kesmeler().filter(k => k.dosya === path.resolve(dosya) && k.kesme.satir !== no).map(k => k.kesme);
            l.push({ satir: no, kosul: km[3] });
            a.kesmeleriAyarla(dosya, l);
            yaz(`Kesme noktası kondu: ${kisaYol(dosya)}:${no}${km[3] ? ` (eğer ${km[3]})` : ''}${no !== istenen ? ` — ${istenen}. satırda deyim olmadığı için sonraki deyime taşındı` : ''}`); break;
          }
          case 'sil': {
            if (/^hepsi$/i.test(arg)) { for (const d2 of new Set(a.kesmeler().map(k => k.dosya))) a.kesmeleriAyarla(d2, []); yaz('Bütün kesme noktaları kaldırıldı'); break; }
            const km = /^(?:(.+?):)?(\d+)$/.exec(arg);
            if (!km) { yaz('Kullanım: sil <satır> | sil <dosya>:<satır> | sil hepsi'); break; }
            const dosya = km[1] ? a.dosyaBul(km[1]) : c.dosya;
            const tum = dosya ? a.kesmeler().filter(k => k.dosya === path.resolve(dosya)).map(k => k.kesme) : [];
            const kalan = tum.filter(k => k.satir !== Number(km[2]));
            if (!dosya || kalan.length === tum.length) { yaz('Orada kesme noktası yok'); break; }
            a.kesmeleriAyarla(dosya, kalan);
            yaz(`Kesme noktası kaldırıldı: ${kisaYol(dosya)}:${km[2]}`); break;
          }
          case 'kesmeler': {
            const l = a.kesmeler();
            if (!l.length) yaz('Kesme noktası yok');
            for (const k of l) yaz(`  ${kisaYol(k.dosya)}:${k.kesme.satir}${k.kesme.kosul ? `  eğer ${k.kesme.kosul}` : ''}`);
            break;
          }
          case 'yaz':
            if (!arg) { yaz('Kullanım: yaz <ifade>'); break; }
            yaz(kisaTemsil(a.degerlendir(secili, arg), 4000)); break;
          case 'deg': {
            const yerel = a.degiskenler(secili, false), genel = a.degiskenler(secili, true), ben = a.ben(secili);
            if (ben !== undefined) { yaz('Nesne (ben):'); for (const v of altOgeler(ben) ?? []) yaz(`  ${v.ad} = ${kisaTemsil(v.deger)}`); }
            if (yerel.length) { yaz(genel.length || ben !== undefined || cerceveler.length > 1 ? `${c.ad}:` : 'Değişkenler:'); for (const v of yerel) yaz(`  ${v.ad} = ${kisaTemsil(v.deger)}`); }
            if (genel.length) { yaz('Program:'); for (const v of genel) yaz(`  ${v.ad} = ${kisaTemsil(v.deger)}`); }
            if (!yerel.length && !genel.length && ben === undefined) yaz('Değişken yok');
            break;
          }
          case 'yigin': cerceveler.forEach((f, i) => yaz(`${i === secili ? '→' : ' '} #${i}  ${f.ad}  ${kisaYol(f.dosya)}:${f.satir}`)); break;
          case 'yukari': case 'asagi': {
            const yeni = secili + (komut === 'yukari' ? 1 : -1);
            if (yeni < 0 || yeni >= cerceveler.length) { yaz(komut === 'yukari' ? 'En dıştaki çerçevedesiniz' : 'En içteki çerçevedesiniz'); break; }
            secili = yeni;
            yaz(`#${secili}  ${cerceveler[secili].ad}  ${kisaYol(cerceveler[secili].dosya)}:${cerceveler[secili].satir}`);
            goster(cerceveler[secili].dosya, cerceveler[secili].satir); break;
          }
          case 'liste': {
            const orta = /^\d+$/.test(arg) ? Number(arg) : c.satir;
            goster(c.dosya, orta, 5, 5, c.satir); break;
          }
          default: yaz(`Bilinmeyen komut: '${m ? m[1] : ''}' (komutlar için: yardım)`);
        }
      } catch (e) {
        if (e instanceof AyiklamaBitti || e instanceof DurSinyali) throw e;
        yaz(`Hata: ${hataMetni(e)}`);
      }
    }
  };

  const ayk: Ayiklayici = new Ayiklayici(derlenen.u, durdu, true);
  const kodu = ayiklayarakCalistir(derlenen.kod, ayk, {
    yaz: (s) => { fs.writeSync(1, s); },
    okuSatir: oku,
    argumanlar,
    dosyaOku: (y) => fs.readFileSync(y, 'utf-8'),
    dosyaYaz: (y, i, e) => e ? fs.appendFileSync(y, i) : fs.writeFileSync(y, i),
    dosyaVarMi: (y) => fs.existsSync(y),
    ortam: (a) => process.env[a],
    http,
    veritabani: require('./vt_dugum').dugumVeritabani(),
    sunucu: require('./sunucu_dugum').dugumSunucu(yazE),
    hata: yazE,
  });
  yaz(kodu === 130 ? 'Program sonlandırıldı.' : `Program bitti (çıkış kodu ${kodu}).`);
  return kodu;
}
