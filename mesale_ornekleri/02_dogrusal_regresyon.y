program DoğrusalRegresyonMeşale
{ PyTorch tarzı eğitim döngüsü: veri kümesi, veri yükleyici, model, kayıp, optimizasyon.
  Gizli kural y = 3·x₁ − 2·x₂ + 1 (biraz gürültüyle). Model bu katsayıları veriden bulur. }
kullan Meşale, Sinir

değişken
  X, Y, kayıp: tensör
  yükleyici, model, opt, ölçüt: herhangi
  yığın: liste
  epok: tamsayı
  toplam: ondalık

başla
  Tohum(1)
  X := RastgeleNormal(64, 2)
  Y := X @ Tensör([[3.0], [-2.0]]) + 1 + RastgeleNormal(64, 1) * 0.1
  yükleyici := DataLoader(TensorDataset(X, Y), 16, doğru)    { batch_size=16, shuffle=True }

  model := Linear(2, 1)
  ölçüt := MSELoss()
  opt := SGD(model.parameters, 0.1)
  yaz(model, 1)

  1'den 30'a kadar her epok için
  başla
    toplam := 0
    yükleyici içindeki her yığın için
    başla
      opt.zero_grad
      kayıp := ölçüt.forward(model.İleri(yığın[0]), yığın[1])
      kayıp.backward
      opt.step
      toplam := toplam + kayıp.item
    bitir
    eğer epok mod 10 = 0 ise yaz(Biçimle('epok {:2}  ortalama kayıp {:.5}', epok, toplam / yükleyici.uzunluk), 1)
  bitir
  yaz('öğrenilen ağırlık: ', 0); yaz(model.ağırlık.Ayır, 1)
  yaz('öğrenilen sapma  : ', 0); yaz(model.sapma.Ayır, 1)
bitir.
