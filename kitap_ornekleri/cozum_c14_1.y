program EğriUydurma
kullan YZ
değişken
  xs, ys: liste
  i: tamsayı
  x: ondalık
  model, opt: herhangi
  geçmiş: liste
başla
  Tohum(0)
  xs := [];  ys := []
  0'dan 19'a kadar her i için
  başla
    x := -1 + i * 2 / 19
    xs.Ekle([x])
    ys.Ekle([2 * x * x - 1])
  bitir
  model := Ardışık([Yoğun(1, 16, 'tanh'), Yoğun(16, 1)])
  opt := Adam(model.Parametreler, 0.02)
  geçmiş := Eğit(model, xs, ys, 'okh', opt, 500)
  yaz(Biçimle('Son kayıp: {:.5}', geçmiş[Uzunluk(geçmiş) - 1]), 1)
  yaz(Biçimle('x = 0.5 için tahmin {:.3} (gerçek -0.5)', model.Tahmin([[0.5]])[0, 0]), 1)
bitir.
