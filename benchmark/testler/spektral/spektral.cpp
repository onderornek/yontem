#include <cmath>
#include <cstdio>
#include <vector>
const int N = 120;
static double A(int i, int j) { return 1.0 / ((double)(i + j) * (i + j + 1) / 2 + i + 1); }
static void aCarp(const std::vector<double>& g, std::vector<double>& c) {
  for (int i = 0; i < N; i++) { double s = 0.0; for (int j = 0; j < N; j++) s += A(i, j) * g[j]; c[i] = s; }
}
static void atCarp(const std::vector<double>& g, std::vector<double>& c) {
  for (int i = 0; i < N; i++) { double s = 0.0; for (int j = 0; j < N; j++) s += A(j, i) * g[j]; c[i] = s; }
}
int main() {
  std::vector<double> u(N, 1.0), v(N, 0.0), ara(N, 0.0);
  for (int a = 0; a < 10; a++) { aCarp(u, ara); atCarp(ara, v); aCarp(v, ara); atCarp(ara, u); }
  double vBv = 0.0, vv = 0.0;
  for (int i = 0; i < N; i++) { vBv += u[i] * v[i]; vv += v[i] * v[i]; }
  std::printf("%.9f\n", std::sqrt(vBv / vv));
  return 0;
}
