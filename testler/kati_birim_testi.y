program KatıBirimTesti
{$katı}
{ Katı kip yerleşik birimlerin işlevlerinin dönüş tiplerini bilir. Bu program her birini o tipte bir
  değişkene atar: tablo yanlışsa atama çalışırken hata verir. (Ağ istekleri burada çağrılmaz.) }
kullan Takvim, Desen, Güvenlik, Ağ

değişken
  t: tamsayı
  o: ondalık
  m: metin
  b: mantıksal
  l: liste
  s: sözlük
  anahtar, parola, şifreli: metin

başla
  Takvim.BenzetimZamanı(TarihYap(2026, 11, 10, 19, 30, 0), 180)
  t := Şimdi + YerelFark + TarihYap(2026, 1, 2) + TarihOku('2026-10-29') + SaniyeEkle(Şimdi, 5) + GünEkle(Şimdi, 1)
  t := t + AyEkle(Şimdi, 1) + YılEkle(Şimdi, 1) + GünFarkı(Şimdi, Şimdi) + GünBaşı(Şimdi) + HaftaGünü(Şimdi) + HaftaNo(Şimdi)
  t := AydakiGünSayısı(2028, 2) + Takvim.HaftaNo(Takvim.Şimdi)
  m := TarihYaz(Şimdi) + GünAdı(Şimdi) + AyAdı(11)
  b := ArtıkYıl(2028) ve GeçerliTarih(2026, 2, 28)
  s := Parçala(Şimdi)
  yaz(Metin(t) + ' ' + m + ' ' + Metin(b) + ' ' + s['yıl'], 1)

  b := Eşleşir('34 ABC 123', '\d{2} [A-Z]{1,3} \d{2,4}') ve TamEşleşir('34 ABC 123', '\d{2} [A-Z]{1,3} \d{2,4}') ve DesenGeçerli('(a|b)')
  l := BulHepsi('a1b22', '\d+') + TümGruplar('a1b2', '([a-z])(\d)') + DesenAyır('a,b', ',')
  m := DesenDeğiştir('a1', '\d', 'x') + DesenKaçış('1+1')
  yaz(Metin(b) + ' ' + Uzunluk(l) + ' ' + m, 1)

  Güvenlik.BenzetimZamanı(1000)
  anahtar := ParoladanAnahtar('uzun bir parola cümlesi', 'uygulama-tuzu', 1000)
  parola := ParolaÖzeti('Gizli-Parola-42', 1000)
  şifreli := Şifrele(anahtar, 'gizli')
  m := Özet('a') + İmza('k', 'ileti') + Base64Kodla('a') + Base64Çöz(Base64Kodla('a')) + ŞifreÇöz(anahtar, şifreli)
  m := m + HtmlKaçış('<b>') + SqlMetni('ayşe') + DosyaAdıTemizle('a/b.txt') + Maskele('4111111111111111')
  m := Tuz + Belirteç + Kimlik + AnahtarÜret + BelirteçÜret('gizli', 'kullanıcı=ayşe', 300)
  b := İmzaDoğru('k', 'ileti', İmza('k', 'ileti')) ve GüvenliEşit('abc', 'abc') ve ParolaDoğrula('Gizli-Parola-42', parola)
  b := b ve YolGüvenli('a/b.txt') ve EpostaGeçerli('a@b.co') ve UrlGüvenli('https://ornek.org') ve İzinliKarakterler('abc', 'abc')
  b := b ve değil YenidenÖzetlenmeli(parola, 1000)
  t := GüvenliRastgele(5, 5) + ParolaGücü('abc')
  o := Güvenlik.Zaman
  l := ParolaSorunları('abc') + GünlükKayıtları
  yaz(Metin(b) + ' ' + t + ' ' + Metin(Uzunluk(l) > 0), 1)

  m := UrlKodla('a b') + UrlÇöz('a%20b') + SorguYap(['a': 1])
  yaz(m, 1)
bitir.
