program VtTesti
{ Veritabanı biriminin gerçek sunucularla sınaması. Adres argüman olarak verilir:
    yontem vt_testleri/vt_testi.y sqlite:deneme.db
    yontem vt_testleri/vt_testi.y postgres://kullanıcı:parola@localhost/veritabanı
    yontem vt_testleri/vt_testi.y mysql://kullanıcı:parola@localhost/veritabanı
  js/betikler/vt_testi.js bu programı iki çalışma zamanında çalıştırır ve çıktıları karşılaştırır. }
kullan Veritabanı, Sistem

değişken
  vt: herhangi
  satır: sözlük
  kimlikSütunu: metin
  n: tamsayı

başla
  eğer Uzunluk(Argümanlar) = 0 ise
  başla
    yaz('Kullanım: yontem vt_testi.y <veritabanı adresi>', 1)
    dön
  bitir
  vt := Bağlan(Argümanlar[0])
  yaz('tür: ' + vt.Tür, 1)
  vt.Çalıştır('DROP TABLE IF EXISTS yontem_urun')
  vt.Tür değerine göre
    'postgres': kimlikSütunu := 'no SERIAL PRIMARY KEY'
    'mysql': kimlikSütunu := 'no INTEGER PRIMARY KEY AUTO_INCREMENT'
    değilse kimlikSütunu := 'no INTEGER PRIMARY KEY'
  bitir
  vt.Çalıştır('CREATE TABLE yontem_urun (' + kimlikSütunu + ', ad VARCHAR(100) NOT NULL UNIQUE, fiyat DOUBLE PRECISION, tutar NUMERIC(10,2), adet BIGINT, aciklama TEXT)')
  yaz(vt.Çalıştır('INSERT INTO yontem_urun (ad, fiyat, tutar, adet) VALUES (?, ?, ?, ?)', ['defter', 12.5, 99.9, 40]), 1)
  yaz(vt.Çalıştır('INSERT INTO yontem_urun (ad, fiyat, tutar, adet, aciklama) VALUES (?, ?, ?, ?, ?)', ['kalem ''uçlu'' ? %s $1 :p1', 4, 0.5, 9007199254740993, boş]), 1)
  yaz(vt.Çalıştır('INSERT INTO yontem_urun (ad, fiyat, tutar, adet, aciklama) VALUES (?, ?, ?, ?, ?)', ['çanta; DROP TABLE yontem_urun; --', 349.9, 1000, 3, 'Türkçe: çğıöşü İI']), 1)
  vt.Sorgula('SELECT no, ad, fiyat, tutar, adet, aciklama FROM yontem_urun WHERE fiyat >= ? AND ad <> ''?'' ORDER BY no', [4]) içindeki her satır için yaz(satır, 1)
  satır := vt.TekSatır('SELECT no, fiyat, tutar, adet FROM yontem_urun WHERE ad = ?', ['defter'])
  yaz(Tür(satır['no']) + ' ' + Tür(satır['fiyat']) + ' ' + Tür(satır['tutar']) + ' ' + Tür(satır['adet']), 1)
  yaz(vt.TekDeğer('SELECT COUNT(*) FROM yontem_urun'), 1)
  yaz(vt.TekDeğer('SELECT ad FROM yontem_urun WHERE no = ?', [99]), 1)
  yaz(vt.TekDeğer('SELECT adet FROM yontem_urun WHERE ad LIKE ?', ['kalem%']), 1)
  yaz(vt.Çalıştır('UPDATE yontem_urun SET adet = adet + ? WHERE fiyat < ?', [10, 100]), 1)
  yaz(vt.Çalıştır('DELETE FROM yontem_urun WHERE no = ?', [99]), 1)
  vt.İşlemBaşlat
  vt.Çalıştır('DELETE FROM yontem_urun')
  yaz(vt.TekDeğer('SELECT COUNT(*) FROM yontem_urun'), 1)
  vt.GeriAl
  yaz(vt.TekDeğer('SELECT COUNT(*) FROM yontem_urun'), 1)
  vt.İşlemBaşlat
  vt.Çalıştır('DELETE FROM yontem_urun WHERE ad = ?', ['defter'])
  vt.Onayla
  yaz(vt.TekDeğer('SELECT COUNT(*) FROM yontem_urun'), 1)
  eğer vt.Tür = 'postgres' ise
  başla
    yaz(vt.TekDeğer('INSERT INTO yontem_urun (ad) VALUES (?) RETURNING no', ['silgi']), 1)
    satır := vt.TekSatır('SELECT TRUE AS evet, NULL::int AS yok, DATE ''2026-11-11'' AS gun, TIMESTAMP ''2026-11-11 10:30:00'' AS an, 1.50::numeric AS sayi, ''a''::text || ? AS m', ['b'])
    yaz(satır, 1)
  bitir
  değilse
  başla
    vt.Çalıştır('INSERT INTO yontem_urun (ad) VALUES (?)', ['silgi'])
    yaz(vt.SonKimlik, 1)
  bitir
  dene
    vt.Çalıştır('INSERT INTO yontem_urun (ad) VALUES (?)', ['silgi'])
    yaz('benzersizlik hatası bekleniyordu', 1)
  yakala (h)
    yaz('benzersizlik hatası yakalandı: ' + Metin(Konum('Veritabanı hatası: ', h.mesaj) = 1), 1)
  bitir
  dene
    vt.Sorgula('SELECT * FROM yontem_olmayan_tablo')
  yakala (h)
    yaz('olmayan tablo hatası yakalandı', 1)
  bitir
  yaz(vt.TekDeğer('SELECT COUNT(*) FROM yontem_urun'), 1)
  vt.Çalıştır('DROP TABLE yontem_urun')
  vt.Kapat
  yaz('TAMAM', 1)
bitir.
