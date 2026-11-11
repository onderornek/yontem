// Yöntem hata sınıfları

export class YontemHatasi extends Error {
  mesaj: string;
  satir: number | null;
  dosya: string | null;
  deger: any;
  constructor(mesaj: string, satir: number | null = null, dosya: string | null = null, deger: any = null) {
    super(mesaj);
    this.mesaj = mesaj;
    this.satir = satir;
    this.dosya = dosya;
    this.deger = deger;
  }
  metin(): string {
    const yer: string[] = [];
    if (this.dosya) yer.push(this.dosya);
    if (this.satir) yer.push(`satır ${this.satir}`);
    return (yer.length ? `[${yer.join(', ')}] ` : '') + this.mesaj;
  }
}

export class SozdizimHatasi extends YontemHatasi {}

export interface Tani { mesaj: string; satir: number | null; dosya: string | null }
/** Katı kipte derleme zamanı tip denetiminin bulduğu hatalar (hepsi birden bildirilir) */
export class TipHatalari extends YontemHatasi {
  constructor(public tanilar: Tani[]) { super(tanilar[0].mesaj, tanilar[0].satir, tanilar[0].dosya); }
}

/** Durdur() çağrısı */
export class DurSinyali {
  constructor(public kod: number = 0) {}
}
