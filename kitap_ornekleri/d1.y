program AltProgramlar

prosedür Çizgi(uzunluk: tamsayı = 20; karakter: metin = '-')
değişken
  i: tamsayı
başla
  1'den uzunluk'a kadar her i için yaz(karakter)
  yaz('', 1)
bitir

fonksiyon Kare(x: ondalık): ondalık
başla
  sonuç := x * x
bitir

fonksiyon Faktöriyel(n: tamsayı): tamsayı
başla
  eğer n <= 1 ise dön 1                   // dön: değeri ver ve hemen çık
  dön n * Faktöriyel(n - 1)              // özyineleme
bitir

prosedür Takas(değişken a, b: tamsayı)   // referansla parametre
değişken
  geçici: tamsayı
başla
  geçici := a
  a := b
  b := geçici
bitir

değişken
  x, y: tamsayı

başla
  Çizgi
  yaz('Kare(1.5)    = ' + Kare(1.5), 1)
  yaz('Faktöriyel(20) = ' + Faktöriyel(20), 1)
  x := 1;  y := 2
  Takas(x, y)
  yaz('Takas sonrası: x = ' + x + ', y = ' + y, 1)
  Çizgi(10, '=')
bitir.
