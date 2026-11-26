program AkışTesti
{ Ağ.HttpAkış testi. Yerel bir sınama sunucusuna bağlanır; sunucunun adresi ilk argümandır.
  Doğrudan değil, 'node js/betikler/ag_testi.js' ile çalıştırılır (sunucuyu o başlatır). }
kullan Ağ, Sistem

değişken
  taban: metin
  parçalar: liste
  olay, h: herhangi
  t0, ilk: ondalık
  n: tamsayı

{ akışı süzen bir akış: yalnızca 'delta' olaylarının metni }
fonksiyon Metinler(a: akış): akış
başla
  a içindeki her o için
    eğer Tür(o) = 'sözlük' ise
      eğer o['type'] = 'delta' ise üret o['metin']
bitir

başla
  eğer Uzunluk(Argümanlar()) = 0 ise
  başla
    yaz('Bu test bir sınama sunucusu gerektirir: node js/betikler/ag_testi.js', 1)
    dön
  bitir
  taban := Argümanlar()[0]

  yaz('-- text/event-stream', 1)
  HttpAkış(taban + '/sse') içindeki her olay için
    yaz(Tür(olay) + ' ' + Metin(olay), 1)
  yaz(Liste(Metinler(HttpAkış(taban + '/sse'))), 1)

  yaz('-- ndjson', 1)
  HttpAkış(taban + '/ndjson') içindeki her i, olay için
    yaz(Metin(i) + ' ' + Metin(olay), 1)

  yaz('-- düz metin: parçalar birleşince', 1)
  parçalar := Liste(HttpAkış(taban + '/duz'))
  yaz(Birleştir(parçalar, ''), 1)

  yaz('-- gövdeli istek POST olarak gider', 1)
  HttpAkış(taban + '/yanki-akis', 'soru', ['X-Deneme': 'evet']) içindeki her olay için yaz(olay, 1)
  HttpAkış(taban + '/yanki-akis') içindeki her olay için yaz(olay, 1)

  yaz('-- bırakılan akış bağlantıyı kapatır', 1)
  HttpAl(taban + '/kapanan')       { sayacı sıfırlar }
  HttpAkış(taban + '/sonsuz') içindeki her olay için
  başla
    yaz(olay, 1)
    eğer olay = '3' ise kır
  bitir
  Bekle(300)
  yaz('kapanan bağlantı: ' + HttpAl(taban + '/kapanan')['gövde'], 1)

  yaz('-- ilk değer, yanıt bitmeden gelir', 1)
  t0 := Zaman
  HttpAkış(taban + '/ilk-hemen') içindeki her olay için
  başla
    eğer olay = 'ilk' ise ilk := Zaman - t0
    yaz(olay, 1)
  bitir
  yaz('ilk değer 0,5 sn içinde: ' + Metin(ilk < 0.5) + ', bütünü 0,7 sn sonra: ' + Metin(Zaman - t0 > 0.7), 1)

  yaz('-- yinelenmeyen akış bağlanmaz', 1)
  olay := HttpAkış('http://127.0.0.1:1/')
  yaz(Tür(olay), 1)

  yaz('-- hatalar', 1)
  dene
    olay içindeki her x için yaz(x, 1)
  yakala (h)
    yaz(Değiştir(h.mesaj, taban, '<sunucu>'), 1)
  bitir
  dene
    HttpAkış(taban + '/durum/404') içindeki her x için yaz(x, 1)
  yakala (h)
    yaz(Değiştir(h.mesaj, taban, '<sunucu>'), 1)
  bitir
  n := 0
  dene
    HttpAkış(taban + '/takilan', boş, boş, 1) içindeki her x için
    başla
      yaz(x, 1)
      n := n + 1
    bitir
  yakala (h)
    yaz(Değiştir(h.mesaj, taban, '<sunucu>'), 1)
  bitir
  dene
    HttpAkış('ftp://x')
  yakala (h)
    yaz(Değiştir(h.mesaj, taban, '<sunucu>'), 1)
  bitir
bitir.
