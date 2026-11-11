program SıfıraKadar
değişken
  n, adet: tamsayı
  toplam: ondalık
başla
  toplam := 0;  adet := 0
  tekrarla
    yaz('Sayı (bitirmek için 0): ')
    oku(n, 1)
    eğer n <> 0 ise
    başla
      toplam += n
      adet += 1
    bitir
  n = 0 olana dek
  eğer adet > 0 ise
    yaz('Toplam = ' + toplam + ', ortalama = ' + toplam / adet, 1)
  değilse
    yaz('Hiç sayı girilmedi.', 1)
bitir.
