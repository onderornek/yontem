program ÖzDikkat
{ Öz-dikkat, her karakterin kendinden önceki karakterlerden bilgi toplamasını sağlar.
  A) En basit hali: geçmişin ortalamasını almak. Nedensel maske, bir karakterin
     GELECEKTEKİ karakterleri görmesini engeller.
  B) Gerçek öz-dikkat: ortalama eşit ağırlıklı değildir. Her karakter bir sorgu (q),
     bir anahtar (k) ve bir değer (v) üretir. q·k büyükse o karaktere çok bakılır.
        ağırlıklar = softmaks(Q Kᵀ / √d + maske),   çıktı = ağırlıklar @ V
  C) Dikkat sırayı bilmez: aynı karakterler farklı sırayla gelse de sonuç aynıdır.
     Konum gömmesi eklemek bu sorunu çözer. }
kullan Atasozleri, DilAraclari, YZ, Matematik

değişken
  x, M, A, Q, K, V, E, Wq, Wk, Wv, Konum, girdi: tensör
  harfler: metin dizisi
  numara: sözlük

fonksiyon NedenselMaske(n: tamsayı): tensör
değişken i, j: tamsayı; satırlar: liste; s: ondalık dizisi
başla
  satırlar := []
  0'dan n - 1'e kadar her i için
  başla
    s := []
    0'dan n - 1'e kadar her j için eğer j <= i ise s.Ekle(0.0) değilse s.Ekle(-1000000000.0)
    satırlar.Ekle(s)
  bitir
  dön Tensör(satırlar)
bitir

prosedür MatrisYaz(başlık: metin; mat: tensör)
değişken i, j: tamsayı; s: metin
başla
  yaz(başlık, 1)
  0'dan mat.Şekil[0] - 1'e kadar her i için
  başla
    s := '   '
    0'dan mat.Şekil[1] - 1'e kadar her j için s := s + Biçimle('{:7.2}', mat[i, j])
    yaz(s, 1)
  bitir
bitir

fonksiyon SonSatırınÇıktısı(sözcük: metin; konumlu: mantıksal): tensör
{ Sözcüğün karakterlerini gömer, öz-dikkati uygular, son karakterin çıktısını döndürür. }
değişken G, Ağ: tensör; n: tamsayı
başla
  n := Uzunluk(sözcük)
  G := BirSıcak(DilAraclari.Kodla(sözcük, numara), Uzunluk(harfler)) @ E
  eğer konumlu ise G := G + BirSıcak(Aralık(n), 8) @ Konum
  Ağ := Softmaks((G @ Wq) @ (G @ Wk).T / Kök(4) + NedenselMaske(n))
  dön (Ağ @ (G @ Wv)).Satır(n - 1)
bitir

başla
  { A) Geçmişin ortalaması }
  x := Tensör([[1.0, 0.0], [3.0, 2.0], [5.0, 4.0], [7.0, 2.0]])
  M := NedenselMaske(4)
  A := Softmaks(Sıfırlar(4, 4) + M)          { tüm puanlar eşit → eşit ağırlık }
  MatrisYaz('A) Maskeli eşit ağırlıklar (satır: bakan, sütun: bakılan):', A)
  MatrisYaz('   ağırlıklar @ x  =  her satırda, o ana kadarki satırların ortalaması:', A @ x)

  { B) Sorgu, anahtar, değer }
  Tohum(3)
  harfler := DilAraclari.Harfler
  numara := DilAraclari.Numaralar(harfler)
  E := RastgeleTensör(Uzunluk(harfler), 8, 1.0)      { 8 boyutlu karakter gömmeleri }
  Wq := RastgeleTensör(8, 4, 0.5)
  Wk := RastgeleTensör(8, 4, 0.5)
  Wv := RastgeleTensör(8, 4, 0.5)
  girdi := BirSıcak(DilAraclari.Kodla('gönül', numara), Uzunluk(harfler)) @ E
  Q := girdi @ Wq; K := girdi @ Wk; V := girdi @ Wv
  A := Softmaks(Q @ K.T / Kök(4) + NedenselMaske(5))
  yaz('', 1)
  MatrisYaz('B) "gönül" için dikkat ağırlıkları (rastgele, henüz eğitilmemiş Wq, Wk):', A)
  yaz('   Satır toplamları: ' + Eşle(Aralık(5), fonksiyon(r: tamsayı) => Yuvarla(A.Satır(r).Toplam.Değer, 3)), 1)
  yaz('   Çıktının şekli: ' + (A @ V).Şekil + '  (5 karakter, her biri için 4 sayı)', 1)

  { C) Konum bilgisi }
  Konum := RastgeleTensör(8, 8, 1.0)
  yaz('', 1)
  yaz('C) Son karakterin ("a") çıktısı:', 1)
  yaz('   konumsuz  "elma": ' + Eşle(SonSatırınÇıktısı('elma', yanlış).Veri, fonksiyon(z: ondalık) => Yuvarla(z, 3)), 1)
  yaz('   konumsuz  "lema": ' + Eşle(SonSatırınÇıktısı('lema', yanlış).Veri, fonksiyon(z: ondalık) => Yuvarla(z, 3)), 1)
  yaz('   konumlu   "elma": ' + Eşle(SonSatırınÇıktısı('elma', doğru).Veri, fonksiyon(z: ondalık) => Yuvarla(z, 3)), 1)
  yaz('   konumlu   "lema": ' + Eşle(SonSatırınÇıktısı('lema', doğru).Veri, fonksiyon(z: ondalık) => Yuvarla(z, 3)), 1)
bitir.
