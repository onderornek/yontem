// Yöntem → JavaScript kod üretici.
// Adlar derleme anında çözülür: yerel → (metodlarda) alan/metod → evrensel/birim → yerleşik.
import { Dugum, coz } from './cozumleyici';
import { katla } from './sozcuk';
import { YontemHatasi, TipHatalari, Tani } from './hatalar';

export interface DerlemeSecenekleri {
  /** Birim dosyasını bulur: katlanmış ad ve yazıldığı biçim verilir */
  birimBul(ad: string, ham: string, kimden: string): { yol: string; kaynak: string } | null;
  /** Yerleşik (JS ile yazılmış) birimin üyeleri; yoksa null */
  yerelBirim(ad: string): Record<string, any> | null;
  /** Genel yerleşikler (katlanmış ad → değer) */
  yerlesikler: Record<string, any>;
  aranan?: string[];
  /** Hata ayıklama kipi: her deyimden önce $.A(), her gövdenin başında $.gir() üretilir */
  ayikla?: boolean;
  /** Katı kip: dosyada {$katı} yönergesi olmasa da bu dosyalar derleme zamanında tip denetiminden geçer */
  kati?: (dosya: string) => boolean;
}

type Tip = null
  | { k: 'temel'; ad: string; eleman?: Tip }
  | { k: 'sinif'; s: SinifBilgi; js: string }
  | { k: 'dizi'; alt: string; ust: string; eleman: Tip };

interface MetodBilgi { nparam: number; refs: number[]; kurucu: boolean; dugum?: Dugum; sahip?: SinifBilgi; gd?: string | null; gpt?: (string | null)[] }
interface SinifBilgi {
  ad: string; ham: string; ebeveyn: SinifBilgi | null; ebeveynJs: string | null; kayit: boolean;
  alanlar: Map<string, { ham: string; tipDugum: Dugum | null; ilk: Dugum | null; tip?: Tip }>;
  metodlar: Map<string, MetodBilgi>;
  kapsam: Kapsam;
}
interface Sembol {
  tur: 'degisken' | 'sabit' | 'fonk' | 'sinif' | 'tip' | 'birim' | 'yerel';
  js: string; ham: string;
  tip?: Tip;
  fonk?: { refs: number[]; oto: boolean; donus?: string | null; hizli?: boolean; np?: number; pt?: (string | null)[]; pmin?: number; gdonus?: string | null };
  /** Derleme anında çıkarılan temel tip (tipsiz sabitler için) */
  cTip?: string | null;
  sinif?: SinifBilgi;
  tipDeger?: Tip;
  deger?: any;          // yerleşik birim üyesinin değeri (derleme anı bilgisi)
  ydonus?: string;      // yerleşik birim işlevinin dönüş tipi (yalnızca katı kip tanıları için)
  ithal?: boolean;
  birimSembolleri?: Map<string, Sembol>;
}
interface FonkBaglam {
  tur: string;            // program | birim | fonksiyon | prosedur | kurucu | lambda
  hoist: string[];
  sinif: SinifBilgi | null;
  metodAd: string | null;
  argAd: string;
  Lad: string;
  sonuc: boolean;
  sonucTip: Tip;
  refli: boolean;
  dongu: number;
  kapsam?: Kapsam;
}
class Kapsam {
  s = new Map<string, Sembol>();
  constructor(public ust: Kapsam | null, public fk: FonkBaglam, public sinif: SinifBilgi | null = null) {}
}

const TEMEL: Record<string, string | null> = {
  tamsayi: 'tamsayi', ondalik: 'ondalik', gercek: 'ondalik', metin: 'metin', karakter: 'karakter',
  mantiksal: 'mantiksal', liste: 'liste', sozluk: 'sozluk', tensor: 'tensor', herhangi: null, nesne: null, islev: null,
};
const OPS: Record<string, string> = {
  '+': 'top', '-': 'cik', '*': 'carp', '/': 'bol', bol: 'tbol', mod: 'mod', '**': 'us', '@': 'mat',
  '=': 'esit', '<>': 'esitDegil', '<': 'kucuk', '>': 'buyuk', '<=': 'kucukEsit', '>=': 'buyukEsit', icinde: 'icinde',
};
const J = (s: any) => JSON.stringify(s);

interface BirimKaydi { anahtar: string; ham: string; js: string; semboller: Map<string, Sembol>; yerel: boolean }

export class Uretici {
  sayac = 0;
  birimler = new Map<string, BirimKaydi>();
  derleniyor = new Set<string>();
  birimKodlari: string[] = [];
  refAdlari = new Set<string>(['oku', 'artir', 'azalt', 'degis']);
  dosya = '<girdi>';
  dosyalar: string[] = [];
  /** $.L değeri: dosya numarası * 1e6 + satır */
  Lk(satir: number) {
    let no = this.dosyalar.indexOf(this.dosya);
    if (no < 0) { no = this.dosyalar.length; this.dosyalar.push(this.dosya); }
    return no * 1e6 + satir;
  }

  constructor(private sec: DerlemeSecenekleri) {}

  // ============================================================ katı kip
  // {$katı} yönergesi taşıyan dosyalar derleme zamanında denetlenir: tipi belirtilmemiş bildirimler, tanımsız adlar
  // ve tipi derleme anında bilinen değerlerin uyumsuz kullanımı (atama, argüman, dönüş, koşul, işlem) hatadır.
  // Tipi derleme anında bilinemeyen değerler (liste öğeleri, 'herhangi') eskisi gibi çalışma zamanında denetlenir.
  kati = false;
  tanilar: Tani[] = [];
  deyimSatiri: number | null = null;
  katiMi(kaynak: string, dosya: string): boolean {
    return /\{\$\s*kat[ıi]\s*\}/i.test(kaynak) || !!(this.sec.kati && this.sec.kati(dosya));
  }
  tani(mesaj: string, satir: number | null = this.deyimSatiri) {
    if (!this.kati) return;
    if (this.tanilar.some(t => t.mesaj === mesaj && t.satir === satir && t.dosya === this.dosya)) return;
    this.tanilar.push({ mesaj, satir, dosya: this.dosya });
  }
  // Geniş tipler yalnızca katı kipin tanıları içindir; üretilen kodu etkilemez. Öğe tipi bilinen kaplar
  // 'liste<tamsayi>' / 'sozluk<metin>' biçiminde yazılır; yerleşik işlevlerin dönüş tipleri de burada bilinir.
  genisTip = false;
  /** İfadenin katı kip tanılarında kullanılan tipi (ifadeTipi'nden daha çok şey bilir) */
  tipK(n: Dugum, k: Kapsam): string | null {
    if (!this.kati) return this.ifadeTipi(n, k);
    const eski = this.genisTip;
    this.genisTip = true;
    try { return this.ifadeTipi(n, k); } finally { this.genisTip = eski; }
  }
  // Sınıf tipleri geniş tiplerde '@sıra' olarak yazılır
  sinifListe: SinifBilgi[] = [];
  sinifAd(s: SinifBilgi): string {
    let i = this.sinifListe.indexOf(s);
    if (i < 0) { i = this.sinifListe.length; this.sinifListe.push(s); }
    return '@' + i;
  }
  sinifCoz(t: string | null): SinifBilgi | null { return t && t[0] === '@' ? this.sinifListe[Number(t.slice(1))] ?? null : null; }
  altSinifMi(s: SinifBilgi | null, ust: SinifBilgi): boolean { for (; s; s = s.ebeveyn) if (s === ust) return true; return false; }
  alanSahibi(s: SinifBilgi | null, ad: string): SinifBilgi | null { for (; s; s = s.ebeveyn) if (s.alanlar.has(ad)) return s; return null; }
  /** Metodun dönüş tipi (geniş); bilinmiyorsa null */
  metodDonus(m: MetodBilgi, sinif: SinifBilgi): string | null {
    if (m.kurucu) return this.sinifAd(sinif);
    if (m.gd === undefined) {
      m.gd = null;
      if (m.dugum && m.sahip && m.dugum.donus) { try { m.gd = this.genisAd(this.tipCoz(m.dugum.donus, m.sahip.kapsam)); } catch { /* bilinmeyen tip: ayrıca bildirilir */ } }
    }
    return m.gd;
  }
  /** Metod çağrısında argüman sayısı ve tipleri */
  metodArgDenetle(m: MetodBilgi, ad: string, args: Dugum[], k: Kapsam, satir: number) {
    if (!this.kati || !m.dugum || !m.sahip) return;
    const params: any[] = m.dugum.params;
    if (m.gpt === undefined) m.gpt = params.map(p => { try { return this.genisAd(this.tipCoz(p.tip, m.sahip!.kapsam)); } catch { return null; } });
    const pmin = params.filter(p => !p.varsayilan).length;
    if (args.length > params.length) this.tani(`'${ad}' en çok ${params.length} argüman alır, ${args.length} verildi`, satir);
    else if (args.length < pmin) this.tani(`'${ad}' en az ${pmin} argüman ister, ${args.length} verildi`, satir);
    args.slice(0, params.length).forEach((a, i) => {
      const t = m.gpt![i], v = this.tipK(a, k);
      if (t === null || v === null || m.refs.includes(i)) return;
      const u = this.uyumsuz(this.adTip(t), v);
      if (u) this.tani(`'${ad}' çağrısında ${i + 1}. argüman ${u} olmalı, ${this.tipYazi(v)} verildi`, satir);
    });
  }
  /** nesne.üye erişiminde nesnenin sınıfı biliniyorsa üyeyi bulur; yoksa tanı üretir */
  uyeBul(n: Dugum, k: Kapsam): { sinif: SinifBilgi; alan?: SinifBilgi; metod?: MetodBilgi; kurucu?: boolean } | null {
    // Sınıf.Oluştur: kurucu
    if (n.nesne.tur === 'ad') {
      const r = this.bul(k, n.nesne.ad);
      if (r && r.tur === 'sembol' && r.s.tur === 'sinif') {
        const m = this.metodBul(r.s.sinif, n.ad);
        if (m && m.kurucu) return { sinif: r.s.sinif, metod: m, kurucu: true };
        if (!m && (n.ad === 'olustur' || n.ad === 'yeni')) return { sinif: r.s.sinif, kurucu: true };
        return null;
      }
    }
    const s = this.sinifCoz(this.tipK(n.nesne, k));
    if (!s) return null;
    const alan = this.alanSahibi(s, n.ad);
    if (alan) return { sinif: s, alan };
    const metod = this.metodBul(s, n.ad);
    if (metod) return { sinif: s, metod };
    this.tani(`'${s.ham}' ${s.kayit ? 'kaydında' : 'sınıfında'} '${n.ham ?? n.ad}' adında bir alan ya da metod yok`, n.satir ?? this.deyimSatiri);
    return null;
  }
  genisAd(t: Tip): string | null {
    if (t && t.k === 'sinif') return this.sinifAd(t.s);
    if (!t || t.k !== 'temel') return null;
    const e = t.eleman ? this.genisAd(t.eleman) : null;
    return e ? `${t.ad}<${e}>` : t.ad;
  }
  /** Tip düğümünden (kapsam gerektirmeden) geniş tip adı; temel olmayanlar için null */
  dugumTipAdi(t: any, k?: Kapsam): string | null {
    if (!t) return null;
    if (t.tur === 'tip_dizi') { if (t.alt !== null) return null; const e = this.dugumTipAdi(t.eleman, k); return e ? `liste<${e}>` : 'liste'; }
    if (t.modul === null && !(t.ad in TEMEL) && k) {
      const r = this.bul(k, t.ad);
      return r && r.tur === 'sembol' && r.s.tur === 'sinif' ? this.sinifAd(r.s.sinif) : null;
    }
    if (t.modul !== null || !(t.ad in TEMEL) || !TEMEL[t.ad]) return null;
    const ad = TEMEL[t.ad]!;
    const e = (ad === 'liste' || ad === 'sozluk') ? this.dugumTipAdi(t.eleman, k) : null;
    return e ? `${ad}<${e}>` : ad;
  }
  kapAyir(t: string | null): { kap: string; eleman: string } | null {
    const m = t ? /^(liste|sozluk)<(.*)>$/.exec(t) : null;
    return m ? { kap: m[1], eleman: m[2] } : null;
  }
  adTip(t: string): Tip {
    const s = this.sinifCoz(t);
    if (s) return { k: 'sinif', s, js: '' };
    const k = this.kapAyir(t);
    return k ? { k: 'temel', ad: k.kap, eleman: this.adTip(k.eleman) } : { k: 'temel', ad: t };
  }
  /** Yerleşik birimlerin işlevlerinin dönüş tipleri (testler/kati_birim_testi.y her birini çalışırken doğrular) */
  static YEREL_DONUS: Record<string, Record<string, string>> = {
    takvim: {
      simdi: 'tamsayi', yerelfark: 'tamsayi', tarihyap: 'tamsayi', parcala: 'sozluk', tarihyaz: 'metin', tarihoku: 'tamsayi', saniyeekle: 'tamsayi',
      gunekle: 'tamsayi', ayekle: 'tamsayi', yilekle: 'tamsayi', gunfarki: 'tamsayi', gunbasi: 'tamsayi', haftagunu: 'tamsayi', haftano: 'tamsayi',
      gunadi: 'metin', ayadi: 'metin', artikyil: 'mantiksal', aydakigunsayisi: 'tamsayi', gecerlitarih: 'mantiksal',
    },
    desen: {
      eslesir: 'mantiksal', tameslesir: 'mantiksal', bulhepsi: 'liste', tumgruplar: 'liste', desendegistir: 'metin', desenayir: 'liste',
      desenkacis: 'metin', desengecerli: 'mantiksal',
    },
    guvenlik: {
      ozet: 'metin', imza: 'metin', imzadogru: 'mantiksal', guvenliesit: 'mantiksal', parolaozeti: 'metin', paroladogrula: 'mantiksal',
      yenidenozetlenmeli: 'mantiksal', parolagucu: 'tamsayi', parolasorunlari: 'liste', tuz: 'metin', belirtec: 'metin', guvenlirastgele: 'tamsayi', kimlik: 'metin',
      base64kodla: 'metin', base64coz: 'metin', anahtaruret: 'metin', paroladananahtar: 'metin', sifrele: 'metin', sifrecoz: 'metin',
      htmlkacis: 'metin', sqlmetni: 'metin', yolguvenli: 'mantiksal', dosyaaditemizle: 'metin', epostagecerli: 'mantiksal', urlguvenli: 'mantiksal',
      izinlikarakterler: 'mantiksal', maskele: 'metin', belirtecuret: 'metin', gunlukkayitlari: 'liste', zaman: 'ondalik',
    },
    veritabani: { sqladi: 'metin' },
    sunucu: { yanit: 'sozluk', jsonyanit: 'sozluk', yonlendir: 'sozluk', istekisle: 'sozluk' },
    ag: { httpal: 'sozluk', httpgonder: 'sozluk', httpistek: 'sozluk', urlkodla: 'metin', urlcoz: 'metin', sorguyap: 'metin' },
  };
  /** Yerleşik işlev ya da yerleşik birim işlevi çağrısında argüman sayısı (işlevin kendi bildirdiği sınırlarla) */
  yerelArgDenetle(f: any, ad: string, args: Dugum[], satir: number) {
    if (!this.kati || typeof f !== 'function') return;
    if (typeof f.$n === 'number' && args.length > f.$n) this.tani(`'${f.$ad || ad}' en çok ${f.$n} argüman alır, ${args.length} verildi`, satir);
    else if (typeof f.$min === 'number' && args.length < f.$min) this.tani(`'${f.$ad || ad}' en az ${f.$min} argüman ister, ${args.length} verildi`, satir);
  }
  static YERLESIK_DONUS: Record<string, string> = {
    uzunluk: 'tamsayi', sira: 'tamsayi', tamsayi: 'tamsayi', tamsayiya: 'tamsayi', ondalik: 'ondalik', ondaliga: 'ondalik', kok: 'ondalik',
    metin: 'metin', metne: 'metin', tur: 'metin', buyukharf: 'metin', kucukharf: 'metin', kirp: 'metin', degistir: 'metin', bicimle: 'metin',
    birlestir: 'metin', karakter: 'metin', mantiksal: 'mantiksal', harfmi: 'mantiksal', rakammi: 'mantiksal', icerir: 'mantiksal',
    liste: 'liste', anahtarlar: 'liste', degerler: 'liste', benzersiz: 'liste', ayir: 'liste<metin>',
  };
  /** Öğe tipi bildirilmiş bir kaba konan değerin tipi uymuyorsa tanı üretir */
  ogeDenetle(kap: string | null, deger: Dugum, k: Kapsam, ne: string, satir: number) {
    const a = this.kapAyir(kap);
    if (!a) return;
    const v = this.tipK(deger, k);
    const u = this.uyumsuz(this.adTip(a.eleman), v);
    if (u) this.tani(`${ne} ${this.tipYazi(kap!)}; ${this.tipYazi(v!)} bir öğe konamaz`, satir);
  }
  static TIP_ADI: Record<string, string> = { tamsayi: 'tamsayı', ondalik: 'ondalık', metin: 'metin', karakter: 'karakter', mantiksal: 'mantıksal', liste: 'liste', sozluk: 'sözlük', tensor: 'tensör' };
  tipYazi(t: string): string {
    const s = this.sinifCoz(t);
    if (s) return s.ham;
    const k = this.kapAyir(t);
    if (k) return `${this.tipYazi(k.eleman)} ${k.kap === 'liste' ? 'listesi' : 'sözlüğü'}`;
    return Uretici.TIP_ADI[t] ?? t;
  }
  /** Derleme anında tipi bilinen bir değer hedef tipe hiçbir zaman uymuyorsa hedefin adını döndürür */
  uyumsuz(hedef: Tip, kaynak: string | null): string | null {
    if (!hedef || kaynak === null) return null;
    const kk = this.kapAyir(kaynak);
    if (kk) {
      // öğe tipi bilinen kap: önce kabın kendisi, sonra öğeler
      if (hedef.k === 'temel' && hedef.ad === kk.kap) return hedef.eleman && this.uyumsuz(hedef.eleman, kk.eleman) ? this.tipYazi(this.genisAd(hedef)!) : null;
      kaynak = kk.kap;
    }
    const ks = this.sinifCoz(kaynak);
    if (ks) {
      // sınıf değeri: aynı sınıf, alt sınıfı ya da (çalışırken alt sınıf tutuyor olabileceği için) üst sınıfı kabul edilir
      if (hedef.k === 'sinif') return this.altSinifMi(ks, hedef.s) || this.altSinifMi(hedef.s, ks) ? null : hedef.s.ham;
      return hedef.k === 'dizi' ? 'dizi' : this.tipYazi(this.genisAd(hedef) ?? hedef.ad);
    }
    if (hedef.k === 'sinif') return hedef.s.ham;
    if (hedef.k === 'dizi') return kaynak === 'liste' ? null : 'dizi';
    const h = hedef.ad;
    const tamam = h === kaynak || (h === 'ondalik' && kaynak === 'tamsayi') || ((h === 'metin' || h === 'karakter') && (kaynak === 'metin' || kaynak === 'karakter'));
    return tamam ? null : this.tipYazi(this.genisAd(hedef) ?? h);
  }
  /** İkili işlem, tipleri bilinen iki basit değer için tanımlı mı (çalışma zamanındaki kurallarla aynı) */
  ikiliGecerli(op: string, a: string, b: string): boolean {
    const S = (t: string) => t === 'tamsayi' || t === 'ondalik', M = (t: string) => t === 'metin' || t === 'karakter';
    const basit = (t: string) => S(t) || M(t) || t === 'mantiksal';
    if (!basit(a) || !basit(b)) return true;
    switch (op) {
      case '+': return (S(a) && S(b)) || M(a) || M(b);
      case '-': case '/': case '**': return S(a) && S(b);
      case '*': return (S(a) && S(b)) || (M(a) && b === 'tamsayi');
      case 'bol': case 'mod': return a === 'tamsayi' && b === 'tamsayi';
      case '<': case '>': case '<=': case '>=': return (S(a) && S(b)) || (M(a) && M(b));
    }
    return true;
  }
  /** Tipleri bildirilmiş bir alt programa yapılan çağrıda argüman sayısı ve tipleri */
  argDenetle(s: Sembol, args: Dugum[], k: Kapsam, satir: number) {
    if (!this.kati || !s.fonk || s.fonk.pt === undefined) return;
    const f = s.fonk, np = f.pt!.length;
    if (args.length > np) this.tani(`'${s.ham}' en çok ${np} argüman alır, ${args.length} verildi`, satir);
    else if (args.length < (f.pmin ?? 0)) this.tani(`'${s.ham}' en az ${f.pmin} argüman ister, ${args.length} verildi`, satir);
    args.slice(0, np).forEach((a, i) => {
      const t = f.pt![i], v = this.tipK(a, k);
      if (t === null || v === null || f.refs.includes(i)) return;
      const u = this.uyumsuz(this.adTip(t), v);
      if (u) this.tani(`'${s.ham}' çağrısında ${i + 1}. argüman ${u} olmalı, ${this.tipYazi(v)} verildi`, satir);
    });
  }

  // ============================================================ hata ayıklama
  /** Hata ayıklayıcının çerçeve kimliği → kapsam bilgisi (kimlik = dizideki sıra) */
  ayiklaKapsamlar: { k: Kapsam; ad: string; tur: string; dosya: string; sinif: boolean }[] = [];
  /** Üzerinde durulabilen (deyim içeren) satırların $.L kodları */
  ayiklaSatirlar = new Set<number>();
  ayiklaDeyimNo = 0;
  ayiklaKaydet(k: Kapsam, ad: string, tur: string, sinif = false): number {
    this.ayiklaKapsamlar.push({ k, ad, tur, dosya: this.dosya, sinif });
    return this.ayiklaKapsamlar.length - 1;
  }
  /** Gövdeyi çerçeve kaydıyla sarar; $f.g, gövdenin yerel değişkenlerine erişen kapanıştır */
  ayiklaSar(id: number, govde: string): string {
    return `const $f = $.aGir(${id}); try { $f.g = ($k) => eval($k);\n${govde}\n} finally { $.aCik($f); }`;
  }
  /** Çerçevenin değişkenleri: [görünen ad, JS adı]. genel=true ise çerçevenin dışındaki (program/birim) değişkenler */
  ayiklaDegiskenler(id: number, genel: boolean): [string, string][] {
    const kayit = this.ayiklaKapsamlar[id];
    const yerel = kayit.k;
    const out: [string, string][] = [];
    if (!genel) {
      for (const s of yerel.s.values()) if (s.tur === 'degisken' && !s.ithal) out.push([s.ham, s.js]);
      return out;
    }
    let kok = yerel;
    while (kok.ust) kok = kok.ust;
    if (kok === yerel) return out;
    const golge = new Set<string>();
    for (let k: Kapsam | null = yerel; k && k !== kok; k = k.ust) for (const s of k.s.values()) golge.add(s.js);
    for (const s of kok.s.values()) if (s.tur === 'degisken' && !s.ithal && !golge.has(s.js)) out.push([s.ham, s.js]);
    return out;
  }
  /** Duraklamış çerçevede değerlendirilecek ifadeyi (ya da atamayı) JS koduna çevirir */
  ayiklaIfade(id: number, metin: string): string {
    const kayit = this.ayiklaKapsamlar[id];
    const k = kayit.k, fk = k.fk;
    const eskiDosya = this.dosya, h0 = fk.hoist.length;
    this.dosya = kayit.dosya;
    const tek = metin.replace(/\r?\n/g, ' ');
    const sar = (js: string) => { const ek = fk.hoist.slice(h0); return `(() => { ${ek.length ? `let ${ek.join(', ')};` : ''} ${js} })()`; };
    try {
      let agac: any;
      try { agac = coz(`program _a\nbaşla\n_a := (${tek})\nbitir.`, '<ifade>'); }
      catch (e) {
        // ifade değilse atama deyimi olabilir: x := 5
        let a2: any;
        try { a2 = coz(`program _a\nbaşla\n${tek}\nbitir.`, '<ifade>'); } catch { throw e; }
        const d = a2.govde.deyimler;
        if (d.length !== 1 || d[0].tur !== 'atama') throw e;
        return sar(`${this.deyimIc(d[0], k)}; return ${this.ifade(d[0].hedef, k)};`);
      }
      const d = agac.govde.deyimler;
      if (d.length !== 1 || d[0].tur !== 'atama') this.hata('Tek bir ifade bekleniyordu');
      return sar(`return (${this.ifade(d[0].deger, k)});`);
    } finally { fk.hoist.length = h0; this.dosya = eskiDosya; }
  }

  hata(m: string, satir: number | null = null): never { throw new YontemHatasi(m, satir, this.dosya); }
  yeniAd(on: string) { return `$${on}${++this.sayac}`; }

  // ============================================================ giriş
  programDerle(kaynak: string, dosya: string): string {
    this.dosya = dosya;
    this.kati = this.katiMi(kaynak, dosya);
    const katiBu = this.kati;
    const agac = coz(kaynak, dosya);
    if (agac.tur === 'birim') this.hata("Birim dosyaları doğrudan çalıştırılamaz; 'kullan' ile yükleyin", 1);
    this.refAdlariTopla(agac);
    const fk = this.yeniBaglam('program', null, null);
    const k = new Kapsam(null, fk);
    fk.kapsam = k;
    const govde: string[] = [];
    govde.push(this.kullanDerle(agac.kullan, k, dosya));
    this.dosya = dosya;
    this.kati = katiBu;
    this.kaydet(agac.bildirimler, k);
    const bild = agac.bildirimler.map((b: Dugum) => this.bildirim(b, k)).join('\n');
    const deyimler = this.deyimler(agac.govde.deyimler, k);
    govde.push(this.hoistKod(fk), bild, deyimler);
    if (this.tanilar.length) throw new TipHatalari(this.tanilar);
    const ic = this.sec.ayikla ? this.ayiklaSar(this.ayiklaKaydet(k, agac.ham ?? agac.ad ?? 'program', 'program'), govde.join('\n')) : govde.join('\n');
    return `"use strict";\n$.dosyalar = ${J(this.dosyalar)};\n${this.birimKodlari.join('\n')}\n(() => {\n${ic}\n})();\n`;
  }

  refAdlariTopla(agac: any) {
    const gez = (n: any) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(gez); return; }
      if (n.tur === 'altprogram' && n.params && n.params.some((p: any) => p.ref)) this.refAdlari.add(n.ad);
      for (const k in n) if (k !== 'tur' && k !== 'satir') gez(n[k]);
    };
    gez(agac);
  }

  yeniBaglam(tur: string, sinif: SinifBilgi | null, metodAd: string | null): FonkBaglam {
    return { tur, hoist: [], sinif, metodAd, argAd: this.yeniAd('a'), Lad: this.yeniAd('L'), sonuc: false, sonucTip: null, refli: false, dongu: 0 };
  }
  hoistKod(fk: FonkBaglam) { return fk.hoist.length ? `let ${fk.hoist.join(', ')};` : ''; }

  // ============================================================ birimler
  kullanDerle(lst: [string, number][], k: Kapsam, dosya: string): string {
    const out: string[] = [];
    const gorulen = new Set<string>();
    for (const [ham, satir] of lst) {
      const kayit = this.birimYukle(ham, satir, dosya);
      if (gorulen.has(kayit.anahtar)) continue;
      gorulen.add(kayit.anahtar);
      this.dosya = dosya;
      out.push(`const ${kayit.js} = ($.L = ${this.Lk(satir)}, $.birim(${J(kayit.anahtar)}));`);
      for (const [ad, s] of kayit.semboller) k.s.set(ad, { ...s, ithal: true });
      k.s.set(katla(ham), { tur: 'birim', js: kayit.js, ham, ithal: true, birimSembolleri: kayit.semboller });
    }
    return out.join('\n');
  }

  birimYukle(ham: string, satir: number, dosya: string): BirimKaydi {
    const anahtar = katla(ham);
    const hazir = this.birimler.get(anahtar);
    if (hazir) return hazir;
    const js = 'U_' + anahtar;
    const yerel = this.sec.yerelBirim(anahtar);
    if (yerel) {
      const semboller = new Map<string, Sembol>();
      for (const ad of Object.keys(yerel)) {
        if (ad.startsWith('$')) continue;
        const v = yerel[ad];
        semboller.set(ad, { tur: 'yerel', js: `${js}.v_${ad}`, ham: (v && v.$ad) || ad, deger: v, ydonus: (Uretici.YEREL_DONUS[katla(String(yerel.$ad ?? anahtar))] ?? {})[ad] });
      }
      const kayit = { anahtar, ham, js, semboller, yerel: true };
      this.birimler.set(anahtar, kayit);
      return kayit;
    }
    if (this.derleniyor.has(anahtar)) throw new YontemHatasi(`Döngüsel birim kullanımı: '${ham}'`, satir, dosya);
    const bulunan = this.sec.birimBul(anahtar, ham, dosya);
    if (!bulunan) throw new YontemHatasi(`Birim bulunamadı: '${ham}'${this.sec.aranan ? ` (aranan: ${this.sec.aranan.join(', ')})` : ''}`, satir, dosya);
    this.derleniyor.add(anahtar);
    try {
      const kayit = this.birimDerle(bulunan.kaynak, bulunan.yol, anahtar, js);
      this.birimler.set(anahtar, kayit);
      return kayit;
    } finally { this.derleniyor.delete(anahtar); }
  }

  birimDerle(kaynak: string, yol: string, anahtar: string, js: string): BirimKaydi {
    const eskiDosya = this.dosya, eskiKati = this.kati;
    this.dosya = yol;
    this.kati = this.katiMi(kaynak, yol);
    const katiBu = this.kati;
    const agac = coz(kaynak, yol);
    if (agac.tur !== 'birim') this.hata(`'${yol}' bir birim değil (birim Ad; ile başlamalı)`);
    this.refAdlariTopla(agac);
    const fk = this.yeniBaglam('birim', null, null);
    const k = new Kapsam(null, fk);
    fk.kapsam = k;
    const parca: string[] = [];
    parca.push(this.kullanDerle(agac.kullan, k, yol));
    this.dosya = yol;
    this.kati = katiBu;
    let disa: string[] | null = null;
    let bildirimler: Dugum[] = [];
    if (agac.arayuz !== null) {
      disa = [];
      for (const b of agac.arayuz) {
        if (b.tur === 'degisken') disa.push(...b.adlar);
        else if (b.tur === 'altprogram' && b.sinif_adi) continue;
        else disa.push(b.ad);
      }
      bildirimler = agac.arayuz.filter((b: Dugum) => b.tur !== 'altprogram');
    }
    bildirimler = bildirimler.concat(agac.uygulama);
    // arayüzdeki altprogram bildirimleri (gövdesiz) yine de sembol olarak tanınsın
    const arayuzAlt = agac.arayuz ? agac.arayuz.filter((b: Dugum) => b.tur === 'altprogram' && !b.sinif_adi) : [];
    this.kaydet(arayuzAlt.concat(bildirimler), k);
    parca.push(bildirimler.map(b => this.bildirim(b, k)).join('\n'));
    const disaAc: string[] = [];
    for (const [ad, s] of k.s) {
      if (s.ithal || s.tur === 'tip') continue;
      disaAc.push(`$.birimiDisaAc(G, ${J(ad)}, () => ${s.js}, (v) => { ${s.js} = v; });`);
      if (s.tur === 'fonk' && s.fonk.hizli) disaAc.push(`Object.defineProperty(G, ${J('v_' + ad + '$h')}, { get: () => ${s.js}$h, set: (v) => { ${s.js}$h = v; }, configurable: true });`);
    }
    parca.push(disaAc.join('\n'));
    parca.push(this.deyimler(agac.baslangic, k));
    const kod = `$.birimTanimla(${J(anahtar)}, ${J(agac.ad)}, ${disa ? J(disa) : 'null'}, (G) => {\n${this.sec.ayikla ? this.ayiklaSar(this.ayiklaKaydet(k, agac.ad, 'birim'), this.hoistKod(fk) + '\n' + parca.join('\n')) : this.hoistKod(fk) + '\n' + parca.join('\n')}\n});`;
    this.birimKodlari.push(kod);
    const semboller = new Map<string, Sembol>();
    for (const [ad, s] of k.s) {
      if (s.ithal) continue;
      if (disa && !disa.includes(ad)) continue;
      semboller.set(ad, { ...s, js: `${js}.v_${ad}` });
    }
    this.dosya = eskiDosya;
    this.kati = eskiKati;
    return { anahtar, ham: agac.ad, js, semboller, yerel: false };
  }

  // ============================================================ ad çözümleme
  bul(k: Kapsam, ad: string): { tur: 'sembol'; s: Sembol; kapsam: Kapsam } | { tur: 'alan'; ad: string; tip: Tip }
    | { tur: 'metod'; ad: string; m: MetodBilgi } | { tur: 'yerlesik'; v: any } | null {
    for (let c: Kapsam | null = k; c; c = c.ust) {
      if (c.sinif) {
        for (let s: SinifBilgi | null = c.sinif; s; s = s.ebeveyn) {
          const a = s.alanlar.get(ad);
          if (a) return { tur: 'alan', ad, tip: this.alanTipi(s, ad) };
        }
        const m = this.metodBul(c.sinif, ad);
        if (m) return { tur: 'metod', ad, m };
        continue;
      }
      const s = c.s.get(ad);
      if (s) return { tur: 'sembol', s, kapsam: c };
    }
    if (ad in this.sec.yerlesikler) return { tur: 'yerlesik', v: this.sec.yerlesikler[ad] };
    return null;
  }
  metodBul(s: SinifBilgi | null, ad: string): MetodBilgi | null {
    for (; s; s = s.ebeveyn) { const m = s.metodlar.get(ad); if (m) return m; }
    return null;
  }
  alanTipi(s: SinifBilgi, ad: string): Tip {
    const a = s.alanlar.get(ad);
    if (a.tip === undefined) a.tip = this.tipCoz(a.tipDugum, s.kapsam);
    return a.tip;
  }
  tanimsiz(n: Dugum) {
    const ipucu = ({ yazsatir: ' — yeni satır için yaz(değer, 1) kullanın', okusatir: ' — satır okumak için oku(değişken, 1) kullanın' } as any)[n.ad] ?? '';
    this.tani(`Tanımsız tanımlayıcı: '${n.ham || n.ad}'${ipucu}`, n.satir ?? this.deyimSatiri);
    return `$.hata(${J(`Tanımsız tanımlayıcı: '${n.ham || n.ad}'${ipucu}`)})`;
  }

  // ============================================================ tipler
  tipCoz(n: Dugum | null, k: Kapsam): Tip {
    if (!n) return null;
    if (n.tur === 'tip_dizi') {
      const el = n.eleman ? this.tipCoz(n.eleman, k) : null;
      if (n.alt === null) return el ? { k: 'temel', ad: 'liste', eleman: el } : { k: 'temel', ad: 'liste' };
      return { k: 'dizi', alt: this.ifade(n.alt, k), ust: this.ifade(n.ust, k), eleman: el };
    }
    if (n.modul === null && n.ad in TEMEL) {
      const t = TEMEL[n.ad];
      if (t && n.eleman && (t === 'liste' || t === 'sozluk')) { const el = this.tipCoz(n.eleman, k); if (el) return { k: 'temel', ad: t, eleman: el }; }
      return t ? { k: 'temel', ad: t } : null;
    }
    let s: Sembol | null = null;
    if (n.modul !== null) {
      const b = this.bul(k, n.modul);
      if (b && b.tur === 'sembol' && b.s.tur === 'birim' && b.s.birimSembolleri) s = b.s.birimSembolleri.get(n.ad) ?? null;
    } else {
      const b = this.bul(k, n.ad);
      if (b && b.tur === 'sembol') s = b.s;
    }
    if (s && s.tur === 'sinif') return { k: 'sinif', s: s.sinif, js: s.js };
    if (s && s.tur === 'tip') return s.tipDeger;
    if (s && s.tur === 'yerel' && s.deger && s.deger.$tipAdi) return { k: 'temel', ad: s.deger.$tipAdi };
    this.hata(`Bilinmeyen tip: '${n.ham}'`, n.satir);
  }
  /** v değerini tipe uydur; ad: JS ifadesi (metin) */
  uy(tip: Tip, v: string, ad: string): string {
    if (!tip) return v;
    if (tip.k === 'temel') return `$.u_${tip.ad}(${v}, ${ad})`;
    if (tip.k === 'sinif') return `$.u_sinif(${tip.js}, ${v}, ${ad})`;
    return `$.u_dizi(${v}, ${ad})`;
  }
  varsayilan(tip: Tip): string {
    if (!tip) return 'null';
    if (tip.k === 'temel') return ({ tamsayi: '0n', ondalik: '0', metin: "''", karakter: "''", mantiksal: 'false', liste: '[]', sozluk: 'new Map()', tensor: 'null' } as any)[tip.ad];
    if (tip.k === 'sinif') return tip.s.kayit ? `$.vsSinif(${tip.js})` : 'null';
    return `$.vsDizi(${tip.alt}, ${tip.ust}, () => ${this.varsayilan(tip.eleman)})`;
  }

  // ============================================================ bildirimler
  /** Ön geçiş: adları kapsamda tanıt (sınıflar ve tipler önce). */
  kaydet(lst: Dugum[], k: Kapsam) {
    for (const b of lst) {
      if (b.tur === 'tipdef' && (b.tanim.tur === 'sinif' || b.tanim.tur === 'kayit')) {
        const t = b.tanim;
        let eb: SinifBilgi | null = null, ebJs: string | null = null;
        if (t.ebeveyn) {
          const r = this.bul(k, t.ebeveyn);
          if (!r || r.tur !== 'sembol' || r.s.tur !== 'sinif') this.hata(`Ebeveyn '${t.ebeveyn}' bir sınıf değil`, b.satir);
          eb = r.s.sinif; ebJs = r.s.js;
        }
        const s: SinifBilgi = { ad: b.ad, ham: b.ham, ebeveyn: eb, ebeveynJs: ebJs, kayit: t.tur === 'kayit', alanlar: new Map(), metodlar: new Map(), kapsam: k };
        for (const [ad, ham, tip, ilk] of t.alanlar) s.alanlar.set(ad, { ham, tipDugum: tip, ilk });
        for (const m of t.metodlar) {
          if (m.govde !== null || !s.metodlar.has(m.ad)) s.metodlar.set(m.ad, this.metodBilgi(m, s));
          if (m.params.some((p: any) => p.ref)) this.refAdlari.add(m.ad);
        }
        if (!this.yerelVar(k, b.ad)) k.s.set(b.ad, { tur: 'sinif', js: this.jsAd(k, b.ad), ham: b.ham, sinif: s });
      }
    }
    for (const b of lst) {
      if (b.tur === 'tipdef' && !(b.tanim.tur === 'sinif' || b.tanim.tur === 'kayit')) {
        if (!this.yerelVar(k, b.ad)) k.s.set(b.ad, { tur: 'tip', js: 'null', ham: b.ham, tipDeger: this.tipCoz(b.tanim, k) });
      }
    }
    for (const b of lst) {
      if (b.tur === 'sabit') {
        if (!b.tip) this.tani(`'${b.ham}' sabitinin tipi belirtilmeli (katı kip): sabit ${b.ham}: tip = değer`, b.satir);
        if (!this.yerelVar(k, b.ad)) k.s.set(b.ad, { tur: 'sabit', js: this.jsAd(k, b.ad), ham: b.ham, tip: b.tip ? this.tipCoz(b.tip, k) : null, cTip: b.tip ? null : this.sabitTipi(b.ifade) });
      } else if (b.tur === 'degisken') {
        let tip = b.tip ? this.tipCoz(b.tip, k) : null;
        if (this.kati && !b.tip) {
          // katı kipte tip ilk değerden çıkarılır; çıkarılamıyorsa belirtilmelidir
          // (sabit olmayan ilk değerin tipi, bildirim derlenirken belirlenir)
          const t = this.sabitTipi(b.ilk);
          if (t) tip = { k: 'temel', ad: t };
        }
        b.adlar.forEach((ad: string, i: number) => {
          if (!this.yerelVar(k, ad)) k.s.set(ad, { tur: 'degisken', js: this.jsAd(k, ad), ham: b.hamlar[i], tip });
        });
      } else if (b.tur === 'altprogram') {
        if (b.sinif_adi) {
          const r = this.bul(k, b.sinif_adi);
          if (!r || r.tur !== 'sembol' || r.s.tur !== 'sinif') this.hata(`'${b.sinif_adi}' bir sınıf değil`, b.satir);
          if (b.govde !== null) r.s.sinif.metodlar.set(b.ad, this.metodBilgi(b, r.s.sinif));
        } else if (!this.yerelVar(k, b.ad) || k.s.get(b.ad).tur === 'fonk') {
          const refs = this.refler(b.params);
          const govdeli = lst.some(x => x.tur === 'altprogram' && !x.sinif_adi && x.ad === b.ad && x.govde !== null);
          const temel = (t: any): string | null => t && t.tur !== 'tip_dizi' && t.modul === null && t.ad in TEMEL ? TEMEL[t.ad] : null;
          const d = temel(b.donus);
          const pt = b.params.map((p: any) => this.dugumTipAdi(p.tip, k)), pmin = b.params.filter((p: any) => !p.varsayilan).length;
          k.s.set(b.ad, { tur: 'fonk', js: this.jsAd(k, b.ad), ham: b.ham, fonk: { refs, oto: b.params.length === 0, donus: b.cesit === 'fonksiyon' ? d : null, hizli: govdeli && refs.length === 0 && !this.sec.ayikla, np: b.params.length, pt, pmin, gdonus: b.cesit === 'fonksiyon' ? this.dugumTipAdi(b.donus, k) : null } });
        }
      }
    }
  }
  yerelVar(k: Kapsam, ad: string) { const s = k.s.get(ad); return !!s && !s.ithal; }
  jsAd(k: Kapsam, ad: string) { return 'v_' + ad; }
  refler(params: Dugum[]) { const r: number[] = []; params.forEach((p, i) => { if (p.ref) r.push(i); }); return r; }
  metodBilgi(m: Dugum, sahip?: SinifBilgi): MetodBilgi { return { nparam: m.params.length, refs: this.refler(m.params), kurucu: m.cesit === 'kurucu', dugum: m, sahip }; }

  tanimliHata(ham: string) {
    return `$.hata(${J(`'${ham}' bu kapsamda zaten tanımlı (Yöntem büyük/küçük harf ve ş/s, ç/c gibi farkları ayırt etmez)`)});`;
  }

  bildirim(b: Dugum, k: Kapsam): string {
    this.deyimSatiri = b.satir;
    const L = `$.L = ${this.Lk(b.satir)};`;
    const tanimli = new Set<string>((k as any).$tanimli ?? []);
    const tanimla = (ad: string, ham: string, kod: string) => {
      const kume: Set<string> = (k as any).$tanimli ?? ((k as any).$tanimli = new Set());
      if (kume.has(ad)) return L + this.tanimliHata(ham);
      kume.add(ad);
      return kod;
    };
    void tanimli;
    switch (b.tur) {
      case 'sabit': {
        const s = k.s.get(b.ad);
        const v = this.uyI(s.tip, b.ifade, k, J(b.ham));
        return tanimla(b.ad, b.ham, `${L} let ${s.js} = ${v};`);
      }
      case 'degisken': {
        const out: string[] = [];
        b.adlar.forEach((ad: string, i: number) => {
          const s = k.s.get(ad);
          if (this.kati && !b.tip && !s.tip) {
            const t = b.ilk ? this.tipK(b.ilk, k) : null;
            if (t) s.tip = this.adTip(t);
            else this.tani(`'${b.hamlar[i]}' değişkeninin tipi ilk değerinden anlaşılamıyor; tipini belirtin (katı kip)`, b.satir);
          }
          const v = b.ilk ? this.uyI(s.tip, b.ilk, k, J(b.hamlar[i])) : this.varsayilan(s.tip);
          out.push(tanimla(ad, b.hamlar[i], `${L} let ${s.js} = ${v};`));
        });
        return out.join('\n');
      }
      case 'tipdef': {
        if (b.tanim.tur !== 'sinif' && b.tanim.tur !== 'kayit') return tanimla(b.ad, b.ham, '');
        return tanimla(b.ad, b.ham, this.sinifKod(b, k));
      }
      case 'altprogram': {
        if (b.sinif_adi) {
          const r = this.bul(k, b.sinif_adi) as any;
          if (b.govde === null) return '';
          return `${L} ${this.metodKod(r.s.js, r.s.sinif, b)}`;
        }
        if (b.govde === null) return '';
        const s = k.s.get(b.ad);
        const hizli = s.fonk && s.fonk.hizli ? s.js + '$h' : null;
        const f = this.fonkKod(b, k, b.cesit, null, null, b.ham, hizli);
        const hk = hizli ? this.hizliKod : '';
        return tanimla(b.ad, b.ham, `${hk} let ${s.js} = $.fn(${f}, ${J(b.ham)}, ${b.params.length}, 0, ${J(this.refler(b.params))}, ${b.params.length === 0});`);
      }
    }
    return '';
  }

  sinifKod(b: Dugum, k: Kapsam): string {
    const s = k.s.get(b.ad);
    const bilgi = s.sinif;
    const ilkle: string[] = [];
    const tipler: string[] = [];
    for (const [ad, a] of bilgi.alanlar) {
      const tip = this.alanTipi(bilgi, ad);
      const v = a.ilk ? this.uy(tip, this.ifade(a.ilk, k), J(a.ham)) : this.varsayilan(tip);
      ilkle.push(`this.f_${ad} = ${v};`);
      if (tip) tipler.push(`${J(ad)}: (v, ad) => ${this.uy(tip, 'v', 'ad')}`);
    }
    const ust = bilgi.ebeveynJs ?? '$.YNesne';
    const out: string[] = [];
    out.push(`$.L = ${this.Lk(b.satir)}; let ${s.js} = $.sinif(class extends ${ust} { $ilkle() { super.$ilkle(); ${ilkle.join(' ')} } }, ${J(b.ham)}, ${bilgi.ebeveynJs ?? 'null'}, ${bilgi.kayit}, ${J([...bilgi.alanlar.keys()])}, {${tipler.join(', ')}}, ${J(Object.fromEntries([...bilgi.alanlar].map(([a, x]) => [a, x.ham])))});`);
    const gorulen = new Set<string>();
    for (const m of b.tanim.metodlar) {
      if (m.govde === null) {
        if (gorulen.has(m.ad)) continue;
        gorulen.add(m.ad);
        out.push(`$.metod(${s.js}, 'm_${m.ad}', $.govdesiz(${J(m.ham)}, ${m.direktifler.includes('soyut')}), ${J(m.ham)}, ${m.params.length}, ${J(this.refler(m.params))}, ${m.cesit === 'kurucu'});`);
      } else {
        gorulen.add(m.ad);
        out.push(this.metodKod(s.js, bilgi, m));
      }
    }
    return out.join('\n');
  }

  metodKod(sinifJs: string, bilgi: SinifBilgi, m: Dugum): string {
    const f = this.fonkKod(m, bilgi.kapsam, m.cesit, bilgi, m.ad, m.ham);
    return `$.metod(${sinifJs}, 'm_${m.ad}', ${f}, ${J(m.ham)}, ${m.params.length}, ${J(this.refler(m.params))}, ${m.cesit === 'kurucu'});`;
  }

  /** Fonksiyon/prosedür/metod/lambda gövdesi → JS fonksiyon ifadesi */
  /** hizliAd verilirse: sabit parametreli hızlı fonksiyon hizliKod'a yazılır; dönen sarmalayıcı onu çağırır */
  hizliKod = '';
  fonkKod(n: Dugum, kapanis: Kapsam, tur: string, sinif: SinifBilgi | null, metodAd: string | null, ham: string, hizliAd: string | null = null): string {
    const fk = this.yeniBaglam(tur, sinif, metodAd);
    const ust = sinif ? new Kapsam(kapanis, kapanis.fk, sinif) : kapanis;
    const k = new Kapsam(ust, fk);
    fk.kapsam = k;
    const A = fk.argAd, Lv = fk.Lad;
    const govde: string[] = [];
    govde.push(`const ${Lv} = $.L;`);
    const params: Dugum[] = n.params;
    govde.push(`if (${A}.length > ${params.length}) $.hata(\`'${this.sablon(ham)}' en çok ${params.length} argüman alır, \${${A}.length} verildi\`);`);
    const geriYaz: string[] = [];
    const sarmal: string[] = [], hizliDenetim: string[] = [];
    params.forEach((p, i) => {
      const js = 'v_' + p.ad;
      const vs = p.varsayilan ? this.ifade(p.varsayilan, kapanis) : `$.hata(${J(`'${ham}' için '${p.ham}' argümanı eksik`)})`;
      govde.push(`let ${js} = ${A}.length > ${i} ? ${A}[${i}] : ${vs};`);
      sarmal.push(`let ${js} = ${A}.length > ${i} ? ${A}[${i}] : ${vs};`);
      if (p.ref) {
        fk.refli = true;
        const r = `$r${i}`;
        govde.push(`let ${r} = null; if (${js} instanceof $.YRef) { ${r} = ${js}; ${js} = ${js}.al(); }`);
        geriYaz.push(`if (${r}) ${r}.ata(${js});`);
      }
      const tip = this.tipCoz(p.tip, kapanis);
      if (!p.tip && tur !== 'lambda') this.tani(`'${ham}': '${p.ham}' parametresinin tipi belirtilmeli (katı kip)`, n.satir);
      if (tip) {
        const u = `${js} = ${this.uy(tip, js, J(p.ham))};`;
        govde.push(u); sarmal.push(u); hizliDenetim.push(u);
      }
      k.s.set(p.ad, { tur: 'degisken', js, ham: p.ham, tip });
    });
    const bagSon = govde.length;
    if (n.donus) {
      fk.sonuc = true;
      fk.sonucTip = this.tipCoz(n.donus, kapanis);
      govde.push(`let v_sonuc = ${this.varsayilan(fk.sonucTip)};`);
      k.s.set('sonuc', { tur: 'degisken', js: 'v_sonuc', ham: 'sonuç', tip: fk.sonucTip });
    } else if (tur === 'fonksiyon' || tur === 'lambda') {
      if (tur === 'fonksiyon') this.tani(`'${ham}' fonksiyonunun dönüş tipi belirtilmeli (katı kip)`, n.satir);
      fk.sonuc = true;
      govde.push('let v_sonuc = null;');
      k.s.set('sonuc', { tur: 'degisken', js: 'v_sonuc', ham: 'sonuç', tip: null });
    }
    const ic: string[] = [];
    if (n.ifade) {
      ic.push(`const $v = ${this.uyI(fk.sonucTip, n.ifade, k, "'sonuç'")}; ${fk.refli ? '' : `$.L = ${Lv};`} return $v;`);
    } else {
      this.kaydet(n.yerel, k);
      for (const b of n.yerel) ic.push(this.bildirim(b, k));
      ic.push(this.deyimler(n.govde.deyimler, k));
      ic.push(`${fk.refli ? '' : `$.L = ${Lv};`} return ${this.donusDegeri(fk)};`);
    }
    const hoist = this.hoistKod(fk);
    if (fk.refli) {
      govde.push(hoist);
      govde.push(`const $s = (() => {\n${this.sec.ayikla ? '$f.g = ($k) => eval($k);' : ''}\n${ic.join('\n')}\n})();`);
      govde.push(geriYaz.join(' '));
      govde.push(`$.L = ${Lv}; return $s;`);
    } else {
      govde.push(hoist);
      // 'return X' → L geri yüklenerek dönülür
      govde.push(ic.join('\n'));
    }
    const ok = sinif ? `function (...${A})` : `(...${A}) =>`;
    if (hizliAd && !fk.refli) {
      // Parametre bağlama satırları (govde[2 .. 2+bağlama)) hızlı sürümde adlandırılmış parametrelerdir
      const hgovde = [govde[0], ...hizliDenetim, ...govde.slice(bagSon)];
      this.hizliKod = `let ${hizliAd} = (${params.map(p => 'v_' + p.ad).join(', ')}) => {\n${hgovde.join('\n')}\n};`;
      return `${ok} {\n${govde[1]}\n${sarmal.join('\n')}\nreturn ${hizliAd}(${params.map(p => 'v_' + p.ad).join(', ')});\n}`;
    }
    this.hizliKod = '';
    if (this.sec.ayikla) {
      const id = this.ayiklaKaydet(k, sinif && metodAd ? `${sinif.ham}.${ham}` : ham, tur, !!sinif);
      return `${ok} {\n${govde[0]}\n${this.ayiklaSar(id, govde.slice(1).join('\n'))}\n}`;
    }
    return `${ok} {\n${govde.join('\n')}\n}`;
  }
  sablon(s: string) { return s.replace(/[`\\$]/g, c => '\\' + c); }
  donusDegeri(fk: FonkBaglam) {
    if (fk.tur === 'kurucu') return 'this';
    return fk.sonuc ? 'v_sonuc' : 'null';
  }
  /** fonksiyondan dönüş deyimi */
  donKod(fk: FonkBaglam, deger: string | null, dTip: string | null = null): string {
    if (fk.tur === 'program' || fk.tur === 'birim') return deger ? `{ ${deger}; return; }` : 'return;';
    let ata = '';
    if (deger !== null) {
      if (fk.sonuc) ata = `v_sonuc = ${this.uyT(fk.sonucTip, deger, dTip, "'sonuç'")}; `;
      else if (fk.tur !== 'kurucu') return fk.refli ? `return ${deger};` : `{ const $v = ${deger}; $.L = ${fk.Lad}; return $v; }`;
      else ata = `${deger}; `;
    }
    const r = this.donusDegeri(fk);
    return fk.refli ? `{ ${ata}return ${r}; }` : `{ ${ata}$.L = ${fk.Lad}; return ${r}; }`;
  }

  // ============================================================ deyimler
  deyimler(lst: Dugum[], k: Kapsam): string { return lst.map(d => this.deyim(d, k)).join('\n'); }

  deyim(d: Dugum, k: Kapsam): string {
    if (d.tur === 'blok') return `{\n${this.deyimler(d.deyimler, k)}\n}`;
    if (d.tur === 'bos') return '';
    this.deyimSatiri = d.satir;
    if (this.sec.ayikla) {
      this.ayiklaSatirlar.add(this.Lk(d.satir));
      // Deyim numarası kaynak sırasıyla artar: aynı satırda ilerlemek ile aynı deyime geri dönmek (döngü) ayırt edilir
      const no = ++this.ayiklaDeyimNo;
      return `$.L = ${this.Lk(d.satir)}; $.aDur(${no}); ${this.deyimIc(d, k)}`;
    }
    return `$.L = ${this.Lk(d.satir)}; ${this.deyimIc(d, k)}`;
  }

  /** gövde deyimini (tek deyim ya da blok) döngü içinde derler */
  donguGovde(d: Dugum, k: Kapsam): string {
    k.fk.dongu++;
    try { return this.deyim(d, k); } finally { k.fk.dongu--; }
  }

  deyimIc(d: Dugum, k: Kapsam): string {
    const fk = k.fk;
    switch (d.tur) {
      case 'atama': {
        if (this.kati && d.op === ':=' && d.hedef.tur === 'indeks' && d.hedef.indeksler.length === 1)
          this.ogeDenetle(this.tipK(d.hedef.nesne, k), d.deger, k, `'${d.hedef.nesne.ham ?? 'liste'}'`, d.satir);
        if (this.kati && d.op === ':=' && d.hedef.tur === 'alan') {
          const u = this.uyeBul(d.hedef, k);
          if (u && u.alan) this.uyDenetle(this.alanTipi(u.alan, d.hedef.ad), this.tipK(d.deger, k), J(d.hedef.ad), `${d.hedef.nesne.ham ?? 'nesne'}.${d.hedef.ham ?? d.hedef.ad}`);
        }
        if (this.kati && d.op === ':=' && d.hedef.tur === 'ad') {
          const r = this.bul(k, d.hedef.ad) as any;
          const tip: Tip = r && r.tur === 'sembol' && r.s.tur === 'degisken' ? r.s.tip ?? null : r && r.tur === 'alan' ? r.tip : null;
          const ham = d.hedef.ham ?? d.hedef.ad;
          if (tip) {
            const sabitListe = tip.k === 'temel' && !!tip.eleman && d.deger.tur === 'liste';   // öğeler tek tek bildirilir
            if (!sabitListe) this.uyDenetle(tip, this.tipK(d.deger, k), J(d.hedef.ad), ham);
            if (tip.k === 'temel' && tip.eleman && d.deger.tur === 'liste') for (const e of d.deger.elemanlar) this.ogeDenetle(this.genisAd(tip), e, k, `'${ham}'`, d.satir);
          }
        }
        const v = this.yeniAd('v');
        let kod = `const ${v} = ${this.ifade(d.deger, k)};`;
        let deger = v;
        let tip = this.ifadeTipi(d.deger, k);
        if (d.op !== ':=') {
          const op = ({ '+=': '+', '-=': '-', '*=': '*', '/=': '/' } as any)[d.op];
          const y = this.yeniAd('v');
          const th = this.ifadeTipi(d.hedef, k);
          kod += ` const ${y} = ${this.ikiliKod(op, this.ifade(d.hedef, k), th, v, tip)};`;
          tip = this.ikiliTip(op, th, tip);
          deger = y;
        }
        return `{ ${kod} ${this.ata(d.hedef, deger, k, tip)} }`;
      }
      case 'cagri_deyim': {
        const e = d.ifade;
        if (e.tur === 'ad') {
          const r = this.bul(k, e.ad);
          if (r && r.tur === 'sembol' && r.s.tur === 'fonk') return `${this.fonkJs(r.s, 0)}();`;
          if (r && r.tur === 'metod') return `this.m_${e.ad}();`;
          if (r && r.tur === 'yerlesik' && typeof r.v === 'function') return `Y.${e.ad}();`;
          return `$.cagirDeyim(${this.cagrilan(e, k)});`;
        }
        if (e.tur === 'alan' || e.tur === 'miras') return `$.cagirDeyim(${this.cagrilan(e, k)});`;
        return `${this.ifade(e, k)};`;
      }
      case 'eger': {
        let kod = `if (${this.kosulKod(d.kosul, k)}) {\n${this.deyim(d.o, k)}\n}`;
        if (d.degilse) kod += ` else {\n${this.deyim(d.degilse, k)}\n}`;
        return kod;
      }
      case 'iken': return `while (${this.kosulKod(d.kosul, k)}) {\n${this.donguGovde(d.govde, k)}\n}`;
      case 'tekrarla': {
        fk.dongu++;
        let g: string;
        try { g = this.deyimler(d.govde, k); } finally { fk.dongu--; }
        return `do {\n${g}\n} while (!(${this.kosulKod(d.kosul, k)}));`;
      }
      case 'kez': {
        const i = this.yeniAd('k'), n = this.yeniAd('n');
        return `for (let ${i} = 0, ${n} = Number($.kezSayisi(${this.ifade(d.sayi, k)})); ${i} < ${n}; ${i}++) {\n${this.donguGovde(d.govde, k)}\n}`;
      }
      case 'icin': {
        const b = this.yeniAd('b'), e = this.yeniAd('e'), s = this.yeniAd('s'), i = this.yeniAd('i');
        const adim = d.adim ? this.ifade(d.adim, k) : '1n';
        const pre = `const ${b} = ${this.ifade(d.bas, k)}, ${e} = ${this.ifade(d.bit, k)}, ${s} = ${adim}; $.icinKontrol(${b}, ${e}, ${s});`;
        this.donguDegiskeni(k, d.ad, d.ham);
        const ata = this.ata({ tur: 'ad', ad: d.ad, ham: d.ham, satir: d.satir }, i, k, 'tamsayi');
        const kos = d.yon < 0 ? `${i} >= ${e}; ${i} -= ${s}` : `${i} <= ${e}; ${i} += ${s}`;
        return `{ ${pre}\nfor (let ${i} = ${b}; ${kos}) {\n${ata}\n${this.donguGovde(d.govde, k)}\n} }`;
      }
      case 'her': {
        const kaynak = this.ifade(d.kaynak, k);
        this.donguDegiskeni(k, d.ad, d.ad);
        if (d.ad2 !== null) {
          this.donguDegiskeni(k, d.ad2, d.ad2);
          const x = this.yeniAd('x'), y = this.yeniAd('y');
          const a1 = this.ata({ tur: 'ad', ad: d.ad, ham: d.ad, satir: d.satir }, x, k);
          const a2 = this.ata({ tur: 'ad', ad: d.ad2, ham: d.ad2, satir: d.satir }, y, k);
          return `for (const [${x}, ${y}] of $.yineleCift(${kaynak})) {\n${a1} ${a2}\n${this.donguGovde(d.govde, k)}\n}`;
        }
        if (this.kati) {
          // döngü değişkeninin tipi, kaynağın öğe tipiyle uyuşmalı
          const kt = this.tipK(d.kaynak, k), ka = this.kapAyir(kt), r = this.bul(k, d.ad);
          const ot = ka && ka.kap === 'liste' ? ka.eleman : kt === 'metin' ? 'metin' : null;
          if (ot && r && r.tur === 'sembol' && r.s.tur === 'degisken') this.uyDenetle(r.s.tip ?? null, ot, J(d.ad), r.s.ham);
        }
        const o = this.yeniAd('o');
        const a = this.ata({ tur: 'ad', ad: d.ad, ham: d.ad, satir: d.satir }, o, k);
        return `for (const ${o} of $.yinele(${kaynak})) {\n${a}\n${this.donguGovde(d.govde, k)}\n}`;
      }
      case 'sec': {
        const v = this.yeniAd('v');
        const kollar: string[] = [];
        for (const [etiketler, deyim] of d.kollar) {
          const kos = etiketler.map(([a, b]: [Dugum, Dugum | null]) => b === null
            ? `$.esitMi(${v}, ${this.ifade(a, k)})`
            : `($.kucukEsit(${this.ifade(a, k)}, ${v}) && $.kucukEsit(${v}, ${this.ifade(b, k)}))`).join(' || ');
          kollar.push(`if (${kos}) {\n${this.deyim(deyim, k)}\n}`);
        }
        let kod = kollar.join(' else ');
        if (d.varsayilan) kod += (kollar.length ? ' else ' : '') + `{\n${this.deyimler(d.varsayilan, k)}\n}`;
        return `{ const ${v} = ${this.ifade(d.secici, k)};\n${kod} }`;
      }
      case 'dene': {
        let kod = `try {\n${this.deyimler(d.govde, k)}\n}`;
        if (d.yakala !== null) {
          const e = this.yeniAd('e');
          let atama = '';
          if (d.yakala_ad !== null) {
            let s = k.s.get(d.yakala_ad);
            if (!s || s.ithal) {
              s = { tur: 'degisken', js: this.yeniAd('v_' + d.yakala_ad), ham: d.yakala_ad, tip: null };
              k.s.set(d.yakala_ad, s);
              fk.hoist.push(s.js);
            }
            atama = `${s.js} = $.yakala(${e});`;
          } else atama = `$.yakala(${e});`;
          kod += ` catch (${e}) {\n${atama}\n${this.deyimler(d.yakala, k)}\n}`;
        }
        if (d.sonunda !== null) kod += ` finally {\n${this.deyimler(d.sonunda, k)}\n}`;
        if (d.yakala === null && d.sonunda === null) kod += ' finally {}';
        return kod;
      }
      case 'firlat': return `throw $.firlat(${this.ifade(d.ifade, k)});`;
      case 'don':
        if (this.kati && d.ifade && fk.sonuc) this.uyDenetle(fk.sonucTip, this.tipK(d.ifade, k), "'sonuç'");
        return this.donKod(fk, d.ifade ? this.ifade(d.ifade, k) : null, d.ifade ? this.ifadeTipi(d.ifade, k) : null);
      case 'kir': return fk.dongu ? 'break;' : `$.hata("'kır'/'devam' döngü dışında kullanıldı");`;
      case 'devam': return fk.dongu ? 'continue;' : `$.hata("'kır'/'devam' döngü dışında kullanıldı");`;
      case 'yerel_degisken': {
        let tip = d.tip ? this.tipCoz(d.tip, k) : null;
        if (this.kati && !d.tip) {
          const t = d.ilk ? this.tipK(d.ilk, k) : null;
          if (t) tip = this.adTip(t);
          else this.tani(`'${d.hamlar.join("', '")}' değişkeninin tipi ilk değerinden anlaşılamıyor; tipini belirtin (katı kip)`, d.satir);
        }
        const out: string[] = [];
        d.adlar.forEach((ad: string, i: number) => {
          const ham = d.hamlar[i];
          const v = d.ilk ? this.uyI(tip, d.ilk, k, J(ham)) : this.varsayilan(tip);
          const var_ = k.s.get(ad);
          if (var_ && !var_.ithal) { out.push(this.tanimliHata(ham)); return; }
          const js = this.yeniAd('v_' + ad);
          fk.hoist.push(js);
          k.s.set(ad, { tur: 'degisken', js, ham, tip });
          out.push(`${js} = ${v};`);
        });
        return out.join(' ');
      }
    }
    this.hata(`Bilinmeyen deyim: ${d.tur}`, d.satir);
  }

  donguDegiskeni(k: Kapsam, ad: string, ham: string) {
    if (this.bul(k, ad)) return;
    const js = this.yeniAd('v_' + ad);
    k.fk.hoist.push(js);
    k.s.set(ad, { tur: 'degisken', js, ham, tip: null });
  }

  /** hedef := v (v bir JS tanımlayıcısı) */
  ata(h: Dugum, v: string, k: Kapsam, vTip: string | null = null): string {
    if (h.tur === 'ad') {
      const r = this.bul(k, h.ad);
      if (r && r.tur === 'sembol') {
        const s = r.s;
        if (s.tur === 'sabit') return `$.hata(${J(`Sabite atama yapılamaz: '${h.ad}'`)});`;
        if (s.tur === 'tip') return '';
        if (s.tur === 'fonk' && s.fonk.hizli) return `${s.js} = ${v}; ${s.js}$h = (...$a) => ${s.js}(...$a);`;
        return `${s.js} = ${this.uyT(s.tip ?? null, v, vTip, J(h.ad), h.ham ?? h.ad)};`;
      }
      if (r && r.tur === 'alan') return `this.f_${h.ad} = ${this.uyT(r.tip, v, vTip, J(h.ad), h.ham ?? h.ad)};`;
      return `$.hata(${J(`Tanımsız değişken: '${h.ham || h.ad}' (önce 'değişken' ile tanımlayın)`)});`;
    }
    if (h.tur === 'alan') return `$.alanAta(${this.ifade(h.nesne, k)}, ${J(h.ad)}, ${v});`;
    if (h.tur === 'indeks') {
      const c = this.yeniAd('c'), i = this.yeniAd('i'), s = this.yeniAd('s');
      const metinYolu = this.atanabilir(h.nesne) ? `{ const ${s} = $.metinAta(${c}, ${i}, ${v}); ${this.ata(h.nesne, s, k)} }` : `$.hata('Geçersiz atama hedefi');`;
      return `{ const ${c} = ${this.ifade(h.nesne, k)}; const ${i} = [${h.indeksler.map((x: Dugum) => this.ifade(x, k)).join(', ')}]; if (typeof ${c} === 'string') ${metinYolu} else $.indeksAta(${c}, ${i}, ${v}); }`;
    }
    return `$.hata('Geçersiz atama hedefi');`;
  }
  atanabilir(n: Dugum) { return n.tur === 'ad' || n.tur === 'alan' || n.tur === 'indeks'; }


  // ============================================================ derleme anı tip çıkarımı
  // Yalnızca çalışma anında kesin olarak garanti edilen tipler çıkarılır (tipli değişken,
  // alan ve parametreler her atamada denetlenir). Bilinen tiplerde işleçler doğrudan JS
  // işleçlerine çevrilir; hata verebilecek işlemler (bölme, mod, üs) yardımcıda kalır.
  sabitTipi(n: Dugum | null): string | null {
    if (!n) return null;
    if (n.tur === 'tekli' && n.op === '-') { const t = this.sabitTipi(n.ifade); return t === 'tamsayi' || t === 'ondalik' ? t : null; }
    if (n.tur !== 'sabitdeger') return null;
    const v = n.deger;
    return typeof v === 'bigint' ? 'tamsayi' : typeof v === 'number' ? 'ondalik' : typeof v === 'string' ? 'metin' : typeof v === 'boolean' ? 'mantiksal' : null;
  }
  temelAd(t: Tip): string | null { return t && t.k === 'temel' ? t.ad : null; }
  ifadeTipi(n: Dugum, k: Kapsam): string | null {
    switch (n.tur) {
      case 'sabitdeger': return this.sabitTipi(n);
      case 'ad': {
        const r = this.bul(k, n.ad);
        if (!r) return null;
        if (r.tur === 'alan') return this.genisTip ? this.genisAd(r.tip) : this.temelAd(r.tip);
        if (r.tur !== 'sembol') return null;
        const s = r.s;
        if (s.tur === 'degisken') return this.genisTip ? this.genisAd(s.tip ?? null) : this.temelAd(s.tip ?? null);
        if (s.tur === 'sabit') return this.temelAd(s.tip ?? null) ?? s.cTip ?? null;
        if (s.tur === 'fonk' && s.fonk.oto) return (this.genisTip ? s.fonk.gdonus : null) ?? s.fonk.donus ?? null;
        if (this.genisTip && s.tur === 'yerel' && typeof s.deger === 'function' && s.deger.$oto) return s.ydonus ?? null;
        return null;
      }
      case 'kendi': return this.genisTip && k.fk.sinif ? this.sinifAd(k.fk.sinif) : null;
      case 'alan': {
        if (!this.genisTip) return null;
        if (n.nesne.tur === 'ad') {              // Birim.Üye (parantezsiz çağrılan işlev)
          const r = this.bul(k, n.nesne.ad);
          if (r && r.tur === 'sembol' && r.s.tur === 'birim' && r.s.birimSembolleri) {
            const s = r.s.birimSembolleri.get(n.ad);
            if (s && s.tur === 'yerel' && typeof s.deger === 'function' && s.deger.$oto) return s.ydonus ?? null;
            if (s && s.tur === 'fonk' && s.fonk.oto) return s.fonk.gdonus ?? s.fonk.donus ?? null;
            return null;
          }
        }
        const t0 = this.tanilar.length;        // tip sorgusu tanı üretmez
        const u = this.uyeBul(n, k);
        this.tanilar.length = t0;
        if (!u) return null;
        if (u.kurucu) return this.sinifAd(u.sinif);
        if (u.alan) return this.genisAd(this.alanTipi(u.alan, n.ad));
        return u.metod && u.metod.nparam === 0 ? this.metodDonus(u.metod, u.sinif) : null;
      }
      case 'indeks': {
        if (!this.genisTip || n.indeksler.length !== 1) return null;
        const t = this.ifadeTipi(n.nesne, k);
        const a = this.kapAyir(t);
        return a ? a.eleman : t === 'metin' ? 'metin' : null;
      }
      case 'liste': {
        if (!this.genisTip) return null;
        let ortak: string | null = null;
        for (const e of n.elemanlar) {
          const t = this.ifadeTipi(e, k);
          if (t === null) return 'liste';
          if (ortak === null || ortak === t) ortak = t;
          else if ((ortak === 'tamsayi' && t === 'ondalik') || (ortak === 'ondalik' && t === 'tamsayi')) ortak = 'ondalik';
          else return 'liste';
        }
        return ortak ? `liste<${ortak}>` : 'liste';
      }
      case 'sozluk': return this.genisTip ? 'sozluk' : null;
      case 'cagri': {
        const c = n.cagrilan;
        if (c.tur === 'ad') {
          const r = this.bul(k, c.ad);
          if (r && r.tur === 'sembol' && r.s.tur === 'fonk') return (this.genisTip ? r.s.fonk.gdonus : null) ?? r.s.fonk.donus ?? null;
          if (this.genisTip && r && (r as any).tur === 'yerlesik' && typeof (r as any).v === 'function') return Uretici.YERLESIK_DONUS[c.ad] ?? null;
          if (this.genisTip && r && (r as any).tur === 'metod' && k.fk.sinif) return this.metodDonus((r as any).m, k.fk.sinif);
          if (this.genisTip && r && r.tur === 'sembol' && r.s.tur === 'yerel' && typeof r.s.deger === 'function') return r.s.ydonus ?? null;
        }
        if (this.genisTip && c.tur === 'alan') {
          const t0 = this.tanilar.length;
          const u = this.uyeBul(c, k);
          this.tanilar.length = t0;
          if (u && u.kurucu) return this.sinifAd(u.sinif);
          if (u && u.metod) return this.metodDonus(u.metod, u.sinif);
          if (u) return null;
        }
        if (c.tur === 'alan' && c.nesne.tur === 'ad') {
          const r = this.bul(k, c.nesne.ad);
          if (r && r.tur === 'sembol' && r.s.tur === 'birim' && r.s.birimSembolleri) {
            const s = r.s.birimSembolleri.get(c.ad);
            if (s && s.tur === 'fonk') return (this.genisTip ? s.fonk.gdonus : null) ?? s.fonk.donus ?? null;
            if (this.genisTip && s && s.tur === 'yerel' && typeof s.deger === 'function') return s.ydonus ?? null;
          }
        }
        return null;
      }
      case 'ikili': {
        const a = this.ifadeTipi(n.sol, k), b = this.ifadeTipi(n.sag, k);
        const t = this.ikiliTip(n.op, a, b);
        if (t !== null || !this.genisTip || a === null || b === null || n.op !== '+') return t;
        // geniş: metin + sayı → metin; liste + liste → liste
        const basit = (x: string) => ['tamsayi', 'ondalik', 'metin', 'karakter', 'mantiksal'].includes(x);
        if (basit(a) && basit(b) && (this.metinTip(a) || this.metinTip(b))) return 'metin';
        const ka = this.kapAyir(a), kb = this.kapAyir(b);
        if ((ka ? ka.kap : a) === 'liste' && (kb ? kb.kap : b) === 'liste') return a === b ? a : 'liste';
        return null;
      }
      case 'tekli': {
        const t = this.ifadeTipi(n.ifade, k);
        if (n.op === '-') return t === 'tamsayi' || t === 'ondalik' ? t : null;
        if (n.op === 'degil') return t === 'mantiksal' || t === 'tamsayi' ? t : null;
        return t;
      }
      case 'mantik': {
        const a = this.ifadeTipi(n.sol, k);
        if (a === 'mantiksal') return 'mantiksal';   // sağ taraf mantıksal değilse hata verilir
        if (a === 'tamsayi' && this.ifadeTipi(n.sag, k) === 'tamsayi') return 'tamsayi';
        return null;
      }
      case 'kosullu': {
        const a = this.ifadeTipi(n.a, k), b = this.ifadeTipi(n.b, k);
        return a !== null && a === b ? a : null;
      }
    }
    return null;
  }
  sayiTip(t: string | null) { return t === 'tamsayi' || t === 'ondalik'; }
  metinTip(t: string | null) { return t === 'metin' || t === 'karakter'; }
  ikiliTip(op: string, a: string | null, b: string | null): string | null {
    const sayi = this.sayiTip(a) && this.sayiTip(b);
    switch (op) {
      case '+': if (this.metinTip(a) && this.metinTip(b)) return 'metin';
      // falls through
      case '-': case '*':
        return sayi ? (a === 'tamsayi' && b === 'tamsayi' ? 'tamsayi' : 'ondalik') : null;
      case '/': return sayi ? 'ondalik' : null;
      case 'bol': case 'mod': return a === 'tamsayi' && b === 'tamsayi' ? 'tamsayi' : null;
      case '<': case '>': case '<=': case '>=':
        return sayi || (this.metinTip(a) && this.metinTip(b)) ? 'mantiksal' : null;
      case '=': case '<>':
        return a !== null && b !== null ? 'mantiksal' : null;
      case 'icinde': return 'mantiksal';
    }
    return null;
  }
  /** a op b; ta/tb derleme anı tipleri */
  ikiliKod(op: string, a: string, ta: string | null, b: string, tb: string | null): string {
    if (this.sayiTip(ta) && this.sayiTip(tb)) {
      const ayni = ta === tb;
      if (op === '+' || op === '-' || op === '*') {
        const A = !ayni && ta === 'tamsayi' ? `Number(${a})` : a;
        const B = !ayni && tb === 'tamsayi' ? `Number(${b})` : b;
        return `(${A} ${op} ${B})`;
      }
      if (op === '<' || op === '>' || op === '<=' || op === '>=') return `(${a} ${op} ${b})`;
      if (op === '=') return `(${a} ${ayni ? '===' : '=='} ${b})`;
      if (op === '<>') return `(${a} ${ayni ? '!==' : '!='} ${b})`;
    } else if (this.metinTip(ta) && this.metinTip(tb)) {
      if (op === '+' || op === '<' || op === '>' || op === '<=' || op === '>=') return `(${a} ${op} ${b})`;
      if (op === '=') return `(${a} === ${b})`;
      if (op === '<>') return `(${a} !== ${b})`;
    } else if (ta === 'mantiksal' && tb === 'mantiksal') {
      if (op === '=') return `(${a} === ${b})`;
      if (op === '<>') return `(${a} !== ${b})`;
    }
    return `$.${OPS[op]}(${a}, ${b})`;
  }
  /** Koşul ifadesi: tipi mantıksal olduğu biliniyorsa denetim atlanır */
  kosulKod(n: Dugum, k: Kapsam): string {
    const v = this.ifade(n, k);
    const t = this.ifadeTipi(n, k);
    if (this.kati) { const g = this.tipK(n, k); if (g !== null && g !== 'mantiksal') this.tani(`Koşul mantıksal olmalı, ${this.tipYazi(g)} verildi`, n.satir ?? this.deyimSatiri); }
    return t === 'mantiksal' ? v : `$.kosul(${v})`;
  }
  /** uy(), değerin derleme anı tipi hedefle aynıysa denetimsiz */
  uyDenetle(tip: Tip, vTip: string | null, ad: string, gorunen?: string) {
    if (!this.kati || vTip === null) return;
    const u = this.uyumsuz(tip, vTip);
    if (!u) return;
    let g = gorunen ?? ad;
    if (gorunen === undefined) { try { g = JSON.parse(ad); } catch { /* JS ifadesi */ } }
    if (g === "'sonuç'") this.tani(`Dönüş değeri ${u} olmalı; ${this.tipYazi(vTip)} verildi`);
    else this.tani(`'${g}' ${u} tipinde; ${this.tipYazi(vTip)} bir değer atanamaz`);
  }
  uyT(tip: Tip, v: string, vTip: string | null, ad: string, gorunen?: string): string {
    this.uyDenetle(tip, vTip, ad, gorunen);
    if (tip && tip.k === 'temel' && vTip !== null) {
      if (tip.ad === vTip) return v;
      if (tip.ad === 'ondalik' && vTip === 'tamsayi') return `Number(${v})`;
    }
    return this.uy(tip, v, ad);
  }
  /** İfadeyi derle ve tipe uydur */
  uyI(tip: Tip, n: Dugum, k: Kapsam, ad: string): string {
    if (this.kati) {
      const sabitListe = !!tip && tip.k === 'temel' && !!tip.eleman && n.tur === 'liste';
      if (!sabitListe) this.uyDenetle(tip, this.tipK(n, k), ad);
      // liste sabitinin öğeleri tek tek: [1, 2, 'üç'] → tamsayı listesi
      if (tip && tip.k === 'temel' && tip.eleman && n.tur === 'liste') for (const e of n.elemanlar) this.ogeDenetle(this.genisAd(tip), e, k, `${(() => { try { return `'${JSON.parse(ad)}'`; } catch { return ad; } })()}`, e.satir ?? n.satir);
    }
    return this.uyT(tip, this.ifade(n, k), tip && tip.k === 'temel' ? this.ifadeTipi(n, k) : null, ad);
  }

  // ============================================================ ifadeler
  ifade(n: Dugum, k: Kapsam): string {
    switch (n.tur) {
      case 'sabitdeger': return this.sabit(n.deger);
      case 'ad': return this.adDeger(n, k);
      case 'alan':
        if (this.kati) this.uyeBul(n, k);
        return `$.al(${this.ifade(n.nesne, k)}, ${J(n.ad)}, ${J(n.ham)})`;
      case 'indeks': {
        const c = this.ifade(n.nesne, k);
        if (n.indeksler.length === 1) return `$.indeks(${c}, ${this.ifade(n.indeksler[0], k)})`;
        return `$.indeksN(${c}, [${n.indeksler.map((x: Dugum) => this.ifade(x, k)).join(', ')}])`;
      }
      case 'cagri': return this.cagri(n, k);
      case 'ikili': {
        const ta = this.ifadeTipi(n.sol, k), tb = this.ifadeTipi(n.sag, k);
        if (this.kati) {
          const ga = this.tipK(n.sol, k), gb = this.tipK(n.sag, k);
          if (ga !== null && gb !== null && !this.ikiliGecerli(n.op, ga, gb))
            this.tani(`'${n.op === 'bol' ? 'böl' : n.op}' işlemi ${this.tipYazi(ga)} ve ${this.tipYazi(gb)} için tanımlı değil`, n.satir ?? this.deyimSatiri);
        }
        return this.ikiliKod(n.op, this.ifade(n.sol, k), ta, this.ifade(n.sag, k), tb);
      }
      case 'tekli': {
        const v = this.ifade(n.ifade, k);
        const t = this.ifadeTipi(n.ifade, k);
        if (n.op === 'degil') return t === 'mantiksal' ? `(!${v})` : t === 'tamsayi' ? `(~${v})` : `$.degil(${v})`;
        if (n.op === '-') {
          if (this.sayiTip(t)) return `(-${v})`;
          return `$.neg(${v})`;
        }
        return v;
      }
      case 'mantik': {
        const ta = this.ifadeTipi(n.sol, k), tb = this.ifadeTipi(n.sag, k);
        const a = this.ifade(n.sol, k), b = this.ifade(n.sag, k);
        if (ta === 'mantiksal' && tb === 'mantiksal') {
          if (n.op === 've') return `(${a} && ${b})`;
          if (n.op === 'veya') return `(${a} || ${b})`;
          if (n.op === 'yada') return `(${a} !== ${b})`;
        }
        return `$.${n.op}(${a}, () => ${b})`;
      }
      case 'kendi': return k.fk.sinif || this.metodIcinde(k) ? 'this' : `$.hata("'kendi' yalnızca metodlar içinde kullanılabilir")`;
      case 'miras': return this.miras(n, k, 'deger', []);
      case 'lambda': {
        const f = this.fonkKod(n, k, 'lambda', null, null, '<lambda>');
        return `$.fn(${f}, '<lambda>', ${n.params.length}, 0, ${J(this.refler(n.params))}, false)`;
      }
      case 'liste': return `[${n.elemanlar.map((e: Dugum) => this.ifade(e, k)).join(', ')}]`;
      case 'sozluk': return `$.sozluk([${n.ciftler.map(([a, b]: Dugum[]) => `[${this.ifade(a, k)}, ${this.ifade(b, k)}]`).join(', ')}])`;
      case 'aralik_liste': return `$.aralikListe(${this.ifade(n.alt, k)}, ${this.ifade(n.ust, k)})`;
      case 'boru': {
        const v = this.ifade(n.sol, k);
        const sag = n.sag;
        if (sag.tur === 'cagri') {
          const f = this.cagrilan(sag.cagrilan, k);
          return `$.cagir(${f}, [${[v, ...sag.argumanlar.map((a: Dugum) => this.ifade(a, k))].join(', ')}])`;
        }
        return `$.cagir(${this.cagrilan(sag, k)}, [${v}])`;
      }
      case 'bicim': {
        const args = [this.ifade(n.ifade, k), this.ifade(n.genislik, k)];
        if (n.hassasiyet) args.push(this.ifade(n.hassasiyet, k));
        return `$.bicim(${args.join(', ')})`;
      }
      case 'ref': return this.cagrilan(n.ifade, k);
      case 'kosullu': return `(${this.kosulKod(n.kosul, k)} ? ${this.ifade(n.a, k)} : ${this.ifade(n.b, k)})`;
    }
    this.hata(`Bilinmeyen ifade: ${n.tur}`, n.satir);
  }

  /** Doğrudan çağrıda kullanılacak JS adı: argüman sayısı tam uyuyorsa hızlı sürüm */
  fonkJs(s: Sembol, nargs: number): string {
    return s.fonk && s.fonk.hizli && s.fonk.np === nargs ? s.js + '$h' : s.js;
  }

  metodIcinde(k: Kapsam): boolean {
    for (let c: Kapsam | null = k; c; c = c.ust) if (c.sinif) return true;
    return false;
  }
  metodBaglami(k: Kapsam): FonkBaglam | null {
    for (let c: Kapsam | null = k; c; c = c.ust) if (c.fk.sinif) return c.fk;
    return null;
  }

  sabit(v: any): string {
    if (typeof v === 'bigint') return `${v}n`;
    if (typeof v === 'number') {
      if (Number.isNaN(v)) return 'NaN';
      if (!Number.isFinite(v)) return v > 0 ? 'Infinity' : '-Infinity';
      const s = String(v);
      return /^-?\d+$/.test(s) && Number.isInteger(v) ? s : s;
    }
    if (typeof v === 'string') return J(v);
    if (v === null) return 'null';
    return String(v);
  }

  adDeger(n: Dugum, k: Kapsam): string {
    const r = this.bul(k, n.ad);
    if (!r) return this.tanimsiz(n);
    switch (r.tur) {
      case 'sembol': {
        const s = r.s;
        switch (s.tur) {
          case 'degisken': case 'sabit': return s.tip ? s.js : `$.oto(${s.js})`;
          case 'fonk': return s.fonk.oto ? `${this.fonkJs(s, 0)}()` : s.js;
          case 'sinif': case 'birim': return s.js;
          case 'tip': return 'null';
          case 'yerel': {
            const v = s.deger;
            if (typeof v === 'function') return v.$oto ? `${s.js}()` : s.js;
            return s.js;
          }
        }
        return `$.oto(${s.js})`;
      }
      case 'alan': return r.tip ? `this.f_${n.ad}` : `$.oto(this.f_${n.ad})`;
      case 'metod': return `$.otoM(this, 'm_${n.ad}')`;
      case 'yerlesik': {
        const v = r.v;
        if (typeof v === 'function') return v.$oto ? `Y.${n.ad}()` : `Y.${n.ad}`;
        return `Y.${n.ad}`;
      }
    }
  }

  /** Çağrılacak değer (otomatik çağrı yapılmadan) */
  cagrilan(n: Dugum, k: Kapsam): string {
    if (n.tur === 'ad') {
      const r = this.bul(k, n.ad);
      if (!r) return this.tanimsiz(n);
      if (r.tur === 'sembol') return r.s.tur === 'tip' ? 'null' : r.s.js;
      if (r.tur === 'alan') return `this.f_${n.ad}`;
      if (r.tur === 'metod') return `$.bagla(this, 'm_${n.ad}')`;
      return `Y.${n.ad}`;
    }
    if (n.tur === 'alan') return `$.alC(${this.ifade(n.nesne, k)}, ${J(n.ad)}, ${J(n.ham)})`;
    if (n.tur === 'miras') return this.miras(n, k, 'cagrilan', []);
    return this.ifade(n, k);
  }

  argumanlar(args: Dugum[], refs: number[], k: Kapsam): string {
    return args.map((a, i) => refs.includes(i) ? this.refKod(a, k) : this.ifade(a, k)).join(', ');
  }
  /** Dinamik çağrı: atanabilir argümanlar referans olarak hazırlanır */
  dinamikArgumanlar(args: Dugum[], k: Kapsam): string {
    return args.map(a => this.atanabilir(a) ? this.refKod(a, k) : this.ifade(a, k)).join(', ');
  }
  refKod(a: Dugum, k: Kapsam): string {
    const v = this.yeniAd('v');
    if (a.tur === 'ad') {
      const r = this.bul(k, a.ad);
      let al: string;
      if (!r) al = this.tanimsiz(a);
      else if (r.tur === 'sembol') al = r.s.tur === 'tip' ? 'null' : r.s.js;
      else if (r.tur === 'alan') al = `this.f_${a.ad}`;
      else if (r.tur === 'metod') al = `$.bagla(this, 'm_${a.ad}')`;
      else al = `Y.${a.ad}`;
      return `$.ref(() => ${al}, (${v}) => { ${this.ata(a, v, k)} })`;
    }
    if (a.tur === 'alan') {
      const o = this.yeniAd('o');
      return `((${o}) => $.ref(() => $.alC(${o}, ${J(a.ad)}, ${J(a.ham)}), (${v}) => $.alanAta(${o}, ${J(a.ad)}, ${v})))(${this.ifade(a.nesne, k)})`;
    }
    if (a.tur === 'indeks') {
      const c = this.yeniAd('c'), i = this.yeniAd('i');
      return `((${c}, ${i}) => $.ref(() => $.indeksN(${c}, ${i}), (${v}) => { if (typeof ${c} === 'string') { ${this.ata(a, v, k)} } else $.indeksAta(${c}, ${i}, ${v}); }))(${this.ifade(a.nesne, k)}, [${a.indeksler.map((x: Dugum) => this.ifade(x, k)).join(', ')}])`;
    }
    return '$.refYok()';
  }

  cagri(n: Dugum, k: Kapsam): string {
    const c = n.cagrilan, args: Dugum[] = n.argumanlar;
    if (this.kati) {
      // liste.Ekle(öğe) ve Ekle(liste, öğe): öğe tipi bildirilmiş listeye uymayan öğe
      if (c.tur === 'alan' && c.ad === 'ekle' && args.length === 1) this.ogeDenetle(this.tipK(c.nesne, k), args[0], k, `'${c.nesne.ham ?? 'liste'}'`, n.satir);
      if (c.tur === 'alan') { const u = this.uyeBul(c, k); if (u && u.metod) this.metodArgDenetle(u.metod, `${u.sinif.ham}.${c.ham ?? c.ad}`, args, k, n.satir); }
      else if (c.tur === 'ad') { const r = this.bul(k, c.ad) as any; if (r && r.tur === 'metod') this.metodArgDenetle(r.m, c.ham ?? c.ad, args, k, n.satir); }
      // Ekle/Sil/Araya: sınırları bildirilmiş (sabit boyutlu) bir diziye uygulanamaz
      if (c.tur === 'ad' && (c.ad === 'ekle' || c.ad === 'sil' || c.ad === 'araya') && args.length >= 1 && args[0].tur === 'ad') {
        const f = this.bul(k, c.ad) as any, r = this.bul(k, args[0].ad) as any;
        if (f && f.tur === 'yerlesik' && r && r.tur === 'sembol' && r.s.tip && r.s.tip.k === 'dizi')
          this.tani(`'${r.s.ham}' sabit boyutlu bir dizidir; ${c.ham ?? c.ad} ile öğe eklenemez ya da silinemez (liste kullanın)`, n.satir);
      }
      if (c.tur === 'ad' && c.ad === 'ekle' && args.length === 2) { const r = this.bul(k, 'ekle'); if (r && (r as any).tur === 'yerlesik') this.ogeDenetle(this.tipK(args[0], k), args[1], k, `'${args[0].ham ?? 'liste'}'`, n.satir); }
    }
    if (c.tur === 'ad') {
      const r = this.bul(k, c.ad);
      if (r && r.tur === 'sembol' && r.s.tur === 'fonk') { this.argDenetle(r.s, args, k, n.satir); return `${this.fonkJs(r.s, args.length)}(${this.argumanlar(args, r.s.fonk.refs, k)})`; }
      if (r && r.tur === 'metod') return `this.m_${c.ad}(${this.argumanlar(args, r.m.refs, k)})`;
      if (r && r.tur === 'yerlesik' && typeof r.v === 'function') this.yerelArgDenetle(r.v, c.ham ?? c.ad, args, n.satir);
      if (r && r.tur === 'yerlesik' && typeof r.v === 'function') return `Y.${c.ad}(${this.argumanlar(args, r.v.$ref || [], k)})`;
      if (r && r.tur === 'sembol' && r.s.tur === 'yerel' && typeof r.s.deger === 'function') this.yerelArgDenetle(r.s.deger, c.ham ?? c.ad, args, n.satir);
      if (r && r.tur === 'sembol' && r.s.tur === 'yerel' && typeof r.s.deger === 'function')
        return `${r.s.js}(${this.argumanlar(args, r.s.deger.$ref || [], k)})`;
      const f = this.cagrilan(c, k);
      if (this.refAdlari.has(c.ad) && args.some(a => this.atanabilir(a))) return `$.cagirR(${f}, [${this.dinamikArgumanlar(args, k)}])`;
      return `$.cagir(${f}, [${this.argumanlar(args, [], k)}])`;
    }
    if (c.tur === 'alan') {
      // Birim üyesi derleme anında biliniyorsa doğrudan çağır
      if (c.nesne.tur === 'ad') {
        const r = this.bul(k, c.nesne.ad);
        if (r && r.tur === 'sembol' && r.s.tur === 'birim' && r.s.birimSembolleri) {
          const s = r.s.birimSembolleri.get(c.ad);
          if (s && s.tur === 'fonk') this.argDenetle(s, args, k, n.satir);
          if (s && s.tur === 'fonk') return `${r.s.js}.v_${c.ad}${s.fonk.hizli && s.fonk.np === args.length ? '$h' : ''}(${this.argumanlar(args, s.fonk.refs, k)})`;
          if (s && s.tur === 'yerel' && typeof s.deger === 'function') this.yerelArgDenetle(s.deger, c.ham ?? c.ad, args, n.satir);
          if (s && s.tur === 'yerel' && typeof s.deger === 'function') return `${r.s.js}.v_${c.ad}(${this.argumanlar(args, s.deger.$ref || [], k)})`;
        }
      }
      const o = this.ifade(c.nesne, k);
      if (this.refAdlari.has(c.ad) && args.some(a => this.atanabilir(a)))
        return `$.cUR(${o}, ${J(c.ad)}, ${J(c.ham)}, [${this.dinamikArgumanlar(args, k)}])`;
      return `$.cU(${o}, ${J(c.ad)}, ${J(c.ham)}, [${this.argumanlar(args, [], k)}])`;
    }
    if (c.tur === 'miras') return this.miras(c, k, 'cagri', args);
    return `$.cagir(${this.ifade(c, k)}, [${this.argumanlar(args, [], k)}])`;
  }

  /** miras: kip = deger (oto) | cagrilan | cagri */
  miras(n: Dugum, k: Kapsam, kip: string, args: Dugum[]): string {
    const fk = this.metodBaglami(k);
    if (!fk) return `$.hata("'miras' yalnızca metodlar içinde kullanılabilir")`;
    const ad = n.ad ?? fk.metodAd;
    const s = fk.sinif;
    const var_ = s.ebeveyn ? this.metodBul(s.ebeveyn, ad) : null;
    const argKod = this.argumanlar(args, var_ ? var_.refs : [], k);
    if (!var_) {
      if (kip === 'cagri') return args.length ? `(${argKod}, null)` : 'null';
      if (kip === 'cagrilan') return `$.fn(() => null, 'miras', 0, 0, [], true)`;
      return 'null';
    }
    const m = `${s.ebeveynJs}.prototype.m_${ad}`;
    if (n.ad !== null) {
      if (kip === 'cagri') return `${m}.call(this, ${argKod})`;
      if (kip === 'cagrilan') return `$.baglaF(this, ${m})`;
      return `$.otoP(this, ${m})`;
    }
    if (kip === 'cagri' && args.length) return `${m}.call(this, ${argKod})`;
    if (kip === 'cagrilan') return `$.fn((...a) => ${m}.apply(this, a.length ? a : ${fk.argAd}), 'miras', 0, 0, [], true)`;
    return `${m}.apply(this, ${fk.argAd})`;
  }
}

export function derle(kaynak: string, dosya: string, sec: DerlemeSecenekleri): string {
  return new Uretici(sec).programDerle(kaynak, dosya);
}
