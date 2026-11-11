program SözcükSayma
{ Sabit bir sözcük listesinden sözde rastgele bir metin kurar, sözcüklere ayırır ve sözlükle
  sayar; en sık beş sözcüğü yazar: metin işleme ve sözlük erişimi. }
sabit N: tamsayı = 40000
değişken
  sözcükler, parçalar: metin dizisi
  sayım: sözlük
  metin0, s, enİyi: metin
  i, tohum, k, enSayı: tamsayı
  kullanıldı: sözlük

başla
  sözcükler := ['elma', 'armut', 'kiraz', 'erik', 'incir', 'üzüm', 'nar', 'ayva', 'dut', 'şeftali',
    'karpuz', 'kavun', 'muz', 'limon', 'portakal', 'mandalina']
  parçalar := []
  tohum := 7
  0'dan N - 1'e kadar her i için
  başla
    tohum := (tohum * 16807) mod 2147483647
    k := (tohum mod 1000) mod 16
    eğer k > 7 ise k := (k * k) mod 16
    parçalar.Ekle(sözcükler[k])
  bitir
  metin0 := Birleştir(parçalar, ' ')
  sayım := [:]
  Ayır(metin0, ' ') içindeki her s için sayım[s] := sayım.Al(s, 0) + 1
  yaz('Toplam sözcük: ' + Uzunluk(Ayır(metin0, ' ')) + ', farklı: ' + Uzunluk(sayım), 1)
  kullanıldı := [:]
  1'den 5'e kadar her i için
  başla
    enSayı := -1; enİyi := ''
    sözcükler içindeki her s için
      eğer (s içinde sayım) ve değil (s içinde kullanıldı) ise
        eğer sayım[s] > enSayı ise başla enSayı := sayım[s]; enİyi := s bitir
    kullanıldı[enİyi] := 1
    yaz(Biçimle('{} {}', enİyi, enSayı), 1)
  bitir
bitir.
