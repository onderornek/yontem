birim Model
{ Dil modeline tek kapı: programın geri kalanı hangi servisin kullanıldığını bilmez.
  İki sağlayıcı tanır:
    'ollama'  Ollama'nın kendi arayüzü           (/api/chat, /api/embed)
    'openai'  OpenAI uyumlu her servis           (/v1/chat/completions, /v1/embeddings)
  Ayarlar ortam değişkenlerinden okunur; ModelAyarla ile programdan da değiştirilebilir. }
kullan Ağ, Veri, Sistem

arayüz
  prosedür ModelAyarla(yeni: sözlük)
  fonksiyon ModelAyarı(ad: metin): herhangi
  fonksiyon Mesaj(rol, içerik: metin): sözlük
  fonksiyon Sor(mesajlar: liste; şema: herhangi = boş): metin
  fonksiyon Göm(metinler: liste): liste

uygulama

değişken
  ayar: sözlük

prosedür ModelAyarla(yeni: sözlük)
değişken ad: metin
başla
  Anahtarlar(yeni) içindeki her ad için
  başla
    eğer değil (ad içinde ayar) ise fırlat Hata('Bilinmeyen model ayarı: ' + ad, 'ModelHatası')
    ayar[ad] := yeni[ad]
  bitir
bitir

fonksiyon ModelAyarı(ad: metin): herhangi
başla
  dön ayar[ad]
bitir

fonksiyon Mesaj(rol, içerik: metin): sözlük
başla
  dön ['role': rol, 'content': içerik]
bitir

{ İsteği gönderir, yanıtı JSON olarak çözer. Ulaşılamayan servis ve 200 dışındaki durumlar ModelHatası olur. }
fonksiyon Gönder(yol: metin; gövde: sözlük): herhangi
değişken
  başlıklar, yanıt: sözlük
başla
  başlıklar := ['Content-Type': 'application/json']
  eğer ayar['anahtar'] <> '' ise başlıklar['Authorization'] := 'Bearer ' + ayar['anahtar']
  dene
    yanıt := HttpGönder(ayar['adres'] + yol, JSONYap(gövde), başlıklar, ayar['süre'])
  yakala (h)
    fırlat Hata('Model servisine ulaşılamadı (' + ayar['adres'] + '). Servis çalışıyor mu? Ayrıntı: ' + h.mesaj, 'ModelHatası')
  bitir
  eğer yanıt['durum'] <> 200 ise
    fırlat Hata('Model servisi ' + yanıt['durum'] + ' döndürdü: ' + Kırp(yanıt['gövde']), 'ModelHatası')
  dön JSONÇöz(yanıt['gövde'])
bitir

{ Sohbet isteği. 'şema' verilirse (JSON Şeması) yanıt o şemaya uyan bir JSON metni olur. }
fonksiyon Sor(mesajlar: liste; şema: herhangi = boş): metin
değişken
  gövde: sözlük
  veri: herhangi
başla
  eğer ayar['sağlayıcı'] = 'ollama' ise
  başla
    gövde := ['model': ayar['model'], 'messages': mesajlar, 'stream': yanlış,
              'options': ['temperature': ayar['sıcaklık']]]
    eğer şema <> boş ise gövde['format'] := şema
    veri := Gönder('/api/chat', gövde)
    dön veri['message']['content']
  bitir
  gövde := ['model': ayar['model'], 'messages': mesajlar, 'stream': yanlış, 'temperature': ayar['sıcaklık']]
  eğer şema <> boş ise
    gövde['response_format'] := ['type': 'json_schema', 'json_schema': ['name': 'yanit', 'schema': şema]]
  veri := Gönder('/v1/chat/completions', gövde)
  dön veri['choices'][0]['message']['content']
bitir

{ Her metin için bir gömme vektörü (ondalık listesi) döndürür. }
fonksiyon Göm(metinler: liste): liste
değişken
  veri: herhangi
  satır: herhangi
  vektörler: liste
başla
  eğer ayar['sağlayıcı'] = 'ollama' ise
  başla
    veri := Gönder('/api/embed', ['model': ayar['gömme'], 'input': metinler])
    dön veri['embeddings']
  bitir
  veri := Gönder('/v1/embeddings', ['model': ayar['gömme'], 'input': metinler])
  vektörler := []
  veri['data'] içindeki her satır için Ekle(vektörler, satır['embedding'])
  dön vektörler
bitir

başla
  ayar := ['sağlayıcı': Ortam('YONTEM_MODEL_SAGLAYICI', 'ollama'),
           'adres': Ortam('YONTEM_MODEL_ADRESI', 'http://localhost:11434'),
           'model': Ortam('YONTEM_MODEL', 'gemma4:e2b'),
           'gömme': Ortam('YONTEM_GOMME_MODELI', 'embeddinggemma'),
           'anahtar': Ortam('YONTEM_MODEL_ANAHTARI', ''),
           'sıcaklık': 0,
           'süre': 300]
bitir.
