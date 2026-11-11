program ÜçKatman
{ Sunum katmanı: HTTP isteklerini iş katmanına çevirir, sonucu JSON olarak döndürür.
  Kural bilmez, SQL bilmez; yalnızca Ürünİşleri birimini kullanır.
  Sunucu olarak çalıştırmak için:  yontem 10_uc_katman.y dinle }
kullan Sunucu, Veri, Sistem, Ürünİşleri, ÜrünDeposu

değişken
  y: sözlük

{ İş katmanının hatalarını HTTP durum kodlarına çevirir }
fonksiyon HataYanıtı(h: herhangi): herhangi
başla
  eğer h.tür = 'KuralHatası' ise dön JsonYanıt(['hata': h.mesaj], 400)
  eğer h.tür = 'BulunamadıHatası' ise dön JsonYanıt(['hata': h.mesaj], 404)
  fırlat h
bitir

fonksiyon Listele(istek: sözlük): herhangi
başla
  dön JsonYanıt(['ürünler': ÜrünListesi, 'stokDeğeri': StokDeğeri])
bitir

fonksiyon YeniÜrün(istek: sözlük): herhangi
değişken v: sözlük
başla
  dene
    v := JSONÇöz(istek['gövde'])
    dön JsonYanıt(ÜrünEkle(v['ad'], v['fiyat'], v['adet']), 201)
  yakala (h)
    dön HataYanıtı(h)
  bitir
bitir

fonksiyon Satış(istek: sözlük): herhangi
başla
  dene
    dön JsonYanıt(Sat(Tamsayı(istek['parametreler']['no']), Tamsayı(istek['sorgu'].Al('adet', '1'))))
  yakala (h)
    dön HataYanıtı(h)
  bitir
bitir

prosedür Göster(başlık: metin; y: sözlük)
başla
  yaz(başlık + ' → ' + y['durum'] + ' ' + y['gövde'], 1)
bitir

başla
  Yol('GET', '/urunler', Listele)
  Yol('POST', '/urunler', YeniÜrün)
  Yol('POST', '/urunler/:no/sat', Satış)

  eğer Uzunluk(Argümanlar) > 0 ise
  başla
    Aç('sqlite:magaza.db')
    Dinle(8080)
    dön
  bitir

  { Argümansız çalıştırınca: bellekteki veritabanıyla, ağ olmadan bir tur }
  Aç('sqlite::bellek:')
  Göster('ekle', İstekİşle('POST', '/urunler', '{"ad": "defter", "fiyat": 12.5, "adet": 40}'))
  Göster('ekle', İstekİşle('POST', '/urunler', '{"ad": " kalem ", "fiyat": 4.0, "adet": 3}'))
  Göster('aynı ad', İstekİşle('POST', '/urunler', '{"ad": "defter", "fiyat": 1.0, "adet": 1}'))
  Göster('kötü fiyat', İstekİşle('POST', '/urunler', '{"ad": "silgi", "fiyat": 0.0, "adet": 1}'))
  Göster('sat', İstekİşle('POST', '/urunler/1/sat?adet=4'))
  Göster('stok yetersiz', İstekİşle('POST', '/urunler/2/sat?adet=5'))
  Göster('ürün yok', İstekİşle('POST', '/urunler/9/sat'))
  Göster('liste', İstekİşle('GET', '/urunler'))
bitir.
