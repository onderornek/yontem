program Selamlayıcı
{ Pencere birimi: bir giriş kutusu, bir düğme ve bir etiket.
  Oyun alanında ya da paketlenmiş uygulamada arayüz gerçekten açılır; komut satırında
  ve testlerde olaylar Gir ve Tıkla ile benzetilir. }
kullan Pencere

değişken adKutusu, selamDüğmesi, sonuç: herhangi

prosedür Selamla
başla
  eğer adKutusu.Metin = '' ise sonuç.Metin := 'Önce adını yaz.'
  değilse sonuç.Metin := 'Merhaba, ' + adKutusu.Metin + '!'
bitir

başla
  Başlık('Selamlayıcı')
  adKutusu := GirişKutusu('Adın')
  selamDüğmesi := Düğme('Selam ver')
  sonuç := Etiket('')
  selamDüğmesi.Tıklanınca(@Selamla)
  Yerleştir(Yatay(adKutusu, selamDüğmesi), sonuç)

  eğer değil Canlı ise
  başla
    Tıkla(selamDüğmesi)
    yaz(sonuç.Metin, 1)
    Gir(adKutusu, 'Zeynep')
    Tıkla(selamDüğmesi)
    yaz(sonuç.Metin, 1)
  bitir
  Çalıştır
bitir.
