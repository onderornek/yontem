program SayıTahmini
değişken
  gizli, tahmin, deneme: tamsayı
başla
  Rastgeleleştir(7)              // her çalıştırmada aynı sayı (deneme için)
  gizli := Rastgele(1, 100)
  deneme := 0
  tahmin := -1
  tahmin <> gizli iken
  başla
    yaz('Tahmininiz: ')
    oku(tahmin, 1)
    deneme += 1
    eğer tahmin < gizli ise yaz('Daha büyük.', 1)
    değilse eğer tahmin > gizli ise yaz('Daha küçük.', 1)
  bitir
  yaz('Bildiniz! ' + deneme + ' denemede.', 1)
bitir.
