// Veritabanı birimi — SQL veritabanlarına tek bir arayüzle erişim.
//   Bağlan('sqlite:magaza.db') · Bağlan('sqlite::bellek:') · Bağlan('postgres://kullanıcı:parola@sunucu/vt') · Bağlan('mysql://…')
// Sorgular eşzamanlıdır ve her zaman parametrelidir: değerler SQL metnine eklenmez, '?' yer tutucularıyla verilir.
// Asıl bağlantıyı konak kurar (Node.js'te js/src/vt_dugum.ts); tarayıcıda veritabanı yoktur.
// Python sürümü (yontem_dil/veritabani.py) aynı arayüzü, aynı tip dönüşümlerini ve hata iletilerini sağlar.
import { $, hata, metne, katla } from './cekirdek';
import { fn, turAdi } from './deger';

const y = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any, oto = false) =>
  fn((...a: any[]) => {
    if (a.length < enAz || a.length > enCok) hata(`'${ad}' ${enAz === enCok ? enAz : `${enAz}..${enCok}`} argüman bekler, ${a.length} verildi`);
    return f(...a);
  }, ad, enCok, enAz, [], oto);

function iste(istek: any): any {
  const k = $.konak;
  if (!k || !k.veritabani) hata('Veritabanı birimi bu ortamda kullanılamaz (tarayıcıda veritabanı bağlantısı yoktur)');
  const r = k.veritabani(istek);
  if (r && r.hata !== undefined) hata(`Veritabanı hatası: ${r.hata}`);
  return r;
}

/** Adres → { tur, hedef }; parola içerebildiği için hata iletilerinde adresin kendisi yazılmaz */
export function adresCoz(adres: string): { tur: string; hedef: string } {
  const m = /^([a-zA-Z]+):(.*)$/s.exec(adres);
  if (!m) hata("Veritabanı adresi 'tür:hedef' biçiminde olmalı (ör. 'sqlite:veri.db', 'postgres://kullanıcı:parola@sunucu/veritabanı')");
  const t = m![1].toLowerCase();
  const tur = t === 'sqlite' ? 'sqlite' : (t === 'postgres' || t === 'postgresql') ? 'postgres' : (t === 'mysql' || t === 'mariadb') ? 'mysql' : null;
  if (!tur) hata(`Bilinmeyen veritabanı türü: '${m![1]}' (sqlite, postgres, mysql)`);
  if (tur === 'sqlite') {
    const h = m![2];
    if (!h) hata("SQLite için dosya adı gerekli: 'sqlite:veri.db' (bellekte geçici veritabanı için 'sqlite::bellek:')");
    return { tur: tur!, hedef: h === ':bellek:' || h === ':memory:' ? ':memory:' : h };
  }
  if (!m![2].startsWith('//')) hata(`Adres '${t}://kullanıcı:parola@sunucu/veritabanı' biçiminde olmalı`);
  return { tur: tur!, hedef: adres };
}

function parametreler(v: any, ad: string): any[] {
  if (v === null || v === undefined) return [];
  if (!Array.isArray(v)) hata(`'${ad}': parametreler liste olmalı, ${turAdi(v)} verildi`);
  return v.map((x: any, i: number) => {
    const t = typeof x;
    if (x === null || t === 'bigint' || t === 'number' || t === 'string' || t === 'boolean') return x;
    return hata(`'${ad}': ${i + 1}. parametre ${turAdi(x)} olamaz (tamsayı, ondalık, metin, mantıksal ya da boş olmalı)`);
  });
}
function sqlMetni(v: any, ad: string): string {
  if (typeof v !== 'string') hata(`'${ad}' SQL metni bekler, ${turAdi(v)} verildi`);
  if (!v.trim()) hata(`'${ad}': SQL metni boş`);
  return v;
}

export class Baglanti {
  static TUR_ADI = 'Bağlantı';
  acik = true;
  constructor(public kimlik: number, public tur: string) {}
  private calistir(ad: string, sql: any, p: any): { satirlar: [string, any][][]; etkilenen: number } {
    if (!this.acik) hata('Bağlantı kapalı');
    return iste({ islem: 'calistir', kimlik: this.kimlik, sql: sqlMetni(sql, ad), p: parametreler(p, ad) });
  }
  kAl(ad: string): any {
    switch (ad) {
      case 'tur': return this.tur;
      case 'acik': return this.acik;
      case 'calistir': return y('Çalıştır', 1, 2, (sql, p = null) => BigInt(this.calistir('Çalıştır', sql, p).etkilenen));
      case 'sorgula': return y('Sorgula', 1, 2, (sql, p = null) => this.calistir('Sorgula', sql, p).satirlar.map(s => new Map<string, any>(s)));
      case 'teksatir': return y('TekSatır', 1, 2, (sql, p = null) => { const s = this.calistir('TekSatır', sql, p).satirlar; return s.length ? new Map<string, any>(s[0]) : null; });
      case 'tekdeger': return y('TekDeğer', 1, 2, (sql, p = null) => { const s = this.calistir('TekDeğer', sql, p).satirlar; return s.length && s[0].length ? s[0][0][1] : null; });
      case 'sonkimlik': return y('SonKimlik', 0, 0, () => { if (!this.acik) hata('Bağlantı kapalı'); return iste({ islem: 'sonkimlik', kimlik: this.kimlik }).deger; }, true);
      case 'islembaslat': return y('İşlemBaşlat', 0, 0, () => { this.calistir('İşlemBaşlat', this.tur === 'mysql' ? 'START TRANSACTION' : 'BEGIN', null); return null; }, true);
      case 'onayla': return y('Onayla', 0, 0, () => { this.calistir('Onayla', 'COMMIT', null); return null; }, true);
      case 'gerial': return y('GeriAl', 0, 0, () => { this.calistir('GeriAl', 'ROLLBACK', null); return null; }, true);
      case 'kapat': return y('Kapat', 0, 0, () => { if (this.acik) { this.acik = false; iste({ islem: 'kapat', kimlik: this.kimlik }); } return null; }, true);
    }
    hata(`Bağlantı nesnesinde '${ad}' üyesi yok`);
  }
  kAta(ad: string, _v: any) { hata(`Bağlantı nesnesinin '${ad}' üyesine atama yapılamaz`); }
  toString() { return `Bağlantı(${this.tur}${this.acik ? '' : ', kapalı'})`; }
}

function veritabaniModulu(): Record<string, any> {
  const U: Record<string, any> = { $ad: 'Veritabanı' };
  const uye = (ad: string, enAz: number, enCok: number, f: (...a: any[]) => any) => { U[katla(ad)] = y(ad, enAz, enCok, f); };
  uye('Bağlan', 1, 1, (adres) => {
    if (typeof adres !== 'string') hata(`'Bağlan' metin bekler, ${turAdi(adres)} verildi`);
    const a = adresCoz(adres);
    const r = iste({ islem: 'baglan', tur: a.tur, hedef: a.hedef });
    return new Baglanti(r.kimlik, a.tur);
  });
  // Tablo ve sütun adları parametre olamaz; bu işlev bir adı güvenle SQL'e koymak için denetler ve tırnaklar
  uye('SqlAdı', 1, 1, (ad) => {
    const s = metne(ad);
    if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(s) || s.length > 63) hata(`Geçersiz tablo ya da sütun adı: '${s}' (harfle başlamalı; harf, rakam ve alt çizgi içerebilir)`);
    return '"' + s + '"';
  });
  return U;
}

for (const ad of ['veritabani', 'vt', 'database', 'db']) $.yerelBirimler.set(ad, veritabaniModulu);
