#include <cstdio>
#include <vector>
static void sirala(std::vector<long long>& L, long long alt, long long ust) {
  if (alt >= ust) return;
  long long mihver = L[(alt + ust) / 2];
  long long i = alt, j = ust;
  while (i <= j) {
    while (L[i] < mihver) i++;
    while (L[j] > mihver) j--;
    if (i <= j) { long long t = L[i]; L[i] = L[j]; L[j] = t; i++; j--; }
  }
  sirala(L, alt, j);
  sirala(L, i, ust);
}
int main() {
  const long long N = 30000;
  std::vector<long long> L;
  long long tohum = 42;
  for (long long i = 0; i < N; i++) { tohum = (tohum * 16807) % 2147483647; L.push_back(tohum % 1000000); }
  sirala(L, 0, N - 1);
  long long sagla = 0;
  for (long long i = 0; i < N; i++) {
    if (i > 0 && L[i - 1] > L[i]) { std::puts("sıralı değil"); return 1; }
    sagla = (sagla * 31 + L[i]) % 1000000007;
  }
  std::printf("%lld %lld %lld\n%lld\n", L[0], L[N / 2], L[N - 1], sagla);
  return 0;
}
