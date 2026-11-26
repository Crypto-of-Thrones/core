import { RECRUIT_GRANT as G } from './data.js';

export const DAY_MS = 86400e3;

const num = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);
const CYCLE_MS = G.cycleDays * DAY_MS;

export const freshGrant = () => ({ joined: 0, paid: [], total: 0, days: [], voided: 0, voidAmt: 0 });

export function normalizeGrant(g) {
  const paid = Array.isArray(g?.paid)
    ? g.paid.filter((p) => Array.isArray(p) && Number.isInteger(p[0]) && p[0] >= 0).map((p) => [p[0], num(p[1]), num(p[2]), num(p[3])])
    : [];
  const days = Array.isArray(g?.days) ? [...new Set(g.days.filter((d) => Number.isInteger(d) && d > 0))].sort((a, b) => a - b) : [];
  return { joined: num(g?.joined), paid, total: num(g?.total), days, voided: num(g?.voided), voidAmt: num(g?.voidAmt) };
}

export const dayIndex = (t) => Math.floor(t / DAY_MS);

export function noteActiveDay(g, now) {
  const d = dayIndex(now);
  if (!g.days.includes(d)) g.days.push(d);
  g.days = g.days.filter((x) => x > d - G.windowDays).sort((a, b) => a - b);
  return g;
}

export function activeDaysOf(g, now) {
  const d = dayIndex(now);
  return g.days.filter((x) => x > d - G.windowDays && x <= d).length;
}

export function eligibility(links, now) {
  const d = links?.discord || null;
  const x = links?.x || null;
  const old = (l, days) => !!l && l.createdMs > 0 && now - l.createdMs >= days * DAY_MS;
  const checks = [
    { key: 'discord', ok: !!d },
    { key: 'discordAge', ok: old(d, G.discordMinAgeDays) },
    { key: 'discordMember', ok: d?.member === true },
    ...(G.requireVerifyRole ? [{ key: 'discordVerify', ok: d?.verified === true }] : []),
    { key: 'x', ok: !!x },
    { key: 'xAge', ok: old(x, G.xMinAgeDays) },
    { key: 'xFollowers', ok: !!x && (Number(x.followers) || 0) >= G.xMinFollowers },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

export const firstPayAt = (g) => g.joined + G.firstAfterDays * DAY_MS;

export const cycleOpensAt = (g, k) => firstPayAt(g) + k * CYCLE_MS;

export function cycleAt(g, now) {
  if (!(g.joined > 0) || now < firstPayAt(g)) return -1;
  return Math.floor((now - firstPayAt(g)) / CYCLE_MS);
}

export const paidCycle = (g, k) => g.paid.some((p) => p[0] === k);

export function nextCycle(g, now) {
  let k = Math.max(0, cycleAt(g, now));
  while (paidCycle(g, k)) k++;
  return k;
}

export const spendEndAt = (trial) => (num(trial?.first) > 0 ? num(trial.first) + G.keepDaysAfterSpend * DAY_MS : 0);

export function nextPayAt(g, trial, now) {
  if (!(g.joined > 0) || g.voided > 0) return null;
  const k = nextCycle(g, now);
  if (k >= G.months) return null;
  const at = cycleOpensAt(g, k);
  const end = spendEndAt(trial);
  return end > 0 && at >= end ? null : at;
}

export function grantEnd(g, trial, now) {
  if (!(g.joined > 0)) return '';
  if (g.voided > 0) return 'voided';
  if (nextPayAt(g, trial, now) != null) return '';
  return nextCycle(g, now) >= G.months ? 'done' : 'spend';
}

export function payBlock(g, trial, now) {
  if (!(g.joined > 0)) return 'notJoined';
  const end = grantEnd(g, trial, now);
  if (end) return end;
  if (now < nextPayAt(g, trial, now)) return 'early';
  if (activeDaysOf(g, now) < G.activeDays) return 'activity';
  if (!(num(trial?.chest) > 0)) return 'empty';
  return '';
}

export function priceFresh(rate, now) {
  if (!(Number(rate?.d) > 0) || typeof rate.day !== 'string') return false;
  const t = Date.parse(`${rate.day}T00:00:00Z`);
  return Number.isFinite(t) && dayIndex(t) >= dayIndex(now) - G.priceMaxAgeDays && dayIndex(t) <= dayIndex(now);
}

export function payAmount(px, chest, scale = 1, cent = 0.01) {
  if (!(px > 0)) return 0;
  const want = Math.floor((G.usdMonth / px) * scale / cent + 1e-6) * cent;
  return Math.max(0, Math.min(num(chest), want));
}

export const usdCentsOf = (amount, px, scale = 1) => Math.floor((num(amount) / scale) * px * 100 + 1e-6);

export const monthCapCents = () => G.slots * G.usdMonth * 100;

export const monthKey = (now) => new Date(now).toISOString().slice(0, 7);
