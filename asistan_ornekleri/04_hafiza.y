program HafızaÖrneği
{ 4. adım: kendi belgelerinizi anlamlarına göre aramak.
  'sqlite::bellek:' geçici bir hafızadır; kalıcı olması için 'sqlite:hafiza.db' yazın. }
kullan Hafıza, Sistem

değişken
  dosya, soru: metin
  bulunan: sözlük

başla
  HafızaAç('sqlite::bellek:')
  ['belgeler/izin.md', 'belgeler/kargo.md', 'belgeler/iade.md'] içindeki her dosya için
    yaz(dosya + ': ' + HafızayaEkle(dosya, DosyaOku(dosya)) + ' parça', 1)
  yaz('Hafızadaki parça sayısı: ' + HafızaSayısı, 1)

  ['Kargo ücreti ne kadar?', 'İade süresi kaç gün?'] içindeki her soru için
  başla
    yaz('', 1)
    yaz('Soru: ' + soru, 1)
    HafızadaAra(soru, 2) içindeki her bulunan için
      yaz('  ' + Yuvarla(bulunan['benzerlik'], 2) + '  ' + bulunan['kaynak'] + '  ' + AltMetin(Değiştir(bulunan['metin'], #10, ' '), 1, 60) + '…', 1)
  bitir
  HafızaKapat
bitir.
