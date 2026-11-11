// Hata ayıklayıcının düzenleyici arayüzü: Debug Adapter Protocol (DAP), standart girdi/çıktı üzerinden.
// 'yontem ayikla --dap' ile başlar; VS Code eklentisi bu komutu çalıştırır.
//
// Yöntem programları eşzamanlı çalışır; bu yüzden program ayrı bir iş parçacığında (worker) koşar, ana iş
// parçacığı DAP iletilerini karşılar. İşçi duraklayınca Atomics.wait ile bekler; ana iş parçacığı iletiyi
// kanala koyup bayrağı artırır. İşçi çalışırken de her deyimde bayrağa bakar: kesme noktası değişiklikleri
// ve 'duraklat' isteği program sürerken de işlenir.
import * as fs from 'fs';
import * as path from 'path';
import { Worker, isMainThread, parentPort, workerData, MessageChannel, MessagePort, receiveMessageOnPort } from 'worker_threads';
import { Ayiklayici, Durma, DegiskenBilgi, AyiklamaBitti, altOgeler, kisaTemsil, hataMetni, ayiklamaDerle, ayiklayarakCalistir } from './ayikla';
import { hataIsle } from './calistir';
import { turAdi } from './calisma/deger';
import { YNesne } from './calisma/deger';

// ================================================================ işçi: programı çalıştırır
interface IsciVerisi { yol: string; argumanlar: string[]; girdi: string | null; giristeDur: boolean; bayrak: SharedArrayBuffer; kanal: MessagePort; cwd: string | null }

function isci() {
  const v = workerData as IsciVerisi;
  const { birimBulucu, dugumHttp } = require('./cli');
  const bayrak = new Int32Array(v.bayrak);
  const gonder = (m: any) => parentPort!.postMessage(m);
  if (v.cwd) { try { process.chdir(v.cwd); } catch { /* işçide chdir desteklenmeyebilir */ } }

  /** Bekleyen iletileri alır */
  const iletiler = (): any[] => {
    const out: any[] = [];
    for (;;) {
      const m = receiveMessageOnPort(v.kanal);
      if (!m) break;
      Atomics.sub(bayrak, 0, 1);
      out.push(m.message);
    }
    return out;
  };
  const bekle = (): any[] => {
    for (;;) {
      Atomics.wait(bayrak, 0, 0);
      const l = iletiler();
      if (l.length) return l;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);   // ileti henüz kuyruğa düşmedi
    }
  };

  let derlenen: ReturnType<typeof ayiklamaDerle>;
  try {
    const { bul, dizinler } = birimBulucu(v.yol);
    derlenen = ayiklamaDerle(fs.readFileSync(v.yol, 'utf-8'), v.yol, (ad: string) => bul(ad), dizinler);
  } catch (e) {
    hataIsle(e, { hata: (m) => gonder({ t: 'cikti', tur: 'stderr', s: m + '\n' }) });
    gonder({ t: 'bitti', kod: 2 });
    return;
  }

  // Duraklama sırasında verilen değişken başvuruları: numara → alt öğeleri üreten işlev
  let basvurular: (() => DegiskenBilgi[])[] = [];
  const basvur = (f: () => DegiskenBilgi[]) => { basvurular.push(f); return basvurular.length; };
  const degiskenYap = (d: DegiskenBilgi) => {
    const alt = altOgeler(d.deger);
    return {
      name: d.ad, value: kisaTemsil(d.deger), type: typeof d.deger === 'function' ? 'işlev' : turAdi(d.deger),
      variablesReference: alt && alt.length ? basvur(() => altOgeler(d.deger) ?? []) : 0,
      ...(Array.isArray(d.deger) ? { indexedVariables: d.deger.length } : {}),
    };
  };

  /** Çalışmayı sürdürecek ileti gelirse true döner */
  const isle = (a: Ayiklayici, m: any, durmus: boolean): boolean => {
    const yanit = (govde: any) => gonder({ t: 'yanit', no: m.no, govde });
    const hataYanit = (e: any) => gonder({ t: 'yanit', no: m.no, hata: hataMetni(e) });
    switch (m.t) {
      case 'kesmeler': {
        // Deyim olmayan satırdaki kesme noktası sonraki deyime taşınır; taşınan satırlar yanıtlanır
        const satirlar = m.kesmeler.map((k: any) => a.kesmeSatiri(m.dosya, k.satir));
        a.kesmeleriAyarla(m.dosya, m.kesmeler.map((k: any, i: number) => ({ ...k, satir: satirlar[i] })).filter((k: any) => k.satir !== null));
        if (m.no !== undefined) yanit(satirlar);
        return false;
      }
      case 'hatalar': a.hatadaDur = !!m.acik; return false;
      case 'duraklat': return false;                       // çalışırken: yokla() true döndürür
      case 'bitir': throw new AyiklamaBitti();
    }
    if (!durmus) { if (m.no !== undefined) hataYanit(new Error('Program çalışıyor')); return false; }
    try {
      switch (m.t) {
        case 'devam': a.devam(); return true;
        case 'adim': a.adim(); return true;
        case 'ustunden': a.ustunden(); return true;
        case 'disari': a.disari(); return true;
        case 'yigin': yanit(a.cerceveler().map(c => ({ ...c, dosya: path.resolve(c.dosya) }))); break;
        case 'kapsamlar': {
          const out: any[] = [];
          const ben = a.ben(m.cerceve);
          const yerel = a.degiskenler(m.cerceve, false), genel = a.degiskenler(m.cerceve, true);
          const cerceveler = a.cerceveler();
          const programda = m.cerceve === cerceveler.length - 1;
          if (!programda || yerel.length) out.push({ name: programda ? 'Program' : 'Yerel', variablesReference: basvur(() => a.degiskenler(m.cerceve, false)), expensive: false, presentationHint: programda ? undefined : 'locals' });
          if (ben instanceof YNesne) out.push({ name: 'Nesne (ben)', variablesReference: basvur(() => altOgeler(a.ben(m.cerceve)) ?? []), expensive: false });
          if (genel.length) out.push({ name: 'Program', variablesReference: basvur(() => a.degiskenler(m.cerceve, true)), expensive: false });
          yanit(out); break;
        }
        case 'degiskenler': { const f = basvurular[m.ref - 1]; yanit(f ? f().map(degiskenYap) : []); break; }
        case 'deger': yanit(degiskenYap({ ad: '', deger: a.degerlendir(m.cerceve ?? 0, m.ifade) })); break;
        default: if (m.no !== undefined) hataYanit(new Error(`Bilinmeyen istek: ${m.t}`));
      }
    } catch (e) {
      if (e instanceof AyiklamaBitti) throw e;
      hataYanit(e);
    }
    return false;
  };

  const durdu = (a: Ayiklayici, d: Durma) => {
    basvurular = [];
    gonder({ t: 'durdu', neden: d.neden, mesaj: d.mesaj });
    for (;;) for (const m of bekle()) if (isle(a, m, true)) { gonder({ t: 'suruyor' }); return; }
  };
  const ayk = new Ayiklayici(derlenen.u, durdu, v.giristeDur);
  ayk.yokla = () => {
    if (Atomics.load(bayrak, 0) === 0) return false;
    let duraklat = false;
    for (const m of iletiler()) { if (m.t === 'duraklat') duraklat = true; else isle(ayk, m, false); }
    return duraklat;
  };

  // Başlangıç: kesme noktaları gelene ve 'basla' denene kadar bekle
  gonder({ t: 'hazir', dosyalar: derlenen.u.dosyalar.map(d => path.resolve(d)) });
  try {
    basla: for (;;) for (const m of bekle()) { if (m.t === 'basla') break basla; isle(ayk, m, false); }
  } catch { gonder({ t: 'bitti', kod: 130 }); return; }

  const girdi = v.girdi === null ? [] : v.girdi.split(/(?<=\n)/).filter(s => s !== '');
  let gi = 0;
  const kodu = ayiklayarakCalistir(derlenen.kod, ayk, {
    yaz: (s) => gonder({ t: 'cikti', tur: 'stdout', s }),
    okuSatir: () => gi < girdi.length ? girdi[gi++] : null,
    argumanlar: v.argumanlar,
    dosyaOku: (y) => fs.readFileSync(y, 'utf-8'),
    dosyaYaz: (y, i, e) => e ? fs.appendFileSync(y, i) : fs.writeFileSync(y, i),
    dosyaVarMi: (y) => fs.existsSync(y),
    ortam: (a) => process.env[a],
    http: dugumHttp,
    veritabani: require('./vt_dugum').dugumVeritabani(),
    hata: (m) => gonder({ t: 'cikti', tur: 'stderr', s: m + '\n' }),
  });
  gonder({ t: 'bitti', kod: kodu });
}

// ================================================================ ana iş parçacığı: DAP
export function dapBaslat(giris: NodeJS.ReadableStream, cikis: NodeJS.WritableStream) {
  let sira = 1;
  const yolla = (m: any) => { const g = Buffer.from(JSON.stringify({ seq: sira++, ...m }), 'utf-8'); cikis.write(`Content-Length: ${g.length}\r\n\r\n`); cikis.write(g); };
  const olay = (event: string, body: any = {}) => yolla({ type: 'event', event, body });
  const yanit = (istek: any, body: any = {}) => yolla({ type: 'response', request_seq: istek.seq, command: istek.command, success: true, body });
  const hataYanit = (istek: any, mesaj: string) => yolla({ type: 'response', request_seq: istek.seq, command: istek.command, success: false, message: mesaj, body: { error: { id: 1, format: mesaj } } });

  let isciSureci: Worker | null = null, kanal: MessagePort | null = null;
  const bayrak = new Int32Array(new SharedArrayBuffer(4));
  let hazir = false, yapilandi = false, basladi = false, bitti = false, durmus = false;
  let istekNo = 1;
  const bekleyen = new Map<number, (m: any) => void>();
  const kuyruk: any[] = [];                                // işçi hazır olmadan gelen iletiler
  let cerceveNo = new Map<number, number>();               // DAP frameId → çerçeve sırası

  const isciye = (m: any) => {
    if (!kanal) { kuyruk.push(m); return; }
    kanal.postMessage(m);
    Atomics.add(bayrak, 0, 1);
    Atomics.notify(bayrak, 0);
  };
  const sor = (m: any): Promise<any> => new Promise((coz, reddet) => {
    if (bitti) { reddet(new Error('Program çalışmıyor')); return; }
    const no = istekNo++;
    bekleyen.set(no, (y) => y.hata !== undefined ? reddet(new Error(y.hata)) : coz(y.govde));
    isciye({ ...m, no });
  });
  const baslat = () => { if (hazir && yapilandi && !basladi) { basladi = true; isciye({ t: 'basla' }); } };
  const bitir = (kod: number) => {
    if (bitti) return;
    bitti = true;
    for (const f of bekleyen.values()) f({ hata: 'Program bitti' });
    bekleyen.clear();
    olay('exited', { exitCode: kod });
    olay('terminated');
  };

  const isle = async (m: any) => {
    const a = m.arguments ?? {};
    switch (m.command) {
      case 'initialize':
        yanit(m, {
          supportsConfigurationDoneRequest: true, supportsConditionalBreakpoints: true, supportsEvaluateForHovers: true,
          supportsTerminateRequest: true,
          exceptionBreakpointFilters: [{ filter: 'hatalar', label: 'Çalışma hataları', description: 'Bir çalışma hatası oluştuğunda (yakalansa bile) dur', default: true }],
        });
        olay('initialized');
        return;
      case 'launch': {
        if (!a.program) { hataYanit(m, "Başlatma ayarında 'program' yok"); return; }
        const cwd = a.cwd ? path.resolve(a.cwd) : null;
        const yol = path.resolve(cwd ?? process.cwd(), a.program);
        if (!fs.existsSync(yol)) { hataYanit(m, `Dosya bulunamadı: ${yol}`); return; }
        let girdi: string | null = null;
        if (typeof a.girdi === 'string' && a.girdi) {
          try { girdi = fs.readFileSync(path.resolve(cwd ?? path.dirname(yol), a.girdi), 'utf-8'); }
          catch { hataYanit(m, `Girdi dosyası okunamadı: ${a.girdi}`); return; }
        }
        const mc = new MessageChannel();
        const veri: IsciVerisi = { yol, argumanlar: Array.isArray(a.args) ? a.args.map(String) : [], girdi, giristeDur: !!(a.stopOnEntry ?? a.giristeDur), bayrak: bayrak.buffer as SharedArrayBuffer, kanal: mc.port2, cwd };
        isciSureci = new Worker(__filename, { workerData: veri, transferList: [mc.port2], stdout: true, stderr: true });
        (isciSureci.stdout as any).on('data', (d: Buffer) => olay('output', { category: 'stdout', output: d.toString('utf-8') }));
        (isciSureci.stderr as any).on('data', (d: Buffer) => olay('output', { category: 'stderr', output: d.toString('utf-8') }));
        isciSureci.on('message', (y: any) => {
          switch (y.t) {
            case 'hazir': hazir = true; baslat(); break;
            case 'cikti': olay('output', { category: y.tur, output: y.s }); break;
            case 'durdu':
              durmus = true;
              olay('stopped', {
                reason: ({ giris: 'entry', kesme: 'breakpoint', adim: 'step', hata: 'exception', duraklat: 'pause' } as any)[y.neden], threadId: 1, allThreadsStopped: true,
                ...(y.mesaj ? { description: y.neden === 'hata' ? 'Çalışma hatası' : 'Kesme noktası', text: y.mesaj } : {}),
              });
              break;
            case 'suruyor': durmus = false; break;
            case 'yanit': { const f = bekleyen.get(y.no); if (f) { bekleyen.delete(y.no); f(y); } break; }
            case 'bitti': bitir(y.kod); break;
          }
        });
        isciSureci.on('error', (e) => { olay('output', { category: 'stderr', output: `Hata ayıklayıcı iç hatası: ${e && (e as any).stack || e}\n` }); bitir(1); });
        isciSureci.on('exit', () => bitir(0));
        kanal = mc.port1;
        for (const k of kuyruk.splice(0)) isciye(k);
        yanit(m);
        return;
      }
      case 'setBreakpoints': {
        const dosya = a.source && a.source.path;
        const l = (a.breakpoints ?? []).map((b: any) => ({ satir: b.line, kosul: b.condition || undefined }));
        let satirlar: (number | null)[] = l.map(() => null);
        if (dosya) { try { satirlar = await sor({ t: 'kesmeler', dosya, kesmeler: l }); } catch { /* program bitti */ } }
        yanit(m, { breakpoints: l.map((b: any, i: number) => satirlar[i] === null ? { verified: false, line: b.satir, message: 'Bu satırda çalışan bir deyim yok' } : { verified: true, line: satirlar[i] }) });
        return;
      }
      case 'setExceptionBreakpoints': isciye({ t: 'hatalar', acik: (a.filters ?? []).includes('hatalar') }); yanit(m); return;
      case 'configurationDone': yapilandi = true; yanit(m); baslat(); return;
      case 'threads': yanit(m, { threads: [{ id: 1, name: 'Program' }] }); return;
      case 'stackTrace': {
        const c: any[] = await sor({ t: 'yigin' });
        cerceveNo = new Map();
        yanit(m, {
          totalFrames: c.length,
          stackFrames: c.map((f, i) => { cerceveNo.set(i + 1, i); return { id: i + 1, name: f.ad, line: f.satir, column: 1, source: { name: path.basename(f.dosya), path: f.dosya } }; }),
        });
        return;
      }
      case 'scopes': yanit(m, { scopes: await sor({ t: 'kapsamlar', cerceve: cerceveNo.get(a.frameId) ?? 0 }) }); return;
      case 'variables': yanit(m, { variables: await sor({ t: 'degiskenler', ref: a.variablesReference }) }); return;
      case 'evaluate': {
        const d = await sor({ t: 'deger', cerceve: cerceveNo.get(a.frameId) ?? 0, ifade: a.expression });
        yanit(m, { result: d.value, type: d.type, variablesReference: d.variablesReference });
        return;
      }
      case 'continue': isciye({ t: 'devam' }); yanit(m, { allThreadsContinued: true }); return;
      case 'next': isciye({ t: 'ustunden' }); yanit(m); return;
      case 'stepIn': isciye({ t: 'adim' }); yanit(m); return;
      case 'stepOut': isciye({ t: 'disari' }); yanit(m); return;
      case 'pause': isciye({ t: 'duraklat' }); yanit(m); return;
      case 'terminate': case 'disconnect':
        yanit(m);
        if (isciSureci && !bitti) { isciye({ t: 'bitir' }); const w = isciSureci; setTimeout(() => { w.terminate(); }, 300).unref(); }
        if (m.command === 'disconnect') setTimeout(() => process.exit(0), 400);
        return;
      default: hataYanit(m, `Desteklenmeyen istek: ${m.command}`);
    }
  };

  let tampon = Buffer.alloc(0);
  giris.on('data', (parca: Buffer) => {
    tampon = Buffer.concat([tampon, parca]);
    for (;;) {
      const bas = tampon.indexOf('\r\n\r\n');
      if (bas < 0) return;
      const u = /Content-Length:\s*(\d+)/i.exec(tampon.subarray(0, bas).toString('ascii'));
      if (!u) { tampon = tampon.subarray(bas + 4); continue; }
      const n = Number(u[1]);
      if (tampon.length < bas + 4 + n) return;
      const govde = tampon.subarray(bas + 4, bas + 4 + n).toString('utf-8');
      tampon = tampon.subarray(bas + 4 + n);
      let m: any;
      try { m = JSON.parse(govde); } catch { continue; }
      if (m.type === 'request') isle(m).catch((e) => hataYanit(m, hataMetni(e)));
    }
  });
  giris.on('end', () => { if (isciSureci) isciSureci.terminate(); process.exit(0); });
}

if (!isMainThread && workerData && (workerData as any).bayrak) isci();
