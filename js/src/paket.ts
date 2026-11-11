// Paket yöneticisi: 'yontem paket ekle|kur|kaldir|guncelle|liste'.
//
// Paket, birim (.y) dosyaları içeren bir klasördür; merkezî bir kayıt yoktur. Kaynak bir Git barındırıcısındaki
// depo (github:kullanıcı/depo@etiket), bir arşiv ya da tek .y dosyasının HTTPS adresi ya da yerel bir klasördür.
//   yontem.json        projenin bildirimi: ad, sürüm ve bağımlılıklar (ad → kaynak)
//   yontem.kilit.json  kurulan her paketin kaynağı ve içerik özeti (SHA-256); kurulumun yinelenebilir olmasını sağlar
//   paketler/<Ad>/     kurulan paketler; birimler paketin kökünde ya da kutuphane/ klasöründe aranır
// Kurulum yalnızca dosya kopyalar: paketlerdeki hiçbir kod kurulum sırasında çalıştırılmaz.
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { katla } from './sozcuk';

export const BILDIRIM = 'yontem.json', KILIT = 'yontem.kilit.json', PAKET_DIZINI = 'paketler';
const INDIRME_SINIRI = 50 * 1024 * 1024, ACILMIS_SINIR = 100 * 1024 * 1024, DOSYA_SINIRI = 5000;
const AD_DESENI = /^[\p{L}_][\p{L}\p{N}_-]*$/u;

export class PaketHatasi extends Error { }
const hata = (m: string): never => { throw new PaketHatasi(m); };

interface Dosya { yol: string; veri: Buffer }
interface Bildirim { ad?: string; surum?: string; bagimliliklar?: Record<string, string>; [k: string]: any }
interface KilitKaydi { kaynak: string; adres: string; sha256: string; surum?: string; isteyen?: string }
interface Kilit { bicim: 1; paketler: Record<string, KilitKaydi> }

// ================================================================ proje kökü ve birim dizinleri
/** Verilen dizinden yukarı doğru yontem.json içeren ilk dizini bulur */
export function projeKoku(dizin: string): string | null {
  let d = path.resolve(dizin);
  for (;;) {
    if (fs.existsSync(path.join(d, BILDIRIM))) return d;
    const ust = path.dirname(d);
    if (ust === d) return null;
    d = ust;
  }
}
/** Programın görebildiği paketlerin birim dizinleri: paketler/<Ad> ve varsa paketler/<Ad>/kutuphane (ada göre sıralı) */
export function paketDizinleri(programDizini: string): string[] {
  const kok = projeKoku(programDizini);
  if (!kok) return [];
  const pd = path.join(kok, PAKET_DIZINI);
  let adlar: string[];
  try { adlar = fs.readdirSync(pd).filter(a => !a.startsWith('.') && fs.statSync(path.join(pd, a)).isDirectory()).sort(); } catch { return []; }
  const out: string[] = [];
  for (const a of adlar) {
    out.push(path.join(pd, a));
    const k = path.join(pd, a, 'kutuphane');
    if (fs.existsSync(k) && fs.statSync(k).isDirectory()) out.push(k);
  }
  return out;
}

// ================================================================ arşivler
/** Arşivdeki yolu denetler; güvenli değilse hata, atlanacaksa null */
function guvenliYol(ham: string): string | null {
  const y = ham.replace(/\\/g, '/');
  if (y.includes('\0') || y.startsWith('/') || /^[A-Za-z]:/.test(y)) hata(`Arşivde güvenli olmayan yol: '${ham}'`);
  const parcalar = y.split('/').filter(p => p !== '' && p !== '.');
  if (parcalar.includes('..')) hata(`Arşivde güvenli olmayan yol: '${ham}'`);
  if (!parcalar.length) return null;
  if (parcalar.some(p => p.startsWith('.'))) return null;             // .git, .github, .DS_Store …
  return parcalar.join('/');
}

function tarOku(buf: Buffer): Dosya[] {
  const out: Dosya[] = [];
  const metin = (a: number, n: number) => { const s = buf.subarray(a, a + n); const i = s.indexOf(0); return s.subarray(0, i < 0 ? n : i).toString('utf-8'); };
  let i = 0, uzunAd: string | null = null, toplam = 0;
  while (i + 512 <= buf.length) {
    const baslik = buf.subarray(i, i + 512);
    if (baslik.every(b => b === 0)) break;
    const boyut = parseInt(metin(i + 124, 12).trim() || '0', 8);
    if (!Number.isFinite(boyut) || boyut < 0) hata('Arşiv bozuk (tar başlığı okunamadı)');
    const tip = String.fromCharCode(buf[i + 156] || 48);
    let ad = metin(i, 100);
    const onek = metin(i + 345, 155);
    if (metin(i + 257, 5) === 'ustar' && onek) ad = onek + '/' + ad;
    const veri = buf.subarray(i + 512, i + 512 + boyut);
    if (veri.length < boyut) hata('Arşiv bozuk (tar erken bitiyor)');
    i += 512 + Math.ceil(boyut / 512) * 512;
    if (tip === 'L') { uzunAd = veri.toString('utf-8').replace(/\0+$/, ''); continue; }         // GNU uzun ad
    if (tip === 'x') {                                                                          // pax: path=…
      const m = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(veri.toString('utf-8'));
      if (m) uzunAd = m[1];
      continue;
    }
    if (tip === 'g') continue;                                                                  // pax genel başlık
    if (uzunAd !== null) { ad = uzunAd; uzunAd = null; }
    if (tip !== '0' && tip !== '7') continue;                                                   // klasör, bağ vb. atlanır
    const yol = guvenliYol(ad);
    if (yol === null) continue;
    toplam += boyut;
    if (toplam > ACILMIS_SINIR || out.length >= DOSYA_SINIRI) hata('Paket çok büyük (en çok 100 MB, 5000 dosya)');
    out.push({ yol, veri: Buffer.from(veri) });
  }
  return out;
}

function zipOku(buf: Buffer): Dosya[] {
  let s = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) if (buf.readUInt32LE(i) === 0x06054b50) { s = i; break; }
  if (s < 0) hata('Arşiv bozuk (zip dizini bulunamadı)');
  const adet = buf.readUInt16LE(s + 10);
  let p = buf.readUInt32LE(s + 16);
  const out: Dosya[] = [];
  let toplam = 0;
  for (let k = 0; k < adet; k++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) hata('Arşiv bozuk (zip girdisi okunamadı)');
    const yontem = buf.readUInt16LE(p + 10), sBoyut = buf.readUInt32LE(p + 20), boyut = buf.readUInt32LE(p + 24);
    const adU = buf.readUInt16LE(p + 28), ekU = buf.readUInt16LE(p + 30), yorumU = buf.readUInt16LE(p + 32);
    const dis = buf.readUInt32LE(p + 38), yerel = buf.readUInt32LE(p + 42);
    const ad = buf.subarray(p + 46, p + 46 + adU).toString('utf-8');
    p += 46 + adU + ekU + yorumU;
    if (ad.endsWith('/')) continue;
    if (((dis >>> 16) & 0o170000) === 0o120000) continue;                                       // simgesel bağ
    const yol = guvenliYol(ad);
    if (yol === null) continue;
    if (sBoyut === 0xffffffff || boyut === 0xffffffff) hata('Arşiv desteklenmiyor (zip64)');
    toplam += boyut;
    if (toplam > ACILMIS_SINIR || out.length >= DOSYA_SINIRI) hata('Paket çok büyük (en çok 100 MB, 5000 dosya)');
    if (yerel + 30 > buf.length || buf.readUInt32LE(yerel) !== 0x04034b50) hata('Arşiv bozuk (zip yerel başlığı)');
    const bas = yerel + 30 + buf.readUInt16LE(yerel + 26) + buf.readUInt16LE(yerel + 28);
    const ham = buf.subarray(bas, bas + sBoyut);
    let veri: Buffer;
    if (yontem === 0) veri = Buffer.from(ham);
    else if (yontem === 8) { try { veri = zlib.inflateRawSync(ham, { maxOutputLength: ACILMIS_SINIR }); } catch { return hata(`Arşiv bozuk ('${ad}' açılamadı)`); } }
    else return hata(`Arşiv desteklenmiyor ('${ad}': sıkıştırma yöntemi ${yontem})`);
    if (veri.length !== boyut) hata(`Arşiv bozuk ('${ad}' boyutu tutmuyor)`);
    out.push({ yol, veri });
  }
  return out;
}

/** Bütün dosyalar tek bir üst klasördeyse (GitHub arşivleri: depo-etiket/…) o klasörü atar */
function kokuSoy(dosyalar: Dosya[]): Dosya[] {
  if (!dosyalar.length) return dosyalar;
  const ilk = dosyalar[0].yol.split('/')[0];
  if (!dosyalar.every(d => d.yol.includes('/') && d.yol.split('/')[0] === ilk)) return dosyalar;
  return dosyalar.map(d => ({ yol: d.yol.slice(ilk.length + 1), veri: d.veri }));
}

/** İndirilen içeriği dosya listesine çevirir: tar.gz, zip ya da tek .y dosyası */
function icerikAc(veri: Buffer, dosyaAdi: string): Dosya[] {
  let dosyalar: Dosya[];
  if (veri.length > 2 && veri[0] === 0x1f && veri[1] === 0x8b) {
    let tar: Buffer;
    try { tar = zlib.gunzipSync(veri, { maxOutputLength: ACILMIS_SINIR + 16 * 1024 * 1024 }); } catch { return hata('Arşiv açılamadı (gzip bozuk ya da çok büyük)'); }
    dosyalar = kokuSoy(tarOku(tar));
  } else if (veri.length > 4 && veri.readUInt32LE(0) === 0x04034b50) dosyalar = kokuSoy(zipOku(veri));
  else if (/\.y$/i.test(dosyaAdi)) dosyalar = [{ yol: path.basename(dosyaAdi), veri }];
  else return hata('Kaynak tanınmadı: .tar.gz, .zip arşivi ya da .y dosyası olmalı');
  // iç içe paket klasörleri ve bağımlılık klasörleri alınmaz
  dosyalar = dosyalar.filter(d => !/^(paketler|node_modules)\//.test(d.yol) && d.yol !== KILIT);
  const gorulen = new Set<string>();
  for (const d of dosyalar) { const a = d.yol.toLocaleLowerCase('tr'); if (gorulen.has(a)) hata(`Arşivde aynı dosya iki kez var: '${d.yol}'`); gorulen.add(a); }
  return dosyalar;
}

function klasorOku(kok: string): Dosya[] {
  const out: Dosya[] = [];
  const gez = (d: string, on: string) => {
    for (const a of fs.readdirSync(d).sort()) {
      if (a.startsWith('.')) continue;
      const tam = path.join(d, a), st = fs.lstatSync(tam);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) { if (on === '' && (a === PAKET_DIZINI || a === 'node_modules')) continue; gez(tam, on + a + '/'); }
      else if (st.isFile() && !(on === '' && a === KILIT)) {
        if (out.length >= DOSYA_SINIRI) hata('Paket çok büyük (en çok 5000 dosya)');
        out.push({ yol: on + a, veri: fs.readFileSync(tam) });
      }
    }
  };
  gez(kok, '');
  return out;
}

/** İçerik özeti: dosya yolları sıralanır; arşivin nasıl sıkıştırıldığından bağımsızdır */
function ozet(dosyalar: Dosya[]): string {
  const h = crypto.createHash('sha256');
  for (const d of [...dosyalar].sort((a, b) => a.yol < b.yol ? -1 : a.yol > b.yol ? 1 : 0)) { h.update(`${d.yol}\0${d.veri.length}\0`); h.update(d.veri); }
  return h.digest('hex');
}
const birimleri = (dosyalar: Dosya[]) => dosyalar.filter(d => /^(kutuphane\/)?[^/]+\.y$/i.test(d.yol)).map(d => path.basename(d.yol).replace(/\.y$/i, ''));

// ================================================================ kaynaklar
interface Kaynak { tur: 'url' | 'yerel'; adres: string; onerilenAd: string; etiket: string | null }

function kaynakCoz(kaynak: string, kok: string, yerelIzinli: boolean): Kaynak {
  let m = /^(github|gitlab):([\w.-]+)\/([\w.-]+?)(?:@(.+))?$/.exec(kaynak);
  if (m) {
    const [, yer, kisi, depo, etiket] = m;
    const ref = etiket ?? 'HEAD';
    if (!/^[\w./+-]+$/.test(ref) || ref.includes('..')) hata(`Geçersiz etiket: '${ref}'`);
    const adres = yer === 'github' ? `https://codeload.github.com/${kisi}/${depo}/tar.gz/${ref}` : `https://gitlab.com/${kisi}/${depo}/-/archive/${ref}/${depo}-${ref.replace(/\//g, '-')}.tar.gz`;
    return { tur: 'url', adres, onerilenAd: depo.replace(/^yontem[-_]/i, ''), etiket: etiket ?? null };
  }
  if (/^https?:\/\//i.test(kaynak)) {
    let u: URL;
    try { u = new URL(kaynak); } catch { return hata(`Geçersiz adres: '${kaynak}'`); }
    const yerelAg = ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname);
    if (u.protocol !== 'https:' && !yerelAg) hata(`Paketler yalnızca HTTPS ile indirilir: '${kaynak}'`);
    if (u.username || u.password) hata('Adres kullanıcı adı ya da parola içeremez (kilit dosyasına yazılırdı)');
    const son = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() ?? 'paket');
    return { tur: 'url', adres: u.toString(), onerilenAd: son.replace(/\.(tar\.gz|tgz|zip|y)$/i, '').replace(/^yontem[-_]/i, ''), etiket: null };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(kaynak) && !/^[A-Za-z]:[\\/]/.test(kaynak)) hata(`Bilinmeyen kaynak türü: '${kaynak}' (github:kullanıcı/depo@etiket, gitlab:…, https://… ya da yerel yol)`);
  if (!yerelIzinli) hata(`İndirilen bir paket yerel yola bağımlı olamaz: '${kaynak}'`);
  const yol = path.resolve(kok, kaynak);
  if (!fs.existsSync(yol)) hata(`Kaynak bulunamadı: '${kaynak}'`);
  return { tur: 'yerel', adres: kaynak.replace(/\\/g, '/'), onerilenAd: path.basename(yol).replace(/\.y$/i, '').replace(/^yontem[-_]/i, ''), etiket: null };
}

const indirilen = new Map<string, { veri: Buffer; son: string }>();     // aynı çalıştırmada aynı adres bir kez indirilir
async function indir(adres: string): Promise<{ veri: Buffer; son: string }> {
  const onbellek = indirilen.get(adres);
  if (onbellek) return onbellek;
  const d = new AbortController();
  const z = setTimeout(() => d.abort(), 60000);
  try {
    const r = await fetch(adres, { redirect: 'follow', signal: d.signal, headers: { 'User-Agent': 'Yontem-paket' } });
    if (!r.ok) hata(`İndirilemedi (${r.status}): ${adres}`);
    if (r.url && !/^https:/i.test(r.url) && !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(r.url).hostname)) hata(`Sunucu HTTPS olmayan bir adrese yönlendirdi: ${r.url}`);
    const b = Buffer.from(await r.arrayBuffer());
    if (b.length > INDIRME_SINIRI) hata(`Paket çok büyük (en çok 50 MB): ${adres}`);
    const sonuc = { veri: b, son: r.url || adres };          // yönlendirme sonrası adres: dosya türü ondan anlaşılır
    indirilen.set(adres, sonuc);
    return sonuc;
  } catch (e: any) {
    if (e instanceof PaketHatasi) throw e;
    return hata(d.signal.aborted ? `Zaman aşımı: ${adres}` : `Bağlanılamadı: ${adres}`);
  } finally { clearTimeout(z); }
}

async function kaynaktanAl(k: Kaynak, kok: string): Promise<Dosya[]> {
  let dosyalar: Dosya[];
  if (k.tur === 'yerel') {
    const yol = path.resolve(kok, k.adres);
    dosyalar = fs.statSync(yol).isDirectory() ? klasorOku(yol) : icerikAc(fs.readFileSync(yol), yol);
  } else { const i = await indir(k.adres); dosyalar = icerikAc(i.veri, decodeURIComponent(new URL(i.son).pathname)); }
  if (!birimleri(dosyalar).length) hata(`Pakette birim yok: kökünde ya da kutuphane/ klasöründe .y dosyası bulunamadı (${k.adres})`);
  return dosyalar;
}

// ================================================================ bildirim ve kilit
function jsonOku<T>(yol: string, varsayilan: T): T {
  if (!fs.existsSync(yol)) return varsayilan;
  try { return JSON.parse(fs.readFileSync(yol, 'utf-8')); } catch (e: any) { return hata(`${path.basename(yol)} okunamadı: ${e.message}`); }
}
const jsonYaz = (yol: string, v: any) => fs.writeFileSync(yol, JSON.stringify(v, null, 2) + '\n');
function bildirimOku(kok: string): Bildirim {
  const b = jsonOku<Bildirim>(path.join(kok, BILDIRIM), {});
  if (b === null || typeof b !== 'object' || Array.isArray(b)) hata(`${BILDIRIM} bir nesne olmalı`);
  const bag = b.bagimliliklar ?? {};
  if (typeof bag !== 'object' || Array.isArray(bag)) hata(`${BILDIRIM}: 'bagimliliklar' bir nesne olmalı (ad → kaynak)`);
  for (const [ad, k] of Object.entries(bag)) {
    if (!AD_DESENI.test(ad)) hata(`${BILDIRIM}: geçersiz paket adı '${ad}'`);
    if (typeof k !== 'string' || !k) hata(`${BILDIRIM}: '${ad}' paketinin kaynağı bir metin olmalı`);
  }
  return b;
}
function paketBildirimi(dosyalar: Dosya[]): Bildirim {
  const d = dosyalar.find(x => x.yol === BILDIRIM);
  if (!d) return {};
  try {
    const b = JSON.parse(d.veri.toString('utf-8'));
    if (b === null || typeof b !== 'object' || Array.isArray(b)) return {};
    const bag = b.bagimliliklar;
    if (bag !== undefined) for (const [ad, k] of Object.entries(bag ?? {})) if (!AD_DESENI.test(ad) || typeof k !== 'string') hata(`Paketin ${BILDIRIM} dosyasında geçersiz bağımlılık: '${ad}'`);
    return b;
  } catch (e) { if (e instanceof PaketHatasi) throw e; return hata(`Paketin ${BILDIRIM} dosyası okunamadı`); }
}
const kilitOku = (kok: string): Kilit => { const k = jsonOku<Kilit>(path.join(kok, KILIT), { bicim: 1, paketler: {} }); if (!k || typeof k.paketler !== 'object') hata(`${KILIT} bozuk; silip 'yontem paket kur' ile yeniden oluşturun`); return k; };

function klasoreYaz(hedef: string, dosyalar: Dosya[]) {
  fs.rmSync(hedef, { recursive: true, force: true });
  for (const d of dosyalar) {
    const tam = path.join(hedef, ...d.yol.split('/'));
    if (!path.resolve(tam).startsWith(path.resolve(hedef) + path.sep)) hata(`Güvenli olmayan yol: '${d.yol}'`);
    fs.mkdirSync(path.dirname(tam), { recursive: true });
    fs.writeFileSync(tam, d.veri);
  }
}

// ================================================================ çözümleme ve kurulum
interface Sonuc { kurulan: string[]; ayni: string[]; kaldirilan: string[]; uyarilar: string[] }

/** Bildirimdeki bağımlılıkları (ve onların bağımlılıklarını) kurar; kilidi ve paketler/ klasörünü eşitler.
 *  guncelle: kilide bakmadan yeniden indirilecek paketler ('*' hepsi). */
async function esitle(kok: string, guncelle: Set<string>, bildir: (m: string) => void): Promise<Sonuc> {
  const b = bildirimOku(kok), eski = kilitOku(kok);
  const yeni: Kilit = { bicim: 1, paketler: {} };
  const s: Sonuc = { kurulan: [], ayni: [], kaldirilan: [], uyarilar: [] };
  const pd = path.join(kok, PAKET_DIZINI);
  const kuyruk: { ad: string; kaynak: string; isteyen: string | null }[] = Object.entries(b.bagimliliklar ?? {}).map(([ad, kaynak]) => ({ ad, kaynak, isteyen: null }));
  const katli = new Map<string, string>();
  while (kuyruk.length) {
    const { ad, kaynak, isteyen } = kuyruk.shift()!;
    const anahtar = katla(ad);
    const onceki = katli.get(anahtar);
    if (onceki !== undefined) {
      const k = yeni.paketler[onceki];
      if (k.kaynak !== kaynak) hata(`'${ad}' paketi iki farklı kaynaktan isteniyor:\n  ${k.kaynak}${k.isteyen ? ` (${k.isteyen} istiyor)` : ''}\n  ${kaynak}${isteyen ? ` (${isteyen} istiyor)` : ''}\nBirini seçip ${BILDIRIM} dosyanıza doğrudan ekleyin.`);
      continue;
    }
    katli.set(anahtar, ad);
    const cozulmus = kaynakCoz(kaynak, kok, isteyen === null);
    const kilitli = eski.paketler[ad] && eski.paketler[ad].kaynak === kaynak && !guncelle.has('*') && !guncelle.has(anahtar) ? eski.paketler[ad] : null;
    const hedef = path.join(pd, ad);
    let dosyalar: Dosya[] | null = null;
    // Yerel kaynak her seferinde yeniden okunur (geliştirme sırasında değişir); indirilenler kilitle aynıysa indirilmez
    if (kilitli && cozulmus.tur === 'url' && fs.existsSync(hedef)) {
      const kurulu = klasorOku(hedef);
      if (ozet(kurulu) === kilitli.sha256) { dosyalar = kurulu; s.ayni.push(ad); }
    }
    if (!dosyalar) {
      bildir(`${ad}: ${cozulmus.tur === 'yerel' ? 'kopyalanıyor' : 'indiriliyor'} (${kaynak})`);
      dosyalar = await kaynaktanAl(cozulmus, kok);
      const o = ozet(dosyalar);
      if (kilitli && cozulmus.tur === 'url' && o !== kilitli.sha256)
        hata(`'${ad}' paketinin içeriği kilit dosyasındakiyle aynı değil.\n  beklenen: ${kilitli.sha256}\n  gelen:    ${o}\nKaynak değişmiş olabilir. Değişikliği kabul ediyorsanız: yontem paket guncelle ${ad}`);
      const kuruluAyni = fs.existsSync(hedef) && ozet(klasorOku(hedef)) === o;
      if (!kuruluAyni) { klasoreYaz(hedef, dosyalar); s.kurulan.push(ad); } else s.ayni.push(ad);
    }
    const pb = paketBildirimi(dosyalar);
    yeni.paketler[ad] = { kaynak, adres: cozulmus.adres, sha256: ozet(dosyalar), ...(typeof pb.surum === 'string' ? { surum: pb.surum } : cozulmus.etiket ? { surum: cozulmus.etiket } : {}), ...(isteyen ? { isteyen } : {}) };
    for (const [a2, k2] of Object.entries(pb.bagimliliklar ?? {})) kuyruk.push({ ad: a2, kaynak: k2 as string, isteyen: ad });
  }
  // Artık istenmeyen paketleri kaldır
  if (fs.existsSync(pd)) for (const a of fs.readdirSync(pd)) {
    if (a.startsWith('.') || yeni.paketler[a]) continue;
    if (fs.statSync(path.join(pd, a)).isDirectory()) { fs.rmSync(path.join(pd, a), { recursive: true, force: true }); s.kaldirilan.push(a); }
  }
  if (fs.existsSync(pd) && !fs.readdirSync(pd).length) fs.rmdirSync(pd);
  // Aynı adlı birimi iki paket sağlıyorsa hangisinin bulunacağı ada göre sıraya bağlıdır: uyar
  const saglayan = new Map<string, string>();
  for (const ad of Object.keys(yeni.paketler).sort()) {
    for (const birim of birimleri(klasorOku(path.join(pd, ad)))) {
      const o = saglayan.get(katla(birim));
      if (o && o !== ad) s.uyarilar.push(`'${birim}' birimi hem ${o} hem ${ad} paketinde var; 'kullan ${birim}' ${o} paketindekini bulur`);
      else saglayan.set(katla(birim), ad);
    }
  }
  const sirali: Kilit = { bicim: 1, paketler: Object.fromEntries(Object.keys(yeni.paketler).sort().map(a => [a, yeni.paketler[a]])) };
  if (Object.keys(sirali.paketler).length || fs.existsSync(path.join(kok, KILIT))) jsonYaz(path.join(kok, KILIT), sirali);
  return s;
}

// ================================================================ komutlar
const KULLANIM = `Kullanım:
  yontem paket ekle <kaynak> [--ad Ad]   paketi indirir, ${BILDIRIM} ve kilit dosyasına yazar
  yontem paket kur                       ${BILDIRIM} dosyasındaki paketleri kurar (kilit dosyasıyla doğrular)
  yontem paket kaldir <ad>               paketi ve artık gerekmeyen bağımlılıklarını kaldırır
  yontem paket guncelle [ad]             paketi (ya da hepsini) kaynağından yeniden indirir
  yontem paket liste                     kurulu paketleri ve sağladıkları birimleri gösterir

Kaynaklar:
  github:kullanıcı/depo@etiket    GitHub deposu (etiket, dal ya da commit; verilmezse varsayılan dal)
  gitlab:kullanıcı/depo@etiket    GitLab deposu
  https://…/paket.tar.gz          arşiv (.tar.gz, .tgz, .zip) ya da tek birim dosyası (.y)
  ../klasor                       yerel klasör ya da .y dosyası`;

export async function paketKomutu(argv: string[], yaz: (m: string) => void, hataYaz: (m: string) => void, cwd = process.cwd()): Promise<number> {
  const komut = (argv[0] ?? '').toLocaleLowerCase('tr');
  const deger = (bayrak: string) => { const i = argv.indexOf(bayrak); return i >= 0 ? argv[i + 1] : undefined; };
  const konumsal = argv.slice(1).filter((a, i, l) => !a.startsWith('--') && l[i - 1] !== '--ad');
  const ozetle = (s: Sonuc) => {
    for (const u of s.uyarilar) hataYaz('uyarı: ' + u);
    const p: string[] = [];
    if (s.kurulan.length) p.push(`kuruldu: ${s.kurulan.join(', ')}`);
    if (s.kaldirilan.length) p.push(`kaldırıldı: ${s.kaldirilan.join(', ')}`);
    if (s.ayni.length) p.push(`${s.ayni.length} paket zaten güncel`);
    yaz(p.length ? p.join('; ') : 'Kurulacak paket yok');
  };
  try {
    const kok = projeKoku(cwd) ?? cwd;
    switch (komut) {
      case 'ekle': {
        const kaynak = konumsal[0];
        if (!kaynak) { hataYaz('Kullanım: yontem paket ekle <kaynak> [--ad Ad]'); return 1; }
        const b = bildirimOku(kok);
        const cozulmus = kaynakCoz(kaynak, kok, true);
        let ad = deger('--ad');
        if (!ad) {
          // Paketin kendi bildirimindeki ad; yoksa kaynaktan türetilir
          yaz(`${cozulmus.tur === 'yerel' ? 'okunuyor' : 'indiriliyor'}: ${kaynak}`);
          const pb = paketBildirimi(await kaynaktanAl(cozulmus, kok));
          ad = typeof pb.ad === 'string' && pb.ad ? pb.ad : cozulmus.onerilenAd;
        }
        if (!AD_DESENI.test(ad)) { hataYaz(`Geçersiz paket adı: '${ad}' (--ad ile bir ad verin; harfle başlamalı; harf, rakam, alt çizgi ve tire içerebilir)`); return 1; }
        const varolan = Object.keys(b.bagimliliklar ?? {}).find(a => katla(a) === katla(ad!));
        if (varolan && varolan !== ad) ad = varolan;
        const onceki = fs.existsSync(path.join(kok, BILDIRIM)) ? fs.readFileSync(path.join(kok, BILDIRIM)) : null;
        const yeni: Bildirim = { ...(onceki ? b : { ad: path.basename(kok), surum: '0.1.0' }), bagimliliklar: { ...(b.bagimliliklar ?? {}), [ad]: kaynak } };
        jsonYaz(path.join(kok, BILDIRIM), yeni);
        try { ozetle(await esitle(kok, new Set([katla(ad)]), yaz)); }
        catch (e) { if (onceki) fs.writeFileSync(path.join(kok, BILDIRIM), onceki); else fs.rmSync(path.join(kok, BILDIRIM), { force: true }); throw e; }
        const birimler = birimleri(klasorOku(path.join(kok, PAKET_DIZINI, ad)));
        yaz(`${ad} eklendi. Programınızda: kullan ${birimler.slice(0, 4).join(', ')}${birimler.length > 4 ? ', …' : ''}`);
        return 0;
      }
      case 'kur': {
        if (!fs.existsSync(path.join(kok, BILDIRIM))) { hataYaz(`${BILDIRIM} bulunamadı. Paket eklemek için: yontem paket ekle <kaynak>`); return 1; }
        ozetle(await esitle(kok, new Set(), yaz));
        return 0;
      }
      case 'kaldir': case 'kaldır': {
        const ad = konumsal[0];
        if (!ad) { hataYaz('Kullanım: yontem paket kaldir <ad>'); return 1; }
        const b = bildirimOku(kok);
        const gercek = Object.keys(b.bagimliliklar ?? {}).find(a => katla(a) === katla(ad));
        if (!gercek) {
          const k = kilitOku(kok).paketler;
          const dolayli = Object.keys(k).find(a => katla(a) === katla(ad));
          hataYaz(dolayli ? `'${dolayli}' doğrudan eklenmemiş; ${k[dolayli].isteyen} paketi istiyor` : `'${ad}' ${BILDIRIM} dosyasında yok`);
          return 1;
        }
        delete b.bagimliliklar![gercek];
        jsonYaz(path.join(kok, BILDIRIM), b);
        ozetle(await esitle(kok, new Set(), yaz));
        return 0;
      }
      case 'guncelle': case 'güncelle': {
        if (!fs.existsSync(path.join(kok, BILDIRIM))) { hataYaz(`${BILDIRIM} bulunamadı`); return 1; }
        const ad = konumsal[0];
        if (ad && !Object.keys(kilitOku(kok).paketler).concat(Object.keys(bildirimOku(kok).bagimliliklar ?? {})).some(a => katla(a) === katla(ad))) { hataYaz(`'${ad}' kurulu değil`); return 1; }
        const once = kilitOku(kok).paketler;
        const s = await esitle(kok, new Set([ad ? katla(ad) : '*']), yaz);
        const sonra = kilitOku(kok).paketler;
        const degisen = Object.keys(sonra).filter(a => once[a] && once[a].sha256 !== sonra[a].sha256);
        ozetle(s);
        yaz(degisen.length ? `içeriği değişen: ${degisen.join(', ')}` : 'Hiçbir paketin içeriği değişmedi');
        return 0;
      }
      case 'liste': {
        const b = bildirimOku(kok), k = kilitOku(kok).paketler;
        const adlar = [...new Set([...Object.keys(b.bagimliliklar ?? {}), ...Object.keys(k)])].sort();
        if (!adlar.length) { yaz('Paket yok. Eklemek için: yontem paket ekle <kaynak>'); return 0; }
        let eksik = false;
        for (const ad of adlar) {
          const dizin = path.join(kok, PAKET_DIZINI, ad);
          const kurulu = fs.existsSync(dizin);
          if (!kurulu) eksik = true;
          const kayit = k[ad];
          yaz(`${ad}${kayit && kayit.surum ? ' ' + kayit.surum : ''}${kayit && kayit.isteyen ? `  (${kayit.isteyen} istiyor)` : ''}${kurulu ? '' : '  — kurulu değil'}`);
          yaz(`  kaynak: ${kayit ? kayit.kaynak : b.bagimliliklar![ad]}`);
          if (kurulu) yaz(`  birimler: ${birimleri(klasorOku(dizin)).join(', ') || '—'}`);
        }
        if (eksik) yaz("\nEksik paketleri kurmak için: yontem paket kur");
        return 0;
      }
      case '': case 'yardim': case 'yardım': case '--yardim': case '-h': yaz(KULLANIM); return 0;
      default: hataYaz(`Bilinmeyen paket komutu: '${argv[0]}'\n\n${KULLANIM}`); return 1;
    }
  } catch (e: any) {
    if (e instanceof PaketHatasi) { hataYaz('Paket hatası: ' + e.message); return 1; }
    throw e;
  }
}
