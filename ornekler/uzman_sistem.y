program BitkiTeşhisi
{ Kural tabanlı bir uzman sistemle bitki hastalığı teşhisi. }
kullan Uzman

değişken
  bt: BilgiTabanı
  adım: herhangi

başla
  bt := BilgiTabanı.Oluştur
  bt.KuralEkle('K1', ['yapraklar sarı', 'toprak ıslak'], 'aşırı sulama', 0.8)
  bt.KuralEkle('K2', ['aşırı sulama', 'kök kahverengi'], 'kök çürüklüğü', 0.9)
  bt.KuralEkle('K3', ['yapraklarda beyaz toz'], 'külleme', 0.95)
  bt.KuralEkle('K4', ['kök çürüklüğü'], 'öneri: sulamayı azalt, saksıyı değiştir', 1.0)
  bt.KuralEkle('K5', ['külleme'], 'öneri: kükürtlü ilaç uygula', 1.0)

  bt.OlguEkle('yapraklar sarı')
  bt.OlguEkle('toprak ıslak', 0.9)
  bt.OlguEkle('kök kahverengi')

  yaz('İleri zincirleme:', 1)
  bt.İleriZincirle içindeki her adım için
    yaz('  ' + adım, 1)

  yaz(Biçimle('Kök çürüklüğü güveni: {:.2}', bt.Güven('kök çürüklüğü')), 1)
  yaz('Açıklama: ' + bt.Açıkla('kök çürüklüğü'), 1)
  yaz('Külleme var mı (geri zincirleme)? ' + bt.GeriZincirle('külleme'), 1)
bitir.
