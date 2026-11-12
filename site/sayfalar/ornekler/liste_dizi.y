program ListeVeDizi
değişken
  notlar: tamsayı listesi
  aylar: tamsayı dizisi[1..3]
başla
  { liste: öğeler 0'dan numaralanır, boyut değişebilir }
  notlar := [70, 85, 90, 60]
  Ekle(notlar, 100)        { sona ekler }
  Araya(notlar, 1, 75)     { 1 numaralı konuma yerleştirir }
  Sil(notlar, 2)           { 3. öğeyi (konum 2) siler }
  yaz(notlar, 1)

  { dizi: sınırlarını siz belirlersiniz, boyut sabittir }
  aylar[1] := 31
  aylar[2] := 28
  aylar[3] := 31
  yaz(aylar, 1)

  { diziden öğe çıkarmak gerektiğinde önce listeye kopyalanır }
  notlar := liste(aylar)
  Sil(notlar, 1)
  yaz(notlar, 1)
bitir.
