program DöngüVeDizi
{ Sayan döngünün dört biçimi ile liste/dizi ayrımı (Ekle, Sil) }
değişken
  a, b, c: tamsayı
  dz: tamsayı dizisi[1..5]
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
  Ekle(L, 2, 30)
  Ekle(L, 60)
  yaz(L, 1)
  yaz(L.Sil(-1), 1)
  L.Ekle(0, 5)
  Ekle(L, -1, 45)
  Ekle(L, 99, 70)
  yaz(L, 1)
  dene
    Ekle(L, 'iki', 7)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    Araya(L, 0, 1)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir

  { sınırlı dizi: boyutu sabittir }
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
    Ekle(dz, 1, 5)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  yaz(dz, 1)
  yaz(Uzunluk(dz), 1)

  { diziyi listeye kopyalayıp silmek; dizi değişmez }
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
