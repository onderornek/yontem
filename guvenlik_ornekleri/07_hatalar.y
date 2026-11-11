program GüvenlikHataları
{ Güvenlik biriminin hata mesajları ve sınır durumları (test programı). }
kullan Güvenlik

değişken s: herhangi

prosedür Sına(ad: metin; p: herhangi)
başla
  dene
    p()
    yaz(ad + ': hata yok', 1)
  yakala (h)
    yaz(ad + ': ' + h.mesaj, 1)
  bitir
bitir

başla
  Sına('özet argüman', prosedür başla Özet() bitir)
  Sına('imza anahtar sayı', prosedür başla İmza(5, 'x') bitir)
  Sına('parola sayı', prosedür başla ParolaÖzeti(1234) bitir)
  Sına('tekrar az', prosedür başla ParolaÖzeti('x', 10) bitir)
  Sına('tekrar ondalık', prosedür başla ParolaÖzeti('x', 1000.0) bitir)
  Sına('tuz sıfır', prosedür başla Tuz(0) bitir)
  Sına('belirteç çok', prosedür başla Belirteç(2000) bitir)
  Sına('rastgele ters', prosedür başla GüvenliRastgele(10, 1) bitir)
  Sına('rastgele ondalık', prosedür başla GüvenliRastgele(1.5, 3) bitir)
  Sına('base64 bozuk', prosedür başla Base64Çöz('***') bitir)
  Sına('base64 utf8 değil', prosedür başla Base64Çöz('/w==') bitir)
  Sına('şifreli bozuk', prosedür başla ŞifreÇöz(AnahtarÜret, 'kısa!') bitir)
  Sına('şifreli kısa', prosedür başla ŞifreÇöz(AnahtarÜret, 'abcd') bitir)
  Sına('anahtar hex değil', prosedür başla Şifrele('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', 'x') bitir)
  Sına('sql boş karakter', prosedür başla SqlMetni('a' + #0) bitir)
  Sına('yol sayı', prosedür başla YolGüvenli(5) bitir)
  Sına('maskele negatif', prosedür başla Maskele('abc', -1) bitir)
  Sına('sınırlayıcı süre', prosedür başla Sınırlayıcı(3, 0) bitir)
  Sına('sınırlayıcı sayı', prosedür başla Sınırlayıcı(0, 10) bitir)
  Sına('belirteç ömür', prosedür başla BelirteçÜret('a', 'b', 0) bitir)
  s := Sınırlayıcı(2, 1.5)
  yaz(s, 1)
  yaz(s.EnÇok + ' ' + Metin(s.Süre), 1)
  Sına('sınırlayıcı üye', prosedür başla s.Bilinmeyen bitir)
  Sına('sınırlayıcı atama', prosedür başla s.EnÇok := 5 bitir)
  yaz(Metin(ParolaDoğrula('x', 'pbkdf2-sha256$999$00$' + Özet(''))) + ' ' +
      Metin(ParolaDoğrula('x', 'pbkdf2-sha256$1000$0$' + Özet(''))) + ' ' +
      Metin(YenidenÖzetlenmeli('bozuk')), 1)
  yaz(Metin(GüvenliRastgele(7, 7)) + ' ' + Metin(Uzunluk(Tuz) = 32) + ' ' + Metin(Uzunluk(Tuz(8)) = 16) + ' ' +
      Metin(Uzunluk(Belirteç) = 43) + ' ' + Metin(Uzunluk(Belirteç(3)) = 4), 1)
  yaz(Metin(Uzunluk(Kimlik) = 36) + ' ' + AltMetin(Kimlik, 15, 1), 1)
  yaz(HtmlKaçış(42) + ' ' + SqlMetni(3.5) + ' ' + Maskele(123456, 2) + ' ' + Base64Kodla(doğru), 1)
  yaz(DosyaAdıTemizle('') + ' ' + Metin(EpostaGeçerli('')) + ' ' + Metin(UrlGüvenli('')) + ' ' +
      Metin(İzinliKarakterler('', 'abc')), 1)
  BenzetimZamanı(10.5)
  yaz(Zaman, 1)
  Günlük('yalnız olay')
  Günlük('kontrol karakteri', 'a' + #9 + 'b' + #27 + 'c\d')
  yaz(GünlükKayıtları, 1)
bitir.
