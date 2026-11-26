program AynıAndaTesti
{ 'aynı anda' döngüsü, ağ isteği olmadan: gövdeler sırayla, sonuna kadar çalışır.
  Ağ istekleriyle zamanlama: ag_testleri/ayni_anda_testi.y (node js/betikler/ag_testi.js) }

değişken
  kareler, çiftler: liste
  x, i: herhangi
  toplam: tamsayı
  aynı: tamsayı        { 'aynı' ve 'anda' sıradan ad olarak kullanılabilir }
  anda: metin

fonksiyon Kare(n: tamsayı): tamsayı
başla
  dön n * n
bitir

başla
  kareler := []
  aynı anda [1, 2, 3, 4] içindeki her x için
  başla
    değişken k := Kare(x)
    Ekle(kareler, k)
  bitir
  yaz(kareler, 1)

  çiftler := []
  aynı anda en çok 2 ['a', 'b', 'c'] içindeki her i, x için
    Ekle(çiftler, Metin(i) + x)
  yaz(çiftler, 1)

  aynı anda en çok (1 + 1) ['bir': 1, 'iki': 2] içindeki her i, x için
    yaz(i + '=' + Metin(x), 1)

  { döngü değişkeni her gövdede yereldir; dışarıdaki değişken değişmez }
  x := 'dışarıda'
  aynı anda [7] içindeki her x için yaz(x, 1)
  yaz(x, 1)

  aynı := 5
  anda := 'ad'
  yaz(Metin(aynı) + ' ' + anda, 1)

  toplam := 0
  dene
    aynı anda [1, 2] içindeki her x için
      toplam := toplam + x
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    aynı anda 5 içindeki her x için yaz(x, 1)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    aynı anda en çok ('iki') [1] içindeki her x için yaz(x, 1)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
bitir.
