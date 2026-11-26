import { BATTLE, FIELD_LUCK } from './data.js';
import { MAINNET, SERVER_MODE } from './buildprofile.js';

export const fieldPower = (f) => Math.cbrt((Math.max(0, f.atk) * Math.max(0, f.hp) * (BATTLE.armor + Math.max(0, f.def))) / BATTLE.armor);

export const FIELD_LUCK_SINCE = Date.UTC(2026, 10, 25, 6, 24, 0);
export const FIELD_LUCK_RULES = Object.freeze([
  Object.freeze({ normal: Object.freeze({ base: 0.15, floor: 0.05 }), revenge: Object.freeze({ base: 0.25, floor: 0.1 }), since: 0, until: Date.UTC(2026, 10, 25, 6, 25, 30) }),
]);

export function upsetChance(r, revenge = false, rule = FIELD_LUCK) {
  const L = revenge ? rule.revenge : rule.normal;
  const k = Math.max(1, Number.isFinite(r) ? r : Infinity);
  return Math.max(L.floor, L.base / (k * k));
}

export function fieldLuck(att, dfd, attWon, roll, revenge = false, rule = FIELD_LUCK) {
  const [w, l] = attWon ? [att, dfd] : [dfd, att];
  const pl = fieldPower(l);
  const r = pl > 0 ? Math.max(1, fieldPower(w) / pl) : Infinity;
  const u = upsetChance(r, revenge, rule);
  const upset = roll < u;
  return { r, u, roll, upset, won: attWon !== upset };
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(bytes) {
  const len = bytes.length;
  const n = (((len + 9 + 63) >> 6) << 6);
  const m = new Uint8Array(n);
  m.set(bytes);
  m[len] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(n - 8, Math.floor(len / 0x20000000));
  dv.setUint32(n - 4, (len << 3) >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  const rot = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = W[i - 15], b = W[i - 2];
      W[i] = W[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + W[i - 7] + (rot(b, 17) ^ rot(b, 19) ^ (b >>> 10));
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, H[i]);
  return out;
}

const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s) => {
  if (typeof s !== 'string' || s.length % 2 || /[^0-9a-f]/i.test(s)) throw new Error('fieldluck: bad hex');
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
};
const utf8 = (s) => new TextEncoder().encode(s);

export const battleId = (attacker, defender, listId, nonce) => hex(sha256(utf8(`${attacker}|${defender}|${listId}|${nonce}`)));

export function luckRoll(randomness, id) {
  const r = unhex(randomness);
  const b = unhex(id);
  const msg = new Uint8Array(r.length + b.length);
  msg.set(r);
  msg.set(b, r.length);
  const d = sha256(msg);
  return new DataView(d.buffer).getUint32(0) / 4294967296;
}

export const mockRandomness = (seed, round) => {
  if (MAINNET) throw new Error('mockRandomness: no mock randomness in a mainnet build');
  if (SERVER_MODE) throw new Error('mockRandomness: no mock randomness in server mode');
  return hex(sha256(utf8(`cot-mock-drand/v1|${seed >>> 0}|${round}`)));
};
