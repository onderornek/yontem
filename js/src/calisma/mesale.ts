// Meşale birimi: PyTorch benzeri N boyutlu tensörler, otomatik türev, fonksiyonel işlemler,
// kayıplar, optimizasyon, veri yükleyici, kaydet/yükle.
// Python sürümü (yontem_dil/mesale.py) ile aynı algoritmalar ve aynı kayan nokta işlem sırası
// kullanılır; iki çalışma zamanı aynı çıktıyı üretir. Toplamalar hep soldan sağa, tek tek yapılır.
import { katla } from '../sozcuk';
import { $, hata, metne, cagir, yinele, sifirlayiciEkle } from './cekirdek';
import { YNesne, PascalDizi, fn, sabitNokta } from './deger';
import { PyRandom } from './rastgele';
import { rng as anaRng } from './yerlesik';

export const mRng = new PyRandom();
let gradAcik = true;
// Aynı süreçte art arda çalışan programlar (tarayıcıdaki oyun alanı) birbirinin GradKapat durumunu devralmasın
sifirlayiciEkle(() => { gradAcik = true; });

const B = (x: number) => BigInt(x);
const tam = (x: any, ad = 'değer'): number => {
  if (typeof x === 'bigint') return Number(x);
  if (typeof x === 'number' && Number.isInteger(x)) return x;
  hata(`${ad} tamsayı olmalı`);
};
const sayi = (x: any): number => {
  if (typeof x === 'number') return x;
  if (typeof x === 'bigint') return Number(x);
  if (typeof x === 'boolean') return x ? 1 : 0;
  if (x instanceof MTensor && x.v.length === 1) return x.v[0];
  hata(`Sayı bekleniyordu, ${$.turAdi(x)} verildi`);
};
const dogruMu = (v: any) => v === true;
const carpim = (s: number[]) => { let n = 1; for (const x of s) n *= x; return n; };
const adimlar = (s: number[]) => { const r = new Array(s.length); let a = 1; for (let i = s.length - 1; i >= 0; i--) { r[i] = a; a *= s[i]; } return r; };
const ayniSekil = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const sekilYaz = (s: number[]) => '[' + s.join(', ') + ']';

// ================================================================ tensör
export class MTensor {
  $tensor = true;
  $mesale = true;
  TUR_ADI = 'tensör';
  grad: Float64Array | null = null;
  ebeveyn: MTensor[] = [];
  geri: ((g: Float64Array) => void) | null = null;
  constructor(public v: Float64Array, public s: number[], public gerekli = false) {}

  get n() { return this.v.length; }

  liste(): any {
    const s = this.s;
    if (s.length === 0) return this.v[0];
    const yap = (d: number, o: number): any => {
      const ad = adimlar(s)[d];
      const r: any[] = [];
      for (let i = 0; i < s[d]; i++) r.push(d === s.length - 1 ? this.v[o + i] : yap(d + 1, o + i * ad));
      return r;
    };
    return yap(0, 0);
  }
  ogeler(): any[] {
    if (this.s.length === 0) hata('0 boyutlu tensör üzerinde yinelenemez');
    const r: any[] = [];
    for (let i = 0; i < this.s[0]; i++) r.push(secim(this, [i]));
    return r;
  }
  indeksAl(idx: any[]) { return secim(this, idx.map(i => tam(i, 'Tensör dizini'))); }
  indeksAta(idx: any[], deger: any) {
    const ii = idx.map(i => tam(i, 'Tensör dizini'));
    if (ii.length > this.s.length) hata('Tensör dizini fazla');
    const ad = adimlar(this.s);
    let o = 0;
    ii.forEach((i, d) => {
      const j = i < 0 ? i + this.s[d] : i;
      if (j < 0 || j >= this.s[d]) hata(`Tensör dizini sınır dışı: ${i} (boyut ${d}, uzunluk ${this.s[d]})`);
      o += j * ad[d];
    });
    const kalan = this.s.slice(ii.length), n = carpim(kalan);
    if (deger instanceof MTensor) {
      const d = yay(deger, kalan);
      for (let k = 0; k < n; k++) this.v[o + k] = d[k];
    } else {
      const x = sayi(deger);
      for (let k = 0; k < n; k++) this.v[o + k] = x;
    }
  }
  kAl(ad: string): any {
    const f = TENSOR_UYE[ad];
    if (f) return f(this);
    hata(`Tensörde '${ad}' üyesi yok`);
  }
  kAta(ad: string, v: any) {
    if (ad === 'gradgerekli' || ad === 'requires_grad') { this.gerekli = dogruMu(v); return; }
    if (ad === 'grad') { this.grad = v === null ? null : yay(tensore(v), this.s).slice(); return; }
    hata(`Tensörün '${ad}' üyesine atama yapılamaz`);
  }
  toString() { return tensorYaz(this); }
  $yinele() { return this.ogeler(); }
}

function tensorYaz(t: MTensor): string {
  const b = (x: number) => sabitNokta(x, 4);
  let ek = t.gerekli ? ', grad_gerekli=doğru' : '';
  if (t.s.length === 0) return `tensör(${b(t.v[0])}${ek})`;
  const metinler = Array.from(t.v, b);
  const gen = metinler.reduce((m, x) => Math.max(m, x.length), 0);
  const s = t.s, ad = adimlar(s);
  const yap = (d: number, o: number, girinti: number): string => {
    if (s[d] === 0) return '[]';
    if (d === s.length - 1) {
      const p: string[] = [];
      for (let i = 0; i < s[d]; i++) p.push(metinler[o + i].padStart(gen));
      return '[' + p.join(', ') + ']';
    }
    const p: string[] = [];
    for (let i = 0; i < s[d]; i++) p.push(yap(d + 1, o + i * ad[d], girinti + 1));
    const ayrac = ',' + '\n'.repeat(s.length - d - 1) + ' '.repeat(girinti + 1);
    return '[' + p.join(ayrac) + ']';
  };
  return 'tensör(' + yap(0, 0, 7) + ek + ')';
}

function yeni(v: Float64Array, s: number[], ebeveyn: MTensor[], geri: (g: Float64Array) => void): MTensor {
  const t = new MTensor(v, s);
  if (gradAcik) for (const p of ebeveyn) if (p.gerekli) { t.gerekli = true; t.ebeveyn = ebeveyn; t.geri = geri; break; }
  return t;
}
function biriktir(p: MTensor, g: Float64Array) {
  if (!p.gerekli) return;
  if (p.grad === null) p.grad = Float64Array.from(g);
  else { const r = p.grad; for (let i = 0; i < r.length; i++) r[i] += g[i]; }
}

/** Liste, sayı ya da tensörü tensöre çevirir */
export function tensore(x: any, gerekli = false): MTensor {
  if (x instanceof MTensor) return x;
  const t = typeof x;
  if (t === 'bigint' || t === 'number' || t === 'boolean') return new MTensor(Float64Array.of(sayi(x)), [], gerekli);
  if (x instanceof PascalDizi) x = x.veri;
  if (Array.isArray(x)) {
    const sekil: number[] = [];
    let y: any = x;
    while (true) {
      if (y instanceof PascalDizi) y = y.veri;
      if (Array.isArray(y)) { sekil.push(y.length); if (!y.length) break; y = y[0]; }
      else if (y instanceof MTensor) { sekil.push(...y.s); break; }
      else break;
    }
    const veri: number[] = [];
    const dolas = (z: any, d: number) => {
      if (z instanceof PascalDizi) z = z.veri;
      if (z instanceof MTensor) {
        if (!ayniSekil(z.s, sekil.slice(d))) hata('Düzensiz liste: tüm alt listeler aynı şekilde olmalı');
        for (const a of z.v) veri.push(a);
        return;
      }
      if (d === sekil.length) { veri.push(sayi(z)); return; }
      if (!Array.isArray(z) || z.length !== sekil[d]) hata('Düzensiz liste: tüm alt listeler aynı uzunlukta olmalı');
      for (const e of z) dolas(e, d + 1);
    };
    dolas(x, 0);
    return new MTensor(Float64Array.from(veri), sekil, gerekli);
  }
  hata(`Tensöre çevrilemez: ${$.turAdi(x)}`);
}

// ================================================================ yayma (broadcasting)
function yaySekil(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length), r: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = a[a.length - n + i] ?? 1, y = b[b.length - n + i] ?? 1;
    if (x !== y && x !== 1 && y !== 1) hata(`Tensör şekilleri uyumsuz: ${sekilYaz(a)} ve ${sekilYaz(b)}`);
    r.push(x === 1 ? y : x);
  }
  return r;
}
/** çıktı düz dizini → girdi düz dizini eşlemesi (girdi şekli çıktıya yayılırken) */
function harita(cikis: number[], giris: number[]): Int32Array | null {
  if (ayniSekil(cikis, giris)) return null;
  const n = carpim(cikis), m = new Int32Array(n);
  const fark = cikis.length - giris.length;
  const ga = adimlar(giris);
  const adim = cikis.map((_, d) => d < fark || giris[d - fark] === 1 ? 0 : ga[d - fark]);
  const sayac = new Array(cikis.length).fill(0);
  let o = 0;
  for (let i = 0; i < n; i++) {
    m[i] = o;
    for (let d = cikis.length - 1; d >= 0; d--) {
      sayac[d]++; o += adim[d];
      if (sayac[d] < cikis[d]) break;
      o -= adim[d] * cikis[d]; sayac[d] = 0;
    }
  }
  return m;
}
function yay(t: MTensor, sekil: number[]): Float64Array {
  yaySekil(t.s, sekil);
  const h = harita(sekil, t.s);
  if (!h) return t.v;
  const r = new Float64Array(h.length);
  for (let i = 0; i < h.length; i++) r[i] = t.v[h[i]];
  return r;
}
/** gradyanı yayılmadan önceki şekle indirger */
function indir(g: Float64Array, h: Int32Array | null, n: number): Float64Array {
  if (!h) return g;
  const r = new Float64Array(n);
  for (let i = 0; i < h.length; i++) r[h[i]] += g[i];
  return r;
}

type Ikili = (x: number, y: number) => number;
function ikili(a0: any, b0: any, f: Ikili, dfa: (x: number, y: number, z: number) => number, dfb: (x: number, y: number, z: number) => number): MTensor {
  const a = tensore(a0), b = tensore(b0);
  const s = yaySekil(a.s, b.s);
  const ha = harita(s, a.s), hb = harita(s, b.s);
  const n = carpim(s), out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = f(a.v[ha ? ha[i] : i], b.v[hb ? hb[i] : i]);
  return yeni(out, s, [a, b], g => {
    if (a.gerekli) {
      const ga = new Float64Array(n);
      for (let i = 0; i < n; i++) ga[i] = g[i] * dfa(a.v[ha ? ha[i] : i], b.v[hb ? hb[i] : i], out[i]);
      biriktir(a, indir(ga, ha, a.n));
    }
    if (b.gerekli) {
      const gb = new Float64Array(n);
      for (let i = 0; i < n; i++) gb[i] = g[i] * dfb(a.v[ha ? ha[i] : i], b.v[hb ? hb[i] : i], out[i]);
      biriktir(b, indir(gb, hb, b.n));
    }
  });
}
const topla = (a: any, b: any) => ikili(a, b, (x, y) => x + y, () => 1, () => 1);
const cikar = (a: any, b: any) => ikili(a, b, (x, y) => x - y, () => 1, () => -1);
const carp = (a: any, b: any) => ikili(a, b, (x, y) => x * y, (x, y) => y, (x) => x);
const bol = (a: any, b: any) => ikili(a, b, (x, y) => x / y, (x, y) => 1 / y, (x, y) => -x / (y * y));
const usal = (a: any, b: any) => ikili(a, b, (x, y) => Math.pow(x, y),
  (x, y) => y === 0 ? 0 : y * Math.pow(x, y - 1), (x, y, z) => x > 0 ? z * Math.log(x) : 0);
const karsilastir = (a: any, b: any, f: (x: number, y: number) => boolean) => {
  const A = tensore(a), Bt = tensore(b), s = yaySekil(A.s, Bt.s);
  const x = yay(A, s), y = yay(Bt, s), out = new Float64Array(x.length);
  for (let i = 0; i < out.length; i++) out[i] = f(x[i], y[i]) ? 1 : 0;
  return new MTensor(out, s);
};

function tekli(t0: any, f: (x: number) => number, df: (x: number, y: number) => number): MTensor {
  const t = tensore(t0), n = t.n, out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = f(t.v[i]);
  return yeni(out, t.s.slice(), [t], g => {
    const r = new Float64Array(n);
    for (let i = 0; i < n; i++) r[i] = g[i] * df(t.v[i], out[i]);
    biriktir(t, r);
  });
}
const sigmoid = (x: number) => { if (x >= 0) return 1 / (1 + Math.exp(-x)); const e = Math.exp(x); return e / (1 + e); };
const GELU_C = Math.sqrt(2 / Math.PI);
function gelu(x: number) { return 0.5 * x * (1 + Math.tanh(GELU_C * (x + 0.044715 * x * x * x))); }
function geluTurev(x: number) {
  const u = GELU_C * (x + 0.044715 * x * x * x), th = Math.tanh(u);
  return 0.5 * (1 + th) + 0.5 * x * (1 - th * th) * GELU_C * (1 + 3 * 0.044715 * x * x);
}
const logGuvenli = (x: number) => { if (x < 0) hata('log: negatif değer'); return x === 0 ? -Infinity : Math.log(x); };

// ================================================================ şekil işlemleri
function boyutCoz(d: any, n: number): number {
  let x = tam(d, 'Boyut');
  if (x < 0) x += n;
  if (x < 0 || x >= n) hata(`Boyut sınır dışı: ${d} (tensör ${n} boyutlu)`);
  return x;
}
function sekilAl(a: any[]): number[] {
  if (a.length === 1 && (Array.isArray(a[0]) || a[0] instanceof PascalDizi)) a = yinele(a[0]);
  return a.map(x => tam(x, 'Şekil'));
}
function yenidenSekil(t: MTensor, sekil0: number[]): MTensor {
  const sekil = sekil0.slice();
  const bilinmeyen = sekil.indexOf(-1);
  if (bilinmeyen >= 0) {
    const diger = carpim(sekil.filter((_, i) => i !== bilinmeyen));
    if (diger === 0 || t.n % diger !== 0) hata(`Yeniden şekillendirme olanaksız: ${t.n} öğe → ${sekilYaz(sekil0)}`);
    sekil[bilinmeyen] = t.n / diger;
  }
  if (carpim(sekil) !== t.n) hata(`Yeniden şekillendirme olanaksız: ${t.n} öğe → ${sekilYaz(sekil0)}`);
  return yeni(t.v.slice(), sekil, [t], g => biriktir(t, g));
}
function permute(t: MTensor, dizi: number[]): MTensor {
  const n = t.s.length;
  if (dizi.length !== n || new Set(dizi).size !== n) hata(`Boyut sıralaması ${n} farklı boyut içermeli`);
  const s = dizi.map(d => t.s[d]);
  const ga = adimlar(t.s);
  const h = new Int32Array(t.n);
  const adim = dizi.map(d => ga[d]);
  const sayac = new Array(n).fill(0);
  let o = 0;
  for (let i = 0; i < t.n; i++) {
    h[i] = o;
    for (let d = n - 1; d >= 0; d--) {
      sayac[d]++; o += adim[d];
      if (sayac[d] < s[d]) break;
      o -= adim[d] * s[d]; sayac[d] = 0;
    }
  }
  const out = new Float64Array(t.n);
  for (let i = 0; i < t.n; i++) out[i] = t.v[h[i]];
  return yeni(out, s, [t], g => {
    const r = new Float64Array(t.n);
    for (let i = 0; i < t.n; i++) r[h[i]] += g[i];
    biriktir(t, r);
  });
}
function transpoze(t: MTensor, a: number, b: number): MTensor {
  const d = t.s.map((_, i) => i);
  d[a] = b; d[b] = a;
  return permute(t, d);
}
/** baştaki boyutlarda dizinle seçim; tüm boyutlar seçilirse sayı döner */
function secim(t: MTensor, idx: number[]): any {
  if (idx.length > t.s.length) hata(`Tensör ${t.s.length} boyutlu; ${idx.length} dizin verildi`);
  const ad = adimlar(t.s);
  let o = 0;
  idx.forEach((i, d) => {
    const j = i < 0 ? i + t.s[d] : i;
    if (j < 0 || j >= t.s[d]) hata(`Tensör dizini sınır dışı: ${i} (boyut ${d}, uzunluk ${t.s[d]})`);
    o += j * ad[d];
  });
  const s = t.s.slice(idx.length), n = carpim(s);
  if (s.length === 0) return t.v[o];
  return yeni(t.v.slice(o, o + n), s, [t], g => {
    const r = new Float64Array(t.n);
    for (let k = 0; k < n; k++) r[o + k] = g[k];
    biriktir(t, r);
  });
}
function daralt(t: MTensor, d0: any, bas0: any, uz0: any): MTensor {
  const d = boyutCoz(d0, t.s.length);
  let bas = tam(bas0, 'Başlangıç'); if (bas < 0) bas += t.s[d];
  const uz = tam(uz0, 'Uzunluk');
  if (bas < 0 || uz < 0 || bas + uz > t.s[d]) hata(`Daraltma sınır dışı: boyut ${d}, ${bas}..${bas + uz} (uzunluk ${t.s[d]})`);
  return dizinSec(t, d, Array.from({ length: uz }, (_, i) => bas + i));
}
/** d boyutunda verilen dizinleri seçer (türevlenebilir) */
function dizinSec(t: MTensor, d: number, dizinler: number[]): MTensor {
  const s = t.s.slice(); s[d] = dizinler.length;
  const once = carpim(t.s.slice(0, d)), sonra = carpim(t.s.slice(d + 1));
  const n = carpim(s), out = new Float64Array(n), h = new Int32Array(n);
  let w = 0;
  for (let a = 0; a < once; a++) for (const j0 of dizinler) {
    const j = j0 < 0 ? j0 + t.s[d] : j0;
    if (j < 0 || j >= t.s[d]) hata(`Dizin sınır dışı: ${j0} (uzunluk ${t.s[d]})`);
    const o = (a * t.s[d] + j) * sonra;
    for (let c = 0; c < sonra; c++) { h[w] = o + c; out[w++] = t.v[o + c]; }
  }
  return yeni(out, s, [t], g => {
    const r = new Float64Array(t.n);
    for (let i = 0; i < n; i++) r[h[i]] += g[i];
    biriktir(t, r);
  });
}
function bitistir(lst: any, d0: any = 0n): MTensor {
  const ts = yinele(lst).map((x: any) => tensore(x));
  if (!ts.length) hata('Birleştirilecek tensör yok');
  const nb = ts[0].s.length;
  const d = boyutCoz(d0, nb);
  for (const t of ts) if (t.s.length !== nb || t.s.some((x, i) => i !== d && x !== ts[0].s[i])) hata(`Birleştirilen tensörlerin şekilleri uyumsuz: ${sekilYaz(ts[0].s)} ve ${sekilYaz(t.s)}`);
  const s = ts[0].s.slice(); s[d] = ts.reduce((a, t) => a + t.s[d], 0);
  const once = carpim(s.slice(0, d)), sonra = carpim(s.slice(d + 1));
  const out = new Float64Array(carpim(s));
  let w = 0;
  for (let a = 0; a < once; a++) for (const t of ts) {
    const parca = t.s[d] * sonra, o = a * parca;
    for (let c = 0; c < parca; c++) out[w++] = t.v[o + c];
  }
  return yeni(out, s, ts, g => {
    const rs = ts.map(t => new Float64Array(t.n));
    let w2 = 0;
    for (let a = 0; a < once; a++) ts.forEach((t, k) => {
      const parca = t.s[d] * sonra, o = a * parca;
      for (let c = 0; c < parca; c++) rs[k][o + c] = g[w2++];
    });
    ts.forEach((t, k) => biriktir(t, rs[k]));
  });
}
function yigma(lst: any, d0: any = 0n): MTensor {
  const ts = yinele(lst).map((x: any) => tensore(x));
  if (!ts.length) hata('Yığılacak tensör yok');
  const d = boyutCoz(d0, ts[0].s.length + 1);
  return bitistir(ts.map(t => boyutEkle(t, d)), B(d));
}
function boyutEkle(t: MTensor, d: number): MTensor {
  const s = t.s.slice(); s.splice(d, 0, 1);
  return yenidenSekil(t, s);
}

// ================================================================ indirgemeler
/** dims boyutları üzerinden toplar (sıra: girdi düz dizini artan) */
function topIndir(t: MTensor, dims: number[] | null, tut: boolean): MTensor {
  const nb = t.s.length;
  const ds = dims === null ? t.s.map((_, i) => i) : dims;
  const sKeep = t.s.map((x, i) => ds.includes(i) ? 1 : x);
  const s = tut ? sKeep : t.s.filter((_, i) => !ds.includes(i));
  const sk = adimlar(sKeep);
  const ga = adimlar(t.s);
  const m = new Int32Array(t.n);
  for (let i = 0; i < t.n; i++) {
    let o = 0, kalan = i;
    for (let d = 0; d < nb; d++) { const c = Math.floor(kalan / ga[d]); kalan -= c * ga[d]; if (sKeep[d] !== 1) o += c * sk[d]; }
    m[i] = o;
  }
  const out = new Float64Array(carpim(sKeep));
  for (let i = 0; i < t.n; i++) out[m[i]] += t.v[i];
  return yeni(out, s, [t], g => {
    const r = new Float64Array(t.n);
    for (let i = 0; i < t.n; i++) r[i] = g[m[i]];
    biriktir(t, r);
  });
}
function boyutlar(d: any, nb: number): number[] | null {
  if (d === null || d === undefined) return null;
  if (Array.isArray(d)) return d.map(x => boyutCoz(x, nb));
  return [boyutCoz(d, nb)];
}
function ortalama(t: MTensor, d: any, tut: boolean) {
  const ds = boyutlar(d, t.s.length);
  const sayi_ = ds === null ? t.n : ds.reduce((a, x) => a * t.s[x], 1);
  return bol(topIndir(t, ds, tut), sayi_);
}
function varyans(t: MTensor, d: any, duzeltme: number, tut: boolean) {
  const ds = boyutlar(d, t.s.length);
  const n = ds === null ? t.n : ds.reduce((a, x) => a * t.s[x], 1);
  const m = ortalama(t, d, true);
  const fark = cikar(t, m);
  return bol(topIndir(carp(fark, fark), ds, tut), n - duzeltme);
}
/** tek boyutta en büyük/en küçük: değerler ve dizinler */
function ucDeger(t: MTensor, d0: any, tut: boolean, buyuk: boolean): [MTensor, MTensor] {
  if (d0 === null || d0 === undefined) {
    if (!t.n) hata('Boş tensörün en büyüğü yok');
    let bi = 0;
    for (let i = 1; i < t.n; i++) if (buyuk ? t.v[i] > t.v[bi] : t.v[i] < t.v[bi]) bi = i;
    const deger = yeni(Float64Array.of(t.v[bi]), [], [t], g => { const r = new Float64Array(t.n); r[bi] = g[0]; biriktir(t, r); });
    return [deger, new MTensor(Float64Array.of(bi), [])];
  }
  const d = boyutCoz(d0, t.s.length);
  const once = carpim(t.s.slice(0, d)), L = t.s[d], sonra = carpim(t.s.slice(d + 1));
  const n = once * sonra, out = new Float64Array(n), dz = new Float64Array(n), kaynak = new Int32Array(n);
  for (let a = 0; a < once; a++) for (let c = 0; c < sonra; c++) {
    const taban = a * L * sonra + c;
    let bi = 0;
    for (let j = 1; j < L; j++) {
      const x = t.v[taban + j * sonra], y = t.v[taban + bi * sonra];
      if (buyuk ? x > y : x < y) bi = j;
    }
    const o = a * sonra + c;
    out[o] = t.v[taban + bi * sonra]; dz[o] = bi; kaynak[o] = taban + bi * sonra;
  }
  const s = t.s.slice(); if (tut) s[d] = 1; else s.splice(d, 1);
  const deger = yeni(out, s, [t], g => { const r = new Float64Array(t.n); for (let i = 0; i < n; i++) r[kaynak[i]] += g[i]; biriktir(t, r); });
  return [deger, new MTensor(dz, s.slice())];
}

// ================================================================ matris çarpımı
function matCarp(a0: any, b0: any): MTensor {
  let a = tensore(a0), b = tensore(b0);
  if (a.s.length === 0 || b.s.length === 0) hata('matmul 0 boyutlu tensör kabul etmez');
  const a1 = a.s.length === 1, b1 = b.s.length === 1;
  if (a1) a = yenidenSekil(a, [1, a.s[0]]);
  if (b1) b = yenidenSekil(b, [b.s[0], 1]);
  const [n, k] = a.s.slice(-2), [k2, m] = b.s.slice(-2);
  if (k !== k2) hata(`matmul şekilleri uyumsuz: ${sekilYaz(a.s)} @ ${sekilYaz(b.s)}`);
  const yb = yaySekil(a.s.slice(0, -2), b.s.slice(0, -2));
  const nb = carpim(yb);
  const ha = harita(yb, a.s.slice(0, -2)), hb = harita(yb, b.s.slice(0, -2));
  const out = new Float64Array(nb * n * m);
  const A = a.v, Bv = b.v;
  for (let q = 0; q < nb; q++) {
    const oa = (ha ? ha[q] : q) * n * k, ob = (hb ? hb[q] : q) * k * m, oc = q * n * m;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      let t = 0;
      for (let p = 0; p < k; p++) t += A[oa + i * k + p] * Bv[ob + p * m + j];
      out[oc + i * m + j] = t;
    }
  }
  let sekil = [...yb, n, m];
  const aa = a, bb = b;
  let r = yeni(out, sekil, [aa, bb], g => {
    if (aa.gerekli) {
      const ga = new Float64Array(aa.n);
      for (let q = 0; q < nb; q++) {
        const oa = (ha ? ha[q] : q) * n * k, ob = (hb ? hb[q] : q) * k * m, oc = q * n * m;
        for (let i = 0; i < n; i++) for (let p = 0; p < k; p++) {
          let t = 0;
          for (let j = 0; j < m; j++) t += g[oc + i * m + j] * Bv[ob + p * m + j];
          ga[oa + i * k + p] += t;
        }
      }
      biriktir(aa, ga);
    }
    if (bb.gerekli) {
      const gb = new Float64Array(bb.n);
      for (let q = 0; q < nb; q++) {
        const oa = (ha ? ha[q] : q) * n * k, ob = (hb ? hb[q] : q) * k * m, oc = q * n * m;
        for (let p = 0; p < k; p++) for (let j = 0; j < m; j++) {
          let t = 0;
          for (let i = 0; i < n; i++) t += A[oa + i * k + p] * g[oc + i * m + j];
          gb[ob + p * m + j] += t;
        }
      }
      biriktir(bb, gb);
    }
  });
  if (a1 || b1) {
    sekil = [...yb, ...(a1 ? [] : [n]), ...(b1 ? [] : [m])];
    r = yenidenSekil(r, sekil);
  }
  return r;
}

// ================================================================ birleşik işlemler (hızlı ve kararlı)
function sonBoyut(t: MTensor, d0: any): [number, number, number, number] {
  const d = boyutCoz(d0 ?? -1n, t.s.length);
  return [d, carpim(t.s.slice(0, d)), t.s[d], carpim(t.s.slice(d + 1))];
}
function softmaks(t0: any, d0: any, log: boolean): MTensor {
  const t = tensore(t0);
  const [, once, L, sonra] = sonBoyut(t, d0);
  const out = new Float64Array(t.n);
  for (let a = 0; a < once; a++) for (let c = 0; c < sonra; c++) {
    const o = a * L * sonra + c;
    let mx = -Infinity;
    for (let j = 0; j < L; j++) if (t.v[o + j * sonra] > mx) mx = t.v[o + j * sonra];
    let top = 0;
    for (let j = 0; j < L; j++) top += Math.exp(t.v[o + j * sonra] - mx);
    const lt = Math.log(top);
    for (let j = 0; j < L; j++) {
      const z = t.v[o + j * sonra] - mx;
      out[o + j * sonra] = log ? z - lt : Math.exp(z) / top;
    }
  }
  return yeni(out, t.s.slice(), [t], g => {
    const r = new Float64Array(t.n);
    for (let a = 0; a < once; a++) for (let c = 0; c < sonra; c++) {
      const o = a * L * sonra + c;
      let top = 0;
      if (log) {
        for (let j = 0; j < L; j++) top += g[o + j * sonra];
        for (let j = 0; j < L; j++) r[o + j * sonra] = g[o + j * sonra] - Math.exp(out[o + j * sonra]) * top;
      } else {
        for (let j = 0; j < L; j++) top += g[o + j * sonra] * out[o + j * sonra];
        for (let j = 0; j < L; j++) r[o + j * sonra] = out[o + j * sonra] * (g[o + j * sonra] - top);
      }
    }
    biriktir(t, r);
  });
}
function hedefler(y: any, n: number): number[] {
  const lst = y instanceof MTensor ? Array.from(y.v) : yinele(y).map(sayi);
  if (lst.length !== n) hata(`Hedef sayısı (${lst.length}) satır sayısına (${n}) eşit olmalı`);
  return lst.map(x => { if (!Number.isInteger(x)) hata('Sınıf hedefleri tamsayı olmalı'); return x; });
}
/** cross_entropy: girdi [N, C] ham puanlar, hedef N sınıf dizini; ortalama kayıp */
function caprazEntropi(x0: any, y: any, yoksay = -100): MTensor {
  const x = tensore(x0);
  if (x.s.length !== 2) hata(`cross_entropy [N, C] şeklinde girdi bekler, ${sekilYaz(x.s)} verildi (gerekirse .view(-1, C) kullanın)`);
  const [N, C] = x.s;
  const h = hedefler(y, N);
  const p = new Float64Array(x.n);
  let kayip = 0, sayilan = 0;
  for (let i = 0; i < N; i++) {
    const o = i * C;
    let mx = -Infinity;
    for (let j = 0; j < C; j++) if (x.v[o + j] > mx) mx = x.v[o + j];
    let top = 0;
    for (let j = 0; j < C; j++) top += Math.exp(x.v[o + j] - mx);
    for (let j = 0; j < C; j++) p[o + j] = Math.exp(x.v[o + j] - mx) / top;
    if (h[i] === yoksay) continue;
    if (h[i] < 0 || h[i] >= C) hata(`Sınıf hedefi sınır dışı: ${h[i]} (sınıf sayısı ${C})`);
    kayip -= x.v[o + h[i]] - mx - Math.log(top);
    sayilan++;
  }
  const bolen = sayilan || 1;
  return yeni(Float64Array.of(kayip / bolen), [], [x], g => {
    const r = new Float64Array(x.n);
    for (let i = 0; i < N; i++) {
      if (h[i] === yoksay) continue;
      for (let j = 0; j < C; j++) r[i * C + j] = g[0] * (p[i * C + j] - (j === h[i] ? 1 : 0)) / bolen;
    }
    biriktir(x, r);
  });
}
function nllKaybi(x0: any, y: any): MTensor {
  const x = tensore(x0);
  if (x.s.length !== 2) hata('nll_loss [N, C] şeklinde girdi bekler');
  const [N, C] = x.s, h = hedefler(y, N);
  let k = 0;
  for (let i = 0; i < N; i++) k -= x.v[i * C + h[i]];
  return yeni(Float64Array.of(k / N), [], [x], g => {
    const r = new Float64Array(x.n);
    for (let i = 0; i < N; i++) r[i * C + h[i]] = -g[0] / N;
    biriktir(x, r);
  });
}
function katmanNorm(x0: any, w: any, b: any, eps: number): MTensor {
  const x = tensore(x0);
  const D = x.s[x.s.length - 1], N = x.n / D;
  const out = new Float64Array(x.n), xh = new Float64Array(x.n), ist = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const o = i * D;
    let m = 0; for (let j = 0; j < D; j++) m += x.v[o + j]; m /= D;
    let v = 0; for (let j = 0; j < D; j++) { const f = x.v[o + j] - m; v += f * f; } v /= D;
    const is = 1 / Math.sqrt(v + eps); ist[i] = is;
    for (let j = 0; j < D; j++) xh[o + j] = (x.v[o + j] - m) * is;
  }
  const W = w === null ? null : tensore(w), Bb = b === null ? null : tensore(b);
  for (let i = 0; i < x.n; i++) {
    const j = i % D;
    out[i] = xh[i] * (W ? W.v[j] : 1) + (Bb ? Bb.v[j] : 0);
  }
  const ebeveyn = [x, ...(W ? [W] : []), ...(Bb ? [Bb] : [])];
  return yeni(out, x.s.slice(), ebeveyn, g => {
    if (W && W.gerekli) { const r = new Float64Array(D); for (let i = 0; i < x.n; i++) r[i % D] += g[i] * xh[i]; biriktir(W, r); }
    if (Bb && Bb.gerekli) { const r = new Float64Array(D); for (let i = 0; i < x.n; i++) r[i % D] += g[i]; biriktir(Bb, r); }
    if (x.gerekli) {
      const r = new Float64Array(x.n);
      for (let i = 0; i < N; i++) {
        const o = i * D;
        let t1 = 0, t2 = 0;
        for (let j = 0; j < D; j++) { const gh = g[o + j] * (W ? W.v[j] : 1); t1 += gh; t2 += gh * xh[o + j]; }
        for (let j = 0; j < D; j++) {
          const gh = g[o + j] * (W ? W.v[j] : 1);
          r[o + j] = ist[i] * (gh - t1 / D - xh[o + j] * t2 / D);
        }
      }
      biriktir(x, r);
    }
  });
}
function gomme(ids: any, W0: any): MTensor {
  const W = tensore(W0);
  if (W.s.length !== 2) hata('embedding ağırlığı [sözlük boyu, boyut] şeklinde olmalı');
  const it = tensore(ids);
  const [V, D] = W.s;
  const sira = Array.from(it.v).map(x => { if (!Number.isInteger(x) || x < 0 || x >= V) hata(`Gömme dizini sınır dışı: ${x} (sözlük boyu ${V})`); return x; });
  const out = new Float64Array(sira.length * D);
  sira.forEach((k, i) => { for (let j = 0; j < D; j++) out[i * D + j] = W.v[k * D + j]; });
  return yeni(out, [...it.s, D], [W], g => {
    const r = new Float64Array(W.n);
    sira.forEach((k, i) => { for (let j = 0; j < D; j++) r[k * D + j] += g[i * D + j]; });
    biriktir(W, r);
  });
}
function birakma(x0: any, p: number, egitim: boolean): MTensor {
  const x = tensore(x0);
  if (!egitim || p === 0) return x;
  if (p < 0 || p >= 1) hata('Bırakma oranı 0 ile 1 arasında olmalı');
  const olcek = 1 / (1 - p), maske = new Float64Array(x.n);
  for (let i = 0; i < x.n; i++) maske[i] = mRng.random() < p ? 0 : olcek;
  return carp(x, new MTensor(maske, x.s.slice()));
}
function maskeDoldur(x0: any, maske0: any, deger: number): MTensor {
  const x = tensore(x0), m = yay(tensore(maske0), x.s);
  const out = new Float64Array(x.n);
  for (let i = 0; i < x.n; i++) out[i] = m[i] !== 0 ? deger : x.v[i];
  return yeni(out, x.s.slice(), [x], g => {
    const r = new Float64Array(x.n);
    for (let i = 0; i < x.n; i++) r[i] = m[i] !== 0 ? 0 : g[i];
    biriktir(x, r);
  });
}
function nerede(kosul: any, a0: any, b0: any): MTensor {
  const k = tensore(kosul), a = tensore(a0), b = tensore(b0);
  const s = yaySekil(yaySekil(k.s, a.s), b.s);
  const kv = yay(k, s);
  return topla(carp(a, new MTensor(Float64Array.from(kv, x => x !== 0 ? 1 : 0), s)),
    carp(b, new MTensor(Float64Array.from(kv, x => x !== 0 ? 0 : 1), s)));
}
function ucgen(t0: any, k0: any, alt: boolean): MTensor {
  const t = tensore(t0);
  if (t.s.length < 2) hata('tril/triu en az 2 boyutlu tensör bekler');
  const k = tam(k0 ?? 0n, 'Köşegen');
  const [R, C] = t.s.slice(-2);
  const m = new Float64Array(t.n);
  for (let i = 0; i < t.n; i++) {
    const r = Math.floor((i % (R * C)) / C), c = i % C;
    m[i] = (alt ? c - r <= k : c - r >= k) ? 1 : 0;
  }
  return carp(t, new MTensor(m, t.s.slice()));
}

// ================================================================ geri yayılım
function geriYay(t: MTensor, g0: any = null) {
  if (!t.gerekli) hata('Bu tensör gradyan gerektirmiyor; geri yayılım yapılamaz');
  if (g0 === null && t.n !== 1) hata('backward yalnızca tek öğeli (skaler) tensörde argümansız çağrılabilir');
  const sira: MTensor[] = [], gor = new Set<MTensor>();
  const yigin: [MTensor, boolean][] = [[t, false]];
  while (yigin.length) {
    const [u, bitti] = yigin.pop();
    if (bitti) { sira.push(u); continue; }
    if (gor.has(u)) continue;
    gor.add(u);
    yigin.push([u, true]);
    for (const p of u.ebeveyn) if (!gor.has(p)) yigin.push([p, false]);
  }
  // ara düğümlerin gradyanı geçici olarak .grad alanında birikir; işlem bitince silinir
  for (const u of sira) if (u.geri) u.grad = null;
  const tohum = g0 === null ? Float64Array.of(1) : Float64Array.from(yay(tensore(g0), t.s));
  if (t.geri) t.grad = tohum; else biriktir(t, tohum);
  for (let i = sira.length - 1; i >= 0; i--) {
    const u = sira[i];
    if (u.geri && u.grad) u.geri(u.grad);
  }
  for (const u of sira) if (u.geri) u.grad = null;
}

// ================================================================ optimizasyon
function parametreler(p: any): MTensor[] {
  const r = yinele(p).filter((x: any) => x instanceof MTensor) as MTensor[];
  if (!r.length) hata('Optimizasyon için en az bir parametre tensörü gerekli');
  return r;
}
class Optim {
  TUR_ADI = 'optimizasyon';
  params: MTensor[];
  adimSayisi = 0;
  constructor(p: any, public oran: number, public ad: string) { this.params = parametreler(p); }
  sifirla() { for (const p of this.params) p.grad = null; }
  adim() {}
  kAl(ad: string): any {
    switch (ad) {
      case 'adim': case 'step': return fn(() => { this.adim(); return null; }, 'Adım', 0, 0, [], true);
      case 'sifirlagrad': case 'zero_grad': return fn(() => { this.sifirla(); return null; }, 'SıfırlaGrad', 0, 0, [], true);
      case 'oran': case 'lr': return this.oran;
      case 'parametreler': case 'params': return this.params.slice();
    }
    hata(`${this.ad} nesnesinde '${ad}' üyesi yok`);
  }
  kAta(ad: string, v: any) {
    if (ad === 'oran' || ad === 'lr') { this.oran = sayi(v); return; }
    hata(`${this.ad} nesnesinin '${ad}' üyesine atama yapılamaz`);
  }
  toString() { return `${this.ad}(${this.params.length} parametre, oran=${sabitNokta(this.oran, 6).replace(/0+$/, '').replace(/\.$/, '.0')})`; }
}
class SGD extends Optim {
  hiz: (Float64Array | null)[];
  constructor(p: any, oran: number, public momentum: number, public azalma: number) { super(p, oran, 'SGD'); this.hiz = this.params.map(() => null); }
  adim() {
    this.params.forEach((p, k) => {
      if (!p.grad) return;
      const g = p.grad;
      if (this.azalma) for (let i = 0; i < g.length; i++) g[i] += this.azalma * p.v[i];
      let d = g;
      if (this.momentum) {
        const h = this.hiz[k];
        if (!h) this.hiz[k] = Float64Array.from(g);
        else for (let i = 0; i < g.length; i++) h[i] = this.momentum * h[i] + g[i];
        d = this.hiz[k];
      }
      for (let i = 0; i < p.n; i++) p.v[i] -= this.oran * d[i];
    });
  }
}
class Adam extends Optim {
  m: (Float64Array | null)[]; s: (Float64Array | null)[]; t = 0;
  constructor(p: any, oran: number, public b1: number, public b2: number, public eps: number, public azalma: number, public ayrik: boolean, ad: string) {
    super(p, oran, ad); this.m = this.params.map(() => null); this.s = this.params.map(() => null);
  }
  adim() {
    this.t++;
    const d1 = 1 - Math.pow(this.b1, this.t), d2 = 1 - Math.pow(this.b2, this.t);
    this.params.forEach((p, k) => {
      if (!p.grad) return;
      const g = p.grad;
      if (this.ayrik) { if (this.azalma) for (let i = 0; i < p.n; i++) p.v[i] -= this.oran * this.azalma * p.v[i]; }
      else if (this.azalma) for (let i = 0; i < g.length; i++) g[i] += this.azalma * p.v[i];
      const m = this.m[k] ?? (this.m[k] = new Float64Array(p.n));
      const s = this.s[k] ?? (this.s[k] = new Float64Array(p.n));
      for (let i = 0; i < p.n; i++) {
        m[i] = this.b1 * m[i] + (1 - this.b1) * g[i];
        s[i] = this.b2 * s[i] + (1 - this.b2) * g[i] * g[i];
        p.v[i] -= this.oran * (m[i] / d1) / (Math.sqrt(s[i] / d2) + this.eps);
      }
    });
  }
}

// ================================================================ veri
class VeriKumesi {
  TUR_ADI = 'TensörVeriKümesi';
  constructor(public tensorler: MTensor[]) {
    if (!tensorler.length) hata('TensörVeriKümesi en az bir tensör ister');
    const n = tensorler[0].s[0];
    for (const t of tensorler) if (!t.s.length || t.s[0] !== n) hata('TensörVeriKümesi: tüm tensörlerin ilk boyutu aynı olmalı');
  }
  get uzunluk() { return this.tensorler[0].s[0]; }
  oge(i: number) { return this.tensorler.map(t => secimTensor(t, i)); }
  kAl(ad: string): any {
    if (ad === 'uzunluk' || ad === 'len') return B(this.uzunluk);
    if (ad === 'tensorler' || ad === 'tensors') return this.tensorler.slice();
    hata(`TensörVeriKümesi nesnesinde '${ad}' üyesi yok`);
  }
  toString() { return `TensörVeriKümesi(${this.uzunluk} örnek)`; }
  $yinele() { return Array.from({ length: this.uzunluk }, (_, i) => this.oge(i)); }
}
function secimTensor(t: MTensor, i: number): MTensor {
  const r = secim(t, [i]);
  return r instanceof MTensor ? r : new MTensor(Float64Array.of(r), []);
}
class VeriYukleyici {
  TUR_ADI = 'VeriYükleyici';
  constructor(public kume: VeriKumesi, public yigin: number, public karistir: boolean, public sonuAt: boolean) {}
  yiginlar(): any[][] {
    const n = this.kume.uzunluk;
    const sira: number[] = Array.from({ length: n }, (_, i) => i);
    if (this.karistir) mRng.shuffle(sira);
    const r: any[][] = [];
    for (let b = 0; b < n; b += this.yigin) {
      const p = sira.slice(b, b + this.yigin);
      if (this.sonuAt && p.length < this.yigin) break;
      r.push(this.kume.tensorler.map(t => dizinSec(t, 0, p)));
    }
    return r;
  }
  kAl(ad: string): any {
    if (ad === 'uzunluk' || ad === 'len') { const n = this.kume.uzunluk; return B(this.sonuAt ? Math.floor(n / this.yigin) : Math.ceil(n / this.yigin)); }
    if (ad === 'yiginlar' || ad === 'batches') return this.yiginlar();
    hata(`VeriYükleyici nesnesinde '${ad}' üyesi yok`);
  }
  toString() { return `VeriYükleyici(${this.kume.uzunluk} örnek, yığın ${this.yigin}${this.karistir ? ', karıştırılmış' : ''})`; }
  $yinele() { return this.yiginlar(); }
}

// ================================================================ kaydet / yükle
function kayitYap(o: any): any {
  if (o instanceof MTensor) return { tensor: Array.from(o.v), sekil: o.s };
  if (o instanceof Map) { const r: any = { sozluk: [] }; o.forEach((v, k) => r.sozluk.push([metne(k), kayitYap(v)])); return r; }
  if (Array.isArray(o)) return { liste: o.map(kayitYap) };
  if (typeof o === 'bigint') return { tamsayi: o.toString() };
  if (typeof o === 'number' || typeof o === 'string' || typeof o === 'boolean' || o === null) return { deger: o };
  hata(`Kaydedilemez: ${$.turAdi(o)} (tensör, sözlük, liste ve sayılar kaydedilebilir)`);
}
function kayitCoz(o: any): any {
  if ('tensor' in o) return new MTensor(Float64Array.from(o.tensor), o.sekil);
  if ('sozluk' in o) { const m = new Map(); for (const [k, v] of o.sozluk) m.set(k, kayitCoz(v)); return m; }
  if ('liste' in o) return o.liste.map(kayitCoz);
  if ('tamsayi' in o) return BigInt(o.tamsayi);
  return o.deger;
}

// ================================================================ tensör üyeleri
const fnu = (ad: string, f: (...a: any[]) => any, nmax = 999, nmin = 0) => fn(f, ad, nmax, nmin, [], nmin === 0);
const TENSOR_UYE: Record<string, (t: MTensor) => any> = {};
function uye(adlar: string[], f: (t: MTensor) => any) { for (const a of adlar) TENSOR_UYE[katla(a)] = f; }

uye(['Şekil', 'shape'], t => t.s.map(B));
uye(['size'], t => fnu('size', (d: any = null) => d === null ? t.s.map(B) : B(t.s[boyutCoz(d, t.s.length)]), 1));
uye(['BoyutSayısı', 'ndim', 'dim'], t => B(t.s.length));
uye(['ÖğeSayısı', 'numel'], t => B(t.n));
uye(['grad'], t => t.grad === null ? null : new MTensor(Float64Array.from(t.grad), t.s.slice()));
uye(['GradGerekli', 'requires_grad'], t => t.gerekli);
uye(['Öğe', 'item'], t => fnu('item', () => { if (t.n !== 1) hata(`item yalnızca tek öğeli tensörde kullanılabilir (${t.n} öğe var)`); return t.v[0]; }, 0));
uye(['Liste', 'tolist'], t => fnu('tolist', () => t.liste(), 0));
uye(['GeriYay', 'backward'], t => fnu('backward', (g: any = null) => { geriYay(t, g); return null; }, 1));
uye(['Ayır', 'detach'], t => fnu('detach', () => new MTensor(Float64Array.from(t.v), t.s.slice()), 0));
uye(['Kopya', 'clone'], t => fnu('clone', () => yeni(Float64Array.from(t.v), t.s.slice(), [t], g => biriktir(t, g)), 0));
uye(['GradGereksin', 'requires_grad_'], t => fnu('requires_grad_', (b: any = true) => { t.gerekli = dogruMu(b); return t; }, 1));
uye(['GradSıfırla', 'zero_grad'], t => fnu('zero_grad', () => { t.grad = null; return null; }, 0));
uye(['Toplam', 'sum'], t => fnu('sum', (d: any = null, tut: any = false) => topIndir(t, boyutlar(d, t.s.length), dogruMu(tut)), 2));
uye(['Ortalama', 'mean'], t => fnu('mean', (d: any = null, tut: any = false) => ortalama(t, d, dogruMu(tut)), 2));
uye(['Varyans', 'var'], t => fnu('var', (d: any = null, duz: any = 1n, tut: any = false) => varyans(t, d, sayi(duz), dogruMu(tut)), 3));
uye(['Sapma', 'std'], t => fnu('std', (d: any = null, duz: any = 1n, tut: any = false) => tekli(varyans(t, d, sayi(duz), dogruMu(tut)), Math.sqrt, (x, y) => 0.5 / y), 3));
uye(['Maks', 'max'], t => fnu('max', (d: any = null, tut: any = false) => { const [v, i] = ucDeger(t, d, dogruMu(tut), true); return d === null ? v : [v, i]; }, 2));
uye(['Min', 'min'], t => fnu('min', (d: any = null, tut: any = false) => { const [v, i] = ucDeger(t, d, dogruMu(tut), false); return d === null ? v : [v, i]; }, 2));
uye(['ArgMaks', 'argmax'], t => fnu('argmax', (d: any = null, tut: any = false) => ucDeger(t, d, dogruMu(tut), true)[1], 2));
uye(['ArgMin', 'argmin'], t => fnu('argmin', (d: any = null, tut: any = false) => ucDeger(t, d, dogruMu(tut), false)[1], 2));
uye(['Üstel', 'exp'], t => fnu('exp', () => tekli(t, Math.exp, (x, y) => y), 0));
uye(['Log', 'log'], t => fnu('log', () => tekli(t, logGuvenli, x => 1 / x), 0));
uye(['Kök', 'sqrt'], t => fnu('sqrt', () => tekli(t, Math.sqrt, (x, y) => 0.5 / y), 0));
uye(['Mutlak', 'abs'], t => fnu('abs', () => tekli(t, Math.abs, x => x > 0 ? 1 : x < 0 ? -1 : 0), 0));
uye(['Sin', 'sin'], t => fnu('sin', () => tekli(t, Math.sin, x => Math.cos(x)), 0));
uye(['Cos', 'cos'], t => fnu('cos', () => tekli(t, Math.cos, x => -Math.sin(x)), 0));
uye(['Tanh', 'tanh'], t => fnu('tanh', () => tekli(t, Math.tanh, (x, y) => 1 - y * y), 0));
uye(['Sigmoid', 'sigmoid'], t => fnu('sigmoid', () => tekli(t, sigmoid, (x, y) => y * (1 - y)), 0));
uye(['ReLU', 'relu'], t => fnu('relu', () => tekli(t, x => x > 0 ? x : 0, x => x > 0 ? 1 : 0), 0));
uye(['Softmaks', 'softmax'], t => fnu('softmax', (d: any = -1n) => softmaks(t, d, false), 1));
uye(['LogSoftmaks', 'log_softmax'], t => fnu('log_softmax', (d: any = -1n) => softmaks(t, d, true), 1));
uye(['Üs', 'pow'], t => fnu('pow', (u: any) => usal(t, u), 1, 1));
uye(['Yeniden', 'reshape', 'view'], t => fnu('reshape', (...a: any[]) => yenidenSekil(t, sekilAl(a)), 999, 1));
uye(['T'], t => permute(t, t.s.map((_, i) => t.s.length - 1 - i)));
uye(['Çevir', 'transpose'], t => fnu('transpose', (a: any, b: any) => transpoze(t, boyutCoz(a, t.s.length), boyutCoz(b, t.s.length)), 2, 2));
uye(['Diz', 'permute'], t => fnu('permute', (...a: any[]) => permute(t, sekilAl(a).map(d => boyutCoz(B(d), t.s.length))), 999, 1));
uye(['BoyutEkle', 'unsqueeze'], t => fnu('unsqueeze', (d: any) => boyutEkle(t, boyutCoz(d, t.s.length + 1)), 1, 1));
uye(['BoyutSil', 'squeeze'], t => fnu('squeeze', (d: any = null) => {
  if (d === null) return yenidenSekil(t, t.s.filter(x => x !== 1));
  const k = boyutCoz(d, t.s.length);
  return t.s[k] === 1 ? yenidenSekil(t, t.s.filter((_, i) => i !== k)) : t;
}, 1));
uye(['Düzleştir', 'flatten'], t => fnu('flatten', (a: any = 0n, b: any = -1n) => {
  if (!t.s.length) return yenidenSekil(t, [1]);
  const x = boyutCoz(a, t.s.length), y = boyutCoz(b, t.s.length);
  return yenidenSekil(t, [...t.s.slice(0, x), carpim(t.s.slice(x, y + 1)), ...t.s.slice(y + 1)]);
}, 2));
uye(['Daralt', 'narrow'], t => fnu('narrow', (d: any, b: any, u: any) => daralt(t, d, b, u), 3, 3));
uye(['DizinSeç', 'index_select'], t => fnu('index_select', (d: any, idx: any) => dizinSec(t, boyutCoz(d, t.s.length), Array.from(tensore(idx).v)), 2, 2));
uye(['MaskeleDoldur', 'masked_fill'], t => fnu('masked_fill', (m: any, v: any) => maskeDoldur(t, m, sayi(v)), 2, 2));
uye(['Kırp', 'clamp'], t => fnu('clamp', (a: any = null, b: any = null) => tekli(t,
  x => Math.min(b === null ? Infinity : sayi(b), Math.max(a === null ? -Infinity : sayi(a), x)),
  x => (a !== null && x < sayi(a)) || (b !== null && x > sayi(b)) ? 0 : 1), 2));
uye(['Büyüktür', 'gt'], t => fnu('gt', (o: any) => karsilastir(t, o, (x, y) => x > y), 1, 1));
uye(['Küçüktür', 'lt'], t => fnu('lt', (o: any) => karsilastir(t, o, (x, y) => x < y), 1, 1));
uye(['BüyükEşit', 'ge'], t => fnu('ge', (o: any) => karsilastir(t, o, (x, y) => x >= y), 1, 1));
uye(['KüçükEşit', 'le'], t => fnu('le', (o: any) => karsilastir(t, o, (x, y) => x <= y), 1, 1));
uye(['Eşittir', 'eq'], t => fnu('eq', (o: any) => karsilastir(t, o, (x, y) => x === y), 1, 1));
uye(['Değildir', 'ne'], t => fnu('ne', (o: any) => karsilastir(t, o, (x, y) => x !== y), 1, 1));
uye(['MatÇarp', 'matmul'], t => fnu('matmul', (o: any) => matCarp(t, o), 1, 1));

// ================================================================ işleçler
const oncekiIslem = $.tensorIslem;
$.tensorIslem = (op: string, a: any, b: any) => {
  if (!(a instanceof MTensor) && !(b instanceof MTensor)) return oncekiIslem(op, a, b);
  switch (op) {
    case '+': return topla(a, b);
    case '-': return cikar(a, b);
    case '*': return carp(a, b);
    case '/': return bol(a, b);
    case '**': return usal(a, b);
    case '@': return matCarp(a, b);
  }
  hata(`'${op}' işlemi tensör için tanımlı değil`);
};

// ================================================================ birim
function mesaleModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Meşale' };
  const ekle = (adlar: string[], enAz: number, enCok: number, f: (...a: any[]) => any) => {
    const g = fn((...a: any[]) => {
      if (a.length < enAz || a.length > enCok) hata(`'${adlar[0]}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
      return f(...a);
    }, adlar[0], enCok, enAz, [], enAz === 0);
    for (const a of adlar) U[katla(a)] = g;
  };
  const sekilVeGrad = (a: any[]): [number[], boolean] => {
    let g = false;
    if (a.length && typeof a[a.length - 1] === 'boolean') g = a.pop();
    return [sekilAl(a), g];
  };
  const dolu = (s: number[], x: number, g: boolean) => new MTensor(new Float64Array(carpim(s)).fill(x), s, g);

  ekle(['Tensör', 'tensor'], 1, 2, (v: any, g: any = false) => {
    const t = tensore(v);
    return new MTensor(Float64Array.from(t.v), t.s.slice(), dogruMu(g));
  });
  ekle(['Sıfırlar', 'zeros'], 1, 9, (...a: any[]) => { const [s, g] = sekilVeGrad(a); return dolu(s, 0, g); });
  ekle(['Birler', 'ones'], 1, 9, (...a: any[]) => { const [s, g] = sekilVeGrad(a); return dolu(s, 1, g); });
  ekle(['Dolu', 'full'], 2, 3, (s: any, x: any, g: any = false) => dolu(sekilAl([s]), sayi(x), dogruMu(g)));
  ekle(['SıfırlarGibi', 'zeros_like'], 1, 1, (t: any) => dolu(tensore(t).s.slice(), 0, false));
  ekle(['BirlerGibi', 'ones_like'], 1, 1, (t: any) => dolu(tensore(t).s.slice(), 1, false));
  ekle(['RastgeleNormal', 'randn'], 1, 9, (...a: any[]) => {
    const [s, g] = sekilVeGrad(a), v = new Float64Array(carpim(s));
    for (let i = 0; i < v.length; i++) v[i] = mRng.gauss(0, 1);
    return new MTensor(v, s, g);
  });
  ekle(['RastgeleDüzgün', 'rand'], 1, 9, (...a: any[]) => {
    const [s, g] = sekilVeGrad(a), v = new Float64Array(carpim(s));
    for (let i = 0; i < v.length; i++) v[i] = mRng.random();
    return new MTensor(v, s, g);
  });
  ekle(['RastgeleNormalGibi', 'randn_like'], 1, 1, (t: any) => {
    const x = tensore(t), v = new Float64Array(x.n);
    for (let i = 0; i < v.length; i++) v[i] = mRng.gauss(0, 1);
    return new MTensor(v, x.s.slice());
  });
  ekle(['RastgeleTamsayı', 'randint'], 3, 3, (a: any, b: any, s: any) => {
    const sk = sekilAl([s]), v = new Float64Array(carpim(sk));
    for (let i = 0; i < v.length; i++) v[i] = Number(mRng.randrange(BigInt(tam(a)), BigInt(tam(b))));
    return new MTensor(v, sk);
  });
  ekle(['Karıştırılmış', 'randperm'], 1, 1, (n: any) => {
    const p = Array.from({ length: tam(n) }, (_, i) => i);
    mRng.shuffle(p);
    return new MTensor(Float64Array.from(p), [p.length]);
  });
  ekle(['SayıDizisi', 'arange'], 1, 3, (a: any, b: any = null, c: any = 1n) => {
    let bas = sayi(a), son = b === null ? bas : sayi(b);
    if (b === null) bas = 0;
    const adim = sayi(c);
    if (adim === 0) hata('arange adımı sıfır olamaz');
    const v: number[] = [];
    for (let i = 0; ; i++) { const x = bas + i * adim; if (adim > 0 ? x >= son : x <= son) break; v.push(x); }
    return new MTensor(Float64Array.from(v), [v.length]);
  });
  ekle(['EşitAralıklı', 'linspace'], 3, 3, (a: any, b: any, n: any) => {
    const x = sayi(a), y = sayi(b), k = tam(n), v = new Float64Array(k);
    for (let i = 0; i < k; i++) v[i] = k === 1 ? x : x + (y - x) * i / (k - 1);
    return new MTensor(v, [k]);
  });
  ekle(['BirimMatris', 'eye'], 1, 2, (n: any, m: any = null) => {
    const r = tam(n), c = m === null ? r : tam(m), v = new Float64Array(r * c);
    for (let i = 0; i < Math.min(r, c); i++) v[i * c + i] = 1;
    return new MTensor(v, [r, c]);
  });
  ekle(['Tohum', 'manual_seed'], 1, 1, (n: any) => { mRng.seed(n); anaRng.seed(n); if ($.yzRng) $.yzRng.seed(n); return null; });
  ekle(['GradKapat', 'no_grad'], 0, 0, () => { gradAcik = false; return null; });
  ekle(['GradAç', 'enable_grad'], 0, 0, () => { gradAcik = true; return null; });
  ekle(['GradAyarla', 'set_grad_enabled'], 1, 1, (b: any) => { gradAcik = dogruMu(b); return null; });
  ekle(['GradAçıkMı', 'is_grad_enabled'], 0, 0, () => gradAcik);
  ekle(['TensörMü', 'is_tensor'], 1, 1, (x: any) => x instanceof MTensor);

  ekle(['MatÇarp', 'matmul', 'mm'], 2, 2, matCarp);
  ekle(['Bitiştir', 'cat'], 1, 2, bitistir);
  ekle(['Yığ', 'stack'], 1, 2, yigma);
  ekle(['Nerede', 'where'], 3, 3, nerede);
  ekle(['AltÜçgen', 'tril'], 1, 2, (t: any, k: any = 0n) => ucgen(t, k, true));
  ekle(['ÜstÜçgen', 'triu'], 1, 2, (t: any, k: any = 0n) => ucgen(t, k, false));
  ekle(['relu'], 1, 1, (x: any) => tekli(x, v => v > 0 ? v : 0, v => v > 0 ? 1 : 0));
  ekle(['sigmoid'], 1, 1, (x: any) => tekli(x, sigmoid, (v, y) => y * (1 - y)));
  ekle(['tanh'], 1, 1, (x: any) => tekli(x, Math.tanh, (v, y) => 1 - y * y));
  ekle(['gelu'], 1, 1, (x: any) => tekli(x, gelu, v => geluTurev(v)));
  ekle(['SızıntılıReLU', 'leaky_relu'], 1, 2, (x: any, a: any = 0.01) => { const e = sayi(a); return tekli(x, v => v > 0 ? v : e * v, v => v > 0 ? 1 : e); });
  ekle(['Softmaks', 'softmax'], 1, 2, (x: any, d: any = -1n) => softmaks(x, d, false));
  ekle(['LogSoftmaks', 'log_softmax'], 1, 2, (x: any, d: any = -1n) => softmaks(x, d, true));
  ekle(['exp'], 1, 1, (x: any) => tekli(x, Math.exp, (v, y) => y));
  ekle(['log'], 1, 1, (x: any) => tekli(x, logGuvenli, v => 1 / v));
  ekle(['sqrt'], 1, 1, (x: any) => tekli(x, Math.sqrt, (v, y) => 0.5 / y));
  ekle(['sum'], 1, 3, (x: any, d: any = null, tut: any = false) => topIndir(tensore(x), boyutlar(d, tensore(x).s.length), dogruMu(tut)));
  ekle(['mean'], 1, 3, (x: any, d: any = null, tut: any = false) => ortalama(tensore(x), d, dogruMu(tut)));
  ekle(['GömmeAl', 'embedding'], 2, 2, gomme);
  ekle(['KatmanNorm', 'layer_norm'], 1, 4, (x: any, w: any = null, b: any = null, eps: any = 1e-5) => katmanNorm(x, w, b, sayi(eps)));
  ekle(['Bırakma', 'dropout'], 1, 3, (x: any, p: any = 0.5, e: any = true) => birakma(x, sayi(p), dogruMu(e)));
  ekle(['DoğrusalDönüşüm', 'linear'], 2, 3, (x: any, W: any, b: any = null) => {
    const y = matCarp(x, permute(tensore(W), [1, 0]));
    return b === null ? y : topla(y, b);
  });

  // kayıplar
  ekle(['OKHKaybı', 'mse_loss'], 2, 2, (a: any, b: any) => { const f = cikar(a, b); return ortalama(carp(f, f), null, false); });
  ekle(['OMHKaybı', 'l1_loss'], 2, 2, (a: any, b: any) => ortalama(tekli(cikar(a, b), Math.abs, x => x > 0 ? 1 : x < 0 ? -1 : 0), null, false));
  ekle(['ÇaprazEntropi', 'cross_entropy'], 2, 3, (x: any, y: any, yok: any = -100n) => caprazEntropi(x, y, tam(yok)));
  ekle(['NLLKaybı', 'nll_loss'], 2, 2, nllKaybi);
  ekle(['İkiliÇaprazEntropi', 'binary_cross_entropy'], 2, 2, (p0: any, y0: any) => {
    const p = tensore(p0), y = tensore(y0);
    const eps = 1e-12;
    const k = tekli(p, v => Math.log(Math.min(Math.max(v, eps), 1 - eps)), v => 1 / Math.min(Math.max(v, eps), 1 - eps));
    const k2 = tekli(p, v => Math.log(1 - Math.min(Math.max(v, eps), 1 - eps)), v => -1 / (1 - Math.min(Math.max(v, eps), 1 - eps)));
    return ortalama(tekli(topla(carp(y, k), carp(cikar(1, y), k2)), v => -v, () => -1), null, false);
  });
  ekle(['İkiliÇaprazEntropiLogit', 'binary_cross_entropy_with_logits'], 2, 2, (z0: any, y0: any) => {
    const z = tensore(z0), y = yay(tensore(y0), tensore(z0).s);
    const out = new Float64Array(z.n);
    for (let i = 0; i < z.n; i++) { const x = z.v[i]; out[i] = Math.max(x, 0) - x * y[i] + Math.log(1 + Math.exp(-Math.abs(x))); }
    let top = 0; for (let i = 0; i < z.n; i++) top += out[i];
    return yeni(Float64Array.of(top / z.n), [], [z], g => {
      const r = new Float64Array(z.n);
      for (let i = 0; i < z.n; i++) r[i] = g[0] * (sigmoid(z.v[i]) - y[i]) / z.n;
      biriktir(z, r);
    });
  });

  // optimizasyon
  ekle(['SGD'], 2, 4, (p: any, oran: any, mom: any = 0, az: any = 0) => new SGD(p, sayi(oran), sayi(mom), sayi(az)));
  ekle(['Adam'], 1, 5, (p: any, oran: any = 0.001, b: any = null, eps: any = 1e-8, az: any = 0) => {
    const bb = b === null ? [0.9, 0.999] : yinele(b).map(sayi);
    return new Adam(p, sayi(oran), bb[0], bb[1], sayi(eps), sayi(az), false, 'Adam');
  });
  ekle(['AdamW'], 1, 5, (p: any, oran: any = 0.001, b: any = null, eps: any = 1e-8, az: any = 0.01) => {
    const bb = b === null ? [0.9, 0.999] : yinele(b).map(sayi);
    return new Adam(p, sayi(oran), bb[0], bb[1], sayi(eps), sayi(az), true, 'AdamW');
  });
  ekle(['GradNormKırp', 'clip_grad_norm_'], 2, 2, (p: any, enCok: any) => {
    const ps = yinele(p).filter((x: any) => x instanceof MTensor && x.grad) as MTensor[];
    let top = 0;
    for (const t of ps) for (const g of t.grad) top += g * g;
    const norm = Math.sqrt(top), m = sayi(enCok);
    if (norm > m) { const o = m / (norm + 1e-6); for (const t of ps) for (let i = 0; i < t.grad.length; i++) t.grad[i] *= o; }
    return norm;
  });

  // veri
  ekle(['TensörVeriKümesi', 'TensorDataset'], 1, 9, (...ts: any[]) => new VeriKumesi(ts.map(x => tensore(x))));
  ekle(['VeriYükleyici', 'DataLoader'], 1, 4, (k: any, y: any = 1n, kar: any = false, son: any = false) => {
    if (!(k instanceof VeriKumesi)) hata('VeriYükleyici bir TensörVeriKümesi bekler');
    return new VeriYukleyici(k, tam(y, 'Yığın boyu'), dogruMu(kar), dogruMu(son));
  });

  // kaydet / yükle
  ekle(['Kaydet', 'save'], 2, 2, (o: any, yol: any) => {
    if (!$.konak.dosyaYaz) hata(`Dosya yazılamadı: ${yol} (bu ortamda dosya erişimi yok)`);
    $.konak.dosyaYaz(metne(yol), JSON.stringify(kayitYap(o)), false);
    return null;
  });
  ekle(['Yükle', 'load'], 1, 1, (yol: any) => {
    if (!$.konak.dosyaOku) hata(`Dosya okunamadı: ${yol} (bu ortamda dosya erişimi yok)`);
    let m: string;
    try { m = $.konak.dosyaOku(metne(yol)); } catch { hata(`Dosya okunamadı: ${yol}`); }
    return kayitCoz(JSON.parse(m));
  });

  // Sinir biriminin kullandığı yansıma yardımcısı
  ekle(['Alanlar'], 1, 1, (o: any) => {
    if (!(o instanceof YNesne)) hata('Alanlar bir nesne bekler');
    // alanlar ebeveynden çocuğa, bildirim sırasıyla; adlar yazıldıkları biçimde
    const zincir: any[] = [];
    for (let C: any = o.constructor; C && C.$sinif; C = C.$ebeveyn) zincir.unshift(C);
    const m = new Map();
    for (const C of zincir) for (const a of C.$alanlar) m.set(C.$hamlar?.[a] ?? a, (o as any)['f_' + a]);
    return m;
  });
  ekle(['VeriKopyala'], 2, 2, (hedef: any, kaynak: any) => {
    const h = tensore(hedef), k = tensore(kaynak);
    if (!ayniSekil(h.s, k.s)) hata(`Şekiller uyuşmuyor: ${sekilYaz(h.s)} ve ${sekilYaz(k.s)}`);
    h.v.set(k.v);
    return null;
  });
  return U;
}

$.yerelBirimler.set('mesale', mesaleModulu);
$.MTensor = MTensor;
$.mRng = mRng;
void cagir;
