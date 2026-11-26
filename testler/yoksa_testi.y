program YoksaTesti
{ 'a yoksa b': a'nın değeri; a'daki dizinlemede anahtar ya da sıra yoksa ya da değer boşsa b. b yalnızca
  gerektiğinde hesaplanır. 'yoksa' bağlama duyarlıdır: bir ifadenin ardından aynı satırda gelmezse sıradan addır. }

değişken
  d, iç: sözlük
  L: liste
  x, h: herhangi
  yoksa: tamsayı       { sıradan bir ad olarak }
  sayaç: tamsayı

fonksiyon Varsayılan(v: herhangi): herhangi
başla
  sayaç := sayaç + 1
  dön v
bitir

fonksiyon Port(ayar: sözlük): tamsayı
başla
  dön ayar['port'] yoksa 8080
bitir

fonksiyon Adlar(kişiler: liste): akış
değişken k: sözlük
başla
  kişiler içindeki her k için
    üret k['ad'] yoksa 'adsız'
bitir

başla
  d := ['ad': 'Ayşe', 'yaş': 30, 'not': boş, 'adres': ['şehir': 'İzmir'], 'puanlar': [5, 7]]
  L := [10, 20, 30]

  yaz('— sözlük', 1)
  yaz(d['ad'] yoksa '?', 1)
  yaz(d['soyad'] yoksa '?', 1)
  yaz(d['not'] yoksa 'not yok', 1)
  yaz(d['yaş'] yoksa 0, 1)

  yaz('— iç içe: zincirin her adımı', 1)
  yaz(d['adres']['şehir'] yoksa '-', 1)
  yaz(d['adres']['posta'] yoksa '-', 1)
  yaz(d['iş']['şehir'] yoksa '-', 1)
  yaz(d['puanlar'][1] yoksa 0, 1)
  yaz(d['puanlar'][9] yoksa 0, 1)

  yaz('— liste ve metin', 1)
  yaz(L[0] yoksa -1, 1)
  yaz(L[3] yoksa -1, 1)
  yaz(L[-1] yoksa -1, 1)
  yaz(L[-4] yoksa -1, 1)
  yaz('kalem'[1] yoksa '?', 1)
  yaz('kalem'[6] yoksa '?', 1)
  yaz(boş yoksa 'boş', 1)

  yaz('— sağ yan yalnızca gerektiğinde hesaplanır', 1)
  sayaç := 0
  yaz(d['ad'] yoksa Varsayılan('x'), 1)
  yaz(d['zz'] yoksa Varsayılan('y'), 1)
  yaz('sayaç: ' + sayaç, 1)

  yaz('— zincir ve öncelik', 1)
  yaz(d['a'] yoksa d['b'] yoksa d['ad'] yoksa '?', 1)
  yaz(d['zz'] yoksa 1 + 2, 1)
  yaz((d['yaş'] yoksa 0) + 1, 1)
  yaz(d['zz'] yoksa 0 = 0, 1)
  yaz(eğer (d['zz'] yoksa yanlış) ise 'e' değilse 'h', 1)
  yaz(d.Al('ad', '?') yoksa '!', 1)

  yaz('— fonksiyonda, lambdada, akışta, biçimli metinde', 1)
  yaz(Port(['port': 80]) + ' ' + Port([:]), 1)
  x := fonksiyon(s) => s['n'] yoksa 0
  yaz(x(['n': 4]) + x([:]), 1)
  Adlar([['ad': 'Can'], [:], ['ad': boş]]) içindeki her x için yaz(x, 1)
  yaz($"merhaba {d['ünvan'] yoksa 'efendim'}", 1)
  iç := [:]
  aynı anda [1, 2] içindeki her x için
    yaz(iç[x] yoksa x * 10, 1)

  yaz('— yalnızca eksiklik yakalanır, öteki hatalar yükselir', 1)
  dene
    yaz(L['a'] yoksa 0, 1)
  yakala (h)
    yaz('hata: ' + h.mesaj, 1)
  bitir
  dene
    yaz(d['yaş'][1] yoksa 0, 1)
  yakala (h)
    yaz('hata: ' + h.mesaj, 1)
  bitir
  dene
    yaz(d[Bilinmeyen()] yoksa 0, 1)
  yakala (h)
    yaz('hata: ' + h.mesaj, 1)
  bitir

  yaz('— sıradan ad olarak', 1)
  yoksa := 5
  yaz(yoksa * 2, 1)
  yaz(d['zz'] yoksa yoksa, 1)
bitir.
