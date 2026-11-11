N = 100
A = [((i * 7) % 13) / 13.0 for i in range(N * N)]
B = [((i * 5) % 11) / 11.0 for i in range(N * N)]
C = [0.0] * (N * N)
for i in range(N):
    for j in range(N):
        s = 0.0
        for k in range(N):
            s += A[i * N + k] * B[k * N + j]
        C[i * N + j] = s
iz = 0.0
for i in range(N):
    iz += C[i * N + i]
print(f"{iz:.6f}")
