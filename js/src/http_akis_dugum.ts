// Ağ.HttpAkış'ın Node.js konağı. Yanıt bir iş parçacığında fetch ile okunur ve parça parça ana iş parçacığına
// iletilir; Yöntem programı (ana iş parçacığı) sıradaki parçayı Atomics.wait ile bekler. Zaman aşımı, yanıtın
// başlaması ve iki parça arasındaki en uzun beklemedir.
import { Worker, isMainThread, workerData, MessageChannel, MessagePort, receiveMessageOnPort } from 'worker_threads';

export interface AkisBaglantisi { sonraki(): any; kapat(): void }

export function dugumHttpAkis(surum: string): (istek: any) => AkisBaglantisi {
  return (istek) => {
    const bayrak = new Int32Array(new SharedArrayBuffer(4));
    const kanal = new MessageChannel();
    const isci = new Worker(__filename, { workerData: { httpAkis: true, bayrak: bayrak.buffer, kanal: kanal.port2, istek: { ...istek, surum } }, transferList: [kanal.port2] });
    isci.unref();                                  // bırakılan akış programın bitmesini engellemez
    let iscHatasi = false, bitti = false;
    isci.on('error', () => { iscHatasi = true; });
    const kapat = () => { if (!bitti) { bitti = true; void isci.terminate(); } };
    return {
      sonraki() {
        if (bitti) return { son: true };
        for (;;) {
          const v = Atomics.load(bayrak, 0);
          const r = receiveMessageOnPort(kanal.port1 as MessagePort);
          if (r) { if (r.message.son || r.message.hata) kapat(); return r.message; }
          if (iscHatasi) { kapat(); return { hata: 'baglanti' }; }
          Atomics.wait(bayrak, 0, v, 1000);
        }
      },
      kapat,
    };
  };
}

// ---------------------------------------------------------------- iş parçacığı
function isci() {
  const bayrak = new Int32Array(workerData.bayrak), kanal: MessagePort = workerData.kanal, i = workerData.istek;
  const bildir = (m: any) => { kanal.postMessage(m); Atomics.add(bayrak, 0, 1); Atomics.notify(bayrak, 0); };
  const d = new AbortController();
  let zaman = false, z: any = null;
  const kur = () => { clearTimeout(z); z = setTimeout(() => { zaman = true; d.abort(); }, i.zamanAsimi * 1000); };
  kur();
  const h = new Headers();
  if (!i.basliklar.some((b: [string, string]) => b[0].toLowerCase() === 'user-agent')) h.set('User-Agent', 'Yontem/' + i.surum);
  for (const [a, v] of i.basliklar) h.append(a, v);
  let basladi = false;
  (async () => {
    const r = await fetch(i.adres, { method: i.yontem, headers: h, body: i.govde === null ? undefined : i.govde, signal: d.signal, redirect: 'follow' });
    const bs: Record<string, string> = {};
    r.headers.forEach((v, a) => { bs[a.toLowerCase()] = v; });
    bildir({ durum: r.status, basliklar: bs });
    basladi = true;
    const c = new TextDecoder('utf-8');
    if (r.body) {
      const okuyucu = r.body.getReader();
      for (;;) {
        kur();
        const { done, value } = await okuyucu.read();
        if (done) break;
        const m = c.decode(value, { stream: true });
        if (m) bildir({ parca: m });
      }
    }
    const m = c.decode();
    if (m) bildir({ parca: m });
    clearTimeout(z);
    bildir({ son: true });
  })().catch(() => { clearTimeout(z); bildir({ hata: zaman ? 'zaman' : basladi ? 'koptu' : 'baglanti' }); });
}

if (!isMainThread && workerData && workerData.httpAkis) isci();
