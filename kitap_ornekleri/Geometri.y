birim Geometri
{ Basit geometri hesapları }

arayüz                                  // dışarıya açılan adlar
  sabit BİRİM_ADI: metin = 'cm'
  fonksiyon DaireAlanı(r: ondalık): ondalık
  fonksiyon DikdörtgenAlanı(en, boy: ondalık): ondalık

uygulama                                // ayrıntılar burada gizli
  kullan Matematik

  değişken çağrıSayısı: tamsayı

  fonksiyon DaireAlanı(r: ondalık): ondalık
  başla
    çağrıSayısı += 1
    dön pi * Üs(r, 2)
  bitir

  fonksiyon DikdörtgenAlanı(en, boy: ondalık): ondalık
  başla
    çağrıSayısı += 1
    dön en * boy
  bitir

başla                                   // birim ilk yüklendiğinde çalışır
  çağrıSayısı := 0
  yaz('[Geometri birimi yüklendi]', 1)
bitir.
