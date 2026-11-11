import sys
sys.setrecursionlimit(10000)
N = 30000


def sirala(L, alt, ust):
    if alt >= ust:
        return
    mihver = L[(alt + ust) // 2]
    i, j = alt, ust
    while i <= j:
        while L[i] < mihver:
            i += 1
        while L[j] > mihver:
            j -= 1
        if i <= j:
            L[i], L[j] = L[j], L[i]
            i += 1
            j -= 1
    sirala(L, alt, j)
    sirala(L, i, ust)


L = []
tohum = 42
for _ in range(N):
    tohum = (tohum * 16807) % 2147483647
    L.append(tohum % 1000000)
sirala(L, 0, N - 1)
sagla = 0
for i in range(N):
    if i > 0:
        assert L[i - 1] <= L[i], 'sıralı değil'
    sagla = (sagla * 31 + L[i]) % 1000000007
print(f"{L[0]} {L[N // 2]} {L[N - 1]}")
print(sagla)
