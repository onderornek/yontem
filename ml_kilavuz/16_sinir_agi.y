program ÇokKatmanlıAlgılayıcı
{ Çok katmanlı algılayıcı (MLP): katman katman dizilmiş "nöronlar".
  Her katman  çıktı = aktivasyon(girdi @ W + b)  hesaplar. Doğrusal olmayan aktivasyon (ReLU, tanh)
  sayesinde ağ eğri karar sınırları öğrenebilir. Ağırlıklar geri yayılım + Adam ile güncellenir.
  Görev: bir noktanın yarıçapı 1 olan çemberin içinde mi dışında mı olduğunu öğrenmek. }
kullan YZ

değişken
  noktalar, etiket, deneme: liste
  X, Y, tahmin: tensör
  model, opt: herhangi
  geçmiş: liste
  i, isabet: tamsayı
  px, py: ondalık

başla
  Tohum(7)
  noktalar := []; etiket := []
  1'den 200'e kadar her i için
  başla
    px := Rastgele(4000) / 1000 - 2       { [-2, 2) aralığında }
    py := Rastgele(4000) / 1000 - 2
    noktalar.Ekle([px, py])
    eğer px * px + py * py < 1 ise etiket.Ekle([1]) değilse etiket.Ekle([0])
  bitir
  X := Tensör(noktalar)
  Y := Tensör(etiket)

  { 2 girdi → 16 gizli nöron (ReLU) → 1 çıktı (sigmoid: "içeride olma olasılığı") }
  model := Ardışık([Yoğun(2, 16, 'relu'), Yoğun(16, 1, 'sigmoid')])
  opt := Adam(model.Parametreler, 0.05)
  geçmiş := Eğit(model, X, Y, 'ikiliÇaprazEntropi', opt, 400, 100)

  tahmin := model.Tahmin(X)
  isabet := 0
  0'dan 199'a kadar her i için
    eğer (tahmin[i, 0] > 0.5) = (etiket[i][0] = 1) ise isabet := isabet + 1
  yaz('Eğitim doğruluğu: %' + isabet / 2, 1)
  yaz('Parametre sayısı: ' + model.ParametreSayısı, 1)

  yaz('Yeni noktalar:', 1)
  deneme := [[0, 0], [0.5, 0.5], [0.9, 0], [1.2, 0], [1.5, 1.5]]
  tahmin := model.Tahmin(Tensör(deneme))
  0'dan 4'e kadar her i için
    yaz(Biçimle('  {}  içeride olma olasılığı {:.2}', deneme[i], tahmin[i, 0]), 1)
bitir.
