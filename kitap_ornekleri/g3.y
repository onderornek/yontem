program SpamFiltresi
kullan Dil
değişken
  filtre: NaifBayes
  m: herhangi
başla
  filtre := NaifBayes.Oluştur
  filtre.Eğit(
    ['Hemen tıkla, büyük ödül kazandın',
     'Bedava hediye çeki seni bekliyor, tıkla',
     'Son fırsat! Ücretsiz kazan',
     'Yarınki toplantı saat onda',
     'Raporu akşama kadar gönderebilir misin',
     'Toplantı notlarını ekte bulabilirsin'],
    ['spam', 'spam', 'spam', 'normal', 'normal', 'normal'])

  ['Ücretsiz ödül için tıkla', 'Toplantı raporu ekte', 'Bedava hediye kazan'] içindeki her m için
    yaz(m + '  ->  ' + filtre.Tahmin(m), 1)
  yaz('Belirteçler: ' + Belirteçle('Yapay zekâ, dili anlamaya çalışıyor!'), 1)
bitir.
