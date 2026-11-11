# Yöntem kurulum kılavuzu

Nov 9, 2026 · @Önder Örnek

## Hangi kurulum size uygun?

Çoğu kullanıcı için yalnızca **JavaScript derleyicisi** yeterlidir: Node.js 18 veya üstünü kurup Yöntem klasörünü bir kez derledikten sonra programlarınızı `yontem program.y` ile çalıştırabilirsiniz. Python yorumlayıcısı ve gömülü arka uç isteğe bağlıdır. Hiçbir şey kurmadan denemek isterseniz tarayıcıdaki oyun alanını kullanabilirsiniz.

| Bileşen | Ne işe yarar | Gereken | Ne zaman kurulur |
| --- | --- | --- | --- |
| JavaScript derleyicisi (önerilen) | `.y` programlarını derleyip çalıştırır; en hızlı yol | Node.js 18+ (npm ile birlikte gelir) | Her zaman |
| Python yorumlayıcısı | Başvuru uygulaması ve etkileşimli kabuk (REPL) | Python 3.8+, dış bağımlılık yok | Kabuk isterseniz ya da Node.js kuramıyorsanız |
| Gömülü arka uç: masaüstü benzetimi | Programı C++'a derleyip bilgisayarda çalıştırır | JavaScript derleyicisi + C++17 derleyicisi (g++ ya da clang++) | ESP32 programı yazacaksanız |
| Gömülü arka uç: ESP32'ye yükleme | Üretilen projeyi karta yükler | Arduino IDE, `arduino-cli` ya da PlatformIO; ESP32 Arduino çekirdeği 3.x | Kartınız varsa |

Kaynak dosyaların uzantısı `.y`'dir. Bu kılavuz Yöntem 0.5.0 içindir.

## 1. Hazırlık: Node.js ve Python

Node.js 18 veya üstü gerekir; Python yalnızca yorumlayıcıyı kullanacaksanız gerekir. Önce bunların zaten kurulu olup olmadığına bakabilirsiniz:

```bash
node --version     # v18.0.0 veya üstü olmalı
npm --version
python3 --version  # Windows'ta: py --version (3.8 veya üstü)
```

**Windows**

- Node.js: [nodejs.org](https://nodejs.org) adresinden LTS sürümünü indirip kurabilir ya da PowerShell'de `winget install OpenJS.NodeJS.LTS` yazabilirsiniz.
- Python: [python.org](https://www.python.org/downloads/) adresinden kurabilirsiniz; kurulumda **Add python.exe to PATH** kutusunu işaretlemeniz gerekir.
- Kurulumdan sonra terminali kapatıp yeniden açmanız gerekir; yoksa yeni komutlar bulunamaz.

**macOS**

- [Homebrew](https://brew.sh) varsa `brew install node` ve `brew install python` komutları yeterlidir.
- Yoksa iki programı da [nodejs.org](https://nodejs.org) ve [python.org](https://www.python.org/downloads/) kurulum paketleriyle kurabilirsiniz.

**Linux (Ubuntu, Debian)**

```bash
sudo apt update
sudo apt install nodejs npm python3
node --version
```

Dağıtımınızın paket deposundaki Node.js 18'den eskiyse (örneğin Ubuntu 22.04), Node.js'i [nvm](https://github.com/nvm-sh/nvm) ile kurabilirsiniz: `nvm install --lts`.

## 2. JavaScript derleyicisini kurma

Bu adımda Yöntem klasörünü alıp `js` klasöründe bir kez derleyecek ve `npm link` ile `yontem` komutunu her yerden kullanılabilir yapacaksınız. Yöntem henüz npm paket deposunda yayımlanmadığı için kurulum kaynak klasörden yapılır.

1. Önce Yöntem klasörünü edinmeniz gerekir. Bunu `git clone https://github.com/onderornek/yontem.git` komutuyla yapabilirsiniz. Git kullanmıyorsanız deponun sayfasından ZIP olarak indirip kalıcı bir yere (örneğin Belgeler klasörüne) açmanız yeterlidir.
2. Ardından derleyiciyi derleyip komutu bağlayabilirsiniz:

```bash
cd yontem/js
npm install       # TypeScript ve esbuild'i indirir (yalnızca derleme için)
npm run build     # derleyiciyi, tarayıcı paketini ve oyun alanını üretir
npm link          # "yontem" komutunu tüm sisteme ekler
```

3. Artık ilk programınızı çalıştırabilirsiniz. Bunun için `merhaba.y` adlı bir dosya oluşturalım:

```
program Merhaba
başla
  yaz('Merhaba, Yöntem!', 1)
bitir.
```

```bash
yontem merhaba.y                   # derler ve çalıştırır
yontem derle merhaba.y -o m.js     # yalnızca JavaScript üretir; node m.js ile çalışır
yontem --surum                     # Yöntem 0.5.0 (JavaScript)
yontem --yardim                    # tüm komutlar
```

**Notlar**

- `npm link` Linux'ta "EACCES" hatası verirse Node.js'i nvm ile kurabilir ya da komutu `sudo npm link` ile çalıştırabilirsiniz.
- `npm link` kullanmak istemezseniz her yerde `node yontem/js/dist/cli.js program.y` yazabilirsiniz.
- `yontem` komutu Yöntem klasörüne bağlıdır; klasörü taşırsanız `npm link` adımını yeni yerde tekrarlamanız gerekir.
- Birimler (`kullan Matematik` gibi) programın klasöründe, onun `kutuphane` alt klasöründe ve Yöntem'in kendi `kutuphane` klasöründe aranır. Başka klasörler için `YONTEM_YOL` ortam değişkenine yolları ekleyebilirsiniz (yollar Linux ve macOS'ta `:`, Windows'ta `;` ile ayrılır).
- Oyun alanını çevrim dışı kullanmak için `yontem/oyun_alani/index.html` dosyasını tarayıcıda açmanız yeterlidir.

## 3. Python yorumlayıcısı

Python yorumlayıcısı kurulum gerektirmez: Yöntem klasöründeki `yontem.py` dosyasını Python 3.8+ ile çalıştırmanız yeterlidir. JavaScript derleyicisiyle aynı çıktıyı verir ama çok daha yavaştır; asıl kullanımı etkileşimli kabuktur.

```bash
cd yontem
python3 yontem.py merhaba.y   # programı çalıştırır (Windows'ta: py yontem.py merhaba.y)
python3 yontem.py             # etkileşimli kabuk; çıkmak için: çıkış
python3 yontem.py --surum     # Yöntem 0.5.0
```

Kabukta ifadeleri doğrudan yazıp sonucunu görebilirsiniz; örneğin `değişken x := 5` ve ardından `x * 2`.

## 4. Gömülü arka uç (ESP32)

Gömülü arka uç 2. adımdaki `yontem` komutuyla gelir; ayrıca bir C++17 derleyicisi (masaüstü benzetimi için) ve kartınız varsa bir yükleme aracı gerekir. Program, statik tipli bir alt kümeye uyduğu sürece C++'a derlenir.

**C++ derleyicisi (masaüstü benzetimi için)**

| Sistem | Kurulum |
| --- | --- |
| Linux (Ubuntu, Debian) | `sudo apt install g++` |
| macOS | `xcode-select --install` (gelen `g++` komutu clang'dir ve çalışır) |
| Windows | [MSYS2](https://www.msys2.org) ile MinGW `g++` kurulabilir; Windows'ta masaüstü benzetimi henüz sınanmamıştır |

Farklı bir derleyici kullanmak için `CXX` ortam değişkenini ayarlayabilirsiniz (örneğin `CXX=clang++`).

```bash
yontem gomulu led.y --calistir    # C++'a derler, bilgisayarda çalıştırır
YONTEM_IZ=1 yontem gomulu led.y --calistir   # pin değişikliklerini de yazar
yontem gomulu led.y               # ESP32 projesi üretir: led/ klasörü
yontem gomulu led.y -o projem     # klasör adını siz verin
```

**Karta yükleme.** Üretilen klasörde bir `.ino` dosyası, `platformio.ini` ve `BENIOKU.txt` bulunur. Üç yükleme yolundan birini seçebilirsiniz:

- **Arduino IDE:** Kart Yöneticisi'nden Espressif'in "esp32" çekirdeğini (3.x önerilir) kurduktan sonra `.ino` dosyasını açıp kart olarak "ESP32 Dev Module" ve kartın bağlı olduğu portu seçerek yükleyebilirsiniz. Çekirdek 2.x ise Araçlar menüsünden C++17'yi açmanız gerekir.
- **arduino-cli:** `arduino-cli compile --fqbn esp32:esp32:esp32 led` ve `arduino-cli upload -p /dev/ttyUSB0 --fqbn esp32:esp32:esp32 led` komutları kullanılır (port adı sisteminize göre değişir; Windows'ta örneğin `COM3`).
- **PlatformIO:** klasörün içinde `pio run -t upload`, ardından seri çıktı için `pio device monitor -b 115200` komutu çalıştırılır.

Programın `yaz` çıktısı ve `oku` girdisi seri port üzerinden, 115200 baud hızında akışır. Hazır örnekler `yontem/gomulu_ornekler/` klasöründedir.

## 5. Doğrulama, güncelleme ve sorunlar

Kurulumun tamamlandığını Yöntem'in kendi testleriyle doğrulayabilirsiniz; testlerin hepsi "geçti" demelidir.

```bash
cd yontem
node js/betikler/test.js          # JavaScript derleyicisi: 94/94 dosya geçti
python3 testler/calistir.py       # Python yorumlayıcısı
node js/betikler/gomulu_test.js   # gömülü arka uç (C++ derleyicisi gerekir)
```

**Güncelleme.** Yeni sürümü aldıktan sonra (`git pull` ya da yeni klasör kopyası) `yontem/js` klasöründe `npm install` ve `npm run build` komutlarını yeniden çalıştırmanız yeterlidir. Klasörün yeri değiştiyse `npm link` adımını da tekrarlamanız gerekir.

**Sık karşılaşılan sorunlar**

| Belirti | Olası neden | Çözüm |
| --- | --- | --- |
| `node`, `npm` ya da `python3` komutu bulunamadı | Kurulumdan sonra terminal yeniden açılmadı; Windows'ta PATH seçeneği işaretlenmedi | Terminali yeniden açabilirsiniz; Windows'ta `py` komutunu deneyebilir ya da Python'u PATH seçeneğiyle yeniden kurabilirsiniz |
| `yontem` komutu bulunamadı | `npm link` çalıştırılmadı ya da npm'in genel klasörü PATH'te değil | `yontem/js` içinde `npm link` çalıştırılır; olmazsa `node yontem/js/dist/cli.js` ile çalıştırabilirsiniz |
| `npm run build` sırasında `tsc` ya da `esbuild` bulunamadı | `npm install` atlandı | Önce `npm install`, sonra `npm run build` çalıştırılır |
| Derleyici beklenmedik sözdizimi hatasıyla çöküyor | Node.js 18'den eski | `node --version` ile sürüme bakıp Node.js'i güncelleyebilirsiniz |
| `npm link` "EACCES" veriyor (Linux, macOS) | Genel klasöre yazma izni yok | Node.js'i nvm ile kurabilir ya da `sudo npm link` kullanabilirsiniz |
| Türkçe karakterler bozuk görünüyor (Windows) | Komut istemi UTF-8 değil | `chcp 65001` yazabilir ya da Windows Terminal kullanabilirsiniz |
| `kullan` ile açılan birim bulunamadı | Birim dosyası aranan klasörlerde değil | Dosyayı programın yanına ya da `kutuphane` alt klasörüne koyabilir veya `YONTEM_YOL`'a ekleyebilirsiniz |
| `--calistir` C++ derleyicisini bulamıyor | g++ kurulu değil ya da PATH'te değil | 4. adımdaki tabloya göre kurabilir ya da `CXX` ile derleyiciyi gösterebilirsiniz |
| Kart yüklemede port bulunamadı | USB sürücüsü eksik ya da kablo yalnızca şarj kablosu | Kartın USB-seri sürücüsünü (CP210x ya da CH340) kurmanız ve bir veri kablosu kullanmanız gerekir |

Sorun devam ederse hata mesajının tamamını, `node --version` ve `yontem --surum` çıktılarıyla birlikte paylaşabilirsiniz.
