birim Ürünİşleri
{ İş katmanı: kurallar burada. HTTP'yi de SQL'i de bilmez; depolama katmanını çağırır,
  kural çiğnenirse açıklayıcı bir hata fırlatır. }
kullan ÜrünDeposu

arayüz
  fonksiyon ÜrünListesi: liste
  fonksiyon ÜrünEkle(ad: metin; fiyat: ondalık; adet: tamsayı): sözlük
  fonksiyon Sat(no, adet: tamsayı): sözlük
  fonksiyon StokDeğeri: ondalık

uygulama

fonksiyon ÜrünListesi: liste
başla
  dön Hepsi
bitir

fonksiyon ÜrünEkle(ad: metin; fiyat: ondalık; adet: tamsayı): sözlük
değişken temiz: metin
başla
  temiz := Kırp(ad)
  eğer Uzunluk(temiz) < 2 ise fırlat Hata('Ürün adı en az 2 harf olmalı', 'KuralHatası')
  eğer fiyat <= 0 ise fırlat Hata('Fiyat sıfırdan büyük olmalı', 'KuralHatası')
  eğer adet < 0 ise fırlat Hata('Adet eksi olamaz', 'KuralHatası')
  eğer AdVarMı(temiz) ise fırlat Hata('Bu adda bir ürün zaten var: ' + temiz, 'KuralHatası')
  dön Bul(Ekle(temiz, fiyat, adet))
bitir

fonksiyon Sat(no, adet: tamsayı): sözlük
değişken ürün: herhangi
başla
  ürün := Bul(no)
  eğer ürün = boş ise fırlat Hata('Böyle bir ürün yok', 'BulunamadıHatası')
  eğer adet < 1 ise fırlat Hata('Satış adedi en az 1 olmalı', 'KuralHatası')
  eğer ürün['adet'] < adet ise fırlat Hata('Stok yetersiz: ' + ürün['adet'] + ' adet var', 'KuralHatası')
  AdetDeğiştir(no, -adet)
  dön ['ürün': ürün['ad'], 'adet': adet, 'tutar': ürün['fiyat'] * adet, 'kalan': ürün['adet'] - adet]
bitir

fonksiyon StokDeğeri: ondalık
değişken
  toplam: ondalık
  ü: sözlük
başla
  toplam := 0
  Hepsi içindeki her ü için toplam := toplam + ü['fiyat'] * ü['adet']
  dön toplam
bitir

bitir.
