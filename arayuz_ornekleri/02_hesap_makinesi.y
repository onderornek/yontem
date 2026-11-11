program HesapMakinesi
{ İki sayı kutusu, bir işlem seçimi ve sonuç etiketi. Her değişiklikte sonuç yeniden hesaplanır. }
kullan Pencere

değişken
  a, b: herhangi
  işlem: herhangi
  sonuçEtiketi: herhangi

fonksiyon SayıMı(m: metin): mantıksal
değişken i: tamsayı
başla
  sonuç := Uzunluk(m) > 0
  1'den Uzunluk(m)'ye kadar her i için
    eğer değil (m[i] içinde '0123456789') ise sonuç := yanlış
bitir

prosedür Hesapla
değişken x, y: tamsayı
başla
  eğer değil (SayıMı(a.Metin) ve SayıMı(b.Metin)) ise
  başla
    sonuçEtiketi.Metin := 'İki tamsayı girin'
    dön
  bitir
  x := Tamsayı(a.Metin); y := Tamsayı(b.Metin)
  işlem.SeçiliMetin değerine göre
    '+': sonuçEtiketi.Metin := Metin(x) + ' + ' + Metin(y) + ' = ' + Metin(x + y)
    '−': sonuçEtiketi.Metin := Metin(x) + ' − ' + Metin(y) + ' = ' + Metin(x - y)
    '×': sonuçEtiketi.Metin := Metin(x) + ' × ' + Metin(y) + ' = ' + Metin(x * y)
    '÷': eğer y = 0 ise sonuçEtiketi.Metin := 'Sıfıra bölünemez'
         değilse sonuçEtiketi.Metin := Metin(x) + ' ÷ ' + Metin(y) + ' = ' + Biçimle('{:.2}', x / y)
  bitir
bitir

başla
  Başlık('Hesap Makinesi')
  a := GirişKutusu('Birinci sayı')
  b := GirişKutusu('İkinci sayı')
  işlem := SeçimKutusu(['+', '−', '×', '÷'])
  sonuçEtiketi := Etiket('İki tamsayı girin')
  a.Değişince(@Hesapla); b.Değişince(@Hesapla); işlem.Değişince(@Hesapla)
  Yerleştir(Yatay(a, işlem, b), sonuçEtiketi)

  eğer değil Canlı ise
  başla
    Gir(a, '12'); Gir(b, '5')
    yaz(sonuçEtiketi.Metin, 1)
    Seç(işlem, '×'); yaz(sonuçEtiketi.Metin, 1)
    Seç(işlem, 3); yaz(sonuçEtiketi.Metin, 1)
    Gir(b, '0'); yaz(sonuçEtiketi.Metin, 1)
    Gir(b, 'beş'); yaz(sonuçEtiketi.Metin, 1)
  bitir
  Çalıştır
bitir.
