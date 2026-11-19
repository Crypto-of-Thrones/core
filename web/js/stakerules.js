import { ECONOMY } from './data.js';

const DAY = 86400e3;



export const STAKE_POOLS = ['farm', 'mint', 'potion'];

export const poolCap = (pool) => ECONOMY.stake.pools[pool].curve.at(-1)[0];

export function stakeCost(pool, value, factor = 1) {
  if (!(value > 0)) return 0;
  const pts = [[0, 0], ...ECONOMY.stake.pools[pool].curve];
  for (let i = 1; i < pts.length; i++) {
    const [v0, c0] = pts[i - 1];
    const [v1, c1] = pts[i];
    if (value <= v1) return (c0 + ((value - v0) / (v1 - v0)) * (c1 - c0)) * factor;
  }
  return pts.at(-1)[1] * factor;
}

export function stakeValue(pool, amount, factor = 1) {
  if (!(amount > 0) || !(factor > 0)) return 0;
  const a = amount / factor;
  const pts = [[0, 0], ...ECONOMY.stake.pools[pool].curve];
  for (let i = 1; i < pts.length; i++) {
    const [v0, c0] = pts[i - 1];
    const [v1, c1] = pts[i];
    if (a <= c1) return v0 + ((a - c0) / (c1 - c0)) * (v1 - v0);
  }
  return pts.at(-1)[0];
}

export const stakeFarmPct = (amount, factor = 1) => stakeValue('farm', amount, factor);

export const teamFactor = (power) => Math.max(ECONOMY.stake.teamMin, (power || 0) / ECONOMY.stake.teamRef);

export const lotDays = (lot, now) => Math.max(0, Math.floor((now - lot.at) / DAY));

export function lotFeePct(lot, now) {
  const s = ECONOMY.stake;
  return (s.feeStartPct * Math.max(0, s.days - lotDays(lot, now))) / s.days;
}

export const stakedIn = (e, pool) => e.stake.lots.reduce((t, l) => t + (!pool || l.pool === pool ? l.amount : 0), 0);

export const stakeRates = (e) => ({ mint: stakeValue('mint', stakedIn(e, 'mint')), potion: stakeValue('potion', stakedIn(e, 'potion')) });

export function accrueStake(e, now) {
  const s = e.stake;
  const days = Math.max(0, now - s.at) / DAY;
  s.at = Math.max(s.at, now);
  const r = stakeRates(e);
  const out = {};
  for (const k of ['mint', 'potion']) {
    s.prog[k] += r[k] * days;
    out[k] = Math.floor(s.prog[k] + 1e-9);
    s.prog[k] = Math.max(0, s.prog[k] - out[k]);
  }
  return out;
}

export function addStakeLot(e, pool, amount, from, now) {
  const lot = { id: e.stake.next++, pool, amount, at: now, from: from === 'chest' ? 'chest' : 'wallet' };
  e.stake.lots.push(lot);
  return lot;
}

export const pickLots = (e, ids) => e.stake.lots.filter((l) => ids.includes(l.id));

export function withdrawQuote(e, ids, now) {
  const rows = pickLots(e, ids).map((lot) => {
    const fee = (lot.amount * lotFeePct(lot, now)) / 100;
    return { lot, fee, net: lot.amount - fee };
  });
  const sum = (f) => rows.reduce((t, r) => t + f(r), 0);
  return {
    rows, gross: sum((r) => r.lot.amount), fee: sum((r) => r.fee), net: sum((r) => r.net),
    wallet: sum((r) => (r.lot.from === 'chest' ? 0 : r.net)), chest: sum((r) => (r.lot.from === 'chest' ? r.net : 0)),
  };
}

export function takeLots(e, ids, now) {
  const q = withdrawQuote(e, ids, now);
  const gone = new Set(q.rows.map((r) => r.lot.id));
  e.stake.lots = e.stake.lots.filter((l) => !gone.has(l.id));
  return q;
}

export function moveLots(e, ids, pool) {
  if (!STAKE_POOLS.includes(pool)) return 0;
  let n = 0;
  for (const l of pickLots(e, ids)) if (l.pool !== pool) { l.pool = pool; n++; }
  return n;
}

const OLD_LOCK_DAYS = 14;

export function normalizeStake(s, now) {
  const out = { lots: [], next: 1, at: now, prog: { mint: 0, potion: 0 } };
  if (!s || typeof s !== 'object') return out;
  const num = (v, d) => (Number.isFinite(v) && v >= 0 ? v : d);
  if (Array.isArray(s.lots)) {
    for (const l of s.lots) {
      if (!l || !STAKE_POOLS.includes(l.pool) || !(l.amount > 0) || !Number.isFinite(l.amount) || !Number.isFinite(l.at)) continue;
      const id = Number.isInteger(l.id) && l.id > 0 && !out.lots.some((x) => x.id === l.id) ? l.id : 0;
      out.lots.push({ id, pool: l.pool, amount: l.amount, at: Math.min(l.at, now), from: l.from === 'chest' ? 'chest' : 'wallet' });
    }
    out.next = Math.max(num(Math.floor(s.next), 1), 1, ...out.lots.map((l) => l.id + 1));
    for (const l of out.lots) if (!l.id) l.id = out.next++;
    out.at = Math.min(num(s.at, now), now);
    out.prog = { mint: num(s.prog?.mint, 0) % 1, potion: num(s.prog?.potion, 0) % 1 };
  } else if (Number.isFinite(s.amount) && s.amount > 0) {
    const at = Number.isFinite(s.until) && s.until > 0 ? Math.min(now, s.until - OLD_LOCK_DAYS * DAY) : now;
    out.lots.push({ id: 1, pool: 'farm', amount: s.amount, at, from: 'wallet' });
    out.next = 2;
  }
  return out;
}
