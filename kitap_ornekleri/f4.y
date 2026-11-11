program ÜçSınıf
kullan YZ, Matematik
değişken
  noktalar: liste
  etiketler: liste
  i, s: tamsayı
  X: tensör
  model, opt: herhangi
  kayıp: tensör
  epok: tamsayı
  merkezler: liste
başla
  Tohum(1)
  merkezler := [[0, 0], [3, 0], [1.5, 3]]
  noktalar := [];  etiketler := []
  0'dan 2'ye kadar her s için
    1'den 30'a kadar her i için
    başla
      noktalar.Ekle([merkezler[s][0] + Normal(0, 0.6), merkezler[s][1] + Normal(0, 0.6)])
      etiketler.Ekle(s)
    bitir
  X := Tensör(noktalar)

  model := Ardışık([Yoğun(2, 16, 'relu'), Yoğun(16, 3)])
  opt := Adam(model.Parametreler, 0.03)
  1'den 150'ye kadar her epok için
  başla
    opt.SıfırlaGrad
    kayıp := ÇaprazEntropi(model.İleri(X), etiketler)
    kayıp.GeriYay
    opt.Adım
    eğer epok mod 50 = 0 ise
      yaz(Biçimle('epok {:3}  kayıp {:.4}  doğruluk %{:.1}', epok, kayıp.Değer,
                  Doğruluk(model.Tahmin(X), etiketler) * 100), 1)
  bitir
  yaz('Yeni nokta [2.8, 0.2] sınıfı: ' + ArgMaks(model.Tahmin([[2.8, 0.2]]))[0], 1)
  yaz('Yeni nokta [1.4, 2.7] sınıfı: ' + ArgMaks(model.Tahmin([[1.4, 2.7]]))[0], 1)
bitir.
