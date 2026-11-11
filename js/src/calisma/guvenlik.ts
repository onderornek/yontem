// Güvenlik birimi — siber saldırılara karşı savunma araçları.
//   Bütünlük   : SHA-256 özeti, HMAC-SHA256 imzası, sabit süreli karşılaştırma
//   Parolalar  : PBKDF2-HMAC-SHA256 ile tuzlu parola özeti, parola gücü denetimi
//   Rastgelelik: işletim sisteminin kriptografik üretecinden tuz, belirteç, UUID
//   Şifreleme  : ChaCha20-Poly1305 (RFC 8439) ile kimlik doğrulamalı şifreleme
//   Girdi      : HTML kaçışı, SQL metni, yol geçişi, dosya adı, e-posta, URL denetimi
//   Saldırı    : kayan pencereli hız sınırlayıcı, imzalı süreli belirteç, güvenlik günlüğü
// Tüm algoritmalar saf TypeScript ile yazılmıştır; tarayıcıda ve Node.js'te aynı sonucu verir.
// Python sürümü (yontem_dil/guvenlik.py) birebir aynı çıktıyı üretir.
import { $, hata, metne, sifirlayiciEkle, katla } from './cekirdek';
import { fn, turAdi } from './deger';

// ================================================================ yardımcılar
const y = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) =>
  fn((...a: any[]) => {
    if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
    return f(...a);
  }, ad, enCok, enAz, [], oto);

function metinMi(v: any, ad: string): string {
  if (typeof v !== 'string') hata(`'${ad}' metin bekler, ${turAdi(v)} verildi`);
  return v;
}
function tamsayi(v: any, ad: string, enAz: number, enCok: number): number {
  if (typeof v !== 'bigint') hata(`'${ad}' tamsayı bekler, ${turAdi(v)} verildi`);
  if (v < BigInt(enAz) || v > BigInt(enCok)) hata(`'${ad}' ${enAz} ile ${enCok} arasında olmalı, ${v} verildi`);
  return Number(v);
}
function sayi(v: any, ad: string): number {
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'number') return v;
  hata(`'${ad}' sayı bekler, ${turAdi(v)} verildi`);
}

const kodlayici = new TextEncoder();
const utf8 = (s: string) => kodlayici.encode(s);
function utf8Coz(b: Uint8Array, ad: string): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  catch (e) { hata(`'${ad}': çözülen veri geçerli UTF-8 metin değil`); }
}
const HEX = '0123456789abcdef';
function hexe(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += HEX[b[i] >> 4] + HEX[b[i] & 15];
  return s;
}
function hextenCoz(s: string, ad: string): Uint8Array {
  if (s.length % 2 || !/^[0-9a-fA-F]*$/.test(s)) hata(`'${ad}' onaltılık (hex) metin bekler`);
  const b = new Uint8Array(s.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(s.substr(i * 2, 2), 16);
  return b;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64(b: Uint8Array, url = false): string {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    s += i + 1 < b.length ? B64[(n >> 6) & 63] : '=';
    s += i + 2 < b.length ? B64[n & 63] : '=';
  }
  return url ? s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : s;
}
function b64Coz(s: string, ad: string, url = false): Uint8Array {
  let t = url ? s.replace(/-/g, '+').replace(/_/g, '/') : s.replace(/[\r\n]/g, '');
  if (url) while (t.length % 4) t += '=';
  if (t.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(t)) hata(`'${ad}' geçerli Base64 metin bekler`);
  const pad = t.endsWith('==') ? 2 : t.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((t.length / 4) * 3 - pad);
  let j = 0;
  for (let i = 0; i < t.length; i += 4) {
    const n = (B64.indexOf(t[i]) << 18) | (B64.indexOf(t[i + 1]) << 12) |
      ((t[i + 2] === '=' ? 0 : B64.indexOf(t[i + 2])) << 6) | (t[i + 3] === '=' ? 0 : B64.indexOf(t[i + 3]));
    if (j < out.length) out[j++] = (n >> 16) & 255;
    if (j < out.length) out[j++] = (n >> 8) & 255;
    if (j < out.length) out[j++] = n & 255;
  }
  return out;
}
function birlestir(...p: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(p.reduce((t, x) => t + x.length, 0));
  let i = 0;
  for (const x of p) { out.set(x, i); i += x.length; }
  return out;
}
/** Sabit süreli karşılaştırma: farkın yeri ne olursa olsun aynı sürede biter. */
function sabitEsit(a: Uint8Array, b: Uint8Array): boolean {
  let fark = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) fark |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return fark === 0;
}

// ================================================================ kriptografik rastgelelik
export function rastgeleBaytlar(n: number): Uint8Array {
  const c = (globalThis as any).crypto;
  if (!c || typeof c.getRandomValues !== 'function') hata('Bu ortamda kriptografik rastgele sayı üreteci yok');
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i += 65536) c.getRandomValues(b.subarray(i, Math.min(n, i + 65536)));
  return b;
}
function rastgeleAralik(alt: bigint, ust: bigint): bigint {
  const aralik = ust - alt + 1n;
  let bit = 0; for (let r = aralik - 1n; r > 0n; r >>= 1n) bit++;
  const bayt = Math.max(1, Math.ceil(bit / 8));
  const maske = (1n << BigInt(bit)) - 1n;
  for (;;) {                          // reddederek örnekleme: modülo yanlılığı yok
    let r = 0n;
    for (const x of rastgeleBaytlar(bayt)) r = (r << 8n) | BigInt(x);
    r &= maske;
    if (r < aralik) return alt + r;
  }
}

// ================================================================ SHA-256 (FIPS 180-4)
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
const H0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const W = new Uint32Array(64);

function sikistir(h: Uint32Array, blok: Uint8Array, o: number) {
  for (let i = 0; i < 16; i++, o += 4) W[i] = (blok[o] << 24) | (blok[o + 1] << 16) | (blok[o + 2] << 8) | blok[o + 3];
  for (let i = 16; i < 64; i++) {
    const a = W[i - 15], b = W[i - 2];
    const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
    const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
    W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
  }
  let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], k = h[7];
  for (let i = 0; i < 64; i++) {
    const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const t1 = (k + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
    const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
    k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
  }
  h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += k;
}
function durumBaytlari(h: Uint32Array): Uint8Array {
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) { out[i * 4] = h[i] >>> 24; out[i * 4 + 1] = h[i] >>> 16; out[i * 4 + 2] = h[i] >>> 8; out[i * 4 + 3] = h[i]; }
  return out;
}
/** h durumundan başlayıp, önceden 'onceki' bayt işlenmiş sayarak veriyi özetler. */
function sha256Devam(h0: Uint32Array, veri: Uint8Array, onceki = 0): Uint8Array {
  const h = new Uint32Array(h0);
  const toplam = onceki + veri.length;
  const n = Math.ceil((veri.length + 9) / 64) * 64;
  const b = new Uint8Array(n);
  b.set(veri); b[veri.length] = 0x80;
  const bit = toplam * 8;
  const yuksek = Math.floor(bit / 0x100000000), dusuk = bit >>> 0;
  b[n - 8] = yuksek >>> 24; b[n - 7] = yuksek >>> 16; b[n - 6] = yuksek >>> 8; b[n - 5] = yuksek;
  b[n - 4] = dusuk >>> 24; b[n - 3] = dusuk >>> 16; b[n - 2] = dusuk >>> 8; b[n - 1] = dusuk;
  for (let o = 0; o < n; o += 64) sikistir(h, b, o);
  return durumBaytlari(h);
}
export const sha256 = (veri: Uint8Array) => sha256Devam(new Uint32Array(H0), veri);

// ================================================================ HMAC-SHA256 (RFC 2104) ve PBKDF2 (RFC 8018)
function hmacDurumlari(anahtar: Uint8Array): [Uint32Array, Uint32Array] {
  if (anahtar.length > 64) anahtar = sha256(anahtar);
  const ip = new Uint8Array(64), op = new Uint8Array(64);
  for (let i = 0; i < 64; i++) { const k = anahtar[i] ?? 0; ip[i] = k ^ 0x36; op[i] = k ^ 0x5c; }
  const hi = new Uint32Array(H0), ho = new Uint32Array(H0);
  sikistir(hi, ip, 0); sikistir(ho, op, 0);
  return [hi, ho];
}
export function hmac(anahtar: Uint8Array, veri: Uint8Array): Uint8Array {
  const [hi, ho] = hmacDurumlari(anahtar);
  return sha256Devam(ho, sha256Devam(hi, veri, 64), 64);
}
export function pbkdf2(parola: Uint8Array, tuz: Uint8Array, tekrar: number, uzunluk: number): Uint8Array {
  const [hi, ho] = hmacDurumlari(parola);
  // 32 baytlık ileti için iç ve dış özet tek blok: dolguyu bir kez hazırla, her turda yalnız sıkıştır.
  const blok = new Uint8Array(64);
  blok[32] = 0x80; blok[62] = 0x03; blok[63] = 0x00;           // (64 + 32) * 8 = 768 bit = 0x300
  const h = new Uint32Array(8);
  const out = new Uint8Array(uzunluk);
  for (let i = 1, yer = 0; yer < uzunluk; i++, yer += 32) {
    let u = sha256Devam(ho, sha256Devam(hi, birlestir(tuz, new Uint8Array([i >>> 24, i >>> 16, i >>> 8, i])), 64), 64);
    const t = u.slice();
    for (let j = 1; j < tekrar; j++) {
      blok.set(u, 0); h.set(hi); sikistir(h, blok, 0); blok.set(durumBaytlari(h), 0);
      h.set(ho); sikistir(h, blok, 0); u = durumBaytlari(h);
      for (let k = 0; k < 32; k++) t[k] ^= u[k];
    }
    out.set(t.subarray(0, Math.min(32, uzunluk - yer)), yer);
  }
  return out;
}

// ================================================================ ChaCha20-Poly1305 (RFC 8439)
function chachaBlok(anahtar: Uint32Array, sayac: number, nonce: Uint32Array, out: Uint8Array) {
  const s = new Uint32Array(16);
  s[0] = 0x61707865; s[1] = 0x3320646e; s[2] = 0x79622d32; s[3] = 0x6b206574;
  s.set(anahtar, 4); s[12] = sayac; s.set(nonce, 13);
  const x = new Uint32Array(s);
  const ceyrek = (a: number, b: number, c: number, d: number) => {
    x[a] += x[b]; x[d] ^= x[a]; x[d] = (x[d] << 16) | (x[d] >>> 16);
    x[c] += x[d]; x[b] ^= x[c]; x[b] = (x[b] << 12) | (x[b] >>> 20);
    x[a] += x[b]; x[d] ^= x[a]; x[d] = (x[d] << 8) | (x[d] >>> 24);
    x[c] += x[d]; x[b] ^= x[c]; x[b] = (x[b] << 7) | (x[b] >>> 25);
  };
  for (let i = 0; i < 10; i++) {
    ceyrek(0, 4, 8, 12); ceyrek(1, 5, 9, 13); ceyrek(2, 6, 10, 14); ceyrek(3, 7, 11, 15);
    ceyrek(0, 5, 10, 15); ceyrek(1, 6, 11, 12); ceyrek(2, 7, 8, 13); ceyrek(3, 4, 9, 14);
  }
  for (let i = 0; i < 16; i++) { const v = (x[i] + s[i]) >>> 0; out[i * 4] = v; out[i * 4 + 1] = v >>> 8; out[i * 4 + 2] = v >>> 16; out[i * 4 + 3] = v >>> 24; }
}
const kelimeler = (b: Uint8Array) => { const w = new Uint32Array(b.length / 4); for (let i = 0; i < w.length; i++) w[i] = b[i * 4] | (b[i * 4 + 1] << 8) | (b[i * 4 + 2] << 16) | (b[i * 4 + 3] << 24); return w; };
export function chacha20(anahtar: Uint8Array, sayac: number, nonce: Uint8Array, veri: Uint8Array): Uint8Array {
  const k = kelimeler(anahtar), n = kelimeler(nonce), ks = new Uint8Array(64), out = new Uint8Array(veri.length);
  for (let o = 0; o < veri.length; o += 64, sayac++) {
    chachaBlok(k, sayac >>> 0, n, ks);
    for (let i = 0; i < 64 && o + i < veri.length; i++) out[o + i] = veri[o + i] ^ ks[i];
  }
  return out;
}
const leSayi = (b: Uint8Array) => { let r = 0n; for (let i = b.length - 1; i >= 0; i--) r = (r << 8n) | BigInt(b[i]); return r; };
export function poly1305(anahtar: Uint8Array, ileti: Uint8Array): Uint8Array {
  const r = leSayi(anahtar.subarray(0, 16)) & 0x0ffffffc0ffffffc0ffffffc0fffffffn;
  const s = leSayi(anahtar.subarray(16, 32));
  const p = (1n << 130n) - 5n;
  let acc = 0n;
  for (let i = 0; i < ileti.length; i += 16) {
    const parca = ileti.subarray(i, i + 16);
    acc = ((acc + leSayi(parca) + (1n << BigInt(8 * parca.length))) * r) % p;
  }
  acc = (acc + s) & ((1n << 128n) - 1n);
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) { out[i] = Number(acc & 255n); acc >>= 8n; }
  return out;
}
function aeadEtiket(anahtar: Uint8Array, nonce: Uint8Array, aad: Uint8Array, sifreli: Uint8Array): Uint8Array {
  const polyAnahtar = chacha20(anahtar, 0, nonce, new Uint8Array(32));
  const dolgu = (n: number) => new Uint8Array((16 - (n % 16)) % 16);
  const uz = new Uint8Array(16);
  const yazUz = (o: number, n: number) => { for (let i = 0; i < 8; i++) { uz[o + i] = n & 255; n = Math.floor(n / 256); } };
  yazUz(0, aad.length); yazUz(8, sifreli.length);
  return poly1305(polyAnahtar, birlestir(aad, dolgu(aad.length), sifreli, dolgu(sifreli.length), uz));
}
export function aeadSifrele(anahtar: Uint8Array, nonce: Uint8Array, acik: Uint8Array, aad = new Uint8Array(0)): Uint8Array {
  const c = chacha20(anahtar, 1, nonce, acik);
  return birlestir(c, aeadEtiket(anahtar, nonce, aad, c));
}
export function aeadCoz(anahtar: Uint8Array, nonce: Uint8Array, veri: Uint8Array, aad = new Uint8Array(0)): Uint8Array | null {
  if (veri.length < 16) return null;
  const c = veri.subarray(0, veri.length - 16), etiket = veri.subarray(veri.length - 16);
  if (!sabitEsit(aeadEtiket(anahtar, nonce, aad, c), etiket)) return null;
  return chacha20(anahtar, 1, nonce, c);
}

// ================================================================ birim durumu
let benzetimZamani: number | null = null;
let gunluk: string[] = [];
sifirlayiciEkle(() => { benzetimZamani = null; gunluk = []; });
const simdi = () => benzetimZamani ?? Date.now() / 1000;

const VARSAYILAN_TEKRAR = 210000;
const YAYGIN = new Set(['123456', '12345678', '123456789', '1234567890', 'password', 'password1', 'qwerty', 'qwerty123',
  'parola', 'parola123', 'sifre', 'şifre', 'sifre123', 'şifre123', 'admin', 'admin123', 'letmein', 'welcome', 'iloveyou',
  'abc123', '111111', '000000', 'galatasaray', 'fenerbahce', 'fenerbahçe', 'besiktas', 'beşiktaş', 'trabzonspor',
  'istanbul', 'ankara', 'türkiye', 'turkiye', 'yontem', 'yöntem']);

function karakterler(s: string): string[] { return Array.from(s); }
const kucukMu = (c: string) => c !== c.toUpperCase() && c === c.toLowerCase();
const buyukMu = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();
const rakamMi = (c: string) => c >= '0' && c <= '9';

function parolaSorunlari(p: string): string[] {
  const k = karakterler(p), s: string[] = [];
  if (k.length < 8) s.push('en az 8 karakter olmalı');
  else if (k.length < 12) s.push('12 karakter ya da daha uzun olması önerilir');
  if (YAYGIN.has(p.toLocaleLowerCase('tr'))) s.push('çok yaygın bir parola');
  if (k.length && k.every(c => c === k[0])) s.push('tek bir karakterin tekrarı');
  if (!k.some(kucukMu)) s.push('küçük harf yok');
  if (!k.some(buyukMu)) s.push('büyük harf yok');
  if (!k.some(rakamMi)) s.push('rakam yok');
  if (!k.some(c => !kucukMu(c) && !buyukMu(c) && !rakamMi(c) && c.toLowerCase() === c.toUpperCase())) s.push('simge yok');
  return s;
}
function parolaGucu(p: string): number {
  const k = karakterler(p);
  if (k.length < 8 || YAYGIN.has(p.toLocaleLowerCase('tr')) || k.every(c => c === k[0])) return 0;
  const sinif = [k.some(kucukMu), k.some(buyukMu), k.some(rakamMi),
    k.some(c => !kucukMu(c) && !buyukMu(c) && !rakamMi(c) && c.toLowerCase() === c.toUpperCase())].filter(Boolean).length;
  let g = 1;
  if (k.length >= 12) g++;
  if (sinif >= 3) g++;
  if (k.length >= 16 && sinif >= 2) g++;
  return Math.min(4, g);
}

function parolaKaydiCoz(kayit: string): [number, Uint8Array, Uint8Array] | null {
  const p = kayit.split('$');
  if (p.length !== 4 || p[0] !== 'pbkdf2-sha256' || !/^[0-9]{1,8}$/.test(p[1])) return null;
  const tekrar = Number(p[1]);
  if (tekrar < 1000 || !/^([0-9a-f]{2})+$/.test(p[2]) || !/^[0-9a-f]{64}$/.test(p[3])) return null;
  return [tekrar, hextenCoz(p[2], 'tuz'), hextenCoz(p[3], 'özet')];
}

function anahtarBaytlari(a: any, ad: string): Uint8Array {
  const s = metinMi(a, ad);
  if (!/^[0-9a-fA-F]{64}$/.test(s)) hata(`'${ad}' 64 onaltılık karakterlik (256 bit) bir anahtar bekler; 'AnahtarÜret' ya da 'ParoladanAnahtar' ile üret`);
  return hextenCoz(s, ad);
}

function yolGuvenli(yol: string): boolean {
  if (!yol || yol.includes('\0') || yol.startsWith('/') || yol.startsWith('\\') || /^[A-Za-z]:/.test(yol)) return false;
  if (/%2e|%2f|%5c|%00/i.test(yol)) return false;
  return !yol.split(/[\\/]/).some(p => p === '..');
}
function dosyaAdiTemizle(ad: string): string {
  const parca = ad.split(/[\\/]/).pop() ?? '';
  let s = karakterler(parca).map(c => /[\p{L}\p{N}._\- ]/u.test(c) ? c : '_').join('');
  s = s.replace(/^[. ]+/, '').replace(/[. ]+$/, '').replace(/_{2,}/g, '_');
  const k = karakterler(s);
  if (k.length > 100) s = k.slice(0, 100).join('');
  const kok = s.split('.')[0].toUpperCase();
  if (/^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/.test(kok)) s = '_' + s;
  return s || 'dosya';
}
const EPOSTA = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
function epostaGecerli(s: string): boolean {
  if (s.length > 254 || !EPOSTA.test(s)) return false;
  const yerel = s.split('@')[0];
  return yerel.length <= 64 && !yerel.startsWith('.') && !yerel.endsWith('.') && !yerel.includes('..');
}
function urlGuvenli(s: string): boolean {
  const t = s.trim();
  if (/[\x00-\x1f\s]/.test(t)) return false;
  if (t.startsWith('/')) return !t.startsWith('//') && !t.startsWith('/\\');
  return /^https?:\/\/[^\s/?#@]+/i.test(t) && !/^https?:\/\/[^/?#]*@/i.test(t);
}
function gunlukMetni(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0'));
}

// ================================================================ Sınırlayıcı nesnesi
export class Sinirlayici {
  static TUR_ADI = 'Sınırlayıcı';
  kayit = new Map<string, number[]>();
  constructor(public enCok: number, public sure: number, public sureHam: any) {}
  temizle(a: string): number[] {
    const t = simdi(), l = (this.kayit.get(a) ?? []).filter(z => z > t - this.sure);
    if (l.length) this.kayit.set(a, l); else this.kayit.delete(a);
    return l;
  }
  kAl(ad: string): any {
    switch (ad) {
      case 'enfazla': case 'encok': return BigInt(this.enCok);
      case 'sure': return this.sureHam;
      case 'izinver': return y('İzinVer', 1, 1, a => {
        const k = metne(a), l = this.temizle(k);
        if (l.length >= this.enCok) return false;
        l.push(simdi()); this.kayit.set(k, l);
        return true;
      });
      case 'kalan': return y('Kalan', 1, 1, a => BigInt(Math.max(0, this.enCok - this.temizle(metne(a)).length)));
      case 'bekleme': return y('Bekleme', 1, 1, a => {
        const l = this.temizle(metne(a));
        if (l.length < this.enCok) return 0n;
        return BigInt(Math.max(0, Math.ceil(l[l.length - this.enCok] + this.sure - simdi())));
      });
      case 'sifirla': return y('Sıfırla', 1, 1, a => { this.kayit.delete(metne(a)); return null; });
    }
    hata(`Sınırlayıcı nesnesinde '${ad}' üyesi yok`);
  }
  kAta(ad: string, _v: any) { hata(`Sınırlayıcı nesnesinin '${ad}' üyesine atama yapılamaz`); }
  toString() { return `Sınırlayıcı(${this.enCok} / ${metne(this.sureHam)} sn)`; }
}

// ================================================================ birim üyeleri
function guvenlikModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Güvenlik' };
  const uye = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) => { U[katla(ad)] = y(ad, enAz, enCok, f, oto); };

  // ---- bütünlük
  uye('Özet', 1, 1, m => hexe(sha256(utf8(metne(m)))));
  uye('İmza', 2, 2, (a, m) => hexe(hmac(utf8(metinMi(a, 'anahtar')), utf8(metne(m)))));
  uye('İmzaDoğru', 3, 3, (a, m, i) => sabitEsit(utf8(hexe(hmac(utf8(metinMi(a, 'anahtar')), utf8(metne(m))))), utf8(metinMi(i, 'imza').toLowerCase())));
  uye('GüvenliEşit', 2, 2, (a, b) => sabitEsit(utf8(metne(a)), utf8(metne(b))));

  // ---- parolalar
  uye('ParolaÖzeti', 1, 2, (p, t = BigInt(VARSAYILAN_TEKRAR)) => {
    const tekrar = tamsayi(t, 'tekrar', 1000, 10000000);
    const tuz = rastgeleBaytlar(16);
    return `pbkdf2-sha256$${tekrar}$${hexe(tuz)}$${hexe(pbkdf2(utf8(metinMi(p, 'parola')), tuz, tekrar, 32))}`;
  });
  uye('ParolaDoğrula', 2, 2, (p, k) => {
    const c = parolaKaydiCoz(metinMi(k, 'kayıt'));
    if (!c) return false;
    return sabitEsit(pbkdf2(utf8(metinMi(p, 'parola')), c[1], c[0], 32), c[2]);
  });
  uye('YenidenÖzetlenmeli', 1, 2, (k, t = BigInt(VARSAYILAN_TEKRAR)) => {
    const c = parolaKaydiCoz(metinMi(k, 'kayıt'));
    return !c || c[0] < tamsayi(t, 'tekrar', 1000, 10000000);
  });
  uye('ParolaGücü', 1, 1, p => BigInt(parolaGucu(metinMi(p, 'parola'))));
  uye('ParolaSorunları', 1, 1, p => parolaSorunlari(metinMi(p, 'parola')));

  // ---- rastgelelik ve belirteçler
  uye('Tuz', 0, 1, (n = 16n) => hexe(rastgeleBaytlar(tamsayi(n, 'bayt sayısı', 1, 1024))), true);
  uye('Belirteç', 0, 1, (n = 32n) => b64(rastgeleBaytlar(tamsayi(n, 'bayt sayısı', 1, 1024)), true), true);
  uye('GüvenliRastgele', 2, 2, (a, b) => {
    if (typeof a !== 'bigint' || typeof b !== 'bigint') hata("'GüvenliRastgele' iki tamsayı bekler");
    if (a > b) hata("'GüvenliRastgele': alt sınır üst sınırdan büyük olamaz");
    return rastgeleAralik(a, b);
  });
  uye('Kimlik', 0, 0, () => {
    const b = rastgeleBaytlar(16);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = hexe(b);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }, true);

  // ---- kodlama
  uye('Base64Kodla', 1, 1, m => b64(utf8(metne(m))));
  uye('Base64Çöz', 1, 1, m => utf8Coz(b64Coz(metinMi(m, 'Base64Çöz'), 'Base64Çöz'), 'Base64Çöz'));

  // ---- şifreleme
  uye('AnahtarÜret', 0, 0, () => hexe(rastgeleBaytlar(32)), true);
  uye('ParoladanAnahtar', 2, 3, (p, t, n = BigInt(VARSAYILAN_TEKRAR)) =>
    hexe(pbkdf2(utf8(metinMi(p, 'parola')), utf8(metinMi(t, 'tuz')), tamsayi(n, 'tekrar', 1000, 10000000), 32)));
  uye('Şifrele', 2, 2, (a, m) => {
    const k = anahtarBaytlari(a, 'Şifrele'), nonce = rastgeleBaytlar(12);
    return b64(birlestir(nonce, aeadSifrele(k, nonce, utf8(metne(m)))), true);
  });
  uye('ŞifreÇöz', 2, 2, (a, m) => {
    const k = anahtarBaytlari(a, 'ŞifreÇöz');
    const s = metinMi(m, 'şifreli');
    if (!/^[A-Za-z0-9_-]+$/.test(s)) hata("'ŞifreÇöz': şifreli veri bozuk");
    const v = b64Coz(s, 'ŞifreÇöz', true);
    const acik = v.length >= 28 ? aeadCoz(k, v.subarray(0, 12), v.subarray(12)) : null;
    if (!acik) hata("'ŞifreÇöz': şifreli veri doğrulanamadı (anahtar yanlış ya da veri değiştirilmiş)");
    return utf8Coz(acik, 'ŞifreÇöz');
  });

  // ---- girdi doğrulama ve temizleme
  uye('HtmlKaçış', 1, 1, m => metne(m).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
  uye('SqlMetni', 1, 1, m => {
    const s = metne(m);
    if (s.includes('\0')) hata("'SqlMetni': metinde boş karakter (\\0) olamaz");
    return "'" + s.replace(/'/g, "''") + "'";
  });
  uye('YolGüvenli', 1, 1, m => yolGuvenli(metinMi(m, 'yol')));
  uye('DosyaAdıTemizle', 1, 1, m => dosyaAdiTemizle(metinMi(m, 'dosya adı')));
  uye('EpostaGeçerli', 1, 1, m => epostaGecerli(metinMi(m, 'e-posta')));
  uye('UrlGüvenli', 1, 1, m => urlGuvenli(metinMi(m, 'adres')));
  uye('İzinliKarakterler', 2, 2, (m, i) => {
    const izin = new Set(karakterler(metinMi(i, 'izinli')));
    return karakterler(metinMi(m, 'metin')).every(c => izin.has(c));
  });
  uye('Maskele', 1, 2, (m, n = 4n) => {
    const k = karakterler(metne(m)), g = Math.min(k.length, tamsayi(n, 'görünür', 0, 1000));
    return '*'.repeat(k.length - g) + k.slice(k.length - g).join('');
  });

  // ---- saldırılara karşı
  uye('Sınırlayıcı', 2, 2, (n, s) => {
    const sure = sayi(s, 'süre');
    if (!(sure > 0)) hata("'Sınırlayıcı': süre sıfırdan büyük olmalı");
    return new Sinirlayici(tamsayi(n, 'en çok', 1, 1000000), sure, s);
  });
  uye('BelirteçÜret', 2, 3, (a, v, o = 3600n) => {
    const omur = tamsayi(o, 'ömür', 1, 315360000);
    const govde = b64(utf8(metne(v)), true) + '.' + Math.floor(simdi() + omur);
    return govde + '.' + b64(hmac(utf8(metinMi(a, 'anahtar')), utf8(govde)), true);
  });
  uye('BelirteçDoğrula', 2, 2, (a, b) => {
    const s = metinMi(b, 'belirteç'), p = s.split('.');
    if (p.length !== 3 || !/^[A-Za-z0-9_-]*$/.test(p[0]) || !/^[0-9]{1,12}$/.test(p[1]) || !/^[A-Za-z0-9_-]{43}$/.test(p[2])) return null;
    const govde = p[0] + '.' + p[1];
    if (!sabitEsit(utf8(b64(hmac(utf8(metinMi(a, 'anahtar')), utf8(govde)), true)), utf8(p[2]))) return null;
    if (simdi() >= Number(p[1])) return null;
    try { return new TextDecoder('utf-8', { fatal: true }).decode(b64Coz(p[0], 'belirteç', true)); } catch (e) { return null; }
  });
  uye('Günlük', 1, 2, (o, a = '') => {
    const olay = gunlukMetni(metne(o)), ay = gunlukMetni(metne(a));
    const satir = `[Güvenlik] ${olay}${ay ? ': ' + ay : ''}`;
    gunluk.push(satir);
    $.konak.yaz(satir + '\n');
    return null;
  });
  uye('GünlükKayıtları', 0, 0, () => gunluk.slice(), true);
  uye('BenzetimZamanı', 1, 1, v => { benzetimZamani = sayi(v, 'zaman'); return null; });
  uye('Zaman', 0, 0, () => simdi(), true);
  return U;
}

$.yerelBirimler.set('guvenlik', guvenlikModulu);
$.yerelBirimler.set('security', guvenlikModulu);
