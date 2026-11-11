# Güvenlik politikası

## Açık bildirme

Yöntem'de bir güvenlik açığı bulduysanız lütfen **herkese açık bir konu (issue) açmayın**.
Deponun GitHub sayfasında **Security → Report a vulnerability** yolunu kullanarak özel bildirim
gönderin. Bildirimde şunlar yardımcı olur:

- etkilenen bileşen (JavaScript derleyicisi, Python yorumlayıcısı, gömülü arka uç, bir birim, oyun alanı),
- açığı gösteren en küçük Yöntem programı ya da adımlar,
- beklenen ve gözlenen davranış, sürüm numarası (`yontem --surum`).

Bildirimi aldığımızı bir hafta içinde yanıtlamaya, düzeltme yayımlanana kadar ayrıntıları gizli
tutmaya çalışırız. Düzeltme notlarında, isterseniz adınıza yer veririz.

## Kapsam

Özellikle şunlar güvenlik açığı sayılır:

- `Güvenlik` birimindeki bir algoritmanın yanlış sonuç vermesi, doğrulamanın atlatılabilmesi
  (ör. değiştirilmiş verinin `ŞifreÇöz` ya da `BelirteçDoğrula` tarafından kabul edilmesi) ya da
  rastgele değerlerin tahmin edilebilir olması,
- oyun alanında ya da `yontem paketle` ile üretilen uygulamalarda Yöntem programının tarayıcı
  korumalı alanının dışına çıkabilmesi,
- derleyicinin, kaynak koddaki bir metin ya da ad üzerinden üretilen JavaScript/C++ koduna
  istenmeyen kod sızdırması.

Bir Yöntem programının kendi çalıştığı bilgisayarda dosya okuyup yazabilmesi (`Sistem` birimi) ve
o bilgisayarın erişebildiği adreslere, yerel ağ dahil, istek gönderebilmesi (`Ağ` birimi)
beklenen davranıştır; güvenmediğiniz programları çalıştırmayın.

## Bilinen sınırlar

`Güvenlik` birimi bağımsız bir kriptografi denetiminden geçmemiştir ve yan kanal saldırılarına
karşı özel olarak sertleştirilmemiştir. Ayrıntılar README'nin Güvenlik bölümünde ve birimin
kullanım kılavuzundadır.

## Desteklenen sürümler

Güvenlik düzeltmeleri yalnızca en son yayımlanan sürüme yapılır.
