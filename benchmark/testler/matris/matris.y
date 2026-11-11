program Matris
{ İki 100×100 ondalık matrisi üç iç içe döngüyle çarpar: dizi erişimi ve ondalık aritmetik. }
sabit N: tamsayı = 100
değişken
  A, B, C: ondalık dizisi
  i, j, k: tamsayı
  s, iz: ondalık
başla
  A := []; B := []; C := []
  0'dan N * N - 1'e kadar her i için
  başla
    A.Ekle(((i * 7) mod 13) / 13.0)
    B.Ekle(((i * 5) mod 11) / 11.0)
    C.Ekle(0.0)
  bitir
  0'dan N - 1'e kadar her i için
    0'dan N - 1'e kadar her j için
    başla
      s := 0.0
      0'dan N - 1'e kadar her k için s := s + A[i * N + k] * B[k * N + j]
      C[i * N + j] := s
    bitir
  iz := 0.0
  0'dan N - 1'e kadar her i için iz := iz + C[i * N + i]
  yaz(Biçimle('{:.6}', iz), 1)
bitir.
