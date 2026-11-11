program TransformerBloğu
{ Bir Transformer bloğu dört parçadan oluşur:
     n = KatmanNorm(x);  x = x + ÇokKafalıDikkat(n)   (karakterler birbirine bakar)
     n = KatmanNorm(x);  x = x + İleriBesleme(n)      (her karakter kendi başına işlenir)
  "x = x + ..." biçimine artık bağlantı denir: her blok girdiyi silmez, üstüne ekler.
  Bu program parçaları KucukGPT biriminden alıp tek tek sınar:
  A) Katman normalleştirme ne yapar?
  B) Küçük GPT'nin parametreleri nerede?
  C) Bir hata ayıklama alışkanlığı: model tek bir yığını ezberleyebiliyor mu? }
kullan Atasozleri, DilAraclari, KucukGPT, YZ

değişken
  x, y, kayıp: tensör
  model: GPT
  opt: herhangi
  harfler: metin dizisi
  numara: sözlük
  akış, g, h: tamsayı dizisi
  i, adım, D, gömme, dikkat, ileri, norm, çıkış: tamsayı

başla
  Tohum(5)
  { A) Katman normalleştirme }
  x := Tensör([[2.0, 4.0, 6.0, 8.0], [100.0, 101.0, 99.0, 100.0], [-3.0, 0.0, 0.0, 3.0]])
  y := KucukGPT.KatmanNorm(x, Birler(4), Sıfırlar(4))
  yaz('A) Katman normalleştirme öncesi ve sonrası:', 1)
  0'dan 2'ye kadar her i için
    yaz(Biçimle('   {}  →  {}   (ortalama {:.2}, sapma {:.2})', x.Satır(i).Veri,
      Eşle(y.Satır(i).Veri, fonksiyon(z: ondalık) => Yuvarla(z, 2)),
      y.Satır(i).Ortalama.Değer, ((y.Satır(i) ** 2).Ortalama.Değer) ** 0.5), 1)

  { B) Parametreler }
  harfler := DilAraclari.Harfler
  numara := DilAraclari.Numaralar(harfler)
  model := GPT.Oluştur(Uzunluk(harfler), 16, 32, 4, 2)
  D := 32
  gömme := Uzunluk(harfler) * D + 16 * D
  dikkat := 2 * (4 * D * D)
  ileri := 2 * (D * 4 * D + 4 * D + 4 * D * D + D)
  norm := 2 * (4 * D) + 2 * D
  çıkış := D * Uzunluk(harfler) + Uzunluk(harfler)
  yaz('', 1); yaz('B) Küçük GPT (2 katman, 4 kafa, 32 boyut, 16 karakter bağlam):', 1)
  yaz(Biçimle('   Karakter ve konum gömmeleri : {:6}', gömme), 1)
  yaz(Biçimle('   Dikkat (Q, K, V, çıkış)     : {:6}', dikkat), 1)
  yaz(Biçimle('   İleri besleme ağları        : {:6}', ileri), 1)
  yaz(Biçimle('   Katman normalleştirmeler    : {:6}', norm), 1)
  yaz(Biçimle('   Çıkış katmanı               : {:6}', çıkış), 1)
  yaz(Biçimle('   Toplam                      : {:6}   (model.ParametreAdedi = {})',
    gömme + dikkat + ileri + norm + çıkış, model.ParametreAdedi), 1)

  { C) Tek yığını ezberleme sınaması }
  akış := DilAraclari.Kodla('.damlaya damlaya göl olur.acele işe şeytan karışır.', numara)
  g := Dilim(akış, 0, 16) + Dilim(akış, 20, 36)
  h := Dilim(akış, 1, 17) + Dilim(akış, 21, 37)
  opt := Adam(model.Parametreler, 0.01)
  yaz('', 1); yaz('C) İki pencerelik tek bir yığını ezberleme:', 1)
  1'den 150'ye kadar her adım için
  başla
    opt.SıfırlaGrad
    kayıp := ÇaprazEntropi(model.İleri(g, 2, 16), h)
    kayıp.GeriYay
    opt.Adım
    eğer adım = 1 veya adım mod 30 = 0 ise yaz(Biçimle('   Adım {:3}: kayıp {:.4}', adım, kayıp.Değer), 1)
  bitir
bitir.
