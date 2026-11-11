program Günler
değişken
  gün: tamsayı
başla
  1'den 7'ye kadar her gün için
  başla
    yaz(gün + ': ')
    gün değerine göre
      1: yaz('Pazartesi')
      2: yaz('Salı')
      3: yaz('Çarşamba')
      4: yaz('Perşembe')
      5: yaz('Cuma')
    değilse
      yaz('Hafta sonu')
    bitir
    gün değerine göre
      1..5: yaz(' (iş günü)', 1)
      6, 7: yaz(' (tatil)', 1)
    bitir
  bitir
bitir.
