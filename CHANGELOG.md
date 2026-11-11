# Değişiklik günlüğü

Bu dosya Yöntem'in sürümler arasındaki önemli değişikliklerini listeler. Sürüm numaraları
[anlamsal sürümleme](https://semver.org/lang/tr/) kurallarını izler; 1.0 öncesinde küçük sürümler
uyumsuz değişiklik içerebilir.

## Yayımlanmamış

### Değişenler

- Kurulum belgeleri npm paketine göre güncellendi: `npm install -g yontem`.
- Site: Öğren, Belgeler, Öğretmenler, Gömülü, Topluluk, Blog ve Gizlilik sayfaları yazıldı (`site/sayfalar/`);
  yazı tipleri site içinden sunuluyor, sayfalar hiçbir dış sunucuya istek göndermiyor.
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
