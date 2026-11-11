program BağlamlıDilModeli
{ İkili model yalnızca bir önceki karaktere bakıyordu. Bu model son BAĞLAM (3)
  karaktere bakar (Bengio ve arkadaşlarının 2003'teki modelinin küçük bir hali):
     1) Her karakter, öğrenilen C tablosundan 10 sayılık bir gömmeye çevrilir.
     2) Üç gömme gizli katmana girer: h = tanh(e1 @ W1 + e2 @ W2 + e3 @ W3 + b)
        (üç gömmeyi yan yana koyup tek bir büyük matrisle çarpmakla aynı şeydir).
     3) Çıktı katmanı 30 logit üretir: logit = h @ Wç + bç
  Veriyi eğitim (%90) ve doğrulama (%10) diye ayırırız; doğrulama kaybı, modelin
  ezberleyip ezberlemediğini gösterir. Her adımda rastgele 64 örnekten oluşan bir
  yığın (mini-batch) kullanırız. }
kullan Atasozleri, DilAraclari, YZ

sabit
  BAĞLAM: tamsayı = 3
  GÖMME: tamsayı = 10
  GİZLİ: tamsayı = 96
  YIĞIN: tamsayı = 64

değişken
  veri, harfler: metin dizisi
  numara: sözlük
  bağlamlar: liste                   { her örnek: son 3 karakterin numarası }
  hedefler: tamsayı dizisi
  eğitimSayısı, n, i, k, adım: tamsayı
  C, W1, W2, W3, b, Wç, bç, kayıp: tensör
  opt: herhangi
  seçilen: tamsayı dizisi
  pencere: tamsayı dizisi
  kar, sözcük: metin

fonksiyon Logitler(bağ: liste): tensör
{ bağ: bağlam listesi (her biri 3 numara) → her bağlam için 30 logit }
değişken e1, e2, e3, h: tensör
başla
  e1 := BirSıcak(Eşle(bağ, fonksiyon(p: liste) => p[0]), Uzunluk(harfler)) @ C
  e2 := BirSıcak(Eşle(bağ, fonksiyon(p: liste) => p[1]), Uzunluk(harfler)) @ C
  e3 := BirSıcak(Eşle(bağ, fonksiyon(p: liste) => p[2]), Uzunluk(harfler)) @ C
  h := (e1 @ W1 + e2 @ W2 + e3 @ W3 + b).Tanh
  dön h @ Wç + bç
bitir

fonksiyon OrtalamaKayıp(ilk, son: tamsayı): ondalık
{ [ilk, son) aralığındaki örneklerin ortalama kaybı (eğitim yapmadan) }
başla
  dön ÇaprazEntropi(Logitler(Dilim(bağlamlar, ilk, son)), Dilim(hedefler, ilk, son)).Değer
bitir

başla
  Tohum(7)
  veri := Atasozleri.Hepsi
  harfler := DilAraclari.Harfler
  n := Uzunluk(harfler)
  numara := DilAraclari.Numaralar(harfler)

  { Örnekleri çıkar. Atasözlerinin ilk %90'ı eğitim, son %10'u doğrulama. }
  bağlamlar := []; hedefler := []
  0'dan Uzunluk(veri) - 1'e kadar her i için
  başla
    eğer i = Uzunluk(veri) * 9 böl 10 ise eğitimSayısı := Uzunluk(hedefler)
    pencere := [0, 0, 0]
    (veri[i] + '.').Karakterler içindeki her kar için
    başla
      bağlamlar.Ekle(pencere); hedefler.Ekle(numara[kar])
      pencere := [pencere[1], pencere[2], numara[kar]]
    bitir
  bitir
  yaz(Biçimle('{} eğitim, {} doğrulama örneği', eğitimSayısı, Uzunluk(hedefler) - eğitimSayısı), 1)

  C  := RastgeleTensör(n, GÖMME, 1.0, doğru)
  W1 := RastgeleTensör(GÖMME, GİZLİ, 0.2, doğru)
  W2 := RastgeleTensör(GÖMME, GİZLİ, 0.2, doğru)
  W3 := RastgeleTensör(GÖMME, GİZLİ, 0.2, doğru)
  b  := Sıfırlar(GİZLİ, boş, doğru)
  Wç := RastgeleTensör(GİZLİ, n, 0.1, doğru)
  bç := Sıfırlar(n, boş, doğru)
  opt := Adam([C, W1, W2, W3, b, Wç, bç], 0.01)
  yaz(Biçimle('Parametre sayısı: {}', n * GÖMME + 3 * GÖMME * GİZLİ + GİZLİ + GİZLİ * n + n), 1)

  1'den 3000'e kadar her adım için
  başla
    seçilen := Eşle(Aralık(YIĞIN), fonksiyon(x: tamsayı) => Rastgele(eğitimSayısı))
    opt.SıfırlaGrad
    kayıp := ÇaprazEntropi(Logitler(Eşle(seçilen, fonksiyon(x: tamsayı) => bağlamlar[x])),
                           Eşle(seçilen, fonksiyon(x: tamsayı) => hedefler[x]))
    kayıp.GeriYay
    opt.Adım
    eğer adım = 1 veya adım mod 500 = 0 ise
      yaz(Biçimle('Adım {:4}: eğitim kaybı {:.4}   doğrulama kaybı {:.4}', adım,
        OrtalamaKayıp(0, eğitimSayısı), OrtalamaKayıp(eğitimSayısı, Uzunluk(hedefler))), 1)
  bitir

  yaz('', 1); yaz('Modelin ürettiği "atasözleri":', 1)
  1'den 8'e kadar her k için
  başla
    sözcük := ''; pencere := [0, 0, 0]
    tekrarla
      i := DilAraclari.Örnekle(Softmaks(Logitler([pencere])).Satır(0).Veri)
      eğer i <> 0 ise sözcük := sözcük + harfler[i]
      pencere := [pencere[1], pencere[2], i]
    i = 0 olana dek
    yaz('  ' + sözcük, 1)
  bitir
bitir.
