program SinirAğıylaİkiliModel
{ Aynı ikili modeli bu kez sinir ağıyla kuruyoruz. Saymak yerine bir ağırlık
  matrisi W öğreniriz:
     girdi   : önceki karakterin tek-sıcak vektörü x (30 sayı, biri 1, kalanı 0)
     logit   : x @ W        (30 puan, her olası sonraki karakter için bir tane)
     olasılık: softmaks(logit)
  Kayıp çapraz entropidir: doğru sonraki karaktere verilen olasılığın -log'u.
  x tek-sıcak olduğu için x @ W, W'nin bir satırını seçer; bu satıra o karakterin
  "gömmesi" (embedding) denir. Büyük dil modellerinin ilk katmanı tam olarak budur. }
kullan Atasozleri, DilAraclari, YZ

değişken
  veri, harfler: metin dizisi
  numara: sözlük
  girdiler, hedefler: tamsayı dizisi
  a, kar: metin
  i, j, n, önceki, adım: tamsayı
  X, W, kayıp, P: tensör
  opt: herhangi
  sözcük: metin

başla
  Tohum(42)
  veri := Atasozleri.Hepsi
  harfler := DilAraclari.Harfler
  n := Uzunluk(harfler)
  numara := DilAraclari.Numaralar(harfler)

  { Eğitim çiftleri: (önceki karakter, sonraki karakter) }
  girdiler := []; hedefler := []
  veri içindeki her a için
  başla
    önceki := 0
    (a + '.').Karakterler içindeki her kar için
    başla
      girdiler.Ekle(önceki); hedefler.Ekle(numara[kar]); önceki := numara[kar]
    bitir
  bitir
  yaz(Biçimle('{} eğitim çifti', Uzunluk(girdiler)), 1)

  X := BirSıcak(girdiler, n)                   { 5282 × 30 }
  W := RastgeleTensör(n, n, 0.1, doğru)        { öğrenilecek 900 ağırlık }
  opt := Adam([W], 0.1)
  1'den 300'e kadar her adım için
  başla
    opt.SıfırlaGrad
    kayıp := ÇaprazEntropi(X @ W, hedefler)
    kayıp.GeriYay
    opt.Adım
    eğer adım = 1 veya adım mod 50 = 0 ise
      yaz(Biçimle('Adım {:3}: kayıp {:.4}', adım, kayıp.Değer), 1)
  bitir

  yaz('', 1); yaz('Sinir ağının ürettiği "atasözleri":', 1)
  1'den 8'e kadar her j için
  başla
    sözcük := ''; i := 0
    tekrarla
      P := Softmaks(BirSıcak([i], n) @ W)       { 1 × 30 olasılık }
      i := DilAraclari.Örnekle(P.Satır(0).Veri)
      eğer i <> 0 ise sözcük := sözcük + harfler[i]
    i = 0 olana dek
    yaz('  ' + sözcük, 1)
  bitir
bitir.
