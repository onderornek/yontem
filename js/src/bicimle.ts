// Kod biçimlendirici: 'yontem bicimle'.
// Yalnızca boşluklara dokunur: girintiyi programın yapısına göre yeniden kurar (düzey başına 2 boşluk),
// satır sonu boşluklarını siler, art arda en çok iki boş satır bırakır ve dosyayı tek satır sonuyla
// bitirir. Sözcükler, satır bölünmeleri ve yorumlar değişmez. Sonuç yeniden sözcüklenir; sözcük dizisi
// öncekiyle birebir aynı değilse biçimlendirme uygulanmaz (programın anlamı değişemez).
import { sozcukle, Sozcuk } from './sozcuk';
import { Cozumleyici } from './cozumleyici';

const GIRINTI = 2;
const KAPATAN = new Set(['bitir', 'yakala', 'sonunda', 'degilse', 'uygulama']);

function genislik(bosluk: string): number {
  let g = 0;
  for (const c of bosluk) g += c === '\t' ? GIRINTI : 1;
  return g;
}

/** Her satır için: satır başı bir yorumun içinde mi? (sözcük konumlarıyla, sözcükleyicinin kurallarını izleyerek) */
function yorumIcindeBaslayanSatirlar(kaynak: string, sozcukler: Sozcuk[], satirBaslari: number[]): Set<number> {
  const metinBaslari = new Set<number>();
  for (const t of sozcukler) if (t.tip === 'METIN') metinBaslari.add(satirBaslari[t.satir - 1] + t.sutun - 1);
  const ic = new Set<number>();
  const n = kaynak.length;
  let i = 0, satir = 1;
  while (i < n) {
    const c = kaynak[i];
    if (c === '\n') { satir++; i++; continue; }
    if (metinBaslari.has(i)) {
      while (i < n && (kaynak[i] === "'" || kaynak[i] === '#' || kaynak[i] === '"')) {
        if (kaynak[i] === "'") {
          let j = i + 1;
          for (;;) { if (kaynak[j] === "'") { if (kaynak[j + 1] === "'") { j += 2; continue; } break; } j++; }
          i = j + 1;
        } else if (kaynak[i] === '"') {
          let j = i + 1;
          for (;;) { if (kaynak[j] === '\\') { j += 2; continue; } if (kaynak[j] === '"') break; j++; }
          i = j + 1;
        } else { i++; while (i < n && kaynak[i] >= '0' && kaynak[i] <= '9') i++; }
      }
      continue;
    }
    if (c === '{' || (c === '(' && kaynak[i + 1] === '*')) {
      const bitis = c === '{' ? '}' : '*)';
      const j = kaynak.indexOf(bitis, c === '(' ? i + 2 : i + 1);
      for (let k = i; k < j; k++) if (kaynak[k] === '\n') { satir++; ic.add(satir); }
      i = j + bitis.length;
      continue;
    }
    if (c === '/' && kaynak[i + 1] === '/') { const j = kaynak.indexOf('\n', i); i = j < 0 ? n : j; continue; }
    i++;
  }
  return ic;
}

export function bicimle(kaynakHam: string, dosya = '<girdi>'): string {
  const bom = kaynakHam.startsWith('﻿') ? '﻿' : '';
  const kaynak = kaynakHam.slice(bom.length).replace(/\r\n?/g, '\n');
  const sozcukler = sozcukle(kaynak, dosya);
  const c = new Cozumleyici(sozcukler, dosya);
  const satirlar = kaynak.split('\n');
  const eskiGirinti = (no: number) => genislik(/^[ \t]*/.exec(satirlar[no - 1] ?? '')![0]);
  c.bicim = { d: 0, kapali: 0, satir: new Map(), eski: eskiGirinti };
  c.dosyaCoz();                                   // sözdizimi hatası varsa burada fırlar
  const derinlik = c.bicim.satir;
  const satirBaslari: number[] = [0];
  for (const s of satirlar) satirBaslari.push(satirBaslari[satirBaslari.length - 1] + s.length + 1);
  const ilkSozcuk = new Map<number, Sozcuk>();
  for (const t of sozcukler) if (t.tip !== 'SON' && !ilkSozcuk.has(t.satir)) ilkSozcuk.set(t.satir, t);
  const yorumIci = yorumIcindeBaslayanSatirlar(kaynak, sozcukler, satirBaslari);

  // Bir yorum satırının hizalanacağı sonraki kod satırı
  const sonrakiKod = (no: number): number | null => {
    for (let k = no + 1; k <= satirlar.length; k++) if (ilkSozcuk.has(k) && !yorumIci.has(k)) return k;
    return null;
  };

  const cikti: string[] = [];
  let capaFarki = 0;          // son deyim satırının (yeni girinti - eski girinti) farkı: devam satırları onunla kayar
  let yorumFarki = 0;         // çok satırlı yorumun ilk satırının farkı: iç satırları onunla kayar
  for (let no = 1; no <= satirlar.length; no++) {
    const ham = satirlar[no - 1];
    const icerik = ham.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
    if (!icerik) { cikti.push(''); continue; }
    const eski = eskiGirinti(no);
    let yeni: number;
    if (yorumIci.has(no)) yeni = Math.max(0, eski + yorumFarki);
    else if (ilkSozcuk.has(no)) {
      if (derinlik.has(no)) { yeni = derinlik.get(no)! * GIRINTI; capaFarki = yeni - eski; }
      else yeni = Math.max(0, eski + capaFarki);
      yorumFarki = yeni - eski;
    } else {                  // yalnızca yorum içeren satır
      const k = sonrakiKod(no);
      if (k === null) yeni = 0;
      else if (!derinlik.has(k)) yeni = Math.max(0, eski + capaFarki);
      else {
        const t = ilkSozcuk.get(k)!;
        const kapatan = t.tip === 'AS' && KAPATAN.has(t.deger);
        yeni = (derinlik.get(k)! + (kapatan && eski > eskiGirinti(k) ? 1 : 0)) * GIRINTI;
      }
      yorumFarki = yeni - eski;
    }
    cikti.push(' '.repeat(yeni) + icerik);
  }

  // Boş satırlar: başta yok, art arda en çok iki, sonda tek satır sonu
  const son: string[] = [];
  let bos = 0;
  for (const s of cikti) {
    if (s === '') { bos++; if (bos > 2 || !son.length) continue; } else bos = 0;
    son.push(s);
  }
  while (son.length && son[son.length - 1] === '') son.pop();
  const sonuc = bom + son.join('\n') + '\n';

  // Güvenlik denetimi: sözcük dizisi değişmemeli
  const yeniSozcukler = sozcukle(sonuc.slice(bom.length), dosya);
  const ayni = yeniSozcukler.length === sozcukler.length && yeniSozcukler.every((t, k) => {
    const o = sozcukler[k];
    return t.tip === o.tip && typeof t.deger === typeof o.deger && String(t.deger) === String(o.deger) && t.ham === o.ham;
  });
  if (!ayni) throw new Error(`Biçimlendirici iç hatası: '${dosya}' biçimlendirilince sözcükler değişti; dosyaya dokunulmadı`);
  return sonuc;
}
