#include <cstdio>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>
int main() {
  const int N = 40000;
  const std::vector<std::string> sozcukler{"elma", "armut", "kiraz", "erik", "incir", "üzüm", "nar", "ayva", "dut",
    "şeftali", "karpuz", "kavun", "muz", "limon", "portakal", "mandalina"};
  std::vector<std::string> parcalar;
  long long tohum = 7;
  for (int i = 0; i < N; i++) {
    tohum = (tohum * 16807) % 2147483647;
    long long k = (tohum % 1000) % 16;
    if (k > 7) k = (k * k) % 16;
    parcalar.push_back(sozcukler[k]);
  }
  std::string metin;
  for (size_t i = 0; i < parcalar.size(); i++) { if (i) metin += ' '; metin += parcalar[i]; }
  auto ayir = [&](const std::string& s) {
    std::vector<std::string> r; size_t b = 0;
    for (size_t i = 0; i <= s.size(); i++) if (i == s.size() || s[i] == ' ') { r.push_back(s.substr(b, i - b)); b = i + 1; }
    return r;
  };
  std::unordered_map<std::string, long long> sayim;
  for (const auto& s : ayir(metin)) sayim[s]++;
  std::printf("Toplam sözcük: %zu, farklı: %zu\n", ayir(metin).size(), sayim.size());
  std::set<std::string> kullanildi;
  for (int i = 0; i < 5; i++) {
    long long enSayi = -1; std::string enIyi;
    for (const auto& s : sozcukler) {
      auto it = sayim.find(s);
      if (it != sayim.end() && !kullanildi.count(s) && it->second > enSayi) { enSayi = it->second; enIyi = s; }
    }
    kullanildi.insert(enIyi);
    std::printf("%s %lld\n", enIyi.c_str(), enSayi);
  }
  return 0;
}
