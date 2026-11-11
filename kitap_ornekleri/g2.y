program HavaDanışmanı
kullan Uzman
değişken
  bt: BilgiTabanı
  adım: herhangi
başla
  bt := BilgiTabanı.Oluştur
  bt.KuralEkle('K1', ['bulutlu', 'nem yüksek'], 'yağmur olası', 0.8)
  bt.KuralEkle('K2', ['yağmur olası'], 'şemsiye al', 0.9)
  bt.KuralEkle('K3', ['güneşli', 'sıcak'], 'şapka tak', 1.0)

  bt.OlguEkle('bulutlu')
  bt.OlguEkle('nem yüksek', 0.9)

  bt.İleriZincirle içindeki her adım için
    yaz('Ateşlendi: ' + adım, 1)
  yaz(Biçimle('Şemsiye önerisinin güveni: {:.2}', bt.Güven('şemsiye al')), 1)
  yaz('Neden? ' + bt.Açıkla('şemsiye al'), 1)
  yaz('Şapka gerekli mi? ' + bt.GeriZincirle('şapka tak'), 1)
bitir.
