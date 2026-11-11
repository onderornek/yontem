birim DilAraclari
{ 2. ve 3. bölümde elle yazdığımız küçük yardımcılar; sonraki bölümler bunları kullanır. }
kullan Atasozleri

arayüz

fonksiyon Harfler: metin dizisi            { '.' + veri kümesindeki tüm karakterler }
fonksiyon Numaralar(harfler: metin dizisi): sözlük
fonksiyon Kodla(s: metin; numara: sözlük): tamsayı dizisi
fonksiyon Örnekle(olasılıklar: ondalık dizisi): tamsayı

uygulama

fonksiyon Harfler: metin dizisi
başla
  sonuç := ['.'] + Sırala(Benzersiz(Birleştir(Atasozleri.Hepsi, '').Karakterler))
bitir

fonksiyon Numaralar(harfler: metin dizisi): sözlük
değişken i: tamsayı
başla
  sonuç := [:]
  0'dan Uzunluk(harfler) - 1'e kadar her i için sonuç[harfler[i]] := i
bitir

fonksiyon Kodla(s: metin; numara: sözlük): tamsayı dizisi
başla
  sonuç := Eşle(s.Karakterler, fonksiyon(c: metin) => numara[c])
bitir

fonksiyon Örnekle(olasılıklar: ondalık dizisi): tamsayı
değişken r, birikim: ondalık; i: tamsayı
başla
  r := Rastgele(1000000) / 1000000
  birikim := 0
  0'dan Uzunluk(olasılıklar) - 1'e kadar her i için
  başla
    birikim := birikim + olasılıklar[i]
    eğer r < birikim ise dön i
  bitir
  dön Uzunluk(olasılıklar) - 1
bitir

başla
bitir.
