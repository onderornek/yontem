program KüçükGPTMeşale
{ Meşale ve Sinir ile karakter düzeyinde küçük bir GPT. Yapı PyTorch'ta yazılacak olanla aynıdır:
  gömme + konum gömmesi → [katman normu → nedensel öz-dikkat → artık] → [katman normu → ileri
  besleme → artık] → katman normu → çıkış katmanı. Model atasözlerini öğrenir ve yenilerini üretir. }
kullan Meşale, Sinir

sabit
  BAĞLAM: tamsayı = 16
  BOYUT: tamsayı = 32
  KAFA: tamsayı = 4
  YIĞIN: tamsayı = 8

tip
  NedenselDikkat = sınıf(Modül)
    sorgu, anahtar, değer, çıkış: Doğrusal
    kafaSayısı: tamsayı
    kurucu Oluştur(boyut, kafa: tamsayı)
    fonksiyon İleri(x: herhangi): herhangi
  bitir

  Blok = sınıf(Modül)
    norm1, norm2: KatmanNormu
    dikkat: NedenselDikkat
    besleme: Ardışık
    kurucu Oluştur(boyut, kafa: tamsayı)
    fonksiyon İleri(x: herhangi): herhangi
  bitir

  GPT = sınıf(Modül)
    simgeGömme, konumGömme: Gömme
    bloklar: ModülListesi
    sonNorm: KatmanNormu
    başlık: Doğrusal
    kurucu Oluştur(sözlük, boyut, kafa, katman: tamsayı)
    fonksiyon İleri(x: herhangi): herhangi
  bitir

kurucu NedenselDikkat.Oluştur(boyut, kafa: tamsayı)
başla
  miras Oluştur
  kafaSayısı := kafa
  sorgu := Doğrusal(boyut, boyut, yanlış)
  anahtar := Doğrusal(boyut, boyut, yanlış)
  değer := Doğrusal(boyut, boyut, yanlış)
  çıkış := Doğrusal(boyut, boyut)
bitir

fonksiyon NedenselDikkat.İleri(x: herhangi): herhangi
değişken B, T, D, h: tamsayı; q, k, v, ağırlık: tensör
başla
  B := x.Şekil[0]; T := x.Şekil[1]; D := x.Şekil[2]; h := D böl kafaSayısı
  { [B, T, D] → [B, kafa, T, h] }
  q := sorgu.İleri(x).view(B, T, kafaSayısı, h).transpose(1, 2)
  k := anahtar.İleri(x).view(B, T, kafaSayısı, h).transpose(1, 2)
  v := değer.İleri(x).view(B, T, kafaSayısı, h).transpose(1, 2)
  ağırlık := (q @ k.transpose(-2, -1)) / Kök(h)
  ağırlık := ağırlık.masked_fill(AltÜçgen(Birler(T, T)).eq(0), -1.0e9).softmax(-1)
  dön çıkış.İleri((ağırlık @ v).transpose(1, 2).view(B, T, D))
bitir

kurucu Blok.Oluştur(boyut, kafa: tamsayı)
başla
  miras Oluştur
  norm1 := KatmanNormu(boyut)
  dikkat := NedenselDikkat(boyut, kafa)
  norm2 := KatmanNormu(boyut)
  besleme := Ardışık([Doğrusal(boyut, 4 * boyut), gelu, Doğrusal(4 * boyut, boyut)])
bitir

fonksiyon Blok.İleri(x: herhangi): herhangi
başla
  x := x + dikkat.İleri(norm1.İleri(x))
  dön x + besleme.İleri(norm2.İleri(x))
bitir

kurucu GPT.Oluştur(sözlük, boyut, kafa, katman: tamsayı)
değişken i: tamsayı
başla
  miras Oluştur
  simgeGömme := Gömme(sözlük, boyut)
  konumGömme := Gömme(BAĞLAM, boyut)
  bloklar := ModülListesi([])
  1'den katman'a kadar her i için bloklar.Ekle(Blok(boyut, kafa))
  sonNorm := KatmanNormu(boyut)
  başlık := Doğrusal(boyut, sözlük)
bitir

fonksiyon GPT.İleri(x: herhangi): herhangi
değişken h: tensör; b: herhangi
başla
  h := simgeGömme.İleri(x) + konumGömme.İleri(SayıDizisi(x.Şekil[1]))
  bloklar.öğeler içindeki her b için h := b.İleri(h)
  dön başlık.İleri(sonNorm.İleri(h))
bitir

değişken
  metin, çıktı, c: metin
  harfler: liste
  numara: sözlük
  veri: liste
  model: GPT
  opt: herhangi
  girdi, hedef: liste
  x, logit, kayıp, olasılık: tensör
  adım, i, s, k, sonraki: tamsayı
  r, birikim: ondalık

başla
  Tohum(3)
  metin := '.damlaya damlaya göl olur.ağaç yaşken eğilir.sakla samanı gelir zamanı.' +
    'bugünün işini yarına bırakma.işleyen demir pas tutmaz.az olsun öz olsun.' +
    'dost kara günde belli olur.ayağını yorganına göre uzat.gülü seven dikenine katlanır.' +
    'tatlı dil yılanı deliğinden çıkarır.emek olmadan yemek olmaz.balık baştan kokar.'
  harfler := []
  metin içindeki her c için harfler.Ekle(c)
  harfler := Sırala(Benzersiz(harfler))
  numara := [:]
  0'dan Uzunluk(harfler) - 1'e kadar her i için numara[harfler[i]] := i
  veri := []
  metin içindeki her c için veri.Ekle(numara[c])

  model := GPT(Uzunluk(harfler), BOYUT, KAFA, 2)
  yaz(Biçimle('Sözlük {} harf, metin {} harf, model {} parametre', Uzunluk(harfler), Uzunluk(metin), model.ParametreAdedi), 1)
  opt := AdamW(model.parameters, 0.003)

  1'den 300'e kadar her adım için
  başla
    girdi := []; hedef := []
    1'den YIĞIN'a kadar her i için
    başla
      s := Rastgele(Uzunluk(veri) - BAĞLAM - 1)
      girdi.Ekle(Dilim(veri, s, s + BAĞLAM))
      hedef := hedef + Dilim(veri, s + 1, s + BAĞLAM + 1)
    bitir
    logit := model.İleri(Tensör(girdi))
    kayıp := cross_entropy(logit.view(-1, Uzunluk(harfler)), hedef)
    opt.zero_grad
    kayıp.backward
    GradNormKırp(model.parameters, 1.0)
    opt.step
    eğer adım = 1 veya adım mod 100 = 0 ise yaz(Biçimle('adım {:3}  kayıp {:.3}', adım, kayıp.item), 1)
  bitir

  { Üretim: '.' ile başla, her adımda sonraki harfi olasılıklarına göre seç }
  model.eval
  GradKapat
  yaz('Üretilen metin:', 1)
  çıktı := '.'
  1'den 120'ye kadar her i için
  başla
    girdi := []
    çıktı içindeki her c için girdi.Ekle(numara[c])
    eğer Uzunluk(girdi) > BAĞLAM ise girdi := Dilim(girdi, Uzunluk(girdi) - BAĞLAM, Uzunluk(girdi))
    olasılık := model.İleri(Tensör([girdi]))[0][Uzunluk(girdi) - 1].softmax(-1)
    r := Rastgele; birikim := 0; sonraki := Uzunluk(harfler) - 1
    0'dan Uzunluk(harfler) - 1'e kadar her k için
    başla
      birikim := birikim + olasılık[k]
      eğer r < birikim ise başla sonraki := k; kır bitir
    bitir
    çıktı := çıktı + harfler[sonraki]
  bitir
  yaz(Değiştir(AltMetin(çıktı, 2, Uzunluk(çıktı) - 1), '.', Karakter(10)), 1)
bitir.
