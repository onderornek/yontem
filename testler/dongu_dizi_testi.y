program DöngüVeDizi
{ Sayan döngünün dört biçimi; Ekle, Sil ve Uzunluk(n, ilk) ile sabit boyutlu liste }
değişken
  a, b, c: tamsayı
  dz: tamsayı listesi
  aylar: metin listesi
  L: tamsayı listesi
  serbest: tamsayı dizisi
başla
  1'den 5'e kadar her i için yaz(i + ' ')
  yaz('', 1)
  5'ten 1'e kadar her j için yaz(j + ' ')
  yaz('', 1)
  2'den -2'ye kadar her j için yaz(j + ' ')
  yaz('', 1)
  a := 0
  b := 10
  c := 2
  a'dan b'ye adımda c artan her k için yaz(k + ' ')
  yaz('', 1)
  b'den a'ya adımda 3 azalan her u için yaz(u + ' ')
  yaz('', 1)
  b'den a'ya kadar her u için yaz('dönmemeli', 1)
  a'dan b'ye adımda 4 azalan her u için yaz('dönmemeli', 1)
  b'den a'ya adımda 4 artan her u için yaz('dönmemeli', 1)
  dene
    b'den a'ya adımda 0 azalan her u için yaz(u, 1)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    a'dan b'ye adımda -2 artan her u için yaz(u, 1)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir

  { liste: boyutu değişir, konumlar 0'dan sayılır }
  L := [10, 20, 30, 40, 50]
  yaz(Sil(L, 2), 1)
  yaz(L, 1)
  Ekle(L, 30, 2)
  Ekle(L, 60)
  yaz(L, 1)
  yaz(L.Sil(-1), 1)
  L.Ekle(5, 0)
  Ekle(L, 45, -1)
  Ekle(L, 70, 99)
  yaz(L, 1)
  dene
    Ekle(L, 7, 'iki')
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    Araya(L, 0, 1)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir

  { silmenin üç yazımı aynı anlama gelir }
  L := [0, 10, 20, 30, 40, 50, 60]
  L.Sil(2)
  L(2).Sil
  L listesindeki 2. elemanı Sil
  yaz(L, 1)
  a := 0
  L listesindeki a. elemanı sil
  L listesindeki (a + 1). elemanı Sil
  yaz(L(0).Sil, 1)
  yaz(L, 1)

  { Uzunluk(n, ilk): boyutu sabit, numaraları 'ilk'ten başlayan liste }
  dz.Uzunluk(5, 1)
  1'den 5'e kadar her i için dz[i] := i * 10
  dene
    Sil(dz, 2)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    Ekle(dz, 60)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    Ekle(dz, 5, 1)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    dz(2).Sil
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    dz dizisindeki 2. elemanı Sil
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    dz.Ekle(7)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    dz[6] := 1
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  yaz(dz, 1)
  yaz(Uzunluk(dz) + ' ' + dz.Alt + '..' + dz.Üst, 1)
  dz.Uzunluk(7, 1)
  yaz(dz, 1)
  dz.Uzunluk(5, 1)
  aylar.Uzunluk(3, 1)
  aylar[1] := 'Ocak'
  yaz(aylar, 1)
  yaz(aylar.İçerir('Ocak'), 1)
  aylar.Uzunluk(2)
  yaz(aylar[0], 1)

  { sabit boyutlu listeyi serbest bir listeye kopyalayıp silmek; asıl liste değişmez }
  L := liste(dz)
  Sil(L, 2)
  yaz(L, 1)
  yaz(dz, 1)

  { sınırsız dizi liste gibi davranır }
  serbest := [1, 2, 3]
  Ekle(serbest, 4)
  Sil(serbest, 0)
  yaz(serbest, 1)
bitir.
