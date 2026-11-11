N = 40000
sozcukler = ['elma', 'armut', 'kiraz', 'erik', 'incir', 'üzüm', 'nar', 'ayva', 'dut', 'şeftali',
             'karpuz', 'kavun', 'muz', 'limon', 'portakal', 'mandalina']
parcalar = []
tohum = 7
for _ in range(N):
    tohum = (tohum * 16807) % 2147483647
    k = (tohum % 1000) % 16
    if k > 7:
        k = (k * k) % 16
    parcalar.append(sozcukler[k])
metin = ' '.join(parcalar)
sayim = {}
for s in metin.split(' '):
    sayim[s] = sayim.get(s, 0) + 1
print(f"Toplam sözcük: {len(metin.split(' '))}, farklı: {len(sayim)}")
kullanildi = set()
for _ in range(5):
    en_sayi, en_iyi = -1, ''
    for s in sozcukler:
        if s in sayim and s not in kullanildi and sayim[s] > en_sayi:
            en_sayi, en_iyi = sayim[s], s
    kullanildi.add(en_iyi)
    print(f"{en_iyi} {en_sayi}")
