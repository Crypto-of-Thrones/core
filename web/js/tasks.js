import { dayOf } from './passrules.js';
import { t } from './i18nsafe.js';
import { DAY_MS, featureOpen, normalizePlan } from './launchplan.js';

const N = (one, other) => ({ one, other });

export const TASKS = [
  { key: 'login', ev: 'login', label: t('tasks.streak.login', null, 'Claim your daily login reward'), goal: 1, xp: 80, icon: 'castle' },
  { key: 'drop', ev: 'drop', label: t('tasks.streak.drop', null, 'Open a chest on the Hunt map'), goal: 1, xp: 120, icon: 'chest' },
  { key: 'joust', launch: 'joust', label: t('tasks.streak.joust', { count: 3 }, N('Fight {count} Joust duel', 'Fight {count} Joust duels')), goal: 3, xp: 80, icon: 'shield' },
  { key: 'spin', ev: 'spin', label: t('tasks.streak.spin', null, 'Spin the daily wheel'), goal: 1, xp: 60, icon: 'star' },
  { key: 'hunt', ev: 'hunt', label: t('tasks.streak.hunt', null, 'Send a mercenary to the hunt'), goal: 1, xp: 100, icon: 'sword' },
];

export const EVENTS = ['kill', 'wave', 'summon', 'fuse', 'train', 'rest', 'expedition', 'forge', 'market', 'ticket', 'invite', 'share', 'pvp', 'login', 'drop', 'spin', 'hunt'];

const KILL = N('Slay {count} foe in the Hunt', 'Slay {count} foes in the Hunt');
const WAVE = N('Clear {count} Hunt wave', 'Clear {count} Hunt waves');
const SUMMON = N('Summon {count} mercenary', 'Summon {count} mercenaries');
const TRAIN = N('Train your Hero {count} time', 'Train your Hero {count} times');
const PVP = N('Launch {count} PvP raid', 'Launch {count} PvP raids');

export const POOL = [
  { key: 'd_kill_s', ev: 'kill', label: t('tasks.pool.kill', { count: 60 }, KILL), goal: 60, xp: 30, icon: 'skull', tier: 'easy' },
  { key: 'd_wave_s', ev: 'wave', label: t('tasks.pool.wave', { count: 2 }, WAVE), goal: 2, xp: 30, icon: 'map', tier: 'easy' },
  { key: 'd_ticket', ev: 'ticket', launch: 'lottery', label: t('tasks.pool.ticket', null, 'Buy a lottery ticket'), goal: 1, xp: 30, icon: 'crown', tier: 'easy' },
  { key: 'd_share', ev: 'share', label: t('tasks.pool.share', null, 'Send a share card to a friend'), goal: 1, xp: 30, icon: 'star', tier: 'easy' },
  { key: 'd_kill_m', ev: 'kill', label: t('tasks.pool.kill', { count: 250 }, KILL), goal: 250, xp: 50, icon: 'skull', tier: 'medium' },
  { key: 'd_wave_m', ev: 'wave', label: t('tasks.pool.wave', { count: 5 }, WAVE), goal: 5, xp: 50, icon: 'map', tier: 'medium' },
  { key: 'd_summon', ev: 'summon', label: t('tasks.pool.summon', { count: 2 }, SUMMON), goal: 2, xp: 50, icon: 'chest', tier: 'medium' },
  { key: 'd_train', ev: 'train', label: t('tasks.pool.train', { count: 2 }, TRAIN), goal: 2, xp: 50, icon: 'bolt', tier: 'medium' },
  { key: 'd_pvp', ev: 'pvp', launch: 'pvp', label: t('tasks.pool.pvp', { count: 2 }, PVP), goal: 2, xp: 50, icon: 'sword', tier: 'medium' },
  { key: 'd_expedition', ev: 'expedition', launch: 'dungeons', label: t('tasks.pool.expedition', null, 'Send an expedition, Dungeon or sea'), goal: 1, xp: 50, icon: 'book', tier: 'medium' },
  { key: 'd_market', ev: 'market', launch: 'market', label: t('tasks.pool.market', null, 'List an item on the Market'), goal: 1, xp: 50, icon: 'bag', tier: 'medium' },
  { key: 'd_kill_h', ev: 'kill', label: t('tasks.pool.kill', { count: 800 }, KILL), goal: 800, xp: 90, icon: 'skull', tier: 'hard' },
  { key: 'd_pvp_h', ev: 'pvp', launch: 'pvp', label: t('tasks.pool.pvp', { count: 5 }, PVP), goal: 5, xp: 90, icon: 'sword', tier: 'hard' },
  { key: 'd_summon_h', ev: 'summon', label: t('tasks.pool.summon', { count: 5 }, SUMMON), goal: 5, xp: 90, icon: 'chest', tier: 'hard' },
];

export const DRAW_V2_DAY = 20771;

export const RETIRED = [
  { key: 'd_train_h', ev: 'train', label: t('tasks.pool.train', { count: 5 }, TRAIN), goal: 5, xp: 90, icon: 'bolt', tier: 'hard' },
];

const OLD_POOL = (() => {
  const at = POOL.findIndex((x) => x.key === 'd_kill_h') + 1;
  return [...POOL.slice(0, at), ...RETIRED, ...POOL.slice(at)];
})();

export const POOL_DRAW = { easy: 2, medium: 2, hard: 1 };

export const CHEST = {
  xp: 120,
  items: [
    { kind: 'ticket', n: 1, launch: 'lottery', label: t('tasks.chest.ticket', null, 'Lottery ticket'), icon: 'crown' },
    { kind: 'joust', n: 1, launch: 'joust', label: t('tasks.chest.joust', null, 'Free Joust entry'), icon: 'shield' },
    { kind: 'level', n: 1, label: t('tasks.chest.level', null, 'Level scroll'), icon: 'scroll' },
  ],
};

export const CHEST_STANDIN = 'level';

export function chestPick(u, day, plan = null) {
  const it = CHEST.items[Math.min(CHEST.items.length - 1, Math.floor(u * CHEST.items.length))];
  return taskLaunched(it, day, plan) ? it : CHEST.items.find((x) => x.kind === CHEST_STANDIN);
}

const ALL = [...TASKS, ...POOL, ...RETIRED];
const KEYS = ALL.map((t) => t.key);

export const findTask = (key) => ALL.find((t) => t.key === key);

export const noCounters = () => ({ joust: 0, herobox: 0, raid: 0, pvp: 0 });

const noEvents = () => Object.fromEntries(EVENTS.filter((e) => e !== 'pvp').map((e) => [e, 0]));

export const freshTasks = (now, c = noCounters(), seed = 0) => ({ day: dayOf(now), base: { joust: c.joust, herobox: c.herobox }, boss: false, wbSent: 0, wbDmg: 0, wbLast: 0, claimed: [], full: -1, streak: 0, best: 0, seed: seed >>> 0, ev: noEvents(), chest: false, told: [], plan: null });

export function normalizeTasks(x, now, c = noCounters(), seed = 0) {
  const out = freshTasks(now, c, seed);
  if (!x || typeof x !== 'object') return out;
  const int = (v, d, min = 0) => (Number.isInteger(v) && v >= min ? v : d);
  out.day = int(x.day, out.day, 0);
  out.base = { joust: int(x.base?.joust, c.joust), herobox: int(x.base?.herobox, c.herobox) };
  out.boss = x.boss === true;
  out.wbSent = x.wbSent ? 1 : 0;
  out.wbDmg = Number.isFinite(x.wbDmg) && x.wbDmg > 0 ? Math.round(x.wbDmg) : 0;
  out.wbLast = Number.isFinite(x.wbLast) ? x.wbLast : 0;
  out.claimed = Array.isArray(x.claimed) ? [...new Set(x.claimed.filter((k) => KEYS.includes(k)))] : [];
  out.full = int(x.full, -1, -1);
  out.streak = int(x.streak, 0);
  out.best = Math.max(out.streak, int(x.best, 0));
  if (Number.isInteger(x.seed) && x.seed >= 0 && x.seed <= 0xffffffff) out.seed = x.seed;
  for (const e of Object.keys(out.ev)) out.ev[e] = int(x.ev?.[e], 0);
  out.chest = x.chest === true;
  out.told = Array.isArray(x.told) ? [...new Set(x.told.filter((k) => KEYS.includes(k)))] : [];
  out.plan = normalizePlan(x.plan);
  return out;
}

export const taskLaunched = (task, day, plan = null) => !task.launch || featureOpen(task.launch, plan ?? null, day * DAY_MS);

export const todayTasks = (rec) => TASKS.filter((t) => (!t.boss || rec.boss) && taskLaunched(t, rec.day, rec.plan));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const daySeed = (day, seed, salt = 0) => (Math.imul(day + 1, 0x9e3779b1) ^ Math.imul(seed ^ salt, 0x85ebca77)) >>> 0;

export function drawBoard(day, seed, plan = null) {
  const next = rng(daySeed(day, seed));
  const used = new Set();
  const out = [];
  const order = Object.keys(POOL_DRAW);
  const v2 = day >= DRAW_V2_DAY;
  const pool = v2 ? POOL : OLD_POOL;
  for (const tier of v2 ? [...order].reverse() : order) {
    const n = POOL_DRAW[tier];
    const bag = pool.filter((t) => t.tier === tier);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    let took = 0;
    for (const t of bag) {
      if (took >= n || used.has(t.ev) || !taskLaunched(t, day, plan)) continue;
      used.add(t.ev);
      out.push(t);
      took++;
    }
  }
  return out.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
}

export const boardTasks = (rec) => [...todayTasks(rec), ...drawBoard(rec.day, rec.seed, rec.plan)];

export function taskValue(rec, key, c) {
  const t = findTask(key);
  if (!t) return 0;
  const v = t.ev === 'pvp' ? (c.pvp || 0)
    : t.ev ? (rec.ev?.[t.ev] || 0)
      : c[key] - rec.base[key];
  return Math.max(0, Math.min(t.goal, v));
}

export const taskDone = (rec, key, c) => taskValue(rec, key, c) >= (findTask(key)?.goal ?? Infinity);

export const liveStreak = (rec) => (rec.full >= rec.day - 1 ? rec.streak : 0);

export function syncTasks(rec, now, c, bossLive = false) {
  let changed = false;
  const day = dayOf(now);
  if (day > rec.day) {
    Object.assign(rec, { day, base: { joust: c.joust, herobox: c.herobox }, boss: false, wbSent: 0, wbDmg: 0, claimed: [], ev: noEvents(), chest: false, told: [] });
    changed = true;
  }
  if (bossLive && !rec.boss) { rec.boss = true; changed = true; }
  let streak = 0;
  if (rec.full !== rec.day && todayTasks(rec).every((t) => taskDone(rec, t.key, c))) {
    rec.streak = rec.full === rec.day - 1 ? rec.streak + 1 : 1;
    rec.full = rec.day;
    rec.best = Math.max(rec.best, rec.streak);
    streak = rec.streak;
    changed = true;
  }
  return { changed, streak };
}

export function noteEvent(rec, ev, n = 1) {
  if (!(ev in rec.ev) || !(n > 0)) return false;
  rec.ev[ev] += Math.round(n);
  return true;
}

export function noteWorldBoss(rec, { sent = false, dmg = 0, window = 0 } = {}) {
  let changed = false;
  if (!rec.boss && (sent || dmg > 0)) { rec.boss = true; changed = true; }
  if (sent && !rec.wbSent) { rec.wbSent = 1; changed = true; }
  if (dmg > 0 && window !== rec.wbLast) { rec.wbDmg += Math.round(dmg); rec.wbLast = window; changed = true; }
  return changed;
}

export function claimTask(rec, key, c) {
  const t = boardTasks(rec).find((x) => x.key === key);
  if (!t || rec.claimed.includes(key) || !taskDone(rec, key, c)) return 0;
  rec.claimed.push(key);
  return t.xp;
}

export const claimableTasks = (rec, c) => boardTasks(rec).filter((t) => !rec.claimed.includes(t.key) && taskDone(rec, t.key, c));

export const chestItem = (rec) => chestPick(rng(daySeed(rec.day, rec.seed, 0xc4e57))(), rec.day, rec.plan);

export const chestReady = (rec) => !rec.chest && boardTasks(rec).every((t) => rec.claimed.includes(t.key));

export function openChest(rec) {
  if (!chestReady(rec)) return null;
  rec.chest = true;
  return { xp: CHEST.xp, item: chestItem(rec) };
}

export function newlyDone(rec, c) {
  const out = boardTasks(rec).filter((t) => !rec.told.includes(t.key) && !rec.claimed.includes(t.key) && taskDone(rec, t.key, c));
  for (const t of out) rec.told.push(t.key);
  return out;
}

export function keepTold(local, view) {
  if (!view || typeof view !== 'object' || view.day !== local?.day) return view;
  return { ...view, told: [...new Set([...(Array.isArray(local.told) ? local.told : []), ...(Array.isArray(view.told) ? view.told : [])])] };
}
