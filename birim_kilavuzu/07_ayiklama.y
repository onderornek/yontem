program Ayıklama
{ Hata ayıklayıcıyı denemek için küçük bir program: notların ortalamasını bulur.
  Çalıştırmak için: yontem ayikla 07_ayiklama.y }

fonksiyon Ortalama(notlar: liste): ondalık
değişken
  toplam, n: tamsayı
başla
  toplam := 0
  notlar içindeki her n için
    toplam := toplam + n
  dön toplam / Uzunluk(notlar)
bitir

değişken
  notlar: liste
  ort: ondalık

başla
  notlar := [70, 85, 90]
  ort := Ortalama(notlar)
  yaz('Ortalama: ' + Yuvarla(ort, 1), 1)
bitir.
