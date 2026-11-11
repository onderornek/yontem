program AdımSayar
{ Telefonun hareket algılayıcısıyla adım sayar. Güçlü bir sarsıntı bir adım sayılır; hedefe
  ulaşınca telefon titrer ve bildirim gösterir. Toplam adım telefonda saklanır, uygulama
  kapanıp açılınca kaldığı yerden devam eder. Konum düğmesi bulunduğun yeri gösterir. }
kullan Pencere, Mobil

sabit
  EŞİK: ondalık = 12.0
  HEDEF: tamsayı = 5

değişken
  adım, toplam: tamsayı
  gösterge, toplamEtiketi, konumEtiketi: herhangi
  konumDüğmesi, paylaşDüğmesi, sıfırlaDüğmesi: herhangi

prosedür Göster
başla
  gösterge.Metin := Metin(adım) + ' / ' + Metin(HEDEF) + ' adım'
  toplamEtiketi.Metin := 'Toplam: ' + Metin(toplam) + ' adım'
bitir

prosedür Hareket(x, y, z: ondalık)
başla
  eğer Kök(x * x + y * y + z * z) > EŞİK ise
  başla
    adım := adım + 1
    toplam := toplam + 1
    Sakla('toplam', toplam)
    Göster
    eğer adım = HEDEF ise
    başla
      Titreşim(400)
      Bildirim('Hedefe ulaştın', Metin(HEDEF) + ' adım tamam')
    bitir
  bitir
bitir

prosedür KonumGeldi(enlem, boylam: ondalık)
başla
  konumEtiketi.Metin := 'Konum: ' + Biçimle('{:.4}', enlem) + ', ' + Biçimle('{:.4}', boylam)
bitir

prosedür KonumBul
başla
  konumEtiketi.Metin := 'Konum aranıyor…'
  KonumAl(@KonumGeldi)
bitir

prosedür Paylaşım
başla
  Paylaş('Bugün ' + Metin(adım) + ' adım attım — Yöntem ile yazdığım adım sayarla!')
bitir

prosedür Sıfırla
başla
  adım := 0
  Göster
bitir

başla
  Başlık('Adım Sayar')
  toplam := Getir('toplam', 0)
  gösterge := Etiket()
  toplamEtiketi := Etiket()
  konumEtiketi := Etiket('Konum: bilinmiyor')
  konumDüğmesi := Düğme('Konumum')
  paylaşDüğmesi := Düğme('Paylaş')
  sıfırlaDüğmesi := Düğme('Sıfırla')
  konumDüğmesi.Tıklanınca(@KonumBul)
  paylaşDüğmesi.Tıklanınca(@Paylaşım)
  sıfırlaDüğmesi.Tıklanınca(@Sıfırla)
  Yerleştir(gösterge, toplamEtiketi, Yatay(konumDüğmesi, paylaşDüğmesi, sıfırlaDüğmesi), konumEtiketi)
  HareketOlunca(@Hareket)
  Göster

  eğer değil Canlı ise
  başla
    yaz('Platform: ' + Platform + ', ekran ' + Metin(EkranGenişliği) + 'x' + Metin(EkranYüksekliği), 1)
    BenzetimHareket(0.2, 9.8, 0.1)          { telefon masada: adım sayılmaz }
    Salla; Salla; Salla; Salla; Salla
    BenzetimHareket(3.0, 14.0, 2.0)
    yaz(gösterge.Metin + ' · ' + toplamEtiketi.Metin, 1)
    BenzetimKonum(39.9334, 32.8597)
    Tıkla(konumDüğmesi)
    yaz(konumEtiketi.Metin, 1)
    Tıkla(paylaşDüğmesi)
    yaz('Saklanan toplam: ' + Metin(Getir('toplam')), 1)
  bitir
  Çalıştır
bitir.
