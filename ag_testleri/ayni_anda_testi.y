program AynıAndaTesti
{ 'aynı anda' döngüsünün testi. Yerel bir sınama sunucusuna bağlanır; sunucunun adresi ilk argümandır.
  Doğrudan değil, 'node js/betikler/ag_testi.js' ile çalıştırılır (sunucuyu o başlatır). }
kullan Ağ, Sistem, Veri

tip
  İstemci = sınıf
    ön: metin
    kurucu Oluştur(ön: metin)
    fonksiyon Getir(ad: metin): metin
  bitir

değişken
  taban: metin
  sonuçlar, adlar: liste
  ad, i: herhangi
  ist: İstemci

kurucu İstemci.Oluştur(ön: metin)
başla
  kendi.ön := ön
bitir

fonksiyon İstemci.Getir(ad: metin): metin
başla
  dön ön + HttpAl(taban + '/gecikme?ad=' + ad)['gövde']
bitir

fonksiyon Sor(ad: metin): metin
değişken
  y: sözlük
başla
  y := HttpGönder(taban + '/gecikme?ad=' + ad, 'soru')
  dön y['gövde']
bitir

başla
  eğer Uzunluk(Argümanlar()) = 0 ise
  başla
    yaz('Bu test bir sınama sunucusu gerektirir: node js/betikler/ag_testi.js', 1)
    dön
  bitir
  taban := Argümanlar()[0]
  adlar := ['a', 'b', 'c', 'd', 'e', 'f']

  yaz('-- en çok 3: istekler turlar halinde birlikte gider', 1)
  sonuçlar := []
  aynı anda en çok 3 adlar içindeki her ad için
  başla
    yaz('başladı ' + ad, 1)
    değişken g := HttpAl(taban + '/gecikme?ad=' + ad)['gövde']
    yaz('bitti ' + g, 1)
    Ekle(sonuçlar, g)
  bitir
  yaz(sonuçlar, 1)
  yaz('aynı anda en çok: ' + HttpAl(taban + '/enfazla')['gövde'], 1)

  yaz('-- fonksiyon, metod ve iki istek', 1)
  ist := İstemci('m:')
  sonuçlar := []
  aynı anda adlar içindeki her i, ad için
  başla
    değişken s := Sor(ad)
    değişken m := ist.Getir(s)
    Ekle(sonuçlar, Metin(i) + '=' + m)
  bitir
  yaz(sonuçlar, 1)
  yaz('aynı anda en çok: ' + HttpAl(taban + '/enfazla')['gövde'], 1)

  yaz('-- yerleşiğin çağırdığı fonksiyon beklemez', 1)
  aynı anda ['x', 'y'] içindeki her ad için
    yaz(Eşle([1, 2], fonksiyon(n) => HttpAl(taban + '/gecikme?ad=' + ad + Metin(n))['gövde']), 1)
  yaz('aynı anda en çok: ' + HttpAl(taban + '/enfazla')['gövde'], 1)

  yaz('-- devam', 1)
  aynı anda [1, 2, 3, 4] içindeki her i için
  başla
    eğer i mod 2 = 0 ise devam
    yaz(i, 1)
  bitir

  yaz('-- hata: öteki gövdeler sessizce durur', 1)
  dene
    aynı anda ['a', 'yok', 'c'] içindeki her ad için
    başla
      dene
        eğer ad = 'yok' ise
          yaz(HttpAl('http://127.0.0.1:1/')['durum'], 1)
        değilse
          yaz(HttpAl(taban + '/gecikme?ad=' + ad)['gövde'], 1)
        yaz('sonra ' + ad, 1)
      sonunda
        yaz('sonunda ' + ad, 1)
      bitir
    bitir
  yakala (h)
    yaz('yakalandı: ' + h.mesaj, 1)
  bitir

  yaz('-- kısıtlar', 1)
  dene
    aynı anda [1] içindeki her i için kır
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    aynı anda [1] içindeki her i için ad := i
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  dene
    aynı anda en çok 0 [1] içindeki her i için yaz(i)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
bitir.
