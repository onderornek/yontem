program SuTakibi
{ Mobil birimi: içilen bardak sayısı telefonda saklanır, hedefe ulaşınca telefon titrer
  ve bildirim gösterir. Benzetimde titreşim ve bildirim çıktıya birer satır olarak yazılır. }
kullan Pencere, Mobil

sabit HEDEF: tamsayı = 3

değişken
  bardak: tamsayı
  gösterge, içDüğmesi: herhangi

prosedür Göster
başla
  gösterge.Metin := Metin(bardak) + ' / ' + Metin(HEDEF) + ' bardak'
bitir

prosedür İç
başla
  bardak := bardak + 1
  Sakla('bardak', bardak)          { uygulama kapanıp açılsa da kalır }
  Göster
  eğer bardak = HEDEF ise
  başla
    Titreşim(300)
    Bildirim('Tebrikler', 'Bugünkü su hedefine ulaştın')
  bitir
bitir

başla
  Başlık('Su Takibi')
  bardak := Getir('bardak', 0)     { daha önce saklanmamışsa 0 }
  gösterge := Etiket('')
  içDüğmesi := Düğme('Bir bardak içtim')
  içDüğmesi.Tıklanınca(@İç)
  Yerleştir(gösterge, içDüğmesi)
  Göster

  eğer değil Canlı ise
  başla
    yaz('Platform: ' + Platform + ', ekran ' + EkranGenişliği + '×' + EkranYüksekliği, 1)
    3 kez tekrarla Tıkla(içDüğmesi)
    yaz(gösterge.Metin + ' (saklanan: ' + Getir('bardak', 0) + ')', 1)
  bitir
  Çalıştır
bitir.
