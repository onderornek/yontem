program VeritabanıÖrneği
{ Veritabanı birimi: tablo oluşturma, parametreli sorgular ve işlem (transaction).
  'sqlite::bellek:' geçici bir veritabanıdır; kalıcı dosya için 'sqlite:magaza.db' yazın. }
kullan Veritabanı

değişken
  vt: herhangi
  satır: sözlük

başla
  vt := Bağlan('sqlite::bellek:')
  vt.Çalıştır('CREATE TABLE urun (no INTEGER PRIMARY KEY, ad TEXT NOT NULL UNIQUE, fiyat REAL, adet INTEGER)')
  vt.Çalıştır('INSERT INTO urun (ad, fiyat, adet) VALUES (?, ?, ?)', ['defter', 12.5, 40])
  vt.Çalıştır('INSERT INTO urun (ad, fiyat, adet) VALUES (?, ?, ?)', ['kalem', 4, 120])
  yaz('Son eklenen ürünün numarası: ' + vt.SonKimlik, 1)

  { Değerler SQL metnine eklenmez, '?' ile verilir: kötü niyetli girdi yalnızca bir metin olarak kalır }
  vt.Çalıştır('INSERT INTO urun (ad, fiyat, adet) VALUES (?, ?, ?)', ['x''); DROP TABLE urun; --', 1, 1])
  yaz('Ürün sayısı: ' + vt.TekDeğer('SELECT COUNT(*) FROM urun'), 1)

  vt.Sorgula('SELECT ad, fiyat * adet AS tutar FROM urun WHERE fiyat > ? ORDER BY ad', [3]) içindeki her satır için
    yaz(satır['ad'] + ': ' + satır['tutar'], 1)

  { İşlem: iki değişiklik ya birlikte kalıcı olur ya da hiçbiri }
  vt.İşlemBaşlat
  vt.Çalıştır('UPDATE urun SET adet = adet - ? WHERE ad = ?', [5, 'defter'])
  vt.Çalıştır('UPDATE urun SET adet = adet + ? WHERE ad = ?', [5, 'kalem'])
  vt.Onayla
  satır := vt.TekSatır('SELECT ad, adet FROM urun WHERE ad = ?', ['defter'])
  yaz(satır, 1)

  dene
    vt.Çalıştır('INSERT INTO urun (ad) VALUES (?)', ['defter'])
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
  vt.Kapat
bitir.
