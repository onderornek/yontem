program DikkatMekanizması
{ Transformer'ların kalbi: ölçeklenmiş nokta çarpımı dikkati.
  Her kelime üç vektör üretir: Sorgu (Q: "ne arıyorum?"), Anahtar (K: "bende ne var?"), Değer (V: "ne aktarırım?").
     ağırlıklar = softmaks(Q Kᵀ / √d)      çıktı = ağırlıklar @ V
  Bir kelimenin sorgusu hangi kelimenin anahtarına benziyorsa, o kelimenin değerinden daha çok pay alır.
  Böylece her kelime cümlenin geri kalanından bağlamını toplar.
  Bölüm A: elle seçilmiş küçük vektörlerle "o" zamirinin kime baktığını görelim.
  Bölüm B: Q ve K izdüşümlerini veriden öğrenerek dikkatin bir görevi çözmesini sağlayalım. }
kullan YZ, Matematik

değişken
  kelimeler: metin dizisi
  E, Wq, Wk, Q, K, V, A: tensör
  i, adım: tamsayı
  kayıp: tensör
  opt: herhangi
  girdi, hedef, çıkış: tensör

fonksiyon Dikkat(Q, K: tensör): tensör
başla
  dön Softmaks(Q @ K.T / Kök(K.Şekil[1]))
bitir

başla
  yaz('--- A) "kedi sütü içti çünkü o acıkmıştı" ---', 1)
  kelimeler := ['kedi', 'sütü', 'içti', 'çünkü', 'o', 'acıkmıştı']
  { 4 boyutlu temsiller: [canlı mı, nesne mi, eylem mi, zamir mi] }
  E := Tensör([[1.0, 0.0, 0.0, 0.0],
               [0.0, 1.0, 0.0, 0.0],
               [0.0, 0.2, 1.0, 0.0],
               [0.0, 0.0, 0.3, 0.0],
               [0.3, 0.0, 0.0, 1.0],
               [0.4, 0.0, 1.0, 0.0]])
  { Elle kurulmuş izdüşümler: zamir özelliği olan kelimeler "canlı" bir şey arasın }
  Wq := Tensör([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0], [3, 0, 0, 0]])
  Wk := Tensör([[3, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0]])
  Q := E @ Wq
  K := E @ Wk
  A := Dikkat(Q, K)
  yaz('Dikkat ağırlıkları (satır: bakan kelime, sütun: bakılan kelime)', 1)
  yaz('            ' + Birleştir(Eşle(kelimeler, fonksiyon(k: metin) => Biçimle('{:10}', k)), ''), 1)
  0'dan 5'e kadar her i için
    yaz(Biçimle('{:11} ', kelimeler[i]) + Birleştir(Eşle(Aralık(6), fonksiyon(k: tamsayı) => Biçimle('{:10.2}', A[i, k])), ''), 1)
  yaz('"o" en çok şuna bakıyor: ' + kelimeler[ArgMaks(A.Satır(4))], 1)

  yaz('', 1)
  yaz('--- B) Dikkati öğrenmek: "her konum bir sonraki konuma baksın" ---', 1)
  { 4 konum; her konumun temsili kendi konumunun tek-sıcak vektörü. Hedef: her konum,
    bir sonraki konumun değerini getirsin (sonuncu başa dönsün). Wq ve Wk rastgele başlar. }
  Tohum(8)
  girdi := BirSıcak([0, 1, 2, 3], 4)
  { V'nin her sütunu ayrı bir eğitim örneği (aynı konumlar, farklı değerler).
    Tek örnekle ağ "hileli" karışımlar bulabilir; çeşitli örnekler gerçek kuralı zorlar. }
  V := Tensör([[5, 2, 0], [1, 8, 4], [7, 3, 9], [3, 6, 1]])
  hedef := Tensör([[1, 8, 4], [7, 3, 9], [3, 6, 1], [5, 2, 0]])
  Wq := RastgeleTensör(4, 4, 0.5, doğru)
  Wk := RastgeleTensör(4, 4, 0.5, doğru)
  opt := Adam([Wq, Wk], 0.1)
  1'den 300'e kadar her adım için
  başla
    opt.SıfırlaGrad
    çıkış := Dikkat(girdi @ Wq, girdi @ Wk) @ V
    kayıp := OKH(çıkış, hedef)
    kayıp.GeriYay
    opt.Adım
    eğer adım = 1 veya adım mod 100 = 0 ise
      yaz(Biçimle('Adım {:3}: kayıp {:.4}  1. örneğin çıktıları {}', adım, kayıp.Değer,
        Eşle(Aralık(4), fonksiyon(k: tamsayı) => Yuvarla(çıkış[k, 0], 2))), 1)
  bitir
  A := Dikkat(girdi @ Wq, girdi @ Wk)
  yaz('1. örneğin hedefi [1, 7, 3, 5]. Öğrenilen dikkat ağırlıkları:', 1)
  0'dan 3'e kadar her i için
    yaz(Biçimle('  konum {} → ', i) + Birleştir(Eşle(Aralık(4), fonksiyon(k: tamsayı) => Biçimle('{:6.2}', A[i, k])), ''), 1)
  { Öğrenilen şey değerler değil bakılacak yer: yepyeni değerlerle de çalışır }
  V := Tensör([[10.0], [20.0], [30.0], [40.0]])
  çıkış := A @ V
  yaz('Yeni değerler [10, 20, 30, 40] → ' + Eşle(Aralık(4), fonksiyon(k: tamsayı) => Yuvarla(çıkış[k, 0], 1)), 1)
bitir.
