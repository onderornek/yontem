program GHZÖrneği
kullan Kuantum, KuantumAlgoritmaları
değişken
  d: herhangi
başla
  d := Devre(3)
  d.H(0)
  d.CX(0, 1)
  d.CX(1, 2)
  yaz(d.Durum, 1)
  yaz('Aynı mı? ' + (Sadakat(d, GHZ(3)) > 0.9999), 1)
bitir.
