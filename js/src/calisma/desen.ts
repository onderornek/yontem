// Desen birimi — düzenli ifadeler (regex).
// JavaScript ve Python'un kendi düzenli ifade motorları ayrıntıda farklı davrandığı için (Unicode
// sınıfları, büyük/küçük harf, hata durumları) birim kendi küçük geri izlemeli motorunu kullanır;
// Python sürümü (yontem_dil/desen.py) aynı algoritmayı adım adım izler ve aynı sonucu verir.
// Desteklenen sözdizimi: düz karakterler, . [abc] [^a-z] \d \w \s \D \W \S \b \B ^ $ ( ) (?: ) |
// * + ? {n} {n,} {n,m} ve tembel biçimleri (*? +? ?? {n,m}?). Seçenek 'i': büyük/küçük harf ayrımı yok.
import { $, hata, katla } from './cekirdek';
import { fn, turAdi } from './deger';

const ADIM_SINIRI = 2000000;
type Dugum =
  | { t: 'k'; c: string }                                   // tek karakter
  | { t: 'her' }                                            // .
  | { t: 'kume'; deg: boolean; araliklar: [string, string][]; siniflar: string[] }
  | { t: 'bas' } | { t: 'son' } | { t: 'ss' } | { t: 'ssd' }
  | { t: 'grup'; no: number; secenekler: Dugum[][] }
  | { t: 'tekrar'; d: Dugum; enAz: number; enCok: number; tembel: boolean };
interface Derlenmis { secenekler: Dugum[][]; grupSayisi: number; buyukKucuk: boolean }

const harfMi = (c: string) => /^\p{L}$/u.test(c);
const sinifUyar = (s: string, c: string): boolean => {
  switch (s) {
    case 'd': return c >= '0' && c <= '9';
    case 'D': return !(c >= '0' && c <= '9');
    case 'w': return c === '_' || (c >= '0' && c <= '9') || harfMi(c);
    case 'W': return !(c === '_' || (c >= '0' && c <= '9') || harfMi(c));
    case 's': return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v';
    default: return !(c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v');
  }
};
const tekMi = (s: string) => Array.from(s).length === 1;
/** Büyük/küçük harf katlaması: Türkçedeki dört i (İ I ı i) birbirine eşit sayılır. */
function kat(c: string): string {
  if (c === 'İ' || c === 'I' || c === 'ı') return 'i';
  const k = c.toLowerCase();
  return tekMi(k) ? k : c;
}
function buyut(c: string): string { const b = c.toUpperCase(); return tekMi(b) ? b : c; }
const kp = (c: string) => c.codePointAt(0)!;

function derle(desen: string, secenek: string): Derlenmis {
  for (const s of secenek) if (s !== 'i') hata(`Bilinmeyen desen seçeneği: '${s}' (yalnızca 'i' desteklenir)`);
  const k = Array.from(desen);
  let i = 0, grupSayisi = 0;
  const yanlis = (m: string): never => hata(`Desen hatası (${i + 1}. karakter): ${m}`);
  const KACIS: Record<string, string> = { n: '\n', t: '\t', r: '\r', f: '\f', v: '\v', '0': '\0' };

  const kume = (): Dugum => {
    let deg = false;
    if (k[i] === '^') { deg = true; i++; }
    const araliklar: [string, string][] = [], siniflar: string[] = [];
    let ilk = true;
    for (;;) {
      if (i >= k.length) yanlis("kapanmamış '['");
      let c = k[i];
      if (c === ']' && !ilk) { i++; break; }
      ilk = false;
      i++;
      if (c === '\\') {
        if (i >= k.length) yanlis("desen '\\' ile bitemez");
        const e = k[i++];
        if ('dwsDWS'.includes(e)) { siniflar.push(e); continue; }
        c = KACIS[e] ?? e;
      }
      if (k[i] === '-' && i + 1 < k.length && k[i + 1] !== ']') {
        i++;
        let b = k[i++];
        if (b === '\\') { if (i >= k.length) yanlis("desen '\\' ile bitemez"); const e = k[i++]; b = KACIS[e] ?? e; }
        if (kp(b) < kp(c)) yanlis(`ters aralık: ${c}-${b}`);
        araliklar.push([c, b]);
      } else araliklar.push([c, c]);
    }
    return { t: 'kume', deg, araliklar, siniflar };
  };

  const atom = (): Dugum => {
    const c = k[i++];
    if (c === '.') return { t: 'her' };
    if (c === '^') return { t: 'bas' };
    if (c === '$') return { t: 'son' };
    if (c === '[') return kume();
    if (c === '(') {
      let no = 0;
      if (k[i] === '?') {
        if (k[i + 1] !== ':') yanlis("'(?' sonrası yalnızca ':' desteklenir (yakalamayan grup)");
        i += 2;
      } else no = ++grupSayisi;
      const secenekler = secim();
      if (k[i] !== ')') yanlis("kapanmamış '('");
      i++;
      return { t: 'grup', no, secenekler };
    }
    if (c === '\\') {
      if (i >= k.length) yanlis("desen '\\' ile bitemez");
      const e = k[i++];
      if ('dwsDWS'.includes(e)) return { t: 'kume', deg: false, araliklar: [], siniflar: [e] };
      if (e === 'b') return { t: 'ss' };
      if (e === 'B') return { t: 'ssd' };
      if (e >= '1' && e <= '9') yanlis('geri başvurular (\\1) desteklenmez');
      return { t: 'k', c: KACIS[e] ?? e };
    }
    if (c === '*' || c === '+' || c === '?') yanlis(`'${c}' öncesinde tekrarlanacak bir şey yok`);
    if (c === ')') yanlis("eşi olmayan ')'");
    return { t: 'k', c };
  };

  const sayi = (): number => {
    let j = i;
    while (j < k.length && k[j] >= '0' && k[j] <= '9') j++;
    if (j === i) return -1;
    if (j - i > 4) yanlis('tekrar sayısı çok büyük (en çok 9999)');
    const v = parseInt(k.slice(i, j).join(''), 10); i = j; return v;
  };

  const dizi = (): Dugum[] => {
    const out: Dugum[] = [];
    while (i < k.length && k[i] !== '|' && k[i] !== ')') {
      let d = atom();
      for (;;) {
        let enAz = -1, enCok = -1;
        const c = k[i];
        if (c === '*') { enAz = 0; enCok = Infinity; i++; }
        else if (c === '+') { enAz = 1; enCok = Infinity; i++; }
        else if (c === '?') { enAz = 0; enCok = 1; i++; }
        else if (c === '{') {
          const geri = i;
          i++;
          enAz = sayi();
          if (enAz < 0) { i = geri; break; }                // '{' düz karakter
          if (k[i] === ',') { i++; const u = sayi(); enCok = u < 0 ? Infinity : u; } else enCok = enAz;
          if (k[i] !== '}') { i = geri; enAz = -1; break; }
          i++;
          if (enCok < enAz) yanlis(`ters tekrar aralığı: {${enAz},${enCok}}`);
        } else break;
        if (d.t === 'bas' || d.t === 'son' || d.t === 'ss' || d.t === 'ssd') yanlis('konum belirteçleri (^ $ \\b) tekrarlanamaz');
        let tembel = false;
        if (k[i] === '?') { tembel = true; i++; }
        d = { t: 'tekrar', d, enAz, enCok, tembel };
      }
      out.push(d);
    }
    return out;
  };
  const secim = (): Dugum[][] => {
    const s = [dizi()];
    while (k[i] === '|') { i++; s.push(dizi()); }
    return s;
  };
  const secenekler = secim();
  if (i < k.length) yanlis("eşi olmayan ')'");
  return { secenekler, grupSayisi, buyukKucuk: secenek.includes('i') };
}

// ---------------------------------------------------------------- derleme: ağaç → geri izlemeli sanal makine komutları
// Özyineleme yerine açık bir yığın kullanılır; böylece çok uzun metinlerde yığın taşmaz ve adım/yığın
// sınırları iki çalışma zamanında aynı anda, aynı hatayla dolar.
const K = 0, HER = 1, KUME = 2, AYRIL = 3, ATLA = 4, YAZ = 5, BAS = 6, SON = 7, SS = 8, SSD = 9, IZ = 10, DENET = 11, BITTI = 12;
const PROGRAM_SINIRI = 50000, YIGIN_SINIRI = 3000000;
type Komut = [number, any, any];

function programla(p: Derlenmis): { kod: Komut[]; yuva: number } {
  const kod: Komut[] = [];
  let yuva = 2 * (p.grupSayisi + 1);
  const ekle = (k: Komut) => { if (kod.length >= PROGRAM_SINIRI) hata('Desen çok büyük; tekrar sayılarını küçültün'); kod.push(k); return kod.length - 1; };
  const secim = (secenekler: Dugum[][]) => {
    const sonlar: number[] = [];
    secenekler.forEach((sec, n) => {
      let ayr = -1;
      if (n < secenekler.length - 1) ayr = ekle([AYRIL, kod.length + 1, 0]);
      for (const d of sec) dugum(d);
      if (n < secenekler.length - 1) { sonlar.push(ekle([ATLA, 0, 0])); kod[ayr][2] = kod.length; }
    });
    for (const a of sonlar) kod[a][1] = kod.length;
  };
  const dugum = (d: Dugum) => {
    switch (d.t) {
      case 'k': ekle([K, d.c, 0]); break;
      case 'her': ekle([HER, 0, 0]); break;
      case 'kume': ekle([KUME, d, 0]); break;
      case 'bas': ekle([BAS, 0, 0]); break;
      case 'son': ekle([SON, 0, 0]); break;
      case 'ss': ekle([SS, 0, 0]); break;
      case 'ssd': ekle([SSD, 0, 0]); break;
      case 'grup':
        if (d.no) ekle([YAZ, 2 * d.no, 0]);
        secim(d.secenekler);
        if (d.no) ekle([YAZ, 2 * d.no + 1, 0]);
        break;
      case 'tekrar': {
        for (let n = 0; n < d.enAz; n++) dugum(d.d);
        if (d.enCok === Infinity) {
          // L1: AYRIL gövde, çıkış   gövde: IZ r; d; DENET r, çıkış; ATLA L1      (tembelse önce çıkış denenir)
          const l1 = ekle([AYRIL, 0, 0]);
          const r = yuva++;
          const govde = ekle([IZ, r, 0]);
          dugum(d.d);
          const dn = ekle([DENET, r, 0]);
          ekle([ATLA, l1, 0]);
          kod[dn][2] = kod.length;                           // boş tur: döngüden çık
          kod[l1][1] = d.tembel ? kod.length : govde;
          kod[l1][2] = d.tembel ? govde : kod.length;
        } else {
          const ayrimlar: number[] = [];
          for (let n = d.enAz; n < d.enCok; n++) { ayrimlar.push(ekle([AYRIL, 0, 0])); dugum(d.d); }
          for (const a of ayrimlar) { kod[a][1] = d.tembel ? kod.length : a + 1; kod[a][2] = d.tembel ? a + 1 : kod.length; }
        }
      }
    }
  };
  ekle([YAZ, 0, 0]);
  secim(p.secenekler);
  ekle([YAZ, 1, 0]);
  ekle([BITTI, 0, 0]);
  return { kod, yuva };
}

const COK_ADIM = 'Desen bu metinde çok fazla adım gerektiriyor; deseni sadeleştirin (iç içe tekrarlar: (a+)+ gibi)';

class Eslestirici {
  adim = 0;
  yak: ([number, number] | null)[];
  kod: Komut[];
  yuvalar: number[];
  constructor(private p: Derlenmis, private s: string[]) {
    const pr = (p as any).program ?? ((p as any).program = programla(p));
    this.kod = pr.kod;
    this.yuvalar = new Array(pr.yuva).fill(-1);
    this.yak = new Array(p.grupSayisi + 1).fill(null);
  }

  tekUyar(d: Dugum, c: string): boolean {
    const bk = this.p.buyukKucuk;
    if (d.t !== 'kume') return false;
    const adaylar = bk ? [c, kat(c), buyut(c), ...(kat(c) === 'i' ? ['I', 'İ', 'ı'] : [])] : [c];
    let var_ = false;
    for (const a of adaylar) {
      const n = kp(a);
      if (d.araliklar.some(([x, y]) => n >= kp(x) && n <= kp(y)) || d.siniflar.some(s => sinifUyar(s, a))) { var_ = true; break; }
    }
    return var_ !== d.deg;
  }
  sozcukKarakteri(i: number) { return i >= 0 && i < this.s.length && sinifUyar('w', this.s[i]); }

  /** 'bas' konumundan başlayan eşleşmenin bitişi ya da -1. */
  dene(bas: number, tam: boolean): number {
    const kod = this.kod, s = this.s, n = s.length, yv = this.yuvalar, bk = this.p.buyukKucuk;
    yv.fill(-1);
    this.yak.fill(null);
    const yigin: number[] = [];                   // üçlüler: (komut, konum, 0) seçenek · (-1, yuva, eski değer) geri alma
    let pc = 0, pos = bas;
    for (;;) {
      if (++this.adim > ADIM_SINIRI) hata(COK_ADIM);
      const k = kod[pc];
      let tamam = true;
      switch (k[0]) {
        case K: tamam = pos < n && (bk ? kat(k[1]) === kat(s[pos]) : k[1] === s[pos]); if (tamam) { pos++; pc++; } break;
        case HER: tamam = pos < n && s[pos] !== '\n'; if (tamam) { pos++; pc++; } break;
        case KUME: tamam = pos < n && this.tekUyar(k[1], s[pos]); if (tamam) { pos++; pc++; } break;
        case AYRIL:
          if (yigin.length >= YIGIN_SINIRI) hata(COK_ADIM);
          yigin.push(k[2], pos, 0); pc = k[1]; break;
        case ATLA: pc = k[1]; break;
        case YAZ: case IZ: yigin.push(-1, k[1], yv[k[1]]); yv[k[1]] = pos; pc++; break;
        case BAS: tamam = pos === 0; pc++; break;
        case SON: tamam = pos === n; pc++; break;
        case SS: tamam = this.sozcukKarakteri(pos - 1) !== this.sozcukKarakteri(pos); pc++; break;
        case SSD: tamam = this.sozcukKarakteri(pos - 1) === this.sozcukKarakteri(pos); pc++; break;
        case DENET: pc = yv[k[1]] === pos ? k[2] : pc + 1; break;   // tur hiç ilerlemediyse döngü biter (sonsuz döngü olmaz)
        default:
          if (!tam || pos === n) {
            for (let g = 0; g <= this.p.grupSayisi; g++) this.yak[g] = yv[2 * g] >= 0 && yv[2 * g + 1] >= 0 ? [yv[2 * g], yv[2 * g + 1]] : null;
            return pos;
          }
          tamam = false;
      }
      if (tamam) continue;
      for (;;) {                                  // geri iz: son seçeneğe dön, aradaki yuva yazmalarını geri al
        if (!yigin.length) return -1;
        const c = yigin.pop()!, b = yigin.pop()!, a = yigin.pop()!;
        if (a === -1) { yv[b] = c; continue; }
        pc = a; pos = b; break;
      }
    }
  }
  ara(bas: number): boolean {
    for (let b = bas; b <= this.s.length; b++) if (this.dene(b, false) >= 0) return true;
    return false;
  }
}

const onbellek = new Map<string, Derlenmis>();
function hazirla(desen: any, secenek: any): Derlenmis {
  if (typeof desen !== 'string') hata(`'desen' metin bekler, ${turAdi(desen)} verildi`);
  if (typeof secenek !== 'string') hata(`'seçenek' metin bekler, ${turAdi(secenek)} verildi`);
  const a = secenek + '\0' + desen;
  let p = onbellek.get(a);
  if (!p) { p = derle(desen, secenek); if (onbellek.size > 500) onbellek.clear(); onbellek.set(a, p); }
  return p;
}
function metinMi(v: any, ad: string): string[] {
  if (typeof v !== 'string') hata(`'${ad}' metin bekler, ${turAdi(v)} verildi`);
  return Array.from(v);
}
const y = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any) =>
  fn((...a: any[]) => {
    if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
    return f(...a);
  }, ad, enCok, enAz, [], false);

/** Metindeki örtüşmeyen tüm eşleşmeler: her biri yakalama dizisinin kopyası. */
function hepsi(s: string[], p: Derlenmis): ([number, number] | null)[][] {
  const e = new Eslestirici(p, s), out: ([number, number] | null)[][] = [];
  let pos = 0;
  while (pos <= s.length && e.ara(pos)) {
    const [b, son] = e.yak[0]!;
    out.push(e.yak.slice());
    pos = son > b ? son : son + 1;               // boş eşleşmeden sonra bir karakter ilerle
  }
  return out;
}
const dilim = (s: string[], a: [number, number] | null) => a ? s.slice(a[0], a[1]).join('') : null;

function desenModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Desen' };
  const uye = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any) => { U[katla(ad)] = y(ad, enAz, enCok, f); };

  uye('Eşleşir', 2, 3, (m, d, o = '') => new Eslestirici(hazirla(d, o), metinMi(m, 'metin')).ara(0));
  uye('TamEşleşir', 2, 3, (m, d, o = '') => new Eslestirici(hazirla(d, o), metinMi(m, 'metin')).dene(0, true) >= 0);
  uye('Bul', 2, 3, (m, d, o = '') => {
    const s = metinMi(m, 'metin'), e = new Eslestirici(hazirla(d, o), s);
    return e.ara(0) ? dilim(s, e.yak[0]) : null;
  });
  uye('BulHepsi', 2, 3, (m, d, o = '') => { const s = metinMi(m, 'metin'); return hepsi(s, hazirla(d, o)).map(y_ => dilim(s, y_[0])); });
  uye('Gruplar', 2, 3, (m, d, o = '') => {
    const s = metinMi(m, 'metin'), e = new Eslestirici(hazirla(d, o), s);
    return e.ara(0) ? e.yak.map(a => dilim(s, a)) : null;
  });
  uye('TümGruplar', 2, 3, (m, d, o = '') => { const s = metinMi(m, 'metin'); return hepsi(s, hazirla(d, o)).map(y_ => y_.map(a => dilim(s, a))); });
  uye('DesenKonumu', 2, 3, (m, d, o = '') => {
    const s = metinMi(m, 'metin'), e = new Eslestirici(hazirla(d, o), s);
    return e.ara(0) ? BigInt(s.slice(0, e.yak[0]![0]).join('').length + 1) : 0n;
  });
  uye('DesenDeğiştir', 3, 4, (m, d, yeni, o = '') => {
    const s = metinMi(m, 'metin'), yk = metinMi(yeni, 'yeni');
    let out = '', son = 0;
    for (const yak of hepsi(s, hazirla(d, o))) {
      out += s.slice(son, yak[0]![0]).join('');
      for (let i = 0; i < yk.length; i++) {
        if (yk[i] === '$' && i + 1 < yk.length && (yk[i + 1] === '$' || (yk[i + 1] >= '0' && yk[i + 1] <= '9'))) {
          i++;
          if (yk[i] === '$') { out += '$'; continue; }
          const no = Number(yk[i]);
          if (no >= yak.length) hata(`'DesenDeğiştir': desende ${no}. grup yok ($${no})`);
          out += dilim(s, yak[no]) ?? '';
        } else out += yk[i];
      }
      son = yak[0]![1];
    }
    return out + s.slice(son).join('');
  });
  uye('DesenAyır', 2, 3, (m, d, o = '') => {
    const s = metinMi(m, 'metin'), out: string[] = [];
    let son = 0;
    for (const yak of hepsi(s, hazirla(d, o))) {
      const [b, e] = yak[0]!;
      if (e === b) continue;                     // boş eşleşme ayırmaz
      out.push(s.slice(son, b).join('')); son = e;
    }
    out.push(s.slice(son).join(''));
    return out;
  });
  uye('DesenKaçış', 1, 1, m => metinMi(m, 'metin').map(c => '\\^$.|?*+()[]{}'.includes(c) ? '\\' + c : c).join(''));
  uye('DesenGeçerli', 1, 1, d => {
    if (typeof d !== 'string') return false;
    try { derle(d, ''); return true; } catch (e) { return false; }
  });
  return U;
}

$.yerelBirimler.set('desen', desenModulu);
$.yerelBirimler.set('regex', desenModulu);
