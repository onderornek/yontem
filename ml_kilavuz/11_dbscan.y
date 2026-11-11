program DBSCAN
{ Yoğunluğa dayalı kümeleme. ε yarıçaplı komşuluğunda en az minNokta nokta bulunan noktalar "çekirdek"tir.
  Birbirine ε'dan yakın çekirdekler aynı kümeye girer; hiçbir çekirdeğe ulaşamayan noktalar gürültüdür.
  Küme sayısını önceden vermek gerekmez ve kümeler her biçimde olabilir (burada bir halka). }
kullan Matematik

değişken
  P: ondalık dizisi dizisi
  etiket: tamsayı dizisi       { −2: ziyaret edilmedi, −1: gürültü, 0, 1, …: küme }
  i, j, c, kume: tamsayı
  açı, eps: ondalık
  kuyruk, kom: tamsayı dizisi
  minNokta: tamsayı

fonksiyon Komşular(i: tamsayı): tamsayı dizisi
başla
  sonuç := Süz(Aralık(Uzunluk(P)), fonksiyon(j: tamsayı) =>
    Kök((P[i][0] - P[j][0]) ** 2 + (P[i][1] - P[j][1]) ** 2) <= eps)
bitir

başla
  Tohum(2)
  P := []
  0'dan 39'a kadar her i için       { yarıçapı 4 olan halka }
  başla
    açı := i * 2 * Matematik.pi / 40
    P.Ekle([4 * Cos(açı) + Normal(0, 0.2), 4 * Sin(açı) + Normal(0, 0.2)])
  bitir
  1'den 15'e kadar her i için P.Ekle([Normal(0, 0.4), Normal(0, 0.4)])   { ortada yoğun bir bulut }
  P := P + [[7, 7], [-6, 5], [6, -6]]                                     { üç aykırı nokta }

  eps := 1.5; minNokta := 3
  etiket := Eşle(P, fonksiyon(p: ondalık dizisi) => -2)
  kume := 0
  0'dan Uzunluk(P) - 1'e kadar her i için
  başla
    eğer etiket[i] <> -2 ise devam
    kom := Komşular(i)
    eğer Uzunluk(kom) < minNokta ise başla etiket[i] := -1; devam bitir
    { yeni küme: çekirdekten başlayıp ulaşılabilen herkesi genişleyerek ekle }
    etiket[i] := kume
    kuyruk := kom
    Uzunluk(kuyruk) > 0 iken
    başla
      j := kuyruk.Çıkar(0)
      eğer etiket[j] = -1 ise etiket[j] := kume      { gürültü sanılan bir sınır noktası }
      eğer etiket[j] <> -2 ise devam
      etiket[j] := kume
      kom := Komşular(j)
      eğer Uzunluk(kom) >= minNokta ise kuyruk := kuyruk + kom
    bitir
    kume := kume + 1
  bitir

  yaz('Bulunan küme sayısı: ' + kume, 1)
  0'dan kume - 1'e kadar her c için
    yaz(Biçimle('  Küme {}: {} nokta', c, Uzunluk(Süz(etiket, fonksiyon(e: tamsayı) => e = c))), 1)
  yaz('  Gürültü: ' + Eşle(Süz(Aralık(Uzunluk(P)), fonksiyon(j: tamsayı) => etiket[j] = -1), fonksiyon(j: tamsayı) => P[j]), 1)
bitir.
