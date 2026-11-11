program I2CSıcaklık
{ 0x48 adresindeki TMP102 benzeri bir sıcaklık algılayıcısını okur:
  0 numaralı yazmaç 12 bitlik sıcaklık değeri verir (1 birim = 0,0625 °C).
  Benzetimde algılayıcının yazmaçlarına önceden örnek değerler yazılır. }
kullan Donanım

sabit
  ADRES: tamsayı = $48

değişken
  ham: tamsayı dizisi
  okuma, i: tamsayı
  sicaklik: ondalık
  ölçümler: tamsayı dizisi

fonksiyon Santigrat(yüksek, düşük: tamsayı): ondalık
değişken d: tamsayı
başla
  d := yüksek * 16 + düşük böl 16
  eğer d >= 2048 ise d := d - 4096
  sonuç := d * 0.0625
bitir

başla
  I2CBaşlat(21, 22, 400000)
  ölçümler := [$19, $1A, $1B, $1A]
  1'den 4'e kadar her i için
  başla
    eğer Benzetim ise I2CYaz(ADRES, [0, ölçümler[i - 1], $40])
    ham := I2CYazOku(ADRES, [0], 2)
    sicaklik := Santigrat(ham[0], ham[1])
    yaz(Biçimle('Ölçüm {}: {:.2} °C', i, sicaklik), 1)
    Bekle(1000)
  bitir
bitir.
