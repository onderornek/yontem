#!/usr/bin/env node
// Oyun alanı sayfasını üretir: oyun_alani/sablon.html + tarayıcı paketi + örnekler → oyun_alani/index.html
const fs = require('fs');
const path = require('path');
const KOK = path.resolve(__dirname, '..', '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf-8');
const var_ = (p) => fs.existsSync(path.join(KOK, p));

function baslik(kaynak, dosya) {
  const m = /^\s*program\s+([^\s;]+)/im.exec(kaynak);
  const ad = m ? m[1] : dosya.replace(/\.y$/, '');
  return ad.replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2').replace(/(\p{L})(\d)/gu, '$1 $2');
}
function ornek(grup, dosya, ad, ek = {}) {
  const kaynak = oku(dosya);
  const girdiYolu = dosya.replace(/\.y$/, '.girdi');
  return { grup, ad, baslik: ek.baslik || baslik(kaynak, ad), kaynak, girdi: var_(girdiYolu) ? oku(girdiYolu) : '', birimler: ek.birimler || {} };
}
const liste = [ornek('Başlangıç', 'oyun_alani/hosgeldiniz.y', 'hosgeldiniz.y', { baslik: 'Hoş Geldiniz' })];
for (const f of fs.readdirSync(path.join(KOK, 'arayuz_ornekleri')).filter(f => /^0[1-6]_.*\.y$/.test(f)).sort())
  liste.push(ornek('Arayüz ve mobil uygulamalar', `arayuz_ornekleri/${f}`, f));
for (const f of fs.readdirSync(path.join(KOK, 'guvenlik_ornekleri')).filter(f => /^0[1-6]_.*\.y$/.test(f)).sort())
  liste.push(ornek('Güvenlik', `guvenlik_ornekleri/${f}`, f));
const kitap = fs.readdirSync(path.join(KOK, 'kitap_ornekleri')).filter(f => f.endsWith('.y') && f !== 'Geometri.y');
const sira = (f) => f === 'ilk.y' ? '0' : f;
for (const f of kitap.filter(f => !f.startsWith('cozum_')).sort((a, b) => sira(a).localeCompare(sira(b)))) {
  const ek = f === 'birim_ana.y' ? { birimler: { Geometri: oku('kitap_ornekleri/Geometri.y') }, baslik: 'Birim Kullanımı (Geometri)' } : {};
  liste.push(ornek('Kitaptaki örnekler', `kitap_ornekleri/${f}`, f, ek));
}
for (const f of kitap.filter(f => f.startsWith('cozum_')).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }))) {
  const no = /cozum_c(\d+)_(\d+)/.exec(f);
  const o = ornek('Alıştırma çözümleri', `kitap_ornekleri/${f}`, f);
  if (no) o.baslik = `${no[1]}.${no[2]} · ${o.baslik}`;
  liste.push(o);
}
const gomuluBas = { 'yanip_sonen_led.y': 1, 'dugme_kesmesi.y': 2, 'zamanlayici.y': 3, 'i2c_sicaklik.y': 4, 'seri_konsol.y': 5, 'xor_egit.y': 6, 'xor_cikarim.y': 7 };
for (const f of fs.readdirSync(path.join(KOK, 'gomulu_ornekler')).filter(f => gomuluBas[f]).sort((a, b) => gomuluBas[a] - gomuluBas[b])) {
  const ek = f === 'xor_cikarim.y' ? { birimler: { XorModeli: oku('gomulu_ornekler/XorModeli.y') } } : {};
  liste.push(ornek('Gömülü (ESP32) örnekleri', `gomulu_ornekler/${f}`, f, ek));
}
for (const f of fs.readdirSync(path.join(KOK, 'ml_kilavuz')).filter(f => /^\d\d_.*\.y$/.test(f)).sort()) {
  const o = ornek('Makine öğrenmesi kılavuzu', `ml_kilavuz/${f}`, f);
  o.baslik = `${Number(f.slice(0, 2))}. ${o.baslik}`;
  liste.push(o);
}
const llmBirim = {};
for (const b of ['Atasozleri', 'DilAraclari', 'KucukGPT']) llmBirim[b] = oku(`llm_kitabi/${b}.y`);
for (const f of fs.readdirSync(path.join(KOK, 'llm_kitabi')).filter(f => /^\d\d_.*\.y$/.test(f)).sort()) {
  const o = ornek('Dil modeli kitabı', `llm_kitabi/${f}`, f, { birimler: llmBirim });
  o.baslik = `${Number(f.slice(0, 2))}. ${o.baslik}`;
  liste.push(o);
}
for (const f of fs.readdirSync(path.join(KOK, 'mesale_ornekleri')).filter(f => f.endsWith('.y')).sort())
  liste.push(ornek('Meşale (PyTorch benzeri) örnekleri', `mesale_ornekleri/${f}`, f));
for (const f of fs.readdirSync(path.join(KOK, 'ornekler')).filter(f => f.endsWith('.y')).sort())
  liste.push(ornek('Gösterim programları', `ornekler/${f}`, f));

const motor = fs.readFileSync(path.join(KOK, 'js', 'dist', 'yontem-tarayici.js'), 'utf-8').replace(/<\/script/gi, '<\\/script');
const json = JSON.stringify(liste).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
let html = oku('oyun_alani/sablon.html');
html = html.replace('/*__MOTOR__*/', () => motor).replace('/*__ORNEKLER__*/', () => json);
fs.writeFileSync(path.join(KOK, 'oyun_alani', 'index.html'), html);
console.log(`yazıldı: oyun_alani/index.html (${liste.length} örnek, ${(html.length / 1024).toFixed(0)} KB)`);
