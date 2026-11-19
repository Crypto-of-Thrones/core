import { HEROES, JOUST, RARITIES, HORSES } from './data.js';
import { combatStats, mixSeed, seeded, maxEnergyOf } from './hunt.js';
import { pvpFighter, pvpArmor, gearDef, ALL_SLOTS } from './gear.js';
import { SERVER_MODE } from './buildprofile.js';

export const JOUST_SIZE = 3;

const DAY_MS = 86400e3;

export function joustSquad(heroes, ids, power) {
  const roster = Array.isArray(heroes) ? heroes : [];
  const byId = new Map(roster.map((x) => [x.id, x]));
  const out = [];
  const keys = new Set();
  const take = (x) => {
    if (!x || x.trial || out.length >= JOUST_SIZE || keys.has(x.key)) return;
    out.push(x.id);
    keys.add(x.key);
  };
  for (const id of Array.isArray(ids) ? ids : []) take(byId.get(id));
  for (const x of [...roster].sort((a, b) => power(b) - power(a))) take(x);
  return out;
}

export const joustDay = (now) => Math.floor(now / DAY_MS);

export const joustSeason = (now) => Math.floor(joustDay(now) / JOUST.seasonDays);

export const seasonEnd = (season) => (season + 1) * JOUST.seasonDays * DAY_MS;

export const JOUST_LADDER = [['CoinBankr', 2140], ['FrostMaxi', 2088], ['Brightholt', 1990], ['TideKing', 1870], ['Gravenhold', 1802], ['Ashgrove', 1755]];

const RIVALS = ['Brightholt', 'TideKing', 'Emberwake', 'Gravenhold', 'CoinBankr', 'FrostMaxi', 'Ashgrove', 'IronVow', 'AshWarden', 'DuneHelm'];

export function joustLadder(rating) {
  return [...(SERVER_MODE ? [] : JOUST_LADDER), ['You', rating]].sort((a, b) => b[1] - a[1] || (a[0] === 'You' ? -1 : b[0] === 'You' ? 1 : 0));
}

export const freshArena = () => ({ rating: 1000, wins: 0, losses: 0, squad: [], fights: 0, day: -1, today: 0, pool: 0, season: -1 });

const int = (v, d, min = 0) => (Number.isFinite(v) ? Math.max(min, Math.floor(v)) : d);

export function keepSquad(mine, view) {
  const { squad, ...rest } = view;
  return Array.isArray(mine?.squad) && mine.squad.length ? rest : view;
}

export function normalizeArena(x) {
  const f = freshArena();
  if (!x || typeof x !== 'object') return f;
  return {
    rating: int(x.rating, f.rating, JOUST.floor),
    wins: int(x.wins, f.wins),
    losses: int(x.losses, f.losses),
    squad: Array.isArray(x.squad) ? x.squad.filter((id) => typeof id === 'string') : [],
    fights: int(x.fights, 0),
    day: int(x.day, -1, -1),
    today: int(x.today, 0),
    pool: Number.isFinite(x.pool) && x.pool >= 0 ? x.pool : 0,
    season: int(x.season, -1, -1),
  };
}

export const fightsToday = (a, now) => (a.day === joustDay(now) ? a.today : 0);

export function joustBlock(a, wallet, squadSize, now) {
  if (squadSize < 1) return 'squad';
  if (fightsToday(a, now) >= JOUST.perDay) return 'limit';
  if (!(wallet >= JOUST.entry)) return 'funds';
  return '';
}

function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const fightSeed = (lord, n) => mixSeed(hashStr(String(lord)), n, 0x4a057);

export function joustFighter(hero, dur, gear = null) {
  const c = combatStats(hero);
  const hp = Math.max(1, Math.round(dur * JOUST.hpPerDur));
  return pvpFighter({ id: hero.id, key: hero.key, level: hero.level, atk: c.atk, crit: c.crit, critMult: c.critMult, spd: Math.round(60 / c.cd), hp, max: hp }, gear, JOUST.hpPerDur);
}

export function rivalLord(seed, rating, squad, power) {
  const rng = seeded(mixSeed(seed, 0x71a1));
  const name = RIVALS[Math.floor(rng() * RIVALS.length)];
  const r = Math.max(JOUST.floor, Math.round(rating + (rng() * 2 - 1) * JOUST.band));
  const base = (key) => power({ key, level: 1 });
  const free = new Set(Object.keys(HEROES));
  const roster = [];
  const add = (key, want) => {
    free.delete(key);
    roster.push({ id: `rival${roster.length}`, key, level: Math.max(1, Math.round(1 + (want / base(key) - 1) / 0.1)) });
  };
  const pick = (keys) => keys[Math.floor(rng() * keys.length)];
  for (const x of squad) {
    const want = power(x) * (0.92 + rng() * 0.16);
    const fits = (k) => base(k) <= want * 1.1;
    const keys = [...free];
    const same = keys.filter((k) => HEROES[k].rarity === HEROES[x.key].rarity && fits(k));
    const any = keys.filter(fits);
    const key = same.length ? pick(same) : any.length ? pick(any) : keys.sort((a, b) => base(a) - base(b))[0];
    if (key) add(key, want);
  }
  const low = squad.length ? Math.min(...squad.map(power)) * 0.8 : 0;
  for (let i = 0; i < JOUST_SIZE; i++) {
    const keys = [...free].filter((k) => base(k) <= low);
    if (!keys.length) break;
    const key = pick(keys);
    add(key, Math.max(base(key), low * (0.5 + rng() * 0.4)));
  }
  const ids = joustSquad(roster, [], power);
  return { name, rating: r, roster, squad: ids.map((id) => roster.find((x) => x.id === id)) };
}

export function fightJoust(A, B, seed) {
  const rng = seeded(mixSeed(seed, 0xf1647));
  const side = { a: A.map((f) => ({ ...f })), b: B.map((f) => ({ ...f })) };
  const alive = (s) => side[s].filter((f) => f.hp > 0);
  const log = [];
  let rounds = 0;
  while (alive('a').length && alive('b').length && rounds < JOUST.rounds) {
    rounds++;
    const order = ['a', 'b'].flatMap((s) => side[s].map((f, i) => ({ s, i, f, tie: rng() })))
      .sort((x, y) => y.f.spd - x.f.spd || y.tie - x.tie);
    for (const { s, i, f } of order) {
      if (f.hp <= 0) continue;
      const foes = alive(s === 'a' ? 'b' : 'a');
      if (!foes.length) break;
      const t = foes[Math.floor(rng() * foes.length)];
      const crit = rng() < f.crit;
      const dmg = Math.max(1, Math.round(f.atk * (0.85 + rng() * 0.3) * (crit ? f.critMult : 1) * pvpArmor(t.def)));
      t.hp = Math.max(0, t.hp - dmg);
      log.push({ side: s, i, t: side[s === 'a' ? 'b' : 'a'].indexOf(t), dmg, crit, hp: t.hp });
    }
  }
  const share = (s) => side[s].reduce((n, f) => n + f.hp, 0) / Math.max(1, side[s].reduce((n, f) => n + f.max, 0));
  const won = !alive('b').length ? alive('a').length > 0 : alive('a').length > 0 && share('a') > share('b');
  return { won, rounds, log, a: side.a, b: side.b };
}

export const drawSeed = (u) => Math.floor(u * 2 ** 32) >>> 0;

export const joustGearRefs = (bonuses) => {
  if (!bonuses.some(Boolean)) return {};
  const spd = bonuses.some((b) => b?.spd);
  return { gear: bonuses.map((b) => (b ? [b.atk, b.def, b.hp, ...(spd ? [b.spd || 0] : [])] : spd ? [0, 0, 0, 0] : [0, 0, 0])) };
};

const gearPoints = (b) => (b ? b.atk + b.def + b.hp : 0);

const RARITY_ORDER = Object.keys(RARITIES);

function pieceAt(slot, r) {
  for (let i = r; i >= 0; i--) {
    const d = gearDef({ slot, rarity: RARITY_ORDER[i] });
    if (gearPoints(d) > 0) return d;
  }
  return null;
}

export function rivalGear(seed, squad, mine) {
  const rides = mine.map(horseIn);
  const want = mine.reduce((s, b, i) => s + gearPoints(b) - (rides[i] ? rides[i].atk + rides[i].def : 0), 0) / Math.max(1, squad.length);
  const horses = rivalHorses(seed, squad.length, rides);
  if (!want) return squad.map((_, i) => withHorse(null, horses[i]));
  const rng = seeded(mixSeed(seed, 0x6ea7));
  const avg = Math.round(squad.reduce((s, x) => s + RARITY_ORDER.indexOf(HEROES[x.key].rarity), 0) / squad.length);
  return squad.map((_, i) => {
    const b = { atk: 0, def: 0, hp: 0 };
    const slots = [...ALL_SLOTS];
    while (slots.length) {
      const d = pieceAt(slots.splice(Math.floor(rng() * slots.length), 1)[0], avg);
      if (!d || gearPoints(b) + gearPoints(d) / 2 > want) continue;
      b.atk += d.atk;
      b.def += d.def;
      b.hp += d.hp;
    }
    return withHorse(gearPoints(b) ? b : null, horses[i]);
  });
}

const horseIn = (b) => (b?.spd ? Object.values(HORSES).find((d) => d.spd === b.spd) || null : null);

export function rivalHorses(seed, size, rides) {
  const out = Array.from({ length: size }, () => null);
  const list = rides.filter(Boolean);
  if (!list.length) return out;
  const rng = seeded(mixSeed(seed, 0x40a5));
  const free = out.map((_, i) => i);
  for (const d of list.slice(0, size)) out[free.splice(Math.floor(rng() * free.length), 1)[0]] = d;
  return out;
}

export const ARENA_NPC = '@arena';

export const pickFoe = (seed, foes) => foes[Math.floor(seeded(mixSeed(seed, 0xf0e5))() * foes.length)];

function realRival(foe) {
  const squad = foe.squad.map((x, i) => ({ id: `rival${i}`, key: x.key, level: x.level, ...(x.gear ? { gear: x.gear } : {}) }));
  return { name: foe.name, rating: foe.rating, real: true, roster: squad, squad };
}

export const foeRefs = (foes) => foes.map((f) => ({ name: f.name, rating: f.rating, squad: f.squad.map((x) => [x.key, x.level]), ...joustGearRefs(f.squad.map((x) => x.gear || null)) }));

export const foesOf = (refs) => refs.map((f) => ({
  name: f.name, rating: f.rating,
  squad: f.squad.map(([key, level], i) => {
    const g = f.gear?.[i];
    const gear = g && g.some(Boolean) ? { atk: g[0], def: g[1], hp: g[2], ...(g.length > 3 && g[3] ? { spd: g[3] } : {}) } : null;
    return { key, level, ...(gear ? { gear } : {}) };
  }),
}));

const withHorse = (b, d) => (d ? { atk: (b?.atk || 0) + d.atk, def: (b?.def || 0) + d.def, hp: b?.hp || 0, spd: d.spd } : b);

export function playJoust(seed, rating, squad, power, foes) {
  const foe = Array.isArray(foes) && foes.length ? pickFoe(seed, foes) : null;
  const rival = foe ? realRival(foe) : rivalLord(seed, rating, squad, power);
  if (!foe && Array.isArray(foes)) Object.assign(rival, { name: ARENA_NPC, npc: true });
  const A = squad.map((x) => joustFighter(x, maxEnergyOf(x), x.gear || null));
  const drawn = foe ? [] : rivalGear(seed, rival.squad, squad.map((x) => x.gear || null));
  const gearB = rival.squad.map((x, i) => x.gear || drawn[i] || null);
  const B = rival.squad.map((x, i) => joustFighter(x, maxEnergyOf(x), gearB[i]));
  return { rival, A, B, gearB, res: fightJoust(A, B, seed) };
}

export function settleFight(a, won, now) {
  const day = joustDay(now);
  if (a.day !== day) { a.day = day; a.today = 0; }
  a.today++;
  a.fights++;
  a.pool += JOUST.pool;
  if (won) { a.wins++; a.rating += JOUST.winRating; return JOUST.win; }
  a.losses++;
  a.rating = Math.max(JOUST.floor, a.rating - JOUST.lossRating);
  return 0;
}

export function rollSeason(a, now) {
  const s = joustSeason(now);
  if (a.season >= s) return null;
  if (a.season < 0) { a.season = s; return null; }
  const out = { season: a.season, pool: a.pool, champion: joustLadder(a.rating)[0][0] === 'You' };
  a.season = s;
  a.pool = 0;
  return out;
}


export const JOUST_QUEUE = Object.freeze({ bandStart: 100, bandStep: 100, bandEveryMs: 60e3, openAfterMs: 10 * 60e3, timeoutMs: 24 * 3600e3 });

export function queueBand(waitMs) {
  const w = Math.max(0, Number.isFinite(waitMs) ? waitMs : 0);
  if (w >= JOUST_QUEUE.openAfterMs) return Infinity;
  return JOUST_QUEUE.bandStart + JOUST_QUEUE.bandStep * Math.floor(w / JOUST_QUEUE.bandEveryMs);
}

export const queueLocked = (queue, id) => Array.isArray(queue?.ids) && queue.ids.includes(id);

export function mirrorFight(res) {
  return { ...res, won: !res.won, a: res.b, b: res.a, log: res.log.map((x) => ({ ...x, side: x.side === 'a' ? 'b' : 'a' })) };
}

export function playMatch(seed, a, b, side, power) {
  const out = playJoust(seed, a.rating, a.squad, power, [b]);
  if (side !== 'b') return { ...out, mine: { A: out.A, B: out.B, res: out.res, rival: out.rival } };
  const rival = { name: a.name, rating: a.rating, real: true, roster: a.squad, squad: a.squad };
  return { ...out, mine: { A: out.B, B: out.A, res: mirrorFight(out.res), rival } };
}
