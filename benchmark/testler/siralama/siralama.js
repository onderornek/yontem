const N = 30000;
function sirala(L, alt, ust) {
  if (alt >= ust) return;
  const mihver = L[Math.floor((alt + ust) / 2)];
  let i = alt, j = ust;
  while (i <= j) {
    while (L[i] < mihver) i++;
    while (L[j] > mihver) j--;
    if (i <= j) { const t = L[i]; L[i] = L[j]; L[j] = t; i++; j--; }
  }
  sirala(L, alt, j);
  sirala(L, i, ust);
}
const L = [];
let tohum = 42;
for (let i = 0; i < N; i++) { tohum = (tohum * 16807) % 2147483647; L.push(tohum % 1000000); }
sirala(L, 0, N - 1);
let sagla = 0;
for (let i = 0; i < N; i++) {
  if (i > 0 && L[i - 1] > L[i]) throw new Error('sıralı değil');
  sagla = (sagla * 31 + L[i]) % 1000000007;
}
console.log(`${L[0]} ${L[N >> 1]} ${L[N - 1]}`);
console.log(sagla);
