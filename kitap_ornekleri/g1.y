program Labirent
kullan Arama
değişken
  metro: sözlük
  harita, yol: liste
başla
  // Çizge: her durağın komşuları
  metro := ['Taksim': ['Şişhane', 'Osmanbey'],
            'Şişhane': ['Haliç', 'Taksim'],
            'Haliç': ['Vezneciler', 'Şişhane'],
            'Osmanbey': ['Şişli', 'Taksim'],
            'Şişli': ['Gayrettepe'],
            'Vezneciler': ['Yenikapı']]
  yaz('Taksim -> Yenikapı: ' + GenişlikÖncelikli(metro, 'Taksim', 'Yenikapı'), 2)

  // A*: '#' duvar, '.' yol
  harita := ['.....#....',
             '.###.#.##.',
             '...#...#..',
             '##.#####.#',
             '..........']
  yol := AYıldız(harita, [0, 0], [0, 9])
  yaz('A* ile ' + (Uzunluk(yol) - 1) + ' adımda:', 1)
  yaz(IzgaraÇiz(harita, yol), 1)
bitir.
