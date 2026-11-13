program Nesneler
{ Sınıflar, kalıtım, sanal metodlar, miras, kayıtlar, diziler ve hata yönetimi }

tip
  Nokta = kayıt
    x, y: ondalık
  bitir

  Şekil = sınıf
  özel
    ad: metin
  genel
    kurucu Oluştur(a: metin)
    fonksiyon Alan: ondalık; sanal; soyut
    fonksiyon Tanım: metin
  bitir

  Daire = sınıf(Şekil)
    yarıçap: ondalık
    kurucu Oluştur(r: ondalık)
    fonksiyon Alan: ondalık; ezer
  bitir

  Dikdörtgen = sınıf(Şekil)
    en, boy: ondalık
    kurucu Oluştur(e, b: ondalık)
    fonksiyon Alan: ondalık; ezer
    fonksiyon Tanım: metin; ezer
  bitir

  // Gövdeyi sınıf içinde yazmak da serbest:
  KareŞekli = sınıf(Dikdörtgen)
    kurucu Oluştur(k: ondalık)
    başla
      miras Oluştur(k, k)
      ad := 'Kare'
    bitir
  bitir

  Sayac = sınıf
    deger: tamsayı = 0
    prosedür Artır; başla deger := deger + 1; bitir
    fonksiyon MetneÇevir: metin; başla dön 'Sayac<' + deger + '>'; bitir
  bitir

kurucu Şekil.Oluştur(a: metin)
başla
  ad := a
bitir

fonksiyon Şekil.Tanım: metin
başla
  sonuç := Biçimle('{} (alan: {:.2})', ad, Alan)
bitir

kurucu Daire.Oluştur(r: ondalık)
başla
  miras Oluştur('Daire')
  yarıçap := r
bitir

fonksiyon Daire.Alan: ondalık
başla
  sonuç := pi * yarıçap ** 2
bitir

kurucu Dikdörtgen.Oluştur(e, b: ondalık)
başla
  miras Oluştur('Dikdörtgen')
  en := e;  boy := b
bitir

fonksiyon Dikdörtgen.Alan: ondalık
başla
  dön en * boy
bitir

fonksiyon Dikdörtgen.Tanım: metin
başla
  sonuç := miras Tanım + Biçimle(' [{} x {}]', en, boy)
bitir

fonksiyon Uzaklık(a, b: Nokta): ondalık
başla
  dön Kök(Kare(a.x - b.x) + Kare(a.y - b.y))
bitir

değişken
  şekiller: liste
  ş: Şekil
  p, q: Nokta
  notlar: tamsayı listesi
  i: tamsayı
  syc: Sayac
  toplamAlan: ondalık

başla
  şekiller := [Daire.Oluştur(1.0), Dikdörtgen.Oluştur(2, 3), KareŞekli.Oluştur(4)]
  şekiller içindeki her ş için
    yaz(ş.Tanım, 1)

  toplamAlan := İndirge(Eşle(şekiller, fonksiyon(x) => x.Alan), fonksiyon(a, b) => a + b)
  yaz('Toplam alan: ' + Biçimle('{:0.3}', toplamAlan), 1)
  yaz('Kare bir Dikdörtgen mi? ' + ÖrneğiMi(şekiller[2], Dikdörtgen), 1)

  // Kayıtlar değer gibi kopyalanır
  p.x := 0; p.y := 0
  q := p
  q.x := 3; q.y := 4
  yaz('p = ' + p + '  q = ' + q + '  uzaklık = ' + Uzaklık(p, q), 1)

  // Pascal tarzı sınırlı dizi
  notlar.Uzunluk(5, 1)
  1'den 5'e kadar her i için notlar[i] := i * 10
  yaz('Notlar: ' + notlar + ' (' + notlar.Alt + '..' + notlar.Üst + ')', 1)

  syc := Sayac.Oluştur
  syc.Artır; syc.Artır; syc.Artır
  yaz(syc, 1)

  // Hata yönetimi
  dene
    yaz(notlar[9], 1)
  yakala (h)
    yaz('Yakalandı: ' + h.mesaj, 1)
  bitir

  dene
    ş := Şekil.Oluştur('soyut')
    yaz(ş.Alan, 1)
  yakala (h)
    yaz('Yakalandı: ' + h.mesaj, 1)
  sonunda
    yaz('sonunda bloğu her zaman çalışır', 1)
  bitir

  dene
    fırlat Hata('Kendi hatam', 'DoğrulamaHatası')
  yakala (h)
    yaz(h.tür + ' -> ' + h.mesaj, 1)
  bitir
bitir.
