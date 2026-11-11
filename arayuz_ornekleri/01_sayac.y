program Sayaç
{ İlk arayüz: bir etiket ve iki düğme. Düğmeye her tıklamada sayı değişir.
  Oyun alanında çalıştırınca uygulama "Uygulama" sekmesinde açılır; komut satırında
  ve testlerde tıklamalar Pencere.Tıkla ile benzetilir. }
kullan Pencere

değişken
  sayı: tamsayı
  gösterge: herhangi
  artırDüğmesi, azaltDüğmesi, sıfırlaDüğmesi: herhangi

prosedür Güncelle
başla
  gösterge.Metin := 'Sayı: ' + Metin(sayı)
  azaltDüğmesi.Etkin := sayı > 0
bitir

prosedür Artır
başla
  sayı := sayı + 1
  Güncelle
bitir

prosedür Azalt
başla
  sayı := sayı - 1
  Güncelle
bitir

prosedür Sıfırla
başla
  sayı := 0
  Güncelle
bitir

başla
  Başlık('Sayaç')
  gösterge := Etiket('Sayı: 0')
  artırDüğmesi := Düğme('Artır')
  azaltDüğmesi := Düğme('Azalt')
  sıfırlaDüğmesi := Düğme('Sıfırla')
  artırDüğmesi.Tıklanınca(@Artır)
  azaltDüğmesi.Tıklanınca(@Azalt)
  sıfırlaDüğmesi.Tıklanınca(@Sıfırla)
  Yerleştir(gösterge, Yatay(azaltDüğmesi, artırDüğmesi), sıfırlaDüğmesi)
  Güncelle

  eğer değil Canlı ise
  başla
    { Benzetim: üç kez artır, bir kez azalt }
    Tıkla(artırDüğmesi); Tıkla(artırDüğmesi); Tıkla(artırDüğmesi)
    Tıkla(azaltDüğmesi)
    yaz(gösterge.Metin, 1)
  bitir
  Çalıştır
bitir.
