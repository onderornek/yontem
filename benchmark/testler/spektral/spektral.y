program SpektralNorm
{ A(i, j) = 1 / ((i + j)(i + j + 1) / 2 + i + 1) matrisinin spektral normunu kuvvet
  yinelemesiyle bulur: fonksiyon çağrısı ve ondalık aritmetik. }
kullan Matematik
sabit N: tamsayı = 120
değişken
  u, v: ondalık dizisi
  i, adım: tamsayı
  vBv, vv: ondalık

fonksiyon A(i, j: tamsayı): ondalık
başla
  dön 1.0 / ((i + j) * (i + j + 1) / 2 + i + 1)
bitir

{ çıkış := A · giriş }
prosedür AÇarp(giriş: ondalık dizisi; çıkış: ondalık dizisi)
değişken i, j: tamsayı; s: ondalık
başla
  0'dan N - 1'e kadar her i için
  başla
    s := 0.0
    0'dan N - 1'e kadar her j için s := s + A(i, j) * giriş[j]
    çıkış[i] := s
  bitir
bitir

{ çıkış := Aᵀ · giriş }
prosedür ATÇarp(giriş: ondalık dizisi; çıkış: ondalık dizisi)
değişken i, j: tamsayı; s: ondalık
başla
  0'dan N - 1'e kadar her i için
  başla
    s := 0.0
    0'dan N - 1'e kadar her j için s := s + A(j, i) * giriş[j]
    çıkış[i] := s
  bitir
bitir

prosedür AtAÇarp(giriş, çıkış, ara: ondalık dizisi)
başla
  AÇarp(giriş, ara)
  ATÇarp(ara, çıkış)
bitir

değişken ara: ondalık dizisi
başla
  u := []; v := []; ara := []
  0'dan N - 1'e kadar her i için başla u.Ekle(1.0); v.Ekle(0.0); ara.Ekle(0.0) bitir
  1'den 10'a kadar her adım için
  başla
    AtAÇarp(u, v, ara)
    AtAÇarp(v, u, ara)
  bitir
  vBv := 0.0; vv := 0.0
  0'dan N - 1'e kadar her i için
  başla
    vBv := vBv + u[i] * v[i]
    vv := vv + v[i] * v[i]
  bitir
  yaz(Biçimle('{:.9}', Kök(vBv / vv)), 1)
bitir.
