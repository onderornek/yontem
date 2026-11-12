program YinelemeliAğ
{ Yinelemeli sinir ağı (RNN): bir diziyi eleman eleman okur ve bir "gizli durum" h taşır.
  Her adımda   h ← tanh(x_t · Wx + h @ Wh + b)   hesaplanır; h, o ana kadar okunanların özetidir.
  Dizinin sonunda çıktı h'den üretilir:   ŷ = h @ Wç + bç.
  Görev: 5 sayılık bir diziyi oku, sonunda İLK sayıyı söyle. Bunu yapabilmesi için ağın
  ilk sayıyı 4 adım boyunca gizli durumunda saklamayı öğrenmesi gerekir. }
kullan YZ

sabit
  N: tamsayı = 64          { örnek sayısı }
  UZUNLUK: tamsayı = 5     { dizi uzunluğu }
  GİZLİ: tamsayı = 8       { gizli durum boyutu }

değişken
  diziler: ondalık dizisi dizisi
  sütun: liste
  Xt: liste                       { Xt[t]: tüm örneklerin t. öğesi, N × 1 tensör }
  hedef: tensör
  Wx, Wh, b, Wç, bç: tensör
  opt: herhangi
  kayıp, tahmin: tensör
  i, t, adım: tamsayı

fonksiyon İleri(girdiler: liste; n: tamsayı): tensör
değişken h: tensör; t: tamsayı
başla
  h := Sıfırlar(n, GİZLİ)
  0'dan UZUNLUK - 1'e kadar her t için
    h := (girdiler[t] @ Wx + h @ Wh + b).Tanh
  dön h @ Wç + bç
bitir

fonksiyon Sütunlar(D: ondalık dizisi dizisi): liste
değişken t: tamsayı
başla
  sonuç := []
  0'dan UZUNLUK - 1'e kadar her t için
    sonuç.Ekle(Tensör(Eşle(D, fonksiyon(d: ondalık dizisi) => [d[t]])))
bitir

başla
  Tohum(11)
  diziler := []
  1'den N'ye kadar her i için
  başla
    sütun := []
    1'den UZUNLUK'a kadar her t için sütun.Ekle(Rastgele(200) / 100 - 1)   { [-1, 1) }
    diziler.Ekle(sütun)
  bitir
  Xt := Sütunlar(diziler)
  hedef := Tensör(Eşle(diziler, fonksiyon(d: ondalık dizisi) => [d[0]]))

  Wx := RastgeleTensör(1, GİZLİ, 0.5, doğru)
  Wh := RastgeleTensör(GİZLİ, GİZLİ, 0.3, doğru)
  b  := Sıfırlar(GİZLİ, boş, doğru)
  Wç := RastgeleTensör(GİZLİ, 1, 0.5, doğru)
  bç := Sıfırlar(1, boş, doğru)
  opt := Adam([Wx, Wh, b, Wç, bç], 0.02)

  1'den 600'e kadar her adım için
  başla
    opt.SıfırlaGrad
    kayıp := OKH(İleri(Xt, N), hedef)
    kayıp.GeriYay          { zaman içinde geri yayılım: hata 5 adımın hepsine geri dağıtılır }
    opt.Adım
    eğer adım = 1 veya adım mod 150 = 0 ise
      yaz(Biçimle('Adım {:3}: kayıp {:.4}', adım, kayıp.Değer), 1)
  bitir

  yaz('Hiç görülmemiş diziler:', 1)
  diziler := [[0.8, -0.3, 0.5, -0.9, 0.1], [-0.6, 0.9, 0.9, 0.2, -0.4], [0.1, 0.7, -0.8, 0.6, 0.9]]
  tahmin := İleri(Sütunlar(diziler), 3)
  0'dan 2'ye kadar her i için
    yaz(Biçimle('  {}  →  ağın cevabı {:.2}  (doğrusu {})', diziler[i], tahmin[i, 0], diziler[i][0]), 1)
bitir.
