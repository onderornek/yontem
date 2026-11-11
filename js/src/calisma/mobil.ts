// Mobil birimi — telefon özellikleri: titreşim, bildirim, paylaşma, konum, hareket algılayıcısı,
// ekran yönü ve kalıcı küçük veri deposu.
// Canlı kipte (oyun alanı, 'yontem paketle --mobil' ile üretilen uygulama) istekler tarayıcı
// API'lerine gider; benzetim kipinde (komut satırı, testler) belirlenimci değerlerle çalışır.
import { $, hata, metne, sifirlayiciEkle, katla } from './cekirdek';
import { fn, turAdi } from './deger';
import { gonder, canli, olayCalistir } from './pencere';

const BENZETIM_KONUM: [number, number] = [41.0082, 28.9784];   // İstanbul, Sultanahmet

let konum: [number, number] = BENZETIM_KONUM;
let yon = 'dikey', yonDegisti = false;
let hareketIsleyici: any = null, yonIsleyici: any = null;
let konumBekleyen = new Map<number, any>();
let istekNo = 0;
let depo = new Map<string, any>();
let depoYuklendi = false;

function sifirlaMobil() {
  konum = BENZETIM_KONUM; yon = 'dikey'; yonDegisti = false;
  hareketIsleyici = null; yonIsleyici = null;
  konumBekleyen = new Map(); istekNo = 0;
  depo = new Map(); depoYuklendi = false;
}
sifirlayiciEkle(sifirlaMobil);

const y = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) =>
  fn((...a: any[]) => {
    if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
    return f(...a);
  }, ad, enCok, enAz, [], oto);
function islevMi(f: any) {
  if (typeof f !== 'function') hata("Olay işleyicisi bir prosedür olmalı: '@Prosedür' ya da 'prosedür başla ... bitir'");
  return f;
}
function sayi(v: any, ad: string): number {
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'number') return v;
  hata(`'${ad}' sayı bekler, ${turAdi(v)} verildi`);
}
const cihaz = () => ($.konak && $.konak.cihaz) || {};
const yazSatir = (s: string) => $.konak.yaz(s + '\n');

// ---------------------------------------------------------------- depo: değerler etiketli JSON olarak saklanır
function kodla(v: any): any {
  if (typeof v === 'string') return { m: v };
  if (typeof v === 'bigint') return { t: v.toString() };
  if (typeof v === 'number') return { o: v };
  if (typeof v === 'boolean') return { b: v };
  if (v === null) return { n: 1 };
  if (Array.isArray(v)) return { l: v.map(kodla) };
  hata(`'Sakla' metin, sayı, mantıksal değer ya da bunların listesini saklar, ${turAdi(v)} verildi`);
}
function coz(k: any): any {
  if ('m' in k) return k.m;
  if ('t' in k) return BigInt(k.t);
  if ('o' in k) return k.o;
  if ('b' in k) return k.b;
  if ('l' in k) return k.l.map(coz);
  return null;
}
function depoHazirla() {
  if (depoYuklendi) return;
  depoYuklendi = true;
  const d = cihaz().depo;
  if (d) for (const a of Object.keys(d)) { try { depo.set(a, coz(JSON.parse(d[a]))); } catch (e) { /* bozuk kayıt atlanır */ } }
}

/** Canlı kipte tarayıcıdan gelen mobil olay */
$.mobilOlay = (m: { tur: string; id?: number; veri?: any; mesaj?: string }) => {
  if (m.tur === 'konum') {
    const f = konumBekleyen.get(m.id!);
    konumBekleyen.delete(m.id!);
    konum = [m.veri[0], m.veri[1]];
    if (f) olayCalistir(f, [konum[0], konum[1]]);
  } else if (m.tur === 'konumhata') {
    konumBekleyen.delete(m.id!);
    if ($.olayYurut) $.olayYurut(() => hata(`Konum alınamadı: ${m.mesaj}`));
  } else if (m.tur === 'hareket') {
    if (hareketIsleyici) olayCalistir(hareketIsleyici, [Number(m.veri[0]), Number(m.veri[1]), Number(m.veri[2])]);
  } else if (m.tur === 'yon') {
    yon = m.veri; yonDegisti = true;
    if (yonIsleyici) olayCalistir(yonIsleyici, [yon]);
  }
};

function mobilModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Mobil' };
  const uye = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) => { U[katla(ad)] = y(ad, enAz, enCok, f, oto); };

  uye('Platform', 0, 0, () => canli() ? String(cihaz().platform ?? 'tarayıcı') : 'benzetim', true);
  uye('Dokunmatik', 0, 0, () => canli() ? !!cihaz().dokunmatik : true, true);
  uye('EkranGenişliği', 0, 0, () => BigInt(canli() ? Math.round(cihaz().genislik ?? 390) : 390), true);
  uye('EkranYüksekliği', 0, 0, () => BigInt(canli() ? Math.round(cihaz().yukseklik ?? 844) : 844), true);
  uye('EkranYönü', 0, 0, () => (canli() && !yonDegisti) ? String(cihaz().yon ?? 'dikey') : yon, true);

  uye('Titreşim', 0, 1, (ms = 200n) => {
    const v = Math.max(0, Math.round(sayi(ms, 'süre')));
    if (canli()) gonder({ op: 'titresim', ms: v }); else yazSatir(`[Titreşim ${v} ms]`);
    return null;
  });
  uye('Bildirim', 1, 2, (b, m = '') => {
    const baslik = metne(b), metin = metne(m);
    if (canli()) gonder({ op: 'bildirim', baslik, metin }); else yazSatir(`[Bildirim] ${baslik}${metin ? ': ' + metin : ''}`);
    return null;
  });
  uye('Paylaş', 1, 1, m => {
    const metin = metne(m);
    if (canli()) gonder({ op: 'paylas', metin }); else yazSatir(`[Paylaş] ${metin}`);
    return null;
  });
  uye('KonumAl', 1, 1, f => {
    islevMi(f);
    if (canli()) { const id = ++istekNo; konumBekleyen.set(id, f); gonder({ op: 'konum', id }); }
    else olayCalistir(f, [konum[0], konum[1]]);
    return null;
  });
  uye('HareketOlunca', 1, 1, f => { hareketIsleyici = islevMi(f); gonder({ op: 'hareket' }); return null; });
  uye('YönDeğişince', 1, 1, f => { yonIsleyici = islevMi(f); gonder({ op: 'yon' }); return null; });

  uye('Sakla', 2, 2, (a, v) => {
    depoHazirla();
    const anahtar = metne(a), k = kodla(v);
    depo.set(anahtar, coz(k));
    gonder({ op: 'sakla', anahtar, kod: JSON.stringify(k) });
    return null;
  });
  uye('Getir', 1, 2, (a, vs = null) => {
    depoHazirla();
    const anahtar = metne(a);
    if (!depo.has(anahtar)) return vs;
    return coz(kodla(depo.get(anahtar)));
  });
  uye('Unut', 1, 1, a => { depoHazirla(); const anahtar = metne(a); depo.delete(anahtar); gonder({ op: 'unut', anahtar }); return null; });

  uye('BenzetimKonum', 2, 2, (a, b) => { konum = [sayi(a, 'enlem'), sayi(b, 'boylam')]; return null; });
  uye('BenzetimHareket', 3, 3, (a, b, c) => {
    const v = [sayi(a, 'x'), sayi(b, 'y'), sayi(c, 'z')];
    if (hareketIsleyici) olayCalistir(hareketIsleyici, v);
    return null;
  });
  uye('Salla', 0, 0, () => { if (hareketIsleyici) olayCalistir(hareketIsleyici, [0.0, 0.0, 25.0]); return null; }, true);
  uye('BenzetimYön', 1, 1, v => {
    const s = metne(v);
    if (s !== 'dikey' && s !== 'yatay') hata("Ekran yönü 'dikey' ya da 'yatay' olabilir");
    yon = s; yonDegisti = true;
    if (yonIsleyici) olayCalistir(yonIsleyici, [yon]);
    return null;
  });
  return U;
}

$.yerelBirimler.set('mobil', mobilModulu);
$.yerelBirimler.set('mobile', mobilModulu);
