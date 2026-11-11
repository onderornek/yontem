program Tensörler
{ Meşale'ye ilk bakış: tensör oluşturma, şekiller, yayma (broadcasting) ve otomatik türev.
  PyTorch'u bilenler için her satırın yanında karşılığı yazılıdır. }
kullan Meşale

değişken
  a, b, x, w, y: tensör

başla
  Tohum(0)                                        { torch.manual_seed(0) }
  a := Tensör([[1, 2, 3], [4, 5, 6]])             { torch.tensor([[1, 2, 3], [4, 5, 6]]) }
  yaz('a =', 1); yaz(a, 1)
  yaz('şekil: ' + a.Şekil + ', öğe sayısı: ' + a.numel, 2)

  { Yayma: [2, 3] + [3] → [2, 3] }
  b := Tensör([10, 20, 30])
  yaz('a + b =', 1); yaz(a + b, 1)
  yaz('a @ a.T =', 1); yaz(a @ a.T, 1)
  yaz('satır ortalamaları: ', 0); yaz(a.Ortalama(1), 1)
  yaz('en büyük ve yeri  : ', 0); yaz(a.max(1), 2)

  { Şekil işlemleri }
  yaz('view(3, 2):', 1); yaz(a.view(3, 2), 1)
  yaz('unsqueeze(0) şekli: ' + a.unsqueeze(0).shape + ', permute(1, 0) şekli: ' + a.permute(1, 0).shape, 2)

  { Otomatik türev: y = Σ (x·w)² ise dy/dw = 2·x·(x·w) }
  x := Tensör([1.0, 2.0, 3.0])
  w := Tensör([0.5, -1.0, 2.0], doğru)            { requires_grad=True }
  y := ((x * w) ** 2).Toplam
  y.GeriYay                                       { y.backward() }
  yaz('y = ' + y.item, 1)
  yaz('w.grad = ', 0); yaz(w.grad, 1)
  yaz('elle hesap: ', 0); yaz(2 * x * (x * w.Ayır), 2)

  { Rastgele tensörler ve üç boyut }
  yaz('randn(2, 2, 3):', 1)
  yaz(RastgeleNormal(2, 2, 3), 1)
bitir.
