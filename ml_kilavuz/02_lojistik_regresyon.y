program LojistikRegresyon
{ Çalışma saatinden sınavı geçme olasılığını tahmin eder: P(geçer) = σ(w·x + b)
  σ(z) = 1 / (1 + e^(-z)) her sayıyı 0 ile 1 arasına sıkıştırır. Kayıp: çapraz entropi. }
kullan Matematik

değişken
  saat: ondalık dizisi
  geçti: tamsayı dizisi
  w, b, p, gw, gb, kayıp: ondalık
  i, adım, n, isabet: tamsayı

başla
  saat := [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]
  geçti := [0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1]
  n := Uzunluk(saat)
  w := 0; b := 0

  1'den 2000'e kadar her adım için
  başla
    gw := 0; gb := 0; kayıp := 0
    0'dan n - 1'e kadar her i için
    başla
      p := Sigmoid(w * saat[i] + b)
      kayıp := kayıp - (geçti[i] * Ln(p) + (1 - geçti[i]) * Ln(1 - p)) / n
      gw := gw + (p - geçti[i]) * saat[i] / n     { çapraz entropinin türevi şaşırtıcı biçimde basittir }
      gb := gb + (p - geçti[i]) / n
    bitir
    w := w - 0.5 * gw
    b := b - 0.5 * gb
    eğer adım mod 500 = 0 ise yaz(Biçimle('Adım {:4}  kayıp = {:.4}', adım, kayıp), 1)
  bitir

  yaz(Biçimle('Model: P(geçer) = σ({:.3} × saat {} {:.3})', w, eğer b < 0 ise '-' değilse '+', Mutlak(b)), 1)
  yaz(Biçimle('Karar sınırı (P = 0,5): {:.2} saat', -b / w), 1)
  isabet := 0
  0'dan n - 1'e kadar her i için
  başla
    p := Sigmoid(w * saat[i] + b)
    eğer (p >= 0.5) = (geçti[i] = 1) ise isabet := isabet + 1
  bitir
  yaz('Eğitim doğruluğu: ' + isabet + '/' + n, 1)
  yaz(Biçimle('2 saat çalışan için olasılık: {:.2}', Sigmoid(w * 2 + b)), 1)
  yaz(Biçimle('5 saat çalışan için olasılık: {:.2}', Sigmoid(w * 5 + b)), 1)
bitir.
