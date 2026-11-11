#!/bin/bash
# Yöntem programını ESP32 için derler ve Espressif QEMU öykünücüsünde çalıştırır (Linux x86_64).
#   kullanım: js/betikler/esp32_qemu.sh program.y [saniye]
# İlk çalıştırmada araçları ~/.yontem-esp32 altına indirir (~1 GB): arduino-cli, ESP32 Arduino
# çekirdeği 3.0.7, Xtensa derleyicisi (esp-12.2.0), ESP-IDF kitaplıkları ve QEMU.
set -euo pipefail
YOL="$(realpath "${1:?program.y verin}")"; SURE="${2:-20}"
KOK="$(cd "$(dirname "$0")/../.." && pwd)"
A="${YONTEM_ESP32:-$HOME/.yontem-esp32}"
mkdir -p "$A" && cd "$A"
if [ ! -x arduino-cli ]; then
  echo "Araçlar indiriliyor ($A)..."
  curl -sSL https://github.com/arduino/arduino-cli/releases/download/v1.1.1/arduino-cli_1.1.1_Linux_64bit.tar.gz | tar xz arduino-cli
  git clone -q --depth 1 --branch 3.0.7 https://github.com/espressif/arduino-esp32.git core
  mkdir -p core/tools/esptool fakectags sb/hardware/espressif
  curl -sSL https://github.com/espressif/crosstool-NG/releases/download/esp-12.2.0_20230208/xtensa-esp32-elf-12.2.0_20230208-x86_64-linux-gnu.tar.gz | tar xz -C core/tools
  curl -sSL -o libs.zip https://github.com/espressif/esp32-arduino-lib-builder/releases/download/idf-release_v5.1/esp32-arduino-libs-idf-release_v5.1-632e0c2a.zip
  unzip -q libs.zip -d core/tools && rm libs.zip
  curl -sSL https://github.com/espressif/qemu/releases/download/esp-develop-9.0.0-20240606/qemu-xtensa-softmmu-esp_develop_9.0.0_20240606-x86_64-linux-gnu.tar.xz | tar xJ
  python3 -m pip install -q esptool || python3 -m pip install -q --break-system-packages esptool
  printf 'import sys\nsys.path.pop(0)\nimport esptool\nesptool._main()\n' > core/tools/esptool/esptool.py
  printf '#!/bin/sh\nexit 0\n' > fakectags/ctags && chmod +x fakectags/ctags
  ln -sfn "$A/core" sb/hardware/espressif/esp32
  printf 'directories:\n  user: %s/sb\n  data: %s/data\n  downloads: %s/dl\n' "$A" "$A" "$A" > cli.yaml
fi
AD="$(basename "$YOL" .y | tr -c 'A-Za-z0-9_\n' '_')"
PROJE="$A/proje/$AD"
rm -rf "$PROJE"
( cd "$(dirname "$YOL")" && node "$KOK/js/dist/cli.js" gomulu "$(basename "$YOL")" -o "$PROJE" )
./arduino-cli --config-file cli.yaml compile --fqbn espressif:esp32:esp32:FlashMode=dio \
  --build-property tools.ctags.path="$A/fakectags" --output-dir "$A/cikti/$AD" "$PROJE" 2>&1 \
  | grep -E "error|Sketch uses|Global variables" || true
[ -f "$A/cikti/$AD/$AD.ino.merged.bin" ] || { echo "ESP32 derlemesi başarısız"; exit 1; }
echo "--- QEMU (ESP32) seri çıktısı ---"
LOG="$A/cikti/$AD/qemu.log"
timeout "$SURE" ./qemu/bin/qemu-system-xtensa -nographic -machine esp32 \
  -drive file="$A/cikti/$AD/$AD.ino.merged.bin",if=mtd,format=raw -nic none -serial stdio -monitor none > "$LOG" 2>&1 || true
tr -d '\r' < "$LOG" | sed -n '/^entry 0x/,$p' | grep -av '^entry\|^I (\|^W (\|terminating on signal' || true
