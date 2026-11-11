birim Dil
{ Türkçe doğal dil işleme temelleri: belirteçleme, durak sözcükler, n-gramlar,
  TF-IDF, kosinüs benzerliği ve Naif Bayes metin sınıflandırıcı. }

kullan Matematik

arayüz
  fonksiyon Belirteçle(m: metin): liste
  fonksiyon DurakSil(sözcükler: liste): liste
  fonksiyon KökBul(sözcük: metin): metin
  fonksiyon NGramlar(sözcükler: liste; n: tamsayı): liste
  fonksiyon SözcükSıklığı(sözcükler: liste): sözlük
  fonksiyon TFIDF(belgeler: liste): liste
  fonksiyon KosinüsBenzerliği(a, b: sözlük): ondalık

  tip
    NaifBayes = sınıf
      sınıfSayıları: sözlük      // etiket -> belge sayısı
      sözcükSayıları: sözlük     // etiket -> [sözcük: sayı]
      toplamSözcük: sözlük       // etiket -> toplam sözcük
      sözlükçe: sözlük           // tüm sözcükler
      belgeSayısı: tamsayı
      kurucu Oluştur
      prosedür Eğit(metinler, etiketler: liste)
      fonksiyon Olasılıklar(m: metin): sözlük
      fonksiyon Tahmin(m: metin): metin
    bitir

uygulama

sabit
  DURAK: liste = ['ve', 'veya', 'ile', 'bir', 'bu', 'şu', 'o', 'da', 'de', 'ki', 'mi', 'mı',
           'çok', 'için', 'ama', 'fakat', 'gibi', 'daha', 'en', 'ben', 'sen', 'biz',
           'siz', 'onlar', 'ne', 'her', 'hiç', 'olan', 'olarak', 'diye']
  EKLER: liste = ['lerinden', 'larından', 'lerine', 'larına', 'ları', 'leri', 'lar', 'ler',
           'dan', 'den', 'tan', 'ten', 'nın', 'nin', 'nun', 'nün', 'yor', 'mış', 'miş',
           'dı', 'di', 'du', 'dü', 'da', 'de', 'ta', 'te', 'ı', 'i', 'u', 'ü']

fonksiyon Belirteçle(m: metin): liste
değişken
  sözcükler: liste
  tampon: metin
  c: herhangi
başla
  sözcükler := []
  tampon := ''
  KüçükHarf(m) içindeki her c için
    eğer HarfMi(c) veya RakamMı(c) ise
      tampon := tampon + c
    değilse eğer tampon <> '' ise
    başla
      sözcükler.Ekle(tampon)
      tampon := ''
    bitir
  eğer tampon <> '' ise sözcükler.Ekle(tampon)
  dön sözcükler
bitir

fonksiyon DurakSil(sözcükler: liste): liste
başla
  dön Süz(sözcükler, fonksiyon(s) => değil (s içinde DURAK))
bitir

{ Çok basit bir ek ayıklayıcı (gerçek bir morfolojik çözümleyici değildir). }
fonksiyon KökBul(sözcük: metin): metin
değişken
  ek: herhangi
başla
  EKLER içindeki her ek için
    eğer (Uzunluk(sözcük) - Uzunluk(ek) >= 3) ve sözcük.BiterMi(ek) ise
      dön AltMetin(sözcük, 1, Uzunluk(sözcük) - Uzunluk(ek))
  dön sözcük
bitir

fonksiyon NGramlar(sözcükler: liste; n: tamsayı): liste
değişken
  i: tamsayı
  çıktı: liste
başla
  çıktı := []
  0'dan (Uzunluk(sözcükler) - n)'ye kadar her i için
    çıktı.Ekle(Birleştir(Dilim(sözcükler, i, i + n), ' '))
  dön çıktı
bitir

fonksiyon SözcükSıklığı(sözcükler: liste): sözlük
başla
  dön Say(sözcükler)
bitir

{ Her belge için [sözcük: tf-idf] sözlüğü döndürür. }
fonksiyon TFIDF(belgeler: liste): liste
değişken
  belgeSıklığı, tf, v: sözlük
  belirteçler: liste
  çıktı: liste
  b, s: herhangi
  n: tamsayı
başla
  belgeSıklığı := [:]
  belirteçler := Eşle(belgeler, fonksiyon(d) => DurakSil(Belirteçle(d)))
  belirteçler içindeki her b için
    Benzersiz(b) içindeki her s için
      belgeSıklığı[s] := belgeSıklığı.Al(s, 0) + 1
  n := Uzunluk(belgeler)
  çıktı := []
  belirteçler içindeki her b için
  başla
    tf := Say(b)
    v := [:]
    tf içindeki her s için
      v[s] := (tf[s] / Uzunluk(b)) * (1 + Ln((1 + n) / (1 + belgeSıklığı[s])))
    çıktı.Ekle(v)
  bitir
  dön çıktı
bitir

fonksiyon KosinüsBenzerliği(a, b: sözlük): ondalık
değişken
  nokta, na, nb: ondalık
  k: herhangi
başla
  nokta := 0;  na := 0;  nb := 0
  a içindeki her k için
  başla
    na := na + a[k] ** 2
    eğer k içinde b ise nokta := nokta + a[k] * b[k]
  bitir
  b içindeki her k için nb := nb + b[k] ** 2
  eğer (na = 0) veya (nb = 0) ise dön 0
  dön nokta / (Kök(na) * Kök(nb))
bitir

{ ---------------- Naif Bayes ---------------- }

fonksiyon Özellikler(m: metin): liste
başla
  dön Eşle(DurakSil(Belirteçle(m)), fonksiyon(s) => KökBul(s))
bitir

kurucu NaifBayes.Oluştur
başla
  sınıfSayıları := [:]
  sözcükSayıları := [:]
  toplamSözcük := [:]
  sözlükçe := [:]
  belgeSayısı := 0
bitir

prosedür NaifBayes.Eğit(metinler, etiketler: liste)
değişken
  i: tamsayı
  e, s: herhangi
başla
  0'dan (Uzunluk(metinler) - 1)'e kadar her i için
  başla
    e := etiketler[i]
    eğer değil (e içinde sınıfSayıları) ise
    başla
      sınıfSayıları[e] := 0
      sözcükSayıları[e] := [:]
      toplamSözcük[e] := 0
    bitir
    sınıfSayıları[e] := sınıfSayıları[e] + 1
    belgeSayısı := belgeSayısı + 1
    Özellikler(metinler[i]) içindeki her s için
    başla
      sözcükSayıları[e][s] := sözcükSayıları[e].Al(s, 0) + 1
      toplamSözcük[e] := toplamSözcük[e] + 1
      sözlükçe[s] := doğru
    bitir
  bitir
bitir

{ Log-olasılıklarla hesaplar, softmaks ile normalize eder (Laplace düzeltmeli). }
fonksiyon NaifBayes.Olasılıklar(m: metin): sözlük
değişken
  puan: sözlük
  e, s: herhangi
  p, enBüyük, top: ondalık
  V: tamsayı
  özellik: liste
başla
  puan := [:]
  V := Uzunluk(sözlükçe)
  özellik := Özellikler(m)
  sınıfSayıları içindeki her e için
  başla
    p := Ln(sınıfSayıları[e] / belgeSayısı)
    özellik içindeki her s için
      p := p + Ln((sözcükSayıları[e].Al(s, 0) + 1) / (toplamSözcük[e] + V))
    puan[e] := p
  bitir
  enBüyük := Maks(Değerler(puan))
  top := 0
  puan içindeki her e için
  başla
    puan[e] := Üstel(puan[e] - enBüyük)
    top := top + puan[e]
  bitir
  puan içindeki her e için puan[e] := puan[e] / top
  dön puan
bitir

fonksiyon NaifBayes.Tahmin(m: metin): metin
değişken
  o: sözlük
başla
  o := Olasılıklar(m)
  dön Sırala(Anahtarlar(o), fonksiyon(e) => o[e], doğru)[0]
bitir

bitir.
