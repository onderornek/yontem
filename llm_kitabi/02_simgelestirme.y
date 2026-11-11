program Simgeleştirme
{ Bir dil modeli harfleri değil sayıları işler. Bu program:
  1) Veri kümesindeki tüm karakterlerden bir sözlük kurar (karakter → numara).
  2) Bir cümleyi sayılara çevirir (kodlama) ve geri çevirir (çözme).
  3) Bayt çifti kodlamasının (BPE) fikrini gösterir: en sık yan yana gelen
     iki simgeyi birleştirip yeni bir simge yapar, bunu birkaç kez tekrarlar. }
kullan Atasozleri

değişken
  veri: metin dizisi
  harfler: metin dizisi
  numara: sözlük
  kodlar: tamsayı dizisi
  simgeler: metin dizisi
  çiftSay: sözlük
  enÇift, çift: metin
  i, tur, karakterSayısı: tamsayı
  yeni: metin dizisi

fonksiyon Kodla(s: metin): tamsayı dizisi
başla
  sonuç := Eşle(s.Karakterler, fonksiyon(c: metin) => numara[c])
bitir

fonksiyon Çöz(k: tamsayı dizisi): metin
başla
  sonuç := Birleştir(Eşle(k, fonksiyon(n: tamsayı) => harfler[n]), '')
bitir

başla
  veri := Atasozleri.Hepsi
  { Sözlük: '.' cümle sonu (ve başı) işaretidir; ardından görülen tüm karakterler, sıralı }
  harfler := ['.'] + Sırala(Benzersiz(Birleştir(veri, '').Karakterler))
  numara := [:]
  0'dan Uzunluk(harfler) - 1'e kadar her i için numara[harfler[i]] := i
  karakterSayısı := Toplam(Eşle(veri, fonksiyon(a: metin) => Uzunluk(a) + 1))
  yaz(Biçimle('{} atasözü, toplam {} karakter', Uzunluk(veri), karakterSayısı), 1)
  yaz(Biçimle('Sözlük boyutu: {}', Uzunluk(harfler)), 1)
  yaz('Sözlük: ' + Birleştir(harfler, ''), 2)

  kodlar := Kodla('damlaya damlaya göl olur')
  yaz('Kodlanmış : ' + kodlar, 1)
  yaz('Çözülmüş  : ' + Çöz(kodlar), 2)

  { BPE: başlangıçta her karakter bir simgedir }
  simgeler := Birleştir(Eşle(Dilim(veri, 0, 40), fonksiyon(a: metin) => a + '.'), '').Karakterler
  yaz(Biçimle('BPE başlangıcı: {} simge', Uzunluk(simgeler)), 1)
  1'den 6'ya kadar her tur için
  başla
    çiftSay := [:]
    0'dan Uzunluk(simgeler) - 2'ye kadar her i için
    başla
      çift := simgeler[i] + '|' + simgeler[i + 1]
      eğer çiftSay.İçerir(çift) ise çiftSay[çift] := çiftSay[çift] + 1 değilse çiftSay[çift] := 1
    bitir
    enÇift := Sırala(çiftSay.Anahtarlar, fonksiyon(k: metin) => -çiftSay[k])[0]
    { en sık çifti tek simgeye birleştir }
    yeni := []
    i := 0
    i < Uzunluk(simgeler) iken
    başla
      eğer i < Uzunluk(simgeler) - 1 ve simgeler[i] + '|' + simgeler[i + 1] = enÇift ise
      başla
        yeni.Ekle(simgeler[i] + simgeler[i + 1]); i := i + 2
      bitir
      değilse
      başla
        yeni.Ekle(simgeler[i]); i := i + 1
      bitir
    bitir
    simgeler := yeni
    yaz(Biçimle('  {}. birleştirme: "{}" ({} kez)  →  {} simge', tur,
      enÇift.Değiştir('|', ''), çiftSay[enÇift], Uzunluk(simgeler)), 1)
  bitir
  yaz('Simgelere bölünmüş ilk satırlar: ' + Birleştir(Dilim(simgeler, 0, 45), '|'), 1)
bitir.
