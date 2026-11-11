program Zamanlayıcı
{ Periyodik zamanlayıcı her 250 ms'de bir tik sayar; tek seferlik zamanlayıcı 1 saniye sonra
  periyodik olanı durdurur. Zamanlayıcı prosedürleri ana programdan ayrı bir görevde çalışır. }
kullan Donanım

değişken
  tik: tamsayı
  kimlik: tamsayı

prosedür TikSay
başla
  tik := tik + 1
  yaz(Biçimle('[{:4} ms] tik {}', Milisaniye, tik), 1)
bitir

prosedür Kapat
başla
  ZamanlayıcıDurdur(kimlik)
  yaz(Biçimle('[{:4} ms] periyodik zamanlayıcı durduruldu', Milisaniye), 1)
bitir

başla
  kimlik := ZamanlayıcıKur(250, @TikSay)
  ZamanlayıcıTek(1000, @Kapat)
  Bekle(1600)
  yaz('Toplam tik: ' + tik, 1)
bitir.
