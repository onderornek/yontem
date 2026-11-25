program SınaTesti
// 'sına' blokları: 'yontem sına' her bloğu taze bir çalışmada ayrı ayrı yürütür; normal çalışmada
// yalnızca ana blok çalışır. Üçüncü blok raporun biçimini sınamak için bilerek kalır.
değişken sayaç: tamsayı

fonksiyon Bölme(a, b: tamsayı): tamsayı
başla
  sonuç := a bol b
bitir

sabit BEKLENEN: tamsayı = 3   // bildirim bölümünün hemen ardından gelen 'sına' bloğu

sına 'bölme doğru sonuç verir'
başla
  İddia(Bölme(10, 3) = BEKLENEN, 'tamsayı bölme')
  sayaç := sayaç + 1
  İddia(sayaç = 1, 'her blok taze başlar')
bitir

sına 'sıfıra bölme hata verir'
değişken hata: mantıksal
başla
  sayaç := sayaç + 1
  İddia(sayaç = 1, 'her blok taze başlar')
  dene
    Bölme(1, 0)
  yakala (h)
    hata := doğru
  bitir
  İddia(hata, 'hata bekleniyordu')
bitir

sına 'yakalanmamış hata da bloğu düşürür ama sonrakiler çalışır'
başla
  yaz(Bölme(1, 0), 1)
bitir

sına 'bilerek kalan blok'
başla
  yaz('ara çıktı', 1)
  yaz($'sayaç = {sayaç}', 1)
  İddia(Bölme(7, 2) = 4, '7 böl 2 dört değil')
bitir

sına 'son blok yine çalışır'
başla
  İddia(Bölme(9, 3) = 3)
bitir

başla
  yaz($'Ana program: {Bölme(9, 3)}', 1)
bitir.
