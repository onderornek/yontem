// Sunucu biriminin Node.js konağı. HTTP sunucusu bir iş parçacığında çalışır; Yöntem programı (ana iş parçacığı)
// her isteği sırayla, eşzamanlı işler: istek gelene kadar Atomics.wait ile bekler, yanıtı iş parçacığına verir.
// Akış yanıtında (AkışYanıt) başlıklar hemen gider, akışın her değeri üretildikçe bir parça olarak yollanır; istemci
// bağlantıyı kapatırsa akış kapatılır ('sonunda' blokları çalışır).
import * as fs from 'fs';
import * as path from 'path';
import { Worker, isMainThread, workerData, MessageChannel, MessagePort, receiveMessageOnPort } from 'worker_threads';

export function dugumSunucu(gunluk: (m: string) => void): (ayar: any, isle: (istek: any) => any) => void {
  return (ayar, isle) => {
    const bayrak = new Int32Array(new SharedArrayBuffer(4));
    const kanal = new MessageChannel();
    const isci = new Worker(__filename, { workerData: { sunucu: true, bayrak: bayrak.buffer, kanal: kanal.port2, ayar }, transferList: [kanal.port2] });
    let iscHatasi: any = null;
    isci.on('error', (e) => { iscHatasi = e; });
    const kuyruk: any[] = [];
    const al = (): any => {
      if (kuyruk.length) return kuyruk.shift();
      for (;;) {
        Atomics.wait(bayrak, 0, 0, 50);
        const r = receiveMessageOnPort(kanal.port1 as MessagePort);
        if (r) return r.message;
        if (iscHatasi) throw iscHatasi;
      }
    };
    try {
      const ilk = al();
      if (ilk.hata) throw new Error(ilk.hata);
      gunluk(`Sunucu dinliyor: http://${ayar.adres === '0.0.0.0' ? 'localhost' : ayar.adres}:${ilk.port} (durdurmak için Ctrl+C)`);
      for (;;) {
        const m = al();
        if (!m.istek) continue;                     // bitmiş bir akışın geç gelen 'koptu' bildirimi
        let yanit: any;
        try { yanit = isle(m.istek); }
        catch (e: any) { yanit = { durum: 500, basliklar: [['content-type', 'text/plain; charset=utf-8']], govde: 'Sunucu hatası', gunluk: String(e && e.message || e) }; }
        if (yanit.gunluk) gunluk(`Sunucu: ${yanit.gunluk}`);
        if (yanit.dosya) yanit.dosya = path.resolve(yanit.dosya);
        const { akis, ...gonder } = yanit;
        kanal.port1.postMessage({ no: m.no, yanit: { ...gonder, akis: !!akis } });
        if (akis) {
          for (;;) {
            // istemci koptu mu? (beklemeden bakılır; başka istekler sıraya alınır)
            let koptu = false;
            for (let r; (r = receiveMessageOnPort(kanal.port1 as MessagePort));) {
              if (r.message.koptu && r.message.no === m.no) koptu = true; else if (!r.message.koptu) kuyruk.push(r.message);
            }
            if (koptu) { akis.kapat(); break; }
            let p: any;
            try { p = akis.sonraki(); }
            catch (e) { kanal.port1.postMessage({ no: m.no, hata: true }); throw e; }
            if (p.parca !== undefined) { if (p.parca) kanal.port1.postMessage({ no: m.no, parca: p.parca }); continue; }
            if (p.hata) { gunluk(`Sunucu: ${p.hata}`); kanal.port1.postMessage({ no: m.no, hata: true }); break; }
            if (p.durdur) yanit.durdur = true;
            kanal.port1.postMessage({ no: m.no, son: true, durdur: !!p.durdur });
            break;
          }
        }
        if (yanit.durdur) {                         // iş parçacığı yanıtı gönderdiğini bildirir
          for (let r = al(); !r.kapandi; r = al()) { /* ara bildirimler */ }
          break;
        }
      }
    } finally { isci.terminate(); }
  };
}

// ---------------------------------------------------------------- iş parçacığı
function isci() {
  const http = require('http');
  const bayrak = new Int32Array(workerData.bayrak), kanal: MessagePort = workerData.kanal, ayar = workerData.ayar;
  const bildir = (m: any) => { kanal.postMessage(m); Atomics.notify(bayrak, 0); };
  const bekleyen = new Map<number, any>();
  let sira = 0;
  const sunucu = http.createServer((q: any, r: any) => {
    const parcalar: Buffer[] = [];
    let boyut = 0, asti = false;
    q.on('data', (p: Buffer) => { boyut += p.length; if (boyut > ayar.govdeSiniri) { asti = true; parcalar.length = 0; } else if (!asti) parcalar.push(p); });
    q.on('end', () => {
      const kisa = (durum: number, m: string, kapat = false) => { r.writeHead(durum, { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff', 'content-length': Buffer.byteLength(m), ...(kapat ? { connection: 'close' } : {}) }); r.end(m); };
      if (asti) { kisa(413, 'İstek çok büyük', true); return; }
      let govde: string;
      try { govde = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parcalar)); }
      catch { kisa(400, 'Geçersiz istek'); return; }
      const basliklar: Record<string, string> = {};
      for (const [a, v] of Object.entries(q.headers)) basliklar[a] = Array.isArray(v) ? v.join(', ') : String(v);
      const no = ++sira;
      bekleyen.set(no, r);
      bildir({ no, istek: { yontem: q.method, hedef: q.url, basliklar, govde } });
    });
    q.on('error', () => { /* bağlantı koptu */ });
  });
  const akan = new Map<number, any>();
  const kapat = (durdur: boolean) => () => { if (durdur) { sunucu.close(() => bildir({ kapandi: true })); sunucu.closeAllConnections?.(); } };
  kanal.on('message', (m: any) => {
    if (!m.yanit) {                                  // akış yanıtının parçası, sonu ya da hatası
      const r = akan.get(m.no);
      if (!r) return;
      if (m.parca !== undefined) { r.write(m.parca, 'utf-8'); return; }
      akan.delete(m.no);
      if (m.son) r.end(kapat(m.durdur));
      else r.destroy();                              // gövdenin ortasında hata: bağlantı sonlandırma parçası gönderilmeden kesilir
      return;
    }
    const r = bekleyen.get(m.no);
    bekleyen.delete(m.no);
    if (!r) return;
    const y = m.yanit;
    const bitir = kapat(!!y.durdur);
    if (y.akis) {
      for (const [a, v] of y.basliklar) r.setHeader(a, v);
      r.writeHead(y.durum);
      r.flushHeaders();
      akan.set(m.no, r);
      r.on('close', () => { if (akan.delete(m.no)) bildir({ no: m.no, koptu: true }); });
      return;
    }
    for (const [a, v] of y.basliklar) r.setHeader(a, v);
    if (y.durdur) r.setHeader('connection', 'close');
    if (y.dosya) {
      fs.readFile(y.dosya, (e, veri) => {
        if (e) { r.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); r.end('Bulunamadı', bitir); return; }
        r.setHeader('content-length', veri.length);
        r.writeHead(y.durum); r.end(y.bosGovde ? undefined : veri, bitir);
      });
      return;
    }
    r.setHeader('content-length', Buffer.byteLength(y.govde, 'utf-8'));
    r.writeHead(y.durum);
    if (y.bosGovde) r.end(bitir); else r.end(y.govde, 'utf-8', bitir);
  });
  sunucu.on('error', (e: any) => bildir({ hata: e.code === 'EADDRINUSE' ? `${ayar.port} numaralı port kullanımda` : e.code === 'EACCES' ? `${ayar.port} numaralı portu dinleme izni yok` : String(e.message || e) }));
  sunucu.listen(ayar.port, ayar.adres, () => bildir({ port: sunucu.address().port }));
}

if (!isMainThread && workerData && workerData.sunucu) isci();
