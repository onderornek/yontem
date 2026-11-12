program Döngüler2
değişken
  n, toplam, i: tamsayı
  meyve: metin
başla
  // tekrarla: gövde en az bir kez çalışır
  n := 9875
  toplam := 0
  tekrarla
    toplam := toplam + n mod 10
    n := n böl 10
  n = 0 olana dek
  yaz('9875 sayısının basamakları toplamı: ' + toplam, 1)

  // her: bir koleksiyonun elemanları üzerinde dolaşır
  ['elma', 'armut', 'kiraz'] içindeki her meyve için
    yaz(meyve.BüyükHarf + ' ')
  yaz('', 1)

  // kır ve devam
  1'den 20'ye kadar her i için
  başla
    eğer i mod 3 = 0 ise devam    // 3'ün katlarını atla
    eğer i > 10 ise kır           // 10'u geçince döngüden çık
    yaz(i + ' ')
  bitir
  yaz('', 1)
bitir.
