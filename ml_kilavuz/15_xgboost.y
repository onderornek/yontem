program XGBoost
{ XGBoost'un çekirdeği: kaybın birinci (g) ve ikinci (h) türevini kullanan, düzenlileştirilmiş artırma.
  Lojistik kayıpta p = σ(F) için:  g = p − y,  h = p·(1 − p)  (kodda grad ve hess dizileri)
  Yaprak ağırlığı: w = −G / (H + λ)          Bölmenin kazancı:
  kazanç = ½ [G_L²/(H_L+λ) + G_R²/(H_R+λ) − G²/(H+λ)] − γ   (kazanç ≤ 0 ise bölme yapılmaz) }
kullan Matematik

değişken
  X: ondalık dizisi
  Y: tamsayı dizisi
  i: tamsayı

prosedür Eğit(lam, gama: ondalık)
değişken
  F, grad, hess: ondalık dizisi
  t, j, n, enEşik: tamsayı
  GL, HL, GR, HR, G, H, kazanç, enKazanç, wL, wR, kayıp, p: ondalık
başla
  n := Uzunluk(X)
  F := Eşle(X, fonksiyon(x: ondalık) => 0.0)
  yaz(Biçimle('λ = {}, γ = {}', lam, gama), 1)
  1'den 4'e kadar her t için
  başla
    grad := []; hess := []
    0'dan n - 1'e kadar her j için
    başla
      p := Sigmoid(F[j]); grad.Ekle(p - Y[j]); hess.Ekle(p * (1 - p))
    bitir
    G := Toplam(grad); H := Toplam(hess)
    enKazanç := 0; enEşik := 0
    1'den n - 1'e kadar her i için    { eşik: X[i-1] ile X[i] arası }
    başla
      GL := 0; HL := 0
      0'dan i - 1'e kadar her j için başla GL := GL + grad[j]; HL := HL + hess[j] bitir
      GR := G - GL; HR := H - HL
      kazanç := 0.5 * (GL * GL / (HL + lam) + GR * GR / (HR + lam) - G * G / (H + lam)) - gama
      eğer kazanç > enKazanç ise başla enKazanç := kazanç; enEşik := i bitir
    bitir
    eğer enKazanç <= 0 ise
    başla
      yaz('  Tur ' + t + ': hiçbir bölme γ cezasını karşılamıyor, ağaç büyümüyor', 1)
      kır
    bitir
    GL := 0; HL := 0
    0'dan enEşik - 1'e kadar her j için başla GL := GL + grad[j]; HL := HL + hess[j] bitir
    wL := -GL / (HL + lam); wR := -(G - GL) / (H - HL + lam)
    kayıp := 0
    0'dan n - 1'e kadar her j için
    başla
      F[j] := F[j] + 0.5 * (eğer j < enEşik ise wL değilse wR)       { 0.5: küçültme (shrinkage) }
      p := Sigmoid(F[j])
      kayıp := kayıp - (Y[j] * Ln(p) + (1 - Y[j]) * Ln(1 - p)) / n
    bitir
    yaz(Biçimle('  Tur {}: x < {:4.1} | kazanç {:.3} | yapraklar {:6.3} / {:6.3} | kayıp {:.4}',
      t, (X[enEşik - 1] + X[enEşik]) / 2, enKazanç, wL, wR, kayıp), 1)
  bitir
bitir

başla
  { Müşterinin yaşı (sıralı) ve ürünü satın alıp almadığı }
  X := [18, 22, 25, 28, 31, 35, 38, 42, 46, 50, 55, 60]
  Y := [0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1]
  Eğit(0, 0)
  Eğit(5, 0)
  Eğit(5, 0.8)
bitir.
