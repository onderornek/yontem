program İlkKübit
kullan Kuantum
değişken
  d: herhangi
  i, birler: tamsayı
başla
  KuantumTohum(5)
  d := Devre(1)                       // bir kübit, |0⟩ durumunda
  yaz('Başlangıç : ' + d.Durum, 1)
  d.X(0)                              // NOT kapısı: |0⟩ -> |1⟩
  yaz('X sonrası : ' + d.Durum, 1)
  d.H(0)                              // Hadamard: süperpozisyon
  yaz('H sonrası : ' + d.Durum, 1)
  yaz('Olasılıklar: ' + d.Olasılıklar, 2)

  // 100 kez hazırla ve ölç
  birler := 0
  1'den 100'e kadar her i için
  başla
    d := Devre(1)
    d.H(0)
    birler += d.Ölç(0)
  bitir
  yaz('100 ölçümde 1 çıkma sayısı: ' + birler, 1)
bitir.
