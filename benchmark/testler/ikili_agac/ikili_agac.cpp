#include <cstdio>
#include <memory>
// Yöntem'in gömülü arka ucu gibi paylaşımlı göstericiler (shared_ptr) kullanılır.
struct Dugum { std::shared_ptr<Dugum> sol, sag; };
static std::shared_ptr<Dugum> kur(int d) {
  auto x = std::make_shared<Dugum>();
  if (d > 0) { x->sol = kur(d - 1); x->sag = kur(d - 1); }
  return x;
}
static long long say(const std::shared_ptr<Dugum>& x) {
  if (!x->sol) return 1;
  return 1 + say(x->sol) + say(x->sag);
}
int main() {
  for (int derinlik = 4; derinlik <= 14; derinlik++) {
    if (derinlik % 2 == 0) {
      long long toplam = 0;
      for (int i = 0; i < 4; i++) toplam += say(kur(derinlik));
      std::printf("derinlik %2d: %lld düğüm\n", derinlik, toplam);
    }
  }
  return 0;
}
