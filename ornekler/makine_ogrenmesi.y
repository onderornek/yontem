program MakineÖğrenmesiÖrneği
kullan MakineÖğrenmesi, İstatistik, Matematik

değişken
  X, Y, sonuçlar, merkezler, atamalar: liste
  knn: KEnYakın
  dr: DoğrusalRegresyon
  lr: LojistikRegresyon
  saatler, puanlar: liste
  kayıp: ondalık

başla
  Tohum(3)

  // --- k-en yakın komşu: iki boyutlu iki sınıf
  X := [[1, 1], [1, 2], [2, 1], [2, 2], [8, 8], [8, 9], [9, 8], [9, 9]]
  Y := ['mavi', 'mavi', 'mavi', 'mavi', 'kırmızı', 'kırmızı', 'kırmızı', 'kırmızı']
  knn := KEnYakın.Oluştur(3)
  knn.Eğit(X, Y)
  yaz('k-NN [1.5, 1.8] -> ' + knn.Tahmin([1.5, 1.8]) + ',  [7, 8.5] -> ' + knn.Tahmin([7, 8.5]), 1)

  // --- k-ortalamalar kümeleme
  sonuçlar := KOrtalamalar(X, 2)
  merkezler := sonuçlar[0]
  atamalar := sonuçlar[1]
  yaz('k-ortalamalar atamaları: ' + atamalar, 1)
  yaz('Merkezler: ' + Sırala(merkezler), 1)

  // --- doğrusal regresyon
  saatler := [1, 2, 3, 4, 5, 6, 7, 8]
  puanlar := [52, 55, 61, 64, 70, 73, 79, 83]
  dr := DoğrusalRegresyon.Oluştur
  dr.Eğit(saatler, puanlar)
  yaz(Biçimle('Regresyon: puan = {:.2} * saat + {:.2}   (R² = {:.3})', dr.eğim, dr.kesişim, dr.r2), 1)
  yaz(Biçimle('10 saat çalışan için tahmin: {:.1}', dr.Tahmin(10)), 1)
  yaz(Biçimle('Korelasyon: {:.4}, medyan puan: {}', Korelasyon(saatler, puanlar), Medyan(puanlar)), 1)

  // --- lojistik regresyon (YZ tensörleri + otomatik türev)
  lr := LojistikRegresyon.Oluştur(2)
  kayıp := lr.Eğit(Eşle(X, fonksiyon(p) => [p[0] / 10, p[1] / 10]),
                   Eşle(Y, fonksiyon(e) => eğer e = 'kırmızı' ise 1 değilse 0), 400, 0.1)
  yaz(Biçimle('Lojistik regresyon kaybı: {:.4}', kayıp), 1)
  yaz('[0.15, 0.2] -> sınıf ' + lr.Tahmin([0.15, 0.2]) + ',  [0.85, 0.8] -> sınıf ' + lr.Tahmin([0.85, 0.8]), 1)
bitir.
