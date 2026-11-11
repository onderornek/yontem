// Python'un random.Random sınıfıyla bit düzeyinde uyumlu Mersenne Twister.
// Aynı tohum, Python sürümüyle aynı sayı dizisini üretir (Tohum(42) → aynı ağırlıklar).

const N = 624, M = 397;

export class PyRandom {
  private mt = new Uint32Array(N);
  private mti = N + 1;
  private gaussSonraki: number | null = null;

  constructor(tohum?: bigint | number | null) { this.seed(tohum ?? null); }

  private initGenrand(s: number) {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      // 1812433253 * p + i  (32 bit)
      mt[i] = (((((p & 0xffff0000) >>> 16) * 1812433253) << 16) + (p & 0x0000ffff) * 1812433253 + i) >>> 0;
    }
    this.mti = N;
  }

  private initByArray(key: number[]) {
    this.initGenrand(19650218);
    const mt = this.mt;
    let i = 1, j = 0;
    let k = N > key.length ? N : key.length;
    for (; k; k--) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ (((((p & 0xffff0000) >>> 16) * 1664525) << 16) + ((p & 0x0000ffff) * 1664525))) + key[j] + j) >>> 0;
      i++; j++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (k = N - 1; k; k--) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ (((((p & 0xffff0000) >>> 16) * 1566083941) << 16) + (p & 0x0000ffff) * 1566083941)) - i) >>> 0;
      i++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
    }
    mt[0] = 0x80000000;
  }

  seed(a: bigint | number | null) {
    this.gaussSonraki = null;
    if (a === null || a === undefined) {
      const key: number[] = [];
      const kaynak = (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.getRandomValues)
        ? (globalThis as any).crypto.getRandomValues(new Uint32Array(8)) : null;
      for (let i = 0; i < 8; i++) key.push(kaynak ? kaynak[i] : Math.floor(Math.random() * 4294967296));
      key.push(Date.now() >>> 0);
      this.initByArray(key);
      return;
    }
    let n = typeof a === 'bigint' ? a : BigInt(Math.trunc(a));
    if (n < 0n) n = -n;
    const key: number[] = [];
    if (n === 0n) key.push(0);
    while (n > 0n) { key.push(Number(n & 0xffffffffn)); n >>= 32n; }
    this.initByArray(key);
  }

  genrandUint32(): number {
    const mt = this.mt;
    let y: number;
    if (this.mti >= N) {
      let kk = 0;
      for (; kk < N - M; kk++) {
        y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      for (; kk < N - 1; kk++) {
        y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      y = (mt[N - 1] & 0x80000000) | (mt[0] & 0x7fffffff);
      mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      this.mti = 0;
    }
    y = mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** [0, 1) aralığında 53 bitlik ondalık (Python random()) */
  random(): number {
    const a = this.genrandUint32() >>> 5, b = this.genrandUint32() >>> 6;
    return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
  }

  getrandbits(k: number): bigint {
    if (k <= 0) return 0n;
    if (k <= 32) return BigInt(this.genrandUint32() >>> (32 - k));
    let sonuc = 0n, kaydir = 0n;
    let kalan = k;
    while (kalan > 0) {
      let r = this.genrandUint32();
      if (kalan < 32) r >>>= (32 - kalan);
      sonuc |= BigInt(r) << kaydir;
      kaydir += 32n;
      kalan -= 32;
    }
    return sonuc;
  }

  /** [0, n) aralığında tamsayı (Python _randbelow) */
  randbelow(n: bigint): bigint {
    if (n <= 0n) return 0n;
    const k = n.toString(2).length;
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  randrange(a: bigint, b?: bigint): bigint {
    if (b === undefined) {
      if (a > 0n) return this.randbelow(a);
      throw new RangeError('empty range for randrange()');
    }
    const w = b - a;
    if (w > 0n) return a + this.randbelow(w);
    throw new RangeError('empty range in randrange()');
  }

  randint(a: bigint, b: bigint): bigint { return this.randrange(a, b + 1n); }

  choice<T>(seq: T[]): T { return seq[Number(this.randbelow(BigInt(seq.length)))]; }

  shuffle<T>(x: T[]) {
    for (let i = x.length - 1; i >= 1; i--) {
      const j = Number(this.randbelow(BigInt(i + 1)));
      const t = x[i]; x[i] = x[j]; x[j] = t;
    }
  }

  choices<T>(pop: T[], weights: number[] | null, k: number): T[] {
    const n = pop.length;
    if (!weights) return Array.from({ length: k }, () => pop[Math.floor(this.random() * n)]);
    const cum: number[] = [];
    let s = 0;
    for (const w of weights) { s += w; cum.push(s); }
    const total = cum[cum.length - 1] + 0.0;
    const hi = n - 1;
    const out: T[] = [];
    for (let t = 0; t < k; t++) {
      const x = this.random() * total;
      // bisect_right(cum, x, 0, hi)
      let lo = 0, h = hi;
      while (lo < h) { const mid = (lo + h) >> 1; if (x < cum[mid]) h = mid; else lo = mid + 1; }
      out.push(pop[lo]);
    }
    return out;
  }

  gauss(mu = 0.0, sigma = 1.0): number {
    let z = this.gaussSonraki;
    this.gaussSonraki = null;
    if (z === null) {
      const x2pi = this.random() * (2 * Math.PI);
      const g2rad = Math.sqrt(-2.0 * Math.log(1.0 - this.random()));
      z = Math.cos(x2pi) * g2rad;
      this.gaussSonraki = Math.sin(x2pi) * g2rad;
    }
    return mu + z * sigma;
  }
}
