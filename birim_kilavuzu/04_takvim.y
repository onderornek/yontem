program SınavTakvimi
{ Takvim birimi: tarih okuma, yazma ve gün hesabı. }
kullan Takvim

değişken
  bugün, sınav, teslim: tamsayı

başla
  BenzetimZamanı(TarihYap(2026, 11, 10, 9, 0, 0), 180)   { testler için sabit saat; UTC+3 }
  bugün := Şimdi
  sınav := TarihOku('15.01.2027', 'GG.AA.YYYY')
  yaz('Bugün : ' + TarihYaz(bugün + YerelFark * 60, 'G AAAA YYYY GGGG, SS:DD'), 1)
  yaz('Sınav : ' + TarihYaz(sınav, 'G AAAA YYYY GGGG') + ' — ' + GünFarkı(bugün, sınav) + ' gün kaldı', 1)
  teslim := AyEkle(GünBaşı(bugün), 1)
  yaz('Ödev teslimi (bir ay sonra): ' + TarihYaz(teslim, 'GG.AA.YYYY') + ', ' + HaftaNo(teslim) + '. hafta', 1)
  eğer HaftaGünü(teslim) > 5 ise yaz('  Hafta sonuna denk geliyor; pazartesi: ' + TarihYaz(GünEkle(teslim, 8 - HaftaGünü(teslim)), 'GG.AA.YYYY'), 1)
  yaz('Şubat 2028 ' + AydakiGünSayısı(2028, 2) + ' gün; 2028 artık yıl mı: ' + Metin(ArtıkYıl(2028)), 1)
bitir.
