import { HEROES, RARITIES } from './data.js';
import { livePrices, liveIndexed } from './realmlive.js';
import { t } from './i18nsafe.js';

export const LEAGUE = {
  hours: [0],
  entry: { common: 300, uncommon: 450, rare: 600, epic: 1000, legendary: 1500, mythic: 2500 },
  entryToPool: 0.8,
  poolShare: { common: 0.1, uncommon: 0.12, rare: 0.15, epic: 0.18, legendary: 0.2, mythic: 0.25 },
  bracket: { common: 48, uncommon: 36, rare: 28, epic: 20, legendary: 14, mythic: 8 },
  freeHold: 250_000,
  podium: [0.3, 0.18, 0.12],
  paidPart: 0.3,
  history: 14,
};
livePrices(LEAGUE.entry);
liveIndexed(LEAGUE, ['freeHold']);

export const RAID = {
  event: 'The Pale Vigil',
  hp: 120000,
  time: 110,
  arrive: 2.6,
  auto: false,
  pool: 336000,
  fallback: 0.25,
  phases: [0.66, 0.33],
  radius: 1.3,
};

const DAY = 86400e3;
const pad = (n) => String(n).padStart(2, '0');
export const utcTime = (at) => { const d = new Date(at); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`; };
export const utcDay = (at) => new Date(at).toISOString().slice(0, 10);

export function fightsOfDay(now) {
  const day = Math.floor(now / DAY) * DAY;
  const total = LEAGUE.hours.length;
  return LEAGUE.hours.map((hr, i) => ({ id: `${utcDay(day)}#${i + 1}`, n: i + 1, total, at: day + hr * 3600e3 }));
}

export function nextFight(now, done = []) {
  const fought = done instanceof Set ? done : new Set(done);
  for (let d = 0; d < 3; d++) {
    const day = fightsOfDay(now + d * DAY);
    const f = day.find((x) => x.at > now && !fought.has(x.id));
    if (f) return { ...f, lastAt: day[day.length - 1].at };
  }
  return null;
}


export const VIGIL_WINDOW_ID = 'vigil';

export const vigilWindowAt = (rows, now) => (rows || []).find((w) => w && w.start <= now && now < w.end) || null;

export const vigilFightOn = (rows, at) => !!vigilWindowAt(rows, at);

export function vigilOpenFight(rows, now, done = []) {
  const w = vigilWindowAt(rows, now);
  const f = w && nextFight(now, done);
  return f && f.at < w.end ? f : null;
}

export const holdsForFree = (wallet, held) => !!wallet && held >= LEAGUE.freeHold;

export const entryPrice = (rarity, free = false) => (free ? 0 : LEAGUE.entry[rarity] || 0);

export const RIVALS = ['FrostMaxi', 'Kelvarn', 'Brightholt', 'Emberwake', 'Gravenhold', 'Ashgrove', 'Doranel', 'Morvane', 'TideKing', 'CoinBankr', 'Quenmoor', 'Wintermere'];

export function seeded(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((s, c) => Math.imul(s ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bracketSize(fightId, rarity) {
  const rng = seeded(`${fightId}:${rarity}:n`);
  const base = LEAGUE.bracket[rarity];
  return Math.max(3, Math.round(base * (0.75 + rng() * 0.5)));
}

export function prizePools(fightId, rewardPool, { rewardScale = 1, you = null, real = null } = {}) {
  const out = {};
  for (const r of Object.keys(RARITIES)) {
    const mine = you?.rarity === r;
    if (real) {
      const x = real[r] || {};
      const entrants = (x.entrants || 0) + (mine ? 1 : 0);
      const fromEntries = Math.round(((x.paid || 0) + (mine ? you.paid || 0 : 0)) * LEAGUE.entryToPool);
      const payers = (x.payers ?? x.entrants ?? 0) + (mine && (you.paid || 0) > 0 ? 1 : 0);
      const fill = Math.min(1, payers / LEAGUE.bracket[r]);
      const fromReward = Math.round(rewardPool * LEAGUE.poolShare[r] * rewardScale * fill);
      out[r] = { pool: fromEntries + fromReward, entrants, price: LEAGUE.entry[r], fromEntries, fromReward };
      continue;
    }
    const entrants = bracketSize(fightId, r) + (mine ? 1 : 0);
    const paid = mine && you.paid === 0 ? entrants - 1 : entrants;
    const fromEntries = Math.round(paid * LEAGUE.entry[r] * LEAGUE.entryToPool);
    const fromReward = Math.round(rewardPool * LEAGUE.poolShare[r] * rewardScale);
    out[r] = { pool: fromEntries + fromReward, entrants, price: LEAGUE.entry[r], fromEntries, fromReward };
  }
  return out;
}

export function prizeShares(n) {
  if (n <= 0) return [];
  const k = Math.min(n, Math.max(4, Math.ceil(n * LEAGUE.paidPart)));
  const rest = 1 - LEAGUE.podium.reduce((s, x) => s + x, 0);
  const each = Math.min(rest / Math.max(1, k - 3), LEAGUE.podium[2]);
  const raw = Array.from({ length: n }, (_, i) => (i < 3 ? LEAGUE.podium[i] : i < k ? each : 0));
  const sum = raw.reduce((s, x) => s + x, 0);
  return raw.map((x) => x / sum);
}

export function splitPool(pool, n) {
  const shares = prizeShares(n);
  const out = shares.map((s) => Math.floor(pool * s));
  if (out.length) out[0] += pool - out.reduce((s, x) => s + x, 0);
  return out;
}

export const champDps = (c, slayer = 0) => (c.atk / c.cd) * (1 + c.crit * (c.critMult - 1)) * (1 + slayer / 100);

export function rivalChampions(fightId, rarity, n, dpsOf, names = []) {
  const rng = seeded(`${fightId}:${rarity}:rivals`);
  const keys = Object.keys(HEROES).filter((k) => HEROES[k].rarity === rarity);
  return Array.from({ length: n }, (_, i) => {
    const key = keys[Math.floor(rng() * keys.length)];
    const level = 1 + Math.floor(rng() ** 1.6 * 15);
    const luck = 0.88 + rng() * 0.24;
    const name = names.length ? `${names[i % names.length]}${i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''}` : t('raid.rules.lordN', { n: i + 1 }, 'Lord {n}');
    return { name, key, level, dps: dpsOf(key, level) * luck, dmg: 0 };
  });
}

export function rankBracket(myDmg, rivals) {
  const rows = [{ name: 'You', dmg: myDmg, me: true }, ...rivals.map((r) => ({ name: r.name, key: r.key, level: r.level, dmg: r.dmg }))]
    .sort((a, b) => b.dmg - a.dmg);
  return { rank: rows.findIndex((r) => r.me) + 1, of: rows.length, rows };
}


export const VIGIL_DRAW = 'vigil';
export const vigilDrawId = (id) => `vigil:${id}`;
export const vigilLuck = (u) => 0.88 + u * 0.24;
export const vigilHp = (n, at, boss) => Math.round(RAID.hp * (boss ? bossByKey(boss) : bossOfFight(n, at)).hp);

export function fightOutcome(list, u, { n, at, boss, rewardPool }) {
  const hp = vigilHp(n, at, boss);
  const rows = list.map((x, i) => ({
    acct: x.acct, entry: x.entry, rarity: x.rarity, dmg: Math.round(x.dps * RAID.time * vigilLuck(u[i])), rank: 0, of: 0, prize: 0, pool: 0, box: null,
  }));
  const total = rows.reduce((s, r) => s + (r.entry === 'prize' ? r.dmg : 0), 0);
  const killed = rows.length > 0 && total >= hp;
  const real = {};
  list.forEach((x, i) => {
    if (rows[i].entry !== 'prize') return;
    const c = (real[x.rarity] ||= { entrants: 0, paid: 0, payers: 0 });
    c.entrants += 1;
    c.paid += x.paid || 0;
    if ((x.paid || 0) > 0) c.payers += 1;
  });
  const pools = prizePools('server', rewardPool, { rewardScale: killed ? 1 : RAID.fallback, real });
  for (const r of Object.keys(real)) {
    const bracket = rows.filter((x) => x.entry === 'prize' && x.rarity === r)
      .sort((a, b) => b.dmg - a.dmg || (a.acct < b.acct ? -1 : a.acct > b.acct ? 1 : 0));
    const prizes = splitPool(pools[r].pool, bracket.length);
    bracket.forEach((x, i) => {
      Object.assign(x, { rank: i + 1, of: bracket.length, prize: prizes[i] || 0, pool: pools[r].pool });
      x.box = killed ? (i === 0 ? 'top' : i < 3 ? 'champion' : null) : null;
    });
  }
  return { hp, total, killed, pools, rows };
}

export const BOSSES = [
  {
    key: 'raid_regent', name: 'The Pale Regent', short: t('raid.bosses.regentShort', null, 'the Regent'), title: 'Lord of the Silent Frost',
    hp: 1, rivals: 1, tempo: 1, drain: [0, 2, 3, 4], hit: 0.5,
    sig: { id: 'nova', name: 'Frost Nova', radius: 2.6, cast: 1.1, after: 0.4, text: t('raid.bosses.regentSig', { name: 'The Pale Regent' }, '{name} bursts around him and drains the stamina of every mercenary caught near') },
    theme: { aura: '#9fe6ff', glow: '#8fe3ff', rim: '#0b1630', mote: '#dff7ff', bar: '#7fd6ff', name: '#d9f1ff', shadow: '#04101e' },
    field: 'maps/arena.png',
    fx: { land: ['ice/snowflake-burst', 70], sig: ['ice/frost-nova', 104], fall: ['ice/ice-shatter', 40], raise: ['ice/snowflake-burst', 70], step: ['ice/snowflake-burst', 70] },
    phases: ['', t('raid.bosses.regentPhase1', null, 'The Regent stirs'), t('raid.bosses.regentPhase2', null, 'The frost deepens'), t('raid.bosses.regentPhase3', null, "The Regent's wrath")],
    descend: t('raid.bosses.regentDescend', null, 'The Regent is descending on the arena'), wait: t('raid.bosses.regentWait', null, 'Waiting for the frost'), away: t('raid.bosses.regentAway', null, 'withdrew into the frost'),
  },
  {
    key: 'raid_korgath', name: 'Korgath', short: 'Korgath', title: 'The Cinder Warden', voice: 'korgath',
    hp: 1.6, rivals: 1.35, tempo: 0.9, drain: [0, 2.5, 3.5, 4.5], hit: 0.6,
    sig: { id: 'leap', name: 'Cinder Leap', radius: 2.3, cast: 1.3, after: 0.4, leap: true, text: t('raid.bosses.korgathSig', { name: 'Korgath' }, '{name} jumps onto the nearest mercenary and the blast scorches everyone around the landing') },
    theme: { aura: '#ff9a3c', glow: '#f08a24', rim: '#1b0b08', mote: '#ffd28a', bar: '#ff8a3c', name: '#ffe2c0', shadow: '#1b0b08' },
    field: 'maps/arena-ashen.png',
    fx: { land: ['fire/fire-ring', 70], sig: ['fire/fire-ring', 70], fall: ['explosions/big-explosion', 60], raise: ['explosions/small-explosion', 40] },
    phases: ['', t('raid.bosses.korgathPhase1', null, 'The gate smolders'), t('raid.bosses.korgathPhase2', null, 'The furnace wakes'), t('raid.bosses.korgathPhase3', null, 'The Warden burns white')],
    descend: t('raid.bosses.korgathDescend', { name: 'Korgath' }, '{name} is breaking through the arena'), wait: t('raid.bosses.korgathWait', null, 'Waiting for the furnace'), away: t('raid.bosses.korgathAway', null, 'stalked back into the furnace'),
    lines: {
      arrive: ['Your gate is mine now.', 'Burn, little lords.'], sig: ['Under my heel!', 'Ash!'],
      phase: ['More fuel!', 'Stoke the fire!'], win: ['Only cinders remain.'], fall: ['The gate... goes dark...'],
    },
  },
  {
    key: 'raid_tzelvar', name: 'Tzelvar', short: 'Tzelvar', title: 'Caller of the Ninth Gale', voice: 'tzelvar',
    hp: 2.4, rivals: 1.7, tempo: 0.8, drain: [0, 3, 4, 5], hit: 0.7,
    sig: { id: 'storm', name: 'Ninth Gale', radius: 1.4, cast: 1.2, after: 0.45, marks: 3, text: t('raid.bosses.tzelvarSig', { name: 'Tzelvar' }, '{name} marks three mercenaries and calls lightning down on each mark') },
    theme: { aura: '#7fd4ff', glow: '#b2e9f0', rim: '#08161e', mote: '#fdf6a8', bar: '#8fe0ff', name: '#e9fbff', shadow: '#08161e' },
    field: 'maps/arena-mines.png',
    fx: { land: ['lightning/thunderclap', 70], sig: ['lightning/lightning-strike', 44], fall: ['lightning/thunderclap', 60], raise: ['lightning/zap-hit', 40] },
    phases: ['', t('raid.bosses.tzelvarPhase1', null, 'The wind turns'), t('raid.bosses.tzelvarPhase2', null, 'The sky splits'), t('raid.bosses.tzelvarPhase3', null, 'The ninth gale breaks')],
    descend: t('raid.bosses.tzelvarDescend', { name: 'Tzelvar' }, '{name} is riding the storm in'), wait: t('raid.bosses.tzelvarWait', null, 'Waiting for the storm'), away: t('raid.bosses.tzelvarAway', null, 'vanished into the storm'),
    lines: {
      arrive: ['Eight gales you survived. Not this one.', 'Look up.'], sig: ['Strike!', 'The sky answers!'],
      phase: ['Rise, gale riders!', 'Faster!'], win: ['The storm moves on.'], fall: ['The wind... falls silent...'],
    },
  },
  {
    key: 'raid_nhalmora', name: 'Nhal-Mora', short: 'Nhal-Mora', title: 'The Hollow Eclipse', voice: 'nhalmora',
    hp: 3.4, rivals: 2.1, tempo: 0.7, drain: [0, 3.5, 4.5, 5.5], hit: 0.8,
    sig: { id: 'reap', name: 'Eclipse Reap', radius: 3.6, cast: 1.4, after: 1.1, finish: 'spin', text: t('raid.bosses.nhalmoraSig', { name: 'Nhal-Mora' }, '{name} sweeps the great scythe around him across most of the arena') },
    theme: { aura: '#9b5de5', glow: '#c17fed', rim: '#0e0818', mote: '#fceaa3', bar: '#c17fed', name: '#f3e6ff', shadow: '#0e0818' },
    field: 'maps/arena-wood.png',
    fx: { land: ['shadow/dark-explosion', 70], sig: ['shadow/eclipse', 64, 2.5], fall: ['shadow/dark-explosion', 50], raise: ['shadow/shadow-flames', 40, 1.6] },
    phases: ['', t('raid.bosses.nhalmoraPhase1', null, 'The light dims'), t('raid.bosses.nhalmoraPhase2', null, 'Dusk falls'), t('raid.bosses.nhalmoraPhase3', null, 'The sun goes out')],
    descend: t('raid.bosses.nhalmoraDescend', { name: 'Nhal-Mora' }, '{name} is blotting out the sun'), wait: t('raid.bosses.nhalmoraWait', null, 'Waiting for the eclipse'), away: t('raid.bosses.nhalmoraAway', null, 'sank back into the dark'),
    lines: {
      arrive: ['Every dawn ends with me.', 'Kneel in my shadow.'], sig: ['Reap!', 'All things end.'],
      phase: ['Rise, hollow ones!', 'Darker still.'], win: ['Night keeps what it takes.'], fall: ['A dawn... at last...'],
    },
  },
];

export const BOSS_BY_FIGHT = [0, 0, 1, 1, 2, 2, 3];
const weekday = (at) => (Math.floor(at / DAY) + 3) % 7;
const slotOf = (n, at) => (Number.isFinite(at) ? weekday(at) * LEAGUE.hours.length + n - 1 : n - 1) % BOSS_BY_FIGHT.length;
export const bossOfFight = (n, at) => BOSSES[BOSS_BY_FIGHT[slotOf(n, at)] ?? 0];
export const bossByKey = (key) => BOSSES.find((b) => b.key === key) || BOSSES[0];


export function unlockedOf(raid) {
  if (Number.isInteger(raid?.unlocked)) return Math.max(0, Math.min(raid.unlocked, BOSSES.length - 1));
  let n = 0;
  const met = (i, killed) => { if (i >= 0) n = Math.max(n, i + (killed ? 1 : 0)); };
  if (raid?.last?.boss) met(BOSSES.findIndex((b) => b.key === raid.last.boss), raid.last.killed);
  for (const f of raid?.history || []) if (Number.isInteger(f?.fight?.n)) met(BOSS_BY_FIGHT[(f.fight.n - 1) % BOSS_BY_FIGHT.length], f.killed);
  return Math.min(n, BOSSES.length - 1);
}

export const bossOpen = (raid, i) => i >= 0 && i <= unlockedOf(raid);

export function nextBoss(raid, n, at) {
  const open = unlockedOf(raid);
  const i = raid?.pick ? BOSSES.findIndex((b) => b.key === raid.pick) : -1;
  if (i >= 0 && i <= open) return BOSSES[i];
  return BOSSES[Math.min(BOSS_BY_FIGHT[slotOf(n, at)] ?? 0, open)];
}

export function unlockAfter(raid, key, killed) {
  const open = unlockedOf(raid);
  const i = BOSSES.findIndex((b) => b.key === key);
  return killed && i >= 0 ? Math.max(open, Math.min(i + 1, BOSSES.length - 1)) : open;
}
export function bossFights(i, locale = 'en') {
  if (LEAGUE.hours.length === 1) {
    const days = BOSS_BY_FIGHT.flatMap((b, d) => (b === i ? [new Date(Date.UTC(2024, 0, 1 + d)).toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' })] : []));
    return days.length > 1 ? t('raid.rules.daysMany', { list: days.slice(0, -1).join(', '), last: days[days.length - 1] }, '{list} and {last}') : days[0] || '';
  }
  const n = BOSS_BY_FIGHT.flatMap((b, f) => (b === i ? [f + 1] : []));
  return n.length > 1 ? t('raid.rules.fightsMany', { list: n.slice(0, -1).join(', '), last: n[n.length - 1] }, 'Fights {list} and {last}') : t('raid.rules.fightOne', { n: n[0] }, 'Fight {n}');
}
