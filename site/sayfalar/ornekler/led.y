program YanıpSönenLED
kullan Donanım

değişken
  i: tamsayı
  yanık: mantıksal

başla
  PinKipi(YerleşikLED, Çıkış)
  yanık := yanlış
  1'den 6'ya kadar her i için
  başla
    yanık := değil yanık
    PinYaz(YerleşikLED, yanık)
    yaz(Biçimle('{:5} ms  LED {}', Milisaniye, eğer yanık ise 'yanık' değilse 'sönük'), 1)
    Bekle(500)
  bitir
  yaz('Bitti.', 1)
bitir.
