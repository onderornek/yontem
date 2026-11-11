// Yöntem VS Code eklentisi.
// Sözdizimi renklendirme ve kod parçacıkları bildirimseldir (package.json). Bu dosya çalıştırma komutlarını
// ve dil sunucusu istemcisini içerir: 'yontem dil-sunucusu' sürecini başlatır, belgeleri ona bildirir ve
// tanıları, tamamlamayı, imza ipuçlarını, tanıma gitmeyi, ana hattı ve biçimlendirmeyi VS Code'a bağlar.
// Dış bağımlılığı yoktur. (c) 2026 Önder Örnek, MIT lisansı
const vscode = require('vscode');
const path = require('path');
const { spawn } = require('child_process');

function ucbirim() {
  return vscode.window.terminals.find(t => t.name === 'Yöntem') || vscode.window.createTerminal('Yöntem');
}
function tirnakla(s) {
  return process.platform === 'win32' ? `"${s.replace(/"/g, '\\"')}"` : `'${s.replace(/'/g, `'\\''`)}'`;
}
function komut() {
  return vscode.workspace.getConfiguration('yontem').get('komut') || 'yontem';
}

// ---------------------------------------------------------------- dil sunucusu istemcisi (LSP, stdio)
class Istemci {
  constructor(komutSatiri, taniAl, kapaninca) {
    this.kimlik = 0;
    this.bekleyen = new Map();
    this.tampon = Buffer.alloc(0);
    this.canli = true;
    this.surec = spawn(`${komutSatiri} dil-sunucusu`, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const bitir = (neden) => {
      if (!this.canli) return;
      this.canli = false;
      for (const coz of this.bekleyen.values()) coz(null);
      this.bekleyen.clear();
      kapaninca(neden);
    };
    let hataMetni = '';
    this.surec.stderr.on('data', (d) => { hataMetni = (hataMetni + d).slice(-500); });
    this.surec.on('error', (e) => bitir(e.message));
    this.surec.on('exit', (kod) => bitir(kod ? (hataMetni.trim().split('\n').pop() || `çıkış kodu ${kod}`) : ''));
    this.surec.stdin.on('error', () => {});
    this.surec.stdout.on('data', (d) => {
      this.tampon = Buffer.concat([this.tampon, d]);
      for (;;) {
        const bs = this.tampon.indexOf('\r\n\r\n');
        if (bs < 0) return;
        const m = /Content-Length: *(\d+)/i.exec(this.tampon.subarray(0, bs).toString('ascii'));
        if (!m) { this.tampon = this.tampon.subarray(bs + 4); continue; }
        const uz = Number(m[1]);
        if (this.tampon.length < bs + 4 + uz) return;
        let ileti = null;
        try { ileti = JSON.parse(this.tampon.subarray(bs + 4, bs + 4 + uz).toString('utf-8')); } catch (e) { /* bozuk ileti atlanır */ }
        this.tampon = this.tampon.subarray(bs + 4 + uz);
        if (!ileti) continue;
        if (ileti.id !== undefined && this.bekleyen.has(ileti.id)) { this.bekleyen.get(ileti.id)(ileti.result === undefined ? null : ileti.result); this.bekleyen.delete(ileti.id); }
        else if (ileti.method === 'textDocument/publishDiagnostics') taniAl(ileti.params);
      }
    });
    this.hazir = this.istek('initialize', { processId: process.pid, rootUri: null, capabilities: {} }).then((r) => { this.bildir('initialized', {}); return r; });
  }
  yaz(ileti) {
    if (!this.canli) return;
    const govde = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...ileti }), 'utf-8');
    try { this.surec.stdin.write(`Content-Length: ${govde.length}\r\n\r\n`); this.surec.stdin.write(govde); } catch (e) { /* süreç kapanmış */ }
  }
  istek(method, params) {
    if (!this.canli) return Promise.resolve(null);
    return new Promise((coz) => { const id = ++this.kimlik; this.bekleyen.set(id, coz); this.yaz({ id, method, params }); });
  }
  bildir(method, params) { this.yaz({ method, params }); }
  kapat() {
    if (!this.canli) return;
    this.canli = false;
    try { this.surec.kill(); } catch (e) { /* zaten kapalı */ }
  }
}

function dilSunucusu(context) {
  const tanilar = vscode.languages.createDiagnosticCollection('yontem');
  context.subscriptions.push(tanilar);
  let istemci = null, uyarildi = false;
  const zamanlayicilar = new Map();
  const bizim = (belge) => belge.languageId === 'yontem';
  const aralik = (r) => new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);

  const baslat = () => {
    if (istemci && istemci.canli) return istemci;
    istemci = new Istemci(komut(), (p) => {
      tanilar.set(vscode.Uri.parse(p.uri), p.diagnostics.map((t) => {
        const d = new vscode.Diagnostic(aralik(t.range), t.message, t.severity === 2 ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error);
        d.source = 'yöntem';
        return d;
      }));
    }, (neden) => {
      tanilar.clear();
      if (neden && !uyarildi) {
        uyarildi = true;
        vscode.window.showWarningMessage(`Yöntem dil sunucusu başlatılamadı (${neden}). Renklendirme çalışmaya devam eder; hata gösterimi ve tamamlama için 'yontem.komut' ayarını denetleyin.`);
      }
    });
    for (const belge of vscode.workspace.textDocuments) if (bizim(belge)) ac(belge);
    return istemci;
  };
  const ac = (belge) => istemci.bildir('textDocument/didOpen', { textDocument: { uri: belge.uri.toString(), languageId: 'yontem', version: belge.version, text: belge.getText() } });
  const degisti = (belge) => istemci && istemci.bildir('textDocument/didChange', { textDocument: { uri: belge.uri.toString(), version: belge.version }, contentChanges: [{ text: belge.getText() }] });
  // Sunucu son gönderilen metni bilmeli: bekleyen (gecikmeli) değişiklik varsa istekten önce gönderilir
  const esitle = (belge) => {
    const a = belge.uri.toString();
    if (zamanlayicilar.has(a)) { clearTimeout(zamanlayicilar.get(a)); zamanlayicilar.delete(a); degisti(belge); }
  };
  const sor = async (belge, method, params) => {
    const i = baslat();
    await i.hazir;
    esitle(belge);
    return i.istek(method, { textDocument: { uri: belge.uri.toString() }, ...params });
  };

  if (vscode.workspace.textDocuments.some(bizim)) baslat();
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((b) => { if (bizim(b)) { if (istemci && istemci.canli) ac(b); else baslat(); } }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (!bizim(e.document) || !istemci) return;
      const a = e.document.uri.toString();
      clearTimeout(zamanlayicilar.get(a));
      zamanlayicilar.set(a, setTimeout(() => { zamanlayicilar.delete(a); degisti(e.document); }, 200));
    }),
    vscode.workspace.onDidSaveTextDocument((b) => { if (bizim(b) && istemci) { esitle(b); istemci.bildir('textDocument/didSave', { textDocument: { uri: b.uri.toString() } }); } }),
    vscode.workspace.onDidCloseTextDocument((b) => { if (bizim(b) && istemci) { istemci.bildir('textDocument/didClose', { textDocument: { uri: b.uri.toString() } }); tanilar.delete(b.uri); } }),
    vscode.workspace.onDidChangeConfiguration((e) => { if (e.affectsConfiguration('yontem.komut')) { if (istemci) istemci.kapat(); istemci = null; uyarildi = false; if (vscode.workspace.textDocuments.some(bizim)) baslat(); } }),
    { dispose: () => { if (istemci) istemci.kapat(); } },

    vscode.languages.registerCompletionItemProvider('yontem', {
      async provideCompletionItems(belge, konum) {
        const r = await sor(belge, 'textDocument/completion', { position: { line: konum.line, character: konum.character } });
        return (r || []).map((o) => { const k = new vscode.CompletionItem(o.label, o.kind - 1); k.detail = o.detail; return k; });
      },
    }, '.'),
    vscode.languages.registerHoverProvider('yontem', {
      async provideHover(belge, konum) {
        const r = await sor(belge, 'textDocument/hover', { position: { line: konum.line, character: konum.character } });
        return r ? new vscode.Hover(new vscode.MarkdownString(r.contents.value)) : null;
      },
    }),
    vscode.languages.registerDefinitionProvider('yontem', {
      async provideDefinition(belge, konum) {
        const r = await sor(belge, 'textDocument/definition', { position: { line: konum.line, character: konum.character } });
        return r ? new vscode.Location(vscode.Uri.parse(r.uri), aralik(r.range)) : null;
      },
    }),
    vscode.languages.registerDocumentSymbolProvider('yontem', {
      async provideDocumentSymbols(belge) {
        const cevir = (s) => { const d = new vscode.DocumentSymbol(s.name, s.detail || '', s.kind - 1, aralik(s.range), aralik(s.selectionRange)); d.children = (s.children || []).map(cevir); return d; };
        return ((await sor(belge, 'textDocument/documentSymbol', {})) || []).map(cevir);
      },
    }),
    vscode.languages.registerDocumentFormattingEditProvider('yontem', {
      async provideDocumentFormattingEdits(belge) {
        const r = await sor(belge, 'textDocument/formatting', { options: { tabSize: 2, insertSpaces: true } });
        return (r || []).map((e) => vscode.TextEdit.replace(aralik(e.range), e.newText));
      },
    }),
  );
}

function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('yontem.calistir', async () => {
    const e = vscode.window.activeTextEditor;
    if (!e || e.document.languageId !== 'yontem') { vscode.window.showWarningMessage('Etkin dosya bir Yöntem programı (.y) değil.'); return; }
    if (e.document.isUntitled) { vscode.window.showWarningMessage('Önce dosyayı kaydedin.'); return; }
    await e.document.save();
    const t = ucbirim();
    t.show(true);
    t.sendText(`${komut()} ${tirnakla(e.document.fileName)}`);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('yontem.test', () => {
    const e = vscode.window.activeTextEditor;
    const klasor = (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath)
      || (e && path.dirname(e.document.fileName));
    if (!klasor) { vscode.window.showWarningMessage('Açık bir klasör yok.'); return; }
    const t = ucbirim();
    t.show(true);
    t.sendText(`cd ${tirnakla(klasor)}`);
    t.sendText(`${komut()} test`);
  }));
  dilSunucusu(context);
  hataAyiklayici(context);
}

// ---------------------------------------------------------------- hata ayıklayıcı
// Ayıklama bağdaştırıcısı 'yontem ayikla --dap' komutudur (Debug Adapter Protocol, standart girdi/çıktı).
function hataAyiklayici(context) {
  const varsayilan = (dosya) => ({ type: 'yontem', request: 'launch', name: 'Yöntem: ' + path.basename(dosya), program: dosya });
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory('yontem', {
      createDebugAdapterDescriptor() {
        // 'yontem.komut' birden çok sözcük olabilir: node "/yol/cli.js"
        const parcalar = (komut().match(/"[^"]*"|'[^']*'|\S+/g) || ['yontem']).map(p => p.replace(/^(["'])(.*)\1$/, '$2'));
        return new vscode.DebugAdapterExecutable(parcalar[0], [...parcalar.slice(1), 'ayikla', '--dap']);
      },
    }),
    vscode.debug.registerDebugConfigurationProvider('yontem', {
      // launch.json yokken F5: etkin .y dosyasını ayıkla
      resolveDebugConfiguration(klasor, ayar) {
        if (!ayar.type && !ayar.request && !ayar.name) {
          const e = vscode.window.activeTextEditor;
          if (!e || e.document.languageId !== 'yontem') { vscode.window.showWarningMessage('Etkin dosya bir Yöntem programı (.y) değil.'); return undefined; }
          ayar = varsayilan(e.document.fileName);
        }
        if (!ayar.program) { vscode.window.showWarningMessage("Başlatma ayarında 'program' yok."); return undefined; }
        if (!ayar.cwd) ayar.cwd = klasor ? klasor.uri.fsPath : path.dirname(ayar.program);
        return ayar;
      },
    }),
    vscode.commands.registerCommand('yontem.ayikla', async () => {
      const e = vscode.window.activeTextEditor;
      if (!e || e.document.languageId !== 'yontem') { vscode.window.showWarningMessage('Etkin dosya bir Yöntem programı (.y) değil.'); return; }
      if (e.document.isUntitled) { vscode.window.showWarningMessage('Önce dosyayı kaydedin.'); return; }
      await e.document.save();
      await vscode.debug.startDebugging(vscode.workspace.getWorkspaceFolder(e.document.uri), varsayilan(e.document.fileName));
    }),
  );
}
function deactivate() {}
module.exports = { activate, deactivate };
