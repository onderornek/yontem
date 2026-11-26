# Değişiklik günlüğü

Bu dosya Yöntem'in sürümler arasındaki önemli değişikliklerini listeler. Sürüm numaraları
[anlamsal sürümleme](https://semver.org/lang/tr/) kurallarını izler; 1.0 öncesinde küçük sürümler
uyumsuz değişiklik içerebilir.

## 0.7.0 — 2026-11-26

### Eklenenler

Bu bölümdeki dil eklemeleri, "100 Günde Yapay Zekâ Mühendisliği" kitabının kodları sınanırken çıkan önerilere dayanır.

- **`üret` ve akışlar**: gövdesinde `üret` geçen fonksiyon çağrılınca bir akış (`akış` tipi) döndürür; gövde
  akış `içindeki her … için` ile yinelendikçe çalışır ve her `üret`te durur. Bırakılan akış kapatılır, gövdedeki
  `sonunda` blokları çalışır. Liste bekleyen yerleşikler ve `aynı anda` akışı sonuna kadar okur. JavaScript
  derleyicisi akış gövdelerini JavaScript üreteçlerine çevirir; Python yorumlayıcısı `üret` içeren deyimleri
  Python üreteci olarak yürütür. `üret` yalnızca fonksiyon gövdesinde anlam taşır; başka yerde
  sıradan ad olarak kullanılmaya devam eder.
- **`yoksa` işleci**: `a yoksa b`, `a` hesaplanırken dizinlenen anahtar ya da sıra bulunamazsa ya da değer `boş` ise
  `b`'yi verir (`ayar['port'] yoksa 8080`, `kişi['adres']['şehir'] yoksa '-'`). İç içe dizinlemenin her adımı bu
  kurala uyar; öteki hatalar yükselir. Sağ yan yalnızca gerektiğinde hesaplanır. Boru dışındaki işleçlerden sonra
  bağlar, sağdan birleşir. Bağlama duyarlıdır: `yoksa` sıradan ad olarak kullanılmaya devam eder. Gömülü arka
  uç henüz desteklemez.
- **`Ağ.HttpAkış` ve `Sunucu.AkışYanıt`**: `HttpAkış(adres [, gövde, başlıklar, zamanAşımı])` yanıtı parça parça
  geldikçe okuyan bir akış döndürür: SSE (`text/event-stream`) olayları, ndjson satırları (JSON olarak çözülür) ya
  da metin parçaları. Bağlantı yineleme başlayınca kurulur, akış bırakılınca kapanır; zaman aşımı iki parça
  arasındaki en uzun beklemedir. `AkışYanıt(akış [, tür, durum])` bir akışın değerlerini sunucudan üretildikçe
  gönderir (başlangıçta SSE); istemci koparsa akış kapatılır, `sonunda` blokları çalışır. `İstekİşle` akış
  yanıtını birleştirip döndürür. Tarayıcıda `HttpAkış` yanıtı bütün olarak alıp parçalar.
- **`aynı anda` paralel döngüsü**: `aynı anda [en çok N] liste içindeki her x için …`. Gövdeler birlikte
  çalışır; ağ istekleri (doğrudan ya da çağrılan fonksiyonlar üzerinden) turlar halinde birlikte, paralel
  gönderilir. Sıra programa bağlıdır, zamanlamaya değil; iki uygulama aynı çıktıyı verir. Gövde dışarıdaki
  değişkenlere atama yapamaz, `kır` ve `dön` kullanamaz. JavaScript derleyicisi bunun için programda `aynı anda`
  varsa fonksiyonların üreteç sürümlerini de üretir; Python yorumlayıcısı gövdeleri iş parçacıklarında sırayla
  yürütür. `aynı` ve `anda` sıradan ad olarak kullanılmaya devam eder.
- **Çok satırlı metin:** `""" ... """`. Kaçış yoktur; açılıştan sonraki ve kapanıştan önceki boş satır atılır, satırların
  ortak girintisi silinir. Biçimlendirici bu metinlerin içine dokunmaz.
- **Biçimli metin:** `$'Merhaba {ad}, {n} mesajın var'`, `$"…"`, `$"""…"""`. `{ifade:biçim}` Biçimle biçimlerini kullanır
  (`{t:.2}`, `{ad:<8}`); `{{` ve `}}` ayracın kendisidir. Gömülü arka uç henüz desteklemez.
- **`sına` blokları ve `yontem sına`:** bildirim bölümünde `sına 'ad' başla … bitir`. `yontem sına program.y` her bloğu
  taze bir çalışmada ayrı ayrı yürütür ve `12 geçti, 1 kaldı.` biçiminde raporlar; kalan bloğun hatasını ve yazdıklarını
  gösterir. `yontem test` bu programları blok blok sınar (rapor isteğe bağlı olarak `.sina.beklenen` ile karşılaştırılır).
  `sına` bağlamsal bir sözcüktür: yalnızca ardından metin gelince anlam taşır, `Sına` adlı mevcut adlar bozulmaz.
- **`Biçimle` hizalaması:** `{:<8}` sola, `{:^8}` ortaya yaslar (`{:8}` eskisi gibi sağa).
- **`yontem denetle` uyarıları** (katı kip olmadan da): yerleşik bir fonksiyonu, `kullan` ile gelen bir birim üyesini ya
  da sabiti gölgeleyen değişken, sabit ve parametreler; tanımsız adlar; yerleşik ve kendi fonksiyonlarınızda yanlış
  argüman sayısı. Uyarılar çıkış kodunu değiştirmez; dil sunucusu da düzenleyicide gösterir.
- **Yerel yapay zekâ asistanı kılavuzu ve örnekleri** (`asistan_ornekleri/`, `basim/asistan.md`): Ollama ile konuşan
  `Model`, tipli çıktı alan `Kalıp`, SQLite üzerinde anlam araması yapan `Hafıza` ve adımları çizge olarak tanımlayan
  `Akış` birimleri; altı örnek program. Dilde ve derleyicide değişiklik yoktur; birimler `Ağ`, `Veri` ve `Veritabanı`
  üzerine yazılmıştır. Örnekler gerçek bir modelle değil, Ollama arayüzünü taklit eden sınama servisiyle
  (`js/betikler/sahte_ollama.js`) sınanmıştır.

### Düzeltmeler

- Python sunucusu sınırdan büyük bir gövdeye `413` dönerken gövdeyi okumadan bağlantıyı kapattığı için istemci
  yazarken bağlantı kopabiliyordu (`EPIPE`); gövde artık 64 MB'a kadar okunup atılıyor (JavaScript sunucusu gibi).
- Gölgelenmiş bir adla yapılan çağrının hata iletisi nedeni söyler: `ondalık çağrılamaz: 'Toplam' burada bir değişken;
  aynı adlı yerleşik 'Toplam' fonksiyonunu gölgeliyor` (önceden yalnızca `ondalık çağrılamaz`).
- `Biçimle` tanınmayan bir biçimde (`{:>3x}`) iç hata yerine kullanılabilecek biçimleri sayan bir ileti verir.
- Bildirim bölümünde ad yerine anahtar sözcük yazılırsa (`kayıt: metin`) ileti bunu söyler; önceden "'başla'
  bekleniyordu" deniyordu.
- Atamadaki tip uyuşmazlığı iletisi, değişkenin adını yazıldığı biçimiyle gösterir (`'yaş'`; önceden `'yas'`).

### Uyumsuz değişiklikler

- **Desteği biten sürümler bırakıldı.** En düşük sürümler: Python 3.11 (önceden 3.8) ve Node.js 22 (önceden 18).
  Python 3.8, 3.9 ve 3.10 ile Node.js 18 ve 20 artık güvenlik güncellemesi almıyor. CI, Python 3.11 ve 3.15 ile
  Node.js 22, 24 ve 26 üzerinde sınar; GitHub eylemleri güncel ana sürümlere (`checkout`, `setup-node`, `setup-python`
  v7) taşındı.

## 0.6.1 — 2026-11-15

Dilde ve derleyicide değişiklik yoktur; bu sürüm yayımlama düzenini devreye alır.

### Değişenler

- Sürümler artık GitHub'daki "Sürüm yayımla" iş akışıyla hazırlanır: sürüm numarası değişince testler çalışır ve paket npm'e
  onay bekleyen sürüm olarak gönderilir (`npm stage publish`); bakımcı npmjs.com'da onayladığında yayımlanır. npm'e giriş
  için depoda saklanan bir belirteç yoktur (Trusted Publisher). GitHub sürümü, paket npm'de göründükten sonra oluşturulur.

## 0.6.0 — 2026-11-12

### Uyumsuz değişiklikler

- **Sayan döngünün yazımı yenilendi.** Dört biçim vardır:
  `1'den 10'a kadar her i için` (birer artar), `10'dan 0'a kadar her j için` (birer azalır),
  `a'dan b'ye adımda c artan her d için` ve `z'den y'ye adımda v azalan her u için`.
  `kadar` ile yazılan döngünün yönü, iki sınır da sayı olarak yazıldığında derleme sırasında belirlenir;
  sınırlardan biri değişkense döngü ileriye sayar ve başlangıç bitişten büyükse hiç çalışmaz.
  Adım pozitif bir tamsayı olmalıdır.
- Eski `azalarak` ve `kadar adım N` yazımları kaldırıldı; derleyici bu yazımlarla karşılaştığında
  yenisini gösteren bir hata iletisi verir.
- **Köşeli ayraçla sınır yazımı (`T dizisi[a..b]`) kaldırıldı.** Sabit boyutlu veri için liste bildirilir ve
  boyutu programda verilir: `d: metin listesi` … `d.Uzunluk(12, 1)` (12 eleman, numaralar 1'den başlar;
  `d.Uzunluk(12)` 0'dan başlatır). Boyutu sabitlenen listede `Ekle` ve `Sil` hata verir, sınır dışı erişim
  yakalanır, `d.Alt` ve `d.Üst` sınırları verir; `liste(d)` serbest bir kopya döndürür. Eski yazım yeni
  yazımı gösteren bir hata verir. Sınırsız `T dizisi` tip adı `T listesi` ile eş anlamlı olarak kalır.
- **`Araya` kaldırıldı; yerine `Ekle`'nin üç parametreli biçimi geldi:** `Ekle(L, x)` sona ekler,
  `Ekle(L, x, konum)` verilen konuma yerleştirir (metod olarak `L.Ekle(x)` ve `L.Ekle(x, konum)`).
  `Araya` yazıldığında derleyici yeni yazımı gösteren bir hata verir.

### Eklenenler

- **Logo:** iki noktalı Y işareti ve "Yöntem" yazısı (`site/logo/`: SVG, PNG, favicon); site, kitap sayfaları,
  VS Code eklentisi ve README yeni logoyu kullanır.
- **Dilbilgisi dosyası ve dil başvurusu:** `yontem.gram` dilin sözdizimini PEG gösterimiyle tanımlar;
  *Yöntem Dil Başvurusu* (`basim/basvuru.md`, sitede Belgeler → Dil Başvurusu) sözcük yapısını, tipleri,
  ifadeleri, deyimleri, sınıfları ve birimleri kural kural anlatır.
- **Silmenin iki yeni yazımı:** `L(2).Sil` ve `L listesindeki 2. elemanı Sil` (dizilerde `D dizisindeki …`);
  ikisi de `L.Sil(2)` ile aynı anlama gelir.

### Site ve oyun alanı

- **Oyun alanı:** her örneğin taslağı ayrı saklanır (örnek değiştirince düzenleme kaybolmaz), "Özgün hâline dön / Geri al",
  `.y` olarak indirme, örnek arama (ad, grup ve program metni), `#ornek=<kimlik>` ile doğrudan bağlantı, siteye dönüş
  bağlantıları, dar ekranda okunabilir sonuç paneli, ok tuşlarıyla gezilen sekmeler, Esc + Tab ile düzenleyiciden çıkış.
  Yeni kullanıcı kısa bir "Merhaba, dünya" örneğiyle karşılanır; bozuk örnek başlıkları elle düzeltildi.
- **Site:** ortamlara göre destek tablosu ve ESP32 sınırları ana sayfada; hız ölçümü kapsamıyla birlikte ayrı sayfada
  (`olcumler.html`); kitap kapsamı ("15 bölüm + 3 ek") tek kaynaktan üretilir; her sayfada açıklama, canonical ve
  paylaşım etiketleri; `sitemap.xml`, `robots.txt`; ana sayfada `<main>` ve "İçeriğe geç"; sekmelerde klavye desteği.
- **Sunucu ayarları:** `.htaccess` (HTTP → HTTPS yönlendirmesi, `nosniff`, raporlama kipinde içerik güvenlik politikası,
  önbellek başlıkları). `site/kaynak/kabul_sinamasi.py` bu değişiklikleri gerçek tarayıcıda denetler.

### Değişenler

- Olmayan sözlük anahtarı hatasında Python yorumlayıcısı da anahtarı tırnak içinde gösterir (JavaScript ile aynı).
- Liste ve dizilerde "öğe" yerine "eleman" terimi kullanılıyor (belgeler ve hata iletileri).
- Kitap, kılavuzlar, site (Belgeler → Döngüler, Liste ve dizi), VS Code eklentisi ve oyun alanı yeni yazıma göre güncellendi.

- Kurulum belgeleri npm paketine göre güncellendi: `npm install -g yontem`.
- Site: Öğren, Belgeler, Öğretmenler, Gömülü, Topluluk, Blog ve Gizlilik sayfaları yazıldı (`site/sayfalar/`);
  yazı tipleri site içinden sunuluyor, sayfalar hiçbir dış sunucuya istek göndermiyor.
- Site: Künye (Impressum) sayfası eklendi; gizlilik metni barındırma ve iletişim bilgileriyle tamamlandı;
  ana sayfa ve kurulum sayfası kitaplardaki yumuşak hitaba çevrildi.
- Derleme aracı esbuild 0.28'e yükseltildi (yalnızca geliştirme bağımlılığı).

## 0.5.0 — 2026-11-11

İlk açık sürüm.

### Temel özellikler

- Türkçe anahtar sözcüklü, Pascal soylu dil: tipler, sınıflar ve kalıtım, kayıtlar, birimler,
  hata yönetimi, lambdalar, boru işleci.
- İki uygulama, aynı çıktı: Yöntem → JavaScript derleyicisi (Node.js ve tarayıcı) ve Python yorumlayıcısı.
- Gömülü arka uç: Yöntem → C++17, ESP32 (Arduino/PlatformIO) ve masaüstü benzetimi; `Donanım` birimi.
- Birimler: `Matematik`, `Sistem`, `Veri`, `YZ` (otomatik türevli tensörler, sinir ağları),
  `Kuantum` (devre simülatörü), `Meşale` ve `Sinir` (PyTorch benzeri derin öğrenme).
- Yöntem dilinde yazılmış kitaplık: `Arama`, `Dil`, `İstatistik`, `MakineÖğrenmesi`, `Uzman`,
  `KuantumAlgoritmaları`.
- Tarayıcı oyun alanı ve üç kitap: Programlamaya Giriş, Makine Öğrenmesi, Sıfırdan Dil Modeli.

### Eklenenler
- **Güvenlik birimi** (`kullan Güvenlik`): SHA-256 özeti, HMAC imzası, sabit süreli karşılaştırma,
  PBKDF2 parola özeti, ChaCha20-Poly1305 şifreleme, güvenli rastgele değerler, girdi denetimi
  (XSS, SQL enjeksiyonu, yol geçişi), hız sınırlayıcı, imzalı süreli belirteçler ve güvenlik günlüğü.
- **Ağ birimi** (`kullan Ağ`): HTTP istekleri (`HttpAl`, `HttpGönder`, `Httpİstek`), URL kodlama ve sorgu
  dizgisi. Komut satırında, Python'da ve tarayıcıda çalışır.
- **Desen birimi** (`kullan Desen`): düzenli ifadeler. Kendi eşleştirme motoru sayesinde iki çalışma
  zamanında aynı sonuç; Türkçe harflere duyarlı `\w` ve `'i'` seçeneği; adım sınırıyla kilitlenme koruması.
- **Takvim birimi** (`kullan Takvim`): Unix saniyesiyle tarih ve saat; Türkçe ay ve gün adlarıyla
  yazma ve okuma kalıpları, gün/ay/yıl ekleme, gün farkı, hafta numarası.
- **Pencere ve Mobil birimleri**: düğme, giriş kutusu, tuval gibi arayüz bileşenleri; titreşim,
  bildirim, konum, hareket algılayıcısı ve kalıcı depo. `yontem paketle` bir programı web
  uygulamasına ya da telefona kurulabilen PWA'ya çevirir.
- **`yontem test`**: `.y` programlarını çalıştırıp çıktıyı yanlarındaki `.beklenen` dosyasıyla
  karşılaştırır; `--guncelle` beklenen dosyaları yeniler. Python yorumlayıcısında da vardır.
- **`yontem bicimle`**: kod biçimlendirici. Girintiyi programın yapısına göre kurar, yalnızca
  boşluklara dokunur; `--denetle` ile sürekli tümleştirmede kullanılabilir.
- **`yontem dil-sunucusu`** (kısa adı `lsp`): dil sunucusu. Hata gösterimi, tanımlı görünmeyen adlar için
  yazım hatası uyarısı, tamamlama (dosyadaki adlar, birim üyeleri, yerleşikler),
  imza bilgisi, tanıma git, simge listesi ve biçimlendirme; VS Code eklentisi bunu kullanır.
- **`Veritabanı` birimi**: SQL veritabanlarına tek arayüzle erişim. `Bağlan` adresine göre SQLite
  (yerleşik), PostgreSQL (`pg` / `pg8000`) ya da MySQL/MariaDB (`mysql2` / `pymysql`) bağlantısı açar.
  Sorgular `?` yer tutucularıyla parametrelidir; tipler üç veritabanında ve iki çalışma zamanında aynı
  Yöntem değerlerine çevrilir. İşlemler (`İşlemBaşlat`, `Onayla`, `GeriAl`) ve `SqlAdı` vardır.
- **`Sunucu` birimi**: HTTP sunucusu. `Yol` ile yollar ve `:parametre`'ler, `Statik` ile dosya sunumu,
  `Dinle`, `Yanıt`, `JsonYanıt`, `Yönlendir`; `İstekİşle` isteği ağ olmadan işler (test için).
  Yakalanmayan hatalar istemciye sızmaz; varsayılan olarak yalnızca yerel bağlantılar kabul edilir.
  Kılavuza bu iki birimle kurulan üç katmanlı bir örnek uygulama eklendi.
- **Dizi tipi yazımı değişti:** öğe tipi artık başa yazılır: `tamsayı dizisi`, sınırlı dizilerde
  `ondalık dizisi[1..12]`, iç içe `ondalık dizisi dizisi`. Eski `dizi türünde tamsayı` yazımı
  kaldırıldı; derleyici ve yorumlayıcı eski yazımı görünce yenisini gösteren bir hata verir.
  Listeler ve sözlükler de aynı kalıbı izler: `tamsayı listesi`, `metin sözlüğü`,
  `ondalık listesi listesi`; eski `liste türünde tamsayı` ve `sözlük türünde metin` yazımları da
  kaldırıldı. Öğe tipi belirtilmeyen `dizi`, `dizi[1..5]`, `liste` ve `sözlük` aynı kaldı.
  Bütün örnekler, testler ve kitaplar yeni yazıma çevrildi.
- Sabitlerde tip: `sabit BAĞLAM: tamsayı = 10`. Katı kipte zorunludur; diğer programlarda isteğe
  bağlıdır. Örneklerdeki ve kitaplardaki sabitler tipli yazıma çevrildi.
- **Katı kip**: başında `{$katı}` yönergesi olan dosyalarda tipler derleme zamanında denetlenir.
  Tipsiz parametreler ve dönüşler, uyumsuz atama, argüman ve dönüş değerleri, yanlış argüman sayısı,
  mantıksal olmayan koşullar, tanımsız işlemler ve tanımsız adlar program çalışmadan, hepsi birden
  bildirilir; değişken tipleri ilk değerden çıkarılır. `yontem.json` içinde `"kati": true` bütün projeyi
  katı yapar. **`yontem denetle`** programları çalıştırmadan derler (`--kati`: yönergesiz dosyaları da).
  Öğe tipi bildirilmiş listeler ve sözlükler (`liste türünde tamsayı`, `sözlük türünde metin`) katı
  kipte öğe düzeyinde denetlenir; sonucu belli yerleşik işlevlerin dönüş tipleri bilinir. Sınıf ve
  kayıt tipleri izlenir: olmayan alan ya da metod, alana uymayan değer, metod ve kurucu argümanları,
  ilgisiz sınıflar arasında atama derleme hatasıdır. `Takvim`, `Desen`, `Güvenlik` ve `Ağ` işlevlerinin
  dönüş tipleri bilinir; yerleşik işlevlerin ve yerleşik birim işlevlerinin argüman sayısı denetlenir.
  Dil sunucusu tip hatalarını yazarken gösterir. Yönergesiz programların davranışı değişmedi.
- **`yontem paket`**: paket yöneticisi. `ekle`, `kur`, `kaldir`, `guncelle`, `liste`. Kaynak bir
  GitHub/GitLab deposu (`github:kullanici/depo@etiket`), HTTPS adresindeki arşiv (.tar.gz, .zip) ya da
  tek `.y` dosyası, ya da yerel klasördür. `yontem.json` bağımlılıkları, `yontem.kilit.json` her
  paketin içerik özetini (SHA-256) tutar; paketlerin kendi bağımlılıkları da kurulur. Kurulumda kod
  çalışmaz. Kurulan birimleri iki çalışma zamanı da bulur. `yontem yeni` artık `yontem.json` da oluşturur.
- **`yontem ayikla`**: hata ayıklayıcı. Adım adım çalıştırma (içine gir, üstünden geç, dışarı çık),
  koşullu kesme noktaları, değişkenleri ve çağrı yığınını inceleme, duraklamış programda ifade
  değerlendirme ve atama, çalışma hatasında durma. Uçbirimde Türkçe komutlarla; VS Code'da
  Debug Adapter Protocol ile (`yontem ayikla --dap`) kesme noktaları, değişken paneli ve izleme ifadeleri.
- Düzeltme: aynı süreçte art arda çalışan programlarda (oyun alanı) önceki programın `GradKapat`
  çağrısı sonrakinin eğitimini bozuyordu; Meşale'nin gradyan durumu artık her çalıştırmada sıfırlanır.
- **`yontem yeni <ad>`**: program, örnek birim ve test içeren proje iskeleti oluşturur.
- **VS Code eklentisi** (`araclar/vscode/`): sözdizimi renklendirme, kod parçacıkları,
  biçimlendirme (Shift+Alt+F), F5 ile çalıştırma.
- **Paketleme**: `npm install -g` ile `yontem` komutu, `pip install` ile `yontem-py` komutu kurulur;
  standart birimler iki pakete de dahildir.
- **Birimler ve Araçlar Kılavuzu**: Pencere, Mobil, Güvenlik, Takvim, Desen ve Ağ birimlerini ve araçları
  anlatan yeni kılavuz (site ve PDF). İçindeki programlar `birim_kilavuzu/` klasöründen alınır ve test edilir.
- Sürekli tümleştirme (GitHub Actions), katkı kılavuzu, güvenlik politikası, konu şablonları.
- `testler/` klasöründeki programlar bir üst klasördeki birimleri kendiliğinden bulur.

### Değişenler
- JavaScript derleyicisi tipi bilinen ifadelerde doğrudan JavaScript işleçleri üretir ve tam
  argümanlı çağrıları denetimsiz, sabit parametreli fonksiyon sürümüne yönlendirir (1,2–2,3 kat hız).
- Lisans: yazılım MIT, kitaplar ve kılavuzlar CC BY 4.0.

### Düzeltilenler
- `Güvenlik` birimi Node.js 18'de de çalışır (Web Crypto, genel ad olarak tanımlı olmadığında
  `crypto` modülünden alınır).
- `yontem derle` ile üretilen dosyalar artık doğrudan `node` ile çalışır.
