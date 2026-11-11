// Yöntem gömülü çalışma zamanı — Copyright (c) 2026 Önder Örnek — MIT lisansı (bkz. LICENSE)
// SPDX-License-Identifier: MIT
// Yöntem gömülü çalışma zamanı (C++17, başlık dosyası olarak).
// Yöntem derleyicisinin ürettiği C++ kodu bu dosyayı kullanır. Hedefler: ESP32 (Arduino) ve masaüstü.
#pragma once
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <algorithm>
#include <initializer_list>
#include <utility>
#include <type_traits>

namespace y {

using Tam = int64_t;
#ifdef YONTEM_ONDALIK_FLOAT
using Ond = float;
#else
using Ond = double;
#endif
using Metin = std::string;

// ------------------------------------------------------------------ satır izi ve hatalar
inline volatile int satir = 0;          // dosya_no * 1000000 + satır
inline const char* const* dosya_adlari = nullptr;
inline int satir_no(int s) { return s % 1000000; }
inline const char* dosya_adi(int s) { return dosya_adlari ? dosya_adlari[s / 1000000] : nullptr; }

struct Hata {
  Metin mesaj;
  Metin tur;
  int satir;
};
struct Dur { int kod; };

/** yakala (h) değişkeninin değeri */
struct HataN {
  Metin mesaj;
  Metin tur = "Hata";
  Tam satir = 0;
  Metin metne_() const { return tur + ": " + mesaj; }
};

[[noreturn]] inline void hata(const Metin& m) { throw Hata{m, "Hata", satir}; }

// Donanım katmanı bu iki işlevi sağlar (yontem_donanim.hpp)
inline void hal_yaz(const char* s, size_t n);
inline void hal_hata(const char* s, size_t n);
inline bool hal_satir_oku(Metin& s);

// ------------------------------------------------------------------ UTF-8 yardımcıları
inline size_t u8_uz(unsigned char c) { return c < 0x80 ? 1 : (c >> 5) == 6 ? 2 : (c >> 4) == 14 ? 3 : (c >> 3) == 30 ? 4 : 1; }
inline Tam uzunluk(const Metin& s) {
  Tam n = 0;
  for (size_t i = 0; i < s.size(); i += u8_uz((unsigned char)s[i])) n++;
  return n;
}
/** i. karakterin (0 tabanlı) bayt konumu; yoksa s.size() */
inline size_t u8_konum(const Metin& s, Tam i) {
  size_t b = 0;
  while (i > 0 && b < s.size()) { b += u8_uz((unsigned char)s[b]); i--; }
  return b;
}
inline std::vector<Metin> karakterler(const Metin& s) {
  std::vector<Metin> r;
  for (size_t i = 0; i < s.size();) { size_t n = u8_uz((unsigned char)s[i]); r.push_back(s.substr(i, n)); i += n; }
  return r;
}
inline uint32_t u8_kod(const Metin& c) {
  const unsigned char* p = (const unsigned char*)c.data();
  size_t n = c.size();
  if (!n) return 0;
  if (p[0] < 0x80) return p[0];
  if ((p[0] >> 5) == 6 && n >= 2) return ((p[0] & 0x1f) << 6) | (p[1] & 0x3f);
  if ((p[0] >> 4) == 14 && n >= 3) return ((p[0] & 0x0f) << 12) | ((p[1] & 0x3f) << 6) | (p[2] & 0x3f);
  if (n >= 4) return ((p[0] & 0x07) << 18) | ((p[1] & 0x3f) << 12) | ((p[2] & 0x3f) << 6) | (p[3] & 0x3f);
  return p[0];
}
inline Metin u8_karakter(uint32_t k) {
  Metin r;
  if (k < 0x80) r += (char)k;
  else if (k < 0x800) { r += (char)(0xc0 | (k >> 6)); r += (char)(0x80 | (k & 0x3f)); }
  else if (k < 0x10000) { r += (char)(0xe0 | (k >> 12)); r += (char)(0x80 | ((k >> 6) & 0x3f)); r += (char)(0x80 | (k & 0x3f)); }
  else { r += (char)(0xf0 | (k >> 18)); r += (char)(0x80 | ((k >> 12) & 0x3f)); r += (char)(0x80 | ((k >> 6) & 0x3f)); r += (char)(0x80 | (k & 0x3f)); }
  return r;
}

// ------------------------------------------------------------------ sayı yazımı (Python ile aynı)
inline Metin metne(Tam v) { char b[24]; snprintf(b, sizeof b, "%lld", (long long)v); return b; }
inline Metin metne(bool v) { return v ? "doğru" : "yanlış"; }
inline Metin metne(const Metin& s) { return s; }
inline Metin metne(const char* s) { return s; }

/** Python repr(float): en kısa geri dönüşlü basamaklar */
inline Metin ondalik_repr(double x) {
  if (std::isnan(x)) return "TS";
  if (std::isinf(x)) return x > 0 ? "∞" : "-∞";
  if (x == 0) return std::signbit(x) ? "-0.0" : "0.0";
  char buf[40];
  int p = 1;
#ifdef YONTEM_ONDALIK_FLOAT
  for (; p < 9; p++) { snprintf(buf, sizeof buf, "%.*e", p - 1, x); if ((float)strtod(buf, nullptr) == (float)x) break; }
#else
  for (; p < 17; p++) { snprintf(buf, sizeof buf, "%.*e", p - 1, x); if (strtod(buf, nullptr) == x) break; }
#endif
  snprintf(buf, sizeof buf, "%.*e", p - 1, x);
  // buf: [-]d.ddde[+-]XX
  Metin s(buf);
  bool neg = s[0] == '-';
  if (neg) s = s.substr(1);
  size_t e = s.find('e');
  Metin mant = s.substr(0, e);
  int us = atoi(s.c_str() + e + 1);
  Metin bas;
  for (char c : mant) if (c != '.') bas += c;
  Metin r;
  if (us >= -4 && us < 16) {
    if (us >= 0) {
      if ((int)bas.size() <= us + 1) r = bas + Metin(us + 1 - bas.size(), '0') + ".0";
      else r = bas.substr(0, us + 1) + "." + bas.substr(us + 1);
    } else r = "0." + Metin(-us - 1, '0') + bas;
  } else {
    r = bas.size() > 1 ? bas.substr(0, 1) + "." + bas.substr(1) : bas;
    char e2[16]; snprintf(e2, sizeof e2, "e%c%02d", us < 0 ? '-' : '+', us < 0 ? -us : us);
    r += e2;
  }
  return neg ? "-" + r : r;
}
inline Metin metne(double v) { return ondalik_repr(v); }
inline Metin metne(float v) { return ondalik_repr(v); }
inline Metin sabit_nokta(double x, int f) {
  if (std::isnan(x)) return "nan";
  if (std::isinf(x)) return x > 0 ? "inf" : "-inf";
  char buf[400]; snprintf(buf, sizeof buf, "%.*f", f, x); return buf;
}
inline Metin saga_yasla(const Metin& s, Tam gen) {
  Tam u = uzunluk(s);
  return u >= gen ? s : Metin(gen - u, ' ') + s;
}

// ------------------------------------------------------------------ nesneler
struct Nesne : std::enable_shared_from_this<Nesne> {
  virtual ~Nesne() {}
  virtual void ilkle() {}
  virtual Metin metne_() { return "nesne"; }
};
template <class C> using Ref = std::shared_ptr<C>;
template <class C> inline Ref<C> kendi(C* p) { return std::static_pointer_cast<C>(p->shared_from_this()); }
template <class C> inline Metin metne(const Ref<C>& p) { return p ? p->metne_() : Metin("boş"); }
inline Metin metne(std::nullptr_t) { return "boş"; }
inline Metin metne(const HataN& h) { return h.metne_(); }
template <class C, typename = decltype(std::declval<C&>().metne_())>
inline Metin metne(const C& v) { return const_cast<C&>(v).metne_(); }
template <class C> inline C& denetle(const Ref<C>& p, const char* uye) {
  if (!p) hata(Metin("'boş' değerin '") + uye + "' üyesine erişilemez");
  return *p;
}
template <class C, class Fn, class... A> inline Ref<C> olustur(Fn f, A&&... a) {
  auto o = std::make_shared<C>();
  o->ilkle();
  ((*o).*f)(std::forward<A>(a)...);
  return o;
}
template <class C> inline Ref<C> olustur0() { auto o = std::make_shared<C>(); o->ilkle(); return o; }

// ------------------------------------------------------------------ listeler
template <class T> struct Liste {
  std::shared_ptr<std::vector<T>> p;
  Liste() : p(std::make_shared<std::vector<T>>()) {}
  Liste(std::initializer_list<T> l) : p(std::make_shared<std::vector<T>>(l)) {}
  explicit Liste(std::vector<T> v) : p(std::make_shared<std::vector<T>>(std::move(v))) {}
  std::vector<T>& v() const { return *p; }
  Tam uz() const { return (Tam)p->size(); }
  size_t j(Tam i) const {
    Tam n = (Tam)p->size();
    Tam k = i < 0 ? i + n : i;
    if (k < 0 || k >= n) hata("Liste dizini sınır dışı: " + metne(i) + " (uzunluk " + metne(n) + ")");
    return (size_t)k;
  }
  T& operator[](Tam i) const { return (*p)[j(i)]; }
  bool operator==(const Liste& o) const { return p == o.p || *p == *o.p; }
};

/** dizi[a..b] türünde T */
template <class T> struct Dizi {
  Tam alt = 0;
  std::shared_ptr<std::vector<T>> p;
  Dizi() : p(std::make_shared<std::vector<T>>()) {}
  template <class Fn> Dizi(Tam a, Tam b, Fn uret) : alt(a), p(std::make_shared<std::vector<T>>()) {
    if (b < a) hata("Dizi sınırları geçersiz");
    for (Tam i = a; i <= b; i++) p->push_back(uret());
  }
  std::vector<T>& v() const { return *p; }
  Tam uz() const { return (Tam)p->size(); }
  T& operator[](Tam i) const {
    Tam k = i - alt;
    if (k < 0 || k >= (Tam)p->size()) hata("Dizi dizini sınır dışı: " + metne(i) + " (geçerli " + metne(alt) + ".." + metne(alt + (Tam)p->size() - 1) + ")");
    return (*p)[k];
  }
};

/** Ekleme sırasını koruyan sözlük (küçük boyutlar için doğrusal arama) */
template <class K, class V> struct Sozluk {
  std::shared_ptr<std::vector<std::pair<K, V>>> p;
  Sozluk() : p(std::make_shared<std::vector<std::pair<K, V>>>()) {}
  Sozluk(std::initializer_list<std::pair<K, V>> l) : p(std::make_shared<std::vector<std::pair<K, V>>>()) { for (auto& c : l) ata(c.first, c.second); }
  Tam uz() const { return (Tam)p->size(); }
  long bul(const K& a) const { for (size_t i = 0; i < p->size(); i++) if ((*p)[i].first == a) return (long)i; return -1; }
  bool var(const K& a) const { return bul(a) >= 0; }
  V& al(const K& a) const;
  V al_vs(const K& a, const V& v) const { long i = bul(a); return i < 0 ? v : (*p)[i].second; }
  void ata(const K& a, const V& v) const { long i = bul(a); if (i < 0) p->push_back({a, v}); else (*p)[i].second = v; }
  void sil(const K& a) const { long i = bul(a); if (i >= 0) p->erase(p->begin() + i); }
};

// temsil: liste içindeki metinler tırnaklı yazılır
inline Metin temsil(const Metin& s) {
  Metin r = "'";
  for (char c : s) { if (c == '\'') r += "''"; else r += c; }
  return r + "'";
}
template <class T> inline Metin temsil(const T& v) { return metne(v); }
template <class T> inline Metin metne(const Liste<T>& l) {
  Metin r = "[";
  for (size_t i = 0; i < l.p->size(); i++) { if (i) r += ", "; r += temsil((*l.p)[i]); }
  return r + "]";
}
template <class T> inline Metin metne(const Dizi<T>& l) {
  Metin r = "[";
  for (size_t i = 0; i < l.p->size(); i++) { if (i) r += ", "; r += temsil((*l.p)[i]); }
  return r + "]";
}
template <class T> inline Metin temsil(const Liste<T>& l) { return metne(l); }
template <class K, class V> inline Metin metne(const Sozluk<K, V>& d) {
  if (d.p->empty()) return "[:]";
  Metin r = "[";
  for (size_t i = 0; i < d.p->size(); i++) { if (i) r += ", "; r += temsil((*d.p)[i].first) + ": " + temsil((*d.p)[i].second); }
  return r + "]";
}
template <class K, class V> inline Metin temsil(const Sozluk<K, V>& d) { return metne(d); }
template <class K, class V> V& Sozluk<K, V>::al(const K& a) const {
  long i = bul(a);
  if (i < 0) hata("Sözlükte anahtar yok: " + temsil(a));
  return (*p)[i].second;
}
template <class K, class V> inline std::vector<K> yinele(const Sozluk<K, V>& d) { std::vector<K> r; for (auto& c : *d.p) r.push_back(c.first); return r; }
template <class K, class V> inline Liste<K> anahtarlar(const Sozluk<K, V>& d) { return Liste<K>(yinele(d)); }
template <class K, class V> inline Liste<V> degerler(const Sozluk<K, V>& d) { Liste<V> r; for (auto& c : *d.p) r.p->push_back(c.second); return r; }
template <class K, class V> inline Sozluk<K, V> kopya(const Sozluk<K, V>& d) { Sozluk<K, V> r; *r.p = *d.p; return r; }
template <class T> inline Sozluk<T, Tam> say(const Liste<T>& l) { Sozluk<T, Tam> r; for (auto& x : *l.p) { long i = r.bul(x); if (i < 0) r.p->push_back({x, 1}); else (*r.p)[i].second++; } return r; }
template <class A, class B> inline Liste<B> liste_cevir(const Liste<A>& l) { Liste<B> r; for (auto& x : *l.p) r.p->push_back((B)x); return r; }
template <class T> inline Liste<T> benzersiz(const Liste<T>& l) { Liste<T> r; for (auto& x : *l.p) { bool var = false; for (auto& z : *r.p) if (z == x) { var = true; break; } if (!var) r.p->push_back(x); } return r; }
template <class T> inline Metin temsil(const Dizi<T>& l) { return metne(l); }
inline Metin metne(const std::vector<bool>::reference& b) { return metne((bool)b); }

template <class T> inline std::vector<T> yinele(const Liste<T>& l) { return *l.p; }
template <class T> inline std::vector<T> yinele(const Dizi<T>& l) { return *l.p; }
inline std::vector<Metin> yinele(const Metin& s) { return karakterler(s); }

// ------------------------------------------------------------------ aritmetik
inline Tam tbol(Tam a, Tam b) { if (b == 0) hata("Sıfıra bölme"); return a / b; }
inline Tam tmod(Tam a, Tam b) { if (b == 0) hata("Sıfıra bölme"); return a % b; }
inline Ond bol(Ond a, Ond b) { if (b == 0) hata("Sıfıra bölme"); return a / b; }
inline Tam tus(Tam a, Tam b) {
  if (b < 0) hata("Tamsayının negatif kuvveti için ondalık kullanın");
  uint64_t r = 1, t = (uint64_t)a;
  while (b) { if (b & 1) r *= t; t *= t; b >>= 1; }
  return (Tam)r;
}
inline Ond us(Ond a, Ond b) {
  if (a == 0 && b < 0) hata("Sıfıra bölme");
  Ond r = std::pow(a, b);
  if (std::isnan(r) && !std::isnan(a) && !std::isnan(b)) hata("Negatif sayının kesirli kuvveti tanımsız");
  return r;
}
inline Metin tekrar(const Metin& s, Tam n) { Metin r; for (Tam i = 0; i < n; i++) r += s; return r; }
template <class T> inline Liste<T> birlestir(const Liste<T>& a, const Liste<T>& b) {
  std::vector<T> v = *a.p; v.insert(v.end(), b.p->begin(), b.p->end()); return Liste<T>(std::move(v));
}

// eşitlik (derin)
template <class A, class B> inline bool esit(const A& a, const B& b) { return a == b; }
template <class T> inline bool esit(const Liste<T>& a, const Liste<T>& b) {
  if (a.p->size() != b.p->size()) return false;
  for (size_t i = 0; i < a.p->size(); i++) if (!esit((*a.p)[i], (*b.p)[i])) return false;
  return true;
}
template <class T> inline bool esit(const Dizi<T>& a, const Dizi<T>& b) { return *a.p == *b.p; }
// sıralama karşılaştırması
template <class A> inline int kars(const A& a, const A& b) { return a < b ? -1 : (b < a ? 1 : 0); }
template <class T> inline int kars(const Liste<T>& a, const Liste<T>& b) {
  size_t n = std::min(a.p->size(), b.p->size());
  for (size_t i = 0; i < n; i++) { int c = kars((*a.p)[i], (*b.p)[i]); if (c) return c; }
  return a.p->size() < b.p->size() ? -1 : a.p->size() > b.p->size() ? 1 : 0;
}

// içinde
template <class T, class V> inline bool icinde(const V& v, const Liste<T>& l) { for (auto& x : *l.p) if (esit(x, (T)v)) return true; return false; }
template <class T, class V> inline bool icinde(const V& v, const Dizi<T>& l) { for (auto& x : *l.p) if (esit(x, (T)v)) return true; return false; }
inline bool icinde(const Metin& a, const Metin& s) { return s.find(a) != Metin::npos; }
template <class K, class V, class A> inline bool icinde(const A& a, const Sozluk<K, V>& d) { return d.var((K)a); }

// ------------------------------------------------------------------ metin işlemleri
inline Metin metin_indeks(const Metin& s, Tam i) {
  Tam n = uzunluk(s);
  if (i < 1 || i > n) hata("Metin dizini sınır dışı: " + metne(i) + " (metin dizinleri 1'den başlar)");
  size_t b = u8_konum(s, i - 1);
  return s.substr(b, u8_uz((unsigned char)s[b]));
}
inline Metin metin_ata(const Metin& s, Tam i, const Metin& v) {
  Tam n = uzunluk(s);
  if (i < 1 || i > n) hata("Metin dizini sınır dışı: " + metne(i));
  size_t b = u8_konum(s, i - 1), e = u8_konum(s, i);
  return s.substr(0, b) + v + s.substr(e);
}
inline Metin alt_metin(const Metin& s, Tam bas, Tam uz = -1, bool uzVar = false) {
  Tam n = uzunluk(s);
  Tam b = std::max(bas, (Tam)1) - 1;
  if (b > n) b = n;
  Tam e = n;
  if (uzVar) { e = b + uz; if (e < 0) e += n; if (e > n) e = n; if (e < b) e = b; }
  size_t bb = u8_konum(s, b), eb = u8_konum(s, e);
  return s.substr(bb, eb - bb);
}
inline Tam konum(const Metin& alt, const Metin& s) {
  size_t k = s.find(alt);
  if (k == Metin::npos) return 0;
  return uzunluk(s.substr(0, k)) + 1;
}
inline Metin buyuk_harf(const Metin& s) {
  Metin r;
  for (auto& c : karakterler(s)) {
    uint32_t k = u8_kod(c);
    if (k == 'i') r += "İ";
    else if (k == 0x131) r += "I";
    else if (k < 128) r += (char)toupper((int)k);
    else if (k == 0xe7) r += "Ç"; else if (k == 0x11f) r += "Ğ"; else if (k == 0xf6) r += "Ö";
    else if (k == 0x15f) r += "Ş"; else if (k == 0xfc) r += "Ü"; else if (k == 0xe2) r += "Â";
    else if (k == 0xee) r += "Î"; else if (k == 0xfb) r += "Û";
    else if (k >= 0xe0 && k <= 0xfe && k != 0xf7) r += u8_karakter(k - 32);
    else r += c;
  }
  return r;
}
inline Metin kucuk_harf(const Metin& s) {
  Metin r;
  for (auto& c : karakterler(s)) {
    uint32_t k = u8_kod(c);
    if (k == 'I') r += "ı";
    else if (k == 0x130) r += "i";
    else if (k < 128) r += (char)tolower((int)k);
    else if (k == 0xc7) r += "ç"; else if (k == 0x11e) r += "ğ"; else if (k == 0xd6) r += "ö";
    else if (k == 0x15e) r += "ş"; else if (k == 0xdc) r += "ü";
    else if (k >= 0xc0 && k <= 0xde && k != 0xd7) r += u8_karakter(k + 32);
    else r += c;
  }
  return r;
}
inline bool bosluk_mu(char c) { return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\v' || c == '\f'; }
inline Metin kirp(const Metin& s) {
  size_t a = 0, b = s.size();
  while (a < b && bosluk_mu(s[a])) a++;
  while (b > a && bosluk_mu(s[b - 1])) b--;
  return s.substr(a, b - a);
}
inline Metin degistir(const Metin& s, const Metin& a, const Metin& b) {
  if (a.empty()) return s;
  Metin r; size_t i = 0;
  for (;;) { size_t k = s.find(a, i); if (k == Metin::npos) break; r += s.substr(i, k - i) + b; i = k + a.size(); }
  return r + s.substr(i);
}
inline Liste<Metin> ayir(const Metin& s) {
  Liste<Metin> r; Metin c; bool var = false;
  for (char ch : s) { if (bosluk_mu(ch)) { if (var) { r.p->push_back(c); c.clear(); var = false; } } else { c += ch; var = true; } }
  if (var) r.p->push_back(c);
  return r;
}
inline Liste<Metin> ayir(const Metin& s, const Metin& a) {
  if (a.empty()) hata("İç hata: ValueError: empty separator");
  Liste<Metin> r; size_t i = 0;
  for (;;) { size_t k = s.find(a, i); if (k == Metin::npos) break; r.p->push_back(s.substr(i, k - i)); i = k + a.size(); }
  r.p->push_back(s.substr(i));
  return r;
}
template <class T> inline Metin birlestir_metin(const Liste<T>& l, const Metin& a = "") {
  Metin r; bool ilk = true;
  for (auto& x : *l.p) { if (!ilk) r += a; r += metne(x); ilk = false; }
  return r;
}
inline Metin ters(const Metin& s) { auto k = karakterler(s); Metin r; for (auto i = k.rbegin(); i != k.rend(); ++i) r += *i; return r; }
inline Tam sira(const Metin& c) { if (uzunluk(c) != 1) hata("Sıra tek karakter bekler"); return (Tam)u8_kod(c); }
inline Metin karakter(Tam n) { return u8_karakter((uint32_t)n); }
inline bool harf_mi(const Metin& c) {
  if (c.empty()) return false;
  for (auto& k : karakterler(c)) { uint32_t u = u8_kod(k); if (!(isalpha((int)(u < 128 ? u : 0)) || u >= 0xc0)) return false; }
  return true;
}
inline bool rakam_mi(const Metin& c) { if (c.empty()) return false; for (char ch : c) if (ch < '0' || ch > '9') return false; return true; }
inline bool basla_mi(const Metin& s, const Metin& a) { return s.compare(0, a.size(), a) == 0; }
inline bool biter_mi(const Metin& s, const Metin& a) { return s.size() >= a.size() && s.compare(s.size() - a.size(), a.size(), a) == 0; }

// Biçimle('{} + {:.2} = {:8}', ...)
struct BArg { bool sayi; double d; Metin m; };
inline BArg barg(Tam v) { return {true, (double)v, metne(v)}; }
inline BArg barg(double v) { return {true, v, metne(v)}; }
inline BArg barg(float v) { return {true, (double)v, metne(v)}; }
template <class T> inline BArg barg(const T& v) { return {false, 0, metne(v)}; }
inline Metin bicimle_v(const Metin& s, const std::vector<BArg>& a) {
  Metin out; size_t i = 0, ai = 0;
  while (i < s.size()) {
    if (s[i] == '{') {
      size_t j = s.find('}', i);
      if (j == Metin::npos) hata("Biçimle: kapanmamış '{'");
      Metin oz = s.substr(i + 1, j - i - 1);
      if (ai >= a.size()) hata("Biçimle: yetersiz argüman");
      const BArg& v = a[ai++];
      int gen = 0, has = -1;
      if (!oz.empty() && oz[0] == ':') {
        oz = oz.substr(1);
        size_t n = oz.find('.');
        if (n != Metin::npos) { gen = atoi(oz.substr(0, n).c_str()); has = atoi(oz.c_str() + n + 1); }
        else if (!oz.empty()) gen = atoi(oz.c_str());
      }
      out += saga_yasla(has >= 0 && v.sayi ? sabit_nokta(v.d, has) : v.m, gen);
      i = j + 1;
    } else out += s[i++];
  }
  return out;
}
template <class... A> inline Metin bicimle(const Metin& s, const A&... a) { return bicimle_v(s, {barg(a)...}); }
template <class T> inline Metin bicim(const T& v, Tam gen) { return saga_yasla(metne(v), gen); }
inline Metin bicim(Tam v, Tam gen, Tam h) { return saga_yasla(sabit_nokta(v, h), gen); }
inline Metin bicim(double v, Tam gen, Tam h) { return saga_yasla(sabit_nokta(v, h), gen); }
inline Metin bicim(float v, Tam gen, Tam h) { return saga_yasla(sabit_nokta(v, h), gen); }

// ------------------------------------------------------------------ dönüşümler
inline bool tam_coz(const Metin& s0, Tam& out) {
  Metin s = kirp(s0); Metin t; for (char c : s) if (c != '_') t += c;
  if (t.empty()) return false;
  size_t i = (t[0] == '+' || t[0] == '-') ? 1 : 0;
  if (i >= t.size()) return false;
  for (size_t k = i; k < t.size(); k++) if (t[k] < '0' || t[k] > '9') return false;
  out = (Tam)strtoll(t.c_str(), nullptr, 10);
  return true;
}
inline bool ond_coz(const Metin& s0, double& out) {
  Metin s = kirp(s0); Metin t; for (char c : s) t += (c == ',') ? '.' : c;
  if (t.empty()) return false;
  char* son = nullptr;
  out = strtod(t.c_str(), &son);
  return son && *son == 0;
}
inline Metin py_repr(const Metin& s) { return "'" + s + "'"; }
inline Tam tamsayi(Tam v) { return v; }
inline Tam tamsayi(bool v) { return v ? 1 : 0; }
inline Tam tamsayi(double v) { if (std::isnan(v)) hata("İç hata: ValueError: cannot convert float NaN to integer"); return (Tam)std::trunc(v); }
inline Tam tamsayi(float v) { return tamsayi((double)v); }
inline Tam tamsayi(const Metin& s) {
  Tam t; if (tam_coz(s, t)) return t;
  double d; if (ond_coz(s, d)) return tamsayi(d);
  hata("Tamsayıya çevrilemez: " + py_repr(s));
}
inline Ond ondalik(Tam v) { return (Ond)v; }
inline Ond ondalik(double v) { return (Ond)v; }
inline Ond ondalik(float v) { return (Ond)v; }
inline Ond ondalik(const Metin& s) { double d; if (ond_coz(s, d)) return (Ond)d; hata("Ondalığa çevrilemez: " + py_repr(s)); }
inline bool mantiksal(bool v) { return v; }
inline bool mantiksal(Tam v) { return v != 0; }
inline bool mantiksal(double v) { return v != 0; }
inline bool mantiksal(const Metin& s) {
  Metin k = kucuk_harf(kirp(s));
  if (k == "doğru" || k == "dogru" || k == "evet" || k == "true" || k == "1") return true;
  if (k == "yanlış" || k == "yanlis" || k == "hayır" || k == "hayir" || k == "false" || k == "0" || k.empty()) return false;
  hata("Mantıksala çevrilemez: " + py_repr(s));
}

// ------------------------------------------------------------------ giriş / çıkış
inline void yaz_metin(const Metin& s) { hal_yaz(s.data(), s.size()); }
template <class T> inline void yaz(const T& v, Tam satirlar = 0) {
  if (satirlar < 0) hata("'yaz' komutunun satır sayısı negatif olmayan bir tamsayı olmalı");
  Metin s = metne(v);
  for (Tam i = 0; i < satirlar; i++) s += '\n';
  yaz_metin(s);
}
inline void yaz() {}
inline bool tampon_var = false;
inline Metin tampon;
inline Metin satir_oku_() {
  Metin s;
  if (!hal_satir_oku(s)) hata("Girdi sonuna ulaşıldı");
  while (!s.empty() && (s.back() == '\n' || s.back() == '\r')) s.pop_back();
  return s;
}
inline void oku_ilerle(Tam n) {
  if (n < 0) hata("'oku' komutunun satır sayısı negatif olmayan bir tamsayı olmalı");
  for (Tam i = 0; i < n; i++) { if (i > 0) satir_oku_(); tampon_var = false; }
}
inline Metin oku_sozcuk() {
  while (!tampon_var || kirp(tampon).empty()) { tampon = satir_oku_(); tampon_var = true; }
  size_t a = 0; while (a < tampon.size() && bosluk_mu(tampon[a])) a++;
  size_t b = a; while (b < tampon.size() && !bosluk_mu(tampon[b])) b++;
  Metin s = tampon.substr(a, b - a);
  while (b < tampon.size() && bosluk_mu(tampon[b])) b++;
  tampon = tampon.substr(b);
  return s;
}
inline void oku(Tam& x, Tam n = 0) { Metin s = oku_sozcuk(); if (!tam_coz(s, x)) hata("Girdi sayıya çevrilemedi: " + py_repr(s)); oku_ilerle(n); }
inline void oku(Ond& x, Tam n = 0) { Metin s = oku_sozcuk(); double d; if (!ond_coz(s, d)) hata("Girdi sayıya çevrilemedi: " + py_repr(s)); x = (Ond)d; oku_ilerle(n); }
inline void oku(Metin& x, Tam n = 0) {
  if (!tampon_var) { tampon = satir_oku_(); tampon_var = true; }
  x = tampon; tampon.clear();
  oku_ilerle(n);
}

// ------------------------------------------------------------------ Python uyumlu rastgele sayılar
struct PyRandom {
  uint32_t mt[624]; int mti = 625; bool gvar = false; double gsonraki = 0;
  void init_genrand(uint32_t s) {
    mt[0] = s;
    for (int i = 1; i < 624; i++) mt[i] = 1812433253u * (mt[i - 1] ^ (mt[i - 1] >> 30)) + (uint32_t)i;
    mti = 624;
  }
  void init_by_array(const uint32_t* key, int n) {
    init_genrand(19650218u);
    int i = 1, j = 0;
    for (int k = 624 > n ? 624 : n; k; k--) {
      mt[i] = (mt[i] ^ ((mt[i - 1] ^ (mt[i - 1] >> 30)) * 1664525u)) + key[j] + (uint32_t)j;
      i++; j++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
      if (j >= n) j = 0;
    }
    for (int k = 623; k; k--) {
      mt[i] = (mt[i] ^ ((mt[i - 1] ^ (mt[i - 1] >> 30)) * 1566083941u)) - (uint32_t)i;
      i++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
    }
    mt[0] = 0x80000000u;
  }
  void seed(int64_t a) { gvar = false; uint64_t n = a < 0 ? (uint64_t)(-a) : (uint64_t)a; uint32_t k[2] = {(uint32_t)n, (uint32_t)(n >> 32)}; init_by_array(k, k[1] ? 2 : 1); }
  uint32_t u32() {
    static const uint32_t mag[2] = {0, 0x9908b0dfu};
    uint32_t y;
    if (mti >= 624) {
      int kk = 0;
      for (; kk < 624 - 397; kk++) { y = (mt[kk] & 0x80000000u) | (mt[kk + 1] & 0x7fffffffu); mt[kk] = mt[kk + 397] ^ (y >> 1) ^ mag[y & 1]; }
      for (; kk < 623; kk++) { y = (mt[kk] & 0x80000000u) | (mt[kk + 1] & 0x7fffffffu); mt[kk] = mt[kk + (397 - 624)] ^ (y >> 1) ^ mag[y & 1]; }
      y = (mt[623] & 0x80000000u) | (mt[0] & 0x7fffffffu); mt[623] = mt[396] ^ (y >> 1) ^ mag[y & 1];
      mti = 0;
    }
    y = mt[mti++];
    y ^= y >> 11; y ^= (y << 7) & 0x9d2c5680u; y ^= (y << 15) & 0xefc60000u; y ^= y >> 18;
    return y;
  }
  double random() { uint32_t a = u32() >> 5, b = u32() >> 6; return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0); }
  uint64_t bits(int k) {
    if (k <= 0) return 0;
    if (k <= 32) return u32() >> (32 - k);
    uint64_t lo = u32(); uint64_t hi = u32() >> (64 - k);
    return lo | (hi << 32);
  }
  uint64_t below(uint64_t n) {
    if (!n) return 0;
    int k = 0; for (uint64_t t = n; t; t >>= 1) k++;
    uint64_t r = bits(k); while (r >= n) r = bits(k);
    return r;
  }
  double gauss(double mu, double sigma) {
    double z;
    if (gvar) { z = gsonraki; gvar = false; }
    else {
      double x2pi = random() * (2 * M_PI), g2rad = std::sqrt(-2.0 * std::log(1.0 - random()));
      z = std::cos(x2pi) * g2rad; gsonraki = std::sin(x2pi) * g2rad; gvar = true;
    }
    return mu + z * sigma;
  }
};
inline uint32_t hal_tohum();
inline PyRandom& rng() { static PyRandom r; static bool k = false; if (!k) { uint32_t t[2] = {hal_tohum(), 0x9e3779b9u}; r.init_by_array(t, 2); k = true; } return r; }
inline PyRandom& yz_rng() { static PyRandom r; static bool k = false; if (!k) { uint32_t t[2] = {hal_tohum() ^ 0x5bd1e995u, 7}; r.init_by_array(t, 2); k = true; } return r; }
inline void tohum(Tam n) { rng().seed(n); yz_rng().seed(n); }
inline Ond rastgele() { return (Ond)rng().random(); }
inline Tam rastgele(Tam a) { if (a <= 0) hata("İç hata: ValueError: empty range for randrange()"); return (Tam)rng().below((uint64_t)a); }
inline Tam rastgele(Tam a, Tam b) { if (b < a) hata("İç hata: ValueError: empty range in randrange()"); return a + (Tam)rng().below((uint64_t)(b - a + 1)); }

// ------------------------------------------------------------------ koleksiyon yerleşikleri
template <class T> inline void ekle(const Liste<T>& l, const T& v) { l.p->push_back(v); }
template <class T> inline T sil(const Liste<T>& l, Tam i) {
  Tam n = l.uz(); Tam k = i < 0 ? i + n : i;
  if (k < 0 || k >= n) hata("Sil: dizin sınır dışı: " + metne(i));
  T v = (*l.p)[k]; l.p->erase(l.p->begin() + k); return v;
}
template <class T> inline T cikar(const Liste<T>& l) { if (l.p->empty()) hata("Boş listeden çıkarılamaz"); T v = l.p->back(); l.p->pop_back(); return v; }
template <class T> inline void araya(const Liste<T>& l, Tam i, const T& v) {
  Tam n = l.uz(); Tam k = i < 0 ? std::max<Tam>(0, i + n) : std::min(i, n);
  l.p->insert(l.p->begin() + k, v);
}
template <class T> inline Liste<T> ters(const Liste<T>& l) { std::vector<T> v(l.p->rbegin(), l.p->rend()); return Liste<T>(std::move(v)); }
template <class T> inline Liste<T> sirala(const Liste<T>& l, bool tersMi = false) {
  std::vector<T> v = *l.p;
  std::stable_sort(v.begin(), v.end(), [&](const T& a, const T& b) { int c = kars(a, b); return tersMi ? c > 0 : c < 0; });
  return Liste<T>(std::move(v));
}
template <class T, class K> inline Liste<T> sirala_anahtar(const Liste<T>& l, const K& f, bool tersMi = false) {
  std::vector<std::pair<decltype(f(std::declval<T>())), T>> v;
  for (auto& x : *l.p) v.push_back({f(x), x});
  std::stable_sort(v.begin(), v.end(), [&](const auto& a, const auto& b) { int c = kars(a.first, b.first); return tersMi ? c > 0 : c < 0; });
  Liste<T> r; for (auto& c : v) r.p->push_back(c.second); return r;
}
template <class T> inline T toplam(const Liste<T>& l) { T s = T(); for (auto& x : *l.p) s = s + x; return s; }
template <class T> inline T toplam(const Dizi<T>& l) { T s = T(); for (auto& x : *l.p) s = s + x; return s; }
template <class T> inline T maks(const Liste<T>& l) { if (l.p->empty()) hata("Maks: boş liste"); T m = (*l.p)[0]; for (auto& x : *l.p) if (kars(x, m) > 0) m = x; return m; }
template <class T> inline T minimum(const Liste<T>& l) { if (l.p->empty()) hata("Min: boş liste"); T m = (*l.p)[0]; for (auto& x : *l.p) if (kars(x, m) < 0) m = x; return m; }
template <class T> inline T maks2(const T& a, const T& b) { return kars(b, a) > 0 ? b : a; }
template <class T> inline T minimum2(const T& a, const T& b) { return kars(b, a) < 0 ? b : a; }
template <class T> inline Tam bul(const Liste<T>& l, const T& v) { for (size_t i = 0; i < l.p->size(); i++) if (esit((*l.p)[i], v)) return (Tam)i; return -1; }
template <class T> inline Liste<T> dilim(const Liste<T>& l, Tam a, Tam b, bool bVar) {
  Tam n = l.uz();
  auto coz = [&](Tam x) { if (x < 0) x += n; return std::max<Tam>(0, std::min(n, x)); };
  Tam x = coz(a), z = bVar ? coz(b) : n;
  if (z < x) z = x;
  return Liste<T>(std::vector<T>(l.p->begin() + x, l.p->begin() + z));
}
template <class T> inline Liste<T> kopya(const Liste<T>& l) { return Liste<T>(*l.p); }
inline Liste<Tam> aralik(Tam a, Tam b, Tam c) {
  if (c == 0) hata("Aralık adımı sıfır olamaz");
  Liste<Tam> r;
  if (c > 0) for (Tam i = a; i < b; i += c) r.p->push_back(i);
  else for (Tam i = a; i > b; i += c) r.p->push_back(i);
  return r;
}
inline Liste<Tam> aralik_liste(Tam a, Tam b) { Liste<Tam> r; for (Tam i = a; i <= b; i++) r.p->push_back(i); return r; }
template <class T, class Fn> inline auto esle(const Liste<T>& l, Fn f) {
  using R = std::decay_t<decltype(f(std::declval<T>()))>;
  Liste<R> r; for (auto& x : yinele(l)) r.p->push_back(f(x)); return r;
}
template <class T, class Fn> inline Liste<T> suz(const Liste<T>& l, Fn f) { Liste<T> r; for (auto& x : yinele(l)) if (f(x)) r.p->push_back(x); return r; }
template <class T, class Fn> inline T indirge(const Liste<T>& l, Fn f) {
  if (l.p->empty()) hata("Boş liste başlangıç değeri olmadan indirgenemez");
  auto v = yinele(l); T b = v[0];
  for (size_t i = 1; i < v.size(); i++) b = f(b, v[i]);
  return b;
}
template <class T, class Fn, class B> inline B indirge(const Liste<T>& l, Fn f, B b) { for (auto& x : yinele(l)) b = f(b, x); return b; }

// ------------------------------------------------------------------ sayısal yerleşikler
inline Tam mutlak(Tam x) { return x < 0 ? -x : x; }
inline Ond mutlak(Ond x) { return std::fabs(x); }
inline Ond kok(Ond x) { if (x < 0) hata("Negatif sayının karekökü alınamaz"); return std::sqrt(x); }
inline Tam yuvarla(Tam x) { return x; }
inline Tam yuvarla(Ond x) { return x >= 0 ? tamsayi((double)std::floor(x + 0.5)) : -tamsayi((double)std::floor(-x + 0.5)); }
inline Ond yuvarla(Ond x, Tam n) {
  if (std::isnan(x) || std::isinf(x)) return x;
  char b[64];
  if (n >= 0) { snprintf(b, sizeof b, "%.*f", (int)n, (double)x); return (Ond)strtod(b, nullptr); }
  double k = std::pow(10.0, -n); snprintf(b, sizeof b, "%.0f", (double)x / k); return (Ond)(strtod(b, nullptr) * k);
}
inline Tam kes(Ond x) { return tamsayi((double)x); }
inline Tam kes(Tam x) { return x; }
inline Ond taban_kontrol(Ond x, const char* ad) { if (std::isnan(x) || std::isinf(x)) hata(Metin("'") + ad + "' bu değer için tanımsız"); return x; }

// ------------------------------------------------------------------ sonunda bloğu (RAII)
template <class Fn> struct Sonunda { Fn f; bool etkin = true; ~Sonunda() noexcept(false) { if (etkin) f(); } };
template <class Fn> inline Sonunda<Fn> sonunda(Fn f) { return Sonunda<Fn>{f}; }

inline HataN hata_degeri(const Hata& h) { return HataN{h.mesaj, h.tur, satir_no(h.satir)}; }
[[noreturn]] inline void firlat(const Metin& m) { throw Hata{m, "Hata", satir}; }
[[noreturn]] inline void firlat(const HataN& h) { throw Hata{h.mesaj, h.tur, satir}; }
inline void iddia(bool k, const Metin& m = "İddia başarısız") { if (!k) throw Hata{"İddia başarısız: " + m, "İddiaHatası", satir}; }

/** Programı çalıştırır, yakalanmayan hatayı yazar; çıkış kodunu döndürür */
template <class Fn> inline int calistir(Fn ana) {
  try { ana(); return 0; }
  catch (const Dur& d) { return d.kod; }
  catch (const Hata& h) {
    Metin yer;
    if (dosya_adi(h.satir)) yer = dosya_adi(h.satir);
    if (satir_no(h.satir)) yer += (yer.empty() ? "" : ", ") + Metin("satır ") + metne((Tam)satir_no(h.satir));
    Metin m = "Çalışma hatası " + (yer.empty() ? Metin() : "[" + yer + "] ") + h.mesaj + "\n";
    hal_hata(m.data(), m.size());
    return 1;
  }
}

}  // namespace y
