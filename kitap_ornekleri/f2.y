program OtomatikTürev
kullan YZ
değişken
  x, y: tensör
  w: tensör
  i: tamsayı
  f: herhangi
başla
  // 1) Elle: y = x² + 3x, x = 2 noktasında dy/dx = 2x + 3 = 7
  x := Tensör(2.0, doğru)           // doğru: gradyanı izle
  y := x * x + 3 * x
  y.GeriYay                          // gradyanları hesapla
  yaz('y = ' + y.Değer + ',  dy/dx = ' + x.Grad.Değer, 1)

  // 2) Türev fonksiyonuyla: herhangi bir Yöntem fonksiyonunun türevi
  f := fonksiyon(t) => t ** 3 - 2 * t
  yaz('f''(1.5) = ' + Türev(f, 1.5), 1)  // 3t² - 2 = 4.75

  // 3) Gradyan inişi: g(w) = (w - 5)² fonksiyonunun en küçük noktasını bul
  w := Tensör(0.0, doğru)
  1'den 50'ye kadar her i için
  başla
    y := (w - 5) ** 2
    w.SıfırlaGrad
    y.GeriYay
    w := (w - 0.1 * w.Grad).Ayır     // gradyanın tersi yönünde küçük bir adım
    w.GradGerekli := doğru
    eğer i mod 10 = 0 ise
      yaz(Biçimle('  adım {:2}: w = {:.4}', i, w.Değer), 1)
  bitir
bitir.
