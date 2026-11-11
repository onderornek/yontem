# yontem.pro — site dosyaları

`kitaplar/` klasörü, kitapların ve kılavuzların çevrim içi (HTML) sürümüdür. Her kitap ayrıca tek, kendi kendine yeten bir dosyadır (`kitaplar/<kitap>.html`: stil, resimler ve gezinme içinde); internet bağlantısı olmadan da açılır. Bölüm bölüm sürümler `kitaplar/<kitap>/` altındadır.
`/kitaplar/` altında yayımlanır. Her kitabın klasöründe isteğe bağlı indirme için basımevi düzenindeki PDF de bulunur.

Yeniden üretmek için (pandoc 3 gerekir):

```bash
python3 site/kaynak/olustur.py
```

Kaynak Markdown dosyaları `site/kaynak/` içindedir (Claude Docs'tan dışa aktarılan metin, PDF'lerle aynı).
PDF'ler `basim/yap.sh` ile üretilir ve `site/kitaplar/<kitap>/` klasörüne kopyalanır.

## Sayfalar ve yayım

- `tasarim/` ana sayfa ve kurulum sayfasının tasarım dosyaları.
- `sayfalar/` içerik sayfaları (Öğren, Belgeler, Öğretmenler, Gömülü, Topluluk, Blog, Gizlilik). Her dosyanın başındaki
  açıklama bloğu başlığı ve özeti taşır; `<yontem>` ve `<kabuk>` blokları kod olarak renklendirilir.
- `fontlar/` yazı tipleri (SIL OFL 1.1). Site Google Fonts kullanmaz.

Yayımlanacak siteyi üretmek için:

```bash
python3 site/kaynak/yerel_paket.py    # → site/yerel/yontem-site/ ve yontem-site.zip
```

`site/yerel/yontem-site/` klasörünün içeriği olduğu gibi web sunucusunun köküne yüklenir; bütün bağlantılar görelidir.
