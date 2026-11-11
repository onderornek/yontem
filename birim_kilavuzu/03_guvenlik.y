program ÜyelikÖzeti
{ Güvenlik birimi: parola saklama, kullanıcı girdisini temizleme ve süreli oturum belirteci.
  Çıktının her çalıştırmada aynı olması için birimin saati sabitlendi. }
kullan Güvenlik

sabit ANAHTAR: metin = 'bunu-ortam-degiskeninden-oku'

değişken kayıtlı, oturum: metin

başla
  BenzetimZamanı(1800000000)
  { 1) Parola düz metin saklanmaz; tuzlu ve yavaşlatılmış özeti saklanır. }
  kayıtlı := ParolaÖzeti('Deniz-Feneri-1907', 1000)   { gerçek sistemde ikinci argümanı vermeyin }
  yaz('Kayıt biçimi : ' + Ayır(kayıtlı, '$')[0] + ', ' + Uzunluk(kayıtlı) + ' karakter', 1)
  yaz('Doğru parola : ' + Metin(ParolaDoğrula('Deniz-Feneri-1907', kayıtlı)), 1)
  yaz('Yanlış parola: ' + Metin(ParolaDoğrula('deniz-feneri', kayıtlı)), 1)
  yaz('Zayıf parola : ' + Metin(ParolaSorunları('kedi123')), 1)

  { 2) Kullanıcının yazdığı metin sayfaya ve sorguya kaçışlanarak girer. }
  yaz('HTML : ' + HtmlKaçış('<script>çal()</script>'), 1)
  yaz('SQL  : ' + SqlMetni('x'' OR ''1''=''1'), 1)
  yaz('Dosya: ' + DosyaAdıTemizle('../../etc/passwd') + ', yol güvenli mi: ' + Metin(YolGüvenli('../../etc/passwd')), 1)

  { 3) Oturum: imzalı ve 30 dakika geçerli belirteç. }
  oturum := BelirteçÜret(ANAHTAR, 'zeynep', 1800)
  yaz('Oturum sahibi: ' + Metin(BelirteçDoğrula(ANAHTAR, oturum)), 1)
  yaz('Sahte anahtar: ' + Metin(BelirteçDoğrula('tahmin', oturum)), 1)
  BenzetimZamanı(1800000000 + 1801)
  yaz('31 dk sonra  : ' + Metin(BelirteçDoğrula(ANAHTAR, oturum)), 1)
bitir.
