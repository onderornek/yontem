import math
N, ADIM, DT = 5, 20000, 0.001
x = [0.0, 1.0, -2.0, 3.5, 0.5]
y = [0.0, 0.5, 1.0, -1.5, -3.0]
z = [0.0, -0.2, 0.3, 0.1, 0.4]
vx = [0.0, 0.1, 0.0, -0.2, 0.3]
vy = [0.0, 0.8, -0.6, 0.4, 0.2]
vz = [0.0, 0.0, 0.1, -0.1, 0.0]
m = [10.0, 0.1, 0.2, 0.05, 0.08]


def enerji():
    e = 0.0
    for i in range(N):
        e = e + 0.5 * m[i] * (vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i])
        for j in range(i + 1, N):
            dx, dy, dz = x[i] - x[j], y[i] - y[j], z[i] - z[j]
            e = e - m[i] * m[j] / math.sqrt(dx * dx + dy * dy + dz * dz)
    return e


print(f"{enerji():.9f}")
for _ in range(ADIM):
    for i in range(N):
        for j in range(i + 1, N):
            dx, dy, dz = x[i] - x[j], y[i] - y[j], z[i] - z[j]
            d2 = dx * dx + dy * dy + dz * dz
            b = DT / (d2 * math.sqrt(d2))
            vx[i] = vx[i] - dx * m[j] * b
            vy[i] = vy[i] - dy * m[j] * b
            vz[i] = vz[i] - dz * m[j] * b
            vx[j] = vx[j] + dx * m[i] * b
            vy[j] = vy[j] + dy * m[i] * b
            vz[j] = vz[j] + dz * m[i] * b
    for i in range(N):
        x[i] = x[i] + DT * vx[i]
        y[i] = y[i] + DT * vy[i]
        z[i] = z[i] + DT * vz[i]
print(f"{enerji():.9f}")
