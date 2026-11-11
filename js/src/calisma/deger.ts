// Yöntem çalışma zamanı değer türleri ve metne çevirme.
//   tamsayı → bigint, ondalık → number, metin → string, mantıksal → boolean,
//   boş → null, liste → Array, sözlük → Map, nesne → YNesne alt sınıfı
import { YontemHatasi } from '../hatalar';
const $: any = (globalThis as any).__yontem$ || ((globalThis as any).__yontem$ = {});

export class YNesne {
  /** Alanları ilk değerleriyle kurar (alt sınıflar ezer) */
  $ilkle(): void {}
}

export class PascalDizi {
  constructor(public alt: bigint, public veri: any[]) {}
  private j(i: any): number {
    if (typeof i !== 'bigint') throw ($ as any).hataOlustur('Dizi dizini tamsayı olmalı');
    const j = Number(i - this.alt);
    if (j < 0 || j >= this.veri.length)
      throw ($ as any).hataOlustur(`Dizi dizini sınır dışı: ${i} (geçerli ${this.alt}..${this.alt + BigInt(this.veri.length) - 1n})`);
    return j;
  }
  al(i: any) { return this.veri[this.j(i)]; }
  ata(i: any, v: any) { this.veri[this.j(i)] = v; }
}

export class DiziTipi {
  constructor(public alt: bigint, public ust: bigint, public eleman: any) {}
}

export class HataNesnesi {
  constructor(public mesaj: string, public tur = 'Hata', public satir: number | null = null) {}
  toString() { return `${this.tur}: ${this.mesaj}`; }
}

export class YModul {
  constructor(public ad: string, public disa: Set<string> | null = null) {}
}

export interface Ref { al(): any; ata(v: any): void; }

/** Fonksiyon nesnesine Yöntem bilgilerini iliştirir. */
export function fn<T extends Function>(f: T, ad: string, nmax: number, nmin: number, refs: number[] = [], oto = false): T {
  const g: any = f;
  g.$ad = ad; g.$n = nmax; g.$min = nmin; g.$ref = refs; g.$oto = oto;
  return f;
}

export function cagrilabilirMi(v: any): boolean {
  return typeof v === 'function';
}

export function sinifMi(v: any): boolean {
  return typeof v === 'function' && v.$sinif === true;
}

// ---------------------------------------------------------------- sayı biçimleme

/** Python repr(float) ile aynı yazım */
export function ondalikRepr(x: number): string {
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
  const isaret = x < 0 ? '-' : '';
  const e = Math.abs(x).toExponential();          // en kısa geri dönüşlü basamaklar
  const [mant, us] = e.split('e');
  const basamak = mant.replace('.', '');
  const exp = parseInt(us, 10);
  if (exp >= -4 && exp < 16) {
    if (exp >= 0) {
      if (basamak.length <= exp + 1) return isaret + basamak + '0'.repeat(exp + 1 - basamak.length) + '.0';
      return isaret + basamak.slice(0, exp + 1) + '.' + basamak.slice(exp + 1);
    }
    return isaret + '0.' + '0'.repeat(-exp - 1) + basamak;
  }
  const m = basamak.length > 1 ? basamak[0] + '.' + basamak.slice(1) : basamak;
  const ea = Math.abs(exp);
  return isaret + m + 'e' + (exp < 0 ? '-' : '+') + (ea < 10 ? '0' + ea : String(ea));
}

/** Yöntem'in ondalık yazımı (NaN → TS, ∞) */
export function ondalikYaz(x: number): string {
  if (Number.isNaN(x)) return 'TS';
  if (x === Infinity) return '∞';
  if (x === -Infinity) return '-∞';
  return ondalikRepr(x);
}

/** Python f"{x:.{f}f}" ile aynı (yarımı çifte yuvarlama, kesin ikili değer üzerinden) */
export function sabitNokta(x: number, f: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  const negatif = x < 0 || Object.is(x, -0);
  const a = Math.abs(x);
  if (a >= 1e21) {
    // çok büyük: tam basamaklar
    let s = BigInt(Math.round(a)).toString();
    return (negatif ? '-' : '') + s + (f > 0 ? '.' + '0'.repeat(f) : '');
  }
  const ekstra = Math.min(100, f + 30);
  const kesin = a.toFixed(ekstra);
  const [tam, kesir = ''] = kesin.split('.');
  let tutulan = tam + kesir.slice(0, f);
  const sonraki = kesir[f] ?? '0';
  const kalan = kesir.slice(f + 1);
  let yukari = false;
  if (sonraki > '5') yukari = true;
  else if (sonraki === '5') {
    if (/[1-9]/.test(kalan)) yukari = true;
    else yukari = (parseInt(tutulan[tutulan.length - 1] || '0', 10) % 2) === 1;
  }
  if (yukari) {
    const d = tutulan.split('');
    let i = d.length - 1;
    while (i >= 0) {
      if (d[i] === '9') { d[i] = '0'; i--; }
      else { d[i] = String.fromCharCode(d[i].charCodeAt(0) + 1); break; }
    }
    if (i < 0) d.unshift('1');
    tutulan = d.join('');
  }
  const tamUz = tutulan.length - f;
  const sonuc = f > 0 ? tutulan.slice(0, tamUz) + '.' + tutulan.slice(tamUz) : tutulan;
  return (negatif ? '-' : '') + sonuc;
}

/** Python round(x, n) — yarımı çifte */
export function yuvarlaBasamak(x: number, n: number): number {
  if (!Number.isFinite(x)) return x;
  if (n >= 0) return parseFloat(sabitNokta(x, n));
  const k = Math.pow(10, -n);
  return parseFloat(sabitNokta(x / k, 0)) * k;
}

export function rjust(s: string, gen: number): string {
  const uz = [...s].length;
  return uz >= gen ? s : ' '.repeat(gen - uz) + s;
}

// ---------------------------------------------------------------- tür adları

export function turAdi(v: any): string {
  switch (typeof v) {
    case 'boolean': return 'mantıksal';
    case 'bigint': return 'tamsayı';
    case 'number': return 'ondalık';
    case 'string': return 'metin';
    case 'function':
      if ((v as any).$sinif) return 'sınıf';
      return 'fonksiyon';
  }
  if (v === null || v === undefined) return 'boş';
  if (Array.isArray(v)) return 'liste';
  if (v instanceof Map) return 'sözlük';
  if (v instanceof YNesne) return (v.constructor as any).$ad;
  if (v instanceof PascalDizi) return 'dizi';
  if (v instanceof YModul) return 'birim';
  if (v instanceof HataNesnesi) return 'hata';
  return v.TUR_ADI ?? v.constructor?.TUR_ADI ?? 'nesne';
}
