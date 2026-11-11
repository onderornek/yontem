program XorSinirAğı
{ XOR problemini çok katmanlı bir sinir ağıyla öğrenir.
  1) Yerleşik Yoğun katmanlar + Adam ile hazır Eğit döngüsü
  2) Yöntem dilinde yazılmış özel bir katman sınıfı + elle yazılmış eğitim döngüsü }
kullan YZ

tip
  { Kendi katmanımız: İleri ve Parametreler metodları olan her nesne
    Ardışık modele katman olarak eklenebilir. }
  TanhKatmanı = sınıf
    W, b: tensör
    kurucu Oluştur(girdi, çıktı: tamsayı)
    başla
      W := RastgeleTensör(girdi, çıktı, 0.8, doğru)
      b := Sıfırlar(çıktı, boş, doğru)
    bitir
    fonksiyon İleri(x: tensör): tensör
    başla
      dön (x @ W + b).Tanh
    bitir
    fonksiyon Parametreler: liste
    başla
      dön [W, b]
    bitir
  bitir

değişken
  X, Y, tahmin: tensör
  model: herhangi
  opt: herhangi
  geçmiş: liste
  i, epok: tamsayı
  kayıp: tensör

başla
  Tohum(42)
  X := Tensör([[0, 0], [0, 1], [1, 0], [1, 1]])
  Y := Tensör([[0], [1], [1], [0]])

  yaz('--- 1) Yerleşik katmanlar ---', 1)
  model := Ardışık([Yoğun(2, 8, 'tanh'), Yoğun(8, 1, 'sigmoid')])
  opt := Adam(model.Parametreler, 0.05)
  geçmiş := Eğit(model, X, Y, 'ikiliÇaprazEntropi', opt, 500, 100)
  tahmin := model.Tahmin(X)
  yaz('Tahminler: ' + tahmin, 1)
  yaz('Doğruluk : %' + (Doğruluk(tahmin, [0, 1, 1, 0]) * 100), 1)

  yaz('', 1)
  yaz('--- 2) Özel katman + elle eğitim döngüsü ---', 1)
  model := Ardışık([TanhKatmanı.Oluştur(2, 6), Yoğun(6, 1), 'sigmoid'])
  opt := SGD(model.Parametreler, 0.5, 0.9)
  1'den 400'e kadar her epok için
  başla
    opt.SıfırlaGrad
    kayıp := İkiliÇaprazEntropi(model.İleri(X), Y)
    kayıp.GeriYay
    opt.Adım
    eğer epok mod 100 = 0 ise
      yaz('  epok ' + Biçimle('{:4}', epok) + '  kayıp = ' + Biçimle('{:0.5}', kayıp.Değer), 1)
  bitir
  tahmin := model.Tahmin(X)
  0'dan 3'e kadar her i için
    yaz('  ' + X[i].Veri + ' -> ' + Biçimle('{:0.3}', tahmin[i, 0]), 1)
  yaz('Parametre sayısı: ' + model.ParametreSayısı, 1)
bitir.
