program İkiSayı
değişken
  a, b: tamsayı
başla
  yaz('Aynı satıra iki sayı yazın: ')
  oku(a)
  oku(b, 1)
  yaz(a + ' + ' + b + ' = ' + (a + b), 1)
  yaz(Biçimle('Ortalama: {:.2}', (a + b) / 2), 1)
  yaz((a / b):10:3, 1)
bitir.
