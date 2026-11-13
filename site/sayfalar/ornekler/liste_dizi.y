program ListeVeDizi
değişken
  notlar: tamsayı listesi
  aylar: tamsayı listesi
başla
  { liste: elemanlar 0'dan numaralanır, boyut değişebilir }
  notlar := [70, 85, 90, 60]
  Ekle(notlar, 100)        { sona ekler }
  Ekle(notlar, 75, 1)      { 75'i 1 numaralı konuma yerleştirir }
  notlar listesindeki 2. elemanı Sil
  yaz(notlar, 1)

  { Uzunluk(3, 1): 3 elemanlı, numaraları 1'den başlayan sabit boyutlu liste }
  aylar.Uzunluk(3, 1)
  aylar[1] := 31
  aylar[2] := 28
  aylar[3] := 31
  yaz(aylar, 1)

  { boyutu sabit listeden eleman çıkarmak gerektiğinde serbest bir kopya alınır }
  notlar := liste(aylar)
  Sil(notlar, 1)
  yaz(notlar, 1)
bitir.
