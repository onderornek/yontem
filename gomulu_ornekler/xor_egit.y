program XorEğit
{ Masaüstünde (JavaScript ya da Python ile) çalışır: XOR ağını eğitir ve ağırlıkları
  XorModeli.y birimi olarak dışa aktarır. Bu birim ESP32'de xor_cikarim.y tarafından kullanılır. }
kullan YZ

değişken
  model: herhangi
  X, Y: liste

başla
  Tohum(7)
  X := [[0, 0], [0, 1], [1, 0], [1, 1]]
  Y := [[0], [1], [1], [0]]
  model := Ardışık([Yoğun(2, 8, 'tanh'), Yoğun(8, 1, 'sigmoid')])
  Eğit(model, X, Y, 'ikiliÇaprazEntropi', Adam(model.Parametreler, 0.05), 300, 100)
  yaz('Tahminler: ' + model.Tahmin(X), 1)
  ModeliDışaAktar(model, 'XorModeli.y')
  yaz('XorModeli.y yazıldı.', 1)
bitir.
