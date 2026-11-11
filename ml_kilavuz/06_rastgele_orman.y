program RastgeleOrman
{ Tek bir derin karar ağacı ile 25 ağaçlık rastgele ormanı karşılaştırır.
  Her ağaç, verinin geri koyarak çekilmiş bir örneğiyle (bootstrap) ve her düğümde
  rastgele seçilen özniteliklerle kurulur; tahmin, ağaçların oy çokluğudur. }
kullan Matematik

tip
  Düğüm = sınıf
    yaprak: mantıksal
    sınıfı, öznitelik: tamsayı
    eşik: ondalık
    sol, sağ: Düğüm
  bitir

değişken
  X, Xt: ondalık dizisi dizisi
  Y, Yt: tamsayı dizisi
  orman: Düğüm dizisi
  tek: Düğüm
  i, t: tamsayı

{ Veri: bir çemberin içi (1) ve dışı (0); etiketlerin %10'u bilerek yanlış (gürültü) }
prosedür Üret(n: tamsayı; X: ondalık dizisi dizisi; Y: tamsayı dizisi)
değişken a, b: ondalık; k, j: tamsayı
başla
  1'den n'e kadar her j için
  başla
    a := Rastgele * 2 - 1; b := Rastgele * 2 - 1
    k := eğer a * a + b * b < 0.5 ise 1 değilse 0
    eğer Rastgele < 0.1 ise k := 1 - k
    X.Ekle([a, b]); Y.Ekle(k)
  bitir
bitir

fonksiyon Gini(sıra: tamsayı dizisi): ondalık
değişken p: ondalık; j: tamsayı
başla
  eğer Uzunluk(sıra) = 0 ise dön 0
  p := 0
  sıra içindeki her j için p := p + Y[j]
  p := p / Uzunluk(sıra)
  sonuç := 2 * p * (1 - p)
bitir

fonksiyon Çoğunluk(sıra: tamsayı dizisi): tamsayı
değişken s, j: tamsayı
başla
  s := 0
  sıra içindeki her j için s := s + Y[j]
  sonuç := eğer 2 * s >= Uzunluk(sıra) ise 1 değilse 0
bitir

{ öznitelikSayısı = 1 ise her düğümde tek bir rastgele öznitelik denenir (ormanın "rastgele" kısmı) }
fonksiyon Ağaç(sıra: tamsayı dizisi; derinlik, öznitelikSayısı: tamsayı): Düğüm
değişken
  d: Düğüm
  f, k, j, enF: tamsayı
  e, puan, enPuan, enE: ondalık
  sol, sağ, adaylar: tamsayı dizisi
başla
  d := Düğüm.Oluştur
  eğer derinlik = 0 veya Gini(sıra) = 0 ise
  başla
    d.yaprak := doğru; d.sınıfı := Çoğunluk(sıra); dön d
  bitir
  adaylar := eğer öznitelikSayısı = 2 ise [0, 1] değilse [Rastgele(2)]
  enPuan := 9; enF := 0; enE := 0
  adaylar içindeki her f için
    sıra içindeki her k için
    başla
      e := X[k][f]
      sol := Süz(sıra, fonksiyon(j: tamsayı) => X[j][f] < e)
      sağ := Süz(sıra, fonksiyon(j: tamsayı) => X[j][f] >= e)
      puan := (Uzunluk(sol) * Gini(sol) + Uzunluk(sağ) * Gini(sağ)) / Uzunluk(sıra)
      eğer puan < enPuan ise başla enPuan := puan; enF := f; enE := e bitir
    bitir
  d.öznitelik := enF; d.eşik := enE
  sol := Süz(sıra, fonksiyon(j: tamsayı) => X[j][enF] < enE)
  sağ := Süz(sıra, fonksiyon(j: tamsayı) => X[j][enF] >= enE)
  eğer Uzunluk(sol) = 0 veya Uzunluk(sağ) = 0 ise
  başla
    d.yaprak := doğru; d.sınıfı := Çoğunluk(sıra); dön d
  bitir
  d.sol := Ağaç(sol, derinlik - 1, öznitelikSayısı)
  d.sağ := Ağaç(sağ, derinlik - 1, öznitelikSayısı)
  sonuç := d
bitir

fonksiyon Tahmin(d: Düğüm; x: ondalık dizisi): tamsayı
başla
  eğer d.yaprak ise dön d.sınıfı
  eğer x[d.öznitelik] < d.eşik ise dön Tahmin(d.sol, x)
  sonuç := Tahmin(d.sağ, x)
bitir

fonksiyon OrmanTahmini(x: ondalık dizisi): tamsayı
değişken oy: tamsayı; a: Düğüm
başla
  oy := 0
  orman içindeki her a için oy := oy + Tahmin(a, x)
  sonuç := eğer 2 * oy > Uzunluk(orman) ise 1 değilse 0
bitir

fonksiyon Doğruluk(tekMi: mantıksal): ondalık
değişken j, isabet, p: tamsayı
başla
  isabet := 0
  0'dan Uzunluk(Xt) - 1'e kadar her j için
  başla
    p := eğer tekMi ise Tahmin(tek, Xt[j]) değilse OrmanTahmini(Xt[j])
    eğer p = Yt[j] ise isabet := isabet + 1
  bitir
  sonuç := isabet / Uzunluk(Xt)
bitir

başla
  Tohum(3)
  X := []; Y := []; Xt := []; Yt := []
  Üret(150, X, Y)
  Üret(300, Xt, Yt)

  tek := Ağaç(Aralık(Uzunluk(X)), 8, 2)
  yaz(Biçimle('Tek derin ağaç (derinlik 8)  → test doğruluğu: {:.3}', Doğruluk(doğru)), 1)

  orman := []
  1'den 25'e kadar her t için
  başla
    { bootstrap: n örneği geri koyarak çek }
    orman.Ekle(Ağaç(Eşle(Aralık(Uzunluk(X)), fonksiyon(j: tamsayı) => Rastgele(Uzunluk(X))), 8, 1))
    eğer t = 1 veya t = 5 veya t = 25 ise
      yaz(Biçimle('Rastgele orman, {:2} ağaç       → test doğruluğu: {:.3}', t, Doğruluk(yanlış)), 1)
  bitir
bitir.
