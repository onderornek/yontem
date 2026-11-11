birim MakineÖğrenmesi
{ Klasik makine öğrenmesi algoritmaları: k-en yakın komşu, k-ortalamalar kümeleme,
  doğrusal regresyon ve (YZ tensörleri üzerinde) lojistik regresyon. }
kullan YZ, Matematik

arayüz
  fonksiyon ÖklidUzaklığı(a, b: liste): ondalık
  fonksiyon KOrtalamalar(X: liste; k: tamsayı; yineleme: tamsayı = 50): liste

  tip
    KEnYakın = sınıf
      k: tamsayı
      X, Y: liste
      kurucu Oluştur(komşuSayısı: tamsayı = 3)
      prosedür Eğit(veriler, etiketler: liste)
      fonksiyon Tahmin(nokta: liste): herhangi
    bitir

    DoğrusalRegresyon = sınıf
      eğim, kesişim, r2: ondalık
      prosedür Eğit(X, Y: liste)
      fonksiyon Tahmin(x: ondalık): ondalık
    bitir

    LojistikRegresyon = sınıf
      w, b: tensör
      kurucu Oluştur(özellikSayısı: tamsayı)
      fonksiyon Eğit(X: liste; Y: liste; epok: tamsayı = 300; oran: ondalık = 0.1): ondalık
      fonksiyon Olasılık(X: liste): tensör
      fonksiyon Tahmin(x: liste): tamsayı
    bitir

uygulama

fonksiyon ÖklidUzaklığı(a, b: liste): ondalık
değişken
  t: ondalık
  i: tamsayı
başla
  t := 0
  0'dan (Uzunluk(a) - 1)'e kadar her i için
    t := t + (a[i] - b[i]) ** 2
  dön Kök(t)
bitir

{ ---------------- k-en yakın komşu ---------------- }
kurucu KEnYakın.Oluştur(komşuSayısı: tamsayı = 3)
başla
  k := komşuSayısı
bitir

prosedür KEnYakın.Eğit(veriler, etiketler: liste)
başla
  X := veriler
  Y := etiketler
bitir

fonksiyon KEnYakın.Tahmin(nokta: liste): herhangi
değişken
  uzaklıklar, oylar: liste
  i: tamsayı
başla
  uzaklıklar := []
  0'dan (Uzunluk(X) - 1)'e kadar her i için
    uzaklıklar.Ekle([ÖklidUzaklığı(nokta, X[i]), Y[i]])
  uzaklıklar := Sırala(uzaklıklar, fonksiyon(p) => p[0])
  oylar := Eşle(Dilim(uzaklıklar, 0, k), fonksiyon(p) => p[1])
  dön Sırala(Benzersiz(oylar), fonksiyon(e) => Say(oylar)[e], doğru)[0]
bitir

{ ---------------- k-ortalamalar ---------------- }
{ Döndürür: [merkezler, atamalar] }
fonksiyon KOrtalamalar(X: liste; k: tamsayı; yineleme: tamsayı = 50): liste
değişken
  merkezler, atamalar, yeni, toplam: liste
  sayım: liste
  i, j, d, enİyi, tur: tamsayı
  enKüçük, u: ondalık
  değişti: mantıksal
başla
  // k-ortalamalar++ yerine basit başlangıç: rastgele farklı noktalar
  merkezler := Eşle(Dilim(Karıştır(Kopya(X)), 0, k), fonksiyon(p) => Kopya(p))
  atamalar := Eşle(X, fonksiyon(p) => -1)
  1'den yineleme'ye kadar her tur için
  başla
    değişti := yanlış
    0'dan (Uzunluk(X) - 1)'e kadar her i için
    başla
      enİyi := 0
      enKüçük := ÖklidUzaklığı(X[i], merkezler[0])
      1'den (k - 1)'e kadar her j için
      başla
        u := ÖklidUzaklığı(X[i], merkezler[j])
        eğer u < enKüçük ise
        başla
          enKüçük := u
          enİyi := j
        bitir
      bitir
      eğer atamalar[i] <> enİyi ise
      başla
        atamalar[i] := enİyi
        değişti := doğru
      bitir
    bitir
    eğer değil değişti ise kır
    // merkezleri güncelle
    0'dan (k - 1)'e kadar her j için
    başla
      toplam := Eşle(X[0], fonksiyon(v) => 0.0)
      d := 0
      0'dan (Uzunluk(X) - 1)'e kadar her i için
        eğer atamalar[i] = j ise
        başla
          toplam := Eşle(Eşleştir(toplam, X[i]), fonksiyon(p) => p[0] + p[1])
          d := d + 1
        bitir
      eğer d > 0 ise
        merkezler[j] := Eşle(toplam, fonksiyon(v) => v / d)
    bitir
  bitir
  dön [merkezler, atamalar]
bitir

{ ---------------- doğrusal regresyon (en küçük kareler) ---------------- }
prosedür DoğrusalRegresyon.Eğit(X, Y: liste)
değişken
  mx, my, pay, payda, sst, sse: ondalık
  i: tamsayı
başla
  mx := Toplam(X) / Uzunluk(X)
  my := Toplam(Y) / Uzunluk(Y)
  pay := 0;  payda := 0
  0'dan (Uzunluk(X) - 1)'e kadar her i için
  başla
    pay := pay + (X[i] - mx) * (Y[i] - my)
    payda := payda + (X[i] - mx) ** 2
  bitir
  eğim := pay / payda
  kesişim := my - eğim * mx
  sst := 0;  sse := 0
  0'dan (Uzunluk(X) - 1)'e kadar her i için
  başla
    sst := sst + (Y[i] - my) ** 2
    sse := sse + (Y[i] - Tahmin(X[i])) ** 2
  bitir
  r2 := 1 - sse / sst
bitir

fonksiyon DoğrusalRegresyon.Tahmin(x: ondalık): ondalık
başla
  dön eğim * x + kesişim
bitir

{ ---------------- lojistik regresyon (otomatik türev ile) ---------------- }
kurucu LojistikRegresyon.Oluştur(özellikSayısı: tamsayı)
başla
  w := Sıfırlar(özellikSayısı, 1, doğru)
  b := Sıfırlar(1, boş, doğru)
bitir

fonksiyon LojistikRegresyon.Olasılık(X: liste): tensör
başla
  dön Sigmoid(Tensör(X) @ w + b)
bitir

fonksiyon LojistikRegresyon.Eğit(X: liste; Y: liste; epok: tamsayı = 300; oran: ondalık = 0.1): ondalık
değişken
  opt: herhangi
  kayıp: tensör
  hedef: tensör
  i: tamsayı
başla
  opt := Adam([w, b], oran)
  hedef := Tensör(Eşle(Y, fonksiyon(e) => [e]))
  1'den epok'a kadar her i için
  başla
    opt.SıfırlaGrad
    kayıp := İkiliÇaprazEntropi(Olasılık(X), hedef)
    kayıp.GeriYay
    opt.Adım
  bitir
  dön kayıp.Değer
bitir

fonksiyon LojistikRegresyon.Tahmin(x: liste): tamsayı
başla
  eğer Olasılık([x])[0, 0] >= 0.5 ise dön 1 değilse dön 0
bitir

bitir.
