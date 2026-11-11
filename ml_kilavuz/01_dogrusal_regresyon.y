program DoğrusalRegresyon
{ Ev büyüklüğünden (m²) fiyatı (bin TL) tahmin eden doğrusal model: ŷ = a·x + b
  Parametreler gradyan inişiyle öğrenilir, sonra kapalı form çözümüyle karşılaştırılır. }

değişken
  X, Y: ondalık dizisi
  a, b, ga, gb, hata, okh, oran: ondalık
  i, adım, n: tamsayı
  ox, oy, pay, payda: ondalık

fonksiyon Ölçekle(m2: ondalık): ondalık
başla
  sonuç := m2 / 100      { 100 m² = 1 birim: sayılar küçük kalınca iniş kararlı olur }
bitir

başla
  X := [50, 65, 80, 95, 110, 130, 150]
  Y := [1450, 1900, 2250, 2700, 3100, 3600, 4150]
  n := Uzunluk(X)
  a := 0; b := 0; oran := 0.1

  1'den 3000'e kadar her adım için
  başla
    ga := 0; gb := 0; okh := 0
    0'dan n - 1'e kadar her i için
    başla
      hata := a * Ölçekle(X[i]) + b - Y[i]
      ga := ga + 2 * hata * Ölçekle(X[i]) / n
      gb := gb + 2 * hata / n
      okh := okh + hata * hata / n
    bitir
    a := a - oran * ga
    b := b - oran * gb
    eğer adım = 1 veya adım mod 1000 = 0 ise
      yaz(Biçimle('Adım {:5}  OKH = {:12.2}', adım, okh), 1)
  bitir
  yaz(Biçimle('Gradyan inişi: fiyat ≈ {:.2} × m² + {:.2}', a / 100, b), 1)

  { Kapalı form (en küçük kareler): a = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)² }
  ox := Toplam(X) / n; oy := Toplam(Y) / n
  pay := 0; payda := 0
  0'dan n - 1'e kadar her i için
  başla
    pay := pay + (X[i] - ox) * (Y[i] - oy)
    payda := payda + (X[i] - ox) ** 2
  bitir
  yaz(Biçimle('Kapalı form:   fiyat ≈ {:.2} × m² + {:.2}', pay / payda, oy - pay / payda * ox), 1)
  yaz(Biçimle('120 m² için tahmin: {:.0} bin TL', a * Ölçekle(120) + b), 1)
bitir.
