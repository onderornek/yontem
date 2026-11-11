// Gömülü (C++) arka uç için statik tipler.
export type Tip =
  | { k: 'tam' } | { k: 'ond' } | { k: 'metin' } | { k: 'mant' } | { k: 'yok' } | { k: 'bos' }
  | { k: 'tensor' } | { k: 'hata' }
  | { k: 'liste'; e: Tip }
  | { k: 'dizi'; e: Tip; alt: string; ust: string }
  | { k: 'sinif'; s: SinifC }
  | { k: 'sozluk'; a: Tip; d: Tip }
  | { k: 'fonk'; p: Tip[]; d: Tip; ref?: boolean[] }
  | { k: 'deg'; r: TipDeg };

/** Çıkarım bekleyen tip değişkeni (ör. 'liste' olarak bildirilen değişkenin öğe tipi) */
export interface TipDeg { id: number; t: Tip | null; sayisal: boolean; aciklama: string }
let degSayac = 0;
export function yeniDeg(aciklama: string): Tip { return { k: 'deg', r: { id: ++degSayac, t: null, sayisal: false, aciklama } }; }
/** tip değişkenlerini izleyerek gerçek tipe ulaşır */
export function coz(t: Tip): Tip {
  while (t.k === 'deg' && t.r.t) t = t.r.t;
  return t;
}

export interface MetodC {
  ad: string; ham: string; params: { ad: string; ham: string; tip: Tip; ref: boolean; varsayilan: any }[];
  donus: Tip; kurucu: boolean; sinif: SinifC; govdeli: boolean;
}
export interface SinifC {
  ad: string; ham: string; cpp: string; kayit: boolean; ebeveyn: SinifC | null;
  alanlar: Map<string, { ham: string; tip: Tip; ilk: any }>;
  alanSira: string[];
  metodlar: Map<string, MetodC>;
}

export const TAM: Tip = { k: 'tam' }, OND: Tip = { k: 'ond' }, METIN: Tip = { k: 'metin' }, MANT: Tip = { k: 'mant' };
export const YOK: Tip = { k: 'yok' }, BOS: Tip = { k: 'bos' }, TENSOR: Tip = { k: 'tensor' }, HATA: Tip = { k: 'hata' };
export const liste = (e: Tip): Tip => ({ k: 'liste', e });

export function sayiMi(t: Tip) { t = coz(t); return t.k === 'tam' || t.k === 'ond'; }

export function tipAdi(t: Tip): string {
  t = coz(t);
  switch (t.k) {
    case 'deg': return 'henüz bilinmeyen tip';
    case 'sozluk': return 'sözlük';
    case 'tam': return 'tamsayı';
    case 'ond': return 'ondalık';
    case 'metin': return 'metin';
    case 'mant': return 'mantıksal';
    case 'yok': return 'değer döndürmeyen prosedür';
    case 'bos': return 'boş';
    case 'tensor': return 'tensör';
    case 'hata': return 'hata';
    case 'liste': return `${tipAdi(t.e)} dizisi`;
    case 'dizi': return `${tipAdi(t.e)} dizisi[..]`;
    case 'sinif': return t.s.ham;
    case 'fonk': return 'fonksiyon';
  }
}

export function cppTip(t: Tip): string {
  t = coz(t);
  switch (t.k) {
    case 'deg': return `@@T${t.r.id}@@`;
    case 'sozluk': return `y::Sozluk<${cppTip(t.a)}, ${cppTip(t.d)}>`;
    case 'tam': return 'y::Tam';
    case 'ond': return 'y::Ond';
    case 'metin': return 'y::Metin';
    case 'mant': return 'bool';
    case 'yok': return 'void';
    case 'bos': return 'std::nullptr_t';
    case 'tensor': return 'y::Tensor';
    case 'hata': return 'y::HataN';
    case 'liste': return `y::Liste<${cppTip(t.e)}>`;
    case 'dizi': return `y::Dizi<${cppTip(t.e)}>`;
    case 'sinif': return t.s.kayit ? t.s.cpp : `y::Ref<${t.s.cpp}>`;
    case 'fonk': return `std::function<${cppTip(t.d)}(${t.p.map((p, i) => cppTip(p) + (t.ref && t.ref[i] ? '&' : '')).join(', ')})>`;
  }
}

/** Tip eşitliği; tip değişkenleri karşılaşırsa birleştirilir */
export function ayni(a: Tip, b: Tip): boolean {
  a = coz(a); b = coz(b);
  if (a === b) return true;
  if (a.k === 'deg' || b.k === 'deg') return birlestir(a, b);
  if (a.k !== b.k) return false;
  if (a.k === 'liste' || a.k === 'dizi') return ayni(a.e, (b as any).e);
  if (a.k === 'sozluk') return ayni(a.a, (b as any).a) && ayni(a.d, (b as any).d);
  if (a.k === 'sinif') return a.s === (b as any).s;
  if (a.k === 'fonk') { const f = b as any; return a.p.length === f.p.length && a.p.every((p, i) => ayni(p, f.p[i])) && ayni(a.d, f.d); }
  return true;
}

export function turevMi(s: SinifC, ust: SinifC): boolean {
  for (let c: SinifC | null = s; c; c = c.ebeveyn) if (c === ust) return true;
  return false;
}

function icindeMi(r: TipDeg, t: Tip): boolean {
  t = coz(t);
  if (t.k === 'deg') return t.r === r;
  if (t.k === 'liste' || t.k === 'dizi') return icindeMi(r, t.e);
  if (t.k === 'sozluk') return icindeMi(r, t.a) || icindeMi(r, t.d);
  return false;
}
/** a ve b'yi birleştirir (biri tip değişkeni olmalı) */
export function birlestir(a: Tip, b: Tip): boolean {
  a = coz(a); b = coz(b);
  if (a === b) return true;
  if (a.k === 'deg' && b.k === 'deg') { a.r.t = b; b.r.sayisal = b.r.sayisal || a.r.sayisal; return true; }
  if (a.k !== 'deg') { const t = a; a = b; b = t; }
  const r = (a as any).r as TipDeg;
  if (icindeMi(r, b)) return false;
  if (r.sayisal && !sayiMi(b)) return false;
  r.t = b;
  return true;
}
/** Tip değişkeni sayısal olarak işaretlenir (çözülmezse ondalık olur) */
export function sayisalIsaretle(t: Tip) { t = coz(t); if (t.k === 'deg') t.r.sayisal = true; }
