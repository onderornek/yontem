program DüzgünÇıktı
{ 3. adım: modelden serbest metin yerine, programın kullanabileceği tipli veri almak. }
kullan Kalıp

değişken
  kişi, yorum: sözlük
  etiket: metin

başla
  { Kalıp: hangi alanlar, hangi tipte }
  kişi := Yapılandır('Şu cümledeki kişiyi çıkar: "Ayşe Demir 34 yaşında, İzmir''de yaşıyor; satranç ve yüzmeyi seviyor."',
                     ['ad': 'metin', 'yaş': 'tamsayı', 'şehir': 'metin', 'hobiler': ['metin']])
  yaz(kişi['ad'] + ', ' + kişi['yaş'] + ', ' + kişi['şehir'], 1)
  kişi['hobiler'] içindeki her etiket için yaz('  hobi: ' + etiket, 1)
  yaz('Beş yıl sonra: ' + (kişi['yaş'] + 5), 1)

  { Seçenekli alan: model yalnızca bu üç değerden birini verebilir }
  yorum := Yapılandır('Yorumu değerlendir: "Kargo geç geldi ama ürün çok kaliteli."',
                      ['duygu': 'olumlu|olumsuz|karışık', 'özet': 'metin'])
  yaz(yorum['duygu'] + ': ' + yorum['özet'], 1)

  { Model kalıba uymayan bir yanıt verirse Yapılandır hatayı modele bildirir ve yeniden dener }
  kişi := Yapılandır('Şu cümledeki kişiyi çıkar: "Mehmet otuz dört yaşında."', ['ad': 'metin', 'yaş': 'tamsayı'])
  yaz(kişi, 1)

  { Denemeler tükenirse KalıpHatası fırlatılır }
  dene
    Yapılandır('Bu isteğe hep bozuk yanıt gelir.', ['sayı': 'tamsayı'], 2)
  yakala (h)
    yaz(h.tür + ': ' + h.mesaj, 1)
  bitir
bitir.
