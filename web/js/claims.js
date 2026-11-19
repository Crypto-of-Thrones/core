
import { WHEEL_PACKS } from './data.js';
import { t } from './i18nsafe.js';

export const HOUR_MS = 3600e3;
export const DAY_MS = 86400e3;

export const DROP_CAP = 6;
export const WAVE_CHEST_EVERY = 3;

export const CRATE = [
  [{ kind: 'xp', n: 30 }, { kind: 'potion', n: 2 }],
  [{ kind: 'xp', n: 40 }],
  [{ kind: 'xp', n: 30 }, { kind: 'gem', id: 'brinestone', n: 1 }],
  [{ kind: 'xp', n: 50 }],
];
export const crateOf = (hour) => CRATE[((hour % CRATE.length) + CRATE.length) % CRATE.length];

export const WHEEL = [
  { items: [{ kind: 'xp', n: 60 }], w: 36 },
  { items: [{ kind: 'potion', n: 5 }], w: 20 },
  { items: [{ kind: 'xp', n: 120 }], w: 12 },
  { items: [{ kind: 'level', n: 1 }], w: 12 },
  { items: [{ kind: 'train', n: 1 }], w: 4 },
  { items: [{ kind: 'gem', id: 'tidepearl', n: 1 }], w: 8 },
  { items: [{ kind: 'joust', n: 1 }], w: 6 },
  { items: [{ kind: 'summon', n: 1 }], w: 2 },
];
const WHEEL_W = WHEEL.reduce((t, x) => t + x.w, 0);

export const WHEEL_TURN_MS = 4600;
export const WHEEL_SPIN_MS = WHEEL_TURN_MS + 450;

export const WHEEL_ALL_MAX = 100;
export const WHEEL_ALL_ASK = 10;
export const WHEEL_ALL_MS = 1200;

export function wheelOdds() {
  const odds = WHEEL.map((x, i) => {
    const tenths = (x.w * 1000) / WHEEL_W;
    return { i, items: x.items, n: Math.floor(tenths), rest: tenths - Math.floor(tenths) };
  });
  let left = 1000 - odds.reduce((s, o) => s + o.n, 0);
  for (const o of [...odds].sort((a, b) => b.rest - a.rest)) if (left-- > 0) o.n++;
  return odds.map(({ i, items, n }) => ({ i, items, chance: n / 1000 })).sort((a, b) => b.chance - a.chance || a.i - b.i);
}

export const LOGIN = [[{ kind: 'xp', n: 20 }], [{ kind: 'xp', n: 30 }], [{ kind: 'xp', n: 40 }], [{ kind: 'xp', n: 50 }], [{ kind: 'xp', n: 60 }], [{ kind: 'xp', n: 80 }], [{ kind: 'xp', n: 100 }, { kind: 'potion', n: 3 }]];

export const DROPS = {
  wave: { label: t('claims.drop.wave', null, 'Wave chest'), art: 'claims/wave_chest.png' },
  boss: { label: t('claims.drop.boss', null, 'Boss trophy'), art: 'claims/trophy.png' },
};

export const FIRSTS = [
  { id: 'wave', stat: 'waves', label: t('claims.first.wave', null, 'First wave cleared'), items: [{ kind: 'xp', n: 50 }, { kind: 'potion', n: 3 }] },
  { id: 'boss', stat: 'bosses', label: t('claims.first.boss', null, 'First wave boss slain'), items: [{ kind: 'xp', n: 80 }, { kind: 'potion', n: 5 }] },
  { id: 'realm', stat: 'realms', label: t('claims.first.realm', null, 'First realm cleared'), items: [{ kind: 'xp', n: 150 }] },
  { id: 'summon', stat: 'summons', label: t('claims.first.summon', null, 'First summon'), items: [{ kind: 'xp', n: 100 }, { kind: 'potion', n: 5 }] },
  { id: 'mythic', stat: 'mythics', label: t('claims.first.mythic', null, 'First mythic mercenary'), items: [{ kind: 'xp', n: 500 }] },
  { id: 'fusion', stat: 'fusions', label: t('claims.first.fusion', null, 'First fusion'), items: [{ kind: 'xp', n: 100 }] },
  { id: 'run', stat: 'expeditions', label: t('claims.first.run', null, 'First Dungeon run'), items: [{ kind: 'xp', n: 100 }, { kind: 'potion', n: 5 }] },
  { id: 'voyage', stat: 'voyages', label: t('claims.first.voyage', null, 'First sea voyage'), items: [{ kind: 'xp', n: 100 }, { kind: 'gem', id: 'brinestone', n: 2 }] },
  { id: 'forge', stat: 'forged', label: t('claims.first.forge', null, 'First jewel forged'), items: [{ kind: 'xp', n: 100 }, { kind: 'gem', id: 'tidepearl', n: 1 }] },
  { id: 'joust', stat: 'joustWins', label: t('claims.first.joust', null, 'First Joust win'), items: [{ kind: 'xp', n: 100 }, { kind: 'joust', n: 1 }] },
  { id: 'raid', stat: 'raidsWon', label: t('claims.first.raid', null, 'First PvP raid won'), items: [{ kind: 'xp', n: 100 }, { kind: 'potion', n: 40 }] },
  { id: 'castle', stat: 'castles', label: t('claims.first.castle', null, 'First castle'), items: [{ kind: 'xp', n: 100 }, { kind: 'potion', n: 5 }] },
  { id: 'herobox', stat: 'heroBoxes', label: t('claims.first.herobox', null, 'First Hero Box'), items: [{ kind: 'xp', n: 80 }, { kind: 'train', n: 1 }] },
  { id: 'pass', stat: 'passLevels', label: t('claims.first.pass', null, 'First Battle Pass level'), items: [{ kind: 'xp', n: 80 }, { kind: 'train', n: 1 }] },
  { id: 'wb', stat: 'wbDamage', label: t('claims.first.wb', null, 'First blow on a world boss'), items: [{ kind: 'xp', n: 120 }, { kind: 'potion', n: 5 }] },
  { id: 'withdraw', stat: 'withdrawals', label: t('claims.first.withdraw', null, 'First withdrawal'), items: [{ kind: 'xp', n: 150 }] },
];

const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
const int = (v, d = -1) => (Number.isInteger(v) ? v : d);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export const COUNTERS = ['run_p1', 'run_p2', 'run_p3', 'run_p4', 'run_p5', 'voyages', 'forged', 'logins'];

export function freshClaims(seed = 1, now = Date.now()) {
  return { v: 1, seed: seed >>> 0, hour: -1, spin: -1, login: -1, drops: [], next: 1, waveTick: 0, firsts: {}, c: Object.fromEntries(COUNTERS.map((k) => [k, 0])), away: null, lastDay: Math.floor(now / DAY_MS), bought: 0, paid: 0, log: [] };
}

const ITEM_KINDS = new Set(['xp', 'potion', 'gem', 'level', 'train', 'joust', 'summon', 'herobox']);
const goodItem = (it) => it && ITEM_KINDS.has(it.kind) && Number.isInteger(it.n) && it.n > 0;

export function normalizeClaims(raw, seed = 1, now = Date.now()) {
  const r = obj(raw);
  const out = freshClaims(Number.isInteger(r.seed) ? r.seed : seed, now);
  if (r.v !== 1) return out;
  out.hour = int(r.hour);
  out.spin = int(r.spin);
  out.login = int(r.login);
  out.next = Math.max(1, int(r.next, 1));
  out.waveTick = Math.max(0, int(r.waveTick, 0));
  out.lastDay = int(r.lastDay, out.lastDay);
  out.drops = (Array.isArray(r.drops) ? r.drops : [])
    .filter((d) => d && DROPS[d.kind] && Number.isInteger(d.id) && Array.isArray(d.items) && d.items.length && d.items.every(goodItem))
    .slice(0, DROP_CAP);
  for (const d of out.drops) out.next = Math.max(out.next, d.id + 1);
  for (const [k, t] of Object.entries(obj(r.firsts))) if (FIRSTS.some((f) => f.id === k)) out.firsts[k] = num(t) || 1;
  for (const k of COUNTERS) out.c[k] = Math.floor(num(obj(r.c)[k]));
  out.bought = Math.max(0, int(r.bought, 0));
  out.paid = Math.max(0, int(r.paid, 0));
  out.log = (Array.isArray(r.log) ? r.log : [])
    .filter((e) => e && typeof e.t === 'string' && Array.isArray(e.items))
    .slice(0, LOG_CAP)
    .map((e) => ({ at: num(e.at), t: e.t === 'claims.away.title' ? 'claims.log.reward' : e.t.slice(0, 40), items: e.items.filter((it) => it && typeof it.kind === 'string' && num(it.n) > 0).slice(0, 6).map((it) => ({ kind: it.kind, n: num(it.n), ...(typeof it.id === 'string' ? { id: it.id } : {}) })) }));
  const a = r.away;
  if (a && num(a.earned) > 0) out.away = { earned: Math.floor(num(a.earned) * 100) / 100, kills: num(a.kills), sec: num(a.sec), at: num(a.at) };
  return out;
}

export const hourOf = (now) => Math.floor(now / HOUR_MS);
export const CRATE_ON = false;
export const crateReady = (rec, now = Date.now()) => CRATE_ON && hourOf(now) > rec.hour;
export function takeCrate(rec, now = Date.now()) {
  if (!crateReady(rec, now)) return null;
  rec.hour = hourOf(now);
  return crateOf(rec.hour);
}
export const crateIn = (rec, now = Date.now()) => (crateReady(rec, now) ? 0 : (rec.hour + 1) * HOUR_MS - now);

export const dayOf = (now) => Math.floor(now / DAY_MS);
function mix(seed, day) {
  let x = (seed ^ Math.imul(day + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
export const wedgeOf = (seed, day) => wedgeAt(mix(seed, day) / 4294967296);

export function wedgeAt(u) {
  let r = u * WHEEL_W;
  for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r < 0) return i; }
  return WHEEL.length - 1;
}
const TAU = Math.PI * 2;
export const WHEEL_SEG = TAU / WHEEL.length;
export const wedgeMid = (i) => (i + 0.5) * WHEEL_SEG;
export function wedgeUnder(turn) {
  const a = ((-turn % TAU) + TAU) % TAU;
  return Math.min(WHEEL.length - 1, Math.floor(a / WHEEL_SEG));
}
export const landTurn = (from, wedge, turns, jitter = 0) => Math.ceil(from / TAU) * TAU + TAU * turns - (wedge + 0.5 + jitter) * WHEEL_SEG;
export function wedgeCentroid(rIn, rOut) {
  const h = WHEEL_SEG / 2;
  return ((2 / 3) * (rOut ** 3 - rIn ** 3)) / (rOut ** 2 - rIn ** 2) * (Math.sin(h) / h);
}

export const spinReady = (rec, now = Date.now()) => dayOf(now) > rec.spin;
export function takeSpin(rec, now = Date.now(), rng = null) {
  if (!spinReady(rec, now)) return null;
  rec.spin = dayOf(now);
  const wedge = rng ? wedgeAt(rng()) : wedgeOf(rec.seed, rec.spin);
  return { wedge, items: WHEEL[wedge].items };
}

const PAID_DAY0 = 1 << 24;
export const packOf = (i) => WHEEL_PACKS[i];
export const perSpin = (i) => WHEEL_PACKS[i].price / WHEEL_PACKS[i].n;
export function addSpins(rec, i) {
  const p = packOf(i);
  if (!p) return 0;
  rec.bought += p.n;
  return p.n;
}
export function takePaidSpin(rec, rng = null) {
  if (rec.bought < 1) return null;
  rec.bought -= 1;
  const wedge = rng ? wedgeAt(rng()) : wedgeOf(rec.seed, PAID_DAY0 + rec.paid);
  rec.paid += 1;
  return { wedge, items: WHEEL[wedge].items, paid: true };
}
export const takeAnySpin = (rec, now = Date.now(), freeOk = true, rng = null) => (freeOk && takeSpin(rec, now, rng)) || takePaidSpin(rec, rng);
export const spinsLeft = (rec, now = Date.now(), freeOk = true) => (freeOk && spinReady(rec, now) ? 1 : 0) + rec.bought;
export const spinValue = (value) => WHEEL.reduce((t, x) => t + (x.w / WHEEL_W) * x.items.reduce((s, it) => s + value(it), 0), 0);

export const LOG_CAP = 8;
export function logClaim(rec, t, items, now = Date.now()) {
  if (!items?.length) return;
  rec.log.unshift({ at: now, t: String(t).slice(0, 40), items: items.slice(0, 6).map((it) => ({ ...it })) });
  rec.log.length = Math.min(rec.log.length, LOG_CAP);
}

export const loginReady = (rec, now = Date.now()) => dayOf(now) > rec.login;
export function takeLogin(rec, streakDay, now = Date.now()) {
  if (!loginReady(rec, now)) return null;
  rec.login = dayOf(now);
  return LOGIN[Math.min(LOGIN.length - 1, Math.max(0, int(streakDay, 0)))];
}

export function noteVisit(rec, now = Date.now()) {
  const d = dayOf(now);
  if (d === rec.lastDay && rec.c.logins > 0) return false;
  if (d < rec.lastDay) return false;
  rec.lastDay = d;
  rec.c.logins += 1;
  return true;
}

export function dropItems(kind, rng = Math.random) {
  if (kind === 'boss') return [{ kind: 'xp', n: 40 }, { kind: 'potion', n: 2 }];
  return rng() < 0.3 ? [{ kind: 'xp', n: 15 }, { kind: 'potion', n: 1 }] : [{ kind: 'xp', n: 15 }];
}

export function addDrop(rec, kind, rng = Math.random, now = Date.now()) {
  if (!DROPS[kind] || rec.drops.length >= DROP_CAP) return null;
  const d = { id: rec.next++, kind, at: now, items: dropItems(kind, rng) };
  rec.drops.push(d);
  return d;
}

export function noteWave(rec, rng = Math.random, now = Date.now()) {
  rec.waveTick += 1;
  if (rec.waveTick < WAVE_CHEST_EVERY) return null;
  rec.waveTick = 0;
  return addDrop(rec, 'wave', rng, now);
}

export function takeDrop(rec, id) {
  const i = rec.drops.findIndex((d) => d.id === id);
  return i < 0 ? null : rec.drops.splice(i, 1)[0];
}

export const firstsReady = (rec, st) => FIRSTS.filter((f) => !rec.firsts[f.id] && num(st[f.stat]) >= 1);
export function takeFirst(rec, id, st, now = Date.now()) {
  const f = firstsReady(rec, st).find((x) => x.id === id);
  if (!f) return null;
  rec.firsts[id] = now;
  return f.items;
}

export function takeAway(rec) {
  const a = rec.away;
  rec.away = null;
  return a && a.earned > 0 ? a : null;
}

export function mergeItems(items) {
  const out = [];
  for (const it of items) {
    const same = out.find((x) => x.kind === it.kind && x.id === it.id && x.floor === it.floor);
    if (same) same.n += it.n;
    else out.push({ ...it });
  }
  return out;
}
