program İşAkışı
{ 5. adım: iş akışı. Bir duyuru metni yazılır, değerlendirilir; puan düşükse öneriye göre
  yeniden yazılır. Akış bir döngü içerir: yaz → değerlendir → (yetersizse) yaz → … }
kullan Akış, Model, Kalıp

fonksiyon TaslakYaz(durum: sözlük): sözlük
değişken istek: metin
başla
  istek := 'Şu konuda iki cümlelik bir duyuru yaz: ' + durum['konu']
  eğer durum['öneri'] <> '' ise istek := istek + #10 + 'Önceki taslak: ' + durum['taslak'] + #10 + 'Şunu düzelt: ' + durum['öneri']
  durum['taslak'] := Sor([Mesaj('user', istek)])
  durum['tur'] := durum['tur'] + 1
  dön durum
bitir

fonksiyon Değerlendir(durum: sözlük): sözlük
değişken karne: sözlük
başla
  karne := Yapılandır('Duyuruyu 1 ile 10 arasında puanla ve tek cümlelik öneri ver: ' + durum['taslak'],
                      ['puan': 'tamsayı', 'öneri': 'metin'])
  durum['puan'] := karne['puan']
  durum['öneri'] := karne['öneri']
  dön durum
bitir

{ Seçici: puan yeterliyse ya da üç tur dolduysa bitir, değilse yeniden yaz }
fonksiyon Sıradaki(durum: sözlük): metin
başla
  eğer (durum['puan'] >= 8) veya (durum['tur'] >= 3) ise dön SON
  dön 'yaz'
bitir

değişken
  sonuç: sözlük

başla
  Düğüm('yaz', TaslakYaz)
  Düğüm('değerlendir', Değerlendir)
  Kenar('yaz', 'değerlendir')
  SeçmeliKenar('değerlendir', Sıradaki)

  sonuç := AkışıÇalıştır('yaz', ['konu': 'Cuma günü ofis taşınıyor', 'taslak': '', 'öneri': '', 'puan': 0, 'tur': 0])
  yaz('İzlenen yol: ' + Birleştir(Akışİzi, ' → '), 1)
  yaz('Tur: ' + sonuç['tur'] + ', puan: ' + sonuç['puan'], 1)
  yaz(sonuç['taslak'], 1)
bitir.
