program SiparişAyıklama
{ Desen birimi: düzenli ifadelerle doğrulama, ayıklama ve değiştirme. }
kullan Desen

sabit YAZI: metin = 'Sipariş #A-1042: 3 adet çay, 12 adet simit; iletişim: zeynep@ornek.com, 0532 123 45 67'

değişken g: herhangi

başla
  yaz('Sipariş no : ' + Bul(YAZI, '#[A-Z]-\d+'), 1)
  yaz('Adetler    : ' + Metin(BulHepsi(YAZI, '\d+ adet')), 1)
  TümGruplar(YAZI, '(\d+) adet (\w+)') içindeki her g için
    yaz('  ' + g[2] + ' × ' + g[1], 1)
  yaz('E-posta    : ' + Bul(YAZI, '[\w.]+@[\w.]+\.\w+'), 1)
  yaz('Telefon mu : ' + Metin(TamEşleşir('0532 123 45 67', '0\d{3} \d{3} \d{2} \d{2}')), 1)
  yaz('Gizlenmiş  : ' + DesenDeğiştir(YAZI, '(\d{4}) \d{3} \d{2} (\d{2})', '$1 *** ** $2'), 1)
  yaz('Parçalar   : ' + Metin(DesenAyır('çay; simit ,peynir', '\s*[;,]\s*')), 1)
  yaz('Harf ayrımı: ' + Metin(Eşleşir(YAZI, 'SİPARİŞ')) + ', "i" ile: ' + Metin(Eşleşir(YAZI, 'SİPARİŞ', 'i')), 1)
bitir.
