// Dil hizmeti: düzenleyiciler için çözümleme. Bir kaynak metninden tanıları (hata ve uyarılar), simgeleri,
// tamamlama önerilerini, imza ipuçlarını ve tanım konumlarını çıkarır. Düzenleyiciden bağımsızdır;
// LSP sunucusu (dil_sunucusu.ts) bu işlevleri JSON-RPC üzerinden sunar.
import { sozcukle, Sozcuk, katla } from './sozcuk';
import { Cozumleyici, Dugum } from './cozumleyici';
import { YontemHatasi, TipHatalari, Tani as TaniD } from './hatalar';
import { derle, yerelBirim } from './calistir';
import { Y } from './calisma/yerlesik';

export interface Tani { satir: number; sutun: number; uzunluk: number; mesaj: string; uyari: boolean }
export type SimgeTuru = 'program' | 'birim' | 'sabit' | 'degisken' | 'tip' | 'fonksiyon' | 'prosedur' | 'kurucu' | 'parametre' | 'alan';
export interface Simge {
  ad: string; ham: string; tur: SimgeTuru; satir: number; sutun: number; imza: string;
  dosya?: string; sinif?: string; bas?: number; son?: number; cocuklar: Simge[];
}
export interface BirimBilgisi { ad: string; ham: string; yerel: boolean; dosya?: string; uyeler: Map<string, { ham: string; imza: string; simge?: Simge }> }
export interface Analiz {
  tanilar: Tani[]; simgeler: Simge[]; birimler: BirimBilgisi[]; sozcukler: Sozcuk[]; gecerli: boolean; satirSayisi: number;
}
export type BirimBul = (ad: string, ham: string, kimden: string) => { yol: string; kaynak: string } | null;

export const ANAHTARLAR = ['program', 'birim', 'kullan', 'arayüz', 'uygulama', 'değişken', 'sabit', 'tip', 'prosedür', 'fonksiyon',
  'kurucu', 'başla', 'bitir', 'eğer', 'ise', 'değilse', 'iken', 'için', 'kadar', 'adımda', 'artan', 'azalan', 'her', 'içinde', 'içindeki', 'tekrarla',
  'dene', 'yakala', 'sonunda', 'fırlat', 'dön', 'çık', 'kır', 'devam', 'sınıf', 'kayıt', 'miras', 'kendi', 'doğru', 'yanlış', 'boş',
  've', 'veya', 'yada', 'değil', 'mod', 'böl', 'dizi', 'türünde', 'adım', 'kez', 'olana', 'dek', 'değerine', 'göre',
  'sanal', 'ezer', 'soyut', 'ileri', 'özel', 'genel', 'korumalı'];
const TIPLER = ['tamsayı', 'ondalık', 'gerçek', 'metin', 'karakter', 'mantıksal', 'liste', 'sözlük', 'tensör', 'herhangi', 'nesne', 'işlev'];
const BILINEN = new Set([...ANAHTARLAR, ...TIPLER, 'aşırı', 'statik', 'yayınlanmış', 'sonuç'].map(katla));

function tipMetni(t: any): string {
  if (!t) return '';
  if (t.tur === 'tip_dizi') return t.eleman ? tipMetni(t.eleman) + ' dizisi' : 'dizi';
  if (t.eleman) return tipMetni(t.eleman) + (t.ad === 'sozluk' ? ' sözlüğü' : ' listesi');
  return (t.modul ? t.modul + '.' : '') + (t.ham ?? t.ad ?? '');
}
function parametreMetni(params: Dugum[]): string {
  return params.map(p => (p.ref ? 'değişken ' : '') + p.ham + (p.tip ? ': ' + tipMetni(p.tip) : '') + (p.varsayilan ? ' = …' : '')).join('; ');
}
const CESIT: Record<string, [SimgeTuru, string]> = { fonksiyon: ['fonksiyon', 'fonksiyon'], prosedur: ['prosedur', 'prosedür'], kurucu: ['kurucu', 'kurucu'] };

/** Sözcük dizisinde, verilen satırdan başlayarak adı ilk geçtiği yeri bulur (bildirim konumu). */
function adKonumu(s: Sozcuk[], ad: string, satir: number): [number, number] {
  for (const t of s) if (t.satir >= satir && t.tip === 'AD' && t.deger === ad) return [t.satir, t.sutun];
  return [satir, 1];
}

function simgeleriTopla(agac: Dugum, s: Sozcuk[], dosya?: string): { simgeler: Simge[]; adlar: Set<string> } {
  const simgeler: Simge[] = [];
  const adlar = new Set<string>();
  const yeni = (ad: string, ham: string, tur: SimgeTuru, satir: number, imza: string): Simge => {
    const [st, su] = adKonumu(s, ad, satir);
    adlar.add(ad);
    return { ad, ham, tur, satir: st, sutun: su, imza, dosya, cocuklar: [] };
  };
  const bildirim = (b: Dugum, hedef: Simge[]) => {
    if (b.tur === 'sabit') hedef.push(yeni(b.ad, b.ham, 'sabit', b.satir, `sabit ${b.ham}${b.tip ? ': ' + tipMetni(b.tip) : ''}`));
    else if (b.tur === 'degisken') b.adlar.forEach((a: string, k: number) =>
      hedef.push(yeni(a, b.hamlar[k], 'degisken', b.satir, `değişken ${b.hamlar[k]}${b.tip ? ': ' + tipMetni(b.tip) : ''}`)));
    else if (b.tur === 'tipdef') {
      const tn = b.tanim;
      const sm = yeni(b.ad, b.ham, 'tip', b.satir, `tip ${b.ham} = ${tn.tur === 'sinif' ? 'sınıf' + (tn.ebeveyn ? `(${tn.ebeveyn})` : '') : tn.tur === 'kayit' ? 'kayıt' : tipMetni(tn)}`);
      if (tn.tur === 'sinif' || tn.tur === 'kayit') {
        for (const [ad, ham, tip] of tn.alanlar) sm.cocuklar.push(yeni(ad, ham, 'alan', tn.satir, `${b.ham}.${ham}${tip ? ': ' + tipMetni(tip) : ''}`));
        for (const m of tn.metodlar) altprogram(m, sm.cocuklar, b.ham);
      }
      hedef.push(sm);
    } else if (b.tur === 'altprogram') altprogram(b, hedef, null);
  };
  const altprogram = (b: Dugum, hedef: Simge[], sinifHam: string | null) => {
    const [tur, sozcuk] = CESIT[b.cesit];
    const tamAd = (sinifHam ?? b.sinif_adi ? (sinifHam ?? b.sinif_adi) + '.' : '') + b.ham;
    const sm = yeni(b.ad, b.ham, tur, b.satir, `${sozcuk} ${tamAd}${b.params.length ? `(${parametreMetni(b.params)})` : ''}${b.donus ? ': ' + tipMetni(b.donus) : ''}`);
    sm.sinif = b.sinif_adi ?? (sinifHam ? katla(sinifHam) : undefined);
    sm.bas = b.satir;
    for (const p of b.params) sm.cocuklar.push(yeni(p.ad, p.ham, 'parametre', p.satir, `parametre ${p.ham}${p.tip ? ': ' + tipMetni(p.tip) : ''}`));
    for (const y of b.yerel ?? []) bildirim(y, sm.cocuklar);
    if (b.govde) sm.son = b.govde.satir;                         // gövdenin 'başla' satırı; bitiş aşağıda hesaplanır
    hedef.push(sm);
  };
  const ust: Dugum[] = agac.tur === 'birim' ? [...(agac.arayuz ?? []), ...agac.uygulama] : agac.bildirimler;
  for (const b of ust) bildirim(b, simgeler);

  // İfade ve deyimlerin içinde tanımlanan adlar (döngü değişkenleri, adsız altprogram parametreleri, yakala değişkeni…)
  const gez = (d: any) => {
    if (!d || typeof d !== 'object') return;
    if (Array.isArray(d)) { for (const x of d) gez(x); return; }
    if (typeof d.tur === 'string') {
      if (d.tur === 'icin' || d.tur === 'her' || d.tur === 'ayni_anda') { adlar.add(d.ad); if (d.ad2) adlar.add(d.ad2); }
      else if (d.tur === 'param' || d.tur === 'sabit') adlar.add(d.ad);
      else if (d.tur === 'degisken' || d.tur === 'yerel_degisken') for (const a of d.adlar) adlar.add(a);
      else if (d.tur === 'dene' && d.yakala_ad) adlar.add(d.yakala_ad);
      else if (d.tur === 'tipdef' || d.tur === 'altprogram') adlar.add(d.ad);
    }
    for (const k of Object.keys(d)) if (k !== 'dosya') gez(d[k]);
  };
  gez(agac);
  if (agac.ad) adlar.add(katla(agac.ad));
  return { simgeler, adlar };
}

function birimleriTopla(agac: Dugum, yol: string, birimBul: BirimBul): BirimBilgisi[] {
  const out: BirimBilgisi[] = [];
  for (const [ham] of (agac.kullan ?? []) as [string, number][]) {
    const ad = katla(ham);
    const uyeler = new Map<string, { ham: string; imza: string; simge?: Simge }>();
    const yerel = yerelBirim(ad);
    if (yerel) {
      const gorunen = yerel.$ad ?? ham;
      for (const k of Object.keys(yerel)) {
        if (k.startsWith('$')) continue;
        const f = yerel[k];
        const hamAd = (f && f.$ad) || k;
        const n = f && typeof f === 'function' && typeof f.$n === 'number'
          ? (f.$min === f.$n ? `${f.$n}` : `${f.$min}..${f.$n >= 64 ? '…' : f.$n}`) + ' argüman' : 'değer';
        uyeler.set(k, { ham: hamAd, imza: `${gorunen}.${hamAd} — ${n}` });
      }
      out.push({ ad, ham: yerel.$ad ?? ham, yerel: true, uyeler });
      continue;
    }
    const b = birimBul(ad, ham, yol);
    if (b) {
      try {
        const s = sozcukle(b.kaynak, b.yol);
        const a = new Cozumleyici(s, b.yol).dosyaCoz();
        if (a.tur === 'birim') {
          const { simgeler } = simgeleriTopla({ ...a, uygulama: a.arayuz ? [] : a.uygulama }, s, b.yol);
          // Arayüzdeki bildirimlerin gövdesi 'uygulama'dadır: tanıma git oraya götürsün
          const govdeler = a.arayuz ? simgeleriTopla({ ...a, arayuz: [] }, s, b.yol).simgeler : [];
          for (const sm of simgeler) {
            const g = govdeler.find(x => x.ad === sm.ad && x.tur === sm.tur);
            uyeler.set(sm.ad, { ham: sm.ham, imza: sm.imza, simge: g ?? sm });
            for (const c of sm.cocuklar) if (sm.tur === 'tip') uyeler.set(c.ad, uyeler.get(c.ad) ?? { ham: c.ham, imza: c.imza, simge: c });
          }
        }
      } catch (e) { /* birimde sözdizimi hatası: derleme tanısı bunu zaten bildirir */ }
    }
    out.push({ ad, ham, yerel: false, dosya: b ? b.yol : undefined, uyeler });
  }
  return out;
}

function hataTanisi(e: any, yol: string, satirlar: string[]): Tani {
  const h = e instanceof YontemHatasi ? e : new YontemHatasi(String(e && e.message || e), 1, yol);
  const baskaDosya = h.dosya && h.dosya !== yol;
  const satir = baskaDosya ? 1 : Math.min(Math.max(h.satir ?? 1, 1), satirlar.length);
  const m = /sütun (\d+)\)$/.exec(h.mesaj);
  const metin = satirlar[satir - 1] ?? '';
  let sutun = !baskaDosya && m ? Number(m[1]) : metin.length - metin.trimStart().length + 1;
  if (sutun > metin.length) sutun = Math.max(1, metin.length);
  const kalan = metin.slice(sutun - 1);
  const sozcuk = /^[\p{L}\p{N}_]+|^\S/u.exec(kalan);
  const uzunluk = !baskaDosya && m ? Math.max(1, sozcuk ? sozcuk[0].length : 1) : Math.max(1, metin.trimEnd().length - sutun + 1);
  return { satir, sutun, uzunluk, mesaj: baskaDosya ? `${h.dosya}, satır ${h.satir}: ${h.mesaj}` : h.mesaj, uyari: false };
}

export function cozumle(kaynak: string, yol: string, birimBul: BirimBul, kati?: (dosya: string) => boolean): Analiz {
  const satirlar = kaynak.split('\n');
  const bos: Analiz = { tanilar: [], simgeler: [], birimler: [], sozcukler: [], gecerli: false, satirSayisi: satirlar.length };
  let sozcukler: Sozcuk[], agac: Dugum;
  try {
    sozcukler = sozcukle(kaynak, yol);
    agac = new Cozumleyici(sozcukler, yol).dosyaCoz();
  } catch (e) { bos.tanilar.push(hataTanisi(e, yol, satirlar)); return bos; }
  const tanilar: Tani[] = [];
  if (agac.tur !== 'birim') {
    const uyarilar: TaniD[] = [];
    try { derle(kaynak, yol, birimBul, undefined, kati, uyarilar); }
    catch (e) {
      // Katı kip: tip hatalarının hepsi gösterilir
      if (e instanceof TipHatalari) for (const t of e.tanilar) tanilar.push(hataTanisi(new YontemHatasi(t.mesaj, t.satir, t.dosya), yol, satirlar));
      else tanilar.push(hataTanisi(e, yol, satirlar));
    }
    // Derleyici uyarıları (gölgelenen adlar, argüman sayısı); tanımsız adları aşağıdaki tarama zaten gösterir
    for (const u of uyarilar) {
      if (u.dosya !== yol || /^Tanımsız /.test(u.mesaj)) continue;
      tanilar.push({ ...hataTanisi(new YontemHatasi(u.mesaj, u.satir, u.dosya), yol, satirlar), uyari: true });
    }
  }
  const { simgeler, adlar } = simgeleriTopla(agac, sozcukler, undefined);
  // Altprogram kapsamları: gövde, bir sonraki üst düzey bildirime ya da ana bloğa kadar sürer
  const baslar = simgeler.filter(s => s.bas).map(s => s.bas!).sort((a, b) => a - b);
  const anaBlok = agac.tur === 'birim' ? satirlar.length + 1 : agac.govde.satir;
  const kapsamla = (s: Simge) => {
    if (s.bas) { const sonraki = baslar.find(b => b > s.bas!); s.son = Math.min(sonraki ?? Infinity, anaBlok > s.bas ? anaBlok : Infinity, satirlar.length + 1) - 1; }
    for (const c of s.cocuklar) if (c.bas) c.son = c.bas;       // sınıf içindeki metod bildirimleri tek satırdır
  };
  simgeler.forEach(kapsamla);
  const birimler = birimleriTopla(agac, yol, birimBul);

  // Tanımsız ad uyarısı: dosyanın hiçbir yerinde, kullanılan birimlerde ve yerleşiklerde bulunmayan adlar.
  // Bilerek temkinlidir (dosyadaki tüm bildirimler her yerde geçerli sayılır); amaç yazım hatalarını yakalamaktır.
  const bilinen = new Set<string>(adlar);
  for (const b of birimler) { bilinen.add(b.ad); for (const k of b.uyeler.keys()) bilinen.add(k); }
  const tumBirimlerBilinir = birimler.every(b => b.yerel || b.uyeler.size > 0);
  if (!tanilar.some(t => !t.uyari) && tumBirimlerBilinir) {
    const gorulen = new Set<string>();
    sozcukler.forEach((t, i) => {
      if (t.tip !== 'AD' || BILINEN.has(t.deger) || bilinen.has(t.deger) || t.deger in Y) return;
      const once = sozcukler[i - 1], sonra = sozcukler[i + 1];
      if (once && once.tip === 'OP' && once.deger === '.') return;                     // üye erişimi: nesne.Ad
      if (sonra && sonra.tip === 'OP' && sonra.deger === ':') return;                  // etiket ya da adlandırılmış değer
      if (once && once.tip === 'AS' && (once.deger === 'program' || once.deger === 'birim' || once.deger === 'kullan')) return;
      if (gorulen.has(t.deger + ':' + t.satir)) return;
      gorulen.add(t.deger + ':' + t.satir);
      tanilar.push({ satir: t.satir, sutun: t.sutun, uzunluk: t.ham.length, mesaj: `'${t.ham}' tanımlı görünmüyor (yazım hatası olabilir)`, uyari: true });
    });
  }
  return { tanilar, simgeler, birimler, sozcukler, gecerli: true, satirSayisi: satirlar.length };
}

// ---------------------------------------------------------------- konuma göre sorgular
function sozcukBul(a: Analiz, satir: number, sutun: number): { t: Sozcuk; i: number } | null {
  for (let i = 0; i < a.sozcukler.length; i++) {
    const t = a.sozcukler[i];
    if (t.satir === satir && (t.tip === 'AD' || t.tip === 'AS') && sutun >= t.sutun && sutun <= t.sutun + t.ham.length) return { t, i };
  }
  return null;
}
function kapsamdakiler(a: Analiz, satir: number): Simge[] {
  const out: Simge[] = [];
  const ic = a.simgeler.find(s => s.bas && satir >= s.bas && satir <= (s.son ?? s.bas));
  if (ic) {
    out.push(...ic.cocuklar);
    if (ic.sinif) { const sn = a.simgeler.find(s => s.tur === 'tip' && s.ad === ic.sinif); if (sn) out.push(...sn.cocuklar); }
  }
  out.push(...a.simgeler);
  return out;
}
function simgeCoz(a: Analiz, satir: number, sutun: number): { simge?: Simge; imza?: string } | null {
  const b = sozcukBul(a, satir, sutun);
  if (!b || b.t.tip !== 'AD') return null;
  const ad = b.t.deger;
  const once = a.sozcukler[b.i - 1], once2 = a.sozcukler[b.i - 2];
  if (once && once.tip === 'OP' && once.deger === '.' && once2 && once2.tip === 'AD') {
    const birim = a.birimler.find(x => x.ad === once2.deger);
    if (birim) { const u = birim.uyeler.get(ad); return u ? { simge: u.simge, imza: u.imza } : null; }
    const sinif = a.simgeler.find(s => s.tur === 'tip' && s.ad === once2.deger);     // Sınıf.Metod(...) gövde başlığı ya da kurucu çağrısı
    const uye = (sinif ? [sinif] : a.simgeler.filter(s => s.tur === 'tip')).flatMap(s => s.cocuklar).find(c => c.ad === ad);
    if (uye) {
      const govde = a.simgeler.find(s => s.ad === ad && s.sinif && s.bas && (!sinif || s.sinif === sinif.ad));
      return { simge: govde ?? uye, imza: uye.imza };
    }
    return null;
  }
  const yerel = kapsamdakiler(a, satir).find(s => s.ad === ad);
  if (yerel) return { simge: yerel, imza: yerel.imza };
  const birimAdi = a.birimler.find(x => x.ad === ad);
  if (birimAdi) {                                   // birim adının kendisi: üyeleri listele, dosyasına git
    const uyeler = [...birimAdi.uyeler.values()].map(u => u.ham).sort((x, y) => x.localeCompare(y, 'tr'));
    const simge: Simge | undefined = birimAdi.dosya
      ? { ad, ham: birimAdi.ham, tur: 'birim', satir: 1, sutun: 1, imza: '', dosya: birimAdi.dosya, cocuklar: [] } : undefined;
    return { simge, imza: `birim ${birimAdi.ham}${birimAdi.yerel ? ' (yerleşik)' : ''} — ${uyeler.length} üye:\n${uyeler.join(', ')}` };
  }
  for (const birim of a.birimler) { const u = birim.uyeler.get(ad); if (u) return { simge: u.simge, imza: u.imza }; }
  const y = Y[ad];
  if (typeof y === 'function' && y.$ad) return { imza: `yerleşik ${y.$ad} — ${y.$min === y.$n ? y.$n : `${y.$min}..${y.$n >= 64 ? '…' : y.$n}`} argüman` };
  return null;
}

export function ustune(a: Analiz, satir: number, sutun: number): string | null {
  const r = simgeCoz(a, satir, sutun);
  return r && r.imza ? r.imza : null;
}
export function tanim(a: Analiz, satir: number, sutun: number): { dosya?: string; satir: number; sutun: number; uzunluk: number } | null {
  const r = simgeCoz(a, satir, sutun);
  if (!r || !r.simge) return null;
  return { dosya: r.simge.dosya, satir: r.simge.satir, sutun: r.simge.sutun, uzunluk: r.simge.tur === 'birim' ? 0 : r.simge.ham.length };
}

export interface Oneri { etiket: string; tur: 'anahtar' | 'tip' | 'yerlesik' | 'birim' | SimgeTuru; ayrinti: string }
export function tamamla(a: Analiz, satirMetni: string, satir: number): Oneri[] {
  const out = new Map<string, Oneri>();
  const ekle = (o: Oneri) => { const k = katla(o.etiket); if (!out.has(k)) out.set(k, o); };
  const nokta = /([\p{L}_][\p{L}\p{N}_]*)\.[\p{L}\p{N}_]*$/u.exec(satirMetni);
  if (nokta) {
    const birim = a.birimler.find(x => x.ad === katla(nokta[1]));
    if (birim) { for (const u of birim.uyeler.values()) ekle({ etiket: u.ham, tur: 'birim', ayrinti: u.imza }); return [...out.values()]; }
    for (const s of a.simgeler) if (s.tur === 'tip') for (const c of s.cocuklar) ekle({ etiket: c.ham, tur: c.tur, ayrinti: c.imza });
    return [...out.values()];
  }
  for (const s of kapsamdakiler(a, satir)) ekle({ etiket: s.ham, tur: s.tur, ayrinti: s.imza });
  for (const b of a.birimler) for (const u of b.uyeler.values()) ekle({ etiket: u.ham, tur: 'birim', ayrinti: u.imza });
  for (const k of Object.keys(Y)) { const f = Y[k]; if (f && f.$ad) ekle({ etiket: f.$ad, tur: 'yerlesik', ayrinti: 'yerleşik' }); }
  for (const t of TIPLER) ekle({ etiket: t, tur: 'tip', ayrinti: 'tip' });
  for (const k of ANAHTARLAR) ekle({ etiket: k, tur: 'anahtar', ayrinti: 'anahtar sözcük' });
  return [...out.values()];
}
