program ParolaSaklama
{ Parolalar asla düz metin olarak saklanmaz. ParolaÖzeti her parola için rastgele bir tuz üretir
  ve PBKDF2-HMAC-SHA256 ile yavaşlatılmış bir özet çıkarır. Veritabanı çalınsa bile saldırgan
  parolaları geri elde edemez; her tahmin için yüz binlerce SHA-256 hesaplamak zorunda kalır. }
kullan Güvenlik

değişken kayıt1, kayıt2: metin
  parçalar: liste

başla
  { Testler hızlı çalışsın diye tekrar sayısı düşük; gerçek uygulamada varsayılanı (210000) kullan. }
  kayıt1 := ParolaÖzeti('Gizli-Parola-42', 1000)
  kayıt2 := ParolaÖzeti('Gizli-Parola-42', 1000)
  parçalar := Ayır(kayıt1, '$')
  yaz('Biçim: ' + parçalar[0] + ', tekrar ' + parçalar[1], 1)
  yaz('Tuz uzunluğu: ' + Uzunluk(parçalar[2]) + ' onaltılık karakter', 1)
  yaz('Özet uzunluğu: ' + Uzunluk(parçalar[3]) + ' onaltılık karakter', 1)
  yaz('Aynı parola, farklı kayıt (tuz sayesinde): ' + Metin(kayıt1 <> kayıt2), 1)
  yaz('Doğru parola: ' + Metin(ParolaDoğrula('Gizli-Parola-42', kayıt1)), 1)
  yaz('Yanlış parola: ' + Metin(ParolaDoğrula('gizli-parola-42', kayıt1)), 1)
  yaz('Bozuk kayıt: ' + Metin(ParolaDoğrula('x', 'md5$abc')), 1)
  yaz('Tekrar sayısı düşük, yeniden özetlenmeli: ' + Metin(YenidenÖzetlenmeli(kayıt1)), 1)
  yaz('Bilinen bir kayıtla doğrulama: ' + Metin(ParolaDoğrula('yöntem',
      'pbkdf2-sha256$1000$000102030405060708090a0b0c0d0e0f$' +
      '1bc12db6cfcc344cbcefcfffaba427628408a199bca23d4fdf1e8548df90022a')), 1)
  yaz('', 1)
  yaz('Parola gücü (0 = çok zayıf, 4 = çok güçlü):', 1)
  ['123456', 'parola123', 'aaaaaaaaaa', 'kedi1234', 'Kedi1234', 'Kedi-1234-Mavi', 'uzun ama tek tip sözcükler',
   'Çok-Güçlü-Parola-2026!'] içindeki her p için
    yaz('  ' + p + ' → ' + ParolaGücü(p) + '  ' + Metin(ParolaSorunları(p)), 1)
bitir.
