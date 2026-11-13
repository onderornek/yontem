program DilTesti
kullan İstatistik, YZ, Matematik

tip
  Hayvan = sınıf
    ad: metin
    kurucu Oluştur(a: metin); başla ad := a; bitir
    fonksiyon Ses: metin; başla dön '...'; bitir
    fonksiyon Tanıt: metin; başla dön ad + ': ' + Ses; bitir
  bitir
  Kedi = sınıf(Hayvan)
    fonksiyon Ses: metin; başla dön 'Miyav'; bitir
  bitir
  Vektör = sınıf
    x, y: ondalık
    kurucu Oluştur(a, b: ondalık); başla x := a; y := b; bitir
    fonksiyon Topla(o: Vektör): Vektör; başla dön Vektör.Oluştur(x + o.x, y + o.y); bitir
    fonksiyon Eşit(o: Vektör): mantıksal; başla dön (x = o.x) ve (y = o.y); bitir
  bitir
  Taban = sınıf
    günlük: liste
    kurucu Oluştur(n: tamsayı); başla günlük := ['taban' + n]; bitir
  bitir
  Türemiş = sınıf(Taban)
    kurucu Oluştur(n: tamsayı); başla miras; günlük.Ekle('türemiş'); bitir
  bitir
  Renk = kayıt r, g, b: tamsayı; bitir

değişken
  testSayısı: tamsayı = 0

prosedür Sına(koşul: mantıksal; ad: metin)
başla
  İddia(koşul, ad)
  Artır(testSayısı)
bitir

fonksiyon Fib(n: tamsayı): tamsayı
başla
  eğer n < 2 ise dön n
  dön Fib(n - 1) + Fib(n - 2)
bitir

fonksiyon Sayaç: herhangi          // kapanış (closure)
değişken
  n: tamsayı
başla
  n := 0
  dön fonksiyon başla n := n + 1; sonuç := n; bitir
bitir

değişken
  i, t: tamsayı
  s: metin
  L: liste
  d: sözlük
  arr: ondalık listesi
  k: Kedi
  v: Vektör
  rk, rk2: Renk
  f: herhangi
  hataOldu: mantıksal
  alt: tamsayı
  Mt: tensör

başla
  // aritmetik ve Pascal işleçleri
  Sına(7 böl 2 = 3, 'böl')
  Sına(-7 böl 2 = -3, 'böl negatif')
  Sına(7 mod 3 = 1, 'mod')
  Sına(7 / 2 = 3.5, '/ ondalık')
  Sına(2 ** 10 = 1024, 'üs')
  Sına(Tür(1.0) = 'ondalık', 'Tür')
  Sına((5 > 3) ve değil (2 > 3), 've/değil')
  Sına(doğru yada yanlış, 'yada')
  Sına($FF = 255, 'onaltılık')
  Sına((eğer 3 > 2 ise 'evet' değilse 'hayır') = 'evet', 'koşullu ifade')

  // döngüler
  t := 0
  10'dan 1'e adımda 3 azalan her i için t := t + i      // 10+7+4+1
  Sına(t = 22, 'adımda 3 azalan')
  t := 0
  0'dan 10'a adımda 5 artan her i için t := t + i       // 0+5+10
  Sına(t = 15, 'adımda 5 artan')
  t := 0
  3'ten 1'e kadar her i için t := t * 10 + i            // sabit sınırlar: yön sınırlardan anlaşılır
  Sına(t = 321, 'sabit sınırlarla azalan kadar')
  t := 0
  alt := 3
  alt'tan 1'e kadar her i için t := t + 1               // değişken sınır: 'kadar' yalnızca artar
  Sına(t = 0, 'değişken sınırla kadar boş kalır')
  alt'tan 1'e adımda 1 azalan her i için t := t + 1
  Sına(t = 3, 'değişken sınırla adımda 1 azalan')
  1'den 0'a adımda 1 artan her i için t := t + 100
  Sına(t = 3, 'artan döngü, başlangıç bitişten büyükse dönmez')
  t := 0
  1'den 100'e kadar her i için
  başla
    eğer i mod 2 = 0 ise devam
    eğer i > 9 ise kır
    t += i
  bitir
  Sına(t = 25, 'kır/devam')

  // metinler (1 tabanlı)
  s := 'Merhaba'
  Sına(s[1] = 'M', 'metin dizini')
  s[1] := 'm'
  Sına(s = 'merhaba', 'metin ataması')
  Sına(Konum('ha', s) = 4, 'Konum')
  Sına(AltMetin(s, 2, 3) = 'erh', 'AltMetin')
  Sına(BüyükHarf('istanbul ılık') = 'İSTANBUL ILIK', 'Türkçe büyük harf')
  Sına('a' + 1 = 'a1', 'metin birleştirme')
  Sına('ab'#33 = 'ab!', '# karakter kodu')
  Sına("satır\tsonu".Uzunluk = 10, 'çift tırnak kaçış')

  // listeler, sözlükler
  L := [3, 1, 2]
  L.Ekle(5)
  Sına(L.Uzunluk = 4, 'liste uzunluk')
  Sına(Sırala(L) = [1, 2, 3, 5], 'Sırala')
  Sına([1..4] = [1, 2, 3, 4], 'aralık listesi')
  Sına((L |> Eşle(fonksiyon(x) => x * 2) |> Toplam) = 22, 'boru işleci')
  Sına(3 içinde L, 'içinde')
  d := ['bir': 1, 'iki': 2]
  d['üç'] := 3
  Sına(Uzunluk(d) = 3, 'sözlük')
  t := 0
  d içindeki her s, i için t := t + i
  Sına(t = 6, 'her anahtar, değer')
  Sına(Say(['a', 'b', 'a'])['a'] = 2, 'Say')

  // Pascal dizisi
  arr.Uzunluk(5)
  0'dan 4'e kadar her i için arr[i] := i * 0.5
  Sına(arr[4] = 2.0, 'sabit boyutlu liste')
  arr.Uzunluk(3, 1)
  Sına(arr.Alt = 1 ve arr.Üst = 3 ve arr[3] = 1.0 ve Uzunluk(arr) = 3, 'Uzunluk(n, ilk)')

  // fonksiyonlar
  Sına(Fib(15) = 610, 'özyineleme')
  f := Sayaç
  Çağır(f);  Çağır(f)
  Sına(Çağır(f) = 3, 'kapanış')
  Sına(İndirge([1, 2, 3, 4], fonksiyon(a, b) => a * b) = 24, 'İndirge')

  // nesneler
  k := Kedi.Oluştur('Tekir')
  Sına(k.Tanıt = 'Tekir: Miyav', 'sanal metod')
  Sına(ÖrneğiMi(k, Hayvan), 'ÖrneğiMi')
  v := Vektör.Oluştur(1, 2).Topla(Vektör.Oluştur(3, 4))
  Sına((v.x = 4) ve (v.y = 6), 'metod zinciri')
  Sına(Vektör.Oluştur(1, 2) + Vektör.Oluştur(3, 4) = Vektör.Oluştur(4, 6), 'işleç aşırı yükleme')
  Sına(Vektör.Oluştur(1, 2) <> Vektör.Oluştur(4, 6), '<> aşırı yükleme')
  Sına(Türemiş.Oluştur(7).günlük = ['taban7', 'türemiş'], 'yalın miras')
  rk := Renk.Oluştur(1, 2, 3)
  Sına(rk.b = 3, 'kayıt alan sırasıyla oluşturma')
  Sına(RastgeleSeç([5, 5, 5]) = 5, 'RastgeleSeç')
  rk.r := 10
  rk2 := rk
  rk2.r := 99
  Sına(rk.r = 10, 'kayıt kopyalama')

  // hatalar
  hataOldu := yanlış
  dene
    i := 1 böl 0
  yakala (h)
    hataOldu := Konum('Sıfıra', h.mesaj) > 0
  bitir
  Sına(hataOldu, 'sıfıra bölme yakalama')
  hataOldu := yanlış
  dene
    i := 'metin'
  yakala
    hataOldu := doğru
  bitir
  Sına(hataOldu, 'tip denetimi')

  // birimler
  Sına(Ortalama([1, 2, 3, 4]) = 2.5, 'İstatistik.Ortalama')
  Sına(İstatistik.Medyan([5, 1, 3]) = 3, 'nitelikli birim erişimi')
  Sına(Mutlak(Sin(pi / 2) - 1) < 1e-9, 'Matematik')

  // YZ
  Mt := Tensör([[1, 2], [3, 4]])
  Sına((Mt @ Mt)[1, 1] = 22, 'matris çarpımı')
  Sına((Mt + Tensör([10, 20]))[1, 0] = 13, 'yayınlama')
  Sına(Mt.T[0, 1] = 3, 'devrik')
  Sına(Mutlak(Türev(fonksiyon(x) => x.Üs, 1.0) - e) < 1e-9, 'Türev(exp)')
  Sına(Mutlak(Türev(fonksiyon(x) => (x * x).Toplam, Tensör([1, 2, 3]))[2] - 6) < 1e-9, 'vektör gradyan')
  Sına(Softmaks(Tensör([1, 1])).Toplam.Değer = 1.0, 'softmaks')

  yaz('Tüm testler geçti: ' + testSayısı + ' test', 1)
bitir.
