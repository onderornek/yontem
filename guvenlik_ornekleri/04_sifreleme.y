program Şifreleme
{ Şifrele, ChaCha20-Poly1305 ile kimlik doğrulamalı şifreleme yapar: veri hem gizlenir hem de
  mühürlenir. Şifreli metnin tek bir harfi değişirse ya da anahtar yanlışsa ŞifreÇöz hata verir;
  saldırgan veriyi okuyamaz ve fark edilmeden değiştiremez. Her çağrıda rastgele bir 'nonce'
  üretildiği için aynı metin her seferinde farklı şifrelenir. }
kullan Güvenlik

değişken anahtar, şifreli, bozuk, a1, a2: metin

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
  anahtar := AnahtarÜret
  yaz('Anahtar uzunluğu: ' + Uzunluk(anahtar) + ' onaltılık karakter (256 bit)', 1)
  şifreli := Şifrele(anahtar, 'Hesap no: TR12 3456 7890, bakiye 15.000 TL')
  yaz('Şifreli metin uzunluğu: ' + Uzunluk(şifreli), 1)
  yaz('Çözülen: ' + ŞifreÇöz(anahtar, şifreli), 1)
  yaz('Aynı metin iki kez şifrelenince farklı mı? ' + Metin(Şifrele(anahtar, 'a') <> Şifrele(anahtar, 'a')), 1)
  eğer AltMetin(şifreli, 20, 1) = 'A' ise bozuk := AltMetin(şifreli, 1, 19) + 'B' + AltMetin(şifreli, 21, Uzunluk(şifreli) - 20)
  değilse bozuk := AltMetin(şifreli, 1, 19) + 'A' + AltMetin(şifreli, 21, Uzunluk(şifreli) - 20)
  Sına('Değiştirilmiş veri', prosedür başla yaz(ŞifreÇöz(anahtar, bozuk), 1) bitir)
  Sına('Yanlış anahtar', prosedür başla yaz(ŞifreÇöz(AnahtarÜret, şifreli), 1) bitir)
  Sına('Kısa anahtar', prosedür başla yaz(Şifrele('parolam', 'x'), 1) bitir)
  yaz('', 1)
  { Paroladan anahtar: aynı parola ve tuz her zaman aynı anahtarı verir. }
  a1 := ParoladanAnahtar('uzun bir parola cümlesi', 'uygulama-tuzu', 1000)
  a2 := ParoladanAnahtar('uzun bir parola cümlesi', 'uygulama-tuzu', 1000)
  yaz('Paroladan anahtar: ' + a1, 1)
  yaz('Aynı girdi aynı anahtar: ' + Metin(a1 = a2), 1)
  yaz('Başka tuz başka anahtar: ' + Metin(a1 <> ParoladanAnahtar('uzun bir parola cümlesi', 'başka-tuz', 1000)), 1)
  yaz('Paroladan anahtarla gidiş-dönüş: ' + ŞifreÇöz(a1, Şifrele(a1, 'merhaba')), 1)
  yaz('', 1)
  { Başka bir Yöntem çalışma zamanında şifrelenmiş veri burada da çözülür. }
  yaz('Sabit örnek: ' + ŞifreÇöz('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    'oaKjpKWmp6ipqqusTrEL0msWDiPrUiJAE8ncfVL9vfzd2HckdrdhWrD-_XIJkdMQ3-HtfWK95QcRnQWiRFtYBJ1dnxeygNsEYO-K7Q'), 1)
bitir.
