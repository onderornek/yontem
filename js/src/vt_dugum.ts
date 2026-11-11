// Veritabanı biriminin Node.js konağı. SQLite Node'un yerleşik modülüyle (node:sqlite) doğrudan çalışır.
// PostgreSQL ve MySQL sürücüleri (pg, mysql2) eşzamansızdır: bir iş parçacığında (vt_isci.ts) çalışır,
// ana iş parçacığı yanıtı Atomics.wait ile bekler. Sürücüler Yöntem'le gelmez; projeye 'npm install pg' ya da
// 'npm install mysql2' ile kurulur.
import * as path from 'path';
import { Worker, MessageChannel, MessagePort, receiveMessageOnPort } from 'worker_threads';

interface Sonuc { satirlar: [string, any][][]; etkilenen: number }
interface Surucu { calistir(sql: string, p: any[]): Sonuc; sonKimlik(): any; kapat(): void }

function hataMetni(e: any): string { return String(e && e.message ? e.message : e).split('\n')[0]; }

// ---------------------------------------------------------------- SQLite
function sqliteAc(hedef: string): Surucu {
  let sqlite: any;
  const eski = process.emitWarning;
  try {
    (process as any).emitWarning = () => { /* 'deneysel' uyarısı programın çıktısına karışmasın */ };
    sqlite = require('node:sqlite');
  } catch { throw new Error('SQLite için Node.js 22.5 ya da daha yenisi gerekir'); }
  finally { (process as any).emitWarning = eski; }
  const db = new sqlite.DatabaseSync(hedef === ':memory:' ? ':memory:' : path.resolve(hedef));
  const say = db.prepare('SELECT total_changes() AS n, last_insert_rowid() AS k');
  say.setReadBigInts(true);
  const deger = (v: any) => v instanceof Uint8Array ? Buffer.from(v).toString('hex') : v;
  return {
    calistir(sql, p) {
      const once = say.get().n as bigint;
      const st = db.prepare(sql);
      st.setReadBigInts(true);
      const satirlar = (st.all(...p.map(x => typeof x === 'boolean' ? (x ? 1n : 0n) : x)) as any[]).map(s => Object.keys(s).map(k => [k, deger(s[k])] as [string, any]));
      return { satirlar, etkilenen: Number((say.get().n as bigint) - once) };
    },
    sonKimlik() { return say.get().k; },
    kapat() { db.close(); },
  };
}

// ---------------------------------------------------------------- PostgreSQL / MySQL (iş parçacığında)
function isciAc(tur: string, hedef: string, aramaYollari: string[]): Surucu {
  const bayrak = new Int32Array(new SharedArrayBuffer(4));
  const kanal = new MessageChannel();
  const isci = new Worker(path.join(__dirname, 'vt_isci.js'), { workerData: { bayrak: bayrak.buffer, kanal: kanal.port2, aramaYollari }, transferList: [kanal.port2] });
  isci.unref();
  (kanal.port1 as any).unref?.();
  let iscHatasi: any = null;
  isci.on('error', (e) => { iscHatasi = e; });
  const sor = (m: any, sure = 120000): any => {
    kanal.port1.postMessage(m);
    const son = Date.now() + sure;
    for (;;) {
      Atomics.wait(bayrak, 0, 0, 20);
      const r = receiveMessageOnPort(kanal.port1 as MessagePort);
      if (r) { if (r.message.hata !== undefined) throw new Error(r.message.hata); return r.message; }
      if (iscHatasi) throw new Error(hataMetni(iscHatasi));
      if (Date.now() > son) throw new Error('veritabanı yanıt vermedi (zaman aşımı)');
    }
  };
  try { sor({ t: 'baglan', tur, hedef }, 30000); } catch (e) { isci.terminate(); throw e; }
  return {
    calistir(sql, p) { return sor({ t: 'calistir', sql, p }); },
    sonKimlik() { return sor({ t: 'sonkimlik' }).deger; },
    kapat() { try { sor({ t: 'kapat' }, 5000); } finally { isci.terminate(); } },
  };
}

export function dugumVeritabani(aramaYollari: string[] = [process.cwd()]): (istek: any) => any {
  const baglantilar = new Map<number, Surucu>();
  let sira = 0;
  return (istek: any) => {
    try {
      if (istek.islem === 'baglan') {
        const s = istek.tur === 'sqlite' ? sqliteAc(istek.hedef) : isciAc(istek.tur, istek.hedef, aramaYollari);
        baglantilar.set(++sira, s);
        return { kimlik: sira };
      }
      const s = baglantilar.get(istek.kimlik);
      if (!s) return { hata: 'bağlantı kapalı' };
      if (istek.islem === 'calistir') return s.calistir(istek.sql, istek.p);
      if (istek.islem === 'sonkimlik') return { deger: s.sonKimlik() };
      if (istek.islem === 'kapat') { baglantilar.delete(istek.kimlik); s.kapat(); return {}; }
      return { hata: 'bilinmeyen işlem' };
    } catch (e) { return { hata: hataMetni(e) }; }
  };
}
