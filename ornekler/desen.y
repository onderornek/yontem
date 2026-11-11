program DesenÖrneği
{ Desen birimi: düzenli ifadelerle metin arama, ayıklama ve değiştirme.
  Desenleri tek tırnak içinde yazın; tek tırnaklı metinlerde '\' olduğu gibi kalır.
    \d rakam   \w harf, rakam ya da _   \s boşluk   .  herhangi bir karakter
    [a-z] küme   ( ) grup   |  ya da   * + ? ve süslü ayraçla sayı: tekrar   ^ baş   $ son   \b sözcük sınırı }
kullan Desen

sabit
  GÜNLÜK: metin = '2026-11-10 09:15 giriş ayşe; 2026-11-10 09:47 hata Çağrı; 2026-11-11 18:02 çıkış ayşe'
  TARİH: metin = '(\d{4})-(\d{2})-(\d{2})'

değişken
  g: herhangi
  parça: liste

başla
  yaz('— Doğrulama', 1)
  ['34 ABC 123', '06 TR 4567', '6 A 12', 'ankara'] içindeki her plaka için
    yaz('  ' + plaka + ' → ' + Metin(TamEşleşir(plaka, '\d{2} [A-Z]{1,3} \d{2,4}')), 1)
  ['0532 123 45 67', '+90 532 123 45 67', '532-123'] içindeki her tel için
    yaz('  ' + tel + ' → ' + Metin(TamEşleşir(tel, '(\+90 ?|0)5\d{2} ?\d{3} ?\d{2} ?\d{2}')), 1)

  yaz('— Arama', 1)
  yaz('  İlk saat: ' + Bul(GÜNLÜK, '\d{2}:\d{2}'), 1)
  yaz('  Tüm saatler: ' + Metin(BulHepsi(GÜNLÜK, '\d{2}:\d{2}')), 1)
  yaz('  "hata" kaçıncı karakterde: ' + DesenKonumu(GÜNLÜK, '\bhata\b'), 1)
  yaz('  Olmayan desen: ' + Metin(Bul(GÜNLÜK, 'uyarı')), 1)

  yaz('— Gruplar', 1)
  g := Gruplar(GÜNLÜK, TARİH)
  yaz('  Yıl ' + g[1] + ', ay ' + g[2] + ', gün ' + g[3] + ' (tamamı: ' + g[0] + ')', 1)
  TümGruplar(GÜNLÜK, TARİH + ' (\d{2}:\d{2}) (\w+) (\w+)') içindeki her parça için
    yaz('  ' + parça[5] + ' / ' + parça[6] + ' / ' + parça[4], 1)

  yaz('— Değiştirme', 1)
  yaz('  ' + DesenDeğiştir('2026-11-10 ve 2027-01-05', TARİH, '$3.$2.$1'), 1)
  yaz('  ' + DesenDeğiştir('çok    fazla   boşluk', '\s+', ' '), 1)
  yaz('  ' + DesenDeğiştir('Kart: 4111 1111 1111 1111', '\d{4} ', '**** '), 1)
  yaz('  ' + DesenDeğiştir('fiyat 100 TL', '\d+', '$$$0'), 1)

  yaz('— Ayırma', 1)
  yaz('  ' + Metin(DesenAyır('elma, armut;kiraz  ,  üzüm', '\s*[,;]\s*')), 1)
  yaz('  ' + Metin(DesenAyır(GÜNLÜK, '; ')), 1)

  yaz('— Büyük/küçük harf ("i" seçeneği Türkçe i harflerini de eşler)', 1)
  yaz('  ' + Metin(BulHepsi('Işık ışık IŞIK İstanbul istanbul', 'ışık|istanbul', 'i')), 1)
  yaz('  ' + Metin(Eşleşir('ÇAĞRI', 'çağrı')) + ' / ' + Metin(Eşleşir('ÇAĞRI', 'çağrı', 'i')), 1)

  yaz('— Kullanıcı girdisini desende kullanmak', 1)
  yaz('  ' + DesenKaçış('1+1=2 (doğru mu?)'), 1)
  yaz('  ' + Metin(Eşleşir('sonuç: 1+1=2 (doğru mu?)', DesenKaçış('1+1=2 (doğru mu?)'))), 1)
bitir.
