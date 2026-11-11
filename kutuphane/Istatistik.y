birim İstatistik
{ Betimsel istatistik işlevleri — Yöntem dilinde yazılmış standart kütüphane birimi. }

arayüz
  fonksiyon Ortalama(L: liste): ondalık
  fonksiyon Varyans(L: liste; örneklem: mantıksal = yanlış): ondalık
  fonksiyon StandartSapma(L: liste; örneklem: mantıksal = yanlış): ondalık
  fonksiyon Medyan(L: liste): ondalık
  fonksiyon EnSık(L: liste): herhangi
  fonksiyon Kovaryans(X, Y: liste): ondalık
  fonksiyon Korelasyon(X, Y: liste): ondalık
  fonksiyon ZPuanları(L: liste): liste
  fonksiyon Yüzdelik(L: liste; p: ondalık): ondalık

uygulama

fonksiyon Ortalama(L: liste): ondalık
başla
  eğer Uzunluk(L) = 0 ise fırlat Hata('Boş listenin ortalaması alınamaz', 'İstatistikHatası')
  dön Toplam(L) / Uzunluk(L)
bitir

fonksiyon Varyans(L: liste; örneklem: mantıksal = yanlış): ondalık
değişken
  m, t: ondalık
  x: herhangi
  n: tamsayı
başla
  m := Ortalama(L)
  t := 0
  L içindeki her x için
    t := t + (x - m) ** 2
  n := Uzunluk(L)
  eğer örneklem ise n := n - 1
  dön t / n
bitir

fonksiyon StandartSapma(L: liste; örneklem: mantıksal = yanlış): ondalık
başla
  dön Kök(Varyans(L, örneklem))
bitir

fonksiyon Medyan(L: liste): ondalık
değişken
  s: liste
  n: tamsayı
başla
  s := Sırala(L)
  n := Uzunluk(s)
  eğer n mod 2 = 1 ise
    dön s[n böl 2]
  değilse
    dön (s[n böl 2 - 1] + s[n böl 2]) / 2
bitir

fonksiyon EnSık(L: liste): herhangi
değişken
  sayım: sözlük
  k: herhangi
  enİyi: herhangi
  enÇok: tamsayı
başla
  sayım := Say(L)
  enÇok := 0
  sayım içindeki her k için
    eğer sayım[k] > enÇok ise
    başla
      enÇok := sayım[k]
      enİyi := k
    bitir
  dön enİyi
bitir

fonksiyon Kovaryans(X, Y: liste): ondalık
değişken
  mx, my, t: ondalık
  i: tamsayı
başla
  mx := Ortalama(X);  my := Ortalama(Y)
  t := 0
  0'dan (Uzunluk(X) - 1)'e kadar her i için
    t := t + (X[i] - mx) * (Y[i] - my)
  dön t / Uzunluk(X)
bitir

fonksiyon Korelasyon(X, Y: liste): ondalık
başla
  dön Kovaryans(X, Y) / (StandartSapma(X) * StandartSapma(Y))
bitir

fonksiyon ZPuanları(L: liste): liste
değişken
  m, s: ondalık
başla
  m := Ortalama(L)
  s := StandartSapma(L)
  dön Eşle(L, fonksiyon(x) => (x - m) / s)
bitir

fonksiyon Yüzdelik(L: liste; p: ondalık): ondalık
değişken
  s: liste
  konum, kesir: ondalık
  alt: tamsayı
başla
  s := Sırala(L)
  konum := (Uzunluk(s) - 1) * p / 100
  alt := Kes(konum)
  kesir := konum - alt
  eğer alt + 1 >= Uzunluk(s) ise dön s[alt]
  dön s[alt] + kesir * (s[alt + 1] - s[alt])
bitir

bitir.
