// Yerleşik fonksiyonlar, tür metodları ve Matematik / Sistem / Veri birimleri.
import { DurSinyali } from '../hatalar';
import { katla } from '../sozcuk';
import { $, hata, metne, temsil, cagir, yinele, karsilastir, esit, YRef, sifirlayiciEkle } from './cekirdek';
import { YNesne, PascalDizi, HataNesnesi, fn, turAdi, yuvarlaBasamak, sabitNokta, rjust } from './deger';
import { PyRandom } from './rastgele';

export const rng = new PyRandom();
$.rng = rng;
sifirlayiciEkle(() => { /* tohum korunur; Python'da süreç başına rastgele */ });

// ---------------------------------------------------------------- yardımcılar
/** Python yf: argüman sayısını denetleyen yerleşik sarmalayıcı */
export function yf(ad: string, enAz: number, enCok: number | null, f: (...a: any[]) => any, oto = false, ref: number[] = []) {
  const g = (...a: any[]) => {
    const n = a.length;
    if (n < enAz || (enCok !== null && n > enCok)) {
      const aralik = enAz === enCok ? String(enAz) : (enCok !== null ? `${enAz}..${enCok}` : `en az ${enAz}`);
      hata(`'${ad}' ${aralik} argüman bekler, ${n} verildi`);
    }
    return f(...a);
  };
  return fn(g, ad, enCok === null ? 999 : enCok, enAz, ref, oto);
}

export function pyRepr(v: any): string {
  if (typeof v === 'string') {
    const q = v.includes("'") && !v.includes('"') ? '"' : "'";
    let s = '';
    for (const c of v) {
      if (c === '\\') s += '\\\\';
      else if (c === q) s += '\\' + c;
      else if (c === '\n') s += '\\n';
      else if (c === '\t') s += '\\t';
      else if (c === '\r') s += '\\r';
      else s += c;
    }
    return q + s + q;
  }
  return metne(v);
}

/** Python dilim indeksleri */
export function pyDilim(n: number, a: any, b: any): [number, number] {
  const coz = (x: any, vs: number) => {
    if (x === null || x === undefined) return vs;
    let i = Number(x);
    if (i < 0) i += n;
    return Math.max(0, Math.min(n, i));
  };
  const bas = coz(a, 0), son = coz(b, n);
  return [bas, Math.max(bas, son)];
}

export function sayi(v: any, ad = 'değer'): any {
  if (typeof v === 'bigint' || typeof v === 'number') return v;
  if (v && v.$tensor && v.veri.length === 1) return v.veri[0];
  hata(`${ad} sayı olmalı`);
}
const sayiN = (v: any, ad?: string) => Number(sayi(v, ad));

export function liste(v: any, ad = 'değer'): any[] {
  if (Array.isArray(v)) return v;
  if (v instanceof PascalDizi) return v.veri;
  hata(`${ad} liste olmalı`);
}

/** Boyutu değişen işlemler (Ekle, Sil, Araya) için: sabit boyutlu dizileri reddeder. */
function boyutDegisir(v: any, ad: string): any[] {
  if (v instanceof PascalDizi)
    hata(`${ad}: listenin boyutu Uzunluk ile sabitlendi, eleman eklenemez ya da silinemez (yeni boyut için L.Uzunluk(n, ilk) yazın; liste(L) serbest bir kopya verir)`);
  return liste(v, ad);
}

export function buyukHarf(s: string) { return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase(); }
export function kucukHarf(s: string) { return s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase(); }

const BOSLUK = /[ \t\n\r\x0b\x0c\x1c-\x1f\x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/;
export function pyStrip(s: string) {
  let a = 0, b = s.length;
  while (a < b && BOSLUK.test(s[a])) a++;
  while (b > a && BOSLUK.test(s[b - 1])) b--;
  return s.slice(a, b);
}
export function pySplit(s: string, ayrac: any = null): string[] {
  if (ayrac === null || ayrac === undefined) {
    const t = pyStrip(s);
    return t === '' ? [] : t.split(new RegExp(BOSLUK.source + '+'));
  }
  if (typeof ayrac !== 'string') hata(`İç hata: TypeError: must be str or None, not ${turAdi(ayrac)}`);
  if (ayrac === '') hata('İç hata: ValueError: empty separator');
  return s.split(ayrac);
}
function pyIntParse(s: string): bigint | null {
  const t = pyStrip(s).replace(/_/g, '');
  if (!/^[+-]?\d+$/.test(t)) return null;
  return BigInt(t);
}
export function pyFloatParse(s: string): number | null {
  const t = pyStrip(s).toLowerCase().replace(/_/g, '');
  if (/^[+-]?(inf|infinity)$/.test(t)) return t[0] === '-' ? -Infinity : Infinity;
  if (/^[+-]?nan$/.test(t)) return NaN;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(t)) return null;
  return parseFloat(t);
}
function pyTrunc(x: number): bigint {
  if (Number.isNaN(x)) hata('İç hata: ValueError: cannot convert float NaN to integer');
  if (!Number.isFinite(x)) hata('Sayısal taşma');
  return BigInt(Math.trunc(x));
}
function pyTipAdi(v: any) {
  switch (typeof v) {
    case 'bigint': return 'int'; case 'number': return 'float'; case 'boolean': return 'bool';
    case 'function': return v.$sinif ? 'KSinif' : 'KFonksiyon';
  }
  if (v === null || v === undefined) return 'NoneType';
  if (v instanceof YNesne) return 'KNesne';
  if (v instanceof HataNesnesi) return 'HataNesnesi';
  return v.constructor?.name ?? 'object';
}
function satirSayisi(ad: string, n: any) {
  if (typeof n !== 'bigint' || n < 0n) hata(`'${ad}' komutunun satır sayısı negatif olmayan bir tamsayı olmalı`);
  return Number(n);
}
function satirOku(): string {
  const s = $.konak.okuSatir();
  if (s === null || s === undefined) hata('Girdi sonuna ulaşıldı');
  return s.replace(/\n$/, '').replace(/\r$/, '');
}
function bigAbs(x: bigint) { return x < 0n ? -x : x; }
function sirala(L: any, anahtar: any = null, ters: any = false) {
  const ogeler = yinele(L);
  try {
    if (anahtar === null) {
      const k = ters ? (a: any, b: any) => -karsilastir(a, b) : karsilastir;
      return ogeler.sort(k);
    }
    const ciftler = ogeler.map(x => [cagir(anahtar, [x]), x]);
    ciftler.sort((a, b) => ters ? -karsilastir(a[0], b[0]) : karsilastir(a[0], b[0]));
    return ciftler.map(c => c[1]);
  } catch (e) {
    if (e instanceof TypeError) hata('Sırala: elemanlar karşılaştırılamıyor');
    throw e;
  }
}
function uc(a: any[], buyuk: boolean, ad: string) {
  const ogeler = a.length === 1 ? yinele(a[0]) : a;
  if (!ogeler.length) hata(`${ad}: boş liste`);
  let m = ogeler[0];
  try {
    for (let i = 1; i < ogeler.length; i++) {
      const c = karsilastir(ogeler[i], m);
      if (buyuk ? c > 0 : c < 0) m = ogeler[i];
    }
  } catch (e) {
    if (e instanceof TypeError) hata(`İç hata: TypeError: '${buyuk ? '>' : '<'}' not supported between instances`);
    throw e;
  }
  return m;
}
function indirge(L: any, f: any, bas: any = null) {
  let ogeler = yinele(L);
  if (bas === null) {
    if (!ogeler.length) hata('Boş liste başlangıç değeri olmadan indirgenemez');
    bas = ogeler[0]; ogeler = ogeler.slice(1);
  }
  for (const x of ogeler) bas = cagir(f, [bas, x]);
  return bas;
}
function toplam(L: any) {
  if (L && L.$tensor) return L.toplam();
  let s: any = 0n;
  for (const x of yinele(L)) s = $.top(s, x);
  return s;
}
function derinKopya(v: any): any {
  if (Array.isArray(v)) return v.map(derinKopya);
  if (v instanceof Map) { const m = new Map(); v.forEach((d, a) => m.set(a, derinKopya(d))); return m; }
  return v;
}
function basit(x: any) {
  const t = typeof x;
  return t === 'bigint' || t === 'number' || t === 'string' || t === 'boolean' || x === null || Array.isArray(x) || x instanceof Map;
}
function pyPop(L: any[], i: any, hataMesaji: string | null) {
  if (typeof i !== 'bigint') hata(`İç hata: TypeError: '${turAdi(i)}' object cannot be interpreted as an integer`);
  let j = Number(i);
  if (j < 0) j += L.length;
  if (j < 0 || j >= L.length) hata(hataMesaji ?? 'İç hata: IndexError: pop index out of range');
  return L.splice(j, 1)[0];
}
function pyInsert(L: any[], i: any, v: any) {
  let j = Number(i);
  if (j < 0) j = Math.max(0, j + L.length);
  L.splice(Math.min(j, L.length), 0, v);
}
function anahtarNorm(x: any) {
  switch (typeof x) {
    case 'boolean': return 'n' + (x ? 1 : 0);
    case 'bigint': return 'n' + x;
    case 'number': return Number.isInteger(x) ? 'n' + x : 'f' + x;
    case 'string': return 's' + x;
  }
  return x;
}
function altMetin(s: string, bas: any, uz: any = null) {
  const b = Math.max(Number(bas), 1) - 1;
  if (uz === null) return s.slice(b);
  const [x, y] = pyDilim(s.length, b, b + Number(uz));
  return s.slice(x, y);
}
function aralikListe(a: any, b: any = null, c: any = 1n) {
  if (b === null) { b = a; a = 0n; }
  if (c === 0n) hata('Aralık adımı sıfır olamaz');
  const r: bigint[] = [];
  if (c > 0n) for (let i = a; i < b; i += c) r.push(i);
  else for (let i = a; i > b; i += c) r.push(i);
  return r;
}
export function bicimle(sablon: string, ...args: any[]) {
  let out = '', i = 0, ai = 0;
  while (i < sablon.length) {
    const c = sablon[i];
    if (c === '{') {
      const j = sablon.indexOf('}', i);
      if (j < 0) hata("Biçimle: kapanmamış '{'");
      let ozel = sablon.slice(i + 1, j);
      if (ai >= args.length) hata('Biçimle: yetersiz argüman');
      const v = args[ai++];
      let gen = 0, hassas: number | null = null;
      if (ozel.startsWith(':')) {
        ozel = ozel.slice(1);
        if (ozel.includes('.')) {
          const k = ozel.indexOf('.');
          gen = parseInt(ozel.slice(0, k) || '0', 10); hassas = parseInt(ozel.slice(k + 1), 10);
        } else if (ozel) gen = parseInt(ozel, 10);
      }
      const m = (hassas !== null && (typeof v === 'bigint' || typeof v === 'number')) ? sabitNokta(Number(v), hassas) : metne(v);
      out += rjust(m, gen);
      i = j + 1;
    } else { out += c; i++; }
  }
  return out;
}
export function splitlines(s: string) {
  const r = s.split(/\r\n|[\n\r\x0b\x0c\x1c\x1d\x1e\x85\u2028\u2029]/);
  if (r.length && r[r.length - 1] === '') r.pop();
  return r;
}

// ================================================================ genel yerleşikler
export const Y: Record<string, any> = Object.create(null);
function ekle(adlar: string[], f: any) { for (const a of adlar) Y[katla(a)] = f; }

ekle(['yaz'], yf('yaz', 0, 2, (deger: any = '', satir: any = 0n) => {
  $.konak.yaz(metne(deger) + '\n'.repeat(satirSayisi('yaz', satir)));
  return null;
}, true));

Y.oku = fn((...args: any[]) => {
  if (!args.length || args.length > 2) hata("'oku' 1..2 argüman bekler: oku(değişken [, satır])");
  const r = args[0];
  if (!(r instanceof YRef)) hata('Referans (değişken) parametreye yalnızca değişken verilebilir');
  const satir = args.length > 1 ? satirSayisi('oku', args[1]) : 0;
  const eski = r.al();
  if (typeof eski === 'bigint' || typeof eski === 'number') {
    while ($.girdiTamponu === null || pyStrip($.girdiTamponu) === '') $.girdiTamponu = satirOku();
    const parca = pySplit($.girdiTamponu);
    const sozcuk = parca[0];
    const t = $.girdiTamponu.replace(/^\s+/, '');
    $.girdiTamponu = t.slice(sozcuk.length).replace(/^\s+/, '');
    let v: any = null;
    if (typeof eski === 'bigint') v = pyIntParse(sozcuk);
    else v = pyFloatParse(sozcuk.replace(/,/g, '.'));
    if (v === null) hata(`Girdi sayıya çevrilemedi: ${pyRepr(sozcuk)}`);
    r.ata(v);
  } else {
    if ($.girdiTamponu === null) $.girdiTamponu = satirOku();
    const d = $.girdiTamponu;
    $.girdiTamponu = '';
    r.ata(d);
  }
  for (let i = 0; i < satir; i++) {
    if (i > 0) satirOku();
    $.girdiTamponu = null;
  }
  return null;
}, 'oku', 2, 1, [0]);

ekle(['tamsayı', 'Tamsayıya'], yf('tamsayı', 1, 1, (v: any) => {
  if (typeof v === 'boolean') return v ? 1n : 0n;
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return pyTrunc(v);
  if (typeof v === 'string') {
    const i = pyIntParse(v);
    if (i !== null) return i;
    const f = pyFloatParse(v.replace(/,/g, '.'));
    if (f === null) hata(`Tamsayıya çevrilemez: ${pyRepr(v)}`);
    return pyTrunc(f);
  }
  const s = sayi(v);
  return typeof s === 'bigint' ? s : pyTrunc(s);
}));
ekle(['ondalık', 'Ondalığa'], yf('ondalık', 1, 1, (v: any) => {
  if (typeof v === 'string') {
    const f = pyFloatParse(v.replace(/,/g, '.'));
    if (f === null) hata(`Ondalığa çevrilemez: ${pyRepr(v)}`);
    return f;
  }
  return Number(sayi(v));
}));
ekle(['metin', 'Metne'], yf('metin', 1, 1, (v: any) => metne(v)));
ekle(['mantıksal'], yf('mantıksal', 1, 1, (v: any) => {
  if (typeof v === 'string') {
    const k = katla(pyStrip(v));
    if (['dogru', 'evet', 'true', '1'].includes(k)) return true;
    if (['yanlis', 'hayir', 'false', '0', ''].includes(k)) return false;
    hata(`Mantıksala çevrilemez: ${pyRepr(v)}`);
  }
  if (v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof Map) return v.size > 0;
  if (typeof v === 'bigint') return v !== 0n;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'boolean') return v;
  return true;
}));
ekle(['liste'], yf('liste', 0, 1, (v: any = null) => v === null ? [] : yinele(v)));
ekle(['Tür'], yf('Tür', 1, 1, (v: any) => turAdi(v)));
ekle(['ÖrneğiMi'], yf('ÖrneğiMi', 2, 2, (v: any, s: any) => {
  if (typeof s !== 'function' || !s.$sinif) hata("ÖrneğiMi'nin ikinci argümanı sınıf olmalı");
  return v instanceof s;
}));

// ---- koleksiyonlar
ekle(['Uzunluk'], yf('Uzunluk', 1, 1, (v: any) => {
  if (Array.isArray(v) || typeof v === 'string') return BigInt(v.length);
  if (v instanceof Map) return BigInt(v.size);
  if (v instanceof PascalDizi) return BigInt(v.veri.length);
  if (v && v.$tensor) return BigInt(v.sekil.length ? v.sekil[0] : 1);
  hata(`Uzunluk tanımsız: ${pyTipAdi(v)}`);
}));
function konumTam(i: any) { if (typeof i !== 'bigint') hata('Ekle: konum tamsayı olmalı'); return i; }
// Ekle(L, x) sona ekler; Ekle(L, x, konum) verilen konuma yerleştirir
ekle(['Ekle'], yf('Ekle', 2, 3, (L: any, a: any, b?: any) => {
  const D = boyutDegisir(L, 'Ekle');
  if (b === undefined) D.push(a); else pyInsert(D, konumTam(b), a);
  return null;
}));
ekle(['Sil'], yf('Sil', 2, 2, (L: any, i: any) => {
  if (L instanceof Map) { L.delete(i); return null; }
  return pyPop(boyutDegisir(L, 'Sil'), i, `Sil: dizin sınır dışı: ${metne(i)}`);
}));
// L.Uzunluk(n) / L.Uzunluk(n, ilk): listeyi n elemanlı, 'ilk' numarasından başlayan sabit boyutlu bir listeye
// çevirir (eski elemanlar korunur, yeniler eleman tipinin varsayılanıyla dolar) ve değişkene geri atar.
$.boyutla = (x: any, args: any[], fab: (() => any) | null, ata: (v: any) => void, ham: string) => {
  if (!(Array.isArray(x) || x instanceof PascalDizi)) return $.cU(x, 'uzunluk', ham, args);
  const n = args[0], ilk = args.length > 1 ? args[1] : 0n;
  if (typeof n !== 'bigint' || n < 0n) hata('Uzunluk: eleman sayısı sıfır ya da pozitif bir tamsayı olmalı');
  if (typeof ilk !== 'bigint') hata('Uzunluk: ilk eleman numarası tamsayı olmalı');
  const eski: any[] = Array.isArray(x) ? x : x.veri, veri = new Array(Number(n));
  for (let i = 0; i < veri.length; i++) veri[i] = i < eski.length ? eski[i] : (fab ? fab() : null);
  ata(new PascalDizi(ilk, veri));
  return null;
};
// L(2).Sil: L bir liste, dizi ya da sözlükse Sil(L, 2) ile aynıdır; değilse sıradan çağrı ve üye erişimi
$.konumSil = (x: any, i: any) => {
  if (Array.isArray(x) || x instanceof PascalDizi || x instanceof Map) return Y.sil(x, i);
  return $.cU(cagir(x, [i]), 'sil', 'Sil', []);
};
ekle(['Araya'], yf('Araya', 0, 64, () => hata("'Araya' kaldırıldı; şöyle yazın: Ekle(L, x, konum)")));
ekle(['Aralık'], yf('Aralık', 1, 3, aralikListe));
ekle(['Eşle'], yf('Eşle', 2, 2, (L: any, f: any) => yinele(L).map(x => cagir(f, [x]))));
ekle(['Süz'], yf('Süz', 2, 2, (L: any, f: any) => yinele(L).filter(x => cagir(f, [x]) === true)));
ekle(['İndirge'], yf('İndirge', 2, 3, indirge));
ekle(['Sırala'], yf('Sırala', 1, 3, sirala));
ekle(['Ters'], yf('Ters', 1, 1, (L: any) => typeof L === 'string' ? [...L].reverse().join('') : yinele(L).reverse()));
ekle(['Toplam'], yf('Toplam', 1, 1, toplam));
ekle(['Maks'], yf('Maks', 1, null, (...a: any[]) => uc(a, true, 'Maks')));
ekle(['Min'], yf('Min', 1, null, (...a: any[]) => uc(a, false, 'Min')));
ekle(['Eşleştir'], yf('Eşleştir', 2, null, (...ler: any[]) => {
  const ls = ler.map(yinele);
  const n = Math.min(...ls.map(l => l.length));
  return Array.from({ length: n }, (_, i) => ls.map(l => l[i]));
}));
ekle(['Numaralandır'], yf('Numaralandır', 1, 1, (L: any) => yinele(L).map((x, i) => [BigInt(i), x])));
ekle(['Dilim'], yf('Dilim', 2, 3, (L: any, a: any, b: any = null) => {
  if (L instanceof PascalDizi) L = L.veri;
  if (!Array.isArray(L) && typeof L !== 'string') hata('Dilim liste veya metin bekler');
  const [x, y] = pyDilim(L.length, a, b);
  return L.slice(x, y);
}));
ekle(['Kopya'], yf('Kopya', 1, 1, (v: any) => {
  if (v instanceof YNesne) return Object.assign(Object.create(Object.getPrototypeOf(v)), v);
  if (Array.isArray(v)) return v.every(basit) ? derinKopya(v) : v.slice();
  if (v instanceof Map) return [...v.values()].every(basit) ? derinKopya(v) : new Map(v);
  return v;
}));
const mapGerek = (s: any) => { if (!(s instanceof Map)) hata(`İç hata: AttributeError: '${pyTipAdi(s)}' object has no attribute 'keys'`); return s; };
ekle(['Anahtarlar'], yf('Anahtarlar', 1, 1, (s: any) => [...mapGerek(s).keys()]));
ekle(['Değerler'], yf('Değerler', 1, 1, (s: any) => [...mapGerek(s).values()]));
ekle(['İçerir'], yf('İçerir', 2, 2, (c: any, v: any) => $.icinde(v, c)));
ekle(['Benzersiz'], yf('Benzersiz', 1, 1, (L: any) => {
  const gor = new Set<any>(), out: any[] = [];
  for (const x of yinele(L)) { const a = anahtarNorm(x); if (!gor.has(a)) { gor.add(a); out.push(x); } }
  return out;
}));
ekle(['Say'], yf('Say', 1, 1, (L: any) => {
  const out = new Map<any, any>();
  for (const x of yinele(L)) out.set(x, (out.get(x) ?? 0n) + 1n);
  return out;
}));

// ---- metin
ekle(['AltMetin', 'Kopyala'], yf('AltMetin', 2, 3, altMetin));
ekle(['Konum'], yf('Konum', 2, 2, (alt: string, s: string) => BigInt(s.indexOf(alt) + 1)));
ekle(['BüyükHarf'], yf('BüyükHarf', 1, 1, buyukHarf));
ekle(['KüçükHarf'], yf('KüçükHarf', 1, 1, kucukHarf));
ekle(['Ayır'], yf('Ayır', 1, 2, (s: string, a: any = null) => pySplit(s, a)));
ekle(['Birleştir'], yf('Birleştir', 1, 2, (L: any, a: string = '') => yinele(L).map(metne).join(a)));
ekle(['Kırp'], yf('Kırp', 1, 1, pyStrip));
ekle(['Değiştir'], yf('Değiştir', 3, 3, (s: string, a: string, b: string) => s.split(a).join(b)));
ekle(['Biçimle'], yf('Biçimle', 1, null, bicimle));
ekle(['Sıra'], yf('Sıra', 1, 1, (c: any) => {
  if (typeof c === 'boolean') return c ? 1n : 0n;
  if (typeof c !== 'string' || [...c].length !== 1) hata('Sıra tek karakter bekler');
  return BigInt(c.codePointAt(0));
}));
ekle(['Karakter'], yf('Karakter', 1, 1, (n: any) => String.fromCodePoint(Number(n))));
ekle(['HarfMi'], yf('HarfMi', 1, 1, (c: any) => typeof c === 'string' && c !== '' && /^[\p{L}\p{Nl}]+$/u.test(c)));
ekle(['RakamMı'], yf('RakamMı', 1, 1, (c: any) => typeof c === 'string' && c !== '' && /^\p{Nd}+$/u.test(c)));

// ---- sayısal
ekle(['Mutlak'], yf('Mutlak', 1, 1, (x: any) => { x = sayi(x); return typeof x === 'bigint' ? bigAbs(x) : Math.abs(x); }));
ekle(['Kare'], yf('Kare', 1, 1, (x: any) => $.carp(x, x)));
ekle(['Kök'], yf('Kök', 1, 1, (x: any) => {
  if (x && x.$tensor) return x.kok();
  const v = sayiN(x);
  if (v < 0) hata('Negatif sayının karekökü alınamaz');
  return Math.sqrt(v);
}));
ekle(['Yuvarla'], yf('Yuvarla', 1, 2, (x: any, basamak: any = null) => {
  x = sayi(x);
  if (basamak === null) {
    if (typeof x === 'bigint') return x;
    return x >= 0 ? pyTrunc(Math.floor(x + 0.5)) : -pyTrunc(Math.floor(-x + 0.5));
  }
  const n = Number(basamak);
  if (typeof x === 'bigint') {
    if (n >= 0) return x;
    const k = 10n ** BigInt(-n);
    let q = x / k, r = x % k;
    if (r < 0n) { r += k; q -= 1n; }
    if (2n * r > k || (2n * r === k && (q & 1n) === 1n)) q += 1n;
    return q * k;
  }
  return yuvarlaBasamak(x, n);
}));
ekle(['Kes'], yf('Kes', 1, 1, (x: any) => { x = sayi(x); return typeof x === 'bigint' ? x : pyTrunc(x); }));
ekle(['Rastgele'], yf('Rastgele', 0, 2, (a: any = null, b: any = null) => {
  if (a === null) return rng.random();
  if (b === null) return rng.randrange(a);
  return rng.randint(a, b);
}, true));
ekle(['Rastgeleleştir'], yf('Rastgeleleştir', 0, 1, (n: any = null) => {
  rng.seed(n);
  if ($.yzRng) $.yzRng.seed(n);
  return null;
}, true));
ekle(['Artır'], yf('Artır', 1, 2, (r: any, n: any = 1n) => { refGerek(r); r.ata($.top(r.al(), n)); return null; }, false, [0]));
ekle(['Azalt'], yf('Azalt', 1, 2, (r: any, n: any = 1n) => { refGerek(r); r.ata($.cik(r.al(), n)); return null; }, false, [0]));
ekle(['Değiş'], yf('Değiş', 2, 2, (a: any, b: any) => {
  refGerek(a); refGerek(b);
  const va = a.al(), vb = b.al();
  a.ata(vb); b.ata(va);
  return null;
}, false, [0, 1]));
function refGerek(r: any) { if (!(r instanceof YRef)) hata('Referans (değişken) parametreye yalnızca değişken verilebilir'); }

// ---- hata ve denetim
ekle(['Hata'], yf('Hata', 1, 2, (mesaj: any, tur: any = 'Hata') => new HataNesnesi(metne(mesaj), tur)));
ekle(['İddia'], yf('İddia', 1, 2, (kosul: any, mesaj: any = 'İddia başarısız') => {
  if (kosul !== true) {
    const e = $.hataOlustur(`İddia başarısız: ${metne(mesaj)}`);
    e.deger = new HataNesnesi(metne(mesaj), 'İddiaHatası');
    throw e;
  }
  return null;
}));
ekle(['Durdur'], yf('Durdur', 0, 1, (kod: any = 0n) => { throw new DurSinyali(Number(kod)); }, true));
ekle(['Çağır'], yf('Çağır', 1, null, (f: any, ...a: any[]) => cagir(f, a)));
ekle(['ParametreSayısı'], yf('ParametreSayısı', 0, 0, () => BigInt(($.konak.argumanlar || []).length), true));
ekle(['Parametre'], yf('Parametre', 1, 1, (i: any) => {
  const a = $.konak.argumanlar || [];
  if (i === 0n) return 'yontem';
  return (i >= 1n && i <= BigInt(a.length)) ? a[Number(i) - 1] : '';
}));
Y.pi = Math.PI;

// ================================================================ tür metodları
function m(ad: string, enAz: number, enCok: number | null, f: (o: any, ...a: any[]) => any, oto = false) {
  return (o: any) => {
    const g = (...a: any[]) => {
      const n = a.length;
      if (n < enAz || (enCok !== null && n > enCok)) hata(`'${ad}' metodu ${enAz}..${enCok === null ? 'None' : enCok} argüman bekler, ${n} verildi`);
      return f(o, ...a);
    };
    return fn(g, ad, enCok === null ? 999 : enCok, enAz, [], oto);
  };
}
function tablo(t: Record<string, any>, ad: string, u: any) { t[katla(ad)] = u; }
const L: Record<string, any> = {}, S: Record<string, any> = {}, M: Record<string, any> = {}, D: Record<string, any> = {};
const B = (v: any) => BigInt(v);
tablo(L, 'Uzunluk', m('Uzunluk', 0, null, o => B(o.length), true));
tablo(L, 'Ekle', m('Ekle', 1, 2, (o, a, b?: any) => { if (b === undefined) o.push(a); else pyInsert(o, konumTam(b), a); return null; }));
tablo(L, 'Çıkar', m('Çıkar', 0, 1, (o, i = -1n) => { if (!o.length) hata('Boş listeden çıkarılamaz'); return pyPop(o, i, null); }, true));
tablo(L, 'Sil', m('Sil', 1, 1, (o, i) => pyPop(o, i, null)));
tablo(L, 'Araya', m('Araya', 0, 64, () => hata("'Araya' kaldırıldı; şöyle yazın: L.Ekle(x, konum)")));
tablo(L, 'Temizle', m('Temizle', 0, null, o => { o.length = 0; return null; }, true));
tablo(L, 'Bul', m('Bul', 1, 1, (o, v) => { const i = o.findIndex((x: any) => esit(x, v)); return B(i); }));
tablo(L, 'İçerir', m('İçerir', 1, 1, (o, v) => o.some((x: any) => esit(x, v))));
tablo(L, 'Sırala', m('Sırala', 0, 2, (o, a = null, t = false) => sirala(o, a, t), true));
tablo(L, 'Ters', m('Ters', 0, null, o => o.slice().reverse(), true));
tablo(L, 'Kopya', m('Kopya', 0, null, o => o.slice(), true));
tablo(L, 'Eşle', m('Eşle', 1, 1, (o, f) => o.map((x: any) => cagir(f, [x]))));
tablo(L, 'Süz', m('Süz', 1, 1, (o, f) => o.filter((x: any) => cagir(f, [x]) === true)));
tablo(L, 'İndirge', m('İndirge', 1, 2, (o, f, b = null) => indirge(o, f, b)));
tablo(L, 'Toplam', m('Toplam', 0, null, o => toplam(o), true));
tablo(L, 'Birleştir', m('Birleştir', 0, 1, (o, a = '') => o.map(metne).join(a), true));
tablo(L, 'Dilim', m('Dilim', 1, 2, (o, a, b = null) => { const [x, y] = pyDilim(o.length, a, b); return o.slice(x, y); }));
tablo(L, 'İlk', m('İlk', 0, null, o => o.length ? o[0] : null, true));
tablo(L, 'Sonuncu', m('Sonuncu', 0, null, o => o.length ? o[o.length - 1] : null, true));
tablo(L, 'BoşMu', m('BoşMu', 0, null, o => o.length === 0, true));

tablo(S, 'Uzunluk', m('Uzunluk', 0, null, o => B(o.length), true));
tablo(S, 'BüyükHarf', m('BüyükHarf', 0, null, o => buyukHarf(o), true));
tablo(S, 'KüçükHarf', m('KüçükHarf', 0, null, o => kucukHarf(o), true));
tablo(S, 'Ayır', m('Ayır', 0, 1, (o, a = null) => pySplit(o, a), true));
tablo(S, 'Kırp', m('Kırp', 0, null, o => pyStrip(o), true));
tablo(S, 'Değiştir', m('Değiştir', 2, 2, (o, a, b) => o.split(a).join(b)));
tablo(S, 'İçerir', m('İçerir', 1, 1, (o, a) => o.includes(a)));
tablo(S, 'Konum', m('Konum', 1, 1, (o, a) => B(o.indexOf(a) + 1)));
tablo(S, 'BaşlarMı', m('BaşlarMı', 1, 1, (o, a) => o.startsWith(a)));
tablo(S, 'BiterMi', m('BiterMi', 1, 1, (o, a) => o.endsWith(a)));
tablo(S, 'Ters', m('Ters', 0, null, o => [...o].reverse().join(''), true));
tablo(S, 'AltMetin', m('AltMetin', 1, 2, (o, b, u = null) => altMetin(o, b, u)));
tablo(S, 'Karakterler', m('Karakterler', 0, null, o => [...o], true));
tablo(S, 'BoşMu', m('BoşMu', 0, null, o => o.length === 0, true));

tablo(M, 'Uzunluk', m('Uzunluk', 0, null, o => B(o.size), true));
tablo(M, 'Anahtarlar', m('Anahtarlar', 0, null, o => [...o.keys()], true));
tablo(M, 'Değerler', m('Değerler', 0, null, o => [...o.values()], true));
tablo(M, 'Çiftler', m('Çiftler', 0, null, o => [...o.entries()].map(([a, b]) => [a, b]), true));
tablo(M, 'İçerir', m('İçerir', 1, 1, (o, a) => o.has(a)));
tablo(M, 'Al', m('Al', 1, 2, (o, a, v = null) => o.has(a) ? o.get(a) : v));
tablo(M, 'Sil', m('Sil', 1, 1, (o, a) => { const v = o.has(a) ? o.get(a) : null; o.delete(a); return v; }));
tablo(M, 'Temizle', m('Temizle', 0, null, o => { o.clear(); return null; }, true));
tablo(M, 'BoşMu', m('BoşMu', 0, null, o => o.size === 0, true));

tablo(D, 'Uzunluk', m('Uzunluk', 0, null, o => B(o.veri.length), true));
// Boyutu sabitlenmiş liste de bir listedir: okuyan metodlar aynen çalışır, boyutu değiştirenler hata verir
for (const ad of ['İçerir', 'Sırala', 'Ters', 'Kopya', 'Eşle', 'Süz', 'İndirge', 'Toplam', 'Birleştir', 'İlk', 'Sonuncu', 'BoşMu'])
  D[katla(ad)] = (o: PascalDizi) => L[katla(ad)](o.veri);
for (const ad of ['Ekle', 'Sil', 'Çıkar', 'Temizle'])
  tablo(D, ad, m(ad, 0, 64, o => boyutDegisir(o, ad)));
tablo(D, 'Alt', m('Alt', 0, null, o => o.alt, true));
tablo(D, 'Üst', m('Üst', 0, null, o => o.alt + B(o.veri.length) - 1n, true));

$.YONTEMLER.set(Array, L);
$.YONTEMLER.set(String, S);
$.YONTEMLER.set(Map, M);
$.YONTEMLER.set(PascalDizi, D);

// ================================================================ Matematik birimi
function matematik() {
  const U: Record<string, any> = { $ad: 'Matematik' };
  const tekli = (ad: string, f: (x: number) => any, tensorYontem: string | null = null, tanim?: (x: number) => boolean) => {
    U[katla(ad)] = fn((...a: any[]) => {
      if (a.length !== 1) hata(`'${ad}' 1 argüman bekler`);
      const x = a[0];
      if (x && x.$tensor && tensorYontem) return x[tensorYontem]();
      const v = sayi(x, ad);
      const n = Number(v);
      if (tanim && !tanim(n)) hata(`'${ad}' bu değer için tanımsız: ${metne(x)}`);
      return f(n);
    }, ad, 1, 1);
  };
  const tamsayiya = (x: number) => {
    if (Number.isNaN(x)) hata('İç hata: ValueError: cannot convert float NaN to integer');
    if (!Number.isFinite(x)) hata('Sayısal taşma');
    return BigInt(x);
  };
  tekli('Sin', Math.sin, 'sin', x => Number.isFinite(x));
  tekli('Cos', Math.cos, 'cos', x => Number.isFinite(x));
  tekli('Tan', Math.tan, null, x => Number.isFinite(x));
  tekli('ArkSin', Math.asin, null, x => x >= -1 && x <= 1);
  tekli('ArkCos', Math.acos, null, x => x >= -1 && x <= 1);
  tekli('ArkTan', Math.atan);
  tekli('Ln', Math.log, 'log', x => x > 0);
  tekli('Log10', Math.log10, null, x => x > 0);
  tekli('Log2', Math.log2, null, x => x > 0);
  tekli('Üstel', x => Math.exp(Math.min(x, 709.0)), 'us');
  tekli('Taban', x => tamsayiya(Math.floor(x)));
  tekli('Tavan', x => tamsayiya(Math.ceil(x)));
  tekli('Tanh', Math.tanh, 'tanh');
  tekli('Sigmoid', x => x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x)), 'sigmoid');
  tekli('Faktöriyel', x => { let r = 1n; for (let i = 2n; i <= BigInt(Math.trunc(x)); i++) r *= i; return r; }, null, x => x >= 0);
  U.kok = Y.kok; U.mutlak = Y.mutlak; U.yuvarla = Y.yuvarla; U.maks = Y.maks; U.min = Y.min; U.rastgele = Y.rastgele;
  U.pi = Math.PI; U.e = Math.E; U.sonsuz = Infinity;
  U.us = yf('Üs', 2, 2, (a: any, b: any) => $.us(a, b));
  U.arktan2 = yf('ArkTan2', 2, 2, (a: any, b: any) => Math.atan2(Number(a), Number(b)));
  U.ebob = yf('EBOB', 2, 2, (a: any, b: any) => {
    if (typeof a !== 'bigint' || typeof b !== 'bigint') hata("İç hata: TypeError: 'float' object cannot be interpreted as an integer");
    a = bigAbs(a); b = bigAbs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
  });
  U.kombinasyon = yf('Kombinasyon', 2, 2, (n: any, r: any) => {
    if (r < 0n || n < 0n) hata('İç hata: ValueError: n must be a non-negative integer');
    if (r > n) return 0n;
    let s = 1n;
    for (let i = 1n; i <= r; i++) s = s * ((n as bigint) - (r as bigint) + i) / i;
    return s;
  });
  U.normal = yf('Normal', 0, 2, (ort: any = 0.0, sapma: any = 1.0) => rng.gauss(Number(ort), Number(sapma)), true);
  U.rastgelesec = yf('RastgeleSeç', 1, 1, (L: any) => {
    const l = yinele(L);
    if (!l.length) hata('Boş listeden seçilemez');
    return rng.choice(l);
  });
  U.karistir = yf('Karıştır', 1, 1, (L: any) => { rng.shuffle(liste(L)); return L; });
  U.tohum = yf('Tohum', 1, 1, (n: any) => { rng.seed(n); if ($.yzRng) $.yzRng.seed(n); if ($.mRng) $.mRng.seed(n); return null; });
  return U;
}

// ================================================================ Sistem birimi
function sistem() {
  const U: Record<string, any> = { $ad: 'Sistem' };
  const iki = (n: number) => String(n).padStart(2, '0');
  U.zaman = yf('Zaman', 0, 0, () => Date.now() / 1000, true);
  U.saat = yf('Saat', 0, 0, () => { const d = new Date(); return `${iki(d.getHours())}:${iki(d.getMinutes())}:${iki(d.getSeconds())}`; }, true);
  U.tarih = yf('Tarih', 0, 0, () => { const d = new Date(); return `${iki(d.getDate())}.${iki(d.getMonth() + 1)}.${d.getFullYear()}`; }, true);
  U.bekle = yf('Bekle', 1, 1, (ms: any) => {
    const n = Number(ms);
    if (typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined') {
      try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n); return null; } catch (e) { /* tarayıcı ana iş parçacığı */ }
    }
    const son = Date.now() + Math.min(n, 2000);
    while (Date.now() < son) { /* bekle */ }
    return null;
  });
  const dosyaOku = (yol: string) => {
    if (!$.konak.dosyaOku) hata(`Dosya okunamadı: ${yol} (bu ortamda dosya erişimi yok)`);
    try { return $.konak.dosyaOku(yol); }
    catch (e: any) { hata(`Dosya okunamadı: ${yol} (${e.strerror || e.message})`); }
  };
  U.dosyaoku = yf('DosyaOku', 1, 1, dosyaOku);
  U.dosyayaz = yf('DosyaYaz', 2, 3, (yol: string, icerik: any, ekle: any = false) => {
    if (!$.konak.dosyaYaz) hata(`Dosya yazılamadı: ${yol} (bu ortamda dosya erişimi yok)`);
    try { $.konak.dosyaYaz(yol, metne(icerik), ekle === true); }
    catch (e: any) { hata(`Dosya yazılamadı: ${yol} (${e.strerror || e.message})`); }
    return null;
  });
  U.dosyavarmi = yf('DosyaVarMı', 1, 1, (yol: string) => $.konak.dosyaVarMi ? $.konak.dosyaVarMi(yol) : false);
  U.satirlar = yf('Satırlar', 1, 1, (yol: string) => splitlines(dosyaOku(yol)));
  U.ortam = yf('Ortam', 1, 2, (ad: string, v: any = '') => { const r = $.konak.ortam ? $.konak.ortam(ad) : undefined; return r === undefined ? v : r; });
  U.argumanlar = yf('Argümanlar', 0, 0, () => ($.konak.argumanlar || []).slice(), true);
  return U;
}

// ================================================================ Veri birimi
function otomatikSayi(s: string): any {
  const i = pyIntParse(s);
  if (i !== null) return i;
  const f = pyFloatParse(s);
  return f === null ? s : f;
}
function csvAyristir(metin: string, ayrac: string): string[][] {
  const satirlar: string[][] = [];
  let alan = '', satir: string[] = [], tirnak = false, i = 0, alanVar = false;
  while (i < metin.length) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"') { if (metin[i + 1] === '"') { alan += '"'; i++; } else tirnak = false; }
      else alan += c;
    } else if (c === '"' && alan === '') { tirnak = true; alanVar = true; }
    else if (c === ayrac) { satir.push(alan); alan = ''; alanVar = true; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && metin[i + 1] === '\n') i++;
      if (alanVar || alan !== '' || satir.length) satir.push(alan);
      satirlar.push(satir); satir = []; alan = ''; alanVar = false;
    } else { alan += c; alanVar = true; }
    i++;
  }
  if (alanVar || alan !== '' || satir.length) { satir.push(alan); satirlar.push(satir); }
  return satirlar;
}
function csvAlan(s: string, ayrac: string) {
  return (s.includes(ayrac) || s.includes('"') || s.includes('\n') || s.includes('\r')) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function jsonCoz(s: string): any {
  let i = 0;
  const bosluk = () => { while (i < s.length && ' \t\n\r'.includes(s[i])) i++; };
  const hataJ = (m: string) => hata(`Geçersiz JSON: ${m}: line 1 column ${i + 1} (char ${i})`);
  const deger = (): any => {
    bosluk();
    const c = s[i];
    if (c === '{') {
      i++; const m = new Map(); bosluk();
      if (s[i] === '}') { i++; return m; }
      for (;;) {
        bosluk();
        if (s[i] !== '"') hataJ('Expecting property name enclosed in double quotes');
        const a = metinJ(); bosluk();
        if (s[i] !== ':') hataJ("Expecting ':' delimiter");
        i++; m.set(a, deger()); bosluk();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === '}') { i++; return m; }
        hataJ("Expecting ',' delimiter");
      }
    }
    if (c === '[') {
      i++; const l: any[] = []; bosluk();
      if (s[i] === ']') { i++; return l; }
      for (;;) {
        l.push(deger()); bosluk();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === ']') { i++; return l; }
        hataJ("Expecting ',' delimiter");
      }
    }
    if (c === '"') return metinJ();
    if (s.startsWith('true', i)) { i += 4; return true; }
    if (s.startsWith('false', i)) { i += 5; return false; }
    if (s.startsWith('null', i)) { i += 4; return null; }
    if (s.startsWith('NaN', i)) { i += 3; return NaN; }
    if (s.startsWith('Infinity', i)) { i += 8; return Infinity; }
    if (s.startsWith('-Infinity', i)) { i += 9; return -Infinity; }
    const mm = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i));
    if (!mm) hataJ('Expecting value');
    i += mm[0].length;
    return (mm[2] || mm[3]) ? parseFloat(mm[0]) : BigInt(mm[0]);
  };
  const metinJ = () => {
    i++; let r = '';
    for (;;) {
      if (i >= s.length) hataJ('Unterminated string starting at');
      const c = s[i++];
      if (c === '"') return r;
      if (c === '\\') {
        const e = s[i++];
        if (e === 'u') { r += String.fromCharCode(parseInt(s.slice(i, i + 4), 16)); i += 4; }
        else r += ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' } as any)[e] ?? e;
      } else r += c;
    }
  };
  const v = deger(); bosluk();
  if (i < s.length) hataJ('Extra data');
  return v;
}
export function jsonIcin(v: any): any {
  if (Array.isArray(v)) return v.map(jsonIcin);
  if (v instanceof PascalDizi) return v.veri.map(jsonIcin);
  if (v instanceof Map) { const m = new Map(); v.forEach((b, a) => m.set(metne(a), jsonIcin(b))); return m; }
  if (v instanceof YNesne) {
    const m = new Map();
    for (const k of Object.keys(v)) if (k.startsWith('f_')) m.set(k.slice(2), jsonIcin((v as any)[k]));
    return m;
  }
  const t = typeof v;
  if (t === 'bigint' || t === 'number' || t === 'string' || t === 'boolean' || v === null) return v;
  if (v && v.$tensor) return v.liste();
  return metne(v);
}
function jsonMetin(s: string) {
  let r = '"';
  for (const c of s) {
    const k = c.codePointAt(0);
    if (c === '"') r += '\\"';
    else if (c === '\\') r += '\\\\';
    else if (c === '\n') r += '\\n';
    else if (c === '\r') r += '\\r';
    else if (c === '\t') r += '\\t';
    else if (c === '\b') r += '\\b';
    else if (c === '\f') r += '\\f';
    else if (k < 0x20) r += '\\u' + k.toString(16).padStart(4, '0');
    else r += c;
  }
  return r + '"';
}
export function jsonYap(v: any, girinti: number | null, d = 0): string {
  const t = typeof v;
  if (v === null) return 'null';
  if (t === 'boolean') return v ? 'true' : 'false';
  if (t === 'bigint') return v.toString();
  if (t === 'number') return Number.isNaN(v) ? 'NaN' : v === Infinity ? 'Infinity' : v === -Infinity ? '-Infinity' : metne(v);
  if (t === 'string') return jsonMetin(v);
  const ic = girinti === null ? '' : '\n' + ' '.repeat(girinti * (d + 1));
  const dis = girinti === null ? '' : '\n' + ' '.repeat(girinti * d);
  const ayr = girinti === null ? ', ' : ',';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return '[' + v.map(x => ic + jsonYap(x, girinti, d + 1)).join(ayr) + dis + ']';
  }
  if (v instanceof Map) {
    if (!v.size) return '{}';
    const p: string[] = [];
    v.forEach((b, a) => p.push(ic + jsonMetin(String(a)) + ': ' + jsonYap(b, girinti, d + 1)));
    return '{' + p.join(ayr) + dis + '}';
  }
  return jsonMetin(String(v));
}
function veri() {
  const U: Record<string, any> = { $ad: 'Veri' };
  U.csvoku = yf('CSVOku', 1, 3, (yol: string, baslikli: any = true, ayrac: string = ',') => {
    let metin: string;
    try {
      if (!$.konak.dosyaOku) throw new Error('bu ortamda dosya erişimi yok');
      metin = $.konak.dosyaOku(yol);
    } catch (e: any) { hata(`CSV okunamadı: ${yol} (${e.strerror || e.message})`); }
    const satirlar = csvAyristir(metin, ayrac).filter(s => s.length);
    if (baslikli !== true) return satirlar.map(s => s.map(otomatikSayi));
    const b = satirlar[0];
    return satirlar.slice(1).map(s => {
      const mm = new Map();
      for (let i = 0; i < Math.min(b.length, s.length); i++) mm.set(b[i], otomatikSayi(s[i]));
      return mm;
    });
  });
  U.csvyaz = yf('CSVYaz', 2, 3, (yol: string, kayitlar: any, ayrac: string = ',') => {
    const satir = (l: string[]) => l.map(x => csvAlan(x, ayrac)).join(ayrac) + '\r\n';
    let out = '';
    if (kayitlar.length && kayitlar[0] instanceof Map) {
      const b = [...kayitlar[0].keys()];
      out += satir(b.map(metne));
      for (const r of kayitlar) out += satir(b.map(k => metne(r.has(k) ? r.get(k) : '')));
    } else for (const r of kayitlar) out += satir(yinele(r).map(metne));
    if (!$.konak.dosyaYaz) hata(`Dosya yazılamadı: ${yol} (bu ortamda dosya erişimi yok)`);
    $.konak.dosyaYaz(yol, out, false);
    return null;
  });
  U.jsoncoz = yf('JSONÇöz', 1, 1, jsonCoz);
  U.jsonyap = yf('JSONYap', 1, 2, (v: any, g: any = null) => jsonYap(jsonIcin(v), g === null ? null : Number(g)));
  U.sutun = yf('Sütun', 2, 2, (kayitlar: any, ad: any) => yinele(kayitlar).map(r => $.indeks(r, ad)));
  U.minmaksolcekle = yf('MinMaksÖlçekle', 1, 1, (Lx: any) => {
    const l = yinele(Lx).map(Number);
    const a = Math.min(...l), b = Math.max(...l);
    return l.map(x => b === a ? 0.0 : (x - a) / (b - a));
  });
  U.standartlastir = yf('Standartlaştır', 1, 1, (Lx: any) => {
    const l = yinele(Lx).map(Number);
    let t = 0; for (const x of l) t += x;
    const mm = t / l.length;
    let v = 0; for (const x of l) v += (x - mm) ** 2;
    const s = Math.sqrt(v / l.length) || 1.0;
    return l.map(x => (x - mm) / s);
  });
  U.egitimtestbol = yf('EğitimTestBöl', 2, 4, (X: any, Yv: any, oran: any = 0.2, tohum: any = null) => {
    const xs = yinele(X), ys = yinele(Yv);
    if (xs.length !== ys.length) hata('EğitimTestBöl: X ve Y aynı uzunlukta olmalı');
    const idx = xs.map((_, i) => i);
    new PyRandom(tohum).shuffle(idx);
    const nTest = Number(yuvarlaBasamak(xs.length * Number(oran), 0));
    const te = idx.slice(0, nTest), tr = idx.slice(nTest);
    return [tr.map(i => xs[i]), tr.map(i => ys[i]), te.map(i => xs[i]), te.map(i => ys[i])];
  });
  return U;
}

$.yerelBirimler.set('matematik', matematik);
$.yerelBirimler.set('sistem', sistem);
$.yerelBirimler.set('veri', veri);

export { temsil };
