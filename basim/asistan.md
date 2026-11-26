# Yöntem ile yerel yapay zekâ asistanı

Nov 15, 2026 · @Önder Örnek

*Telif hakkı © 2026 Önder Örnek. Bu eser Creative Commons Atıf 4.0 Uluslararası (CC BY 4.0) lisansıyla lisanslanmıştır: kaynak gösterilerek paylaşılabilir ve uyarlanabilir. Örnek programlar MIT lisanslıdır.*

## Bu kılavuz ne anlatır?

Kendi belgelerinizle çalışan, bilgisayarınızın dışına veri göndermeyen bir yapay zekâ asistanı genellikle Python'da beş parçayla kurulur: modeli çalıştıran Ollama ve dört kütüphane. Bu kılavuz aynı asistanı Yöntem ile kurar.

Beş parçadan biri yerinde kalır: **Ollama** bir kütüphane değil, dil modelini bilgisayarınızda çalıştıran ayrı bir programdır ve Yöntem onunla HTTP üzerinden konuşur. Diğer dört parçanın yerini, toplam yaklaşık 430 satır tutan dört küçük Yöntem birimi alır. Yeni bir şey kurmanız gerekmez; birimler dille birlikte gelen `Ağ`, `Veri` ve `Veritabanı` birimlerinin üzerine yazılmıştır.

| Python'da | Görevi | Yöntem'de | Bölüm |
| --- | --- | --- | --- |
| ollama | Beyin: modeli çalıştırır | Ollama (aynı program) ve `Model.Sor` | 2 |
| litellm | Tek kumanda: servisi değiştirir | `Model.ModelAyarla` | 3 |
| instructor | Düzgün çıktı: tipli veri | `Kalıp.Yapılandır` | 4 |
| chromadb | Hafıza: belgelerde anlam araması | `Hafıza` birimi (SQLite üzerinde) | 5 |
| langgraph | İş akışı: adımlar ve dallanma | `Akış` birimi | 6 |

7\. bölüm beşini birleştirip asistanı kurar. 8. bölüm modeli bir soru setiyle ölçer ve soruları `aynı anda` sorar. 9. bölüm bu kurulumun yapamadıklarını anlatır.

**Bu birimler küçük birer karşılıktır, eşdeğer değildir.** Adı geçen kütüphaneler yıllardır geliştirilen, çok daha geniş araçlardır. Buradaki birimler onların en çok kullanılan çekirdeğini verir; her bölümün sonunda neyin eksik olduğu yazılıdır. Karşılığında bütün kod okunabilecek kadar kısadır ve Ek B'de tamamı verilmiştir.

**Programlar nasıl sınandı?** Bu kılavuzdaki programlar gerçek bir dil modeliyle değil, Ollama'nın arayüzünü taklit eden bir sınama servisiyle çalıştırılmıştır (`js/betikler/sahte_ollama.js`). Servis, sohbet isteklerine önceden kaydedilmiş yanıtları verir. Bu yüzden:

- programların altındaki çıktılar o kayıtlı yanıtlarla alınmıştır; gerçek bir model aynı soruya başka sözcüklerle, bazen de yanlış yanıt verir;
- sınanan şey programların gönderdiği isteklerin biçimi, yanıtların işlenmesi, kalıp denetimi, arama ve akıştır; iki uygulama da (JavaScript derleyicisi ve Python yorumlayıcısı) aynı istekleri gönderir ve aynı çıktıyı verir;
- isteklerin biçimi Ollama'nın belgelerindeki `/api/chat` ve `/api/embed` tanımlarına göre yazılmıştır, ama bu kılavuz yazılırken gerçek bir Ollama kurulumuyla denenmemiştir. İlk çalıştırmada bir uyumsuzlukla karşılaşırsanız `Model.y` içindeki `Sor` ve `Göm` işlevleri bakılacak tek yerdir.

## 1. Hazırlık

**Yöntem.** Komut satırı sürümü gerekir; oyun alanı bu iş için uygun değildir (9. bölüm). Hafıza SQLite kullandığı için Node.js 22.5 ya da yenisi gerekir.

```
npm install -g yontem
```

**Ollama.** [ollama.com/download](https://ollama.com/download) adresinden indirilip açılır. Ardından bir sohbet modeli ve bir gömme modeli indirilir:

```
ollama pull gemma4:e2b
ollama pull embeddinggemma
```

Bu iki ad, Ollama belgelerinin bu kılavuz yazılırken kullandığı örnek modellerdir; sohbet modeli yaklaşık 7 GB yer tutar. Hangi modelin bilgisayarınıza sığacağına ve Türkçede yeterli olup olmadığına Ollama'nın model sayfalarına bakarak karar vermenizi öneririz; başka bir model seçerseniz adını aşağıdaki ayarlarla bildirmeniz yeterlidir. Ollama kendi başına çalışmıyorsa `ollama serve` komutu servisi başlatır; servis `http://localhost:11434` adresinde dinler.

**Örnek dosyalar.** Birimler ve programlar deponun `asistan_ornekleri/` klasöründedir:

```
git clone https://github.com/onderornek/yontem.git
cd yontem/asistan_ornekleri
yontem 01_beyin.y
```

Kendi projenizde kullanmak için dört birim dosyasını (`Model.y`, `Kalip.y`, `Hafiza.y`, `Akis.y`) programınızın klasörüne kopyalamanız yeterlidir.

**Ayarlar.** `Model` birimi ayarlarını ortam değişkenlerinden okur; hiçbiri verilmezse yerel Ollama'ya bağlanır.

| Ortam değişkeni | Varsayılan | Anlamı |
| --- | --- | --- |
| `YONTEM_MODEL_SAGLAYICI` | `ollama` | `ollama` ya da `openai` (OpenAI uyumlu servisler) |
| `YONTEM_MODEL_ADRESI` | `http://localhost:11434` | Servisin adresi |
| `YONTEM_MODEL` | `gemma4:e2b` | Sohbet modeli |
| `YONTEM_GOMME_MODELI` | `embeddinggemma` | Gömme modeli |
| `YONTEM_MODEL_ANAHTARI` | boş | Gerekiyorsa API anahtarı |

**Ollama olmadan denemek.** Programların nasıl aktığını görmek için sınama servisini kullanabilirsiniz; gerçek bir model olmadığını, yalnızca kayıtlı yanıtları verdiğini unutmamak gerekir:

```
node js/betikler/sahte_ollama.js
```

## 2. Beyin: modelle konuşmak

`Model.Sor` bir ileti listesi alır ve modelin yanıtını metin olarak döndürür. Her ileti bir rol ve bir içerikten oluşur; `Mesaj(rol, içerik)` bu sözlüğü kurar.

```pascal
program Beyin
{ 1. adım: modelle konuşmak. Ollama'nın çalışıyor olması gerekir (ollama serve). }
kullan Model

değişken
  yanıt: metin

başla
  yanıt := Sor([Mesaj('user', 'Yöntem nedir? Tek cümleyle yanıtla.')])
  yaz(yanıt, 1)

  { Sistem iletisi modelin nasıl davranacağını, önceki iletiler konuşmanın geçmişini verir }
  yanıt := Sor([Mesaj('system', 'Kısa ve Türkçe yanıt ver.'),
                Mesaj('user', 'Adım Deniz.'),
                Mesaj('assistant', 'Merhaba Deniz!'),
                Mesaj('user', 'Adım neydi?')])
  yaz(yanıt, 1)
bitir.
```

```
Yöntem, anahtar sözcükleri Türkçe olan bir programlama dilidir.
Adınız Deniz.
```

Üç rol vardır: `system` modelin nasıl davranacağını söyler, `user` sizin yazdığınız, `assistant` modelin önceki yanıtıdır. Model konuşmayı hatırlamaz; hatırlamasını istediğiniz her şeyi, ikinci çağrıdaki gibi, listede yeniden göndermeniz gerekir.

`Sor` arka planda Ollama'ya şu isteği gönderir:

```
POST http://localhost:11434/api/chat
{
  "model": "gemma4:e2b",
  "messages": [{"role": "user", "content": "Merhaba"}],
  "stream": false,
  "options": {"temperature": 0}
}
```

`temperature` (sıcaklık) 0 olduğunda model aynı soruya olabildiğince aynı yanıtı verir; daha yaratıcı yanıtlar için `ModelAyarla(['sıcaklık': 0.7])` yazabilirsiniz. `Ağ` birimi yanıtı tek parça olarak aldığı için metin sözcük sözcük akmaz, tamamı hazır olunca gelir. Modelin ilk yanıtı, model belleğe yüklenirken uzun sürebilir; bekleme süresi varsayılan olarak 300 saniyedir (`'süre'` ayarı).

Servise ulaşılamazsa ya da servis hata döndürürse `Sor`, türü `ModelHatası` olan bir hata fırlatır; `dene … yakala` ile yakalanabilir.

## 3. Tek kumanda: servisi değiştirmek

Programın geri kalanı hangi servisin kullanıldığını bilmez; yalnızca `Sor` ve `Göm` çağırır. Servisi değiştirmek için ayarı değiştirmek yeterlidir.

```pascal
program Kumanda
{ 2. adım: tek kumanda. Aynı Sor çağrısı farklı servislerle çalışır; değişen yalnızca ayardır.
  'ollama' Ollama'nın kendi arayüzünü, 'openai' ise OpenAI uyumlu arayüzü kullanır.
  Ollama ikisini de sunar; LM Studio ve llama.cpp gibi araçlar yalnızca ikincisini. }
kullan Model

prosedür Sına(sağlayıcı: metin)
başla
  ModelAyarla(['sağlayıcı': sağlayıcı])
  yaz(sağlayıcı + ' → ' + Sor([Mesaj('user', 'Türkiye''nin başkenti neresi? Tek sözcükle yanıtla.')]), 1)
bitir

başla
  Sına('ollama')
  Sına('openai')

  { Başka bir servise geçmek için adresi, modeli ve gerekiyorsa anahtarı değiştirmek yeter:
    ModelAyarla(['sağlayıcı': 'openai', 'adres': 'http://localhost:1234', 'model': 'modelin-adı']) }

  dene
    ModelAyarla(['model': 'yok'])
    yaz(Sor([Mesaj('user', 'Merhaba')]), 1)
  yakala (h)
    yaz(h.tür + ': ' + h.mesaj, 1)
  bitir
bitir.
```

```
ollama → Ankara
openai → Ankara
ModelHatası: Model servisi 404 döndürdü: {"error":"model \"yok\" not found, try pulling it first"}
```

`Model` iki arayüz tanır:

| Sağlayıcı | Kullandığı yollar | Kimler sunar |
| --- | --- | --- |
| `ollama` | `/api/chat`, `/api/embed` | Ollama |
| `openai` | `/v1/chat/completions`, `/v1/embeddings` | Ollama, LM Studio, llama.cpp sunucusu ve OpenAI uyumlu bulut servisleri |

Bir bulut servisine geçerseniz sorularınız ve belgelerinizden seçilen parçalar o servise gönderilir; "yerel" olma özelliği yalnızca adres kendi bilgisayarınızı gösterdiği sürece geçerlidir. Anahtarı programa yazmak yerine `YONTEM_MODEL_ANAHTARI` ortam değişkeniyle vermenizi öneririz.

**Eksik olanlar.** litellm yüzden fazla servisin kendine özgü arayüzünü bilir, maliyet izler, bir servis yanıt vermezse ötekine geçer. `Model` yalnızca iki arayüzü bilir ve bunların hiçbirini yapmaz.

## 4. Düzgün çıktı: tipli veri almak

Model metin üretir; program ise sayı, liste, alan ister. `Kalıp.Yapılandır` ikisinin arasında durur: istediğiniz yapıyı kısa bir kalıpla tarif edersiniz, karşılığında sözlük, liste ya da tek bir değer alırsınız.

```pascal
program DüzgünÇıktı
{ 3. adım: modelden serbest metin yerine, programın kullanabileceği tipli veri almak. }
kullan Kalıp

değişken
  kişi, yorum: sözlük
  etiket: metin

başla
  { Kalıp: hangi alanlar, hangi tipte }
  kişi := Yapılandır('Şu cümledeki kişiyi çıkar: "Ayşe Demir 34 yaşında, İzmir''de yaşıyor; satranç ve yüzmeyi seviyor."',
                     ['ad': 'metin', 'yaş': 'tamsayı', 'şehir': 'metin', 'hobiler': ['metin']])
  yaz(kişi['ad'] + ', ' + kişi['yaş'] + ', ' + kişi['şehir'], 1)
  kişi['hobiler'] içindeki her etiket için yaz('  hobi: ' + etiket, 1)
  yaz('Beş yıl sonra: ' + (kişi['yaş'] + 5), 1)

  { Seçenekli alan: model yalnızca bu üç değerden birini verebilir }
  yorum := Yapılandır('Yorumu değerlendir: "Kargo geç geldi ama ürün çok kaliteli."',
                      ['duygu': 'olumlu|olumsuz|karışık', 'özet': 'metin'])
  yaz(yorum['duygu'] + ': ' + yorum['özet'], 1)

  { Model kalıba uymayan bir yanıt verirse Yapılandır hatayı modele bildirir ve yeniden dener }
  kişi := Yapılandır('Şu cümledeki kişiyi çıkar: "Mehmet otuz dört yaşında."', ['ad': 'metin', 'yaş': 'tamsayı'])
  yaz(kişi, 1)

  { Denemeler tükenirse KalıpHatası fırlatılır }
  dene
    Yapılandır('Bu isteğe hep bozuk yanıt gelir.', ['sayı': 'tamsayı'], 2)
  yakala (h)
    yaz(h.tür + ': ' + h.mesaj, 1)
  bitir
bitir.
```

```
Ayşe Demir, 34, İzmir
  hobi: satranç
  hobi: yüzme
Beş yıl sonra: 39
karışık: Teslimat gecikmiş ama ürün beğenilmiş.
['ad': 'Mehmet', 'yaş': 34]
KalıpHatası: Model 2 denemede kalıba uyan yanıt vermedi (yanıt geçerli bir JSON değil)
```

`kişi['yaş'] + 5` işlemi, gelen değerin metin değil gerçekten tamsayı olduğunu gösterir.

Kalıp şöyle yazılır:

- `'metin'`, `'tamsayı'`, `'ondalık'`, `'mantıksal'`: tek bir değer;
- `'olumlu|olumsuz|karışık'`: yalnızca bu seçeneklerden biri;
- `['metin']`: liste; içindeki tek eleman, liste elemanlarının kalıbıdır;
- `['ad': 'metin', 'yaş': 'tamsayı']`: nesne; değerler yine birer kalıptır ve iç içe yazılabilir.

`Yapılandır` üç şey yapar. Kalıbı JSON Şemasına çevirip isteğe ekler; Ollama, modelin çıktısını bu şemaya uymaya zorlar. Gelen yanıtı çözer ve şemaya gerçekten uyup uymadığını kendisi de denetler. Uymuyorsa neyin yanlış olduğunu (örneğin `yanıt.yaş: tamsayı bekleniyordu, metin geldi`) modele bildirip yeniden dener. Üçüncü örnekte olan budur: sınama servisi ilk seferde yaşı metin olarak verir, ikincide düzeltir. Deneme sayısı üçüncü parametredir (varsayılan 3); denemeler tükenirse `KalıpHatası` fırlatılır.

Şemaya uymak, doğru olmak demek değildir: model yaş alanına geçerli bir tamsayı yazar, ama o sayıyı metinden yanlış okumuş olabilir. Önemli verilerde sonucu denetlemeniz gerekir.

**Eksik olanlar.** Bütün alanlar zorunludur; isteğe bağlı alan, sayı aralığı, metin deseni gibi kısıtlar yoktur. instructor'ın Pydantic sınıflarıyla sunduğu özel doğrulayıcılar ve akan (kısmi) yanıtlar da yoktur. Gerekirse `ŞemaYap` ile üretilen şemaya kendi kısıtlarınızı ekleyip `Model.Sor(mesajlar, şema)` ile doğrudan gönderebilirsiniz.

## 5. Hafıza: belgelerde anlam araması

Modele kendi belgeleriniz hakkında soru sormanın yolu, belgelerin tamamını değil, soruyla ilgili birkaç parçasını isteğe eklemektir. `Hafıza` birimi bu parçaları bulur. Her metin parçası bir **gömme modeli** ile birkaç yüz sayıdan oluşan bir vektöre çevrilir; anlamca yakın metinlerin vektörleri de birbirine yakın düşer. Arama, sorunun vektörüne en yakın parçaları getirir.

```pascal
program HafızaÖrneği
{ 4. adım: kendi belgelerinizi anlamlarına göre aramak.
  'sqlite::bellek:' geçici bir hafızadır; kalıcı olması için 'sqlite:hafiza.db' yazın. }
kullan Hafıza, Sistem

değişken
  dosya, soru: metin
  bulunan: sözlük

başla
  HafızaAç('sqlite::bellek:')
  ['belgeler/izin.md', 'belgeler/kargo.md', 'belgeler/iade.md'] içindeki her dosya için
    yaz(dosya + ': ' + HafızayaEkle(dosya, DosyaOku(dosya)) + ' parça', 1)
  yaz('Hafızadaki parça sayısı: ' + HafızaSayısı, 1)

  ['Kargo ücreti ne kadar?', 'İade süresi kaç gün?'] içindeki her soru için
  başla
    yaz('', 1)
    yaz('Soru: ' + soru, 1)
    HafızadaAra(soru, 2) içindeki her bulunan için
      yaz('  ' + Yuvarla(bulunan['benzerlik'], 2) + '  ' + bulunan['kaynak'] + '  ' + AltMetin(Değiştir(bulunan['metin'], #10, ' '), 1, 60) + '…', 1)
  bitir
  HafızaKapat
bitir.
```

```
belgeler/izin.md: 2 parça
belgeler/kargo.md: 2 parça
belgeler/iade.md: 2 parça
Hafızadaki parça sayısı: 6

Soru: Kargo ücreti ne kadar?
  0.62  belgeler/kargo.md  500 lira ve üzerindeki siparişlerde kargo ücretsizdir. Daha …
  0.5  belgeler/iade.md  İade kargosunun ücretini, ürün kusurluysa şirket, değilse mü…

Soru: İade süresi kaç gün?
  0.38  belgeler/iade.md  # Örnek Kırtasiye: iade  Bu belge uydurma bir şirketin kural…
  0.34  belgeler/iade.md  İade kargosunun ücretini, ürün kusurluysa şirket, değilse mü…
```

Baştaki sayı benzerliktir (1'e ne kadar yakınsa o kadar benzer). Buradaki sayılar sınama servisinin sözcük sayımına dayanan basit vektörleriyle hesaplanmıştır; gerçek bir gömme modeli eş anlamlı sözcükleri de yakalar ve başka değerler verir.

Örnekteki belgeler uydurma bir şirketin üç kısa kural metnidir (`belgeler/` klasörü). `HafızayaEkle` metni boş satırlardan paragraflara ayırır, kısa paragrafları yaklaşık 300 karakterlik parçalar hâlinde birleştirir, hepsinin vektörünü tek istekle alır ve SQLite tablosuna yazar. Aynı kaynak yeniden eklenirse eskisinin yerini alır.

| Üye | Ne yapar |
| --- | --- |
| `HafızaAç(adres)` | Hafızayı açar; `'sqlite:hafiza.db'` kalıcı, `'sqlite::bellek:'` geçicidir |
| `HafızayaEkle(kaynak, içerik)` | Metni parçalayıp saklar; parça sayısını döndürür |
| `HafızadaAra(soru [, adet])` | En benzer parçaları döndürür: `kaynak`, `metin`, `benzerlik` alanlı sözlükler |
| `HafızaSayısı` | Saklanan parça sayısı |
| `Parçala(içerik [, enÇok])` | Metni parçalara ayırır (kendi başına da kullanılabilir) |
| `HafızaKapat` | Veritabanını kapatır |

Dikkat edilecek iki nokta vardır. Vektörler onları üreten modele özgüdür: gömme modelini değiştirirseniz belgeleri yeniden eklemeniz gerekir. `DosyaOku` yalnızca metin dosyalarını okur; PDF ya da Word belgelerini önce metne çevirmeniz gerekir.

**Eksik olanlar.** Arama, sorunun vektörünü saklanan bütün parçalarla tek tek karşılaştırır; birkaç bin parçaya kadar uygundur. chromadb'nin büyük koleksiyonlar için kullandığı yaklaşık arama dizini, üst veriyle süzme ve birden çok koleksiyon yoktur.

## 6. İş akışı: adımlar, dallanma, döngü

Tek bir model çağrısı çoğu zaman yetmez: önce sorunun türüne bakılır, ona göre arama yapılır ya da yapılmaz, yanıt denetlenir, gerekirse yeniden yazılır. `Akış` birimi bu adımları bir **çizge** olarak tanımlamayı sağlar.

- **Durum** bir sözlüktür; akış boyunca elden ele geçer.
- **Düğüm** durumu alıp güncellenmiş durumu döndüren bir fonksiyondur.
- **Kenar** bir düğümden sonra hangisinin geleceğini söyler.
- **Seçmeli kenar** duruma bakıp sıradaki düğümün adını döndüren bir fonksiyondur; dallanma ve döngü böyle kurulur. `SON` akışı bitirir.

Aşağıdaki akış bir duyuru yazar, onu puanlar ve puan düşükse öneriye göre yeniden yazar:

```pascal
program İşAkışı
{ 5. adım: iş akışı. Bir duyuru metni yazılır, değerlendirilir; puan düşükse öneriye göre
  yeniden yazılır. Akış bir döngü içerir: yaz → değerlendir → (yetersizse) yaz → … }
kullan Akış, Model, Kalıp

fonksiyon TaslakYaz(durum: sözlük): sözlük
değişken istek: metin
başla
  istek := 'Şu konuda iki cümlelik bir duyuru yaz: ' + durum['konu']
  eğer durum['öneri'] <> '' ise istek := istek + #10 + 'Önceki taslak: ' + durum['taslak'] + #10 + 'Şunu düzelt: ' + durum['öneri']
  durum['taslak'] := Sor([Mesaj('user', istek)])
  durum['tur'] := durum['tur'] + 1
  dön durum
bitir

fonksiyon Değerlendir(durum: sözlük): sözlük
değişken karne: sözlük
başla
  karne := Yapılandır('Duyuruyu 1 ile 10 arasında puanla ve tek cümlelik öneri ver: ' + durum['taslak'],
                      ['puan': 'tamsayı', 'öneri': 'metin'])
  durum['puan'] := karne['puan']
  durum['öneri'] := karne['öneri']
  dön durum
bitir

{ Seçici: puan yeterliyse ya da üç tur dolduysa bitir, değilse yeniden yaz }
fonksiyon Sıradaki(durum: sözlük): metin
başla
  eğer (durum['puan'] >= 8) veya (durum['tur'] >= 3) ise dön SON
  dön 'yaz'
bitir

değişken
  sonuç: sözlük

başla
  Düğüm('yaz', TaslakYaz)
  Düğüm('değerlendir', Değerlendir)
  Kenar('yaz', 'değerlendir')
  SeçmeliKenar('değerlendir', Sıradaki)

  sonuç := AkışıÇalıştır('yaz', ['konu': 'Cuma günü ofis taşınıyor', 'taslak': '', 'öneri': '', 'puan': 0, 'tur': 0])
  yaz('İzlenen yol: ' + Birleştir(Akışİzi, ' → '), 1)
  yaz('Tur: ' + sonuç['tur'] + ', puan: ' + sonuç['puan'], 1)
  yaz(sonuç['taslak'], 1)
bitir.
```

```
İzlenen yol: yaz → değerlendir → yaz → değerlendir
Tur: 2, puan: 9
Cuma günü ofisimiz yeni adresine taşınıyor. Eşyalarınızı perşembe akşamına kadar kutulamanızı rica ederiz.
```

İlk taslak 4 puan aldığı için akış `yaz` düğümüne geri dönmüş, ikinci taslak 9 puanla kabul edilmiştir. `Sıradaki` fonksiyonundaki `durum['tur'] >= 3` koşulu, model hiç yeterli puan vermese de döngünün bitmesini sağlar. Buna ek olarak `AkışıÇalıştır` adım sayısı 25'i geçerse hata verir (üçüncü parametreyle değiştirilebilir); modelin kararlarına bağlı döngülerde böyle bir üst sınır bulunması önemlidir.

| Üye | Ne yapar |
| --- | --- |
| `Düğüm(ad, fonksiyon)` | Düğüm tanımlar |
| `Kenar(kaynak, hedef)` | Sabit geçiş |
| `SeçmeliKenar(kaynak, seçici)` | Duruma göre geçiş; seçici bir düğüm adı ya da `SON` döndürür |
| `AkışıÇalıştır(ilk, durum [, enÇokAdım])` | Akışı çalıştırır, son durumu döndürür |
| `Akışİzi` | Son çalıştırmada geçilen düğümlerin listesi |
| `AkışYeni` | Tanımları siler; aynı programda ikinci bir akış kurmak için |

**Eksik olanlar.** Adımlar sırayla çalışır; langgraph'taki paralel dallar, akışı bir adımda durdurup insan onayı bekleme, durumu diske kaydedip kaldığı yerden sürdürme ve araç çağıran hazır ajanlar yoktur. Bir programda aynı anda tek bir akış tanımlı olabilir.

## 7. Hepsi bir arada: asistan

Asistan dört düğümlü bir akıştır. `yönlendir` iletinin belgelerle ilgili bir soru mu yoksa sohbet mi olduğuna karar verir (`Kalıp`). Soruysa `ara` ilgili parçaları bulur (`Hafıza`), `yanıtla` bu parçaları bağlam olarak verip modelden yanıt ister (`Model`). Sohbetse doğrudan `sohbet` düğümü yanıtlar.

```
yönlendir ──belge──→ ara ──→ yanıtla ──→ SON
    └──────sohbet──→ sohbet ──→ SON
```

```pascal
program Asistan
{ Hepsi bir arada: kendi belgelerinizle çalışan yerel asistan.

    yontem 06_asistan.y belgeler/izin.md belgeler/kargo.md belgeler/iade.md

  Verilen dosyalar hafızaya eklenir (asistan.db), sonra sorularınız beklenir.
  Dosya vermeden çalıştırırsanız önceki hafıza kullanılır. Çıkmak için boş satır ya da "çık". }
kullan Model, Kalıp, Hafıza, Akış, Sistem

{ Soru belgelerle mi ilgili, yoksa sohbet mi? }
fonksiyon Yönlendir(durum: sözlük): sözlük
başla
  durum['tür'] := Yapılandır('Kullanıcının iletisi şirket belgelerinden yanıtlanacak bir soru mu (belge), '
                             + 'yoksa selamlaşma ya da genel sohbet mi (sohbet)? İleti: ' + durum['soru'],
                             ['tür': 'belge|sohbet'])['tür']
  dön durum
bitir

fonksiyon Ara(durum: sözlük): sözlük
başla
  durum['bulunanlar'] := HafızadaAra(durum['soru'], 2)
  dön durum
bitir

fonksiyon Yanıtla(durum: sözlük): sözlük
değişken
  bağlam: metin
  b: sözlük
  n: tamsayı
başla
  bağlam := ''
  n := 0
  durum['bulunanlar'] içindeki her b için
  başla
    n := n + 1
    bağlam := bağlam + '[' + n + '] (' + b['kaynak'] + ') ' + b['metin'] + #10 + #10
  bitir
  durum['yanıt'] := Sor([Mesaj('system', 'Yalnızca verilen bağlama dayanarak, kısa ve Türkçe yanıt ver. '
                                        + 'Yanıt bağlamda yoksa "Belgelerde bulamadım." de. Kullandığın parçanın numarasını [1] gibi belirt.'),
                         Mesaj('user', 'Bağlam:' + #10 + bağlam + 'Soru: ' + durum['soru'])])
  dön durum
bitir

fonksiyon Sohbet(durum: sözlük): sözlük
başla
  durum['yanıt'] := Sor([Mesaj('system', 'Yardımsever bir asistansın. Kısa ve Türkçe yanıt ver.'),
                         Mesaj('user', durum['soru'])])
  durum['bulunanlar'] := []
  dön durum
bitir

değişken
  dosya, soru: metin
  durum, b: sözlük
  kaynaklar: liste

başla
  HafızaAç(Ortam('ASISTAN_HAFIZASI', 'sqlite:asistan.db'))
  Argümanlar() içindeki her dosya için
    yaz(dosya + ': ' + HafızayaEkle(dosya, DosyaOku(dosya)) + ' parça eklendi', 1)
  yaz('Hafızada ' + HafızaSayısı + ' parça var. Sorunuzu yazın (çıkmak için boş satır).', 1)

  Düğüm('yönlendir', Yönlendir)
  Düğüm('ara', Ara)
  Düğüm('yanıtla', Yanıtla)
  Düğüm('sohbet', Sohbet)
  SeçmeliKenar('yönlendir', fonksiyon(d) başla eğer d['tür'] = 'belge' ise dön 'ara'; dön 'sohbet' bitir)
  Kenar('ara', 'yanıtla')

  doğru iken
  başla
    yaz('> ')
    dene
      oku(soru, 1)
    yakala (h)
      soru := ''
    bitir
    soru := Kırp(soru)
    eğer (soru = '') veya (soru = 'çık') ise kır
    dene
      durum := AkışıÇalıştır('yönlendir', ['soru': soru])
      yaz(durum['yanıt'], 1)
      kaynaklar := []
      durum['bulunanlar'] içindeki her b için
        eğer değil (b['kaynak'] içinde kaynaklar) ise Ekle(kaynaklar, b['kaynak'])
      eğer Uzunluk(kaynaklar) > 0 ise yaz('  Bakılan belgeler: ' + Birleştir(kaynaklar, ', '), 1)
    yakala (h)
      yaz('Yanıt alınamadı: ' + h.mesaj, 1)
    bitir
  bitir
  HafızaKapat
  yaz('Görüşmek üzere.', 1)
bitir.
```

Çalıştırırken eklenecek belgeler argüman olarak verilir:

```
yontem 06_asistan.y belgeler/izin.md belgeler/kargo.md belgeler/iade.md
```

```
belgeler/izin.md: 2 parça eklendi
belgeler/kargo.md: 2 parça eklendi
belgeler/iade.md: 2 parça eklendi
Hafızada 6 parça var. Sorunuzu yazın (çıkmak için boş satır).
> Merhaba, nasılsın?
Merhaba! İyiyim, size nasıl yardımcı olabilirim?
> Kargo ücreti ne kadar?
500 lira ve üzerindeki siparişlerde kargo ücretsiz, daha küçük siparişlerde 60 liradır [1].
  Bakılan belgeler: belgeler/kargo.md, belgeler/iade.md
> Kaç gün içinde iade edebilirim?
Teslim gününden başlayarak 14 gün içinde iade edebilirsiniz [1].
  Bakılan belgeler: belgeler/iade.md
> Ofiste kahve makinesi var mı?
Belgelerde bulamadım.
  Bakılan belgeler: belgeler/iade.md
> 
Görüşmek üzere.
```

Belgeler `asistan.db` dosyasında saklanır; sonraki çalıştırmalarda dosya adı vermeden `yontem 06_asistan.y` yazmak yeterlidir. Kendi belgelerinizi kullanmak için metin (`.txt`, `.md`) dosyalarınızın yollarını vermeniz yeterlidir.

`Yanıtla` düğümündeki sistem iletisi asistanın en önemli kuralını taşır: yalnızca verilen bağlama dayanmak ve bağlamda yoksa bunu söylemek. Son soruda olan budur. Gerçek modeller bu kurala çoğu zaman uyar, ama her zaman değil; asistanın yanıtının altında bakılan belgelerin adlarının yazması, yanıtı kaynağından denetleyebilmeniz içindir.

Asistan her soruyu tek başına ele alır; önceki soruları hatırlamaz. Hatırlamasını isterseniz 2. bölümdeki gibi önceki iletileri bir listede biriktirip `Sor`'a vermeniz gerekir.

## 8. Değerlendirme: aynı anda çok soru

Bir modeli seçerken ya da istemi değiştirirken, onu bir soru setiyle ölçmek gerekir. Sorular birbirinden bağımsızdır; sırayla sormak, toplam süreyi soru sayısıyla çarpar. Yöntem'in `aynı anda` döngüsü gövdeleri birlikte çalıştırır: bir gövde `Sor`'un içindeki isteğe varınca bekler, öteki gövdeler sürer ve bekleyen istekler birlikte gönderilir. `en çok 4` aynı anda en fazla dört soru sorulmasını sağlar; Ollama'nın aynı anda kaç isteğe yanıt verebildiğine göre ayarlanır (`OLLAMA_NUM_PARALLEL`).

```pascal
program Değerlendirme
{ 8. adım: modeli bir soru setiyle ölçmek. Sorular 'aynı anda' döngüsüyle birlikte sorulur:
  istekler turlar halinde paralel gider, sonuçların sırası her çalıştırmada aynıdır. }
kullan Model

değişken
  vakalar, sonuçlar: liste
  vaka: sözlük
  puan, i: tamsayı

{ Yanıt beklenen sözcüğü içeriyorsa tutmuş sayılır (büyük/küçük harf ayırt edilmez) }
fonksiyon Puanla(yanıt, beklenen: metin): mantıksal
başla
  dön KüçükHarf(beklenen) içinde KüçükHarf(yanıt)
bitir

başla
  vakalar := [
    ['soru': 'Türkiye''nin başkenti neresi?', 'beklenen': 'Ankara'],
    ['soru': 'Bir haftada kaç gün var?', 'beklenen': 'yedi'],
    ['soru': 'Suyun kimyasal formülü nedir?', 'beklenen': 'H2O'],
    ['soru': 'Güneş sistemindeki en büyük gezegen hangisi?', 'beklenen': 'Jüpiter'],
    ['soru': 'İstanbul hangi iki kıtadadır?', 'beklenen': 'Asya'],
    ['soru': 'Bir yılda kaç ay var?', 'beklenen': 'on iki']
  ]

  sonuçlar := []
  aynı anda en çok 4 vakalar içindeki her i, vaka için
  başla
    değişken yanıt := Sor([Mesaj('system', 'Kısa ve Türkçe yanıt ver.'), Mesaj('user', vaka['soru'])])
    Ekle(sonuçlar, ['no': i, 'yanıt': yanıt, 'tuttu': Puanla(yanıt, vaka['beklenen'])])
  bitir

  puan := 0
  Sırala(sonuçlar, fonksiyon(s) => s['no']) içindeki her vaka için
  başla
    eğer vaka['tuttu'] ise puan := puan + 1
    yaz((eğer vaka['tuttu'] ise '✓ ' değilse '✗ ') + vakalar[vaka['no']]['soru'] + ' → ' + vaka['yanıt'], 1)
  bitir
  yaz('', 1)
  yaz('Doğru: ' + puan + '/' + Uzunluk(vakalar), 1)
bitir.
```

```
✓ Türkiye'nin başkenti neresi? → Ankara
✓ Bir haftada kaç gün var? → Bir haftada yedi gün vardır.
✓ Suyun kimyasal formülü nedir? → Suyun formülü H2O'dur.
✗ Güneş sistemindeki en büyük gezegen hangisi? → Satürn.
✓ İstanbul hangi iki kıtadadır? → İstanbul Avrupa ve Asya kıtalarındadır.
✗ Bir yılda kaç ay var? → Bir yılda 12 ay vardır.

Doğru: 4/6
```

İki noktaya dikkat:

- Gövde dışarıdaki bir değişkene atama yapamaz; aynı anda çalışan gövdeler birbirinin değerini ezmesin diye bu bir hatadır. Sonuçlar `Ekle` ile ortak bir listede toplanır, sayım döngüden sonra yapılır. Sonuçların sırası her çalıştırmada aynıdır; yine de numarayla saklamak, sonuçları sorulara bağlamayı açık eder.
- Buradaki puanlama kabadır: "12 ay" yanıtı doğru olduğu hâlde "on iki" aranırken tutmaz. Gerçek değerlendirmelerde beklenen yanıtın birkaç yazımı kabul edilir ya da yanıtı başka bir model puanlar (4. bölümdeki `Yapılandır` ile, örneğin `['doğru': 'mantıksal']` kalıbıyla).

## 9. Sınırlar

| Konu | Durum |
| --- | --- |
| Gerçek modelle sınama | Yapılmadı; programlar Ollama'nın belgelenen arayüzüne göre yazıldı ve sınama servisiyle doğrulandı |
| Yanıtın akması | Yok; yanıt tamamı hazır olunca gelir |
| Araç çağırma (modelin işlev çağırması) | Bu kılavuzda yok |
| Belge türleri | Yalnızca metin dosyaları; PDF ve Word önce metne çevrilmelidir |
| Hafıza boyutu | Birkaç bin parçaya kadar; daha büyüğü için özel bir vektör veritabanı gerekir |
| Tarayıcı ve oyun alanı | Uygun değil: `Veritabanı` birimi tarayıcıda yoktur; tarayıcı yerel servise de ancak servis izin verirse (CORS) bağlanır |
| ESP32 | Uygun değil; `Ağ`, `Veri` ve `Veritabanı` birimleri gömülü arka uçta yoktur |
| Hız | Ölçülmedi. Yanıt süresini büyük ölçüde model ve donanım belirler |
| Yanıtların doğruluğu | Model yanılabilir; önemli kararlarda yanıtı kaynağından denetlemeniz gerekir |

**Gizlilik.** Adres `localhost` olduğu sürece sorularınız ve belgeleriniz bilgisayarınızdan çıkmaz: Yöntem programı Ollama'ya, Ollama da indirdiğiniz modele yerel olarak bağlanır. `asistan.db` dosyası belgelerinizin metnini içerir; onu belgelerin kendisi gibi korumanız gerekir.

## Ek A — Sınama

Örneklerin testi, sınama servisini kendisi başlatır ve yedi programı iki uygulamada çalıştırır:

```
node js/betikler/asistan_testi.js
```

Her program için üç şey denetlenir: JavaScript derleyicisinin çıktısı `.beklenen.txt` dosyasıyla aynı mı, Python yorumlayıcısının çıktısı JavaScript ile aynı mı, iki uygulama servise aynı istekleri mi gönderdi. Kayıtlı yanıtlar `asistan_ornekleri/sinama/yanitlar.json` dosyasındadır.

Kendi kurulumunuzu gerçek modelle denedikten sonra karşılaştığınız farkları bildirmeniz, bu kılavuzun "gerçek modelle sınanmadı" notunu kaldırmamıza yardımcı olur: [github.com/onderornek/yontem/issues](https://github.com/onderornek/yontem/issues)

## Ek B — Birimlerin kaynağı

### Model.y

```pascal
birim Model
{ Dil modeline tek kapı: programın geri kalanı hangi servisin kullanıldığını bilmez.
  İki sağlayıcı tanır:
    'ollama'  Ollama'nın kendi arayüzü           (/api/chat, /api/embed)
    'openai'  OpenAI uyumlu her servis           (/v1/chat/completions, /v1/embeddings)
  Ayarlar ortam değişkenlerinden okunur; ModelAyarla ile programdan da değiştirilebilir. }
kullan Ağ, Veri, Sistem

arayüz
  prosedür ModelAyarla(yeni: sözlük)
  fonksiyon ModelAyarı(ad: metin): herhangi
  fonksiyon Mesaj(rol, içerik: metin): sözlük
  fonksiyon Sor(mesajlar: liste; şema: herhangi = boş): metin
  fonksiyon Göm(metinler: liste): liste

uygulama

değişken
  ayar: sözlük

prosedür ModelAyarla(yeni: sözlük)
değişken ad: metin
başla
  Anahtarlar(yeni) içindeki her ad için
  başla
    eğer değil (ad içinde ayar) ise fırlat Hata('Bilinmeyen model ayarı: ' + ad, 'ModelHatası')
    ayar[ad] := yeni[ad]
  bitir
bitir

fonksiyon ModelAyarı(ad: metin): herhangi
başla
  dön ayar[ad]
bitir

fonksiyon Mesaj(rol, içerik: metin): sözlük
başla
  dön ['role': rol, 'content': içerik]
bitir

{ İsteği gönderir, yanıtı JSON olarak çözer. Ulaşılamayan servis ve 200 dışındaki durumlar ModelHatası olur. }
fonksiyon Gönder(yol: metin; gövde: sözlük): herhangi
değişken
  başlıklar, yanıt: sözlük
başla
  başlıklar := ['Content-Type': 'application/json']
  eğer ayar['anahtar'] <> '' ise başlıklar['Authorization'] := 'Bearer ' + ayar['anahtar']
  dene
    yanıt := HttpGönder(ayar['adres'] + yol, JSONYap(gövde), başlıklar, ayar['süre'])
  yakala (h)
    fırlat Hata('Model servisine ulaşılamadı (' + ayar['adres'] + '). Servis çalışıyor mu? Ayrıntı: ' + h.mesaj, 'ModelHatası')
  bitir
  eğer yanıt['durum'] <> 200 ise
    fırlat Hata('Model servisi ' + yanıt['durum'] + ' döndürdü: ' + Kırp(yanıt['gövde']), 'ModelHatası')
  dön JSONÇöz(yanıt['gövde'])
bitir

{ Sohbet isteği. 'şema' verilirse (JSON Şeması) yanıt o şemaya uyan bir JSON metni olur. }
fonksiyon Sor(mesajlar: liste; şema: herhangi = boş): metin
değişken
  gövde: sözlük
  veri: herhangi
başla
  eğer ayar['sağlayıcı'] = 'ollama' ise
  başla
    gövde := ['model': ayar['model'], 'messages': mesajlar, 'stream': yanlış,
              'options': ['temperature': ayar['sıcaklık']]]
    eğer şema <> boş ise gövde['format'] := şema
    veri := Gönder('/api/chat', gövde)
    dön veri['message']['content']
  bitir
  gövde := ['model': ayar['model'], 'messages': mesajlar, 'stream': yanlış, 'temperature': ayar['sıcaklık']]
  eğer şema <> boş ise
    gövde['response_format'] := ['type': 'json_schema', 'json_schema': ['name': 'yanit', 'schema': şema]]
  veri := Gönder('/v1/chat/completions', gövde)
  dön veri['choices'][0]['message']['content']
bitir

{ Her metin için bir gömme vektörü (ondalık listesi) döndürür. }
fonksiyon Göm(metinler: liste): liste
değişken
  veri: herhangi
  satır: herhangi
  vektörler: liste
başla
  eğer ayar['sağlayıcı'] = 'ollama' ise
  başla
    veri := Gönder('/api/embed', ['model': ayar['gömme'], 'input': metinler])
    dön veri['embeddings']
  bitir
  veri := Gönder('/v1/embeddings', ['model': ayar['gömme'], 'input': metinler])
  vektörler := []
  veri['data'] içindeki her satır için Ekle(vektörler, satır['embedding'])
  dön vektörler
bitir

başla
  ayar := ['sağlayıcı': Ortam('YONTEM_MODEL_SAGLAYICI', 'ollama'),
           'adres': Ortam('YONTEM_MODEL_ADRESI', 'http://localhost:11434'),
           'model': Ortam('YONTEM_MODEL', 'gemma4:e2b'),
           'gömme': Ortam('YONTEM_GOMME_MODELI', 'embeddinggemma'),
           'anahtar': Ortam('YONTEM_MODEL_ANAHTARI', ''),
           'sıcaklık': 0,
           'süre': 300]
bitir.
```

### Kalip.y

```pascal
birim Kalıp
{ Modelden düzgün, tipli çıktı almak. Kısa bir kalıp yazılır, birim onu JSON Şemasına çevirir,
  modelin yanıtını çözer ve şemaya uyup uymadığını denetler. Uymazsa hatayı modele bildirip yeniden dener.

  Kalıp yazımı:
    'metin' 'tamsayı' 'ondalık' 'mantıksal'     tek değer
    'olumlu|olumsuz|nötr'                        yalnızca bu seçeneklerden biri
    ['metin']                                    liste (tek elemanı, elemanların kalıbıdır)
    ['ad': 'metin', 'yaş': 'tamsayı']            nesne; bütün alanlar zorunludur }
kullan Model, Veri

arayüz
  fonksiyon ŞemaYap(kalıp: herhangi): sözlük
  fonksiyon ŞemaHatası(değer: herhangi; şema: sözlük; yol: metin = 'yanıt'): metin
  fonksiyon Yapılandır(istek: metin; kalıp: herhangi; deneme: tamsayı = 3): herhangi

uygulama

fonksiyon ŞemaYap(kalıp: herhangi): sözlük
değişken
  özellikler: sözlük
  ad: metin
başla
  eğer Tür(kalıp) = 'sözlük' ise
  başla
    özellikler := [:]
    Anahtarlar(kalıp) içindeki her ad için özellikler[ad] := ŞemaYap(kalıp[ad])
    dön ['type': 'object', 'properties': özellikler, 'required': Anahtarlar(kalıp)]
  bitir
  eğer Tür(kalıp) = 'liste' ise
  başla
    eğer Uzunluk(kalıp) <> 1 ise fırlat Hata('Liste kalıbı tek elemanlı olmalı: [''metin''] gibi', 'KalıpHatası')
    dön ['type': 'array', 'items': ŞemaYap(kalıp[0])]
  bitir
  eğer Tür(kalıp) <> 'metin' ise fırlat Hata('Geçersiz kalıp: ' + kalıp, 'KalıpHatası')
  eğer Konum('|', kalıp) > 0 ise dön ['type': 'string', 'enum': Ayır(kalıp, '|')]
  eğer kalıp = 'metin' ise dön ['type': 'string']
  eğer (kalıp = 'tamsayı') veya (kalıp = 'tamsayi') ise dön ['type': 'integer']
  eğer (kalıp = 'ondalık') veya (kalıp = 'ondalik') ise dön ['type': 'number']
  eğer (kalıp = 'mantıksal') veya (kalıp = 'mantiksal') ise dön ['type': 'boolean']
  fırlat Hata('Bilinmeyen kalıp tipi: ' + kalıp, 'KalıpHatası')
bitir

{ Değer şemaya uyuyorsa boş metin, uymuyorsa ilk uyumsuzluğu anlatan bir cümle döndürür. }
fonksiyon ŞemaHatası(değer: herhangi; şema: sözlük; yol: metin = 'yanıt'): metin
değişken
  beklenen, gelen, ad, alt: metin
  i: tamsayı
başla
  beklenen := şema['type']
  gelen := Tür(değer)
  eğer beklenen = 'object' ise
  başla
    eğer gelen <> 'sözlük' ise dön yol + ': nesne bekleniyordu, ' + gelen + ' geldi'
    şema['required'] içindeki her ad için
    başla
      eğer değil (ad içinde değer) ise dön yol + ': ''' + ad + ''' alanı eksik'
      alt := ŞemaHatası(değer[ad], şema['properties'][ad], yol + '.' + ad)
      eğer alt <> '' ise dön alt
    bitir
    dön ''
  bitir
  eğer beklenen = 'array' ise
  başla
    eğer gelen <> 'liste' ise dön yol + ': liste bekleniyordu, ' + gelen + ' geldi'
    i := 0
    i < Uzunluk(değer) iken
    başla
      alt := ŞemaHatası(değer[i], şema['items'], yol + '[' + i + ']')
      eğer alt <> '' ise dön alt
      i := i + 1
    bitir
    dön ''
  bitir
  eğer beklenen = 'string' ise
  başla
    eğer gelen <> 'metin' ise dön yol + ': metin bekleniyordu, ' + gelen + ' geldi'
    eğer ('enum' içinde şema) ve değil (değer içinde şema['enum']) ise
      dön yol + ': ''' + değer + ''' geçerli değil; seçenekler: ' + Birleştir(şema['enum'], ', ')
    dön ''
  bitir
  eğer (beklenen = 'integer') ve (gelen <> 'tamsayı') ise dön yol + ': tamsayı bekleniyordu, ' + gelen + ' geldi'
  eğer (beklenen = 'number') ve (gelen <> 'tamsayı') ve (gelen <> 'ondalık') ise dön yol + ': sayı bekleniyordu, ' + gelen + ' geldi'
  eğer (beklenen = 'boolean') ve (gelen <> 'mantıksal') ise dön yol + ': mantıksal bekleniyordu, ' + gelen + ' geldi'
  dön ''
bitir

{ İsteği modele gönderir; kalıba uyan değeri (sözlük, liste ya da tek değer) döndürür. }
fonksiyon Yapılandır(istek: metin; kalıp: herhangi; deneme: tamsayı = 3): herhangi
değişken
  şema: sözlük
  mesajlar: liste
  ham, sorun: metin
  değer: herhangi
  i: tamsayı
başla
  şema := ŞemaYap(kalıp)
  mesajlar := [Mesaj('system', 'Yalnızca şu JSON şemasına uyan bir JSON değeri döndür, başka hiçbir şey yazma: ' + JSONYap(şema)),
               Mesaj('user', istek)]
  sorun := ''
  1'den deneme'ye kadar her i için
  başla
    ham := Sor(mesajlar, şema)
    dene
      değer := JSONÇöz(ham)
      sorun := ŞemaHatası(değer, şema)
    yakala (h)
      sorun := 'yanıt geçerli bir JSON değil'
    bitir
    eğer sorun = '' ise dön değer
    Ekle(mesajlar, Mesaj('assistant', ham))
    Ekle(mesajlar, Mesaj('user', 'Yanıtın geçersiz: ' + sorun + '. Yalnızca şemaya uyan JSON döndür.'))
  bitir
  fırlat Hata('Model ' + deneme + ' denemede kalıba uyan yanıt vermedi (' + sorun + ')', 'KalıpHatası')
bitir

bitir.
```

### Hafiza.y

```pascal
birim Hafıza
{ Belgeleri anlamlarına göre aramak için küçük bir vektör deposu.
  Metin parçalara ayrılır, her parçanın gömme vektörü Model.Göm ile alınır ve bir SQLite tablosunda saklanır.
  Arama, sorunun vektörüne en yakın parçaları kosinüs benzerliğiyle bulur.
  Bütün parçalar tek tek karşılaştırılır; birkaç bin parçaya kadar uygundur. }
kullan Model, Veritabanı, Veri

arayüz
  prosedür HafızaAç(adres: metin)
  prosedür HafızaKapat
  fonksiyon Parçala(içerik: metin; enÇok: tamsayı = 300): liste
  fonksiyon HafızayaEkle(kaynak, içerik: metin): tamsayı
  fonksiyon HafızadaAra(soru: metin; adet: tamsayı = 3): liste
  fonksiyon HafızaSayısı: tamsayı

uygulama

değişken
  vt: herhangi

prosedür HafızaAç(adres: metin)
başla
  vt := Bağlan(adres)
  vt.Çalıştır('CREATE TABLE IF NOT EXISTS parca (no INTEGER PRIMARY KEY, kaynak TEXT NOT NULL, metin TEXT NOT NULL, vektor TEXT NOT NULL)')
bitir

prosedür HafızaKapat
başla
  vt.Kapat
bitir

fonksiyon HafızaSayısı: tamsayı
başla
  dön vt.TekDeğer('SELECT COUNT(*) FROM parca')
bitir

{ Metni boş satırlardan paragraflara ayırır; kısa paragrafları 'enÇok' karakteri geçmeyecek biçimde birleştirir. }
fonksiyon Parçala(içerik: metin; enÇok: tamsayı = 300): liste
değişken
  parçalar: liste
  paragraf, biriken: metin
başla
  parçalar := []
  biriken := ''
  Ayır(Değiştir(içerik, #13, ''), #10 + #10) içindeki her paragraf için
  başla
    paragraf := Kırp(paragraf)
    eğer paragraf = '' ise devam
    eğer biriken = '' ise biriken := paragraf
    değilse eğer Uzunluk(biriken) + Uzunluk(paragraf) + 2 <= enÇok ise biriken := biriken + #10 + #10 + paragraf
    değilse
    başla
      Ekle(parçalar, biriken)
      biriken := paragraf
    bitir
  bitir
  eğer biriken <> '' ise Ekle(parçalar, biriken)
  dön parçalar
bitir

{ Vektörü uzunluğu 1 olacak biçimde ölçekler; böylece benzerlik yalnızca bir iç çarpım olur. }
fonksiyon Birimle(v: liste): liste
değişken
  x: ondalık
  boy: ondalık
  yeni: liste
başla
  boy := 0
  v içindeki her x için boy := boy + x * x
  boy := Kök(boy)
  eğer boy = 0 ise dön v
  yeni := []
  v içindeki her x için Ekle(yeni, x / boy)
  dön yeni
bitir

{ Kaynağı parçalayıp saklar; aynı kaynak daha önce eklendiyse eskisinin yerini alır. Parça sayısını döndürür. }
fonksiyon HafızayaEkle(kaynak, içerik: metin): tamsayı
değişken
  parçalar, vektörler: liste
  i: tamsayı
başla
  parçalar := Parçala(içerik)
  eğer Uzunluk(parçalar) = 0 ise dön 0
  vektörler := Göm(parçalar)
  vt.İşlemBaşlat
  vt.Çalıştır('DELETE FROM parca WHERE kaynak = ?', [kaynak])
  i := 0
  i < Uzunluk(parçalar) iken
  başla
    vt.Çalıştır('INSERT INTO parca (kaynak, metin, vektor) VALUES (?, ?, ?)', [kaynak, parçalar[i], JSONYap(Birimle(vektörler[i]))])
    i := i + 1
  bitir
  vt.Onayla
  dön Uzunluk(parçalar)
bitir

{ Soruya en yakın 'adet' parçayı, en benzerden başlayarak döndürür:
  her biri ['kaynak', 'metin', 'benzerlik'] alanlı bir sözlüktür. }
fonksiyon HafızadaAra(soru: metin; adet: tamsayı = 3): liste
değişken
  s, v, adaylar, seçilen: liste
  satır, aday, enİyi: herhangi
  toplam: ondalık
  i: tamsayı
başla
  s := Birimle(Göm([soru])[0])
  adaylar := []
  vt.Sorgula('SELECT kaynak, metin, vektor FROM parca ORDER BY no') içindeki her satır için
  başla
    v := JSONÇöz(satır['vektor'])
    toplam := 0
    i := 0
    i < Uzunluk(v) iken
    başla
      toplam := toplam + s[i] * v[i]
      i := i + 1
    bitir
    Ekle(adaylar, ['kaynak': satır['kaynak'], 'metin': satır['metin'], 'benzerlik': toplam])
  bitir
  seçilen := []
  (Uzunluk(seçilen) < adet) ve (Uzunluk(adaylar) > 0) iken
  başla
    enİyi := adaylar[0]
    adaylar içindeki her aday için
      eğer aday['benzerlik'] > enİyi['benzerlik'] ise enİyi := aday
    Ekle(seçilen, enİyi)
    Sil(adaylar, adaylar.Bul(enİyi))
  bitir
  dön seçilen
bitir

bitir.
```

### Akis.y

```pascal
birim Akış
{ İş akışı: adımları (düğümleri) ve aralarındaki geçişleri (kenarları) bir çizge olarak tanımlar.
  Her düğüm, durumu (bir sözlük) alıp güncellenmiş durumu döndüren bir fonksiyondur.
  Seçmeli kenar, duruma bakıp sıradaki düğümün adını söyleyen bir fonksiyondur; böylece
  dallanma ve döngü kurulabilir. 'SON' adı akışı bitirir. }

arayüz
  sabit SON = 'SON'
  prosedür AkışYeni
  prosedür Düğüm(ad: metin; iş: herhangi)
  prosedür Kenar(kaynak, hedef: metin)
  prosedür SeçmeliKenar(kaynak: metin; seçici: herhangi)
  fonksiyon AkışıÇalıştır(ilk: metin; durum: sözlük; enÇokAdım: tamsayı = 25): sözlük
  fonksiyon Akışİzi: liste

uygulama

değişken
  düğümler, kenarlar, seçiciler: sözlük
  iz: liste

prosedür AkışYeni
başla
  düğümler := [:]
  kenarlar := [:]
  seçiciler := [:]
  iz := []
bitir

prosedür Düğüm(ad: metin; iş: herhangi)
başla
  eğer ad = SON ise fırlat Hata('''SON'' bir düğüm adı olamaz', 'AkışHatası')
  düğümler[ad] := iş
bitir

prosedür Kenar(kaynak, hedef: metin)
başla
  kenarlar[kaynak] := hedef
bitir

prosedür SeçmeliKenar(kaynak: metin; seçici: herhangi)
başla
  seçiciler[kaynak] := seçici
bitir

fonksiyon Akışİzi: liste
başla
  dön iz
bitir

{ 'ilk' düğümden başlar, SON'a varana kadar kenarları izler; son durumu döndürür.
  Adım sayısı 'enÇokAdım'ı geçerse sonsuz döngüye karşı hata verir. }
fonksiyon AkışıÇalıştır(ilk: metin; durum: sözlük; enÇokAdım: tamsayı = 25): sözlük
değişken
  şimdiki: metin
  adım: tamsayı
başla
  şimdiki := ilk
  adım := 0
  iz := []
  şimdiki <> SON iken
  başla
    eğer değil (şimdiki içinde düğümler) ise fırlat Hata('Tanımsız düğüm: ' + şimdiki, 'AkışHatası')
    adım := adım + 1
    eğer adım > enÇokAdım ise fırlat Hata('Akış ' + enÇokAdım + ' adımda bitmedi; döngüyü denetleyin', 'AkışHatası')
    Ekle(iz, şimdiki)
    durum := düğümler[şimdiki](durum)
    eğer şimdiki içinde seçiciler ise şimdiki := seçiciler[şimdiki](durum)
    değilse eğer şimdiki içinde kenarlar ise şimdiki := kenarlar[şimdiki]
    değilse şimdiki := SON
  bitir
  dön durum
bitir

başla
  AkışYeni
bitir.
```
