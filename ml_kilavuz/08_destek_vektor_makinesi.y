program DestekVektörMakinesi
{ İki sınıfı ayıran ve iki sınıfa da en uzak duran doğruyu (en geniş marjı) bulur.
  Kayıp (menteşe kaybı): λ/2·‖w‖² + ortalama(max(0, 1 − y·(w·x + b)))
  Doğru tarafta ve marjın dışında kalan noktalar kayba hiç katkı yapmaz. }
kullan Matematik

değişken
  X: ondalık dizisi dizisi
  Y: tamsayı dizisi      { +1 ya da −1 }
  w0, w1, b, lam, eta, m, g0, g1, gb: ondalık
  i, t, n: tamsayı

fonksiyon Puan(x: ondalık dizisi): ondalık
başla
  sonuç := w0 * x[0] + w1 * x[1] + b
bitir

başla
  X := [[1, 2], [2, 3], [2, 1], [3, 2], [1.5, 1.5],       { −1 sınıfı }
        [5, 5], [6, 4], [5, 6], [7, 5], [6, 6.5], [4.5, 4]] { +1 sınıfı }
  Y := [-1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1]
  n := Uzunluk(X)
  w0 := 0; w1 := 0; b := 0; lam := 0.01

  1'den 5000'e kadar her t için
  başla
    eta := 1 / (lam * t + 100)        { zamanla küçülen adım }
    g0 := lam * w0; g1 := lam * w1; gb := 0
    0'dan n - 1'e kadar her i için
      eğer Y[i] * Puan(X[i]) < 1 ise    { marjın içinde ya da yanlış tarafta: düzelt }
      başla
        g0 := g0 - Y[i] * X[i][0] / n
        g1 := g1 - Y[i] * X[i][1] / n
        gb := gb - Y[i] / n
      bitir
    w0 := w0 - eta * g0; w1 := w1 - eta * g1; b := b - eta * gb
  bitir

  yaz(Biçimle('Karar sınırı: {:.3}·x + {:.3}·y {} {:.3} = 0', w0, w1, eğer b < 0 ise '-' değilse '+', Mutlak(b)), 1)
  yaz(Biçimle('Marj genişliği: 2/‖w‖ = {:.3}', 2 / Kök(w0 * w0 + w1 * w1)), 1)
  yaz('Noktalar ve y·(w·x + b) değerleri:', 1)
  0'dan n - 1'e kadar her i için
  başla
    m := Y[i] * Puan(X[i])
    yaz(Biçimle('  ({:3}, {:3}) sınıf {:2}  → {:6.3}{}', X[i][0], X[i][1], Y[i], m,
      eğer m < 1.05 ise '   ← destek vektörü' değilse ''), 1)
  bitir
  yaz(Biçimle('Yeni nokta (3.5, 3.5) → sınıf {}', eğer Puan([3.5, 3.5]) >= 0 ise '+1' değilse '-1'), 1)
bitir.
