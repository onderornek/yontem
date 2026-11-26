program MetinTesti
// Çok satırlı metin, biçimli metin ve Biçimle hizalaması.
değişken ad: metin
  n: tamsayı
  fiyat: ondalık
  istem: metin
  L: liste

başla
  ad := 'Ayşe'
  n := 3
  fiyat := 12.5
  L := [1, 'iki', 3.0]

  // biçimli metin
  yaz($'Merhaba {ad}, {n} mesajın var', 1)
  yaz($'Toplam: {fiyat * n:.2} TL', 1)
  yaz($'[{ad:<6}] [{ad:>6}] [{n:^5}] [{fiyat:8.3}]', 1)
  yaz($'{{ayraç}} ve {Uzunluk(ad)} harf; {BüyükHarf(''x'') + "y"}', 1)
  yaz($"Sekme:\t{L}", 1)
  yaz($'{n > 2} {boş} {[n, n * 2]}', 1)
  yaz($'', 1)
  yaz(Uzunluk($'{ad}{ad}'), 1)

  // çok satırlı metin: ilk ve son boş satır atılır, ortak girinti silinir, kaçış yoktur
  istem := """
    Sen yardımsever bir asistansın.
      - Kısa yanıt ver.

    Kullanıcı: {ad} \n
    """
  yaz(istem, 1)
  yaz(Uzunluk(Ayır(istem, #10)), 1)
  yaz("""tek satır""", 1)
  yaz($"""
    Sevgili {ad},
      {n} yeni mesaj.
    """, 1)

  // Biçimle: hizalama ve anlaşılır hata
  yaz('[' + Biçimle('{:<6}|{:>6}|{:^7}|{:8.2}|{:<8.3}', 'ab', 'çğ', 'x', 3.14159, 2) + ']', 1)
  dene
    yaz(Biçimle('{:>3x}', 5), 1)
  yakala (h)
    yaz(h.mesaj, 1)
  bitir
bitir.
