program SüreÇevir
değişken
  toplam, saat, dakika, saniye: tamsayı
başla
  yaz('Saniye: ')
  oku(toplam, 1)
  saat := toplam böl 3600
  dakika := (toplam mod 3600) böl 60
  saniye := toplam mod 60
  yaz(saat + ' saat ' + dakika + ' dakika ' + saniye + ' saniye', 1)
bitir.
