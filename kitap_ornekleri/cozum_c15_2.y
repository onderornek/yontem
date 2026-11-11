program GroverTekrar
kullan Kuantum, KuantumAlgoritmaları
değişken
  t: tamsayı
başla
  1'den 4'e kadar her t için
    yaz(Biçimle('tekrar = {}: P(1011) = {:.3}', t, Grover('1011', t).Olasılık('1011')), 1)
bitir.
