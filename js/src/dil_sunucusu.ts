// Yöntem dil sunucusu (Language Server Protocol, stdio üzerinden JSON-RPC).
//   yontem dil-sunucusu
// Sunduğu özellikler: tanılar (sözdizimi ve derleme hataları, tanımsız ad uyarıları), tamamlama, üzerine gelince
// imza, tanıma git, belge simgeleri (ana hat) ve biçimlendirme. Dış bağımlılığı yoktur; LSP destekleyen her
// düzenleyiciyle (VS Code, Neovim, Helix, Emacs…) çalışır.
import * as fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { cozumle, tamamla, ustune, tanim, Analiz, Simge, Oneri, BirimBul } from './dil_hizmeti';
import { bicimle } from './bicimle';

interface Belge { metin: string; analiz: Analiz; sonGecerli: Analiz | null }

export function sunucuyuBaslat(birimBulucu: (yol: string) => { bul(ad: string): { yol: string; kaynak: string } | null },
  giris: NodeJS.ReadableStream = process.stdin, cikis: NodeJS.WritableStream = process.stdout, surum = '',
  katiSecici?: (yol: string) => ((dosya: string) => boolean) | undefined): void {
  const belgeler = new Map<string, Belge>();
  const gonder = (m: any) => {
    const govde = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...m }), 'utf-8');
    cikis.write(`Content-Length: ${govde.length}\r\n\r\n`);
    cikis.write(govde);
  };
  const yolu = (uri: string) => { try { return uri.startsWith('file:') ? fileURLToPath(uri) : uri; } catch { return uri; } };
  const birimBul = (yol: string): BirimBul => {
    let b: ReturnType<typeof birimBulucu> | null = null;
    return (ad) => {
      // Açık (kaydedilmemiş olabilir) belgeler diskteki sürümün önüne geçer
      try { b = b ?? birimBulucu(yol); } catch { return null; }
      const bulunan = b.bul(ad);
      if (!bulunan) return null;
      const acik = belgeler.get(pathToFileURL(bulunan.yol).toString());
      return acik ? { yol: bulunan.yol, kaynak: acik.metin } : bulunan;
    };
  };
  const cozumleVeBildir = (uri: string, metin: string) => {
    const yol = yolu(uri);
    let analiz: Analiz;
    try { analiz = cozumle(metin, yol, birimBul(yol), katiSecici ? katiSecici(yol) : undefined); }
    catch (e: any) { analiz = { tanilar: [], simgeler: [], birimler: [], sozcukler: [], gecerli: false, satirSayisi: 0 }; }
    const onceki = belgeler.get(uri);
    belgeler.set(uri, { metin, analiz, sonGecerli: analiz.gecerli ? analiz : onceki?.sonGecerli ?? null });
    gonder({ method: 'textDocument/publishDiagnostics', params: { uri, diagnostics: analiz.tanilar.map(t => ({
      range: { start: { line: t.satir - 1, character: t.sutun - 1 }, end: { line: t.satir - 1, character: t.sutun - 1 + t.uzunluk } },
      severity: t.uyari ? 2 : 1, source: 'yöntem', message: t.mesaj,
    })) } });
  };
  // Sözdizimi bozukken de tamamlama ve tanıma git çalışsın: son geçerli çözümleme kullanılır
  const analizi = (uri: string): Analiz | null => { const b = belgeler.get(uri); return b ? (b.analiz.gecerli ? b.analiz : b.sonGecerli) : null; };

  const TAMAMLAMA_TURU: Record<string, number> = { anahtar: 14, tip: 25, yerlesik: 3, birim: 3, fonksiyon: 3, prosedur: 3, kurucu: 4,
    degisken: 6, parametre: 6, sabit: 21, alan: 5, program: 9 };
  const SIMGE_TURU: Record<string, number> = { program: 2, birim: 2, sabit: 14, degisken: 13, tip: 5, fonksiyon: 12, prosedur: 12, kurucu: 9, parametre: 13, alan: 8 };
  const simgeLsp = (s: Simge, satirSayisi: number): any => {
    const bas = { line: s.satir - 1, character: s.sutun - 1 };
    const secim = { start: bas, end: { line: s.satir - 1, character: s.sutun - 1 + s.ham.length } };
    const sonSatir = Math.max(s.satir, Math.min(s.son ?? s.satir, satirSayisi));
    const aralik = sonSatir > s.satir ? { start: bas, end: { line: sonSatir - 1, character: 1000 } } : secim;
    return { name: s.ham, detail: s.imza, kind: SIMGE_TURU[s.tur] ?? 13, range: aralik, selectionRange: secim,
      children: s.cocuklar.filter(c => c.tur !== 'parametre').map(c => simgeLsp(c, satirSayisi)) };
  };

  const istek = (yontem: string, p: any): any => {
    switch (yontem) {
      case 'initialize':
        return { capabilities: { textDocumentSync: 1, completionProvider: { triggerCharacters: ['.'] }, hoverProvider: true, definitionProvider: true,
          documentSymbolProvider: true, documentFormattingProvider: true }, serverInfo: { name: 'Yöntem dil sunucusu', version: surum } };
      case 'shutdown': return null;
      case 'textDocument/completion': {
        const b = belgeler.get(p.textDocument.uri), a = analizi(p.textDocument.uri);
        if (!b || !a) return [];
        const satir = (b.metin.split('\n')[p.position.line] ?? '').slice(0, p.position.character);
        return tamamla(a, satir, p.position.line + 1).map((o: Oneri) => ({ label: o.etiket, kind: TAMAMLAMA_TURU[o.tur] ?? 1, detail: o.ayrinti }));
      }
      case 'textDocument/hover': {
        const a = analizi(p.textDocument.uri);
        const m = a && ustune(a, p.position.line + 1, p.position.character + 1);
        return m ? { contents: { kind: 'markdown', value: '```yontem\n' + m + '\n```' } } : null;
      }
      case 'textDocument/definition': {
        const a = analizi(p.textDocument.uri);
        const t = a && tanim(a, p.position.line + 1, p.position.character + 1);
        if (!t) return null;
        return { uri: t.dosya ? pathToFileURL(t.dosya).toString() : p.textDocument.uri,
          range: { start: { line: t.satir - 1, character: t.sutun - 1 }, end: { line: t.satir - 1, character: t.sutun - 1 + t.uzunluk } } };
      }
      case 'textDocument/documentSymbol': {
        const a = analizi(p.textDocument.uri);
        return a ? a.simgeler.map(s => simgeLsp(s, a.satirSayisi)) : [];
      }
      case 'textDocument/formatting': {
        const b = belgeler.get(p.textDocument.uri);
        if (!b) return [];
        let yeni: string;
        try { yeni = bicimle(b.metin, yolu(p.textDocument.uri)); } catch { return []; }   // sözdizimi hatası: tanı zaten gösteriliyor
        if (yeni === b.metin) return [];
        const satirlar = b.metin.split('\n');
        return [{ range: { start: { line: 0, character: 0 }, end: { line: satirlar.length - 1, character: satirlar[satirlar.length - 1].length } }, newText: yeni }];
      }
    }
    return undefined;
  };
  const bildirim = (yontem: string, p: any) => {
    if (yontem === 'textDocument/didOpen') cozumleVeBildir(p.textDocument.uri, p.textDocument.text);
    else if (yontem === 'textDocument/didChange') { const son = p.contentChanges[p.contentChanges.length - 1]; if (son && typeof son.text === 'string') cozumleVeBildir(p.textDocument.uri, son.text); }
    else if (yontem === 'textDocument/didSave') {
      // Kaydedilen bir birim, onu kullanan açık programların tanılarını değiştirebilir
      for (const [uri, b] of belgeler) if (uri !== p.textDocument.uri) cozumleVeBildir(uri, b.metin);
    } else if (yontem === 'textDocument/didClose') { belgeler.delete(p.textDocument.uri); gonder({ method: 'textDocument/publishDiagnostics', params: { uri: p.textDocument.uri, diagnostics: [] } }); }
    else if (yontem === 'exit') process.exit(0);
  };

  let tampon = Buffer.alloc(0);
  giris.on('data', (parca: Buffer) => {
    tampon = Buffer.concat([tampon, parca]);
    for (;;) {
      const bs = tampon.indexOf('\r\n\r\n');
      if (bs < 0) return;
      const m = /Content-Length: *(\d+)/i.exec(tampon.subarray(0, bs).toString('ascii'));
      if (!m) { tampon = tampon.subarray(bs + 4); continue; }
      const uz = Number(m[1]);
      if (tampon.length < bs + 4 + uz) return;
      const govde = tampon.subarray(bs + 4, bs + 4 + uz).toString('utf-8');
      tampon = tampon.subarray(bs + 4 + uz);
      let ileti: any;
      try { ileti = JSON.parse(govde); } catch { continue; }
      if (ileti.id !== undefined && ileti.method) {
        try {
          const sonuc = istek(ileti.method, ileti.params ?? {});
          if (sonuc === undefined) gonder({ id: ileti.id, error: { code: -32601, message: `Desteklenmeyen istek: ${ileti.method}` } });
          else gonder({ id: ileti.id, result: sonuc });
        } catch (e: any) { gonder({ id: ileti.id, error: { code: -32603, message: String(e && e.message || e) } }); }
      } else if (ileti.method) {
        try { bildirim(ileti.method, ileti.params ?? {}); } catch { /* bildirimlere yanıt verilmez */ }
      }
    }
  });
  giris.on('end', () => process.exit(0));
  void fs;
}
