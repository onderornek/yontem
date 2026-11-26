// Ağ birimi — HTTP istekleri.
// İstek eşzamanlıdır: program yanıt gelene kadar bekler. Asıl bağlantıyı konak kurar (Node.js'te ayrı
// bir süreç, tarayıcıda XMLHttpRequest); konak ağ erişimi vermiyorsa açık bir hata oluşur.
// Python sürümü (yontem_dil/ag.py) aynı denetimleri yapar, aynı sonuç sözlüğünü ve hata iletilerini üretir.
import { $, hata, metne, katla } from './cekirdek';
import { fn, turAdi } from './deger';

export interface HttpIstek { yontem: string; adres: string; basliklar: [string, string][]; govde: string | null; zamanAsimi: number }
export interface HttpYanit { hata?: 'baglanti' | 'zaman' | 'boyut'; durum?: number; basliklar?: Record<string, string>; govde?: string }

const YONTEMLER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
const SERBEST = /[A-Za-z0-9\-_.!~*'()]/;

const y = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any) =>
  fn((...a: any[]) => {
    if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
    return f(...a);
  }, ad, enCok, enAz, [], false);

function metinMi(v: any, ad: string): string {
  if (typeof v !== 'string') hata(`'${ad}' metin bekler, ${turAdi(v)} verildi`);
  return v;
}
function utf8Baytlari(s: string): number[] { return Array.from(new TextEncoder().encode(s)); }
function urlKodla(s: string): string {
  let out = '';
  for (const c of s) {
    if (c.length === 1 && SERBEST.test(c)) out += c;
    else for (const b of utf8Baytlari(c)) out += '%' + (b < 16 ? '0' : '') + b.toString(16).toUpperCase();
  }
  return out;
}
export function urlCoz(s: string): string {
  const baytlar: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '%') {
      const h = s.slice(i + 1, i + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(h)) hata(`'UrlÇöz': geçersiz '%' dizisi (${i + 1}. karakter)`);
      baytlar.push(parseInt(h, 16)); i += 2;
    } else {
      const cp = s.codePointAt(i)!;
      const c = String.fromCodePoint(cp);
      baytlar.push(...utf8Baytlari(c)); i += c.length - 1;
    }
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(baytlar)); }
  catch (e) { hata("'UrlÇöz': çözülen veri geçerli UTF-8 metin değil"); }
}

function basliklariHazirla(v: any): [string, string][] {
  if (v === null || v === undefined) return [];
  if (!(v instanceof Map)) hata(`'başlıklar' sözlük bekler, ${turAdi(v)} verildi`);
  const out: [string, string][] = [];
  v.forEach((deger: any, ad: any) => {
    const a = metinMi(ad, 'başlık adı'), d = metne(deger);
    if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(a)) hata(`Geçersiz başlık adı: '${a}'`);
    if (/[\r\n\0]/.test(d)) hata(`'${a}' başlığının değerinde satır sonu olamaz`);
    if (!/^[\x20-\x7e\t]*$/.test(d)) hata(`'${a}' başlığının değerinde yalnızca ASCII karakterler olabilir (Türkçe karakterler için UrlKodla kullanın)`);
    out.push([a, d]);
  });
  return out;
}

/** İsteği denetleyip konağa verilecek biçime getirir ('aynı anda' gövdesinde istek bu noktada bekletilir) */
function istekHazirla(yontemHam: any, adresHam: any, govdeHam: any, basliklarHam: any, sureHam: any): { istek: HttpIstek; sureHam: any } {
  const yontem = metinMi(yontemHam, 'yöntem').toUpperCase();
  if (!YONTEMLER.includes(yontem)) hata(`Bilinmeyen HTTP yöntemi: '${yontemHam}' (GET, POST, PUT, PATCH, DELETE, HEAD)`);
  const adres = metinMi(adresHam, 'adres');
  if (!/^https?:\/\/[^\s\x00-\x1f]+$/i.test(adres)) hata(`Geçersiz adres: '${adres}' (http:// ya da https:// ile başlamalı, boşluk içermemeli)`);
  let govde: string | null = govdeHam === null || govdeHam === undefined ? null : metinMi(govdeHam, 'gövde');
  if (govde !== null && (yontem === 'GET' || yontem === 'HEAD')) {
    if (govde !== '') hata(`${yontem} isteğinin gövdesi olamaz`);
    govde = null;
  }
  const basliklar = basliklariHazirla(basliklarHam);
  let sure: number;
  if (typeof sureHam === 'bigint') sure = Number(sureHam);
  else if (typeof sureHam === 'number') sure = sureHam;
  else hata(`'zaman aşımı' sayı bekler, ${turAdi(sureHam)} verildi`);
  if (!(sure >= 1 && sure <= 300)) hata("'zaman aşımı' 1 ile 300 saniye arasında olmalı");
  if (!$.konak || !$.konak.http) hata('Bu ortamda ağ erişimi yok');
  return { istek: { yontem, adres, basliklar, govde, zamanAsimi: sure }, sureHam };
}
function istekSonuc(h: { istek: HttpIstek; sureHam: any }, yn: HttpYanit): Map<string, any> {
  const adres = h.istek.adres, sureHam = h.sureHam;
  if (yn.hata === 'zaman') hata(`Ağ hatası: ${adres} zaman aşımına uğradı (${metne(sureHam)} sn)`);
  if (yn.hata === 'boyut') hata('Ağ hatası: yanıt çok büyük (en çok 10 MB)');
  if (yn.hata || typeof yn.durum !== 'number') hata(`Ağ hatası: ${adres} adresine bağlanılamadı`);
  const b = new Map<string, string>();
  for (const ad of Object.keys(yn.basliklar ?? {}).sort()) b.set(ad, yn.basliklar![ad]);
  return new Map<string, any>([['durum', BigInt(yn.durum)], ['gövde', yn.govde ?? ''], ['başlıklar', b]]);
}

function istek(yontemHam: any, adresHam: any, govdeHam: any, basliklarHam: any, sureHam: any): Map<string, any> {
  const h = istekHazirla(yontemHam, adresHam, govdeHam, basliklarHam, sureHam);
  return istekSonuc(h, $.konak.http(h.istek));
}
function* istekG(yontemHam: any, adresHam: any, govdeHam: any, basliklarHam: any, sureHam: any): Generator<HttpIstek, Map<string, any>, HttpYanit> {
  const h = istekHazirla(yontemHam, adresHam, govdeHam, basliklarHam, sureHam);
  return istekSonuc(h, yield h.istek);
}

function agModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Ağ' };
  const uye = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any) => { U[katla(ad)] = y(ad, enAz, enCok, f); };
  // 'aynı anda' gövdesinde bekleyebilen üyeler: üreteç sürümleri ($g) aynı denetimleri yapar, isteği verip bekler
  const bekleyen = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => Generator) => {
    U[katla(ad)].$g = function* (...a: any[]) {
      if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
      return yield* f(...a);
    };
  };
  uye('Httpİstek', 2, 5, (yn, adres, govde = null, basliklar = null, sure = 30n) => istek(yn, adres, govde, basliklar, sure));
  uye('HttpAl', 1, 3, (adres, basliklar = null, sure = 30n) => istek('GET', adres, null, basliklar, sure));
  uye('HttpGönder', 2, 4, (adres, govde, basliklar = null, sure = 30n) => istek('POST', adres, govde, basliklar, sure));
  bekleyen('Httpİstek', 2, 5, (yn, adres, govde = null, basliklar = null, sure = 30n) => istekG(yn, adres, govde, basliklar, sure));
  bekleyen('HttpAl', 1, 3, (adres, basliklar = null, sure = 30n) => istekG('GET', adres, null, basliklar, sure));
  bekleyen('HttpGönder', 2, 4, (adres, govde, basliklar = null, sure = 30n) => istekG('POST', adres, govde, basliklar, sure));
  uye('UrlKodla', 1, 1, m => urlKodla(metne(m)));
  uye('UrlÇöz', 1, 1, m => urlCoz(metinMi(m, 'metin')));
  uye('SorguYap', 1, 1, v => {
    if (!(v instanceof Map)) hata(`'SorguYap' sözlük bekler, ${turAdi(v)} verildi`);
    const p: string[] = [];
    v.forEach((d: any, a: any) => p.push(urlKodla(metne(a)) + '=' + urlKodla(metne(d))));
    return p.join('&');
  });
  return U;
}

$.yerelBirimler.set('ag', agModulu);
$.yerelBirimler.set('net', agModulu);
$.yerelBirimler.set('http', agModulu);
