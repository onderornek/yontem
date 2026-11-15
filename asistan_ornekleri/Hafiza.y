birim Hafıza
{ Belgeleri anlamlarına göre aramak için küçük bir vektör deposu.
  Metin parçalara ayrılır, her parçanın gömme vektörü Model.Göm ile alınır ve bir SQLite tablosunda saklanır.
  Arama, sorunun vektörüne en yakın parçaları kosinüs benzerliğiyle bulur.
  Bütün parçalar tek tek karşılaştırılır; birkaç bin parçaya kadar uygundur. }
kullan Model, Veritabanı, Veri

arayüz
  prosedür HafızaAç(adres: metin)
  prosedür HafızaKapat
  fonksiyon Parçala(içerik: metin; enÇok: tamsayı = 300): liste
  fonksiyon HafızayaEkle(kaynak, içerik: metin): tamsayı
  fonksiyon HafızadaAra(soru: metin; adet: tamsayı = 3): liste
  fonksiyon HafızaSayısı: tamsayı

uygulama

değişken
  vt: herhangi

prosedür HafızaAç(adres: metin)
başla
  vt := Bağlan(adres)
  vt.Çalıştır('CREATE TABLE IF NOT EXISTS parca (no INTEGER PRIMARY KEY, kaynak TEXT NOT NULL, metin TEXT NOT NULL, vektor TEXT NOT NULL)')
bitir

prosedür HafızaKapat
başla
  vt.Kapat
bitir

fonksiyon HafızaSayısı: tamsayı
başla
  dön vt.TekDeğer('SELECT COUNT(*) FROM parca')
bitir

{ Metni boş satırlardan paragraflara ayırır; kısa paragrafları 'enÇok' karakteri geçmeyecek biçimde birleştirir. }
fonksiyon Parçala(içerik: metin; enÇok: tamsayı = 300): liste
değişken
  parçalar: liste
  paragraf, biriken: metin
başla
  parçalar := []
  biriken := ''
  Ayır(Değiştir(içerik, #13, ''), #10 + #10) içindeki her paragraf için
  başla
    paragraf := Kırp(paragraf)
    eğer paragraf = '' ise devam
    eğer biriken = '' ise biriken := paragraf
    değilse eğer Uzunluk(biriken) + Uzunluk(paragraf) + 2 <= enÇok ise biriken := biriken + #10 + #10 + paragraf
    değilse
    başla
      Ekle(parçalar, biriken)
      biriken := paragraf
    bitir
  bitir
  eğer biriken <> '' ise Ekle(parçalar, biriken)
  dön parçalar
bitir

{ Vektörü uzunluğu 1 olacak biçimde ölçekler; böylece benzerlik yalnızca bir iç çarpım olur. }
fonksiyon Birimle(v: liste): liste
değişken
  x: ondalık
  boy: ondalık
  yeni: liste
başla
  boy := 0
  v içindeki her x için boy := boy + x * x
  boy := Kök(boy)
  eğer boy = 0 ise dön v
  yeni := []
  v içindeki her x için Ekle(yeni, x / boy)
  dön yeni
bitir

{ Kaynağı parçalayıp saklar; aynı kaynak daha önce eklendiyse eskisinin yerini alır. Parça sayısını döndürür. }
fonksiyon HafızayaEkle(kaynak, içerik: metin): tamsayı
değişken
  parçalar, vektörler: liste
  i: tamsayı
başla
  parçalar := Parçala(içerik)
  eğer Uzunluk(parçalar) = 0 ise dön 0
  vektörler := Göm(parçalar)
  vt.İşlemBaşlat
  vt.Çalıştır('DELETE FROM parca WHERE kaynak = ?', [kaynak])
  i := 0
  i < Uzunluk(parçalar) iken
  başla
    vt.Çalıştır('INSERT INTO parca (kaynak, metin, vektor) VALUES (?, ?, ?)', [kaynak, parçalar[i], JSONYap(Birimle(vektörler[i]))])
    i := i + 1
  bitir
  vt.Onayla
  dön Uzunluk(parçalar)
bitir

{ Soruya en yakın 'adet' parçayı, en benzerden başlayarak döndürür:
  her biri ['kaynak', 'metin', 'benzerlik'] alanlı bir sözlüktür. }
fonksiyon HafızadaAra(soru: metin; adet: tamsayı = 3): liste
değişken
  s, v, adaylar, seçilen: liste
  satır, aday, enİyi: herhangi
  toplam: ondalık
  i: tamsayı
başla
  s := Birimle(Göm([soru])[0])
  adaylar := []
  vt.Sorgula('SELECT kaynak, metin, vektor FROM parca ORDER BY no') içindeki her satır için
  başla
    v := JSONÇöz(satır['vektor'])
    toplam := 0
    i := 0
    i < Uzunluk(v) iken
    başla
      toplam := toplam + s[i] * v[i]
      i := i + 1
    bitir
    Ekle(adaylar, ['kaynak': satır['kaynak'], 'metin': satır['metin'], 'benzerlik': toplam])
  bitir
  seçilen := []
  (Uzunluk(seçilen) < adet) ve (Uzunluk(adaylar) > 0) iken
  başla
    enİyi := adaylar[0]
    adaylar içindeki her aday için
      eğer aday['benzerlik'] > enİyi['benzerlik'] ise enİyi := aday
    Ekle(seçilen, enİyi)
    Sil(adaylar, adaylar.Bul(enİyi))
  bitir
  dön seçilen
bitir

bitir.
