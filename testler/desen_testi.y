program DesenTesti
{ Desen biriminin sınır durumları ve hata mesajları. }
kullan Desen

değişken uzun: metin
  i: tamsayı

prosedür Sına(ad: metin; p: herhangi)
başla
  dene
    p()
    yaz(ad + ': hata yok', 1)
  yakala (h)
    yaz(ad + ': ' + h.mesaj, 1)
  bitir
bitir

başla
  yaz(Metin(Gruplar('abc', '')) + ' ' + Metin(BulHepsi('ab', '')) + ' ' + DesenDeğiştir('ab', '', '-') + ' ' + Metin(DesenAyır('ab', '')), 1)
  yaz(Metin(Gruplar('', 'a*')) + ' ' + Metin(Gruplar('', 'a+')) + ' ' + Metin(TamEşleşir('', '')) + ' ' + DesenKonumu('', 'x'), 1)
  yaz(Metin(Gruplar('aaa', '(a+?)(a*)')) + ' ' + Metin(Gruplar('aaa', '(a+)(a*)')) + ' ' + Metin(Gruplar('aaa', '(a??)(a{2,})')), 1)
  yaz(Metin(Gruplar('ab', '(a)|(b)')) + ' ' + Metin(Gruplar('b', '(a)|(b)')) + ' ' + Metin(Gruplar('abab', '(?:(a)|(b))+')), 1)
  yaz(Metin(BulHepsi('a1 b22 c333', '[a-c]\d{2,}')) + ' ' + Metin(BulHepsi('x-y_z', '[\w-]+')) + ' ' + Metin(BulHepsi('a]b^c', '[]^]')) + ' ' +
      Metin(BulHepsi('a.b', '[.]')) + ' ' + Metin(BulHepsi('a-b', '[a\-]')), 1)
  yaz(Metin(BulHepsi('çay şeker ığdır', '\w+')) + ' ' + Metin(BulHepsi('bir iki, üç', '\b\w')) + ' ' + Metin(BulHepsi('ab', '\B')), 1)
  yaz(Metin(BulHepsi('a{2} a{,3} a{x}', 'a\{\d\}|a{,3}|a{x}')) + ' ' + Metin(TamEşleşir('{', '{')) + ' ' + Metin(TamEşleşir('aa', 'a{2}')) + ' ' +
      Metin(TamEşleşir('aaaa', 'a{2,3}')) + ' ' + Metin(TamEşleşir('aaa', 'a{2,}')), 1)
  yaz(Metin(Eşleşir('satır1' + #10 + 'satır2', 'r1.s')) + ' ' + Metin(Eşleşir('a' + #9 + 'b', 'a\tb')) + ' ' + Metin(Eşleşir('a b', 'a\sb')) + ' ' +
      Metin(BulHepsi('1 + 2 = 3', '\D+')) + ' ' + Metin(BulHepsi('a b', '\S')) + ' ' + Metin(BulHepsi('a_1 !', '\W')), 1)
  yaz(Metin(BulHepsi('İI ıi', '[i]', 'i')) + ' ' + Metin(BulHepsi('aBc', '[A-Z]', 'i')) + ' ' + Metin(BulHepsi('aBc', '[^b]', 'i')) + ' ' +
      Metin(TamEşleşir('ŞĞÜÖÇ', 'şğüöç', 'i')) + ' ' + Metin(TamEşleşir('STRASSE', 'straße', 'i')), 1)
  yaz(DesenDeğiştir('ab', '(a)(b)', '$2$1$0$$') + ' ' + DesenDeğiştir('abc', 'b', '$') + ' ' + DesenDeğiştir('abc', '(x)?b', '[$1]') + ' ' +
      DesenDeğiştir('aaa', 'a*?', '-') + ' ' + DesenDeğiştir('AbAb', 'b', 'x', 'i'), 1)
  yaz(Metin(DesenAyır('a1b22c', '\d+')) + ' ' + Metin(DesenAyır('1a1', '\d')) + ' ' + Metin(DesenAyır('abc', 'x')) + ' ' + Metin(DesenAyır('', ',')), 1)
  yaz(DesenKaçış('a.b*c\d[e]{f}|g^h$') + ' ' + Metin(DesenGeçerli('(a|b)+')) + ' ' + Metin(DesenGeçerli('(a')) + ' ' + Metin(DesenGeçerli(5)), 1)
  uzun := ''
  1'den 15'e kadar her i için uzun := uzun + uzun + 'ab'
  yaz(Uzunluk(uzun) + ' ' + Uzunluk(Bul(uzun, '.*')) + ' ' + Uzunluk(Bul(uzun, '(?:ab)+')) + ' ' + Uzunluk(BulHepsi(uzun, 'a')) + ' ' +
      Uzunluk(Bul(uzun, '.*?b$')) + ' ' + Uzunluk(DesenDeğiştir(uzun, 'b', '')), 1)
  Sına('felaket deseni', prosedür başla yaz(Eşleşir('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!', '(a+)+$'), 1) bitir)
  Sına('kapanmamış grup', prosedür başla Eşleşir('a', '(a') bitir)
  Sına('fazla ayraç', prosedür başla Eşleşir('a', 'a)') bitir)
  Sına('kapanmamış küme', prosedür başla Eşleşir('a', '[a') bitir)
  Sına('boş tekrar', prosedür başla Eşleşir('a', '*a') bitir)
  Sına('çift tekrar', prosedür başla yaz(Bul('aaa', 'a+*'), 1) bitir)
  Sına('ters aralık', prosedür başla Eşleşir('a', '[z-a]') bitir)
  Sına('ters sayı', prosedür başla Eşleşir('a', 'a{3,1}') bitir)
  Sına('ileri bakış', prosedür başla Eşleşir('a', 'a(?=b)') bitir)
  Sına('geri başvuru', prosedür başla Eşleşir('aa', '(a)\1') bitir)
  Sına('sonda ters bölü', prosedür başla Eşleşir('a', 'a\') bitir)
  Sına('konum tekrarı', prosedür başla Eşleşir('a', '^*') bitir)
  Sına('seçenek', prosedür başla Eşleşir('a', 'a', 'g') bitir)
  Sına('olmayan grup', prosedür başla DesenDeğiştir('a', 'a', '$1') bitir)
  Sına('sayı metin', prosedür başla Eşleşir(5, 'a') bitir)
  Sına('desen sayı', prosedür başla Eşleşir('a', 5) bitir)
  Sına('argüman', prosedür başla Bul('a') bitir)
bitir.
