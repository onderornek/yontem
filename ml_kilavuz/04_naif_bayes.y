program NaifBayes
{ E-postaları 'istenmeyen' ya da 'normal' diye sınıflandırır.
  Bayes kuralı: P(sınıf | sözcükler) ∝ P(sınıf) × Π P(sözcük | sınıf)
  "Naif" varsayım: sözcükler, sınıf bilindiğinde birbirinden bağımsızdır. }
kullan Matematik

değişken
  metinler, sınıflar, sınıfAdları, denemeler: metin dizisi
  sayım: sözlük            { sınıf → (sözcük → kaç kez) }
  belgeSayısı, toplamSözcük: sözlük
  sözlükçe: sözlük         { görülen tüm farklı sözcükler }
  i: tamsayı
  s, c: metin

fonksiyon Sözcükler(m: metin): metin dizisi
başla
  sonuç := KüçükHarf(m).Ayır
bitir

fonksiyon Puan(m: metin; sınıfAdı: metin): ondalık
değişken
  w: metin
  p: ondalık
  sayaç: sözlük
başla
  { Olasılıkları çarpmak yerine logaritmalarını topluyoruz: küçük sayılar sıfıra yuvarlanmasın }
  p := Ln(belgeSayısı[sınıfAdı] / Uzunluk(metinler))
  sayaç := sayım[sınıfAdı]
  Sözcükler(m) içindeki her w için
    { Laplace düzeltmesi (+1): hiç görülmemiş sözcük olasılığı sıfırlamasın }
    p := p + Ln((sayaç.Al(w, 0) + 1) / (toplamSözcük[sınıfAdı] + Uzunluk(sözlükçe)))
  sonuç := p
bitir

başla
  metinler := ['bedava para kazan hemen tıkla', 'kazan büyük ödül bedava',
               'hemen tıkla indirim kampanya', 'toplantı yarın saat onda',
               'rapor ekte toplantı notları', 'yarın öğle yemeği var mı',
               'proje raporu yarın teslim']
  sınıflar := ['istenmeyen', 'istenmeyen', 'istenmeyen', 'normal', 'normal', 'normal', 'normal']
  sınıfAdları := ['istenmeyen', 'normal']
  sayım := [:]; belgeSayısı := [:]; toplamSözcük := [:]; sözlükçe := [:]
  sınıfAdları içindeki her c için
  başla
    sayım[c] := [:]; belgeSayısı[c] := 0; toplamSözcük[c] := 0
  bitir

  { Eğitim: her sınıfta her sözcüğün kaç kez geçtiğini say }
  0'dan Uzunluk(metinler) - 1'e kadar her i için
  başla
    c := sınıflar[i]
    belgeSayısı[c] := belgeSayısı[c] + 1
    Sözcükler(metinler[i]) içindeki her s için
    başla
      sayım[c][s] := sayım[c].Al(s, 0) + 1
      toplamSözcük[c] := toplamSözcük[c] + 1
      sözlükçe[s] := 1
    bitir
  bitir
  yaz('Sözlükçe: ' + Uzunluk(sözlükçe) + ' farklı sözcük', 1)

  denemeler := ['bedava ödül kazan', 'yarın toplantı var', 'hemen rapor teslim', 'indirim kampanya yarın']
  denemeler içindeki her s için
    yaz(Biçimle('{:24} → {:10} (log puanlar: istenmeyen {:.2}, normal {:.2})', '"' + s + '"',
      eğer Puan(s, 'istenmeyen') > Puan(s, 'normal') ise 'istenmeyen' değilse 'normal',
      Puan(s, 'istenmeyen'), Puan(s, 'normal')), 1)
bitir.
