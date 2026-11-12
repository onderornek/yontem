birim Arama
{ Klasik yapay zekâ arama algoritmaları: genişlik öncelikli, derinlik öncelikli,
  tek tip maliyet (Dijkstra) ve A* (A yıldız) arama. }

arayüz
  fonksiyon GenişlikÖncelikli(çizge: sözlük; başlangıç, hedef: herhangi): liste
  fonksiyon DerinlikÖncelikli(çizge: sözlük; başlangıç, hedef: herhangi): liste
  fonksiyon EnKısaYol(çizge: sözlük; başlangıç, hedef: herhangi): liste
  fonksiyon AYıldız(ızgara: liste; başlangıç, hedef: liste): liste
  fonksiyon IzgaraÇiz(ızgara: liste; yol: liste): metin

uygulama

fonksiyon YoluKur(önceki: sözlük; hedef: herhangi): liste
değişken
  yol: liste
  d: herhangi
başla
  yol := []
  d := hedef
  d <> boş iken
  başla
    Ekle(yol, d, 0)
    d := önceki[d]
  bitir
  dön yol
bitir

fonksiyon GenişlikÖncelikli(çizge: sözlük; başlangıç, hedef: herhangi): liste
değişken
  kuyruk: liste
  önceki: sözlük
  düğüm, komşu: herhangi
başla
  kuyruk := [başlangıç]
  önceki := [başlangıç: boş]
  Uzunluk(kuyruk) > 0 iken
  başla
    düğüm := kuyruk.Çıkar(0)
    eğer düğüm = hedef ise dön YoluKur(önceki, hedef)
    çizge.Al(düğüm, []) içindeki her komşu için
      eğer değil (komşu içinde önceki) ise
      başla
        önceki[komşu] := düğüm
        kuyruk.Ekle(komşu)
      bitir
  bitir
  dön []
bitir

fonksiyon DerinlikÖncelikli(çizge: sözlük; başlangıç, hedef: herhangi): liste
değişken
  yığın: liste
  önceki: sözlük
  düğüm, komşu: herhangi
başla
  yığın := [başlangıç]
  önceki := [başlangıç: boş]
  Uzunluk(yığın) > 0 iken
  başla
    düğüm := yığın.Çıkar
    eğer düğüm = hedef ise dön YoluKur(önceki, hedef)
    Ters(çizge.Al(düğüm, [])) içindeki her komşu için
      eğer değil (komşu içinde önceki) ise
      başla
        önceki[komşu] := düğüm
        yığın.Ekle(komşu)
      bitir
  bitir
  dön []
bitir

{ Ağırlıklı çizge: ['A': ['B': 4, 'C': 2], ...] }
fonksiyon EnKısaYol(çizge: sözlük; başlangıç, hedef: herhangi): liste
değişken
  uzaklık: sözlük
  önceki: sözlük
  ziyaret: sözlük
  açık: liste
  düğüm, komşu, d: herhangi
  yeni: ondalık
  i, enİyi: tamsayı
başla
  uzaklık := [başlangıç: 0]
  önceki := [başlangıç: boş]
  ziyaret := [:]
  açık := [başlangıç]
  Uzunluk(açık) > 0 iken
  başla
    // en küçük uzaklıklı düğümü seç
    enİyi := 0
    1'den (Uzunluk(açık) - 1)'e kadar her i için
      eğer uzaklık[açık[i]] < uzaklık[açık[enİyi]] ise enİyi := i
    düğüm := açık.Çıkar(enİyi)
    eğer düğüm = hedef ise dön [YoluKur(önceki, hedef), uzaklık[hedef]]
    ziyaret[düğüm] := doğru
    d := çizge.Al(düğüm, [:])
    d içindeki her komşu için
    başla
      eğer komşu içinde ziyaret ise devam
      yeni := uzaklık[düğüm] + d[komşu]
      eğer değil (komşu içinde uzaklık) veya (yeni < uzaklık[komşu]) ise
      başla
        eğer değil (komşu içinde uzaklık) ise açık.Ekle(komşu)
        uzaklık[komşu] := yeni
        önceki[komşu] := düğüm
      bitir
    bitir
  bitir
  dön [[], -1]
bitir

fonksiyon HücreAnahtarı(r, c: tamsayı): metin
başla
  dön metin(r) + ',' + metin(c)
bitir

fonksiyon Geçilebilir(ızgara: liste; r, c: tamsayı): mantıksal
başla
  eğer (r < 0) veya (c < 0) veya (r >= Uzunluk(ızgara)) ise dön yanlış
  eğer c >= Uzunluk(ızgara[r]) ise dön yanlış
  dön ızgara[r][c + 1] <> '#'     // metin dizinleri 1'den başlar
bitir

{ Izgara: metin listesi, '#' duvar. Başlangıç/hedef: [satır, sütun] }
fonksiyon AYıldız(ızgara: liste; başlangıç, hedef: liste): liste
değişken
  açık: liste           // elemanlar: [f, g, satır, sütun]
  gMaliyet, önceki: sözlük
  mevcut, yön: liste
  r, c, nr, nc, i, enİyi: tamsayı
  yeniG: tamsayı
  anahtar, nAnahtar: metin
  yol: liste
  k: herhangi
başla
  açık := [[0, 0, başlangıç[0], başlangıç[1]]]
  gMaliyet := [HücreAnahtarı(başlangıç[0], başlangıç[1]): 0]
  önceki := [HücreAnahtarı(başlangıç[0], başlangıç[1]): boş]
  Uzunluk(açık) > 0 iken
  başla
    enİyi := 0
    1'den (Uzunluk(açık) - 1)'e kadar her i için
      eğer açık[i][0] < açık[enİyi][0] ise enİyi := i
    mevcut := açık.Çıkar(enİyi)
    r := mevcut[2];  c := mevcut[3]
    anahtar := HücreAnahtarı(r, c)
    eğer (r = hedef[0]) ve (c = hedef[1]) ise
    başla
      yol := []
      k := anahtar
      k <> boş iken
      başla
        Ekle(yol, Eşle(Ayır(k, ','), fonksiyon(s) => tamsayı(s)), 0)
        k := önceki[k]
      bitir
      dön yol
    bitir
    eğer mevcut[1] > gMaliyet[anahtar] ise devam   // eski kayıt
    [[1, 0], [-1, 0], [0, 1], [0, -1]] içindeki her yön için
    başla
      nr := r + yön[0];  nc := c + yön[1]
      eğer değil Geçilebilir(ızgara, nr, nc) ise devam
      nAnahtar := HücreAnahtarı(nr, nc)
      yeniG := gMaliyet[anahtar] + 1
      eğer değil (nAnahtar içinde gMaliyet) veya (yeniG < gMaliyet[nAnahtar]) ise
      başla
        gMaliyet[nAnahtar] := yeniG
        önceki[nAnahtar] := anahtar
        // sezgisel: Manhattan uzaklığı
        açık.Ekle([yeniG + Mutlak(nr - hedef[0]) + Mutlak(nc - hedef[1]), yeniG, nr, nc])
      bitir
    bitir
  bitir
  dön []
bitir

fonksiyon IzgaraÇiz(ızgara: liste; yol: liste): metin
değişken
  satırlar: liste
  satır: metin
  p: liste
  r: tamsayı
başla
  satırlar := Kopya(ızgara)
  yol içindeki her p için
  başla
    satır := satırlar[p[0]]
    satır[p[1] + 1] := '*'
    satırlar[p[0]] := satır
  bitir
  dön Birleştir(satırlar, #10)
bitir

bitir.
