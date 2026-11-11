import math
N = 120


def A(i, j):
    return 1.0 / ((i + j) * (i + j + 1) / 2 + i + 1)


def a_carp(giris, cikis):
    for i in range(N):
        s = 0.0
        for j in range(N):
            s += A(i, j) * giris[j]
        cikis[i] = s


def at_carp(giris, cikis):
    for i in range(N):
        s = 0.0
        for j in range(N):
            s += A(j, i) * giris[j]
        cikis[i] = s


def ata_carp(giris, cikis, ara):
    a_carp(giris, ara)
    at_carp(ara, cikis)


u = [1.0] * N
v = [0.0] * N
ara = [0.0] * N
for _ in range(10):
    ata_carp(u, v, ara)
    ata_carp(v, u, ara)
vBv = vv = 0.0
for i in range(N):
    vBv += u[i] * v[i]
    vv += v[i] * v[i]
print(f"{math.sqrt(vBv / vv):.9f}")
