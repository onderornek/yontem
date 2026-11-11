#include <cstdio>
long long F(long long n) { if (n < 2) return n; return F(n - 1) + F(n - 2); }
int main() { std::printf("%lld\n", F(27)); return 0; }
