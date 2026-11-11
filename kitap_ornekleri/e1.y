program KayıtÖrneği
tip
  Nokta = kayıt
    x, y: ondalık
  bitir

fonksiyon Uzaklık(a, b: Nokta): ondalık
başla
  dön Kök((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
bitir

değişken
  p, q: Nokta
başla
  p.x := 1;  p.y := 2
  q := Nokta.Oluştur(4, 6)      // alanları sırayla doldurur
  yaz('p = ' + p + ', q = ' + q, 1)
  yaz('Uzaklık: ' + Uzaklık(p, q), 1)
  q := p                        // kayıtlar KOPYALANIR
  q.x := 99
  yaz('p.x hâlâ ' + p.x, 1)
bitir.
