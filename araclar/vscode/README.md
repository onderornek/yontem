# Yöntem — VS Code eklentisi

[Yöntem](https://yontem.pro) programlama dili için Visual Studio Code desteği.

- **Sözdizimi renklendirme:** anahtar sözcükler (Türkçe karakterli ve karaktersiz yazımlarıyla: `değişken` = `degisken`), tipler, yerleşik işlevler, birimler, metinler, sayılar, yorumlar ve ekler (`1'den 10'a`).
- **Kod parçacıkları:** `program`, `birim`, `eğer`, `için`, `iken`, `değerine`, `fonksiyon`, `prosedür`, `sınıf`, `kayıt`, `dene` ve diğerleri. Önekin ilk harflerini yazıp Tab'a basın.
- **Çalıştırma:** `F5` ya da düzenleyicinin sağ üstündeki ▶ düğmesi etkin `.y` dosyasını tümleşik uçbirimde çalıştırır. Komut paletinde **Yöntem: Testleri çalıştır** `yontem test` komutunu çalıştırır.
- **Dil sunucusu:** yazarken hata gösterimi (sözdizimi hataları, bulunamayan birimler), tanımlı görünmeyen adlar için yazım hatası uyarısı, tamamlama (dosyadaki adlar, kullanılan birimlerin üyeleri, yerleşikler; `Güvenlik.` yazınca birimin üyeleri), üzerine gelince imza, **Tanıma Git** (`F12`; kitaplık birimlerinin içine de gider) ve **Simgeye Git** (`Ctrl+Shift+O`). Eklenti bunun için arka planda `yontem dil-sunucusu` komutunu çalıştırır.
- **Katı kip:** başında `{$katı}` yönergesi olan dosyalarda derleme zamanı tip hataları yazarken gösterilir.
- **Hata ayıklama:** satır numarasının soluna tıklayarak kesme noktası koyun, `F6` ile (ya da **Çalıştır ve Hata Ayıkla** panelinden) başlatın. Adımlama, koşullu kesme noktaları, değişkenler (listeler, sözlükler ve nesneler açılır), çağrı yığını, izleme ifadeleri ve çalışma hatasında durma desteklenir. Programın `oku` çağrıları için `launch.json` içinde `"girdi": "girdi.txt"` ile bir dosya verin. JavaScript derleyicisini gerektirir.
- **Biçimlendirme:** **Belgeyi Biçimlendir** (`Shift+Alt+F`) girintiyi ve boşlukları `yontem bicimle` ile düzenler. Kaydederken biçimlendirmek için `"editor.formatOnSave": true` ayarını açın.
- Otomatik girinti, ayraç eşleme, `başla … bitir` katlama ve yorum kısayolları (`Ctrl+/`).

## Kurulum

Depodan paketlenmiş dosyayı kurun:

```bash
code --install-extension araclar/vscode/yontem-dili-0.5.0.vsix
```

Ya da VS Code'da Eklentiler → `…` → **VSIX'ten Yükle**.

## Ayarlar

`yontem.komut` — programları çalıştıran komut (varsayılan `yontem`). Yöntem'i `PATH`'e eklemediyseniz tam komutu yazın:

```json
{ "yontem.komut": "node /yol/yontem/js/dist/cli.js" }
```

Python yorumlayıcısı için: `"python3 /yol/yontem/yontem.py"`.

## Geliştirme

Sözdizimi dosyası üretilir; sözcük listelerini `uret.py` içinde değiştirip yeniden üretin:

```bash
python3 araclar/vscode/uret.py
cd araclar/vscode && npx @vscode/vsce package
```

`.y` uzantısı Yacc dosyalarıyla ortaktır; VS Code bir `.y` dosyasını başka bir dil olarak açarsa sağ alttaki dil seçiciden **Yöntem**'i seçin.

Lisans: MIT
