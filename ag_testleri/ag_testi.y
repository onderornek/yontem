program AğTesti
{ Ağ biriminin testi. Yerel bir sınama sunucusuna bağlanır; sunucunun adresi ilk argümandır.
  Doğrudan değil, 'node js/betikler/ag_testi.js' ile çalıştırılır (sunucuyu o başlatır). }
kullan Ağ, Sistem, Veri

değişken
  taban: metin
  y: sözlük
  veri: herhangi

prosedür Sına(ad: metin; p: herhangi)
başla
  dene
    p()
    yaz(ad + ': hata yok', 1)
  yakala (h)
    yaz(ad + ': ' + Değiştir(h.mesaj, taban, '<sunucu>'), 1)
  bitir
bitir

başla
  eğer Uzunluk(Argümanlar()) = 0 ise
  başla
    yaz('Bu test bir sınama sunucusu gerektirir: node js/betikler/ag_testi.js', 1)
    dön
  bitir
  taban := Argümanlar()[0]

  y := HttpAl(taban + '/merhaba')
  yaz(y['durum'] + ' ' + y['gövde'] + ' [' + y['başlıklar']['content-type'] + ']', 1)

  y := HttpAl(taban + '/yanki?' + SorguYap(['ad': 'Ayşe Öz', 'soru': 'a&b=c?']), ['X-Deneme': UrlKodla('değer 1'), 'Accept': 'text/plain'])
  veri := JSONÇöz(y['gövde'])
  yaz(veri['yöntem'] + ' ' + veri['yol'] + ' | x-deneme=' + UrlÇöz(UrlÇöz(veri['x-deneme'])) + ' | ajan=' + veri['ajan'], 1)

  y := HttpGönder(taban + '/yanki', JSONYap(['ürün': 'çay', 'adet': 3]), ['Content-Type': 'application/json'])
  veri := JSONÇöz(y['gövde'])
  yaz(veri['yöntem'] + ' ' + veri['tür'] + ' ' + veri['gövde'], 1)
  yaz(JSONÇöz(veri['gövde'])['ürün'] + ' × ' + JSONÇöz(veri['gövde'])['adet'], 1)

  ['PUT', 'patch', 'DELETE'] içindeki her yöntem için
  başla
    y := Httpİstek(yöntem, taban + '/yanki', 'gövde-' + yöntem)
    veri := JSONÇöz(y['gövde'])
    yaz(veri['yöntem'] + ' ' + veri['gövde'], 1)
  bitir
  y := Httpİstek('HEAD', taban + '/merhaba')
  yaz('HEAD ' + y['durum'] + ' gövde uzunluğu ' + Uzunluk(y['gövde']), 1)

  y := HttpAl(taban + '/durum/404')
  yaz(y['durum'] + ' ' + y['gövde'], 1)
  y := HttpAl(taban + '/durum/500')
  yaz(y['durum'] + ' ' + y['gövde'], 1)
  y := HttpAl(taban + '/yonlendir')
  yaz('yönlendirme → ' + y['durum'] + ' ' + y['gövde'], 1)
  y := HttpAl(taban + '/bos')
  yaz(y['durum'] + ' "' + y['gövde'] + '"', 1)
  yaz(Metin(y['başlıklar'].İçerir('x-ozel')) + ' ' + y['başlıklar']['x-ozel'], 1)

  yaz(UrlKodla('Ayşe & Ali = ç/ğ?') + ' ' + UrlÇöz('%C3%A7ay%20%2B%20simit') + ' ' + UrlKodla('-_.!~*''()') + ' ' + UrlKodla(42), 1)
  yaz(SorguYap(['a': 1, 'b': 'x y', 'ç': doğru]) + ' "' + SorguYap([:]) + '"', 1)

  Sına('zaman aşımı', prosedür başla HttpAl(taban + '/yavas', boş, 1) bitir)
  Sına('kapalı kapı', prosedür başla HttpAl('http://127.0.0.1:9/yok') bitir)
  Sına('geçersiz adres', prosedür başla HttpAl('ftp://ornek.de') bitir)
  Sına('boşluklu adres', prosedür başla HttpAl('http://ornek.de/a b') bitir)
  Sına('yöntem', prosedür başla Httpİstek('SİL', taban) bitir)
  Sına('GET gövdesi', prosedür başla Httpİstek('GET', taban, 'x') bitir)
  Sına('başlık adı', prosedür başla HttpAl(taban, ['Kötü Ad': 'x']) bitir)
  Sına('başlık enjeksiyonu', prosedür başla HttpAl(taban, ['X-A': 'a' + #13 + #10 + 'Kötü: 1']) bitir)
  Sına('başlık ascii', prosedür başla HttpAl(taban, ['X-A': 'değer']) bitir)
  Sına('başlık türü', prosedür başla HttpAl(taban, 'metin') bitir)
  Sına('süre', prosedür başla HttpAl(taban, boş, 0) bitir)
  Sına('gövde türü', prosedür başla HttpGönder(taban, 42) bitir)
  Sına('url çöz', prosedür başla UrlÇöz('%zz') bitir)
  Sına('url utf8', prosedür başla UrlÇöz('%ff') bitir)
  Sına('argüman', prosedür başla HttpAl() bitir)
bitir.
