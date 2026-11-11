program HiyerarşikKümeleme
{ Birleştirici (aşağıdan yukarı) kümeleme: her nokta kendi kümesiyle başlar; her adımda en yakın
  iki küme birleşir. Birleşme sırası bir ağaç (dendrogram) oluşturur; ağacı istediğiniz yükseklikte
  keserek istediğiniz sayıda küme elde edersiniz. Kümeler arası uzaklık: ortalama bağlantı. }
kullan Matematik

değişken
  P: ondalık dizisi dizisi
  adlar: metin dizisi
  kümeler: tamsayı dizisi dizisi
  a, b, i, j, enA, enB: tamsayı
  d, enD: ondalık

fonksiyon Uzaklık(A, B: tamsayı dizisi): ondalık
değişken x, y: tamsayı
başla
  sonuç := 0
  A içindeki her x için
    B içindeki her y için
      sonuç := sonuç + Kök((P[x][0] - P[y][0]) ** 2 + (P[x][1] - P[y][1]) ** 2)
  sonuç := sonuç / (Uzunluk(A) * Uzunluk(B))
bitir

fonksiyon Ad(K: tamsayı dizisi): metin
başla
  sonuç := '{' + Birleştir(Eşle(K, fonksiyon(x: tamsayı) => adlar[x]), ' ') + '}'
bitir

başla
  { Altı şehrin kabaca konumu (yüz km cinsinden, doğu ve kuzey) }
  adlar := ['İstanbul', 'Bursa', 'İzmir', 'Ankara', 'Konya', 'Kayseri']
  P := [[2.9, 4.1], [2.9, 3.4], [0.9, 2.6], [5.9, 3.1], [5.3, 1.6], [7.7, 2.3]]
  kümeler := Eşle(Aralık(Uzunluk(P)), fonksiyon(x: tamsayı) => [x])
  i := 1
  Uzunluk(kümeler) > 1 iken
  başla
    enD := 1e9
    0'dan Uzunluk(kümeler) - 2'ye kadar her a için
      a + 1'den Uzunluk(kümeler) - 1'e kadar her b için
      başla
        d := Uzaklık(kümeler[a], kümeler[b])
        eğer d < enD ise başla enD := d; enA := a; enB := b bitir
      bitir
    yaz(Biçimle('Adım {}: {:5.2} yükseklikte  {} + {}', i, enD, Ad(kümeler[enA]), Ad(kümeler[enB])), 1)
    kümeler[enA] := kümeler[enA] + kümeler[enB]
    kümeler.Sil(enB)
    eğer Uzunluk(kümeler) = 3 ise yaz('        → 3 kümede kesilirse: ' + Birleştir(Eşle(kümeler, @Ad), ', '), 1)
    i := i + 1
  bitir
bitir.
