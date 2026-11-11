program NCisim
{ Beş cismin kütle çekimiyle hareketini küçük zaman adımlarıyla benzetir ve toplam enerjiyi
  yazar: ondalık aritmetik ve dizi erişimi. Başlangıç değerleri bu test için seçilmiştir. }
kullan Matematik
sabit
  N: tamsayı = 5
  ADIM: tamsayı = 20000
  DT: ondalık = 0.001
değişken
  x, y, z, vx, vy, vz, m: ondalık dizisi
  i, j, a: tamsayı
  dx, dy, dz, d2, büyüklük: ondalık

fonksiyon Enerji: ondalık
değişken i, j: tamsayı; e, dx, dy, dz: ondalık
başla
  e := 0.0
  0'dan N - 1'e kadar her i için
  başla
    e := e + 0.5 * m[i] * (vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i])
    i + 1'den N - 1'e kadar her j için
    başla
      dx := x[i] - x[j]; dy := y[i] - y[j]; dz := z[i] - z[j]
      e := e - m[i] * m[j] / Kök(dx * dx + dy * dy + dz * dz)
    bitir
  bitir
  dön e
bitir

başla
  x := [0.0, 1.0, -2.0, 3.5, 0.5]
  y := [0.0, 0.5, 1.0, -1.5, -3.0]
  z := [0.0, -0.2, 0.3, 0.1, 0.4]
  vx := [0.0, 0.1, 0.0, -0.2, 0.3]
  vy := [0.0, 0.8, -0.6, 0.4, 0.2]
  vz := [0.0, 0.0, 0.1, -0.1, 0.0]
  m := [10.0, 0.1, 0.2, 0.05, 0.08]
  yaz(Biçimle('{:.9}', Enerji), 1)
  1'den ADIM'a kadar her a için
  başla
    0'dan N - 1'e kadar her i için
      i + 1'den N - 1'e kadar her j için
      başla
        dx := x[i] - x[j]; dy := y[i] - y[j]; dz := z[i] - z[j]
        d2 := dx * dx + dy * dy + dz * dz
        büyüklük := DT / (d2 * Kök(d2))
        vx[i] := vx[i] - dx * m[j] * büyüklük; vy[i] := vy[i] - dy * m[j] * büyüklük; vz[i] := vz[i] - dz * m[j] * büyüklük
        vx[j] := vx[j] + dx * m[i] * büyüklük; vy[j] := vy[j] + dy * m[i] * büyüklük; vz[j] := vz[j] + dz * m[i] * büyüklük
      bitir
    0'dan N - 1'e kadar her i için
    başla
      x[i] := x[i] + DT * vx[i]; y[i] := y[i] + DT * vy[i]; z[i] := z[i] + DT * vz[i]
    bitir
  bitir
  yaz(Biçimle('{:.9}', Enerji), 1)
bitir.
