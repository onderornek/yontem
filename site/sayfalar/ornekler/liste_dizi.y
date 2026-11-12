program ListeVeDizi
değişken
  notlar: tamsayı listesi
  aylar: tamsayı dizisi[1..3]
başla
  { liste: elemanlar 0'dan numaralanır, boyut değişebilir }
  notlar := [70, 85, 90, 60]
  Ekle(notlar, 100)        { sona ekler }
  Ekle(notlar, 75, 1)      { 75'i 1 numaralı konuma yerleştirir }
  notlar listesindeki 2. elemanı Sil
  yaz(notlar, 1)

  { dizi: sınırlarını siz belirlersiniz, boyut sabittir }
  aylar[1] := 31
  aylar[2] := 28
  aylar[3] := 31
  yaz(aylar, 1)

  { diziden eleman çıkarmak gerektiğinde önce listeye kopyalanır }
  notlar := liste(aylar)
  Sil(notlar, 1)
  yaz(notlar, 1)
bitir.
