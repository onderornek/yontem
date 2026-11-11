// Yöntem gömülü çalışma zamanı — Copyright (c) 2026 Önder Örnek — MIT lisansı (bkz. LICENSE)
// SPDX-License-Identifier: MIT
// Yöntem Donanım birimi: pin, analog, PWM, zaman, kesme, zamanlayıcı, seri, I2C, SPI.
// ARDUINO tanımlıysa ESP32 (Arduino çekirdeği) üzerinde gerçek donanımı kullanır;
// değilse masaüstünde sanal saatli, belirlenimci bir benzetim çalıştırır.
#pragma once
#include "yontem.hpp"

namespace y {
namespace donanim {

// Pin kipleri ve kesme türleri (Yöntem sabitleri)
constexpr Tam GIRIS = 1, CIKIS = 2, GIRIS_YUKARI = 3, GIRIS_ASAGI = 4;
constexpr Tam YUKSELEN = 1, DUSEN = 2, DEGISEN = 3;

using Islev = std::function<void()>;

}  // namespace donanim
}  // namespace y

#ifdef ARDUINO
// =====================================================================================
//  ESP32 (Arduino çekirdeği 2.x / 3.x)
// =====================================================================================
#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <esp_timer.h>
#include <esp_system.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>

namespace y {
inline void hal_yaz(const char* s, size_t n) { Serial.write((const uint8_t*)s, n); }
inline void hal_hata(const char* s, size_t n) { Serial.write((const uint8_t*)s, n); }
inline bool hal_satir_oku(Metin& s) {
  s.clear();
  for (;;) {
    while (!Serial.available()) delay(1);
    int c = Serial.read();
    if (c == '\n') return true;
    if (c == '\r') continue;
    s += (char)c;
  }
}
inline uint32_t hal_tohum() { return esp_random(); }

namespace donanim {

// Kesme ve zamanlayıcı geri çağrıları ISR'de değil, ayrı bir görevde sırayla çalışır.
struct Olay { int tur; int no; };
inline QueueHandle_t olay_kuyrugu = nullptr;
inline Islev pin_islev[64];
struct Zaman { Islev f; esp_timer_handle_t h = nullptr; bool tekrar = false; bool etkin = false; };
inline Zaman zamanlayicilar[16];

static void IRAM_ATTR pin_isr(void* arg) {
  Olay o{0, (int)(intptr_t)arg};
  BaseType_t uyan = pdFALSE;
  xQueueSendFromISR(olay_kuyrugu, &o, &uyan);
  if (uyan) portYIELD_FROM_ISR();
}
inline void zaman_cb(void* arg) { Olay o{1, (int)(intptr_t)arg}; xQueueSend(olay_kuyrugu, &o, 0); }
inline void olay_gorevi(void*) {
  Olay o;
  for (;;) {
    if (xQueueReceive(olay_kuyrugu, &o, portMAX_DELAY) != pdTRUE) continue;
    try {
      if (o.tur == 0 && pin_islev[o.no]) pin_islev[o.no]();
      else if (o.tur == 1 && zamanlayicilar[o.no].f) zamanlayicilar[o.no].f();
    } catch (const Hata& h) {
      Metin m = "Kesme/zamanlayıcı hatası " + (satir_no(h.satir) ? "[satır " + metne((Tam)satir_no(h.satir)) + "] " : Metin()) + h.mesaj + "\n";
      hal_hata(m.data(), m.size());
    }
  }
}
inline void olaylari_baslat() {
  if (olay_kuyrugu) return;
  olay_kuyrugu = xQueueCreate(32, sizeof(Olay));
  xTaskCreatePinnedToCore(olay_gorevi, "yontem_olay", 8192, nullptr, 2, nullptr, ARDUINO_RUNNING_CORE);
}

inline void pin_kipi(Tam p, Tam k) {
  pinMode(p, k == CIKIS ? OUTPUT : k == GIRIS_YUKARI ? INPUT_PULLUP : k == GIRIS_ASAGI ? INPUT_PULLDOWN : INPUT);
}
inline void pin_yaz(Tam p, bool v) { digitalWrite(p, v ? HIGH : LOW); }
inline bool pin_oku(Tam p) { return digitalRead(p) == HIGH; }
inline Tam analog_oku(Tam p) { return analogRead(p); }
inline void pwm_yaz(Tam p, Tam oran) { if (oran < 0) oran = 0; if (oran > 255) oran = 255; analogWrite(p, oran); }
inline void bekle(Tam ms) { if (ms > 0) delay(ms); }
inline void bekle_mikro(Tam us) { if (us > 0) delayMicroseconds(us); }
inline Tam milisaniye() { return (Tam)millis(); }
inline Tam mikrosaniye() { return (Tam)micros(); }
inline void kesme_bagla(Tam p, Islev f, Tam tur) {
  if (p < 0 || p >= 64) hata("Geçersiz pin: " + metne(p));
  olaylari_baslat();
  pin_islev[p] = f;
  attachInterruptArg(digitalPinToInterrupt(p), pin_isr, (void*)(intptr_t)p, tur == YUKSELEN ? RISING : tur == DUSEN ? FALLING : CHANGE);
}
inline void kesme_coz(Tam p) { detachInterrupt(digitalPinToInterrupt(p)); if (p >= 0 && p < 64) pin_islev[p] = nullptr; }
inline Tam zamanlayici_kur(Tam ms, Islev f, bool tekrar) {
  if (ms <= 0) hata("Zamanlayıcı süresi pozitif olmalı");
  olaylari_baslat();
  for (int i = 0; i < 16; i++) {
    if (zamanlayicilar[i].etkin) continue;
    auto& z = zamanlayicilar[i];
    z.f = f; z.tekrar = tekrar; z.etkin = true;
    if (!z.h) {
      esp_timer_create_args_t a = {};
      a.callback = zaman_cb; a.arg = (void*)(intptr_t)i; a.name = "yontem";
      esp_timer_create(&a, &z.h);
    }
    if (tekrar) esp_timer_start_periodic(z.h, (uint64_t)ms * 1000ULL);
    else esp_timer_start_once(z.h, (uint64_t)ms * 1000ULL);
    return i;
  }
  hata("En çok 16 zamanlayıcı kurulabilir");
}
inline void zamanlayici_durdur(Tam id) {
  if (id < 0 || id >= 16 || !zamanlayicilar[id].etkin) return;
  esp_timer_stop(zamanlayicilar[id].h);
  zamanlayicilar[id].etkin = false;
}
inline void seri_baslat(Tam baud) { Serial.end(); Serial.begin(baud); }
inline Tam seri_var() { return Serial.available(); }
inline Tam seri_bayt_oku() { return Serial.read(); }
inline void seri_bayt_yaz(Tam b) { Serial.write((uint8_t)b); }
inline void i2c_baslat(Tam sda, Tam scl, Tam hiz) { Wire.begin(sda, scl, hiz); }
inline Tam i2c_yaz(Tam adres, const Liste<Tam>& veri) {
  Wire.beginTransmission((uint8_t)adres);
  for (Tam b : *veri.p) Wire.write((uint8_t)b);
  return Wire.endTransmission();
}
inline Liste<Tam> i2c_oku(Tam adres, Tam n) {
  Liste<Tam> r;
  Wire.requestFrom((uint8_t)adres, (uint8_t)n);
  while (Wire.available()) r.p->push_back(Wire.read());
  return r;
}
inline Liste<Tam> i2c_yaz_oku(Tam adres, const Liste<Tam>& veri, Tam n) {
  Wire.beginTransmission((uint8_t)adres);
  for (Tam b : *veri.p) Wire.write((uint8_t)b);
  Wire.endTransmission(false);
  return i2c_oku(adres, n);
}
inline void spi_baslat(Tam sck, Tam miso, Tam mosi, Tam hiz) { SPI.begin(sck, miso, mosi); SPI.beginTransaction(SPISettings(hiz, MSBFIRST, SPI_MODE0)); }
inline Tam spi_aktar(Tam b) { return SPI.transfer((uint8_t)b); }
constexpr bool BENZETIM = false;
#ifdef LED_BUILTIN
constexpr Tam YERLESIK_LED = LED_BUILTIN;
#else
constexpr Tam YERLESIK_LED = 2;
#endif
}  // namespace donanim

inline void hal_baslat() { Serial.begin(115200); delay(200); }
inline void hal_bitti(int kod) {
  Metin m = "\n[Yöntem programı bitti, çıkış kodu " + metne((Tam)kod) + "]\n";
  hal_yaz(m.data(), m.size());
}
}  // namespace y


#else
// =====================================================================================
//  Masaüstü benzetimi: sanal saat, pin durumu, kesmeler ve zamanlayıcılar belirlenimcidir.
//  YONTEM_IZ=1 ortam değişkeni pin değişikliklerini stderr'e yazar.
// =====================================================================================
#include <iostream>
#include <map>
#include <ctime>

namespace y {
inline void hal_yaz(const char* s, size_t n) { fwrite(s, 1, n, stdout); }
inline void hal_hata(const char* s, size_t n) { fflush(stdout); fwrite(s, 1, n, stderr); }
inline bool hal_satir_oku(Metin& s) {
  fflush(stdout);
  s.clear();
  int c;
  bool var = false;
  while ((c = fgetc(stdin)) != EOF) { var = true; s += (char)c; if (c == '\n') break; }
  return var;
}
inline uint32_t hal_tohum() { return (uint32_t)time(nullptr) ^ (uint32_t)clock(); }

namespace donanim {
inline int64_t saat_us = 0;
inline bool iz() { static int v = -1; if (v < 0) { const char* e = getenv("YONTEM_IZ"); v = (e && *e && *e != '0') ? 1 : 0; } return v == 1; }
inline Metin zaman_damgasi() { char b[32]; snprintf(b, sizeof b, "[%7lld ms] ", (long long)(saat_us / 1000)); return b; }
inline void izle(const Metin& m) { if (iz()) { Metin s = zaman_damgasi() + m + "\n"; fflush(stdout); fwrite(s.data(), 1, s.size(), stderr); } }

struct PinD { Tam kip = GIRIS; bool deger = false; Tam pwm = 0; Islev isr; Tam tur = 0; };
inline std::map<Tam, PinD>& pinler() { static std::map<Tam, PinD> m; return m; }
struct ZamanD { Islev f; int64_t sonraki; int64_t aralik; bool tekrar; bool etkin; };
inline std::vector<ZamanD>& zamanlar() { static std::vector<ZamanD> z; return z; }
struct I2CAygit { std::vector<Tam> bellek = std::vector<Tam>(256, 0); Tam yazmac = 0; };
inline std::map<Tam, I2CAygit>& i2c_aygitlar() { static std::map<Tam, I2CAygit> m; return m; }

inline void ilerle(int64_t hedef) {
  for (;;) {
    int sec = -1;
    for (size_t i = 0; i < zamanlar().size(); i++) {
      auto& z = zamanlar()[i];
      if (z.etkin && z.sonraki <= hedef && (sec < 0 || z.sonraki < zamanlar()[sec].sonraki)) sec = (int)i;
    }
    if (sec < 0) break;
    auto& z = zamanlar()[sec];
    saat_us = std::max(saat_us, z.sonraki);
    if (z.tekrar) z.sonraki += z.aralik; else z.etkin = false;
    Islev f = z.f;
    f();
  }
  saat_us = std::max(saat_us, hedef);
}

inline void pin_kipi(Tam p, Tam k) { pinler()[p].kip = k; if (k == GIRIS_YUKARI) pinler()[p].deger = true; izle("pin " + metne(p) + " kipi " + metne(k)); }
inline void pin_yaz(Tam p, bool v) {
  auto& d = pinler()[p];
  bool eski = d.deger;
  d.deger = v;
  izle("pin " + metne(p) + " = " + (v ? "1" : "0"));
  if (d.isr && eski != v) {
    bool tetik = d.tur == DEGISEN || (d.tur == YUKSELEN && v) || (d.tur == DUSEN && !v);
    if (tetik) { Islev f = d.isr; f(); }
  }
}
inline bool pin_oku(Tam p) { return pinler()[p].deger; }
inline Tam analog_oku(Tam p) { auto& d = pinler()[p]; return d.pwm ? d.pwm * 16 : (d.deger ? 4095 : 0); }
inline void pwm_yaz(Tam p, Tam oran) { if (oran < 0) oran = 0; if (oran > 255) oran = 255; pinler()[p].pwm = oran; izle("pin " + metne(p) + " pwm " + metne(oran)); }
inline void bekle(Tam ms) { if (ms > 0) ilerle(saat_us + (int64_t)ms * 1000); }
inline void bekle_mikro(Tam us) { if (us > 0) ilerle(saat_us + us); }
inline Tam milisaniye() { return (Tam)(saat_us / 1000); }
inline Tam mikrosaniye() { return (Tam)saat_us; }
inline void kesme_bagla(Tam p, Islev f, Tam tur) { auto& d = pinler()[p]; d.isr = f; d.tur = tur; izle("pin " + metne(p) + " kesmesi bağlandı"); }
inline void kesme_coz(Tam p) { pinler()[p].isr = nullptr; }
inline Tam zamanlayici_kur(Tam ms, Islev f, bool tekrar) {
  if (ms <= 0) hata("Zamanlayıcı süresi pozitif olmalı");
  zamanlar().push_back({f, saat_us + (int64_t)ms * 1000, (int64_t)ms * 1000, tekrar, true});
  return (Tam)zamanlar().size() - 1;
}
inline void zamanlayici_durdur(Tam id) { if (id >= 0 && id < (Tam)zamanlar().size()) zamanlar()[id].etkin = false; }
inline void seri_baslat(Tam baud) { izle("seri " + metne(baud) + " baud"); }
inline Tam seri_var() { return 0; }
inline Tam seri_bayt_oku() { return -1; }
inline void seri_bayt_yaz(Tam b) { char c = (char)b; hal_yaz(&c, 1); }
inline void i2c_baslat(Tam sda, Tam scl, Tam hiz) { izle("i2c sda=" + metne(sda) + " scl=" + metne(scl) + " " + metne(hiz) + " Hz"); }
// Benzetimdeki I2C aygıtı: ilk bayt yazmaç adresidir, sonraki baytlar ardışık yazmaçlara yazılır.
inline Tam i2c_yaz(Tam adres, const Liste<Tam>& veri) {
  auto& d = i2c_aygitlar()[adres];
  if (!veri.p->empty()) {
    Tam r = (*veri.p)[0];
    for (size_t i = 1; i < veri.p->size(); i++) d.bellek[(r + i - 1) & 255] = (*veri.p)[i] & 255;
    d.yazmac = r;
  }
  izle("i2c 0x" + metne(adres) + " ← " + metne(veri));
  return 0;
}
inline Liste<Tam> i2c_oku(Tam adres, Tam n) {
  auto& d = i2c_aygitlar()[adres];
  Liste<Tam> r; for (Tam i = 0; i < n; i++) r.p->push_back(d.bellek[(d.yazmac + i) & 255]);
  return r;
}
inline Liste<Tam> i2c_yaz_oku(Tam adres, const Liste<Tam>& veri, Tam n) { i2c_yaz(adres, veri); return i2c_oku(adres, n); }
inline void spi_baslat(Tam, Tam, Tam, Tam hiz) { izle("spi " + metne(hiz) + " Hz"); }
inline Tam spi_aktar(Tam b) { return b & 255; }
constexpr Tam YERLESIK_LED = 2;
constexpr bool BENZETIM = true;
}  // namespace donanim

inline void hal_baslat() {}
inline void hal_bitti(int) {}
}  // namespace y
#endif
