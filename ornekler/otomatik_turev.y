program OtomatikTürev
{ Dilin YZ temeli: her tensör işlemi hesaplama grafiğine kaydedilir ve
  GeriYay ile gradyanlar otomatik hesaplanır. }
kullan YZ, Matematik

fonksiyon F(x: herhangi): herhangi
başla
  // f(x) = x³ + 2x² - 5x   →   f'(x) = 3x² + 4x - 5
  dön x ** 3 + 2 * x ** 2 - 5 * x
bitir

değişken
  w, b, X, Y, tahmin, kayıp: tensör
  i: tamsayı
  oran: ondalık

başla
  yaz('f''(2)   = ' + Türev(@F, 2.0) + '   (beklenen 15)', 1)
  yaz('sin''(0) = ' + Türev(fonksiyon(x) => x.Sin, 0.0), 1)
  yaz('Zincir kuralı: d/dx sigmoid(3x) at 0 = ' + Biçimle('{:0.4}', Türev(fonksiyon(x) => Sigmoid(3 * x), 0.0)), 1)

  // Gradyan inişiyle doğrusal regresyon: y = 3x + 2 (+ gürültü)
  Tohum(7)
  X := Tensör([[0.0], [1.0], [2.0], [3.0], [4.0], [5.0]])
  Y := X * 3 + 2 + RastgeleTensör(6, 1, 0.1)
  w := Tensör([[0.0]], doğru)
  b := Tensör([0.0], doğru)
  oran := 0.02

  1'den 1500'e kadar her i için
  başla
    tahmin := X @ w + b
    kayıp := OKH(tahmin, Y)
    w.SıfırlaGrad;  b.SıfırlaGrad
    kayıp.GeriYay
    // parametreleri gradyanın tersi yönünde güncelle
    w := (w - oran * w.Grad).Ayır;  w.GradGerekli := doğru
    b := (b - oran * b.Grad).Ayır;  b.GradGerekli := doğru
  bitir
  yaz(Biçimle('Öğrenilen: y = {:.3}x + {:.3}   (kayıp {:.5})', w[0, 0], b[0], kayıp.Değer), 1)
bitir.
