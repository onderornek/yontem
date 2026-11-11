program İmzaVeBütünlük
{ Özet bir verinin parmak izidir: tek bir harf değişse özet tamamen değişir. İmza (HMAC) ise
  gizli bir anahtarla üretilir; anahtarı bilmeyen biri değiştirdiği veriye geçerli imza üretemez.
  İmzaları her zaman İmzaDoğru ya da GüvenliEşit ile karşılaştır: '=' işleci ilk farklı karakterde
  durur ve saldırgan yanıt sürelerini ölçerek doğru imzayı harf harf tahmin edebilir. }
kullan Güvenlik

sabit ANAHTAR: metin = 'sunucu-gizli-anahtari-degistir'

değişken ileti, imzaMetni, sahte: metin

başla
  yaz('Özet("") = ' + Özet(''), 1)
  yaz('Özet("abc") = ' + Özet('abc'), 1)
  yaz('Özet("Yöntem") = ' + Özet('Yöntem'), 1)
  yaz('Özet("yöntem") = ' + Özet('yöntem'), 1)
  yaz('', 1)
  ileti := 'kullanıcı=ayşe;rol=okuyucu'
  imzaMetni := İmza(ANAHTAR, ileti)
  yaz('İleti : ' + ileti, 1)
  yaz('İmza  : ' + imzaMetni, 1)
  yaz('Asıl ileti doğrulandı mı? ' + Metin(İmzaDoğru(ANAHTAR, ileti, imzaMetni)), 1)
  sahte := 'kullanıcı=ayşe;rol=yönetici'
  yaz('Değiştirilmiş ileti doğrulandı mı? ' + Metin(İmzaDoğru(ANAHTAR, sahte, imzaMetni)), 1)
  yaz('Yanlış anahtarla doğrulandı mı? ' + Metin(İmzaDoğru('başka-anahtar', ileti, imzaMetni)), 1)
  yaz('Büyük harfli imza da kabul edilir: ' + Metin(İmzaDoğru(ANAHTAR, ileti, BüyükHarf(imzaMetni))), 1)
  yaz('', 1)
  yaz('GüvenliEşit("abc", "abc") = ' + Metin(GüvenliEşit('abc', 'abc')), 1)
  yaz('GüvenliEşit("abc", "abd") = ' + Metin(GüvenliEşit('abc', 'abd')), 1)
  yaz('GüvenliEşit("abc", "abcd") = ' + Metin(GüvenliEşit('abc', 'abcd')), 1)
  yaz('', 1)
  yaz('Base64Kodla("Merhaba, dünya!") = ' + Base64Kodla('Merhaba, dünya!'), 1)
  yaz('Base64Çöz(...) = ' + Base64Çöz('TWVyaGFiYSwgZMO8bnlhIQ=='), 1)
bitir.
