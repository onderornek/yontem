program GirdiDenetimi
{ Kullanıcıdan gelen her veri düşmanca kabul edilir. Bu program yaygın saldırıları ve
  Güvenlik biriminin bunlara karşı araçlarını gösterir:
    XSS (siteler arası betik)  → HtmlKaçış
    SQL enjeksiyonu            → SqlMetni (mümkünse parametreli sorgu kullan)
    Yol geçişi (../../etc)     → YolGüvenli, DosyaAdıTemizle
    Kötü niyetli bağlantılar   → UrlGüvenli
    Beklenmeyen karakterler    → İzinliKarakterler (beyaz liste)
  Ayrıca kişisel verileri günlüklere yazarken Maskele kullanılır. }
kullan Güvenlik

sabit KULLANICI_ADI_KARAKTERLERİ: metin = 'abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789_.'

başla
  yaz('— XSS', 1)
  yaz('  ' + HtmlKaçış('<script>alert("ele geçirildi")</script>'), 1)
  yaz('  ' + HtmlKaçış('<img src=x onerror=''çal()''> & Co.'), 1)
  yaz('— SQL', 1)
  yaz('  SELECT * FROM kullanicilar WHERE ad = ' + SqlMetni('ayşe'), 1)
  yaz('  SELECT * FROM kullanicilar WHERE ad = ' + SqlMetni('x'' OR ''1''=''1'), 1)
  yaz('— Yol geçişi', 1)
  ['raporlar/2026/ocak.pdf', 'resim.png', '../../etc/passwd', 'a/../../b', '/etc/passwd', 'C:\Windows\win.ini',
   '..\gizli.txt', '%2e%2e/gizli', ''] içindeki her yol için
    yaz('  ' + '"' + yol + '"' + ' → ' + Metin(YolGüvenli(yol)), 1)
  yaz('— Dosya adı temizleme', 1)
  ['../../etc/passwd', 'Özgeçmiş (son hali).pdf', 'kötü<adı>|?.txt', '...gizli', 'CON.txt', 'C:\Users\ali\foto.jpg',
   '///'] içindeki her ad için
    yaz('  ' + '"' + ad + '"' + ' → ' + DosyaAdıTemizle(ad), 1)
  yaz('— E-posta', 1)
  ['ayse@ornek.com.tr', 'ali.veli+bulten@posta.org', 'eksik@alan', 'iki..nokta@ornek.com', 'boşluk var@ornek.com',
   '@ornek.com'] içindeki her e için
    yaz('  ' + e + ' → ' + Metin(EpostaGeçerli(e)), 1)
  yaz('— Bağlantılar', 1)
  ['https://yontem.pro/kitaplar', 'http://ornek.com', '/profil?id=5', 'javascript:alert(1)', '//saldirgan.com',
   'data:text/html;base64,PHNjcmlwdD4=', 'https://yontem.pro@saldirgan.com', ' JAVASCRIPT:alert(1)'] içindeki her u için
    yaz('  ' + u + ' → ' + Metin(UrlGüvenli(u)), 1)
  yaz('— Beyaz liste', 1)
  ['ayşe_42', 'ali.veli', 'robert''); DROP TABLE--', 'emoji🙂'] içindeki her ad için
    yaz('  ' + ad + ' → ' + Metin(İzinliKarakterler(ad, KULLANICI_ADI_KARAKTERLERİ)), 1)
  yaz('— Maskeleme', 1)
  yaz('  Kart: ' + Maskele('4111111111111111'), 1)
  yaz('  Telefon: ' + Maskele('05321234567', 2), 1)
  yaz('  Kısa: ' + Maskele('ab', 4) + ' / hepsi gizli: ' + Maskele('gizli', 0), 1)
bitir.
