program TakvimÖrneği
{ Takvim birimi: tarih oluşturma, yazma, okuma ve tarih hesapları.
  Zaman, 1 Ocak 1970'ten beri geçen saniye (Unix saniyesi) olarak bir tamsayıdır; bu yüzden
  tarihler karşılaştırılabilir, sıralanabilir ve çıkarılabilir. Hesaplar UTC'dedir; yerel saat
  için YerelFark (dakika) eklenir. Çıktının her çalıştırmada aynı olması için saat sabitlendi. }
kullan Takvim

değişken
  an, doğum, bayram, sonraki, z: tamsayı
  p: sözlük
  yaş, i: tamsayı

başla
  BenzetimZamanı(TarihYap(2026, 11, 10, 19, 30, 0), 180)   { 180 dk: Türkiye saati, UTC+3 }
  an := Şimdi      { 'şimdi' adlı bir değişken Şimdi işlevini gölgelerdi: adlar büyük/küçük harfe duyarsızdır }
  yaz('Şimdi (UTC)   : ' + TarihYaz(an), 1)
  yaz('Yerel saat    : ' + TarihYaz(an + YerelFark * 60, 'GG.AA.YYYY SS:DD'), 1)
  yaz('Uzun yazım    : ' + TarihYaz(an, 'G AAAA YYYY GGGG'), 1)
  yaz('Kısa yazım    : ' + TarihYaz(an, 'GGG, G AAA YY'), 1)
  yaz('Düz metinle   : ' + TarihYaz(an, '[Saat] SS:DD, [gün] G'), 1)
  yaz('', 1)

  p := Parçala(an)
  yaz('Yılın ' + p['yılGünü'] + '. günü, ' + HaftaNo(an) + '. hafta, haftanın ' + p['haftaGünü'] + '. günü', 1)
  yaz('2026 artık yıl mı? ' + Metin(ArtıkYıl(2026)) + ' — 2028? ' + Metin(ArtıkYıl(2028)), 1)
  yaz('Şubat 2028: ' + AydakiGünSayısı(2028, 2) + ' gün', 1)
  yaz('', 1)

  doğum := TarihOku('23.04.2010', 'GG.AA.YYYY')
  yaş := p['yıl'] - Parçala(doğum)['yıl']
  eğer YılEkle(doğum, yaş) > an ise yaş := yaş - 1
  yaz('Doğum: ' + TarihYaz(doğum, 'G AAAA YYYY, GGGG') + ' → ' + yaş + ' yaşında', 1)
  sonraki := YılEkle(doğum, yaş + 1)
  yaz('Sonraki doğum gününe ' + GünFarkı(an, sonraki) + ' gün var (' + GünAdı(sonraki) + ')', 1)
  yaz('', 1)

  bayram := TarihOku('2026-10-29')
  yaz('Cumhuriyet Bayramı ' + TarihYaz(bayram, 'YYYY') + ': ' + GünAdı(bayram) + ', ' +
      GünFarkı(bayram, an) + ' gün önce', 1)
  yaz('100 gün sonra : ' + TarihYaz(GünEkle(an, 100), 'G AAAA YYYY'), 1)
  yaz('31 Ocak + 1 ay: ' + TarihYaz(AyEkle(TarihYap(2026, 1, 31), 1), 'G AAAA YYYY'), 1)
  yaz('', 1)

  yaz('Önümüzdeki 4 cuma:', 1)
  z := GünBaşı(an)
  i := 0
  i < 4 iken
  başla
    z := GünEkle(z, 1)
    eğer HaftaGünü(z) = 5 ise
    başla
      yaz('  ' + TarihYaz(z, 'GG AAAA'), 1)
      i += 1
    bitir
  bitir
bitir.
