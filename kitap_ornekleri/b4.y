program Tanışma
değişken
  ad: metin
  doğumYılı, yaş: tamsayı
başla
  yaz('Adınız: ')
  oku(ad, 1)
  yaz('Doğum yılınız: ')
  oku(doğumYılı, 1)
  yaş := 2026 - doğumYılı
  yaz('Merhaba ' + ad + ', bu yıl ' + yaş + ' yaşındasınız.', 2)
  yaz('Güle güle!', 1)
bitir.
