program Ayarlar
{ Onay kutusu ve kaydırıcı: bir ayar diğerini açıp kapatır, kaydırıcı değeri canlı gösterilir. }
kullan Pencere

değişken
  bildirimler, sessiz: herhangi
  ses: herhangi
  sesEtiketi, özet: herhangi

prosedür Yenile
başla
  sessiz.Etkin := bildirimler.İşaretli
  ses.Görünür := bildirimler.İşaretli ve değil sessiz.İşaretli
  sesEtiketi.Metin := 'Ses düzeyi: ' + Metin(ses.Değer) + '%'
  eğer değil bildirimler.İşaretli ise özet.Metin := 'Bildirimler kapalı'
  değilse eğer sessiz.İşaretli ise özet.Metin := 'Sessiz bildirim'
  değilse özet.Metin := 'Sesli bildirim, düzey ' + Metin(ses.Değer)
bitir

başla
  Başlık('Ayarlar')
  bildirimler := OnayKutusu('Bildirimleri göster', doğru)
  sessiz := OnayKutusu('Sessiz')
  ses := Kaydırıcı(0, 100, 60)
  sesEtiketi := Etiket()
  özet := Etiket()
  bildirimler.Değişince(@Yenile); sessiz.Değişince(@Yenile); ses.Değişince(@Yenile)
  Yerleştir(bildirimler, sessiz, sesEtiketi, ses, özet)
  Yenile

  eğer değil Canlı ise
  başla
    yaz(özet.Metin, 1)
    Seç(ses, 150); yaz(özet.Metin, 1)
    Seç(sessiz, doğru); yaz(özet.Metin, 1)
    Seç(bildirimler, yanlış); yaz(özet.Metin, 1)
    Seç(sessiz, yanlış)                { devre dışı kutu değişmez }
    yaz('Sessiz hâlâ: ' + Metin(sessiz.İşaretli), 1)
  bitir
  Çalıştır
bitir.
