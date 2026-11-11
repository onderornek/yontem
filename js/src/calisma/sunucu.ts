// Sunucu birimi — HTTP isteklerini karşılayan küçük bir web sunucusu.
//   Yol('GET', '/urun/:no', işleyici) · Statik('/', 'web') · Dinle(8080)
// İşleyici isteği bir sözlük olarak alır (yöntem, yol, sorgu, parametreler, başlıklar, gövde) ve metin ya da
// Yanıt / JsonYanıt / Yönlendir ile kurulmuş bir yanıt döndürür. İstekler sırayla, eşzamanlı işlenir.
// Yönlendirme ve denetimler buradadır; ağı konak dinler (Node.js'te js/src/sunucu_dugum.ts). İstekİşle aynı
// yolu ağ olmadan çalıştırır (test için). Python sürümü (yontem_dil/sunucu.py) aynı yanıtları üretir.
import { $, hata, metne, katla, cagir } from './cekirdek';
import { fn, turAdi } from './deger';
import { YontemHatasi, DurSinyali } from '../hatalar';
import { urlCoz } from './ag';
import { jsonYap, jsonIcin } from './yerlesik';

const y = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) =>
  fn((...a: any[]) => {
    if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
    return f(...a);
  }, ad, enCok, enAz, [], oto);

const YONTEMLER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', '*'];
const DURUM_METNI: Record<number, string> = { 400: 'Geçersiz istek', 404: 'Bulunamadı', 405: 'Bu yöntem desteklenmiyor', 413: 'İstek çok büyük', 500: 'Sunucu hatası' };
const TURLER: Record<string, string> = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8', txt: 'text/plain; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg',
  jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon', woff2: 'font/woff2', pdf: 'application/pdf', webmanifest: 'application/manifest+json',
};
const METIN = 'text/plain; charset=utf-8', HTML = 'text/html; charset=utf-8', JSON_TURU = 'application/json; charset=utf-8';

export interface HamIstek { yontem: string; hedef: string; basliklar: Record<string, string>; govde: string }
export interface HamYanit { durum: number; basliklar: [string, string][]; govde: string; dosya?: string; bosGovde?: boolean; durdur?: boolean; gunluk?: string }

interface Kural { yontem: string; parcalar: string[]; isleyici: any }
interface Durum { kurallar: Kural[]; statik: { onEk: string; klasor: string }[]; durdur: boolean; govdeSiniri: number }
let d: Durum = { kurallar: [], statik: [], durdur: false, govdeSiniri: 1024 * 1024 };

function yanitSozlugu(durum: number, govde: string, tur: string, ek: [string, string][] = []): Map<string, any> {
  const b = new Map<string, any>([['content-type', tur]]);
  for (const [a, v] of ek) b.set(a, v);
  return new Map<string, any>([['durum', BigInt(durum)], ['gövde', govde], ['başlıklar', b]]);
}
function durumSayisi(v: any, ad: string): number {
  if (typeof v !== 'bigint' || v < 100n || v > 599n) hata(`'${ad}': durum 100..599 arasında bir tamsayı olmalı`);
  return Number(v);
}
function parcala(yol: string): string[] { return yol.split('/').filter(p => p !== ''); }

/** İsteği yönlendirir ve yanıt sözlüğünü döndürür (hata durumları dahil) */
function isle(ham: HamIstek): { yanit: Map<string, any>; dosya?: string; gunluk?: string } {
  const basit = (durum: number) => ({ yanit: yanitSozlugu(durum, DURUM_METNI[durum], METIN) });
  if (ham.govde.length > d.govdeSiniri) return basit(413);
  const si = ham.hedef.indexOf('?');
  const hamYol = si < 0 ? ham.hedef : ham.hedef.slice(0, si), hamSorgu = si < 0 ? '' : ham.hedef.slice(si + 1);
  let yol: string;
  const sorgu = new Map<string, any>();
  try {
    yol = urlCoz(hamYol);
    for (const p of hamSorgu.split('&')) {
      if (!p) continue;
      const e = p.indexOf('=');
      sorgu.set(urlCoz((e < 0 ? p : p.slice(0, e)).replace(/\+/g, ' ')), e < 0 ? '' : urlCoz(p.slice(e + 1).replace(/\+/g, ' ')));
    }
  } catch { return basit(400); }
  if (!yol.startsWith('/') || yol.includes('\0')) return basit(400);
  const yontem = ham.yontem.toUpperCase();
  const parcalar = parcala(yol);
  let yolEslesti = false;
  for (const k of d.kurallar) {
    if (k.parcalar.length !== parcalar.length) continue;
    const prm = new Map<string, any>();
    if (!k.parcalar.every((p, i) => p.startsWith(':') ? (prm.set(p.slice(1), parcalar[i]), true) : p === parcalar[i])) continue;
    yolEslesti = true;
    if (!(k.yontem === '*' || k.yontem === yontem || (yontem === 'HEAD' && k.yontem === 'GET'))) continue;
    const basliklar = new Map<string, any>();
    for (const a of Object.keys(ham.basliklar).sort()) basliklar.set(a.toLowerCase(), ham.basliklar[a]);
    const istek = new Map<string, any>([['yöntem', yontem], ['yol', yol], ['sorgu', sorgu], ['parametreler', prm], ['başlıklar', basliklar], ['gövde', ham.govde]]);
    let sonuc: any;
    try { sonuc = cagir(k.isleyici, [istek]); }
    catch (e: any) {
      const h = $.yontemHatasina(e);
      return { yanit: yanitSozlugu(500, DURUM_METNI[500], METIN), gunluk: `${yontem} ${yol}: ${h.mesaj}` };
    }
    if (typeof sonuc === 'string') return { yanit: yanitSozlugu(200, sonuc, HTML) };
    if (sonuc instanceof Map && typeof sonuc.get('durum') === 'bigint' && typeof sonuc.get('gövde') === 'string' && sonuc.get('başlıklar') instanceof Map) return { yanit: sonuc };
    return { yanit: yanitSozlugu(500, DURUM_METNI[500], METIN), gunluk: `${yontem} ${yol}: işleyici metin ya da Yanıt/JsonYanıt/Yönlendir sonucu döndürmeli, ${turAdi(sonuc)} döndürdü` };
  }
  if (yolEslesti) return basit(405);
  if (yontem === 'GET' || yontem === 'HEAD') {
    for (const s of d.statik) {
      const on = parcala(s.onEk);
      if (parcalar.length < on.length || !on.every((p, i) => p === parcalar[i])) continue;
      const kalan = parcalar.slice(on.length);
      // klasör dışına çıkan, gizli ya da ters bölü içeren yollar reddedilir
      if (kalan.some(p => p === '..' || p.startsWith('.') || p.includes('\\') || p.includes(':'))) return basit(404);
      const kok = s.klasor.replace(/\/+$/, ''), tam = kalan.join('/');
      const adaylar = !kalan.length ? [kok + '/index.html'] : /\.[A-Za-z0-9]+$/.test(tam) ? [kok + '/' + tam] : [kok + '/' + tam + '/index.html'];
      const k = $.konak;
      for (const dosya of adaylar) {
        if (k && k.dosyaVarMi && k.dosyaVarMi(dosya)) {
          const uz = (/\.([A-Za-z0-9]+)$/.exec(dosya)?.[1] ?? '').toLowerCase();
          return { yanit: yanitSozlugu(200, '', TURLER[uz] ?? 'application/octet-stream'), dosya };
        }
      }
    }
  }
  return basit(404);
}

/** Yanıt sözlüğünü konağın göndereceği biçime çevirir; başlıkları denetler */
function hamYanit(r: ReturnType<typeof isle>, yontem: string): HamYanit {
  const durum = Number(r.yanit.get('durum'));
  const basliklar: [string, string][] = [];
  let gunluk = r.gunluk;
  (r.yanit.get('başlıklar') as Map<any, any>).forEach((v, a) => {
    const ad = metne(a).toLowerCase(), deger = metne(v);
    if (!/^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(ad) || !/^[\x20-\x7e\t]*$/.test(deger)) { gunluk = gunluk ?? `geçersiz yanıt başlığı atlandı: '${ad}'`; return; }
    if (ad !== 'content-length') basliklar.push([ad, deger]);
  });
  if (!basliklar.some(b => b[0] === 'x-content-type-options')) basliklar.push(['x-content-type-options', 'nosniff']);
  if (durum < 100 || durum > 599 || !Number.isInteger(durum)) return { durum: 500, basliklar: [['content-type', METIN]], govde: DURUM_METNI[500], gunluk: 'geçersiz durum kodu' };
  return { durum, basliklar, govde: r.yanit.get('gövde'), dosya: r.dosya, bosGovde: yontem.toUpperCase() === 'HEAD', gunluk };
}

function sunucuModulu(): Record<string, any> {
  d = { kurallar: [], statik: [], durdur: false, govdeSiniri: 1024 * 1024 };
  const U: Record<string, any> = { $ad: 'Sunucu' };
  const uye = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) => { U[katla(ad)] = y(ad, enAz, enCok, f, oto); };
  const metin = (v: any, ad: string): string => { if (typeof v !== 'string') hata(`'${ad}' metin bekler, ${turAdi(v)} verildi`); return v; };

  uye('Yol', 3, 3, (yn, kalip, isleyici) => {
    const yontem = metin(yn, 'yöntem').toUpperCase();
    if (!YONTEMLER.includes(yontem)) hata(`Geçersiz HTTP yöntemi: '${yn}' (${YONTEMLER.join(', ')})`);
    const k = metin(kalip, 'yol');
    if (!k.startsWith('/')) hata(`Yol '/' ile başlamalı: '${k}'`);
    const parcalar = parcala(k);
    for (const p of parcalar) if (p.startsWith(':') && !/^:[\p{L}_][\p{L}\p{N}_]*$/u.test(p)) hata(`Geçersiz yol parametresi: '${p}'`);
    if (typeof isleyici !== 'function') hata(`'Yol': işleyici bir alt program olmalı, ${turAdi(isleyici)} verildi`);
    d.kurallar.push({ yontem, parcalar, isleyici });
    return null;
  });
  uye('Statik', 2, 2, (onEk, klasor) => {
    const o = metin(onEk, 'ön ek');
    if (!o.startsWith('/')) hata(`Ön ek '/' ile başlamalı: '${o}'`);
    const kl = metin(klasor, 'klasör');
    if (!kl) hata("'Statik': klasör adı boş olamaz");
    d.statik.push({ onEk: o, klasor: kl });
    return null;
  });
  uye('GövdeSınırı', 1, 1, (n) => {
    if (typeof n !== 'bigint' || n < 0n || n > 100n * 1024n * 1024n) hata("'GövdeSınırı': 0 ile 104857600 (100 MB) arasında bir tamsayı olmalı");
    d.govdeSiniri = Number(n);
    return null;
  });
  uye('Yanıt', 2, 3, (durum, govde, tur = null) => yanitSozlugu(durumSayisi(durum, 'Yanıt'), metne(govde), tur === null ? METIN : metin(tur, 'tür')));
  uye('JsonYanıt', 1, 2, (deger, durum = 200n) => yanitSozlugu(durumSayisi(durum, 'JsonYanıt'), jsonYap(jsonIcin(deger), null), JSON_TURU));
  uye('Yönlendir', 1, 2, (adres, durum = 302n) => {
    const a = metin(adres, 'adres'), n = durumSayisi(durum, 'Yönlendir');
    if (![301, 302, 303, 307, 308].includes(n)) hata("'Yönlendir': durum 301, 302, 303, 307 ya da 308 olmalı");
    if (!/^[\x21-\x7e]+$/.test(a)) hata("'Yönlendir': adres yalnızca ASCII karakterler içerebilir (Türkçe karakterler için UrlKodla kullanın)");
    return yanitSozlugu(n, '', METIN, [['location', a]]);
  });
  uye('SunucuyuDurdur', 0, 0, () => { d.durdur = true; return null; }, true);
  uye('İstekİşle', 2, 4, (yn, hedef, govde = null, basliklar = null) => {
    const h: Record<string, string> = {};
    if (basliklar !== null) {
      if (!(basliklar instanceof Map)) hata(`'başlıklar' sözlük bekler, ${turAdi(basliklar)} verildi`);
      basliklar.forEach((v: any, a: any) => { h[metne(a)] = metne(v); });
    }
    const ham: HamIstek = { yontem: metin(yn, 'yöntem'), hedef: metin(hedef, 'yol'), basliklar: h, govde: govde === null ? '' : metne(govde) };
    const r = isle(ham);
    const sonuc = hamYanit(r, ham.yontem);
    const k = $.konak;
    // ağ olmadan: dosya yanıtının içeriği metin olarak okunur
    const g = sonuc.bosGovde ? '' : sonuc.dosya && k && k.dosyaOku ? k.dosyaOku(sonuc.dosya) : sonuc.govde;
    const b = new Map<string, any>();
    for (const [a, v] of sonuc.basliklar) b.set(a, v);
    return new Map<string, any>([['durum', BigInt(sonuc.durum)], ['gövde', g], ['başlıklar', b]]);
  });
  uye('Dinle', 1, 2, (port, adres = '127.0.0.1') => {
    if (typeof port !== 'bigint' || port < 0n || port > 65535n) hata("'Dinle': port 0 ile 65535 arasında bir tamsayı olmalı");
    const k = $.konak;
    if (!k || !k.sunucu) hata('Sunucu birimi bu ortamda dinleyemez (tarayıcıda sunucu yoktur); İstekİşle ile sınayabilirsiniz');
    d.durdur = false;
    const durum = d;
    const ayar = { port: Number(port), adres: metin(adres, 'adres'), govdeSiniri: d.govdeSiniri };
    try {
      k!.sunucu!(ayar, (ham: HamIstek) => {
        d = durum;
        const sonuc = hamYanit(isle(ham), ham.yontem);
        if (d.durdur) sonuc.durdur = true;
        return sonuc;
      });
    } catch (e: any) {
      if (e instanceof YontemHatasi || e instanceof DurSinyali) throw e;
      hata(`Sunucu hatası: ${e && e.message ? e.message : e}`);
    }
    return null;
  });
  return U;
}

for (const ad of ['sunucu', 'server', 'web']) $.yerelBirimler.set(ad, sunucuModulu);
