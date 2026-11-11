// Kuantum birimi: durum vektörü simülatörü. q0 bit dizilerinde EN SOLDADIR.
// Karmaşık aritmetik CPython 3.13 ile aynı işlem sırasıyla yapılır.
import { katla } from '../sozcuk';
import { $, hata, metne, cagir } from './cekirdek';
import { fn, sabitNokta, yuvarlaBasamak } from './deger';
import { PyRandom } from './rastgele';
import { rng as anaRng } from './yerlesik';
import { yzRng, pySum } from './yz';

export const kRng = new PyRandom();
const EN_COK_KUBIT = 20;

// ---------------------------------------------------------------- karmaşık sayılar [re, im]
type K = [number, number];
const C = (re: number, im = 0.0): K => [re, im];
const kTop = (a: K, b: K): K => [a[0] + b[0], a[1] + b[1]];
const kCarp = (a: K, b: K): K => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const kNeg = (a: K): K => [-a[0], -a[1]];
const kEslenik = (a: K): K => [a[0], -a[1]];
function kBol(a: K, b: K): K {
  const abr = b[0] < 0 ? -b[0] : b[0], abi = b[1] < 0 ? -b[1] : b[1];
  if (abr >= abi) {
    if (abr === 0.0) hata('Sıfıra bölme');
    const ratio = b[1] / b[0], denom = b[0] + b[1] * ratio;
    return [(a[0] + a[1] * ratio) / denom, (a[1] - a[0] * ratio) / denom];
  }
  const ratio = b[0] / b[1], denom = b[0] * ratio + b[1];
  return [(a[0] * ratio + a[1]) / denom, (a[1] * ratio - a[0]) / denom];
}
function kUs(z: K): K {
  const l = Math.exp(z[0]);
  return [l * Math.cos(z[1]), l * Math.sin(z[1])];
}
// Dekker yöntemleriyle doğru yuvarlanmış hypot
function ikiCarp(a: number, b: number): [number, number] {
  const p = a * b;
  const S = 134217729;
  let t = S * a; const ah = t - (t - a), al = a - ah;
  t = S * b; const bh = t - (t - b), bl = b - bh;
  return [p, ((ah * bh - p) + ah * bl + al * bh) + al * bl];
}
function ikiTop(a: number, b: number): [number, number] {
  const s = a + b, bb = s - a;
  return [s, (a - (s - bb)) + (b - bb)];
}
export function hypot(x: number, y: number): number {
  x = Math.abs(x); y = Math.abs(y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return (x === Infinity || y === Infinity) ? Infinity : NaN;
  if (x < y) { const t = x; x = y; y = t; }
  if (y === 0) return x;
  let olcek = 1;
  if (x > 1e150) { olcek = 2 ** 600; x /= olcek; y /= olcek; }
  else if (x < 1e-150) { olcek = 2 ** -600; x /= olcek; y /= olcek; }
  const [h1, l1] = ikiCarp(x, x), [h2, l2] = ikiCarp(y, y);
  const [s, e] = ikiTop(h1, h2);
  const t = e + l1 + l2;
  const S = s + t, E = t - (S - s);
  const r = Math.sqrt(S);
  const [rr, re] = ikiCarp(r, r);
  const d = ((S - rr) - re) + E;
  return (r + d / (2 * r)) * olcek;
}
const kAbs = (a: K) => hypot(a[0], a[1]);
const J: K = [0.0, 1.0];
const eksiJ: K = kNeg(J);
const sayiK = (x: number): K => [x, 0.0];

const S2 = 1 / Math.sqrt(2);
const KAPILAR: Record<string, K[][]> = {
  h: [[C(S2), C(S2)], [C(S2), C(-S2)]],
  x: [[C(0), C(1)], [C(1), C(0)]],
  y: [[C(0), eksiJ], [J, C(0)]],
  z: [[C(1), C(0)], [C(0), C(-1)]],
  s: [[C(1), C(0)], [C(0), J]],
  sd: [[C(1), C(0)], [C(0), eksiJ]],
  t: [[C(1), C(0)], [C(0), kUs(kBol(kCarp(J, sayiK(Math.PI)), sayiK(4)))]],
  td: [[C(1), C(0)], [C(0), kUs(kBol(kCarp(eksiJ, sayiK(Math.PI)), sayiK(4)))]],
  kx: [[C(0.5, 0.5), C(0.5, -0.5)], [C(0.5, -0.5), C(0.5, 0.5)]],
};
function rx(t: number): K[][] {
  const c = Math.cos(t / 2), s = Math.sin(t / 2);
  const m = kCarp(eksiJ, sayiK(s));
  return [[C(c), m], [m, C(c)]];
}
function ry(t: number): K[][] {
  const c = Math.cos(t / 2), s = Math.sin(t / 2);
  return [[C(c), C(-s)], [C(s), C(c)]];
}
function rz(t: number): K[][] {
  return [[kUs(kBol(kCarp(eksiJ, sayiK(t)), sayiK(2))), C(0)], [C(0), kUs(kBol(kCarp(J, sayiK(t)), sayiK(2)))]];
}
function faz(t: number): K[][] { return [[C(1), C(0)], [C(0), kUs(kCarp(J, sayiK(t)))]]; }
function u3(t: number, f: number, l: number): K[][] {
  const c = Math.cos(t / 2), s = Math.sin(t / 2);
  return [[C(c), kCarp(kNeg(kUs(kCarp(J, sayiK(l)))), sayiK(s))],
          [kCarp(kUs(kCarp(J, sayiK(f))), sayiK(s)), kCarp(kUs(kCarp(J, sayiK(f + l))), sayiK(c))]];
}
const DONUS: Record<string, (t: number) => K[][]> = { rx, ry, rz, faz };

function pyStr(v: any): string {
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (v === null || v === undefined) return 'None';
  return metne(v);
}
function aci(v: any, ad: string): number {
  if (typeof v === 'bigint' || typeof v === 'number') return Number(v);
  hata(`'${ad}' için açı sayı olmalı`);
}
function kisa(x: number): string {
  const s = sabitNokta(x, 4).replace(/0+$/, '').replace(/\.$/, '');
  return (s === '-0' || s === '') ? '0' : s;
}
function ortala(s: string, gen: number, dolgu: string): string {
  const uz = [...s].length;
  if (uz >= gen) return s;
  const marj = gen - uz;
  const sol = Math.floor(marj / 2) + (marj & gen & 1);
  return dolgu.repeat(sol) + s + dolgu.repeat(marj - sol);
}
const uzunluk = (s: string) => [...s].length;

class Devre {
  TUR_ADI = 'kuantum devresi';
  n: number; durum: K[]; klasik: number[]; kayit: [string, number[], number[]][] = [];
  constructor(n: any, klasik: any = null) {
    if (typeof n !== 'bigint' || n < 1n) hata('Kübit sayısı pozitif bir tamsayı olmalı');
    if (n > BigInt(EN_COK_KUBIT)) hata(`Simülatör en çok ${EN_COK_KUBIT} kübit destekler`);
    this.n = Number(n);
    this.durum = Array.from({ length: 1 << this.n }, () => C(0.0, 0.0));
    this.durum[0] = C(1.0, 0.0);
    const k = klasik !== null ? Number(klasik) : this.n;
    this.klasik = new Array(Math.max(0, k)).fill(0);
  }
  q(q: any): number {
    if (typeof q !== 'bigint' || !(q >= 0n && q < BigInt(this.n))) hata(`Geçersiz kübit dizini: ${pyStr(q)} (0..${this.n - 1})`);
    return Number(q);
  }
  farkli(...qs: number[]) { if (new Set(qs).size !== qs.length) hata('Bir kapının kübitleri birbirinden farklı olmalı'); }
  tek(q0: any, M: K[][], kontroller0: any[] = [], etiket = '?') {
    const q = this.q(q0);
    const kontroller = kontroller0.map(c => this.q(c));
    this.farkli(q, ...kontroller);
    const [[a, b], [c, d]] = M;
    const adim = 1 << q;
    let maske = 0;
    for (const k of kontroller) maske |= 1 << k;
    const s = this.durum;
    for (let i = 0; i < s.length; i++) {
      if ((i & adim) || (i & maske) !== maske) continue;
      const j = i | adim;
      const x = s[i], y = s[j];
      s[i] = kTop(kCarp(a, x), kCarp(b, y));
      s[j] = kTop(kCarp(c, x), kCarp(d, y));
    }
    this.kayit.push([etiket, kontroller, [q]]);
  }
  olasilik1(q: number) {
    const adim = 1 << q;
    const xs: number[] = [];
    this.durum.forEach((a, i) => { if (i & adim) { const m = kAbs(a); xs.push(m * m); } });
    return pySum(xs);
  }
  bitler(i: number) { let s = ''; for (let q = 0; q < this.n; q++) s += (i >> q) & 1 ? '1' : '0'; return s; }
  olasiliklar(): Map<string, number> {
    const m = new Map<string, number>();
    this.durum.forEach((a, i) => { const p = kAbs(a) ** 2; const p2 = kAbs(a); if (p2 * p2 > 1e-12) m.set(this.bitler(i), p2 * p2); void p; });
    return m;
  }
  kapi(ad: string, q: any) { this.tek(q, KAPILAR[ad], [], ad !== 'kx' ? ad.toUpperCase() : '√X'); }
  donus(tur: string, q: any, t0: any) {
    const t = aci(t0, tur);
    this.tek(q, DONUS[tur](t), [], `${tur !== 'faz' ? tur.toUpperCase() : 'P'}(${kisa(t)})`);
  }
  u(q: any, t: any, f: any, l: any) { this.tek(q, u3(aci(t, 'U'), aci(f, 'U'), aci(l, 'U')), [], 'U'); }
  kontrollu(ad: string, kontroller: any[], hedef: any, t0: any = null) {
    let M: K[][], etiket: string;
    if (ad in DONUS) {
      const t = aci(t0, ad);
      M = DONUS[ad](t);
      etiket = `${ad !== 'faz' ? ad.toUpperCase() : 'P'}(${kisa(t)})`;
    } else { M = KAPILAR[ad]; etiket = ad.toUpperCase(); }
    this.tek(hedef, M, kontroller, etiket);
  }
  takas(a0: any, b0: any) {
    const a = this.q(a0), b = this.q(b0);
    this.farkli(a, b);
    const s = this.durum, ma = 1 << a, mb = 1 << b;
    for (let i = 0; i < s.length; i++) {
      if ((i & ma) && !(i & mb)) { const j = (i & ~ma) | mb; const t = s[i]; s[i] = s[j]; s[j] = t; }
    }
    this.kayit.push(['×', [], [a, b]]);
  }
  olc(q0: any, klasikBit: any = null): number {
    const q = this.q(q0);
    const p1 = this.olasilik1(q);
    const sonuc = kRng.random() < p1 ? 1 : 0;
    const p = sonuc ? p1 : 1 - p1;
    const olcek: K = p > 0 ? sayiK(1 / Math.sqrt(p)) : C(0, 0);
    const adim = 1 << q;
    const s = this.durum;
    for (let i = 0; i < s.length; i++) {
      if ((!!(i & adim)) === (!!sonuc)) s[i] = kCarp(s[i], olcek);
      else s[i] = C(0.0, 0.0);
    }
    const hedef = klasikBit === null ? BigInt(q) : klasikBit;
    if (typeof hedef !== 'bigint' || !(hedef >= 0n && hedef < BigInt(this.klasik.length))) hata(`Geçersiz klasik bit: ${pyStr(hedef)}`);
    this.klasik[Number(hedef)] = sonuc;
    this.kayit.push(['Ö', [], [q]]);
    return sonuc;
  }
  olcHepsi() { let s = ''; for (let q = 0; q < this.n; q++) s += String(this.olc(BigInt(q))); return s; }
  calistir(atis: any = 1024n) {
    if (typeof atis !== 'bigint' || atis < 1n) hata('Atış sayısı pozitif bir tamsayı olmalı');
    const ol = this.olasiliklar();
    const anahtarlar = [...ol.keys()].sort();
    const agirlik = anahtarlar.map(k => ol.get(k));
    const sayim = new Map<string, bigint>();
    for (const k of kRng.choices(anahtarlar, agirlik, Number(atis))) sayim.set(k, (sayim.get(k) ?? 0n) + 1n);
    const out = new Map<string, bigint>();
    for (const k of [...sayim.keys()].sort()) out.set(k, sayim.get(k));
    return out;
  }
  sifirla(q: any = null) {
    if (q === null) {
      this.durum = Array.from({ length: 1 << this.n }, () => C(0.0, 0.0));
      this.durum[0] = C(1.0, 0.0);
      this.kayit = [];
      this.klasik = new Array(this.klasik.length).fill(0);
      return null;
    }
    if (this.olc(q) === 1) this.tek(q, KAPILAR.x, [], 'X');
    return null;
  }
  beklenen(pauli: any): number {
    if (typeof pauli !== 'string' || [...pauli].length !== this.n) hata(`Pauli dizisi ${this.n} karakter olmalı (ör. 'Z' + 'I' * ${this.n - 1})`);
    const s = this.durum;
    const p = [...pauli].map(c => c.toUpperCase());
    if (p.some(c => !'IXYZ'.includes(c) || c === '')) hata('Pauli dizisi yalnızca I, X, Y, Z içerebilir');
    let top: K = C(0.0, 0.0);
    s.forEach((a, i) => {
      if (a[0] === 0 && a[1] === 0) return;
      let j = i;
      let katsayi: K = C(1.0, 0.0);
      p.forEach((c, q) => {
        const bit = (i >> q) & 1;
        if (c === 'X') j ^= 1 << q;
        else if (c === 'Y') { j ^= 1 << q; katsayi = kCarp(katsayi, bit === 0 ? J : eksiJ); }
        else if (c === 'Z') { if (bit) katsayi = kNeg(katsayi); }
      });
      top = kTop(top, kCarp(kCarp(kEslenik(s[j]), katsayi), a));
    });
    return yuvarlaBasamak(top[0], 12);
  }
  bloch(q0: any) {
    const q = this.q(q0);
    return ['X', 'Y', 'Z'].map(c => {
      const p = new Array(this.n).fill('I');
      p[q] = c;
      return yuvarlaBasamak(this.beklenen(p.join('')), 10);
    });
  }
  durumMetni() {
    const parcalar: string[] = [];
    this.durum.forEach((a, i) => {
      if (kAbs(a) < 1e-9) return;
      const [re, im] = a;
      let k: string;
      if (Math.abs(im) < 1e-9) k = kisa(re);
      else if (Math.abs(re) < 1e-9) k = kisa(im) + 'i';
      else k = `(${kisa(re)}${im >= 0 ? '+' : '-'}${kisa(Math.abs(im))}i)`;
      parcalar.push(`${k}|${this.bitler(i)}⟩`);
    });
    return parcalar.join(' + ').split('+ -').join('- ');
  }
  ciz() {
    const sutunlar: Map<number, string>[] = [];
    for (const [etiket, kontroller, hedefler] of this.kayit) {
      const hucre = new Map<number, string>();
      for (const c of kontroller) hucre.set(c, '●');
      for (const h of hedefler) hucre.set(h, etiket);
      const tum = [...kontroller, ...hedefler];
      if (tum.length > 1) {
        for (let q = Math.min(...tum) + 1; q < Math.max(...tum); q++) if (!hucre.has(q)) hucre.set(q, '│');
      }
      sutunlar.push(hucre);
    }
    const satirlar: string[] = [];
    for (let q = 0; q < this.n; q++) {
      const parcalar = [`q${q}: `];
      for (const hucre of sutunlar) {
        const gen = hucre.size ? Math.max(...[...hucre.values()].map(uzunluk)) : 1;
        const v = hucre.get(q);
        if (v === undefined) parcalar.push('─'.repeat(gen + 2));
        else parcalar.push('─' + ortala(v, gen, '─') + '─');
      }
      satirlar.push(parcalar.join('') + '─');
    }
    return satirlar.join('\n');
  }
  kopya() {
    const d = new Devre(BigInt(this.n), BigInt(this.klasik.length));
    d.durum = this.durum.slice();
    d.klasik = this.klasik.slice();
    d.kayit = this.kayit.slice();
    return d;
  }
  kAl(ad: string): any {
    if (ad === 'kubitsayisi') return BigInt(this.n);
    if (ad === 'klasik') return this.klasik.map(x => BigInt(x));
    const f = DEVRE_METOD[ad];
    if (!f) hata(`Kuantum devresinde '${ad}' üyesi yok`);
    return f(this);
  }
  toString() { return this.durumMetni(); }
}

const m = (ad: string, f: (d: Devre, ...a: any[]) => any, oto = false) => (d: Devre) => fn((...a: any[]) => f(d, ...a), ad, 999, 0, [], oto);
function liste(v: any): any[] {
  if (typeof v === 'bigint') return [v];
  if (Array.isArray(v)) return v.slice();
  hata('Kontrol kübitleri tamsayı ya da tamsayı listesi olmalı');
}
const BOS = (v: any) => (v === undefined ? null : v);
const DEVRE_METOD: Record<string, (d: Devre) => any> = {};
for (const ad of ['h', 'x', 'y', 'z', 's', 'sd', 't', 'td', 'kx']) DEVRE_METOD[ad] = m(ad.toUpperCase(), (d, q) => { d.kapi(ad, q); return null; });
for (const ad of ['rx', 'ry', 'rz', 'faz']) {
  DEVRE_METOD[ad] = m(ad, (d, q, t) => { d.donus(ad, q, t); return null; });
  DEVRE_METOD['k' + ad] = m('K' + ad, (d, c, h, t) => { d.kontrollu(ad, liste(c), h, t); return null; });
}
Object.assign(DEVRE_METOD, {
  u: m('U', (d, q, t, f, l) => { d.u(q, t, f, l); return null; }),
  cx: m('CX', (d, c, h) => { d.kontrollu('x', [c], h); return null; }),
  cnot: m('CNOT', (d, c, h) => { d.kontrollu('x', [c], h); return null; }),
  cy: m('CY', (d, c, h) => { d.kontrollu('y', [c], h); return null; }),
  cz: m('CZ', (d, c, h) => { d.kontrollu('z', [c], h); return null; }),
  ccx: m('CCX', (d, a, b, h) => { d.kontrollu('x', [a, b], h); return null; }),
  toffoli: m('Toffoli', (d, a, b, h) => { d.kontrollu('x', [a, b], h); return null; }),
  cokkontrollux: m('ÇokKontrollüX', (d, c, h) => { d.kontrollu('x', liste(c), h); return null; }),
  cokkontrolluz: m('ÇokKontrollüZ', (d, c, h) => { d.kontrollu('z', liste(c), h); return null; }),
  takas: m('Takas', (d, a, b) => { d.takas(a, b); return null; }),
  swap: m('SWAP', (d, a, b) => { d.takas(a, b); return null; }),
  olc: m('Ölç', (d, q, k = null) => BigInt(d.olc(q, BOS(k)))),
  olchepsi: m('ÖlçHepsi', d => d.olcHepsi(), true),
  calistir: m('Çalıştır', (d, atis = 1024n) => d.calistir(atis), true),
  olasiliklar: m('Olasılıklar', d => { const r = new Map(); d.olasiliklar().forEach((v, k) => r.set(k, yuvarlaBasamak(v, 10))); return r; }, true),
  olasilik: m('Olasılık', (d, b) => { const o = d.olasiliklar(); return yuvarlaBasamak(o.has(b) ? o.get(b) : 0.0, 10); }),
  genlikler: m('Genlikler', d => d.durum.map(a => [a[0], a[1]]), true),
  durum: m('Durum', d => d.durumMetni(), true),
  beklenendeger: m('BeklenenDeğer', (d, p) => d.beklenen(p)),
  blochvektoru: m('BlochVektörü', (d, q) => d.bloch(q)),
  sifirla: m('Sıfırla', (d, q = null) => d.sifirla(BOS(q)), true),
  ciz: m('Çiz', d => d.ciz(), true),
  kopya: m('Kopya', d => d.kopya(), true),
  bariyer: m('Bariyer', d => { d.kayit.push(['┊', [], Array.from({ length: d.n }, (_, i) => i)]); return null; }, true),
});

function kuantumModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Kuantum' };
  const ekle = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) => {
    U[katla(ad)] = fn((...a: any[]) => {
      if (!(enAz <= a.length && a.length <= enCok)) hata(`'${ad}' ${enAz}..${enCok} argüman bekler, ${a.length} verildi`);
      return f(...a);
    }, ad, enCok, enAz, [], oto);
  };
  ekle('Devre', 1, 2, (n: any, k: any = null) => new Devre(n, k));
  ekle('KuantumTohum', 1, 1, (n: any) => { kRng.seed(n); anaRng.seed(n); yzRng.seed(n); return null; });
  ekle('ParametreKaydırma', 2, 2, (f: any, params: any) => {
    if (!Array.isArray(params)) hata('ParametreKaydırma ikinci argüman olarak liste bekler');
    const grad: any[] = [];
    for (let i = 0; i < params.length; i++) {
      const arti = params.slice(), eksi = params.slice();
      arti[i] = $.top(params[i], Math.PI / 2);
      eksi[i] = $.cik(params[i], Math.PI / 2);
      const fa = cagir(f, [arti]), fe = cagir(f, [eksi]);
      const say = (v: any) => typeof v === 'bigint' || typeof v === 'number';
      if (!say(fa) || !say(fe)) hata('ParametreKaydırma: fonksiyon sayı döndürmeli');
      grad.push($.bol($.cik(fa, fe), 2n));
    }
    return grad;
  });
  ekle('Sadakat', 2, 2, (a: any, b: any) => {
    if (!(a instanceof Devre) || !(b instanceof Devre) || a.n !== b.n) hata('Sadakat aynı boyutta iki devre bekler');
    let ic: K = C(0.0, 0.0);
    a.durum.forEach((x, i) => { ic = kTop(ic, kCarp(kEslenik(x), b.durum[i])); });
    const v = kAbs(ic);
    return v * v;
  });
  U.enkokubit = BigInt(EN_COK_KUBIT);
  return U;
}

$.yerelBirimler.set('kuantum', kuantumModulu);
