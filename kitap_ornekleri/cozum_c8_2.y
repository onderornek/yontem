program Fibonacci
değişken
  fib: liste
  i: tamsayı
başla
  fib := [0, 1]
  2'den 14'e kadar her i için
    fib.Ekle(fib[i - 1] + fib[i - 2])
  yaz(fib, 1)
  yaz('Çiftlerin toplamı: ' + (fib |> Süz(fonksiyon(x) => x mod 2 = 0) |> Toplam), 1)
bitir.
