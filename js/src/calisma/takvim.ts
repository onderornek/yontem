// Takvim birimi — tarih ve saat işlemleri.
// Zaman, Unix saniyesi (1 Ocak 1970 00:00:00 UTC'den beri geçen saniye) olarak tamsayıyla tutulur;
// takvim hesapları UTC'de, Miladi takvimle yapılır. Yerel saat için 'YerelFark' (dakika) eklenir.
// Hesapların tamamı tamsayı aritmetiğidir; Python sürümü (yontem_dil/takvim.py) aynı sonucu verir.
import { $, hata, metne, sifirlayiciEkle, katla } from './cekirdek';
import { fn, turAdi } from './deger';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const KISA_AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const KISA_GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const SIMGELER = ['YYYY', 'AAAA', 'GGGG', 'AAA', 'GGG', 'YY', 'AA', 'GG', 'SS', 'DD', 'SN', 'A', 'G'];
const VARSAYILAN = 'YYYY-AA-GG SS:DD:SN';
const EN_AZ = -62135596800, EN_COK = 253402300799;      // 0001-01-01 00:00:00 … 9999-12-31 23:59:59

const y = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) =>
  fn((...a: any[]) => {
    if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
    return f(...a);
  }, ad, enCok, enAz, [], oto);

const bol = (a: number, b: number) => Math.floor(a / b);
const artik = (yil: number) => (yil % 4 === 0 && yil % 100 !== 0) || yil % 400 === 0;
const aydaGun = (yil: number, ay: number) => ay === 2 ? (artik(yil) ? 29 : 28) : [4, 6, 9, 11].includes(ay) ? 30 : 31;

/** Tarihten, 1970-01-01'den beri geçen gün sayısı (H. Hinnant'ın days_from_civil algoritması). */
function gunNo(yil: number, ay: number, gun: number): number {
  const yy = ay <= 2 ? yil - 1 : yil;
  const cag = bol(yy, 400), yoe = yy - cag * 400;
  const doy = bol(153 * (ay + (ay > 2 ? -3 : 9)) + 2, 5) + gun - 1;
  return cag * 146097 + yoe * 365 + bol(yoe, 4) - bol(yoe, 100) + doy - 719468;
}
function gundenTarih(z: number): [number, number, number] {
  z += 719468;
  const cag = bol(z, 146097), doe = z - cag * 146097;
  const yoe = bol(doe - bol(doe, 1460) + bol(doe, 36524) - bol(doe, 146096), 365);
  const doy = doe - (365 * yoe + bol(yoe, 4) - bol(yoe, 100));
  const mp = bol(5 * doy + 2, 153);
  const gun = doy - bol(153 * mp + 2, 5) + 1, ay = mp < 10 ? mp + 3 : mp - 9;
  return [yoe + cag * 400 + (ay <= 2 ? 1 : 0), ay, gun];
}

function tam(v: any, ad: string): number {
  if (typeof v !== 'bigint') hata(`'${ad}' tamsayı bekler, ${turAdi(v)} verildi`);
  if (v < -1000000000000n || v > 1000000000000n) hata(`'${ad}' çok büyük: ${v}`);
  return Number(v);
}
function zaman(v: any, ad = 'zaman'): number {
  let z: number;
  if (typeof v === 'bigint') z = tam(v, ad);
  else if (typeof v === 'number' && Number.isFinite(v)) z = Math.floor(v);
  else hata(`'${ad}' Unix saniyesi (sayı) bekler, ${turAdi(v)} verildi`);
  if (z < EN_AZ || z > EN_COK) hata(`'${ad}' 1 ile 9999 yılları arasında olmalı`);
  return z;
}
function denetle(yil: number, ay: number, gun: number, saat = 0, dk = 0, sn = 0) {
  if (yil < 1 || yil > 9999) hata(`Yıl 1 ile 9999 arasında olmalı, ${yil} verildi`);
  if (ay < 1 || ay > 12) hata(`Ay 1 ile 12 arasında olmalı, ${ay} verildi`);
  if (gun < 1 || gun > aydaGun(yil, ay)) hata(`${yil} yılının ${ay}. ayında ${gun}. gün yok (${aydaGun(yil, ay)} gün var)`);
  if (saat < 0 || saat > 23) hata(`Saat 0 ile 23 arasında olmalı, ${saat} verildi`);
  if (dk < 0 || dk > 59) hata(`Dakika 0 ile 59 arasında olmalı, ${dk} verildi`);
  if (sn < 0 || sn > 59) hata(`Saniye 0 ile 59 arasında olmalı, ${sn} verildi`);
}
const birlestir = (yil: number, ay: number, gun: number, saat = 0, dk = 0, sn = 0) => gunNo(yil, ay, gun) * 86400 + saat * 3600 + dk * 60 + sn;
function parcala(z: number) {
  const g = bol(z, 86400), s = z - g * 86400;
  const [yil, ay, gun] = gundenTarih(g);
  return { yil, ay, gun, saat: bol(s, 3600), dk: bol(s % 3600, 60), sn: s % 60, haftaGunu: ((g % 7) + 10) % 7 + 1, yilGunu: g - gunNo(yil, 1, 1) + 1, g };
}
/** ISO 8601 hafta numarası: haftalar pazartesi başlar, 1. hafta yılın ilk perşembesini içerir. */
function haftaNo(z: number): number {
  const p = parcala(z);
  const persembe = p.g - (p.haftaGunu - 1) + 3;
  const [yil] = gundenTarih(persembe);
  return bol(persembe - gunNo(yil, 1, 1), 7) + 1;
}
function ayEkle(z: number, n: number): number {
  const p = parcala(z);
  const toplam = p.yil * 12 + (p.ay - 1) + n;
  const yil = bol(toplam, 12), ay = toplam - yil * 12 + 1;
  if (yil < 1 || yil > 9999) hata('Sonuç 1 ile 9999 yılları dışında kalıyor');
  return birlestir(yil, ay, Math.min(p.gun, aydaGun(yil, ay)), p.saat, p.dk, p.sn);   // 31 Ocak + 1 ay = Şubat'ın son günü
}

type Parca = { simge?: string; duz?: string };
function kalipCoz(kalip: string): Parca[] {
  const out: Parca[] = [];
  let i = 0;
  const duzEkle = (s: string) => { const son = out[out.length - 1]; if (son && son.duz !== undefined) son.duz += s; else out.push({ duz: s }); };
  while (i < kalip.length) {
    if (kalip[i] === '[') {                       // [köşeli ayraç] içi olduğu gibi yazılır
      const j = kalip.indexOf(']', i);
      if (j < 0) hata("Tarih kalıbında kapanmamış '['");
      duzEkle(kalip.slice(i + 1, j)); i = j + 1; continue;
    }
    const s = SIMGELER.find(x => kalip.startsWith(x, i));
    if (s) { out.push({ simge: s }); i += s.length; } else { duzEkle(kalip[i]); i++; }
  }
  return out;
}
const iki = (n: number) => String(n).padStart(2, '0');
function yaz(z: number, kalip: string): string {
  const p = parcala(z);
  return kalipCoz(kalip).map(k => {
    switch (k.simge) {
      case undefined: return k.duz!;
      case 'YYYY': return String(p.yil).padStart(4, '0');
      case 'YY': return iki(p.yil % 100);
      case 'AAAA': return AYLAR[p.ay - 1];
      case 'AAA': return KISA_AYLAR[p.ay - 1];
      case 'AA': return iki(p.ay);
      case 'A': return String(p.ay);
      case 'GGGG': return GUNLER[p.haftaGunu - 1];
      case 'GGG': return KISA_GUNLER[p.haftaGunu - 1];
      case 'GG': return iki(p.gun);
      case 'G': return String(p.gun);
      case 'SS': return iki(p.saat);
      case 'DD': return iki(p.dk);
      default: return iki(p.sn);
    }
  }).join('');
}
function oku(metin: string, kalip: string): number {
  const bozuk = (): never => hata(`'${metin}' metni '${kalip}' kalıbına uymuyor`);
  let i = 0, yil = 1970, ay = 1, gun = 1, saat = 0, dk = 0, sn = 0;
  const sayi = (enAz: number, enCok: number): number => {
    let j = i;
    while (j < metin.length && j - i < enCok && metin[j] >= '0' && metin[j] <= '9') j++;
    if (j - i < enAz) bozuk();
    const v = parseInt(metin.slice(i, j), 10); i = j; return v;
  };
  const ad = (liste: string[]): number => {
    const kalan = katla(metin.slice(i));
    let en = -1;
    liste.forEach((a, k) => { if (kalan.startsWith(katla(a)) && (en < 0 || a.length > liste[en].length)) en = k; });
    if (en < 0) bozuk();
    i += liste[en].length;
    return en + 1;
  };
  for (const k of kalipCoz(kalip)) {
    switch (k.simge) {
      case undefined: if (!metin.startsWith(k.duz!, i)) bozuk(); i += k.duz!.length; break;
      case 'YYYY': yil = sayi(4, 4); break;
      case 'YY': yil = 2000 + sayi(2, 2); break;
      case 'AAAA': ay = ad(AYLAR); break;
      case 'AAA': ay = ad(KISA_AYLAR); break;
      case 'AA': ay = sayi(2, 2); break;
      case 'A': ay = sayi(1, 2); break;
      case 'GGGG': ad(GUNLER); break;
      case 'GGG': ad(KISA_GUNLER); break;
      case 'GG': gun = sayi(2, 2); break;
      case 'G': gun = sayi(1, 2); break;
      case 'SS': saat = sayi(2, 2); break;
      case 'DD': dk = sayi(2, 2); break;
      default: sn = sayi(2, 2);
    }
  }
  if (i !== metin.length) bozuk();
  denetle(yil, ay, gun, saat, dk, sn);
  return birlestir(yil, ay, gun, saat, dk, sn);
}
function metinMi(v: any, ad: string): string {
  if (typeof v !== 'string') hata(`'${ad}' metin bekler, ${turAdi(v)} verildi`);
  return v;
}

let benzetim: [number, number] | null = null;
sifirlayiciEkle(() => { benzetim = null; });

function takvimModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Takvim' };
  const uye = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) => { U[katla(ad)] = y(ad, enAz, enCok, f, oto); };
  const Z = (n: number) => BigInt(n);

  uye('Şimdi', 0, 0, () => Z(benzetim ? benzetim[0] : Math.floor(Date.now() / 1000)), true);
  uye('YerelFark', 0, 0, () => Z(benzetim ? benzetim[1] : -new Date().getTimezoneOffset()), true);
  uye('BenzetimZamanı', 1, 2, (z, f = 0n) => { benzetim = [zaman(z), tam(f, 'fark')]; return null; });

  uye('TarihYap', 3, 6, (yil, ay, gun, saat = 0n, dk = 0n, sn = 0n) => {
    const a = [tam(yil, 'yıl'), tam(ay, 'ay'), tam(gun, 'gün'), tam(saat, 'saat'), tam(dk, 'dakika'), tam(sn, 'saniye')] as const;
    denetle(...a);
    return Z(birlestir(...a));
  });
  uye('Parçala', 1, 1, z => {
    const p = parcala(zaman(z));
    return new Map<string, bigint>([['yıl', Z(p.yil)], ['ay', Z(p.ay)], ['gün', Z(p.gun)], ['saat', Z(p.saat)], ['dakika', Z(p.dk)],
      ['saniye', Z(p.sn)], ['haftaGünü', Z(p.haftaGunu)], ['yılGünü', Z(p.yilGunu)]]);
  });
  uye('TarihYaz', 1, 2, (z, k = VARSAYILAN) => yaz(zaman(z), metinMi(k, 'kalıp')));
  uye('TarihOku', 1, 2, (m, k) => {
    const metin = metinMi(m, 'metin').trim();
    if (k !== undefined) return Z(oku(metin, metinMi(k, 'kalıp')));
    if (/^\d{4}-\d{2}-\d{2}$/.test(metin)) return Z(oku(metin, 'YYYY-AA-GG'));
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(metin)) return Z(oku(metin.replace('T', ' '), 'YYYY-AA-GG SS:DD'));
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(metin)) return Z(oku(metin.replace('T', ' '), VARSAYILAN));
    hata(`'${metin}' tarih olarak okunamadı; 'YYYY-AA-GG' ya da 'YYYY-AA-GG SS:DD:SN' biçiminde yazın ya da kalıp verin`);
  });

  const sinirla = (z: number) => { if (z < EN_AZ || z > EN_COK) hata('Sonuç 1 ile 9999 yılları dışında kalıyor'); return Z(z); };
  uye('SaniyeEkle', 2, 2, (z, n) => sinirla(zaman(z) + tam(n, 'saniye')));
  uye('GünEkle', 2, 2, (z, n) => sinirla(zaman(z) + tam(n, 'gün') * 86400));
  uye('AyEkle', 2, 2, (z, n) => Z(ayEkle(zaman(z), tam(n, 'ay'))));
  uye('YılEkle', 2, 2, (z, n) => Z(ayEkle(zaman(z), tam(n, 'yıl') * 12)));
  uye('GünFarkı', 2, 2, (a, b) => Z(bol(zaman(b, 'bitiş'), 86400) - bol(zaman(a, 'başlangıç'), 86400)));
  uye('GünBaşı', 1, 1, z => Z(bol(zaman(z), 86400) * 86400));

  uye('HaftaGünü', 1, 1, z => Z(parcala(zaman(z)).haftaGunu));
  uye('HaftaNo', 1, 1, z => Z(haftaNo(zaman(z))));
  uye('GünAdı', 1, 1, v => {
    const n = typeof v === 'bigint' && v >= 1n && v <= 7n ? Number(v) : parcala(zaman(v)).haftaGunu;
    return GUNLER[n - 1];
  });
  uye('AyAdı', 1, 1, v => {
    const n = tam(v, 'ay');
    if (n < 1 || n > 12) hata(`Ay 1 ile 12 arasında olmalı, ${n} verildi`);
    return AYLAR[n - 1];
  });
  uye('ArtıkYıl', 1, 1, v => artik(tam(v, 'yıl')));
  uye('AydakiGünSayısı', 2, 2, (yy, a) => {
    const yil = tam(yy, 'yıl'), ay = tam(a, 'ay');
    if (ay < 1 || ay > 12) hata(`Ay 1 ile 12 arasında olmalı, ${ay} verildi`);
    return Z(aydaGun(yil, ay));
  });
  uye('GeçerliTarih', 3, 3, (yy, a, g) => {
    const yil = tam(yy, 'yıl'), ay = tam(a, 'ay'), gun = tam(g, 'gün');
    return yil >= 1 && yil <= 9999 && ay >= 1 && ay <= 12 && gun >= 1 && gun <= aydaGun(yil, ay);
  });
  return U;
}

$.yerelBirimler.set('takvim', takvimModulu);
$.yerelBirimler.set('calendar', takvimModulu);
