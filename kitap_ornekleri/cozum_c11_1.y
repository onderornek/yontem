program Şekiller
tip
  Dikdörtgen = sınıf
    en, boy: ondalık
    kurucu Oluştur(e, b: ondalık)
    başla en := e;  boy := b; bitir
    fonksiyon Alan: ondalık;  başla dön en * boy; bitir
    fonksiyon Çevre: ondalık; başla dön 2 * (en + boy); bitir
  bitir

  Kare = sınıf(Dikdörtgen)
    kurucu Oluştur(kenar: ondalık)
    başla miras Oluştur(kenar, kenar); bitir
  bitir

değişken
  k: Kare
başla
  k := Kare.Oluştur(4)
  yaz('Alan = ' + k.Alan + ', çevre = ' + k.Çevre, 1)
bitir.
