#include <cmath>
#include <cstdio>
#include <vector>
const int N = 5, ADIM = 20000;
const double DT = 0.001;
std::vector<double> x{0.0, 1.0, -2.0, 3.5, 0.5}, y{0.0, 0.5, 1.0, -1.5, -3.0}, z{0.0, -0.2, 0.3, 0.1, 0.4};
std::vector<double> vx{0.0, 0.1, 0.0, -0.2, 0.3}, vy{0.0, 0.8, -0.6, 0.4, 0.2}, vz{0.0, 0.0, 0.1, -0.1, 0.0};
std::vector<double> m{10.0, 0.1, 0.2, 0.05, 0.08};
static double enerji() {
  double e = 0.0;
  for (int i = 0; i < N; i++) {
    e = e + 0.5 * m[i] * (vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]);
    for (int j = i + 1; j < N; j++) {
      double dx = x[i] - x[j], dy = y[i] - y[j], dz = z[i] - z[j];
      e = e - m[i] * m[j] / std::sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  return e;
}
int main() {
  std::printf("%.9f\n", enerji());
  for (int a = 0; a < ADIM; a++) {
    for (int i = 0; i < N; i++)
      for (int j = i + 1; j < N; j++) {
        double dx = x[i] - x[j], dy = y[i] - y[j], dz = z[i] - z[j];
        double d2 = dx * dx + dy * dy + dz * dz;
        double b = DT / (d2 * std::sqrt(d2));
        vx[i] = vx[i] - dx * m[j] * b; vy[i] = vy[i] - dy * m[j] * b; vz[i] = vz[i] - dz * m[j] * b;
        vx[j] = vx[j] + dx * m[i] * b; vy[j] = vy[j] + dy * m[i] * b; vz[j] = vz[j] + dz * m[i] * b;
      }
    for (int i = 0; i < N; i++) { x[i] = x[i] + DT * vx[i]; y[i] = y[i] + DT * vy[i]; z[i] = z[i] + DT * vz[i]; }
  }
  std::printf("%.9f\n", enerji());
  return 0;
}
