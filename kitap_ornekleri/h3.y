program GroverArama
kullan Kuantum, KuantumAlgoritmaları
değişken
  d: herhangi
  sayım: sözlük
başla
  KuantumTohum(11)
  // 3 kübit = 8 olasılık. Aranan: '110'
  d := Grover('110')
  sayım := d.Çalıştır(200)
  yaz('Sonuçlar: ' + sayım, 1)
  yaz(Biçimle('Doğru cevabın olasılığı: %{:.1}', d.Olasılık('110') * 100), 1)
bitir.
