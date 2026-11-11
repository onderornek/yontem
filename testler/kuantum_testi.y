program KuantumTesti
kullan Kuantum, KuantumAlgoritmaları, Matematik

değişken
  testSayısı: tamsayı = 0
  d, d2: herhangi
  b: liste
  i: tamsayı
  m: tamsayı
  hataOldu: mantıksal

prosedür Sına(koşul: mantıksal; ad: metin)
başla
  İddia(koşul, ad)
  Artır(testSayısı)
bitir

fonksiyon Yakın(a, b: ondalık): mantıksal
başla
  dön Mutlak(a - b) < 1e-9
bitir

başla
  KuantumTohum(7)

  // tek kübit kapıları
  d := Devre(1);  d.X(0)
  Sına(d.Olasılık('1') = 1, 'X kapısı')
  d := Devre(1);  d.H(0)
  Sına(Yakın(d.Olasılık('0'), 0.5), 'H kapısı')
  d.H(0)
  Sına(Yakın(d.Olasılık('0'), 1), 'H·H = I')
  d := Devre(1);  d.Ry(0, pi)
  Sına(Yakın(d.Olasılık('1'), 1), 'Ry(π)')
  d := Devre(1);  d.H(0);  d.Z(0);  d.H(0)
  Sına(Yakın(d.Olasılık('1'), 1), 'HZH = X')
  d := Devre(1);  d.H(0);  d.T(0);  d.T(0);  d2 := Devre(1);  d2.H(0);  d2.S(0)
  Sına(Yakın(Sadakat(d, d2), 1), 'T·T = S')
  d := Devre(1);  d.KX(0);  d.KX(0)
  Sına(Yakın(d.Olasılık('1'), 1), '√X·√X = X')

  // bit sırası: q0 en solda
  d := Devre(3);  d.X(0)
  Sına(d.Olasılık('100') = 1, 'bit sırası q0 solda')

  // çok kübitli kapılar
  d := Devre(2);  d.X(0);  d.CX(0, 1)
  Sına(d.Olasılık('11') = 1, 'CX')
  d := Devre(3);  d.X(0);  d.X(1);  d.CCX(0, 1, 2)
  Sına(d.Olasılık('111') = 1, 'Toffoli')
  d := Devre(2);  d.X(0);  d.Takas(0, 1)
  Sına(d.Olasılık('01') = 1, 'Takas')
  d := Devre(4);  d.X(0);  d.X(1);  d.X(2);  d.ÇokKontrollüX([0, 1, 2], 3)
  Sına(d.Olasılık('1111') = 1, 'çok kontrollü X')

  // beklenen değerler ve Bloch
  d := BellÇifti
  Sına(Yakın(d.BeklenenDeğer('ZZ'), 1) ve Yakın(d.BeklenenDeğer('YY'), -1), 'Bell gözlemleri')
  d := Devre(1);  d.H(0)
  b := d.BlochVektörü(0)
  Sına(Yakın(b[0], 1) ve Yakın(b[2], 0), 'Bloch |+⟩')

  // ölçüm çöküşü
  d := BellÇifti
  m := d.Ölç(0)
  Sına(d.Ölç(1) = m, 'dolanık ölçüm ilişkisi')
  Sına(d.Klasik = [m, m], 'klasik bitler')

  // istatistik
  d := Devre(1);  d.H(0)
  Sına(Toplam(Değerler(d.Çalıştır(200))) = 200, 'Çalıştır atış sayısı')

  // algoritmalar
  d := Devre(3);  d.X(1)
  QFT(d, [0, 1, 2]);  TersQFT(d, [0, 1, 2])
  Sına(Yakın(d.Olasılık('010'), 1), 'QFT ve tersi')
  Sına(Grover('110').Olasılık('110') > 0.9, 'Grover')
  Sına(BernsteinVazirani('1011') = '1011', 'Bernstein–Vazirani')
  1'den 5'e kadar her i için
  başla
    d := Işınla(0.3 * i, 0.5 * i)
    b := d.BlochVektörü(2)
    Sına(Mutlak(b[2] - Cos(0.3 * i)) < 1e-9, 'ışınlama ' + i)
  bitir

  // parametre kaydırma = analitik türev: d/dθ ⟨Z⟩ (Ry(θ)) = -sin θ
  Sına(Yakın(ParametreKaydırma(fonksiyon(p: liste): ondalık
                                değişken dd: herhangi
                                başla
                                  dd := Devre(1);  dd.Ry(0, p[0])
                                  dön dd.BeklenenDeğer('Z')
                                bitir, [0.8])[0], -Sin(0.8)), 'parametre kaydırma')

  // hatalar
  hataOldu := yanlış
  dene d := Devre(2);  d.CX(0, 0);  yakala hataOldu := doğru;  bitir
  Sına(hataOldu, 'aynı kübite iki kez erişim hatası')
  hataOldu := yanlış
  dene d := Devre(2);  d.H(5);  yakala hataOldu := doğru;  bitir
  Sına(hataOldu, 'kübit sınırı hatası')

  yaz('Tüm kuantum testleri geçti: ' + testSayısı + ' test', 1)
bitir.
