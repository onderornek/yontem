const N = 40000;
const sozcukler = ['elma', 'armut', 'kiraz', 'erik', 'incir', 'üzüm', 'nar', 'ayva', 'dut', 'şeftali',
  'karpuz', 'kavun', 'muz', 'limon', 'portakal', 'mandalina'];
const parcalar = [];
let tohum = 7;
for (let i = 0; i < N; i++) {
  tohum = (tohum * 16807) % 2147483647;
  let k = (tohum % 1000) % 16;
  if (k > 7) k = (k * k) % 16;
  parcalar.push(sozcukler[k]);
}
const metin = parcalar.join(' ');
const sayim = new Map();
for (const s of metin.split(' ')) sayim.set(s, (sayim.get(s) || 0) + 1);
console.log(`Toplam sözcük: ${metin.split(' ').length}, farklı: ${sayim.size}`);
const kullanildi = new Set();
for (let i = 0; i < 5; i++) {
  let enSayi = -1, enIyi = '';
  for (const s of sozcukler) if (sayim.has(s) && !kullanildi.has(s) && sayim.get(s) > enSayi) { enSayi = sayim.get(s); enIyi = s; }
  kullanildi.add(enIyi);
  console.log(`${enIyi} ${enSayi}`);
}
