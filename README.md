# Yöntem Programlama Dili

Açık kaynak · Yazılım MIT, kitaplar CC BY 4.0 · Sürüm 0.5.0 · [yontem.pro](https://yontem.pro)

**Yöntem**, Türkçe anahtar sözcükleri olan, Turbo Pascal soyundan gelen, nesne tabanlı ve
modüler bir programlama dilidir. Dilin çekirdeğinde **otomatik türevli tensörler**
bulunur. Bu sayede sinir ağları, makine öğrenmesi ve klasik yapay zekâ uygulamaları
(arama, uzman sistemler, doğal dil işleme) dilin içinde doğrudan yazılabilir. Ayrı bir
**Kuantum** birimi de kuantum devrelerini programlamayı ve simüle etmeyi sağlar.

```pascal
program Selam
kullan YZ

değişken
  model: herhangi
  X, Y: tensör

başla
  X := Tensör([[0, 0], [0, 1], [1, 0], [1, 1]])
  Y := Tensör([[0], [1], [1], [0]])
  model := Ardışık([Yoğun(2, 8, 'tanh'), Yoğun(8, 1, 'sigmoid')])
  Eğit(model, X, Y, 'ikiliÇaprazEntropi', Adam(model.Parametreler, 0.05), 500)
  yaz(model.Tahmin(X), 1)
bitir.
```

---

## Kurulum ve çalıştırma

Yöntem'in iki uygulaması vardır ve ikisi aynı çıktıyı üretir:

**1. Yöntem → JavaScript derleyicisi (önerilen, `js/`).** TypeScript ile yazılmıştır. Programı
JavaScript'e derler ve Node.js'te çalıştırır; Python yorumlayıcısından onlarca kat hızlıdır.
Aynı derleyici tarayıcıda da çalışır (bkz. `oyun_alani/`).

```bash
cd js && npm install && npm run build        # bir kez: derleyiciyi ve tarayıcı paketini kur
node js/dist/cli.js ornekler/merhaba.y       # derle ve çalıştır
node js/dist/cli.js derle program.y -o p.js  # yalnızca JavaScript üret (node p.js ile çalışır)
node js/dist/cli.js paketle program.y --mobil # Pencere/Mobil programını telefon uygulamasına (PWA) çevir
node js/betikler/test.js                     # testler + örnekler + kitap örnekleri
js/betikler/karsilastir.sh dosya.y           # Python ve JS çıktısını karşılaştır
```

Gereken: **Node.js 18+**. Tamsayılar sınırsız büyüklüktedir (BigInt). Ondalıklar Python ile
aynı biçimde yazılır, `Tohum` aynı rastgele diziyi üretir. Bu yüzden testler bayt bayt aynı
sonucu verir. Bilinen tek fark: `sin`, `cos`, `exp`, `log` ve `**` gibi işlemlerin son
basamağı, platformun matematik kitaplığına bağlı olarak nadiren 1 ulp farklı olabilir.

**Oyun alanı.** `oyun_alani/index.html` tek dosyalık bir sayfadır: düzenleyici, kitaptaki tüm
örnekler, girdi kutusu ve üretilen JavaScript'i gösteren sekme içerir. Derleme ve çalıştırma
tarayıcıda, bir Web Worker içinde yapılır. Sayfayı yeniden üretmek için `npm run build`.

**2. Python yorumlayıcısı (başvuru uygulaması).** Gereken tek şey **Python 3.8+**. Dış bağımlılık yok.

```bash
python3 yontem.py ornekler/merhaba.y      # program çalıştır
python3 yontem.py                           # etkileşimli kabuk (REPL)
python3 testler/calistir.py                 # tüm testleri ve örnekleri sına
```

Kaynak dosyaların uzantısı `.y`'dir.

**Paket olarak kurma.** Komutu her klasörden `yontem` adıyla çağırmak için:

```bash
cd js && npm install && npm run build && npm install -g .   # 'yontem' komutu (JavaScript derleyicisi)
pip install .                                               # 'yontem-py' komutu (Python yorumlayıcısı)
```

Birimlerin ve araçların örneklerle anlatımı *Yöntem Birimler ve Araçlar Kılavuzu*'ndadır
(`site/kitaplar/birimler.html`, PDF: `basim/Yontem_Birimler_ve_Araclar_Kilavuzu.pdf`).

### Araçlar

| Araç | Ne yapar |
|---|---|
| `yontem yeni <ad>` | Program, örnek birim ve test içeren yeni proje klasörü oluşturur |
| `yontem test [klasör]` | `.y` programlarını çalıştırır, çıktıyı yanlarındaki `.beklenen` dosyasıyla karşılaştırır; `--guncelle` beklenen dosyaları yeniler. `.girdi` dosyası varsa klavye girdisi olarak verilir. `python3 yontem.py test` aynı işi Python yorumlayıcısıyla yapar |
| `yontem bicimle <dosya ya da klasör>` | Girintiyi programın yapısına göre düzenler (düzey başına 2 boşluk), satır sonu boşluklarını ve fazla boş satırları temizler. Yalnızca boşluklara dokunur; sözcükler, satır bölünmeleri ve yorumlar değişmez. `--denetle` dosyaları değiştirmeden biçimsiz olanları listeler |
| `yontem denetle <dosya ya da klasör> [--kati]` | Programları çalıştırmadan derler. **Katı kip:** başında `{$katı}` yönergesi olan dosyalarda (ya da `yontem.json` içinde `"kati": true` olan projelerde) tipler derleme zamanında denetlenir; tipsiz parametreler, uyumsuz atamalar ve argümanlar, öğe tipi bildirilmiş listelere (`tamsayı listesi`) uymayan öğeler, mantıksal olmayan koşullar, tanımsız adlar program çalışmadan, hepsi birden bildirilir |
| `yontem paket ekle\|kur\|kaldir\|guncelle\|liste` | Paket yöneticisi: birimleri GitHub/GitLab deposundan (`github:kullanici/depo@etiket`), bir HTTPS adresindeki arşivden ya da yerel klasörden `paketler/` klasörüne kurar. `yontem.json` bağımlılıkları, `yontem.kilit.json` içerik özetlerini (SHA-256) tutar; kurulumda kod çalışmaz. Kurulan birimleri Python yorumlayıcısı da bulur |
| `yontem ayikla program.y` | Hata ayıklayıcı: adım adım çalıştırma, (koşullu) kesme noktaları, değişkenleri ve çağrı yığınını inceleme, ifade değerlendirme, çalışma hatasında durma. Uçbirimde komutlarla, VS Code'da `F6` ile (Debug Adapter Protocol: `yontem ayikla --dap`) |
| `yontem dil-sunucusu` | Dil sunucusu (Language Server Protocol, stdio): yazarken hata gösterimi, tanımlı görünmeyen adlar için yazım hatası uyarısı, tamamlama, imza bilgisi, tanıma git, simge listesi, biçimlendirme. VS Code eklentisi kendiliğinden kullanır; Neovim, Helix, Emacs gibi LSP destekleyen düzenleyicilerde sunucu komutu olarak `yontem lsp` verilir |
| `yontem derle` / `gomulu` / `paketle` | JavaScript dosyası, ESP32 projesi ya da web/telefon uygulaması üretir |
| VS Code eklentisi | `araclar/vscode/`: sözdizimi renklendirme, tamamlama, hata gösterimi, tanıma git, kod parçacıkları, biçimlendirme, F5 ile çalıştırma. Kurulum: `code --install-extension araclar/vscode/yontem-dili-0.5.0.vsix` |
| Oyun alanı | `oyun_alani/index.html`: kurulum gerektirmeyen tarayıcı ortamı |

Testler `iddia(koşul, mesaj)` ile yazılır; koşul yanlışsa program hatayla durur ve test başarısız
sayılır. `testler/` klasöründeki programlar bir üst klasördeki birimleri kendiliğinden bulur.
Katkı kuralları için [`CONTRIBUTING.md`](CONTRIBUTING.md), sürüm notları için
[`CHANGELOG.md`](CHANGELOG.md), açık bildirimi için [`SECURITY.md`](SECURITY.md).

## Klasör yapısı

| Yol | İçerik |
|---|---|
| `yontem.py` | Komut satırı aracı ve REPL |
| `yontem_dil/sozcuk.py` | Sözcük çözümleyici (lexer) |
| `yontem_dil/cozumleyici.py` | Sözdizimi çözümleyici (parser) → soyut sözdizimi ağacı |
| `yontem_dil/yorumlayici.py` | Yorumlayıcı: kapsamlar, nesneler, birimler, tip denetimi |
| `yontem_dil/yerlesik.py` | Yerleşik işlevler ve `Matematik`, `Sistem`, `Veri` birimleri |
| `yontem_dil/yz.py` | `YZ` birimi: tensörler, otomatik türev, katmanlar, optimizasyon |
| `yontem_dil/kuantum.py` | `Kuantum` birimi: kuantum devre simülatörü |
| `yontem_dil/mesale.py`, `js/src/calisma/mesale.ts` | `Meşale` birimi: PyTorch benzeri N boyutlu tensörler, autograd, kayıplar, optimizasyon, veri |
| `js/src/sozcuk.ts`, `js/src/cozumleyici.ts` | Derleyicinin sözcük ve sözdizimi çözümleyicisi |
| `js/src/uretici.ts` | Kod üretici: Yöntem ağacı → JavaScript (adlar derleme anında çözülür) |
| `js/src/calisma/` | Çalışma zamanı: işleçler, yerleşikler, `YZ`, `Kuantum`, Python uyumlu rastgele sayılar |
| `js/src/cli.ts`, `js/src/tarayici.ts` | Node komut satırı ve tarayıcı girişleri |
| `oyun_alani/` | Tarayıcı oyun alanı (`index.html` üretilir) |
| `js/src/gomulu/` | Gömülü arka uç: statik tip çıkarımı ve C++17 üretici |
| `js/gomulu/` | C++ çalışma zamanı, YZ çıkarımı, Donanım katmanı (ESP32 + masaüstü benzetimi) |
| `gomulu_ornekler/` | ESP32 örnekleri ve beklenen çıktıları |
| `kitap_ornekleri/` | Programlama kitabındaki örnekler ve beklenen çıktıları |
| `kutuphane/` | Yöntem dilinde yazılmış standart birimler (`Sinir` dahil) |
| `mesale_ornekleri/` | `Meşale` ve `Sinir` örnekleri ve beklenen çıktıları |
| `arayuz_ornekleri/` | `Pencere` ve `Mobil` örnekleri (benzetim çıktılarıyla) |
| `birim_kilavuzu/` | *Birimler ve Araçlar Kılavuzu*'ndaki programlar ve beklenen çıktıları; kılavuz `basim/birimler_uret.py` ile bunlardan üretilir |
| `vt_testleri/` | `Veritabanı` biriminin gerçek sunucularla testi; `npm run test:vt` (SQLite her zaman; PostgreSQL ve MySQL `YONTEM_TEST_PG` / `YONTEM_TEST_MYSQL` adresleri verilirse) |
| `ag_testleri/` | `Ağ` biriminin testi; yerel sunucuyla `npm run test:ag` çalıştırır |
| `yontem_dil/guvenlik.py`, `js/src/calisma/guvenlik.ts` | `Güvenlik` birimi: SHA-256, HMAC, PBKDF2, ChaCha20-Poly1305, girdi denetimi |
| `guvenlik_ornekleri/` | `Güvenlik` örnekleri ve beklenen çıktıları |
| `araclar/vscode/` | VS Code eklentisi (sözdizimi, kod parçacıkları, çalıştırma) |
| `.github/` | Sürekli tümleştirme (testler) ve konu şablonları |
| `site/` | yontem.pro: tasarım, kitapların çevrim içi sürümü, yerel deneme paketi |
| `ornekler/` | Örnek programlar |
| `testler/` | Dil testleri ve test çalıştırıcısı |
| `benchmark/` | Yöntem'i C++, JavaScript ve Python ile karşılaştıran hız testleri (`benchmark/README.md`) |

---

## 1. Sözcük yapısı

- **Büyük/küçük harf ayırt edilmez** (Pascal geleneği). Ayrıca Türkçe karakterler ASCII
  karşılıklarına katlanır: `Başla`, `BAŞLA` ve `basla` aynı sözcüktür. Türkçe klavyesi
  olmayan biri de program yazabilir.
  Bunun bir sonucu var: `ş`/`s`, `ç`/`c`, `ı`/`i`, `x`/`X` gibi adlar **aynı addır**.
  Aynı kapsamda bu tür bir çakışma olursa yorumlayıcı hata verir.
- Yorumlar: `{ ... }`, `(* ... *)`, `// satır sonuna kadar`
- Metinler: `'Pascal tarzı, tek tırnak '' kaçışlı'`, `"C tarzı \n \t kaçışlı"`, karakter
  kodu `#10`. Yan yana metinler birleşir: `'a'#10'b'`
- Sayılar: `42`, `3.14`, `1e-3`, `1_000_000`, onaltılık `$FF`

### Anahtar sözcükler

| Yöntem | Pascal | | Yöntem | Pascal |
|---|---|---|---|---|
| `program` | program | | `eğer … ise … değilse` | if … then … else |
| `birim` | unit | | `koşul iken …` | while … do |
| `kullan` | uses | | `1'den 10'a kadar her i için …` | for … to … do |
| `arayüz` / `uygulama` | interface / implementation | | `10'dan 1'e azalarak her i için …` | for … downto … do |
| `değişken` | var | | `tekrarla … koşul olana dek` | repeat … until |
| `sabit` | const | | `x değerine göre … bitir` | case x of … end |
| `tip` | type | | `L içindeki her x için …` | for x in L do |
| | | | `5 kez tekrarla …` | (n kez yinele) |
| `prosedür` / `fonksiyon` | procedure / function | | `dene … yakala … sonunda … bitir` | try … except … finally |
| `kurucu` | constructor | | `fırlat` | raise |
| `başla … bitir` | begin … end | | `dön [ifade]` / `çık` | Result+Exit / Exit |
| `sınıf` / `kayıt` | class / record | | `kır` / `devam` | Break / Continue |
| `miras` | inherited | | `ve`, `veya`, `yada`, `değil` | and, or, xor, not |
| `kendi` | Self | | `böl`, `mod` | div, mod |
| `doğru`, `yanlış`, `boş` | True, False, nil | | `T dizisi[a..b]` | array[a..b] of T |

Bağlama göre anlam kazanan (ayrılmış olmayan) sözcükler: `adım`, `kez`, `olana dek`,
`değerine göre`, `sanal`, `ezer`, `soyut`, `ileri`, `özel`, `genel`, `korumalı`.

### Ekler

Türkçede olduğu gibi sayılara, adlara ve parantezli ifadelere kesme işaretiyle ek
getirilebilir. Döngü sınırlarında **ayrılma** (`-den`, `-dan`, `-ten`, `-tan`) ve
**yönelme** (`-e`, `-a`, `-ye`, `-ya`) ekleri kullanılır:

```pascal
1'den 10'a kadar her i için …
0'dan n'e kadar her i için …
3'ten (Uzunluk(L) - 1)'e kadar her i için …
```

Ses uyumu yorumlayıcı tarafından denetlenmez (`1'dan` da kabul edilir), ama okunaklılık
için doğru eki yazmanız önerilir. Kesme işareti bir sayıya, ada ya da `)`/`]`
işaretine bitişikse ve ardından bu eklerden biri geliyorsa ek sayılır; diğer her
durumda metin başlatır.

### Noktalı virgül

Komutlar ve bildirimler satır sonuyla ayrılır; `;` isteğe bağlıdır. Aynı satıra birden
çok komut yazılacaksa `;` ile ayrılır: `a := 1; b := 2`. Bu yüzden bir çağrının
parantezi `(` ya da bir dizinin köşeli parantezi `[` önceki sözcükle aynı satırda
başlamalıdır.

---

## 2. Program yapısı

```pascal
program Ad                 // isteğe bağlı
kullan Matematik, YZ       // birimler

sabit   PI2: ondalık = 6.283
tip     Nokta = kayıt x, y: ondalık; bitir
değişken
  sayaç: tamsayı           // varsayılan 0
  ad: metin = 'Yöntem'     // ilk değerli
  oran := 0.5              // tipi değerden çıkarılır (tip denetimi yapılmaz)

prosedür Selamla(kime: metin = 'dünya')
başla
  yaz('Merhaba, ' + kime, 1)
bitir

başla
  Selamla                  // parametresiz çağrı parantezsiz yazılabilir
  Selamla('Ayşe')
bitir.
```

Bloklar içinde de değişken tanımlanabilir: `değişken toplam := 0`

## 3. Tipler

| Tip | Örnek | Not |
|---|---|---|
| `tamsayı` | `42` | sınırsız büyüklükte |
| `ondalık` (`gerçek`) | `3.14` | tamsayı atanırsa ondalığa çevrilir |
| `metin` | `'abc'` | **dizinler 1'den başlar** (Turbo Pascal gibi) |
| `karakter` | `'a'` | |
| `mantıksal` | `doğru`, `yanlış` | |
| `liste` | `[1, 2, 3]`, `[1..10]` | dinamik, **dizinler 0'dan başlar** |
| `sözlük` | `['a': 1, 'b': 2]`, `[:]` | |
| `T dizisi[a..b]` | `ondalık dizisi[1..12]` | sınırları denetlenen sabit dizi |
| `tensör` | `Tensör([[1, 2], [3, 4]])` | YZ birimi |
| `herhangi` | | dinamik tip, denetim yapılmaz |
| sınıf / kayıt adları | `Nokta`, `Hayvan` | |

Tipi bildirilmiş değişkenlere yapılan atamalar çalışma zamanında denetlenir:

```pascal
değişken n: tamsayı
n := 'metin';   // Çalışma hatası: 'n' için tip uyuşmazlığı: tamsayı bekleniyordu, metin verildi
```

Tip adları aynı zamanda dönüştürücüdür: `tamsayı('42')`, `ondalık('3,5')`, `metin(12)`.

## 4. İşleçler (öncelik sırası, düşükten yükseğe)

| Düzey | İşleçler |
|---|---|
| 1 | `eğer k ise a değilse b` (koşullu ifade) |
| 2 | `\|>` boru (`x \|> f(y)` ≡ `f(x, y)`) |
| 3 | `veya`, `yada` |
| 4 | `ve` |
| 5 | `değil` |
| 6 | `=`, `<>`, `<`, `>`, `<=`, `>=`, `içinde` |
| 7 | `+`, `-` |
| 8 | `*`, `/`, `böl`, `mod`, `@` (matris çarpımı) |
| 9 | `**` (üs, sağdan birleşir), tekli `-` |

- `/` her zaman ondalık sonuç verir, `böl` tamsayı bölmesidir.
- Pascal'dan farklı olarak `ve`/`veya` karşılaştırmalardan **sonra** gelir:
  `a > 1 ve b < 2` parantez gerektirmez. Mantıksal işleçler kısa devrelidir.
  Tamsayılara uygulandıklarında bit işleçleri olarak çalışırlar.
- Bileşik atama: `+=`, `-=`, `*=`, `/=`
- `+` işleneninden biri metinse diğeri metne çevrilir: `yaz('x = ' + x, 1)`.
- `@F` bir fonksiyonu çağırmadan değer olarak verir (Pascal'daki gibi).

## 5. Denetim yapıları

```pascal
eğer x > 0 ise yaz('pozitif', 1)
değilse eğer x < 0 ise yaz('negatif', 1)
değilse yaz('sıfır', 1)

n > 0 iken n := n böl 2

1'den 10'a kadar her i için toplam += i
10'dan 0'a azalarak adım 2 her i için yaz(i + ' ')

tekrarla
  n := n + 1
n >= 10 olana dek

liste içindeki her öğe için yaz(öğe, 1)
sözlük içindeki her anahtar, değer için ...     // listelerde: dizin, öğe

puan değerine göre
  90..100: harf := 'A'
  80..89:  harf := 'B'
  0, 1, 2: harf := 'X'
  değilse: harf := 'F'
bitir
```

Döngü ve karar yapılarının gövdesi **tek bir komuttur**. Birden çok komut çalıştırmak
için gövde `başla … bitir` ile sarılır (Pascal kuralı). `tekrarla … olana dek`,
`değerine göre … bitir` ve `dene … bitir` ise kendi sınırlarını taşır, `başla` gerektirmez.

```pascal
1'den 3'e kadar her i için
başla
  toplam += i
  yaz(i + ' ')
bitir

x < 100 iken
  x := x * 2          // gövde yalnızca bu satır
yaz(x, 1)             // döngüden sonra çalışır
```

## 6. Alt programlar

```pascal
fonksiyon Topla(a, b: tamsayı): tamsayı
başla
  sonuç := a + b          // ya da: dön a + b
bitir

prosedür Değiştir(değişken a, b: tamsayı);   // 'değişken' = referansla aktarım
...

değişken kare := fonksiyon(x) => x * x      // isimsiz fonksiyon (lambda)
değişken f := fonksiyon(x: tamsayı): tamsayı
              başla dön x + 1; bitir           // gövdeli lambda
```

Lambdalar tanımlandıkları kapsamı yakalar (closure). Fonksiyonlar birinci sınıf
değerlerdir; `Eşle`, `Süz`, `İndirge`, `Sırala` gibi işlevlere geçirilebilir.

## 6.1 Giriş ve çıkış: `yaz` ve `oku`

Yöntem'de ayrı bir "satır sonu" komutu yoktur. `yaz` ve `oku` komutlarının ikinci
parametresi kaç satır ilerleneceğini belirtir.

| Çağrı | Anlamı |
|---|---|
| `yaz(değer)` | değeri yazar, aynı satırda kalır |
| `yaz(değer, 1)` | değeri yazar ve alt satıra geçer |
| `yaz('test', 10)` | `test` yazar, ardından 10 kez yeni satıra geçer |
| `yaz('', 1)` | yalnızca boş satır |
| `oku(x)` | `x` sayıysa satırdaki sıradaki sözcüğü, metinse satırın kalanını okur; satırda kalır |
| `oku(x, 1)` | okur ve sonraki satıra geçer (Pascal'daki `ReadLn`) |
| `oku(x, 3)` | okur, ardından 2 satırı da atlar |

`oku` bilgiyi değişkenin tipine göre çevirir. Örneğin `3 4` satırından iki sayı
`oku(a); oku(b, 1);` ile okunur. Birden çok değeri yazmak için `+` ya da `Biçimle`
kullanılır: `yaz('Toplam: ' + t, 1)`.

## 7. Nesne tabanlı programlama

```pascal
tip
  Hayvan = sınıf
  özel
    ad: metin
  genel
    kurucu Oluştur(a: metin)
    fonksiyon Ses: metin; sanal
    fonksiyon Tanıt: metin
  bitir

  Kedi = sınıf(Hayvan)                 // kalıtım
    fonksiyon Ses: metin; ezer
  bitir

kurucu Hayvan.Oluştur(a: metin)
başla
  ad := a                             // alanlara doğrudan (ya da kendi.ad ile) erişilir
bitir

fonksiyon Hayvan.Ses: metin;   başla dön '...'; bitir
fonksiyon Hayvan.Tanıt: metin; başla dön ad + ': ' + Ses; bitir
fonksiyon Kedi.Ses: metin;     başla dön 'Miyav'; bitir

değişken k: Hayvan
başla
  k := Kedi.Oluştur('Tekir')
  yaz(k.Tanıt, 1)                     // Tekir: Miyav
bitir.
```

- Metodlar Delphi gibi sınıf dışında (`Sınıf.Metod`) ya da doğrudan sınıf içinde tanımlanabilir.
- Tüm metodlar sanaldır (dinamik bağlanır). `sanal`, `ezer`, `soyut` direktifleri belgeleme
  amaçlıdır; `soyut` metodu çağırmak hata verir.
- `miras Oluştur(a)` ebeveyn metodunu çağırır; yalnız `miras;` aynı metodu aynı argümanlarla çağırır.
- Alanlara ilk değer verilebilir: `sayaç: tamsayı = 0;`
- `MetneÇevir` metodu tanımlanırsa `yaz(nesne)` onu kullanır.
- İşleç aşırı yükleme: `Topla`, `Çıkar`, `Çarp`, `Bölme`, `Eşit`, `Küçük`, `Büyük` metodları
  `+ - * / = < >` işleçlerine bağlanır (`<>` için `Eşit` kullanılır).
- `kayıt` tipleri değer gibi kopyalanır; kurucusuz sınıf ve kayıtlar alan sırasıyla
  oluşturulabilir: `Nokta.Oluştur(3, 4)`.
- `ÖrneğiMi(nesne, Sınıf)` kalıtım zincirini denetler.

## 8. Hata yönetimi

```pascal
dene
  x := 10 böl 0
yakala (h)
  yaz(h.tür + ': ' + h.mesaj + ' (satır ' + h.satır + ')', 1)
sonunda
  yaz('her durumda çalışır', 1)
bitir

fırlat Hata('Geçersiz giriş', 'DoğrulamaHatası')
İddia(n > 0, 'n pozitif olmalı')
```

Çalışma zamanı hataları (sınır aşımı, sıfıra bölme, tip uyuşmazlığı…) da yakalanabilir.
Kendi sınıflarınızın nesneleri de fırlatılabilir.

## 9. Birimler (modüller)

```pascal
birim Geometri

arayüz                                 // dışa aktarılan adlar
  sabit UZUNLUK_BİRİMİ: metin = 'cm'
  fonksiyon DaireAlanı(r: ondalık): ondalık

uygulama                               // gizli ayrıntılar
  kullan Matematik

  fonksiyon DaireAlanı(r: ondalık): ondalık
  başla
    dön pi * r * r
  bitir

başla                                  // birim ilk yüklendiğinde çalışır (isteğe bağlı)
  ...
bitir.
```

`kullan Geometri;` ile yüklenen birimin dışa aktarılan adları doğrudan (`DaireAlanı(2)`)
ya da nitelikli (`Geometri.DaireAlanı(2)`) kullanılabilir. `arayüz` bölümü yoksa tüm adlar
dışa aktarılır. Birim dosyaları şu sırayla aranır: programın klasörü, onun `kutuphane/`
alt klasörü, Yöntem'in `kutuphane/` klasörü ve `YONTEM_YOL` ortam değişkenindeki klasörler.

---

## 10. Standart kütüphane

### Her zaman erişilebilir yerleşikler

| Alan | İşlevler |
|---|---|
| G/Ç | `yaz(değer, satır)`, `oku(değişken, satır)` (bkz. bölüm 6.1) |
| Dönüşüm | `tamsayı`, `ondalık`, `metin`, `mantıksal`, `liste`, `Tür`, `ÖrneğiMi` |
| Koleksiyon | `Uzunluk`, `Ekle`, `Sil`, `Araya`, `Aralık`, `Eşle`, `Süz`, `İndirge`, `Sırala`, `Ters`, `Toplam`, `Maks`, `Min`, `Eşleştir`, `Numaralandır`, `Dilim`, `Kopya`, `Anahtarlar`, `Değerler`, `İçerir`, `Benzersiz`, `Say` |
| Metin | `AltMetin`, `Konum`, `BüyükHarf`, `KüçükHarf` (Türkçe kurallarına uygun: i→İ, ı→I), `Ayır`, `Birleştir`, `Kırp`, `Değiştir`, `Biçimle('{} {:.2}', a, b)`, `Sıra`, `Karakter`, `HarfMi`, `RakamMı` |
| Sayısal | `Mutlak`, `Kare`, `Kök`, `Yuvarla`, `Kes`, `Rastgele`, `Rastgeleleştir`, `Artır`, `Azalt`, `Değiş`, `pi` |
| Denetim | `Hata`, `İddia`, `Durdur`, `Çağır`, `ParametreSayısı`, `Parametre` |

Biçimli çıktı Turbo Pascal'daki gibidir: `yaz(x:8:2, 1)` (genişlik 8, 2 ondalık basamak). Karma metinlerde
`Biçimle('{} = {:8.2}', ad, x)` kullanılır (`{:.2}` basamak, `{:8}` genişlik).

Liste, metin ve sözlüklerin metod sözdizimi de vardır: `L.Ekle(5)`, `L.Uzunluk`,
`L.Eşle(f)`, `s.BüyükHarf`, `s.Ayır(',')`, `d.Anahtarlar`, `d.Al('k', 0)` …

### Python ile yazılmış birimler

| Birim | İçerik |
|---|---|
| `Matematik` | `Sin`, `Cos`, `Tan`, `ArkTan…`, `Ln`, `Log10`, `Üstel`, `Üs`, `Taban`, `Tavan`, `Tanh`, `Sigmoid`, `Faktöriyel`, `EBOB`, `Kombinasyon`, `Normal`, `RastgeleSeç`, `Karıştır`, `Tohum`, `pi`, `e`, `sonsuz` |
| `Sistem` | `Zaman`, `Saat`, `Tarih`, `Bekle`, `DosyaOku`, `DosyaYaz`, `DosyaVarMı`, `Satırlar`, `Ortam`, `Argümanlar` |
| `Veri` | `CSVOku`, `CSVYaz`, `JSONÇöz`, `JSONYap`, `Sütun`, `MinMaksÖlçekle`, `Standartlaştır`, `EğitimTestBöl` |
| `YZ` | Bölüm 11'e bakın; `ModeliDışaAktar(model, yol)` eğitilmiş modeli Yöntem birimi olarak yazar |
| `Kuantum` | Bölüm 12'ye bakın |
| `Meşale` | Bölüm 14'e bakın (PyTorch'taki `torch` karşılığı) |
| `Donanım` | Bölüm 13'e bakın (pin, zaman, kesme, zamanlayıcı, seri, I2C, SPI) |
| `Pencere` (ya da `UI`) | Bölüm 15'e bakın (düğme, kutu, tuval; canlı ya da benzetim) |
| `Mobil` (ya da `Mobile`) | Bölüm 15'e bakın (titreşim, bildirim, konum, hareket, depo) |
| `Güvenlik` (ya da `Security`) | Bölüm 16'ya bakın (özet, imza, parola, şifreleme, girdi denetimi, hız sınırlama) |
| `Takvim` (ya da `Calendar`) | Tarih ve saat: `Şimdi`, `YerelFark`, `TarihYap`, `Parçala`, `TarihYaz`, `TarihOku`, `GünEkle`, `AyEkle`, `YılEkle`, `SaniyeEkle`, `GünFarkı`, `GünBaşı`, `HaftaGünü`, `HaftaNo`, `GünAdı`, `AyAdı`, `ArtıkYıl`, `AydakiGünSayısı`, `GeçerliTarih` |
| `Desen` (ya da `Regex`) | Düzenli ifadeler: `Eşleşir`, `TamEşleşir`, `Bul`, `BulHepsi`, `Gruplar`, `TümGruplar`, `DesenKonumu`, `DesenDeğiştir`, `DesenAyır`, `DesenKaçış`, `DesenGeçerli` |
| `Veritabanı` (ya da `Vt`, `Database`) | SQL veritabanları tek arayüzle: `Bağlan('sqlite:veri.db')`, `'postgres://…'`, `'mysql://…'`; bağlantının `Çalıştır`, `Sorgula`, `TekSatır`, `TekDeğer`, `SonKimlik`, `İşlemBaşlat`/`Onayla`/`GeriAl`, `Kapat` üyeleri; sorgular `?` yer tutucularıyla parametrelidir. SQLite yerleşiktir (Node.js 22.5+, Python); PostgreSQL için `pg`/`pg8000`, MySQL için `mysql2`/`pymysql` paketi gerekir |
| `Sunucu` (ya da `Server`, `Web`) | HTTP sunucusu: `Yol(yöntem, yol, işleyici)`, `Statik`, `Dinle(port)`, `Yanıt`, `JsonYanıt`, `Yönlendir`, `İstekİşle` (ağ olmadan test), `SunucuyuDurdur`, `GövdeSınırı` |
| `Ağ` (ya da `Net`, `Http`) | HTTP istekleri: `HttpAl`, `HttpGönder`, `Httpİstek`, `UrlKodla`, `UrlÇöz`, `SorguYap` |

**Takvim.** Zaman, 1 Ocak 1970'ten beri geçen saniye (Unix saniyesi) olarak bir tamsayıdır; tarihler
bu yüzden doğrudan karşılaştırılır ve sıralanır. Hesaplar UTC'de yapılır; yerel saat için
`YerelFark` (dakika) eklenir. Yazma ve okuma kalıplarında `YYYY`, `YY`, `AA`, `A`, `AAAA` (ay adı),
`AAA`, `GG`, `G`, `GGGG` (gün adı), `GGG`, `SS`, `DD`, `SN` simgeleri kullanılır; küçük harfler ve
`[köşeli ayraç]` içindeki metin olduğu gibi yazılır.

```pascal
kullan Takvim
değişken an, doğum: tamsayı
başla
  an := Şimdi
  yaz(TarihYaz(an + YerelFark * 60, 'G AAAA YYYY GGGG, SS:DD'), 1)   { 10 Kasım 2026 Salı, 22:30 }
  doğum := TarihOku('23.04.2010', 'GG.AA.YYYY')
  yaz(GünFarkı(doğum, an) + ' gündür hayatta', 1)
  yaz(TarihYaz(AyEkle(an, 3), 'GG.AA.YYYY'), 1)                       { üç ay sonrası }
bitir.
```

**Desen.** Düzenli ifadelerle arama, ayıklama ve değiştirme. Birim kendi eşleştirme motorunu
kullanır; bu yüzden JavaScript ve Python çalışma zamanları her desende aynı sonucu verir.
Desteklenen sözdizimi: `.` `[a-z]` `[^…]` `\d` `\w` `\s` (ve büyük harfli tersleri) `\b` `^` `$`
`( )` `(?: )` `|` `*` `+` `?` `{n,m}` ve tembel biçimleri (`*?` …). `\w` Türkçe harfleri de kapsar;
son argüman olarak verilen `'i'` seçeneği büyük/küçük harf ayrımını kaldırır ve `İ I ı i` harflerini
eş sayar. İleri/geri bakış ve geri başvuru (`\1`) yoktur; satır içi `^`/`$` yalnızca metnin başı ve
sonudur. Desenleri tek tırnakla yazın: tek tırnaklı metinlerde `\` olduğu gibi kalır.

```pascal
kullan Desen
başla
  yaz(TamEşleşir('34 ABC 123', '\d{2} [A-Z]{1,3} \d{2,4}'), 1)             { doğru }
  yaz(BulHepsi('09:15 giriş, 18:02 çıkış', '\d{2}:\d{2}'), 1)               { ['09:15', '18:02'] }
  yaz(DesenDeğiştir('2026-11-10', '(\d+)-(\d+)-(\d+)', '$3.$2.$1'), 1)     { 10.11.2026 }
  yaz(DesenAyır('elma, armut;kiraz', '\s*[,;]\s*'), 1)                      { ['elma', 'armut', 'kiraz'] }
bitir.
```

Çok adım gerektiren desenler (iç içe tekrarlar: `(a+)+`) program kilitlenmeden hatayla durdurulur.
Kullanıcıdan gelen metni desenin içine koyarken `DesenKaçış` kullanın.

**Ağ.** Web servislerine HTTP isteği gönderir. İstek eşzamanlıdır: program yanıt gelene kadar bekler.
Sonuç bir sözlüktür: `['durum': 200, 'gövde': '…', 'başlıklar': […]]` (başlık adları küçük harfli).
404 ya da 500 gibi yanıtlar hata değildir, `durum` ile denetlenir; bağlanılamazsa ya da süre dolarsa
`dene … yakala` ile yakalanabilen bir çalışma hatası oluşur. JSON için `Veri` birimi kullanılır.

```pascal
kullan Ağ, Veri
değişken y: sözlük
başla
  y := HttpAl('https://api.ornek.com/hava?' + SorguYap(['şehir': 'İzmir']))
  eğer y['durum'] = 200 ise yaz(JSONÇöz(y['gövde'])['sıcaklık'], 1)
  y := HttpGönder('https://api.ornek.com/not', JSONYap(['metin': 'merhaba']),
                  ['Content-Type': 'application/json', 'Authorization': 'Bearer …'])
bitir.
```

`HttpAl(adres [, başlıklar, zamanAşımı])`, `HttpGönder(adres, gövde [, başlıklar, zamanAşımı])` (POST) ve
`Httpİstek(yöntem, adres [, gövde, başlıklar, zamanAşımı])` (GET, POST, PUT, PATCH, DELETE, HEAD).
Zaman aşımı saniyedir (varsayılan 30); yanıt en çok 10 MB olabilir ve UTF-8 metin olarak okunur.
Komut satırında ve Python'da her adrese, tarayıcıda (oyun alanı, paketlenmiş uygulamalar) yalnızca
buna izin veren (CORS) sitelere bağlanılır; tarayıcıda zaman aşımı uygulanmaz.

### Yöntem dilinde yazılmış birimler (`kutuphane/`)

| Birim | İçerik |
|---|---|
| `İstatistik` | `Ortalama`, `Varyans`, `StandartSapma`, `Medyan`, `EnSık`, `Kovaryans`, `Korelasyon`, `ZPuanları`, `Yüzdelik` |
| `Arama` | `GenişlikÖncelikli`, `DerinlikÖncelikli`, `EnKısaYol` (Dijkstra), `AYıldız` (ızgara üzerinde A*), `IzgaraÇiz` |
| `Dil` | `Belirteçle`, `DurakSil`, `KökBul`, `NGramlar`, `SözcükSıklığı`, `TFIDF`, `KosinüsBenzerliği`, `NaifBayes` sınıfı |
| `Uzman` | `BilgiTabanı` sınıfı: kurallar, güven katsayıları, ileri/geri zincirleme, açıklama üretimi |
| `MakineÖğrenmesi` | `KEnYakın`, `KOrtalamalar`, `DoğrusalRegresyon`, `LojistikRegresyon` (otomatik türev ile) |
| `Sinir` | `Modül`, `Doğrusal`, `Gömme`, `KatmanNormu`, `BırakmaKatmanı`, `Ardışık`, `ModülListesi`, kayıp nesneleri; PyTorch adlı eşleri (`torch.nn` karşılığı, Bölüm 14) |
| `KuantumAlgoritmaları` | `BellÇifti`, `GHZ`, `QFT`, `TersQFT`, `Grover`, `Kehanet`, `Yayılım`, `DeutschJozsa`, `BernsteinVazirani`, `Işınla` |

---

## 11. YZ birimi: dilin yapay zekâ temeli

### Tensörler ve otomatik türev

Tensörler 0, 1 ya da 2 boyutludur ve dilin işleçleriyle doğrudan kullanılır
(`+ - * / ** @`, NumPy tarzı yayınlama ile). `gradGerekli` olan bir tensörle yapılan her
işlem bir hesaplama grafiğine kaydedilir; `GeriYay` tüm gradyanları hesaplar.

```pascal
kullan YZ
değişken w, kayıp: tensör
başla
  w := Tensör([1.0, -2.0], doğru)           // gradyan gerektirir
  kayıp := (w * w).Toplam
  kayıp.GeriYay
  yaz(w.Grad, 1)                            // tensör([2, -4])

  // Herhangi bir Yöntem fonksiyonunun türevi:
  yaz(Türev(fonksiyon(x) => x ** 3 + 2 * x, 2.0), 1)     // 14
bitir.
```

| Grup | Üyeler |
|---|---|
| Oluşturma | `Tensör(veri, gradGerekli)`, `Sıfırlar(r, c)`, `Birler(r, c)`, `RastgeleTensör(r, c, ölçek)`, `BirSıcak(etiketler, n)`, `Tohum(n)` |
| Tensör üyeleri | `Şekil`, `Veri`, `Grad`, `T` (devrik), `Boyut`, `Değer`, `GeriYay`, `SıfırlaGrad`, `Ayır`, `Toplam(eksen)`, `Ortalama(eksen)`, `Maks`, `ArgMaks`, `Yeniden(r, c)`, `Satır(i)`, `GradGerekli` |
| Etkinleştirme | `ReLU`, `Sigmoid`, `Tanh`, `Softmaks`, `Üstel`, `Log` (işlev ya da metod olarak) |
| Kayıplar | `OKH` (ortalama kare hata), `OMH`, `İkiliÇaprazEntropi`, `ÇaprazEntropi` (logit + sınıf dizinleri/bir-sıcak) |
| Katmanlar | `Yoğun(girdi, çıktı, etkinleştirme)`, `Ardışık([katmanlar])` |
| Optimizasyon | `SGD(parametreler, oran, momentum)`, `Adam(parametreler, oran)` → `.Adım`, `.SıfırlaGrad` |
| Yardımcılar | `Eğit(model, X, Y, kayıp, opt, epok, rapor, yığın)`, `Doğruluk`, `ArgMaks`, `Türev` / `Gradyan` |

### Kendi katmanınızı yazmak

`İleri` ve `Parametreler` metodları olan her Yöntem nesnesi bir `Ardışık` modele katman
olarak eklenebilir:

```pascal
tip
  TanhKatmanı = sınıf
    W, b: tensör
    kurucu Oluştur(g, ç: tamsayı)
    başla
      W := RastgeleTensör(g, ç, 0.5, doğru)
      b := Sıfırlar(ç, boş, doğru)
    bitir
    fonksiyon İleri(x: tensör): tensör; başla dön (x @ W + b).Tanh; bitir
    fonksiyon Parametreler: liste;      başla dön [W, b]; bitir
  bitir
...
model := Ardışık([TanhKatmanı.Oluştur(2, 6), Yoğun(6, 1), 'sigmoid'])
```

### Neden bu özellikler yapay zekâ için temel?

1. **Otomatik türev dilin değer modelinde**: Gradyan tabanlı öğrenme için ayrı bir
   çerçeve gerekmez; sıradan Yöntem ifadeleri türevlenebilir.
2. **Birinci sınıf fonksiyonlar ve kapanışlar**: Kayıp fonksiyonları, etkinleştirmeler ve
   sezgisel (heuristic) işlevler değer olarak aktarılır.
3. **Boru işleci (`|>`)**: Veri işleme hatları okunaklı yazılır:
   `veri |> Standartlaştır |> Model.Tahmin`.
4. **Nesne modeli ve arayüz uyumu**: Kendi katmanlarınız, ajanlarınız ve bilgi tabanlarınız
   yerleşik bileşenlerle birlikte çalışır.
5. **Sembolik yapay zekâ için koleksiyonlar**: Sözlükler, listeler ve özyineleme ile arama
   algoritmaları ve kural motorları kısa yazılır (`Arama`, `Uzman` birimleri).
6. **Türkçe metin desteği**: Türkçeye uygun büyük/küçük harf dönüşümü, belirteçleme ve
   Naif Bayes sınıflandırıcı.

---

## 12. Kuantum birimi

`Kuantum` birimi kuantum bilgisayarlarını programlamak için bir **durum vektörü
simülatörü** sunar (en çok 20 kübit). Kapılar çağrıldıkları anda uygulanır. Bu yüzden
devre ortasında ölçüm yapıp sonucu sıradan Yöntem kodunda kullanmak mümkündür.

```pascal
program Dolanıklık
kullan Kuantum
değişken d: herhangi
başla
  d := Devre(2)
  d.H(0)
  d.CX(0, 1)
  yaz(d.Çiz, 1)                    // q0: ─H──●──
                                    // q1: ────X──
  yaz(d.Durum, 1)                  // 0.7071|00⟩ + 0.7071|11⟩
  yaz(d.Çalıştır(1000), 1);         // ['00': 495, '11': 505]
  yaz(d.BeklenenDeğer('ZZ'), 1)    // 1.0
bitir.
```

**Bit sırası:** Bit dizilerinde q0 en soldadır: `'10'`, q0 = 1 ve q1 = 0 demektir.

| Grup | Üyeler |
|---|---|
| Devre | `Devre(kübitSayısı [, klasikBitSayısı])`, `KuantumTohum(n)` |
| Tek kübit kapıları | `H`, `X`, `Y`, `Z`, `S`, `Sd` (S†), `T`, `Td` (T†), `KX` (√X), `Rx(q, θ)`, `Ry(q, θ)`, `Rz(q, θ)`, `Faz(q, θ)`, `U(q, θ, φ, λ)` |
| Çok kübitli kapılar | `CX`/`CNOT(k, h)`, `CY`, `CZ`, `CCX`/`Toffoli(k1, k2, h)`, `Takas`/`SWAP(a, b)`, `ÇokKontrollüX(kontroller, h)`, `ÇokKontrollüZ(kontroller, h)`, `KRx`/`KRy`/`KRz`/`KFaz(kontrol(ler), h, θ)` |
| Ölçüm | `Ölç(q [, klasikBit])` → 0/1 (durum çöker), `ÖlçHepsi` → bit dizisi, `Klasik` → klasik bitler, `Sıfırla([q])` |
| Örnekleme | `Çalıştır(atış)` → `['00': 512, '11': 488]` (durumu bozmaz) |
| Gözlem | `Olasılıklar`, `Olasılık('101')`, `Genlikler` (`[gerçel, sanal]` çiftleri), `Durum` (ket gösterimi), `BeklenenDeğer('ZXI')`, `BlochVektörü(q)` |
| Araçlar | `Çiz` (ASCII devre çizimi), `Bariyer`, `Kopya`, `KübitSayısı`, `Sadakat(d1, d2)` |
| Kuantum makine öğrenmesi | `ParametreKaydırma(f, parametreler)` → gradyan listesi |

### Klasik denetim: kuantum ışınlama

```pascal
m0 := d.Ölç(0)
m1 := d.Ölç(1)
eğer m1 = 1 ise d.X(2)      // ölçüm sonucuna göre düzeltme
eğer m0 = 1 ise d.Z(2)
```

### Değişimsel algoritmalar (VQE / kuantum makine öğrenmesi)

`ParametreKaydırma`, parametreli bir devrenin beklenen değerinin gradyanını
*parametre kaydırma kuralıyla* hesaplar. Böylece kuantum devreleri, YZ birimindeki
gibi gradyan inişiyle eğitilebilir:

```pascal
fonksiyon Enerji(p: liste): ondalık
değişken d: herhangi
başla
  d := Devre(2)
  d.Ry(0, p[0]);  d.Ry(1, p[1]);  d.CX(0, 1)
  dön d.BeklenenDeğer('ZZ') + 0.5 * (d.BeklenenDeğer('XI') + d.BeklenenDeğer('IX'))
bitir
...
grad := ParametreKaydırma(@Enerji, açılar)
açılar := Eşle(Eşleştir(açılar, grad), fonksiyon(p) => p[0] - 0.3 * p[1])
```

## 13. Gömülü sistemler: ESP32

Aynı Yöntem programı, statik tipli bir alt kümeye uyduğu sürece C++17'ye derlenip ESP32'de
çalışır. Derleyicinin ön ucu ortaktır; yalnızca kod üretici farklıdır (`js/src/gomulu/`).

```bash
node js/dist/cli.js gomulu program.y              # ESP32 projesi: program/ klasörü
node js/dist/cli.js gomulu program.y --calistir   # g++ ile derle, masaüstü benzetiminde çalıştır
node js/betikler/gomulu_test.js                   # alt kümeye uyan tüm programları JS ile karşılaştır
js/betikler/esp32_qemu.sh program.y               # ESP32 için derle ve QEMU öykünücüsünde çalıştır
```

Üretilen klasör Arduino IDE'de (`.ino` dosyası), `arduino-cli` ile ya da PlatformIO ile
(`platformio.ini` hazır) derlenip karta yüklenir. ESP32 Arduino çekirdeği 3.x önerilir.
`yaz` ve `oku` seri port (115200 baud) üzerinden çalışır.

**Alt küme kuralları.** Her değerin tipi derleme anında bilinmelidir:

- `tamsayı` 64 bit, `ondalık` double'dır (`-DYONTEM_ONDALIK_FLOAT` ile float yapılabilir;
  ESP32'nin donanım kayan nokta birimi tek duyarlıklıdır).
- `liste`, `sözlük` ve `herhangi` olarak bildirilen değişkenlerin tipi ilk kullanımdan
  çıkarılır (`L := []` sonra `L.Ekle(5)` → tamsayı listesi). Çıkarılamazsa açıkça yazın:
  `tamsayı dizisi`.
- Lambdalar dış değişkenleri kopyalar; lambda içinden dış değişkene atama yapılamaz.
- Desteklenmeyenler: `Kuantum`, `Veri`, `Sistem` birimleri, otomatik türev ve eğitim
  (`Eğit`, `Ardışık`), nesne fırlatma (yalnızca metin ve `Hata(...)` fırlatılır).
  Alt küme dışındaki her kullanım derleme anında açık bir hata verir.

Kitaptaki örneklerden alt kümeye uyanlar (29 program) ve tüm gömülü örnekler, masaüstü
benzetiminde JavaScript çıktısıyla bayt bayt aynı sonucu verir. Örnekler ESP32 için
derlenmiş ve Espressif QEMU öykünücüsünde de aynı çıktıyı vermiştir.

### Donanım birimi

`kullan Donanım` ile gelir. Masaüstünde (JavaScript, Python, C++) aynı davranan, sanal
saatli belirlenimci bir benzetim çalışır; ESP32'de gerçek donanımı kullanır. `Benzetim`
sabiti benzetimde `doğru`, kartta `yanlış` olur.

| Grup | Adlar |
|---|---|
| Pinler | `PinKipi(pin, Giriş/Çıkış/GirişYukarı/GirişAşağı)`, `PinYaz(pin, Yüksek/Düşük)`, `PinOku(pin)`, `AnalogOku(pin)`, `PWMYaz(pin, 0..255)`, `YerleşikLED` |
| Zaman | `Bekle(ms)`, `BekleMikro(µs)`, `Milisaniye`, `Mikrosaniye` |
| Kesmeler | `KesmeBağla(pin, @Prosedür, Yükselen/Düşen/Değişen)`, `KesmeÇöz(pin)` |
| Zamanlayıcılar | `ZamanlayıcıKur(ms, @Prosedür)` (periyodik), `ZamanlayıcıTek(ms, @Prosedür)`, `ZamanlayıcıDurdur(kimlik)` |
| Seri | `SeriBaşlat(hız)`, `SeriVarMı`, `SeriBaytOku`, `SeriBaytYaz(b)` |
| I2C / SPI | `I2CBaşlat(sda, scl[, hız])`, `I2CYaz(adres, baytlar)`, `I2COku(adres, n)`, `I2CYazOku(adres, baytlar, n)`, `SPIBaşlat(sck, miso, mosi[, hız])`, `SPIAktar(bayt)` |

Kesme ve zamanlayıcı prosedürleri ESP32'de kesme bağlamında değil, ayrı bir görevde
sırayla çalışır; kısa tutulmalıdır. `YONTEM_IZ=1` ortam değişkeni (oyun alanında
"Pin izi") pin, kesme ve I2C olaylarını zaman damgasıyla gösterir.

### Eğitilmiş modeli karta taşımak

Model masaüstünde eğitilir, `ModeliDışaAktar(model, 'XorModeli.y')` ağırlıklarıyla saf
Yöntem birimi yazar. Bu birim her arka uçta çalışır; kartta `kullan XorModeli` ile
`Tahmin(Tensör([a, b]))` çağrılır (`gomulu_ornekler/xor_egit.y`, `xor_cikarim.y`).

| Gömülü örnek | Gösterdiği |
|---|---|
| `yanip_sonen_led.y` | Pin çıkışı, zaman |
| `dugme_kesmesi.y` | Düşen kenar kesmesi, `Benzetim` ile test |
| `zamanlayici.y` | Periyodik ve tek seferlik zamanlayıcılar |
| `i2c_sicaklik.y` | I2C yazmaç okuma (TMP102 benzeri algılayıcı) |
| `seri_konsol.y` | Seri porttan komut okuyan konsol |
| `xor_egit.y`, `xor_cikarim.y` | Masaüstünde eğit, ESP32'de çıkarım yap |

## 14. Meşale ve Sinir: PyTorch benzeri derin öğrenme

`Meşale` birimi PyTorch'taki `torch`, `Sinir` birimi `torch.nn` karşılığıdır. Meşale'nin
hesaplamaları çalışma zamanında yerleşiktir (JavaScript ve Python sürümleri aynı sonucu verir);
Sinir ise Yöntem dilinde yazılmıştır, bu yüzden kendi modelinizi `sınıf(Modül)` ile türetirsiniz.
`YZ` birimi yerinde durur; Meşale ondan bağımsızdır ve N boyutlu tensörler, yayma (broadcasting),
toplu matris çarpımı ve PyTorch tarzı API sunar.

```pascal
program Ornek
kullan Meşale, Sinir

tip
  Ağ = sınıf(Modül)
    k1, k2: Doğrusal
    kurucu Oluştur
    fonksiyon İleri(x: herhangi): herhangi
  bitir

kurucu Ağ.Oluştur
başla
  miras Oluştur              { super().__init__() }
  k1 := Doğrusal(2, 16)
  k2 := Doğrusal(16, 1)
bitir

fonksiyon Ağ.İleri(x: herhangi): herhangi
başla
  dön k2.İleri(relu(k1.İleri(x)))
bitir

değişken model: Ağ; opt: herhangi; X, Y, kayıp: tensör; adım: tamsayı
başla
  Tohum(0)
  X := Tensör([[0, 0], [0, 1], [1, 0], [1, 1]])
  Y := Tensör([[0], [1], [1], [0]])
  model := Ağ()
  opt := Adam(model.parameters, 0.05)
  1'den 300'e kadar her adım için
  başla
    opt.zero_grad
    kayıp := binary_cross_entropy_with_logits(model.İleri(X), Y)
    kayıp.backward
    opt.step
  bitir
  Kaydet(model.state_dict, 'model.json')
bitir.
```

Her ad hem Türkçe hem PyTorch adıyla kullanılabilir. Yöntem büyük/küçük harf ayırmadığı için
`torch.relu` ile `nn.ReLU` aynı adı taşır; bu yüzden etkinleştirme katmanları `ReLUKatmanı`,
`GELUKatmanı` … adlarını alır. `Ardışık`/`Sequential` doğrudan `relu`, `gelu` gibi fonksiyonları
da katman olarak kabul eder. `Sinir`, `Meşale`'den sonra içe aktarıldığında `Linear`,
`Embedding`, `Dropout` adları sınıflara gider; aynı adlı fonksiyonlara `Meşale.linear(...)`
biçiminde ulaşılır (PyTorch'taki `F.linear` gibi).

| PyTorch | Meşale / Sinir |
|---|---|
| `torch.tensor(v, requires_grad=True)` | `Tensör(v, doğru)` · `tensor(v, doğru)` |
| `torch.zeros/ones/full/eye/arange/linspace` | `Sıfırlar/Birler/Dolu/BirimMatris/SayıDizisi/EşitAralıklı` (ya da PyTorch adları) |
| `torch.randn/rand/randint/randperm`, `torch.manual_seed` | `RastgeleNormal/RastgeleDüzgün/RastgeleTamsayı/Karıştırılmış`, `Tohum` |
| `a + b`, `a * b`, `a @ b`, `a ** 2` | aynı işleçler; yayma ve toplu `@` desteklenir |
| `t.shape`, `t.numel()`, `t.item()`, `t.tolist()` | `t.Şekil`, `t.ÖğeSayısı`, `t.Öğe`, `t.Liste` |
| `t.sum(1, keepdim=True)`, `mean`, `var`, `std`, `max`, `argmax` | `t.Toplam(1, doğru)`, `Ortalama`, `Varyans`, `Sapma`, `Maks`, `ArgMaks` |
| `t.view`, `reshape`, `transpose`, `permute`, `unsqueeze`, `squeeze`, `flatten`, `T` | `Yeniden`, `Çevir`, `Diz`, `BoyutEkle`, `BoyutSil`, `Düzleştir`, `T` |
| `torch.cat`, `torch.stack`, `torch.where`, `torch.tril/triu` | `Bitiştir`, `Yığ`, `Nerede`, `AltÜçgen/ÜstÜçgen` |
| `t.masked_fill`, `narrow`, `index_select`, `clamp`, `gt/lt/eq` | `MaskeleDoldur`, `Daralt`, `DizinSeç`, `Kırp`, `Büyüktür/Küçüktür/Eşittir` |
| `loss.backward()`, `t.grad`, `t.detach()`, `torch.no_grad()` | `kayıp.GeriYay`, `t.grad`, `t.Ayır`, `GradKapat` / `GradAç` |
| `F.relu/gelu/softmax/log_softmax/dropout/layer_norm/embedding/linear` | aynı adlar; Türkçe: `Softmaks`, `LogSoftmaks`, `Bırakma`, `KatmanNorm`, `GömmeAl`, `DoğrusalDönüşüm` |
| `F.cross_entropy/mse_loss/l1_loss/nll_loss/binary_cross_entropy(_with_logits)` | `ÇaprazEntropi`, `OKHKaybı`, `OMHKaybı`, `NLLKaybı`, `İkiliÇaprazEntropi(Logit)` |
| `nn.Module`, `forward` | `Modül`, `İleri` (ya da `forward`) |
| `nn.Linear/Embedding/LayerNorm/Dropout/Sequential/ModuleList` | `Doğrusal/Gömme/KatmanNormu/BırakmaKatmanı/Ardışık/ModülListesi` |
| `nn.MSELoss/CrossEntropyLoss/...` | `OKHKaybıNesnesi/ÇaprazEntropiKaybı/...`; `kayıp.forward(a, b)` |
| `model.parameters()`, `named_parameters()`, `train()`, `eval()` | `Parametreler`, `AdlıParametreler`, `Eğit`, `Değerlendir` |
| `torch.optim.SGD/Adam/AdamW`, `step`, `zero_grad` | `SGD/Adam/AdamW`, `Adım`, `SıfırlaGrad` |
| `nn.utils.clip_grad_norm_` | `GradNormKırp` |
| `TensorDataset`, `DataLoader(ds, batch_size, shuffle)` | `TensörVeriKümesi`, `VeriYükleyici(küme, yığın, karıştır)`; `her yığın için` ile yinelenir |
| `torch.save(model.state_dict(), yol)`, `load_state_dict(torch.load(yol))` | `Kaydet(model.DurumSözlüğü, yol)`, `model.DurumYükle(Yükle(yol))` |

**Farklar.** Hesaplar işlemcide, 64 bit ondalıkla ve tek iş parçacığıyla yapılır; grafik işlemcisi
desteği yoktur. Bütün tensörler ondalık tiplidir (sınıf dizinleri de). Bir tensörün bütün
boyutları dizinlenirse sayı döner (`t[0, 1]`); türevin akması gereken yerlerde tek öğeli tensörü
`t.Daralt(...)` ile alın. Dilim sözdizimi yerine `narrow`/`index_select` vardır.
`GradKapat` bir blok değil bir anahtardır; `GradAç` ile geri açılır. `gelu`, PyTorch'un
`approximate='tanh'` biçimini kullanır. Evrişim, yinelemeli katmanlar ve öğrenme oranı
takvimleri bu sürümde yoktur.

## 15. Pencere ve Mobil: arayüz ve telefon uygulamaları

`Pencere` birimi düğme, kutu ve tuvallerden oluşan arayüzler kurar; `Mobil` birimi telefonun
titreşim, bildirim, paylaşma, konum, hareket algılayıcısı ve kalıcı depo özelliklerini verir.
Aynı program üç yerde çalışır:

| Nerede | Nasıl | Arayüz |
|---|---|---|
| Oyun alanı | Çalıştır'a basın | **Uygulama** sekmesinde canlı çalışır |
| Web ya da telefon | `yontem paketle program.y --mobil` | Tek klasörlük uygulama; telefona "Ana ekrana ekle" ile kurulur, çevrim dışı çalışır |
| Komut satırı ve testler | `yontem program.y`, `python3 yontem.py program.y` | Benzetim: olaylar `Tıkla`, `Gir`, `Seç`, `Dokun` ile üretilir, `Çalıştır` arayüzü metin olarak yazar |

```pascal
program Sayaç
kullan Pencere

değişken
  sayı: tamsayı
  gösterge, artırDüğmesi: herhangi

prosedür Artır
başla
  sayı := sayı + 1
  gösterge.Metin := 'Sayı: ' + Metin(sayı)
bitir

başla
  Başlık('Sayaç')
  gösterge := Etiket('Sayı: 0')
  artırDüğmesi := Düğme('Artır')
  artırDüğmesi.Tıklanınca(@Artır)
  Yerleştir(gösterge, artırDüğmesi)

  eğer değil Canlı ise Tıkla(artırDüğmesi)   { komut satırında bir tıklamayı benzet }
  Çalıştır
bitir.
```

**Bileşenler** (`Pencere`): `Etiket(metin)`, `Düğme(metin)`, `GirişKutusu(ipucu)`,
`OnayKutusu(metin, işaretli)`, `Kaydırıcı(en_az, en_çok, değer)`, `SeçimKutusu(seçenekler)`,
`Tuval(genişlik, yükseklik)`, yerleşim için `Yatay(...)` ve `Dikey(...)`. Ortak üyeler `Etkin`,
`Görünür`; türüne göre `Metin`, `İpucu`, `İşaretli`, `Değer`, `Seçili`, `SeçiliMetin`,
`Seçenekler`, `Çocuklar`. Olaylar: `Tıklanınca(@P)`, `Değişince(@P)`, tuvalde
`Dokununca(@P(x, y))`. Tuval çizimi: `Renk`, `Çizgi`, `Dikdörtgen`, `Daire`, `Yazı`, `Temizle`.
Pencere: `Başlık`, `Yerleştir`, `Temizle`, `Aralıkla(ms, @P)`, `AralığıDurdur`, `Çalıştır`,
`Ağaç` (arayüzün metin görünümü), `Canlı` (gerçek arayüzde mi çalışıyor). Benzetim:
`Tıkla`, `Gir`, `Seç`, `Dokun`, `İlerle(ms)`.

**Mobil**: `Titreşim(ms)`, `Bildirim(başlık, metin)`, `Paylaş(metin)`, `KonumAl(@P(enlem, boylam))`,
`HareketOlunca(@P(x, y, z))`, `YönDeğişince(@P(yön))`, `Sakla(anahtar, değer)`,
`Getir(anahtar, varsayılan)`, `Unut(anahtar)`, `Platform`, `Dokunmatik`, `EkranGenişliği`,
`EkranYüksekliği`, `EkranYönü`. Benzetim: `BenzetimKonum`, `BenzetimHareket`, `Salla`,
`BenzetimYön`. Benzetimde titreşim, bildirim ve paylaşma çıktıya bir satır olarak yazılır.

**Paketleme.** `yontem paketle program.y [-o klasör] [--mobil] [--ad "Uygulama adı"]` programı
derleyip tek başına çalışan bir `index.html` üretir. `--mobil` ile `manifest.webmanifest`, çevrim
dışı çalışma için `sw.js` ve simgeler eklenir. Klasör HTTPS ile yayımlandığında (GitHub Pages,
Netlify ya da kendi sunucunuz) telefonun tarayıcısında "Ana ekrana ekle" ile uygulama olarak
kurulur. Uygulama mağazası paketi (Android/iOS) bu sürümde yoktur.

**Dikkat: adlar büyük/küçük harf ayırt etmez.** `tuval := Tuval(320, 200)` yazarsanız
`tuval` değişkeni `Tuval` fonksiyonunu gölgeler. Değişkene başka bir ad verin (`tahta`) ya da
nitelikli adı kullanın (`Pencere.Tuval(320, 200)`). Gömülü (ESP32) arka uçta bu iki birim yoktur.

## 16. Güvenlik birimi: siber saldırılara karşı savunma

`kullan Güvenlik` yaygın saldırılara karşı hazır, denenmiş araçlar verir. Algoritmalar standarttır
(SHA-256, HMAC-SHA256, PBKDF2, ChaCha20-Poly1305 / RFC 8439) ve test vektörleriyle doğrulanmıştır;
JavaScript ve Python çalışma zamanları aynı sonucu üretir, birinde şifrelenen veri ötekinde çözülür.

| Saldırı | Araç |
|---|---|
| Parola veritabanının çalınması | `ParolaÖzeti`, `ParolaDoğrula`, `YenidenÖzetlenmeli`, `ParolaGücü`, `ParolaSorunları` |
| Verinin değiştirilmesi, sahte istek | `Özet`, `İmza`, `İmzaDoğru`, `BelirteçÜret`, `BelirteçDoğrula` |
| Zamanlama saldırısı | `GüvenliEşit` (sabit süreli karşılaştırma) |
| Verinin okunması | `AnahtarÜret`, `ParoladanAnahtar`, `Şifrele`, `ŞifreÇöz` |
| Tahmin edilebilir değerler | `Tuz`, `Belirteç`, `Kimlik`, `GüvenliRastgele` (işletim sisteminin kriptografik üreteci) |
| XSS, SQL enjeksiyonu, yol geçişi | `HtmlKaçış`, `SqlMetni`, `YolGüvenli`, `DosyaAdıTemizle`, `UrlGüvenli`, `EpostaGeçerli`, `İzinliKarakterler` |
| Kaba kuvvet, servis dışı bırakma | `Sınırlayıcı(enÇok, saniye)` → `İzinVer`, `Kalan`, `Bekleme`, `Sıfırla` |
| İz bırakmadan saldırı, günlük sahteciliği | `Günlük`, `GünlükKayıtları`, `Maskele` |

```pascal
kullan Güvenlik
değişken kayıt: metin
başla
  kayıt := ParolaÖzeti('Deniz-Feneri-1907')      { pbkdf2-sha256$210000$tuz$özet }
  yaz(ParolaDoğrula('Deniz-Feneri-1907', kayıt), 1)  { doğru }
  yaz(HtmlKaçış('<script>'), 1)                  { &lt;script&gt; }
bitir.
```

Ayrıntılı kullanım kılavuzu: *Yöntem Güvenlik Birimi — Kullanım Kılavuzu*. Örnekler
`guvenlik_ornekleri/` klasöründedir. Testlerin belirlenimci olması için `BenzetimZamanı(saniye)`
birimin saatini sabitler; rastgelelik ise bilerek tohumlanamaz.

## 17. Örnekler

| Dosya | Gösterdiği |
|---|---|
| `ornekler/merhaba.y` | Temel sözdizimi, döngüler, referans parametreler, lambdalar, `seç` |
| `ornekler/nesneler.y` | Sınıflar, kalıtım, soyut metodlar, kayıtlar, diziler, hatalar |
| `ornekler/xor_sinir_agi.y` | Sinir ağı: yerleşik ve özel katmanlar, Adam/SGD |
| `ornekler/otomatik_turev.y` | `Türev`, gradyan inişiyle doğrusal regresyon |
| `ornekler/yol_bulma.y` | BFS, DFS, Dijkstra, A* |
| `ornekler/duygu_analizi.y` | Naif Bayes ile Türkçe duygu analizi, TF-IDF |
| `ornekler/uzman_sistem.y` | Kural tabanlı teşhis, ileri/geri zincirleme, açıklama |
| `ornekler/makine_ogrenmesi.y` | k-NN, k-ortalamalar, doğrusal ve lojistik regresyon |
| `ornekler/desen.y` | Desen birimi: doğrulama, arama, gruplar, değiştirme, ayırma |
| `ornekler/takvim.y` | Takvim birimi: tarih yazma, okuma, yaş ve gün hesabı |
| `ornekler/kuantum.y` | Bell/GHZ, Grover, QFT, Deutsch–Jozsa, Bernstein–Vazirani, ışınlama, VQE |
| `mesale_ornekleri/01_tensorler.y` | Meşale tensörleri, yayma, otomatik türev |
| `mesale_ornekleri/02_dogrusal_regresyon.y` | `TensorDataset`, `DataLoader`, `Linear`, `MSELoss`, `SGD` |
| `mesale_ornekleri/03_siniflandirma.y` | `Modül`'den türetilen ağ, `cross_entropy`, `Adam`, kaydet/yükle |
| `mesale_ornekleri/04_kucuk_gpt.y` | Sinir modülleriyle karakter düzeyinde küçük bir GPT |
| `arayuz_ornekleri/01_sayac.y` | İlk arayüz: etiket, düğmeler, `Etkin` |
| `arayuz_ornekleri/02_hesap_makinesi.y` | `GirişKutusu`, `SeçimKutusu`, `Değişince` |
| `arayuz_ornekleri/03_ayarlar.y` | `OnayKutusu`, `Kaydırıcı`, `Görünür` |
| `arayuz_ornekleri/04_cizim.y` | `Tuval`, `Dokununca`, `Aralıkla` |
| `arayuz_ornekleri/05_adim_sayar.y` | Mobil: hareket algılayıcısı, titreşim, bildirim, konum, paylaşma, depo |
| `arayuz_ornekleri/06_yapilacaklar.y` | Programla değişen arayüz ve kalıcı liste |
| `guvenlik_ornekleri/01_parola_saklama.y` | Tuzlu PBKDF2 parola özeti, parola gücü |
| `guvenlik_ornekleri/02_imza_ve_butunluk.y` | SHA-256, HMAC imzası, sabit süreli karşılaştırma |
| `guvenlik_ornekleri/03_girdi_denetimi.y` | XSS, SQL enjeksiyonu, yol geçişi, bağlantı ve e-posta denetimi |
| `guvenlik_ornekleri/04_sifreleme.y` | ChaCha20-Poly1305 şifreleme, paroladan anahtar |
| `guvenlik_ornekleri/05_saldiri_onleme.y` | Hız sınırlama, süreli imzalı belirteç, güvenlik günlüğü |
| `guvenlik_ornekleri/06_guvenli_giris.y` | Hepsi bir arada: güvenli kayıt, giriş ve oturum |

## 18. Sınırlamalar ve yol haritası

`python3 benchmark/calistir.py` dokuz testte hızı ölçer (`benchmark/sonuclar/rapor.md`). Son
ölçümde, açılış süresi çıkarıldığında elle yazılmış C++'a göre geometrik ortalamalar: Yöntem → C++
1,9×, Yöntem → JavaScript yaklaşık 29×, Yöntem Python yorumlayıcısı yaklaşık 1670× yavaş.
JavaScript derleyicisi, tipi derleme anında bilinen ifadelerde (tipli değişken, alan, parametre,
sabit ve fonksiyon sonuçları) doğrudan JavaScript işleçleri üretir ve tam argümanla yapılan
fonksiyon çağrılarını denetimsiz, sabit parametreli bir sürüme yönlendirir; bu iki adım
hesaplama süresini testlere göre 1,2–2,3 kat kısalttı (önceki ölçüm: 38×).


- JavaScript derleyicisi tipi bilinmeyen ifadelerde dinamik kod üretir; tamsayılar BigInt olduğundan yoğun tamsayı
  döngüleri yerel sayılara göre yavaştır. Gömülü arka uç bu sınırlamayı taşımaz.
- `Pencere` ve `Mobil` canlı olarak yalnızca tarayıcıda (oyun alanı, `yontem paketle`) çalışır;
  Python yorumlayıcısı ve komut satırı benzetim kipindedir. Planlanan: Android/iOS mağaza paketi,
  kamera ve Bluetooth erişimi, sürükle-bırak arayüz tasarımcısı.
- Gömülü arka uç şimdilik ESP32'yi hedefler. Planlanan: STM32/RP2040, Wi-Fi ve BLE birimleri,
  büyük modeller için ağırlıkların flaşta (const) tutulması.
- `YZ` tensörleri en fazla 2 boyutludur; N boyutlu tensörler için `Meşale` kullanılır.
  Meşale'de evrişim, yinelemeli katmanlar ve grafik işlemcisi desteği henüz yok.
- Kuantum simülatörü gürültüsüzdür ve en çok 20 kübit destekler. Planlanan: gürültü
  modelleri ve gerçek kuantum donanımına (ör. OpenQASM çıktısı) aktarım.
- `Güvenlik` birimi gömülü arka uçta henüz yok; açık anahtarlı şifreleme (imza ve anahtar
  değişimi, ör. Ed25519/X25519) ve TLS planlanıyor. Saf kodla yazılan şifreleme yan kanal
  saldırılarına karşı bağımsız bir denetimden geçmemiştir.
- Katı kip, tipi derleme anında bilinen değerleri denetler: temel tipler, bildirilmiş değişken, parametre ve dönüş tipleri, öğe tipi bildirilmiş listeler ve sözlükler (`tamsayı listesi`), sınıf ve kayıt tipleri (alan ve metod erişimi, metod argümanları, sınıflar arası uyum), sonucu belli yerleşik işlevler, `Takvim`/`Desen`/`Güvenlik`/`Ağ` işlevlerinin dönüş tipleri ve bütün yerleşik işlevlerin argüman sayıları. Sonucu argümana bağlı işlevler (`Maks`, `Yuvarla`, `Bul`) ve `Pencere`, `Meşale` gibi birimlerin döndürdüğü nesneler derleme anında izlenmez; bunlar çalışırken denetlenir. Öğe tipi bildirimi çalışma zamanında zorlanmaz. Denetim yalnızca JavaScript derleyicisindedir.
- `Veritabanı` biriminde SQLite, Node.js 22.5 ya da yenisini gerektirir (Python'da her sürümde vardır); PostgreSQL ve MySQL sürücüleri ayrıca kurulur. Birim sorguları çevirmez: SQL lehçesi farkları programcıya kalır. `Sunucu` istekleri sırayla işler ve HTTPS sunmaz; internete açarken önüne bir ters vekil konmalıdır. İki birim de tarayıcıda ve gömülü arka uçta yoktur.
- Paket yöneticisinin merkezî bir paket deposu ve sürüm aralığı çözümü yoktur: paket, verilen kaynaktan (depo etiketi, adres, klasör) olduğu gibi kurulur. Hata ayıklayıcı ve paket komutları yalnızca JavaScript derleyicisindedir; kurulan paketleri Python yorumlayıcısı da kullanır. `Ağ` birimi yalnızca metin
  yanıtları ve eşzamanlı istekleri destekler (dosya indirme, akış ve WebSocket yok).
- Kayıt ve sınıf dışındaki değerler (liste, sözlük) referansla aktarılır.
- Planlanan: arayüz (interface) tipleri, genel (generic) tipler, özellik (property) sözdizimi,
  tip çıkarımlı statik denetim aşaması.

## Lisans

Yöntem **MIT lisansıyla** dağıtılır: ücretsiz kullanabilir, değiştirebilir, dağıtabilir ve ticari
ürünlerde kullanabilirsiniz. Yöntem ile yazdığınız programlar sizindir; derlenen dosyalara ve
paketlenen uygulamalara kopyalanan çalışma zamanındaki kısa telif notunu korumanız yeterlidir.
Kitap ve kılavuz metinleri [Creative Commons Atıf 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.tr)
lisanslıdır: yazar adı belirtilerek paylaşılabilir ve uyarlanabilir; içlerindeki örnek programlar MIT lisanslıdır.
Ayrıntılar: [`LICENSE`](LICENSE) (bağlayıcı İngilizce metin) ve [`LISANS.md`](LISANS.md) (Türkçe özet).

Telif hakkı © 2026 Önder Örnek · Sürüm 0.5.0
