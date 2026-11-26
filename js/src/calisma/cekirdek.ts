// Yöntem çalışma zamanı çekirdeği. Derlenmiş kod bu nesneyi `$` olarak kullanır.
import { YontemHatasi, DurSinyali } from '../hatalar';
import { katla } from '../sozcuk';
import { YNesne, PascalDizi, DiziTipi, HataNesnesi, YModul, Ref, fn, ondalikYaz, sabitNokta, rjust, turAdi } from './deger';

export interface Konak {
  yaz(s: string): void;
  okuSatir(): string | null;          // null = girdi sonu
  argumanlar?: string[];
  dosyaOku?(yol: string): string;
  dosyaYaz?(yol: string, icerik: string, ekle: boolean): void;
  dosyaVarMi?(yol: string): boolean;
  ortam?(ad: string): string | undefined;
  iz?(m: string): void;
  /** 'yontem sına': çalıştırılacak sına bloğunun sırası (verilmezse ana blok çalışır) */
  sinaSec?: number;
  /** Pencere/Mobil işlemleri (canlı arayüz); verilmezse benzetim kipi */
  arayuz?(op: any): void;
  /** Mobil birimi için cihaz bilgisi ve kalıcı depo */
  cihaz?: any;
  /** Ağ birimi için eşzamanlı HTTP isteği; verilmezse ağ erişimi yoktur */
  http?(istek: any): any;
  /** 'aynı anda' döngüsü için birden çok HTTP isteğini birlikte (paralel) gönderir; verilmezse sırayla http kullanılır */
  httpToplu?(istekler: any[]): any[];
  /** Ağ.HttpAkış: yanıtı parça parça okur. sonraki() sırayla {durum, basliklar}, {parca}..., {son} ya da {hata}
   *  döndürür; kapat() bağlantıyı bırakır. Verilmezse yanıt http ile bütün olarak alınıp parçalanır. */
  httpAkis?(istek: any): { sonraki(): any; kapat(): void };
  /** Veritabanı birimi için bağlantı işlemleri; verilmezse veritabanı yoktur */
  veritabani?(istek: any): any;
  /** Sunucu birimi: HTTP isteklerini dinler; verilmezse sunucu yoktur */
  sunucu?(ayar: any, isle: (istek: any) => any): void;
}

export const $: any = (globalThis as any).__yontem$ || ((globalThis as any).__yontem$ = {});
$.L = 0;                 // dosyaNo * 1e6 + satır
$.dosyalar = [] as string[];
$.konak = null as Konak | null;
$.girdiTamponu = null as string | null;

// ================================================================ konum ve hatalar
export function konum(): { dosya: string | null; satir: number | null } {
  if (!$.L) return { dosya: null, satir: null };
  return { dosya: $.dosyalar[Math.floor($.L / 1e6)] ?? null, satir: ($.L % 1e6) || null };
}

export function hataOlustur(mesaj: string, deger: any = null): YontemHatasi {
  if ($.ayk) $.ayk.hata(mesaj);
  const k = konum();
  return new YontemHatasi(mesaj, k.satir, k.dosya, deger);
}
export function hata(mesaj: string): never { throw hataOlustur(mesaj); }
$.hataOlustur = hataOlustur;

// ================================================================ hata ayıklama kancaları
// Yalnızca 'yontem ayikla' ile derlenen kod bu çağrıları içerir; $.ayk o zaman bir Ayiklayici'dır.
$.ayk = null;
$.aDur = (no: number) => { $.ayk.deyim(no); };
$.aGir = (id: number) => { const f = { id, g: null, L: $.L }; $.ayk.yigin.push(f); return f; };
$.aCik = (f: any) => { const y = $.ayk.yigin; while (y.length && y.pop() !== f) { /* atlanan çerçeveler */ } };
$.hata = hata;

/** Yakalanan her türlü hatayı Yöntem hatasına çevirir (Durdur hariç). */
export function yontemHatasina(e: any): YontemHatasi {
  if (e instanceof YontemHatasi) return e;
  if (e instanceof DurSinyali) throw e;
  if (e instanceof RangeError && /call stack/i.test(e.message)) return hataOlustur('Yığın taşması (çok derin özyineleme)');
  return hataOlustur(`İç hata: ${e && e.name ? e.name : 'Hata'}: ${e && e.message ? e.message : String(e)}`);
}
$.yontemHatasina = yontemHatasina;

$.yakala = (e: any) => {
  const h = yontemHatasina(e);
  if (h.deger !== null && h.deger !== undefined) return h.deger;
  return new HataNesnesi(h.mesaj, 'Hata', h.satir);
};

$.firlat = (v: any) => {
  if (typeof v === 'string') v = new HataNesnesi(v, 'Hata', konum().satir);
  if (v instanceof HataNesnesi) {
    if (v.satir === null) v.satir = konum().satir;
    return hataOlustur(v.mesaj, v);
  }
  if (v instanceof YNesne) {
    const m = (v as any).f_mesaj !== undefined ? (v as any).f_mesaj : (v.constructor as any).$ad;
    return hataOlustur(`${(v.constructor as any).$ad}: ${metne(m)}`, v);
  }
  return hataOlustur(metne(v), v);
};

$.disaAktarilmamis = (birim: string, ad: string) => hata(`'${birim}' biriminde '${ad}' dışa aktarılmamış`);

// ================================================================ metne çevirme
export function metne(v: any): string {
  switch (typeof v) {
    case 'string': return v;
    case 'boolean': return v ? 'doğru' : 'yanlış';
    case 'bigint': return v.toString();
    case 'number': return ondalikYaz(v);
  }
  if (v === null || v === undefined) return 'boş';
  return temsil(v, 0);
}
$.metne = metne;

export function temsil(v: any, derin = 0): string {
  const t = typeof v;
  if (t === 'string') return derin ? "'" + v.replace(/'/g, "''") + "'" : v;
  if (t === 'boolean' || t === 'bigint' || t === 'number' || v === null || v === undefined) return metne(v);
  if (derin > 6) return '...';
  if (Array.isArray(v)) return '[' + v.map(x => temsil(x, derin + 1)).join(', ') + ']';
  if (v instanceof PascalDizi) return '[' + v.veri.map(x => temsil(x, derin + 1)).join(', ') + ']';
  if (v instanceof Map) {
    if (!v.size) return '[:]';
    const p: string[] = [];
    v.forEach((d, a) => p.push(`${temsil(a, derin + 1)}: ${temsil(d, derin + 1)}`));
    return '[' + p.join(', ') + ']';
  }
  if (v instanceof YNesne) {
    const m = (v as any).m_metnecevir;
    if (typeof m === 'function') return metne(m.call(v));
    const p: string[] = [];
    for (const k of Object.keys(v)) if (k.startsWith('f_')) p.push(`${k.slice(2)}: ${temsil((v as any)[k], derin + 1)}`);
    return `${(v.constructor as any).$ad}(${p.join(', ')})`;
  }
  if (t === 'function') {
    if (v.$sinif) return `<sınıf ${v.$ad}>`;
    if (v.$bagli) return `<metod ${v.$bagli.sinif}.${v.$ad}>`;
    if (v.$kurucu) return `<kurucu ${v.$kurucu.$ad}>`;
    return `<fonksiyon ${v.$ad ?? v.name ?? '?'}>`;
  }
  if (v instanceof YModul) return `<birim ${v.ad}>`;
  return String(v);
}
$.temsil = temsil;
$.turAdi = turAdi;

// ================================================================ tip denetimi
function tipHata(beklenen: string, v: any, ad: string): never {
  hata(`'${ad}' için tip uyuşmazlığı: ${beklenen} bekleniyordu, ${turAdi(v)} verildi`);
}
$.u_tamsayi = (v: any, ad: string) => typeof v === 'bigint' ? v : tipHata('tamsayı', v, ad);
$.u_ondalik = (v: any, ad: string) => typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : tipHata('ondalık', v, ad);
$.u_metin = (v: any, ad: string) => typeof v === 'string' ? v : tipHata('metin', v, ad);
$.u_mantiksal = (v: any, ad: string) => typeof v === 'boolean' ? v : tipHata('mantıksal', v, ad);
$.u_karakter = (v: any, ad: string) => (typeof v === 'string' && v.length <= 1) ? v : tipHata('karakter', v, ad);
$.u_liste = (v: any, ad: string) => (Array.isArray(v) || v instanceof PascalDizi) ? v : tipHata('liste', v, ad);
$.u_sozluk = (v: any, ad: string) => v instanceof Map ? v : tipHata('sözlük', v, ad);
$.u_tensor = (v: any, ad: string) => (v === null || (v && v.$tensor)) ? v : tipHata('tensör', v, ad);
$.u_dizi = (v: any, ad: string) => (v instanceof PascalDizi || Array.isArray(v)) ? v : tipHata('dizi', v, ad);
$.u_sinif = (C: any, v: any, ad: string) => {
  if (v === null && !C.$kayit) return v;
  if (v instanceof C) return C.$kayit ? kayitKopya(v) : v;
  tipHata(C.$ad, v, ad);
};
/** Genel tip denetimi (tip: kod metni | sınıf | DiziTipi | null) */
export function uyumla(tip: any, v: any, ad: string): any {
  if (tip === null || tip === undefined) return v;
  if (typeof tip === 'string') return $['u_' + tip](v, ad);
  if (tip instanceof DiziTipi) return $.u_dizi(v, ad);
  if (typeof tip === 'function') return $.u_sinif(tip, v, ad);
  return v;
}
$.u = uyumla;

function kayitKopya(v: any) {
  return Object.assign(Object.create(Object.getPrototypeOf(v)), v);
}

$.vsSinif = (C: any) => C.$kayit ? yeni(C, null, []) : null;
$.vsDizi = (alt: any, ust: any, eleman: () => any) => {
  if (typeof alt !== 'bigint' || typeof ust !== 'bigint' || ust < alt) hata('Dizi sınırları geçersiz');
  const veri = [];
  for (let i = alt; i <= ust; i++) veri.push(eleman());
  return new PascalDizi(alt, veri);
};
$.diziTipi = (alt: any, ust: any) => {
  if (typeof alt !== 'bigint' || typeof ust !== 'bigint' || ust < alt) hata('Dizi sınırları geçersiz');
  return new DiziTipi(alt, ust, null);
};

// ================================================================ işleçler
const sayiMi = (t: string) => t === 'bigint' || t === 'number';
const opGorunum: Record<string, string> = { bol: 'böl', icinde: 'içinde' };
function islemHata(op: string, a: any, b: any): never {
  hata(`'${opGorunum[op] ?? op}' işlemi ${turAdi(a)} ve ${turAdi(b)} için tanımlı değil`);
}
const OP_METOD: Record<string, string> = { '+': 'm_topla', '-': 'm_cikar', '*': 'm_carp', '/': 'm_bolme', '=': 'm_esit', '<': 'm_kucuk', '>': 'm_buyuk' };
function asiriYukleme(op: string, a: any, b: any): any {
  if (a instanceof YNesne) {
    const m = (a as any)[OP_METOD[op]];
    if (typeof m === 'function') return { v: m.call(a, b) };
  }
  return null;
}
function tensorMu(v: any) { return v !== null && typeof v === 'object' && v.$tensor === true; }
function tensorIslem(op: string, a: any, b: any): any {
  return $.tensorIslem(op, a, b);   // YZ birimi tanımlar
}

$.top = (a: any, b: any) => {
  const ta = typeof a, tb = typeof b;
  if (ta === 'bigint') { if (tb === 'bigint') return a + b; if (tb === 'number') return Number(a) + b; }
  else if (ta === 'number') { if (tb === 'number') return a + b; if (tb === 'bigint') return a + Number(b); }
  const o = asiriYukleme('+', a, b); if (o) return o.v;
  if (ta === 'string' || tb === 'string') return metne(a) + metne(b);
  if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
  if (tensorMu(a) || tensorMu(b)) return tensorIslem('+', a, b);
  islemHata('+', a, b);
};
$.cik = (a: any, b: any) => {
  const ta = typeof a, tb = typeof b;
  if (ta === 'bigint') { if (tb === 'bigint') return a - b; if (tb === 'number') return Number(a) - b; }
  else if (ta === 'number') { if (tb === 'number') return a - b; if (tb === 'bigint') return a - Number(b); }
  const o = asiriYukleme('-', a, b); if (o) return o.v;
  if (tensorMu(a) || tensorMu(b)) return tensorIslem('-', a, b);
  islemHata('-', a, b);
};
$.carp = (a: any, b: any) => {
  const ta = typeof a, tb = typeof b;
  if (ta === 'bigint') { if (tb === 'bigint') return a * b; if (tb === 'number') return Number(a) * b; }
  else if (ta === 'number') { if (tb === 'number') return a * b; if (tb === 'bigint') return a * Number(b); }
  const o = asiriYukleme('*', a, b); if (o) return o.v;
  if (tb === 'bigint' && ta === 'string') return b > 0n ? a.repeat(Number(b)) : '';
  if (tb === 'bigint' && Array.isArray(a)) { let r: any[] = []; for (let i = 0n; i < b; i++) r = r.concat(a); return r; }
  if (tensorMu(a) || tensorMu(b)) return tensorIslem('*', a, b);
  islemHata('*', a, b);
};
$.bol = (a: any, b: any) => {
  const ta = typeof a, tb = typeof b;
  if (sayiMi(ta) && sayiMi(tb)) {
    const y = Number(b);
    if (y === 0) hata('Sıfıra bölme');
    return Number(a) / y;
  }
  const o = asiriYukleme('/', a, b); if (o) return o.v;
  if (tensorMu(a) || tensorMu(b)) return tensorIslem('/', a, b);
  islemHata('/', a, b);
};
$.tbol = (a: any, b: any) => {
  const ta = typeof a, tb = typeof b;
  if (sayiMi(ta) && sayiMi(tb)) {
    if (ta !== 'bigint' || tb !== 'bigint') hata("'böl' tamsayı bölmesidir; tamsayı bekler");
    if (b === 0n) hata('Sıfıra bölme');
    return a / b;
  }
  islemHata('bol', a, b);
};
$.mod = (a: any, b: any) => {
  const ta = typeof a, tb = typeof b;
  if (sayiMi(ta) && sayiMi(tb)) {
    if (ta !== 'bigint' || tb !== 'bigint') hata("'mod' tamsayı bekler");
    if (b === 0n) hata('Sıfıra bölme');
    return a % b;
  }
  islemHata('mod', a, b);
};
$.us = (a: any, b: any) => {
  const ta = typeof a, tb = typeof b;
  if (sayiMi(ta) && sayiMi(tb)) {
    if (ta === 'bigint' && tb === 'bigint') {
      if (b >= 0n) return a ** b;
      if (a === 0n) hata('Sıfıra bölme');
      return Number(a) ** Number(b);
    }
    const x = Number(a), y = Number(b);
    if (x === 0 && y < 0) hata('Sıfıra bölme');
    const r = Math.pow(x, y);
    if (Number.isNaN(r) && !Number.isNaN(x) && !Number.isNaN(y)) hata('Negatif sayının kesirli kuvveti tanımsız');
    if (!Number.isFinite(r) && Number.isFinite(x) && Number.isFinite(y)) hata('Sayısal taşma');
    return r;
  }
  if (tensorMu(a)) return tensorIslem('**', a, b);
  islemHata('**', a, b);
};
$.mat = (a: any, b: any) => {
  const ta = typeof a, tb = typeof b;
  if (sayiMi(ta) && sayiMi(tb)) return $.carp(a, b);
  if (tensorMu(a) || tensorMu(b) || (Array.isArray(a) && Array.isArray(b))) return tensorIslem('@', a, b);
  islemHata('@', a, b);
};

export function esit(a: any, b: any): boolean {
  if (a === b) return true;
  const ta = typeof a, tb = typeof b;
  if (sayiMi(ta) && sayiMi(tb)) return (a as any) == (b as any);
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!esit(a[i], b[i])) return false;
    return true;
  }
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) { if (!b.has(k) || !esit(v, b.get(k))) return false; }
    return true;
  }
  return false;
}
$.esitMi = esit;
$.esit = (a: any, b: any) => {
  if (a instanceof YNesne) { const o = asiriYukleme('=', a, b); if (o) return o.v; }
  return esit(a, b);
};
$.esitDegil = (a: any, b: any) => {
  if (a instanceof YNesne && typeof (a as any).m_esit === 'function') return !(a as any).m_esit(b);
  return !esit(a, b);
};
function karsilastirOp(op: string, a: any, b: any): boolean {
  const ta = typeof a, tb = typeof b;
  if ((sayiMi(ta) && sayiMi(tb)) || (ta === 'string' && tb === 'string')) {
    switch (op) { case '<': return a < b; case '>': return a > b; case '<=': return a <= b; default: return a >= b; }
  }
  const o = (op === '<' || op === '>') ? asiriYukleme(op, a, b) : null;
  if (o) return o.v;
  islemHata(op, a, b);
}
$.kucuk = (a: any, b: any) => karsilastirOp('<', a, b);
$.buyuk = (a: any, b: any) => karsilastirOp('>', a, b);
$.kucukEsit = (a: any, b: any) => karsilastirOp('<=', a, b);
$.buyukEsit = (a: any, b: any) => karsilastirOp('>=', a, b);

$.icinde = (a: any, b: any) => {
  if (b instanceof PascalDizi) return b.veri.some(x => esit(a, x));
  if (Array.isArray(b)) return b.some(x => esit(a, x));
  if (b instanceof Map) return b.has(a);
  if (typeof b === 'string') {
    if (typeof a !== 'string') hata('Metin içinde yalnızca metin aranabilir');
    return b.includes(a);
  }
  if (sayiMi(typeof a) && sayiMi(typeof b)) hata("'içinde' sağ tarafta koleksiyon bekler");
  hata(`'içinde' sağ tarafta koleksiyon bekler, ${turAdi(b)} verildi`);
};

/** Python sıralama karşılaştırması (sorted, max, min) */
export function karsilastir(a: any, b: any): number {
  const ta = typeof a, tb = typeof b;
  if ((sayiMi(ta) || ta === 'boolean') && (sayiMi(tb) || tb === 'boolean')) {
    const x: any = ta === 'boolean' ? (a ? 1n : 0n) : a, y: any = tb === 'boolean' ? (b ? 1n : 0n) : b;
    return x < y ? -1 : x > y ? 1 : 0;
  }
  if (ta === 'string' && tb === 'string') return a < b ? -1 : a > b ? 1 : 0;
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) { if (!esit(a[i], b[i])) return karsilastir(a[i], b[i]); }
    return a.length - b.length;
  }
  throw new TypeError('karşılaştırılamaz');
}
$.karsilastir = karsilastir;

$.neg = (v: any) => {
  if (typeof v === 'bigint' || typeof v === 'number') return -v;
  if (tensorMu(v)) return v.neg();
  hata(`Tekli '-' sayı bekler, ${turAdi(v)} verildi`);
};
$.degil = (v: any) => {
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'bigint') return ~v;
  hata(`'değil' mantıksal değer bekler, ${turAdi(v)} verildi`);
};
function mantik(op: string, a: any, bf: () => any) {
  if (typeof a === 'boolean') {
    let b: any;
    if (op === 've') { if (!a) return false; b = bf(); }
    else if (op === 'veya') { if (a) return true; b = bf(); }
    else {
      b = bf();
      if (typeof b !== 'boolean') hata("'yada' iki mantıksal değer bekler");
      return a !== b;
    }
    if (typeof b !== 'boolean') hata(`'${op}' mantıksal değer bekler, ${turAdi(b)} verildi`);
    return b;
  }
  const b = bf();
  if (typeof a === 'bigint' && typeof b === 'bigint') return op === 've' ? (a & b) : op === 'veya' ? (a | b) : (a ^ b);
  hata(`'${op}' mantıksal veya tamsayı bekler, ${turAdi(a)} verildi`);
}
$.ve = (a: any, bf: () => any) => mantik('ve', a, bf);
$.veya = (a: any, bf: () => any) => mantik('veya', a, bf);
$.yada = (a: any, bf: () => any) => mantik('yada', a, bf);

$.kosul = (v: any) => {
  if (typeof v !== 'boolean') hata(`Koşul mantıksal olmalı, ${turAdi(v)} verildi`);
  return v;
};

// ================================================================ dizinleme
export function indeks(c: any, i: any): any {
  if (Array.isArray(c)) {
    if (typeof i !== 'bigint') hata('Liste dizini tamsayı olmalı');
    let j = Number(i);
    if (j < 0) j += c.length;
    if (j < 0 || j >= c.length) hata(`Liste dizini sınır dışı: ${i} (uzunluk ${c.length})`);
    return c[j];
  }
  if (c instanceof Map) {
    if (Array.isArray(i) || i instanceof Map) hata('Bu değer sözlük anahtarı olamaz');
    if (!c.has(i)) hata(`Sözlükte anahtar yok: ${temsil(i, 1)}`);
    return c.get(i);
  }
  if (typeof c === 'string') {
    if (typeof i !== 'bigint' || i < 1n || i > BigInt(c.length)) hata(`Metin dizini sınır dışı: ${metne(i)} (metin dizinleri 1'den başlar)`);
    return c[Number(i) - 1];
  }
  if (c instanceof PascalDizi) return c.al(i);
  if (tensorMu(c)) return c.indeksAl([i]);
  if (c instanceof YNesne && typeof (c as any).m_indeksal === 'function') return (c as any).m_indeksal(i);
  hata(`${turAdi(c)} dizinlenemez`);
}
$.indeks = indeks;
$.indeksN = (c: any, idx: any[]) => {
  if (tensorMu(c)) return c.indeksAl(idx);
  for (const i of idx) c = indeks(c, i);
  return c;
};
export function indeksAta(c: any, idx: any[], v: any) {
  if (tensorMu(c)) { c.indeksAta(idx, v); return; }
  for (let k = 0; k < idx.length - 1; k++) c = indeks(c, idx[k]);
  const i = idx[idx.length - 1];
  if (Array.isArray(c)) {
    if (typeof i !== 'bigint') hata('Liste dizini tamsayı olmalı');
    let j = Number(i);
    if (j < 0) j += c.length;
    if (j < 0 || j >= c.length) hata(`Liste dizini sınır dışı: ${i} (uzunluk ${c.length})`);
    c[j] = v;
  } else if (c instanceof Map) {
    if (Array.isArray(i) || i instanceof Map) hata('Bu değer sözlük anahtarı olamaz');
    c.set(i, v);
  } else if (c instanceof PascalDizi) c.ata(i, v);
  else if (tensorMu(c)) c.indeksAta([i], v);
  else if (c instanceof YNesne && typeof (c as any).m_indeksata === 'function') (c as any).m_indeksata(i, v);
  else hata(`${turAdi(c)} dizinle değiştirilemez`);
}
$.indeksAta = indeksAta;
/** Metin dizinine atama: yeni metni döndürür */
$.metinAta = (s: string, idx: any[], v: any) => {
  if (idx.length !== 1) hata('Metin tek dizinle erişilir');
  const i = idx[0];
  if (typeof i !== 'bigint' || i < 1n || i > BigInt(s.length)) hata(`Metin dizini sınır dışı: ${metne(i)}`);
  const j = Number(i);
  return s.slice(0, j - 1) + metne(v) + s.slice(j);
};

// ================================================================ fonksiyonlar ve çağrılar
$.fn = fn;
export class YRef { constructor(public al: () => any, public ata: (v: any) => void) {} }
$.YRef = YRef;
$.ref = (al: () => any, ata: (v: any) => void) => new YRef(al, ata);
$.refYok = () => hata('Referans (değişken) parametreye yalnızca değişken verilebilir');
/** Dinamik çağrı: argümanlardan YRef olanlar, hedef o sırada referans beklemiyorsa değere çevrilir */
function refCoz(f: any, args: any[]): any[] {
  const r: number[] = (f && f.$ref) || [];
  for (let i = 0; i < args.length; i++) if (args[i] instanceof YRef && !r.includes(i)) args[i] = args[i].al();
  return args;
}
$.refCoz = refCoz;

export function oto(v: any): any {
  if (typeof v === 'function' && v.$oto === true) return v();
  return v;
}
$.oto = oto;

function varsayilanKurucu(C: any): string | null {
  if (typeof C.prototype.m_olustur === 'function') return 'm_olustur';
  for (const k of Object.getOwnPropertyNames(C.prototype)) {
    const m = C.prototype[k];
    if (typeof m === 'function' && m.$kurucu_mu) return k;
  }
  return null;
}
export function cagir(f: any, args: any[]): any {
  if (typeof f !== 'function') hata(`${turAdi(f)} çağrılamaz`);
  if (f.$sinif) return yeni(f, varsayilanKurucu(f), args);
  return f(...args);
}
$.cagirR = (f: any, args: any[]) => cagir(f, refCoz(f, args));
$.cagir = cagir;
/** Gölgelenmiş bir adla çağrı: değer çağrılamıyorsa iletiye nedeni eklenir */
$.cagirG = (f: any, args: any[], neden: string) => {
  if (typeof f !== 'function') hata(`${turAdi(f)} çağrılamaz: ${neden}`);
  return cagir(f, args);
};
$.cagirDeyim = (v: any) => {
  if (typeof v === 'function') return cagir(v, []);
  hata('Bu ifade deyim olarak kullanılamaz (çağrılabilir değil)');
};

/** o.metod bağlı fonksiyonu */
export function bagla(o: any, mk: string): any {
  return $.baglaF(o, o[mk]);
}
$.bagla = bagla;
$.baglaF = (o: any, m: any) => {
  const g = fn((...a: any[]) => m.apply(o, a), m.$ad, m.$n, m.$min, m.$ref, m.$oto);
  (g as any).$bagli = { sinif: o.constructor.$ad };
  if (m.$g) (g as any).$g = (...a: any[]) => m.$g.apply(o, a);   // 'aynı anda': bağlı metod da bekleyebilir
  return g;
};
/** miras.Metod(…): üreteç kipinde ebeveyn metodunun üreteç sürümü kullanılır */
$.gUygula = function* (m: any, o: any, args: any[]): any {
  if (m.$g) return yield* m.$g.apply(o, args);
  return m.apply(o, args);
};
$.otoP = (o: any, m: any) => m.$oto ? m.call(o) : $.baglaF(o, m);

/** Bir sınıf metoduna Yöntem bilgilerini iliştir (prototip üzerinde) */
$.metod = (C: any, mk: string, f: any, ad: string, nmax: number, refs: number[], kurucu: boolean) => {
  fn(f, ad, nmax, 0, refs, nmax === 0);
  f.$kurucu_mu = kurucu;
  C.prototype[mk] = f;
  return f;
};
$.govdesiz = (ad: string, soyut: boolean) => function () {
  hata(soyut ? `Soyut metod çağrılamaz: '${ad}'` : `'${ad}' metodunun gövdesi tanımlanmamış`);
};

// ================================================================ sınıflar ve nesneler
$.YNesne = YNesne;
$.sinif = (C: any, ad: string, ebeveyn: any, kayit: boolean, alanlar: string[], tipler: Record<string, any>, hamlar: Record<string, string> = {}) => {
  C.$sinif = true; C.$ad = ad; C.$ebeveyn = ebeveyn; C.$kayit = kayit; C.$alanlar = alanlar; C.$tipler = tipler; C.$hamlar = hamlar;
  return C;
};
function tumAlanlar(C: any): string[] {
  const zincir: any[] = [];
  for (let s = C; s && s.$sinif; s = s.$ebeveyn) zincir.unshift(s);
  return zincir.flatMap(s => s.$alanlar);
}
function alanTipi(C: any, ad: string): any {
  for (let s = C; s && s.$sinif; s = s.$ebeveyn) if (s.$tipler && ad in s.$tipler) return s.$tipler[ad];
  return null;
}
export function yeni(C: any, mk: string | null, args: any[]): any {
  const o = new C();
  o.$ilkle();
  if (mk) {
    C.prototype[mk].apply(o, args);
  } else if (args.length && (C.$kayit || typeof C.prototype.m_olustur !== 'function')) {
    const adlar = tumAlanlar(C);
    if (args.length > adlar.length) hata(`'${C.$ad}' en çok ${adlar.length} alan alır`);
    args.forEach((v, i) => alanAta(o, adlar[i], v));
  }
  return o;
}
$.yeni = yeni;
$.kurucuDeger = (C: any, mk: string | null) => {
  const m = mk ? C.prototype[mk] : null;
  const g = fn((...a: any[]) => yeni(C, mk, a), m ? m.$ad : 'Oluştur', m ? m.$n : 999, 0, m ? m.$ref : [], !m || m.$n === 0);
  (g as any).$kurucu = C;
  return g;
};

// ================================================================ üye erişimi
const YONTEMLER: Map<any, Record<string, (o: any) => any>> = new Map();
$.YONTEMLER = YONTEMLER;

export function al(o: any, ad: string, ham?: string, otoCagir = true): any {
  if (o instanceof YNesne) {
    const fk = 'f_' + ad;
    if (fk in o) { const v = (o as any)[fk]; return otoCagir ? oto(v) : v; }
    const mk = 'm_' + ad;
    const m = (o as any)[mk];
    if (typeof m === 'function') {
      if (otoCagir && m.$oto) return m.call(o);
      return bagla(o, mk);
    }
    hata(`'${(o.constructor as any).$ad}' nesnesinde '${ham || ad}' üyesi yok`);
  }
  if (typeof o === 'function' && o.$sinif) {
    const mk = 'm_' + ad;
    const m = o.prototype[mk];
    let g: any;
    if (m && m.$kurucu_mu) g = $.kurucuDeger(o, mk);
    else if (!m && (ad === 'olustur' || ad === 'yeni')) g = $.kurucuDeger(o, null);
    else if (m) hata(`'${ham || ad}' bir kurucu değil; nesne üzerinden çağırın`);
    else hata(`'${o.$ad}' sınıfında '${ham || ad}' kurucusu yok`);
    return otoCagir ? oto(g) : g;
  }
  if (o instanceof YModul) {
    if (o.disa && !o.disa.has(ad)) hata(`'${o.ad}' biriminde '${ad}' dışa aktarılmamış`);
    const v = (o as any)['v_' + ad];
    if (v === undefined) hata(`'${o.ad}' biriminde '${ad}' yok`);
    return otoCagir ? oto(v) : v;
  }
  if (o === null || o === undefined) hata(`'boş' değerin '${ham || ad}' üyesine erişilemez`);
  let tablo: any = null;
  if (Array.isArray(o)) tablo = YONTEMLER.get(Array);
  else if (typeof o === 'string') tablo = YONTEMLER.get(String);
  else if (o instanceof Map) tablo = YONTEMLER.get(Map);
  else if (o instanceof PascalDizi) tablo = YONTEMLER.get(PascalDizi);
  if (tablo) {
    const f = tablo[ad];
    if (f) { const g = f(o); return otoCagir ? oto(g) : g; }
  }
  if (o instanceof HataNesnesi) {
    if (ad === 'mesaj') return o.mesaj;
    if (ad === 'tur') return o.tur;
    if (ad === 'satir') return o.satir === null ? null : BigInt(o.satir);
    hata(`Hata nesnesinde '${ad}' üyesi yok`);
  }
  if (typeof o.kAl === 'function') { const v = o.kAl(ad); return otoCagir ? oto(v) : v; }
  hata(`${turAdi(o)} türünde '${ham || ad}' üyesi yok`);
}
$.al = al;
$.alC = (o: any, ad: string, ham?: string) => al(o, ad, ham, false);

export function alanAta(o: any, ad: string, v: any) {
  if (o instanceof YNesne) {
    const fk = 'f_' + ad;
    if (!(fk in o)) hata(`'${(o.constructor as any).$ad}' nesnesinde '${ad}' alanı yok`);
    const t = alanTipi(o.constructor, ad);
    (o as any)[fk] = t ? t(v, ad) : v;
    return;
  }
  if (o && typeof o.kAta === 'function') { o.kAta(ad, v); return; }
  hata(`${turAdi(o)} türünde '${ad}' alanına atama yapılamaz`);
}
$.alanAta = alanAta;

/** Metod içinde niteliksiz metod anılışı: parametresizse çağır */
$.otoM = (o: any, mk: string) => {
  const m = o[mk];
  return m.$oto ? m.call(o) : bagla(o, mk);
};
$.cUR = (o: any, ad: string, ham: string, args: any[]) => {
  if (o instanceof YNesne) {
    const fk = 'f_' + ad;
    if (!(fk in o)) {
      const m = (o as any)['m_' + ad];
      if (typeof m === 'function') return m.apply(o, refCoz(m, args));
    }
  }
  const f = o instanceof YNesne && ('f_' + ad) in o ? (o as any)['f_' + ad] : al(o, ad, ham, false);
  return cagir(f, refCoz(f, args));
};
/** o.ad(args) çağrısı */
$.cU = (o: any, ad: string, ham: string, args: any[]) => {
  if (o instanceof YNesne) {
    const fk = 'f_' + ad;
    if (fk in o) return cagir((o as any)[fk], args);
    const m = (o as any)['m_' + ad];
    if (typeof m === 'function') return m.apply(o, args);
    hata(`'${(o.constructor as any).$ad}' nesnesinde '${ham}' üyesi yok`);
  }
  return cagir(al(o, ad, ham, false), args);
};

// ================================================================ aynı anda (paralel döngü)
// Program 'aynı anda' içeriyorsa her kullanıcı fonksiyonunun ve metodunun bir de üreteç sürümü ($g) derlenir.
// Döngü gövdeleri üreteçtir; açık çağrılar (f(x), n.m(x), çağrı deyimleri) üreteç sürümlerinden geçer ve
// bir ağ isteğine varınca gövde isteği verip bekler. Zamanlayıcı turlarla ilerler: her turda bekleyen gövdeler
// sırayla bir sonraki isteğe ya da sona kadar yürür, ardından o turun istekleri birlikte gönderilir. Sıra
// zamanlamaya değil yalnızca programa bağlıdır; Python yorumlayıcısı (yontem_dil/eszamanli.py) aynı turları izler.
// Otomatik çağrılar, kurucular, 'miras' ve yerleşiklerin çağırdığı fonksiyonlar beklemeden (sırayla) çalışır.
export const ES_VARSAYILAN_SINIR = 16;
$.gen = (f: any, g: any) => { f.$g = g; return f; };
$.metodG = (C: any, mk: string, g: any) => { C.prototype[mk].$g = g; };
function* gC(f: any, args: any[]): any {
  if (f && f.$g) return yield* f.$g(...args);
  return f(...args);
}
$.gC = gC;
$.gM = function* (o: any, mk: string, args: any[]): any {
  const m = o[mk];
  if (m && m.$g) return yield* m.$g.apply(o, args);
  return m.apply(o, args);
};
function* gCagir(f: any, args: any[]): any {
  if (typeof f !== 'function') hata(`${turAdi(f)} çağrılamaz`);
  if (f.$sinif) return yeni(f, varsayilanKurucu(f), args);
  return yield* gC(f, args);
}
$.gCagir = gCagir;
$.gCagirR = (f: any, args: any[]) => gCagir(f, refCoz(f, args));
$.gCagirG = function* (f: any, args: any[], neden: string): any {
  if (typeof f !== 'function') hata(`${turAdi(f)} çağrılamaz: ${neden}`);
  return yield* gCagir(f, args);
};
$.gCagirDeyim = function* (v: any): any {
  if (typeof v === 'function') return yield* gCagir(v, []);
  hata('Bu ifade deyim olarak kullanılamaz (çağrılabilir değil)');
};
$.gCUR = function* (o: any, ad: string, ham: string, args: any[]): any {
  if (o instanceof YNesne) {
    const fk = 'f_' + ad;
    if (!(fk in o)) {
      const m = (o as any)['m_' + ad];
      if (typeof m === 'function') return yield* $.gM(o, 'm_' + ad, refCoz(m, args));
    }
  }
  const f = o instanceof YNesne && ('f_' + ad) in o ? (o as any)['f_' + ad] : al(o, ad, ham, false);
  return yield* gCagir(f, refCoz(f, args));
};
$.gCU = function* (o: any, ad: string, ham: string, args: any[]): any {
  if (o instanceof YNesne) {
    const fk = 'f_' + ad;
    if (fk in o) return yield* gCagir((o as any)[fk], args);
    const m = (o as any)['m_' + ad];
    if (typeof m === 'function') return yield* $.gM(o, 'm_' + ad, args);
    hata(`'${(o.constructor as any).$ad}' nesnesinde '${ham}' üyesi yok`);
  }
  return yield* gCagir(al(o, ad, ham, false), args);
};
/** ve/veya/yada: ikinci işlenen yalnızca gerektiğinde (üreteç olarak) değerlendirilir */
$.gMantik = function* (op: string, a: any, bg: () => Generator): any {
  if (typeof a === 'boolean' && ((op === 've' && !a) || (op === 'veya' && a))) return a;
  const b = yield* bg();
  return mantik(op, a, () => b);
};
function topluHttp(istekler: any[]): any[] {
  const k: Konak | null = $.konak;
  if (k && k.httpToplu && istekler.length > 1) return k.httpToplu(istekler);
  return istekler.map(i => k!.http!(i));
}
$.ayniAnda = (kaynak: any, cift: boolean, sinir: any, govde: (o: any) => Generator, bu: any) => {
  const ogeler: any[] = cift ? [...$.yineleCift(kaynak)] : yinele(kaynak);
  let n = ES_VARSAYILAN_SINIR;
  if (sinir !== null) {
    if (typeof sinir !== 'bigint') hata(`'aynı anda en çok' tamsayı bekler, ${turAdi(sinir)} verildi`);
    if (sinir < 1n) hata(`'aynı anda en çok' en az 1 olmalı (${sinir} verildi)`);
    n = sinir > 100000n ? 100000 : Number(sinir);
  }
  type Govde = { g: Generator; yanit: any; istek: any; L: number; bitti: boolean };
  let aktif: Govde[] = [];
  let sira = 0;
  for (;;) {
    while (aktif.length < n && sira < ogeler.length) aktif.push({ g: govde.call(bu, ogeler[sira++]), yanit: undefined, istek: null, L: $.L, bitti: false });
    if (!aktif.length) break;
    for (const b of aktif) {
      $.L = b.L;
      const r = b.g.next(b.yanit);
      b.L = $.L;
      b.yanit = undefined;
      if (r.done) b.bitti = true; else b.istek = r.value;
    }
    aktif = aktif.filter(b => !b.bitti);
    if (aktif.length) {
      const yanitlar = topluHttp(aktif.map(b => b.istek));
      aktif.forEach((b, i) => { b.yanit = yanitlar[i]; b.istek = null; });
    }
  }
};

// ================================================================ akış ('üret')
// 'üret' kullanan fonksiyon çağrılınca parametreler bağlanır ve bir akış döner; gövde (bir JavaScript üreteci)
// akış yinelenince çalışır ve her 'üret'te durur. Döngü akışı bitmeden bırakırsa for…of akışı kapatır
// (return): 'sonunda' blokları çalışır. Akışın gövdesi 'aynı anda' içinde bile ağ isteklerinde beklemez.
// Python yorumlayıcısı aynı anlamı Python üreteçleriyle verir (yontem_dil/akis.py).
export class Akis {
  static TUR_ADI = 'akış';
  private calisiyor = false;
  constructor(private g: Generator, public ad: string) {}
  private gir() {
    if (this.calisiyor) hata(`'${this.ad}' akışı kendi gövdesinde yinelenemez`);
    this.calisiyor = true;
  }
  next(v?: any): IteratorResult<any> { this.gir(); try { return this.g.next(v); } finally { this.calisiyor = false; } }
  return(v?: any): IteratorResult<any> {
    if (this.calisiyor) return { done: true, value: undefined };
    this.calisiyor = true;
    try { return this.g.return(v); } finally { this.calisiyor = false; }
  }
  [Symbol.iterator]() { return this; }
  $yinele(): any[] { return [...this]; }
  toString() { return `<akış ${this.ad}>`; }
}
$.akis = (g: Generator, ad: string) => new Akis(g, ad);
$.u_akis = (v: any, ad: string) => (v === null || v instanceof Akis) ? v : tipHata('akış', v, ad);
function* akisCift(a: Akis): Generator<any[]> {
  let i = 0n;
  for (const x of a) { yield [i, x]; i++; }
}

// ================================================================ yineleme ve döngüler
export function yinele(v: any): any[] {
  if (Array.isArray(v)) return v.slice();
  if (v instanceof Map) return [...v.keys()];
  if (typeof v === 'string') return [...v];
  if (v instanceof PascalDizi) return v.veri.slice();
  if (tensorMu(v)) return v.ogeler();
  if (v && typeof v.$yinele === 'function') return v.$yinele();
  hata(`${turAdi(v)} üzerinde yinelenemez`);
}
$.yinele = yinele;
/** 'içindeki her' döngüsünün kaynağı: akış tembel yinelenir, ötekiler kopyalanır */
$.yineleD = (v: any): Iterable<any> => v instanceof Akis ? v : yinele(v);
$.yineleCift = (v: any): Iterable<any[]> => {
  if (v instanceof Akis) return akisCift(v);
  if (v instanceof Map) return [...v.entries()].map(([a, b]) => [a, b]);
  return yinele(v).map((x, i) => [BigInt(i), x]);
};
$.icinKontrol = (a: any, b: any, c: any) => {
  if (typeof a !== 'bigint' || typeof b !== 'bigint' || typeof c !== 'bigint')
    hata("'için' döngüsünde başlangıç, bitiş ve adım tamsayı olmalı");
  if (c <= 0n) hata(`'için' döngüsünde adım pozitif olmalı (${c} verildi); yön 'artan' ya da 'azalan' ile belirtilir`);
};
$.kezSayisi = (n: any) => {
  if (typeof n !== 'bigint') hata(`'kez tekrarla' tamsayı bekler, ${turAdi(n)} verildi`);
  return n;
};
$.mutlakB = (n: bigint) => n < 0n ? -n : n;

// ================================================================ çeşitli ifadeler
$.bicim = (v: any, gen: any, hassas?: any) => {
  const g = Number(gen);
  if (hassas !== undefined && (typeof v === 'bigint' || typeof v === 'number'))
    return rjust(sabitNokta(Number(v), Number(hassas)), g);
  return rjust(metne(v), g);
};
$.aralikListe = (a: any, b: any) => {
  if (typeof a === 'bigint' && typeof b === 'bigint') { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
  if (typeof a === 'string' && typeof b === 'string' && a.length === 1 && b.length === 1) {
    const r = []; for (let c = a.codePointAt(0); c <= b.codePointAt(0); c++) r.push(String.fromCodePoint(c)); return r;
  }
  hata('[a..b] aralığında tamsayı veya karakter bekleniyordu');
};
$.sozluk = (ciftler: any[][]) => {
  const m = new Map();
  for (const [a, b] of ciftler) {
    if (Array.isArray(a) || a instanceof Map) hata('Bu değer sözlük anahtarı olamaz');
    m.set(a, b);
  }
  return m;
};

// ================================================================ birimler
const birimTanimlari: Map<string, { ad: string; disa: string[] | null; f: (G: any) => void }> = new Map();
const yuklenenBirimler: Map<string, any> = new Map();
const yukleniyor: Set<string> = new Set();
export const yerelBirimler: Map<string, () => Record<string, any>> = new Map();
$.yerelBirimler = yerelBirimler;

$.birimTanimla = (anahtar: string, ad: string, disa: string[] | null, f: (G: any) => void) => {
  birimTanimlari.set(anahtar, { ad, disa, f });
};
$.birim = (anahtar: string) => {
  const hazir = yuklenenBirimler.get(anahtar);
  if (hazir) return hazir;
  const yerel = yerelBirimler.get(anahtar);
  if (yerel) {
    const m: any = new YModul(anahtar);
    const uyeler = yerel();
    for (const k of Object.keys(uyeler)) m['v_' + k] = uyeler[k];
    m.ad = uyeler.$ad ?? anahtar;
    yuklenenBirimler.set(anahtar, m);
    return m;
  }
  const tanim = birimTanimlari.get(anahtar);
  if (!tanim) hata(`Birim bulunamadı: '${anahtar}'`);
  if (yukleniyor.has(anahtar)) hata(`Döngüsel birim kullanımı: '${tanim.ad}'`);
  yukleniyor.add(anahtar);
  const G: any = new YModul(tanim.ad, tanim.disa ? new Set(tanim.disa) : null);
  yuklenenBirimler.set(anahtar, G);
  const eskiL = $.L;
  try { tanim.f(G); } finally { yukleniyor.delete(anahtar); $.L = eskiL; }
  return G;
};
$.birimiDisaAc = (G: any, ad: string, al: () => any, ata: (v: any) => void) => {
  Object.defineProperty(G, 'v_' + ad, { get: al, set: ata, enumerable: true, configurable: true });
};

// ================================================================ sıfırlama
export function sifirla(konak: Konak, dosyalar: string[]) {
  $.L = 0;
  $.ayk = null;
  $.konak = konak;
  $.girdiTamponu = null;
  birimTanimlari.clear();
  yuklenenBirimler.clear();
  yukleniyor.clear();
  for (const f of sifirlayicilar) f();
}
const sifirlayicilar: (() => void)[] = [];
export function sifirlayiciEkle(f: () => void) { sifirlayicilar.push(f); }

export { katla, YNesne, PascalDizi, HataNesnesi, YModul, DiziTipi };
