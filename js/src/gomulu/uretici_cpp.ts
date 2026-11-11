// Yöntem → C++17 kod üretici (gömülü arka uç).
// Statik tipli alt küme: her değişkenin tipi derleme anında bilinir. Desteklenmeyen
// özellikler (herhangi, sözlük, tipsiz lambda parametresi...) açık bir hata verir.
import { coz, Dugum } from '../cozumleyici';
import { katla } from '../sozcuk';
import { YontemHatasi } from '../hatalar';
import {
  Tip, SinifC, MetodC, TAM, OND, METIN, MANT, YOK, BOS, TENSOR, HATA, liste, sayiMi, tipAdi, cppTip, ayni, turevMi,
  coz as tc, yeniDeg, sayisalIsaretle, TipDeg,
} from './tipler';

export interface GomuluSecenekleri {
  birimBul(ad: string, ham: string, kimden: string): { yol: string; kaynak: string } | null;
  aranan?: string[];
}
export interface GomuluCikti { kod: string; donanim: boolean; yz: boolean; uyarilar: string[] }

type E = { c: string; t: Tip; lv?: boolean };
interface ParamC { ad: string; ham: string; tip: Tip; ref: boolean; varsayilan: Dugum | null }
interface FonkC { ham: string; params: ParamC[]; donus: Tip; cpp: string; ic?: boolean }
interface Sem {
  tur: 'degisken' | 'sabit' | 'fonk' | 'sinif' | 'tip' | 'birim' | 'yerel';
  cpp: string; ham: string;
  tip?: Tip; fonk?: FonkC; sinif?: SinifC; tipDeger?: Tip;
  yerel?: { birim: string; ad: string };
  uyeler?: Map<string, Sem>; disa?: Set<string> | null;
  ithal?: boolean; sahip?: FonkB; evrensel?: boolean;
}
interface FonkB {
  tur: string; sonuc: boolean; sonucTip: Tip; sinif: SinifC | null; metod: MetodC | null;
  dongu: number; onTanim: string[]; ust: FonkB | null; yakalama: 'ref' | 'deger' | 'yok';
}
class Kapsam {
  s = new Map<string, Sem>();
  constructor(public ust: Kapsam | null, public fk: FonkB, public sinif: SinifC | null = null) {}
}
interface Modul {
  anahtar: string; ham: string; ns: string; dosya: string;
  sinifOn: string[]; siniflar: string[]; globaller: string[]; prototipler: string[]; govdeler: string[];
  yukle: string[]; bagimlilik: string[];
  semboller: Map<string, Sem>; disa: Set<string> | null;
}

const J = (s: any) => JSON.stringify(s);
/** C++ metin sabiti (UTF-8 baytları olduğu gibi) */
function cMetin(s: string): string {
  let r = '"';
  for (const ch of s) {
    const k = ch.codePointAt(0);
    if (ch === '"') r += '\\"';
    else if (ch === '\\') r += '\\\\';
    else if (ch === '\n') r += '\\n';
    else if (ch === '\r') r += '\\r';
    else if (ch === '\t') r += '\\t';
    else if (k < 0x20 || k === 0x7f) r += '\\x' + k.toString(16).padStart(2, '0') + '""';
    else if (ch === '?') r += '\\?';
    else r += ch;
  }
  return `y::Metin(${r}")`;
}
function ondLit(v: number): string {
  if (Number.isNaN(v)) return 'NAN';
  if (!Number.isFinite(v)) return v > 0 ? 'INFINITY' : '(-INFINITY)';
  let s = String(v);
  if (!/[.eE]/.test(s)) s += '.0';
  return `y::Ond(${s})`;
}

// ---------------------------------------------------------------- yerleşik birim adları
const YEREL_BIRIM: Record<string, string[]> = {
  matematik: ['sin', 'cos', 'tan', 'arksin', 'arkcos', 'arktan', 'ln', 'log10', 'log2', 'ustel', 'taban', 'tavan', 'tanh', 'sigmoid',
    'faktoriyel', 'kok', 'mutlak', 'yuvarla', 'maks', 'min', 'rastgele', 'pi', 'e', 'sonsuz', 'us', 'arktan2', 'ebob', 'normal', 'tohum'],
  yz: ['tensor', 'sifirlar', 'birler', 'rastgeletensor', 'tohum', 'relu', 'sigmoid', 'tanh', 'softmaks', 'ustel', 'log', 'matcarp', 'argmaks'],
  donanim: ['pinkipi', 'pinyaz', 'pinoku', 'analogoku', 'pwmyaz', 'bekle', 'beklemikro', 'milisaniye', 'mikrosaniye',
    'kesmebagla', 'kesmecoz', 'zamanlayicikur', 'zamanlayicitek', 'zamanlayicidurdur', 'seribaslat', 'serivarmi', 'seribaytoku',
    'seribaytyaz', 'i2cbaslat', 'i2cyaz', 'i2coku', 'i2cyazoku', 'spibaslat', 'spiaktar',
    'giris', 'cikis', 'girisyukari', 'girisasagi', 'yukselen', 'dusen', 'degisen', 'yuksek', 'dusuk', 'yerlesikled', 'benzetim'],
};
const BIRIM_HAM: Record<string, string> = { matematik: 'Matematik', yz: 'YZ', donanim: 'Donanım' };
const GENEL = new Set(['yaz', 'oku', 'tamsayi', 'tamsayiya', 'ondalik', 'ondaliga', 'metin', 'metne', 'mantiksal', 'uzunluk', 'ekle', 'sil',
  'araya', 'aralik', 'esle', 'suz', 'indirge', 'sirala', 'ters', 'toplam', 'maks', 'min', 'dilim', 'kopya', 'icerir', 'altmetin',
  'kopyala', 'konum', 'buyukharf', 'kucukharf', 'ayir', 'birlestir', 'kirp', 'degistir', 'bicimle', 'sira', 'karakter', 'harfmi',
  'rakammi', 'mutlak', 'kare', 'kok', 'yuvarla', 'kes', 'rastgele', 'rastgelelestir', 'artir', 'azalt', 'degis', 'hata', 'iddia',
  'durdur', 'tur', 'ornegimi', 'pi', 'liste', 'anahtarlar', 'degerler', 'say', 'benzersiz']);

export class CppUretici {
  sayac = 0;
  dosya = '<girdi>';
  dosyalar: string[] = [];
  L(satir: number) {
    let no = this.dosyalar.indexOf(this.dosya);
    if (no < 0) { no = this.dosyalar.length; this.dosyalar.push(this.dosya); }
    return no * 1000000 + satir;
  }
  moduller: Modul[] = [];
  birimler = new Map<string, Sem>();
  derleniyor = new Set<string>();
  donanim = false;
  yz = false;
  uyarilar: string[] = [];
  sinifNo = 0;
  m: Modul;

  constructor(private sec: GomuluSecenekleri) {}

  hata(m: string, n?: { satir?: number } | null): never {
    throw new YontemHatasi(`Gömülü derleme: ${m}`, n && n.satir ? n.satir : null, this.dosya);
  }
  yeni(on: string) { return `${on}${++this.sayac}`; }

  // ============================================================ giriş
  programDerle(kaynak: string, dosya: string): GomuluCikti {
    this.dosya = dosya;
    const agac = coz(kaynak, dosya);
    if (agac.tur === 'birim') this.hata("Birim dosyası doğrudan derlenemez; 'kullan' ile bir programdan yükleyin", { satir: 1 });
    const m = this.yeniModul('program', agac.ad ?? 'Program', 'P', dosya);
    const fk = this.yeniBaglam('program', null, null, null, 'yok');
    const k = new Kapsam(null, fk);
    this.kullanDerle(agac.kullan, k, m);
    this.kaydet(agac.bildirimler, k, m, true);
    for (const b of agac.bildirimler) this.bildirim(b, k, m, true);
    const govde = this.deyimler(agac.govde.deyimler, k);
    m.yukle.push(...fk.onTanim, govde);
    this.moduller.push(m);
    return { kod: this.birlestir(m), donanim: this.donanim, yz: this.yz, uyarilar: this.uyarilar };
  }

  yeniModul(anahtar: string, ham: string, ns: string, dosya: string): Modul {
    return { anahtar, ham, ns, dosya, sinifOn: [], siniflar: [], globaller: [], prototipler: [], govdeler: [], yukle: [], bagimlilik: [], semboller: new Map(), disa: null };
  }
  yeniBaglam(tur: string, sinif: SinifC | null, metod: MetodC | null, ust: FonkB | null, yakalama: 'ref' | 'deger' | 'yok'): FonkB {
    return { tur, sonuc: false, sonucTip: YOK, sinif, metod, dongu: 0, onTanim: [], ust, yakalama };
  }

  birlestir(ana: Modul): string {
    const out: string[] = [];
    out.push('// Yöntem derleyicisiyle üretildi — elle düzenlemeyin.');
    out.push('#pragma GCC optimize("wrapv")');
    out.push('#include "yontem.hpp"');
    if (this.yz) out.push('#include "yontem_yz.hpp"');
    out.push('#include "yontem_donanim.hpp"');
    out.push('');
    for (const m of this.moduller) {
      out.push(`namespace ${m.ns} {`);
      out.push(...m.sinifOn, ...m.siniflar, ...m.globaller, ...m.prototipler, ...m.govdeler);
      const yukleAd = m === ana ? 'y_ana' : 'yukle';
      out.push(`void ${yukleAd}() {`);
      if (m !== ana) out.push('  static bool yuklendi = false; if (yuklendi) return; yuklendi = true;');
      for (const b of m.bagimlilik) out.push(`  ${b}::yukle();`);
      out.push(...m.yukle);
      out.push('}');
      out.push(`}  // namespace ${m.ns}`, '');
    }
    out.push(`static const char* const y_dosyalar[] = {${this.dosyalar.map(d => J(d)).join(', ')}};`);
    out.push('#ifdef ARDUINO');
    out.push('void setup() { y::dosya_adlari = y_dosyalar; y::hal_baslat(); y::hal_bitti(y::calistir(P::y_ana)); }');
    out.push('void loop() { delay(1000); }');
    out.push('#else');
    out.push('int main() { y::dosya_adlari = y_dosyalar; y::hal_baslat(); return y::calistir(P::y_ana); }');
    out.push('#endif');
    return this.tipleriYerlestir(out.join('\n') + '\n');
  }

  /** Çıkarılan tipleri yer tutuculara yerleştirir; çözülemeyen sayısal değişkenler ondalık olur */
  tipleriYerlestir(kod: string): string {
    for (const t of this.degiskenler) {
      const c = tc(t);
      if (c.k === 'deg') {
        if (c.r.sayisal) c.r.t = OND;
        else { this.dosya = (c.r as any).dosya ?? this.dosya; this.hata(`${c.r.aciklama} çıkarılamadı; tipini açıkça yazın (ör. 'tamsayı dizisi')`); }
      }
    }
    for (let tur = 0; tur < 10 && /@@[TV]\d+@@/.test(kod); tur++) {
      kod = kod.replace(/@@([TV])(\d+)@@/g, (_, tv, id) => {
        const t = this.degiskenler.find(x => (x as any).r.id === Number(id))!;
        return tv === 'T' ? cppTip(tc(t)) : this.varsayilan(tc(t));
      });
    }
    return kod;
  }

  // ============================================================ birimler
  kullanDerle(lst: [string, number][], k: Kapsam, m: Modul) {
    for (const [ham, satir] of lst) {
      const anahtar = katla(ham);
      const s = this.birimYukle(ham, anahtar, satir);
      if (s.tur === 'birim' && !s.yerel && !m.bagimlilik.includes(s.cpp)) m.bagimlilik.push(s.cpp);
      for (const [ad, u] of s.uyeler!) {
        if (s.disa && !s.disa.has(ad)) continue;
        k.s.set(ad, { ...u, ithal: true });
      }
      k.s.set(anahtar, { ...s, ithal: true });
    }
  }
  birimYukle(ham: string, anahtar: string, satir: number): Sem {
    const hazir = this.birimler.get(anahtar);
    if (hazir) return hazir;
    if (YEREL_BIRIM[anahtar]) {
      if (anahtar === 'yz') this.yz = true;
      if (anahtar === 'donanim') this.donanim = true;
      const uyeler = new Map<string, Sem>();
      for (const ad of YEREL_BIRIM[anahtar]) uyeler.set(ad, { tur: 'yerel', cpp: '', ham: ad, yerel: { birim: anahtar, ad } });
      const s: Sem = { tur: 'birim', cpp: '', ham: BIRIM_HAM[anahtar], uyeler, disa: null, yerel: { birim: anahtar, ad: '' } };
      this.birimler.set(anahtar, s);
      return s;
    }
    if (anahtar === 'kuantum' || anahtar === 'veri' || anahtar === 'sistem')
      this.hata(`'${ham}' birimi gömülü sürümde yok (yalnızca Matematik, YZ ve Donanım)`, { satir });
    if (this.derleniyor.has(anahtar)) this.hata(`Döngüsel birim kullanımı: '${ham}'`, { satir });
    const bulunan = this.sec.birimBul(anahtar, ham, this.dosya);
    if (!bulunan && ['pencere', 'ui', 'mobil', 'mobile'].includes(katla(ham)))
      throw new YontemHatasi(`'${ham}' birimi gömülü arka uçta yok; arayüz ve mobil programları 'yontem paketle' ile web ya da telefon uygulamasına çevrilir`, satir, this.dosya);
    if (!bulunan && ['guvenlik', 'security', 'takvim', 'calendar', 'desen', 'regex', 'ag', 'net', 'http', 'veritabani', 'vt', 'database', 'db', 'sunucu', 'server', 'web'].includes(katla(ham)))
      this.hata(`'${ham}' birimi gömülü arka uçta henüz yok; JavaScript ya da Python çalışma zamanında kullanın`, { satir });
    if (!bulunan) throw new YontemHatasi(`Birim bulunamadı: '${ham}'${this.sec.aranan ? ` (aranan: ${this.sec.aranan.join(', ')})` : ''}`, satir, this.dosya);
    this.derleniyor.add(anahtar);
    const eski = this.dosya;
    try { return this.birimDerle(bulunan.kaynak, bulunan.yol, anahtar); }
    finally { this.derleniyor.delete(anahtar); this.dosya = eski; }
  }
  birimDerle(kaynak: string, yol: string, anahtar: string): Sem {
    this.dosya = yol;
    const agac = coz(kaynak, yol);
    if (agac.tur !== 'birim') this.hata(`'${yol}' bir birim değil`);
    const ns = 'U_' + anahtar;
    const m = this.yeniModul(anahtar, agac.ad, ns, yol);
    const fk = this.yeniBaglam('birim', null, null, null, 'yok');
    const k = new Kapsam(null, fk);
    this.kullanDerle(agac.kullan, k, m);
    let disa: Set<string> | null = null;
    let bild: Dugum[] = [];
    if (agac.arayuz !== null) {
      disa = new Set();
      for (const b of agac.arayuz) {
        if (b.tur === 'degisken') b.adlar.forEach((a: string) => disa.add(a));
        else if (b.tur === 'altprogram' && b.sinif_adi) continue;
        else disa.add(b.ad);
      }
      bild = agac.arayuz.filter((b: Dugum) => b.tur !== 'altprogram');
    }
    bild = bild.concat(agac.uygulama);
    const arayuzAlt = agac.arayuz ? agac.arayuz.filter((b: Dugum) => b.tur === 'altprogram' && !b.sinif_adi) : [];
    this.kaydet(arayuzAlt.concat(bild), k, m, true);
    for (const b of bild) this.bildirim(b, k, m, true);
    const bas = this.deyimler(agac.baslangic, k);
    m.yukle.push(...fk.onTanim, bas);
    this.moduller.push(m);
    const uyeler = new Map<string, Sem>();
    for (const [ad, s] of k.s) {
      if (s.ithal) continue;
      uyeler.set(ad, { ...s, cpp: s.tur === 'tip' ? s.cpp : `${ns}::${s.cpp}` });
    }
    const s: Sem = { tur: 'birim', cpp: ns, ham: agac.ad, uyeler, disa };
    this.birimler.set(anahtar, s);
    return s;
  }

  // ============================================================ ad çözümleme
  bul(k: Kapsam, ad: string): { tur: 'sem'; s: Sem } | { tur: 'alan'; ad: string; tip: Tip; s: SinifC } | { tur: 'metod'; m: MetodC } | { tur: 'genel' } | null {
    for (let c: Kapsam | null = k; c; c = c.ust) {
      if (c.sinif) {
        for (let s: SinifC | null = c.sinif; s; s = s.ebeveyn) {
          const a = s.alanlar.get(ad);
          if (a) return { tur: 'alan', ad, tip: a.tip, s };
        }
        const m = this.metodBul(c.sinif, ad);
        if (m) return { tur: 'metod', m };
        continue;
      }
      const s = c.s.get(ad);
      if (s) return { tur: 'sem', s };
    }
    if (GENEL.has(ad)) return { tur: 'genel' };
    return null;
  }
  metodBul(s: SinifC | null, ad: string): MetodC | null {
    for (; s; s = s.ebeveyn) { const m = s.metodlar.get(ad); if (m) return m; }
    return null;
  }

  // ============================================================ tipler
  tipCoz(n: Dugum | null, k: Kapsam, ad = ''): Tip {
    if (!n) this.hata(`'${ad}' için tip belirtin (gömülü sürümde her değişkenin tipi olmalı)`);
    if (n.tur === 'tip_dizi') {
      const e = n.eleman ? this.tipCoz(n.eleman, k, ad) : this.yeniDegisken(`'${ad}' listesinin öğe tipi`);
      if (n.alt === null) return liste(e);
      return { k: 'dizi', e, alt: this.donustur(this.ifade(n.alt, k), TAM, 'dizi sınırı', n), ust: this.donustur(this.ifade(n.ust, k), TAM, 'dizi sınırı', n) };
    }
    if (n.modul === null) {
      switch (n.ad) {
        case 'tamsayi': return TAM;
        case 'ondalik': case 'gercek': return OND;
        case 'metin': case 'karakter': return METIN;
        case 'mantiksal': return MANT;
        case 'tensor': return TENSOR;
        case 'liste': return liste(this.yeniDegisken(`'${ad}' listesinin öğe tipi`));
        case 'sozluk': return { k: 'sozluk', a: this.yeniDegisken(`'${ad}' sözlüğünün anahtar tipi`), d: this.yeniDegisken(`'${ad}' sözlüğünün değer tipi`) };
        case 'herhangi': case 'nesne': case 'islev': return this.yeniDegisken(`'${ad}' değişkeninin tipi`);
      }
    }
    let s: Sem | null = null;
    if (n.modul !== null) {
      const b = this.bul(k, n.modul);
      if (b && b.tur === 'sem' && b.s.tur === 'birim') s = b.s.uyeler!.get(n.ad) ?? null;
    } else {
      const b = this.bul(k, n.ad);
      if (b && b.tur === 'sem') s = b.s;
    }
    if (s && s.tur === 'sinif') return { k: 'sinif', s: s.sinif! };
    if (s && s.tur === 'tip') return s.tipDeger!;
    this.hata(`Bilinmeyen tip: '${n.ham}'`, n);
  }
  degiskenler: Tip[] = [];
  yeniDegisken(aciklama: string): Tip { const t = yeniDeg(aciklama); this.degiskenler.push(t); (t as any).r.dosya = this.dosya; return t; }
  varsayilan(t: Tip): string {
    t = tc(t);
    switch (t.k) {
      case 'deg': return `@@V${t.r.id}@@`;
      case 'sozluk': return `${cppTip(t)}()`;
      case 'tam': return '0';
      case 'ond': return 'y::Ond(0)';
      case 'metin': return 'y::Metin()';
      case 'mant': return 'false';
      case 'liste': return `${cppTip(t)}()`;
      case 'dizi': return `${cppTip(t)}(${t.alt}, ${t.ust}, [](){ return ${this.varsayilan(t.e)}; })`;
      case 'sinif': return t.s.kayit ? `${t.s.cpp}()` : 'nullptr';
      case 'tensor': return 'y::Tensor()';
      case 'hata': return 'y::HataN()';
      case 'fonk': return 'nullptr';
    }
    return '{}';
  }
  /** e değerini hedef tipe uydurur; olanaksızsa derleme hatası */
  donustur(e: E, hedef: Tip, ad: string, n?: any): string {
    const t = tc(e.t);
    hedef = tc(hedef);
    if (t.k === 'liste' && hedef.k === 'liste' && tc(t.e).k === 'tam' && tc(hedef.e).k === 'ond') return `y::liste_cevir<y::Tam, y::Ond>(${e.c})`;
    if (hedef.k === 'deg' && t.k === 'bos') this.hata(`'${ad}' için tip çıkarılamadı`, n);
    if (ayni(t, hedef)) return e.c;
    if (hedef.k === 'ond' && t.k === 'tam') return `y::Ond(${e.c})`;
    if (hedef.k === 'sinif' && !hedef.s.kayit && t.k === 'bos') return 'nullptr';
    if (hedef.k === 'sinif' && t.k === 'sinif' && turevMi(t.s, hedef.s) && !hedef.s.kayit) return `${cppTip(hedef)}(${e.c})`;
    if (hedef.k === 'fonk' && t.k === 'fonk') return e.c;
    if (hedef.k === 'fonk' && t.k === 'bos') return 'nullptr';
    if (hedef.k === 'tensor' && t.k === 'bos') return 'y::Tensor()';
    if (hedef.k === 'yok') return e.c;
    this.hata(`'${ad}' için tip uyuşmazlığı: ${tipAdi(hedef)} bekleniyordu, ${tipAdi(t)} verildi`, n);
  }

  // ============================================================ bildirimler
  kaydet(lst: Dugum[], k: Kapsam, m: Modul, evrensel: boolean) {
    // sınıflar
    for (const b of lst) {
      if (b.tur !== 'tipdef' || (b.tanim.tur !== 'sinif' && b.tanim.tur !== 'kayit')) continue;
      if (!evrensel) this.hata('Sınıflar yalnızca program ya da birim düzeyinde tanımlanabilir', b);
      const t = b.tanim;
      let eb: SinifC | null = null;
      if (t.ebeveyn) {
        const r = this.bul(k, t.ebeveyn);
        if (!r || r.tur !== 'sem' || r.s.tur !== 'sinif') this.hata(`Ebeveyn '${t.ebeveyn}' bir sınıf değil`, b);
        eb = r.s.sinif!;
        if (eb.kayit) this.hata('Kayıtlardan türetilemez', b);
      }
      const s: SinifC = { ad: b.ad, ham: b.ham, cpp: `${m.ns}::C_${b.ad}`, kayit: t.tur === 'kayit', ebeveyn: eb, alanlar: new Map(), alanSira: [], metodlar: new Map() };
      (s as any).dugum = b; (s as any).kapsam = k; (s as any).yerel = `C_${b.ad}`; (s as any).no = ++this.sinifNo; (s as any).ns = m.ns;
      k.s.set(b.ad, { tur: 'sinif', cpp: s.cpp, ham: b.ham, sinif: s, evrensel: true });
    }
    // tip takma adları
    for (const b of lst) {
      if (b.tur === 'tipdef' && b.tanim.tur !== 'sinif' && b.tanim.tur !== 'kayit')
        k.s.set(b.ad, { tur: 'tip', cpp: '', ham: b.ham, tipDeger: this.tipCoz(b.tanim, k, b.ham) });
    }
    // sınıf alanları ve metodları (tipler artık çözülebilir)
    for (const b of lst) {
      if (b.tur !== 'tipdef' || (b.tanim.tur !== 'sinif' && b.tanim.tur !== 'kayit')) continue;
      const s = k.s.get(b.ad)!.sinif!;
      for (const [ad, ham, tip, ilk] of b.tanim.alanlar) {
        s.alanlar.set(ad, { ham, tip: this.tipCoz(tip, k, ham), ilk });
        s.alanSira.push(ad);
      }
      for (const md of b.tanim.metodlar) this.metodKaydet(s, md, k);
    }
    for (const b of lst) {
      if (b.tur === 'sabit') {
        const tip = b.tip ? this.tipCoz(b.tip, k, b.ham) : this.ifade(b.ifade, k).t;
        k.s.set(b.ad, { tur: 'sabit', cpp: 'v_' + b.ad, ham: b.ham, tip, evrensel, sahip: k.fk });
      } else if (b.tur === 'degisken') {
        const tip = this.tipCoz(b.tip, k, b.hamlar[0]);
        b.adlar.forEach((ad: string, i: number) => k.s.set(ad, { tur: 'degisken', cpp: 'v_' + ad, ham: b.hamlar[i], tip, evrensel, sahip: k.fk }));
      } else if (b.tur === 'altprogram') {
        if (b.sinif_adi) {
          const r = this.bul(k, b.sinif_adi);
          if (!r || r.tur !== 'sem' || r.s.tur !== 'sinif') this.hata(`'${b.sinif_adi}' bir sınıf değil`, b);
          this.metodKaydet(r.s.sinif!, b, k);
        } else {
          const f = this.fonkBilgi(b, k, evrensel ? 'v_' + b.ad : 'v_' + b.ad);
          if (!evrensel) f.ic = true;
          const once = k.s.get(b.ad);
          if (!once || once.ithal || once.tur === 'fonk') k.s.set(b.ad, { tur: 'fonk', cpp: f.cpp, ham: b.ham, fonk: f, evrensel, sahip: k.fk });
        }
      }
    }
  }
  fonkBilgi(b: Dugum, k: Kapsam, cpp: string): FonkC {
    const params: ParamC[] = b.params.map((p: Dugum) => ({ ad: p.ad, ham: p.ham, tip: this.tipCoz(p.tip, k, p.ham), ref: p.ref, varsayilan: p.varsayilan }));
    let donus: Tip = YOK;
    if (b.donus) donus = this.tipCoz(b.donus, k, 'sonuç');
    else if (b.cesit === 'fonksiyon') this.hata(`'${b.ham}' fonksiyonunun dönüş tipini belirtin`, b);
    return { ham: b.ham, params, donus, cpp };
  }
  metodKaydet(s: SinifC, b: Dugum, k: Kapsam) {
    const f = this.fonkBilgi(b, k, 'm_' + b.ad);
    const var_ = s.metodlar.get(b.ad);
    if (var_ && var_.govdeli && b.govde === null) return;
    const m: MetodC = { ad: b.ad, ham: b.ham, params: f.params, donus: f.donus, kurucu: b.cesit === 'kurucu', sinif: s, govdeli: b.govde !== null };
    (m as any).dugum = b; (m as any).soyut = b.direktifler.includes('soyut');
    s.metodlar.set(b.ad, m);
  }

  bildirim(b: Dugum, k: Kapsam, m: Modul, evrensel: boolean) {
    const L = `y::satir = ${this.L(b.satir)};`;
    switch (b.tur) {
      case 'sabit': case 'degisken': {
        const adlar: string[] = b.tur === 'sabit' ? [b.ad] : b.adlar;
        const hamlar: string[] = b.tur === 'sabit' ? [b.ham] : b.hamlar;
        const ilk: Dugum | null = b.tur === 'sabit' ? b.ifade : b.ilk;
        adlar.forEach((ad, i) => {
          const s = k.s.get(ad)!;
          const tip = s.tip!;
          const deger = ilk ? this.donustur(this.ifade(ilk, k, tip), tip, hamlar[i], b) : this.varsayilan(tip);
          if (evrensel) {
            m.globaller.push(`${cppTip(tip)} ${s.cpp}${tip.k === 'dizi' ? '' : ' = ' + (tip.k === 'tam' || tip.k === 'mant' || tip.k === 'ond' ? this.varsayilan(tip) : `${cppTip(tip)}()`)};`);
            m.yukle.push(`  ${L} ${s.cpp} = ${deger};`);
          } else k.fk.onTanim.push(`  ${L} ${cppTip(tip)} ${s.cpp} = ${deger};`);
        });
        return;
      }
      case 'tipdef':
        if (b.tanim.tur === 'sinif' || b.tanim.tur === 'kayit') this.sinifKod(k.s.get(b.ad)!.sinif!, k, m);
        return;
      case 'altprogram': {
        if (b.sinif_adi) return;   // metod gövdeleri sinifKod içinde üretilir
        if (b.govde === null) return;
        const s = k.s.get(b.ad)!;
        if (evrensel) {
          const f = s.fonk!;
          const imza = (vs: boolean) => `${cppTip(f.donus)} ${f.cpp}(${f.params.map(p => this.paramKod(p, vs, k)).join(', ')})`;
          m.prototipler.push(imza(true) + ';');
          m.govdeler.push(`${imza(false)} {\n${this.govdeKod(b, k, b.cesit, null, null, f.params, f.donus)}\n}`);
        } else {
          const f = s.fonk!;
          if (f.params.some(p => p.varsayilan)) this.hata('İç içe alt programlarda varsayılan parametre desteklenmiyor', b);
          const ft: Tip = { k: 'fonk', p: f.params.map(p => p.tip), d: f.donus, ref: f.params.map(p => p.ref) };
          k.fk.onTanim.push(`  ${cppTip(ft)} ${f.cpp};`);
          k.fk.onTanim.push(`  ${f.cpp} = [&](${f.params.map(p => this.paramKod(p, false, k)).join(', ')}) -> ${cppTip(f.donus)} {\n${this.govdeKod(b, k, b.cesit, null, null, f.params, f.donus, 'ref')}\n  };`);
        }
        return;
      }
    }
  }
  paramKod(p: ParamC, varsayilanla: boolean, k: Kapsam): string {
    let s = `${cppTip(p.tip)}${p.ref ? '&' : (p.tip.k === 'metin' || p.tip.k === 'liste' || p.tip.k === 'tensor' ? '' : '')} v_${p.ad}`;
    if (varsayilanla && p.varsayilan) s += ' = ' + this.donustur(this.ifade(p.varsayilan, k, p.tip), p.tip, p.ham, p.varsayilan);
    return s;
  }

  sinifKod(s: SinifC, k: Kapsam, m: Modul) {
    const no = (s as any).no;
    const kayit = s.kayit;
    const Y = (s as any).yerel as string;
    m.sinifOn.push(`struct ${Y};`);
    const uyeler: string[] = [];
    for (const ad of s.alanSira) {
      const a = s.alanlar.get(ad)!;
      uyeler.push(`  ${cppTip(a.tip)} f_${ad}${a.tip.k === 'dizi' ? '' : ' = ' + (kayit || a.tip.k === 'tam' || a.tip.k === 'ond' || a.tip.k === 'mant' ? this.varsayilan(a.tip) : `${cppTip(a.tip)}()`)};`);
    }
    const ust = s.ebeveyn ? s.ebeveyn.cpp : 'y::Nesne';
    const govdeler: string[] = [];
    // alan ilk değerleri
    const ilkler: string[] = [];
    for (const ad of s.alanSira) {
      const a = s.alanlar.get(ad)!;
      if (a.ilk) ilkler.push(`  f_${ad} = ${this.donustur(this.ifade(a.ilk, k, a.tip), a.tip, a.ham, a.ilk)};`);
      else if (a.tip.k === 'dizi') ilkler.push(`  f_${ad} = ${this.varsayilan(a.tip)};`);
    }
    if (kayit) {
      uyeler.push(`  ${Y}();`);
      govdeler.push(`${Y}::${Y}() {\n${ilkler.join('\n')}\n}`);
    } else {
      uyeler.push('  void ilkle() override;');
      govdeler.push(`void ${Y}::ilkle() {\n  ${ust}::ilkle();\n${ilkler.join('\n')}\n}`);
      uyeler.push(`  virtual bool turu_mu_(int n) ${s.ebeveyn ? 'override ' : ''}{ return n == ${no}${s.ebeveyn ? ` || ${s.ebeveyn.cpp}::turu_mu_(n)` : ''}; }`);
      uyeler.push(`  virtual y::Metin tur_() ${s.ebeveyn ? 'override ' : ''}{ return ${cMetin(s.ham)}; }`);
    }
    // metne_
    const mc = this.metodBul(s, 'metnecevir');
    let metneG: string;
    if (mc && mc.params.length === 0 && mc.donus.k !== 'yok') metneG = `return y::metne(this->m_metnecevir());`;
    else {
      const tum: [string, Tip][] = [];
      const zincir: SinifC[] = [];
      for (let c: SinifC | null = s; c; c = c.ebeveyn) zincir.unshift(c);
      for (const c of zincir) for (const ad of c.alanSira) tum.push([ad, c.alanlar.get(ad)!.tip]);
      const parca = tum.map(([ad], i) => `${i ? '", " + ' : ''}y::Metin("${ad}: ") + y::temsil(f_${ad})`).join(' + ');
      metneG = `return y::Metin(${J(s.ham)}) + "(" + ${parca || 'y::Metin()'} + ")";`;
    }
    uyeler.push(`  y::Metin metne_()${kayit ? '' : ' override'};`);
    govdeler.push(`y::Metin ${Y}::metne_() { ${metneG} }`);
    // alanlarla oluşturma
    const tumAlan: [string, Tip][] = [];
    { const z: SinifC[] = []; for (let c: SinifC | null = s; c; c = c.ebeveyn) z.unshift(c); for (const c of z) for (const ad of c.alanSira) tumAlan.push([ad, c.alanlar.get(ad)!.tip]); }
    const dondur = kayit ? s.cpp : `y::Ref<${s.cpp}>`;
    uyeler.push(`  static ${dondur} alanlarla(${tumAlan.map(([ad, t]) => `${cppTip(t)} a_${ad} = ${this.varsayilan(t)}`).join(', ')});`);
    govdeler.push(`${dondur} ${Y}::alanlarla(${tumAlan.map(([ad, t]) => `${cppTip(t)} a_${ad}`).join(', ')}) {\n  ${kayit ? `${s.cpp} o;` : `auto o = y::olustur0<${s.cpp}>();`}\n${tumAlan.map(([ad]) => `  o${kayit ? '.' : '->'}f_${ad} = a_${ad};`).join('\n')}\n  return o;\n}`);
    // metodlar
    for (const [ad, md] of s.metodlar) {
      const imza = (vs: boolean, nit: string) => `${cppTip(md.donus)} ${nit}m_${ad}(${md.params.map(p => this.paramKod(p, vs, k)).join(', ')})`;
      const ust_ = s.ebeveyn && !md.kurucu ? this.metodBul(s.ebeveyn, ad) : null;
      if (ust_ && (ust_.params.length !== md.params.length || !ust_.params.every((p, i) => ayni(p.tip, md.params[i].tip) && p.ref === md.params[i].ref) || !ayni(ust_.donus, md.donus)))
        this.hata(`'${s.ham}.${md.ham}' ebeveyndeki metodla aynı parametre ve dönüş tiplerine sahip olmalı`, (md as any).dugum);
      uyeler.push(`  ${kayit || md.kurucu ? '' : 'virtual '}${imza(true, '')};`);
      const d = (md as any).dugum as Dugum;
      if (d.govde === null) {
        const mesaj = (md as any).soyut ? `Soyut metod çağrılamaz: '${md.ham}'` : `'${md.ham}' metodunun gövdesi tanımlanmamış`;
        govdeler.push(`${imza(false, Y + '::')} { y::hata(${cMetin(mesaj)}); }`);
      } else {
        govdeler.push(`${imza(false, Y + '::')} {\n${this.govdeKod(d, (s as any).kapsam, d.cesit, s, md, md.params, md.donus)}\n}`);
      }
    }
    m.siniflar.push(`struct ${Y}${kayit ? '' : ` : public ${ust}`} {\n${uyeler.join('\n')}\n};`);
    m.govdeler.push(...govdeler);
  }

  /** Fonksiyon/metod gövdesi (C++ deyimleri) */
  govdeKod(n: Dugum, kapanis: Kapsam, tur: string, sinif: SinifC | null, metod: MetodC | null, params: ParamC[], donus: Tip, yakalama: 'ref' | 'deger' | 'yok' = 'yok'): string {
    const fk = this.yeniBaglam(tur, sinif ?? kapanis.fk.sinif, metod ?? kapanis.fk.metod, kapanis.fk, yakalama);
    const ust = sinif ? new Kapsam(kapanis, kapanis.fk, sinif) : kapanis;
    const k = new Kapsam(ust, fk);
    for (const p of params) k.s.set(p.ad, { tur: 'degisken', cpp: 'v_' + p.ad, ham: p.ham, tip: p.tip, sahip: fk });
    const out: string[] = [];
    if (donus.k !== 'yok' || tur === 'fonksiyon' || tur === 'lambda') {
      if (donus.k === 'yok') this.hata('Fonksiyonun dönüş tipini belirtin', n);
      fk.sonuc = true; fk.sonucTip = donus;
      out.push(`  ${cppTip(donus)} v_sonuc = ${this.varsayilan(donus)};`);
      k.s.set('sonuc', { tur: 'degisken', cpp: 'v_sonuc', ham: 'sonuç', tip: donus, sahip: fk });
    }
    let govde: string;
    if (n.ifade) {
      govde = `  return ${this.donustur(this.ifade(n.ifade, k, fk.sonucTip), fk.sonucTip, 'sonuç', n)};`;
    } else {
      this.kaydet(n.yerel, k, this.m ?? this.moduller[0], false);
      for (const b of n.yerel) this.bildirim(b, k, null as any, false);
      govde = this.deyimler(n.govde.deyimler, k);
      if (fk.sonuc) govde += '\n  return v_sonuc;';
    }
    out.push(...fk.onTanim, govde);
    return out.join('\n');
  }

  // ============================================================ deyimler
  deyimler(lst: Dugum[], k: Kapsam): string { return lst.map(d => this.deyim(d, k)).filter(x => x).join('\n'); }
  deyim(d: Dugum, k: Kapsam): string {
    if (d.tur === 'blok') return `{\n${this.deyimler(d.deyimler, k)}\n}`;
    if (d.tur === 'bos') return '';
    try { return `y::satir = ${this.L(d.satir)}; ${this.deyimIc(d, k)}`; }
    catch (e: any) { if (e instanceof YontemHatasi && e.satir === null) e.satir = d.satir; throw e; }
  }
  govdeDongu(d: Dugum, k: Kapsam) { k.fk.dongu++; try { return this.deyim(d, k); } finally { k.fk.dongu--; } }

  deyimIc(d: Dugum, k: Kapsam): string {
    const fk = k.fk;
    switch (d.tur) {
      case 'atama': {
        const h = this.ifade(d.hedef, k);
        let deger: E = this.ifade(d.deger, k, h.t);
        if (d.op !== ':=') deger = this.ikiliTip(({ '+=': '+', '-=': '-', '*=': '*', '/=': '/' } as any)[d.op], h, deger, d);
        return this.ata(d.hedef, deger, k, d) + ';';
      }
      case 'cagri_deyim': {
        const e = d.ifade;
        if (e.tur === 'cagri' || e.tur === 'boru') return this.ifade(e, k, undefined, true).c + ';';
        const r = this.ifade(e, k, undefined, true);
        if (r.t.k === 'fonk') return `${r.c}();`;
        if (/\(\)$|\)$/.test(r.c) || r.t.k === 'yok') return r.c + ';';
        this.hata('Bu ifade deyim olarak kullanılamaz (çağrılabilir değil)', d);
      }
      case 'eger': {
        let s = `if (${this.kosul(d.kosul, k)}) {\n${this.deyim(d.o, k)}\n}`;
        if (d.degilse) s += ` else {\n${this.deyim(d.degilse, k)}\n}`;
        return s;
      }
      case 'iken': return `while (${this.kosul(d.kosul, k)}) {\n${this.govdeDongu(d.govde, k)}\n}`;
      case 'tekrarla': {
        fk.dongu++;
        let g: string;
        try { g = this.deyimler(d.govde, k); } finally { fk.dongu--; }
        return `do {\n${g}\n} while (!(${this.kosul(d.kosul, k)}));`;
      }
      case 'kez': {
        const n = this.donustur(this.ifade(d.sayi, k), TAM, "'kez tekrarla'", d);
        const i = this.yeni('k'), s = this.yeni('n');
        return `for (y::Tam ${i} = 0, ${s} = ${n}; ${i} < ${s}; ${i}++) {\n${this.govdeDongu(d.govde, k)}\n}`;
      }
      case 'icin': {
        const b = this.yeni('b'), e = this.yeni('e'), s = this.yeni('s'), i = this.yeni('i');
        const bas = this.donustur(this.ifade(d.bas, k), TAM, 'döngü başlangıcı', d);
        const bit = this.donustur(this.ifade(d.bit, k), TAM, 'döngü bitişi', d);
        const adim = d.adim ? this.donustur(this.ifade(d.adim, k), TAM, 'adım', d) : '1';
        this.donguDegiskeni(k, d.ad, d.ham, TAM);
        const ata = this.ata({ tur: 'ad', ad: d.ad, ham: d.ham, satir: d.satir }, { c: i, t: TAM }, k, d);
        const kos = d.yon < 0 ? `${i} >= ${e}; ${i} -= ${s}` : `${i} <= ${e}; ${i} += ${s}`;
        return `{ const y::Tam ${b} = ${bas}, ${e} = ${bit}, ${s} = std::abs((y::Tam)(${adim})); if (${s} == 0) y::hata("'için' döngüsünde adım sıfır olamaz");\nfor (y::Tam ${i} = ${b}; ${kos}) {\n${ata};\n${this.govdeDongu(d.govde, k)}\n} }`;
      }
      case 'her': {
        const kay = this.ifade(d.kaynak, k);
        let et: Tip;
        if (kay.t.k === 'sozluk') {
          const o = this.yeni('o'), idx = this.yeni('i');
          this.donguDegiskeni(k, d.ad, d.ad, kay.t.a);
          if (d.ad2 !== null) this.donguDegiskeni(k, d.ad2, d.ad2, kay.t.d);
          const a1 = this.ata({ tur: 'ad', ad: d.ad, ham: d.ad, satir: d.satir }, { c: `${o}[${idx}].first`, t: kay.t.a }, k, d);
          const a2 = d.ad2 !== null ? this.ata({ tur: 'ad', ad: d.ad2, ham: d.ad2, satir: d.satir }, { c: `${o}[${idx}].second`, t: kay.t.d }, k, d) + ';' : '';
          return `{ auto ${o} = *(${kay.c}).p;\nfor (size_t ${idx} = 0; ${idx} < ${o}.size(); ${idx}++) {\n${a1}; ${a2}\n${this.govdeDongu(d.govde, k)}\n} }`;
        }
        if (kay.t.k === 'liste' || kay.t.k === 'dizi') et = kay.t.e;
        else if (kay.t.k === 'metin') et = METIN;
        else this.hata(`${tipAdi(kay.t)} üzerinde yinelenemez`, d);
        const o = this.yeni('o'), idx = this.yeni('i');
        if (d.ad2 !== null) {
          this.donguDegiskeni(k, d.ad, d.ad, TAM);
          this.donguDegiskeni(k, d.ad2, d.ad2, et);
          const a1 = this.ata({ tur: 'ad', ad: d.ad, ham: d.ad, satir: d.satir }, { c: `(y::Tam)${idx}`, t: TAM }, k, d);
          const a2 = this.ata({ tur: 'ad', ad: d.ad2, ham: d.ad2, satir: d.satir }, { c: `${o}[${idx}]`, t: et }, k, d);
          return `{ auto ${o} = y::yinele(${kay.c});\nfor (size_t ${idx} = 0; ${idx} < ${o}.size(); ${idx}++) {\n${a1}; ${a2};\n${this.govdeDongu(d.govde, k)}\n} }`;
        }
        this.donguDegiskeni(k, d.ad, d.ad, et);
        const a = this.ata({ tur: 'ad', ad: d.ad, ham: d.ad, satir: d.satir }, { c: idx, t: et }, k, d);
        return `for (auto ${idx} : y::yinele(${kay.c})) {\n${a};\n${this.govdeDongu(d.govde, k)}\n}`;
      }
      case 'sec': {
        const sec = this.ifade(d.secici, k);
        const v = this.yeni('v');
        const kollar: string[] = [];
        for (const [etiketler, deyim] of d.kollar) {
          const kos = etiketler.map(([a, b]: [Dugum, Dugum | null]) => {
            const ae = this.ifade(a, k, sec.t);
            if (b === null) return this.ikiliTip('=', { c: v, t: sec.t }, ae, d).c;
            const be = this.ifade(b, k, sec.t);
            return `(${this.ikiliTip('<=', ae, { c: v, t: sec.t }, d).c} && ${this.ikiliTip('<=', { c: v, t: sec.t }, be, d).c})`;
          }).join(' || ');
          kollar.push(`if (${kos}) {\n${this.deyim(deyim, k)}\n}`);
        }
        let s = kollar.join(' else ');
        if (d.varsayilan) s += (kollar.length ? ' else ' : '') + `{\n${this.deyimler(d.varsayilan, k)}\n}`;
        return `{ const auto ${v} = ${sec.c};\n${s} }`;
      }
      case 'dene': {
        let s = '{ ';
        if (d.sonunda !== null) s += `auto ${this.yeni('son')} = y::sonunda([&]() {\n${this.deyimler(d.sonunda, k)}\n});\n`;
        s += `try {\n${this.deyimler(d.govde, k)}\n}`;
        if (d.yakala !== null) {
          const e = this.yeni('e');
          let atama = '';
          if (d.yakala_ad !== null) {
            let sm = k.s.get(d.yakala_ad);
            if (!sm || sm.ithal) {
              sm = { tur: 'degisken', cpp: this.yeni('v_' + d.yakala_ad + '_'), ham: d.yakala_ad, tip: HATA, sahip: fk };
              k.s.set(d.yakala_ad, sm);
              fk.onTanim.push(`  y::HataN ${sm.cpp};`);
            }
            if (sm.tip!.k !== 'hata') this.hata(`'${d.yakala_ad}' yakala değişkeni olarak kullanılamaz (tipi ${tipAdi(sm.tip!)})`, d);
            atama = `${sm.cpp} = y::hata_degeri(${e});`;
          }
          s += ` catch (const y::Hata& ${e}) {\n${atama}\n${this.deyimler(d.yakala, k)}\n}`;
        } else s += ' catch (...) { throw; }';
        return s + ' }';
      }
      case 'firlat': {
        const v = this.ifade(d.ifade, k);
        if (v.t.k !== 'metin' && v.t.k !== 'hata') this.hata('Gömülü sürümde yalnızca metin ya da Hata(...) fırlatılabilir', d);
        return `y::firlat(${v.c});`;
      }
      case 'don': {
        if (fk.tur === 'program' || fk.tur === 'birim') { if (d.ifade) this.hata("Programdan 'dön' ile değer döndürülemez", d); return 'return;'; }
        if (!d.ifade) return fk.sonuc ? 'return v_sonuc;' : 'return;';
        if (!fk.sonuc) this.hata("Prosedür değer döndüremez; 'fonksiyon' kullanın", d);
        return `{ v_sonuc = ${this.donustur(this.ifade(d.ifade, k, fk.sonucTip), fk.sonucTip, 'sonuç', d)}; return v_sonuc; }`;
      }
      case 'kir': if (!fk.dongu) this.hata("'kır' döngü dışında kullanıldı", d); return 'break;';
      case 'devam': if (!fk.dongu) this.hata("'devam' döngü dışında kullanıldı", d); return 'continue;';
      case 'yerel_degisken': {
        const tip = this.tipCoz(d.tip, k, d.hamlar[0]);
        const out: string[] = [];
        d.adlar.forEach((ad: string, i: number) => {
          const once = k.s.get(ad);
          if (once && !once.ithal) this.hata(`'${d.hamlar[i]}' bu kapsamda zaten tanımlı (Yöntem büyük/küçük harf ve ş/s, ç/c gibi farkları ayırt etmez)`, d);
          const cpp = this.yeni('v_' + ad + '_');
          const deger = d.ilk ? this.donustur(this.ifade(d.ilk, k, tip), tip, d.hamlar[i], d) : this.varsayilan(tip);
          fk.onTanim.push(`  ${cppTip(tip)} ${cpp}${tip.k === 'dizi' ? ` = ${this.varsayilan(tip)}` : ''};`);
          k.s.set(ad, { tur: 'degisken', cpp, ham: d.hamlar[i], tip, sahip: fk });
          out.push(`${cpp} = ${deger};`);
        });
        return out.join(' ');
      }
    }
    this.hata(`Bilinmeyen deyim: ${d.tur}`, d);
  }

  donguDegiskeni(k: Kapsam, ad: string, ham: string, tip: Tip) {
    const r = this.bul(k, ad);
    if (r && r.tur !== 'genel') return;
    const cpp = this.yeni('v_' + ad + '_');
    k.fk.onTanim.push(`  ${cppTip(tip)} ${cpp}${tip.k === 'tam' || tip.k === 'ond' ? ' = 0' : tip.k === 'mant' ? ' = false' : ''};`);
    k.s.set(ad, { tur: 'degisken', cpp, ham, tip, sahip: k.fk });
  }

  kosul(n: Dugum, k: Kapsam): string {
    const e = this.ifade(n, k);
    if (e.t.k === 'deg') ayni(e.t, MANT);
    if (tc(e.t).k !== 'mant') this.hata(`Koşul mantıksal olmalı, ${tipAdi(e.t)} verildi`, n);
    return e.c;
  }

  /** hedef := deger */
  ata(h: Dugum, v: E, k: Kapsam, n: Dugum): string {
    if (h.tur === 'ad') {
      const r = this.bul(k, h.ad);
      if (r && r.tur === 'sem') {
        const s = r.s;
        if (s.tur === 'sabit') this.hata(`Sabite atama yapılamaz: '${h.ad}'`, n);
        if (s.tur !== 'degisken') this.hata(`'${h.ham || h.ad}' değişken değil; atama yapılamaz`, n);
        this.yakalamaDenetle(k, s, n);
        return `${s.cpp} = ${this.donustur(v, s.tip!, h.ad, n)}`;
      }
      if (r && r.tur === 'alan') return `this->f_${h.ad} = ${this.donustur(v, r.tip, h.ad, n)}`;
      this.hata(`Tanımsız değişken: '${h.ham || h.ad}' (önce 'değişken' ile tanımlayın)`, n);
    }
    if (h.tur === 'alan') {
      const o = this.ifade(h.nesne, k);
      if (o.t.k === 'sinif') {
        const a = this.alanBul(o.t.s, h.ad);
        if (!a) this.hata(`'${o.t.s.ham}' nesnesinde '${h.ad}' alanı yok`, n);
        const erisim = o.t.s.kayit ? `${o.c}.f_${h.ad}` : (o.c === 'this' ? `this->f_${h.ad}` : `y::denetle(${o.c}, ${J(h.ham)}).f_${h.ad}`);
        return `${erisim} = ${this.donustur(v, a.tip, h.ad, n)}`;
      }
      this.hata(`${tipAdi(o.t)} türünde '${h.ad}' alanına atama yapılamaz`, n);
    }
    if (h.tur === 'indeks') {
      const c = this.ifade(h.nesne, k);
      if (c.t.k === 'sozluk') {
        const a = this.donustur(this.ifade(h.indeksler[0], k, c.t.a), c.t.a, 'anahtar', n);
        return `${c.c}.ata(${a}, ${this.donustur(v, c.t.d, 'değer', n)})`;
      }
      const idx = h.indeksler.map((x: Dugum) => this.donustur(this.ifade(x, k), TAM, 'dizin', n));
      if (c.t.k === 'metin') {
        if (idx.length !== 1) this.hata('Metin tek dizinle erişilir', n);
        if (v.t.k !== 'metin') this.hata('Metne yalnızca metin atanabilir', n);
        return this.ata(h.nesne, { c: `y::metin_ata(${c.c}, ${idx[0]}, ${v.c})`, t: METIN }, k, n);
      }
      if (c.t.k === 'liste' || c.t.k === 'dizi') {
        if (idx.length !== 1) this.hata('Çok boyutlu dizin için iç içe dizin kullanın: a[i][j]', n);
        return `${c.c}[${idx[0]}] = ${this.donustur(v, c.t.e, 'öğe', n)}`;
      }
      if (c.t.k === 'tensor') return `y::indeks_ata(${c.c}, ${idx.join(', ')}, ${this.donustur(v, OND, 'öğe', n)})`;
      this.hata(`${tipAdi(c.t)} dizinle değiştirilemez`, n);
    }
    this.hata('Geçersiz atama hedefi', n);
  }
  yakalamaDenetle(k: Kapsam, s: Sem, n: Dugum) {
    if (!s.sahip || s.evrensel) return;
    for (let f: FonkB | null = k.fk; f && f !== s.sahip; f = f.ust) {
      if (f.yakalama === 'deger') this.hata(`Gömülü sürümde lambda içinden dış değişkene ('${s.ham}') atama yapılamaz`, n);
    }
  }
  alanBul(s: SinifC, ad: string) {
    for (let c: SinifC | null = s; c; c = c.ebeveyn) { const a = c.alanlar.get(ad); if (a) return a; }
    return null;
  }

  // ============================================================ ifadeler
  ifade(n: Dugum, k: Kapsam, bek?: Tip, deyim = false): E {
    const r = this.ifadeIc(n, k, bek ? tc(bek) : bek, deyim);
    r.t = tc(r.t);
    return r;
  }
  ifadeIc(n: Dugum, k: Kapsam, bek?: Tip, deyim = false): E {
    switch (n.tur) {
      case 'sabitdeger': return this.sabit(n, bek);
      case 'ad': return this.adDeger(n, k, deyim);
      case 'kendi': {
        if (!this.metodBaglami(k)) this.hata("'kendi' yalnızca metodlar içinde kullanılabilir", n);
        const s = this.metodBaglami(k)!.sinif!;
        return { c: s.kayit ? '(*this)' : `y::kendi(this)`, t: { k: 'sinif', s } };
      }
      case 'alan': return this.alan(n, k, null, deyim);
      case 'indeks': {
        const c = this.ifade(n.nesne, k);
        const idx = c.t.k === 'sozluk' ? [] : n.indeksler.map((x: Dugum) => this.donustur(this.ifade(x, k), TAM, 'dizin', n));
        if (c.t.k === 'liste' || c.t.k === 'dizi') {
          if (idx.length !== 1) this.hata('Çok boyutlu dizin için iç içe dizin kullanın: a[i][j]', n);
          return { c: `${c.c}[${idx[0]}]`, t: c.t.e, lv: true };
        }
        if (c.t.k === 'metin') { if (idx.length !== 1) this.hata('Metin tek dizinle erişilir', n); return { c: `y::metin_indeks(${c.c}, ${idx[0]})`, t: METIN }; }
        if (c.t.k === 'sozluk') return { c: `${c.c}.al(${this.donustur(this.ifade(n.indeksler[0], k, c.t.a), c.t.a, 'anahtar', n)})`, t: c.t.d, lv: true };
        if (c.t.k === 'deg') this.hata(`${(c.t as any).r.aciklama} henüz bilinmiyor; değişkeni tipiyle bildirin (ör. 'tamsayı dizisi')`, n);
        if (c.t.k === 'tensor') return { c: `y::indeks(${c.c}, ${idx.join(', ')})`, t: OND };
        this.hata(`${tipAdi(c.t)} dizinlenemez`, n);
      }
      case 'cagri': return this.cagri(n, k, bek);
      case 'ikili': {
        const a = this.ifade(n.sol, k);
        const b = this.ifade(n.sag, k, a.t.k === 'liste' ? a.t : undefined);
        return this.ikiliTip(n.op, a, b, n);
      }
      case 'mantik': {
        const a = this.ifade(n.sol, k), b = this.ifade(n.sag, k);
        if (a.t.k === 'mant' && b.t.k === 'mant') return { c: `(${a.c} ${n.op === 've' ? '&&' : n.op === 'veya' ? '||' : '!='} ${b.c})`, t: MANT };
        if (a.t.k === 'tam' && b.t.k === 'tam') return { c: `(${a.c} ${n.op === 've' ? '&' : n.op === 'veya' ? '|' : '^'} ${b.c})`, t: TAM };
        this.hata(`'${n.op}' mantıksal ya da tamsayı bekler`, n);
      }
      case 'tekli': {
        const v = this.ifade(n.ifade, k, bek);
        if (n.op === 'degil') {
          if (v.t.k === 'mant') return { c: `(!${v.c})`, t: MANT };
          if (v.t.k === 'tam') return { c: `(~${v.c})`, t: TAM };
          this.hata(`'değil' mantıksal değer bekler, ${tipAdi(v.t)} verildi`, n);
        }
        if (n.op === '-') {
          if (sayiMi(v.t) || v.t.k === 'tensor') return { c: `(-${v.c})`, t: v.t };
          this.hata(`Tekli '-' sayı bekler, ${tipAdi(v.t)} verildi`, n);
        }
        return v;
      }
      case 'kosullu': {
        const c = this.kosul(n.kosul, k);
        const a = this.ifade(n.a, k, bek), b = this.ifade(n.b, k, bek ?? a.t);
        const t = this.ortakTip(a.t, b.t, n);
        return { c: `(${c} ? ${this.donustur(a, t, 'koşullu ifade', n)} : ${this.donustur(b, t, 'koşullu ifade', n)})`, t };
      }
      case 'liste': return this.listeLit(n, k, bek);
      case 'sozluk': {
        let at: Tip | null = bek && bek.k === 'sozluk' ? bek.a : null, dt: Tip | null = bek && bek.k === 'sozluk' ? bek.d : null;
        const ciftler = n.ciftler.map(([a, b]: Dugum[]) => [this.ifade(a, k, at ?? undefined), this.ifade(b, k, dt ?? undefined)] as E[]);
        if (!at) at = ciftler.length ? ciftler.map(c => c[0].t).reduce((x, y) => this.ortakTip(x, y, n)) : this.yeniDegisken('sözlük anahtar tipi');
        if (!dt) dt = ciftler.length ? ciftler.map(c => c[1].t).reduce((x, y) => this.ortakTip(x, y, n)) : this.yeniDegisken('sözlük değer tipi');
        const t: Tip = { k: 'sozluk', a: at, d: dt };
        return { c: `${cppTip(t)}{${ciftler.map(([a, b]) => `{${this.donustur(a, at!, 'anahtar', n)}, ${this.donustur(b, dt!, 'değer', n)}}`).join(', ')}}`, t };
      }
      case 'aralik_liste': {
        const a = this.donustur(this.ifade(n.alt, k), TAM, 'aralık', n), b = this.donustur(this.ifade(n.ust, k), TAM, 'aralık', n);
        return { c: `y::aralik_liste(${a}, ${b})`, t: liste(TAM) };
      }
      case 'boru': {
        const v = n.sol;
        const sag = n.sag;
        if (sag.tur === 'cagri') return this.cagri({ ...sag, argumanlar: [v, ...sag.argumanlar] }, k, bek);
        return this.cagri({ tur: 'cagri', satir: n.satir, cagrilan: sag, argumanlar: [v] }, k, bek);
      }
      case 'bicim': {
        const v = this.ifade(n.ifade, k);
        const g = this.donustur(this.ifade(n.genislik, k), TAM, 'genişlik', n);
        if (n.hassasiyet) return { c: `y::bicim(${v.c}, ${g}, ${this.donustur(this.ifade(n.hassasiyet, k), TAM, 'hassasiyet', n)})`, t: METIN };
        return { c: `y::bicim(${v.c}, ${g})`, t: METIN };
      }
      case 'ref': return this.fonkRef(n.ifade, k);
      case 'lambda': return this.lambda(n, k, bek);
      case 'miras': return this.miras(n, k, []);
    }
    this.hata(`'${n.tur}' ifadesi gömülü sürümde desteklenmiyor`, n);
  }

  metodBaglami(k: Kapsam): FonkB | null {
    for (let f: FonkB | null = k.fk; f; f = f.ust) if (f.sinif && f.metod) return f;
    return null;
  }

  sabit(n: Dugum, bek?: Tip): E {
    const v = n.deger;
    if (typeof v === 'bigint') {
      if (bek && bek.k === 'ond') return { c: ondLit(Number(v)), t: OND };
      if (v > 9223372036854775807n || v < -9223372036854775807n) this.hata(`${v} 64 bitlik tamsayı sınırlarının dışında; ondalık kullanın`, n);
      return { c: `y::Tam(${v})`, t: TAM };
    }
    if (typeof v === 'number') return { c: ondLit(v), t: OND };
    if (typeof v === 'string') return { c: cMetin(v), t: METIN };
    if (typeof v === 'boolean') return { c: String(v), t: MANT };
    return { c: 'nullptr', t: BOS };
  }

  listeLit(n: Dugum, k: Kapsam, bek?: Tip): E {
    let et: Tip | null = bek && bek.k === 'liste' ? tc(bek.e) : null;
    const bekDeg = et && et.k === 'deg' && n.elemanlar.length ? et : null;
    if (bekDeg) et = null;
    const ogeler = n.elemanlar.map((e: Dugum) => this.ifade(e, k, et ?? undefined));
    if (!et) {
      if (!ogeler.length) et = this.yeniDegisken('boş listenin öğe tipi');
      else et = ogeler[0].t;
      for (const o of ogeler.slice(1)) et = this.ortakTip(et!, o.t, n);
      if (bekDeg) { ayni(bekDeg, et!); et = tc(bekDeg); }
    }
    et = tc(et!);
    const t = liste(et!);
    return { c: `${cppTip(t)}{${ogeler.map((o: E) => this.donustur(o, et!, 'liste öğesi', n)).join(', ')}}`, t };
  }

  ortakTip(a: Tip, b: Tip, n: Dugum): Tip {
    a = tc(a); b = tc(b);
    if (sayiMi(a) && sayiMi(b) && a.k !== b.k) return OND;
    if (a.k === 'liste' && b.k === 'liste' && sayiMi(a.e) && sayiMi(b.e) && tc(a.e).k !== tc(b.e).k) return liste(OND);
    if (ayni(a, b)) return tc(a);
    if (sayiMi(a) && sayiMi(b)) return OND;
    if (a.k === 'bos' && b.k === 'sinif') return b;
    if (b.k === 'bos' && a.k === 'sinif') return a;
    if (a.k === 'sinif' && b.k === 'sinif') {
      for (let c: SinifC | null = a.s; c; c = c.ebeveyn) if (turevMi(b.s, c)) return { k: 'sinif', s: c };
    }
    this.hata(`Farklı tipler bir arada kullanılamaz: ${tipAdi(a)} ve ${tipAdi(b)}`, n);
  }

  adDeger(n: Dugum, k: Kapsam, deyim = false): E {
    const r = this.bul(k, n.ad);
    if (!r) this.hata(`Tanımsız tanımlayıcı: '${n.ham || n.ad}'`, n);
    switch (r.tur) {
      case 'alan': return { c: `this->f_${n.ad}`, t: r.tip, lv: true };
      case 'metod': {
        if (r.m.params.length === 0) return { c: `this->m_${n.ad}()`, t: r.m.donus };
        this.hata(`'${r.m.ham}' parametre bekler; ${deyim ? 'argümanlarla çağırın' : "değer olarak kullanmak için '@' yazın"}`, n);
      }
      case 'genel': return this.yerelCagri('genel', n.ad, [], k, n, undefined, true);
      case 'sem': {
        const s = r.s;
        switch (s.tur) {
          case 'degisken': case 'sabit': return { c: s.cpp, t: s.tip!, lv: s.tur === 'degisken' };
          case 'fonk':
            if (s.fonk!.params.length === 0) return { c: `${s.cpp}()`, t: s.fonk!.donus };
            return { c: s.cpp, t: this.fonkTipi(s.fonk!) };
          case 'yerel': return this.yerelCagri(s.yerel!.birim, s.yerel!.ad, [], k, n, undefined, true);
          case 'sinif': this.hata(`Sınıf adı '${s.ham}' değer olarak kullanılamaz; '${s.ham}.Oluştur(...)' yazın`, n);
          case 'birim': this.hata(`Birim adı '${s.ham}' değer olarak kullanılamaz`, n);
          case 'tip': this.hata(`Tip adı '${s.ham}' değer olarak kullanılamaz`, n);
        }
      }
    }
    this.hata(`Tanımsız tanımlayıcı: '${n.ham}'`, n);
  }
  fonkTipi(f: FonkC): Tip { return { k: 'fonk', p: f.params.map(p => p.tip), d: f.donus, ref: f.params.map(p => p.ref) }; }

  /** @F: fonksiyon başvurusu */
  fonkRef(n: Dugum, k: Kapsam): E {
    if (n.tur === 'ad') {
      const r = this.bul(k, n.ad);
      if (r && r.tur === 'sem' && r.s.tur === 'fonk') return { c: r.s.cpp, t: this.fonkTipi(r.s.fonk!) };
      if (r && r.tur === 'metod') {
        const m = r.m;
        const ps = m.params.map((p, i) => `${cppTip(p.tip)}${p.ref ? '&' : ''} a${i}`).join(', ');
        return { c: `[=](${ps}) { return this->m_${m.ad}(${m.params.map((_, i) => 'a' + i).join(', ')}); }`, t: { k: 'fonk', p: m.params.map(p => p.tip), d: m.donus, ref: m.params.map(p => p.ref) } };
      }
      if (r && r.tur === 'sem' && r.s.tur === 'degisken' && r.s.tip!.k === 'fonk') return { c: r.s.cpp, t: r.s.tip! };
    }
    if (n.tur === 'alan') {
      const o = this.ifade(n.nesne, k);
      if (o.t.k === 'sinif' && !o.t.s.kayit) {
        const m = this.metodBul(o.t.s, n.ad);
        if (m) {
          const ps = m.params.map((p, i) => `${cppTip(p.tip)}${p.ref ? '&' : ''} a${i}`).join(', ');
          const ov = this.yeni('o');
          return { c: `[${ov} = ${o.c}](${ps}) { return y::denetle(${ov}, ${J(n.ham)}).m_${m.ad}(${m.params.map((_, i) => 'a' + i).join(', ')}); }`, t: { k: 'fonk', p: m.params.map(p => p.tip), d: m.donus, ref: m.params.map(p => p.ref) } };
        }
      }
      if (o.t.k === 'birim' as any) { /* aşağıda */ }
      if (n.nesne.tur === 'ad') {
        const r = this.bul(k, n.nesne.ad);
        if (r && r.tur === 'sem' && r.s.tur === 'birim') {
          const u = r.s.uyeler!.get(n.ad);
          if (u && u.tur === 'fonk') return { c: u.cpp, t: this.fonkTipi(u.fonk!) };
        }
      }
    }
    this.hata("'@' yalnızca bir fonksiyon, prosedür ya da metod adıyla kullanılabilir", n);
  }

  lambda(n: Dugum, k: Kapsam, bek?: Tip): E {
    const beklenen = bek && bek.k === 'fonk' ? bek : null;
    const params: ParamC[] = n.params.map((p: Dugum, i: number) => {
      let tip: Tip;
      if (p.tip) tip = this.tipCoz(p.tip, k, p.ham);
      else if (beklenen && beklenen.p[i]) tip = beklenen.p[i];
      else this.hata(`Lambda parametresine tip verin: fonksiyon(${p.ham}: tamsayı) => ...`, n);
      return { ad: p.ad, ham: p.ham, tip, ref: p.ref, varsayilan: null };
    });
    let donus: Tip;
    if (n.donus) donus = this.tipCoz(n.donus, k);
    else if (n.ifade) {
      // dönüş tipini ifadeden çıkar: geçici kapsamla
      const fk = this.yeniBaglam('lambda', k.fk.sinif, k.fk.metod, k.fk, 'deger');
      const kk = new Kapsam(k, fk);
      for (const p of params) kk.s.set(p.ad, { tur: 'degisken', cpp: 'v_' + p.ad, ham: p.ham, tip: p.tip, sahip: fk });
      const sayacEski = this.sayac;
      donus = this.ifade(n.ifade, kk, beklenen && beklenen.d.k !== 'yok' ? beklenen.d : undefined).t;
      this.sayac = sayacEski;
      if (donus.k === 'bos') donus = beklenen ? beklenen.d : YOK;
    } else donus = beklenen ? beklenen.d : YOK;
    const tur = donus.k === 'yok' ? 'prosedur' : 'lambda';
    const govde = this.govdeKod(n, k, tur, null, null, params, donus, 'deger');
    const ps = params.map(p => `${cppTip(p.tip)}${p.ref ? '&' : ''} v_${p.ad}`).join(', ');
    return { c: `[=](${ps}) mutable -> ${cppTip(donus)} {\n${govde}\n}`, t: { k: 'fonk', p: params.map(p => p.tip), d: donus, ref: params.map(p => p.ref) } };
  }

  // ---------------------------------------------------------------- ikili işlemler
  ikiliTip(op: string, a: E, b: E, n: Dugum): E {
    a = { ...a, t: tc(a.t) }; b = { ...b, t: tc(b.t) };
    if (a.t.k === 'deg' || b.t.k === 'deg') {
      const aritmetik = ['+', '-', '*', '/', 'bol', 'mod', '**', '<', '>', '<=', '>=', '='].includes(op);
      if (op === 'icinde') { /* aşağıda */ }
      else if (a.t.k === 'deg' && b.t.k === 'deg') {
        if (aritmetik && op !== '=') sayisalIsaretle(a.t);
        ayni(a.t, b.t);
        if (op === 'bol' || op === 'mod') ayni(a.t, TAM);
        a = { ...a, t: tc(a.t) }; b = { ...b, t: tc(b.t) };
        if (a.t.k === 'deg') {
          if (['<', '>', '<=', '>=', '=', '<>'].includes(op)) return { c: `(${a.c} ${op === '=' ? '==' : op === '<>' ? '!=' : op} ${b.c})`, t: MANT };
          if (op === '/') return { c: `y::bol(y::Ond(${a.c}), y::Ond(${b.c}))`, t: OND };
          if (['+', '-', '*'].includes(op)) return { c: `(${a.c} ${op} ${b.c})`, t: a.t };
        }
      } else {
        const [d, c] = a.t.k === 'deg' ? [a.t, b.t] : [b.t, a.t];
        if (c.k === 'tam' || c.k === 'ond' || c.k === 'metin' || c.k === 'mant') ayni(d, c);
        a = { ...a, t: tc(a.t) }; b = { ...b, t: tc(b.t) };
      }
    }
    const ta = a.t, tb = b.t;
    // aşırı yükleme
    if (ta.k === 'sinif') {
      const ad = ({ '+': 'topla', '-': 'cikar', '*': 'carp', '/': 'bolme', '=': 'esit', '<>': 'esit', '<': 'kucuk', '>': 'buyuk' } as any)[op];
      const m = ad ? this.metodBul(ta.s, ad) : null;
      if (m && m.params.length === 1) {
        const c = `${ta.s.kayit ? a.c + '.' : `y::denetle(${a.c}, ${J(m.ham)}).`}m_${m.ad}(${this.donustur(b, m.params[0].tip, m.params[0].ham, n)})`;
        return op === '<>' ? { c: `(!${c})`, t: MANT } : { c, t: m.donus };
      }
    }
    const say = sayiMi(ta) && sayiMi(tb);
    const ond = ta.k === 'ond' || tb.k === 'ond';
    const O = (e: E) => e.t.k === 'tam' ? `y::Ond(${e.c})` : e.c;
    switch (op) {
      case '+':
        if (say) return ond ? { c: `(${O(a)} + ${O(b)})`, t: OND } : { c: `(${a.c} + ${b.c})`, t: TAM };
        if (ta.k === 'metin' || tb.k === 'metin') return { c: `(${ta.k === 'metin' ? a.c : `y::metne(${a.c})`} + ${tb.k === 'metin' ? b.c : `y::metne(${b.c})`})`, t: METIN };
        if (ta.k === 'liste' && tb.k === 'liste' && ayni(ta, tb)) return { c: `y::birlestir(${a.c}, ${b.c})`, t: ta };
        break;
      case '-': case '*':
        if (say) return ond ? { c: `(${O(a)} ${op} ${O(b)})`, t: OND } : { c: `(${a.c} ${op} ${b.c})`, t: TAM };
        if (op === '*' && ta.k === 'metin' && tb.k === 'tam') return { c: `y::tekrar(${a.c}, ${b.c})`, t: METIN };
        break;
      case '/':
        if (say) return { c: `y::bol(${O(a)}, ${O(b)})`, t: OND };
        break;
      case 'bol': case 'mod':
        if (ta.k === 'tam' && tb.k === 'tam') return { c: `y::${op === 'bol' ? 'tbol' : 'tmod'}(${a.c}, ${b.c})`, t: TAM };
        if (say) this.hata(`'${op === 'bol' ? 'böl' : 'mod'}' tamsayı bekler`, n);
        break;
      case '**':
        if (ta.k === 'tam' && tb.k === 'tam') return { c: `y::tus(${a.c}, ${b.c})`, t: TAM };
        if (say) return { c: `y::us(${O(a)}, ${O(b)})`, t: OND };
        if (ta.k === 'tensor' && sayiMi(tb)) return { c: `y::us(${a.c}, ${O(b)})`, t: TENSOR };
        break;
      case '@':
        if (ta.k === 'tensor' && tb.k === 'tensor') return { c: `y::matmul(${a.c}, ${b.c})`, t: TENSOR };
        if (say) return this.ikiliTip('*', a, b, n);
        break;
      case '=': case '<>': {
        const neg = op === '<>';
        if (say) return { c: `(${ond ? O(a) : a.c} ${neg ? '!=' : '=='} ${ond ? O(b) : b.c})`, t: MANT };
        if (ayni(ta, tb) && (ta.k === 'metin' || ta.k === 'mant')) return { c: `(${a.c} ${neg ? '!=' : '=='} ${b.c})`, t: MANT };
        if ((ta.k === 'liste' || ta.k === 'dizi') && ayni(ta, tb)) return { c: `(${neg ? '!' : ''}y::esit(${a.c}, ${b.c}))`, t: MANT };
        if (ta.k === 'liste' && tb.k === 'liste') return { c: neg ? 'true' : 'false', t: MANT };
        if ((ta.k === 'sinif' && !ta.s.kayit) || ta.k === 'bos' || tb.k === 'bos') {
          if ((ta.k === 'sinif' || ta.k === 'bos') && (tb.k === 'sinif' || tb.k === 'bos'))
            return { c: `(${ta.k === 'bos' ? 'nullptr' : `std::static_pointer_cast<y::Nesne>(${a.c})`} ${neg ? '!=' : '=='} ${tb.k === 'bos' ? 'nullptr' : `std::static_pointer_cast<y::Nesne>(${b.c})`})`, t: MANT };
        }
        if (ta.k === 'sinif' && ta.s.kayit) this.hata(`Kayıtlar '=' ile karşılaştırılamaz; '${ta.s.ham}' için Eşit metodu yazın`, n);
        return { c: neg ? 'true' : 'false', t: MANT };
      }
      case '<': case '>': case '<=': case '>=':
        if (say) return { c: `(${ond ? O(a) : a.c} ${op} ${ond ? O(b) : b.c})`, t: MANT };
        if (ta.k === 'metin' && tb.k === 'metin') return { c: `(${a.c} ${op} ${b.c})`, t: MANT };
        break;
      case 'icinde':
        if (tb.k === 'sozluk') return { c: `y::icinde(${this.donustur(a, tb.a, 'anahtar', n)}, ${b.c})`, t: MANT };
        if (tb.k === 'liste' || tb.k === 'dizi') return { c: `y::icinde(${this.donustur(a, tb.e, 'öğe', n)}, ${b.c})`, t: MANT };
        if (tb.k === 'metin') { if (ta.k !== 'metin') this.hata('Metin içinde yalnızca metin aranabilir', n); return { c: `y::icinde(${a.c}, ${b.c})`, t: MANT }; }
        this.hata(`'içinde' sağ tarafta liste ya da metin bekler, ${tipAdi(tb)} verildi`, n);
    }
    if (ta.k === 'tensor' || tb.k === 'tensor') {
      if (['+', '-', '*', '/'].includes(op)) {
        const T_ = (e: E) => e.t.k === 'tensor' ? e.c : sayiMi(e.t) ? `y::Ond(${e.c})` : this.hata(`Tensör işleminde ${tipAdi(e.t)} kullanılamaz`, n);
        return { c: `(${T_(a)} ${op} ${T_(b)})`, t: TENSOR };
      }
    }
    const gor: Record<string, string> = { bol: 'böl', icinde: 'içinde' };
    this.hata(`'${gor[op] ?? op}' işlemi ${tipAdi(ta)} ve ${tipAdi(tb)} için tanımlı değil`, n);
  }

  // ---------------------------------------------------------------- alan / üye erişimi
  alan(n: Dugum, k: Kapsam, args: Dugum[] | null, deyim = false): E {
    // birim üyesi
    if (n.nesne.tur === 'ad') {
      const r = this.bul(k, n.nesne.ad);
      if (r && r.tur === 'sem' && r.s.tur === 'birim') {
        const b = r.s;
        if (b.disa && !b.disa.has(n.ad)) this.hata(`'${b.ham}' biriminde '${n.ad}' dışa aktarılmamış`, n);
        const u = b.uyeler!.get(n.ad);
        if (!u) this.hata(`'${b.ham}' biriminde '${n.ham}' yok`, n);
        return this.semCagri(u, n, k, args, deyim);
      }
      if (r && r.tur === 'sem' && r.s.tur === 'sinif') return this.sinifUyesi(r.s.sinif!, n, k, args);
    }
    const o = this.ifade(n.nesne, k);
    return this.uye(o, n.ad, n.ham, args, k, n);
  }

  sinifUyesi(s: SinifC, n: Dugum, k: Kapsam, args: Dugum[] | null): E {
    const m = this.metodBul(s, n.ad);
    if (m && m.kurucu) {
      const a = this.argumanlar(args ?? [], m.params, k, n, m.ham);
      if (s.kayit) this.hata('Kayıtlarda kurucu desteklenmiyor', n);
      return { c: `y::olustur<${s.cpp}>(&${m.sinif.cpp}::m_${m.ad}${a ? ', ' + a : ''})`, t: { k: 'sinif', s } };
    }
    if (!m && (n.ad === 'olustur' || n.ad === 'yeni')) {
      const tum: [string, Tip][] = [];
      const z: SinifC[] = []; for (let c: SinifC | null = s; c; c = c.ebeveyn) z.unshift(c);
      for (const c of z) for (const ad of c.alanSira) tum.push([ad, c.alanlar.get(ad)!.tip]);
      const as = args ?? [];
      if (as.length > tum.length) this.hata(`'${s.ham}' en çok ${tum.length} alan alır`, n);
      const kod = as.map((x, i) => this.donustur(this.ifade(x, k, tum[i][1]), tum[i][1], tum[i][0], n)).join(', ');
      return { c: `${s.cpp}::alanlarla(${kod})`, t: { k: 'sinif', s } };
    }
    if (m) this.hata(`'${n.ham}' bir kurucu değil; nesne üzerinden çağırın`, n);
    this.hata(`'${s.ham}' sınıfında '${n.ham}' kurucusu yok`, n);
  }

  uye(o: E, ad: string, ham: string, args: Dugum[] | null, k: Kapsam, n: Dugum): E {
    const t = o.t;
    const as = args ?? [];
    if (t.k === 'sinif') {
      const s = t.s;
      const a = this.alanBul(s, ad);
      const erisim = (u: string) => s.kayit ? `${o.c}.${u}` : (o.c === 'y::kendi(this)' ? `this->${u}` : `y::denetle(${o.c}, ${J(ham)}).${u}`);
      if (a) {
        if (args) {
          if (a.tip.k !== 'fonk') this.hata(`'${ham}' alanı çağrılamaz`, n);
          return { c: `${erisim('f_' + ad)}(${this.fonkArg(as, a.tip, k, n)})`, t: a.tip.d };
        }
        return { c: erisim('f_' + ad), t: a.tip, lv: true };
      }
      const m = this.metodBul(s, ad);
      if (m) {
        if (!args && m.params.length) this.hata(`'${m.ham}' parametre bekler`, n);
        return { c: `${erisim('m_' + ad)}(${this.argumanlar(as, m.params, k, n, m.ham)})`, t: m.donus };
      }
      this.hata(`'${s.ham}' nesnesinde '${ham}' üyesi yok`, n);
    }
    if (t.k === 'fonk') this.hata(`Fonksiyon değerinde '${ham}' üyesi yok`, n);
    const arg = (i: number, bek?: Tip) => this.ifade(as[i], k, bek);
    const sayiKontrol = (min: number, max: number) => { if (as.length < min || as.length > max) this.hata(`'${ham}' metodu ${min}..${max} argüman bekler, ${as.length} verildi`, n); };
    if (t.k === 'metin') {
      switch (ad) {
        case 'uzunluk': sayiKontrol(0, 0); return { c: `y::uzunluk(${o.c})`, t: TAM };
        case 'buyukharf': sayiKontrol(0, 0); return { c: `y::buyuk_harf(${o.c})`, t: METIN };
        case 'kucukharf': sayiKontrol(0, 0); return { c: `y::kucuk_harf(${o.c})`, t: METIN };
        case 'ayir': sayiKontrol(0, 1); return { c: `y::ayir(${o.c}${as.length ? ', ' + this.donustur(arg(0), METIN, 'ayraç', n) : ''})`, t: liste(METIN) };
        case 'kirp': sayiKontrol(0, 0); return { c: `y::kirp(${o.c})`, t: METIN };
        case 'degistir': sayiKontrol(2, 2); return { c: `y::degistir(${o.c}, ${this.donustur(arg(0), METIN, 'eski', n)}, ${this.donustur(arg(1), METIN, 'yeni', n)})`, t: METIN };
        case 'icerir': sayiKontrol(1, 1); return { c: `y::icinde(${this.donustur(arg(0), METIN, 'aranan', n)}, ${o.c})`, t: MANT };
        case 'konum': sayiKontrol(1, 1); return { c: `y::konum(${this.donustur(arg(0), METIN, 'aranan', n)}, ${o.c})`, t: TAM };
        case 'baslarmi': sayiKontrol(1, 1); return { c: `y::basla_mi(${o.c}, ${this.donustur(arg(0), METIN, 'ön ek', n)})`, t: MANT };
        case 'bitermi': sayiKontrol(1, 1); return { c: `y::biter_mi(${o.c}, ${this.donustur(arg(0), METIN, 'son ek', n)})`, t: MANT };
        case 'ters': sayiKontrol(0, 0); return { c: `y::ters(${o.c})`, t: METIN };
        case 'altmetin': sayiKontrol(1, 2); return { c: `y::alt_metin(${o.c}, ${this.donustur(arg(0), TAM, 'başlangıç', n)}${as.length > 1 ? `, ${this.donustur(arg(1), TAM, 'uzunluk', n)}, true` : ''})`, t: METIN };
        case 'karakterler': sayiKontrol(0, 0); return { c: `y::Liste<y::Metin>(y::karakterler(${o.c}))`, t: liste(METIN) };
        case 'bosmu': sayiKontrol(0, 0); return { c: `(${o.c}).empty()`, t: MANT };
      }
    }
    if (t.k === 'liste') {
      const e = t.e;
      switch (ad) {
        case 'uzunluk': sayiKontrol(0, 0); return { c: `(${o.c}).uz()`, t: TAM };
        case 'ekle': sayiKontrol(1, 1); return { c: `y::ekle(${o.c}, ${this.donustur(arg(0, e), e, 'öğe', n)})`, t: YOK };
        case 'cikar': sayiKontrol(0, 1); return as.length ? { c: `y::sil(${o.c}, ${this.donustur(arg(0), TAM, 'dizin', n)})`, t: e } : { c: `y::cikar(${o.c})`, t: e };
        case 'sil': sayiKontrol(1, 1); return { c: `y::sil(${o.c}, ${this.donustur(arg(0), TAM, 'dizin', n)})`, t: e };
        case 'araya': sayiKontrol(2, 2); return { c: `y::araya(${o.c}, ${this.donustur(arg(0), TAM, 'dizin', n)}, ${this.donustur(arg(1, e), e, 'öğe', n)})`, t: YOK };
        case 'temizle': sayiKontrol(0, 0); return { c: `(${o.c}).p->clear()`, t: YOK };
        case 'bul': sayiKontrol(1, 1); return { c: `y::bul(${o.c}, ${this.donustur(arg(0, e), e, 'öğe', n)})`, t: TAM };
        case 'icerir': sayiKontrol(1, 1); return { c: `y::icinde(${this.donustur(arg(0, e), e, 'öğe', n)}, ${o.c})`, t: MANT };
        case 'sirala': case 'ters': case 'kopya': case 'esle': case 'suz': case 'indirge': case 'toplam': case 'dilim':
          return this.yerelCagriE('genel', ad === 'kopya' ? 'kopya' : ad, [o, ...as.map(() => null as any)], as, k, n);
        case 'birlestir': sayiKontrol(0, 1); return { c: `y::birlestir_metin(${o.c}${as.length ? ', ' + this.donustur(arg(0), METIN, 'ayraç', n) : ''})`, t: METIN };
        case 'ilk': sayiKontrol(0, 0); return { c: `(${o.c})[0]`, t: e };
        case 'sonuncu': sayiKontrol(0, 0); return { c: `(${o.c})[-1]`, t: e };
        case 'bosmu': sayiKontrol(0, 0); return { c: `(${o.c}).p->empty()`, t: MANT };
      }
    }
    if (t.k === 'sozluk') {
      switch (ad) {
        case 'uzunluk': sayiKontrol(0, 0); return { c: `(${o.c}).uz()`, t: TAM };
        case 'anahtarlar': sayiKontrol(0, 0); return { c: `y::anahtarlar(${o.c})`, t: liste(t.a) };
        case 'degerler': sayiKontrol(0, 0); return { c: `y::degerler(${o.c})`, t: liste(t.d) };
        case 'icerir': sayiKontrol(1, 1); return { c: `(${o.c}).var(${this.donustur(arg(0, t.a), t.a, 'anahtar', n)})`, t: MANT };
        case 'al': sayiKontrol(1, 2); return as.length > 1
          ? { c: `(${o.c}).al_vs(${this.donustur(arg(0, t.a), t.a, 'anahtar', n)}, ${this.donustur(arg(1, t.d), t.d, 'değer', n)})`, t: t.d }
          : { c: `(${o.c}).al(${this.donustur(arg(0, t.a), t.a, 'anahtar', n)})`, t: t.d };
        case 'sil': sayiKontrol(1, 1); return { c: `(${o.c}).sil(${this.donustur(arg(0, t.a), t.a, 'anahtar', n)})`, t: YOK };
        case 'temizle': sayiKontrol(0, 0); return { c: `(${o.c}).p->clear()`, t: YOK };
        case 'bosmu': sayiKontrol(0, 0); return { c: `(${o.c}).p->empty()`, t: MANT };
      }
    }
    if (t.k === 'deg') this.hata(`${(t as any).r.aciklama} henüz bilinmiyor, '${ham}' kullanılamaz; değişkeni tipiyle bildirin (ör. 'tamsayı dizisi')`, n);
    if (t.k === 'dizi') {
      switch (ad) {
        case 'uzunluk': return { c: `(${o.c}).uz()`, t: TAM };
        case 'alt': return { c: `(${o.c}).alt`, t: TAM };
        case 'ust': return { c: `((${o.c}).alt + (${o.c}).uz() - 1)`, t: TAM };
      }
    }
    if (t.k === 'hata') {
      switch (ad) {
        case 'mesaj': return { c: `(${o.c}).mesaj`, t: METIN };
        case 'tur': return { c: `(${o.c}).tur`, t: METIN };
        case 'satir': return { c: `(${o.c}).satir`, t: TAM };
      }
    }
    if (t.k === 'tensor') {
      const tek = (f: string, rt: Tip = TENSOR) => { sayiKontrol(0, 0); return { c: `y::${f}(${o.c})`, t: rt }; };
      switch (ad) {
        case 't': return tek('transpoze');
        case 'deger': return tek('deger', OND);
        case 'toplam': case 'ortalama':
          sayiKontrol(0, 1);
          return as.length ? { c: `y::${ad}(${o.c}, ${this.donustur(arg(0), TAM, 'eksen', n)})`, t: TENSOR } : tek(ad);
        case 'maks': return tek('maks', OND);
        case 'min': return tek('minimum', OND);
        case 'argmaks': return tek('argmaks', TAM);
        case 'us': return tek('ustel');
        case 'log': return tek('log_');
        case 'relu': return tek('relu');
        case 'sigmoid': return tek('sigmoid');
        case 'tanh': return tek('tanh_');
        case 'softmaks': return tek('softmaks');
        case 'sin': return tek('sin');
        case 'cos': return tek('cos');
        case 'kok': return tek('kok');
        case 'mutlak': return tek('mutlak');
        case 'sekil': return tek('sekil', liste(TAM));
        case 'boyut': sayiKontrol(0, 0); return { c: `(y::Tam)(${o.c}).boyut()`, t: TAM };
        case 'liste': case 'veri': return tek('liste_yap', liste(OND));
        case 'ayir': case 'kopya': return tek('tensor');
        case 'satir': sayiKontrol(1, 1); return { c: `y::satir_al(${o.c}, ${this.donustur(arg(0), TAM, 'satır', n)})`, t: TENSOR };
        case 'yeniden': sayiKontrol(1, 2); return { c: `y::yeniden(${o.c}, ${as.map((_, i) => this.donustur(arg(i), TAM, 'boyut', n)).join(', ')}${as.length === 2 ? ', true' : ''})`, t: TENSOR };
      }
    }
    this.hata(`${tipAdi(t)} türünde '${ham}' üyesi yok`, n);
  }

  // ---------------------------------------------------------------- çağrılar
  argumanlar(args: Dugum[], params: ParamC[], k: Kapsam, n: Dugum, ham: string): string {
    if (args.length > params.length) this.hata(`'${ham}' en çok ${params.length} argüman alır, ${args.length} verildi`, n);
    for (let i = args.length; i < params.length; i++) if (!params[i].varsayilan) this.hata(`'${ham}' için '${params[i].ham}' argümanı eksik`, n);
    return args.map((a, i) => {
      const p = params[i];
      const e = this.ifade(a, k, p.tip);
      if (p.ref) {
        if (!e.lv) this.hata(`'${p.ham}' değişken parametresine yalnızca değişken, alan ya da liste öğesi verilebilir`, n);
        if (!ayni(e.t, p.tip)) this.hata(`'${p.ham}' değişken parametresi ${tipAdi(p.tip)} bekler, ${tipAdi(e.t)} verildi`, n);
        if (a.tur === 'ad') { const r = this.bul(k, a.ad); if (r && r.tur === 'sem') this.yakalamaDenetle(k, r.s, n); }
        return e.c;
      }
      return this.donustur(e, p.tip, p.ham, a);
    }).join(', ');
  }
  fonkArg(args: Dugum[], ft: Tip & { k: 'fonk' }, k: Kapsam, n: Dugum): string {
    const params: ParamC[] = ft.p.map((t, i) => ({ ad: 'a' + i, ham: `${i + 1}. argüman`, tip: t, ref: !!(ft.ref && ft.ref[i]), varsayilan: null }));
    return this.argumanlar(args, params, k, n, 'fonksiyon');
  }

  cagri(n: Dugum, k: Kapsam, bek?: Tip): E {
    const c = n.cagrilan, args: Dugum[] = n.argumanlar;
    if (c.tur === 'ad') {
      const r = this.bul(k, c.ad);
      if (!r) this.hata(`Tanımsız tanımlayıcı: '${c.ham}'`, c);
      if (r.tur === 'metod') return { c: `this->m_${c.ad}(${this.argumanlar(args, r.m.params, k, n, r.m.ham)})`, t: r.m.donus };
      if (r.tur === 'genel') return this.yerelCagri('genel', c.ad, args, k, n, bek);
      if (r.tur === 'alan') {
        if (r.tip.k !== 'fonk') this.hata(`'${c.ham}' çağrılamaz`, n);
        return { c: `this->f_${c.ad}(${this.fonkArg(args, r.tip, k, n)})`, t: r.tip.d };
      }
      return this.semCagri(r.s, c, k, args, false, bek);
    }
    if (c.tur === 'alan') return this.alan(c, k, args);
    if (c.tur === 'miras') return this.miras(c, k, args);
    const f = this.ifade(c, k);
    if (f.t.k !== 'fonk') this.hata(`${tipAdi(f.t)} çağrılamaz`, n);
    return { c: `(${f.c})(${this.fonkArg(args, f.t, k, n)})`, t: f.t.d };
  }

  semCagri(s: Sem, n: Dugum, k: Kapsam, args: Dugum[] | null, deyim = false, bek?: Tip): E {
    switch (s.tur) {
      case 'fonk':
        if (!args) return s.fonk!.params.length === 0 ? { c: `${s.cpp}()`, t: s.fonk!.donus } : { c: s.cpp, t: this.fonkTipi(s.fonk!) };
        return { c: `${s.cpp}(${this.argumanlar(args, s.fonk!.params, k, n, s.fonk!.ham)})`, t: s.fonk!.donus };
      case 'yerel': return this.yerelCagri(s.yerel!.birim, s.yerel!.ad, args ?? [], k, n, bek, !args);
      case 'degisken': case 'sabit':
        if (!args) return { c: s.cpp, t: s.tip!, lv: s.tur === 'degisken' };
        if (s.tip!.k !== 'fonk') this.hata(`'${s.ham}' çağrılamaz`, n);
        return { c: `${s.cpp}(${this.fonkArg(args, s.tip as any, k, n)})`, t: (s.tip as any).d };
      case 'sinif': {
        const sc = s.sinif!;
        let m = this.metodBul(sc, 'olustur');
        if (!m || !m.kurucu) m = [...sc.metodlar.values()].find(x => x.kurucu) ?? null;
        if (m) return { c: `y::olustur<${sc.cpp}>(&${m.sinif.cpp}::m_${m.ad}${(args ?? []).length ? ', ' + this.argumanlar(args ?? [], m.params, k, n, m.ham) : ''})`, t: { k: 'sinif', s: sc } };
        return this.sinifUyesi(sc, { ...n, ad: 'olustur', ham: 'Oluştur' }, k, args);
      }
    }
    this.hata(`'${s.ham}' çağrılamaz`, n);
  }

  miras(n: Dugum, k: Kapsam, args: Dugum[]): E {
    const fk = this.metodBaglami(k);
    if (!fk) this.hata("'miras' yalnızca metodlar içinde kullanılabilir", n);
    const ad = n.ad ?? fk.metod!.ad;
    const s = fk.sinif!;
    const m = s.ebeveyn ? this.metodBul(s.ebeveyn, ad) : null;
    if (!m) return { c: '(void)0', t: YOK };
    let a: string;
    if (n.ad === null && !args.length) a = fk.metod!.params.map(p => 'v_' + p.ad).join(', ');
    else a = this.argumanlar(args, m.params, k, n, m.ham);
    return { c: `this->${m.sinif.cpp}::m_${m.ad}(${a})`, t: m.donus };
  }

  // ---------------------------------------------------------------- yerleşikler
  yerelCagriE(birim: string, ad: string, onceden: (E | null)[], args: Dugum[], k: Kapsam, n: Dugum): E {
    // liste metodları: ilk argüman hazır ifade
    const sahte: Dugum[] = [{ tur: '__hazir', satir: n.satir, e: onceden[0] } as any, ...args];
    return this.yerelCagri(birim, ad, sahte, k, n);
  }
  yerelCagri(birim: string, ad: string, args: Dugum[], k: Kapsam, n: Dugum, bek?: Tip, otomatik = false): E {
    const A = (i: number, b?: Tip): E => (args[i] as any).tur === '__hazir' ? (args[i] as any).e : this.ifade(args[i], k, b);
    const D = (i: number, t: Tip, adi = 'argüman') => this.donustur(A(i, t), t, adi, n);
    const sayi = (min: number, max: number) => {
      if (args.length < min || args.length > max) this.hata(`'${ad}' ${min === max ? min : `${min}..${max}`} argüman bekler, ${args.length} verildi`, n);
    };
    const num = (i: number) => { const e = A(i); if (!sayiMi(e.t)) this.hata(`'${ad}' sayı bekler, ${tipAdi(e.t)} verildi`, n); return e; };
    const O = (e: E) => e.t.k === 'tam' ? `y::Ond(${e.c})` : e.c;
    const lst = (i: number): E => { const e = A(i); if (e.t.k !== 'liste' && e.t.k !== 'dizi') this.hata(`'${ad}' liste bekler, ${tipAdi(e.t)} verildi`, n); return e; };
    const fonkBek = (p: Tip[], d: Tip): Tip => ({ k: 'fonk', p, d });

    if (birim === 'genel' || birim === 'matematik') {
      switch (ad) {
        case 'yaz': {
          sayi(0, 2);
          if (!args.length) return { c: 'y::yaz()', t: YOK };
          const v = A(0);
          if (v.t.k === 'yok') this.hata('Değer döndürmeyen bir prosedürün sonucu yazdırılamaz', n);
          return { c: `y::yaz(${v.c}${args.length > 1 ? ', ' + D(1, TAM, 'satır sayısı') : ''})`, t: YOK };
        }
        case 'oku': {
          sayi(1, 2);
          const v = A(0);
          if (!v.lv) this.hata("'oku' bir değişken bekler", n);
          if (!['tam', 'ond', 'metin'].includes(v.t.k)) this.hata(`'oku' ${tipAdi(v.t)} okuyamaz (tamsayı, ondalık ya da metin)`, n);
          if (args[0].tur === 'ad') { const r = this.bul(k, args[0].ad); if (r && r.tur === 'sem') this.yakalamaDenetle(k, r.s, n); }
          return { c: `y::oku(${v.c}${args.length > 1 ? ', ' + D(1, TAM, 'satır sayısı') : ''})`, t: YOK };
        }
        case 'tamsayi': case 'tamsayiya': sayi(1, 1); { const v = A(0); this.donusturulebilir(v, n); return { c: `y::tamsayi(${v.c})`, t: TAM }; }
        case 'ondalik': case 'ondaliga': sayi(1, 1); { const v = A(0); this.donusturulebilir(v, n); return { c: `y::ondalik(${v.c})`, t: OND }; }
        case 'metin': case 'metne': sayi(1, 1); return { c: `y::metne(${A(0).c})`, t: METIN };
        case 'mantiksal': sayi(1, 1); { const v = A(0); this.donusturulebilir(v, n); return { c: `y::mantiksal(${v.c})`, t: MANT }; }
        case 'tur': {
          sayi(1, 1);
          const v = A(0);
          if (v.t.k === 'sinif' && !v.t.s.kayit) return { c: `([&](){ auto o_ = ${v.c}; return o_ ? o_->tur_() : y::Metin("boş"); })()`, t: METIN };
          const adi = v.t.k === 'liste' ? 'liste' : v.t.k === 'dizi' ? 'dizi' : tipAdi(v.t);
          return { c: cMetin(adi), t: METIN };
        }
        case 'ornegimi': {
          sayi(2, 2);
          const v = A(0);
          const c = args[1];
          const r = c.tur === 'ad' ? this.bul(k, c.ad) : null;
          if (!r || r.tur !== 'sem' || r.s.tur !== 'sinif') this.hata("ÖrneğiMi'nin ikinci argümanı sınıf olmalı", n);
          if (v.t.k !== 'sinif' || v.t.s.kayit) return { c: 'false', t: MANT };
          return { c: `([&](){ auto o_ = ${v.c}; return o_ && o_->turu_mu_(${(r.s.sinif as any).no}); })()`, t: MANT };
        }
        case 'uzunluk': {
          sayi(1, 1);
          const v = A(0);
          if (v.t.k === 'metin') return { c: `y::uzunluk(${v.c})`, t: TAM };
          if (v.t.k === 'liste' || v.t.k === 'dizi' || v.t.k === 'sozluk') return { c: `(${v.c}).uz()`, t: TAM };
          if (v.t.k === 'tensor') return { c: `(y::Tam)((${v.c}).sekil.empty() ? 1 : (${v.c}).sekil[0])`, t: TAM };
          this.hata(`Uzunluk tanımsız: ${tipAdi(v.t)}`, n);
        }
        case 'ekle': sayi(2, 2); { const l = A(0); if (l.t.k !== 'liste') this.hata('Ekle liste olmalı', n); return { c: `y::ekle(${l.c}, ${D(1, l.t.e, 'öğe')})`, t: YOK }; }
        case 'sil': sayi(2, 2); { const l = A(0); if (l.t.k === 'sozluk') return { c: `(${l.c}).sil(${D(1, l.t.a, 'anahtar')})`, t: YOK }; if (l.t.k !== 'liste') this.hata('Sil liste olmalı', n); return { c: `y::sil(${l.c}, ${D(1, TAM, 'dizin')})`, t: l.t.e }; }
        case 'araya': sayi(3, 3); { const l = A(0); if (l.t.k !== 'liste') this.hata('Araya liste olmalı', n); return { c: `y::araya(${l.c}, ${D(1, TAM, 'dizin')}, ${D(2, l.t.e, 'öğe')})`, t: YOK }; }
        case 'aralik': {
          sayi(1, 3);
          if (args.length === 1) return { c: `y::aralik(0, ${D(0, TAM)}, 1)`, t: liste(TAM) };
          return { c: `y::aralik(${D(0, TAM)}, ${D(1, TAM)}, ${args.length > 2 ? D(2, TAM) : '1'})`, t: liste(TAM) };
        }
        case 'esle': {
          sayi(2, 2);
          const l = lst(0);
          const f = A(1, fonkBek([l.t.k === 'liste' || l.t.k === 'dizi' ? (l.t as any).e : TAM], YOK));
          if (f.t.k !== 'fonk' || f.t.d.k === 'yok') this.hata("Eşle'nin ikinci argümanı değer döndüren bir fonksiyon olmalı", n);
          return { c: `y::esle(${l.t.k === 'dizi' ? `y::Liste<${cppTip((l.t as any).e)}>(${l.c}.v())` : l.c}, ${f.c})`, t: liste(f.t.d) };
        }
        case 'suz': {
          sayi(2, 2);
          const l = lst(0); const e = (l.t as any).e;
          const f = A(1, fonkBek([e], MANT));
          if (f.t.k !== 'fonk' || f.t.d.k !== 'mant') this.hata("Süz'ün ikinci argümanı mantıksal döndüren bir fonksiyon olmalı", n);
          return { c: `y::suz(${l.c}, ${f.c})`, t: l.t };
        }
        case 'indirge': {
          sayi(2, 3);
          const l = lst(0); const e = (l.t as any).e as Tip;
          if (args.length === 3) {
            const b = A(2);
            const f = A(1, fonkBek([b.t, e], b.t));
            if (f.t.k !== 'fonk') this.hata("İndirge'nin ikinci argümanı fonksiyon olmalı", n);
            return { c: `y::indirge(${l.c}, ${f.c}, ${this.donustur(b, f.t.d, 'başlangıç', n)})`, t: f.t.d };
          }
          const f = A(1, fonkBek([e, e], e));
          if (f.t.k !== 'fonk') this.hata("İndirge'nin ikinci argümanı fonksiyon olmalı", n);
          return { c: `y::indirge(${l.c}, ${f.c})`, t: e };
        }
        case 'sirala': {
          sayi(1, 3);
          const l = lst(0); const e = (l.t as any).e as Tip;
          const ters = args.length > 2 ? D(2, MANT, 'ters') : 'false';
          if (args.length > 1 && !(args[1].tur === 'sabitdeger' && args[1].deger === null)) {
            const f = A(1, fonkBek([e], TAM));
            if (f.t.k !== 'fonk') this.hata("Sırala'nın anahtarı bir fonksiyon olmalı", n);
            return { c: `y::sirala_anahtar(${l.c}, ${f.c}, ${ters})`, t: liste(e) };
          }
          return { c: `y::sirala(${l.c}, ${ters})`, t: liste(e) };
        }
        case 'ters': {
          sayi(1, 1);
          const v = A(0);
          if (v.t.k === 'metin') return { c: `y::ters(${v.c})`, t: METIN };
          if (v.t.k === 'liste') return { c: `y::ters(${v.c})`, t: v.t };
          this.hata('Ters liste ya da metin bekler', n);
        }
        case 'toplam': {
          sayi(1, 1);
          const v = A(0);
          if (v.t.k === 'tensor') return { c: `y::toplam(${v.c})`, t: TENSOR };
          if ((v.t.k === 'liste' || v.t.k === 'dizi') && sayiMi(v.t.e)) return { c: `y::toplam(${v.c})`, t: v.t.e };
          this.hata('Toplam sayı listesi bekler', n);
        }
        case 'maks': case 'min': {
          sayi(1, 99);
          const fn = ad === 'maks' ? 'maks' : 'minimum';
          if (args.length === 1) {
            const v = A(0);
            if (v.t.k === 'tensor') return { c: `y::${fn}(${v.c})`, t: OND };
            if (v.t.k !== 'liste') this.hata(`${ad === 'maks' ? 'Maks' : 'Min'} liste ya da birden çok değer bekler`, n);
            return { c: `y::${fn}(${v.c})`, t: v.t.e };
          }
          const es = args.map((_, i) => A(i));
          let t = es[0].t; for (const e of es.slice(1)) t = this.ortakTip(t, e.t, n);
          let c = this.donustur(es[0], t, ad, n);
          for (const e of es.slice(1)) c = `y::${fn}2<${cppTip(t)}>(${c}, ${this.donustur(e, t, ad, n)})`;
          return { c, t };
        }
        case 'dilim': {
          sayi(2, 3);
          const l = A(0);
          if (l.t.k === 'metin') return { c: `y::alt_metin(${l.c}, ${D(1, TAM)} + 1${args.length > 2 ? `, ${D(2, TAM)} - (${D(1, TAM)}), true` : ''})`, t: METIN };
          if (l.t.k !== 'liste') this.hata('Dilim liste veya metin bekler', n);
          return { c: `y::dilim(${l.c}, ${D(1, TAM)}, ${args.length > 2 ? D(2, TAM) : '0'}, ${args.length > 2})`, t: l.t };
        }
        case 'anahtarlar': case 'degerler': {
          sayi(1, 1);
          const v = A(0);
          if (v.t.k !== 'sozluk') this.hata(`'${ad}' sözlük bekler`, n);
          return { c: `y::${ad}(${v.c})`, t: liste(ad === 'anahtarlar' ? v.t.a : v.t.d) };
        }
        case 'say': { sayi(1, 1); const l = lst(0); return { c: `y::say(${l.c})`, t: { k: 'sozluk', a: (l.t as any).e, d: TAM } }; }
        case 'benzersiz': { sayi(1, 1); const l = lst(0); return { c: `y::benzersiz(${l.c})`, t: l.t }; }
        case 'kopya': {
          sayi(1, 1);
          const v = A(0);
          if (v.t.k === 'liste' || v.t.k === 'sozluk') return { c: `y::kopya(${v.c})`, t: v.t };
          if (v.t.k === 'tensor') return { c: `y::tensor(${v.c})`, t: TENSOR };
          return v;
        }
        case 'icerir': {
          sayi(2, 2);
          const c = A(0);
          if (c.t.k === 'liste' || c.t.k === 'dizi') return { c: `y::icinde(${D(1, c.t.e, 'öğe')}, ${c.c})`, t: MANT };
          if (c.t.k === 'metin') return { c: `y::icinde(${D(1, METIN)}, ${c.c})`, t: MANT };
          if (c.t.k === 'sozluk') return { c: `(${c.c}).var(${D(1, c.t.a, 'anahtar')})`, t: MANT };
          this.hata('İçerir liste ya da metin bekler', n);
        }
        case 'altmetin': case 'kopyala': sayi(2, 3); return { c: `y::alt_metin(${D(0, METIN)}, ${D(1, TAM)}${args.length > 2 ? `, ${D(2, TAM)}, true` : ''})`, t: METIN };
        case 'konum': sayi(2, 2); return { c: `y::konum(${D(0, METIN)}, ${D(1, METIN)})`, t: TAM };
        case 'buyukharf': sayi(1, 1); return { c: `y::buyuk_harf(${D(0, METIN)})`, t: METIN };
        case 'kucukharf': sayi(1, 1); return { c: `y::kucuk_harf(${D(0, METIN)})`, t: METIN };
        case 'ayir': sayi(1, 2); return { c: `y::ayir(${D(0, METIN)}${args.length > 1 ? ', ' + D(1, METIN) : ''})`, t: liste(METIN) };
        case 'birlestir': sayi(1, 2); { const l = lst(0); return { c: `y::birlestir_metin(${l.t.k === 'dizi' ? `y::Liste<${cppTip((l.t as any).e)}>(${l.c}.v())` : l.c}${args.length > 1 ? ', ' + D(1, METIN) : ''})`, t: METIN }; }
        case 'kirp': sayi(1, 1); return { c: `y::kirp(${D(0, METIN)})`, t: METIN };
        case 'degistir': sayi(3, 3); return { c: `y::degistir(${D(0, METIN)}, ${D(1, METIN)}, ${D(2, METIN)})`, t: METIN };
        case 'bicimle': sayi(1, 99); return { c: `y::bicimle(${D(0, METIN, 'şablon')}${args.slice(1).map((_, i) => ', ' + A(i + 1).c).join('')})`, t: METIN };
        case 'sira': sayi(1, 1); return { c: `y::sira(${D(0, METIN)})`, t: TAM };
        case 'karakter': sayi(1, 1); return { c: `y::karakter(${D(0, TAM)})`, t: METIN };
        case 'harfmi': sayi(1, 1); return { c: `y::harf_mi(${D(0, METIN)})`, t: MANT };
        case 'rakammi': sayi(1, 1); return { c: `y::rakam_mi(${D(0, METIN)})`, t: MANT };
        case 'mutlak': { sayi(1, 1); const v = A(0); if (v.t.k === 'tensor') return { c: `y::mutlak(${v.c})`, t: TENSOR }; num(0); return { c: `y::mutlak(${v.c})`, t: v.t }; }
        case 'kare': { sayi(1, 1); const v = A(0); return this.ikiliTip('*', v, v, n); }
        case 'kok': { sayi(1, 1); const v = A(0); if (v.t.k === 'tensor') return { c: `y::kok(${v.c})`, t: TENSOR }; return { c: `y::kok(${O(num(0))})`, t: OND }; }
        case 'yuvarla': {
          sayi(1, 2);
          const v = num(0);
          if (args.length === 1) return { c: `y::yuvarla(${v.c})`, t: TAM };
          if (v.t.k === 'tam') return { c: v.c, t: TAM };
          return { c: `y::yuvarla(${v.c}, ${D(1, TAM)})`, t: OND };
        }
        case 'kes': sayi(1, 1); return { c: `y::kes(${num(0).c})`, t: TAM };
        case 'rastgele': {
          sayi(0, 2);
          if (!args.length) return { c: 'y::rastgele()', t: OND };
          if (args.length === 1) return { c: `y::rastgele(${D(0, TAM)})`, t: TAM };
          return { c: `y::rastgele(${D(0, TAM)}, ${D(1, TAM)})`, t: TAM };
        }
        case 'rastgelelestir': case 'tohum': sayi(ad === 'tohum' ? 1 : 0, 1); return { c: args.length ? `y::tohum(${D(0, TAM)})` : `y::tohum((y::Tam)y::hal_tohum())`, t: YOK };
        case 'artir': case 'azalt': {
          sayi(1, 2);
          const v = A(0);
          if (!v.lv || !sayiMi(v.t)) this.hata(`'${ad === 'artir' ? 'Artır' : 'Azalt'}' sayı değişkeni bekler`, n);
          if (args[0].tur === 'ad') { const r = this.bul(k, args[0].ad); if (r && r.tur === 'sem') this.yakalamaDenetle(k, r.s, n); }
          const m = args.length > 1 ? D(1, v.t) : '1';
          return { c: `(${v.c} ${ad === 'artir' ? '+=' : '-='} ${m})`, t: YOK };
        }
        case 'degis': {
          sayi(2, 2);
          const a = A(0), b = A(1);
          if (!a.lv || !b.lv || !ayni(a.t, b.t)) this.hata("'Değiş' aynı tipten iki değişken bekler", n);
          return { c: `std::swap(${a.c}, ${b.c})`, t: YOK };
        }
        case 'hata': sayi(1, 2); return { c: `y::HataN{${D(0, METIN, 'mesaj')}, ${args.length > 1 ? D(1, METIN, 'tür') : 'y::Metin("Hata")'}, 0}`, t: HATA };
        case 'iddia': sayi(1, 2); return { c: `y::iddia(${D(0, MANT, 'koşul')}${args.length > 1 ? ', y::metne(' + A(1).c + ')' : ''})`, t: YOK };
        case 'durdur': sayi(0, 1); return { c: `throw y::Dur{${args.length ? D(0, TAM) : '0'}}`, t: YOK };
        case 'liste': this.hata("'liste(...)' yerine tipli liste kullanın", n);
        case 'pi': return { c: 'y::Ond(M_PI)', t: OND };
        case 'e': return { c: 'y::Ond(M_E)', t: OND };
        case 'sonsuz': return { c: 'y::Ond(INFINITY)', t: OND };
      }
      if (birim === 'matematik') {
        const tekli: Record<string, [string, ((x: string) => string) | null]> = {
          sin: ['std::sin', null], cos: ['std::cos', null], tan: ['std::tan', null], arksin: ['std::asin', null], arkcos: ['std::acos', null],
          arktan: ['std::atan', null], ln: ['std::log', null], log10: ['std::log10', null], log2: ['std::log2', null], tanh: ['std::tanh', null],
        };
        const tensorKarsilik: Record<string, string> = { sin: 'sin', cos: 'cos', ln: 'log_', tanh: 'tanh_', ustel: 'ustel', sigmoid: 'sigmoid' };
        if (ad in tekli || ad === 'ustel' || ad === 'sigmoid' || ad === 'taban' || ad === 'tavan' || ad === 'faktoriyel') {
          sayi(1, 1);
          const v = A(0);
          if (v.t.k === 'tensor' && tensorKarsilik[ad]) return { c: `y::${tensorKarsilik[ad]}(${v.c})`, t: TENSOR };
          if (!sayiMi(v.t)) this.hata(`${ad} sayı olmalı`, n);
          const x = O(v);
          const tanim: Record<string, string> = { ln: '> 0', log10: '> 0', log2: '> 0' };
          const kontrol = (ifade: string) => {
            if (ad === 'arksin' || ad === 'arkcos') return `([&](){ y::Ond x_ = ${x}; if (x_ < -1 || x_ > 1) y::hata("'${ad === 'arksin' ? 'ArkSin' : 'ArkCos'}' bu değer için tanımsız: " + y::metne(x_)); return ${ifade.replace('X', 'x_')}; })()`;
            if (tanim[ad]) return `([&](){ y::Ond x_ = ${x}; if (!(x_ ${tanim[ad]})) y::hata("'${({ ln: 'Ln', log10: 'Log10', log2: 'Log2' } as any)[ad]}' bu değer için tanımsız: " + y::metne(x_)); return ${ifade.replace('X', 'x_')}; })()`;
            return ifade.replace('X', x);
          };
          if (ad in tekli) return { c: kontrol(`y::Ond(${tekli[ad][0]}(X))`), t: OND };
          if (ad === 'ustel') return { c: `y::Ond(std::exp(std::min<y::Ond>(${x}, 709.0)))`, t: OND };
          if (ad === 'sigmoid') return { c: `([&](){ y::Ond x_ = ${x}; return x_ >= 0 ? 1 / (1 + std::exp(-x_)) : std::exp(x_) / (1 + std::exp(x_)); })()`, t: OND };
          if (ad === 'taban') return { c: `y::tamsayi(std::floor(y::taban_kontrol(${x}, "Taban")))`, t: TAM };
          if (ad === 'tavan') return { c: `y::tamsayi(std::ceil(y::taban_kontrol(${x}, "Tavan")))`, t: TAM };
          if (ad === 'faktoriyel') return { c: `([&](){ y::Tam n_ = y::tamsayi(${x}); if (n_ < 0) y::hata("'Faktöriyel' bu değer için tanımsız"); y::Tam r_ = 1; for (y::Tam i_ = 2; i_ <= n_; i_++) r_ *= i_; return r_; })()`, t: TAM };
        }
        switch (ad) {
          case 'us': sayi(2, 2); return this.ikiliTip('**', A(0), A(1), n);
          case 'arktan2': sayi(2, 2); return { c: `y::Ond(std::atan2(${O(num(0))}, ${O(num(1))}))`, t: OND };
          case 'ebob': sayi(2, 2); return { c: `([](y::Tam a_, y::Tam b_){ a_ = a_ < 0 ? -a_ : a_; b_ = b_ < 0 ? -b_ : b_; while (b_) { y::Tam t_ = a_ % b_; a_ = b_; b_ = t_; } return a_; })(${D(0, TAM)}, ${D(1, TAM)})`, t: TAM };
          case 'normal': sayi(0, 2); return { c: `y::Ond(y::rng().gauss(${args.length ? O(num(0)) : '0.0'}, ${args.length > 1 ? O(num(1)) : '1.0'}))`, t: OND };
        }
      }
    }
    if (birim === 'yz') {
      const tek = (f: string) => { sayi(1, 1); const v = A(0); return { c: `y::${f}(${v.t.k === 'tensor' ? v.c : this.tensorYap(v, n)})`, t: TENSOR }; };
      switch (ad) {
        case 'tensor': {
          sayi(1, 2);
          if (args.length > 1) this.uyarilar.push("Tensör(..., gradyan) gömülü sürümde yok sayılır (otomatik türev yok)");
          const lit = this.tensorLiteral(args[0]);
          if (lit) return { c: lit, t: TENSOR };
          return { c: this.tensorYap(A(0), n), t: TENSOR };
        }
        case 'sifirlar': case 'birler': sayi(1, 2); return { c: `y::${ad}(${D(0, TAM)}${args.length > 1 ? `, ${D(1, TAM)}, true` : ''})`, t: TENSOR };
        case 'rastgeletensor': {
          sayi(1, 3);
          const r = D(0, TAM), c = args.length > 1 && !(args[1].tur === 'sabitdeger' && args[1].deger === null) ? D(1, TAM) : null;
          const olcek = args.length > 2 ? O(num(2)) : '1.0';
          return { c: `([&](){ auto t_ = y::sifirlar(${r}${c ? `, ${c}, true` : ''}); for (auto& x_ : *t_.veri) x_ = (y::Ond)y::yz_rng().gauss(0.0, ${olcek}); return t_; })()`, t: TENSOR };
        }
        case 'tohum': sayi(1, 1); return { c: `y::tohum(${D(0, TAM)})`, t: YOK };
        case 'relu': return tek('relu');
        case 'sigmoid': return tek('sigmoid');
        case 'tanh': return tek('tanh_');
        case 'softmaks': return tek('softmaks');
        case 'ustel': return tek('ustel');
        case 'log': return tek('log_');
        case 'matcarp': sayi(2, 2); return { c: `y::matmul(${this.tensorYap(A(0), n)}, ${this.tensorYap(A(1), n)})`, t: TENSOR };
        case 'argmaks': sayi(1, 1); return { c: `y::argmaks(${this.tensorYap(A(0), n)})`, t: TAM };
      }
    }
    if (birim === 'donanim') {
      const dn = (f: string) => `y::donanim::${f}`;
      const sabitler: Record<string, [string, Tip]> = {
        giris: ['GIRIS', TAM], cikis: ['CIKIS', TAM], girisyukari: ['GIRIS_YUKARI', TAM], girisasagi: ['GIRIS_ASAGI', TAM],
        yukselen: ['YUKSELEN', TAM], dusen: ['DUSEN', TAM], degisen: ['DEGISEN', TAM], yerlesikled: ['YERLESIK_LED', TAM], benzetim: ['BENZETIM', MANT],
      };
      if (sabitler[ad]) return { c: dn(sabitler[ad][0]), t: sabitler[ad][1] };
      if (ad === 'yuksek') return { c: 'true', t: MANT };
      if (ad === 'dusuk') return { c: 'false', t: MANT };
      const islev = (i: number) => {
        const f = A(i, { k: 'fonk', p: [], d: YOK });
        if (f.t.k !== 'fonk' || f.t.p.length) this.hata("Kesme ve zamanlayıcılara parametresiz bir prosedür verilir: '@Prosedür' ya da 'prosedür başla ... bitir'", n);
        return f.c;
      };
      switch (ad) {
        case 'pinkipi': sayi(2, 2); return { c: `${dn('pin_kipi')}(${D(0, TAM, 'pin')}, ${D(1, TAM, 'kip')})`, t: YOK };
        case 'pinyaz': {
          sayi(2, 2);
          const v = A(1, MANT);
          const vc = v.t.k === 'tam' ? `(${v.c}) != 0` : this.donustur(v, MANT, 'değer', n);
          return { c: `${dn('pin_yaz')}(${D(0, TAM, 'pin')}, ${vc})`, t: YOK };
        }
        case 'pinoku': sayi(1, 1); return { c: `${dn('pin_oku')}(${D(0, TAM, 'pin')})`, t: MANT };
        case 'analogoku': sayi(1, 1); return { c: `${dn('analog_oku')}(${D(0, TAM, 'pin')})`, t: TAM };
        case 'pwmyaz': sayi(2, 2); return { c: `${dn('pwm_yaz')}(${D(0, TAM, 'pin')}, ${D(1, TAM, 'oran')})`, t: YOK };
        case 'bekle': sayi(1, 1); return { c: `${dn('bekle')}(${D(0, TAM, 'süre')})`, t: YOK };
        case 'beklemikro': sayi(1, 1); return { c: `${dn('bekle_mikro')}(${D(0, TAM, 'süre')})`, t: YOK };
        case 'milisaniye': sayi(0, 0); return { c: `${dn('milisaniye')}()`, t: TAM };
        case 'mikrosaniye': sayi(0, 0); return { c: `${dn('mikrosaniye')}()`, t: TAM };
        case 'kesmebagla': sayi(3, 3); return { c: `${dn('kesme_bagla')}(${D(0, TAM, 'pin')}, ${islev(1)}, ${D(2, TAM, 'tür')})`, t: YOK };
        case 'kesmecoz': sayi(1, 1); return { c: `${dn('kesme_coz')}(${D(0, TAM, 'pin')})`, t: YOK };
        case 'zamanlayicikur': sayi(2, 2); return { c: `${dn('zamanlayici_kur')}(${D(0, TAM, 'süre')}, ${islev(1)}, true)`, t: TAM };
        case 'zamanlayicitek': sayi(2, 2); return { c: `${dn('zamanlayici_kur')}(${D(0, TAM, 'süre')}, ${islev(1)}, false)`, t: TAM };
        case 'zamanlayicidurdur': sayi(1, 1); return { c: `${dn('zamanlayici_durdur')}(${D(0, TAM)})`, t: YOK };
        case 'seribaslat': sayi(1, 1); return { c: `${dn('seri_baslat')}(${D(0, TAM, 'hız')})`, t: YOK };
        case 'serivarmi': sayi(0, 0); return { c: `${dn('seri_var')}()`, t: TAM };
        case 'seribaytoku': sayi(0, 0); return { c: `${dn('seri_bayt_oku')}()`, t: TAM };
        case 'seribaytyaz': sayi(1, 1); return { c: `${dn('seri_bayt_yaz')}(${D(0, TAM)})`, t: YOK };
        case 'i2cbaslat': sayi(2, 3); return { c: `${dn('i2c_baslat')}(${D(0, TAM, 'sda')}, ${D(1, TAM, 'scl')}, ${args.length > 2 ? D(2, TAM, 'hız') : '100000'})`, t: YOK };
        case 'i2cyaz': sayi(2, 2); return { c: `${dn('i2c_yaz')}(${D(0, TAM, 'adres')}, ${D(1, liste(TAM), 'veri')})`, t: TAM };
        case 'i2coku': sayi(2, 2); return { c: `${dn('i2c_oku')}(${D(0, TAM, 'adres')}, ${D(1, TAM, 'bayt sayısı')})`, t: liste(TAM) };
        case 'i2cyazoku': sayi(3, 3); return { c: `${dn('i2c_yaz_oku')}(${D(0, TAM, 'adres')}, ${D(1, liste(TAM), 'veri')}, ${D(2, TAM, 'bayt sayısı')})`, t: liste(TAM) };
        case 'spibaslat': sayi(3, 4); return { c: `${dn('spi_baslat')}(${D(0, TAM, 'sck')}, ${D(1, TAM, 'miso')}, ${D(2, TAM, 'mosi')}, ${args.length > 3 ? D(3, TAM, 'hız') : '1000000'})`, t: YOK };
        case 'spiaktar': sayi(1, 1); return { c: `${dn('spi_aktar')}(${D(0, TAM, 'bayt')})`, t: TAM };
      }
    }
    void otomatik; void bek;
    this.hata(`'${ad}' gömülü sürümde desteklenmiyor`, n);
  }

  donusturulebilir(v: E, n: Dugum) {
    if (!['tam', 'ond', 'metin', 'mant'].includes(v.t.k)) this.hata(`${tipAdi(v.t)} dönüştürülemez`, n);
  }
  tensorYap(v: E, n: Dugum): string {
    if (v.t.k === 'tensor') return v.c;
    if (sayiMi(v.t)) return `y::tensor(${v.t.k === 'tam' ? `y::Ond(${v.c})` : v.c})`;
    const e = v.t.k === 'liste' ? tc(v.t.e) : null;
    if (e && (sayiMi(e) || (e.k === 'liste' && sayiMi(e.e)))) return `y::tensor(${v.c})`;
    this.hata(`Tensöre çevrilemez: ${tipAdi(v.t)}`, n);
  }
  /** Tensör([[1, 2], [3, 4]]) → y::tensor_ham({...}, {2, 2}) */
  tensorLiteral(a: Dugum): string | null {
    const sayi = (d: Dugum): number | null => {
      if (d.tur === 'sabitdeger' && (typeof d.deger === 'bigint' || typeof d.deger === 'number')) return Number(d.deger);
      if (d.tur === 'tekli' && d.op === '-') { const v = sayi(d.ifade); return v === null ? null : -v; }
      return null;
    };
    if (a.tur !== 'liste') return null;
    const el: Dugum[] = a.elemanlar;
    if (!el.length) return null;
    if (el.every(e => sayi(e) !== null)) return `y::tensor_ham({${el.map(e => ondLit(sayi(e)!).replace(/^y::Ond\((.*)\)$/, '$1')).join(', ')}}, {${el.length}})`;
    if (el.every(e => e.tur === 'liste' && e.elemanlar.length === el[0].elemanlar.length && e.elemanlar.every((x: Dugum) => sayi(x) !== null))) {
      const v = el.flatMap(e => e.elemanlar.map((x: Dugum) => ondLit(sayi(x)!).replace(/^y::Ond\((.*)\)$/, '$1')));
      return `y::tensor_ham({${v.join(', ')}}, {${el.length}, ${el[0].elemanlar.length}})`;
    }
    return null;
  }
}

export function cppDerle(kaynak: string, dosya: string, sec: GomuluSecenekleri): GomuluCikti {
  return new CppUretici(sec).programDerle(kaynak, dosya);
}
