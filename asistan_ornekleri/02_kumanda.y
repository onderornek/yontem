program Kumanda
{ 2. adım: tek kumanda. Aynı Sor çağrısı farklı servislerle çalışır; değişen yalnızca ayardır.
  'ollama' Ollama'nın kendi arayüzünü, 'openai' ise OpenAI uyumlu arayüzü kullanır.
  Ollama ikisini de sunar; LM Studio ve llama.cpp gibi araçlar yalnızca ikincisini. }
kullan Model

prosedür Sına(sağlayıcı: metin)
başla
  ModelAyarla(['sağlayıcı': sağlayıcı])
  yaz(sağlayıcı + ' → ' + Sor([Mesaj('user', 'Türkiye''nin başkenti neresi? Tek sözcükle yanıtla.')]), 1)
bitir

başla
  Sına('ollama')
  Sına('openai')

  { Başka bir servise geçmek için adresi, modeli ve gerekiyorsa anahtarı değiştirmek yeter:
    ModelAyarla(['sağlayıcı': 'openai', 'adres': 'http://localhost:1234', 'model': 'modelin-adı']) }

  dene
    ModelAyarla(['model': 'yok'])
    yaz(Sor([Mesaj('user', 'Merhaba')]), 1)
  yakala (h)
    yaz(h.tür + ': ' + h.mesaj, 1)
  bitir
bitir.
