program BankaHesabı
tip
  Hesap = sınıf
  özel
    tutar: ondalık
  genel
    sahip: metin
    kurucu Oluştur(ad: metin; ilkPara: ondalık = 0)
    prosedür Yatır(miktar: ondalık)
    prosedür Çek(miktar: ondalık)
    fonksiyon Bakiye: ondalık
    fonksiyon MetneÇevir: metin
  bitir

kurucu Hesap.Oluştur(ad: metin; ilkPara: ondalık = 0)
başla
  sahip := ad
  tutar := ilkPara
bitir

prosedür Hesap.Yatır(miktar: ondalık)
başla
  tutar := tutar + miktar
bitir

prosedür Hesap.Çek(miktar: ondalık)
başla
  eğer miktar > tutar ise
    fırlat Hata('Yetersiz bakiye', 'BankaHatası')
  tutar := tutar - miktar
bitir

fonksiyon Hesap.Bakiye: ondalık
başla
  dön tutar
bitir

fonksiyon Hesap.MetneÇevir: metin
başla
  dön Biçimle('{} hesabı: {:.2} TL', sahip, tutar)
bitir

değişken
  h: Hesap
başla
  h := Hesap.Oluştur('Zeynep', 100)
  h.Yatır(250)
  h.Çek(80)
  yaz(h, 1)
  yaz('Bakiye: ' + h.Bakiye, 1)
  dene
    h.Çek(1000)
  yakala (hata)
    yaz(hata.tür + ': ' + hata.mesaj, 1)
  bitir
bitir.
