#include <cstdio>
#include <vector>
int main() {
  const int N = 8;
  std::vector<long long> p, q(N, 0), c(N, 0);
  for (int i = 0; i < N; i++) p.push_back(i);
  long long enCok = 0, sagla = 0, sira = 0;
  bool bitti = false;
  while (!bitti) {
    for (int i = 0; i < N; i++) q[i] = p[i];
    long long cevirme = 0, k = q[0];
    while (k != 0) {
      long long i = 0, j = k;
      while (i < j) { long long t = q[i]; q[i] = q[j]; q[j] = t; i++; j--; }
      cevirme++;
      k = q[0];
    }
    if (cevirme > enCok) enCok = cevirme;
    sagla += sira % 2 == 0 ? cevirme : -cevirme;
    sira++;
    int i = 1;
    bitti = true;
    while (i < N) {
      long long t = p[0];
      for (int j = 0; j < i; j++) p[j] = p[j + 1];
      p[i] = t;
      c[i]++;
      if (c[i] <= i) { bitti = false; break; }
      c[i] = 0;
      i++;
    }
  }
  std::printf("%lld\nEn çok çevirme: %lld\n", sagla, enCok);
  return 0;
}
