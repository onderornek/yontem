const N = 120;
const A = (i, j) => 1.0 / ((i + j) * (i + j + 1) / 2 + i + 1);
function aCarp(g, c) { for (let i = 0; i < N; i++) { let s = 0.0; for (let j = 0; j < N; j++) s += A(i, j) * g[j]; c[i] = s; } }
function atCarp(g, c) { for (let i = 0; i < N; i++) { let s = 0.0; for (let j = 0; j < N; j++) s += A(j, i) * g[j]; c[i] = s; } }
function ataCarp(g, c, ara) { aCarp(g, ara); atCarp(ara, c); }
const u = new Array(N).fill(1.0), v = new Array(N).fill(0.0), ara = new Array(N).fill(0.0);
for (let a = 0; a < 10; a++) { ataCarp(u, v, ara); ataCarp(v, u, ara); }
let vBv = 0.0, vv = 0.0;
for (let i = 0; i < N; i++) { vBv += u[i] * v[i]; vv += v[i] * v[i]; }
console.log(Math.sqrt(vBv / vv).toFixed(9));
