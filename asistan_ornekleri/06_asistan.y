program Asistan
{ Hepsi bir arada: kendi belgelerinizle çalışan yerel asistan.

    yontem 06_asistan.y belgeler/izin.md belgeler/kargo.md belgeler/iade.md

  Verilen dosyalar hafızaya eklenir (asistan.db), sonra sorularınız beklenir.
  Dosya vermeden çalıştırırsanız önceki hafıza kullanılır. Çıkmak için boş satır ya da "çık". }
kullan Model, Kalıp, Hafıza, Akış, Sistem

{ Soru belgelerle mi ilgili, yoksa sohbet mi? }
fonksiyon Yönlendir(durum: sözlük): sözlük
başla
  durum['tür'] := Yapılandır('Kullanıcının iletisi şirket belgelerinden yanıtlanacak bir soru mu (belge), '
                             + 'yoksa selamlaşma ya da genel sohbet mi (sohbet)? İleti: ' + durum['soru'],
                             ['tür': 'belge|sohbet'])['tür']
  dön durum
bitir

fonksiyon Ara(durum: sözlük): sözlük
başla
  durum['bulunanlar'] := HafızadaAra(durum['soru'], 2)
  dön durum
bitir

fonksiyon Yanıtla(durum: sözlük): sözlük
değişken
  bağlam: metin
  b: sözlük
  n: tamsayı
başla
  bağlam := ''
  n := 0
  durum['bulunanlar'] içindeki her b için
  başla
    n := n + 1
    bağlam := bağlam + '[' + n + '] (' + b['kaynak'] + ') ' + b['metin'] + #10 + #10
  bitir
  durum['yanıt'] := Sor([Mesaj('system', 'Yalnızca verilen bağlama dayanarak, kısa ve Türkçe yanıt ver. '
                                        + 'Yanıt bağlamda yoksa "Belgelerde bulamadım." de. Kullandığın parçanın numarasını [1] gibi belirt.'),
                         Mesaj('user', 'Bağlam:' + #10 + bağlam + 'Soru: ' + durum['soru'])])
  dön durum
bitir

fonksiyon Sohbet(durum: sözlük): sözlük
başla
  durum['yanıt'] := Sor([Mesaj('system', 'Yardımsever bir asistansın. Kısa ve Türkçe yanıt ver.'),
                         Mesaj('user', durum['soru'])])
  durum['bulunanlar'] := []
  dön durum
bitir

değişken
  dosya, soru: metin
  durum, b: sözlük
  kaynaklar: liste

başla
  HafızaAç(Ortam('ASISTAN_HAFIZASI', 'sqlite:asistan.db'))
  Argümanlar() içindeki her dosya için
    yaz(dosya + ': ' + HafızayaEkle(dosya, DosyaOku(dosya)) + ' parça eklendi', 1)
  yaz('Hafızada ' + HafızaSayısı + ' parça var. Sorunuzu yazın (çıkmak için boş satır).', 1)

  Düğüm('yönlendir', Yönlendir)
  Düğüm('ara', Ara)
  Düğüm('yanıtla', Yanıtla)
  Düğüm('sohbet', Sohbet)
  SeçmeliKenar('yönlendir', fonksiyon(d) başla eğer d['tür'] = 'belge' ise dön 'ara'; dön 'sohbet' bitir)
  Kenar('ara', 'yanıtla')

  doğru iken
  başla
    yaz('> ')
    dene
      oku(soru, 1)
    yakala (h)
      soru := ''
    bitir
    soru := Kırp(soru)
    eğer (soru = '') veya (soru = 'çık') ise kır
    dene
      durum := AkışıÇalıştır('yönlendir', ['soru': soru])
      yaz(durum['yanıt'], 1)
      kaynaklar := []
      durum['bulunanlar'] içindeki her b için
        eğer değil (b['kaynak'] içinde kaynaklar) ise Ekle(kaynaklar, b['kaynak'])
      eğer Uzunluk(kaynaklar) > 0 ise yaz('  Bakılan belgeler: ' + Birleştir(kaynaklar, ', '), 1)
    yakala (h)
      yaz('Yanıt alınamadı: ' + h.mesaj, 1)
    bitir
  bitir
  HafızaKapat
  yaz('Görüşmek üzere.', 1)
bitir.
