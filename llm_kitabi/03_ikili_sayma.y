program SayarakDilModeli
{ İkili (bigram) dil modeli: bir sonraki karakterin olasılığı yalnızca bir önceki
  karaktere bağlıdır. Model eğitilmez, sayılır:
     P(sonraki = b | şimdiki = a) = say(a, b) / say(a, herhangi)
  Her atasözünün başına ve sonuna '.' koyarız; böylece model nerede başlayıp
  nerede bitireceğini de öğrenir. Sonra modelden yeni "atasözleri" örnekleriz
  ve modelin veriye ne kadar şaşırdığını ölçeriz. }
kullan Atasozleri, Matematik

değişken
  veri, harfler: metin dizisi
  numara: sözlük
  say: tamsayı dizisi dizisi
  P: ondalık dizisi dizisi
  a: metin
  i, k, n, öncekiNo, sonrakiNo: tamsayı
  satırToplamı: tamsayı
  logToplam: ondalık
  sözcük, kar: metin
  sıra: tamsayı dizisi

fonksiyon Örnekle(olasılıklar: ondalık dizisi): tamsayı
{ Olasılık dağılımından bir numara çeker: [0, 1) arasında bir sayı tutup
  olasılıkları sırayla toplar, toplam o sayıyı geçtiği yerde durur. }
değişken r, birikim: ondalık; i: tamsayı
başla
  r := Rastgele(1000000) / 1000000
  birikim := 0
  0'dan Uzunluk(olasılıklar) - 1'e kadar her i için
  başla
    birikim := birikim + olasılıklar[i]
    eğer r < birikim ise dön i
  bitir
  dön Uzunluk(olasılıklar) - 1
bitir

başla
  Tohum(42)
  veri := Atasozleri.Hepsi
  harfler := ['.'] + Sırala(Benzersiz(Birleştir(veri, '').Karakterler))
  n := Uzunluk(harfler)
  numara := [:]
  0'dan n - 1'e kadar her i için numara[harfler[i]] := i

  { 1) Say: say[i][j] = i. karakterden sonra j. karakterin kaç kez geldiği }
  say := Eşle(Aralık(n), fonksiyon(x: tamsayı) => Eşle(Aralık(n), fonksiyon(z: tamsayı) => 0))
  veri içindeki her a için
  başla
    öncekiNo := 0
    (a + '.').Karakterler içindeki her kar için
    başla
      sonrakiNo := numara[kar]
      say[öncekiNo][sonrakiNo] := say[öncekiNo][sonrakiNo] + 1
      öncekiNo := sonrakiNo
    bitir
  bitir

  { 2) Olasılığa çevir. Her sayıma 1 eklemek (düzleştirme) hiç görülmemiş
       bir çiftin olasılığının sıfır olmasını engeller. }
  P := []
  0'dan n - 1'e kadar her i için
  başla
    satırToplamı := Toplam(say[i]) + n
    P.Ekle(Eşle(say[i], fonksiyon(c: tamsayı) => (c + 1) / satırToplamı))
  bitir

  yaz('Atasözleri en sık şu harflerle başlar:', 1)
  sıra := Sırala(Aralık(n), fonksiyon(x: tamsayı) => -P[0][x])
  0'dan 4'e kadar her k için
    yaz(Biçimle('  "{}"  olasılık {:.3}', harfler[sıra[k]], P[0][sıra[k]]), 1)
  yaz('"ş" harfinden sonra en sık gelenler:', 1)
  i := numara['ş']
  sıra := Sırala(Aralık(n), fonksiyon(x: tamsayı) => -P[i][x])
  0'dan 4'e kadar her k için
    yaz(Biçimle('  "{}"  olasılık {:.3}', harfler[sıra[k]], P[i][sıra[k]]), 1)

  { 3) Örnekle: '.' ile başla, bir sonraki karakteri çek, '.' gelene kadar sürdür }
  yaz('', 1); yaz('Modelin ürettiği "atasözleri":', 1)
  1'den 8'e kadar her k için
  başla
    sözcük := ''; i := 0
    tekrarla
      i := Örnekle(P[i])
      eğer i <> 0 ise sözcük := sözcük + harfler[i]
    i = 0 olana dek
    yaz('  ' + sözcük, 1)
  bitir

  { 4) Değerlendirme: ortalama negatif log-olabilirlik (kayıp) ve şaşkınlık }
  logToplam := 0; k := 0
  veri içindeki her a için
  başla
    öncekiNo := 0
    (a + '.').Karakterler içindeki her kar için
    başla
      sonrakiNo := numara[kar]
      logToplam := logToplam - Ln(P[öncekiNo][sonrakiNo])
      k := k + 1
      öncekiNo := sonrakiNo
    bitir
  bitir
  yaz('', 1)
  yaz(Biçimle('Ortalama kayıp (karakter başına): {:.4}', logToplam / k), 1)
  yaz(Biçimle('Şaşkınlık (perplexity): {:.2}   (rastgele tahmin: {})', Üstel(logToplam / k), n), 1)
bitir.
