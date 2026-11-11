program HoşGeldiniz
{ Yöntem oyun alanına hoş geldiniz!
  Kodu değiştirin, Ctrl+Enter ile çalıştırın. Üstteki listeden kitaptaki örnekleri açabilirsiniz. }

tip
  Hayvan = sınıf
    ad: metin
    kurucu Oluştur(a: metin); başla ad := a; bitir
    fonksiyon Ses: metin; başla dön '...'; bitir
    fonksiyon Tanıt: metin; başla dön ad + ' der ki: ' + Ses; bitir
  bitir
  Kedi = sınıf(Hayvan)
    fonksiyon Ses: metin; başla dön 'Miyav'; bitir
  bitir

değişken
  i: tamsayı
  kareler: liste
  sepet: sözlük

fonksiyon Faktöriyel(n: tamsayı): tamsayı
başla
  eğer n <= 1 ise dön 1
  dön n * Faktöriyel(n - 1)
bitir

başla
  yaz('Merhaba, Dünya!', 1)

  // Türkçe ekli döngüler
  kareler := []
  1'den 10'a kadar her i için
    kareler.Ekle(i * i)
  yaz('Kareler: ' + kareler, 1)

  // Fonksiyonel yazım ve boru işleci
  yaz('Çift karelerin toplamı: ' + (kareler |> Süz(fonksiyon(x) => x mod 2 = 0) |> Toplam), 1)

  // Büyük tamsayılar
  yaz('30! = ' + Faktöriyel(30), 1)

  // Sözlükler ve çok seçenekli karar
  sepet := ['elma': 3, 'armut': 0, 'kiraz': 12]
  sepet içindeki her meyve, adet için
    adet değerine göre
      0: yaz(meyve + ': kalmadı', 1)
      1..5: yaz(meyve + ': az', 1)
    değilse: yaz(meyve + ': bol', 1)
    bitir

  // Nesneler ve kalıtım
  yaz(Kedi.Oluştur('Tekir').Tanıt, 1)
bitir.
