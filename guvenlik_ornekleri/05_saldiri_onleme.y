program SaldırıÖnleme
{ Kaba kuvvet saldırısında saldırgan binlerce parolayı art arda dener. Sınırlayıcı, bir anahtar
  (kullanıcı adı, IP adresi...) için belirli sürede izin verilen deneme sayısını sınırlar.
  BelirteçÜret, gizli anahtarla imzalanmış ve süresi dolan belirteçler üretir: oturum çerezleri,
  parola sıfırlama bağlantıları ve CSRF belirteçleri için kullanılır. Günlük ise güvenlik olaylarını
  kaydeder; satır sonlarını kaçışlayarak saldırganın sahte günlük satırı eklemesini (log injection)
  engeller. Testlerin her çalıştırmada aynı sonucu vermesi için saat BenzetimZamanı ile sabitlenir. }
kullan Güvenlik

sabit GİZLİ: metin = 'oturum-imza-anahtari'

değişken s: herhangi
  b, sıfırlama: metin
  i: tamsayı

başla
  BenzetimZamanı(1000000)
  s := Sınırlayıcı(3, 60)
  yaz(s, 1)
  1'den 5'e kadar her i için
    yaz('ayşe deneme ' + i + ': ' + Metin(s.İzinVer('ayşe')) + ' (kalan ' + s.Kalan('ayşe') + ')', 1)
  yaz('ali deneme 1: ' + Metin(s.İzinVer('ali')), 1)
  yaz('ayşe için bekleme: ' + s.Bekleme('ayşe') + ' sn', 1)
  BenzetimZamanı(1000045)
  yaz('45 sn sonra bekleme: ' + s.Bekleme('ayşe') + ' sn, izin: ' + Metin(s.İzinVer('ayşe')), 1)
  BenzetimZamanı(1000061)
  yaz('61 sn sonra izin: ' + Metin(s.İzinVer('ayşe')) + ', kalan ' + s.Kalan('ayşe'), 1)
  s.Sıfırla('ayşe')
  yaz('Sıfırlandıktan sonra kalan: ' + s.Kalan('ayşe'), 1)
  yaz('', 1)

  BenzetimZamanı(2000000)
  b := BelirteçÜret(GİZLİ, 'kullanıcı=ayşe', 300)
  yaz('Belirteç: ' + b, 1)
  yaz('Doğrulandı: ' + Metin(BelirteçDoğrula(GİZLİ, b)), 1)
  yaz('Yanlış anahtar: ' + Metin(BelirteçDoğrula('başka', b)), 1)
  yaz('Rolü yönetici yapılmış: ' + Metin(BelirteçDoğrula(GİZLİ, 'a3VsbGFuxLFjxLE9ecO2bmV0aWNp' + AltMetin(b, 24, Uzunluk(b) - 23))), 1)
  yaz('Anlamsız: ' + Metin(BelirteçDoğrula(GİZLİ, 'abc.def')), 1)
  BenzetimZamanı(2000299)
  yaz('299 sn sonra: ' + Metin(BelirteçDoğrula(GİZLİ, b)), 1)
  BenzetimZamanı(2000300)
  yaz('300 sn sonra (süresi doldu): ' + Metin(BelirteçDoğrula(GİZLİ, b)), 1)
  sıfırlama := BelirteçÜret(GİZLİ, 'parola-sıfırla:ayşe@ornek.de', 900)
  yaz('Parola sıfırlama bağlantısı: https://ornek.de/sifirla?b=' + sıfırlama, 1)
  yaz('', 1)

  Günlük('giriş başarısız', 'kullanıcı=ayşe, ip=203.0.113.7')
  Günlük('hesap kilitlendi', 'kullanıcı=ayşe')
  Günlük('giriş başarısız', 'kullanıcı=ali' + #10 + '[Güvenlik] giriş başarılı: kullanıcı=yönetici')
  Günlük('kart güncellendi', 'kart=' + Maskele('4111111111111111'))
  yaz('Kayıt sayısı: ' + Uzunluk(GünlükKayıtları), 1)
bitir.
