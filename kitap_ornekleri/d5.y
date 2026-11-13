program SabitListe
değişken
  sıcaklık: ondalık listesi
  gün: tamsayı
başla
  sıcaklık.Uzunluk(7, 1)
  1'den 7'ye kadar her gün için
    sıcaklık[gün] := 20 + gün * 1.5
  yaz(sıcaklık, 1)
  yaz('Sınırlar: ' + sıcaklık.Alt + '..' + sıcaklık.Üst, 1)
  sıcaklık[8] := 30
bitir.
