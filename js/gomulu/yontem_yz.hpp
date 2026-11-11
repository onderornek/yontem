// Yöntem gömülü çalışma zamanı — Copyright (c) 2026 Önder Örnek — MIT lisansı (bkz. LICENSE)
// SPDX-License-Identifier: MIT
// Yöntem gömülü YZ: tensörlerle çıkarım (otomatik türev yok; eğitim masaüstünde yapılır).
// İşlem sırası ve toplama yöntemi JavaScript/Python sürümleriyle aynıdır.
#pragma once
#include "yontem.hpp"

namespace y {

/** CPython sum() ile aynı: Neumaier dengeli toplama */
inline Ond py_toplam(const Ond* x, size_t n) {
  if (!n) return 0;
  Ond f = 0 + x[0], c = 0;
  for (size_t i = 1; i < n; i++) {
    Ond t = f + x[i];
    if (std::fabs(f) >= std::fabs(x[i])) c += (f - t) + x[i]; else c += (x[i] - t) + f;
    f = t;
  }
  if (c != 0 && std::isfinite(c)) f += c;
  return f;
}

struct Tensor {
  std::shared_ptr<std::vector<Ond>> veri;
  std::vector<int> sekil;
  Tensor() : veri(std::make_shared<std::vector<Ond>>()) {}
  Tensor(std::vector<Ond> v, std::vector<int> s) : veri(std::make_shared<std::vector<Ond>>(std::move(v))), sekil(std::move(s)) {}
  const std::vector<Ond>& v() const { return *veri; }
  int boyut() const { return (int)veri->size(); }
  void iki(int& R, int& C) const {
    if (sekil.empty()) { R = 1; C = 1; } else if (sekil.size() == 1) { R = 1; C = sekil[0]; } else { R = sekil[0]; C = sekil[1]; }
  }
  Metin metne_() const {
    auto b = [](Ond x) -> Metin {
      if (std::isnan(x)) return "TS";
      Metin s = sabit_nokta(x, 4);
      while (!s.empty() && s.back() == '0') s.pop_back();
      if (!s.empty() && s.back() == '.') s.pop_back();
      return s;
    };
    const auto& d = *veri;
    if (sekil.empty()) return "tensör(" + b(d[0]) + ")";
    if (sekil.size() == 1) { Metin r = "tensör(["; for (size_t i = 0; i < d.size(); i++) { if (i) r += ", "; r += b(d[i]); } return r + "])"; }
    int R = sekil[0], C = sekil[1];
    Metin r = "tensör([";
    for (int i = 0; i < R; i++) {
      if (i) r += ",\n        ";
      r += "[";
      for (int j = 0; j < C; j++) { if (j) r += ", "; r += b(d[i * C + j]); }
      r += "]";
    }
    return r + "])";
  }
};
inline Metin metne(const Tensor& t) { return t.metne_(); }

// ---- oluşturma
inline Tensor tensor(Ond x) { return Tensor({x}, {}); }
inline Tensor tensor(Tam x) { return Tensor({(Ond)x}, {}); }
inline Tensor tensor(const Tensor& t) { return Tensor(*t.veri, t.sekil); }
template <class T> inline Tensor tensor(const Liste<T>& l) {
  std::vector<Ond> v; for (auto& x : *l.p) v.push_back((Ond)x);
  return Tensor(std::move(v), {(int)l.p->size()});
}
template <class T> inline Tensor tensor(const Liste<Liste<T>>& l) {
  if (l.p->empty()) return Tensor({}, {0});
  size_t c = (*l.p)[0].p->size();
  std::vector<Ond> v;
  for (auto& r : *l.p) {
    if (r.p->size() != c) hata("Düzensiz matris: tüm satırlar aynı uzunlukta olmalı");
    for (auto& x : *r.p) v.push_back((Ond)x);
  }
  return Tensor(std::move(v), {(int)l.p->size(), (int)c});
}
inline Tensor tensor_ham(std::initializer_list<Ond> v, std::initializer_list<int> s) { return Tensor(std::vector<Ond>(v), std::vector<int>(s)); }
inline std::vector<int> sekil_yap(Tam r, Tam c, bool cVar) { return cVar ? std::vector<int>{(int)r, (int)c} : std::vector<int>{(int)r}; }
inline Tensor sifirlar(Tam r, Tam c = 0, bool cVar = false) { auto s = sekil_yap(r, c, cVar); return Tensor(std::vector<Ond>((size_t)r * (cVar ? c : 1), 0), s); }
inline Tensor birler(Tam r, Tam c = 0, bool cVar = false) { auto s = sekil_yap(r, c, cVar); return Tensor(std::vector<Ond>((size_t)r * (cVar ? c : 1), 1), s); }

// ---- ikili işlemler (yayınlama)
inline Tensor ikili(const Tensor& a, const Tensor& b, char op) {
  int ar, ac, br, bc; a.iki(ar, ac); b.iki(br, bc);
  auto uyumsuz = [&]() {
    auto s = [](const std::vector<int>& v) { Metin r = "["; for (size_t i = 0; i < v.size(); i++) { if (i) r += ", "; r += metne((Tam)v[i]); } return r + "]"; };
    hata("Tensör şekilleri uyumsuz: " + s(a.sekil) + " ve " + s(b.sekil));
  };
  int R = 0, C = 0;
  if (ar == br) R = ar; else if (ar == 1) R = br; else if (br == 1) R = ar; else uyumsuz();
  if (ac == bc) C = ac; else if (ac == 1) C = bc; else if (bc == 1) C = ac; else uyumsuz();
  size_t nd = std::max(a.sekil.size(), b.sekil.size());
  std::vector<int> sekil = nd == 0 ? std::vector<int>{} : nd == 1 ? (R == 1 ? std::vector<int>{C} : std::vector<int>{R, C}) : std::vector<int>{R, C};
  const auto& av = *a.veri; const auto& bv = *b.veri;
  std::vector<Ond> out;
  bool ayni = a.sekil == b.sekil;
  size_t n = ayni ? std::min(av.size(), bv.size()) : (size_t)R * C;
  out.resize(n);
  for (size_t k = 0; k < n; k++) {
    Ond x, z;
    if (ayni) { x = av[k]; z = bv[k]; }
    else { int r = (int)(k / C), c = (int)(k % C); x = av[(ar > 1 ? r : 0) * ac + (ac > 1 ? c : 0)]; z = bv[(br > 1 ? r : 0) * bc + (bc > 1 ? c : 0)]; }
    switch (op) {
      case '+': out[k] = x + z; break;
      case '-': out[k] = x - z; break;
      case '*': out[k] = x * z; break;
      default: if (z == 0) hata("Tensör bölmesinde sıfıra bölme"); out[k] = x / z;
    }
  }
  return Tensor(std::move(out), sekil);
}
inline Tensor operator+(const Tensor& a, const Tensor& b) { return ikili(a, b, '+'); }
inline Tensor operator-(const Tensor& a, const Tensor& b) { return ikili(a, b, '-'); }
inline Tensor operator*(const Tensor& a, const Tensor& b) { return ikili(a, b, '*'); }
inline Tensor operator/(const Tensor& a, const Tensor& b) { return ikili(a, b, '/'); }
inline Tensor operator+(const Tensor& a, Ond b) { return a + tensor(b); }
inline Tensor operator-(const Tensor& a, Ond b) { return a - tensor(b); }
inline Tensor operator*(const Tensor& a, Ond b) { return a * tensor(b); }
inline Tensor operator/(const Tensor& a, Ond b) { return a / tensor(b); }
inline Tensor operator+(Ond a, const Tensor& b) { return tensor(a) + b; }
inline Tensor operator-(Ond a, const Tensor& b) { return tensor(a) - b; }
inline Tensor operator*(Ond a, const Tensor& b) { return tensor(a) * b; }
inline Tensor operator/(Ond a, const Tensor& b) { return tensor(a) / b; }

inline Tensor tekli(const Tensor& a, Ond (*f)(Ond)) {
  std::vector<Ond> o; o.reserve(a.veri->size());
  for (Ond x : *a.veri) o.push_back(f(x));
  return Tensor(std::move(o), a.sekil);
}
inline Tensor operator-(const Tensor& a) { return tekli(a, [](Ond x) -> Ond { return -x; }); }
inline Tensor relu(const Tensor& a) { return tekli(a, [](Ond x) -> Ond { return x > 0 ? x : 0.0; }); }
inline Tensor sigmoid(const Tensor& a) {
  return tekli(a, [](Ond x) -> Ond { if (x >= 0) return 1.0 / (1.0 + std::exp(-x)); Ond e = std::exp(x); return e / (1.0 + e); });
}
inline Tensor tanh_(const Tensor& a) { return tekli(a, [](Ond x) -> Ond { return std::tanh(x); }); }
inline Tensor ustel(const Tensor& a) { return tekli(a, [](Ond x) -> Ond { return std::exp(x < 709.0 ? x : 709.0); }); }
inline Tensor log_(const Tensor& a) { return tekli(a, [](Ond x) -> Ond { if (x <= 0) hata("Log: pozitif olmayan değer"); return std::log(x); }); }
inline Tensor kok(const Tensor& a) { return tekli(a, [](Ond x) -> Ond { return std::sqrt(x > 0 ? x : 0.0); }); }
inline Tensor mutlak(const Tensor& a) { return tekli(a, [](Ond x) -> Ond { return std::fabs(x); }); }
inline Tensor sin(const Tensor& a) { return tekli(a, [](Ond x) -> Ond { return std::sin(x); }); }
inline Tensor cos(const Tensor& a) { return tekli(a, [](Ond x) -> Ond { return std::cos(x); }); }
inline Tensor us(const Tensor& a, Ond p) { std::vector<Ond> o; for (Ond x : *a.veri) o.push_back(std::pow(x, p)); return Tensor(std::move(o), a.sekil); }

inline Tensor transpoze(const Tensor& a) {
  if (a.sekil.size() < 2) return a;
  int R = a.sekil[0], C = a.sekil[1];
  std::vector<Ond> o; o.reserve(a.veri->size());
  for (int j = 0; j < C; j++) for (int i = 0; i < R; i++) o.push_back((*a.veri)[i * C + j]);
  return Tensor(std::move(o), {C, R});
}
inline Tensor matmul(const Tensor& a, const Tensor& b) {
  if (a.sekil.empty() || b.sekil.empty()) return a * b;
  bool a1 = a.sekil.size() == 1, b1 = b.sekil.size() == 1;
  int n = a1 ? 1 : a.sekil[0], k = a1 ? a.sekil[0] : a.sekil[1];
  int k2 = b1 ? b.sekil[0] : b.sekil[0], m = b1 ? 1 : b.sekil[1];
  if (k != k2) {
    auto s = [](const std::vector<int>& v) { Metin r = "["; for (size_t i = 0; i < v.size(); i++) { if (i) r += ", "; r += metne((Tam)v[i]); } return r + "]"; };
    hata("Matris çarpımı için şekiller uyumsuz: " + s(a.sekil) + " @ " + s(b.sekil));
  }
  const auto& A = *a.veri; const auto& B = *b.veri;
  std::vector<Ond> out; out.reserve((size_t)n * m);
  std::vector<Ond> carp(k);
  for (int i = 0; i < n; i++)
    for (int j = 0; j < m; j++) {
      for (int q = 0; q < k; q++) carp[q] = A[i * k + q] * B[q * m + j];
      out.push_back(py_toplam(carp.data(), k));
    }
  std::vector<int> sekil = a1 && b1 ? std::vector<int>{} : a1 ? std::vector<int>{m} : b1 ? std::vector<int>{n} : std::vector<int>{n, m};
  return Tensor(std::move(out), sekil);
}
inline Tensor softmaks(const Tensor& a) {
  int R, C; a.iki(R, C);
  std::vector<Ond> out;
  for (int r = 0; r < R; r++) {
    const Ond* row = a.veri->data() + r * C;
    Ond m = row[0]; for (int i = 1; i < C; i++) if (row[i] > m) m = row[i];
    std::vector<Ond> e(C); for (int i = 0; i < C; i++) e[i] = std::exp(row[i] - m);
    Ond s = py_toplam(e.data(), C);
    for (Ond x : e) out.push_back(x / s);
  }
  return Tensor(std::move(out), a.sekil);
}
inline Tensor toplam(const Tensor& a) { return Tensor({py_toplam(a.veri->data(), a.veri->size())}, {}); }
inline Tensor toplam(const Tensor& a, Tam eksen) {
  if (a.sekil.size() < 2) return toplam(a);
  int R = a.sekil[0], C = a.sekil[1];
  std::vector<Ond> out, tmp;
  if (eksen == 0) { for (int c = 0; c < C; c++) { tmp.clear(); for (int r = 0; r < R; r++) tmp.push_back((*a.veri)[r * C + c]); out.push_back(py_toplam(tmp.data(), tmp.size())); } return Tensor(std::move(out), {C}); }
  if (eksen == 1) { for (int r = 0; r < R; r++) out.push_back(py_toplam(a.veri->data() + r * C, C)); return Tensor(std::move(out), {R}); }
  hata("Eksen 0 veya 1 olmalı");
}
inline Tensor ortalama(const Tensor& a) { if (a.veri->empty()) hata("Boş tensörün ortalaması alınamaz"); return toplam(a) / (Ond)a.veri->size(); }
inline Tensor ortalama(const Tensor& a, Tam eksen) {
  if (a.sekil.size() < 2) return ortalama(a);
  int n = eksen == 0 ? a.sekil[0] : a.sekil[1];
  if (n == 0) hata("Boş tensörün ortalaması alınamaz");
  return toplam(a, eksen) / (Ond)n;
}
inline Ond deger(const Tensor& a) { if (a.veri->size() != 1) hata("Değer yalnızca tek öğeli tensörler için kullanılabilir"); return (*a.veri)[0]; }
inline Ond maks(const Tensor& a) { if (a.veri->empty()) hata("İç hata: ValueError: max() iterable argument is empty"); Ond m = (*a.veri)[0]; for (Ond x : *a.veri) if (x > m) m = x; return m; }
inline Ond minimum(const Tensor& a) { if (a.veri->empty()) hata("İç hata: ValueError: min() iterable argument is empty"); Ond m = (*a.veri)[0]; for (Ond x : *a.veri) if (x < m) m = x; return m; }
inline Tam argmaks(const Tensor& a) {
  int R, C; a.iki(R, C);
  if (a.sekil.size() == 2 && R != 1) hata("ArgMaks gömülü sürümde tek satırlı tensör bekler; satır için t.Satır(i) kullanın");
  if (a.veri->empty()) hata("İç hata: ValueError: max() iterable argument is empty");
  Tam bi = 0; Ond bv = (*a.veri)[0];
  for (size_t i = 1; i < a.veri->size(); i++) if ((*a.veri)[i] > bv) { bv = (*a.veri)[i]; bi = (Tam)i; }
  return bi;
}
inline Ond indeks(const Tensor& a, Tam i) {
  if (a.sekil.size() != 1) hata("Gömülü sürümde tek dizinle yalnızca 1 boyutlu tensörler okunur; satır için Satır(i) kullanın");
  int n = a.sekil[0];
  if (!(-n <= i && i < n)) hata("Tensör dizini sınır dışı: " + metne(i));
  return (*a.veri)[i < 0 ? i + n : i];
}
inline Ond indeks(const Tensor& a, Tam i, Tam j) {
  if (a.sekil.size() != 2) hata("Geçersiz tensör dizini");
  int R = a.sekil[0], C = a.sekil[1];
  if (!(0 <= i && i < R && 0 <= j && j < C)) hata("Tensör dizini sınır dışı: [" + metne(i) + ", " + metne(j) + "]");
  return (*a.veri)[i * C + j];
}
inline void indeks_ata(const Tensor& a, Tam i, Ond v) { if (a.sekil.size() != 1) hata("Geçersiz tensör dizini"); (*a.veri)[i < 0 ? i + a.sekil[0] : i] = v; }
inline void indeks_ata(const Tensor& a, Tam i, Tam j, Ond v) { if (a.sekil.size() != 2) hata("Geçersiz tensör dizini"); (*a.veri)[i * a.sekil[1] + j] = v; }
inline Tensor satir_al(const Tensor& a, Tam i) {
  if (a.sekil.size() != 2) hata("Satır yalnızca 2 boyutlu tensörlerde kullanılır");
  int R = a.sekil[0], C = a.sekil[1];
  if (!(0 <= i && i < R)) hata("Tensör satır dizini sınır dışı: " + metne(i));
  return Tensor(std::vector<Ond>(a.veri->begin() + i * C, a.veri->begin() + (i + 1) * C), {C});
}
inline Liste<Tam> sekil(const Tensor& a) { Liste<Tam> r; for (int s : a.sekil) r.p->push_back(s); return r; }
inline Liste<Ond> liste_yap(const Tensor& a) { return Liste<Ond>(*a.veri); }
inline Tensor yeniden(const Tensor& a, Tam r, Tam c = 0, bool cVar = false) {
  size_t n = (size_t)r * (cVar ? c : 1);
  if (n != a.veri->size()) hata("Yeniden şekillendirme olanaksız");
  return Tensor(*a.veri, sekil_yap(r, c, cVar));
}

}  // namespace y
