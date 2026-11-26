import { sha256, toHex, utf8, ledgerRefOf, LEDGER_REF_SALT_FROM } from './net.js';

const CLAIM_KIND = /^(withdraw|withdrawEarly)$/;
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const DATA_PREFIX = 'Program data: ';
const INVOKE_RE = /^Program ([1-9A-HJ-NP-Za-km-z]{32,44}) invoke \[\d+\]$/;
const EXIT_RE = /^Program ([1-9A-HJ-NP-Za-km-z]{32,44}) (success|failed)/;
const CLAIMED_LEN = 8 + 32 + 24 + 64 + 40;
const SCAN_MS = 30 * 86400e3;
const SCAN_PAGES = 5;

let claimedDisc = null;

function base58(bytes) {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let s = '';
  while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b) break; s = `1${s}`; }
  return s;
}

const u64le = (b, at) => { let x = 0n; for (let i = 7; i >= 0; i--) x = (x << 8n) | BigInt(b[at + i]); return x; };

export async function claimedEvents(logs, programId) {
  claimedDisc ||= toHex((await sha256(utf8('event:Claimed'))).slice(0, 8));
  const out = [];
  const stack = [];
  for (const line of Array.isArray(logs) ? logs : []) {
    if (typeof line !== 'string') continue;
    let m;
    if ((m = INVOKE_RE.exec(line))) { stack.push(m[1]); continue; }
    if ((m = EXIT_RE.exec(line))) { stack.pop(); continue; }
    if (!line.startsWith(DATA_PREFIX) || stack[stack.length - 1] !== programId) continue;
    let b;
    try { b = Uint8Array.from(atob(line.slice(DATA_PREFIX.length)), (c) => c.charCodeAt(0)); } catch { continue; }
    if (b.length !== CLAIMED_LEN || toHex(b.slice(0, 8)) !== claimedDisc) continue;
    out.push({ player: base58(b.slice(8, 40)), lotsHash: toHex(b.slice(64, 96)), ledgerRef: toHex(b.slice(96, 128)), nonce: u64le(b, 128).toString() });
  }
  return out;
}

async function rpcCall(o, method, params) {
  const res = await (o.fetchFn || fetch)(o.rpc, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await res.json();
  if (j?.error) throw new Error(`rpc ${method}: ${j.error.message || 'error'}`);
  return j?.result ?? null;
}

const txOf = (o, sig) => rpcCall(o, 'getTransaction', [sig, { encoding: 'json', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]);

async function findClaim(o, wallet, nonce, ref, ts) {
  let before;
  for (let page = 0; page < SCAN_PAGES; page++) {
    const list = await rpcCall(o, 'getSignaturesForAddress', [wallet, { commitment: 'confirmed', limit: 1000, ...(before ? { before } : {}) }]);
    if (!Array.isArray(list)) throw new Error('rpc: bad signature list');
    for (const s of list) {
      before = s.signature;
      if (Number.isSafeInteger(s.blockTime) && s.blockTime * 1000 < ts) return null;
      if (s.err || (Number.isSafeInteger(s.blockTime) && s.blockTime * 1000 > ts + SCAN_MS)) continue;
      const tx = await txOf(o, s.signature);
      const hit = (await claimedEvents(tx?.meta?.logMessages, o.programId)).find((c) => c.nonce === nonce && c.player === wallet && c.ledgerRef === ref);
      if (hit && !tx.meta?.err) return hit;
    }
    if (list.length < 1000) return null;
  }
  return null;
}

export async function checkClaimRef(e, d, o = {}) {
  const r = d?.refs || {};
  if (!CLAIM_KIND.test(e.kind) || r.bridge || !o.rpc || !o.programId) return null;
  if (r.ledgerSalt === undefined && e.ts >= LEDGER_REF_SALT_FROM) return 'bad';
  let ref;
  try { ref = await ledgerRefOf(e.hash, r.ledgerSalt ?? null); } catch { return 'bad'; }
  const nonce = String(r.nonce);
  try {
    const sig = o.sigOf ? await o.sigOf(d.actionId) : undefined;
    let claim = null;
    if (sig) {
      const tx = await txOf(o, sig);
      if (!tx) return 'fail';
      if (tx.transaction?.signatures?.[0] !== sig || tx.meta?.err) return 'bad';
      claim = (await claimedEvents(tx.meta?.logMessages, o.programId))[0] || null;
      if (!claim) return 'bad';
    } else if (sig === undefined && typeof r.to === 'string') {
      claim = await findClaim(o, r.to, nonce, ref, e.ts);
    }
    if (!claim) return 'pending';
    return claim.ledgerRef === ref && claim.player === r.to && claim.nonce === nonce ? 'ok' : 'bad';
  } catch {
    return 'fail';
  }
}
