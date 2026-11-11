program Fannkuch
{ 1..N sayılarının tüm permütasyonlarını üretir; her birinde baştaki sayı kadar öğeyi ters
  çevirmeyi 1 başa gelene dek sürdürür. En çok çevirme sayısını ve bir sağlama toplamını
  yazar: tamsayı dizileri üzerinde yoğun döngü. }
sabit N: tamsayı = 8
değişken
  p, q, c: tamsayı dizisi
  i, k, t, çevirme, enÇok, sağlama, sıra, j: tamsayı
  bitti: mantıksal

başla
  p := []; q := []; c := []
  0'dan N - 1'e kadar her i için başla p.Ekle(i); q.Ekle(0); c.Ekle(0) bitir
  enÇok := 0; sağlama := 0; sıra := 0
  bitti := yanlış
  bitti = yanlış iken
  başla
    { bu permütasyonun çevirme sayısı }
    0'dan N - 1'e kadar her i için q[i] := p[i]
    çevirme := 0
    k := q[0]
    k <> 0 iken
    başla
      i := 0; j := k
      i < j iken başla t := q[i]; q[i] := q[j]; q[j] := t; i := i + 1; j := j - 1 bitir
      çevirme := çevirme + 1
      k := q[0]
    bitir
    eğer çevirme > enÇok ise enÇok := çevirme
    eğer sıra mod 2 = 0 ise sağlama := sağlama + çevirme değilse sağlama := sağlama - çevirme
    sıra := sıra + 1
    { sonraki permütasyon (Heap algoritması değil; sayaç tabanlı döndürme) }
    i := 1
    bitti := doğru
    i < N iken
    başla
      t := p[0]
      0'dan i - 1'e kadar her j için p[j] := p[j + 1]
      p[i] := t
      c[i] := c[i] + 1
      eğer c[i] <= i ise başla bitti := yanlış; kır bitir
      c[i] := 0
      i := i + 1
    bitir
  bitir
  yaz(sağlama, 1)
  yaz('En çok çevirme: ' + enÇok, 1)
bitir.
