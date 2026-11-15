#!/usr/bin/env node
// Sınama için sahte model servisi. Gerçek bir dil modeli DEĞİLDİR: Ollama'nın ve OpenAI uyumlu servislerin
// arayüzünü taklit eder, böylece asistan_ornekleri/ programları model indirmeden sınanabilir.
//   node js/betikler/sahte_ollama.js [kapı]        (varsayılan 11434)
// Sohbet yanıtları asistan_ornekleri/sinama/yanitlar.json dosyasındaki kayıtlardan gelir: kullanıcı
// iletilerinde 'içerir' metni geçen ilk kaydın yanıtı döner; kayıtta birden çok yanıt varsa sırayla verilir.
// Gömme vektörleri sözcüklerin ilk beş harfinden hesaplanır: ortak sözcüğü olan metinler birbirine yakın düşer.
const http = require('http');
const fs = require('fs');
const path = require('path');

const KAYITLAR = path.resolve(__dirname, '..', '..', 'asistan_ornekleri', 'sinama', 'yanitlar.json');
const BOYUT = 64;

function gom(metin) {
  const v = new Array(BOYUT).fill(0);
  for (const s of String(metin).toLocaleLowerCase('tr').match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (s.length < 3) continue;
    let h = 7;
    for (const c of s.slice(0, 5)) h = (h * 31 + c.codePointAt(0)) % 1000003;
    v[h % BOYUT] += 1;
  }
  return v;
}

function olustur() {
  const kayitlar = JSON.parse(fs.readFileSync(KAYITLAR, 'utf-8'));
  const sira = new Map();
  const istekler = [];
  const yanitla = (mesajlar, semali) => {
    const son = mesajlar.filter(m => m.role === 'user').map(m => m.content).join('\n');
    const k = kayitlar.find(k => son.includes(k['içerir']) && (k['şemalı'] === undefined || k['şemalı'] === semali));
    if (!k) return 'Sınama modeli: «' + son.split('\n').pop() + '» için kayıtlı yanıt yok.';
    const liste = k['yanıtlar'] ?? [k['yanıt']];
    const i = sira.get(k) ?? 0;
    sira.set(k, i + 1);
    const y = liste[Math.min(i, liste.length - 1)];
    return typeof y === 'string' ? y : JSON.stringify(y);
  };
  const sunucu = http.createServer((istek, yanit) => {
    const parcalar = [];
    istek.on('data', p => parcalar.push(p));
    istek.on('end', () => {
      const gonder = (durum, veri) => { yanit.writeHead(durum, { 'Content-Type': 'application/json; charset=utf-8' }); yanit.end(JSON.stringify(veri)); };
      let g = {};
      try { g = JSON.parse(Buffer.concat(parcalar).toString('utf-8') || '{}'); } catch { return gonder(400, { error: 'invalid json' }); }
      istekler.push({ yol: istek.url, govde: g, yetki: istek.headers.authorization ?? '' });
      if (istek.method !== 'POST') return gonder(405, { error: 'method not allowed' });
      if (g.model === 'yok') return gonder(404, { error: 'model "yok" not found, try pulling it first' });
      const girdiler = Array.isArray(g.input) ? g.input : [g.input];
      switch (istek.url) {
        case '/api/chat':
          return gonder(200, { model: g.model, created_at: '2026-01-01T00:00:00Z', message: { role: 'assistant', content: yanitla(g.messages ?? [], g.format !== undefined) }, done: true, done_reason: 'stop' });
        case '/api/embed':
          return gonder(200, { model: g.model, embeddings: girdiler.map(gom) });
        case '/v1/chat/completions':
          return gonder(200, { id: 'sinama', object: 'chat.completion', model: g.model, choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: yanitla(g.messages ?? [], g.response_format !== undefined) } }] });
        case '/v1/embeddings':
          return gonder(200, { object: 'list', model: g.model, data: girdiler.map((m, i) => ({ object: 'embedding', index: i, embedding: gom(m) })) });
      }
      gonder(404, { error: 'not found' });
    });
  });
  sunucu.istekler = istekler;
  return sunucu;
}

module.exports = { olustur };

if (require.main === module) {
  const kapi = Number(process.argv[2] ?? 11434);
  olustur().listen(kapi, '127.0.0.1', () => console.log(`Sahte model servisi http://127.0.0.1:${kapi} adresinde (gerçek model değildir). Durdurmak için Ctrl+C.`));
}
