program KuantumÖrnekleri
{ Kuantum birimiyle kuantum devreleri: dolanıklık, Grover araması, QFT,
  Deutsch–Jozsa, Bernstein–Vazirani, ışınlama ve değişimsel kuantum özçözücü (VQE). }
kullan Kuantum, KuantumAlgoritmaları, Matematik

değişken
  d: herhangi
  sayım: sözlük
  açılar, grad: liste
  i: tamsayı
  teta, fi: ondalık
  beklenen, gelen: liste

{ Değişimsel devre: 2 kübit, 2 dolanıklık katmanı, 6 parametre }
fonksiyon Ansatz(p: liste): herhangi
değişken
  katman: tamsayı
başla
  sonuç := Devre(2)
  sonuç.Ry(0, p[0]);  sonuç.Ry(1, p[1])
  1'den 2'ye kadar her katman için
  başla
    sonuç.CX(0, 1)
    sonuç.Ry(0, p[2 * katman]);  sonuç.Ry(1, p[2 * katman + 1])
  bitir
bitir

{ Enine alanlı Ising modeli: H = Z⊗Z + 0.5·(X⊗I + I⊗X) }
fonksiyon Enerji(p: liste): ondalık
değişken
  d: herhangi
başla
  d := Ansatz(p)
  dön d.BeklenenDeğer('ZZ') + 0.5 * (d.BeklenenDeğer('XI') + d.BeklenenDeğer('IX'))
bitir

prosedür DengeliKehanet(d: herhangi; yardımcı: tamsayı)   // f(x) = x0 XOR x1
başla
  d.CX(0, yardımcı)
  d.CX(1, yardımcı)
bitir

prosedür SabitKehanet(d: herhangi; yardımcı: tamsayı)     // f(x) = 1
başla
  d.X(yardımcı)
bitir

başla
  KuantumTohum(2026)

  yaz('=== 1) Bell durumu ve dolanıklık ===', 1)
  d := BellÇifti
  yaz(d.Çiz, 1)
  yaz('Durum      : ' + d.Durum, 1)
  yaz('1000 atış  : ' + d.Çalıştır(1000), 1)
  yaz('⟨ZZ⟩ = ' + d.BeklenenDeğer('ZZ') + ',  ⟨XX⟩ = ' + d.BeklenenDeğer('XX'), 2)

  yaz('=== 2) GHZ durumu (4 kübit) ===', 1)
  yaz(GHZ(4).Durum, 2)

  yaz('=== 3) Grover araması: 16 olasılık içinde ''1011'' ===', 1)
  d := Grover('1011')
  sayım := d.Çalıştır(500)
  yaz(Biçimle('P(1011) = {:.3}   en sık sonuç: {}', d.Olasılık('1011'),
              Sırala(Anahtarlar(sayım), fonksiyon(k) => sayım[k], doğru)[0]), 2)

  yaz('=== 4) Kuantum Fourier dönüşümü ve tersi ===', 1)
  d := Devre(3)
  d.X(0);  d.X(2)                         // |101⟩
  QFT(d, [0, 1, 2])
  yaz('QFT sonrası olasılıklar eşit: ' + d.Olasılıklar, 1)
  TersQFT(d, [0, 1, 2])
  yaz('Ters QFT sonrası durum: ' + d.Durum, 2)

  yaz('=== 5) Deutsch–Jozsa ve Bernstein–Vazirani ===', 1)
  yaz('f(x) = x0 xor x1  -> ' + DeutschJozsa(2, @DengeliKehanet), 1)
  yaz('f(x) = 1          -> ' + DeutschJozsa(2, @SabitKehanet), 1)
  yaz('Gizli dizi tek sorguda bulundu: ' + BernsteinVazirani('110101'), 2)

  yaz('=== 6) Kuantum ışınlama (devre ortası ölçüm + klasik denetim) ===', 1)
  teta := 1.1;  fi := 0.7
  d := Işınla(teta, fi)
  beklenen := [Sin(teta) * Cos(fi), Sin(teta) * Sin(fi), Cos(teta)]
  gelen := d.BlochVektörü(2)
  yaz(d.Çiz, 1)
  yaz(Biçimle('Gönderilen Bloch vektörü: [{:.3}, {:.3}, {:.3}]', beklenen[0], beklenen[1], beklenen[2]), 1)
  yaz(Biçimle('Bora''nın kübiti (q2)   : [{:.3}, {:.3}, {:.3}]', gelen[0], gelen[1], gelen[2]), 2)

  yaz('=== 7) VQE: parametre kaydırma kuralıyla gradyan inişi ===', 1)
  açılar := [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
  1'den 100'e kadar her i için
  başla
    grad := ParametreKaydırma(@Enerji, açılar)
    açılar := Eşle(Eşleştir(açılar, grad), fonksiyon(p) => p[0] - 0.3 * p[1])
    eğer i mod 20 = 0 ise
      yaz(Biçimle('  adım {:3}   enerji = {:.5}', i, Enerji(açılar)), 1)
  bitir
  yaz(Biçimle('Kesin taban durum enerjisi: {:.5}', -Kök(2)), 1)
bitir.
