program DüğmeKesmesi
{ GPIO 4'e bağlı düğmeye her basıldığında (düşen kenar) bir kesme çalışır ve sayaç artar.
  Kesme prosedürleri kısa tutulmalıdır: burada yalnızca sayaç artırılır ve LED değiştirilir.
  Benzetimde düğme basışları program içinden pin değiştirilerek taklit edilir. }
kullan Donanım

sabit
  DÜĞME: tamsayı = 4
  LEDPİNİ: tamsayı = 2

değişken
  basış: tamsayı
  led: mantıksal
  i: tamsayı

prosedür DüğmeyeBasıldı
başla
  basış := basış + 1
  led := değil led
  PinYaz(LEDPİNİ, led)
bitir

başla
  PinKipi(LEDPİNİ, Çıkış)
  PinKipi(DÜĞME, GirişYukarı)
  KesmeBağla(DÜĞME, @DüğmeyeBasıldı, Düşen)
  yaz('Düğmeye basmayı bekliyorum...', 1)

  eğer Benzetim ise
    1'den 3'e kadar her i için
    başla
      Bekle(200); PinYaz(DÜĞME, Düşük)     { basıldı }
      Bekle(100); PinYaz(DÜĞME, Yüksek)    { bırakıldı }
    bitir
  değilse
    Bekle(10000)

  yaz('Toplam basış: ' + basış + ', LED ' + (eğer led ise 'yanık' değilse 'sönük'), 1)
bitir.
