program Fonksiyonel
değişken
  sayılar, kareler, çiftler: liste
  genelToplam: tamsayı
  kişiler: liste
  kare: herhangi

fonksiyon Sayaç: herhangi
değişken
  n: tamsayı
başla
  n := 0
  dön fonksiyon başla n := n + 1; sonuç := n; bitir
bitir

değişken s: herhangi

başla
  sayılar := [1..10]
  kare := fonksiyon(x) => x * x             // isimsiz fonksiyon (lambda)
  yaz('kare(7)  = ' + Çağır(kare, 7), 1)

  kareler := Eşle(sayılar, kare)
  çiftler := Süz(sayılar, fonksiyon(x) => x mod 2 = 0)
  genelToplam := İndirge(sayılar, fonksiyon(a, b) => a + b)
  yaz('Kareler  : ' + kareler, 1)
  yaz('Çiftler  : ' + çiftler, 1)
  yaz('Toplam   : ' + genelToplam, 1)

  // boru işleci: soldaki değer, sağdaki fonksiyonun ilk argümanı olur
  yaz('Boru     : ' + (sayılar |> Süz(fonksiyon(x) => x > 5) |> Eşle(kare) |> Toplam), 1)

  kişiler := [['ad': 'Can', 'yaş': 31], ['ad': 'Ada', 'yaş': 24], ['ad': 'Ege', 'yaş': 28]]
  yaz('Yaşa göre: ' + Eşle(Sırala(kişiler, fonksiyon(k) => k['yaş']), fonksiyon(k) => k['ad']), 1)

  s := Sayaç                                // kapanış: n değişkenini hatırlar
  Çağır(s);  Çağır(s)
  yaz('Sayaç    : ' + Çağır(s), 1)
bitir.
