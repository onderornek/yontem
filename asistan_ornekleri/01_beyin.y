program Beyin
{ 1. adım: modelle konuşmak. Ollama'nın çalışıyor olması gerekir (ollama serve). }
kullan Model

değişken
  yanıt: metin

başla
  yanıt := Sor([Mesaj('user', 'Yöntem nedir? Tek cümleyle yanıtla.')])
  yaz(yanıt, 1)

  { Sistem iletisi modelin nasıl davranacağını, önceki iletiler konuşmanın geçmişini verir }
  yanıt := Sor([Mesaj('system', 'Kısa ve Türkçe yanıt ver.'),
                Mesaj('user', 'Adım Deniz.'),
                Mesaj('assistant', 'Merhaba Deniz!'),
                Mesaj('user', 'Adım neydi?')])
  yaz(yanıt, 1)
bitir.
