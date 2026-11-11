birim Sinir
{ Sinir ağı katmanları: PyTorch'taki torch.nn biriminin Yöntem karşılığı.
  Kendi modelinizi Modül'den türetirsiniz; alanlarınıza koyduğunuz parametre tensörleri ve
  alt modüller Parametreler tarafından kendiliğinden bulunur (PyTorch'taki gibi kayıt gerekmez).
  Her sınıfın PyTorch adıyla bir eşi de vardır: Doğrusal = Linear, Ardışık = Sequential, …
  Hesaplamaların tamamı Meşale biriminde (yerleşik, hızlı) yapılır. }
kullan Meşale

arayüz
tip
  Modül = sınıf
    eğitimde: mantıksal
    çağrıda: mantıksal
    kurucu Oluştur
    fonksiyon İleri(x: herhangi): herhangi
    fonksiyon forward(x: herhangi): herhangi
    fonksiyon Parametreler: liste
    fonksiyon parameters: liste
    fonksiyon AdlıParametreler: sözlük
    fonksiyon named_parameters: sözlük
    fonksiyon ParametreAdedi: tamsayı
    fonksiyon AltModüller: liste
    prosedür Eğit(açık: mantıksal = doğru)
    prosedür train(açık: mantıksal = doğru)
    prosedür Değerlendir
    prosedür eval
    prosedür GradSıfırla
    prosedür zero_grad
    fonksiyon DurumSözlüğü: sözlük
    fonksiyon state_dict: sözlük
    prosedür DurumYükle(durum: sözlük)
    prosedür load_state_dict(durum: sözlük)
    fonksiyon MetneÇevir: metin
  bitir

  Doğrusal = sınıf(Modül)
    ağırlık, sapma: tensör
    girişBoyu, çıkışBoyu: tamsayı
    kurucu Oluştur(giriş, çıkış: tamsayı; sapmalı: mantıksal = doğru)
    fonksiyon İleri(x: herhangi): herhangi
    fonksiyon MetneÇevir: metin
  bitir

  Gömme = sınıf(Modül)
    ağırlık: tensör
    kurucu Oluştur(sayı, boyut: tamsayı)
    fonksiyon İleri(x: herhangi): herhangi
    fonksiyon MetneÇevir: metin
  bitir

  KatmanNormu = sınıf(Modül)
    ağırlık, sapma: tensör
    eps: ondalık
    kurucu Oluştur(boyut: tamsayı; eps0: ondalık = 0.00001)
    fonksiyon İleri(x: herhangi): herhangi
    fonksiyon MetneÇevir: metin
  bitir

  BırakmaKatmanı = sınıf(Modül)
    oran: ondalık
    kurucu Oluştur(p: ondalık = 0.5)
    fonksiyon İleri(x: herhangi): herhangi
    fonksiyon MetneÇevir: metin
  bitir

  Ardışık = sınıf(Modül)
    katmanlar: liste
    kurucu Oluştur(liste0: liste)
    fonksiyon İleri(x: herhangi): herhangi
    fonksiyon MetneÇevir: metin
  bitir

  ModülListesi = sınıf(Modül)
    öğeler: liste
    kurucu Oluştur(liste0: liste)
    prosedür Ekle(m: herhangi)
    fonksiyon MetneÇevir: metin
  bitir

  ReLUKatmanı = sınıf(Modül)
    fonksiyon İleri(x: herhangi): herhangi
  bitir
  TanhKatmanı = sınıf(Modül)
    fonksiyon İleri(x: herhangi): herhangi
  bitir
  SigmoidKatmanı = sınıf(Modül)
    fonksiyon İleri(x: herhangi): herhangi
  bitir
  GELUKatmanı = sınıf(Modül)
    fonksiyon İleri(x: herhangi): herhangi
  bitir

  { Kayıp nesneleri: Hesapla(girdi, hedef) ya da forward(girdi, hedef) }
  OKHKaybıNesnesi = sınıf
    fonksiyon Hesapla(a, b: herhangi): tensör
    fonksiyon forward(a, b: herhangi): tensör
  bitir
  ÇaprazEntropiKaybı = sınıf
    fonksiyon Hesapla(a, b: herhangi): tensör
    fonksiyon forward(a, b: herhangi): tensör
  bitir
  OMHKaybıNesnesi = sınıf
    fonksiyon Hesapla(a, b: herhangi): tensör
    fonksiyon forward(a, b: herhangi): tensör
  bitir
  İkiliÇaprazEntropiKaybı = sınıf
    fonksiyon Hesapla(a, b: herhangi): tensör
    fonksiyon forward(a, b: herhangi): tensör
  bitir
  İkiliÇaprazEntropiLogitKaybı = sınıf
    fonksiyon Hesapla(a, b: herhangi): tensör
    fonksiyon forward(a, b: herhangi): tensör
  bitir

  { PyTorch adlarıyla eşler }
  Module = sınıf(Modül) bitir
  Linear = sınıf(Doğrusal) bitir
  Embedding = sınıf(Gömme) bitir
  LayerNorm = sınıf(KatmanNormu) bitir
  Dropout = sınıf(BırakmaKatmanı) bitir
  Sequential = sınıf(Ardışık) bitir
  ModuleList = sınıf(ModülListesi) bitir
  MSELoss = sınıf(OKHKaybıNesnesi) bitir
  L1Loss = sınıf(OMHKaybıNesnesi) bitir
  CrossEntropyLoss = sınıf(ÇaprazEntropiKaybı) bitir
  BCELoss = sınıf(İkiliÇaprazEntropiKaybı) bitir
  BCEWithLogitsLoss = sınıf(İkiliÇaprazEntropiLogitKaybı) bitir

uygulama

{ ------------------------------------------------------------------ yardımcılar }

{ Bir değerin içindeki parametreleri ad önekiyle sözlüğe ekler }
prosedür ParametreTopla(önek: metin; v: herhangi; d: sözlük)
değişken ad: herhangi; i: tamsayı
başla
  eğer Meşale.TensörMü(v) ise
  başla
    eğer v.GradGerekli ise d[önek] := v
  bitir
  değilse eğer ÖrneğiMi(v, Modül) ise
  başla
    Meşale.Alanlar(v) içindeki her ad için
      ParametreTopla(eğer önek = '' ise ad değilse önek + '.' + ad, Meşale.Alanlar(v)[ad], d)
  bitir
  değilse eğer Tür(v) = 'liste' ise
    0'dan Uzunluk(v) - 1'e kadar her i için
      ParametreTopla(önek + '.' + i, v[i], d)
bitir

prosedür ModülTopla(v: herhangi; L: liste)
değişken x: herhangi
başla
  eğer ÖrneğiMi(v, Modül) ise L.Ekle(v)
  değilse eğer Tür(v) = 'liste' ise
    v içindeki her x için ModülTopla(x, L)
bitir

{ ------------------------------------------------------------------ Modül }

kurucu Modül.Oluştur
başla
  eğitimde := doğru
  çağrıda := yanlış
bitir

fonksiyon Modül.İleri(x: herhangi): herhangi
başla
  eğer çağrıda ise
    fırlat Hata(Tür(kendi) + ' sınıfında İleri (ya da forward) metodu tanımlanmamış', 'TanımsızMetod')
  çağrıda := doğru
  dene
    sonuç := kendi.forward(x)
  sonunda
    çağrıda := yanlış
  bitir
bitir

fonksiyon Modül.forward(x: herhangi): herhangi
başla
  eğer çağrıda ise
    fırlat Hata(Tür(kendi) + ' sınıfında İleri (ya da forward) metodu tanımlanmamış', 'TanımsızMetod')
  çağrıda := doğru
  dene
    sonuç := kendi.İleri(x)
  sonunda
    çağrıda := yanlış
  bitir
bitir

fonksiyon Modül.AdlıParametreler: sözlük
başla
  sonuç := [:]
  ParametreTopla('', kendi, sonuç)
bitir

fonksiyon Modül.named_parameters: sözlük
başla
  dön kendi.AdlıParametreler
bitir

fonksiyon Modül.Parametreler: liste
başla
  dön Değerler(kendi.AdlıParametreler)
bitir

fonksiyon Modül.parameters: liste
başla
  dön kendi.Parametreler
bitir

fonksiyon Modül.ParametreAdedi: tamsayı
değişken p: tensör
başla
  sonuç := 0
  kendi.Parametreler içindeki her p için sonuç := sonuç + p.ÖğeSayısı
bitir

fonksiyon Modül.AltModüller: liste
değişken ad: herhangi
başla
  sonuç := []
  Meşale.Alanlar(kendi) içindeki her ad için ModülTopla(Meşale.Alanlar(kendi)[ad], sonuç)
bitir

prosedür Modül.Eğit(açık: mantıksal = doğru)
değişken m: herhangi
başla
  eğitimde := açık
  kendi.AltModüller içindeki her m için m.Eğit(açık)
bitir

prosedür Modül.train(açık: mantıksal = doğru)
başla
  kendi.Eğit(açık)
bitir

prosedür Modül.Değerlendir
başla
  kendi.Eğit(yanlış)
bitir

prosedür Modül.eval
başla
  kendi.Eğit(yanlış)
bitir

prosedür Modül.GradSıfırla
değişken p: tensör
başla
  kendi.Parametreler içindeki her p için p.GradSıfırla
bitir

prosedür Modül.zero_grad
başla
  kendi.GradSıfırla
bitir

fonksiyon Modül.DurumSözlüğü: sözlük
başla
  dön kendi.AdlıParametreler
bitir

fonksiyon Modül.state_dict: sözlük
başla
  dön kendi.AdlıParametreler
bitir

prosedür Modül.DurumYükle(durum: sözlük)
değişken p: sözlük; ad: herhangi
başla
  p := kendi.AdlıParametreler
  p içindeki her ad için
  başla
    eğer değil (ad içinde durum) ise
      fırlat Hata('Durum sözlüğünde eksik parametre: ' + ad, 'EksikParametre')
    Meşale.VeriKopyala(p[ad], durum[ad])
  bitir
  durum içindeki her ad için
    eğer değil (ad içinde p) ise
      fırlat Hata('Modelde olmayan parametre: ' + ad, 'FazlaParametre')
bitir

prosedür Modül.load_state_dict(durum: sözlük)
başla
  kendi.DurumYükle(durum)
bitir

fonksiyon Modül.MetneÇevir: metin
değişken ad: herhangi; v: herhangi; içerik: liste
başla
  içerik := []
  Meşale.Alanlar(kendi) içindeki her ad için
  başla
    v := Meşale.Alanlar(kendi)[ad]
    eğer ÖrneğiMi(v, Modül) ise içerik.Ekle('  ' + ad + ': ' + Değiştir(Metne(v), Karakter(10), Karakter(10) + '  '))
  bitir
  eğer Uzunluk(içerik) = 0 ise dön Tür(kendi) + '()'
  dön Tür(kendi) + '(' + Karakter(10) + Birleştir(içerik, Karakter(10)) + Karakter(10) + ')'
bitir

{ ------------------------------------------------------------------ katmanlar }

kurucu Doğrusal.Oluştur(giriş, çıkış: tamsayı; sapmalı: mantıksal = doğru)
değişken k: ondalık
başla
  miras Oluştur
  girişBoyu := giriş; çıkışBoyu := çıkış
  { PyTorch ile aynı başlatma aralığı: U(-1/√giriş, 1/√giriş) }
  k := 1 / Kök(giriş)
  ağırlık := (Meşale.RastgeleDüzgün(çıkış, giriş) * (2 * k) - k).requires_grad_(doğru)
  eğer sapmalı ise sapma := (Meşale.RastgeleDüzgün(çıkış) * (2 * k) - k).requires_grad_(doğru)
  değilse sapma := boş
bitir

fonksiyon Doğrusal.İleri(x: herhangi): herhangi
başla
  dön Meşale.linear(x, ağırlık, sapma)
bitir

fonksiyon Doğrusal.MetneÇevir: metin
başla
  dön Biçimle('{}(giriş={}, çıkış={}, sapma={})', Tür(kendi), girişBoyu, çıkışBoyu, sapma <> boş)
bitir

kurucu Gömme.Oluştur(sayı, boyut: tamsayı)
başla
  miras Oluştur
  ağırlık := Meşale.RastgeleNormal(sayı, boyut, doğru)
bitir

fonksiyon Gömme.İleri(x: herhangi): herhangi
başla
  dön Meşale.embedding(x, ağırlık)
bitir

fonksiyon Gömme.MetneÇevir: metin
başla
  dön Biçimle('{}({}, {})', Tür(kendi), ağırlık.Şekil[0], ağırlık.Şekil[1])
bitir

kurucu KatmanNormu.Oluştur(boyut: tamsayı; eps0: ondalık = 0.00001)
başla
  miras Oluştur
  ağırlık := Meşale.Birler(boyut, doğru)
  sapma := Meşale.Sıfırlar(boyut, doğru)
  eps := eps0
bitir

fonksiyon KatmanNormu.İleri(x: herhangi): herhangi
başla
  dön Meşale.layer_norm(x, ağırlık, sapma, eps)
bitir

fonksiyon KatmanNormu.MetneÇevir: metin
başla
  dön Biçimle('{}({})', Tür(kendi), ağırlık.Şekil[0])
bitir

kurucu BırakmaKatmanı.Oluştur(p: ondalık = 0.5)
başla
  miras Oluştur
  oran := p
bitir

fonksiyon BırakmaKatmanı.İleri(x: herhangi): herhangi
başla
  dön Meşale.dropout(x, oran, eğitimde)
bitir

fonksiyon BırakmaKatmanı.MetneÇevir: metin
başla
  dön Biçimle('{}(p={})', Tür(kendi), oran)
bitir

kurucu Ardışık.Oluştur(liste0: liste)
başla
  miras Oluştur
  katmanlar := liste0
bitir

fonksiyon Ardışık.İleri(x: herhangi): herhangi
değişken k: herhangi
başla
  sonuç := x
  katmanlar içindeki her k için
    eğer ÖrneğiMi(k, Modül) ise sonuç := k.İleri(sonuç)
    değilse sonuç := k(sonuç)
bitir

fonksiyon Ardışık.MetneÇevir: metin
değişken i: tamsayı; k: herhangi; içerik: liste
başla
  içerik := []
  0'dan Uzunluk(katmanlar) - 1'e kadar her i için
  başla
    k := katmanlar[i]
    içerik.Ekle('  (' + i + '): ' + Değiştir(Metne(k), Karakter(10), Karakter(10) + '  '))
  bitir
  dön Tür(kendi) + '(' + Karakter(10) + Birleştir(içerik, Karakter(10)) + Karakter(10) + ')'
bitir

kurucu ModülListesi.Oluştur(liste0: liste)
başla
  miras Oluştur
  öğeler := liste0
bitir

prosedür ModülListesi.Ekle(m: herhangi)
başla
  öğeler.Ekle(m)
bitir

fonksiyon ModülListesi.MetneÇevir: metin
başla
  dön Tür(kendi) + '(' + Uzunluk(öğeler) + ' modül)'
bitir

fonksiyon ReLUKatmanı.İleri(x: herhangi): herhangi
başla
  dön Meşale.relu(x)
bitir
fonksiyon TanhKatmanı.İleri(x: herhangi): herhangi
başla
  dön Meşale.tanh(x)
bitir
fonksiyon SigmoidKatmanı.İleri(x: herhangi): herhangi
başla
  dön Meşale.sigmoid(x)
bitir
fonksiyon GELUKatmanı.İleri(x: herhangi): herhangi
başla
  dön Meşale.gelu(x)
bitir

{ ------------------------------------------------------------------ kayıp nesneleri }

fonksiyon OKHKaybıNesnesi.Hesapla(a, b: herhangi): tensör
başla
  dön Meşale.mse_loss(a, b)
bitir
fonksiyon OKHKaybıNesnesi.forward(a, b: herhangi): tensör
başla
  dön Meşale.mse_loss(a, b)
bitir
fonksiyon OMHKaybıNesnesi.Hesapla(a, b: herhangi): tensör
başla
  dön Meşale.l1_loss(a, b)
bitir
fonksiyon OMHKaybıNesnesi.forward(a, b: herhangi): tensör
başla
  dön Meşale.l1_loss(a, b)
bitir
fonksiyon ÇaprazEntropiKaybı.Hesapla(a, b: herhangi): tensör
başla
  dön Meşale.cross_entropy(a, b)
bitir
fonksiyon ÇaprazEntropiKaybı.forward(a, b: herhangi): tensör
başla
  dön Meşale.cross_entropy(a, b)
bitir
fonksiyon İkiliÇaprazEntropiKaybı.Hesapla(a, b: herhangi): tensör
başla
  dön Meşale.binary_cross_entropy(a, b)
bitir
fonksiyon İkiliÇaprazEntropiKaybı.forward(a, b: herhangi): tensör
başla
  dön Meşale.binary_cross_entropy(a, b)
bitir
fonksiyon İkiliÇaprazEntropiLogitKaybı.Hesapla(a, b: herhangi): tensör
başla
  dön Meşale.binary_cross_entropy_with_logits(a, b)
bitir
fonksiyon İkiliÇaprazEntropiLogitKaybı.forward(a, b: herhangi): tensör
başla
  dön Meşale.binary_cross_entropy_with_logits(a, b)
bitir

başla
bitir.
