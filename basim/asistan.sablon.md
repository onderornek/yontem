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

7\. bölüm beşini birleştirip asistanı kurar. 8. bölüm bu kurulumun yapamadıklarını anlatır.

**Bu birimler küçük birer karşılıktır, eşdeğer değildir.** Adı geçen kütüphaneler yıllardır geliştirilen, çok daha geniş araçlardır. Buradaki birimler onların en çok kullanılan çekirdeğini verir; her bölümün sonunda neyin eksik olduğu yazılıdır. Karşılığında bütün kod okunabilecek kadar kısadır ve Ek B'de tamamı verilmiştir.

**Programlar nasıl sınandı?** Bu kılavuzdaki programlar gerçek bir dil modeliyle değil, Ollama'nın arayüzünü taklit eden bir sınama servisiyle çalıştırılmıştır (`js/betikler/sahte_ollama.js`). Servis, sohbet isteklerine önceden kaydedilmiş yanıtları verir. Bu yüzden:

- programların altındaki çıktılar o kayıtlı yanıtlarla alınmıştır; gerçek bir model aynı soruya başka sözcüklerle, bazen de yanlış yanıt verir;
- sınanan şey programların gönderdiği isteklerin biçimi, yanıtların işlenmesi, kalıp denetimi, arama ve akıştır; iki uygulama da (JavaScript derleyicisi ve Python yorumlayıcısı) aynı istekleri gönderir ve aynı çıktıyı verir;
- isteklerin biçimi Ollama'nın belgelerindeki `/api/chat` ve `/api/embed` tanımlarına göre yazılmıştır, ama bu kılavuz yazılırken gerçek bir Ollama kurulumuyla denenmemiştir. İlk çalıştırmada bir uyumsuzlukla karşılaşırsanız `Model.y` içindeki `Sor` ve `Göm` işlevleri bakılacak tek yerdir.

## 1. Hazırlık

**Yöntem.** Komut satırı sürümü gerekir; oyun alanı bu iş için uygun değildir (8. bölüm). Hafıza SQLite kullandığı için Node.js 22.5 ya da yenisi gerekir.

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

<<kod:01_beyin>>

<<cikti:01_beyin>>

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

<<kod:02_kumanda>>

<<cikti:02_kumanda>>

`Model` iki arayüz tanır:

| Sağlayıcı | Kullandığı yollar | Kimler sunar |
| --- | --- | --- |
| `ollama` | `/api/chat`, `/api/embed` | Ollama |
| `openai` | `/v1/chat/completions`, `/v1/embeddings` | Ollama, LM Studio, llama.cpp sunucusu ve OpenAI uyumlu bulut servisleri |

Bir bulut servisine geçerseniz sorularınız ve belgelerinizden seçilen parçalar o servise gönderilir; "yerel" olma özelliği yalnızca adres kendi bilgisayarınızı gösterdiği sürece geçerlidir. Anahtarı programa yazmak yerine `YONTEM_MODEL_ANAHTARI` ortam değişkeniyle vermenizi öneririz.

**Eksik olanlar.** litellm yüzden fazla servisin kendine özgü arayüzünü bilir, maliyet izler, bir servis yanıt vermezse ötekine geçer. `Model` yalnızca iki arayüzü bilir ve bunların hiçbirini yapmaz.

## 4. Düzgün çıktı: tipli veri almak

Model metin üretir; program ise sayı, liste, alan ister. `Kalıp.Yapılandır` ikisinin arasında durur: istediğiniz yapıyı kısa bir kalıpla tarif edersiniz, karşılığında sözlük, liste ya da tek bir değer alırsınız.

<<kod:03_duzgun_cikti>>

<<cikti:03_duzgun_cikti>>

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

<<kod:04_hafiza>>

<<cikti:04_hafiza>>

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

<<kod:05_is_akisi>>

<<cikti:05_is_akisi>>

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

<<kod:06_asistan>>

Çalıştırırken eklenecek belgeler argüman olarak verilir:

```
yontem 06_asistan.y belgeler/izin.md belgeler/kargo.md belgeler/iade.md
```

<<oturum:06_asistan>>

Belgeler `asistan.db` dosyasında saklanır; sonraki çalıştırmalarda dosya adı vermeden `yontem 06_asistan.y` yazmak yeterlidir. Kendi belgelerinizi kullanmak için metin (`.txt`, `.md`) dosyalarınızın yollarını vermeniz yeterlidir.

`Yanıtla` düğümündeki sistem iletisi asistanın en önemli kuralını taşır: yalnızca verilen bağlama dayanmak ve bağlamda yoksa bunu söylemek. Son soruda olan budur. Gerçek modeller bu kurala çoğu zaman uyar, ama her zaman değil; asistanın yanıtının altında bakılan belgelerin adlarının yazması, yanıtı kaynağından denetleyebilmeniz içindir.

Asistan her soruyu tek başına ele alır; önceki soruları hatırlamaz. Hatırlamasını isterseniz 2. bölümdeki gibi önceki iletileri bir listede biriktirip `Sor`'a vermeniz gerekir.

## 8. Sınırlar

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

Örneklerin testi, sınama servisini kendisi başlatır ve altı programı iki uygulamada çalıştırır:

```
node js/betikler/asistan_testi.js
```

Her program için üç şey denetlenir: JavaScript derleyicisinin çıktısı `.beklenen.txt` dosyasıyla aynı mı, Python yorumlayıcısının çıktısı JavaScript ile aynı mı, iki uygulama servise aynı istekleri mi gönderdi. Kayıtlı yanıtlar `asistan_ornekleri/sinama/yanitlar.json` dosyasındadır.

Kendi kurulumunuzu gerçek modelle denedikten sonra karşılaştığınız farkları bildirmeniz, bu kılavuzun "gerçek modelle sınanmadı" notunu kaldırmamıza yardımcı olur: [github.com/onderornek/yontem/issues](https://github.com/onderornek/yontem/issues)

## Ek B — Birimlerin kaynağı

### Model.y

<<kod:Model>>

### Kalip.y

<<kod:Kalip>>

### Hafiza.y

<<kod:Hafiza>>

### Akis.y

<<kod:Akis>>
