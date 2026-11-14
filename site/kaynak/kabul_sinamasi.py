"""yontem.pro kabul sınaması: üretilen siteyi gerçek tarayıcıda (masaüstü, 390 ve 320 piksel) denetler.

Önce site üretilir ve .htaccess'i işleyen bir Apache ile 127.0.0.1:8081 adresinde sunulur:
    python3 site/kaynak/olustur.py && python3 site/kaynak/yerel_paket.py
    (DocumentRoot = site/yerel/yontem-site, AllowOverride All; mod_rewrite ve mod_headers açık)
Sonra:  python3 site/kaynak/kabul_sinamasi.py        (gerekenler: playwright, Chrome)
İstekler "X-Forwarded-Proto: https" başlığıyla gönderilir; böylece HTTPS yönlendirmesi sınamayı kesmez.
Denetimler inceleme bulgularının (YON-01 … YON-22) kabul ölçütlerine göre adlandırılmıştır.
"""
import asyncio, json
from playwright.async_api import async_playwright
T = 'http://127.0.0.1:8081'
sonuc = []
def kayit(kimlik, ad, tamam, ayrinti=''):
    sonuc.append((kimlik, ad, bool(tamam), str(ayrinti)[:150])); print(('GEÇTİ ' if tamam else 'KALDI ') + kimlik, '|', ad, '|', str(ayrinti)[:150])
async def bitti(pg):
    await pg.wait_for_function("!document.getElementById('durumyazi').textContent.startsWith('Çalış') && document.getElementById('durumyazi').textContent !== 'Hazır'", timeout=30000)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        csp = []
        async def yeni(w=1280, h=800, **kw):
            c = await b.new_context(viewport={'width': w, 'height': h}, extra_http_headers={'X-Forwarded-Proto': 'https'}, accept_downloads=True, **kw)
            pg = await c.new_page()
            pg.on('console', lambda m: csp.append(m.text) if 'Content Security Policy' in m.text or 'Content-Security-Policy' in m.text else None)
            pg.on('pageerror', lambda e: csp.append('SAYFA HATASI: ' + str(e)))
            return c, pg
        # ---- ana sayfa: mobil çağrı (YON-13), taşma, main/atla (YON-17), sekmeler (YON-18)
        for w, h in ((390, 844), (320, 640), (1280, 800)):
            c, pg = await yeni(w, h); await pg.goto(T + '/')
            kutu = await pg.locator('main a[href="dene/index.html"]').first.bounding_box()
            tasma = await pg.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            if w == 390: kayit('YON-13', f'{w}×{h}: deneme düğmesi ilk ekranda', kutu['y'] + kutu['height'] <= h, f"alt kenar {kutu['y'] + kutu['height']:.0f} px")
            kayit('YON-13', f'{w}×{h}: ana sayfada yatay taşma yok', tasma <= 0, f'taşma {tasma}')
            if w == 1280:
                fs = await pg.evaluate("getComputedStyle(document.querySelector('h1')).fontSize"); kayit('YON-13', 'masaüstünde başlık 64 px', fs == '64px', fs)
                await pg.keyboard.press('Tab')
                a = await pg.evaluate("[document.activeElement.className, document.activeElement.getBoundingClientRect().left >= 0]")
                kayit('YON-17', 'ilk Tab atlama bağlantısını görünür kılar', a == ['atla', True], a)
                await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
                kayit('YON-17', 'atlama bağlantısı ana içeriğe götürür', await pg.evaluate("location.hash === '#icerik' && !!document.querySelector('main#icerik')"))
                await pg.focus('#ornek-sekme-0'); await pg.keyboard.press('ArrowRight')
                d = await pg.evaluate("[document.activeElement.id, document.getElementById('ornek-sekme-1').getAttribute('aria-selected'), document.getElementById('ornek-panel-1').hidden, document.getElementById('ornek-panel-0').hidden, document.getElementById('ornek-sekme-0').tabIndex]")
                kayit('YON-18', 'ana sayfa: ok tuşu sekmeyi, odağı ve paneli birlikte değiştirir', d == ['ornek-sekme-1', 'true', False, True, -1], d)
            await c.close()
        # ---- kurulum sekmeleri
        c, pg = await yeni(); await pg.goto(T + '/kurulum.html')
        await pg.focus('[role=tab][aria-selected=true]'); once = await pg.evaluate('document.activeElement.id'); await pg.keyboard.press('ArrowRight')
        d = await pg.evaluate("[document.activeElement.id, document.activeElement.getAttribute('aria-selected'), document.getElementById(document.activeElement.getAttribute('aria-controls')).hidden]")
        kayit('YON-18', 'kurulum: ok tuşuyla sekme geçişi', d[0] != once and d[1] == 'true' and d[2] is False, d); await c.close()
        # ---- oyun alanı: temiz oturum (YON-10), taslak (YON-02)
        c, pg = await yeni(); await pg.goto(T + '/dene/'); await bitti(pg)
        ad = await pg.inner_text('#dosyaadi'); cikti = await pg.inner_text('#cikti')
        kayit('YON-10', 'temiz oturum kısa örnekle açılır', ad == 'ilk_program.y' and cikti.startswith('Merhaba, dünya!'), f'{ad}: {cikti[:30]!r}')
        n = await pg.evaluate("document.getElementById('kaynak').value.split('\\n').length"); kayit('YON-10', 'ilk örnek kısa', n <= 12, f'{n} satır')
        A = await pg.evaluate("ORNEKLER.findIndex(o => o.kimlik === 'kitap_ornekleri/b1')"); B = await pg.evaluate("ORNEKLER.findIndex(o => o.kimlik === 'kitap_ornekleri/c1')")
        await pg.select_option('#ornek', str(A)); await bitti(pg)
        await pg.focus('#kaynak'); await pg.keyboard.press('Control+End'); await pg.keyboard.type('\n{ benim düzenlemem }')
        duzenli = await pg.input_value('#kaynak')
        await pg.select_option('#ornek', str(B)); await bitti(pg)
        await pg.select_option('#ornek', str(A)); await bitti(pg)
        kayit('YON-02', 'A düzenle → B → A: düzenleme korunur', await pg.input_value('#kaynak') == duzenli and 'benim düzenlemem' in duzenli)
        kayit('YON-02', 'düzenlenen örnek listede işaretlenir', '●' in await pg.evaluate("document.getElementById('ornek').selectedOptions[0].textContent"))
        async with pg.expect_download() as di: await pg.click('#indir')
        d = await di.value; yol = await d.path(); kayit('YON-02', 'indirilen .y dosyası güncel kodu içerir', open(yol, encoding='utf8').read() == duzenli and d.suggested_filename == 'b1.y', d.suggested_filename)
        await pg.reload(); await bitti(pg)
        kayit('YON-02', 'sayfa yeniden açılınca taslak yerinde', await pg.input_value('#kaynak') == duzenli and await pg.inner_text('#dosyaadi') == 'b1.y')
        await pg.click('#sifirla'); ozgun = await pg.evaluate("ORNEKLER.find(o => o.kimlik === 'kitap_ornekleri/b1').kaynak")
        t1 = await pg.input_value('#kaynak') == ozgun; dugme = await pg.inner_text('#sifirla'); await pg.click('#sifirla')
        kayit('YON-02', 'özgün hâline dönme ve geri alma', t1 and dugme == 'Geri al' and await pg.input_value('#kaynak') == duzenli, dugme)
        # siteye dönüş (YON-11)
        baglar = await pg.evaluate("[...document.querySelectorAll('nav.gez a')].map(a => a.getAttribute('href'))")
        await pg.click('nav.gez a >> nth=1'); await pg.wait_for_load_state(); u1 = pg.url; await pg.go_back(); await bitti(pg)
        kayit('YON-11', 'oyun alanından siteye bağlantılar; dönüşte taslak korunur', u1.endswith('/ogren.html') and await pg.input_value('#kaynak') == duzenli, baglar)
        # arama (YON-12)
        await pg.fill('#ara', 'komşu'); ops = await pg.evaluate("[...document.getElementById('ornek').options].map(o => o.textContent)")
        await pg.fill('#ara', ''); hepsi = await pg.evaluate("document.getElementById('ornek').options.length")
        kayit('YON-12', 'ad ile arama ve süzgeci sıfırlama', any('K-en yakın komşu' in o for o in ops) and len(ops) <= 12 and hepsi == 110, f'{ops} / {hepsi}')
        await pg.fill('#ara', 'kuantum'); n = await pg.evaluate("document.getElementById('ornek').options.length"); await pg.fill('#ara', '')
        kayit('YON-12', 'konu ile arama (program metninde)', 5 <= n < 40, f'{n} seçenek')
        await pg.goto(T + '/dene/#ornek=ml_kilavuz/09_k_ortalamalar'); await pg.reload(); await bitti(pg)
        kayit('YON-12', 'sabit kimlikle bağlantı doğru örneği açar', await pg.inner_text('#dosyaadi') == '09_k_ortalamalar.y', await pg.inner_text('#dosyaadi'))
        basliklar = await pg.evaluate("ORNEKLER.map(o => o.baslik)")
        kotu = [x for x in basliklar if any(k in x for k in ('b 3h', 'I 2C', 'KEn', 'KOrt', 'GPTE', 'GPTM', 'GHZÖ', 'Ada Boost'))]
        kayit('YON-08', 'bozuk örnek başlığı kalmadı', not kotu and 'K-ortalamalar' in ' '.join(basliklar), kotu)
        # sekmeler ve klavye (YON-18, YON-19)
        await pg.focus('#sekme-cikti'); await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight')
        d = await pg.evaluate("[document.activeElement.id, document.getElementById('sekme-js').getAttribute('aria-selected'), document.getElementById('panel').getAttribute('aria-labelledby'), document.getElementById('sekme-cikti').tabIndex, document.getElementById('cikti').className]")
        kayit('YON-18', 'oyun alanı: ok tuşlarıyla sekme, odak ve panel tutarlı', d == ['sekme-js', 'true', 'sekme-js', -1, 'cikti js'], d)
        await pg.keyboard.press('Home')
        await pg.focus('#kaynak'); once = await pg.input_value('#kaynak'); await pg.keyboard.press('Tab'); girinti = await pg.input_value('#kaynak') != once and await pg.evaluate("document.activeElement.id") == 'kaynak'
        await pg.keyboard.press('Escape'); await pg.keyboard.press('Tab'); cikis = await pg.evaluate("document.activeElement.id")
        yardim = await pg.is_visible('#klavyeYardim')
        kayit('YON-19', 'Tab girinti ekler; Esc sonra Tab düzenleyiciden çıkarır; yardım görünür', girinti and cikis != 'kaynak' and yardim, f'odak: {cikis}')
        # CSP altında arayüz örneği de çalışsın
        P = await pg.evaluate("ORNEKLER.findIndex(o => o.kimlik === 'arayuz_ornekleri/01_sayac')"); await pg.select_option('#ornek', str(P)); await pg.wait_for_timeout(2500)
        kayit('YON-22', 'arayüz örneği (Worker + canlı uygulama) çalışır', await pg.evaluate("document.getElementById('uygulama').children.length > 0"), await pg.inner_text('#durumyazi'))
        await c.close()
        # ---- eski tek kayıtlı taslağın taşınması
        c, pg = await yeni(); eski = {'ad': 'hosgeldiniz.y', 'kaynak': "program Eski\nbaşla\n  yaz('eski taslak', 1)\nbitir.", 'girdi': ''}
        await pg.add_init_script("if (!localStorage.getItem('yontem-taslaklar') && !sessionStorage.getItem('k')) { sessionStorage.setItem('k', '1'); localStorage.setItem('yontem-taslak', %s); }" % json.dumps(json.dumps(eski)))
        await pg.goto(T + '/dene/'); await bitti(pg)
        d = await pg.evaluate("[document.getElementById('kaynak').value, localStorage.getItem('yontem-taslak'), document.getElementById('dosyaadi').textContent, document.getElementById('cikti').textContent]")
        kayit('YON-02', 'eski taslak veri kaybetmeden yeni yapıya taşınır', d[0] == eski['kaynak'] and d[1] is None and d[2] == 'hosgeldiniz.y' and 'eski taslak' in d[3], d[2:]); await c.close()
        # ---- depolama kullanılamıyor
        c, pg = await yeni(); await pg.add_init_script("Storage.prototype.setItem = function () { throw new Error('dolu'); };")
        await pg.goto(T + '/dene/'); await bitti(pg); await pg.focus('#kaynak'); await pg.keyboard.type(' ')
        kayit('YON-02', 'depolama kullanılamadığında anlaşılır uyarı', await pg.is_visible('#depoUyari'), (await pg.inner_text('#depoUyari'))[:60]); await c.close()
        # ---- mobil sonuç paneli (YON-03)
        for w, h in ((390, 844), (320, 640)):
            c, pg = await yeni(w, h, has_touch=True, is_mobile=True); await pg.goto(T + '/dene/'); await bitti(pg)
            await pg.fill('#kaynak', "program Uzun\nbaşla\n  1'den 200'e kadar her i için yaz('satır ' + i, 1)\nbitir."); await pg.dispatch_event('#kaynak', 'input')
            await pg.click('#calistir'); await bitti(pg); await pg.wait_for_timeout(700)
            o = await pg.evaluate("""(() => { const c = document.getElementById('cikti'), k = document.getElementById('sonucKarti').getBoundingClientRect();
              const d = [...document.querySelectorAll('header .denetim > *:not(label)')].map(e => e.getBoundingClientRect());
              let cak = 0; for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) if (d[i].left < d[j].right - 1 && d[j].left < d[i].right - 1 && d[i].top < d[j].bottom - 1 && d[j].top < d[i].bottom - 1) cak++;
              return { cikti: c.clientHeight, kayar: c.scrollHeight > c.clientHeight, tasma: document.documentElement.scrollWidth - innerWidth, cak, gorunur: k.top < innerHeight && k.bottom > 0, odak: document.activeElement.id }; })()""")
            kayit('YON-03', f'{w}×{h}: çıktı alanı okunabilir yükseklikte', o['cikti'] >= 180, f"{o['cikti']} px")
            kayit('YON-03', f'{w}×{h}: uzun çıktı kaydırılır, denetimler çakışmaz, yatay taşma yok', o['kayar'] and o['cak'] == 0 and o['tasma'] <= 0, o)
            kayit('YON-03', f'{w}×{h}: çalıştırınca sonuç görünür, odak beklenmedik yere gitmez', o['gorunur'] and o['odak'] in ('calistir', '', 'kaynak'), o['odak']); await c.close()
        # ---- içerik denetimleri
        c, pg = await yeni(); await pg.goto(T + '/'); ana = await pg.inner_text('body')
        kayit('YON-05', 'ana sayfada ortam destek tablosu ve ESP32 sınırı', 'Tipleri derleme sırasında belli olan alt küme' in ana and 'değiştirmeden bir mikrodenetleyiciye' not in ana)
        kayit('YON-07', 'hız iddiası kapsamıyla birlikte ve rapora bağlı', 'ESP32 kartında yapılmadı' in ana and await pg.locator('a[href="olcumler.html"]').count() == 1)
        kayit('YON-04', 'ana sayfa: 15 bölüm ve 3 ek', '15 bölüm ve 3 ek' in ana)
        await pg.goto(T + '/kitaplar/'); kt = (await pg.inner_text('body')).lower()
        kayit('YON-04', 'kitaplık: 15 bölüm + 3 ek, 10 bölüm + 3 ek', '15 bölüm + 3 ek' in kt and '10 bölüm + 3 ek' in kt and '19 bölüm' not in kt and '14 bölüm' not in kt)
        await pg.goto(T + '/kitaplar/programlamaya-giris.html'); kayit('YON-04', 'tek sayfalık kitap üst bilgisi aynı', '15 bölüm + 3 ek' in (await pg.inner_text('body')).lower())
        kayit('YON-14', 'kitap okuyucusunda logo dönüşü, Kitaplar, Öğren, Belgeler', await pg.evaluate("[...document.querySelectorAll('header a')].map(a => a.getAttribute('href')).join(' ')"), '')
        await pg.goto(T + '/olcumler.html'); kayit('YON-07', 'ölçüm sayfası açılır ve tabloları içerir', '1,9×' in await pg.inner_text('body') and await pg.locator('table').count() >= 4)
        await c.close(); await b.close()
        ihlal = [m for m in csp]
        kayit('YON-22', 'raporlama kipindeki politika altında konsolda ihlal ya da sayfa hatası yok', not ihlal, ihlal[:3])
    kalan = [s for s in sonuc if not s[2]]
    print(f'\n{len(sonuc) - len(kalan)}/{len(sonuc)} denetim geçti')
    json.dump(sonuc, open('/tmp/sinama.json', 'w'), ensure_ascii=False)
asyncio.run(main())
