program DuyguAnalizi
{ Naif Bayes ile Türkçe duygu analizi ve TF-IDF tabanlı belge benzerliği. }
kullan Dil

değişken
  model: NaifBayes
  metinler, etiketler, testler, vektörler: liste
  m: herhangi
  olas: sözlük

başla
  metinler := ['Bu film harikaydı, çok beğendim',
               'Oyunculuk muhteşem, kesinlikle tavsiye ederim',
               'Harika bir deneyim, yine izlerim',
               'Müzikleri güzel, hikâye etkileyici',
               'Berbat bir filmdi, hiç beğenmedim',
               'Çok sıkıcı, zaman kaybı',
               'Oyunculuk kötü, senaryo berbat',
               'Hayal kırıklığı, tavsiye etmem']
  etiketler := ['olumlu', 'olumlu', 'olumlu', 'olumlu',
                'olumsuz', 'olumsuz', 'olumsuz', 'olumsuz']

  model := NaifBayes.Oluştur
  model.Eğit(metinler, etiketler)

  testler := ['Film muhteşem, beğendim', 'Senaryo çok sıkıcı ve kötü', 'Müzikleri harika']
  testler içindeki her m için
  başla
    olas := model.Olasılıklar(m)
    yaz(Biçimle('"{}" -> {} (olumlu %{:.1})', m, model.Tahmin(m), olas['olumlu'] * 100), 1)
  bitir

  yaz('', 1)
  yaz('Belirteçler : ' + Belirteçle('Yapay zekâ, geleceği şekillendiriyor!'), 1)
  yaz('2-gramlar   : ' + NGramlar(Belirteçle('derin öğrenme ile doğal dil işleme'), 2), 1)

  vektörler := TFIDF(['kedi süt içer', 'kedi fare yakalar', 'borsa bugün yükseldi'])
  yaz(Biçimle('Benzerlik (kedi/kedi) = {:.3}', KosinüsBenzerliği(vektörler[0], vektörler[1])), 1)
  yaz(Biçimle('Benzerlik (kedi/borsa) = {:.3}', KosinüsBenzerliği(vektörler[0], vektörler[2])), 1)
bitir.
