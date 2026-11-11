program KEnYakınKomşu
{ Meyveyi ağırlığına (g) ve kabuk pürüzlülüğüne (0-10) bakarak sınıflandırır.
  Yeni bir meyvenin sınıfı, ona en yakın k eğitim örneğinin oy çokluğuyla belirlenir. }
kullan Matematik

değişken
  veri: ondalık dizisi dizisi
  etiket: metin dizisi
  yeniler: ondalık dizisi dizisi
  i: tamsayı
  s: ondalık dizisi

fonksiyon Uzaklık(p, q: ondalık dizisi): ondalık
başla
  { Öklid uzaklığı; ağırlık 100 g ölçeğinde, pürüzlülük 1 ölçeğinde olsun diye ağırlığı 20'ye bölüyoruz }
  sonuç := Kök(((p[0] - q[0]) / 20) ** 2 + (p[1] - q[1]) ** 2)
bitir

fonksiyon Sınıflandır(x: ondalık dizisi; k: tamsayı): metin
değişken
  sıra: tamsayı dizisi
  oyElma, oyPortakal, j: tamsayı
başla
  sıra := Sırala(Aralık(Uzunluk(veri)), fonksiyon(n: tamsayı) => Uzaklık(veri[n], x))
  oyElma := 0; oyPortakal := 0
  0'dan k - 1'e kadar her j için
    eğer etiket[sıra[j]] = 'elma' ise oyElma := oyElma + 1 değilse oyPortakal := oyPortakal + 1
  sonuç := eğer oyElma > oyPortakal ise 'elma' değilse 'portakal'
bitir

başla
  { [186, 7] alışılmadık, portakala benzeyen bir elma: k=1 bu tek örneğe kanar }
  veri := [[150, 2], [170, 1], [140, 3], [130, 2], [180, 2], [186, 7],
           [160, 7], [200, 8], [190, 6], [210, 7], [175, 9]]
  etiket := ['elma', 'elma', 'elma', 'elma', 'elma', 'elma',
             'portakal', 'portakal', 'portakal', 'portakal', 'portakal']
  yeniler := [[155, 3], [185, 7], [165, 5], [200, 3]]
  0'dan Uzunluk(yeniler) - 1'e kadar her i için
  başla
    s := yeniler[i]
    yaz(Biçimle('{} g, pürüzlülük {} → k=1: {:9}  k=3: {:9}  k=5: {}',
      s[0], s[1], Sınıflandır(s, 1), Sınıflandır(s, 3), Sınıflandır(s, 5)), 1)
  bitir
bitir.
