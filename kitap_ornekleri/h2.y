program Dolanıklık
kullan Kuantum
değişken
  d: herhangi
  a, b, i: tamsayı
başla
  KuantumTohum(3)
  d := Devre(2)
  d.H(0)
  d.CX(0, 1)                          // q0 1 ise q1'i çevir
  yaz(d.Çiz, 1)
  yaz('Durum: ' + d.Durum, 1)
  yaz('1000 atış: ' + d.Çalıştır(1000), 2)

  1'den 5'e kadar her i için
  başla
    d := Devre(2)
    d.H(0);  d.CX(0, 1)
    a := d.Ölç(0)
    b := d.Ölç(1)
    yaz('q0 = ' + a + ', q1 = ' + b, 1)
  bitir
bitir.
