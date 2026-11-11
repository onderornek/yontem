program SinirAğı
kullan YZ
değişken
  X, Y, tahmin: tensör
  model, opt: herhangi
  geçmiş: liste
başla
  Tohum(42)
  // XOR: girdiler aynıysa 0, farklıysa 1. Tek bir doğruyla ayrılamaz.
  X := Tensör([[0, 0], [0, 1], [1, 0], [1, 1]])
  Y := Tensör([[0], [1], [1], [0]])

  model := Ardışık([Yoğun(2, 8, 'tanh'),       // 2 girdi -> 8 gizli nöron
                    Yoğun(8, 1, 'sigmoid')])  // 8 -> 1 çıktı (0..1 olasılık)
  opt := Adam(model.Parametreler, 0.05)
  yaz('Parametre sayısı: ' + model.ParametreSayısı, 1)

  geçmiş := Eğit(model, X, Y, 'ikiliÇaprazEntropi', opt, 300, 100)

  tahmin := model.Tahmin(X)
  yaz('Tahminler:', 1)
  yaz(tahmin, 1)
  yaz('Doğruluk : %' + Doğruluk(tahmin, [0, 1, 1, 0]) * 100, 1)
bitir.
