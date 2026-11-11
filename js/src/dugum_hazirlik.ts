// Node.js'e özgü hazırlık. Node 18'de Web Crypto genel bir ad olarak tanımlı değildir
// (Node 19 ile geldi); Güvenlik birimi ve rastgele üreteç onu globalThis.crypto olarak bekler.
if (typeof (globalThis as any).crypto?.getRandomValues !== 'function') {
  try {
    Object.defineProperty(globalThis, 'crypto', { value: require('crypto').webcrypto, configurable: true });
  } catch { /* Web Crypto yoksa Güvenlik birimi kendi hatasını verir */ }
}
