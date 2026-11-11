program Fib
{ Özyinelemeli Fibonacci: fonksiyon çağrısı ve tamsayı toplama hızını ölçer. }
fonksiyon F(n: tamsayı): tamsayı
başla
  eğer n < 2 ise dön n
  dön F(n - 1) + F(n - 2)
bitir
başla
  yaz(F(27), 1)
bitir.
