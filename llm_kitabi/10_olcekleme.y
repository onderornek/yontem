program Ölçekleme
{ Küçük GPT'mizle büyük modeller arasındaki fark mimaride değil, sayılardadır.
  Bu program GPT-2 ailesinin parametre sayılarını aynı formülle hesaplar ve
  eğitim için gereken hesap miktarını kabaca tahmin eder.

  Bir GPT-2 katmanının parametreleri (D: boyut):
     dikkat         : 4·D·D + 4·D        (Q, K, V ve çıkış matrisleri, sapmalarıyla)
     ileri besleme  : 8·D·D + 5·D        (D → 4D → D, sapmalarıyla)
     normalleştirme : 4·D                (iki katman normalleştirme)
  Bunlara karakter/simge gömmesi (V·D), konum gömmesi (T·D) ve son normalleştirme (2·D)
  eklenir. GPT-2, çıkış katmanında gömme matrisini yeniden kullanır; bu yüzden ayrı
  bir çıkış matrisi yoktur.
  Eğitim hesabı için yaygın bir kestirim: işlenen her simge başına 6·N kayan nokta işlemi
  (N: parametre sayısı; 2·N ileri, 4·N geri yayılım). }

kullan Matematik

değişken
  adlar: metin dizisi
  boyutlar, katmanlar: tamsayı dizisi
  i: tamsayı
  N, simge: ondalık

fonksiyon ParametreSayısı(V, T, D, L: tamsayı): ondalık
başla
  dön L * (12.0 * D * D + 13.0 * D) + V * D + T * D + 2.0 * D
bitir

fonksiyon Bilimsel(x: ondalık): metin
{ 63770112000 → '6.4 × 10^10' }
değişken üs: tamsayı
başla
  üs := Kes(Ln(x) / Ln(10))
  dön Biçimle('{:.1} × 10^{}', x / (10.0 ** üs), üs)
bitir

fonksiyon Sola(s: metin; n: tamsayı): metin
başla
  sonuç := s
  Uzunluk(sonuç) < n iken sonuç := sonuç + ' '
bitir

başla
  adlar := ['GPT-2 küçük', 'GPT-2 orta', 'GPT-2 büyük', 'GPT-2 XL']
  boyutlar := [768, 1024, 1280, 1600]
  katmanlar := [12, 24, 36, 48]
  yaz('Model           boyut  katman   parametre', 1)
  0'dan 3'e kadar her i için
    yaz(Sola(adlar[i], 14) + Biçimle('  {:5}  {:6}  {:10.1} milyon', boyutlar[i], katmanlar[i],
      ParametreSayısı(50257, 1024, boyutlar[i], katmanlar[i]) / 1000000), 1)

  yaz('', 1)
  N := 27678
  simge := 3000.0 * 8 * 16
  yaz(Biçimle('Küçük GPT: {:.0} parametre, eğitimde {:.0} karakter işlendi', N, simge), 1)
  yaz('  eğitim hesabı ≈ 6 · N · simge = ' + Bilimsel(6 * N * simge) + ' işlem', 1)
  N := ParametreSayısı(50257, 1024, 768, 12)
  simge := 20 * N
  yaz('GPT-2 küçük, parametre başına 20 simgeyle eğitilseydi:', 1)
  yaz('  ' + Bilimsel(simge) + ' simge, ' + Bilimsel(6 * N * simge) + ' işlem', 1)
  yaz(Biçimle('  Küçük GPT modelinden {:.0} kat fazla hesap', (6 * N * simge) / (6 * 27678 * 3000.0 * 8 * 16)), 1)
bitir.
