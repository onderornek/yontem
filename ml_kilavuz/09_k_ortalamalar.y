program KOrtalamalar
{ Etiketsiz noktaları k kümeye ayırır. İki adım sırayla tekrarlanır:
  1) Atama: her nokta en yakın merkeze atanır.   2) Güncelleme: her merkez, kümesinin ortalamasına taşınır.
  Amaç (eylemsizlik): Σ ‖x − merkez‖²  her turda küçülür ya da aynı kalır. }
kullan Matematik

değişken
  P, merkez: ondalık dizisi dizisi
  küme: tamsayı dizisi
  i, c, tur, k: tamsayı
  üyeler: ondalık dizisi dizisi
  bulut: ondalık dizisi

fonksiyon U2(a, b: ondalık dizisi): ondalık
başla
  sonuç := (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
bitir

başla
  Tohum(5)
  P := []
  { üç bulut: (0,0), (5,1), (2,5) çevresinde 15'er nokta }
  [[0, 0], [5, 1], [2, 5]] içindeki her bulut için
    1'den 15'e kadar her i için P.Ekle([bulut[0] + Normal(0, 0.8), bulut[1] + Normal(0, 0.8)])
  k := 3
  merkez := [P[0], P[1], P[2]]       { kötü başlangıç: hepsi aynı buluttan }
  küme := Eşle(P, fonksiyon(p: ondalık dizisi) => 0)
  1'den 6'ya kadar her tur için
  başla
    0'dan Uzunluk(P) - 1'e kadar her i için
      küme[i] := Sırala([0, 1, 2], fonksiyon(j: tamsayı) => U2(P[i], merkez[j]))[0]
    0'dan k - 1'e kadar her c için
    başla
      üyeler := []
      0'dan Uzunluk(P) - 1'e kadar her i için eğer küme[i] = c ise üyeler.Ekle(P[i])
      merkez[c] := [Toplam(Eşle(üyeler, fonksiyon(p: ondalık dizisi) => p[0])) / Uzunluk(üyeler),
                    Toplam(Eşle(üyeler, fonksiyon(p: ondalık dizisi) => p[1])) / Uzunluk(üyeler)]
    bitir
    yaz(Biçimle('Tur {}: eylemsizlik {:7.2}  merkezler ', tur,
      Toplam(Eşle(Aralık(Uzunluk(P)), fonksiyon(j: tamsayı) => U2(P[j], merkez[küme[j]])))), 0)
    yaz(Eşle(merkez, fonksiyon(m: ondalık dizisi) => [Yuvarla(m[0], 1), Yuvarla(m[1], 1)]), 1)
  bitir
bitir.
