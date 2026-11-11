program EvrişimliAğ
{ Evrişimli sinir ağı (CNN) iki temel işlem üzerine kurulur:
  1) Evrişim: küçük bir filtre (çekirdek) görüntünün üzerinde kaydırılır; her konumda filtre ile altındaki
     yama çarpılıp toplanır. Aynı filtre her yerde kullanıldığı için desen nerede olursa olsun bulunur.
  2) Havuzlama: harita küçük bloklara bölünür, her bloktan en büyük değer alınır.
  Bölüm A elle seçilmiş bir kenar filtresini uygular. Bölüm B bir filtreyi veriden öğrenir:
  yamaları bir matrisin satırlarına dizersek evrişim tek bir matris çarpımına dönüşür (yama @ filtre). }
kullan YZ

değişken
  resim, harita, havuz, filtre: ondalık dizisi dizisi
  sinyal, hedef, yama: ondalık dizisi
  yamalar: liste
  P, H, w: tensör
  opt: herhangi
  kayıp: tensör
  i, adım: tamsayı

fonksiyon Evrişim(R, F: ondalık dizisi dizisi): ondalık dizisi dizisi
değişken i, j, a, b: tamsayı; satır: ondalık dizisi; t: ondalık
başla
  sonuç := []
  0'dan Uzunluk(R) - Uzunluk(F)'e kadar her i için
  başla
    satır := []
    0'dan Uzunluk(R[0]) - Uzunluk(F[0])'a kadar her j için
    başla
      t := 0
      0'dan Uzunluk(F) - 1'e kadar her a için
        0'dan Uzunluk(F[0]) - 1'e kadar her b için
          t := t + R[i + a][j + b] * F[a][b]
      satır.Ekle(t)
    bitir
    sonuç.Ekle(satır)
  bitir
bitir

fonksiyon Göster(M: ondalık dizisi dizisi)
değişken s: ondalık dizisi
başla
  M içindeki her s için
    yaz('  ' + Birleştir(Eşle(s, fonksiyon(v: ondalık) => Biçimle('{:4.0}', v)), ' '), 1)
bitir

başla
  yaz('--- A) Hazır filtreyle dikey kenar bulma ---', 1)
  { 6×6 gri tonlu resim: solu koyu (0), sağı açık (9) }
  resim := []
  1'den 6'ya kadar her i için resim.Ekle([0, 0, 9, 9, 9, 9])
  filtre := [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]]     { soldan sağa parlaklık artışına tepki verir }
  harita := Evrişim(resim, filtre)
  yaz('Öznitelik haritası (4×4):', 1); Göster(harita)
  { 2×2 en büyük değer havuzlaması }
  havuz := []
  0'dan 1'e kadar her i için
    havuz.Ekle([Maks([harita[2*i][0], harita[2*i][1], harita[2*i+1][0], harita[2*i+1][1]]),
                Maks([harita[2*i][2], harita[2*i][3], harita[2*i+1][2], harita[2*i+1][3]])])
  yaz('Havuzlamadan sonra (2×2):', 1); Göster(havuz)

  yaz('', 1)
  yaz('--- B) Filtreyi veriden öğrenmek ---', 1)
  Tohum(3)
  sinyal := []
  1'den 30'a kadar her i için sinyal.Ekle(Rastgele(10))
  { Gizli kural: hedef = sinyalin [1, -2, 1] filtresiyle evrişimi. Ağ bu filtreyi bilmiyor. }
  hedef := []; yamalar := []
  0'dan Uzunluk(sinyal) - 3'e kadar her i için
  başla
    yama := [sinyal[i], sinyal[i + 1], sinyal[i + 2]]
    yamalar.Ekle(yama)
    hedef.Ekle(1 * yama[0] - 2 * yama[1] + 1 * yama[2])
  bitir
  P := Tensör(yamalar)                        { 28 × 3: her satır bir yama }
  H := Tensör(hedef)
  w := RastgeleTensör(3, boş, 0.5, doğru)     { öğrenilecek filtre }
  opt := Adam([w], 0.1)
  1'den 300'e kadar her adım için
  başla
    opt.SıfırlaGrad
    kayıp := OKH(P @ w, H)
    kayıp.GeriYay
    opt.Adım
    eğer adım = 1 veya adım mod 100 = 0 ise
      yaz(Biçimle('Adım {:3}: kayıp {:9.4}  filtre ({:.3}, {:.3}, {:.3})', adım, kayıp.Değer, w[0], w[1], w[2]), 1)
  bitir
bitir.
