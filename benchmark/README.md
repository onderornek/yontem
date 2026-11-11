# Yöntem benchmark takımı

Yöntem'in üç çalışma biçimini (C++'a derleme, JavaScript'e derleme, Python yorumlayıcısı) aynı
algoritmaların elle yazılmış C++, JavaScript ve Python sürümleriyle karşılaştırır.

```bash
cd js && npm run build && cd ..           # derleyici hazır değilse
python3 benchmark/calistir.py --hizli     # Yöntem Python yorumlayıcısı hariç, ~20 saniye
python3 benchmark/calistir.py             # hepsi, ~2 dakika
python3 benchmark/calistir.py --tekrar 10 --testler fib,matris
```

Gerekenler: Node.js, Python 3 ve `g++` ya da `clang++`. Sonuçlar `sonuclar/` klasörüne yazılır:

| Dosya | İçerik |
|---|---|
| `sonuclar/rapor.md` | Sürümler, ortanca süreler, C++'a göre katlar, yöntem açıklaması |
| `sonuclar/rapor.svg` | Ortam başına geometrik ortalama yavaşlama grafiği |
| `sonuclar/rapor.json` | Tüm ham ölçümler |

## Testler

Her test klasöründe aynı algoritmanın dört yazımı (`.y`, `.py`, `.js`, `.cpp`) ve beklenen çıktı
(`beklenen.txt`) vardır. Bir ölçüm, çıktısı beklenenle birebir aynı değilse geçersiz sayılır.

| Test | Ne ölçer? |
|---|---|
| `bos` | Açılış süresi (oranlardan çıkarılır) |
| `fib` | Özyinelemeli Fibonacci(27): fonksiyon çağrısı |
| `matris` | 100×100 matris çarpımı: ondalık aritmetik, dizi erişimi |
| `spektral` | Spektral norm (N=120): fonksiyon çağrısı, ondalık |
| `ikili_agac` | Tam ikili ağaçlar: nesne oluşturma |
| `fannkuch` | Permütasyonlarda ters çevirme (N=8): tamsayı dizileri |
| `nbody` | Beş cisim, 20000 adım: ondalık aritmetik |
| `siralama` | 30000 sayıyı hızlı sıralama: karşılaştırma, takas |
| `sozcuk_sayma` | 40000 sözcüğü sayma: metin ve sözlük |

Yöntem programları gömülü arka ucun statik tipli alt kümesine uyar; bu yüzden aynı dosya hem
JavaScript'e hem C++'a derlenir.

## Yeni test eklemek

1. `testler/<ad>/` klasörünü açın ve `<ad>.y`, `<ad>.py`, `<ad>.js`, `<ad>.cpp` dosyalarını
   aynı algoritmayla, aynı çıktıyı verecek şekilde yazın.
2. `node js/dist/cli.js benchmark/testler/<ad>/<ad>.y > benchmark/testler/<ad>/beklenen.txt`
3. `calistir.py` içindeki `TEST_ACIKLAMA` sözlüğüne bir satır ekleyin.

Çalıştırıcı derlenmiş C++ dosyalarını `derleme/` klasörüne koyar; bu klasör silinebilir.
