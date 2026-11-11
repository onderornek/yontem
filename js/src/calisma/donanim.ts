// Donanım birimi — JavaScript benzetimi. C++ masaüstü benzetimiyle (yontem_donanim.hpp) aynı davranır:
// sanal saat, belirlenimci zamanlayıcılar, pin değişikliğiyle tetiklenen kesmeler, bellek tabanlı I2C aygıtı.
import { $, hata, metne, cagir, sifirlayiciEkle } from './cekirdek';
import { fn } from './deger';

const GIRIS = 1n, CIKIS = 2n, GIRIS_YUKARI = 3n, GIRIS_ASAGI = 4n;
const YUKSELEN = 1n, DUSEN = 2n, DEGISEN = 3n;

interface Pin { kip: bigint; deger: boolean; pwm: bigint; isr: any; tur: bigint }
interface Zaman { f: any; sonraki: number; aralik: number; tekrar: boolean; etkin: boolean }

let saatUs = 0;
let pinler = new Map<string, Pin>();
let zamanlar: Zaman[] = [];
let i2c = new Map<string, { bellek: number[]; yazmac: number }>();
sifirlayiciEkle(() => { saatUs = 0; pinler = new Map(); zamanlar = []; i2c = new Map(); });

function pin(p: any): Pin {
  const k = String(p);
  let d = pinler.get(k);
  if (!d) { d = { kip: GIRIS, deger: false, pwm: 0n, isr: null, tur: 0n }; pinler.set(k, d); }
  return d;
}
function iz(m: string) {
  const f = $.konak && $.konak.iz;
  if (f) f(`[${String(Math.floor(saatUs / 1000)).padStart(7)} ms] ${m}`);
}
function tam(v: any, ad: string): bigint {
  if (typeof v !== 'bigint') hata(`'${ad}' tamsayı bekler`);
  return v;
}
function ilerle(hedef: number) {
  for (;;) {
    let sec = -1;
    for (let i = 0; i < zamanlar.length; i++) {
      const z = zamanlar[i];
      if (z.etkin && z.sonraki <= hedef && (sec < 0 || z.sonraki < zamanlar[sec].sonraki)) sec = i;
    }
    if (sec < 0) break;
    const z = zamanlar[sec];
    saatUs = Math.max(saatUs, z.sonraki);
    if (z.tekrar) z.sonraki += z.aralik; else z.etkin = false;
    cagir(z.f, []);
  }
  saatUs = Math.max(saatUs, hedef);
}
const y = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) =>
  fn((...a: any[]) => {
    if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
    return f(...a);
  }, ad, enCok, enAz, [], oto);

function donanimModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Donanım' };
  U.giris = GIRIS; U.cikis = CIKIS; U.girisyukari = GIRIS_YUKARI; U.girisasagi = GIRIS_ASAGI;
  U.yukselen = YUKSELEN; U.dusen = DUSEN; U.degisen = DEGISEN;
  U.yuksek = true; U.dusuk = false; U.yerlesikled = 2n; U.benzetim = true;
  U.pinkipi = y('PinKipi', 2, 2, (p, k) => { const d = pin(tam(p, 'pin')); d.kip = tam(k, 'kip'); if (k === GIRIS_YUKARI) d.deger = true; iz(`pin ${p} kipi ${k}`); return null; });
  U.pinyaz = y('PinYaz', 2, 2, (p, v) => {
    const yeni = typeof v === 'bigint' ? v !== 0n : v === true;
    if (typeof v !== 'bigint' && typeof v !== 'boolean') hata("'PinYaz' mantıksal ya da tamsayı değer bekler");
    const d = pin(tam(p, 'pin'));
    const eski = d.deger;
    d.deger = yeni;
    iz(`pin ${p} = ${yeni ? 1 : 0}`);
    if (d.isr && eski !== yeni) {
      const tetik = d.tur === DEGISEN || (d.tur === YUKSELEN && yeni) || (d.tur === DUSEN && !yeni);
      if (tetik) cagir(d.isr, []);
    }
    return null;
  });
  U.pinoku = y('PinOku', 1, 1, p => pin(tam(p, 'pin')).deger);
  U.analogoku = y('AnalogOku', 1, 1, p => { const d = pin(tam(p, 'pin')); return d.pwm ? d.pwm * 16n : (d.deger ? 4095n : 0n); });
  U.pwmyaz = y('PWMYaz', 2, 2, (p, o) => { let v = tam(o, 'oran'); if (v < 0n) v = 0n; if (v > 255n) v = 255n; pin(tam(p, 'pin')).pwm = v; iz(`pin ${p} pwm ${v}`); return null; });
  U.bekle = y('Bekle', 1, 1, ms => { const v = Number(tam(ms, 'süre')); if (v > 0) ilerle(saatUs + v * 1000); return null; });
  U.beklemikro = y('BekleMikro', 1, 1, us => { const v = Number(tam(us, 'süre')); if (v > 0) ilerle(saatUs + v); return null; });
  U.milisaniye = y('Milisaniye', 0, 0, () => BigInt(Math.floor(saatUs / 1000)), true);
  U.mikrosaniye = y('Mikrosaniye', 0, 0, () => BigInt(saatUs), true);
  U.kesmebagla = y('KesmeBağla', 3, 3, (p, f, tur) => {
    if (typeof f !== 'function') hata("Kesme ve zamanlayıcılara parametresiz bir prosedür verilir: '@Prosedür' ya da 'prosedür başla ... bitir'");
    const d = pin(tam(p, 'pin')); d.isr = f; d.tur = tam(tur, 'tür');
    iz(`pin ${p} kesmesi bağlandı`);
    return null;
  });
  U.kesmecoz = y('KesmeÇöz', 1, 1, p => { pin(tam(p, 'pin')).isr = null; return null; });
  const kur = (tekrar: boolean) => (ms: any, f: any) => {
    const v = Number(tam(ms, 'süre'));
    if (v <= 0) hata('Zamanlayıcı süresi pozitif olmalı');
    if (typeof f !== 'function') hata("Kesme ve zamanlayıcılara parametresiz bir prosedür verilir: '@Prosedür' ya da 'prosedür başla ... bitir'");
    zamanlar.push({ f, sonraki: saatUs + v * 1000, aralik: v * 1000, tekrar, etkin: true });
    return BigInt(zamanlar.length - 1);
  };
  U.zamanlayicikur = y('ZamanlayıcıKur', 2, 2, kur(true));
  U.zamanlayicitek = y('ZamanlayıcıTek', 2, 2, kur(false));
  U.zamanlayicidurdur = y('ZamanlayıcıDurdur', 1, 1, id => { const i = Number(tam(id, 'kimlik')); if (i >= 0 && i < zamanlar.length) zamanlar[i].etkin = false; return null; });
  U.seribaslat = y('SeriBaşlat', 1, 1, b => { iz(`seri ${tam(b, 'hız')} baud`); return null; });
  U.serivarmi = y('SeriVarMı', 0, 0, () => 0n, true);
  U.seribaytoku = y('SeriBaytOku', 0, 0, () => -1n, true);
  U.seribaytyaz = y('SeriBaytYaz', 1, 1, b => { $.konak.yaz(String.fromCharCode(Number(tam(b, 'bayt')) & 255)); return null; });
  U.i2cbaslat = y('I2CBaşlat', 2, 3, (sda, scl, hiz = 100000n) => { iz(`i2c sda=${sda} scl=${scl} ${hiz} Hz`); return null; });
  const aygit = (a: any) => { const k = String(tam(a, 'adres')); let d = i2c.get(k); if (!d) { d = { bellek: new Array(256).fill(0), yazmac: 0 }; i2c.set(k, d); } return d; };
  const i2cYaz = (a: any, veri: any) => {
    if (!Array.isArray(veri)) hata("'I2CYaz' bayt listesi bekler");
    const d = aygit(a);
    if (veri.length) {
      const r = Number(veri[0]);
      for (let i = 1; i < veri.length; i++) d.bellek[(r + i - 1) & 255] = Number(veri[i]) & 255;
      d.yazmac = r;
    }
    iz(`i2c 0x${a} ← ${metne(veri)}`);
    return 0n;
  };
  const i2cOku = (a: any, n: any) => { const d = aygit(a); const r: bigint[] = []; for (let i = 0; i < Number(tam(n, 'bayt sayısı')); i++) r.push(BigInt(d.bellek[(d.yazmac + i) & 255])); return r; };
  U.i2cyaz = y('I2CYaz', 2, 2, i2cYaz);
  U.i2coku = y('I2COku', 2, 2, i2cOku);
  U.i2cyazoku = y('I2CYazOku', 3, 3, (a, v, n) => { i2cYaz(a, v); return i2cOku(a, n); });
  U.spibaslat = y('SPIBaşlat', 3, 4, (sck, miso, mosi, hiz = 1000000n) => { iz(`spi ${hiz} Hz`); return null; });
  U.spiaktar = y('SPIAktar', 1, 1, b => tam(b, 'bayt') & 255n);
  return U;
}

$.yerelBirimler.set('donanim', donanimModulu);
