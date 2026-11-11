#!/usr/bin/env node
// Gömülü (C++) arka ucu sınar: her .y programı C++ olarak derlenip masaüstü benzetiminde çalıştırılır,
// çıktısı JavaScript derleyicisinin çıktısıyla karşılaştırılır. Alt küme dışındaki programlar atlanır.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const KOK = path.resolve(__dirname, '..', '..');
const CLI = path.resolve(__dirname, '..', 'dist', 'cli.js');
const dizinler = process.argv.slice(2).length ? process.argv.slice(2) : ['gomulu_ornekler', 'testler', 'ornekler', 'kitap_ornekleri'];
const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'ygt-'));
let gecen = 0, kalan = 0, atlanan = 0;
for (const dz of dizinler) {
  const dizin = path.join(KOK, dz);
  if (!fs.existsSync(dizin)) continue;
  for (const f of fs.readdirSync(dizin).sort()) {
    if (!f.endsWith('.y') || f === 'Geometri.y') continue;
    const yol = path.join(dizin, f);
    const girdiYol = yol.slice(0, -2) + '.girdi';
    const girdi = fs.existsSync(girdiYol) ? fs.readFileSync(girdiYol) : '';
    const ikili = path.join(gecici, f.slice(0, -2));
    const d = spawnSync(process.execPath, [CLI, 'gomulu', yol, '--masaustu', '-o', ikili], { cwd: dizin, encoding: 'utf-8' });
    const ad = path.join(dz, f);
    if (d.status !== 0) {
      if (/Gömülü derleme/.test(d.stderr)) { atlanan++; console.log(`atlandı    ${ad}  — ${d.stderr.trim().split('\n')[0].replace(/^Derleme hatası /, '')}`); continue; }
      kalan++; console.log(`BAŞARISIZ  ${ad}  (derleme)\n${d.stderr.slice(0, 3000)}`); continue;
    }
    const c = spawnSync(ikili, [], { cwd: dizin, input: girdi, encoding: 'utf-8', timeout: 60000 });
    const j = spawnSync(process.execPath, [CLI, yol], { cwd: dizin, input: girdi, encoding: 'utf-8' });
    if (c.stdout === j.stdout && c.status === j.status) { gecen++; console.log(`aynı       ${ad}`); }
    else {
      kalan++;
      console.log(`FARKLI     ${ad}  (çıkış ${c.status} / ${j.status})`);
      const a = c.stdout.split('\n'), b = j.stdout.split('\n');
      for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { console.log(`  C++: ${a[i]}\n  JS : ${b[i]}`); break; }
      if (c.stderr) console.log('  ' + c.stderr.trim().slice(0, 300));
    }
  }
}
console.log(`\n${gecen} aynı, ${kalan} farklı/başarısız, ${atlanan} alt küme dışında.`);
process.exitCode = kalan ? 1 : 0;
