program SunucuÖrneği
{ Sunucu birimi: yollar, yol parametreleri, JSON yanıtı.
  İstekİşle isteği ağ olmadan işler; gerçek sunucu için sondaki Dinle satırını açın. }
kullan Sunucu

değişken
  y: sözlük

fonksiyon AnaSayfa(istek: sözlük): herhangi
başla
  dön '<h1>Merhaba, ' + istek['sorgu'].Al('ad', 'dünya') + '!</h1>'
bitir

fonksiyon Kare(istek: sözlük): herhangi
değişken n: tamsayı
başla
  n := Tamsayı(istek['parametreler']['n'])
  dön JsonYanıt(['sayı': n, 'kare': n * n])
bitir

başla
  Yol('GET', '/', AnaSayfa)
  Yol('GET', '/kare/:n', Kare)

  y := İstekİşle('GET', '/?ad=Ay%C5%9Fe')
  yaz(Metin(y['durum']) + ' ' + y['gövde'], 1)
  y := İstekİşle('GET', '/kare/12')
  yaz(Metin(y['durum']) + ' ' + y['başlıklar']['content-type'] + ' ' + y['gövde'], 1)
  y := İstekİşle('GET', '/kare/on')
  yaz(Metin(y['durum']) + ' ' + y['gövde'], 1)
  y := İstekİşle('POST', '/kare/3')
  yaz(Metin(y['durum']) + ' ' + y['gövde'], 1)
  y := İstekİşle('GET', '/yok')
  yaz(Metin(y['durum']) + ' ' + y['gövde'], 1)

  { Dinle(8080)      tarayıcıda http://127.0.0.1:8080/kare/12 }
bitir.
