program SabitDizi
değişken
  sıcaklık: ondalık dizisi[1..7]
  gün: tamsayı
başla
  1'den 7'ye kadar her gün için
    sıcaklık[gün] := 20 + gün * 1.5
  yaz(sıcaklık, 1)
  yaz('Sınırlar: ' + sıcaklık.Alt + '..' + sıcaklık.Üst, 1)
  sıcaklık[8] := 30
bitir.
