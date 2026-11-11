birim Uzman
{ Kural tabanlı uzman sistem: olgular, EĞER-İSE kuralları, ileri zincirleme
  (veriden sonuca) ve geri zincirleme (hedeften kanıta) çıkarım, güven katsayıları. }

arayüz
tip
  Kural = sınıf
    ad: metin
    koşullar: liste
    çıkarım: metin
    güven: ondalık
    fonksiyon MetneÇevir: metin
  bitir

  BilgiTabanı = sınıf
    olgular: sözlük        // olgu -> güven (0..1)
    kurallar: liste
    açıklamalar: sözlük    // olgu -> onu üreten kural adı
    kurucu Oluştur
    prosedür OlguEkle(o: metin; g: ondalık = 1.0)
    prosedür KuralEkle(ad: metin; koşullar: liste; çıkarım: metin; g: ondalık = 1.0)
    fonksiyon Bilinir(o: metin): mantıksal
    fonksiyon Güven(o: metin): ondalık
    fonksiyon İleriZincirle: liste
    fonksiyon GeriZincirle(hedef: metin): mantıksal
    fonksiyon Açıkla(o: metin): metin
  bitir

uygulama

fonksiyon Kural.MetneÇevir: metin
başla
  dön Biçimle('{}: EĞER {} İSE {} ({:.2})', ad, Birleştir(koşullar, ' VE '), çıkarım, güven)
bitir

kurucu BilgiTabanı.Oluştur
başla
  olgular := [:]
  kurallar := []
  açıklamalar := [:]
bitir

prosedür BilgiTabanı.OlguEkle(o: metin; g: ondalık = 1.0)
başla
  olgular[o] := g
  açıklamalar[o] := 'verilen olgu'
bitir

prosedür BilgiTabanı.KuralEkle(ad: metin; koşullar: liste; çıkarım: metin; g: ondalık = 1.0)
değişken
  k: Kural
başla
  k := Kural.Oluştur
  k.ad := ad;  k.koşullar := koşullar;  k.çıkarım := çıkarım;  k.güven := g
  kurallar.Ekle(k)
bitir

fonksiyon BilgiTabanı.Bilinir(o: metin): mantıksal
başla
  dön o içinde olgular
bitir

fonksiyon BilgiTabanı.Güven(o: metin): ondalık
başla
  dön olgular.Al(o, 0.0)
bitir

{ Yeni olgu üretilemeyene dek kuralları ateşler. Ateşlenen kuralların listesini döndürür. }
fonksiyon BilgiTabanı.İleriZincirle: liste
değişken
  değişti: mantıksal
  k: Kural
  c: herhangi
  hepsi: mantıksal
  g: ondalık
  iz: liste
başla
  iz := []
  tekrarla
    değişti := yanlış
    kurallar içindeki her k için
    başla
      eğer Bilinir(k.çıkarım) ise devam
      hepsi := doğru
      g := k.güven
      k.koşullar içindeki her c için
        eğer Bilinir(c) ise
          g := Min(g, olgular[c])
        değilse
        başla
          hepsi := yanlış
          kır
        bitir
      eğer hepsi ise
      başla
        olgular[k.çıkarım] := g
        açıklamalar[k.çıkarım] := k.ad
        iz.Ekle(k.ad + ' => ' + k.çıkarım)
        değişti := doğru
      bitir
    bitir
  değil değişti olana dek
  dön iz
bitir

fonksiyon BilgiTabanı.GeriZincirle(hedef: metin): mantıksal
değişken
  k: Kural
  c: herhangi
  hepsi: mantıksal
başla
  eğer Bilinir(hedef) ise dön doğru
  kurallar içindeki her k için
    eğer k.çıkarım = hedef ise
    başla
      hepsi := doğru
      k.koşullar içindeki her c için
        eğer değil GeriZincirle(c) ise
        başla
          hepsi := yanlış
          kır
        bitir
      eğer hepsi ise
      başla
        olgular[hedef] := k.güven
        açıklamalar[hedef] := k.ad
        dön doğru
      bitir
    bitir
  dön yanlış
bitir

fonksiyon BilgiTabanı.Açıkla(o: metin): metin
değişken
  k: Kural
  parçalar: liste
  c: herhangi
başla
  eğer değil Bilinir(o) ise dön o + ' bilinmiyor'
  eğer açıklamalar[o] = 'verilen olgu' ise dön o + ' (verilen olgu)'
  parçalar := []
  kurallar içindeki her k için
    eğer k.ad = açıklamalar[o] ise
      k.koşullar içindeki her c için parçalar.Ekle(Açıkla(c))
  dön o + ' <- ' + açıklamalar[o] + ' [' + Birleştir(parçalar, '; ') + ']'
bitir

bitir.
