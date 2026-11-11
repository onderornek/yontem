program KüçükGPTEğitimi
{ Kitabın asıl modeli: 2 katmanlı, 4 kafalı, 32 boyutlu, 16 karakterlik bağlama
  bakan küçük bir GPT. Atasözlerinin %90'ıyla eğitilir, %10'uyla sınanır.
  Eğitim verisi, atasözlerinin araya '.' konularak art arda dizildiği uzun bir
  metindir. Her adımda bu metinden rastgele 8 pencere seçeriz; her pencerede model,
  her konumda bir sonraki karakteri tahmin etmeye çalışır.
  Eğitimden sonra ağırlıklar 'kucuk_gpt.agirlik' dosyasına kaydedilir;
  9. bölümün programı bu dosyayı kullanır. }
kullan Atasozleri, DilAraclari, KucukGPT, YZ, Sistem, Matematik

sabit
  BAĞLAM: tamsayı = 16
  YIĞINBOYU: tamsayı = 8
  ADIMSAYISI: tamsayı = 3000
  ENYÜKSEKORAN: ondalık = 0.003

değişken
  veri, harfler: metin dizisi
  numara: sözlük
  eğitim, doğrulama: tamsayı dizisi
  model: GPT
  opt: herhangi
  kayıp: tensör
  adım, i, k, ayrım: tamsayı
  süre: ondalık
  sözcük: metin
  bağ: tamsayı dizisi
  P: tensör
  yığın: liste
  enİyi, eğitimKaybı, doğrulamaKaybı: ondalık
  işaret: metin

fonksiyon Pencereler(akış: tamsayı dizisi; adet: tamsayı): liste
{ Akıştan rastgele 'adet' pencere: [girdiler, hedefler]. Hedef, girdinin bir kaydırılmışı. }
değişken s, b: tamsayı; g, h: tamsayı dizisi
başla
  g := []; h := []
  1'den adet'e kadar her b için
  başla
    s := Rastgele(Uzunluk(akış) - BAĞLAM - 1)
    g := g + Dilim(akış, s, s + BAĞLAM)
    h := h + Dilim(akış, s + 1, s + BAĞLAM + 1)
  bitir
  dön [g, h]
bitir

fonksiyon OrtalamaKayıp(akış: tamsayı dizisi): ondalık
{ Akışın ilk 512 karakterini üst üste binmeyen pencerelerle tarar ve ortalama kaybı
  verir. (Tüm akışı taramak daha doğru ama yavaştır; tahmin için bu kadarı yeter.) }
değişken s, adet: tamsayı; g, h: tamsayı dizisi; top: ondalık
başla
  top := 0; adet := 0; s := 0
  s + BAĞLAM + 1 <= Min(Uzunluk(akış), 512) iken
  başla
    g := Dilim(akış, s, s + BAĞLAM); h := Dilim(akış, s + 1, s + BAĞLAM + 1)
    top := top + ÇaprazEntropi(model.İleri(g, 1, BAĞLAM), h).Değer
    adet := adet + 1; s := s + BAĞLAM
  bitir
  dön top / adet
bitir

fonksiyon Akış(parçalar: metin dizisi; numara: sözlük): tamsayı dizisi
başla
  dön DilAraclari.Kodla('.' + Birleştir(parçalar, '.') + '.', numara)
bitir

başla
  Tohum(2026)
  veri := Atasozleri.Hepsi
  harfler := DilAraclari.Harfler
  numara := DilAraclari.Numaralar(harfler)
  ayrım := Uzunluk(veri) * 9 böl 10
  eğitim := Akış(Dilim(veri, 0, ayrım), numara)
  doğrulama := Akış(Dilim(veri, ayrım, Uzunluk(veri)), numara)
  yaz(Biçimle('Eğitim akışı {} karakter, doğrulama akışı {} karakter', Uzunluk(eğitim), Uzunluk(doğrulama)), 1)

  model := GPT.Oluştur(Uzunluk(harfler), BAĞLAM, 32, 4, 2)
  model.bırakma := 0.2
  yaz(Biçimle('Model: 2 katman, 4 kafa, 32 boyut, {} parametre', model.ParametreAdedi), 1)
  opt := Adam(model.Parametreler, ENYÜKSEKORAN)
  süre := Sistem.Zaman

  enİyi := 1000.0
  1'den ADIMSAYISI'na kadar her adım için
  başla
    yığın := Pencereler(eğitim, YIĞINBOYU)
    { öğrenme oranı takvimi: kosinüs eğrisiyle en yüksek orandan sıfıra doğru azalır }
    opt.oran := ENYÜKSEKORAN * 0.5 * (1 + Cos(Matematik.pi * adım / ADIMSAYISI))
    model.eğitimde := doğru
    opt.SıfırlaGrad
    kayıp := ÇaprazEntropi(model.İleri(yığın[0], YIĞINBOYU, BAĞLAM), yığın[1])
    kayıp.GeriYay
    opt.Adım
    eğer adım = 1 veya adım mod 250 = 0 ise
    başla
      { değerlendirirken bırakma kapalı olmalı }
      model.eğitimde := yanlış
      eğitimKaybı := OrtalamaKayıp(eğitim)
      doğrulamaKaybı := OrtalamaKayıp(doğrulama)
      işaret := ''
      eğer doğrulamaKaybı < enİyi ise
      başla
        { erken durdurma: en iyi doğrulama kaybındaki ağırlıkları sakla }
        enİyi := doğrulamaKaybı; işaret := '  ← en iyi, kaydedildi'
        model.Kaydet('kucuk_gpt.agirlik')
      bitir
      yaz(Biçimle('Adım {:4}: eğitim kaybı {:.3}   doğrulama kaybı {:.3}{}', adım,
        eğitimKaybı, doğrulamaKaybı, işaret), 1)
    bitir
  bitir
  yaz(Biçimle('Eğitim süresi: {:.0} saniye', Sistem.Zaman - süre), 1)
  model.Yükle('kucuk_gpt.agirlik')
  model.eğitimde := yanlış

  yaz('', 1); yaz('Küçük GPT modelinin ürettiği "atasözleri" (yeni olanlar * ile işaretli):', 1)
  1'den 12'ye kadar her k için
  başla
    sözcük := ''; bağ := [0]
    tekrarla
      P := Softmaks(model.İleri(bağ, 1, Uzunluk(bağ)))
      i := DilAraclari.Örnekle(P.Satır(Uzunluk(bağ) - 1).Veri)
      eğer i <> 0 ise sözcük := sözcük + harfler[i]
      bağ := bağ + [i]
      eğer Uzunluk(bağ) > BAĞLAM ise bağ := Dilim(bağ, 1, Uzunluk(bağ))
    i = 0 veya Uzunluk(sözcük) > 80 olana dek
    eğer veri.İçerir(sözcük) ise yaz('    ' + sözcük, 1) değilse yaz('  * ' + sözcük, 1)
  bitir
bitir.
