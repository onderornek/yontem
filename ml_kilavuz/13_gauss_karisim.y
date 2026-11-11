program GaussKarışım
{ Veriyi iki Gauss (normal) dağılımın karışımı olarak modeller ve parametreleri EM algoritmasıyla bulur.
  E adımı: her nokta için "hangi dağılımdan gelmiş olabilir?" olasılıkları (sorumluluklar) hesaplanır.
  M adımı: her dağılımın ortalaması, sapması ve ağırlığı bu olasılıklarla yeniden hesaplanır.
  k-ortalamalardan farkı: atamalar kesin değil, olasılıklıdır. }
kullan Matematik

değişken
  X, r: ondalık dizisi               { r[i]: i. noktanın 1. dağılıma ait olma olasılığı }
  m1, m2, s1, s2, w1, p1, p2, n1, logOlabilirlik: ondalık
  i, tur: tamsayı

fonksiyon Normal1(x, m, s: ondalık): ondalık
başla
  sonuç := Üstel(-0.5 * ((x - m) / s) ** 2) / (s * Kök(2 * Matematik.pi))
bitir

başla
  Tohum(4)
  X := []
  1'den 60'a kadar her i için X.Ekle(Normal(165, 6))     { 1. grup }
  1'den 40'a kadar her i için X.Ekle(Normal(180, 5))     { 2. grup }
  m1 := 160; m2 := 190; s1 := 10; s2 := 10; w1 := 0.5    { kaba bir başlangıç tahmini }
  r := Eşle(X, fonksiyon(x: ondalık) => 0.0)
  1'den 30'a kadar her tur için
  başla
    { E adımı }
    logOlabilirlik := 0
    0'dan Uzunluk(X) - 1'e kadar her i için
    başla
      p1 := w1 * Normal1(X[i], m1, s1)
      p2 := (1 - w1) * Normal1(X[i], m2, s2)
      r[i] := p1 / (p1 + p2)
      logOlabilirlik := logOlabilirlik + Ln(p1 + p2)
    bitir
    { M adımı }
    n1 := Toplam(r)
    m1 := 0; m2 := 0
    0'dan Uzunluk(X) - 1'e kadar her i için başla m1 := m1 + r[i] * X[i]; m2 := m2 + (1 - r[i]) * X[i] bitir
    m1 := m1 / n1; m2 := m2 / (Uzunluk(X) - n1)
    s1 := 0; s2 := 0
    0'dan Uzunluk(X) - 1'e kadar her i için
    başla
      s1 := s1 + r[i] * (X[i] - m1) ** 2
      s2 := s2 + (1 - r[i]) * (X[i] - m2) ** 2
    bitir
    s1 := Kök(s1 / n1); s2 := Kök(s2 / (Uzunluk(X) - n1))
    w1 := n1 / Uzunluk(X)
    eğer tur <= 3 veya tur mod 10 = 0 ise
      yaz(Biçimle('Tur {:2}: log-olabilirlik {:8.2} | 1: ort {:6.1} sapma {:4.1} ağırlık {:.2} | 2: ort {:6.1} sapma {:4.1}',
        tur, logOlabilirlik, m1, s1, w1, m2, s2), 1)
  bitir
  yaz(Biçimle('172 cm boyundaki biri 1. gruptan olasılıkla {:.2}', w1 * Normal1(172, m1, s1) /
    (w1 * Normal1(172, m1, s1) + (1 - w1) * Normal1(172, m2, s2))), 1)
bitir.
