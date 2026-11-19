import { PASS } from './data.js';
import { featureOpen, normalizePlan } from './launchplan.js';

const DAY = 86400e3;

export const ITEM_LAUNCH = Object.freeze({ ticket: 'lottery', joust: 'joust' });

export const rewardLaunched = (items, rec) => (items || []).every((it) => !ITEM_LAUNCH[it.kind] || featureOpen(ITEM_LAUNCH[it.kind], rec?.plan ?? null, (rec?.day ?? 0) * DAY));

export const TRACKS = ['paid', 'free'];

export const MISSIONS = PASS.missions.map((m) => m.key);

export const seasonOf = (now) => Math.max(1, Math.floor((now - PASS.start) / (PASS.days * DAY)) + 1);

export const seasonEnd = (season) => PASS.start + season * PASS.days * DAY;

export const dayOf = (now) => Math.floor(now / DAY);

const noneDone = () => Object.fromEntries(MISSIONS.map((k) => [k, false]));

export const doneCount = (rec) => MISSIONS.filter((k) => rec.done[k]).length;

export const allDone = (rec) => doneCount(rec) === MISSIONS.length;

export const freshPass = (now = Date.now()) => ({ season: seasonOf(now), day: dayOf(now), done: noneDone(), owned: false, level: 0, earnedDay: -1, days: 0, freeDay: -1, claimed: { paid: [], free: [] }, plan: null });

export function normalizePass(p, now = Date.now()) {
  const out = freshPass(now);
  if (!p || typeof p !== 'object') return out;
  const int = (v, d) => (Number.isInteger(v) ? v : d);
  out.season = Math.max(1, int(p.season, out.season));
  out.day = int(p.day, out.day);
  for (const k of MISSIONS) out.done[k] = p.done?.[k] === true;
  out.owned = p.owned === true;
  out.level = Math.max(0, Math.min(PASS.levels, int(p.level, 0)));
  out.earnedDay = int(p.earnedDay, -1);
  out.days = Math.max(0, Math.min(PASS.levels, int(p.days, 0)));
  out.freeDay = int(p.freeDay, -1);
  for (const t of TRACKS) {
    const list = Array.isArray(p.claimed?.[t]) ? p.claimed[t] : [];
    out.claimed[t] = [...new Set(list.filter((n) => Number.isInteger(n) && n >= 1 && n <= PASS.levels))];
  }
  out.plan = normalizePlan(p.plan);
  return out;
}

export function syncPass(rec, now = Date.now()) {
  let changed = false;
  if (seasonOf(now) > rec.season) { Object.assign(rec, freshPass(now), { plan: rec.plan ?? null }); changed = true; } else if (dayOf(now) > rec.day) { rec.day = dayOf(now); rec.done = noneDone(); changed = true; }
  if (!rec.done.login) { rec.done.login = true; changed = true; }
  if (rec.owned && allDone(rec) && rec.level < PASS.levels && rec.earnedDay !== rec.day) {
    rec.level += 1;
    rec.earnedDay = rec.day;
    changed = true;
  }
  if (allDone(rec) && rec.days < PASS.levels && rec.freeDay !== rec.day) {
    rec.days += 1;
    rec.freeDay = rec.day;
    changed = true;
  }
  return changed;
}

export function markMission(rec, key, now = Date.now()) {
  const synced = syncPass(rec, now);
  if (!MISSIONS.includes(key) || rec.done[key]) return synced;
  rec.done[key] = true;
  syncPass(rec, now);
  return true;
}

export const VOUCHERS = ['level', 'train', 'joust'];

export const freshVouchers = () => Object.fromEntries(VOUCHERS.map((k) => [k, 0]));

export function normalizeVouchers(v) {
  const out = freshVouchers();
  for (const k of VOUCHERS) if (Number.isInteger(v?.[k]) && v[k] > 0) out[k] = v[k];
  return out;
}

export const rewardOf = (n, track) => PASS.rewards[n - 1]?.[track] || null;

export function rewardState(rec, n, track) {
  const items = rewardOf(n, track);
  if (!items) return 'none';
  if (rec.claimed[track].includes(n)) return 'claimed';
  const reached = track === 'paid' ? rec.owned && n <= rec.level : n <= rec.days;
  if (!reached) return 'locked';
  return rewardLaunched(items, rec) ? 'ready' : 'soon';
}

export const readyRewards = (rec) => PASS.rewards.flatMap((_, i) => TRACKS.filter((t) => rewardState(rec, i + 1, t) === 'ready').map((track) => ({ n: i + 1, track })));

export function takeReward(rec, n, track) {
  if (rewardState(rec, n, track) !== 'ready') return null;
  rec.claimed[track].push(n);
  return rewardOf(n, track);
}
