birim ÜrünDeposu
{ Depolama katmanı: yalnızca SQL bilir. Kural da ekran da içermez.
  Başka bir veritabanına geçmek için Aç'a verilen adresi değiştirmek yeter. }
kullan Veritabanı

arayüz
  prosedür Aç(adres: metin)
  fonksiyon Hepsi: liste
  fonksiyon Bul(no: tamsayı): herhangi
  fonksiyon AdVarMı(ad: metin): mantıksal
  fonksiyon Ekle(ad: metin; fiyat: ondalık; adet: tamsayı): tamsayı
  prosedür AdetDeğiştir(no, fark: tamsayı)

uygulama

değişken
  vt: herhangi

prosedür Aç(adres: metin)
başla
  vt := Bağlan(adres)
  vt.Çalıştır('CREATE TABLE IF NOT EXISTS urun (no INTEGER PRIMARY KEY, ad TEXT NOT NULL UNIQUE, fiyat REAL NOT NULL, adet INTEGER NOT NULL)')
bitir

fonksiyon Hepsi: liste
başla
  dön vt.Sorgula('SELECT no, ad, fiyat, adet FROM urun ORDER BY no')
bitir

fonksiyon Bul(no: tamsayı): herhangi
başla
  dön vt.TekSatır('SELECT no, ad, fiyat, adet FROM urun WHERE no = ?', [no])
bitir

fonksiyon AdVarMı(ad: metin): mantıksal
başla
  dön vt.TekDeğer('SELECT COUNT(*) FROM urun WHERE ad = ?', [ad]) > 0
bitir

fonksiyon Ekle(ad: metin; fiyat: ondalık; adet: tamsayı): tamsayı
başla
  vt.Çalıştır('INSERT INTO urun (ad, fiyat, adet) VALUES (?, ?, ?)', [ad, fiyat, adet])
  dön vt.SonKimlik
bitir

prosedür AdetDeğiştir(no, fark: tamsayı)
başla
  vt.Çalıştır('UPDATE urun SET adet = adet + ? WHERE no = ?', [fark, no])
bitir

bitir.
