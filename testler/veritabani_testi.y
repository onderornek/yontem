program VeritabanıTesti
{ Veritabanı birimi: bellekteki SQLite veritabanıyla tablo, parametreli sorgu, işlem ve hata sınaması.
  Aynı program 'sqlite:dosya.db', 'postgres://…' ya da 'mysql://…' adresiyle de çalışır. }
kullan Veritabanı

değişken
  vt: herhangi
  satır: sözlük
  satırlar: liste
  n: tamsayı

prosedür Sına(ad: metin; iş: herhangi)
başla
  dene
    iş()
    yaz(ad + ': hata bekleniyordu', 1)
  yakala (h)
    yaz(ad + ' → ' + h.mesaj, 1)
  bitir
bitir

başla
  vt := Bağlan('sqlite::bellek:')
  yaz(vt, 1)
  yaz(vt.Tür + ' ' + Metin(vt.Açık), 1)
  yaz(vt.Çalıştır('CREATE TABLE urun (no INTEGER PRIMARY KEY, ad TEXT NOT NULL UNIQUE, fiyat REAL, adet INTEGER, not_ TEXT)'), 1)
  yaz(vt.Çalıştır('INSERT INTO urun (ad, fiyat, adet) VALUES (?, ?, ?)', ['defter', 12.5, 40]), 1)
  yaz(vt.SonKimlik, 1)
  vt.Çalıştır('INSERT INTO urun (ad, fiyat, adet, not_) VALUES (?, ?, ?, ?)', ['kalem', 4, 120, boş])
  vt.Çalıştır('INSERT INTO urun (ad, fiyat, adet) VALUES (?, ?, ?)', ['çanta; DROP TABLE urun; --', 349.9, 3])
  yaz(vt.SonKimlik, 1)

  satırlar := vt.Sorgula('SELECT no, ad, fiyat, adet, not_ FROM urun WHERE fiyat > ? ORDER BY no', [5])
  yaz(Uzunluk(satırlar), 1)
  satırlar içindeki her satır için yaz(satır, 1)
  satır := vt.TekSatır('SELECT ad, fiyat * adet AS tutar FROM urun WHERE no = ?', [2])
  yaz(satır['ad'] + ': ' + satır['tutar'] + ' (' + Tür(satır['tutar']) + ')', 1)
  yaz(vt.TekSatır('SELECT * FROM urun WHERE no = ?', [99]), 1)
  yaz(vt.TekDeğer('SELECT COUNT(*) FROM urun'), 1)
  yaz(Tür(vt.TekDeğer('SELECT COUNT(*) FROM urun')) + ' ' + Tür(vt.TekDeğer('SELECT AVG(fiyat) FROM urun')) + ' ' + Tür(vt.TekDeğer('SELECT ad FROM urun WHERE no = 1')), 1)
  yaz(vt.TekDeğer('SELECT ? || ? ', ['Türkçe ', 'çğıöşü']), 1)
  yaz(vt.TekDeğer('SELECT ?', [doğru]), 1)
  yaz(vt.TekDeğer('SELECT ?', [9007199254740993]), 1)
  yaz(vt.TekDeğer('SELECT ad FROM urun WHERE no = 99'), 1)
  yaz(vt.Çalıştır('UPDATE urun SET adet = adet + ? WHERE fiyat < ?', [10, 100]), 1)
  yaz(vt.Çalıştır('DELETE FROM urun WHERE no = ?', [99]), 1)
  yaz(vt.Çalıştır('CREATE INDEX urun_ad ON urun (ad)'), 1)

  { İşlem: geri alınan değişiklik kalıcı olmaz }
  vt.İşlemBaşlat
  vt.Çalıştır('UPDATE urun SET adet = 0')
  yaz(vt.TekDeğer('SELECT SUM(adet) FROM urun'), 1)
  vt.GeriAl
  yaz(vt.TekDeğer('SELECT SUM(adet) FROM urun'), 1)
  vt.İşlemBaşlat
  vt.Çalıştır('DELETE FROM urun WHERE no = ?', [3])
  vt.Onayla
  yaz(vt.TekDeğer('SELECT COUNT(*) FROM urun'), 1)

  { SqlAdı: tablo ve sütun adları parametre olamaz; denetlenip tırnaklanır }
  yaz(SqlAdı('urun') + ' ' + SqlAdı('ürün_adı'), 1)
  yaz(vt.TekDeğer('SELECT COUNT(*) FROM ' + SqlAdı('urun')), 1)

  Sına('tablo yok', prosedür başla vt.Sorgula('SELECT * FROM yok') bitir)
  Sına('sözdizimi', prosedür başla vt.Çalıştır('SELEKT 1') bitir)
  Sına('benzersizlik', prosedür başla vt.Çalıştır('INSERT INTO urun (ad) VALUES (?)', ['defter']) bitir)
  Sına('parametre tipi', prosedür başla vt.Sorgula('SELECT ?', [[1, 2]]) bitir)
  Sına('parametre liste değil', prosedür başla vt.Sorgula('SELECT ?', 5) bitir)
  Sına('sql metin değil', prosedür başla vt.Sorgula(5) bitir)
  Sına('boş sql', prosedür başla vt.Çalıştır('  ') bitir)
  Sına('kötü ad', prosedür başla SqlAdı('urun; DROP') bitir)
  Sına('üye yok', prosedür başla vt.Sil('x') bitir)
  Sına('adres', prosedür başla Bağlan('magaza.db') bitir)
  Sına('tür', prosedür başla Bağlan('oracle://x') bitir)
  Sına('sqlite boş', prosedür başla Bağlan('sqlite:') bitir)
  Sına('postgres biçimi', prosedür başla Bağlan('postgres:sunucu') bitir)
  vt.Kapat
  yaz(vt, 1)
  vt.Kapat
  Sına('kapalı', prosedür başla vt.Sorgula('SELECT 1') bitir)
bitir.
