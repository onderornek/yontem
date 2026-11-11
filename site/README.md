# yontem.pro — site dosyaları

`kitaplar/` klasörü, kitapların ve kılavuzların çevrim içi (HTML) sürümüdür. Her kitap ayrıca tek, kendi kendine yeten bir dosyadır (`kitaplar/<kitap>.html`: stil, resimler ve gezinme içinde); internet bağlantısı olmadan da açılır. Bölüm bölüm sürümler `kitaplar/<kitap>/` altındadır.
`/kitaplar/` altında yayımlanır. Her kitabın klasöründe isteğe bağlı indirme için basımevi düzenindeki PDF de bulunur.

Yeniden üretmek için (pandoc 3 gerekir):

```bash
python3 site/kaynak/olustur.py
```

Kaynak Markdown dosyaları `site/kaynak/` içindedir (Claude Docs'tan dışa aktarılan metin, PDF'lerle aynı).
PDF'ler `basim/yap.sh` ile üretilir ve `site/kitaplar/<kitap>/` klasörüne kopyalanır.
