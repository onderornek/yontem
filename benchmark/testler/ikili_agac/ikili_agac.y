program İkiliAğaç
{ Tam ikili ağaçlar kurar ve düğümlerini sayar: nesne oluşturma ve özyineleme. }
tip
  Düğüm = sınıf
    sol, sağ: Düğüm
  bitir

değişken
  derinlik, i, toplam: tamsayı

fonksiyon Kur(d: tamsayı): Düğüm
değişken x: Düğüm
başla
  x := Düğüm()
  eğer d > 0 ise
  başla
    x.sol := Kur(d - 1)
    x.sağ := Kur(d - 1)
  bitir
  dön x
bitir

fonksiyon Say(x: Düğüm): tamsayı
başla
  eğer x.sol = boş ise dön 1
  dön 1 + Say(x.sol) + Say(x.sağ)
bitir

başla
  4'ten 14'e kadar her derinlik için
  başla
    eğer derinlik mod 2 = 0 ise
    başla
      toplam := 0
      1'den 4'e kadar her i için toplam := toplam + Say(Kur(derinlik))
      yaz(Biçimle('derinlik {:2}: {} düğüm', derinlik, toplam), 1)
    bitir
  bitir
bitir.
