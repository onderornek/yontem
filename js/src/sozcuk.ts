// Yöntem sözcük çözümleyici (lexer). Python sürümüyle aynı davranır.
import { SozdizimHatasi } from './hatalar';

const TR: Record<string, string> = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };

/** Tanımlayıcıyı karşılaştırma için normalleştirir (büyük/küçük harf ve Türkçe harf duyarsız). */
export function katla(s: string): string {
  s = s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  let out = '';
  for (const c of s) out += TR[c] ?? c;
  return out;
}

export const ANAHTAR = new Set([
  'program', 'birim', 'kullan', 'arayuz', 'uygulama',
  'degisken', 'sabit', 'tip', 'prosedur', 'fonksiyon', 'kurucu',
  'basla', 'bitir', 'eger', 'ise', 'degilse', 'iken', 'icin', 'kadar',
  'azalarak', 'her', 'icinde', 'icindeki', 'tekrarla', 'dene', 'yakala',
  'sonunda', 'firlat', 'don', 'cik', 'kir', 'devam', 'sinif', 'kayit',
  'miras', 'kendi', 'dogru', 'yanlis', 'bos', 've', 'veya', 'yada', 'degil',
  'mod', 'bol', 'dizi', 'turunde',
]);

const OPS = [':=', '+=', '-=', '*=', '/=', '**', '<>', '<=', '>=', '..', '|>', '=>',
  '+', '-', '*', '/', '@', '=', '<', '>', '(', ')', '[', ']', ',', ';', ':', '.', '^'];

const EK_AYRILMA = new Set(['den', 'dan', 'ten', 'tan', 'nden', 'ndan']);
const EK_YONELME = new Set(['e', 'a', 'ye', 'ya', 'ne', 'na']);
const KESME = "'’";
const HEX = /[0-9a-fA-F]/;
const KACIS: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'", '0': '\0' };

export type SozcukTipi = 'AD' | 'AS' | 'SAYI' | 'METIN' | 'BMETIN' | 'OP' | 'SONEK' | 'SON';

/** Biçimli metnin ($'...{ifade}...') bir parçası: düz metin ya da yerleştirilecek ifadenin kaynağı */
export type MetinParcasi = string | { kaynak: string; ozel: string | null; satir: number; sutun: number };

/** Çok satırlı metnin içeriği: açılıştan hemen sonraki ve kapanıştan hemen önceki boş satır atılır,
 *  satırların ortak girintisi silinir. */
export function cokSatirliIcerik(ham: string): string {
  const satirlar = ham.replace(/\r\n?/g, '\n').split('\n');
  const bos = (s: string) => /^[ \t]*$/.test(s);
  if (satirlar.length > 1 && bos(satirlar[0])) satirlar.shift();
  if (satirlar.length > 1 && bos(satirlar[satirlar.length - 1])) satirlar.pop();
  let ortak = Infinity;
  for (const s of satirlar) if (!bos(s)) ortak = Math.min(ortak, /^[ \t]*/.exec(s)![0].length);
  if (!Number.isFinite(ortak)) ortak = 0;
  return satirlar.map(s => bos(s) ? '' : s.slice(ortak)).join('\n');
}

/** Biçimli metnin içeriğini parçalara ayırır: {{ ve }} tek ayraç, {ifade} ya da {ifade:biçim} yerleştirme */
export function bicimliParcala(icerik: string, hata: (m: string) => never, satir: number, sutun: number): MetinParcasi[] {
  const parcalar: MetinParcasi[] = [];
  let buf = '', i = 0;
  const n = icerik.length;
  while (i < n) {
    const c = icerik[i];
    if (c === '{' && icerik[i + 1] === '{') { buf += '{'; i += 2; continue; }
    if (c === '}' && icerik[i + 1] === '}') { buf += '}'; i += 2; continue; }
    if (c === '}') hata("Biçimli metinde tek '}' var; ayracın kendisi için '}}' yazın");
    if (c !== '{') { buf += c; i++; continue; }
    // eşleşen '}': iç içe ayraçlar ve ifadedeki metinler atlanır
    let j = i + 1, derinlik = 0, ikiNokta = -1;
    for (;; j++) {
      if (j >= n) hata("Biçimli metinde kapanmamış '{'; ayracın kendisi için '{{' yazın");
      const d = icerik[j];
      if (d === "'" || d === '"') { const k = icerik.indexOf(d, j + 1); if (k < 0) hata('Biçimli metindeki ifadede kapanmamış metin'); j = k; continue; }
      if (d === '{' || d === '(' || d === '[') derinlik++;
      else if (d === ')' || d === ']') derinlik--;
      else if (d === '}') { if (derinlik === 0) break; derinlik--; }
      else if (d === ':' && derinlik === 0) ikiNokta = j;
    }
    let kaynak = icerik.slice(i + 1, j), ozel: string | null = null;
    if (ikiNokta >= 0 && /^(?=.)[<>^]?\d*(?:\.\d+)?$/.test(icerik.slice(ikiNokta + 1, j))) {
      ozel = icerik.slice(ikiNokta + 1, j);
      kaynak = icerik.slice(i + 1, ikiNokta);
    }
    if (/^[ \t\n]*$/.test(kaynak)) hata("Biçimli metinde boş '{}'; yerleştirilecek ifadeyi yazın");
    if (buf) { parcalar.push(buf); buf = ''; }
    parcalar.push({ kaynak, ozel, satir, sutun });
    i = j + 1;
  }
  if (buf || !parcalar.length) parcalar.push(buf);
  return parcalar;
}

export interface Sozcuk {
  tip: SozcukTipi;
  deger: any;
  ham: string;
  satir: number;
  sutun: number;
  /** Metin sözcüklerinde: kaynakta bittiği konum (biçimlendirici metinlerin üzerinden atlar) */
  bitis?: number;
}

const harfMi = (c: string) => /\p{L}/u.test(c);
const rakamMi = (c: string) => c >= '0' && c <= '9';
const harfRakamMi = (c: string) => /[\p{L}\p{Nd}_]/u.test(c);

export function sozcukle(kaynak: string, dosya = '<girdi>'): Sozcuk[] {
  const out: Sozcuk[] = [];
  let i = 0;
  const n = kaynak.length;
  let satir = 1, satBas = 0;
  let sonBitis = -1, oncekiAdet = 0;
  const hata = (msg: string, sut?: number): never => {
    throw new SozdizimHatasi(`${msg} (sütun ${sut ?? i - satBas + 1})`, satir, dosya);
  };
  const ekle = (tip: SozcukTipi, deger: any, ham: string, sutun: number) =>
    out.push({ tip, deger, ham, satir, sutun });
  const satirBaslari = [0];
  for (let k = 0; k < n; k++) if (kaynak[k] === '\n') satirBaslari.push(k + 1);
  const satirBaslangici = (no: number) => satirBaslari[no - 1];

  while (i < n) {
    if (out.length !== oncekiAdet) { sonBitis = i; oncekiAdet = out.length; }
    const c = kaynak[i];
    // Ek: sayıya, ada ya da kapanış parantezine bitişik kesme işareti
    if (KESME.includes(c) && sonBitis === i && out.length) {
      const son = out[out.length - 1];
      if (son.tip === 'SAYI' || son.tip === 'AD' || (son.tip === 'OP' && (son.deger === ')' || son.deger === ']'))) {
        let j = i + 1;
        while (j < n && harfMi(kaynak[j])) j++;
        const ek = katla(kaynak.slice(i + 1, j));
        if (EK_AYRILMA.has(ek) || EK_YONELME.has(ek)) {
          ekle('SONEK', EK_AYRILMA.has(ek) ? 'ayrilma' : 'yonelme', kaynak.slice(i, j), i - satBas + 1);
          i = j;
          continue;
        }
      }
    }
    if (c === '\n') { satir++; satBas = i + 1; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '﻿') { i++; continue; }
    // Yorumlar
    if (c === '{' || (c === '(' && kaynak.startsWith('(*', i))) {
      const bitis = c === '{' ? '}' : '*)';
      const j = kaynak.indexOf(bitis, c === '(' ? i + 2 : i + 1);
      if (j < 0) hata('Kapanmamış yorum');
      for (let k = i; k < j; k++) if (kaynak[k] === '\n') { satir++; satBas = k + 1; }
      i = j + bitis.length;
      continue;
    }
    if (c === '/' && kaynak.startsWith('//', i)) {
      const j = kaynak.indexOf('\n', i);
      i = j < 0 ? n : j;
      continue;
    }
    const sutun = i - satBas + 1;
    // Sayılar
    if (rakamMi(c) || (c === '$' && i + 1 < n && HEX.test(kaynak[i + 1]))) {
      if (c === '$') {
        let j = i + 1;
        while (j < n && HEX.test(kaynak[j])) j++;
        ekle('SAYI', BigInt('0x' + kaynak.slice(i + 1, j)), kaynak.slice(i, j), sutun);
        i = j;
        continue;
      }
      let j = i;
      while (j < n && (rakamMi(kaynak[j]) || kaynak[j] === '_')) j++;
      let ondalik = false;
      if (j + 1 < n && kaynak[j] === '.' && rakamMi(kaynak[j + 1])) {
        ondalik = true;
        j++;
        while (j < n && (rakamMi(kaynak[j]) || kaynak[j] === '_')) j++;
      }
      if (j < n && (kaynak[j] === 'e' || kaynak[j] === 'E')) {
        let k = j + 1;
        if (k < n && (kaynak[k] === '+' || kaynak[k] === '-')) k++;
        if (k < n && rakamMi(kaynak[k])) {
          ondalik = true;
          j = k;
          while (j < n && rakamMi(kaynak[j])) j++;
        }
      }
      const ham = kaynak.slice(i, j).replace(/_/g, '');
      ekle('SAYI', ondalik ? parseFloat(ham) : BigInt(ham), ham, sutun);
      i = j;
      continue;
    }
    // Çok satırlı metin: """ ... """ (kaçış yok; ortak girinti silinir)
    const cokSatirli = (bas: number): string => {
      const e = kaynak.indexOf('"""', bas + 3);
      if (e < 0) hata(`Kapanmamış çok satırlı metin; '"""' ile kapatın`, sutun);
      const ham = kaynak.slice(bas + 3, e);
      for (let k = bas; k < e; k++) if (kaynak[k] === '\n') { satir++; satBas = k + 1; }
      i = e + 3;
      return cokSatirliIcerik(ham);
    };
    // Biçimli metin: $'Merhaba {ad}', $"...", $"""..."""
    if (c === '$' && (kaynak[i + 1] === "'" || kaynak[i + 1] === '"')) {
      const basSatir = satir;
      let icerik = '';
      if (kaynak.startsWith('"""', i + 1)) icerik = cokSatirli(i + 1);
      else if (kaynak[i + 1] === "'") {
        let j = i + 2;
        for (;;) {
          if (j >= n || kaynak[j] === '\n') hata('Kapanmamış metin', sutun);
          if (kaynak[j] === "'") { if (kaynak[j + 1] === "'") { icerik += "'"; j += 2; continue; } break; }
          icerik += kaynak[j]; j++;
        }
        i = j + 1;
      } else {
        let j = i + 2;
        for (;;) {
          if (j >= n || kaynak[j] === '\n') hata('Kapanmamış metin', sutun);
          const ch = kaynak[j];
          if (ch === '\\' && j + 1 < n) { icerik += KACIS[kaynak[j + 1]] ?? kaynak[j + 1]; j += 2; continue; }
          if (ch === '"') break;
          icerik += ch; j++;
        }
        i = j + 1;
      }
      const ham = kaynak.slice(satirBaslangici(basSatir) + sutun - 1, i);
      out.push({ tip: 'BMETIN', deger: bicimliParcala(icerik, (m) => hata(m, sutun), basSatir, sutun), ham, satir: basSatir, sutun, bitis: i });
      continue;
    }
    if (c === '"' && kaynak.startsWith('"""', i)) {
      const basSatir = satir;
      const deger = cokSatirli(i);
      out.push({ tip: 'METIN', deger, ham: '', satir: basSatir, sutun, bitis: i });
      continue;
    }
    // Metinler: 'Pascal ''tarzı''' #10 "kaçışlı\n"
    if (c === "'" || c === '#' || c === '"') {
      const parcalar: string[] = [];
      while (i < n && (kaynak[i] === "'" || kaynak[i] === '#' || kaynak[i] === '"') && !kaynak.startsWith('"""', i)) {
        if (kaynak[i] === "'") {
          let j = i + 1;
          let buf = '';
          for (;;) {
            if (j >= n || kaynak[j] === '\n') hata('Kapanmamış metin', sutun);
            if (kaynak[j] === "'") {
              if (j + 1 < n && kaynak[j + 1] === "'") { buf += "'"; j += 2; continue; }
              break;
            }
            buf += kaynak[j]; j++;
          }
          parcalar.push(buf);
          i = j + 1;
        } else if (kaynak[i] === '"') {
          let j = i + 1;
          let buf = '';
          for (;;) {
            if (j >= n || kaynak[j] === '\n') hata('Kapanmamış metin', sutun);
            const ch = kaynak[j];
            if (ch === '\\' && j + 1 < n) { buf += KACIS[kaynak[j + 1]] ?? kaynak[j + 1]; j += 2; continue; }
            if (ch === '"') break;
            buf += ch; j++;
          }
          parcalar.push(buf);
          i = j + 1;
        } else {
          let j = i + 1;
          while (j < n && rakamMi(kaynak[j])) j++;
          if (j === i + 1) hata("'#' sonrası karakter kodu bekleniyordu");
          parcalar.push(String.fromCodePoint(parseInt(kaynak.slice(i + 1, j), 10)));
          i = j;
        }
      }
      out.push({ tip: 'METIN', deger: parcalar.join(''), ham: '', satir, sutun, bitis: i });
      continue;
    }
    // Tanımlayıcılar
    if (harfMi(c) || c === '_') {
      let j = i;
      while (j < n && harfRakamMi(kaynak[j])) j++;
      const ham = kaynak.slice(i, j);
      const k = katla(ham);
      ekle(ANAHTAR.has(k) ? 'AS' : 'AD', k, ham, sutun);
      i = j;
      continue;
    }
    let bulundu = false;
    for (const op of OPS) {
      if (kaynak.startsWith(op, i)) {
        ekle('OP', op, op, sutun);
        i += op.length;
        bulundu = true;
        break;
      }
    }
    if (!bulundu) hata(`Beklenmeyen karakter '${c}'`);
  }
  out.push({ tip: 'SON', deger: null, ham: '<dosya sonu>', satir, sutun: 1 });
  return out;
}
