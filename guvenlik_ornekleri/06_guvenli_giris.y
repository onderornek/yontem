program GüvenliGiriş
{ Güvenlik biriminin bütün parçalarını bir araya getiren küçük bir üyelik sistemi:
    • Kayıt: kullanıcı adı beyaz listeyle, e-posta biçimle, parola güçle denetlenir;
      parola tuzlu PBKDF2 özeti olarak saklanır.
    • Giriş: kullanıcı başına 5 dakikada en çok 3 deneme; kullanıcı yoksa da parola özeti
      hesaplanır, böylece yanıt süresinden hangi kullanıcıların var olduğu anlaşılmaz.
    • Oturum: başarılı girişte 30 dakikalık imzalı belirteç verilir; her istekte doğrulanır.
    • Çıktı: kullanıcıdan gelen ad ekrana HtmlKaçış ile basılır.
    • Her güvenlik olayı günlüğe yazılır; e-posta adresi maskelenir. }
kullan Güvenlik

sabit
  OTURUM_ANAHTARI: metin = 'bunu-ortam-degiskeninden-oku'
  TEKRAR: tamsayı = 1000         { gerçek sistemde varsayılan 210000 }
  AD_KARAKTERLERİ: metin = 'abcçdefgğhıijklmnoöprsştuüvyz0123456789_'

değişken
  kullanıcılar: sözlük
  denemeler: herhangi
  sahteKayıt, oturum: metin

fonksiyon Kaydol(ad, eposta, parola: metin): metin
başla
  eğer Uzunluk(ad) < 3 veya değil İzinliKarakterler(ad, AD_KARAKTERLERİ) ise dön 'geçersiz kullanıcı adı'
  eğer değil EpostaGeçerli(eposta) ise dön 'geçersiz e-posta'
  eğer ParolaGücü(parola) < 3 ise dön 'parola zayıf: ' + Birleştir(ParolaSorunları(parola), ', ')
  eğer kullanıcılar.İçerir(ad) ise dön 'bu ad alınmış'
  kullanıcılar[ad] := ['eposta': eposta, 'parola': ParolaÖzeti(parola, TEKRAR)]
  Günlük('kayıt', 'kullanıcı=' + ad + ', e-posta=' + Maskele(eposta, 10))
  dön 'kayıt tamam'
bitir

fonksiyon GirişYap(ad, parola: metin): metin
değişken saklıÖzet: metin
başla
  eğer değil denemeler.İzinVer(ad) ise
  başla
    Günlük('çok fazla deneme', 'kullanıcı=' + ad)
    dön 'çok fazla deneme, ' + denemeler.Bekleme(ad) + ' sn sonra tekrar dene'
  bitir
  eğer kullanıcılar.İçerir(ad) ise saklıÖzet := kullanıcılar[ad]['parola']
  değilse saklıÖzet := sahteKayıt
  eğer ParolaDoğrula(parola, saklıÖzet) ve kullanıcılar.İçerir(ad) ise
  başla
    denemeler.Sıfırla(ad)
    Günlük('giriş başarılı', 'kullanıcı=' + ad)
    dön BelirteçÜret(OTURUM_ANAHTARI, ad, 1800)
  bitir
  Günlük('giriş başarısız', 'kullanıcı=' + ad)
  dön ''
bitir

fonksiyon Sonuç(yanıt: metin): metin
başla
  eğer yanıt = '' ise dön 'reddedildi'
  eğer Uzunluk(yanıt) > 60 ise dön 'belirteç alındı'
  dön yanıt
bitir

prosedür Sayfa(oturum: metin)
değişken ad: herhangi
başla
  ad := BelirteçDoğrula(OTURUM_ANAHTARI, oturum)
  eğer ad = boş ise yaz('  → 401: oturum geçersiz ya da süresi dolmuş, giriş sayfasına yönlendir', 1)
  değilse yaz('  → <h1>Hoş geldin, ' + HtmlKaçış(ad) + '</h1>', 1)
bitir

başla
  BenzetimZamanı(1700000000)
  kullanıcılar := [:]
  denemeler := Sınırlayıcı(3, 300)
  sahteKayıt := ParolaÖzeti(Belirteç, TEKRAR)

  yaz('Kayıtlar:', 1)
  yaz('  ' + Kaydol('ay', 'ayse@ornek.com', 'Deniz-Feneri-1907'), 1)
  yaz('  ' + Kaydol('ayşe', 'ayse@', 'Deniz-Feneri-1907'), 1)
  yaz('  ' + Kaydol('ayşe', 'ayse@ornek.com', 'ayse1234'), 1)
  yaz('  ' + Kaydol('ayşe', 'ayse@ornek.com', 'Deniz-Feneri-1907'), 1)
  yaz('  ' + Kaydol('ayşe', 'baska@ornek.com', 'Baska-Parola-2026'), 1)
  yaz('  ' + Kaydol('<b>ali</b>', 'ali@ornek.com', 'Baska-Parola-2026'), 1)
  yaz('', 1)

  yaz('Girişler:', 1)
  oturum := GirişYap('ayşe', 'Deniz-Feneri-1907')
  yaz('  doğru parola → ' + Sonuç(oturum), 1)
  Sayfa(oturum)
  yaz('  olmayan kullanıcı → ' + Sonuç(GirişYap('mehmet', 'herhangi')), 1)
  1'den 4'e kadar her i için
    yaz('  yanlış parola ' + i + ' → ' + Sonuç(GirişYap('ayşe', 'tahmin' + i)), 1)
  yaz('  doğru parola bile şimdi reddedilir → ' + Sonuç(GirişYap('ayşe', 'Deniz-Feneri-1907')), 1)
  BenzetimZamanı(1700000301)
  oturum := GirişYap('ayşe', 'Deniz-Feneri-1907')
  yaz('  5 dakika sonra doğru parola → ' + Sonuç(oturum), 1)
  yaz('', 1)

  yaz('İstekler:', 1)
  Sayfa(oturum)
  Sayfa(oturum + 'x')
  Sayfa(BelirteçÜret('tahmin-edilen-anahtar', 'ayşe', 1800))
  BenzetimZamanı(1700000301 + 1800)
  Sayfa(oturum)
bitir.
