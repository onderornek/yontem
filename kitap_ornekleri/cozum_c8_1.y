program Ünlüler

fonksiyon ÜnlüSayısı(s: metin): tamsayı
değişken
  c: herhangi
başla
  sonuç := 0
  KüçükHarf(s) içindeki her c için
    eğer c içinde 'aeıioöuü' ise sonuç += 1
bitir

başla
  yaz(ÜnlüSayısı('Yöntem Programlama Dili'), 1)
bitir.
