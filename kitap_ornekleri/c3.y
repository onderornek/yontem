program ÇarpımTablosu
değişken
  i, j: tamsayı
başla
  1'den 5'e kadar her i için
  başla
    1'den 5'e kadar her j için
      yaz(Biçimle('{:4}', i * j))
    yaz('', 1)
  bitir
  yaz('Geri sayım: ')
  10'dan 0'a azalarak adım 2 her i için
    yaz(i + ' ')
  yaz('Ateş!', 1)
bitir.
