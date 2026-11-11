program AdaBoost
{ Zayıf öğreniciler (tek eşikli "karar kütükleri") ağırlıklı oylamayla güçlü bir sınıflandırıcıya dönüşür.
  Her turda yanlış sınıflanan örneklerin ağırlığı artar; sonraki kütük onlara odaklanır.
  α_t = ½ · ln((1 − hata) / hata)     F(x) = işaret(Σ α_t · h_t(x)) }
kullan Matematik

tip
  Kütük = kayıt eşik: ondalık; yön: tamsayı; alfa: ondalık; bitir   { h(x) = yön, x < eşik ise; −yön değilse }

değişken
  X, D: ondalık dizisi
  Y: tamsayı dizisi
  kütükler: Kütük dizisi
  i, t, n, isabet: tamsayı
  k, enK: Kütük
  hata, enHata, z: ondalık

fonksiyon H(k: Kütük; x: ondalık): tamsayı
başla
  sonuç := eğer x < k.eşik ise k.yön değilse -k.yön
bitir

fonksiyon Güçlü(x: ondalık): tamsayı
değişken s: ondalık; j: tamsayı
başla
  s := 0
  0'dan Uzunluk(kütükler) - 1'e kadar her j için s := s + kütükler[j].alfa * H(kütükler[j], x)
  sonuç := eğer s >= 0 ise 1 değilse -1
bitir

başla
  { Tek bir eşik bu veriyi ayıramaz: + + + − − − − + + + }
  X := [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  Y := [1, 1, 1, -1, -1, -1, -1, 1, 1, 1]
  n := Uzunluk(X)
  D := Eşle(X, fonksiyon(x: ondalık) => 1.0 / n)       { başlangıçta tüm örnekler eşit ağırlıkta }
  kütükler := []
  1'den 4'e kadar her t için
  başla
    enHata := 2
    { en düşük ağırlıklı hatayı veren eşik ve yönü ara }
    0'dan n'e kadar her i için
      [1, -1] içindeki her yön için
      başla
        k := Kütük.Oluştur(i + 0.5, yön, 0)
        hata := 0
        0'dan n - 1'e kadar her j için eğer H(k, X[j]) <> Y[j] ise hata := hata + D[j]
        eğer hata < enHata ise başla enHata := hata; enK := k bitir
      bitir
    k := enK
    k.alfa := 0.5 * Ln((1 - enHata) / enHata)
    kütükler.Ekle(k)
    { ağırlıkları güncelle: yanlışlar ×e^α, doğrular ×e^−α, sonra toplam 1 olacak şekilde ölçekle }
    0'dan n - 1'e kadar her j için D[j] := D[j] * Üstel(-k.alfa * Y[j] * H(k, X[j]))
    z := Toplam(D)
    0'dan n - 1'e kadar her j için D[j] := D[j] / z
    isabet := 0
    0'dan n - 1'e kadar her j için eğer Güçlü(X[j]) = Y[j] ise isabet := isabet + 1
    yaz(Biçimle('Tur {}: x < {:4} ise {:2}   hata = {:.3}  α = {:.3}   topluluk doğruluğu: {}/{}',
      t, k.eşik, k.yön, enHata, k.alfa, isabet, n), 1)
    yaz('        ağırlıklar: ' + Eşle(D, fonksiyon(d: ondalık) => Yuvarla(d, 2)), 1)
  bitir
bitir.
