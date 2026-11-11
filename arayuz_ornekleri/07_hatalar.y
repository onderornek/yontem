program ArayüzHataları
{ Pencere ve Mobil birimlerinin hata mesajları ve sınır durumları (test programı). }
kullan Pencere, Mobil

değişken d, e, k, s, t, y_: herhangi

prosedür Sına(ad: metin; p: herhangi)
başla
  dene
    p()
    yaz(ad + ': hata yok', 1)
  yakala (h)
    yaz(ad + ': ' + h.mesaj, 1)
  bitir
bitir

başla
  d := Düğme('Tamam'); e := Etiket('Merhaba'); k := Kaydırıcı(1, 10, 5)
  s := SeçimKutusu(['bir', 'iki']); t := Tuval(100, 50); y_ := Yatay()
  yaz(Metin(d) + ' ' + Metin(e) + ' ' + Metin(k), 1)
  Sına('etiket üyesi', prosedür başla yaz(e.Değer, 1) bitir)
  Sına('düğme metni sayı', prosedür başla d.Metin := 42; yaz(d.Metin, 1) bitir)
  Sına('etkin metin', prosedür başla d.Etkin := 'evet' bitir)
  Sına('kaydırıcı sınırı', prosedür başla k.Değer := 99; yaz(k.Değer, 1) bitir)
  Sına('seçili dışı', prosedür başla s.Seçili := 5 bitir)
  Sına('seçenek yok', prosedür başla Seç(s, 'üç') bitir)
  Sına('seçenekler', prosedür başla s.Seçenekler := ['a']; yaz(s.SeçiliMetin, 1) bitir)
  Sına('tıkla etiket', prosedür başla Tıkla(e) bitir)
  Sına('gir düğme', prosedür başla Gir(d, 'x') bitir)
  Sına('yerleştir sayı', prosedür başla Yerleştir(5) bitir)
  Sına('kendi içine', prosedür başla y_.Ekle(y_) bitir)
  Sına('işleyici değil', prosedür başla d.Tıklanınca(3) bitir)
  Sına('tuval sayı', prosedür başla t.Çizgi(0, 0, 'a', 1) bitir)
  Sına('argüman', prosedür başla Düğme() bitir)
  Sına('kaydırıcı ters', prosedür başla Kaydırıcı(10, 1) bitir)
  Sına('sakla sözlük', prosedür başla Sakla('x', ['a': 1]) bitir)
  Sına('yön', prosedür başla BenzetimYön('çapraz') bitir)
  Sına('atama yok', prosedür başla t.Genişlik := 5 bitir)
  d.Etkin := yanlış
  d.Tıklanınca(prosedür başla yaz('tıklandı', 1) bitir)
  Tıkla(d)
  d.Etkin := doğru
  Tıkla(d)
  yaz(Getir('yok', 'varsayılan') + ' ' + Metin(Getir('yok')), 1)
  Sakla('liste', [1, 2.5, 'üç', doğru]); yaz(Getir('liste'), 1)
  Unut('liste'); yaz(Getir('liste'), 1)
  Titreşim; EkranYönü; yaz(EkranYönü, 1)
  YönDeğişince(prosedür(y: metin) başla yaz('yön: ' + y, 1) bitir)
  BenzetimYön('yatay'); yaz(EkranYönü, 1)
  Yerleştir(e); Temizle; yaz(Ağaç, 1)
bitir.
