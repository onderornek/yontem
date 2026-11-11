program SeriKonsol
{ Seri porttan satır satır komut okur: 'aç', 'kapa', 'durum', 'pwm <0-255>', 'son'.
  Kartta seri izleyiciden (115200 baud) komut yazın; masaüstünde girdi dosyadan gelir. }
kullan Donanım

değişken
  komut, ad: metin
  parçalar: metin dizisi
  led: mantıksal
  parlaklık: tamsayı

başla
  PinKipi(YerleşikLED, Çıkış)
  yaz('Komutlar: aç, kapa, durum, pwm <0-255>, son', 1)
  tekrarla
    oku(komut, 1)
    parçalar := KüçükHarf(Kırp(komut)).Ayır
    eğer Uzunluk(parçalar) = 0 ise devam
    ad := parçalar[0]
    ad değerine göre
      'aç': başla led := doğru; PinYaz(YerleşikLED, led); yaz('LED yandı', 1) bitir
      'kapa': başla led := yanlış; PinYaz(YerleşikLED, led); yaz('LED söndü', 1) bitir
      'durum': yaz('LED ' + (eğer led ise 'yanık' değilse 'sönük') + ', parlaklık ' + parlaklık, 1)
      'pwm':
        eğer Uzunluk(parçalar) < 2 ise yaz('Kullanım: pwm <0-255>', 1)
        değilse başla
          parlaklık := tamsayı(parçalar[1])
          PWMYaz(YerleşikLED, parlaklık)
          yaz('Parlaklık ' + parlaklık, 1)
        bitir
      'son': yaz('Görüşmek üzere.', 1)
    değilse yaz('Bilinmeyen komut: ' + ad, 1)
    bitir
  ad = 'son' olana dek
bitir.
