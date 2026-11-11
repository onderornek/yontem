program YolBulma
kullan Arama

değişken
  çizge, yollar: sözlük
  harita: liste
  yol, sonuç2: liste

başla
  çizge := ['Ankara': ['Eskişehir', 'Konya', 'Kayseri'],
            'Eskişehir': ['Bursa', 'İstanbul'],
            'Konya': ['Antalya', 'Mersin'],
            'Kayseri': ['Sivas'],
            'Bursa': ['İzmir'],
            'İstanbul': ['Edirne'],
            'Antalya': ['İzmir']]
  yaz('Genişlik öncelikli Ankara→İzmir: ' + GenişlikÖncelikli(çizge, 'Ankara', 'İzmir'), 1)
  yaz('Derinlik öncelikli Ankara→Mersin: ' + DerinlikÖncelikli(çizge, 'Ankara', 'Mersin'), 1)

  yollar := ['Ankara': ['Eskişehir': 233, 'Konya': 258],
             'Eskişehir': ['Bursa': 151, 'Afyon': 144],
             'Konya': ['Afyon': 224, 'Antalya': 303],
             'Afyon': ['İzmir': 330, 'Antalya': 290],
             'Bursa': ['İzmir': 331]]
  sonuç2 := EnKısaYol(yollar, 'Ankara', 'İzmir')
  yaz('En kısa yol (Dijkstra): ' + sonuç2[0] + ' = ' + sonuç2[1] + ' km', 1)

  harita := ['..........',
             '.####.###.',
             '.#......#.',
             '.#.####.#.',
             '...#..#...',
             '.###..###.',
             '..........']
  yol := AYıldız(harita, [0, 0], [4, 4])
  yaz('A* yolu (' + (Uzunluk(yol) - 1) + ' adım):', 1)
  yaz(IzgaraÇiz(harita, yol), 1)
bitir.
