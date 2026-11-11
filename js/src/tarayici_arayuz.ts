// Tarayıcı tarafı: Pencere ve Mobil birimlerinin işlemlerini DOM'a ve tarayıcı API'lerine uygular.
// Oyun alanında işlemler Web Worker'dan mesajla gelir; paketlenmiş uygulamada aynı iş parçacığında çağrılır.
// Kullanıcı olayları geriGonder('olay' | 'mobil', veri) ile çalışma zamanına döner.

declare const document: any;
declare const window: any;
declare const navigator: any;
declare const localStorage: any;

export type GeriGonder = (tur: 'olay' | 'mobil', veri: any) => void;

const STIL = `
.y-uygulama{--y-vurgu:#0B7A75;--y-murekkep:#0F1B2D;--y-soluk:#475569;--y-cizgi:#CBD5E1;--y-zemin:#FFFFFF;--y-yuzey:#F5F7FA;
  font:16px/1.5 Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--y-murekkep);background:var(--y-zemin);
  display:flex;flex-direction:column;gap:14px;padding:20px 20px 72px;box-sizing:border-box;min-height:100%;position:relative}
.y-uygulama *{box-sizing:border-box}
.y-baslik{margin:0 0 4px;font:700 24px/1.2 'Space Grotesk',Inter,system-ui,sans-serif;letter-spacing:-0.01em}
.y-baslik:empty{display:none}
.y-dikey{display:flex;flex-direction:column;gap:12px}
.y-yatay{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.y-yatay>.y-giris,.y-yatay>.y-secim{flex:1 1 120px;min-width:0}
.y-etiket{white-space:pre-wrap;overflow-wrap:anywhere}
.y-dugme{font:inherit;font-weight:600;min-height:44px;padding:10px 18px;border-radius:12px;border:0;background:var(--y-vurgu);color:#fff;cursor:pointer;
  touch-action:manipulation;transition:filter .12s,transform .06s}
.y-dugme:hover{filter:brightness(1.08)}.y-dugme:active{transform:scale(.98)}
.y-dugme:disabled{background:var(--y-cizgi);color:var(--y-soluk);cursor:default;filter:none;transform:none}
.y-giris,.y-secim{font:inherit;min-height:44px;padding:10px 12px;border:1px solid var(--y-cizgi);border-radius:12px;background:var(--y-zemin);color:inherit;width:100%}
.y-giris:focus,.y-secim:focus{outline:2px solid var(--y-vurgu);outline-offset:1px;border-color:transparent}
.y-onay{display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer}
.y-onay input{width:22px;height:22px;accent-color:var(--y-vurgu);margin:0}
.y-onay.y-kapali{color:var(--y-soluk);cursor:default}
.y-kaydirici{width:100%;accent-color:var(--y-vurgu);min-height:32px}
.y-tuval{max-width:100%;height:auto;border-radius:12px;background:var(--y-zemin);border:1px solid var(--y-cizgi);touch-action:none;display:block}
.y-gizli{display:none!important}
.y-duyuru{position:absolute;bottom:16px;left:50%;max-width:88%;width:max-content;background:var(--y-murekkep);color:#fff;padding:10px 16px;border-radius:12px;
  font-size:14px;box-shadow:0 10px 24px -12px rgba(15,27,45,.6);opacity:0;transform:translate(-50%,8px);transition:opacity .2s,transform .2s;pointer-events:none}
.y-duyuru.y-acik{opacity:1;transform:translate(-50%,0)}
.y-izin{font:inherit;font-size:14px;min-height:40px;padding:8px 14px;border-radius:10px;border:1px dashed var(--y-vurgu);background:transparent;color:var(--y-vurgu);cursor:pointer}
.y-titrek{animation:y-titre .25s linear 2}
@keyframes y-titre{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@media (prefers-reduced-motion:reduce){.y-titrek{animation:none}}
`;

let stilEklendi = false;
function stilEkle() {
  if (stilEklendi) return;
  stilEklendi = true;
  const s = document.createElement('style');
  s.textContent = STIL;
  document.head.appendChild(s);
}

/** Cihaz bilgisi ve kalıcı depo (çalışma zamanına başlangıçta verilir). */
export function cihazBilgisi(depoOnEki: string) {
  const ua = navigator.userAgent || '';
  const platform = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : 'tarayıcı';
  const depo: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const a = localStorage.key(i);
      if (a && a.startsWith(depoOnEki)) depo[a.slice(depoOnEki.length)] = localStorage.getItem(a);
    }
  } catch (e) { /* depo kullanılamıyor */ }
  const dikey = window.matchMedia ? window.matchMedia('(orientation: portrait)').matches : window.innerHeight >= window.innerWidth;
  return {
    platform, dokunmatik: (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window,
    genislik: window.innerWidth, yukseklik: window.innerHeight, yon: dikey ? 'dikey' : 'yatay', depo,
  };
}

export class ArayuzGorunumu {
  kok: any;
  baslikEl: any;
  el = new Map<number, any>();
  tur = new Map<number, string>();
  tuval = new Map<number, { komutlar: any[][]; renk: string }>();
  duyuruEl: any;
  duyuruZaman: any = null;
  hareketDinleyici: any = null;
  yonDinleyici: any = null;

  constructor(public kap: any, public geri: GeriGonder, public depoOnEki = 'yontem-depo:') {
    stilEkle();
    kap.innerHTML = '';
    this.kok = document.createElement('div');
    this.kok.className = 'y-uygulama';
    this.baslikEl = document.createElement('h1');
    this.baslikEl.className = 'y-baslik';
    this.kok.appendChild(this.baslikEl);
    const govde = document.createElement('div');
    govde.className = 'y-dikey';
    this.kok.appendChild(govde);
    this.el.set(0, govde);
    this.tur.set(0, 'dikey');
    this.duyuruEl = document.createElement('div');
    this.duyuruEl.className = 'y-duyuru';
    this.duyuruEl.setAttribute('role', 'status');
    this.kok.appendChild(this.duyuruEl);
    kap.appendChild(this.kok);
  }

  /** Uygulamayı kapat: algılayıcı dinleyicilerini kaldır */
  kapat() {
    if (this.hareketDinleyici) window.removeEventListener('devicemotion', this.hareketDinleyici);
    if (this.yonDinleyici) window.removeEventListener('resize', this.yonDinleyici);
    this.hareketDinleyici = this.yonDinleyici = null;
  }

  duyur(m: string, sure = 2600) {
    this.duyuruEl.textContent = m;
    this.duyuruEl.classList.add('y-acik');
    clearTimeout(this.duyuruZaman);
    this.duyuruZaman = setTimeout(() => this.duyuruEl.classList.remove('y-acik'), sure);
  }

  uygula(op: any) {
    const f = (this as any)['op_' + op.op];
    if (f) f.call(this, op);
  }

  // ------------------------------------------------------------ Pencere
  op_baslik(op: any) {
    this.baslikEl.textContent = op.metin;
    try { if (this.kap === document.body || this.kap.dataset.baslikAyarla === 'evet') document.title = op.metin; } catch (e) { /* yok */ }
  }
  op_olustur(op: any) {
    const o = op.oz;
    let e: any;
    switch (op.tur) {
      case 'etiket': e = document.createElement('div'); e.className = 'y-etiket'; e.textContent = o.metin; break;
      case 'dugme': e = document.createElement('button'); e.type = 'button'; e.className = 'y-dugme'; e.textContent = o.metin; break;
      case 'giris': e = document.createElement('input'); e.type = 'text'; e.className = 'y-giris'; e.placeholder = o.ipucu; e.value = o.metin;
        e.setAttribute('aria-label', o.ipucu || 'Metin'); break;
      case 'onay': {
        e = document.createElement('label'); e.className = 'y-onay';
        const k = document.createElement('input'); k.type = 'checkbox'; k.checked = o.isaretli;
        const s = document.createElement('span'); s.textContent = o.metin;
        e.appendChild(k); e.appendChild(s); break;
      }
      case 'kaydirici': e = document.createElement('input'); e.type = 'range'; e.className = 'y-kaydirici';
        e.min = String(o.enaz); e.max = String(o.encok); e.value = String(o.deger); e.setAttribute('aria-label', 'Kaydırıcı'); break;
      case 'secim': e = document.createElement('select'); e.className = 'y-secim'; this.secenekKur(e, o.secenekler, o.secili); e.setAttribute('aria-label', 'Seçim'); break;
      case 'yatay': case 'dikey': e = document.createElement('div'); e.className = 'y-' + op.tur; break;
      case 'tuval': {
        e = document.createElement('canvas'); e.className = 'y-tuval';
        const oran = window.devicePixelRatio || 1;
        e.width = o.genislik * oran; e.height = o.yukseklik * oran;
        e.style.width = o.genislik + 'px';
        e.style.aspectRatio = `${o.genislik} / ${o.yukseklik}`;
        e.setAttribute('role', 'img'); e.setAttribute('aria-label', 'Tuval');
        this.tuval.set(op.id, { komutlar: [], renk: '#0F1B2D' });
        break;
      }
      default: return;
    }
    this.el.set(op.id, e);
    this.tur.set(op.id, op.tur);
    // Değer taşıyan bileşenlerin değişikliği, işleyici olmasa da çalışma zamanına bildirilir
    if (op.tur === 'giris' || op.tur === 'onay' || op.tur === 'kaydirici' || op.tur === 'secim') this.op_dinle({ id: op.id, olay: 'degis' });
    if (!o.etkin) this.op_ayarla({ id: op.id, ad: 'etkin', deger: false });
    if (!o.gorunur) this.op_ayarla({ id: op.id, ad: 'gorunur', deger: false });
  }
  secenekKur(e: any, s: string[], secili: number) {
    e.innerHTML = '';
    for (const m of s) { const op = document.createElement('option'); op.textContent = m; e.appendChild(op); }
    e.selectedIndex = secili;
  }
  op_ekle(op: any) { const u = this.el.get(op.ust), e = this.el.get(op.id); if (u && e) u.appendChild(e); }
  op_cikar(op: any) { const e = this.el.get(op.id); if (e && e.parentNode) e.parentNode.removeChild(e); }
  op_ayarla(op: any) {
    const e = this.el.get(op.id), t = this.tur.get(op.id), v = op.deger;
    if (!e) return;
    switch (op.ad) {
      case 'gorunur': e.classList.toggle('y-gizli', !v); break;
      case 'etkin':
        if (t === 'onay') { e.querySelector('input').disabled = !v; e.classList.toggle('y-kapali', !v); }
        else if ('disabled' in e) e.disabled = !v;
        break;
      case 'metin':
        if (t === 'onay') e.querySelector('span').textContent = v;
        else if (t === 'giris') { if (e.value !== v) e.value = v; }
        else e.textContent = v;
        break;
      case 'ipucu': e.placeholder = v; e.setAttribute('aria-label', v || 'Metin'); break;
      case 'isaretli': e.querySelector('input').checked = v; break;
      case 'deger': e.value = String(v); break;
      case 'secili': e.selectedIndex = v; break;
      case 'secenekler': this.secenekKur(e, v, e.selectedIndex); break;
    }
  }
  op_dinle(op: any) {
    const e = this.el.get(op.id), t = this.tur.get(op.id), id = op.id;
    if (!e || e.dataset.dinleniyor === op.olay) return;
    e.dataset.dinleniyor = op.olay;
    if (op.olay === 'tikla') e.addEventListener('click', () => this.geri('olay', { id, olay: 'tikla' }));
    else if (op.olay === 'degis') {
      if (t === 'giris') e.addEventListener('input', () => this.geri('olay', { id, olay: 'degis', veri: e.value }));
      else if (t === 'onay') e.querySelector('input').addEventListener('change', (ev: any) => this.geri('olay', { id, olay: 'degis', veri: ev.target.checked }));
      else if (t === 'kaydirici') e.addEventListener('input', () => this.geri('olay', { id, olay: 'degis', veri: Number(e.value) }));
      else if (t === 'secim') e.addEventListener('change', () => this.geri('olay', { id, olay: 'degis', veri: e.selectedIndex }));
    } else if (op.olay === 'dokun') {
      e.addEventListener('pointerdown', (ev: any) => {
        const r = e.getBoundingClientRect();
        const oran = window.devicePixelRatio || 1;
        const x = (ev.clientX - r.left) * (e.width / oran) / r.width, y = (ev.clientY - r.top) * (e.height / oran) / r.height;
        this.geri('olay', { id, olay: 'dokun', veri: [x, y] });
      });
    }
  }
  op_ciz(op: any) {
    const d = this.tuval.get(op.id);
    if (!d) return;
    d.komutlar.push(op.k);
    this.cizimYap(op.id, op.k);
  }
  op_cizTemizle(op: any) {
    const d = this.tuval.get(op.id), e = this.el.get(op.id);
    if (!d || !e) return;
    d.komutlar = []; d.renk = '#0F1B2D';
    e.getContext('2d').clearRect(0, 0, e.width, e.height);
  }
  cizimYap(id: number, k: any[]) {
    const e = this.el.get(id), d = this.tuval.get(id)!;
    const c = e.getContext('2d');
    const oran = window.devicePixelRatio || 1;
    c.save(); c.scale(oran, oran);
    c.strokeStyle = c.fillStyle = d.renk; c.lineWidth = 2; c.lineCap = 'round';
    switch (k[0]) {
      case 'renk': d.renk = k[1]; break;
      case 'cizgi': c.beginPath(); c.moveTo(k[1], k[2]); c.lineTo(k[3], k[4]); c.stroke(); break;
      case 'dikdortgen': if (k[5]) c.fillRect(k[1], k[2], k[3], k[4]); else c.strokeRect(k[1] + 1, k[2] + 1, k[3] - 2, k[4] - 2); break;
      case 'daire': c.beginPath(); c.arc(k[1], k[2], k[3], 0, Math.PI * 2); if (k[4]) c.fill(); else c.stroke(); break;
      case 'yazi': c.font = '14px Inter, system-ui, sans-serif'; c.fillText(k[3], k[1], k[2]); break;
    }
    c.restore();
  }

  // ------------------------------------------------------------ Mobil
  op_titresim(op: any) {
    try { if (navigator.vibrate) navigator.vibrate(op.ms); } catch (e) { /* desteklenmiyor */ }
    this.kok.classList.remove('y-titrek'); void this.kok.offsetWidth; this.kok.classList.add('y-titrek');
  }
  op_bildirim(op: any) {
    const m = op.baslik + (op.metin ? ' — ' + op.metin : '');
    this.duyur(m, 3600);
    try {
      const N = window.Notification;
      if (N && N.permission === 'granted' && document.hidden) new N(op.baslik, { body: op.metin });
    } catch (e) { /* yok */ }
  }
  op_paylas(op: any) {
    if (navigator.share) navigator.share({ text: op.metin }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(op.metin).then(() => this.duyur('Panoya kopyalandı'), () => this.duyur(op.metin));
    else this.duyur(op.metin);
  }
  op_konum(op: any) {
    if (!navigator.geolocation) { this.geri('mobil', { tur: 'konumhata', id: op.id, mesaj: 'bu tarayıcıda konum desteği yok' }); return; }
    navigator.geolocation.getCurrentPosition(
      (p: any) => this.geri('mobil', { tur: 'konum', id: op.id, veri: [p.coords.latitude, p.coords.longitude] }),
      (h: any) => this.geri('mobil', { tur: 'konumhata', id: op.id, mesaj: h && h.code === 1 ? 'izin verilmedi' : 'konum bulunamadı' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }
  op_hareket() {
    if (this.hareketDinleyici) return;
    let son = 0;
    this.hareketDinleyici = (ev: any) => {
      const a = ev.accelerationIncludingGravity;
      if (!a || a.x === null) return;
      const t = Date.now();
      if (t - son < 80) return;
      son = t;
      this.geri('mobil', { tur: 'hareket', veri: [a.x || 0, a.y || 0, a.z || 0] });
    };
    const D = window.DeviceMotionEvent;
    if (D && typeof D.requestPermission === 'function') {
      // iOS: izin bir kullanıcı dokunuşuyla istenmeli
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'y-izin'; b.textContent = 'Hareket algılayıcısına izin ver';
      b.addEventListener('click', () => {
        D.requestPermission().then((s: string) => {
          if (s === 'granted') { window.addEventListener('devicemotion', this.hareketDinleyici); b.remove(); }
          else b.textContent = 'Hareket izni verilmedi';
        }).catch(() => { b.textContent = 'Hareket izni alınamadı'; });
      });
      this.kok.insertBefore(b, this.duyuruEl);
    } else window.addEventListener('devicemotion', this.hareketDinleyici);
  }
  op_yon() {
    if (this.yonDinleyici) return;
    let son = cihazBilgisi('').yon;
    this.yonDinleyici = () => {
      const y = cihazBilgisi('').yon;
      if (y !== son) { son = y; this.geri('mobil', { tur: 'yon', veri: y }); }
    };
    window.addEventListener('resize', this.yonDinleyici);
  }
  op_sakla(op: any) { try { localStorage.setItem(this.depoOnEki + op.anahtar, op.kod); } catch (e) { /* depo dolu ya da kapalı */ } }
  op_unut(op: any) { try { localStorage.removeItem(this.depoOnEki + op.anahtar); } catch (e) { /* yok */ } }
}
