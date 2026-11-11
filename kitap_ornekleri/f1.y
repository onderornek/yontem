program Tensörler
kullan YZ
değişken
  A, B, v: tensör
başla
  A := Tensör([[1, 2], [3, 4]])
  B := Tensör([[0, 1], [1, 0]])
  v := Tensör([10, 20])
  yaz('A =', 1);  yaz(A, 1)
  yaz('Şekil       : ' + A.Şekil, 1)
  yaz('A + v       : ' + (A + v), 1)      // yayınlama: v her satıra eklenir
  yaz('A * 2       : ' + (A * 2), 1)
  yaz('A @ B       : ' + (A @ B), 1)      // matris çarpımı
  yaz('A.T         : ' + A.T, 1)          // devrik
  yaz('Toplam      : ' + A.Toplam.Değer, 1)
  yaz('Satır topl. : ' + A.Toplam(1), 1)
  yaz('A[1, 0]     : ' + A[1, 0], 1)
  yaz('Sigmoid(0)  : ' + Sigmoid(Tensör(0.0)), 1)
bitir.
