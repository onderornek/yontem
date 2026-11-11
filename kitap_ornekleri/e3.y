program Kalıtım
tip
  Hayvan = sınıf
    ad: metin
    kurucu Oluştur(a: metin)
    başla
      ad := a
    bitir
    fonksiyon Ses: metin; sanal
    başla
      dön '...'
    bitir
    fonksiyon Tanıt: metin
    başla
      dön ad + ' der ki: ' + Ses
    bitir
  bitir

  Kedi = sınıf(Hayvan)
    fonksiyon Ses: metin; ezer
    başla dön 'Miyav'; bitir
  bitir

  Köpek = sınıf(Hayvan)
    cins: metin
    kurucu Oluştur(a, c: metin)
    başla
      miras Oluştur(a)            // ebeveynin kurucusunu çağır
      cins := c
    bitir
    fonksiyon Ses: metin; ezer
    başla dön 'Hav hav'; bitir
    fonksiyon Tanıt: metin; ezer
    başla dön miras Tanıt + ' (' + cins + ')'; bitir
  bitir

değişken
  hayvanlar: liste
  h: Hayvan
başla
  hayvanlar := [Kedi.Oluştur('Tekir'), Köpek.Oluştur('Karabaş', 'Kangal'), Hayvan.Oluştur('Balık')]
  hayvanlar içindeki her h için
    yaz(h.Tanıt, 1)
  yaz('Karabaş bir Hayvan mı? ' + ÖrneğiMi(hayvanlar[1], Hayvan), 1)
  yaz('Tekir bir Köpek mi?    ' + ÖrneğiMi(hayvanlar[0], Köpek), 1)
bitir.
