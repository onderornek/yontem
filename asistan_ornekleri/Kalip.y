birim Kalıp
{ Modelden düzgün, tipli çıktı almak. Kısa bir kalıp yazılır, birim onu JSON Şemasına çevirir,
  modelin yanıtını çözer ve şemaya uyup uymadığını denetler. Uymazsa hatayı modele bildirip yeniden dener.

  Kalıp yazımı:
    'metin' 'tamsayı' 'ondalık' 'mantıksal'     tek değer
    'olumlu|olumsuz|nötr'                        yalnızca bu seçeneklerden biri
    ['metin']                                    liste (tek elemanı, elemanların kalıbıdır)
    ['ad': 'metin', 'yaş': 'tamsayı']            nesne; bütün alanlar zorunludur }
kullan Model, Veri

arayüz
  fonksiyon ŞemaYap(kalıp: herhangi): sözlük
  fonksiyon ŞemaHatası(değer: herhangi; şema: sözlük; yol: metin = 'yanıt'): metin
  fonksiyon Yapılandır(istek: metin; kalıp: herhangi; deneme: tamsayı = 3): herhangi

uygulama

fonksiyon ŞemaYap(kalıp: herhangi): sözlük
değişken
  özellikler: sözlük
  ad: metin
başla
  eğer Tür(kalıp) = 'sözlük' ise
  başla
    özellikler := [:]
    Anahtarlar(kalıp) içindeki her ad için özellikler[ad] := ŞemaYap(kalıp[ad])
    dön ['type': 'object', 'properties': özellikler, 'required': Anahtarlar(kalıp)]
  bitir
  eğer Tür(kalıp) = 'liste' ise
  başla
    eğer Uzunluk(kalıp) <> 1 ise fırlat Hata('Liste kalıbı tek elemanlı olmalı: [''metin''] gibi', 'KalıpHatası')
    dön ['type': 'array', 'items': ŞemaYap(kalıp[0])]
  bitir
  eğer Tür(kalıp) <> 'metin' ise fırlat Hata('Geçersiz kalıp: ' + kalıp, 'KalıpHatası')
  eğer Konum('|', kalıp) > 0 ise dön ['type': 'string', 'enum': Ayır(kalıp, '|')]
  eğer kalıp = 'metin' ise dön ['type': 'string']
  eğer (kalıp = 'tamsayı') veya (kalıp = 'tamsayi') ise dön ['type': 'integer']
  eğer (kalıp = 'ondalık') veya (kalıp = 'ondalik') ise dön ['type': 'number']
  eğer (kalıp = 'mantıksal') veya (kalıp = 'mantiksal') ise dön ['type': 'boolean']
  fırlat Hata('Bilinmeyen kalıp tipi: ' + kalıp, 'KalıpHatası')
bitir

{ Değer şemaya uyuyorsa boş metin, uymuyorsa ilk uyumsuzluğu anlatan bir cümle döndürür. }
fonksiyon ŞemaHatası(değer: herhangi; şema: sözlük; yol: metin = 'yanıt'): metin
değişken
  beklenen, gelen, ad, alt: metin
  i: tamsayı
başla
  beklenen := şema['type']
  gelen := Tür(değer)
  eğer beklenen = 'object' ise
  başla
    eğer gelen <> 'sözlük' ise dön yol + ': nesne bekleniyordu, ' + gelen + ' geldi'
    şema['required'] içindeki her ad için
    başla
      eğer değil (ad içinde değer) ise dön yol + ': ''' + ad + ''' alanı eksik'
      alt := ŞemaHatası(değer[ad], şema['properties'][ad], yol + '.' + ad)
      eğer alt <> '' ise dön alt
    bitir
    dön ''
  bitir
  eğer beklenen = 'array' ise
  başla
    eğer gelen <> 'liste' ise dön yol + ': liste bekleniyordu, ' + gelen + ' geldi'
    i := 0
    i < Uzunluk(değer) iken
    başla
      alt := ŞemaHatası(değer[i], şema['items'], yol + '[' + i + ']')
      eğer alt <> '' ise dön alt
      i := i + 1
    bitir
    dön ''
  bitir
  eğer beklenen = 'string' ise
  başla
    eğer gelen <> 'metin' ise dön yol + ': metin bekleniyordu, ' + gelen + ' geldi'
    eğer ('enum' içinde şema) ve değil (değer içinde şema['enum']) ise
      dön yol + ': ''' + değer + ''' geçerli değil; seçenekler: ' + Birleştir(şema['enum'], ', ')
    dön ''
  bitir
  eğer (beklenen = 'integer') ve (gelen <> 'tamsayı') ise dön yol + ': tamsayı bekleniyordu, ' + gelen + ' geldi'
  eğer (beklenen = 'number') ve (gelen <> 'tamsayı') ve (gelen <> 'ondalık') ise dön yol + ': sayı bekleniyordu, ' + gelen + ' geldi'
  eğer (beklenen = 'boolean') ve (gelen <> 'mantıksal') ise dön yol + ': mantıksal bekleniyordu, ' + gelen + ' geldi'
  dön ''
bitir

{ İsteği modele gönderir; kalıba uyan değeri (sözlük, liste ya da tek değer) döndürür. }
fonksiyon Yapılandır(istek: metin; kalıp: herhangi; deneme: tamsayı = 3): herhangi
değişken
  şema: sözlük
  mesajlar: liste
  ham, sorun: metin
  değer: herhangi
  i: tamsayı
başla
  şema := ŞemaYap(kalıp)
  mesajlar := [Mesaj('system', 'Yalnızca şu JSON şemasına uyan bir JSON değeri döndür, başka hiçbir şey yazma: ' + JSONYap(şema)),
               Mesaj('user', istek)]
  sorun := ''
  1'den deneme'ye kadar her i için
  başla
    ham := Sor(mesajlar, şema)
    dene
      değer := JSONÇöz(ham)
      sorun := ŞemaHatası(değer, şema)
    yakala (h)
      sorun := 'yanıt geçerli bir JSON değil'
    bitir
    eğer sorun = '' ise dön değer
    Ekle(mesajlar, Mesaj('assistant', ham))
    Ekle(mesajlar, Mesaj('user', 'Yanıtın geçersiz: ' + sorun + '. Yalnızca şemaya uyan JSON döndür.'))
  bitir
  fırlat Hata('Model ' + deneme + ' denemede kalıba uyan yanıt vermedi (' + sorun + ')', 'KalıpHatası')
bitir

bitir.
