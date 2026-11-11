program HızlıBaşvuru
sabit
  SINIR: tamsayı = 5

tip
  Nokta = kayıt
    x, y: ondalık
  bitir

değişken
  toplam: tamsayı
  adlar: metin listesi
  yaşlar: tamsayı sözlüğü
  n: Nokta

fonksiyon Küp(k: tamsayı): tamsayı
başla
  dön k * k * k
bitir

başla
  toplam := 0
  1'den SINIR'a kadar her i için
    toplam := toplam + Küp(i)
  yaz('Toplam: ' + toplam, 1)

  adlar := ['Ada', 'Can', 'Ece']
  adlar içindeki her ad için
    eğer Uzunluk(ad) > 2 ise
      yaz(ad, 1)

  yaşlar := ['Ada': 12, 'Can': 14]
  yaşlar içindeki her ad, yaş için
    yaz(ad + ': ' + yaş, 1)
  toplam := 3
  toplam > 0 iken
    toplam := toplam - 1

  n.x := 3.0
  n.y := 4.0
  yaz(Kök(n.x * n.x + n.y * n.y), 1)

  dene
    yaz(10 böl 0, 1)
  yakala (h)
    yaz('Yakalandı: ' + h.mesaj, 1)
  bitir
bitir.
