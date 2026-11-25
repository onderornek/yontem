# Yöntem

Türkçe anahtar sözcüklü, Pascal soyundan gelen, nesne tabanlı bir programlama dili.
Bu paket Yöntem → JavaScript derleyicisini, çalışma zamanını ve `yontem` komutunu içerir.

```
npm install -g yontem
```

`merhaba.y`:

```pascal
program Merhaba
başla
  1'den 3'e kadar her i için
    yaz('Merhaba, Yöntem! ' + i, 1)
bitir.
```

```
yontem merhaba.y
```

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `yontem program.y` | Programı derleyip çalıştırır |
| `yontem yeni ad` | Yeni proje iskeleti oluşturur |
| `yontem test [klasör]` | Programları beklenen çıktılarıyla sınar |
| `yontem bicimle dosya.y` | Kaynak kodu biçimlendirir |
| `yontem denetle [--kati]` | Çalıştırmadan sözdizimi ve tip denetimi yapar |
| `yontem ayikla program.y` | Hata ayıklayıcı (kesme noktaları, adımlama) |
| `yontem paket ekle\|kur\|kaldir\|guncelle\|liste` | Paket yöneticisi |
| `yontem paketle program.y` | Tek başına çalışan web uygulaması üretir |
| `yontem gomulu program.y` | ESP32 için C++ projesi üretir |
| `yontem dil-sunucusu` | Düzenleyiciler için dil sunucusu (LSP) |

## Birimler

`Matematik`, `Sistem`, `Veri`, `Takvim`, `Desen`, `Güvenlik`, `Ağ`, `Veritabanı`, `Sunucu`, `Pencere`,
`Mobil`, `YZ`, `Meşale`, `Kuantum` ve Yöntem ile yazılmış kitaplık (`Arama`, `Dil`, `İstatistik`,
`MakineÖğrenmesi`, `Sinir`, `Uzman`, `KuantumAlgoritmaları`).

`Veritabanı` birimi SQLite için Node.js 22.5 ya da üstünü ister. PostgreSQL ve MySQL için sürücü
projeye ayrıca kurulur: `npm install pg` ya da `npm install mysql2`.

## Gereksinimler

Node.js 22 ya da üstü.

## Belgeler

- Site ve kitaplar: https://yontem.pro
- Kaynak kod, tam başvuru ve sorun bildirimi: https://github.com/onderornek/yontem

## Lisans

MIT © Önder Örnek
