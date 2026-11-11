# Yöntem'e katkı

Katkılarınız için teşekkürler. Hata bildirimi, belge düzeltmesi, örnek program, yeni birim ya da
derleyici iyileştirmesi: hepsi değerlidir.

## Geliştirme ortamı

```bash
git clone <depo adresi> && cd yontem
cd js && npm install && npm run build && cd ..   # JavaScript derleyicisi (Node.js 18+)
python3 yontem.py ornekler/merhaba.y              # Python yorumlayıcısı (Python 3.8+, bağımlılık yok)
```

## Testler

Değişiklik göndermeden önce üç test takımı da geçmelidir:

```bash
cd js && npm test            # JavaScript: testler, örnekler, kitap örnekleri
npm run test:gomulu          # gömülü arka uç (g++ gerekir)
npm run test:dil             # dil sunucusu
npm run test:ayikla          # hata ayıklayıcı (uçbirim ve DAP)
npm run test:sunucu          # Sunucu birimi (yerel portlarda; JavaScript ve Python)
npm run test:vt              # Veritabanı birimi (SQLite; PG/MySQL adres verilirse)
npm run test:kati            # katı kip (derleme zamanı tip denetimi)
npm run test:paket           # paket yöneticisi (yerel sunucu başlatır; dış ağa çıkmaz)
npm run test:ag              # Ağ birimi (yerel sunucu başlatır; JavaScript ve Python)
cd .. && python3 testler/calistir.py   # Python
```

Tek bir klasörü denemek için: `yontem test guvenlik_ornekleri`.

## Temel kural: iki uygulama aynı çıktıyı verir

Yöntem'in JavaScript derleyicisi (`js/`) ve Python yorumlayıcısı (`yontem_dil/`) **bayt bayt aynı
çıktıyı** üretir. Dile ya da bir birime eklenen her özellik iki tarafta da yazılır ve bir örnek
programla sınanır:

1. Örneği ilgili klasöre ekleyin (`testler/`, `ornekler/`, `guvenlik_ornekleri/` …).
2. İki uygulamada çalıştırıp karşılaştırın: `js/betikler/karsilastir.sh dosya.y`
3. Çıktı aynıysa beklenen dosyayı yazın: `yontem test dosya.y --guncelle`

Rastgelelik içeren testler `Tohum` ile, zamana bağlı olanlar benzetim saatiyle sabitlenir.

## Kod düzeni

- Dil Türkçedir: tanımlayıcılar, hata mesajları ve yorumlar Türkçe yazılır. Kaynak dosya adlarında
  Türkçe karakter kullanılmaz (`guvenlik.ts`, `Istatistik.y`).
- Yöntem programlarını göndermeden önce biçimlendirin: `yontem bicimle .` (testler biçimsiz dosyada başarısız olur).
- Hata mesajları ne beklendiğini ve ne verildiğini söyler: `'tekrar' tamsayı bekler, metin verildi`.
- Yeni bir yerel birim: `js/src/calisma/<ad>.ts` ve `yontem_dil/<ad>.py`; iki tarafta da kaydedin
  (`$.yerelBirimler`, `YEREL_MODULLER`) ve README'ye bir bölüm ekleyin.
- Yöntem dilinde yazılan birimler `kutuphane/` klasörüne girer ve tarayıcı paketine otomatik gömülür.
- Üretilen dosyaları (`js/dist/`, `oyun_alani/index.html`, `araclar/vscode/syntaxes/`) elle
  düzenlemeyin; kaynağını değiştirip yeniden üretin.

## Değişiklik gönderme

1. Depoyu çatallayın, konuya özel bir dal açın.
2. Değişikliği ve testini aynı gönderimde yapın; `CHANGELOG.md` dosyasına bir satır ekleyin.
3. Çekme isteğinde neyi, neden değiştirdiğinizi kısaca anlatın.

Dilin sözdizimini ya da var olan programların davranışını değiştiren öneriler için önce bir konu
(issue) açıp tartışmanız zaman kazandırır.

## Lisans

Gönderdiğiniz katkılar yazılım için [MIT](LICENSE), kitap ve kılavuz metinleri için
[CC BY 4.0](basim/LICENSE-KITAPLAR.md) lisansıyla yayımlanır.
