program SunucuAkışTesti
{ Sunucu birimi: akış yanıtı (AkışYanıt). İstekİşle akışı sonuna dek okuyup birleştirir; gerçek ağda her değer
  üretildikçe bir parça olarak gider (js/betikler/sunucu_testi.js). }
kullan Sunucu

değişken
  y: sözlük
  h: herhangi

fonksiyon Sayaç(n: tamsayı): akış
değişken i: tamsayı
başla
  1'den n'e kadar her i için
    üret 'adım ' + i
bitir

fonksiyon Karışık(): akış
başla
  üret 'iki' + #10 + 'satır'
  üret ['ad': 'Ayşe', 'puan': 3]
  üret [1, 2.5, doğru, boş]
bitir

fonksiyon Temizlikli(): akış
başla
  dene
    üret 'bir'
    üret 'iki'
  sonunda
    yaz('  (akış kapandı)', 1)
  bitir
bitir

fonksiyon Bozuk(): akış
başla
  üret 'önce'
  üret 1 böl 0
bitir

fonksiyon Olaylar(istek: sözlük): herhangi
başla
  dön AkışYanıt(Sayaç(Tamsayı(istek['sorgu'].Al('n', '3'))))
bitir

prosedür Göster(ad: metin; y: sözlük)
başla
  yaz(ad + ' → ' + y['durum'] + ' ' + y['başlıklar']['content-type'] + ' ' + y['başlıklar'].Al('cache-control', '-') + ' | ' + Değiştir(y['gövde'], #10, '⏎'), 1)
bitir

başla
  Yol('GET', '/olaylar', Olaylar)
  Yol('GET', '/karisik', fonksiyon(i) başla dön AkışYanıt(Karışık()) bitir)
  Yol('GET', '/ndjson', fonksiyon(i) başla dön AkışYanıt(Karışık(), 'application/x-ndjson') bitir)
  Yol('GET', '/duz', fonksiyon(i) başla dön AkışYanıt(Sayaç(3), 'text/plain; charset=utf-8', 202) bitir)
  Yol('GET', '/temiz', fonksiyon(i) başla dön AkışYanıt(Temizlikli()) bitir)
  Yol('GET', '/bozuk', fonksiyon(i) başla dön AkışYanıt(Bozuk()) bitir)
  Yol('GET', '/yanlis', fonksiyon(i) başla dön AkışYanıt([1, 2]) bitir)

  Göster('sse', İstekİşle('GET', '/olaylar?n=2'))
  Göster('karışık', İstekİşle('GET', '/karisik'))
  Göster('ndjson', İstekİşle('GET', '/ndjson'))
  Göster('düz', İstekİşle('GET', '/duz'))
  Göster('temiz', İstekİşle('GET', '/temiz'))
  yaz('HEAD: akış hiç başlamadan kapatılır', 1)
  Göster('baş', İstekİşle('HEAD', '/temiz'))
  Göster('yanlış', İstekİşle('GET', '/yanlis'))
  dene
    Göster('bozuk', İstekİşle('GET', '/bozuk'))
  yakala (h)
    yaz('bozuk → hata: ' + h.mesaj, 1)
  bitir
  dene
    y := AkışYanıt(Sayaç(1), 'text/plain', 99)
  yakala (h)
    yaz('hata: ' + h.mesaj, 1)
  bitir
  dene
    y := AkışYanıt('metin')
  yakala (h)
    yaz('hata: ' + h.mesaj, 1)
  bitir
bitir.
