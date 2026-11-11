program Sıralama
{ 30000 sözde rastgele tamsayıyı elle yazılmış hızlı sıralamayla (quicksort) sıralar:
  özyineleme, karşılaştırma ve dizi takası. Sayılar Park–Miller üreteciyle üretilir. }
sabit N: tamsayı = 30000
değişken
  L: tamsayı dizisi
  i, tohum, sağlama: tamsayı

prosedür Sırala(L: tamsayı dizisi; alt, üst: tamsayı)
değişken i, j, mihver, t: tamsayı
başla
  eğer alt >= üst ise dön
  mihver := L[(alt + üst) böl 2]
  i := alt; j := üst
  i <= j iken
  başla
    L[i] < mihver iken i := i + 1
    L[j] > mihver iken j := j - 1
    eğer i <= j ise
    başla
      t := L[i]; L[i] := L[j]; L[j] := t
      i := i + 1; j := j - 1
    bitir
  bitir
  Sırala(L, alt, j)
  Sırala(L, i, üst)
bitir

başla
  L := []
  tohum := 42
  0'dan N - 1'e kadar her i için
  başla
    tohum := (tohum * 16807) mod 2147483647
    L.Ekle(tohum mod 1000000)
  bitir
  Sırala(L, 0, N - 1)
  sağlama := 0
  0'dan N - 1'e kadar her i için
  başla
    eğer i > 0 ise İddia(L[i - 1] <= L[i], 'sıralı değil')
    sağlama := (sağlama * 31 + L[i]) mod 1000000007
  bitir
  yaz(L[0] + ' ' + L[N böl 2] + ' ' + L[N - 1], 1)
  yaz(sağlama, 1)
bitir.
