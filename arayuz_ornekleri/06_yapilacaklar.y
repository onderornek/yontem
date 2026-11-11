program Yapılacaklar
{ Yapılacaklar listesi: yeni iş eklenir, tamamlananlar işaretlenir. Liste telefonda saklanır.
  Arayüz programla değiştirilir: Dikey kutunun içeriği her değişiklikte yeniden kurulur. }
kullan Pencere, Mobil

değişken
  işler: liste
  bitti: liste
  kutu, liste_, ekleDüğmesi, durum: herhangi

prosedür Kaydet
başla
  Sakla('işler', işler)
  Sakla('bitti', bitti)
bitir

prosedür Kur
değişken i: tamsayı; o: herhangi
başla
  liste_.Temizle
  0'dan Uzunluk(işler) - 1'e kadar her i için
  başla
    o := OnayKutusu(işler[i], bitti[i])
    o.Değişince(@İşaretlendi)
    liste_.Ekle(o)
  bitir
  Say
bitir

prosedür İşaretlendi
değişken j: tamsayı
başla
  { Kutuların durumunu listeye aktar: hangi kutunun değiştiği önemli değil }
  0'dan Uzunluk(işler) - 1'e kadar her j için
    bitti[j] := liste_.Çocuklar[j].İşaretli
  Kaydet
  Say
bitir

prosedür Say
değişken i, kalan: tamsayı
başla
  kalan := 0
  0'dan Uzunluk(bitti) - 1'e kadar her i için
    eğer değil bitti[i] ise kalan := kalan + 1
  durum.Metin := Metin(kalan) + ' iş kaldı'
bitir

prosedür YeniEkle
başla
  eğer Uzunluk(kutu.Metin) = 0 ise dön
  işler.Ekle(kutu.Metin)
  bitti.Ekle(yanlış)
  kutu.Metin := ''
  Kaydet
  Kur
bitir

başla
  Başlık('Yapılacaklar')
  işler := Getir('işler', ['Ekmek al', 'Kitabın 5. bölümünü oku'])
  bitti := Getir('bitti', [yanlış, doğru])
  kutu := GirişKutusu('Yeni iş')
  ekleDüğmesi := Düğme('Ekle')
  ekleDüğmesi.Tıklanınca(@YeniEkle)
  liste_ := Dikey()
  durum := Etiket()
  Yerleştir(Yatay(kutu, ekleDüğmesi), liste_, durum)
  Kur

  eğer değil Canlı ise
  başla
    Gir(kutu, 'ESP32 kartını bağla'); Tıkla(ekleDüğmesi)
    Tıkla(ekleDüğmesi)                         { boş iş eklenmez }
    Seç(liste_.Çocuklar[0], doğru)
    yaz(durum.Metin, 1)
    yaz('Saklanan: ' + Metin(Getir('bitti')), 1)
  bitir
  Çalıştır
bitir.
