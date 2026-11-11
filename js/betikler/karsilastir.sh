#!/bin/bash
# Python yorumlayıcısı ile JS derleyicisinin çıktılarını karşılaştırır: karsilastir.sh dosya.y ...
KOK="$(cd "$(dirname "$0")/../.." && pwd)"
gecen=0; kalan=0
for f in "$@"; do
  d=$(dirname "$f"); b=$(basename "$f")
  girdi=/dev/null; [ -f "${f%.y}.girdi" ] && girdi="$(cd "$(dirname "${f%.y}.girdi")" && pwd)/$(basename "${f%.y}.girdi")"
  py=$(cd "$d" && timeout 120 python3 "$KOK/yontem.py" "$b" < "$girdi" 2>&1; echo "[kod $?]")
  js=$(cd "$d" && timeout 120 node "$KOK/js/dist/cli.js" "$b" < "$girdi" 2>&1; echo "[kod $?]")
  if [ "$py" == "$js" ]; then gecen=$((gecen+1)); else kalan=$((kalan+1)); echo "=== FARK: $f"; diff <(echo "$py") <(echo "$js") | head -12; fi
done
echo "$gecen aynı, $kalan farklı"
