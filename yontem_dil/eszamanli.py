"""'aynı anda' döngüsünün zamanlayıcısı.

Her gövde ayrı bir iş parçacığında çalışır, ama aynı anda yalnızca biri Yöntem kodu yürütür. Zamanlayıcı
turlarla ilerler: her turda bekleyen gövdeler sırayla bir sonraki ağ isteğine ya da sona kadar yürür,
ardından o turun istekleri birlikte (paralel) gönderilir. Sıra zamanlamaya değil yalnızca programa bağlıdır;
JavaScript derleyicisi (js/src/calisma/cekirdek.ts, $.ayniAnda) aynı turları üreteçlerle izler.

Bir gövde yalnızca açık çağrılar (f(x), n.m(x), çağrı deyimleri) üzerinden vardığı bir ağ isteğinde bekler;
otomatik çağrılar, kurucular, 'miras' ve yerleşiklerin çağırdığı fonksiyonlar beklemeden çalışır
(Govde.ver bayrağı, bkz. Yorumlayici._beklemeden).
"""
import threading
from concurrent.futures import ThreadPoolExecutor

from .hatalar import Sinyal

VARSAYILAN_SINIR = 16
YIGIN = 64 * 1024 * 1024


class IptalSinyali(Sinyal):
    """Başka bir gövde hata verdiğinde bekleyen gövdeleri sessizce sonlandırır ('sonunda' blokları çalışmaz)."""


class Govde:
    __slots__ = ('olay', 'geri', 'istek', 'yanit', 'bitti', 'hata', 'iptal', 'ver', 'is_')

    def __init__(self):
        self.olay = threading.Event()    # zamanlayıcı → gövde: yürü
        self.geri = threading.Event()    # gövde → zamanlayıcı: istek verdim ya da bittim
        self.istek = None
        self.yanit = None
        self.bitti = False
        self.hata = None
        self.iptal = False
        self.ver = True                  # şu an bir ağ isteğinde bekleyebilir mi
        self.is_ = None

    def bekle(self, istek):
        """Gövdenin iş parçacığında: isteği zamanlayıcıya verir, yanıt gelince sürer."""
        self.istek = istek
        self.geri.set()
        self.olay.wait()
        self.olay.clear()
        if self.iptal:
            raise IptalSinyali()
        return self.yanit


def _toplu(istekler):
    from .ag import _gonder
    if len(istekler) == 1:
        return [_gonder(*istekler[0])]
    with ThreadPoolExecutor(max_workers=len(istekler)) as h:
        return list(h.map(lambda i: _gonder(*i), istekler))


def calistir(y, ogeler, sinir, govde_fn):
    """govde_fn(oge) her öğe için bir gövdeyi (çağıranın iş parçacığında) yürütür."""

    def baslat(oge):
        g = Govde()

        def is_():
            y._es.g = g
            g.olay.wait()
            g.olay.clear()
            if g.iptal:
                return
            try:
                govde_fn(oge)
            except IptalSinyali:
                return
            except BaseException as e:      # noqa: B902 - hata ve sinyaller zamanlayıcıda yeniden atılır
                g.hata = e
            g.bitti = True
            g.geri.set()

        eski = threading.stack_size()
        threading.stack_size(YIGIN)
        try:
            g.is_ = threading.Thread(target=is_, daemon=True)
        finally:
            threading.stack_size(eski)
        g.is_.start()
        return g

    def iptal_et(govdeler):
        for g in govdeler:
            g.iptal = True
            g.olay.set()
        for g in govdeler:
            g.is_.join()

    aktif = []
    sira = 0
    y._es_sayi += 1
    try:
        while True:
            while len(aktif) < sinir and sira < len(ogeler):
                aktif.append(baslat(ogeler[sira]))
                sira += 1
            if not aktif:
                break
            for g in aktif:
                g.olay.set()
                g.geri.wait()
                g.geri.clear()
                if g.hata is not None:
                    g.is_.join()
                    iptal_et([b for b in aktif if b is not g])
                    raise g.hata
            aktif = [g for g in aktif if not g.bitti]
            if aktif:
                yanitlar = _toplu([g.istek for g in aktif])
                for g, yn in zip(aktif, yanitlar):
                    g.yanit = yn
                    g.istek = None
    finally:
        y._es_sayi -= 1
