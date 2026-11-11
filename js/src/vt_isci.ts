// Veritabanı iş parçacığı: eşzamansız PostgreSQL (pg) ve MySQL (mysql2) sürücülerini çalıştırır; ana iş parçacığı
// her isteğin yanıtını bekler (vt_dugum.ts). Değerler sunucudan metin olarak alınır ve sütun tipine göre burada
// çevrilir; böylece Python sürümüyle (pg8000, pymysql) aynı Yöntem değerleri elde edilir.
import { workerData } from 'worker_threads';

const bayrak = new Int32Array(workerData.bayrak);
const kanal = workerData.kanal;
const yanitla = (m: any) => { kanal.postMessage(m); Atomics.notify(bayrak, 0); };

function surucuYukle(ad: string, urun: string): any {
  try { return require(require.resolve(ad, { paths: [...workerData.aramaYollari, __dirname] })); }
  catch { throw new Error(`${urun} için '${ad}' paketi gerekli: projenizin klasöründe 'npm install ${ad}' çalıştırın`); }
}
/** '?' yer tutucularını $1, $2 … yapar (metin sabitleri, tırnaklı adlar ve yorumların içindekilere dokunmaz) */
export function yerTutucular(sql: string, cevir: (n: number) => string): string {
  let out = '', n = 0, i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < sql.length) { if (sql[j] === c) { if (sql[j + 1] === c) { j += 2; continue; } break; } j++; }
      out += sql.slice(i, j + 1); i = j + 1;
    } else if (c === '-' && sql[i + 1] === '-') { const j = sql.indexOf('\n', i); const s = j < 0 ? sql.length : j; out += sql.slice(i, s); i = s; }
    else if (c === '/' && sql[i + 1] === '*') { const j = sql.indexOf('*/', i + 2); const s = j < 0 ? sql.length : j + 2; out += sql.slice(i, s); i = s; }
    else if (c === '?') { out += cevir(++n); i++; }
    else { out += c; i++; }
  }
  return out;
}

let calistir: (sql: string, p: any[]) => Promise<{ satirlar: [string, any][][]; etkilenen: number }>;
let sonKimlik: () => Promise<any>;
let kapat: () => Promise<void>;

async function pgBaglan(hedef: string) {
  const pg = surucuYukle('pg', 'PostgreSQL');
  const c = new pg.Client({ connectionString: hedef, connectionTimeoutMillis: 15000 });
  await c.connect();
  const TAM = new Set([20, 21, 23, 26]), ONDALIK = new Set([700, 701, 1700]);
  const cevir = (oid: number, v: string | null): any => v === null ? null : oid === 16 ? v === 't' : TAM.has(oid) ? BigInt(v) : ONDALIK.has(oid) ? Number(v) : v;
  calistir = async (sql, p) => {
    const r = await c.query({ text: yerTutucular(sql, n => '$' + n), values: p.map((x: any) => typeof x === 'bigint' ? x.toString() : x), rowMode: 'array', types: { getTypeParser: () => (v: string) => v } });
    const alanlar: any[] = r.fields ?? [];
    const satirlar = (r.rows ?? []).map((s: any[]) => s.map((v, i) => [alanlar[i].name, cevir(alanlar[i].dataTypeID, v)] as [string, any]));
    return { satirlar, etkilenen: alanlar.length ? 0 : (r.rowCount ?? 0) };
  };
  sonKimlik = async () => { throw new Error("PostgreSQL'de SonKimlik yoktur; INSERT … RETURNING kullanın"); };
  kapat = async () => { await c.end(); };
}

async function mysqlBaglan(hedef: string) {
  const mysql = surucuYukle('mysql2', 'MySQL');
  const c: any = await new Promise((coz, reddet) => {
    const b = mysql.createConnection({ uri: hedef.replace(/^mariadb:/i, 'mysql:'), connectTimeout: 15000, charset: 'utf8mb4', supportBigNumbers: true, bigNumberStrings: true, dateStrings: true, decimalNumbers: false });
    b.connect((e: any) => e ? reddet(e) : coz(b));
  });
  // MySQL tip kodları: tamsayılar ve ondalıklar
  const TAM = new Set(['TINY', 'SHORT', 'LONG', 'LONGLONG', 'INT24', 'YEAR']), ONDALIK = new Set(['DECIMAL', 'NEWDECIMAL', 'FLOAT', 'DOUBLE']);
  let kimlik: any = 0n;
  calistir = (sql, p) => new Promise((coz, reddet) => {
    c.query({ sql, values: p.map((x: any) => typeof x === 'bigint' ? x.toString() : x), rowsAsArray: true, typeCast: (alan: any, sonraki: () => any) => {
      const v = alan.string('utf8');
      return v === null ? null : TAM.has(alan.type) ? BigInt(v) : ONDALIK.has(alan.type) ? Number(v) : v;
    } }, (e: any, satirlar: any, alanlar: any) => {
      if (e) return reddet(e);
      if (Array.isArray(satirlar)) return coz({ satirlar: satirlar.map((s: any[]) => s.map((v, i) => [alanlar[i].name, v] as [string, any])), etkilenen: 0 });
      if (satirlar.insertId) kimlik = BigInt(satirlar.insertId);
      coz({ satirlar: [], etkilenen: satirlar.affectedRows ?? 0 });
    });
  });
  sonKimlik = async () => kimlik;
  kapat = () => new Promise((coz) => c.end(() => coz()));
}

kanal.on('message', async (m: any) => {
  try {
    if (m.t === 'baglan') { await (m.tur === 'postgres' ? pgBaglan(m.hedef) : mysqlBaglan(m.hedef)); yanitla({}); }
    else if (m.t === 'calistir') yanitla(await calistir(m.sql, m.p));
    else if (m.t === 'sonkimlik') yanitla({ deger: await sonKimlik() });
    else if (m.t === 'kapat') { await kapat(); yanitla({}); }
  } catch (e: any) {
    yanitla({ hata: String(e && e.message ? e.message : e).split('\n')[0] });
  }
});
