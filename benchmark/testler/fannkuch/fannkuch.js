const N = 8;
const p = [], q = [], c = [];
for (let i = 0; i < N; i++) { p.push(i); q.push(0); c.push(0); }
let enCok = 0, sagla = 0, sira = 0, bitti = false;
while (!bitti) {
  for (let i = 0; i < N; i++) q[i] = p[i];
  let cevirme = 0, k = q[0];
  while (k !== 0) {
    let i = 0, j = k;
    while (i < j) { const t = q[i]; q[i] = q[j]; q[j] = t; i++; j--; }
    cevirme++;
    k = q[0];
  }
  if (cevirme > enCok) enCok = cevirme;
  sagla += sira % 2 === 0 ? cevirme : -cevirme;
  sira++;
  let i = 1;
  bitti = true;
  while (i < N) {
    const t = p[0];
    for (let j = 0; j < i; j++) p[j] = p[j + 1];
    p[i] = t;
    c[i]++;
    if (c[i] <= i) { bitti = false; break; }
    c[i] = 0;
    i++;
  }
}
console.log(sagla);
console.log(`En çok çevirme: ${enCok}`);
