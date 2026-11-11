program ÇizimTahtası
{ Tuval: dokunulan yere daire çizer, düğmeyle temizlenir. Aralıkla her saniye saati günceller. }
kullan Pencere

değişken
  tahta, temizleDüğmesi, bilgi, saat: herhangi
  sayaç, saniye: tamsayı

prosedür Dokunuldu(x, y: tamsayı)
başla
  sayaç := sayaç + 1
  tahta.Renk(eğer sayaç mod 2 = 0 ise '#0B7A75' değilse '#C2410C')
  tahta.Daire(x, y, 12, doğru)
  bilgi.Metin := Metin(sayaç) + ' nokta · son: (' + Metin(x) + ', ' + Metin(y) + ')'
bitir

prosedür TahtayıTemizle
başla
  tahta.Temizle
  Çerçeve
  sayaç := 0
  bilgi.Metin := 'Tuvale dokun'
bitir

prosedür Çerçeve
başla
  tahta.Renk('#94A3B8')
  tahta.Dikdörtgen(0, 0, 320, 200)
  tahta.Yazı(10, 20, 'Çizim tahtası')
bitir

prosedür Tik
başla
  saniye := saniye + 1
  saat.Metin := 'Açık: ' + Metin(saniye) + ' sn'
bitir

başla
  Başlık('Çizim Tahtası')
  tahta := Tuval(320, 200)
  temizleDüğmesi := Düğme('Temizle')
  bilgi := Etiket('Tuvale dokun')
  saat := Etiket('Açık: 0 sn')
  tahta.Dokununca(@Dokunuldu)
  temizleDüğmesi.Tıklanınca(@TahtayıTemizle)
  Yerleştir(tahta, Yatay(temizleDüğmesi, bilgi), saat)
  Çerçeve
  Aralıkla(1000, @Tik)

  eğer değil Canlı ise
  başla
    Dokun(tahta, 40, 60); Dokun(tahta, 160, 100); Dokun(tahta, 280, 150)
    yaz(bilgi.Metin + ' · çizim: ' + Metin(tahta.ÇizimSayısı), 1)
    İlerle(3500)
    yaz(saat.Metin, 1)
    Çalıştır
    Tıkla(temizleDüğmesi)
    yaz(bilgi.Metin + ' · çizim: ' + Metin(tahta.ÇizimSayısı), 1)
  bitir
  değilse Çalıştır
bitir.
