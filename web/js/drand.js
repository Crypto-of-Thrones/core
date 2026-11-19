
export const QUICKNET = Object.freeze({
  hash: '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971',
  public_key: '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a',
  period: 3,
  genesis_time: 1692803367,
  schemeID: 'bls-unchained-g1-rfc9380',
});

export const ENDPOINTS = Object.freeze(['https://drand.cloudflare.com', 'https://api.drand.sh', 'https://api2.drand.sh', 'https://api3.drand.sh']);

export const DRAW_LEAD = 2;

export const DRAW_DOMAIN = 'cot-draw/v1';

const SCHEME = 'bls-unchained-g1-rfc9380';
const HEX = /^[0-9a-f]+$/;

export const roundAt = (ms, info = QUICKNET) => Math.max(1, Math.floor((ms / 1000 - info.genesis_time) / info.period) + 1);

export const roundTime = (round, info = QUICKNET) => (info.genesis_time + (round - 1) * info.period) * 1000;

export const drawRound = (now, info = QUICKNET) => roundAt(now, info) + DRAW_LEAD;

export const DRAW_SKEW_MS = 250;

export const actionRound = (now, info = QUICKNET) => roundAt(now + DRAW_SKEW_MS, info) + 1;

export function hexToBytes(s) {
  if (typeof s !== 'string' || s.length % 2 || (s.length && !HEX.test(s))) throw new Error('drand: bad hex');
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export const bytesToHex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));

export async function roundMessage(round) {
  const m = new Uint8Array(8);
  new DataView(m.buffer).setBigUint64(0, BigInt(round));
  return sha256(m);
}

let blsLib = null;
export const loadBls = () => (blsLib ??= import('../vendor/noble-bls/bls12-381.js').then((m) => m.bls12_381));

export async function verifyRound(beacon, info = QUICKNET) {
  if (info.schemeID !== SCHEME) throw new Error(`drand: unsupported scheme ${info.schemeID}`);
  const b = beacon || {};
  if (!Number.isSafeInteger(b.round) || b.round < 1) return false;
  if (typeof b.signature !== 'string' || b.signature.length !== 96 || !HEX.test(b.signature)) return false;
  if (typeof b.randomness !== 'string' || b.randomness.length !== 64) return false;
  const sig = hexToBytes(b.signature);
  if (bytesToHex(await sha256(sig)) !== b.randomness) return false;
  const bls = await loadBls();
  try {
    return bls.shortSignatures.verify(sig, bls.shortSignatures.hash(await roundMessage(b.round)), hexToBytes(info.public_key));
  } catch {
    return false;
  }
}

const verified = new Map();
const KEEP = 256;

function remember(chain, beacon) {
  verified.set(`${chain}:${beacon.round}`, beacon);
  if (verified.size > KEEP) verified.delete(verified.keys().next().value);
}

const fail = (code) => Object.assign(new Error(code), { code });

export async function fetchRound(round, { info = QUICKNET, endpoints = ENDPOINTS, timeoutMs = 4000, fetchFn = globalThis.fetch, fresh = false } = {}) {
  const hit = !fresh && verified.get(`${info.hash}:${round}`);
  if (hit) return hit;
  let last = 'drand_unavailable';
  for (const base of endpoints) {
    try {
      const res = await fetchFn(`${base}/${info.hash}/public/${round}`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) {
        if (res.status === 404 || res.status === 425) last = 'drand_not_yet';
        continue;
      }
      const j = await res.json();
      const beacon = { round: j.round, randomness: j.randomness, signature: j.signature };
      if (beacon.round !== round || !(await verifyRound(beacon, info))) { last = 'drand_bad_beacon'; continue; }
      remember(info.hash, beacon);
      return beacon;
    } catch {  }
  }
  throw fail(last);
}

export async function waitRound(round, { info = QUICKNET, graceMs = 20000, now = Date.now, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), ...opt } = {}) {
  const due = roundTime(round, info);
  if (due - now() > 60e3) throw fail('drand_too_far');
  for (;;) {
    const wait = due - now();
    if (wait > 0) await sleep(wait);
    try {
      return await fetchRound(round, { info, ...opt });
    } catch (err) {
      if (now() + 1000 > due + graceMs) throw err;
      await sleep(now() < due + RETRY_SOON_FOR_MS ? RETRY_SOON_MS : 1000);
    }
  }
}

const RETRY_SOON_MS = 250;
const RETRY_SOON_FOR_MS = 2000;

export function uniforms(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = [];
  for (let i = 0; i + 4 <= bytes.length; i += 4) out.push(dv.getUint32(i) / 4294967296);
  return out;
}

const hmacKey = (randomness) => crypto.subtle.importKey('raw', hexToBytes(randomness), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

export async function drawBlock(randomness, id, context, block = 0, key = null) {
  const k = key || (await hmacKey(randomness));
  const msg = new TextEncoder().encode(JSON.stringify([DRAW_DOMAIN, String(context), String(id), block]));
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, msg));
}

export async function deriveOutcome(randomness, id, context, count = 8) {
  const key = await hmacKey(randomness);
  const out = [];
  for (let b = 0; out.length < count; b++) out.push(...uniforms(await drawBlock(randomness, id, context, b, key)));
  return out.slice(0, count);
}
