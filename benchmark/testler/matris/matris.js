const N = 100;
const A = [], B = [], C = [];
for (let i = 0; i < N * N; i++) { A.push(((i * 7) % 13) / 13.0); B.push(((i * 5) % 11) / 11.0); C.push(0.0); }
for (let i = 0; i < N; i++)
  for (let j = 0; j < N; j++) {
    let s = 0.0;
    for (let k = 0; k < N; k++) s += A[i * N + k] * B[k * N + j];
    C[i * N + j] = s;
  }
let iz = 0.0;
for (let i = 0; i < N; i++) iz += C[i * N + i];
console.log(iz.toFixed(6));
