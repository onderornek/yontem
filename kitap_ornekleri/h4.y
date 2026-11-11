program DeğişimselDevre
kullan Kuantum, Matematik
değişken
  açı: liste
  grad: liste
  i: tamsayı

// Ry(θ) uygulanmış bir kübitin ⟨Z⟩ değeri = cos θ. En küçük değer θ = π'de: -1
fonksiyon Enerji(p: liste): ondalık
değişken
  d: herhangi
başla
  d := Devre(1)
  d.Ry(0, p[0])
  dön d.BeklenenDeğer('Z')
bitir

başla
  açı := [0.3]
  1'den 30'a kadar her i için
  başla
    grad := ParametreKaydırma(@Enerji, açı)
    açı := [açı[0] - 0.4 * grad[0]]
    eğer i mod 10 = 0 ise
      yaz(Biçimle('adım {:2}: θ = {:.4}  enerji = {:.4}', i, açı[0], Enerji(açı)), 1)
  bitir
  yaz(Biçimle('π = {:.4}', pi), 1)
bitir.
