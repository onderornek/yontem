program Otokodlayıcı
{ Otokodlayıcı: girdiyi kendisine kopyalamayı öğrenen bir ağ — ama ortada dar bir boğaz vardır.
  Kodlayıcı girdiyi küçük bir koda sıkıştırır, çözücü koddan girdiyi geri kurar.
  Etiket gerekmez: hedef girdinin kendisidir. Boğazdan geçebilmek için ağ verinin özünü yakalamak zorundadır.
  Klasik deney: 8 farklı "tek-sıcak" vektörü 3 sayıya sıkıştırmak (8 = 2³, yani ikili kod yeterli). }
kullan YZ

değişken
  X, kod, geri: tensör
  kodlayıcı, çözücü, opt: herhangi
  kayıp: tensör
  i, adım, isabet: tamsayı

başla
  Tohum(21)
  X := BirSıcak([0, 1, 2, 3, 4, 5, 6, 7], 8)       { 8 × 8 birim matris }
  kodlayıcı := Ardışık([Yoğun(8, 3, 'sigmoid')])
  çözücü := Ardışık([Yoğun(3, 8)])
  opt := Adam(kodlayıcı.Parametreler + çözücü.Parametreler, 0.1)
  1'den 1500'e kadar her adım için
  başla
    opt.SıfırlaGrad
    kayıp := ÇaprazEntropi(çözücü.İleri(kodlayıcı.İleri(X)), X)   { ÇaprazEntropi softmaksı kendisi uygular }
    kayıp.GeriYay
    opt.Adım
    eğer adım = 1 veya adım mod 500 = 0 ise
      yaz(Biçimle('Adım {:4}: yeniden kurma kaybı {:.4}', adım, kayıp.Değer), 1)
  bitir

  kod := kodlayıcı.İleri(X)
  geri := Softmaks(çözücü.İleri(kod))
  yaz('Girdi  →  3 sayılık kod        →  geri kurulan', 1)
  isabet := 0
  0'dan 7'ye kadar her i için
  başla
    yaz(Biçimle('  {}    →  ({:.2}, {:.2}, {:.2})  →  {}', Birleştir(Eşle(Aralık(8), fonksiyon(k: tamsayı) => eğer k = i ise '1' değilse '0'), ''),
      kod[i, 0], kod[i, 1], kod[i, 2], ArgMaks(geri)[i]), 1)
    eğer ArgMaks(geri)[i] = i ise isabet := isabet + 1
  bitir
  yaz('Doğru geri kurulan: ' + isabet + ' / 8', 1)
bitir.
