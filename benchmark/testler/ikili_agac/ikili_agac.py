class Dugum:
    __slots__ = ('sol', 'sag')

    def __init__(self):
        self.sol = None
        self.sag = None


def kur(d):
    x = Dugum()
    if d > 0:
        x.sol = kur(d - 1)
        x.sag = kur(d - 1)
    return x


def say(x):
    if x.sol is None:
        return 1
    return 1 + say(x.sol) + say(x.sag)


for derinlik in range(4, 15):
    if derinlik % 2 == 0:
        toplam = 0
        for _ in range(4):
            toplam += say(kur(derinlik))
        print(f"derinlik {derinlik:2}: {toplam} düğüm")
