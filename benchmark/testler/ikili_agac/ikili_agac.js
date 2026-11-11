class Dugum { constructor() { this.sol = null; this.sag = null; } }
function kur(d) { const x = new Dugum(); if (d > 0) { x.sol = kur(d - 1); x.sag = kur(d - 1); } return x; }
function say(x) { if (x.sol === null) return 1; return 1 + say(x.sol) + say(x.sag); }
for (let derinlik = 4; derinlik <= 14; derinlik++) {
  if (derinlik % 2 === 0) {
    let toplam = 0;
    for (let i = 0; i < 4; i++) toplam += say(kur(derinlik));
    console.log(`derinlik ${String(derinlik).padStart(2)}: ${toplam} düğüm`);
  }
}
