program Değişkenler

sabit
  KDV_ORANI: ondalık = 0.20           // sabitler değiştirilemez

değişken
  ad: metin
  yaş: tamsayı
  boy: ondalık
  öğrenci: mantıksal
  fiyat: ondalık = 250.0     // ilk değerli bildirim

başla
  ad := 'Elif'
  yaş := 21
  boy := 1.68
  öğrenci := doğru

  yaz('Ad      : ' + ad, 1)
  yaz('Yaş     : ' + yaş, 1)
  yaz('Boy     : ' + boy + ' m', 1)
  yaz('Öğrenci : ' + öğrenci, 1)
  yaz('KDV''li fiyat: ' + fiyat * (1 + KDV_ORANI), 1)
  yaz('Tipler: ' + Tür(yaş) + ', ' + Tür(boy) + ', ' + Tür(ad), 1)
bitir.
