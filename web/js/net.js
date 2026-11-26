
export const VERSION = 1;

export const T = Object.freeze({
  HELLO: 0x01,
  HELLO_ACK: 0x02,
  AUTH: 0x10,
  PING: 0x12,
  STATE_GET: 0x20,
  BOX_OPEN: 0x24,
  HERO_SET: 0x25,
  KILL_HINT: 0x26,
  TELEMETRY: 0x27,
  DRAGON_STATE: 0x30,
  DRAGON_HIT: 0x31,
  AUDIT_HEAD: 0x32,
  ADMIN_GRANT: 0x5a,
  DEBUG_SET: 0x5b,
  GOD_MODE: 0x5c,
  EVENT: 0x60,
  RESULT: 0x7f,
});

export const FLAG = Object.freeze({ NOREPLY: 0x0001, DEBUG: 0x8000 });

export const CURVE = Object.freeze({ X25519: 1, P256: 2 });
export const SIGALG = Object.freeze({ ED25519: 1, ECDSA_P256: 2 });

export const HEADER_LEN = 8;
export const MAX_FRAME = 16 * 1024;
export const DIR_C2S = 1;
export const DIR_S2C = 2;

const te = new TextEncoder();
const td = new TextDecoder('utf-8', { fatal: true });
const subtle = globalThis.crypto.subtle;


export const utf8 = (s) => te.encode(s);

export function concat(...parts) {
  const n = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function toHex(b) {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function fromHex(s) {
  if (typeof s !== 'string' || s.length % 2 || /[^0-9a-f]/i.test(s)) throw new Error('bad hex');
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}

export function b64u(bytes) {
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64u(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export const randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));


const TAG = { NULL: 0, FALSE: 1, TRUE: 2, INT: 3, F64: 4, STR: 5, BYTES: 6, ARR: 7, MAP: 8 };
const MAX_DEPTH = 8;
const MAX_ITEMS = 4096;

function writeVarint(out, n) {
  while (n >= 0x80) { out.push((n % 0x80) | 0x80); n = Math.floor(n / 0x80); }
  out.push(n);
}

function encodeInto(out, v, depth) {
  if (depth > MAX_DEPTH) throw new Error('codec: too deep');
  if (v === null || v === undefined) out.push(TAG.NULL);
  else if (v === false) out.push(TAG.FALSE);
  else if (v === true) out.push(TAG.TRUE);
  else if (typeof v === 'number') {
    if (Number.isSafeInteger(v)) { out.push(TAG.INT); writeVarint(out, v >= 0 ? v * 2 : -v * 2 - 1); }
    else {
      if (!Number.isFinite(v)) throw new Error('codec: non-finite number');
      out.push(TAG.F64);
      const b = new Uint8Array(8);
      new DataView(b.buffer).setFloat64(0, v);
      out.push(...b);
    }
  } else if (typeof v === 'string') {
    const b = te.encode(v);
    out.push(TAG.STR); writeVarint(out, b.length); for (const x of b) out.push(x);
  } else if (v instanceof Uint8Array) {
    out.push(TAG.BYTES); writeVarint(out, v.length); for (const x of v) out.push(x);
  } else if (Array.isArray(v)) {
    out.push(TAG.ARR); writeVarint(out, v.length);
    for (const x of v) encodeInto(out, x, depth + 1);
  } else if (typeof v === 'object') {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    out.push(TAG.MAP); writeVarint(out, keys.length);
    for (const k of keys) {
      const kb = te.encode(k);
      writeVarint(out, kb.length); for (const x of kb) out.push(x);
      encodeInto(out, v[k], depth + 1);
    }
  } else throw new Error('codec: unsupported type ' + typeof v);
}

export function encode(v) {
  const out = [];
  encodeInto(out, v, 0);
  return Uint8Array.from(out);
}

export function decode(bytes) {
  let i = 0;
  const need = (n) => { if (i + n > bytes.length) throw new Error('codec: truncated'); };
  const varint = () => {
    let n = 0;
    let mul = 1;
    for (let k = 0; k < 8; k++) {
      need(1);
      const b = bytes[i++];
      n += (b & 0x7f) * mul;
      if (!(b & 0x80)) { if (!Number.isSafeInteger(n)) throw new Error('codec: varint range'); return n; }
      mul *= 0x80;
    }
    throw new Error('codec: varint too long');
  };
  const str = (len) => { need(len); const s = td.decode(bytes.subarray(i, i + len)); i += len; return s; };
  const read = (depth) => {
    if (depth > MAX_DEPTH) throw new Error('codec: too deep');
    need(1);
    const tag = bytes[i++];
    switch (tag) {
      case TAG.NULL: return null;
      case TAG.FALSE: return false;
      case TAG.TRUE: return true;
      case TAG.INT: { const z = varint(); return z % 2 ? -(z + 1) / 2 : z / 2; }
      case TAG.F64: { need(8); const v = new DataView(bytes.buffer, bytes.byteOffset + i, 8).getFloat64(0); i += 8; return v; }
      case TAG.STR: return str(varint());
      case TAG.BYTES: { const n = varint(); need(n); const b = bytes.slice(i, i + n); i += n; return b; }
      case TAG.ARR: {
        const n = varint();
        if (n > MAX_ITEMS) throw new Error('codec: too many items');
        const a = [];
        for (let k = 0; k < n; k++) a.push(read(depth + 1));
        return a;
      }
      case TAG.MAP: {
        const n = varint();
        if (n > MAX_ITEMS) throw new Error('codec: too many items');
        const o = Object.create(null);
        for (let k = 0; k < n; k++) {
          const key = str(varint());
          if (key === '__proto__' || key in o) throw new Error('codec: bad key');
          o[key] = read(depth + 1);
        }
        return o;
      }
      default: throw new Error('codec: unknown tag');
    }
  };
  const v = read(0);
  if (i !== bytes.length) throw new Error('codec: trailing bytes');
  return v;
}


export function packHeader(type, flags, seq) {
  const h = new Uint8Array(HEADER_LEN);
  const dv = new DataView(h.buffer);
  dv.setUint8(0, VERSION);
  dv.setUint8(1, type);
  dv.setUint16(2, flags);
  dv.setUint32(4, seq);
  return h;
}

export function parseHeader(bytes) {
  if (bytes.length < HEADER_LEN) throw new Error('frame: short');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, HEADER_LEN);
  return { ver: dv.getUint8(0), type: dv.getUint8(1), flags: dv.getUint16(2), seq: dv.getUint32(4) };
}

export function plainFrame(type, body) {
  return concat(packHeader(type, 0, 0), encode(body));
}

function nonce(dir, seq) {
  const n = new Uint8Array(12);
  const dv = new DataView(n.buffer);
  dv.setUint32(0, dir);
  dv.setUint32(8, seq);
  return n;
}

export class FrameCipher {
  constructor(sendKey, recvKey, sendDir, counters = {}) {
    this.sendKey = sendKey;
    this.recvKey = recvKey;
    this.sendDir = sendDir;
    this.recvDir = sendDir === DIR_C2S ? DIR_S2C : DIR_C2S;
    this.sendSeq = counters.sendSeq || 0;
    this.recvSeq = counters.recvSeq || 0;
  }

  async seal(type, body, flags = 0) {
    if (this.sendSeq >= 0xffffffff) throw new Error('frame: seq exhausted');
    const seq = ++this.sendSeq;
    const header = packHeader(type, flags, seq);
    const ct = new Uint8Array(await subtle.encrypt(
      { name: 'AES-GCM', iv: nonce(this.sendDir, seq), additionalData: header, tagLength: 128 },
      this.sendKey, encode(body),
    ));
    return concat(header, ct);
  }

  async open(bytes) {
    const h = parseHeader(bytes);
    if (h.ver !== VERSION) throw new Error('frame: version');
    if (h.seq !== this.recvSeq + 1) throw new Error('frame: replay or out of window');
    const pt = new Uint8Array(await subtle.decrypt(
      { name: 'AES-GCM', iv: nonce(this.recvDir, h.seq), additionalData: bytes.subarray(0, HEADER_LEN), tagLength: 128 },
      this.recvKey, bytes.subarray(HEADER_LEN),
    ));
    this.recvSeq = h.seq;
    return { ...h, body: decode(pt) };
  }
}


export async function sha256(bytes) {
  return new Uint8Array(await subtle.digest('SHA-256', bytes));
}

export async function hmac256(keyBytes, data) {
  const k = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await subtle.sign('HMAC', k, data));
}

const curveAlg = (cv) => {
  if (cv === CURVE.X25519) return { name: 'X25519' };
  if (cv === CURVE.P256) return { name: 'ECDH', namedCurve: 'P-256' };
  throw new Error('unknown curve');
};
const curvePubLen = (cv) => (cv === CURVE.X25519 ? 32 : 65);

export async function ephemeral(cv) {
  const kp = await subtle.generateKey(curveAlg(cv), true, ['deriveBits']);
  return { priv: kp.privateKey, pub: new Uint8Array(await subtle.exportKey('raw', kp.publicKey)) };
}

export async function agree(cv, priv, peerRaw) {
  if (!(peerRaw instanceof Uint8Array) || peerRaw.length !== curvePubLen(cv)) throw new Error('bad peer key');
  const pub = await subtle.importKey('raw', peerRaw, curveAlg(cv), false, []);
  const alg = cv === CURVE.X25519 ? { name: 'X25519', public: pub } : { name: 'ECDH', public: pub };
  return new Uint8Array(await subtle.deriveBits(alg, priv, 256));
}

export async function sessionKeys(shared, salt, info) {
  const ikm = await subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits']);
  const okm = new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, ikm, 512));
  return { c2s: okm.slice(0, 32), s2c: okm.slice(32, 64) };
}

export const aesKey = (raw) => subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

const sigAlg = (sa) => {
  if (sa === SIGALG.ED25519) return { gen: { name: 'Ed25519' }, op: { name: 'Ed25519' }, len: 32 };
  if (sa === SIGALG.ECDSA_P256) return { gen: { name: 'ECDSA', namedCurve: 'P-256' }, op: { name: 'ECDSA', hash: 'SHA-256' }, len: 65 };
  throw new Error('unknown sig alg');
};

export async function verifySig(sa, pubRaw, sig, data) {
  const a = sigAlg(sa);
  if (!(pubRaw instanceof Uint8Array) || pubRaw.length !== a.len) return false;
  if (!(sig instanceof Uint8Array) || sig.length !== 64) return false;
  const k = await subtle.importKey('raw', pubRaw, a.gen, false, ['verify']);
  return subtle.verify(a.op, k, sig, data);
}

export async function signWith(sa, privKey, data) {
  return new Uint8Array(await subtle.sign(sigAlg(sa).op, privKey, data));
}

export async function accountId(devicePubRaw) {
  return toHex((await sha256(devicePubRaw)).slice(0, 20));
}

export async function transcript(helloBody, ackPart) {
  return sha256(concat(utf8('COT-HS-v1'), helloBody, ackPart.se, ackPart.sn, ackPart.tk));
}

export const AUTH_CONTEXT = utf8('COT-AUTH-v1');


export const GENESIS = '0'.repeat(64);

export async function auditEntryHash(prev, seq, ts, kind, json) {
  return toHex(await sha256(utf8(`${prev}\n${seq}\n${ts}\n${kind}\n${json}`)));
}

export const REDACTABLE_KIND = /^(wallet_swap_\w+|social_(link|link_refused|relink|unlink|giveaway)|chat\.report)$/;

export function showsMask(d) {
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch { return false; }
  }
  if (Array.isArray(d)) return d.some((x) => (typeof x === 'string' ? maskedValue(x) : showsMask(x)));
  if (d && typeof d === 'object') return Object.entries(d).some(([k, x]) => /^hidden\d+$/.test(k) || (typeof x === 'string' ? maskedValue(x) : showsMask(x)));
  return false;
}

const maskedValue = (x) => x === 'hidden' || /(?<![0-9a-f])hidden(?![0-9a-f])/.test(x) || /^.*:\*{8}:\d+$/.test(x);

export const REALM_PRIVATE_KIND = /^(giveawaySeal|giveawayDraw)$/;

export async function verifyAuditChain(entries, expectedPrev, opts = {}) {
  let prev = expectedPrev ?? (entries[0] ? entries[0].prev : GENESIS);
  const unverified = [];
  for (const e of entries) {
    if (e.prev !== prev) return { ok: false, at: e.seq, why: 'broken link' };
    if (e.private === true) {
      if (opts.realm !== true || !REALM_PRIVATE_KIND.test(e.kind) || !(e.data == null || e.data === 'null') || !/^[0-9a-f]{64}$/.test(e.hash)) {
        return { ok: false, at: e.seq, why: 'private' };
      }
      unverified.push(e.seq);
      prev = e.hash;
      continue;
    }
    if (opts.realm === true && e.redacted !== undefined) return { ok: false, at: e.seq, why: 'redacted' };
    const masked = e.data != null && e.data !== 'null';
    if (e.redacted === true && masked && !showsMask(e.data)) return { ok: false, at: e.seq, why: 'mask' };
    if (e.redacted === true && /^[0-9a-f]{64}$/.test(e.hash) && (masked || REDACTABLE_KIND.test(e.kind))) {
      unverified.push(e.seq);
      prev = e.hash;
      continue;
    }
    const h = await auditEntryHash(e.prev, e.seq, e.ts, e.kind, e.data);
    if (h !== e.hash) return { ok: false, at: e.seq, why: 'hash mismatch' };
    prev = h;
  }
  return { ok: true, head: prev, unverified };
}

export async function merkleRoot(hexLeaves) {
  if (!hexLeaves.length) return GENESIS;
  let level = await Promise.all(hexLeaves.map((h) => sha256(concat(Uint8Array.of(0), fromHex(h)))));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? await sha256(concat(Uint8Array.of(1), level[i], level[i + 1])) : level[i]);
    }
    level = next;
  }
  return toHex(level[0]);
}


export function memoryKeyStore() {
  let v = null;
  return { get: async () => v, set: async (x) => { v = x; } };
}

export function indexedDbKeyStore(name = 'cot-net', key = 'device') {
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('keys');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('keys', mode);
      const q = fn(t.objectStore('keys'));
      t.oncomplete = () => { db.close(); res(q.result); };
      t.onerror = () => { db.close(); rej(t.error); };
    });
  };
  return { get: () => tx('readonly', (s) => s.get(key)), set: (v) => tx('readwrite', (s) => s.put(v, key)) };
}

async function supports(alg, usages) {
  try { await subtle.generateKey(alg, false, usages); return true; } catch { return false; }
}

export async function loadDevice(store) {
  const saved = await store.get();
  if (saved && saved.priv && saved.pub) return { ...saved, acct: await accountId(saved.pub) };
  const sa = (await supports({ name: 'Ed25519' }, ['sign', 'verify'])) ? SIGALG.ED25519 : SIGALG.ECDSA_P256;
  const kp = await subtle.generateKey(sigAlg(sa).gen, false, ['sign', 'verify']);
  const pub = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  const dev = { sa, priv: kp.privateKey, pub };
  await store.set(dev);
  return { ...dev, acct: await accountId(pub) };
}


export class NetError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

export class NetClient {
  constructor(opts) {
    if (!opts || !opts.url || !opts.serverKey) throw new Error('NetClient: url and serverKey are required');
    this.opts = { timeoutMs: 8000, reconnect: true, maxBackoffMs: 30000, ...opts };
    this.store = opts.keyStore || (typeof indexedDB !== 'undefined' ? indexedDbKeyStore() : memoryKeyStore());
    this.listeners = new Map();
    this.pending = new Map();
    this.ws = null;
    this.cipher = null;
    this.ticket = null;
    this.session = null;
    this.attempt = 0;
    this.closedByUser = false;
    this.device = null;
    this.rx = Promise.resolve();
    this.tx = Promise.resolve();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event).delete(fn);
  }

  emit(event, data) { this.listeners.get(event)?.forEach((fn) => { try { fn(data); } catch (e) { console.error(`net listener '${event}' failed`, e); } }); }

  get account() { return this.device?.acct || null; }

  async connect() {
    this.closedByUser = false;
    this.device = this.device || await loadDevice(this.store);
    this.emit('status', this.attempt ? 'reconnecting' : 'connecting');
    const sep = this.opts.url.includes('?') ? '&' : '?';
    const url = `${this.opts.url}${sep}acct=${this.device.acct}`;
    const ws = this.opts.socketFactory ? await this.opts.socketFactory(url) : new WebSocket(url);
    try { ws.binaryType = 'arraybuffer'; } catch {  }
    this.ws = ws;
    this.cipher = null;
    const inbox = [];
    let wake = null;
    const next = (ms) => new Promise((res, rej) => {
      if (inbox.length) return res(inbox.shift());
      const t = setTimeout(() => rej(new NetError('timeout', 'handshake timeout')), ms);
      wake = (m) => { clearTimeout(t); wake = null; m instanceof Error ? rej(m) : res(m); };
    });
    const push = (m) => (wake ? wake(m) : inbox.push(m));
    ws.addEventListener('message', (ev) => {
      const bytes = new Uint8Array(ev.data instanceof ArrayBuffer ? ev.data : new ArrayBuffer(0));
      if (ws !== this.ws) return;
      if (!this.cipher) push(bytes); else this.rx = this.rx.then(() => this.onFrame(bytes)).catch((e) => { if (!e?.code) console.error('net frame failed', e); });
    });
    ws.addEventListener('close', (ev) => {
      push(new NetError('closed', `closed ${ev.code}`));
      if (ws === this.ws) this.onClose(ev);
    });
    if (ws.readyState === 0) {
      await new Promise((res, rej) => {
        ws.addEventListener('open', res, { once: true });
        ws.addEventListener('error', () => rej(new NetError('closed', 'socket error')), { once: true });
      });
    }

    try {
      return await this.handshake(ws, next);
    } catch (e) {
      if (ws.readyState <= 1) ws.close(e?.code === 'mitm' ? 4403 : 4400, 'handshake failed');
      throw e;
    }
  }

  async handshake(ws, next) {
    const cv = (await supports({ name: 'X25519' }, ['deriveBits'])) ? CURVE.X25519 : CURVE.P256;
    const eph = await ephemeral(cv);
    const cn = randomBytes(16);
    const hello = { v: VERSION, cv, ce: eph.pub, sa: this.device.sa, dk: this.device.pub, cn, t: Date.now() };
    if (this.ticket) hello.tk = this.ticket;
    const helloBody = encode(hello);
    ws.send(concat(packHeader(T.HELLO, 0, 0), helloBody));

    const ackBytes = await next(this.opts.timeoutMs);
    const ah = parseHeader(ackBytes);
    if (ah.type !== T.HELLO_ACK) throw new NetError('protocol', 'expected HELLO_ACK');
    const ack = decode(ackBytes.subarray(HEADER_LEN));
    const th = await transcript(helloBody, ack);
    const ok = await verifySig(SIGALG.ED25519, fromB64u(this.opts.serverKey), ack.sg, th);
    if (!ok) { ws.close(4403, 'bad server signature'); throw new NetError('mitm', 'server signature check failed'); }

    const shared = await agree(cv, eph.priv, ack.se);
    const keys = await sessionKeys(shared, concat(cn, ack.sn), concat(utf8('COT v1 session'), th));
    this.cipher = new FrameCipher(await aesKey(keys.c2s), await aesKey(keys.s2c), DIR_C2S);
    this.ticket = ack.tk;
    const sig = await signWith(this.device.sa, this.device.priv, concat(AUTH_CONTEXT, th));
    const res = await this.request(T.AUTH, { sg: sig });
    this.session = res;
    this.attempt = 0;
    this.emit('status', 'open');
    return res;
  }

  async onFrame(bytes) {
    let f;
    try { f = await this.cipher.open(bytes); } catch { this.ws?.close(4400, 'bad frame'); return; }
    if (f.type === T.RESULT) {
      if (!f.body || typeof f.body !== 'object') return;
      const p = this.pending.get(f.body.a);
      if (!p) return;
      this.pending.delete(f.body.a);
      clearTimeout(p.timer);
      if (f.body.ok) p.res(f.body.d ?? null); else p.rej(new NetError(f.body.e || 'error'));
    } else if (f.type === T.EVENT) this.emit('event', f.body);
  }

  onClose(ev) {
    this.cipher = null;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.rej(new NetError('closed')); }
    this.pending.clear();
    this.emit('status', 'closed');
    this.emit('close', { code: ev.code, reason: ev.reason });
    if (this.closedByUser || !this.opts.reconnect || ev.code === 4403 || ev.code === 4409) return;
    const base = Math.min(this.opts.maxBackoffMs, 500 * 2 ** this.attempt++);
    const delay = base / 2 + Math.random() * base / 2;
    setTimeout(() => this.connect().catch(() => {  }), delay);
  }

  async request(type, body = {}, o = {}) {
    if (!this.cipher || !this.ws) throw new NetError('closed', 'not connected');
    const { cipher, ws } = this;
    const sent = this.tx.then(async () => {
      const frame = await cipher.seal(type, body, o.noReply ? FLAG.NOREPLY : 0);
      ws.send(frame);
      return cipher.sendSeq;
    });
    this.tx = sent.catch(() => {});
    const seq = await sent;
    if (o.noReply) return null;
    return new Promise((res, rej) => {
      const timer = setTimeout(() => { this.pending.delete(seq); rej(new NetError('timeout')); }, o.timeoutMs || this.opts.timeoutMs);
      this.pending.set(seq, { res, rej, timer });
    });
  }

  close() {
    this.closedByUser = true;
    this.ws?.close(1000, 'bye');
  }
}

export function startTelemetry(target = globalThis) {
  const c = { pm: 0, pd: 0, kd: 0, vis: 0, foc: 0 };
  const t0 = Date.now();
  let last = t0;
  const tick = () => {
    const now = Date.now();
    const doc = target.document;
    if (doc && doc.visibilityState === 'visible') c.vis += now - last;
    if (doc && doc.hasFocus && doc.hasFocus()) c.foc += now - last;
    last = now;
  };
  const on = (ev, k) => target.addEventListener?.(ev, () => { c[k]++; }, { passive: true });
  on('pointermove', 'pm'); on('pointerdown', 'pd'); on('keydown', 'kd');
  const timer = setInterval(tick, 1000);
  return {
    take() {
      tick();
      const nav = target.navigator || {};
      const out = { up: Date.now() - t0, ...c, wd: !!nav.webdriver, hc: nav.hardwareConcurrency || 0, tz: new Date().getTimezoneOffset() };
      c.pm = 0; c.pd = 0; c.kd = 0;
      return out;
    },
    stop() { clearInterval(timer); },
  };
}
