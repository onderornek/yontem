#!/usr/bin/env node
// Tüm örnekleri ve testleri JavaScript derleyicisiyle çalıştırıp .beklenen çıktılarla karşılaştırır.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.resolve(__dirname, '..', '..');
const CLI = path.resolve(__dirname, '..', 'dist', 'cli.js');
let basarisiz = 0, toplam = 0;
// Veritabanı birimini kullanan testler eski Node sürümlerinde atlanır (node:sqlite 22.5 ile geldi)
const SQLITE_VAR = (() => { const e = process.emitWarning; process.emitWarning = () => {}; try { require('node:sqlite'); return true; } catch { return false; } finally { process.emitWarning = e; } })();
for (const dz of ['testler', 'ornekler', 'kitap_ornekleri', 'gomulu_ornekler', 'ml_kilavuz', 'llm_kitabi', 'mesale_ornekleri', 'arayuz_ornekleri', 'guvenlik_ornekleri', 'birim_kilavuzu']) {
  const kitap = dz === 'kitap_ornekleri' || dz === 'gomulu_ornekler' || dz === 'ml_kilavuz' || dz === 'llm_kitabi' || dz === 'mesale_ornekleri';
  const dizin = path.join(KOK, dz);
  for (const f of fs.readdirSync(dizin).sort()) {
    if (!f.endsWith('.y')) continue;
    if (kitap && !fs.existsSync(path.join(dizin, f.slice(0, -2) + '.beklenen'))) continue;
    if (/^\s*(?:\{[^}]*\}\s*)*birim\b/i.test(fs.readFileSync(path.join(dizin, f), 'utf-8'))) continue;   // birim dosyaları, onları kullanan programla sınanır
    if (!SQLITE_VAR && /^\s*kullan\b[^\n]*(Veritabanı|Ürünİşleri|ÜrünDeposu)/im.test(fs.readFileSync(path.join(dizin, f), 'utf-8'))) { console.log(`atlandı    ${path.join(dz, f)}  (SQLite için Node.js 22.5+ gerekir)`); continue; }
    toplam++;
    const yol = path.join(dizin, f);
    const t0 = Date.now();
    const girdi = yol.slice(0, -2) + '.girdi';
    const p = spawnSync(process.execPath, [CLI, yol], { cwd: dizin, encoding: 'utf-8', timeout: 300000, input: fs.existsSync(girdi) ? fs.readFileSync(girdi) : '' });
    const sure = ((Date.now() - t0) / 1000).toFixed(2);
    const ad = path.join(dz, f);
    if (p.status !== 0 && !kitap) { basarisiz++; console.log(`BAŞARISIZ  ${ad}  (çıkış kodu ${p.status})\n${p.stderr}`); continue; }
    const bek = yol.slice(0, -2) + '.beklenen';
    if (fs.existsSync(bek) && fs.readFileSync(bek, 'utf-8') !== p.stdout) {
      basarisiz++; console.log(`BAŞARISIZ  ${ad}  (çıktı beklenenden farklı)`); continue;
    }
    // 'sına' blokları: yanında .sina.beklenen varsa 'yontem sına' raporu da karşılaştırılır
    const sbek = yol.slice(0, -2) + '.sina.beklenen';
    if (fs.existsSync(sbek)) {
      const s = spawnSync(process.execPath, [CLI, 'sina', f], { cwd: dizin, encoding: 'utf-8', timeout: 300000 });
      if (process.argv.includes('--guncelle')) fs.writeFileSync(sbek, s.stdout);
      if (fs.readFileSync(sbek, 'utf-8') !== s.stdout || s.status > 1) { basarisiz++; console.log(`BAŞARISIZ  ${ad}  ('yontem sına' raporu beklenenden farklı)\n${s.stdout}${s.stderr}`); continue; }
    }
    console.log(`geçti      ${ad}  ${sure} sn`);
  }
}
// Biçimlendirici: dağınık örnek beklenen biçime gelmeli; depodaki her program zaten biçimli ve sonuç kararlı olmalı.
{
  const { bicimle } = require('../dist/bicimle.js');
  const gez = (d, o = []) => { for (const f of fs.readdirSync(d)) { if (f === 'node_modules' || f === 'site' || f.startsWith('.')) continue; const p = path.join(d, f); if (fs.statSync(p).isDirectory()) gez(p, o); else if (f.endsWith('.y')) o.push(p); } return o; };
  const dz = path.join(KOK, 'testler', 'bicim');
  toplam++;
  const b = bicimle(fs.readFileSync(path.join(dz, 'daginik.txt'), 'utf-8'), 'daginik.y');
  if (b !== fs.readFileSync(path.join(dz, 'daginik.bicimli.txt'), 'utf-8')) { basarisiz++; console.log('BAŞARISIZ  biçimlendirici: testler/bicim/daginik.txt beklenen biçime gelmedi'); }
  else console.log('geçti      biçimlendirici: dağınık örnek');
  toplam++;
  const bozuk = [];
  for (const f of gez(KOK)) {
    const k = fs.readFileSync(f, 'utf-8');
    const s1 = bicimle(k, f);
    if (s1 !== k || bicimle(s1, f) !== s1) bozuk.push(path.relative(KOK, f));
  }
  if (bozuk.length) { basarisiz++; console.log(`BAŞARISIZ  biçimlendirici: biçimli olmayan dosyalar (yontem bicimle ile düzeltin): ${bozuk.join(', ')}`); }
  else console.log('geçti      biçimlendirici: depodaki tüm programlar biçimli ve kararlı');
}
console.log(`\n${toplam - basarisiz}/${toplam} dosya geçti.`);
process.exitCode = basarisiz ? 1 : 0;
