program Sözlükler
değişken
  başkent: sözlük
  ülke, şehir: herhangi
  sayım: sözlük
başla
  başkent := ['Türkiye': 'Ankara', 'Fransa': 'Paris', 'Japonya': 'Tokyo']
  başkent['Mısır'] := 'Kahire'               // yeni anahtar ekle
  yaz('Fransa''nın başkenti: ' + başkent['Fransa'], 1)
  yaz('Ülke sayısı: ' + Uzunluk(başkent), 1)
  başkent içindeki her ülke, şehir için
    yaz('  ' + ülke + ' -> ' + şehir, 1)
  yaz('İtalya kayıtlı mı? ' + ('İtalya' içinde başkent), 1)
  yaz('Varsayılanla al: ' + başkent.Al('İtalya', 'bilinmiyor'), 1)

  sayım := Say(Ayır('bir iki bir üç iki bir'))
  yaz('Sözcük sayıları: ' + sayım, 1)
bitir.
