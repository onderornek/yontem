program GirişRaporu
{ Üç birim birlikte: bir sunucu günlüğünden başarısız girişler Desen ile ayıklanır,
  Takvim ile zaman farkı hesaplanır, Güvenlik ile e-postalar maskelenir ve rapor imzalanır. }
kullan Desen, Takvim, Güvenlik

sabit
  GÜNLÜK: metin = '2026-11-10 08:59:40 giriş-başarısız ayse@ornek.de' + #10 +
           '2026-11-10 09:00:05 giriş-başarısız ayse@ornek.de' + #10 +
           '2026-11-10 09:00:31 giriş-başarılı mehmet@ornek.de' + #10 +
           '2026-11-10 09:01:02 giriş-başarısız ayse@ornek.de' + #10 +
           '2026-11-10 14:30:00 giriş-başarısız can@ornek.de'
  KALIP: metin = '^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) giriş-başarısız (\S+)$'
  RAPOR_ANAHTARI: metin = 'rapor-imza-anahtari'

değişken
  ilk, son, sayı: sözlük
  g: herhangi
  an: tamsayı
  rapor, kim, satır: metin

başla
  ilk := [:]; son := [:]; sayı := [:]
  Ayır(GÜNLÜK, #10) içindeki her satır için
  başla
    g := Gruplar(satır, KALIP)
    eğer g <> boş ise
    başla
      an := TarihOku(g[1])
      kim := g[2]
      eğer değil sayı.İçerir(kim) ise
      başla
        sayı[kim] := 0
        ilk[kim] := an
      bitir
      sayı[kim] := sayı[kim] + 1
      son[kim] := an
    bitir
  bitir

  rapor := ''
  Sırala(Anahtarlar(sayı)) içindeki her kim için
  başla
    satır := Maskele(kim, 10) + ': ' + sayı[kim] + ' başarısız giriş'
    eğer sayı[kim] >= 3 ise
      satır := satır + ', ' + (son[kim] - ilk[kim]) + ' saniye içinde — ŞÜPHELİ (' + TarihYaz(son[kim], 'SS:DD') + ')'
    yaz(satır, 1)
    rapor := rapor + satır + #10
  bitir
  yaz('Rapor imzası: ' + AltMetin(İmza(RAPOR_ANAHTARI, rapor), 1, 16) + '…', 1)
bitir.
