program NotHesabı
değişken
  puan: tamsayı
  harf: metin
başla
  yaz('Sınav puanı (0-100): ')
  oku(puan, 1)

  eğer (puan < 0) veya (puan > 100) ise
    yaz('Geçersiz puan!', 1)
  değilse eğer puan >= 85 ise
    harf := 'AA'
  değilse eğer puan >= 70 ise
    harf := 'BB'
  değilse eğer puan >= 50 ise
    harf := 'CC'
  değilse
    harf := 'FF'

  eğer harf <> '' ise
  başla
    yaz('Harf notu: ' + harf, 1)
    yaz(eğer harf = 'FF' ise 'Kaldınız.' değilse 'Geçtiniz!', 1)
  bitir
bitir.
