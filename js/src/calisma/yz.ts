// YZ birimi: otomatik türevli tensörler, katmanlar, kayıplar, optimizasyon.
// Python sürümünün birebir karşılığı (aynı kayan nokta işlem sırası, aynı rastgele dizi).
import { katla } from '../sozcuk';
import { $, hata, metne, cagir, yinele } from './cekirdek';
import { YNesne, PascalDizi, fn, sabitNokta, rjust, yuvarlaBasamak, ondalikRepr } from './deger';
import { PyRandom } from './rastgele';
import { rng as anaRng } from './yerlesik';

export const yzRng = new PyRandom();
$.yzRng = yzRng;

/** CPython 3.12+ sum(): Neumaier dengeli toplama */
export function pySum(xs: ArrayLike<number>): number {
  const n = xs.length;
  if (!n) return 0;
  let f = 0 + xs[0], c = 0.0;
  for (let i = 1; i < n; i++) {
    const x = xs[i];
    const t = f + x;
    if (Math.abs(f) >= Math.abs(x)) c += (f - t) + x;
    else c += (x - t) + f;
    f = t;
  }
  if (c && Number.isFinite(c)) f += c;
  return f;
}
function pyTipAdi(v: any): string {
  switch (typeof v) {
    case 'string': return 'str'; case 'bigint': return 'int'; case 'number': return 'float'; case 'boolean': return 'bool';
    case 'function': return v.$sinif ? 'KSinif' : 'KFonksiyon';
  }
  if (v === null || v === undefined) return 'NoneType';
  if (Array.isArray(v)) return 'list';
  if (v instanceof Map) return 'dict';
  if (v instanceof YNesne) return 'KNesne';
  return v.constructor?.name ?? 'object';
}
const B = (x: number) => BigInt(x);

function iki(s: number[]): [number, number] {
  if (s.length === 0) return [1, 1];
  if (s.length === 1) return [1, s[0]];
  return [s[0], s[1]];
}
function f_(v: any): number {
  const t = typeof v;
  if (t === 'number') return v;
  if (t === 'bigint') return Number(v);
  if (t === 'boolean') return v ? 1 : 0;
  if (v instanceof Tensor && v.veri.length === 1) return v.veri[0];
  hata(`Tensör öğesi sayı olmalı, ${pyTipAdi(v)} verildi`);
}
function biriktir(p: Tensor, g: number[]) {
  if (!p.gerekli) return;
  if (p.grad === null) p.grad = g.slice();
  else { const r = p.grad; p.grad = r.map((a, i) => a + g[i]); if (g.length < r.length) p.grad.length = g.length; }
}
function yeni(veri: number[], sekil: number[], ebeveyn: Tensor[], geri: (g: number[]) => void): Tensor {
  const t = new Tensor(veri, sekil);
  for (const p of ebeveyn) {
    if (p.gerekli) { t.gerekli = true; t.ebeveyn = ebeveyn; t.geri = geri; break; }
  }
  return t;
}
function mm(A: number[], n: number, k: number, Bm: number[], m: number): number[] {
  // Python _mm ile birebir aynı sonuç: her çıktı, çarpımların Neumaier toplamıdır (pySum).
  // Sütunlar bir kez ayrı diziye çıkarılır; toplama satır içi yapılır (ara dizi yok).
  const satirB = Math.floor(Bm.length / m) || 0;
  const l = Math.min(k, satirB);
  const BT = new Float64Array(m * l);
  for (let j = 0; j < m; j++) for (let q = 0; q < l; q++) BT[j * l + q] = Bm[q * m + j];
  const out: number[] = new Array(n * m);
  let w = 0;
  for (let i = 0; i < n; i++) {
    const o = i * k;
    for (let j = 0; j < m; j++) {
      const b = j * l;
      if (l === 0) { out[w++] = 0; continue; }
      let f = 0 + A[o] * BT[b], c = 0.0;
      for (let q = 1; q < l; q++) {
        const x = A[o + q] * BT[b + q];
        const t = f + x;
        if (Math.abs(f) >= Math.abs(x)) c += (f - t) + x;
        else c += (x - t) + f;
        f = t;
      }
      if (c && Number.isFinite(c)) f += c;
      out[w++] = f;
    }
  }
  return out;
}
function T_(A: number[], n: number, m: number): number[] {
  const out: number[] = [];
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) out.push(A[i * m + j]);
  return out;
}
const guvenliUs = (x: number) => Math.exp(x < 709.0 ? x : 709.0);
const sigmoid = (x: number) => { if (x >= 0) return 1.0 / (1.0 + Math.exp(-x)); const e = Math.exp(x); return e / (1.0 + e); };
function pyMaks(xs: number[]): number {
  if (!xs.length) hata('İç hata: ValueError: max() iterable argument is empty');
  let m = xs[0];
  for (let i = 1; i < xs.length; i++) if (xs[i] > m) m = xs[i];
  return m;
}
function pyMin(xs: number[]): number {
  if (!xs.length) hata('İç hata: ValueError: min() iterable argument is empty');
  let m = xs[0];
  for (let i = 1; i < xs.length; i++) if (xs[i] < m) m = xs[i];
  return m;
}
function argmaksIc(v: number[], o: number, n: number): number {
  let bi = 0, bv = v[o];
  for (let i = 1; i < n; i++) if (v[o + i] > bv) { bv = v[o + i]; bi = i; }
  return bi;
}

export class Tensor {
  static TUR_ADI = 'tensör';
  $tensor = true;
  TUR_ADI = 'tensör';
  grad: number[] | null = null;
  ebeveyn: Tensor[] = [];
  geri: ((g: number[]) => void) | null = null;
  constructor(public veri: number[], public sekil: number[], public gerekli = false) {}

  static yap(x: any, gerekli = false): Tensor {
    if (x instanceof Tensor) return x;
    const t = typeof x;
    if (t === 'bigint' || t === 'number' || t === 'boolean') return new Tensor([f_(x)], [], gerekli);
    if (x instanceof PascalDizi) x = x.veri;
    if (Array.isArray(x)) {
      if (!x.length) return new Tensor([], [0], gerekli);
      const x0 = x[0];
      if (Array.isArray(x0) || x0 instanceof PascalDizi || (x0 instanceof Tensor && x0.sekil.length)) {
        const satirlar = x.map((r: any) => r instanceof PascalDizi ? r.veri : (r instanceof Tensor ? r.veri : r));
        const c = satirlar[0].length;
        const veri: number[] = [];
        for (const r of satirlar) {
          if (!Array.isArray(r) || r.length !== c) hata('Düzensiz matris: tüm satırlar aynı uzunlukta olmalı');
          for (const v of r) veri.push(f_(v));
        }
        return new Tensor(veri, [satirlar.length, c], gerekli);
      }
      return new Tensor(x.map(f_), [x.length], gerekli);
    }
    hata(`Tensöre çevrilemez: ${pyTipAdi(x)}`);
  }

  liste(): any {
    if (this.sekil.length === 0) return this.veri[0];
    if (this.sekil.length === 1) return this.veri.slice();
    const [r, c] = this.sekil;
    const out: number[][] = [];
    for (let i = 0; i < r; i++) out.push(this.veri.slice(i * c, (i + 1) * c));
    return out;
  }
  ogeler(): any[] {
    if (this.sekil.length === 2) {
      const [r, c] = this.sekil;
      const out: Tensor[] = [];
      for (let i = 0; i < r; i++) out.push(new Tensor(this.veri.slice(i * c, (i + 1) * c), [c]));
      return out;
    }
    return this.veri.slice();
  }
  ayir() { return new Tensor(this.veri.slice(), this.sekil.slice()); }

  geriYay() {
    const sira: Tensor[] = [], gor = new Set<Tensor>();
    const yigin: [Tensor, boolean][] = [[this, false]];
    while (yigin.length) {
      const [t, bitti] = yigin.pop();
      if (bitti) { sira.push(t); continue; }
      if (gor.has(t)) continue;
      gor.add(t);
      yigin.push([t, true]);
      for (const p of t.ebeveyn) if (!gor.has(p)) yigin.push([p, false]);
    }
    this.grad = this.veri.map(() => 1.0);
    for (let i = sira.length - 1; i >= 0; i--) {
      const t = sira[i];
      if (t.geri !== null && t.grad !== null) t.geri(t.grad);
    }
  }

  neg() { return tekli(this, x => -x, () => -1.0); }
  us_p(p: any) {
    if (typeof p !== 'bigint' && typeof p !== 'number') hata('Tensör üssü sayı olmalı');
    const q = Number(p);
    return tekli(this, x => x ** q, x => (x !== 0 || q >= 1) ? q * x ** (q - 1) : 0.0);
  }
  us() { return tekli(this, guvenliUs, (x, y) => y); }
  log() { return tekli(this, x => { if (x <= 0) hata('Log: pozitif olmayan değer'); return Math.log(x); }, x => 1.0 / x); }
  relu() { return tekli(this, x => x > 0 ? x : 0.0, x => x > 0 ? 1.0 : 0.0); }
  sizintiliRelu(a = 0.01) { return tekli(this, x => x > 0 ? x : a * x, x => x > 0 ? 1.0 : a); }
  sigmoid() { return tekli(this, sigmoid, (x, y) => y * (1.0 - y)); }
  tanh() { return tekli(this, Math.tanh, (x, y) => 1.0 - y * y); }
  sin() { return tekli(this, Math.sin, x => Math.cos(x)); }
  cos() { return tekli(this, Math.cos, x => -Math.sin(x)); }
  kok() { return tekli(this, x => Math.sqrt(Math.max(x, 0.0)), (x, y) => y > 0 ? 0.5 / y : 0.0); }
  mutlak() { return tekli(this, Math.abs, x => x > 0 ? 1.0 : (x < 0 ? -1.0 : 0.0)); }

  toplam(eksen: any = null): Tensor {
    const [R, C] = iki(this.sekil);
    const a = this;
    if (eksen === null || this.sekil.length < 2) {
      const n = a.veri.length;
      return yeni([pySum(a.veri)], [], [a], g => biriktir(a, new Array(n).fill(g[0])));
    }
    const e = Number(eksen);
    if (e === 0) {
      const out: number[] = [];
      for (let c = 0; c < C; c++) { const col: number[] = []; for (let r = 0; r < R; r++) col.push(a.veri[r * C + c]); out.push(pySum(col)); }
      return yeni(out, [C], [a], g => { const r: number[] = []; for (let i = 0; i < R; i++) for (let c = 0; c < C; c++) r.push(g[c]); biriktir(a, r); });
    }
    if (e === 1) {
      const out: number[] = [];
      for (let r = 0; r < R; r++) out.push(pySum(a.veri.slice(r * C, (r + 1) * C)));
      return yeni(out, [R], [a], g => { const r: number[] = []; for (let i = 0; i < R; i++) for (let c = 0; c < C; c++) r.push(g[i]); biriktir(a, r); });
    }
    hata('Eksen 0 veya 1 olmalı');
  }
  ortalama(eksen: any = null): Tensor {
    const [R, C] = iki(this.sekil);
    let n: number;
    if (eksen === null || this.sekil.length < 2) n = this.veri.length;
    else n = Number(eksen) === 0 ? R : C;
    if (n === 0) hata('Boş tensörün ortalaması alınamaz');
    return ikili(this.toplam(eksen), n, '/');
  }
  softmaks(): Tensor {
    const [R, C] = iki(this.sekil);
    const a = this;
    const out: number[] = [];
    for (let r = 0; r < R; r++) {
      const row = a.veri.slice(r * C, (r + 1) * C);
      const m = pyMaks(row);
      const e = row.map(x => Math.exp(x - m));
      const s = pySum(e);
      for (const x of e) out.push(x / s);
    }
    return yeni(out, a.sekil.slice(), [a], g => {
      const ga: number[] = [];
      for (let r = 0; r < R; r++) {
        const yv = out.slice(r * C, (r + 1) * C), gg = g.slice(r * C, (r + 1) * C);
        const d = pySum(yv.map((p, i) => p * gg[i]));
        for (let i = 0; i < yv.length; i++) ga.push(yv[i] * (gg[i] - d));
      }
      biriktir(a, ga);
    });
  }
  transpoze(): Tensor {
    const a = this;
    if (a.sekil.length < 2) return a;
    const [R, C] = a.sekil;
    return yeni(T_(a.veri, R, C), [C, R], [a], g => biriktir(a, T_(g, C, R)));
  }
  yeniden(...s: any[]): Tensor {
    const sekil = s.map(x => Math.trunc(Number(x)));
    let n = 1;
    for (const x of sekil) n *= x;
    if (n !== this.veri.length || sekil.length > 2) hata(`Yeniden şekillendirme olanaksız: ${this.veri.length} öğe -> (${sekil.join(', ')}${sekil.length === 1 ? ',' : ''})`);
    const a = this;
    return yeni(a.veri.slice(), sekil, [a], g => biriktir(a, g));
  }
  argmaks(): any {
    const [R, C] = iki(this.sekil);
    if (this.sekil.length < 2) {
      if (!this.veri.length) hata('İç hata: ValueError: max() iterable argument is empty');
      return B(argmaksIc(this.veri, 0, this.veri.length));
    }
    const out: bigint[] = [];
    for (let r = 0; r < R; r++) out.push(B(argmaksIc(this.veri, r * C, C)));
    return out;
  }

  indeksAl(idx: any[]): any {
    const s = this.sekil;
    const ii = idx.map(x => { if (typeof x !== 'bigint') hata('İç hata: TypeError: list indices must be integers'); return Number(x); });
    if (s.length === 1 && ii.length === 1) {
      const i = ii[0];
      if (!(-s[0] <= i && i < s[0])) hata(`Tensör dizini sınır dışı: ${i}`);
      return this.veri[i < 0 ? i + s[0] : i];
    }
    if (s.length === 2) {
      const [R, C] = s;
      if (ii.length === 1) {
        const i = ii[0];
        if (!(0 <= i && i < R)) hata(`Tensör satır dizini sınır dışı: ${i}`);
        return new Tensor(this.veri.slice(i * C, (i + 1) * C), [C]);
      }
      if (ii.length === 2) {
        const [i, j] = ii;
        if (!(0 <= i && i < R && 0 <= j && j < C)) hata(`Tensör dizini sınır dışı: [${i}, ${j}]`);
        return this.veri[i * C + j];
      }
    }
    hata('Geçersiz tensör dizini');
  }
  indeksAta(idx: any[], v: any) {
    const s = this.sekil;
    const ii = idx.map(Number);
    if (s.length === 1 && ii.length === 1) { const i = ii[0]; this.veri[i < 0 ? i + this.veri.length : i] = f_(v); }
    else if (s.length === 2 && ii.length === 2) this.veri[ii[0] * s[1] + ii[1]] = f_(v);
    else hata('Geçersiz tensör dizini');
  }

  kAl(ad: string): any {
    if (ad === 'sekil') return this.sekil.map(B);
    if (ad === 'veri') return this.liste();
    if (ad === 'grad') return this.grad === null ? null : new Tensor(this.grad.slice(), this.sekil.slice());
    if (ad === 't') return this.transpoze();
    if (ad === 'boyut') return B(this.veri.length);
    if (ad === 'gradgerekli') return this.gerekli;
    const f = TENSOR_METOD[ad];
    if (f) return f(this);
    hata(`Tensörde '${ad}' üyesi yok`);
  }
  kAta(ad: string, v: any) {
    if (ad === 'gradgerekli') { this.gerekli = dogruMu(v); return; }
    hata(`Tensörün '${ad}' üyesine atama yapılamaz`);
  }
  toString() {
    const b = (x: number) => Number.isNaN(x) ? 'TS' : sabitNokta(x, 4).replace(/0+$/, '').replace(/\.$/, '');
    if (this.sekil.length === 0) return `tensör(${b(this.veri[0])})`;
    if (this.sekil.length === 1) return 'tensör([' + this.veri.map(b).join(', ') + '])';
    const [R, C] = this.sekil;
    const satirlar: string[] = [];
    for (let r = 0; r < R; r++) satirlar.push('[' + this.veri.slice(r * C, (r + 1) * C).map(b).join(', ') + ']');
    return 'tensör([' + satirlar.join(',\n        ') + '])';
  }
}

function dogruMu(v: any): boolean {
  if (typeof v === 'boolean') return v;
  if (v === null || v === undefined) return false;
  if (typeof v === 'bigint') return v !== 0n;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string' || Array.isArray(v)) return v.length > 0;
  if (v instanceof Map) return v.size > 0;
  return true;
}

function ayniSekil(a: number[], b: number[]) { return a.length === b.length && a.every((x, i) => x === b[i]); }

export function ikili(a0: any, b0: any, op: string): Tensor {
  const a = Tensor.yap(a0), b = Tensor.yap(b0);
  const [ar, ac] = iki(a.sekil), [br, bc] = iki(b.sekil);
  const uyumsuz = () => hata(`Tensör şekilleri uyumsuz: [${a.sekil.join(', ')}] ve [${b.sekil.join(', ')}]`);
  let R: number, C: number;
  if (ar === br) R = ar; else if (ar === 1) R = br; else if (br === 1) R = ar; else uyumsuz();
  if (ac === bc) C = ac; else if (ac === 1) C = bc; else if (bc === 1) C = ac; else uyumsuz();
  const nd = Math.max(a.sekil.length, b.sekil.length);
  const sekil = nd === 0 ? [] : nd === 1 ? (R === 1 ? [C] : [R, C]) : [R, C];
  const av = a.veri, bv = b.veri;
  let ia: number[] | null = null, ib: number[] | null = null, ax: number[], bx: number[];
  if (ayniSekil(a.sekil, b.sekil)) { ax = av; bx = bv; }
  else {
    ia = []; ib = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      ia.push((ar > 1 ? r : 0) * ac + (ac > 1 ? c : 0));
      ib.push((br > 1 ? r : 0) * bc + (bc > 1 ? c : 0));
    }
    ax = ia.map(i => av[i]); bx = ib.map(j => bv[j]);
  }
  const n = Math.min(ax.length, bx.length);
  const out: number[] = new Array(n);
  if (op === '+') for (let i = 0; i < n; i++) out[i] = ax[i] + bx[i];
  else if (op === '-') for (let i = 0; i < n; i++) out[i] = ax[i] - bx[i];
  else if (op === '*') for (let i = 0; i < n; i++) out[i] = ax[i] * bx[i];
  else {
    if (bx.some(x => x === 0)) hata('Tensör bölmesinde sıfıra bölme');
    for (let i = 0; i < n; i++) out[i] = ax[i] / bx[i];
  }
  return yeni(out, sekil, [a, b], g => {
    let ga: number[], gb: number[];
    if (op === '+') { ga = g; gb = g; }
    else if (op === '-') { ga = g; gb = g.map(x => -x); }
    else if (op === '*') { ga = g.map((x, i) => x * bx[i]); gb = g.map((x, i) => x * ax[i]); }
    else { ga = g.map((x, i) => x / bx[i]); gb = g.map((x, i) => -x * ax[i] / (bx[i] * bx[i])); }
    if (a.gerekli) biriktir(a, indir(ga, ia, av.length));
    if (b.gerekli) biriktir(b, indir(gb, ib, bv.length));
  });
}
function indir(g: number[], idx: number[] | null, n: number): number[] {
  if (idx === null) return g;
  const r = new Array(n).fill(0.0);
  for (let k = 0; k < idx.length; k++) r[idx[k]] += g[k];
  return r;
}
function tekli(a: Tensor, f: (x: number) => number, df: (x: number, y: number) => number): Tensor {
  const out = a.veri.map(f);
  return yeni(out, a.sekil.slice(), [a], g => {
    const r: number[] = [];
    const n = Math.min(g.length, a.veri.length);
    for (let i = 0; i < n; i++) r.push(g[i] * df(a.veri[i], out[i]));
    biriktir(a, r);
  });
}
export function matmul(a0: any, b0: any): Tensor {
  const a = Tensor.yap(a0), b = Tensor.yap(b0);
  if (a.sekil.length === 0 || b.sekil.length === 0) return ikili(a, b, '*');
  const a1 = a.sekil.length === 1, b1 = b.sekil.length === 1;
  const [n, k] = a1 ? [1, a.sekil[0]] : a.sekil;
  const [k2, m] = b1 ? [b.sekil[0], 1] : b.sekil;
  if (k !== k2) hata(`Matris çarpımı için şekiller uyumsuz: [${a.sekil.join(', ')}] @ [${b.sekil.join(', ')}]`);
  const out = mm(a.veri, n, k, b.veri, m);
  const sekil = a1 && b1 ? [] : a1 ? [m] : b1 ? [n] : [n, m];
  return yeni(out, sekil, [a, b], g => {
    if (a.gerekli) biriktir(a, mm(g, n, m, T_(b.veri, k, m), k));
    if (b.gerekli) biriktir(b, mm(T_(a.veri, n, k), k, n, g, m));
  });
}

// ================================================================ kayıplar
function okh(p: any, y: any) { const d = ikili(p, y, '-'); return ikili(d, d, '*').ortalama(); }
function omh(p: any, y: any) { return ikili(p, y, '-').mutlak().ortalama(); }
function ikiliCaprazEntropi(p0: any, y0: any) {
  const p = Tensor.yap(p0), y = Tensor.yap(y0);
  if (p.veri.length !== y.veri.length) hata('İkiliÇaprazEntropi: tahmin ve hedef aynı boyutta olmalı');
  const eps = 1e-7, n = p.veri.length;
  const pv = p.veri.map(x => Math.min(Math.max(x, eps), 1 - eps));
  const yv = y.veri;
  const terimler = pv.map((q, i) => yv[i] * Math.log(q) + (1 - yv[i]) * Math.log(1 - q));
  const kayip = -pySum(terimler) / n;
  return yeni([kayip], [], [p], g => biriktir(p, pv.map((q, i) => g[0] * (q - yv[i]) / (q * (1 - q)) / n)));
}
function caprazEntropi(logit0: any, hedef: any) {
  const logit = Tensor.yap(logit0);
  const [R, C] = iki(logit.sekil);
  let t: number[];
  if (Array.isArray(hedef) && hedef.length && typeof hedef[0] === 'bigint') {
    if (hedef.length !== R) hata('ÇaprazEntropi: etiket sayısı satır sayısına eşit olmalı');
    t = new Array(R * C).fill(0.0);
    hedef.forEach((c: any, r: number) => { t[r * C + Number(c)] = 1.0; });
  } else {
    t = Tensor.yap(hedef).veri;
    if (t.length !== R * C) hata('ÇaprazEntropi: hedef şekli uyumsuz');
  }
  const p: number[] = [];
  let kayip = 0.0;
  for (let r = 0; r < R; r++) {
    const row = logit.veri.slice(r * C, (r + 1) * C);
    const m = pyMaks(row);
    const e = row.map(x => Math.exp(x - m));
    const s = pySum(e);
    const ls = Math.log(s);
    for (let c = 0; c < C; c++) {
      p.push(e[c] / s);
      if (t[r * C + c]) kayip -= t[r * C + c] * (row[c] - m - ls);
    }
  }
  kayip /= R;
  return yeni([kayip], [], [logit], g => biriktir(logit, p.map((pi, i) => g[0] * (pi - t[i]) / R)));
}
const KAYIPLAR: Record<string, (p: any, y: any) => Tensor> = {
  okh, mse: okh, omh, mae: omh, ikilicaprazentropi: ikiliCaprazEntropi, bce: ikiliCaprazEntropi,
  caprazentropi: caprazEntropi, ce: caprazEntropi,
};
function aktive(t: Tensor, ad: string): Tensor {
  if (!ad || ad === 'dogrusal' || ad === 'yok') return t;
  if (ad === 'relu') return t.relu();
  if (ad === 'sizintilirelu') return t.sizintiliRelu();
  if (ad === 'sigmoid') return t.sigmoid();
  if (ad === 'tanh') return t.tanh();
  if (ad === 'softmaks') return t.softmaks();
  hata(`Bilinmeyen aktivasyon: '${ad}' (relu, sızıntılıRelu, sigmoid, tanh, softmaks)`);
}

// ================================================================ katmanlar
const yf_ = (ad: string, f: (...a: any[]) => any, oto = false) => fn((...a: any[]) => f(...a), ad, 999, 0, [], oto);

function metodCagir(o: any, ad: string, args: any[]) {
  const m = o['m_' + katla(ad)];
  if (typeof m !== 'function') hata(`'${o.constructor.$ad}' nesnesinde '${ad}' metodu yok`);
  return m.apply(o, args);
}

class Yogun {
  TUR_ADI = 'Yoğun';
  akt: string; W: Tensor; b: Tensor;
  constructor(girdi: number, cikti: number, akt: any) {
    if (typeof akt !== 'string') hata(`İç hata: TypeError: katla() metin bekler`);
    this.akt = katla(akt);
    const olcek = (this.akt === 'relu' || this.akt === 'sizintilirelu') ? Math.sqrt(2.0 / girdi) : Math.sqrt(1.0 / girdi);
    const w: number[] = [];
    for (let i = 0; i < girdi * cikti; i++) w.push(yzRng.gauss(0.0, olcek));
    this.W = new Tensor(w, [girdi, cikti], true);
    this.b = new Tensor(new Array(cikti).fill(0.0), [cikti], true);
  }
  ileri(x: any) { return aktive(ikili(matmul(x, this.W), this.b, '+'), this.akt); }
  parametreler() { return [this.W, this.b]; }
  kAl(ad: string): any {
    if (ad === 'ileri') return yf_('İleri', x => this.ileri(x));
    if (ad === 'parametreler') return yf_('Parametreler', () => this.parametreler(), true);
    if (ad === 'agirlik') return this.W;
    if (ad === 'sapma') return this.b;
    hata(`Yoğun katmanda '${ad}' üyesi yok`);
  }
  toString() { const [g, c] = this.W.sekil; return `Yoğun(${g} -> ${c}${this.akt ? ', ' + this.akt : ''})`; }
}

class Ardisik {
  TUR_ADI = 'Ardışık';
  katmanlar: any[];
  constructor(katmanlar: any) { this.katmanlar = yinele(katmanlar); }
  ileri(x0: any) {
    let x: any = Tensor.yap(x0);
    for (const k of this.katmanlar) {
      if (typeof k === 'string') x = aktive(x, katla(k));
      else if (k && typeof k.ileri === 'function' && !(k instanceof YNesne)) x = k.ileri(x);
      else if (k instanceof YNesne) x = metodCagir(k, 'ileri', [x]);
      else x = cagir(k, [x]);
    }
    return x;
  }
  parametreler(): Tensor[] {
    const out: Tensor[] = [];
    for (const k of this.katmanlar) {
      if (k && typeof k.parametreler === 'function' && !(k instanceof YNesne)) out.push(...k.parametreler());
      else if (k instanceof YNesne && typeof (k as any).m_parametreler === 'function') out.push(...yinele(metodCagir(k, 'parametreler', [])));
    }
    return out;
  }
  kAl(ad: string): any {
    if (ad === 'ileri') return yf_('İleri', x => this.ileri(x));
    if (ad === 'tahmin') return yf_('Tahmin', x => this.ileri(x).ayir());
    if (ad === 'parametreler') return yf_('Parametreler', () => this.parametreler(), true);
    if (ad === 'ekle') return yf_('Ekle', k => { this.katmanlar.push(k); return null; });
    if (ad === 'katmanlar') return this.katmanlar.slice();
    if (ad === 'parametresayisi') { let s = 0; for (const p of this.parametreler()) s += p.veri.length; return B(s); }
    hata(`Ardışık modelde '${ad}' üyesi yok`);
  }
  toString() { return 'Ardışık[' + this.katmanlar.map(k => typeof k === 'string' ? k : metne(k)).join(', ') + ']'; }
}

// ================================================================ optimizasyon
function paramListesi(params: any): Tensor[] {
  if (params && typeof params.parametreler === 'function' && !(params instanceof YNesne)) params = params.parametreler();
  if (!Array.isArray(params)) hata(`İç hata: TypeError: '${pyTipAdi(params)}' object is not iterable`);
  return params.map((p: any) => { if (!(p instanceof Tensor)) hata('Optimizasyon parametreleri tensör olmalı'); return p; });
}
class SGD {
  TUR_ADI = 'SGD';
  params: Tensor[]; oran: number; momentum: number; hiz: (number[] | null)[];
  constructor(params: any, oran: any = 0.01, momentum: any = 0.0) {
    this.params = paramListesi(params);
    this.oran = Number(oran); this.momentum = Number(momentum);
    this.hiz = this.params.map(() => null);
  }
  adim() {
    const lr = this.oran, mom = this.momentum;
    this.params.forEach((p, i) => {
      if (p.grad === null) return;
      let g = p.grad;
      if (mom) {
        const v0 = this.hiz[i] || new Array(g.length).fill(0.0);
        const v = v0.map((a, j) => mom * a + g[j]);
        this.hiz[i] = v;
        g = v;
      }
      p.veri = p.veri.map((w, j) => w - lr * g[j]);
    });
  }
  sifirla() { for (const p of this.params) p.grad = null; }
  kAl(ad: string): any {
    if (ad === 'adim') return yf_('Adım', () => { this.adim(); return null; }, true);
    if (ad === 'sifirlagrad') return yf_('SıfırlaGrad', () => { this.sifirla(); return null; }, true);
    if (ad === 'oran') return this.oran;
    hata(`Optimizasyon nesnesinde '${ad}' üyesi yok`);
  }
  kAta(ad: string, v: any) {
    if (ad === 'oran') { this.oran = Number(v); return; }
    hata(`'${ad}' atanamaz`);
  }
}
class Adam extends SGD {
  TUR_ADI = 'Adam';
  b1 = 0.9; b2 = 0.999; eps = 1e-8; m: (number[] | null)[]; v: (number[] | null)[]; t = 0;
  constructor(params: any, oran: any = 0.001) {
    super(params, oran);
    this.m = this.params.map(() => null);
    this.v = this.params.map(() => null);
  }
  adim() {
    this.t += 1;
    const b1 = this.b1, b2 = this.b2, eps = this.eps, lr = this.oran;
    const d1 = 1 - b1 ** this.t, d2 = 1 - b2 ** this.t;
    this.params.forEach((p, i) => {
      if (p.grad === null) return;
      const g = p.grad;
      const m0 = this.m[i] || new Array(g.length).fill(0.0);
      const v0 = this.v[i] || new Array(g.length).fill(0.0);
      const m = m0.map((a, j) => b1 * a + (1 - b1) * g[j]);
      const v = v0.map((a, j) => b2 * a + (1 - b2) * g[j] * g[j]);
      this.m[i] = m; this.v[i] = v;
      p.veri = p.veri.map((w, j) => w - lr * (m[j] / d1) / (Math.sqrt(v[j] / d2) + eps));
    });
  }
}

// ================================================================ tensör metodları
const tm = (ad: string, f: (t: Tensor, ...a: any[]) => any, oto = true) => (t: Tensor) => fn((...a: any[]) => f(t, ...a), ad, 999, 0, [], oto);
function degerAl(t: Tensor) {
  if (t.veri.length !== 1) hata('Değer yalnızca tek öğeli tensörler için kullanılabilir');
  return t.veri[0];
}
const TENSOR_METOD: Record<string, (t: Tensor) => any> = {
  deger: tm('Değer', degerAl),
  geriyay: tm('GeriYay', t => { t.geriYay(); return null; }),
  toplam: tm('Toplam', (t, e = null) => t.toplam(e)),
  ortalama: tm('Ortalama', (t, e = null) => t.ortalama(e)),
  maks: tm('Maks', t => pyMaks(t.veri)),
  min: tm('Min', t => pyMin(t.veri)),
  argmaks: tm('ArgMaks', t => t.argmaks()),
  us: tm('Üs', t => t.us()),
  log: tm('Log', t => t.log()),
  relu: tm('ReLU', t => t.relu()),
  sigmoid: tm('Sigmoid', t => t.sigmoid()),
  tanh: tm('Tanh', t => t.tanh()),
  softmaks: tm('Softmaks', t => t.softmaks()),
  sin: tm('Sin', t => t.sin()),
  cos: tm('Cos', t => t.cos()),
  kok: tm('Kök', t => t.kok()),
  mutlak: tm('Mutlak', t => t.mutlak()),
  yeniden: tm('Yeniden', (t, ...s) => t.yeniden(...s), false),
  sifirlagrad: tm('SıfırlaGrad', t => { t.grad = null; return null; }),
  ayir: tm('Ayır', t => t.ayir()),
  kopya: tm('Kopya', t => t.ayir()),
  liste: tm('Liste', t => t.liste()),
  satir: tm('Satır', (t, i) => t.indeksAl([i]), false),
};

// çekirdek işleç köprüsü
$.tensorIslem = (op: string, a: any, b: any) => {
  if (Array.isArray(a)) a = Tensor.yap(a);
  if (Array.isArray(b)) b = Tensor.yap(b);
  switch (op) {
    case '+': case '-': case '*': case '/': return ikili(a, b, op);
    case '@': return matmul(a, b);
    case '**':
      if (!(a instanceof Tensor)) hata(`İç hata: TypeError: unsupported operand type(s) for ** or pow()`);
      return a.us_p(b);
  }
  hata(`'${op}' işlemi tensör için tanımlı değil`);
};

// ================================================================ YZ birimi
function satirlar(t: Tensor, idx: number[]): Tensor {
  if (t.sekil.length === 1) return new Tensor(idx.map(i => t.veri[i]), [idx.length]);
  const C = t.sekil[1];
  const veri: number[] = [];
  for (const i of idx) for (let c = 0; c < C; c++) veri.push(t.veri[i * C + c]);
  return new Tensor(veri, [idx.length, C]);
}
function ileriCagir(model: any, X: any) {
  if (model && typeof model.ileri === 'function' && !(model instanceof YNesne)) return model.ileri(X);
  if (model instanceof YNesne) return metodCagir(model, 'ileri', [X]);
  return cagir(model, [X]);
}
const tamsayi = (x: any) => Math.trunc(Number(x));

function yzModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'YZ' };
  const ekle = (ad: string, enAz: number, enCok: number | null, f: (...a: any[]) => any, oto = false) => {
    U[katla(ad)] = fn((...a: any[]) => {
      const n = a.length;
      if (n < enAz || (enCok !== null && n > enCok)) hata(`'${ad}' ${enAz}..${enCok === null ? 'None' : enCok} argüman bekler, ${n} verildi`);
      return f(...a);
    }, ad, enCok ?? 999, enAz, [], oto);
  };
  const sekilYap = (r: any, c: any) => c === null ? [tamsayi(r)] : [tamsayi(r), tamsayi(c)];
  const boy = (s: number[]) => s[0] * (s.length > 1 ? s[1] : 1);

  ekle('Tensör', 1, 2, (veri: any, gerekli: any = false) => {
    let t = Tensor.yap(veri);
    if (t === veri) t = t.ayir();
    t.gerekli = dogruMu(gerekli);
    return t;
  });
  ekle('Sıfırlar', 1, 3, (r: any, c: any = null, g: any = false) => { const s = sekilYap(r, c); return new Tensor(new Array(boy(s)).fill(0.0), s, dogruMu(g)); });
  ekle('Birler', 1, 3, (r: any, c: any = null, g: any = false) => { const s = sekilYap(r, c); return new Tensor(new Array(boy(s)).fill(1.0), s, dogruMu(g)); });
  ekle('RastgeleTensör', 1, 4, (r: any, c: any = null, olcek: any = 1.0, g: any = false) => {
    const s = sekilYap(r, c);
    const v: number[] = [];
    for (let i = 0; i < boy(s); i++) v.push(yzRng.gauss(0.0, Number(olcek)));
    return new Tensor(v, s, dogruMu(g));
  });
  ekle('Tohum', 1, 1, (n: any) => { yzRng.seed(n); anaRng.seed(n); if ($.mRng) $.mRng.seed(n); return null; });
  ekle('ReLU', 1, 1, (x: any) => Tensor.yap(x).relu());
  ekle('Sigmoid', 1, 1, (x: any) => Tensor.yap(x).sigmoid());
  ekle('Tanh', 1, 1, (x: any) => Tensor.yap(x).tanh());
  ekle('Softmaks', 1, 1, (x: any) => Tensor.yap(x).softmaks());
  ekle('Üstel', 1, 1, (x: any) => Tensor.yap(x).us());
  ekle('Log', 1, 1, (x: any) => Tensor.yap(x).log());
  ekle('MatÇarp', 2, 2, (a: any, b: any) => matmul(a, b));
  ekle('OKH', 2, 2, okh);
  ekle('OMH', 2, 2, omh);
  ekle('İkiliÇaprazEntropi', 2, 2, ikiliCaprazEntropi);
  ekle('ÇaprazEntropi', 2, 2, caprazEntropi);
  ekle('Yoğun', 2, 3, (g: any, c: any, akt: any = '') => new Yogun(tamsayi(g), tamsayi(c), akt));
  ekle('Ardışık', 0, 1, (k: any = null) => new Ardisik(k && (!Array.isArray(k) || k.length) ? k : []));
  ekle('SGD', 1, 3, (p: any, oran: any = 0.01, mom: any = 0.0) => new SGD(p, oran, mom));
  ekle('Adam', 1, 2, (p: any, oran: any = 0.001) => new Adam(p, oran));
  ekle('BirSıcak', 2, 2, (et: any, n: any) => {
    const e = yinele(et), k = Number(n);
    const veri = new Array(e.length * k).fill(0.0);
    e.forEach((x, i) => { veri[i * k + tamsayi(x)] = 1.0; });
    return new Tensor(veri, [e.length, k]);
  });
  ekle('ArgMaks', 1, 1, (t: any) => Tensor.yap(t).argmaks());
  ekle('Doğruluk', 2, 2, (tahmin: any, et: any) => {
    const t = Tensor.yap(tahmin);
    const etiketler = yinele(et).map(e => yuvarlaBasamak(f_(e), 0));
    const [, C] = iki(t.sekil);
    let tah: number[];
    if (C === 1 || t.sekil.length === 1) tah = t.veri.map(v => v >= 0.5 ? 1 : 0);
    else { tah = []; const R = t.sekil[0]; for (let r = 0; r < R; r++) tah.push(argmaksIc(t.veri, r * C, C)); }
    if (tah.length !== etiketler.length) hata('Doğruluk: tahmin ve etiket sayıları farklı');
    if (!etiketler.length) hata('Sıfıra bölme');
    let s = 0;
    tah.forEach((a, i) => { if (a === etiketler[i]) s++; });
    return s / etiketler.length;
  });
  ekle('Türev', 2, 2, (f: any, x: any) => {
    const skaler = typeof x === 'bigint' || typeof x === 'number';
    const xt = Tensor.yap(x).ayir();
    xt.gerekli = true;
    let s = cagir(f, [xt]);
    if (!(s instanceof Tensor)) return skaler ? 0.0 : new Tensor(new Array(xt.veri.length).fill(0.0), xt.sekil);
    if (s.veri.length !== 1) s = s.toplam();
    s.geriYay();
    const g = (xt.grad && xt.grad.length) ? xt.grad : new Array(xt.veri.length).fill(0.0);
    return skaler ? g[0] : new Tensor(g, xt.sekil);
  });
  U.gradyan = U.turev;
  ekle('ModeliDışaAktar', 2, 3, (model: any, yol: any, birimAdi: any = null) => {
    if (typeof yol !== 'string') hata("'ModeliDışaAktar' dosya yolu (metin) bekler");
    const ad = birimAdi ?? yol.replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '');
    const metin = modelBirimi(model, ad);
    if (!$.konak.dosyaYaz) hata(`Dosya yazılamadı: ${yol} (bu ortamda dosya erişimi yok)`);
    try { $.konak.dosyaYaz(yol, metin, false); } catch (e: any) { hata(`Dosya yazılamadı: ${yol} (${e.message})`); }
    return null;
  });
  ekle('Eğit', 5, 8, (model: any, X: any, Yv: any, kayip: any, opt: any, epok: any = 100n, rapor: any = 0n, yigin: any = 0n) => {
    let kf: (p: any, h: any) => any;
    if (typeof kayip === 'string') {
      const k = KAYIPLAR[katla(kayip)];
      if (!k) hata(`Bilinmeyen kayıp: '${kayip}'`);
      kf = k;
    } else kf = (p, h) => cagir(kayip, [p, h]);
    if (!(opt instanceof SGD)) hata(`İç hata: AttributeError: '${pyTipAdi(opt)}' object has no attribute 'sifirla'`);
    const Xt = Tensor.yap(X);
    const etiketListesi = Array.isArray(Yv) && Yv.length > 0 && typeof Yv[0] === 'bigint';
    const Yt: any = etiketListesi ? Yv : Tensor.yap(Yv);
    const R = Xt.sekil.length ? Xt.sekil[0] : 1;
    const gecmis: number[] = [];
    const ep = tamsayi(epok), rp = tamsayi(rapor), yg = tamsayi(yigin);
    for (let e = 0; e < ep; e++) {
      let deger: number;
      if (yg && yg < R) {
        const idx = Array.from({ length: R }, (_, i) => i);
        yzRng.shuffle(idx);
        let top = 0.0, say = 0;
        for (let b = 0; b < R; b += yg) {
          const parca = idx.slice(b, b + yg);
          const xb = satirlar(Xt, parca);
          const yb = etiketListesi ? parca.map(i => Yt[i]) : satirlar(Yt, parca);
          opt.sifirla();
          const L = kf(ileriCagir(model, xb), yb);
          L.geriYay();
          opt.adim();
          top += L.veri[0];
          say += 1;
        }
        deger = top / say;
      } else {
        opt.sifirla();
        const L = kf(ileriCagir(model, Xt), Yt);
        L.geriYay();
        opt.adim();
        deger = L.veri[0];
      }
      gecmis.push(deger);
      if (rp && ((e + 1) % rp === 0 || e === 0)) $.konak.yaz(`  Epok ${rjust(String(e + 1), 5)}/${ep}   kayıp = ${sabitNokta(deger, 6)}\n`);
    }
    return gecmis;
  });
  return U;
}

const AKT_FONK: Record<string, string> = { relu: 'ReLU', sigmoid: 'Sigmoid', tanh: 'Tanh', softmaks: 'Softmaks' };
/** Ardışık ya da Yoğun modeli Yöntem birimi metnine çevirir (Python sürümüyle aynı çıktı) */
export function modelBirimi(model: any, ad: string): string {
  const katmanlar: any[] = model instanceof Ardisik ? model.katmanlar : [model];
  const adimlar: string[] = [], degiskenler: string[] = [], atamalar: string[] = [], ozet: string[] = [];
  for (const k of katmanlar) {
    let akt: string;
    if (typeof k === 'string') { akt = katla(k); ozet.push(k); }
    else if (k instanceof Yogun) {
      const i = degiskenler.length / 2 + 1;
      degiskenler.push(`W${i}`, `b${i}`);
      const [g, c] = k.W.sekil;
      const satirlar: string[] = [];
      for (let r = 0; r < g; r++) satirlar.push('[' + k.W.veri.slice(r * c, (r + 1) * c).map(ondalikRepr).join(', ') + ']');
      atamalar.push(`  W${i} := Tensör([` + satirlar.join(',\n               ') + '])');
      atamalar.push(`  b${i} := Tensör([` + k.b.veri.map(ondalikRepr).join(', ') + '])');
      adimlar.push(`x @ W${i} + b${i}`);
      akt = k.akt;
      ozet.push(k.toString());
    } else hata('ModeliDışaAktar yalnızca Yoğun katmanları ve aktivasyon adlarını destekler');
    if (akt === '' || akt === 'dogrusal' || akt === 'yok') continue;
    if (!AKT_FONK[akt]) hata(`'${akt}' aktivasyonu dışa aktarılamaz (relu, sigmoid, tanh, softmaks)`);
    if (!adimlar.length) adimlar.push('x');
    adimlar[adimlar.length - 1] = `${AKT_FONK[akt]}(${adimlar[adimlar.length - 1]})`;
  }
  const govde = adimlar.map(a => `  x := ${a}`).join('\n');
  return `birim ${ad}\n{ YZ.ModeliDışaAktar ile üretildi: Ardışık[${ozet.join(', ')}] }\nkullan YZ\n\n`
    + `arayüz\n  fonksiyon Tahmin(x: tensör): tensör\n\nuygulama\ndeğişken\n  ${degiskenler.join(', ')}: tensör\n\n`
    + `fonksiyon Tahmin(x: tensör): tensör\nbaşla\n${govde}\n  sonuç := x\nbitir\n\nbaşla\n${atamalar.join('\n')}\nbitir.\n`;
}

$.yerelBirimler.set('yz', yzModulu);
