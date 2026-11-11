program TakvimTesti
{ Takvim biriminin sınır durumları ve hata mesajları. }
kullan Takvim

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
  yaz(TarihYap(1970, 1, 1), 1)
  yaz(TarihYap(2000, 2, 29, 23, 59, 59), 1)
  yaz(TarihYap(1, 1, 1) + ' ' + TarihYap(9999, 12, 31, 23, 59, 59), 1)
  yaz(TarihYaz(0) + ' | ' + TarihYaz(-1) + ' | ' + TarihYaz(951868799) + ' | ' + TarihYaz(1.9), 1)
  yaz(TarihYaz(TarihYap(1, 1, 1), 'YYYY-AA-GG GGGG') + ' | ' + TarihYaz(253402300799, 'G.A.YY GGG'), 1)
  yaz(Parçala(TarihYap(2024, 12, 31, 7, 8, 9)), 1)
  yaz(HaftaNo(TarihYap(2021, 1, 3)) + ' ' + HaftaNo(TarihYap(2021, 1, 4)) + ' ' + HaftaNo(TarihYap(2020, 12, 31)) + ' ' +
      HaftaNo(TarihYap(2024, 12, 30)) + ' ' + HaftaNo(TarihYap(2026, 1, 1)), 1)
  yaz(TarihYaz(AyEkle(TarihYap(2024, 1, 31), 1), 'G AAAA') + ', ' + TarihYaz(AyEkle(TarihYap(2024, 3, 31), -1), 'G AAAA') + ', ' +
      TarihYaz(AyEkle(TarihYap(2024, 11, 15), 3), 'G AAAA YYYY') + ', ' + TarihYaz(YılEkle(TarihYap(2024, 2, 29), 1), 'G AAAA YYYY') + ', ' +
      TarihYaz(AyEkle(TarihYap(2024, 1, 15), -13), 'G AAAA YYYY'), 1)
  yaz(GünFarkı(TarihYap(2024, 1, 1), TarihYap(2025, 1, 1)) + ' ' + GünFarkı(TarihYap(2025, 1, 1), TarihYap(2024, 1, 1)) + ' ' +
      GünFarkı(TarihYap(2026, 5, 1, 23, 59, 59), TarihYap(2026, 5, 2)), 1)
  yaz(TarihYaz(GünBaşı(TarihYap(2026, 5, 1, 13, 0, 0))) + ' | ' + TarihYaz(GünBaşı(-1)) + ' | ' + TarihYaz(SaniyeEkle(0, 86399)), 1)
  yaz(GünAdı(1) + ' ' + GünAdı(7) + ' ' + GünAdı(TarihYap(2026, 11, 10)) + ' ' + AyAdı(1) + ' ' + AyAdı(12), 1)
  yaz(Metin(ArtıkYıl(1900)) + ' ' + Metin(ArtıkYıl(2000)) + ' ' + Metin(ArtıkYıl(2024)) + ' ' + AydakiGünSayısı(1900, 2) + ' ' +
      Metin(GeçerliTarih(2023, 2, 29)) + ' ' + Metin(GeçerliTarih(2024, 2, 29)) + ' ' + Metin(GeçerliTarih(2024, 13, 1)), 1)
  yaz(TarihOku('2026-11-10') + ' ' + TarihOku(' 2026-11-10T19:30 ') + ' ' + TarihOku('2026-11-10 19:30:05'), 1)
  yaz(TarihYaz(TarihOku('5 kasım 2026', 'G AAAA YYYY')) + ' | ' + TarihYaz(TarihOku('Cum, 1 ŞUB 26 08:05', 'GGG, G AAA YY SS:DD')) + ' | ' +
      TarihYaz(TarihOku('Saat 07:15, gün 3', '[Saat] SS:DD, [gün] G')), 1)
  yaz(TarihYaz(0, 'YYYYAAGG-SSDDSN [YYYY] xyz') + ' | ' + TarihYaz(0, '') + '|', 1)
  yaz(Metin(Şimdi > 1700000000) + ' ' + Metin(YerelFark >= -720 ve YerelFark <= 840), 1)
  BenzetimZamanı(1000, -300)
  yaz(Şimdi + ' ' + YerelFark, 1)
  Sına('30 şubat', prosedür başla TarihYap(2026, 2, 30) bitir)
  Sına('ay 13', prosedür başla TarihYap(2026, 13, 1) bitir)
  Sına('yıl 0', prosedür başla TarihYap(0, 1, 1) bitir)
  Sına('saat 24', prosedür başla TarihYap(2026, 1, 1, 24) bitir)
  Sına('ondalık yıl', prosedür başla TarihYap(2026.5, 1, 1) bitir)
  Sına('metin zaman', prosedür başla TarihYaz('bugün') bitir)
  Sına('aralık dışı', prosedür başla TarihYaz(253402300800) bitir)
  Sına('taşma', prosedür başla GünEkle(TarihYap(9999, 12, 31), 1) bitir)
  Sına('yıl taşması', prosedür başla YılEkle(TarihYap(9999, 1, 1), 1) bitir)
  Sına('okunamadı', prosedür başla TarihOku('10/11/2026') bitir)
  Sına('kalıba uymuyor', prosedür başla TarihOku('10-11-2026', 'GG.AA.YYYY') bitir)
  Sına('fazla metin', prosedür başla TarihOku('10.11.2026 x', 'GG.AA.YYYY') bitir)
  Sına('geçersiz gün', prosedür başla TarihOku('31.04.2026', 'GG.AA.YYYY') bitir)
  Sına('ay adı', prosedür başla TarihOku('5 Kasim 2026', 'G AAAA YYYY'); yaz('fold tamam', 1) bitir)
  Sına('bilinmeyen ay', prosedür başla TarihOku('5 Brumaire 2026', 'G AAAA YYYY') bitir)
  Sına('kapanmamış', prosedür başla TarihYaz(0, 'GG [gün') bitir)
  Sına('ay adı sınır', prosedür başla AyAdı(0) bitir)
  Sına('argüman', prosedür başla TarihYap(2026, 1) bitir)
bitir.
