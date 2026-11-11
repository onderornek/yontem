// Pencere (UI) birimi — bileşenlerden kurulan arayüz.
// İki kipte çalışır:
//  * Canlı: konak bir 'arayuz' işlevi verirse (oyun alanı, paketlenmiş web/mobil uygulama) her değişiklik
//    bir işlem olarak gönderilir; tarayıcıdaki görüntüleyici bileşenleri çizer ve kullanıcı olaylarını
//    $.arayuzOlay ile geri yollar.
//  * Benzetim: konak yoksa (komut satırı, testler) arayüz bellekte tutulur. Tıkla/Gir/Seç/Dokun ile olaylar
//    benzetilir, Ağaç ve Çalıştır arayüzü metin olarak gösterir. Python yorumlayıcısı aynı davranır.
import { $, hata, metne, cagir, sifirlayiciEkle, katla } from './cekirdek';
import { fn, turAdi } from './deger';

export interface Islem { op: string; [k: string]: any }

const TUR_GORUNUM: Record<string, string> = {
  etiket: 'Etiket', dugme: 'Düğme', giris: 'GirişKutusu', onay: 'OnayKutusu', kaydirici: 'Kaydırıcı',
  secim: 'SeçimKutusu', yatay: 'Yatay', dikey: 'Dikey', tuval: 'Tuval', pencere: 'Pencere',
};

let sayac = 0;
let kok: Bilesen;
let baslik = '';
let saatMs = 0;
let araliklar: { f: any; aralik: number; sonraki: number; etkin: boolean; tutamak: any }[] = [];
let bilesenler = new Map<number, Bilesen>();

export function gonder(op: Islem) {
  const f = $.konak && $.konak.arayuz;
  if (f) f(op);
}
export const canli = () => !!($.konak && $.konak.arayuz);

/** Canlı kipte olay işleyicisi; konak hataları yakalasın diye $.olayYurut ile sarılır. */
export function olayCalistir(f: any, args: any[]) {
  if (canli() && $.olayYurut) $.olayYurut(() => cagir(f, args));
  else cagir(f, args);
}

function islevMi(f: any) {
  if (typeof f !== 'function') hata("Olay işleyicisi bir prosedür olmalı: '@Prosedür' ya da 'prosedür başla ... bitir'");
  return f;
}
function tamsayi(v: any, ad: string): bigint {
  if (typeof v !== 'bigint') hata(`'${ad}' tamsayı bekler, ${turAdi(v)} verildi`);
  return v;
}
function sayi(v: any, ad: string): number {
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'number') return v;
  hata(`'${ad}' sayı bekler, ${turAdi(v)} verildi`);
}
function mantiksal(v: any, ad: string): boolean {
  if (typeof v !== 'boolean') hata(`'${ad}' mantıksal değer bekler, ${turAdi(v)} verildi`);
  return v;
}
function bilesenMi(v: any, ad: string): Bilesen {
  if (!(v instanceof Bilesen)) hata(`'${ad}' bir arayüz bileşeni bekler, ${turAdi(v)} verildi`);
  return v;
}
const y = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) =>
  fn((...a: any[]) => {
    if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
    return f(...a);
  }, ad, enCok, enAz, [], oto);

export class Bilesen {
  static TUR_ADI = 'bileşen';
  id: number;
  cocuklar: Bilesen[] = [];
  ust: Bilesen | null = null;
  isleyici: Record<string, any> = {};
  cizimler: any[][] = [];
  oz: Record<string, any>;
  constructor(public tur: string, oz: Record<string, any>, gizli = false) {
    this.id = gizli ? 0 : ++sayac;
    this.oz = { etkin: true, gorunur: true, ...oz };
    bilesenler.set(this.id, this);
    if (!gizli) gonder({ op: 'olustur', id: this.id, tur, oz: disari(this.oz) });
  }
  get TUR_ADI() { return TUR_GORUNUM[this.tur]; }
  kap() { return this.tur === 'yatay' || this.tur === 'dikey' || this.tur === 'pencere'; }

  ekle(c: Bilesen) {
    if (c === this || c.kap() && ataMi(c, this)) hata('Bir bileşen kendi içine eklenemez');
    if (c.ust) { const i = c.ust.cocuklar.indexOf(c); if (i >= 0) c.ust.cocuklar.splice(i, 1); }
    c.ust = this;
    this.cocuklar.push(c);
    gonder({ op: 'ekle', ust: this.id, id: c.id });
  }
  temizle() {
    if (this.kap()) {
      for (const c of this.cocuklar) { c.ust = null; gonder({ op: 'cikar', id: c.id }); }
      this.cocuklar = [];
    } else if (this.tur === 'tuval') {
      this.cizimler = [];
      gonder({ op: 'cizTemizle', id: this.id });
    }
  }
  ayarla(ad: string, v: any, yansit = true) {
    this.oz[ad] = v;
    if (yansit) gonder({ op: 'ayarla', id: this.id, ad, deger: disariDeger(v) });
  }

  kAl(ad: string): any {
    const t = this.tur, A = TUR_GORUNUM[t];
    switch (ad) {
      case 'etkin': case 'gorunur': return this.oz[ad];
      case 'metin': if (t === 'etiket' || t === 'dugme' || t === 'giris' || t === 'onay') return this.oz.metin; break;
      case 'ipucu': if (t === 'giris') return this.oz.ipucu; break;
      case 'isaretli': if (t === 'onay') return this.oz.isaretli; break;
      case 'deger': if (t === 'kaydirici') return this.oz.deger; break;
      case 'enaz': if (t === 'kaydirici') return this.oz.enaz; break;
      case 'encok': if (t === 'kaydirici') return this.oz.encok; break;
      case 'secili': if (t === 'secim') return this.oz.secili; break;
      case 'secenekler': if (t === 'secim') return this.oz.secenekler.slice(); break;
      case 'secilimetin': if (t === 'secim') return this.oz.secili >= 0n ? this.oz.secenekler[Number(this.oz.secili)] : ''; break;
      case 'genislik': if (t === 'tuval') return this.oz.genislik; break;
      case 'yukseklik': if (t === 'tuval') return this.oz.yukseklik; break;
      case 'cocuklar': if (this.kap()) return this.cocuklar.slice(); break;
      case 'tiklaninca': if (t === 'dugme') return y('Tıklanınca', 1, 1, f => { this.isleyici.tikla = islevMi(f); gonder({ op: 'dinle', id: this.id, olay: 'tikla' }); return this; }); break;
      case 'degisince': if (t === 'giris' || t === 'onay' || t === 'kaydirici' || t === 'secim')
        return y('Değişince', 1, 1, f => { this.isleyici.degis = islevMi(f); gonder({ op: 'dinle', id: this.id, olay: 'degis' }); return this; }); break;
      case 'dokununca': if (t === 'tuval') return y('Dokununca', 1, 1, f => { this.isleyici.dokun = islevMi(f); gonder({ op: 'dinle', id: this.id, olay: 'dokun' }); return this; }); break;
      case 'ekle': if (this.kap()) return y('Ekle', 1, 64, (...cs) => { for (const c of cs) this.ekle(bilesenMi(c, 'Ekle')); return this; }); break;
      case 'temizle': if (this.kap() || t === 'tuval') return y('Temizle', 0, 0, () => { this.temizle(); return null; }, true); break;
      case 'renk': if (t === 'tuval') return y('Renk', 1, 1, r => this.ciz(['renk', metne(r)])); break;
      case 'cizgi': if (t === 'tuval') return y('Çizgi', 4, 4, (a, b, c, d) => this.ciz(['cizgi', sayi(a, 'x1'), sayi(b, 'y1'), sayi(c, 'x2'), sayi(d, 'y2')])); break;
      case 'dikdortgen': if (t === 'tuval') return y('Dikdörtgen', 4, 5, (a, b, c, d, dolu = false) =>
        this.ciz(['dikdortgen', sayi(a, 'x'), sayi(b, 'y'), sayi(c, 'genişlik'), sayi(d, 'yükseklik'), mantiksal(dolu, 'dolu')])); break;
      case 'daire': if (t === 'tuval') return y('Daire', 3, 4, (a, b, r, dolu = false) =>
        this.ciz(['daire', sayi(a, 'x'), sayi(b, 'y'), sayi(r, 'yarıçap'), mantiksal(dolu, 'dolu')])); break;
      case 'yazi': if (t === 'tuval') return y('Yazı', 3, 3, (a, b, m) => this.ciz(['yazi', sayi(a, 'x'), sayi(b, 'y'), metne(m)])); break;
      case 'cizimsayisi': if (t === 'tuval') return BigInt(this.cizimler.filter(k => k[0] !== 'renk').length); break;
    }
    hata(`${A} bileşeninde '${ad}' üyesi yok`);
  }
  ciz(k: any[]) {
    this.cizimler.push(k);
    gonder({ op: 'ciz', id: this.id, k });
    return null;
  }
  kAta(ad: string, v: any) {
    const t = this.tur, A = TUR_GORUNUM[t];
    switch (ad) {
      case 'etkin': case 'gorunur': return this.ayarla(ad, mantiksal(v, `${A}.${ad === 'etkin' ? 'Etkin' : 'Görünür'}`));
      case 'metin': if (t === 'etiket' || t === 'dugme' || t === 'giris' || t === 'onay') return this.ayarla('metin', metne(v)); break;
      case 'ipucu': if (t === 'giris') return this.ayarla('ipucu', metne(v)); break;
      case 'isaretli': if (t === 'onay') return this.ayarla('isaretli', mantiksal(v, 'OnayKutusu.İşaretli')); break;
      case 'deger': if (t === 'kaydirici') return this.ayarla('deger', sinirla(this, tamsayi(v, 'Kaydırıcı.Değer'))); break;
      case 'secili': if (t === 'secim') return this.ayarla('secili', seciliDenetle(this, tamsayi(v, 'SeçimKutusu.Seçili'))); break;
      case 'secenekler': if (t === 'secim') {
        const s = secenekler(v);
        this.ayarla('secenekler', s);
        if (this.oz.secili >= BigInt(s.length)) this.ayarla('secili', s.length ? 0n : -1n);
        else if (this.oz.secili < 0n && s.length) this.ayarla('secili', 0n);
        return;
      } break;
    }
    hata(`${A} bileşeninin '${ad}' üyesine atama yapılamaz`);
  }
  toString() {
    const t = this.tur;
    if (t === 'etiket' || t === 'dugme' || t === 'onay') return `${TUR_GORUNUM[t]}("${this.oz.metin}")`;
    return `${TUR_GORUNUM[t]}#${this.id}`;
  }
}

function ataMi(ata: Bilesen, b: Bilesen): boolean {
  for (let u: Bilesen | null = b; u; u = u.ust) if (u === ata) return true;
  return false;
}
function sinirla(b: Bilesen, v: bigint): bigint {
  if (v < b.oz.enaz) return b.oz.enaz;
  if (v > b.oz.encok) return b.oz.encok;
  return v;
}
function seciliDenetle(b: Bilesen, v: bigint): bigint {
  if (v < -1n || v >= BigInt(b.oz.secenekler.length)) hata(`SeçimKutusu dizini sınır dışı: ${v} (${b.oz.secenekler.length} seçenek)`);
  return v;
}
function secenekler(v: any): string[] {
  if (!Array.isArray(v)) hata(`'SeçimKutusu' seçenek listesi bekler, ${turAdi(v)} verildi`);
  return v.map(x => metne(x));
}
function disariDeger(v: any): any {
  if (typeof v === 'bigint') return Number(v);
  if (Array.isArray(v)) return v.map(disariDeger);
  return v;
}
function disari(oz: Record<string, any>) {
  const o: Record<string, any> = {};
  for (const k of Object.keys(oz)) o[k] = disariDeger(oz[k]);
  return o;
}

// ---------------------------------------------------------------- olaylar (benzetim ve canlı ortak)
function tikla(b: Bilesen) {
  if (b.tur !== 'dugme') hata(`'Tıkla' bir Düğme bekler, ${TUR_GORUNUM[b.tur]} verildi`);
  if (!b.oz.etkin || !b.oz.gorunur) return;
  if (b.isleyici.tikla) olayCalistir(b.isleyici.tikla, []);
}
function degistir(b: Bilesen, v: any, yansit: boolean) {
  if (!b.oz.etkin) return;
  switch (b.tur) {
    case 'giris': b.ayarla('metin', metne(v), yansit); break;
    case 'onay': b.ayarla('isaretli', mantiksal(v, 'Seç'), yansit); break;
    case 'kaydirici': b.ayarla('deger', sinirla(b, tamsayi(v, 'Seç')), yansit); break;
    case 'secim':
      if (typeof v === 'string') {
        const i = b.oz.secenekler.indexOf(v);
        if (i < 0) hata(`SeçimKutusu'nda '${v}' seçeneği yok`);
        b.ayarla('secili', BigInt(i), yansit);
      } else b.ayarla('secili', seciliDenetle(b, tamsayi(v, 'Seç')), yansit);
      break;
    default: hata(`'${TUR_GORUNUM[b.tur]}' değer almaz`);
  }
  if (b.isleyici.degis) olayCalistir(b.isleyici.degis, []);
}
function dokun(b: Bilesen, x: bigint, yy: bigint) {
  if (b.tur !== 'tuval') hata(`'Dokun' bir Tuval bekler, ${TUR_GORUNUM[b.tur]} verildi`);
  if (b.isleyici.dokun) olayCalistir(b.isleyici.dokun, [x, yy]);
}
function ilerle(ms: number) {
  const hedef = saatMs + ms;
  for (;;) {
    let sec = -1;
    for (let i = 0; i < araliklar.length; i++) {
      const z = araliklar[i];
      if (z.etkin && z.sonraki <= hedef && (sec < 0 || z.sonraki < araliklar[sec].sonraki)) sec = i;
    }
    if (sec < 0) break;
    const z = araliklar[sec];
    saatMs = z.sonraki;
    z.sonraki += z.aralik;
    cagir(z.f, []);
  }
  saatMs = hedef;
}

/** Canlı kipte tarayıcıdan gelen olay: { id, olay, veri } */
$.arayuzOlay = (m: { id: number; olay: string; veri?: any }) => {
  const b = bilesenler.get(m.id);
  if (!b) return;
  if (m.olay === 'tikla') tikla(b);
  else if (m.olay === 'degis') {
    let v = m.veri;
    if (b.tur === 'kaydirici' || b.tur === 'secim') v = BigInt(Math.round(Number(v)));
    degistir(b, v, false);
  } else if (m.olay === 'dokun') dokun(b, BigInt(Math.round(m.veri[0])), BigInt(Math.round(m.veri[1])));
};

// ---------------------------------------------------------------- metin görünümü
function satir(b: Bilesen): string {
  const t = b.tur, o = b.oz;
  let s = TUR_GORUNUM[t];
  switch (t) {
    case 'pencere': if (baslik) s += ` "${baslik}"`; break;
    case 'etiket': case 'dugme': s += ` "${o.metin}"`; break;
    case 'giris': s += ` "${o.metin}"` + (o.ipucu ? ` (ipucu "${o.ipucu}")` : ''); break;
    case 'onay': s += ` ${o.isaretli ? '[x]' : '[ ]'} "${o.metin}"`; break;
    case 'kaydirici': s += ` ${o.deger} (${o.enaz}..${o.encok})`; break;
    case 'secim': s += ` "${o.secili >= 0n ? o.secenekler[Number(o.secili)] : ''}" (${o.secenekler.join(' | ')})`; break;
    case 'tuval': s += ` ${o.genislik}x${o.yukseklik} (${b.cizimler.filter(k => k[0] !== 'renk').length} çizim)`; break;
  }
  if (!o.etkin) s += ' (devre dışı)';
  if (!o.gorunur) s += ' (gizli)';
  return s;
}
function agac(): string {
  const out: string[] = [];
  const gez = (b: Bilesen, d: number) => { out.push('  '.repeat(d) + satir(b)); for (const c of b.cocuklar) gez(c, d + 1); };
  gez(kok, 0);
  return out.join('\n');
}

function sifirlaPencere() {
  sayac = 0; baslik = ''; saatMs = 0;
  for (const z of araliklar) if (z.tutamak !== null) clearInterval(z.tutamak);
  araliklar = [];
  bilesenler = new Map();
  kok = new Bilesen('pencere', {}, true);
}
sifirlayiciEkle(sifirlaPencere);
sifirlaPencere();

function pencereModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Pencere' };
  const uye = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) => { U[katla(ad)] = y(ad, enAz, enCok, f, oto); };
  const kur = (tur: string, oz: Record<string, any>, cocuklar: any[] = []) => {
    const b = new Bilesen(tur, oz);
    for (const c of cocuklar) b.ekle(bilesenMi(c, TUR_GORUNUM[tur]));
    return b;
  };
  uye('Etiket', 0, 1, (m = '') => kur('etiket', { metin: metne(m) }));
  uye('Düğme', 1, 1, m => kur('dugme', { metin: metne(m) }));
  uye('GirişKutusu', 0, 1, (ip = '') => kur('giris', { metin: '', ipucu: metne(ip) }));
  uye('OnayKutusu', 1, 2, (m, d = false) => kur('onay', { metin: metne(m), isaretli: mantiksal(d, 'işaretli') }));
  uye('Kaydırıcı', 2, 3, (a, b, d) => {
    const enaz = tamsayi(a, 'en az'), encok = tamsayi(b, 'en çok');
    if (encok < enaz) hata("'Kaydırıcı' için en çok, en azdan küçük olamaz");
    let v = d === undefined ? enaz : tamsayi(d, 'değer');
    if (v < enaz) v = enaz; if (v > encok) v = encok;
    return kur('kaydirici', { deger: v, enaz, encok });
  });
  uye('SeçimKutusu', 1, 1, s => { const l = secenekler(s); return kur('secim', { secenekler: l, secili: l.length ? 0n : -1n }); });
  uye('Yatay', 0, 64, (...cs) => kur('yatay', {}, cs));
  uye('Dikey', 0, 64, (...cs) => kur('dikey', {}, cs));
  uye('Tuval', 2, 2, (g, h) => kur('tuval', { genislik: tamsayi(g, 'genişlik'), yukseklik: tamsayi(h, 'yükseklik') }));

  uye('Başlık', 1, 1, m => { baslik = metne(m); gonder({ op: 'baslik', metin: baslik }); return null; });
  uye('Yerleştir', 1, 64, (...cs) => { for (const c of cs) kok.ekle(bilesenMi(c, 'Yerleştir')); return null; });
  uye('Temizle', 0, 0, () => { kok.temizle(); return null; }, true);
  uye('Ağaç', 0, 0, () => agac(), true);
  uye('Çalıştır', 0, 0, () => { if (!canli()) $.konak.yaz(agac() + '\n'); return null; }, true);
  uye('Canlı', 0, 0, () => canli(), true);

  uye('Tıkla', 1, 1, b => { tikla(bilesenMi(b, 'Tıkla')); return null; });
  uye('Gir', 2, 2, (b, m) => {
    const k = bilesenMi(b, 'Gir');
    if (k.tur !== 'giris') hata(`'Gir' bir GirişKutusu bekler, ${TUR_GORUNUM[k.tur]} verildi`);
    degistir(k, metne(m), true); return null;
  });
  uye('Seç', 2, 2, (b, v) => {
    const k = bilesenMi(b, 'Seç');
    if (k.tur === 'giris') hata("GirişKutusu'na metin 'Gir' ile yazılır");
    degistir(k, v, true); return null;
  });
  uye('Dokun', 3, 3, (b, x, yy) => { dokun(bilesenMi(b, 'Dokun'), tamsayi(x, 'x'), tamsayi(yy, 'y')); return null; });
  uye('İlerle', 1, 1, ms => { const v = Number(tamsayi(ms, 'süre')); if (v > 0) ilerle(v); return null; });
  uye('Aralıkla', 2, 2, (ms, f) => {
    const v = Number(tamsayi(ms, 'süre'));
    if (v <= 0) hata('Aralık süresi pozitif olmalı');
    islevMi(f);
    const z = { f, aralik: v, sonraki: saatMs + v, etkin: true, tutamak: null as any };
    if (canli()) z.tutamak = setInterval(() => { if (z.etkin) olayCalistir(f, []); }, v);
    araliklar.push(z);
    return BigInt(araliklar.length - 1);
  });
  uye('AralığıDurdur', 1, 1, id => {
    const i = Number(tamsayi(id, 'kimlik'));
    const z = araliklar[i];
    if (z) { z.etkin = false; if (z.tutamak !== null) { clearInterval(z.tutamak); z.tutamak = null; } }
    return null;
  });
  return U;
}

/** Canlı kipte çalışan bir arayüz var mı? (Program bittikten sonra olayları beklemek için) */
$.arayuzBekliyor = () => kok.cocuklar.length > 0 || araliklar.some(z => z.etkin);

$.yerelBirimler.set('pencere', pencereModulu);
$.yerelBirimler.set('ui', pencereModulu);
