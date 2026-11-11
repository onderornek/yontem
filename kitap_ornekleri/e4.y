program HataYönetimi
değişken
  sayılar: liste
  i, bölen: tamsayı

fonksiyon Bölüştür(toplam, kişi: tamsayı): tamsayı
başla
  eğer kişi <= 0 ise
    fırlat Hata('Kişi sayısı pozitif olmalı', 'GeçersizGirdi')
  dön toplam böl kişi
bitir

başla
  sayılar := [10, 20, 30]
  dene
    yaz(sayılar[5], 1)
  yakala (h)
    yaz('Yakalandı: ' + h.mesaj, 1)
  bitir

  [3, 0, -2] içindeki her bölen için
  başla
    dene
      yaz('100 / ' + bölen + ' kişi = ' + Bölüştür(100, bölen), 1)
    yakala (h)
      yaz(h.tür + ': ' + h.mesaj, 1)
    sonunda
      yaz('  (hesap denendi)', 1)
    bitir
  bitir

  İddia(Uzunluk(sayılar) = 3, 'Liste 3 öğeli olmalı')
  yaz('İddia doğrulandı.', 1)
bitir.
