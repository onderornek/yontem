program SınıflandırmaMeşale
{ Kendi modelinizi Modül'den türetmek: üç sınıflı, iki boyutlu bir veri kümesinde
  çok katmanlı bir ağ. Ardından modeli kaydedip yeniden yükleriz.
  PyTorch karşılığı: class Ağ(nn.Module), F.cross_entropy, torch.optim.Adam, model.eval(),
  torch.save(model.state_dict()), model.load_state_dict(torch.load(...)). }
kullan Meşale, Sinir, Matematik

tip
  Ağ = sınıf(Modül)
    katman1, katman2: Doğrusal
    bırak: BırakmaKatmanı
    kurucu Oluştur(gizli: tamsayı)
    fonksiyon İleri(x: herhangi): herhangi
  bitir

kurucu Ağ.Oluştur(gizli: tamsayı)
başla
  miras Oluştur                     { super().__init__() }
  katman1 := Doğrusal(2, gizli)
  bırak := BırakmaKatmanı(0.1)
  katman2 := Doğrusal(gizli, 3)
bitir

fonksiyon Ağ.İleri(x: herhangi): herhangi
başla
  dön katman2.İleri(bırak.İleri(relu(katman1.İleri(x))))
bitir

değişken
  noktalar: liste
  etiketler: tamsayı dizisi
  X, Y, çıkış, kayıp, tahmin: tensör
  model, yeniModel: Ağ
  opt: herhangi
  i, k, adım: tamsayı
  açı, r: ondalık

fonksiyon Doğruluk(m: Ağ): ondalık
başla
  tahmin := m.İleri(X).argmax(1)
  dön tahmin.eq(Y).mean.item
bitir

başla
  Tohum(7)
  { Üç kollu sarmal: her sınıf bir kol }
  noktalar := []; etiketler := []
  0'dan 2'ye kadar her k için
    0'dan 39'a kadar her i için
    başla
      r := i / 40.0
      açı := k * 2.1 + r * 3.2
      noktalar.Ekle([r * Cos(açı), r * Sin(açı)])
      etiketler.Ekle(k)
    bitir
  X := Tensör(noktalar) + RastgeleNormal(120, 2) * 0.02
  Y := Tensör(etiketler)

  model := Ağ(32)
  yaz(model, 1)
  yaz('Parametre sayısı: ' + model.ParametreAdedi, 2)
  opt := Adam(model.parameters, 0.02)
  1'den 400'e kadar her adım için
  başla
    model.train
    opt.zero_grad
    kayıp := cross_entropy(model.İleri(X), etiketler)
    kayıp.backward
    opt.step
    eğer adım mod 100 = 0 ise
    başla
      model.eval
      yaz(Biçimle('adım {:3}  kayıp {:.4}  doğruluk %{:.1}', adım, kayıp.item, 100 * Doğruluk(model)), 1)
    bitir
  bitir

  Kaydet(model.state_dict, 'siniflandirma_modeli.json')
  yeniModel := Ağ(32)
  yeniModel.eval
  yaz('', 1)
  yaz(Biçimle('Yüklemeden önce yeni model: doğruluk %{:.1}', 100 * Doğruluk(yeniModel)), 1)
  yeniModel.load_state_dict(Yükle('siniflandirma_modeli.json'))
  yaz(Biçimle('Yükledikten sonra        : doğruluk %{:.1}', 100 * Doğruluk(yeniModel)), 1)
bitir.
