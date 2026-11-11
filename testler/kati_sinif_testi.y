program KatıSınıfTesti
{$katı}
{ Katı kipte sınıf tipleri: atama uyumu (alt sınıf üst sınıf yerine geçer), alan ve metod erişimi,
  metod argümanları ve sınıf öğeli listeler derleme zamanında denetlenir. }

tip
  Nokta = kayıt
    x, y: ondalık
  bitir

  Şekil = sınıf
    ad: metin
    merkez: Nokta
    kurucu Oluştur(a: metin)
    fonksiyon Alan: ondalık; sanal
    fonksiyon Tanım(önek: metin): metin
    prosedür Taşı(dx, dy: ondalık)
  bitir

  Daire = sınıf(Şekil)
    yarıçap: ondalık
    kurucu Oluştur(r: ondalık)
    fonksiyon Alan: ondalık; ezer
  bitir

  Hesap = sınıf
    bakiye: tamsayı
  bitir

değişken
  n: Nokta
  ş: Şekil
  d: Daire
  h: Hesap
  şekiller: Şekil listesi
  sayı: tamsayı
  yazı: metin
  oran: ondalık

kurucu Şekil.Oluştur(a: metin)
başla
  ad := a
bitir

fonksiyon Şekil.Alan: ondalık
başla
  dön 0
bitir

fonksiyon Şekil.Tanım(önek: metin): metin
başla
  dön önek + ad + ' ' + Alan
bitir

prosedür Şekil.Taşı(dx, dy: ondalık)
başla
  merkez.x := merkez.x + dx
  merkez.y := merkez.y + dy
bitir

kurucu Daire.Oluştur(r: ondalık)
başla
  miras Oluştur('daire')
  yarıçap := r
bitir

fonksiyon Daire.Alan: ondalık
başla
  dön 3.14159 * yarıçap * yarıçap
bitir

fonksiyon Büyüt(s: Şekil; kat: ondalık): Şekil
başla
  dön s
bitir

başla
  d := Daire.Oluştur(2)
  ş := d
  ş := Şekil.Oluştur('genel')
  d := Daire.Oluştur(1.5)
  n.x := 3
  oran := n.x + d.yarıçap + d.Alan + ş.Alan
  yazı := d.Tanım('> ') + ş.ad
  d.Taşı(1, 2.5)
  oran := d.merkez.x
  şekiller := [ş, d]
  şekiller.Ekle(Daire.Oluştur(3))
  şekiller içindeki her ş için oran := oran + ş.Alan
  ş := Büyüt(d, 2)
  oran := Büyüt(d, 2).Alan
  yaz(Yuvarla(oran, 2), 1)
  yaz(yazı, 1)
bitir.
