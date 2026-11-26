program ÜretTesti
{ 'üret' ile akış döndüren fonksiyonlar. Akış tembeldir: gövde, akış yinelenince çalışır ve her
  'üret'te durur. Akışlar ağ olmadan da kullanılır; HttpAkış ile birlikte kullanımı: ag_testleri/ }

değişken
  a, b: akış
  x, i, h: herhangi
  birikim: tamsayı
  üret: tamsayı        { 'üret' fonksiyon gövdesi dışında sıradan bir addır }

fonksiyon Kareler(n: tamsayı): akış
başla
  yaz('  (Kareler başladı)', 1)
  1'den n'e kadar her i için
    üret i * i
  yaz('  (Kareler bitti)', 1)
bitir

{ 'dön' akışı bitirir }
fonksiyon İlkleri(kaynak: akış; n: tamsayı): akış
başla
  değişken adet := 0
  kaynak içindeki her x için
  başla
    eğer adet = n ise dön
    adet := adet + 1
    üret x
  bitir
bitir

fonksiyon Temizlikli(): akış
başla
  dene
    üret 'bir'
    üret 'iki'
    üret 'üç'
  sonunda
    yaz('  (temizlendi)', 1)
  bitir
bitir

fonksiyon Hatalı(): akış
başla
  üret 1
  üret 1 bol 0
  üret 2
bitir

fonksiyon SonundaHatalı(): akış
başla
  dene
    üret 'a'
    üret 'b'
  sonunda
    firlat 'sonunda bozuldu'
  bitir
bitir

{ özyineleme: ağacın yapraklarını sırayla üretir }
fonksiyon Yapraklar(ağaç: herhangi): akış
başla
  eğer Tür(ağaç) = 'liste' ise
    ağaç içindeki her dal için
      Yapraklar(dal) içindeki her y için üret y
  değilse
    üret ağaç
bitir

{ sonsuz akış: tüketen bıraktığında kapatılır }
fonksiyon Doğallar(): akış
başla
  değişken n := 0
  doğru iken
  başla
    n := n + 1
    üret n
  bitir
bitir

fonksiyon Kendini(): akış
başla
  b içindeki her x için üret x
bitir

{ metodlar da üretebilir }
tip
  Sayaç = sınıf
    üst: tamsayı
    kurucu Oluştur(n: tamsayı)
    fonksiyon Geri(): akış
  bitir

kurucu Sayaç.Oluştur(n: tamsayı)
başla
  üst := n
bitir

fonksiyon Sayaç.Geri(): akış
başla
  üst'den 1'e adımda 1 azalan her i için üret Metin(i) + '!'
bitir

{ 'üret' her denetim yapısının içinde kullanılabilir }
fonksiyon Yapılar(): akış
başla
  değişken n := 0
  tekrarla
    n := n + 1
    eğer n mod 2 = 0 ise üret 't' + Metin(n) değilse devam
  n >= 4 olana dek
  2 kez tekrarla üret 'k'
  n değerine göre
    1..3: üret 'küçük'
    4: başla üret 'dört'; üret 'yine dört' bitir
    değilse: üret 'büyük'
  bitir
  dene
    üret 1 bol 0
  yakala (h)
    üret 'yakalandı: ' + h.mesaj
  sonunda
    üret 'sonunda'
  bitir
  n < 6 iken
  başla
    n := n + 1
    eğer n = 5 ise devam
    üret n
  bitir
bitir

{ 'üret' fonksiyon gövdesinde deyim başında değilse ya da ardından ifade gelmiyorsa sıradan addır }
fonksiyon ÜretAdı(): tamsayı
başla
  dön üret + 1
bitir

başla
  a := Kareler(3)
  yaz('çağrıldı, henüz çalışmadı', 1)
  a içindeki her x için yaz(x, 1)
  yaz(Tür(a) + ' ' + Metin(a), 1)
  yaz('ikinci kez: ' + Metin(Liste(a)), 1)

  İlkleri(Doğallar, 4) içindeki her i, x için yaz(Metin(i) + ':' + Metin(x), 1)
  yaz(Liste(İlkleri(Kareler(10), 2)), 1)
  yaz(Toplam(Kareler(4)), 1)

  { kır: akış kapatılır, 'sonunda' çalışır }
  Temizlikli içindeki her x için
  başla
    yaz(x, 1)
    eğer x = 'iki' ise kır
  bitir
  { devam ve sonuna kadar }
  Temizlikli içindeki her x için
  başla
    eğer x = 'iki' ise devam
    yaz(x, 1)
  bitir
  { hiç yinelenmeyen akışın gövdesi çalışmaz }
  b := Temizlikli
  yaz('yinelenmedi', 1)

  { gövdedeki hata, değeri isteyen döngüye satırıyla ulaşır }
  dene
    Hatalı içindeki her x için yaz(x, 1)
  yakala (h)
    yaz(h.mesaj + ' (satır ' + Metin(h.satır) + ')', 1)
  bitir
  { döngü gövdesindeki hata akışı kapatır; kapatmanın hatası yutulur }
  dene
    Temizlikli içindeki her x için firlat 'döngüde hata'
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    SonundaHatalı içindeki her x için firlat 'döngüde hata'
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  { kır ile kapatırken 'sonunda'daki hata döngüden çıkar }
  dene
    SonundaHatalı içindeki her x için kır
  yakala (h)
    yaz(h.mesaj, 1)
  bitir

  yaz(Liste(Yapraklar([1, [2, [3, 4]], [], [[5]]])), 1)

  birikim := 0
  Doğallar içindeki her x için
  başla
    birikim := birikim + x
    eğer x = 100 ise kır
  bitir
  yaz(birikim, 1)

  x := Sayaç.Oluştur(3)
  yaz(Liste(x.Geri), 1)

  { akış kendi gövdesinde yinelenemez }
  b := Kendini
  dene
    b içindeki her x için yaz(x, 1)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir

  { 'aynı anda' kaynağı olarak akış: önce sonuna kadar okunur }
  aynı anda en çok 2 Kareler(3) içindeki her i, x için yaz(Metin(i) + '→' + Metin(x), 1)

  yaz(Liste(Yapraklar([1, 2])) + Liste(Yapılar), 1)

  üret := 41
  yaz(ÜretAdı, 1)

  dene
    a := 5
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
bitir.
