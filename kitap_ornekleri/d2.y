program Metinler
değişken
  s: metin
  kelimeler: liste
  i: tamsayı
başla
  s := 'Yöntem dili'
  yaz('Uzunluk      : ' + Uzunluk(s), 1)
  yaz('İlk harf     : ' + s[1], 1)                // metinler 1'den başlar
  yaz('Son harf     : ' + s[Uzunluk(s)], 1)
  yaz('AltMetin     : ' + AltMetin(s, 8, 4), 1)
  yaz('Konum(''dil'') : ' + Konum('dil', s), 1)
  yaz('Büyük harf   : ' + s.BüyükHarf, 1)
  yaz('Değiştir     : ' + Değiştir(s, 'dili', 'programı'), 1)
  kelimeler := Ayır('elma,armut,kiraz', ',')
  yaz('Ayır         : ' + kelimeler, 1)
  yaz('Birleştir    : ' + Birleştir(kelimeler, ' + '), 1)
  yaz('Tersten      : ')
  Uzunluk(s)'den 1'e adımda 1 azalan her i için yaz(s[i])
  yaz('', 1)
bitir.
