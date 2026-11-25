// Yöntem sözdizimi çözümleyici (özyinelemeli iniş). Python sürümünün birebir karşılığı.
import { SozdizimHatasi } from './hatalar';
import { Sozcuk, sozcukle } from './sozcuk';

const DIREKTIFLER = new Set(['sanal', 'ezer', 'soyut', 'ileri', 'asiri', 'statik']);
const GORUNURLUK = new Set(['ozel', 'genel', 'korumali', 'yayinlanmis']);
const ATAMA_OPLARI = [':=', '+=', '-=', '*=', '/='];
/** Düğüm bir tamsayı sabitiyse (-5 gibi işaretli olanlar dahil) değerini, değilse null döndürür. */
function sabitTam(d: any): bigint | null {
  if (d && d.tur === 'sabitdeger' && typeof d.deger === 'bigint') return d.deger;
  if (d && d.tur === 'tekli' && (d.op === '-' || d.op === '+')) {
    const v = sabitTam(d.ifade);
    return v === null ? null : d.op === '-' ? -v : v;
  }
  return null;
}

const DEYIM_ANAHTARLARI = new Set(['basla', 'eger', 'icin', 'her', 'iken', 'tekrarla', 'dene', 'firlat', 'don',
  'cik', 'kir', 'devam', 'degisken']);
const ILISKI_OPLARI = ['=', '<>', '<', '>', '<=', '>='];

export type Dugum = { tur: string; satir: number; [k: string]: any };
const N = (tur: string, satir: number, alanlar: Record<string, any> = {}): Dugum => ({ tur, satir, ...alanlar });

export class Cozumleyici {
  i = 0;
  /** Biçimlendirici için (js/src/bicimle.ts): doluysa her deyim/bildirim satırının girinti derinliği kaydedilir. */
  bicim: { d: number; kapali: number; satir: Map<number, number>; eski(satir: number): number } | null = null;
  constructor(private s: Sozcuk[], private dosya = '<girdi>') {}

  /** Sıradaki sözcük satırının ilk sözcüğüyse satırın derinliğini kaydeder (ilk kayıt geçerlidir). */
  private im(ek = 0, zorla = false) {
    const b = this.bicim;
    if (!b || b.kapali) return;
    const t = this.t;
    if (t.tip === 'SON' || (this.i > 0 && this.s[this.i - 1].satir >= t.satir)) return;
    if (zorla || !b.satir.has(t.satir)) b.satir.set(t.satir, b.d + ek);
  }
  private gir(n = 1) { if (this.bicim) this.bicim.d += n; }
  /** Sıradaki sözcük, verilen satırdan daha içeride mi yazılmış? (yazarın seçtiği düzeni korumak için) */
  private iceride(satir: number): boolean {
    const b = this.bicim;
    return b !== null && this.t.tip !== 'SON' && this.t.satir > satir && b.eski(this.t.satir) > b.eski(satir);
  }

  // ---------------------------------------------------------- yardımcılar
  get t(): Sozcuk { return this.s[this.i]; }
  bak(k = 1): Sozcuk { return this.s[Math.min(this.i + k, this.s.length - 1)]; }
  ilerle(): Sozcuk { const t = this.s[this.i]; if (t.tip !== 'SON') this.i++; return t; }
  asMi(...kel: string[]) { const t = this.t; return t.tip === 'AS' && kel.includes(t.deger); }
  opMu(...ops: string[]) { const t = this.t; return t.tip === 'OP' && ops.includes(t.deger); }
  adMi(...adlar: string[]) { const t = this.t; return t.tip === 'AD' && (!adlar.length || adlar.includes(t.deger)); }

  hata(msg: string, tok?: Sozcuk): never {
    tok = tok || this.t;
    if (tok.tip === 'AD' && tok.deger === 'son') msg += " — blokları kapatmak için 'son' yerine 'bitir' kullanın";
    else if (tok.tip === 'AD' && tok.deger === 'baslangic') msg += " — birim başlatma bölümü 'başla' ile başlar";
    else if (tok.tip === 'AD' && tok.deger === 'ki' && this.i > 0 && this.s[this.i - 1].deger === 'ta')
      msg += " — 'ta ki koşul' yerine 'koşul olana dek' yazın";
    else if (tok.tip === 'AD' && tok.deger === 'yap')
      msg += " — döngü başlıkları artık 'yap' ile bitmez (ör. 'x < 10 iken', '1'den 10'a kadar her i için')";
    throw new SozdizimHatasi(`${msg} ('${tok.ham}' bulundu, sütun ${tok.sutun})`, tok.satir, this.dosya);
  }

  satirSonuMu() { return this.i > 0 && this.t.satir > this.s[this.i - 1].satir; }
  ayirici() {
    if (this.opMu(';')) { this.ilerle(); return; }
    if (this.t.tip === 'SON' || this.satirSonuMu()) return;
    this.hata("';' ya da satır sonu bekleniyordu");
  }
  bekleAs(kel: string) { if (!this.asMi(kel)) this.hata(`'${kel}' bekleniyordu`); return this.ilerle(); }
  bekleOp(op: string) { if (!this.opMu(op)) this.hata(`'${op}' bekleniyordu`); return this.ilerle(); }
  bekleAd() {
    if (this.t.tip === 'AS') this.hata(`Tanımlayıcı bekleniyordu; '${this.t.ham}' bir anahtar sözcüktür ve ad olarak kullanılamaz`);
    if (this.t.tip !== 'AD') this.hata('Tanımlayıcı bekleniyordu');
    return this.ilerle();
  }

  // ---------------------------------------------------------- dosya
  dosyaCoz(): Dugum {
    if (this.asMi('birim')) return this.birimCoz();
    const satir = this.t.satir;
    let ad: string | null = null;
    if (this.asMi('program')) { this.im(); this.ilerle(); ad = this.bekleAd().ham; this.ayirici(); }
    const kullan = this.kullanCoz();
    const bildirimler = this.bildirimlerCoz();
    const govde = this.birlesikCoz();
    if (this.opMu('.')) this.ilerle();
    else if (this.t.tip !== 'SON') this.hata("Program sonunda 'bitir.' bekleniyordu");
    if (this.t.tip !== 'SON') this.hata("'bitir.' sonrasında beklenmeyen kod");
    const sinamalar = bildirimler.filter(b => b.sina !== undefined).map(b => ({ ad: b.ad, baslik: b.sina, satir: b.satir }));
    return N('program', satir, { ad, kullan, bildirimler, govde, sinamalar });
  }

  birimCoz(): Dugum {
    const satir = this.t.satir;
    this.im();
    this.bekleAs('birim');
    const ad = this.bekleAd().ham;
    this.ayirici();
    let kullan = this.kullanCoz();
    let arayuz: Dugum[] | null = null;
    let uyg = 0;
    if (this.asMi('arayuz')) {
      this.im();
      const as = this.ilerle().satir;
      const ai = this.iceride(as) ? 1 : 0;          // bölüm içeriği başlıktan içerideyse öyle kalır
      this.gir(ai);
      kullan = kullan.concat(this.kullanCoz());
      arayuz = this.bildirimlerCoz('arayuz');
      this.gir(-ai);
      this.im();
      const us = this.bekleAs('uygulama').satir;
      uyg = this.iceride(us) ? 1 : 0;
      this.gir(uyg);
      kullan = kullan.concat(this.kullanCoz());
    }
    const uygulama = this.bildirimlerCoz();
    this.gir(-uyg);
    let baslangic: Dugum[] = [];
    if (this.asMi('basla')) { this.im(); this.ilerle(); this.gir(); baslangic = this.deyimlerCoz(['bitir']); this.gir(-1); }
    this.im();
    this.bekleAs('bitir');
    if (this.opMu('.')) this.ilerle();
    return N('birim', satir, { ad, kullan, arayuz, uygulama, baslangic });
  }

  kullanCoz(): [string, number][] {
    const lst: [string, number][] = [];
    while (this.asMi('kullan')) {
      this.im();
      this.ilerle();
      for (;;) {
        const tok = this.bekleAd();
        lst.push([tok.ham, tok.satir]);
        if (this.opMu(',')) { this.ilerle(); continue; }
        break;
      }
      this.ayirici();
    }
    return lst;
  }

  // ---------------------------------------------------------- bildirimler
  bildirimlerCoz(baglam = 'normal'): Dugum[] {
    const lst: Dugum[] = [];
    for (;;) {
      if (this.asMi('sabit')) {
        this.im();
        this.ilerle();
        const alt = this.satirSonuMu();
        while (this.t.tip === 'AD') {
          if (alt) this.im(1);
          const tok = this.ilerle();
          let tip = null;
          if (this.opMu(':')) { this.ilerle(); tip = this.tipCoz(); }
          if (!this.opMu('=', ':=')) this.hata("Sabit için '=' bekleniyordu");
          this.ilerle();
          const ifade = this.ifade();
          this.ayirici();
          lst.push(N('sabit', tok.satir, { ad: tok.deger, ham: tok.ham, tip, ifade }));
        }
      } else if (this.asMi('degisken')) {
        this.im();
        this.ilerle();
        const alt = this.satirSonuMu();
        while (this.t.tip === 'AD') { if (alt) this.im(1); lst.push(this.degiskenGrubu()); this.ayirici(); }
      } else if (this.asMi('tip')) {
        this.im();
        this.ilerle();
        const alt = this.satirSonuMu();
        while (this.t.tip === 'AD') {
          if (alt) this.im(1);
          const tok = this.ilerle();
          this.bekleOp('=');
          this.gir();
          const tanim = this.tipTanimiCoz();
          this.gir(-1);
          this.ayirici();
          lst.push(N('tipdef', tok.satir, { ad: tok.deger, ham: tok.ham, tanim }));
        }
      } else if (this.asMi('prosedur', 'fonksiyon', 'kurucu')) {
        lst.push(this.altprogramCoz(baglam));
      } else if (baglam === 'normal' && this.t.tip === 'AD' && this.t.deger === 'sina' && this.bak().tip === 'METIN') {
        lst.push(this.sinaCoz());
      } else return lst;
    }
  }

  degiskenGrubu(): Dugum {
    const satir = this.t.satir;
    const adlar = [this.bekleAd()];
    while (this.opMu(',')) { this.ilerle(); adlar.push(this.bekleAd()); }
    let tip = null, ilk = null;
    if (this.opMu(':')) { this.ilerle(); tip = this.tipCoz(); }
    if (this.opMu('=', ':=')) { this.ilerle(); ilk = this.ifade(); }
    if (tip === null && ilk === null) this.hata("Değişken için ':' tip veya ':=' ilk değer bekleniyordu");
    return N('degisken', satir, { adlar: adlar.map(a => a.deger), hamlar: adlar.map(a => a.ham), tip, ilk });
  }

  /** Tip: tamsayı · Birim.Ad · tamsayı dizisi · ondalık dizisi[1..3] · metin listesi · tamsayı sözlüğü · metin listesi dizisi */
  tipCoz(): Dugum {
    const satir = this.t.satir;
    const sinirlar = (): [Dugum | null, Dugum | null] => {
      if (!this.opMu('[') || this.satirSonuMu()) return [null, null];
      this.ilerle();
      const alt = this.ifade();
      this.bekleOp('..');
      const ust = this.ifade();
      this.bekleOp(']');
      this.hata("Köşeli ayraçla sınır yazımı ('dizisi[1..12]') kaldırıldı; tipi liste olarak bildirip boyutu programda verin: d: metin listesi … d.Uzunluk(12, 1)");
      return [alt, ust];
    };
    let tip: Dugum;
    if (this.asMi('dizi')) {
      // eleman tipi belirtilmemiş dizi: dizi · dizi[1..5]
      this.ilerle();
      const [alt, ust] = sinirlar();
      if (this.asMi('turunde')) this.hata("'dizi türünde tip' yazımı kaldırıldı; eleman tipini başa yazın: 'tamsayı dizisi'");
      tip = N('tip_dizi', satir, { alt, ust, eleman: null });
    } else {
      const tok = this.bekleAd();
      let modul = null, ad = tok.deger, ham = tok.ham;
      if (this.opMu('.')) {
        this.ilerle();
        const t2 = this.bekleAd();
        modul = tok.deger; ad = t2.deger; ham = t2.ham;
      }
      if (this.asMi('turunde')) this.hata(ad === 'sozluk'
        ? "'sözlük türünde tip' yazımı kaldırıldı; eleman tipini başa yazın: 'tamsayı sözlüğü'"
        : "'liste türünde tip' yazımı kaldırıldı; eleman tipini başa yazın: 'tamsayı listesi'");
      tip = N('tip_ad', satir, { ad, ham, modul, eleman: null });
    }
    // Eleman tipi başa yazılır, kap sona: 'tamsayı dizisi', 'metin listesi', 'tamsayı sözlüğü'. Ekler soldan sağa
    // birikir ('metin listesi dizisi' = metin listelerinin dizisi) ve tiple aynı satırda olmalıdır: sonraki
    // satırdaki 'listesi' bir değişken adı olabilir.
    while (this.t.tip === 'AD' && !this.satirSonuMu() && (this.t.deger === 'dizisi' || this.t.deger === 'listesi' || this.t.deger === 'sozlugu')) {
      const ek = this.ilerle().deger;
      if (ek === 'dizisi') { const [alt, ust] = sinirlar(); tip = N('tip_dizi', satir, { alt, ust, eleman: tip }); }
      else tip = N('tip_ad', satir, ek === 'listesi' ? { ad: 'liste', ham: 'liste', modul: null, eleman: tip } : { ad: 'sozluk', ham: 'sözlük', modul: null, eleman: tip });
    }
    return tip;
  }

  tipTanimiCoz(): Dugum {
    const satir = this.t.satir;
    if (this.asMi('sinif')) {
      this.ilerle();
      let ebeveyn = null;
      if (this.opMu('(')) { this.ilerle(); ebeveyn = this.bekleAd().deger; this.bekleOp(')'); }
      const [alanlar, metodlar] = this.uyelerCoz(true);
      this.im();
      this.bekleAs('bitir');
      return N('sinif', satir, { ebeveyn, alanlar, metodlar });
    }
    if (this.asMi('kayit')) {
      this.ilerle();
      const [alanlar, metodlar] = this.uyelerCoz(false);
      this.im();
      this.bekleAs('bitir');
      return N('kayit', satir, { ebeveyn: null, alanlar, metodlar });
    }
    return this.tipCoz();
  }

  uyelerCoz(sinif: boolean): [any[], Dugum[]] {
    const alanlar: any[] = [], metodlar: Dugum[] = [];
    while (!this.asMi('bitir')) {
      if (this.t.tip === 'SON') this.hata("Sınıf/kayıt tanımı 'bitir' ile kapanmalı");
      if (this.t.tip === 'AD' && GORUNURLUK.has(this.t.deger) && !(this.bak().deger === ':' || this.bak().deger === ',')) {
        this.im(); this.ilerle(); continue;
      }
      if (this.asMi('degisken')) { this.im(1); this.ilerle(); continue; }
      if (sinif && this.asMi('prosedur', 'fonksiyon', 'kurucu')) { this.gir(); metodlar.push(this.altprogramCoz('sinif')); this.gir(-1); continue; }
      this.im(1);
      const grup = this.degiskenGrubu();
      this.ayirici();
      grup.adlar.forEach((ad: string, k: number) => alanlar.push([ad, grup.hamlar[k], grup.tip, grup.ilk]));
    }
    return [alanlar, metodlar];
  }

  parametrelerCoz(): Dugum[] {
    const params: Dugum[] = [];
    this.bekleOp('(');
    if (this.opMu(')')) { this.ilerle(); return params; }
    for (;;) {
      let ref = false;
      if (this.asMi('degisken')) { this.ilerle(); ref = true; }
      else if (this.asMi('sabit')) this.ilerle();
      const adlar = [this.bekleAd()];
      while (this.opMu(',')) { this.ilerle(); adlar.push(this.bekleAd()); }
      let tip = null, varsayilan = null;
      if (this.opMu(':')) { this.ilerle(); tip = this.tipCoz(); }
      if (this.opMu('=', ':=')) { this.ilerle(); varsayilan = this.ifade(); }
      for (const a of adlar) params.push(N('param', a.satir, { ad: a.deger, ham: a.ham, tip, ref, varsayilan }));
      if (this.opMu(';', ',')) { this.ilerle(); continue; }
      break;
    }
    this.bekleOp(')');
    return params;
  }

  direktifMi() {
    return this.t.tip === 'AD' && DIREKTIFLER.has(this.t.deger) && !(this.bak().tip === 'OP' && (this.bak().deger === ':' || this.bak().deger === ','));
  }

  /** sına 'ad' [yerel bildirimler] başla … bitir — adlandırılmış test bloğu ('yontem sına' ve 'yontem test' çalıştırır).
   *  Gizli adlı, parametresiz bir prosedür olarak temsil edilir; programın normal çalışmasında çağrılmaz. */
  sinaSayaci = 0;
  sinaCoz(): Dugum {
    this.im();
    const tok = this.ilerle();
    const baslik = this.ilerle().deger as string;
    this.ayirici();
    const yerel = this.bildirimlerCoz('yerel');
    const govde = this.birlesikCoz();
    this.ayirici();
    const ad = `$sina${++this.sinaSayaci}`;
    return N('altprogram', tok.satir, { cesit: 'prosedur', ad, ham: `sına '${baslik}'`, sinif_adi: null, params: [], donus: null, direktifler: [], yerel, govde, sina: baslik });
  }

  altprogramCoz(baglam: string): Dugum {
    this.im();
    const tok = this.ilerle();
    const cesit = tok.deger;
    let adTok = this.bekleAd();
    let sinifAdi = null;
    if (this.opMu('.')) { this.ilerle(); sinifAdi = adTok.deger; adTok = this.bekleAd(); }
    const params = this.opMu('(') ? this.parametrelerCoz() : [];
    let donus = null;
    if (this.opMu(':')) { this.ilerle(); donus = this.tipCoz(); }
    if (!this.direktifMi()) this.ayirici();
    const direktifler: string[] = [];
    while (this.direktifMi()) { direktifler.push(this.ilerle().deger); this.ayirici(); }
    let govdeli = true;
    if (baglam === 'arayuz' || direktifler.includes('ileri') || direktifler.includes('soyut')) govdeli = false;
    else if (baglam === 'sinif') govdeli = this.asMi('basla', 'degisken', 'sabit');
    let yerel: Dugum[] = [], govde = null;
    if (govdeli) { yerel = this.bildirimlerCoz('yerel'); govde = this.birlesikCoz(); this.ayirici(); }
    return N('altprogram', tok.satir, { cesit, ad: adTok.deger, ham: adTok.ham, sinif_adi: sinifAdi, params, donus, direktifler, yerel, govde });
  }

  // ---------------------------------------------------------- deyimler
  birlesikCoz(): Dugum {
    this.im();
    const tok = this.bekleAs('basla');
    this.gir();
    const d = this.deyimlerCoz(['bitir']);
    this.gir(-1);
    this.im();
    this.bekleAs('bitir');
    return N('blok', tok.satir, { deyimler: d });
  }

  deyimlerCoz(bitis: string[]): Dugum[] {
    const lst: Dugum[] = [];
    for (;;) {
      while (this.opMu(';')) this.ilerle();
      if (this.asMi(...bitis) || this.t.tip === 'SON') return lst;
      lst.push(this.deyim());
      if (this.opMu(';')) continue;
      if (this.asMi(...bitis) || (this.t.tip as string) === 'SON') return lst;
      if (this.satirSonuMu()) continue;
      const onceki = this.s[this.i - 1];
      if (onceki.tip === 'AD' && onceki.deger === 'son') this.hata('Blok sonu bekleniyordu', onceki);
      this.hata("';' ya da satır sonu bekleniyordu");
    }
  }

  deyimVeyaBos(): Dugum {
    if (this.opMu(';') || this.asMi('degilse', 'bitir', 'yakala', 'sonunda')) return N('bos', this.t.satir);
    // Tek deyimlik gövde yeni satırdaysa bir düzey içeride; 'başla' başlıkla aynı hizada kalır
    const ic = this.bicim !== null && !this.asMi('basla') && this.satirSonuMu();
    if (ic) this.gir();
    const d = this.deyim();
    if (ic) this.gir(-1);
    return d;
  }

  deyim(): Dugum {
    this.im();
    const d = this._deyim();
    d.dosya = this.dosya;
    return d;
  }

  _deyim(): Dugum {
    const tok = this.t;
    const s = tok.satir;
    if (tok.tip === 'AS') {
      const k = tok.deger;
      if (k === 'basla') return this.birlesikCoz();
      if (k === 'eger') {
        const satirBasi = this.i === 0 || this.s[this.i - 1].satir < tok.satir;
        this.ilerle();
        const kosul = this.ifade();
        this.bekleAs('ise');
        const o = this.deyimVeyaBos();
        let d = null;
        if (this.opMu(';') && this.bak().tip === 'AS' && this.bak().deger === 'degilse') this.ilerle();
        if (this.asMi('degilse')) { if (satirBasi) this.im(); this.ilerle(); d = this.deyimVeyaBos(); }
        return N('eger', s, { kosul, o, degilse: d });
      }
      if (k === 'icin') this.hata("Sayaçlı döngü şöyle yazılır: 1'den 10'a kadar her i için");
      if (k === 'her') this.hata('Liste döngüsü şöyle yazılır: liste içindeki her eleman için');
      if (k === 'iken') this.hata('Koşullu döngüde koşul önce gelir: x < 10 iken');
      if (k === 'tekrarla') return this.tekrarlaCoz();
      if (k === 'dene') return this.deneCoz();
      if (k === 'firlat') { this.ilerle(); return N('firlat', s, { ifade: this.ifade() }); }
      if (k === 'don') {
        this.ilerle();
        let deger = null;
        if (!(this.opMu(';') || this.asMi('bitir', 'degilse', 'yakala', 'sonunda') || this.satirSonuMu() || this.t.tip === 'SON'))
          deger = this.ifade();
        return N('don', s, { ifade: deger });
      }
      if (k === 'cik') { this.ilerle(); return N('don', s, { ifade: null }); }
      if (k === 'kir') { this.ilerle(); return N('kir', s); }
      if (k === 'devam') { this.ilerle(); return N('devam', s); }
      if (k === 'degisken') {
        this.ilerle();
        const g = this.degiskenGrubu();
        g.tur = 'yerel_degisken';
        return g;
      }
    }
    return this.deyimIfadeden(this.ifade(), s);
  }

  deyimIfadeden(hedef: Dugum, s: number): Dugum {
    const t = this.t;
    if (t.tip === 'SONEK' && t.deger === 'ayrilma') {
      this.ilerle();
      const bit = this.ifade();
      if (!(this.t.tip === 'SONEK' && this.t.deger === 'yonelme')) this.hata("Bitiş değerinde yönelme eki bekleniyordu (ör. 10'a, n'e)");
      this.ilerle();
      // 1'den 10'a kadar            → birer birer; iki sınır da sabit sayıysa yön sınırlardan anlaşılır
      // a'dan b'ye adımda c artan   → c'şer artarak      a'dan b'ye adımda c azalan → c'şer azalarak
      let yon = 1, adim = null;
      if (this.asMi('kadar')) {
        this.ilerle();
        if (this.adMi('adim'))
          this.hata("'kadar adım …' yazımı kaldırıldı; şöyle yazın: 1'den 10'a adımda 2 artan her i için");
        const sb = sabitTam(hedef), se = sabitTam(bit);
        if (sb !== null && se !== null && sb > se) yon = -1;
      } else if (this.adMi('adimda')) {
        this.ilerle();
        adim = this.ifade();
        if (this.adMi('artan')) yon = 1;
        else if (this.adMi('azalan')) yon = -1;
        else this.hata("Adımdan sonra 'artan' ya da 'azalan' bekleniyordu (ör. 1'den 10'a adımda 2 artan her i için)");
        this.ilerle();
      } else if (this.asMi('azalarak')) {
        this.hata("'azalarak' yazımı kaldırıldı; şöyle yazın: n'den 1'e adımda 1 azalan her i için (iki sınır da sabit sayıysa: 10'dan 1'e kadar her i için)");
      } else this.hata("'kadar' ya da 'adımda' bekleniyordu (ör. 1'den 10'a kadar her i için)");
      this.bekleAs('her');
      const v = this.bekleAd();
      this.bekleAs('icin');
      return N('icin', s, { ad: v.deger, ham: v.ham, bas: hedef, bit, yon, adim, govde: this.deyimVeyaBos() });
    }
    if (t.tip === 'SONEK') this.hata('Burada ek beklenmiyordu');
    if (this.asMi('icindeki')) {
      this.ilerle();
      this.bekleAs('her');
      const v = this.bekleAd();
      let v2 = null;
      if (this.opMu(',')) { this.ilerle(); v2 = this.bekleAd().deger; }
      this.bekleAs('icin');
      return N('her', s, { ad: v.deger, ad2: v2, kaynak: hedef, govde: this.deyimVeyaBos() });
    }
    // L listesindeki 2. elemanı Sil   ≡   Sil(L, 2)   ≡   L.Sil(2)   ≡   L(2).Sil
    if (this.adMi('listesindeki') || this.adMi('dizisindeki')) {
      this.ilerle();
      const e = this.ifade();
      if (!(e.tur === 'alan' && (e.ad === 'elemani' || e.ad === 'elemanini')))
        this.hata("Konumdan sonra '. elemanı' bekleniyordu (ör. L listesindeki 2. elemanı Sil; hesaplanan konum ayraç içine yazılır: (i + 1). elemanı)");
      if (!this.adMi('sil')) this.hata("'Sil' bekleniyordu (ör. L listesindeki 2. elemanı Sil)");
      const st = this.ilerle();
      const cagrilan = N('ad', st.satir, { ad: 'sil', ham: st.ham });
      return N('cagri_deyim', s, { ifade: N('cagri', s, { cagrilan, argumanlar: [hedef, e.nesne] }) });
    }
    if (this.asMi('iken')) { this.ilerle(); return N('iken', s, { kosul: hedef, govde: this.deyimVeyaBos() }); }
    if (this.adMi('kez')) { this.ilerle(); this.bekleAs('tekrarla'); return N('kez', s, { sayi: hedef, govde: this.deyimVeyaBos() }); }
    if (this.adMi('degerine') && this.bak().tip === 'AD' && this.bak().deger === 'gore') return this.degerGoreCoz(hedef, s);
    if (this.adMi('olana')) this.hata("'olana dek' yalnızca 'tekrarla' döngüsünün sonunda kullanılır");
    if (hedef.tur === 'ad' && hedef.ad === 'sec') this.hata('Çok seçenekli karar şöyle yazılır: x değerine göre … bitir');
    if (this.opMu(...ATAMA_OPLARI)) {
      const op = this.ilerle().deger;
      if (!['ad', 'alan', 'indeks'].includes(hedef.tur)) this.hata('Atamanın sol tarafı değişken, alan ya da dizin olmalı');
      return N('atama', s, { hedef, op, deger: this.ifade() });
    }
    if (hedef.tur === 'ikili' && hedef.op === '=') throw new SozdizimHatasi("Atama için '=' değil ':=' kullanın", s, this.dosya);
    if (!['cagri', 'ad', 'alan', 'miras', 'boru'].includes(hedef.tur)) throw new SozdizimHatasi('Bu ifade tek başına deyim olamaz', s, this.dosya);
    return N('cagri_deyim', s, { ifade: hedef });
  }

  tekrarlaCoz(): Dugum {
    const s = this.ilerle().satir;
    const govde: Dugum[] = [];
    this.gir();
    for (;;) {
      while (this.opMu(';')) this.ilerle();
      if (this.t.tip === 'SON' || this.asMi('bitir')) this.hata("'tekrarla' döngüsü 'koşul olana dek' ile bitmeli");
      this.im();
      const tok = this.t;
      const ilkSozcuk = this.i;
      let d: Dugum;
      if (tok.tip === 'AS' && DEYIM_ANAHTARLARI.has(tok.deger)) d = this.deyim();
      else {
        const e = this.ifade();
        if (this.adMi('olana') && this.bak().tip === 'AD' && this.bak().deger === 'dek') {
          this.ilerle(); this.ilerle();
          this.gir(-1);
          if (this.bicim) { const simdi = this.i; this.i = ilkSozcuk; this.im(0, true); this.i = simdi; }   // 'koşul olana dek' satırı 'tekrarla' ile aynı hizada
          return N('tekrarla', s, { govde, kosul: e });
        }
        d = this.deyimIfadeden(e, tok.satir);
        d.dosya = this.dosya;
      }
      govde.push(d);
      if (this.opMu(';') || this.satirSonuMu()) continue;
      this.hata("';' ya da satır sonu bekleniyordu");
    }
  }

  degerGoreCoz(secici: Dugum, s: number): Dugum {
    this.ilerle(); this.ilerle();
    this.gir();
    const kollar: [any[], Dugum][] = [];
    let varsayilan: Dugum[] | null = null;
    for (;;) {
      while (this.opMu(';')) this.ilerle();
      if (this.asMi('bitir')) break;
      if (this.asMi('degilse')) {
        const etiketHizasi = this.iceride(s) ? 0 : -1;   // yazar 'değilse'yi etiketlerle mi, başlıkla mı hizalamış?
        this.im(etiketHizasi);
        this.ilerle();
        if (this.opMu(':')) this.ilerle();
        this.gir(1 + etiketHizasi);
        varsayilan = this.deyimlerCoz(['bitir']);
        this.gir(-1 - etiketHizasi);
        break;
      }
      this.im();
      const etiketler: [Dugum, Dugum | null][] = [];
      for (;;) {
        const a = this.ifade();
        if (this.opMu('..')) { this.ilerle(); etiketler.push([a, this.ifade()]); }
        else etiketler.push([a, null]);
        if (this.opMu(',')) { this.ilerle(); continue; }
        break;
      }
      this.bekleOp(':');
      kollar.push([etiketler, this.deyimVeyaBos()]);
      if (!(this.opMu(';') || this.asMi('bitir', 'degilse') || this.satirSonuMu())) this.hata("';' ya da satır sonu bekleniyordu");
    }
    this.gir(-1);
    this.im();
    this.bekleAs('bitir');
    return N('sec', s, { secici, kollar, varsayilan });
  }

  deneCoz(): Dugum {
    const s = this.ilerle().satir;
    this.gir();
    const govde = this.deyimlerCoz(['yakala', 'sonunda', 'bitir']);
    this.gir(-1);
    let yakalaAd = null, yakala = null, sonunda = null;
    if (this.asMi('yakala')) {
      this.im();
      this.ilerle();
      if (this.opMu('(')) { this.ilerle(); yakalaAd = this.bekleAd().deger; this.bekleOp(')'); }
      this.gir();
      yakala = this.deyimlerCoz(['sonunda', 'bitir']);
      this.gir(-1);
    }
    if (this.asMi('sonunda')) { this.im(); this.ilerle(); this.gir(); sonunda = this.deyimlerCoz(['bitir']); this.gir(-1); }
    this.im();
    this.bekleAs('bitir');
    return N('dene', s, { govde, yakala_ad: yakalaAd, yakala, sonunda });
  }

  // ---------------------------------------------------------- ifadeler
  ifade(): Dugum {
    let sol = this.veyaCoz();
    while (this.opMu('|>')) {
      const s = this.ilerle().satir;
      sol = N('boru', s, { sol, sag: this.veyaCoz() });
    }
    return sol;
  }
  veyaCoz(): Dugum {
    let sol = this.veCoz();
    while (this.asMi('veya', 'yada')) {
      const tok = this.ilerle();
      sol = N('mantik', tok.satir, { op: tok.deger, sol, sag: this.veCoz() });
    }
    return sol;
  }
  veCoz(): Dugum {
    let sol = this.degilCoz();
    while (this.asMi('ve')) {
      const tok = this.ilerle();
      sol = N('mantik', tok.satir, { op: 've', sol, sag: this.degilCoz() });
    }
    return sol;
  }
  degilCoz(): Dugum {
    if (this.asMi('degil')) { const tok = this.ilerle(); return N('tekli', tok.satir, { op: 'degil', ifade: this.degilCoz() }); }
    return this.iliskiCoz();
  }
  iliskiCoz(): Dugum {
    let sol = this.toplamaCoz();
    if (this.opMu(...ILISKI_OPLARI) || this.asMi('icinde')) {
      const tok = this.ilerle();
      sol = N('ikili', tok.satir, { op: tok.deger, sol, sag: this.toplamaCoz() });
    }
    return sol;
  }
  toplamaCoz(): Dugum {
    let sol = this.carpmaCoz();
    while (this.opMu('+', '-')) {
      const tok = this.ilerle();
      sol = N('ikili', tok.satir, { op: tok.deger, sol, sag: this.carpmaCoz() });
    }
    return sol;
  }
  carpmaCoz(): Dugum {
    let sol = this.tekliCoz();
    while (this.opMu('*', '/', '@') || this.asMi('bol', 'mod')) {
      const tok = this.ilerle();
      sol = N('ikili', tok.satir, { op: tok.deger, sol, sag: this.tekliCoz() });
    }
    return sol;
  }
  tekliCoz(): Dugum {
    if (this.opMu('-', '+')) { const tok = this.ilerle(); return N('tekli', tok.satir, { op: tok.deger, ifade: this.tekliCoz() }); }
    if (this.opMu('@')) { const tok = this.ilerle(); return N('ref', tok.satir, { ifade: this.sonekCoz() }); }
    const taban = this.sonekCoz();
    if (this.opMu('**')) { const tok = this.ilerle(); return N('ikili', tok.satir, { op: '**', sol: taban, sag: this.tekliCoz() }); }
    return taban;
  }
  argumanlarCoz(): Dugum[] {
    this.bekleOp('(');
    const args: Dugum[] = [];
    if (this.opMu(')')) { this.ilerle(); return args; }
    for (;;) {
      let a = this.ifade();
      if (this.opMu(':')) {
        this.ilerle();
        const gen = this.ifade();
        let hassas = null;
        if (this.opMu(':')) { this.ilerle(); hassas = this.ifade(); }
        a = N('bicim', a.satir, { ifade: a, genislik: gen, hassasiyet: hassas });
      }
      args.push(a);
      if (this.opMu(',')) { this.ilerle(); continue; }
      break;
    }
    this.bekleOp(')');
    return args;
  }
  sonekCoz(): Dugum {
    let e = this.birincilCoz();
    for (;;) {
      if (this.opMu('(', '[') && this.satirSonuMu()) return e;
      if (this.opMu('(')) {
        const s = this.t.satir;
        e = N('cagri', s, { cagrilan: e, argumanlar: this.argumanlarCoz() });
      } else if (this.opMu('[')) {
        const s = this.ilerle().satir;
        const idx = [this.ifade()];
        while (this.opMu(',')) { this.ilerle(); idx.push(this.ifade()); }
        this.bekleOp(']');
        e = N('indeks', s, { nesne: e, indeksler: idx });
      } else if (this.opMu('.') && (this.bak().tip === 'AD' || this.bak().tip === 'AS')) {
        const s = this.ilerle().satir;
        const tok = this.ilerle();
        e = N('alan', s, { nesne: e, ad: tok.deger, ham: tok.ham });
      } else return e;
    }
  }
  /** $'... {ifade:biçim} ...': her yerleştirilen ifade kendi başına sözcüklenip çözümlenir */
  bicimliMetin(tok: Sozcuk): Dugum {
    const parcalar = (tok.deger as any[]).map((p) => {
      if (typeof p === 'string') return p;
      let sozcukler: Sozcuk[];
      try { sozcukler = sozcukle(p.kaynak, this.dosya); }
      catch (e: any) { throw new SozdizimHatasi(`Biçimli metindeki '{${p.kaynak}}': ${String(e.mesaj ?? e.message).replace(/ \(sütun \d+\)$/, '')} (sütun ${p.sutun})`, p.satir, this.dosya); }
      for (const t of sozcukler) { t.satir = p.satir; t.sutun = p.sutun; }
      const c = new Cozumleyici(sozcukler, this.dosya);
      let ifade: Dugum;
      try { ifade = c.ifade(); }
      catch (e: any) { if (e instanceof SozdizimHatasi) e.mesaj = e.message = `Biçimli metindeki '{${p.kaynak}}': ${e.mesaj.replace("'<dosya sonu>'", 'ifadenin sonu')}`; throw e; }
      if (c.t.tip !== 'SON') c.hata(`Biçimli metindeki '{${p.kaynak}}' tek bir ifade olmalı`);
      return { ifade, ozel: p.ozel };
    });
    return N('bicimli_metin', tok.satir, { parcalar });
  }
  birincilCoz(): Dugum {
    const tok = this.t;
    const s = tok.satir;
    if (tok.tip === 'SAYI' || tok.tip === 'METIN') { this.ilerle(); return N('sabitdeger', s, { deger: tok.deger }); }
    if (tok.tip === 'BMETIN') { this.ilerle(); return this.bicimliMetin(tok); }
    if (tok.tip === 'AD') { this.ilerle(); return N('ad', s, { ad: tok.deger, ham: tok.ham }); }
    if (tok.tip === 'AS') {
      const k = tok.deger;
      if (k === 'dogru' || k === 'yanlis' || k === 'bos') {
        this.ilerle();
        return N('sabitdeger', s, { deger: k === 'dogru' ? true : k === 'yanlis' ? false : null });
      }
      if (k === 'kendi') { this.ilerle(); return N('kendi', s); }
      if (k === 'eger') {
        this.ilerle();
        const kosul = this.ifade();
        this.bekleAs('ise');
        const a = this.ifade();
        this.bekleAs('degilse');
        return N('kosullu', s, { kosul, a, b: this.ifade() });
      }
      if (k === 'miras') {
        this.ilerle();
        let ad = null;
        if (this.t.tip === 'AD') ad = this.ilerle().deger;
        return N('miras', s, { ad });
      }
      if (k === 'fonksiyon' || k === 'prosedur') {
        this.ilerle();
        const params = this.opMu('(') ? this.parametrelerCoz() : [];
        let donus = null;
        if (this.opMu(':')) { this.ilerle(); donus = this.tipCoz(); }
        if (this.opMu('=>')) { this.ilerle(); return N('lambda', s, { params, donus, ifade: this.ifade(), yerel: [], govde: null }); }
        if (this.bicim) this.bicim.kapali++;         // çok satırlı adsız altprogram: satırlar çapa satırıyla birlikte kayar
        const yerel = this.bildirimlerCoz('yerel');
        const govde = this.birlesikCoz();
        if (this.bicim) this.bicim.kapali--;
        return N('lambda', s, { params, donus, ifade: null, yerel, govde });
      }
    }
    if (tok.tip === 'OP') {
      if (tok.deger === '(') { this.ilerle(); const e = this.ifade(); this.bekleOp(')'); return e; }
      if (tok.deger === '[') return this.koleksiyonCoz();
    }
    this.hata('İfade bekleniyordu');
  }
  koleksiyonCoz(): Dugum {
    const s = this.ilerle().satir;
    if (this.opMu(']')) { this.ilerle(); return N('liste', s, { elemanlar: [] }); }
    if (this.opMu(':') && this.bak().tip === 'OP' && this.bak().deger === ']') { this.ilerle(); this.ilerle(); return N('sozluk', s, { ciftler: [] }); }
    const ilk = this.ifade();
    if (this.opMu(':')) {
      const ciftler: [Dugum, Dugum][] = [];
      this.ilerle();
      ciftler.push([ilk, this.ifade()]);
      while (this.opMu(',')) {
        this.ilerle();
        if (this.opMu(']')) break;
        const a = this.ifade();
        this.bekleOp(':');
        ciftler.push([a, this.ifade()]);
      }
      this.bekleOp(']');
      return N('sozluk', s, { ciftler });
    }
    if (this.opMu('..')) { this.ilerle(); const ust = this.ifade(); this.bekleOp(']'); return N('aralik_liste', s, { alt: ilk, ust }); }
    const elemanlar = [ilk];
    while (this.opMu(',')) {
      this.ilerle();
      if (this.opMu(']')) break;
      elemanlar.push(this.ifade());
    }
    this.bekleOp(']');
    return N('liste', s, { elemanlar });
  }
}

export function coz(kaynak: string, dosya = '<girdi>'): Dugum {
  return new Cozumleyici(sozcukle(kaynak, dosya), dosya).dosyaCoz();
}
