program Başarılılar
değişken
  notlar: sözlük
  ad: herhangi
başla
  notlar := ['Mert': 65, 'Ayşe': 92, 'Can': 78, 'Defne': 88, 'Bora': 54]
  Sırala(Süz(Anahtarlar(notlar), fonksiyon(a) => notlar[a] > 70)) içindeki her ad için
    yaz(ad + ': ' + notlar[ad], 1)
bitir.
