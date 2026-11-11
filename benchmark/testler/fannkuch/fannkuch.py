N = 8
p = list(range(N))
q = [0] * N
c = [0] * N
en_cok = sagla = sira = 0
bitti = False
while not bitti:
    for i in range(N):
        q[i] = p[i]
    cevirme = 0
    k = q[0]
    while k != 0:
        i, j = 0, k
        while i < j:
            q[i], q[j] = q[j], q[i]
            i += 1
            j -= 1
        cevirme += 1
        k = q[0]
    if cevirme > en_cok:
        en_cok = cevirme
    sagla += cevirme if sira % 2 == 0 else -cevirme
    sira += 1
    i = 1
    bitti = True
    while i < N:
        t = p[0]
        for j in range(i):
            p[j] = p[j + 1]
        p[i] = t
        c[i] += 1
        if c[i] <= i:
            bitti = False
            break
        c[i] = 0
        i += 1
print(sagla)
print(f"En çok çevirme: {en_cok}")
