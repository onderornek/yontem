program KararAğacı
{ Hava durumuna bakarak "tenis oynanır mı?" sorusunu yanıtlayan bir karar ağacı kurar.
  Her düğümde, veriyi en "saf" gruplara ayıran öznitelik seçilir (Gini safsızlığı en düşük olan).
  Gini = 1 − Σ p², p: gruptaki her sınıfın oranı. Tek sınıflı grupta Gini = 0. }

değişken
  satırlar: metin dizisi dizisi      { son sütun: sınıf (evet / hayır) }
  öznitelikler: metin dizisi
  tümü: tamsayı dizisi
  i: tamsayı

fonksiyon Gini(sıra: tamsayı dizisi): ondalık
değişken
  evet, j: tamsayı
  p: ondalık
başla
  evet := 0
  sıra içindeki her j için eğer satırlar[j][4] = 'evet' ise evet := evet + 1
  p := evet / Uzunluk(sıra)
  sonuç := 1 - p * p - (1 - p) * (1 - p)
bitir

fonksiyon Değerler(sıra: tamsayı dizisi; sütun: tamsayı): metin dizisi
değişken j: tamsayı
başla
  sonuç := []
  sıra içindeki her j için
    eğer değil (satırlar[j][sütun] içinde sonuç) ise sonuç.Ekle(satırlar[j][sütun])
bitir

fonksiyon Süzgeç(sıra: tamsayı dizisi; sütun: tamsayı; d: metin): tamsayı dizisi
başla
  sonuç := Süz(sıra, fonksiyon(j: tamsayı) => satırlar[j][sütun] = d)
bitir

{ Ağırlıklı Gini: bölünmeden sonra çocukların Gini değerlerinin, büyüklükleriyle ağırlıklı ortalaması }
fonksiyon BölünmeGinisi(sıra: tamsayı dizisi; sütun: tamsayı): ondalık
değişken d: metin
başla
  sonuç := 0
  Değerler(sıra, sütun) içindeki her d için
    sonuç := sonuç + Uzunluk(Süzgeç(sıra, sütun, d)) / Uzunluk(sıra) * Gini(Süzgeç(sıra, sütun, d))
bitir

prosedür Kur(sıra: tamsayı dizisi; kullanılmış: tamsayı dizisi; girinti: metin)
değişken
  en, s: tamsayı
  enIyi: ondalık
  d: metin
başla
  eğer Gini(sıra) = 0 veya Uzunluk(kullanılmış) = 4 ise
  başla
    yaz(girinti + '→ ' + satırlar[sıra[0]][4] + ' (' + Uzunluk(sıra) + ' örnek)', 1)
    dön
  bitir
  en := -1; enIyi := 2
  0'dan 3'e kadar her s için
    eğer değil (s içinde kullanılmış) ve BölünmeGinisi(sıra, s) < enIyi ise
    başla
      enIyi := BölünmeGinisi(sıra, s); en := s
    bitir
  Değerler(sıra, en) içindeki her d için
  başla
    yaz(Biçimle('{}{} = {}?  (Gini {:.3} → {:.3})', girinti, öznitelikler[en], d, Gini(sıra), enIyi), 1)
    Kur(Süzgeç(sıra, en, d), kullanılmış + [en], girinti + '    ')
  bitir
bitir

başla
  öznitelikler := ['Hava', 'Sıcaklık', 'Nem', 'Rüzgâr']
  satırlar := [
    ['güneşli', 'sıcak', 'yüksek', 'yok', 'hayır'], ['güneşli', 'sıcak', 'yüksek', 'var', 'hayır'],
    ['bulutlu', 'sıcak', 'yüksek', 'yok', 'evet'],  ['yağmurlu', 'ılık', 'yüksek', 'yok', 'evet'],
    ['yağmurlu', 'serin', 'normal', 'yok', 'evet'], ['yağmurlu', 'serin', 'normal', 'var', 'hayır'],
    ['bulutlu', 'serin', 'normal', 'var', 'evet'],  ['güneşli', 'ılık', 'yüksek', 'yok', 'hayır'],
    ['güneşli', 'serin', 'normal', 'yok', 'evet'],  ['yağmurlu', 'ılık', 'normal', 'yok', 'evet'],
    ['güneşli', 'ılık', 'normal', 'var', 'evet'],   ['bulutlu', 'ılık', 'yüksek', 'var', 'evet'],
    ['bulutlu', 'sıcak', 'normal', 'yok', 'evet'],  ['yağmurlu', 'ılık', 'yüksek', 'var', 'hayır']]
  tümü := Aralık(Uzunluk(satırlar))
  yaz(Biçimle('Kökün Gini değeri: {:.3}', Gini(tümü)), 2)
  0'dan 3'e kadar her i için
    yaz(Biçimle('{:9} ile bölünürse ağırlıklı Gini: {:.3}', öznitelikler[i], BölünmeGinisi(tümü, i)), 1)
  yaz('', 1)
  Kur(tümü, [], '')
bitir.
