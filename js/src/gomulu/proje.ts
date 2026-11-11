// Gömülü proje çıktısı: ESP32 için Arduino/PlatformIO klasörü ya da masaüstü benzetim derlemesi.
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { cppDerle, GomuluCikti, GomuluSecenekleri } from './uretici_cpp';

export const BASLIKLAR = ['yontem.hpp', 'yontem_yz.hpp', 'yontem_donanim.hpp'];

export function baslikDizini(): string {
  const adaylar = [path.join(__dirname, '..', '..', 'gomulu'), path.join(__dirname, '..', 'gomulu')];
  return adaylar.find(d => fs.existsSync(path.join(d, 'yontem.hpp'))) ?? adaylar[0];
}

/** Arduino/PlatformIO klasörü yazar: <klasör>/<ad>.ino + başlıklar + platformio.ini */
export function projeYaz(kaynak: string, yol: string, klasor: string, sec: GomuluSecenekleri): { cikti: GomuluCikti; ino: string } {
  const cikti = cppDerle(kaynak, yol, sec);
  const ad = path.basename(klasor);
  fs.mkdirSync(klasor, { recursive: true });
  const ino = path.join(klasor, `${ad}.ino`);
  // Kod .cpp dosyasındadır: Arduino'nun .ino ön işlemesi (otomatik prototipler) C++ kodunu bozmasın.
  fs.writeFileSync(ino, `// ${ad} — Yöntem programından üretildi.\n// Programın kendisi yontem_program.cpp dosyasındadır; setup() ve loop() orada tanımlıdır.\n`);
  fs.writeFileSync(path.join(klasor, 'yontem_program.cpp'), cikti.kod);
  for (const b of BASLIKLAR) fs.copyFileSync(path.join(baslikDizini(), b), path.join(klasor, b));
  fs.writeFileSync(path.join(klasor, 'platformio.ini'), `; Yöntem derleyicisiyle üretildi.
; Derle ve yükle:  pio run -t upload   |  Seri izleme: pio device monitor -b 115200
[platformio]
src_dir = .

[env:esp32]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
build_unflags = -std=gnu++11
build_flags = -std=gnu++17 -fexceptions
`);
  fs.writeFileSync(path.join(klasor, 'BENIOKU.txt'), `${ad} — Yöntem programından üretilmiş ESP32 projesi

Arduino IDE: ${ad}.ino dosyasını açın (kod yontem_program.cpp içindedir), kart olarak "ESP32 Dev Module" seçin, yükleyin.
  (ESP32 Arduino çekirdeği 3.x önerilir; 2.x için Araçlar menüsünden C++17 gerekir.)
arduino-cli: arduino-cli compile --fqbn esp32:esp32:esp32 ${ad} && arduino-cli upload -p /dev/ttyUSB0 --fqbn esp32:esp32:esp32 ${ad}
PlatformIO:  pio run -t upload && pio device monitor -b 115200

Seri hız 115200. yaz(...) çıktısı ve oku(...) girdisi seri port üzerinden yapılır.

yontem*.hpp dosyaları Yöntem çalışma zamanıdır: (c) 2026 Önder Örnek, MIT lisansı. Kendi programınızı
istediğiniz lisansla dağıtabilirsiniz; bu dosyalardaki telif ve lisans notunu korumanız yeterlidir.
`);
  return { cikti, ino };
}

/** Masaüstü benzetimi için g++ ile derler; çalıştırılabilir dosya yolunu döndürür */
export function masaustuDerle(kaynak: string, yol: string, cikis: string, sec: GomuluSecenekleri): GomuluCikti {
  const cikti = cppDerle(kaynak, yol, sec);
  const cpp = cikis + '.cpp';
  fs.writeFileSync(cpp, cikti.kod);
  const derleyici = process.env.CXX || 'g++';
  const p = spawnSync(derleyici, ['-std=gnu++17', '-O1', '-fwrapv', '-w', '-I', baslikDizini(), cpp, '-o', cikis], { encoding: 'utf-8' });
  if (p.error) throw new Error(`C++ derleyicisi çalıştırılamadı (${derleyici}): ${p.error.message}`);
  if (p.status !== 0) {
    const e: any = new Error(`C++ derlemesi başarısız oldu:\n${p.stderr}`);
    e.cppHatasi = true;
    throw e;
  }
  return cikti;
}
