program SunucuTesti
{ Sunucu birimi: yollar, parametreler, sorgu, JSON, yönlendirme ve hata durumları. İstekİşle isteği ağ
  olmadan işler; gerçek ağ sınaması js/betikler/sunucu_testi.js içindedir. }
kullan Sunucu, Veri

değişken
  ürünler: liste
  y: sözlük

fonksiyon Liste(istek: sözlük): herhangi
başla
  dön JsonYanıt(ürünler)
bitir

fonksiyon Tek(istek: sözlük): herhangi
değişken no: tamsayı
başla
  no := Tamsayı(istek['parametreler']['no'])
  eğer no >= Uzunluk(ürünler) ise dön Yanıt(404, 'Ürün yok')
  dön JsonYanıt(ürünler[no])
bitir

fonksiyon Ekle_(istek: sözlük): herhangi
değişken v: sözlük
başla
  v := JSONÇöz(istek['gövde'])
  ürünler.Ekle(v)
  dön JsonYanıt(['no': Uzunluk(ürünler) - 1, 'ad': v['ad']], 201)
bitir

fonksiyon Selam(istek: sözlük): herhangi
başla
  dön '<p>Merhaba, ' + istek['sorgu'].Al('ad', 'dünya') + '! ' + istek['yöntem'] + ' ' + istek['başlıklar'].Al('x-deneme', '-') + '</p>'
bitir

fonksiyon Bozuk(istek: sözlük): herhangi
başla
  dön 1 böl 0
bitir

fonksiyon Dur(istek: sözlük): herhangi
başla
  SunucuyuDurdur
  dön Yanıt(200, 'kapanıyor')
bitir

prosedür Sına(ad: metin; iş: herhangi)
başla
  dene
    iş()
    yaz(ad + ': hata bekleniyordu', 1)
  yakala (h)
    yaz(ad + ' → ' + h.mesaj, 1)
  bitir
bitir

prosedür Göster(ad: metin; y: sözlük)
başla
  yaz(ad + ' → ' + y['durum'] + ' ' + y['başlıklar']['content-type'] + ' | ' + y['gövde'], 1)
bitir

başla
  ürünler := [['ad': 'defter', 'fiyat': 12.5]]
  Yol('GET', '/urunler', Liste)
  Yol('GET', '/urunler/:no', Tek)
  Yol('POST', '/urunler', Ekle_)
  Yol('*', '/selam', Selam)
  Yol('GET', '/bozuk', Bozuk)
  Yol('GET', '/git', fonksiyon(i) başla dön Yönlendir('/selam?ad=y%C3%B6n') bitir)
  Yol('POST', '/dur', Dur)
  Göster('liste', İstekİşle('GET', '/urunler'))
  Göster('ekle', İstekİşle('POST', '/urunler', '{"ad": "kalem", "fiyat": 4}'))
  Göster('tek', İstekİşle('GET', '/urunler/1'))
  Göster('yok', İstekİşle('GET', '/urunler/9'))
  Göster('selam', İstekİşle('GET', '/selam?ad=Ay%C5%9Fe+Y%C4%B1lmaz', boş, ['X-Deneme': 'evet']))
  Göster('405', İstekİşle('DELETE', '/urunler'))
  Göster('404', İstekİşle('GET', '/olmayan/yol'))
  Göster('500', İstekİşle('GET', '/bozuk'))
  Göster('400', İstekİşle('GET', '/selam?ad=%ZZ'))
  y := İstekİşle('GET', '/git')
  yaz(y['durum'] + ' ' + y['başlıklar']['location'], 1)
  Göster('baş', İstekİşle('HEAD', '/urunler'))
  Göster('büyük', İstekİşle('POST', '/urunler', 'x' * 1048577))
  Sına('yöntem', prosedür başla Yol('ALMA', '/x', Selam) bitir)
  Sına('yol', prosedür başla Yol('GET', 'x', Selam) bitir)
  Sına('işleyici', prosedür başla Yol('GET', '/x', 5) bitir)
  Sına('parametre', prosedür başla Yol('GET', '/x/:1a', Selam) bitir)
  Sına('durum', prosedür başla Yanıt(99, 'x') bitir)
  Sına('yönlendir', prosedür başla Yönlendir('/a', 200) bitir)
  Sına('adres', prosedür başla Yönlendir('/çay') bitir)
  Sına('port', prosedür başla Dinle(70000) bitir)
bitir.
