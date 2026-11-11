program TemelBileşenler
{ Temel Bileşenler Analizi (PCA): veriyi en çok yayıldığı yönlere döndürür.
  1) Veriyi ortala.  2) Kovaryans matrisini kur: C = XᵀX / (n − 1).
  3) C'nin özvektörleri yönleri, özdeğerleri o yöndeki varyansı verir. En büyükleri tutup boyut azaltılır.
  Özvektörü "kuvvet yinelemesi"yle buluyoruz: v ← C·v / ‖C·v‖ işlemi en büyük özvektöre yakınsar. }
kullan YZ, Matematik

değişken
  X, C, v, Cv, v2: tensör
  boy, kilo: ondalık dizisi
  i: tamsayı
  l1, l2: ondalık

başla
  { 8 kişinin boyu (cm) ve kilosu (kg): iki öznitelik güçlü biçimde ilişkili }
  boy := [160, 165, 170, 172, 175, 180, 185, 190]
  kilo := [55, 60, 63, 70, 72, 78, 85, 90]
  X := Tensör([boy, kilo]).T                                   { 8 × 2 matris }
  X := X - X.Ortalama(0)                                        { her sütunu ortala }
  C := X.T @ X / (8 - 1)
  yaz('Kovaryans matrisi:', 1); yaz(C, 1)

  v := Tensör([1.0, 0.0])
  1'den 50'ye kadar her i için
  başla
    Cv := C @ v
    v := Cv / Kök((Cv * Cv).Toplam.Değer)
  bitir
  l1 := (v @ C @ v).Değer
  v2 := Tensör([-v[1], v[0]])            { 2 boyutta ikinci bileşen birinciye diktir }
  l2 := (v2 @ C @ v2).Değer
  yaz(Biçimle('1. bileşen: ({:.3}, {:.3})  varyans {:.1}  → açıklanan oran %{:.1}', v[0], v[1], l1, 100 * l1 / (l1 + l2)), 1)
  yaz(Biçimle('2. bileşen: ({:.3}, {:.3})  varyans {:.1}  → açıklanan oran %{:.1}', v2[0], v2[1], l2, 100 * l2 / (l1 + l2)), 1)
  yaz('Tek boyuta indirgenmiş veri (1. bileşen üzerindeki izdüşüm):', 1)
  yaz(X @ v, 1)
bitir.
