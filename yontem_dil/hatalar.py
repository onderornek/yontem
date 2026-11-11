"""Yöntem dili hata sınıfları."""


class YontemHatasi(Exception):
    """Çalışma zamanı hatası. `deger`, `fırlat` ile atılan kullanıcı değeridir."""

    def __init__(self, mesaj, satir=None, dosya=None, deger=None):
        super().__init__(mesaj)
        self.mesaj = mesaj
        self.satir = satir
        self.dosya = dosya
        self.deger = deger

    def __str__(self):
        yer = []
        if self.dosya:
            yer.append(str(self.dosya))
        if self.satir:
            yer.append(f"satır {self.satir}")
        on = f"[{', '.join(yer)}] " if yer else ""
        return on + self.mesaj


class SozdizimHatasi(YontemHatasi):
    pass


class Sinyal(BaseException):
    """Akış denetimi sinyalleri (hata değildir)."""


class DonSinyali(Sinyal):
    def __init__(self, deger):
        self.deger = deger


class KirSinyali(Sinyal):
    pass


class DevamSinyali(Sinyal):
    pass


class DurSinyali(Sinyal):
    def __init__(self, kod=0):
        self.kod = kod
