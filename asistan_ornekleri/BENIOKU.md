# Yerel yapay zekâ asistanı örnekleri

*Yöntem ile Yerel Yapay Zekâ Asistanı* kılavuzundaki birimler ve programlar. Kılavuzun metni `basim/asistan.md`
dosyasındadır.

| Dosya | İçerik |
| --- | --- |
| `Model.y` | Dil modeline tek kapı: `Sor`, `Göm`, `ModelAyarla` (Ollama ve OpenAI uyumlu servisler) |
| `Kalip.y` | Modelden tipli veri almak: `Yapılandır`, `ŞemaYap`, `ŞemaHatası` |
| `Hafiza.y` | Belgelerde anlam araması (SQLite üzerinde): `HafızayaEkle`, `HafızadaAra` |
| `Akis.y` | İş akışı çizgesi: `Düğüm`, `Kenar`, `SeçmeliKenar`, `AkışıÇalıştır` |
| `01_beyin.y` … `05_is_akisi.y` | Her parçayı tek tek gösteren programlar |
| `06_asistan.y` | Hepsi bir arada: kendi belgelerinizle çalışan asistan |
| `07_degerlendirme.y` | Modeli bir soru setiyle ölçmek; sorular `aynı anda` döngüsüyle birlikte sorulur |
| `belgeler/` | Örneklerde kullanılan, uydurma bir şirkete ait üç kısa metin |
| `sinama/` | Sınama servisinin kayıtlı yanıtları ve asistan oturumunun girdisi |

## Çalıştırmak

Ollama kurulu ve çalışıyor olmalıdır; `gemma4:e2b` ve `embeddinggemma` modelleri varsayılandır
(başka modeller için `YONTEM_MODEL` ve `YONTEM_GOMME_MODELI` ortam değişkenleri).

    yontem 01_beyin.y
    yontem 06_asistan.y belgeler/izin.md belgeler/kargo.md belgeler/iade.md

## Sınamak

    node js/betikler/asistan_testi.js

Test gerçek bir model kullanmaz: Ollama'nın arayüzünü taklit eden `js/betikler/sahte_ollama.js` servisini başlatır.
Programlar gerçek bir Ollama kurulumuyla henüz denenmemiştir.
