program XorÇıkarım
{ Masaüstünde eğitilen XOR ağını (XorModeli.y) ESP32'de çalıştırır.
  GPIO 18 ve 19'daki iki anahtarın durumunu okur, ağın tahminine göre LED'i yakar.
  Benzetimde dört giriş birleşimi sırayla denenir. }
kullan Donanım, YZ, XorModeli

sabit
  ANAHTAR1: tamsayı = 18
  ANAHTAR2: tamsayı = 19

değişken
  a, b, i: tamsayı
  çıktı: tensör
  olasılık: ondalık

başla
  PinKipi(ANAHTAR1, Giriş); PinKipi(ANAHTAR2, Giriş); PinKipi(YerleşikLED, Çıkış)
  0'dan 3'e kadar her i için
  başla
    eğer Benzetim ise başla PinYaz(ANAHTAR1, i böl 2 = 1); PinYaz(ANAHTAR2, i mod 2 = 1) bitir
    a := eğer PinOku(ANAHTAR1) ise 1 değilse 0
    b := eğer PinOku(ANAHTAR2) ise 1 değilse 0
    çıktı := Tahmin(Tensör([a, b]))
    olasılık := çıktı[0]
    PinYaz(YerleşikLED, olasılık > 0.5)
    yaz(Biçimle('{} XOR {} → {:.4}  LED {}', a, b, olasılık, eğer olasılık > 0.5 ise 'yanık' değilse 'sönük'), 1)
    Bekle(500)
  bitir
bitir.
