program MetinÜretmek
{ Eğitilmiş bir dil modeli her adımda bir OLASILIK DAĞILIMI verir. Bir sonraki
  karakteri bu dağılımdan nasıl seçtiğimiz, üretilen metnin karakterini belirler:
    açgözlü   : her zaman en olası karakter (hep aynı metin, çoğu zaman tekrar)
    sıcaklık  : logitler T'ye bölünür; T < 1 dağılımı sivriltir, T > 1 düzleştirir
    top-k     : yalnızca en olası k karakter arasından seçilir
  Program 8. bölümde kaydedilen ağırlıkları yükler. Dosya yoksa (örneğin oyun
  alanında) modeli 8. bölümle aynı ayarlarla yeniden eğitir; bu yaklaşık 10 dakika sürer. }
kullan Atasozleri, DilAraclari, KucukGPT, YZ, Sistem, Matematik

sabit
  BAĞLAM: tamsayı = 16
  DOSYA: metin = 'kucuk_gpt.agirlik'

değişken
  harfler: metin dizisi
  numara: sözlük
  model: GPT
  P: ondalık dizisi
  sıra: tamsayı dizisi
  baş: metin
  i, k: tamsayı
  T: ondalık

fonksiyon SonrakiDağılım(bağ: tamsayı dizisi; sıcaklık: ondalık; enİyiK: tamsayı): ondalık dizisi
{ Son karakterden sonraki karakterin olasılıkları; sıcaklık ve top-k uygulanmış. }
değişken logit: ondalık dizisi; eşik: ondalık
başla
  logit := model.İleri(bağ, 1, Uzunluk(bağ)).Satır(Uzunluk(bağ) - 1).Veri
  logit := Eşle(logit, fonksiyon(z: ondalık) => z / sıcaklık)
  eğer enİyiK > 0 ise
  başla
    eşik := Sırala(logit, fonksiyon(z: ondalık) => -z)[enİyiK - 1]
    logit := Eşle(logit, fonksiyon(z: ondalık) => eğer z >= eşik ise z değilse -1000000000.0)
  bitir
  dön Softmaks(Tensör([logit])).Satır(0).Veri
bitir

fonksiyon Üret(başlangıç: metin; sıcaklık: ondalık; enİyiK: tamsayı; açgözlü: mantıksal): metin
değişken bağ: tamsayı dizisi; j: tamsayı; dağ: ondalık dizisi
başla
  sonuç := başlangıç
  bağ := [0] + DilAraclari.Kodla(başlangıç, numara)
  tekrarla
    eğer Uzunluk(bağ) > BAĞLAM ise bağ := Dilim(bağ, Uzunluk(bağ) - BAĞLAM, Uzunluk(bağ))
    dağ := SonrakiDağılım(bağ, sıcaklık, enİyiK)
    eğer açgözlü ise j := ArgMaks(dağ) değilse j := DilAraclari.Örnekle(dağ)
    eğer j <> 0 ise sonuç := sonuç + harfler[j]
    bağ := bağ + [j]
  j = 0 veya Uzunluk(sonuç) > 70 olana dek
bitir

prosedür YenidenEğit
{ 8. bölümle birebir aynı eğitim: aynı tohum, veri, bırakma, öğrenme oranı takvimi ve
  erken durdurma. Rastgele sayılar aynı sırayla çekildiği için aynı ağırlıklar çıkar. }
değişken veri: metin dizisi; eğitim, doğrulama, g, h: tamsayı dizisi
         opt: herhangi; adım, b, s, ayrım: tamsayı; kayıp: tensör; enİyi, dk: ondalık
başla
  yaz('Ağırlık dosyası bulunamadı; model 8. bölümdeki gibi yeniden eğitiliyor (yaklaşık 10 dakika)...', 1)
  Tohum(2026)
  veri := Atasozleri.Hepsi
  ayrım := Uzunluk(veri) * 9 böl 10
  eğitim := DilAraclari.Kodla('.' + Birleştir(Dilim(veri, 0, ayrım), '.') + '.', numara)
  doğrulama := DilAraclari.Kodla('.' + Birleştir(Dilim(veri, ayrım, Uzunluk(veri)), '.') + '.', numara)
  model := GPT.Oluştur(Uzunluk(harfler), BAĞLAM, 32, 4, 2)
  model.bırakma := 0.2
  opt := Adam(model.Parametreler, 0.003)
  enİyi := 1000.0
  1'den 3000'e kadar her adım için
  başla
    g := []; h := []
    1'den 8'e kadar her b için
    başla
      s := Rastgele(Uzunluk(eğitim) - BAĞLAM - 1)
      g := g + Dilim(eğitim, s, s + BAĞLAM); h := h + Dilim(eğitim, s + 1, s + BAĞLAM + 1)
    bitir
    opt.oran := 0.003 * 0.5 * (1 + Cos(Matematik.pi * adım / 3000))
    model.eğitimde := doğru
    opt.SıfırlaGrad
    kayıp := ÇaprazEntropi(model.İleri(g, 8, BAĞLAM), h)
    kayıp.GeriYay
    opt.Adım
    eğer adım = 1 veya adım mod 250 = 0 ise
    başla
      model.eğitimde := yanlış
      dk := 0; s := 0; b := 0
      s + BAĞLAM + 1 <= Min(Uzunluk(doğrulama), 512) iken
      başla
        dk := dk + ÇaprazEntropi(model.İleri(Dilim(doğrulama, s, s + BAĞLAM), 1, BAĞLAM),
                                 Dilim(doğrulama, s + 1, s + BAĞLAM + 1)).Değer
        b := b + 1; s := s + BAĞLAM
      bitir
      eğer dk / b < enİyi ise başla enİyi := dk / b; model.Kaydet(DOSYA) bitir
    bitir
  bitir
  model.Yükle(DOSYA)
  model.eğitimde := yanlış
bitir

başla
  harfler := DilAraclari.Harfler
  numara := DilAraclari.Numaralar(harfler)
  eğer Sistem.DosyaVarMı(DOSYA) ise
  başla
    model := GPT.Oluştur(Uzunluk(harfler), BAĞLAM, 32, 4, 2)
    model.Yükle(DOSYA)
  bitir
  değilse YenidenEğit

  yaz('"damlaya damlaya g" yazıldıktan sonra modelin tahmini:', 1)
  P := SonrakiDağılım([0] + DilAraclari.Kodla('damlaya damlaya g', numara), 1.0, 0)
  sıra := Sırala(Aralık(Uzunluk(P)), fonksiyon(z: tamsayı) => -P[z])
  0'dan 4'e kadar her k için yaz(Biçimle('   "{}"  {:.3}', harfler[sıra[k]], P[sıra[k]]), 1)

  yaz('', 1); yaz('Açgözlü seçim (her çalıştırmada aynı sonuç):', 1)
  ['', 'damlaya', 'sabır', 'dost', 'göz'] içindeki her baş için
    yaz('   ' + Üret(baş, 1.0, 0, doğru), 1)

  Tohum(9)
  [0.5, 1.0, 1.5] içindeki her T için
  başla
    yaz('', 1); yaz(Biçimle('Sıcaklık {}:', T), 1)
    1'den 4'e kadar her i için yaz('   ' + Üret('', T, 0, yanlış), 1)
  bitir

  yaz('', 1); yaz('Top-k (k = 3, sıcaklık 1.0):', 1)
  1'den 4'e kadar her i için yaz('   ' + Üret('', 1.0, 3, yanlış), 1)
bitir.
