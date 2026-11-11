#!/usr/bin/env node
// Tarayıcı paketini üretir: kutuphane/*.y gömülür, esbuild ile tek dosya (IIFE, global 'Yontem').
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const KOK = path.resolve(__dirname, '..', '..');
const JS = path.resolve(__dirname, '..');
const birimler = {};
for (const f of fs.readdirSync(path.join(KOK, 'kutuphane')).sort()) {
  if (f.endsWith('.y')) birimler[f.slice(0, -2)] = fs.readFileSync(path.join(KOK, 'kutuphane', f), 'utf-8');
}
fs.writeFileSync(path.join(JS, 'src', 'gomulu.ts'),
  '// Otomatik üretildi (betikler/paketle.js) — elle düzenlemeyin.\nexport const GOMULU_BIRIMLER: Record<string, string> = ' + JSON.stringify(birimler, null, 1) + ';\n');

esbuild.buildSync({
  entryPoints: [path.join(JS, 'src', 'tarayici.ts')],
  bundle: true, format: 'iife', globalName: 'Yontem', target: 'es2020', minify: true,
  outfile: path.join(JS, 'dist', 'yontem-tarayici.js'), legalComments: 'none',
  banner: { js: '/*! Yöntem çalışma zamanı | (c) 2026 Önder Örnek | MIT lisansı | https://yontem.pro */' },
});
console.log('yazıldı: dist/yontem-tarayici.js', (fs.statSync(path.join(JS, 'dist', 'yontem-tarayici.js')).size / 1024).toFixed(0) + ' KB');
