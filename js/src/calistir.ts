// Derle + çalıştır (Node ve tarayıcı için ortak)
import { $, sifirla, Konak } from './calisma/cekirdek';
import { Y } from './calisma/yerlesik';
import './calisma/yz';
import './calisma/kuantum';
import './calisma/donanim';
import './calisma/mesale';
import './calisma/pencere';
import './calisma/mobil';
import './calisma/guvenlik';
import './calisma/takvim';
import './calisma/desen';
import './calisma/ag';
import './calisma/veritabani';
import './calisma/sunucu';
import { Uretici, DerlemeSecenekleri } from './uretici';
import { YontemHatasi, SozdizimHatasi, DurSinyali, TipHatalari } from './hatalar';

export { YontemHatasi, SozdizimHatasi, DurSinyali, TipHatalari, Konak };

export function yerelBirim(ad: string): Record<string, any> | null {
  const f = $.yerelBirimler.get(ad);
  return f ? f() : null;
}

export function derle(kaynak: string, dosya: string, birimBul: DerlemeSecenekleri['birimBul'], aranan?: string[], kati?: DerlemeSecenekleri['kati']): string {
  const u = new Uretici({ birimBul, yerelBirim, yerlesikler: Y, aranan, kati });
  return u.programDerle(kaynak, dosya);
}

/** Derlenmiş kodu çalıştırır; çıkış kodunu döndürür. Hata mesajını konak.hata ile bildirir. */
export function kodCalistir(kod: string, konak: Konak & { hata?(m: string): void }): number {
  sifirla(konak, []);
  try {
    new Function('$', 'Y', kod)($, Y);
    return 0;
  } catch (e: any) {
    return hataIsle(e, konak);
  }
}

export function hataIsle(e: any, konak: { hata?(m: string): void }): number {
  if (e instanceof DurSinyali) return typeof e.kod === 'number' ? e.kod : 0;
  if (e instanceof TipHatalari) {
    const sirali = [...e.tanilar].sort((a, b) => (a.dosya ?? '') < (b.dosya ?? '') ? -1 : (a.dosya ?? '') > (b.dosya ?? '') ? 1 : (a.satir ?? 0) - (b.satir ?? 0));
    for (const t of sirali) konak.hata?.(`Tip hatası ${new YontemHatasi(t.mesaj, t.satir, t.dosya).metin()}`);
    konak.hata?.(`${sirali.length} tip hatası bulundu; program çalıştırılmadı.`);
    return 2;
  }
  if (e instanceof SozdizimHatasi) { konak.hata?.(`Sözdizimi hatası ${e.metin()}`); return 2; }
  if (e instanceof YontemHatasi) { konak.hata?.(`Çalışma hatası ${e.metin()}`); return 1; }
  if (e instanceof RangeError && /call stack/i.test(e.message)) { konak.hata?.(`Çalışma hatası [satır ${$.L}] Yığın taşması (çok derin özyineleme)`); return 1; }
  konak.hata?.(`Çalışma hatası [satır ${$.L}] İç hata: ${e && e.stack ? e.stack : e}`);
  return 1;
}
