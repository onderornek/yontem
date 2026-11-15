birim Akış
{ İş akışı: adımları (düğümleri) ve aralarındaki geçişleri (kenarları) bir çizge olarak tanımlar.
  Her düğüm, durumu (bir sözlük) alıp güncellenmiş durumu döndüren bir fonksiyondur.
  Seçmeli kenar, duruma bakıp sıradaki düğümün adını söyleyen bir fonksiyondur; böylece
  dallanma ve döngü kurulabilir. 'SON' adı akışı bitirir. }

arayüz
  sabit SON = 'SON'
  prosedür AkışYeni
  prosedür Düğüm(ad: metin; iş: herhangi)
  prosedür Kenar(kaynak, hedef: metin)
  prosedür SeçmeliKenar(kaynak: metin; seçici: herhangi)
  fonksiyon AkışıÇalıştır(ilk: metin; durum: sözlük; enÇokAdım: tamsayı = 25): sözlük
  fonksiyon Akışİzi: liste

uygulama

değişken
  düğümler, kenarlar, seçiciler: sözlük
  iz: liste

prosedür AkışYeni
başla
  düğümler := [:]
  kenarlar := [:]
  seçiciler := [:]
  iz := []
bitir

prosedür Düğüm(ad: metin; iş: herhangi)
başla
  eğer ad = SON ise fırlat Hata('''SON'' bir düğüm adı olamaz', 'AkışHatası')
  düğümler[ad] := iş
bitir

prosedür Kenar(kaynak, hedef: metin)
başla
  kenarlar[kaynak] := hedef
bitir

prosedür SeçmeliKenar(kaynak: metin; seçici: herhangi)
başla
  seçiciler[kaynak] := seçici
bitir

fonksiyon Akışİzi: liste
başla
  dön iz
bitir

{ 'ilk' düğümden başlar, SON'a varana kadar kenarları izler; son durumu döndürür.
  Adım sayısı 'enÇokAdım'ı geçerse sonsuz döngüye karşı hata verir. }
fonksiyon AkışıÇalıştır(ilk: metin; durum: sözlük; enÇokAdım: tamsayı = 25): sözlük
değişken
  şimdiki: metin
  adım: tamsayı
başla
  şimdiki := ilk
  adım := 0
  iz := []
  şimdiki <> SON iken
  başla
    eğer değil (şimdiki içinde düğümler) ise fırlat Hata('Tanımsız düğüm: ' + şimdiki, 'AkışHatası')
    adım := adım + 1
    eğer adım > enÇokAdım ise fırlat Hata('Akış ' + enÇokAdım + ' adımda bitmedi; döngüyü denetleyin', 'AkışHatası')
    Ekle(iz, şimdiki)
    durum := düğümler[şimdiki](durum)
    eğer şimdiki içinde seçiciler ise şimdiki := seçiciler[şimdiki](durum)
    değilse eğer şimdiki içinde kenarlar ise şimdiki := kenarlar[şimdiki]
    değilse şimdiki := SON
  bitir
  dön durum
bitir

başla
  AkışYeni
bitir.
