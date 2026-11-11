birim KuantumAlgoritmaları
{ Kuantum birimi üzerine Yöntem dilinde yazılmış temel kuantum algoritmaları:
  Bell ve GHZ durumları, kuantum Fourier dönüşümü, Grover araması,
  Deutsch–Jozsa, Bernstein–Vazirani ve kuantum ışınlama. }
kullan Kuantum, Matematik

arayüz
  fonksiyon BellÇifti: herhangi
  fonksiyon GHZ(n: tamsayı): herhangi
  prosedür QFT(d: herhangi; kübitler: liste)
  prosedür TersQFT(d: herhangi; kübitler: liste)
  prosedür Kehanet(d: herhangi; hedef: metin)
  prosedür Yayılım(d: herhangi)
  fonksiyon Grover(hedef: metin; tekrar: tamsayı = 0): herhangi
  fonksiyon DeutschJozsa(n: tamsayı; kehanet: herhangi): metin
  fonksiyon BernsteinVazirani(gizli: metin): metin
  fonksiyon Işınla(teta, fi: ondalık): herhangi

uygulama

fonksiyon BellÇifti: herhangi
başla
  sonuç := Devre(2)
  sonuç.H(0)
  sonuç.CX(0, 1)
bitir

fonksiyon GHZ(n: tamsayı): herhangi
değişken
  i: tamsayı
başla
  sonuç := Devre(n)
  sonuç.H(0)
  1'den (n - 1)'e kadar her i için
    sonuç.CX(0, i)
bitir

{ Kuantum Fourier dönüşümü (sonda kübit sırası ters çevrilir). }
prosedür QFT(d: herhangi; kübitler: liste)
değişken
  i, j, n: tamsayı
başla
  n := Uzunluk(kübitler)
  0'dan (n - 1)'e kadar her i için
  başla
    d.H(kübitler[i])
    (i + 1)'den (n - 1)'e kadar her j için
      d.KFaz(kübitler[j], kübitler[i], pi / (2 ** (j - i)))
  bitir
  0'dan (n böl 2 - 1)'e kadar her i için
    d.Takas(kübitler[i], kübitler[n - 1 - i])
bitir

prosedür TersQFT(d: herhangi; kübitler: liste)
değişken
  i, j, n: tamsayı
başla
  n := Uzunluk(kübitler)
  0'dan (n böl 2 - 1)'e kadar her i için
    d.Takas(kübitler[i], kübitler[n - 1 - i])
  (n - 1)'den 0'a azalarak her i için
  başla
    (n - 1)'den (i + 1)'e azalarak her j için
      d.KFaz(kübitler[j], kübitler[i], -pi / (2 ** (j - i)))
    d.H(kübitler[i])
  bitir
bitir

{ Hedef bit dizisinin genliğinin işaretini çevirir: |hedef⟩ -> -|hedef⟩ }
prosedür Kehanet(d: herhangi; hedef: metin)
değişken
  q, n: tamsayı
başla
  n := d.KübitSayısı
  0'dan (n - 1)'e kadar her q için
    eğer hedef[q + 1] = '0' ise d.X(q)
  d.ÇokKontrollüZ(Aralık(n - 1), n - 1)
  0'dan (n - 1)'e kadar her q için
    eğer hedef[q + 1] = '0' ise d.X(q)
bitir

{ Grover yayılım işleci: ortalama etrafında yansıtma }
prosedür Yayılım(d: herhangi)
değişken
  q, n: tamsayı
başla
  n := d.KübitSayısı
  0'dan (n - 1)'e kadar her q için başla d.H(q); d.X(q); bitir
  d.ÇokKontrollüZ(Aralık(n - 1), n - 1)
  0'dan (n - 1)'e kadar her q için başla d.X(q); d.H(q); bitir
bitir

fonksiyon Grover(hedef: metin; tekrar: tamsayı = 0): herhangi
değişken
  n, q, i: tamsayı
  d: herhangi
başla
  n := Uzunluk(hedef)
  eğer tekrar = 0 ise
    tekrar := Maks(1, Taban(pi / 4 * Kök(2 ** n)))
  d := Devre(n)
  0'dan (n - 1)'e kadar her q için d.H(q)
  1'den tekrar'a kadar her i için
  başla
    Kehanet(d, hedef)
    Yayılım(d)
  bitir
  dön d
bitir

{ kehanet: (devre, n) alan ve f(x)'i n numaralı yardımcı kübite XOR'layan prosedür. }
fonksiyon DeutschJozsa(n: tamsayı; kehanet: herhangi): metin
değişken
  d: herhangi
  q: tamsayı
başla
  d := Devre(n + 1)
  d.X(n)
  0'dan n'ye kadar her q için d.H(q)
  Çağır(kehanet, d, n)
  0'dan (n - 1)'e kadar her q için d.H(q)
  eğer d.Olasılık(Birleştir(Eşle(Aralık(n), fonksiyon(i) => '0')) + '0') +
       d.Olasılık(Birleştir(Eşle(Aralık(n), fonksiyon(i) => '0')) + '1') > 0.999 ise
    dön 'sabit'
  değilse
    dön 'dengeli'
bitir

{ Tek sorguda gizli bit dizisi s'yi bulur: f(x) = s·x (mod 2) }
fonksiyon BernsteinVazirani(gizli: metin): metin
değişken
  d: herhangi
  n, q: tamsayı
başla
  n := Uzunluk(gizli)
  d := Devre(n + 1)
  d.X(n)
  0'dan n'ye kadar her q için d.H(q)
  0'dan (n - 1)'e kadar her q için
    eğer gizli[q + 1] = '1' ise d.CX(q, n)
  0'dan (n - 1)'e kadar her q için d.H(q)
  sonuç := ''
  0'dan (n - 1)'e kadar her q için
    sonuç := sonuç + d.Ölç(q)
bitir

{ q0'daki Ry(teta)·Rz(fi) durumunu, ölçüm ve klasik denetimle q2'ye ışınlar. }
fonksiyon Işınla(teta, fi: ondalık): herhangi
değişken
  d: herhangi
  m0, m1: tamsayı
başla
  d := Devre(3)
  d.Ry(0, teta);  d.Rz(0, fi)         // ışınlanacak durum
  d.H(1);  d.CX(1, 2)                 // dolanık çift (q1: Ayşe, q2: Bora)
  d.Bariyer
  d.CX(0, 1);  d.H(0)                 // Bell tabanında ölçüm hazırlığı
  m0 := d.Ölç(0)
  m1 := d.Ölç(1)
  eğer m1 = 1 ise d.X(2)              // klasik denetimli düzeltmeler
  eğer m0 = 1 ise d.Z(2)
  dön d
bitir

bitir.
