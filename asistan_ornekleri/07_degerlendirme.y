program Değerlendirme
{ 8. adım: modeli bir soru setiyle ölçmek. Sorular 'aynı anda' döngüsüyle birlikte sorulur:
  istekler turlar halinde paralel gider, sonuçların sırası her çalıştırmada aynıdır. }
kullan Model

değişken
  vakalar, sonuçlar: liste
  vaka: sözlük
  puan, i: tamsayı

{ Yanıt beklenen sözcüğü içeriyorsa tutmuş sayılır (büyük/küçük harf ayırt edilmez) }
fonksiyon Puanla(yanıt, beklenen: metin): mantıksal
başla
  dön KüçükHarf(beklenen) içinde KüçükHarf(yanıt)
bitir

başla
  vakalar := [
    ['soru': 'Türkiye''nin başkenti neresi?', 'beklenen': 'Ankara'],
    ['soru': 'Bir haftada kaç gün var?', 'beklenen': 'yedi'],
    ['soru': 'Suyun kimyasal formülü nedir?', 'beklenen': 'H2O'],
    ['soru': 'Güneş sistemindeki en büyük gezegen hangisi?', 'beklenen': 'Jüpiter'],
    ['soru': 'İstanbul hangi iki kıtadadır?', 'beklenen': 'Asya'],
    ['soru': 'Bir yılda kaç ay var?', 'beklenen': 'on iki']
  ]

  sonuçlar := []
  aynı anda en çok 4 vakalar içindeki her i, vaka için
  başla
    değişken yanıt := Sor([Mesaj('system', 'Kısa ve Türkçe yanıt ver.'), Mesaj('user', vaka['soru'])])
    Ekle(sonuçlar, ['no': i, 'yanıt': yanıt, 'tuttu': Puanla(yanıt, vaka['beklenen'])])
  bitir

  puan := 0
  Sırala(sonuçlar, fonksiyon(s) => s['no']) içindeki her vaka için
  başla
    eğer vaka['tuttu'] ise puan := puan + 1
    yaz((eğer vaka['tuttu'] ise '✓ ' değilse '✗ ') + vakalar[vaka['no']]['soru'] + ' → ' + vaka['yanıt'], 1)
  bitir
  yaz('', 1)
  yaz('Doğru: ' + puan + '/' + Uzunluk(vakalar), 1)
bitir.
