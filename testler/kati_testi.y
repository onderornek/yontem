program KatıTesti
{$katı}
{ Katı kip: bu dosya derleme zamanında tip denetiminden geçer. Tipi belirtilmeyen değişkenin tipi ilk
  değerinden çıkarılır; tipi derleme anında bilinemeyen değerler (liste öğeleri) çalışırken denetlenir. }

tip
  Nokta = kayıt
    x, y: ondalık
  bitir

değişken
  notlar: tamsayı listesi
  adlar: metin dizisi
  yaşlar: tamsayı sözlüğü
  tablo: ondalık listesi listesi
  sayılar: liste
  toplam: tamsayı
  oran: ondalık
  ad := 'Yöntem'
  n: Nokta

fonksiyon Kare(a: tamsayı): tamsayı
başla
  dön a * a
bitir

fonksiyon Ortalama(l: liste): ondalık
değişken
  t: ondalık
  x: herhangi
başla
  t := 0
  l içindeki her x için t := t + x
  dön t / Uzunluk(l)
bitir

prosedür Selamla(kime: metin; kaç: tamsayı := 1)
başla
  kaç kez tekrarla yaz('Merhaba, ' + kime, 1)
bitir

başla
  sayılar := [3, 4, 5]
  toplam := 0
  sayılar içindeki her s için toplam := toplam + Kare(s)
  oran := toplam            { tamsayı, ondalığa genişler }
  n.x := 1.5; n.y := 2
  yaz(toplam, 1)
  yaz(oran / 2, 1)
  yaz(Ortalama(sayılar), 1)
  yaz(ad + ' ' + Uzunluk(ad), 1)
  Selamla(ad)
  değişken kısa := toplam < 100
  eğer kısa ise yaz('küçük', 1)
  dene
    toplam := sayılar[0] + 'x'     { tipi bilinmeyen öğe: çalışırken denetlenir }
  yakala (h)
    yaz('çalışma zamanı denetimi sürüyor', 1)
  bitir

  { Öğe tipi bildirilmiş listeler ve sözlükler: öğeler derleme zamanında denetlenir }
  notlar := [70, 85, 90]
  notlar.Ekle(100)
  notlar[0] := 75
  adlar := Ayır('Ali,Veli', ',')
  yaşlar['Ali'] := 30
  tablo := [[1, 2.5], [3]]
  toplam := notlar[0] + yaşlar['Ali'] + Uzunluk(adlar)
  oran := tablo[0][1]
  yaz(toplam, 1)
  yaz(adlar[1] + ' ' + oran, 1)
  { Yerleşik işlevlerin dönüş tipleri bilinir: tipi yazılmayan değişkenler onlardan çıkarılır }
  değişken u := Uzunluk('abc')
  değişken m := BüyükHarf(Kırp('  a ')) + KüçükHarf('B') + Değiştir('x', 'x', 'y') + Biçimle('{}', 1) + Birleştir(['a', 'b'], '-') + Metin(1) + Tür(1) + Karakter(65)
  değişken t := Tamsayı('3') + Sıra('a')
  değişken o := Ondalık('1.5') + Kök(4)
  değişken b := HarfMi('a') ve RakamMı('1') ve İçerir([1], 1) ve Mantıksal(1)
  değişken l := Anahtarlar(yaşlar) + Değerler(yaşlar) + Benzersiz([1, 1]) + Liste('ab')
  yaz(Metin(u) + ' ' + m + ' ' + t + ' ' + o + ' ' + Metin(b) + ' ' + Uzunluk(l), 1)
bitir.
