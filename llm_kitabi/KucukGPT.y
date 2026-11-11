birim KucukGPT
{ Kitabın küçük GPT'si: karakter düzeyinde, yalnızca kod çözücüden (decoder-only)
  oluşan bir Transformer. 6. ve 7. bölümde parça parça kurduğumuz her şey burada
  tek bir sınıfta toplanır.

  Yığın (batch) düzeni: B dizinin her biri t karakter uzunluğundadır. Hepsini alt alta
  koyup (B·t) × D boyutlu tek bir matrisle çalışırız. Dikkat maskesi, bir karakterin
  yalnızca KENDİ dizisindeki ve KENDİSİNDEN ÖNCEKİ karakterlere bakmasına izin verir. }
kullan YZ, Matematik, Sistem

arayüz

tip
  GPT = sınıf
    sözlükBoyu, bağlam, boyut, kafaSayısı, katmanSayısı, kafaBoyu: tamsayı
    Gömme, Konum, Wç, bç, sonG, sonB: tensör   { karakter ve konum gömmeleri, çıkış katmanı, son normalleştirme }
    Wq, Wk, Wv, Wo: liste               { [katman * kafaSayısı + kafa] → tensör }
    g1, b1, g2, b2: liste               { katman normalleştirme parametreleri, katman başına }
    İ1, İb1, İ2, İb2: liste             { ileri besleme ağı, katman başına }
    maskeler: sözlük                    { hazırlanmış maskeler, yeniden kurmamak için }
    bırakma: ondalık                    { eğitimde rastgele sıfırlanan değerlerin oranı (dropout) }
    eğitimde: mantıksal                 { doğruysa bırakma uygulanır }
    kurucu Oluştur(sB, bU, bD, kH, kL: tamsayı)
    fonksiyon Parametreler: liste
    fonksiyon ParametreAdedi: tamsayı
    fonksiyon İleri(numaralar: tamsayı dizisi; diziSayısı, uzunluk: tamsayı): tensör
    fonksiyon Bırak(x: tensör): tensör
    prosedür Kaydet(yol: metin)
    prosedür Yükle(yol: metin)
  bitir

fonksiyon KatmanNorm(x, g, b: tensör): tensör
fonksiyon Maske(diziSayısı, uzunluk: tamsayı): tensör

uygulama

fonksiyon KatmanNorm(x, g, b: tensör): tensör
{ Her satırı (her karakterin vektörünü) ortalaması 0, sapması 1 olacak biçimde
  ölçekler; sonra öğrenilen g ile çarpar, b ile kaydırır. }
değişken satır: tamsayı; m, xm, s: tensör
başla
  satır := x.Şekil[0]
  m := x.Ortalama(1).Yeniden(satır, 1)
  xm := x - m
  s := ((xm ** 2).Ortalama(1) + 0.00001).Kök.Yeniden(satır, 1)
  dön xm / s * g + b
bitir

fonksiyon Maske(diziSayısı, uzunluk: tamsayı): tensör
{ Nedensel maske: i. satır j. sütuna bakabiliyorsa 0, bakamıyorsa çok büyük bir
  negatif sayı. Softmaks bu negatif puanları sıfır olasılığa çevirir. }
değişken n, i, j: tamsayı; satırlar: liste; satır1: ondalık dizisi
başla
  n := diziSayısı * uzunluk
  satırlar := []
  0'dan n - 1'e kadar her i için
  başla
    satır1 := []
    0'dan n - 1'e kadar her j için
      eğer (i böl uzunluk = j böl uzunluk) ve j <= i ise satır1.Ekle(0.0) değilse satır1.Ekle(-1000000000.0)
    satırlar.Ekle(satır1)
  bitir
  dön Tensör(satırlar)
bitir

kurucu GPT.Oluştur(sB, bU, bD, kH, kL: tamsayı)
değişken l, h: tamsayı; ölçek: ondalık
başla
  sözlükBoyu := sB; bağlam := bU; boyut := bD; kafaSayısı := kH; katmanSayısı := kL
  kafaBoyu := boyut böl kafaSayısı
  ölçek := 1 / Kök(boyut)
  Gömme := RastgeleTensör(sözlükBoyu, boyut, 0.5, doğru)
  Konum := RastgeleTensör(bağlam, boyut, 0.1, doğru)
  Wq := []; Wk := []; Wv := []; Wo := []
  g1 := []; b1 := []; g2 := []; b2 := []
  İ1 := []; İb1 := []; İ2 := []; İb2 := []
  0'dan katmanSayısı - 1'e kadar her l için
  başla
    0'dan kafaSayısı - 1'e kadar her h için
    başla
      Wq.Ekle(RastgeleTensör(boyut, kafaBoyu, ölçek, doğru))
      Wk.Ekle(RastgeleTensör(boyut, kafaBoyu, ölçek, doğru))
      Wv.Ekle(RastgeleTensör(boyut, kafaBoyu, ölçek, doğru))
      Wo.Ekle(RastgeleTensör(kafaBoyu, boyut, ölçek / Kök(2 * katmanSayısı), doğru))
    bitir
    g1.Ekle(Birler(boyut, boş, doğru)); b1.Ekle(Sıfırlar(boyut, boş, doğru))
    g2.Ekle(Birler(boyut, boş, doğru)); b2.Ekle(Sıfırlar(boyut, boş, doğru))
    İ1.Ekle(RastgeleTensör(boyut, 4 * boyut, ölçek, doğru)); İb1.Ekle(Sıfırlar(4 * boyut, boş, doğru))
    İ2.Ekle(RastgeleTensör(4 * boyut, boyut, 0.5 / Kök(4 * boyut * 2 * katmanSayısı), doğru)); İb2.Ekle(Sıfırlar(boyut, boş, doğru))
  bitir
  maskeler := [:]
  bırakma := 0.0
  eğitimde := yanlış
  sonG := Birler(boyut, boş, doğru); sonB := Sıfırlar(boyut, boş, doğru)
  Wç := RastgeleTensör(boyut, sözlükBoyu, 0.1, doğru); bç := Sıfırlar(sözlükBoyu, boş, doğru)
bitir

fonksiyon GPT.Parametreler: liste
başla
  dön [Gömme, Konum] + Wq + Wk + Wv + Wo + g1 + b1 + g2 + b2 + İ1 + İb1 + İ2 + İb2 + [sonG, sonB, Wç, bç]
bitir

fonksiyon GPT.ParametreAdedi: tamsayı
değişken p: tensör
başla
  sonuç := 0
  Parametreler içindeki her p için
    sonuç := sonuç + İndirge(p.Şekil, fonksiyon(a, c: tamsayı) => a * c, 1)
bitir

fonksiyon GPT.İleri(numaralar: tamsayı dizisi; diziSayısı, uzunluk: tamsayı): tensör
{ numaralar: diziSayısı × uzunluk karakter, alt alta. Dönüş: her konum için sözlükBoyu logit. }
değişken x, n1, dikkat, k, q, v, ağırlık, m: tensör; l, h, i: tamsayı
başla
  { maske her boyut için bir kez kurulur, sonra hazır olan kullanılır }
  eğer değil maskeler.İçerir(Biçimle('{}x{}', diziSayısı, uzunluk)) ise
    maskeler[Biçimle('{}x{}', diziSayısı, uzunluk)] := Maske(diziSayısı, uzunluk)
  m := maskeler[Biçimle('{}x{}', diziSayısı, uzunluk)]
  { karakter gömmesi + konum gömmesi }
  x := BirSıcak(numaralar, sözlükBoyu) @ Gömme +
       BirSıcak(Eşle(Aralık(diziSayısı * uzunluk), fonksiyon(j: tamsayı) => j mod uzunluk), bağlam) @ Konum
  x := Bırak(x)
  0'dan katmanSayısı - 1'e kadar her l için
  başla
    { 1) çok kafalı öz-dikkat, artık bağlantıyla }
    n1 := KatmanNorm(x, g1[l], b1[l])
    dikkat := boş
    0'dan kafaSayısı - 1'e kadar her h için
    başla
      i := l * kafaSayısı + h
      q := n1 @ Wq[i]; k := n1 @ Wk[i]; v := n1 @ Wv[i]
      ağırlık := Softmaks(q @ k.T / Kök(kafaBoyu) + m)
      eğer dikkat = boş ise dikkat := ağırlık @ v @ Wo[i] değilse dikkat := dikkat + ağırlık @ v @ Wo[i]
    bitir
    x := x + Bırak(dikkat)
    { 2) ileri besleme ağı, artık bağlantıyla }
    n1 := KatmanNorm(x, g2[l], b2[l])
    x := x + Bırak((n1 @ İ1[l] + İb1[l]).ReLU @ İ2[l] + İb2[l])
  bitir
  dön KatmanNorm(x, sonG, sonB) @ Wç + bç
bitir

fonksiyon GPT.Bırak(x: tensör): tensör
{ Bırakma (dropout): eğitim sırasında değerlerin rastgele bir kısmını sıfırlar, kalanları
  1 / (1 - oran) ile büyütür. Model tek bir yola güvenmemeyi öğrenir; ezberleme azalır. }
değişken r, c, i, j: tamsayı; satırlar: liste; s: ondalık dizisi; kalan: ondalık
başla
  eğer değil eğitimde veya bırakma <= 0 ise dön x
  r := x.Şekil[0]; c := x.Şekil[1]; kalan := 1 / (1 - bırakma)
  satırlar := []
  0'dan r - 1'e kadar her i için
  başla
    s := []
    0'dan c - 1'e kadar her j için eğer Rastgele < bırakma ise s.Ekle(0.0) değilse s.Ekle(kalan)
    satırlar.Ekle(s)
  bitir
  dön x * Tensör(satırlar)
bitir

prosedür GPT.Kaydet(yol: metin)
{ Her parametre bir satır: sayılar boşlukla ayrılmış }
değişken p: tensör; satırlar: metin dizisi; adet: tamsayı
başla
  satırlar := []
  Parametreler içindeki her p için
  başla
    adet := İndirge(p.Şekil, fonksiyon(a, c: tamsayı) => a * c, 1)
    satırlar.Ekle(Birleştir(Eşle(p.Yeniden(adet).Veri, fonksiyon(z: ondalık) => Metne(z)), ' '))
  bitir
  Sistem.DosyaYaz(yol, Birleştir(satırlar, Karakter(10)))
bitir

prosedür GPT.Yükle(yol: metin)
değişken satırlar, sayılar: metin dizisi; p: tensör; i, j, sütun: tamsayı; ps: liste
başla
  satırlar := Sistem.DosyaOku(yol).Ayır(Karakter(10))
  ps := Parametreler
  0'dan Uzunluk(ps) - 1'e kadar her i için
  başla
    p := ps[i]
    sayılar := satırlar[i].Ayır(' ')
    eğer Uzunluk(p.Şekil) = 1 ise
      0'dan Uzunluk(sayılar) - 1'e kadar her j için p[j] := Ondalığa(sayılar[j])
    değilse
    başla
      sütun := p.Şekil[1]
      0'dan Uzunluk(sayılar) - 1'e kadar her j için p[j böl sütun, j mod sütun] := Ondalığa(sayılar[j])
    bitir
  bitir
bitir

başla
bitir.
