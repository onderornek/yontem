program Merhaba
{ Yöntem dilinin temel öğeleri: değişkenler, döngüler, fonksiyonlar, biçimli çıktı }

sabit
  SINIR: tamsayı = 10
  SELAM: metin = 'Merhaba, Dünya!'

değişken
  i, toplam: tamsayı
  ortalama: ondalık
  ad: metin
  sayilar: liste

fonksiyon Faktoriyel(n: tamsayı): tamsayı
başla
  eğer n <= 1 ise
    sonuç := 1
  değilse
    sonuç := n * Faktoriyel(n - 1)
bitir

fonksiyon AsalMı(n: tamsayı): mantıksal
değişken
  d: tamsayı
başla
  eğer n < 2 ise dön yanlış
  d := 2
  d * d <= n iken
  başla
    eğer n mod d = 0 ise dön yanlış
    d := d + 1
  bitir
  dön doğru
bitir

prosedür Değiştir(değişken a, b: tamsayı)   // referansla parametre
değişken
  gecici: tamsayı
başla
  gecici := a;  a := b;  b := gecici
bitir

değişken x, y: tamsayı

başla
  yaz(SELAM, 1)

  toplam := 0
  1'den SINIR'a kadar her i için
    toplam := toplam + i
  ortalama := toplam / SINIR
  yaz('1..' + SINIR + ' toplamı = ' + toplam + ', ortalama = ' + Biçimle('{:0.2}', ortalama), 1)

  yaz('Asal sayılar: ')
  1'den 30'a kadar her i için
    eğer AsalMı(i) ise yaz(i + ' ')
  yaz('', 1)

  yaz('10! = ' + Faktoriyel(10), 1)

  x := 3; y := 7
  Değiştir(x, y)
  yaz('Değiştir sonrası: x=' + x + ' y=' + y, 1)

  sayilar := [5, 3, 9, 1, 7]
  yaz('Sıralı: ' + Sırala(sayilar), 1)
  yaz('Kareler: ' + Eşle(sayilar, fonksiyon(n) => n * n), 1)
  yaz('Tekler: ' + (sayilar |> Süz(fonksiyon(n) => n mod 2 = 1)), 1)

  ad := 'yöntem'
  yaz('Büyük harf: ' + BüyükHarf(ad) + ' (uzunluk ' + Uzunluk(ad) + ', ilk harf ' + ad[1] + ')', 1)

  toplam mod 7 değerine göre
    0: yaz('7''ye tam bölünür', 1)
    1..3: yaz('Kalan küçük', 1)
    değilse: yaz('Kalan büyük', 1)
  bitir

  i := 0
  tekrarla
    i := i + 1
  i >= 5 olana dek
  yaz('tekrarla bitti, i = ' + i, 1)

  ['elma', 'armut', 'kiraz'] içindeki her s için
    yaz(s + '; ')
  yaz('', 1)
bitir.
