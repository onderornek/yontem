program GradyanArtırma
{ Gürültülü bir sinüs eğrisini, art arda eklenen küçük "karar kütükleri"yle öğrenir.
  Her yeni kütük, o ana kadarki toplam modelin hatalarını (artıkları) tahmin etmeye çalışır:
  F_m(x) = F_(m-1)(x) + η · h_m(x)    η: öğrenme oranı }
kullan Matematik

tip
  Kütük = kayıt eşik, sol, sağ: ondalık; bitir      { x < eşik ise sol, değilse sağ değerini verir }

değişken
  X, Y, F, artık: ondalık dizisi
  kütükler: Kütük dizisi
  i, m, n: tamsayı
  eta, okh: ondalık
  k: Kütük

fonksiyon Ortalama(L: ondalık dizisi): ondalık
başla
  sonuç := eğer Uzunluk(L) = 0 ise 0.0 değilse Toplam(L) / Uzunluk(L)
bitir

{ Artıklara en iyi uyan tek bölmeli ağacı bulur: her olası eşiği dener, kare hatası en küçük olanı seçer }
fonksiyon KütükUydur(r: ondalık dizisi): Kütük
değişken
  j, q: tamsayı
  sol, sağ: ondalık dizisi
  hata, enHata: ondalık
başla
  enHata := 1e9
  1'den n - 1'e kadar her j için
  başla
    sol := []; sağ := []
    0'dan n - 1'e kadar her q için eğer X[q] < X[j] ise sol.Ekle(r[q]) değilse sağ.Ekle(r[q])
    hata := 0
    sol içindeki her e için hata := hata + (e - Ortalama(sol)) ** 2
    sağ içindeki her e için hata := hata + (e - Ortalama(sağ)) ** 2
    eğer hata < enHata ise
    başla
      enHata := hata
      sonuç := Kütük.Oluştur(X[j], Ortalama(sol), Ortalama(sağ))
    bitir
  bitir
bitir

başla
  Tohum(1)
  n := 40
  X := []; Y := []
  0'dan n - 1'e kadar her i için
  başla
    X.Ekle(i * 6.28 / n)
    Y.Ekle(Sin(i * 6.28 / n) + Normal(0, 0.15))
  bitir
  eta := 0.3
  F := Eşle(Y, fonksiyon(v: ondalık) => Ortalama(Y))   { başlangıç: herkese ortalamayı tahmin et }
  kütükler := []
  1'den 60'a kadar her m için
  başla
    artık := []
    0'dan n - 1'e kadar her i için artık.Ekle(Y[i] - F[i])
    k := KütükUydur(artık)
    kütükler.Ekle(k)
    okh := 0
    0'dan n - 1'e kadar her i için
    başla
      F[i] := F[i] + eta * (eğer X[i] < k.eşik ise k.sol değilse k.sağ)
      okh := okh + (Y[i] - F[i]) ** 2 / n
    bitir
    eğer m <= 3 veya m mod 20 = 0 ise
      yaz(Biçimle('{:2}. kütük: x < {:.2} ise {:6.3}, değilse {:6.3}   →  OKH = {:.4}', m, k.eşik, k.sol, k.sağ, okh), 1)
  bitir
  yaz(Biçimle('x = 1.57 için tahmin {:.3} (gerçek sin = 1.000)', F[10]), 1)
bitir.
