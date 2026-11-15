// Tarayıcı girişi: derleyici + çalışma zamanı tek pakette. Web Worker içinde de çalışır.
import { katla } from './sozcuk';
import { derle, kodCalistir, hataIsle } from './calistir';
import { GOMULU_BIRIMLER } from './gomulu';
import { $ } from './calisma/cekirdek';
import { DurSinyali } from './hatalar';
export { ArayuzGorunumu, cihazBilgisi } from './tarayici_arayuz';

export const SURUM = '0.6.1';

export interface Secenekler {
  girdi?: string;
  yaz(s: string): void;
  hata?(m: string): void;
  birimler?: Record<string, string>;   // ek birim kaynakları (ad → kaynak)
  argumanlar?: string[];
  iz?(m: string): void;                // Donanım benzetimi pin izi
  arayuz?(op: any): void;              // Pencere/Mobil canlı arayüz işlemleri
  cihaz?: any;                         // Mobil birimi için cihaz bilgisi
}

function birimBulucu(ek: Record<string, string> = {}) {
  const tum: Record<string, { yol: string; kaynak: string }> = {};
  for (const [ad, kaynak] of Object.entries(GOMULU_BIRIMLER)) tum[katla(ad)] = { yol: `kutuphane/${ad}.y`, kaynak };
  for (const [ad, kaynak] of Object.entries(ek)) tum[katla(ad.replace(/\.y$/i, ''))] = { yol: `${ad.replace(/\.y$/i, '')}.y`, kaynak };
  return (ad: string) => tum[ad] ?? null;
}

export function jsUret(kaynak: string, birimler?: Record<string, string>): string {
  return derle(kaynak, 'program.y', birimBulucu(birimler));
}

// Ağ birimi: tarayıcıda eşzamanlı XMLHttpRequest. Başka sitelere istek, o site izin veriyorsa (CORS) çalışır.
function tarayiciHttp(i: any): any {
  try {
    const x = new XMLHttpRequest();
    x.open(i.yontem, i.adres, false);
    for (const [a, v] of i.basliklar) { try { x.setRequestHeader(a, v); } catch (e) { /* tarayıcının yasakladığı başlıklar atlanır */ } }
    x.send(i.govde === null ? null : i.govde);
    if (!x.status) return { hata: 'baglanti' };
    const bs: Record<string, string> = {};
    for (const satir of x.getAllResponseHeaders().split(/\r?\n/)) {
      const k = satir.indexOf(':');
      if (k > 0) bs[satir.slice(0, k).trim().toLowerCase()] = satir.slice(k + 1).trim();
    }
    const govde = x.responseText ?? '';
    if (govde.length > 10 * 1024 * 1024) return { hata: 'boyut' };
    return { durum: x.status, basliklar: bs, govde };
  } catch (e) { return { hata: 'baglanti' }; }
}

function konakKur(s: Secenekler) {
  const satirlar = (s.girdi ?? '').split(/(?<=\n)/).filter(x => x !== '');
  let i = 0;
  const bellek: Record<string, string> = {};
  const konak = {
    yaz: s.yaz,
    okuSatir: () => (i < satirlar.length ? satirlar[i++] : null),
    argumanlar: s.argumanlar ?? [],
    dosyaOku: (y: string) => { if (y in bellek) return bellek[y]; const e: any = new Error('No such file or directory'); e.strerror = 'No such file or directory'; throw e; },
    dosyaYaz: (y: string, icerik: string, ekle: boolean) => { bellek[y] = (ekle && bellek[y] ? bellek[y] : '') + icerik; },
    dosyaVarMi: (y: string) => y in bellek,
    hata: s.hata,
    iz: s.iz,
    arayuz: s.arayuz,
    cihaz: s.cihaz,
    http: typeof XMLHttpRequest === 'undefined' ? undefined : tarayiciHttp,
  };
  // Canlı arayüzde olay işleyicilerindeki hatalar programı durdurmaz, bildirilir
  $.olayYurut = (f: () => void) => {
    try { f(); }
    catch (e) {
      const kod = hataIsle(e, konak);
      if (e instanceof DurSinyali && s.arayuz) s.arayuz({ op: 'kapat', kod });
    }
  };
  return konak;
}

/** Kaynağı derleyip çalıştırır; çıkış kodunu döndürür. */
export function calistir(kaynak: string, s: Secenekler): number {
  let kod: string;
  try { kod = jsUret(kaynak, s.birimler); } catch (e) { return hataIsle(e, s); }
  return kodCalistir(kod, konakKur(s));
}

/** Önceden derlenmiş kodu çalıştırır (yontem paketle ile üretilen uygulamalar) */
export function kodlaCalistir(kod: string, s: Secenekler): number {
  return kodCalistir(kod, konakKur(s));
}

/** Program bittikten sonra arayüz olayları bekleniyor mu? */
export const arayuzBekliyor = (): boolean => !!($.arayuzBekliyor && $.arayuzBekliyor());
/** Tarayıcıdan gelen Pencere olayı */
export const olay = (m: any) => { if ($.olayYurut) $.olayYurut(() => $.arayuzOlay(m)); else $.arayuzOlay(m); };
/** Tarayıcıdan gelen Mobil olayı */
export const mobilOlay = (m: any) => { if ($.olayYurut) $.olayYurut(() => $.mobilOlay(m)); else $.mobilOlay(m); };

export const kutuphane = GOMULU_BIRIMLER;

// Web Worker: { kaynak, girdi, birimler, iz, canli, cihaz } alır;
// { tur: 'cikti' | 'hata' | 'iz' | 'arayuz' | 'bitti' } gönderir. 'bitti' sonrası canlı arayüz varsa
// { tur: 'olay' | 'mobil', veri } mesajlarını işlemeyi sürdürür.
declare const self: any;
if (typeof self !== 'undefined' && typeof self.importScripts === 'function' && typeof window === 'undefined') {
  let tampon = '', son = Date.now(), islemler: any[] = [];
  const bosalt = () => {
    if (islemler.length) { self.postMessage({ tur: 'arayuz', islemler }); islemler = []; }
    if (tampon) { self.postMessage({ tur: 'cikti', metin: tampon }); tampon = ''; }
    son = Date.now();
  };
  const zamanli = () => { if (Date.now() - son > 60) bosalt(); };
  self.onmessage = (ev: any) => {
    const m = ev.data;
    if (m.tur === 'olay' || m.tur === 'mobil') {
      if (m.tur === 'olay') olay(m.veri); else mobilOlay(m.veri);
      bosalt();
      return;
    }
    const { kaynak, girdi, birimler, iz, canli, cihaz } = m;
    const t0 = performance.now();
    const kodu = calistir(kaynak, {
      girdi, birimler, cihaz,
      yaz: (x) => { tampon += x; if (tampon.length > 4096) bosalt(); else zamanli(); },
      hata: (x) => { bosalt(); self.postMessage({ tur: 'hata', metin: x }); },
      iz: iz ? (x) => { bosalt(); self.postMessage({ tur: 'iz', metin: x + '\n' }); } : undefined,
      arayuz: canli ? (op) => { if (op.op === 'kapat') { bosalt(); self.postMessage({ tur: 'kapat', kod: op.kod }); return; } islemler.push(op); if (islemler.length > 500) bosalt(); else zamanli(); } : undefined,
    });
    bosalt();
    self.postMessage({ tur: 'bitti', kod: kodu, sure: performance.now() - t0, canli: !!canli && kodu === 0 && arayuzBekliyor() });
    // Aralıkla zamanlayıcılarından gelen çıktılar için düzenli boşalt
    if (canli && kodu === 0 && arayuzBekliyor()) setInterval(bosalt, 100);
  };
}
