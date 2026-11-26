"""'üret' kullanan fonksiyonların döndürdüğü akış.

Akış tembeldir: fonksiyon çağrılınca yalnızca parametreler bağlanır; gövde, akış yinelenmeye başlayınca
çalışır ve her 'üret'te durup değeri verir. Gövde bir Python üreteci olarak yürür: 'üret' içeren deyimler
yorumlayıcının üreteç sürümleriyle (Yorumlayici.yurut_g), ötekiler her zamanki gibi çalışır. JavaScript
derleyicisi aynı anlamı JavaScript üreteçleriyle verir (js/src/calisma/cekirdek.ts, Akis).

Bir döngü akışı bitmeden bırakırsa ('kır', 'dön' ya da hata) akış kapatılır: gövde beklediği 'üret'ten
sürmez, ama 'sonunda' blokları çalışır. Akışın gövdesindeki ağ istekleri bir 'aynı anda' gövdesinde bile
beklemeden gönderilir (yerleşiklerin çağırdığı fonksiyonlar gibi).
"""
from .hatalar import YontemHatasi


class Akis:
    TUR_ADI = 'akış'
    __slots__ = ('y', 'ad', 'g', 'calisiyor')

    def __init__(self, y, ad, g):
        self.y = y
        self.ad = ad
        self.g = g                  # gövdenin Python üreteci
        self.calisiyor = False

    def __str__(self):
        return f'<akış {self.ad}>'

    def __iter__(self):
        return self

    def __next__(self):
        if self.calisiyor:
            raise YontemHatasi(f"'{self.ad}' akışı kendi gövdesinde yinelenemez")
        self.calisiyor = True
        try:
            if self.y._es_sayi:
                return self.y._beklemeden(next, self.g)
            return next(self.g)
        finally:
            self.calisiyor = False

    def kapat(self):
        """Döngü akışı bitmeden bıraktı: gövde 'üret' noktasından sonlandırılır ('sonunda' blokları çalışır)."""
        if self.calisiyor:
            return
        self.calisiyor = True
        try:
            if self.y._es_sayi:
                self.y._beklemeden(self.g.close)
            else:
                self.g.close()
        except RuntimeError:        # kapatılırken 'sonunda' içinde yine üretti: JavaScript'te de akış askıda kalır
            pass
        finally:
            self.calisiyor = False

    def yinele_(self):
        return list(self)
