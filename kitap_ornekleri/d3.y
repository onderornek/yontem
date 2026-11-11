program Listeler
değişken
  notlar: liste
  n: herhangi
  toplam: ondalık
başla
  notlar := [72, 85, 90, 64]
  notlar.Ekle(78)                           // sona ekle
  yaz('Notlar     : ' + notlar, 1)
  yaz('İlk not    : ' + notlar[0], 1)       // listeler 0'dan başlar
  yaz('Not sayısı : ' + notlar.Uzunluk, 1)
  yaz('Sıralı     : ' + Sırala(notlar), 1)
  yaz('En yüksek  : ' + Maks(notlar), 1)
  toplam := 0
  notlar içindeki her n için toplam += n
  yaz('Ortalama   : ' + toplam / Uzunluk(notlar), 1)
  yaz('85 var mı? : ' + (85 içinde notlar), 1)
  yaz('1..5       : ' + [1..5], 1)
  notlar[0] := 100
  Sil(notlar, 1)
  yaz('Değişmiş   : ' + notlar, 1)
bitir.
