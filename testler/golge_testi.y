program GölgeTesti
{ Gölgelenen adlar: bir değişken, sabit ya da parametre aynı adlı bir fonksiyonu gölgelediğinde
  çağrı hatası nedeni söyler. İki uygulama da aynı iletiyi verir. }
kullan Desen

sabit Kare: tamsayı = 4

değişken toplam: ondalık
  eşleşir: mantıksal
  p: liste

prosedür Sına(ad: metin; f: herhangi)
başla
  dene
    f()
    yaz(ad + ': hata yok', 1)
  yakala (h)
    yaz(ad + ': ' + h.mesaj, 1)
  bitir
bitir

fonksiyon Uzat(uzunluk: tamsayı): tamsayı
başla
  sonuç := Uzunluk('abc') + uzunluk
bitir

fonksiyon Yerel: tamsayı
değişken sıra: tamsayı
başla
  sıra := 1
  sonuç := Sıra('a') + sıra
bitir

başla
  p := [1, 2, 3]
  toplam := 0.5
  eşleşir := doğru
  Sına('değişken', prosedür başla yaz(Toplam(p), 1) bitir)
  Sına('sabit', prosedür başla yaz(Kare(3), 1) bitir)
  Sına('birim üyesi', prosedür başla yaz(Eşleşir('a', 'a'), 1) bitir)
  Sına('parametre', prosedür başla yaz(Uzat(2), 1) bitir)
  Sına('yerel değişken', prosedür başla yaz(Yerel, 1) bitir)
  Sına('lambda değişkeni çağrılabilir', prosedür
  değişken f: herhangi
  başla
    f := fonksiyon (x: tamsayı): tamsayı başla sonuç := x * 2 bitir
    yaz(f(21), 1)
  bitir)
bitir.
