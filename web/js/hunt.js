import { HEROES, ENEMIES, RARITIES, DRAGONS, NIGHT_FOES, DAY_FOES, skillMods, SHIELD_HIT, shieldWear, FIELD_CAP, FARM, HUNT_TROOPS, HUNT_POWER_REF, HUNT_TIER_WAVE, HUNT_POOL_WEIGHT, HUNT_CAP_TIERS } from './data.js';
import { HUNT_WALLS } from './arenamask.js';
import { SERVER_MODE } from './buildprofile.js';

export const TICK_HZ = 60;
export const TICK = 1 / TICK_HZ;
export const PX = 2;

export const W = 21;
export const H = 19;
export const CX = (W - 1) / 2;
export const CY = (H - 1) / 2;

const HERO_HURT = 0.24;
const ATTACK_TIME = 0.36;
const CONTACT = 0.36;
const FOE_ATTACK = 0.6;
const WINDUP_BACK = 1.5 * PX;
const LUNGE = 7 * PX;
const RECOIL = 1.5 * PX;
const KICK_TIME = 0.16;
const FOE_HURT = 0.2;
const FLASH_TIME = 0.07;
const SWING_GAP = 0.06;
const MELEE_MAX = 3;
const MELEE_MAX_BIG = 5;
const CONTACT_REACH = 1.45;
const STANDOFF = 2.4;
const STALL = 0.6;
const RALLY_STALL = 2.5;
const ENTER_FROM = 1.6;
const ENTER_TIME = 1.1;
const DRAGON_ROAR = 0.56;
const DRAGON_FLINCH = 0.18;
export const WAVES = 10;
export const WAVE_TIME = 600;
const WAVE_TIER = 0.2;
const DUEL_GAP = 2;
const DUEL_SPREAD = 4;
const BODY_STEP_X = 32;
const BODY_STEP_Y = 16;
const BODY_W = 44;
const BODY_H = 66;
const AREA_EDGE = 1;
const POST_MARGIN = 1;
const POST_GATE = 2.5;
const DUEL_MEET = 3;
const DUEL_CHASE = 3;
const REFILL_GAP = 0.5;
const DUEL_NEAR = [2, 3];
const DUEL_NEAR_OWN = 1.4;
const REFILL_RETRY = 0.25;
const ORPHAN_R = 6;
const ORPHAN_WAIT = 2;
const FIGHT_MIN = 5;
export const WAVE_BREAK = 1;
const FOE_HP = 4;
const FOE_HITS = 4;
const FOE_HITS_HERO = 0.6;
const HUNT_FOE_HP = 0.5;
const FLY_FROM = 17;
const FLY_Z = 18 * PX;
const HOVER_Z = 9 * PX;
const LOST_TIME = 0.4;
const FREE_LOOK = 0.5;
const DIG_SPEED = 1.6;
const DIG_CHASE = 5;
const EMERGE_TIME = 0.8;
const SHOT_SPEED = 6;
const SHOTS_MAX = 24;
const GATE_CLEAR = 4;
const GATE_POINT_BLANK = 2;
const RUNE_EVERY = 3;
const RUNE_TIME = 0.9;
const RUNE_R = 1.3;
const ROT_R = 2.2;
const ROT_TIME = 3.5;
const ROT_SLOW = 0.85;
const CHARGE_EVERY = 6;
const CHARGE_MIN = 3, CHARGE_MAX = 9;
const CHARGE_SPEED = 5;
const CHARGE_WIND = 0.5;
const SLAM_EVERY = 2;
const SLAM_R = 2.6;
const PROWL = 0.7;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const HERO_ATTACK_MS = {
  aryna: 645, brielle: 645, cersa: 645, daenara: 645, frost: 645, grom: 645, holdur: 645, kael: 645, khar: 645,
  lionguard: 645, maren: 645, melara: 645, raider: 645, recruit: 645, theo: 645, tyrus: 645, wildling: 645, woodsman: 645,
};
export const FOE_EMERGE_MS = { burrower: 820 };

export const ATTACK = {
  kael: 'slash', aryna: 'slash', grom: 'slash', brielle: 'slash', holdur: 'slash', recruit: 'slash', lionguard: 'slash',
  daenara: 'fire', melara: 'holy', tyrus: 'bomb', cersa: 'bomb', theo: 'axe', raider: 'axe', khar: 'axe',
  frost: 'frost', wildling: 'arrow', woodsman: 'slash', maren: 'frost',
};
export const SPLASH = { bomb: 0.9, fire: 0.7 };
export const UNDEAD = new Set(['wight', 'walker', 'shadowwolf', 'spider', 'wyrm', 'wraith', 'bear', 'ghoul', 'burrower', 'archer', 'blight', 'warlord',
  'ash_ghoul', 'molten_knight', 'smoulder']);

export const REALMS = [
  { name: 'Frostmarch', biome: 'frost', pool: ['wight', 'wight', 'spider', 'shadowwolf', 'wraith'], elite: ['bear', 'walker', 'giant'], boss: 'wyrm' },
  {
    name: 'Pinehollow', biome: 'wood', pool: ['briar_outlaw', 'thornback', 'briar_outlaw', 'rootling', 'bramble_spider'], elite: ['mossback', 'bristleboar'], boss: 'stagskull',
    troops: { harpy: 'thornback', ghoul: 'rootling', archer: 'briar_outlaw', burrower: 'bramble_spider', blight: 'rootling', seer: 'briar_outlaw', walker: 'mossback', bear: 'bristleboar', warlord: 'bristleboar', giant: 'mossback', colossus: 'mossback' },
  },
  {
    name: 'Goldcliff Mines', biome: 'mines', pool: ['kobold', 'rock_crawler', 'rock_crawler', 'crystal_mite', 'cave_bat'], elite: ['crystal_golem', 'delver_mole'], boss: 'drill_worm',
    troops: { harpy: 'cave_bat', ghoul: 'crystal_mite', archer: 'kobold', burrower: 'rock_crawler', blight: 'crystal_mite', seer: 'kobold', walker: 'delver_mole', bear: 'delver_mole', warlord: 'crystal_golem', giant: 'crystal_golem', colossus: 'crystal_golem' },
  },
  {
    name: 'Ashen Keep', biome: 'ashen', pool: ['ash_ghoul', 'ash_votary', 'cinder_hound', 'ember_imp', 'smoulder'], elite: ['molten_knight', 'basalt_ram'], boss: 'ash_colossus',
    troops: { harpy: 'ember_imp', ghoul: 'ash_ghoul', archer: 'ash_votary', burrower: 'cinder_hound', blight: 'ash_ghoul', seer: 'ash_votary', walker: 'molten_knight', bear: 'basalt_ram', warlord: 'molten_knight', giant: 'basalt_ram', colossus: 'molten_knight' },
  },
];
export const troopKind = (r, kind) => r.troops?.[kind] ?? kind;
export function nativeKind(r, kind) {
  if (r.troops?.[kind]) return r.troops[kind];
  const base = ENEMIES[kind].like ?? kind;
  const own = [...r.pool, ...r.elite, r.boss];
  if (!r.troops && HUNT_TROOPS.some((t) => t.kind === kind)) return kind;
  const same = own.find((k) => (ENEMIES[k].like ?? k) === base);
  if (same) return same;
  const d = ENEMIES[kind];
  return d.boss ? r.boss : d.elite ? r.elite[0] : r.pool[0];
}
export const BIOME_ORDER = ['frost', 'wood', 'mines', 'ashen'];

const RING = [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [2, -2], [-2, 2], [-2, -2]];
const DIAGONALS = [[1, -1], [-1, 1], [-1, -1], [1, 1]];

const CORNERS = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]];
const RALLY_AT = 0.3;
const RALLY = CORNERS.map(([x, y]) => [CX + (x - CX) * RALLY_AT, CY + (y - CY) * RALLY_AT]);
const RALLY_R = 3.4;
const MID_R = 6;
const NEAR = 2;
const CROSS_WAIT = 4;
const HOLD_R = 7;
const MARCH_R = 4.5;
const MARCH_TO = 5.5;
const MARCH_PICKS = 8;
const MARCH_STUCK = 3;
const MARCH_PACE = 2;

export const HUNT_GATES = [
  [5, 0, 0, -1, 1.8, 0], [15, 0, 0, -1, 1.8, 1], [0, 5, -1, 0, 1.8, 0], [0, 13, -1, 0, 1.8, 2],
  [10, 18, 1, 1, 5, 3, [[10, 18], [9, 17]]], [20, 8, 1, 1, 5, 3, [[20, 8], [19, 7]]],
];

const CLIMB_WALLS = [
  { line: [3, 22, 12, 22], out: [0, 1], top: 86, near: true }, { line: [16, 22, 23, 22], out: [0, 1], top: 86, near: true },
  { line: [24, 14, 24, 21], out: [1, 0], top: 86, near: true }, { line: [24, 2, 24, 10], out: [1, 0], top: 86, near: true },
  { line: [1, -1.2, 19, -1.2], out: [0, -1], top: 190 }, { line: [-1.2, 1, -1.2, 17], out: [-1, 0], top: 190 },
];

const RIVALS = ['FrostMaxi', 'Kelvarn', 'Brightholt', 'Emberwake', 'Gravenhold', 'Ashgrove', 'Doranel', 'Morvane', 'TideKing', 'CoinBankr'];
const DRAGON_AUTO = false;
const DRAGON_FIRST = 25;
const DRAGON_EVERY = 150;
const DRAGON_TIME = 75;

const BURN_TIME = 3;
const BURN_BOOK = 0.5;

const MICRO_PER_CENT = 10000;
const WAVE_PM = Math.round(FARM.waveShare * 1000);
const PAY_DIV = 10n ** 18n;
export const OIL_PAY = 1250;

export const mixSeed = (...n) => n.reduce((h, v) => { h = Math.imul(h ^ (v | 0), 2654435761); return (h ^ (h >>> 15)) >>> 0; }, 0x9e3779b9);

export function seeded(seed) {
  let a = mixSeed(seed, 0x51ed27);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const dist = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };

export const bodyGap = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return Math.max(Math.abs(dx - dy) * BODY_STEP_X / BODY_W, Math.abs(dx + dy) * BODY_STEP_Y / BODY_H);
};

export function log2(x) {
  if (!(x > 0)) return -Infinity;
  let n = 0;
  while (x >= 2) { x /= 2; n++; }
  while (x < 1) { x *= 2; n--; }
  let f = 0;
  for (let b = 0.5, i = 0; i < 40; i++, b /= 2) { x *= x; if (x >= 2) { x /= 2; f += b; } }
  return n + f;
}

const sectorAt = (x, y) => CORNERS.reduce((b, c, i) => (dist(x, y, c[0], c[1]) < dist(x, y, CORNERS[b][0], CORNERS[b][1]) ? i : b), 0);
const rarityMult = (key) => RARITIES[HEROES[key].rarity].mult;

export function maxEnergyOf(h) {
  return Math.round(HEROES[h.key].stats.sta * 6 * (1 + (h.level - 1) * 0.08));
}
const broken = (h) => h.shield <= 0;

export function combatStats(hero) {
  const def = HEROES[hero.key];
  const m = skillMods(hero.key);
  const kind = ATTACK[hero.key];
  const base = SPLASH[kind] || (m.cleave ? 1 : m.blast ? 0.5 : 0);
  return {
    kind,
    atk: def.stats.pow * rarityMult(hero.key) * (1 + (hero.level - 1) * 0.1) * (kind === 'slash' ? 1.3 : 1),
    cd: Math.max(0.45, 1.25 - def.stats.bmb * 0.15) * (1 - m.swift / 100),
    crit: 0.1 + def.stats.spd * 0.01 + m.keen / 100,
    critMult: 2 + m.savage / 100,
    reach: kind === 'slash' ? 1.35 : def.stats.rng + 0.6,
    aoe: base ? base + m.blast : 0,
    aoePct: base ? Math.max(SPLASH[kind] ? 0.5 : 0, m.cleave / 100, m.blast ? 0.25 : 0) : 0,
  };
}

export function huntGrid(realmIndex) {
  const biome = BIOME_ORDER[((realmIndex % 4) + 4) % 4];
  const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ wall: false })));
  for (const [x, y] of HUNT_WALLS[biome].blocked) grid[y][x].wall = true;
  return grid;
}

export const heroInput = (h, pay = h.pay) => ({ id: h.id, key: h.key, level: h.level, energy: h.energy, shield: h.shield, status: h.status, pay });

export function createHunt(opts = {}) {
  const hooks = opts.hooks || {};
  const look = opts.look || {};
  const pose = opts.pose || {};
  const record = !!opts.record;
  const seed = opts.seed >>> 0;
  const runSeed = mixSeed(seed, 0x6d6170);
  const seedFor = (realmN, waveN) => mixSeed(runSeed, realmN, waveN);
  const NO_RAID = { update() {}, active: () => false, hit() {}, hitWall() {}, summonDown() {} };
  let raid = NO_RAID;

  let rngState = [mixSeed(seed, 1), mixSeed(seed, 2), mixSeed(seed, 3), 1];
  let tickN = 0;
  let simT = 0;
  let clockBase = opts.startMs ?? 0;
  let forcedHour = null;
  let realmN = opts.realm ?? 1;
  let squad = opts.squad || null;
  let grid = [];
  let mapSeed = 0, mapIndex = 0;
  let units = [];
  let foes = [];
  let shots = [];
  let foeShots = [];
  let runes = [];
  let queue = [];
  let spawnT = 0;
  let fieldLoad = 1;
  let gateUse = [];
  let wave = 1;
  let waveTotal = 0;
  let waveT = 0;
  let waveBreak = 0;
  let swingAt = [0, 0, 0, 0];
  let fade = 0, fadeDir = 0, pendingMap = null, holdMap = false;
  let occ = new Array(W * H).fill(null);
  let flow = new Int16Array(W * H);
  let sectorFlow = CORNERS.map(() => new Int16Array(W * H));
  let flowT = 0;
  let dragon = null;
  let dragonT = DRAGON_FIRST;
  let wavePot = Number.isSafeInteger(opts.wavePot) && opts.wavePot > 0 ? opts.wavePot : 0;
  let fightPm = 1000;
  let oilUntil = 0;
  let nextId = 0;
  let seats = new Map();
  let quiet = false;
  let events = [];
  let ledger = [];
  let inputs = [];

  function rand() {
    const s = rngState;
    const t = (((s[0] + s[1]) | 0) + s[3]) | 0;
    s[3] = (s[3] + 1) | 0;
    s[0] = s[1] ^ (s[1] >>> 9);
    s[1] = (s[2] + (s[2] << 3)) | 0;
    s[2] = (s[2] << 21) | (s[2] >>> 11);
    s[2] = (s[2] + t) | 0;
    return (t >>> 0) / 4294967296;
  }
  for (let i = 0; i < 15; i++) rand();
  const note = (...e) => { if (record) events.push([tickN, ...e]); };
  const input = (a) => { if (record) inputs.push({ at: tickN, ...a }); };
  const roster = () => (opts.heroes ? opts.heroes() : squad || []);
  const payOf = (hero) => (opts.payRate ? opts.payRate(hero) : hero.pay) || 0;

  const realm = () => REALMS[(realmN - 1) % REALMS.length];
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const cell = (x, y) => (inside(x, y) ? grid[y][x] : null);
  const passable = (x, y) => { const c = cell(x, y); return !!c && !c.wall; };

  const clock = () => clockBase + Math.floor(simT * 1000);
  const hourNow = () => forcedHour ?? ((clock() / 3600e3) % 24);
  const dayPhase = (h = hourNow()) => (h < 5 || h >= 20 ? 'night' : h < 8.5 ? 'dawn' : h < 17 ? 'noon' : 'dusk');
  const awake = (kind) => { const p = dayPhase(); return !((p === 'night' && DAY_FOES.includes(kind)) || (p === 'noon' && NIGHT_FOES.includes(kind))); };

  function buildMap(s = seedFor(realmN, wave), realmIndex = (realmN - 1) % REALMS.length) {
    mapSeed = s >>> 0;
    mapIndex = realmIndex;
    grid = huntGrid(realmIndex);
    rimGrid = null;
  }

  function changeMap(s, realmIndex) {
    if (holdMap) return;
    pendingMap = { seed: s, realmIndex };
    fadeDir = 1;
  }

  function settle(e) {
    const fp = footprint(e);
    Object.assign(e, { next: null, step: null });
    if (e.path) e.path = [];
    const rx = Math.round(e.fx), ry = Math.round(e.fy);
    const tight = (x, y) => fits(x, y, fp, e);
    const clear = (x, y) => tight(x, y) && !(fp === FOOT_1 && tooClose(x, y, e));
    let best = null;
    for (const open of [clear, tight]) {
      if (best) break;
      if (open(rx, ry)) { best = [rx, ry]; break; }
      let bd = Infinity;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = dist(x, y, e.fx, e.fy);
        if (d < bd && open(x, y)) { bd = d; best = [x, y]; }
      }
    }
    const [x, y] = best || [rx, ry];
    Object.assign(e, { x, y, fx: x, fy: y });
    hold(e, x, y);
  }

  function reseat() {
    occ.fill(null);
    const bosses = foes.filter((f) => f.def.dragon || f.def.raid);
    for (const f of bosses) hold(f, f.x, f.y);
    for (const e of [...units, ...foes.filter((f) => !bosses.includes(f))]) {
      const fp = footprint(e);
      const n = nextTile(e);
      if (fits(e.x, e.y, fp, e) && (!n || fits(n[0], n[1], fp, e))) { hold(e, e.x, e.y); if (n) hold(e, n[0], n[1]); }
      else settle(e);
    }
  }

  function updateFade(dt) {
    if (!fadeDir) return;
    fade = Math.max(0, Math.min(1, fade + fadeDir * dt * 2.6));
    if (fadeDir > 0 && fade >= 1) {
      const p = pendingMap;
      pendingMap = null;
      const before = mapIndex;
      buildMap(p.seed, p.realmIndex);
      if (mapIndex !== before) {
        const r = REALMS[mapIndex];
        const back = [];
        foes = foes.filter((f) => {
          if (!f.hunt || f.def.dragon || f.def.raid || f.def.vigil) return true;
          const k = nativeKind(r, f.kind);
          if (k === f.kind) return true;
          note('native', f.id, k);
          if (f.def.role) { back.push(k); return false; }
          f.kind = k;
          f.def = ENEMIES[k];
          return true;
        });
        queue = [...back, ...queue.map((k) => (!ENEMIES[k] || ENEMIES[k].vigil ? k : nativeKind(r, k)))];
      }
      for (const e of [...units, ...foes]) { Object.assign(e, { next: null, step: null, fx: e.x, fy: e.y }); if (e.path) e.path = []; }
      reseat();
      fadeDir = -1;
      look.map?.(mapSeed, mapIndex);
    } else if (fadeDir < 0 && fade <= 0) fadeDir = 0;
  }

  const FOOT_1 = [[0, 0]];
  const FOOT_2 = [[0, 0], [-1, 0], [0, -1], [-1, -1]];
  const FOOT_3 = [];
  const FOOT_NONE = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) FOOT_3.push([dx, dy]);
  function footprint(e) {
    const d = e.def;
    if (e.air) return FOOT_NONE;
    return !d ? FOOT_1 : d.dragon || d.raid ? FOOT_3 : d.big ? FOOT_2 : FOOT_1;
  }
  const nextTile = (e) => (e.def ? e.next : e.step) || null;
  function hold(e, x, y) {
    for (const [dx, dy] of footprint(e)) if (inside(x + dx, y + dy)) occ[(y + dy) * W + x + dx] = e;
  }
  function fits(x, y, fp = FOOT_1, self = null) {
    for (const [dx, dy] of fp) {
      const tx = x + dx, ty = y + dy;
      if (!passable(tx, ty)) return false;
      const o = occ[ty * W + tx];
      if (o && o !== self) return false;
    }
    return true;
  }
  function rebuildOcc() {
    occ.fill(null);
    for (const e of units) { hold(e, e.x, e.y); if (e.step) hold(e, e.step[0], e.step[1]); }
    for (const e of foes) { hold(e, e.x, e.y); if (e.next) hold(e, e.next[0], e.next[1]); }
    for (const e of foes) {
      if (!(e.enter > 0)) continue;
      const k = e.enter * e.from;
      for (const [px, py] of entryPoints(e.x, e.y, e.x + e.ox * k, e.y + e.oy * k)) {
        const rx = Math.round(px), ry = Math.round(py);
        for (let ty = ry - 1; ty <= ry + 1; ty++) for (let tx = rx - 1; tx <= rx + 1; tx++) {
          if (inside(tx, ty) && !occ[ty * W + tx] && passable(tx, ty) && dist(tx, ty, px, py) < 1) occ[ty * W + tx] = e;
        }
      }
    }
  }
  function reachDist(x, y, f) {
    if (f.def.dragon || f.def.raid) return dist(x, y, f.fx, f.fy) - radius(f);
    if (!f.def.big) return dist(x, y, f.fx, f.fy);
    let best = Infinity;
    for (const [dx, dy] of FOOT_2) best = Math.min(best, dist(x, y, f.fx + dx, f.fy + dy));
    return best;
  }
  function touching(f, u, loose = false) {
    if (footprint(f) === FOOT_1 && !loose) {
      const dx = Math.abs(f.fx - u.fx), dy = Math.abs(f.fy - u.fy);
      return Math.max(dx, dy) <= 1.05 && Math.min(dx, dy) >= 0.5;
    }
    for (const [dx, dy] of footprint(f)) if (Math.max(Math.abs(f.fx + dx - u.fx), Math.abs(f.fy + dy - u.fy)) <= 1.05) return true;
    return false;
  }
  const wideBody = (e) => !!e.def && (e.def.big || e.def.dragon || e.def.raid);
  function roomy(x, y, self) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!(dx || dy) || !inside(x + dx, y + dy)) continue;
      const o = occ[(y + dy) * W + x + dx];
      if (!o || o === self) continue;
      const rival = !o.def !== !self.def;
      if (!rival || !((dx && dy) || wideBody(o) || wideBody(self))) return false;
    }
    return true;
  }
  const meleeCap = (e) => (e.def?.dragon || e.def?.raid ? Infinity : e.def?.big ? MELEE_MAX_BIG : MELEE_MAX);
  function commit(u, f) {
    if (u.foe === f) return;
    if (u.foe) u.foe.melee--;
    if (f) f.melee = (f.melee || 0) + 1;
    u.foe = f;
  }
  function tallyMelee() {
    for (const f of foes) f.melee = 0;
    for (const u of units) u.melee = 0;
    for (const u of units) {
      if (u.foe && !foes.includes(u.foe)) u.foe = null;
      if (u.foe) u.foe.melee++;
    }
    for (const f of foes) {
      if (f.prey && !units.includes(f.prey)) f.prey = null;
      if (f.prey) f.prey.melee++;
    }
  }

  function fillFlow(field, src) {
    field.fill(-1);
    const q = [];
    for (const [x, y] of src) if (inside(x, y) && field[y * W + x] < 0) { field[y * W + x] = 0; q.push([x, y]); }
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!passable(nx, ny) || field[ny * W + nx] >= 0) continue;
        field[ny * W + nx] = field[y * W + x] + 1;
        q.push([nx, ny]);
      }
    }
  }
  function buildFlow() {
    const around = (u) => {
      const x = Math.round(u.fx), y = Math.round(u.fy);
      return ((u.melee || 0) < MELEE_MAX ? DIAGONALS : RING).map(([dx, dy]) => [x + dx, y + dy]).filter(([tx, ty]) => passable(tx, ty));
    };
    const all = units.length ? units.flatMap(around) : [[CX, CY]];
    fillFlow(flow, all);
    sectorFlow.forEach((field, s) => {
      const own = units.filter((u) => u.sector === s);
      if (own.length) fillFlow(field, own.flatMap(around)); else field.set(flow);
    });
    for (const u of units) {
      const ring = around(u), own = ring.filter(([x, y]) => areaOf(u, x, y));
      const home = own.length || !u.post ? [] : around({ fx: u.post[0], fy: u.post[1], melee: u.melee }).filter(([x, y]) => areaOf(u, x, y));
      fillFlow(u.duelFlow ??= new Int16Array(W * H), own.length ? own : home.length ? home : ring);
    }
  }

  function startWave(n) {
    wave = n;
    const r = realm();
    queue = [];
    if (n === WAVES) {
      queue.push(r.boss);
      for (let i = 0; i < 6; i++) queue.push(r.pool[i % r.pool.length]);
      if (!quiet) { hooks.onBoss?.(ENEMIES[r.boss].name); look.wave?.(n, true); }
    } else {
      const count = Math.round((6 + n * 2) * (1 + huntTier() * WAVE_TIER));
      while (queue.length < count) queue.push(...muster());
      if (n % 3 === 0) queue.splice(Math.floor(queue.length / 2), 0, r.elite[(n / 3 - 1) % r.elite.length]);
      if (!quiet) look.wave?.(n, false);
    }
    waveTotal = queue.length;
    waveT = WAVE_TIME;
    spawnT = 0.4;
    note('wave', realmN, n, waveTotal);
    if (!quiet) hooks.onWave?.(n, WAVES, r.name);
  }

  let rim = null, rimGrid = null;
  function rimTiles() {
    if (rimGrid === grid) return rim;
    rimGrid = grid;
    rim = HUNT_GATES.flatMap(([gx, gy, ox, oy, from, sector, tiles], gate) => (tiles || [-1, 0, 1].map((k) => [gx + k * Math.abs(oy), gy + k * Math.abs(ox)]))
      .map(([x, y]) => [x, y, gx + ox * from, gy + oy * from, from, sector, gate])).filter(([x, y]) => passable(x, y));
    return rim;
  }

  const fieldGoal = () => Math.min(units.length, FIELD_CAP);
  function toughness(u) {
    const atk = u ? combatStats(u.hero).atk : units.reduce((t, o) => t + combatStats(o.hero).atk, 0) / (units.length || 1);
    const fighters = u ? 1 : units.length;
    return Math.max(FOE_HP, (atk * (FOE_HITS + fighters * FOE_HITS_HERO)) / 10) * HUNT_FOE_HP;
  }

  function huntTier() {
    const dps = units.reduce((t, u) => { const c = combatStats(u.hero); return t + c.atk / c.cd; }, 0);
    return Math.max(0, log2(dps / HUNT_POWER_REF || 1)) + Math.max(0, wave) * HUNT_TIER_WAVE;
  }

  function muster() {
    const tier = huntTier();
    const r = realm();
    const awakePool = r.pool.filter(awake);
    const pool = awakePool.length ? awakePool : r.pool;
    const count = (kind) => foes.reduce((n, f) => n + (f.kind === kind), 0) + queue.reduce((n, k) => n + (k === kind), 0);
    const open = HUNT_TROOPS.filter((t) => { const k = troopKind(r, t.kind); return awake(t.kind) && awake(k) && tier >= t.from && (!t.cap || count(k) < t.cap + Math.floor((tier - t.from) / HUNT_CAP_TIERS)); });
    const weight = (t) => t.weight + (tier - t.from) * t.grow;
    let roll = rand() * (pool.length * HUNT_POOL_WEIGHT + open.reduce((s, t) => s + weight(t), 0));
    for (const t of open) if ((roll -= weight(t)) < 0) return Array(t.pack).fill(troopKind(r, t.kind));
    return [pool[Math.floor(rand() * pool.length)]];
  }

  function tooClose(x, y, self) {
    const near = (o) => o !== self && !o.free && footprint(o) === FOOT_1 && dist(o.fx, o.fy, x, y) < MIN_GAP;
    return units.some(near) || foes.some(near);
  }

  function besideHeld(x, y, self) {
    for (const [dx, dy] of DIRS) {
      const tx = x + dx, ty = y + dy;
      const o = inside(tx, ty) ? occ[ty * W + tx] : null;
      if (o && o !== self) return true;
    }
    return false;
  }

  const ENTRY_STEP = 0.25;
  function entryPoints(x, y, mx, my) {
    const len = dist(x, y, mx, my), n = Math.floor(len / ENTRY_STEP), pts = [];
    for (let i = 0; i < n; i++) {
      const k = (i * ENTRY_STEP) / len, px = mx + (x - mx) * k, py = my + (y - my) * k;
      if (px > -1 && py > -1 && px < W && py < H) pts.push([px, py]);
    }
    return pts;
  }
  function entryBlocked(x, y, mx, my, self) {
    for (const [px, py] of entryPoints(x, y, mx, my)) {
      const rx = Math.round(px), ry = Math.round(py);
      for (let ty = ry - 1; ty <= ry + 1; ty++) for (let tx = rx - 1; tx <= rx + 1; tx++) {
        if (!inside(tx, ty) || (tx === x && ty === y)) continue;
        const o = occ[ty * W + tx];
        if (o && o !== self && dist(tx, ty, px, py) < 1) return true;
      }
    }
    return false;
  }

  function makeFoe(kind, x, y, sector, at, duel = null) {
    const def = ENEMIES[kind];
    const hp = def.hp * (1 + (realmN - 1) * 0.35) * (at ? 1 : toughness(duel));
    const foe = { id: ++nextId, kind, def, x, y, fx: x, fy: y, next: null, path: [], to: null, hp, max: hp, dir: 'down', frame: 0, ft: rand(), hurt: 0, bite: 1, think: 0, off: Math.floor(rand() * 6), sector, hunt: !at };
    if (duel) { foe.duel = duel; duel.duel = foe; }
    if (def.role === 'warlord') foe.chargeT = CHARGE_EVERY / 2;
    if (def.role === 'fly') foe.z = FLY_Z;
    if (!at && (def.role === 'warlord' || def.role === 'colossus')) look.arrive?.(foe);
    note('spawn', foe.id, kind, x, y, Math.round(hp * 1000));
    return foe;
  }

  function landing(ax, ay, self, heroes = units) {
    const open = (x, y) => inside(x, y) && fits(x, y, FOOT_1, self) && !tooClose(x, y, self) && !besideHeld(x, y, self);
    const own = heroes.length === 1 && heroes[0].post && duels() ? heroes[0] : null;
    const near = heroes.filter((u) => (u.melee || 0) < MELEE_MAX).sort((a, b) => dist(a.fx, a.fy, ax, ay) - dist(b.fx, b.fy, ax, ay)).slice(0, 6);
    for (const free of own ? [(x, y) => open(x, y) && areaOf(own, x, y), open] : [open]) for (const around of [DIAGONALS, RING]) for (const u of near) {
      const [ux, uy] = u.step || [u.x, u.y];
      const spots = around.map(([dx, dy]) => [ux + dx, uy + dy]).filter(([x, y]) => free(x, y));
      if (spots.length) return spots.reduce((a, b) => (dist(a[0], a[1], CX, CY) <= dist(b[0], b[1], CX, CY) ? a : b));
    }
    const free = open;
    const post = heroes.length === 1 && heroes[0].post;
    const [rx, ry] = post || RALLY[Math.floor(rand() * RALLY.length)];
    for (let i = 0; i < 12; i++) {
      const x = Math.round(rx + (rand() - 0.5) * (post ? 3 : 6)), y = Math.round(ry + (rand() - 0.5) * (post ? 3 : 6));
      if (free(x, y)) return [x, y];
    }
    return null;
  }

  function marchIn(f) {
    if (f.duel?.post) { f.march = { to: [...f.duel.post], t: 0 }; return; }
    let best = null, bc = Infinity;
    for (let i = 0; i < MARCH_PICKS; i++) {
      const x = Math.round(CX + (rand() * 2 - 1) * MARCH_TO), y = Math.round(CY + (rand() * 2 - 1) * MARCH_TO);
      if (dist(x, y, CX, CY) > MARCH_TO || !passable(x, y)) continue;
      const near = (ax, ay) => dist(ax, ay, x, y) < 2.5;
      const c = units.reduce((n, u) => n + near(u.fx, u.fy), 0) + foes.reduce((n, o) => n + (o !== f && (o.march ? near(o.march.to[0], o.march.to[1]) : near(o.fx, o.fy))), 0);
      if (c < bc) { bc = c; best = [x, y]; }
    }
    if (best) f.march = { to: best, t: 0 };
  }

  function marching(f, dt) {
    const m = f.march;
    const [tx, ty] = m.to;
    const inner = f.duel ? dist(f.fx, f.fy, tx, ty) <= DUEL_MEET : dist(f.fx, f.fy, CX, CY) <= MARCH_R;
    if (!f.next) m.t += dt;
    if (m.t >= MARCH_STUCK || (!f.next && dist(f.x, f.y, tx, ty) <= 1)
      || (inner && foeHeroes(f).some((u) => touching(f, u, true)) && (!f.duel || areaOf(f.duel, f.x, f.y)))) { f.march = null; f.path = []; return false; }
    if (!f.next && !f.path.length) {
      const fp = footprint(f);
      const goal = (x, y) => dist(x, y, tx, ty) <= 1;
      const apart = (x, y) => !units.some((o) => o !== f.duel && Math.max(Math.abs(o.x - x), Math.abs(o.y - y)) <= 1);
      const far = dist(f.x, f.y, tx, ty) > DUEL_NEAR[1] + 1;
      const p = (f.duel && bfs(f.x, f.y, (x, y) => goal(x, y) && areaOf(f.duel, x, y), (x, y) => fits(x, y, fp, f) && areaOf(f.duel, x, y, true)))
        || (f.duel && far && bfs(f.x, f.y, goal, (x, y) => fits(x, y, fp, f) && apart(x, y)))
        || bfs(f.x, f.y, goal, (x, y) => fits(x, y, fp, f));
      if (p && p.length) route(f, p, ROUTE_SPAN);
    }
    return true;
  }

  function freeEntry(kind, duel = null) {
    const role = ENEMIES[kind].role;
    if (role === 'climb') return climbIn(kind);
    const from = role === 'burrow' ? rimTiles()[Math.floor(rand() * rimTiles().length)] : null;
    const ax = CX + (rand() * 2 - 1) * MARCH_TO, ay = CY + (rand() * 2 - 1) * MARCH_TO;
    const tile = duel ? landing(duel.fx, duel.fy, null, [duel]) : landing(ax, ay, null);
    if (!tile) return null;
    const [x, y] = tile;
    const foe = makeFoe(kind, x, y, sectorAt(x, y), undefined, duel);
    let sx = from?.[0], sy = from?.[1];
    if (!from) {
      const vx = x - CX, vy = y - CY, len = Math.sqrt(vx * vx + vy * vy);
      const [ux, uy] = len ? [vx / len, vy / len] : [1, 0];
      const j = (rand() - 0.5) * 0.5;
      const rx = ux - uy * j, ry = uy + ux * j, rl = Math.sqrt(rx * rx + ry * ry);
      sx = CX + (rx / rl) * FLY_FROM; sy = CY + (ry / rl) * FLY_FROM;
    }
    Object.assign(foe, { fx: sx, fy: sy, free: from ? 'dig' : 'fly', veil: true, look: FREE_LOOK, age: 0 });
    pose.aim?.(foe, x - sx, y - sy); foe.fi = foe.want;
    foes.push(foe);
    hold(foe, x, y);
    return foe;
  }

  function climbIn(kind) {
    for (let i = 0; i < 10; i++) {
      const { line: [ax, ay, bx, by], out: [ox, oy], top, near } = CLIMB_WALLS[Math.floor(rand() * CLIMB_WALLS.length)];
      const k = rand();
      const px = ax + (bx - ax) * k, py = ay + (by - ay) * k;
      const x = Math.max(0, Math.min(W - 1, Math.round(px))), y = Math.max(0, Math.min(H - 1, Math.round(py)));
      if (!fits(x, y) || tooClose(x, y, null) || besideHeld(x, y, null) || units.some((u) => dist(u.fx, u.fy, x, y) < 2)) continue;
      const foe = makeFoe(kind, x, y, sectorAt(x, y));
      const keys = near
        ? [{ x: px + ox * 3, y: py + oy * 3, z: 0, t: 0, front: true },
          { x: px + ox * 0.4, y: py + oy * 0.4, z: 0, t: 0.9, front: true },
          { x: px + ox * 0.4, y: py + oy * 0.4, z: top, t: 0.7, front: true },
          { x: px - ox * 0.6, y: py - oy * 0.6, z: top, t: 0.2, front: true },
          { z: 0, t: 0.55 }]
        : [{ x: px, y: py, z: top, t: 0 }, { x: px, y: py, z: 30, t: 0.8 }, { z: 0, t: 0.5 }];
      Object.assign(foe, { fx: keys[0].x, fy: keys[0].y, z: keys[0].z, free: 'climb', veil: true, age: 0, climb: { keys, i: 1, t: 0 }, front: !!near });
      pose.aim?.(foe, x - foe.fx, y - foe.fy); foe.fi = foe.want;
      marchIn(foe);
      foes.push(foe);
      hold(foe, x, y);
      return foe;
    }
    return null;
  }

  function duelEntry(kind, u) {
    const def = ENEMIES[kind];
    const fp = footprint({ def });
    const [ux, uy] = units.length > 1 && u.step ? u.step : [u.x, u.y];
    const [px, py] = !u.post || dist(ux, uy, u.post[0], u.post[1]) <= 2 ? [ux, uy] : u.post;
    let best = null, bs = -1, inArea = false;
    for (let y = Math.floor(py - DUEL_NEAR[1]); y <= py + DUEL_NEAR[1]; y++) for (let x = Math.floor(px - DUEL_NEAR[1]); x <= px + DUEL_NEAR[1]; x++) {
      const d = dist(x, y, px, py);
      const own = areaOf(u, x, y);
      if (d < (own && units.length > 1 ? DUEL_NEAR_OWN : DUEL_NEAR[0]) || d > DUEL_NEAR[1] || !inside(x, y) || !fits(x, y, fp) || (fp === FOOT_1 && (tooClose(x, y, null) || besideHeld(x, y, null)))) continue;
      if (inArea && !own) continue;
      let room = Infinity;
      const gap = units.length > 1 ? bodyGap : dist;
      for (const o of [...units, ...foes]) if (o !== u) room = Math.min(room, gap(o.fx, o.fy, x, y));
      for (const o of units) if (o !== u && o.post) room = Math.min(room, gap(o.post[0], o.post[1], x, y));
      if ((own && !inArea) || room > bs) { bs = room; best = [x, y]; inArea = own; }
    }
    if (!best) return null;
    const [x, y] = best;
    const foe = makeFoe(kind, x, y, sectorAt(x, y), undefined, u);
    marchIn(foe);
    foes.push(foe);
    hold(foe, x, y);
    look.puff?.(x, y, 'smoke', 3);
    return foe;
  }

  function spawnFoe(kind, at, duel = null) {
    if (!at && ['fly', 'burrow'].includes(ENEMIES[kind].role)) return freeEntry(kind, duel);
    if (!at && duel) return duelEntry(kind, duel);
    if (!at && ENEMIES[kind].role === 'climb') return freeEntry(kind, duel);
    const fp = footprint({ def: ENEMIES[kind] });
    if (at && !fits(at[0], at[1], fp)) return null;
    const outward = new Map();
    for (const [rx, ry, mx, my, from, sector, gate] of rimTiles()) for (const [dx, dy] of fp) {
      const k = (ry - dy) * W + rx - dx;
      if (rx - dx >= 0 && rx - dx < W && !outward.has(k)) outward.set(k, [mx, my, from, sector, gate]);
    }
    const busy = new Set(foes.filter((f) => f.enter > 0).map((f) => f.gate));
    let free = [...outward.keys()].map((k) => [k % W, Math.floor(k / W)])
      .filter(([x, y]) => inside(x, y) && fits(x, y, fp) && dist(x, y, CX, CY) >= MID_R && !busy.has(outward.get(y * W + x)[4])
        && !(fp === FOOT_1 && (tooClose(x, y, null) || besideHeld(x, y, null) || entryBlocked(x, y, outward.get(y * W + x)[0], outward.get(y * W + x)[1], null))));
    const spaced = free.filter(([x, y]) => fp.every(([dx, dy]) => roomy(x + dx, y + dy, { def: ENEMIES[kind] })));
    if (spaced.length) free = spaced;
    const clear = (list) => list.filter(([x, y]) => !units.some((u) => dist(u.fx, u.fy, x, y) < 2));
    const apart = (list) => list.filter(([x, y]) => !foes.some((o) => dist(o.fx, o.fy, x, y) < 2.5));
    const tiers = [(l) => apart(clear(l)), clear, apart, (l) => l];
    const live = [0, 0, 0, 0];
    for (const o of foes) if (o.sector != null) live[o.sector]++;
    const tie = [rand(), rand(), rand(), rand()];
    const order = [0, 1, 2, 3].sort((a, b) => live[a] - live[b] || tie[a] - tie[b]);
    const corners = order.map((k) => free.filter(([x, y]) => outward.get(y * W + x)[3] === k));
    let pool = [];
    for (const tier of tiers) for (const list of corners) if (!pool.length) pool = tier(list);
    for (const tier of tiers) if (!pool.length) pool = tier(free);
    const used = ([x, y]) => gateUse[outward.get(y * W + x)[4]] || 0;
    const least = Math.min(...pool.map(used));
    pool = pool.filter((s) => used(s) === least);
    const spot = at || pool[Math.floor(rand() * pool.length)];
    if (!spot) return null;
    const [x, y] = spot;
    const out = !at && outward.get(y * W + x);
    const foe = makeFoe(kind, x, y, out ? out[3] : sectorAt(x, y), at);
    if (out) {
      gateUse[out[4]] = (gateUse[out[4]] || 0) + 1;
      Object.assign(foe, { enter: 1, ox: (out[0] - x) / out[2], oy: (out[1] - y) / out[2], from: out[2], gate: out[4] }); pose.aim?.(foe, -foe.ox, -foe.oy); foe.fi = foe.want;
      marchIn(foe);
    }
    foes.push(foe);
    hold(foe, x, y);
    if (!out) look.puff?.(x, y, 'smoke', 3);
    return foe;
  }

  function spawnUnits() {
    const ready = roster().filter((h) => h.status === 'work' && !broken(h));
    const working = [...ready.filter((h) => !h.trial), ...ready.filter((h) => h.trial)].slice(0, FIELD_CAP);
    const keep = new Map(units.map((u) => [u.hero.id, u]));
    units = working.filter((hero) => keep.has(hero.id)).map((hero) => Object.assign(keep.get(hero.id), { hero }));
    for (const u of units) u.pay = payOf(u.hero);
    rebuildOcc();
    for (const hero of working) if (!keep.has(hero.id)) { const u = newUnit(hero); if (u) units.push(u); }
    units.sort((a, b) => working.indexOf(a.hero) - working.indexOf(b.hero));
  }

  function newUnit(hero) {
    const seat = seats.get(hero.id);
    if (seat) {
      seats.delete(hero.id);
      if (fits(seat.x, seat.y) && !tooClose(seat.x, seat.y, null)) {
        const u = { hero, sector: seat.sector, x: seat.x, y: seat.y, fx: seat.x, fy: seat.y, path: [], step: null, to: null, goal: null, dir: 'down', frame: 0, ft: 0, cd: rand(), think: 0, foe: null, atk: null, stall: 0, pot: seat.pot, work: seat.work, pay: payOf(hero) };
        hold(u, u.x, u.y);
        note('join', hero.id, u.x, u.y);
        return u;
      }
    }
    let free = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fits(x, y)) free.push([x, y]);
    if (!free.length) return null;
    const clear = free.filter(([x, y]) => !tooClose(x, y, null));
    if (clear.length) free = clear;
    const count = [0, 0, 0, 0];
    for (const o of units) count[o.sector]++;
    const sector = [0, 1, 2, 3].sort((a, b) => count[a] - count[b] || a - b)[0];
    const [rx, ry] = RALLY[sector];
    const spaced = free.filter(([x, y]) => roomy(x, y, {}));
    if (spaced.length) free = spaced;
    free.sort((a, b) => dist(a[0], a[1], rx, ry) - dist(b[0], b[1], rx, ry));
    const [x, y] = free[Math.floor(rand() * Math.min(8, free.length))];
    const u = { hero, sector, x, y, fx: x, fy: y, path: [], step: null, to: null, goal: null, dir: 'down', frame: 0, ft: 0, cd: rand(), think: 0, foe: null, atk: null, stall: 0, pot: 0, work: 0, pay: payOf(hero) };
    hold(u, x, y);
    note('join', hero.id, x, y);
    return u;
  }

  let postTiles = null, postGrid = null;
  function postSpots() {
    if (postGrid === grid) return postTiles;
    postGrid = grid;
    postTiles = [];
    for (let y = POST_MARGIN; y < H - POST_MARGIN; y++) for (let x = POST_MARGIN; x < W - POST_MARGIN; x++) {
      let open = true;
      for (let dy = -1; dy <= 1 && open; dy++) for (let dx = -1; dx <= 1; dx++) if (!passable(x + dx, y + dy)) { open = false; break; }
      if (open && !HUNT_GATES.some(([gx, gy]) => dist(x, y, gx, gy) < POST_GATE)) postTiles.push([x, y]);
    }
    return postTiles;
  }

  function placePosts() {
    const spots = postSpots();
    const onSpot = (p) => p && spots.some(([x, y]) => x === p[0] && y === p[1]);
    if (units.every((u) => onSpot(u.post))) return;
    const farthest = (posts) => {
      let best = null, bs = -1, bc = Infinity;
      for (const [x, y] of spots) {
        let gap = DUEL_SPREAD;
        for (const q of posts) gap = Math.min(gap, bodyGap(x, y, q[0], q[1]));
        const c = dist(x, y, CX, CY);
        if (gap > bs || (gap === bs && c < bc)) { best = [x, y]; bs = gap; bc = c; }
      }
      return [best, bs];
    };
    const kept = units.filter((u) => onSpot(u.post));
    if (kept.length && kept.length === units.length - 1 && kept.every((u, i) => kept.every((o, j) => i >= j || bodyGap(u.post[0], u.post[1], o.post[0], o.post[1]) >= DUEL_GAP))) {
      const [p, gap] = farthest(kept.map((u) => u.post));
      if (p && gap >= DUEL_GAP) { units.find((u) => !onSpot(u.post)).post = p; return; }
    }
    const posts = [];
    while (posts.length < units.length) {
      const [best] = farthest(posts);
      if (!best) break;
      posts.push(best);
    }
    const left = [...units];
    for (const u of left) u.post = null;
    while (left.length && posts.length) {
      let bu = 0, bp = 0, bd = Infinity;
      left.forEach((u, i) => posts.forEach((p, j) => { const d = dist(u.x, u.y, p[0], p[1]); if (d < bd) { bd = d; bu = i; bp = j; } }));
      left.splice(bu, 1)[0].post = posts.splice(bp, 1)[0];
    }
    for (const u of left) u.post = [u.x, u.y];
  }

  let areaOwner = null, areaUnits = null, areaKey = '';
  function areaOf(u, x, y, pass = false) {
    if (!u.post || units.length < 2) return true;
    const key = units.map((o) => (o.post ? `${o.post[0]},${o.post[1]}` : '-')).join(';');
    if (key !== areaKey) {
      areaKey = key;
      areaUnits = units.slice();
      areaOwner = new Int16Array(W * H).fill(-1);
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        let best = -1, bg = Infinity, next = Infinity;
        areaUnits.forEach((o, i) => {
          if (!o.post) return;
          const g = bodyGap(tx, ty, o.post[0], o.post[1]);
          if (g < bg) { next = bg; bg = g; best = i; } else if (g < next) next = g;
        });
        if (next - bg >= AREA_EDGE) areaOwner[ty * W + tx] = best;
      }
    }
    if (!inside(x, y)) return false;
    const owner = areaOwner[y * W + x];
    return areaUnits[owner] === u || (pass && owner < 0);
  }

  function pairUp() {
    for (const u of units) if (u.duel && (u.duel.duel !== u || !foes.includes(u.duel))) u.duel = null;
    for (const f of foes) if (f.duel && (f.duel.duel !== f || !units.includes(f.duel))) f.duel = null;
    for (const u of units) {
      if (u.duel) continue;
      const [px, py] = u.post || [u.x, u.y];
      let best = null;
      for (const f of foes) if (duelable(f) && !f.duel && dist(f.fx, f.fy, px, py) <= ORPHAN_R && (!best || dist(f.fx, f.fy, px, py) < dist(best.fx, best.fy, px, py))) best = f;
      if (!best) continue;
      best.duel = u; u.duel = best; best.loneAt = null;
      if (!best.free) { best.path = []; marchIn(best); }
    }
    if (!duels()) return;
    for (const f of foes) {
      if (!duelable(f) || f.duel || f.free || f.enter > 0) continue;
      f.loneAt ??= simT;
      if (simT - f.loneAt < ORPHAN_WAIT) continue;
      foes = foes.filter((o) => o !== f);
      queue.unshift(f.kind);
      look.puff?.(f.fx, f.fy, 'smoke', 2);
      note('flee', f.id);
    }
  }

  function refill() {
    let live = foes.filter(duelable).length;
    for (const u of units) {
      if (live >= fieldGoal()) return;
      if (u.duel || simT < (u.refillAt || 0)) continue;
      if (!queue.length) queue.push(...muster());
      const kind = queue.shift();
      if (spawnFoe(kind, null, u)) live++;
      else { queue.push(kind); u.refillAt = simT + REFILL_RETRY; }
    }
  }

  const isMelee = (u) => ATTACK[u.hero.key] === 'slash';
  const reach = (u) => Math.max(combatStats(u.hero).reach, isMelee(u) ? CONTACT_REACH : 0);

  const bfsPrev = new Int16Array(W * H);
  const bfsQueue = new Int16Array(W * H);
  function bfs(sx, sy, goal, open = passable) {
    bfsPrev.fill(-1);
    const start = sy * W + sx;
    bfsPrev[start] = start;
    bfsQueue[0] = start;
    for (let head = 0, tail = 1; head < tail; head++) {
      const i = bfsQueue[head], x = i % W, y = Math.floor(i / W);
      if (goal(x, y)) {
        const path = [];
        for (let k = i; k !== start; k = bfsPrev[k]) path.push([k % W, Math.floor(k / W)]);
        return path.reverse();
      }
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!inside(nx, ny) || bfsPrev[ny * W + nx] >= 0 || !open(nx, ny)) continue;
        bfsPrev[ny * W + nx] = i;
        bfsQueue[tail++] = ny * W + nx;
      }
    }
    return null;
  }

  const ROUTE_SPAN = 8;
  const FOE_SPAN = 5;
  const FOE_LOOK = 2;
  const ROOM_WAIT = 0.5;
  const MIN_GAP = 0.96;
  const CENTRE_DEV = 0.45;

  const setNext = (e, t) => { if (e.def) e.next = t; else e.step = t; };

  function sightLine(ax, ay, bx, by, open) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) - 1e-9));
    const out = [];
    let cx = Math.round(ax), cy = Math.round(ay);
    for (let i = 1; i <= n; i++) {
      const px = ax + ((bx - ax) * i) / n, py = ay + ((by - ay) * i) / n;
      const tx = Math.round(px), ty = Math.round(py);
      if (tx !== cx || ty !== cy) {
        if (!open(tx, ty)) return null;
        if (tx !== cx && ty !== cy && (!open(tx, cy) || !open(cx, ty))) return null;
      }
      out.push([tx, ty, px, py]);
      cx = tx; cy = ty;
    }
    return out;
  }

  function straighten(ax, ay, tiles, open) {
    const out = [];
    for (let i = 0; i < tiles.length;) {
      let seg = null, j = tiles.length - 1;
      for (; j >= i; j--) if ((seg = sightLine(ax, ay, tiles[j][0], tiles[j][1], open))) break;
      if (!seg) { seg = [[tiles[i][0], tiles[i][1], tiles[i][0], tiles[i][1]]]; j = i; }
      out.push(...seg);
      [ax, ay] = tiles[j];
      i = j + 1;
    }
    for (let i = 1; i + 1 < out.length; i++) {
      const [tx, ty] = out[i];
      const ease = (t, a, b, c) => Math.min(t + CENTRE_DEV, Math.max(t - CENTRE_DEV, (a + 2 * b + c) / 4));
      out[i] = [tx, ty, ease(tx, out[i - 1][2], out[i][2], out[i + 1][2]), ease(ty, out[i - 1][3], out[i][3], out[i + 1][3])];
    }
    return out;
  }

  function route(e, tiles, span = ROUTE_SPAN) {
    const fp = footprint(e);
    const [ax, ay] = nextTile(e) && e.to ? e.to : [e.fx, e.fy];
    e.path = straighten(ax, ay, tiles.slice(0, span), (x, y) => fits(x, y, fp, e));
  }

  function crowding(e, x, y) {
    if (footprint(e) !== FOOT_1) return false;
    const gap = MIN_GAP * MIN_GAP;
    const near = (o) => {
      if (o === e || o.free || footprint(o) !== FOOT_1) return false;
      const d = (o.fx - x) * (o.fx - x) + (o.fy - y) * (o.fy - y);
      return d < gap && d < (o.fx - e.fx) * (o.fx - e.fx) + (o.fy - e.fy) * (o.fy - e.fy);
    };
    return units.some(near) || foes.some(near);
  }

  function claimStep(e, dt) {
    const fp = footprint(e);
    const [nx, ny, px, py] = e.path[0];
    const own = nx === e.x && ny === e.y;
    if (!own && !fits(nx, ny, fp, e)) {
      e.path = [];
      if (!e.def) { e.stall = 0; e.think = 0.1 + rand() * 0.3; }
      return false;
    }
    if (!own && !e.force && !fp.every(([dx, dy]) => roomy(nx + dx, ny + dy, e))) {
      e.stall = (e.stall || 0) + dt;
      if (e.def) {
        e.stall -= dt;
        if ((e.room = (e.room || 0) + dt) >= ROOM_WAIT) { e.room = 0; e.path = []; e.force = true; }
        return false;
      }
      if (e.stall < STALL) return false;
      e.stall = 0;
      if (!e.pushed) { e.pushed = true; e.path = []; e.think = 0; return false; }
      e.pushed = false;
    }
    e.side = !!e.force;
    e.force = false;
    e.stall = 0;
    e.path.shift();
    setNext(e, [nx, ny]);
    e.to = [px, py];
    hold(e, nx, ny);
    return true;
  }

  function walk(e, reach, dt) {
    const sx = e.fx, sy = e.fy;
    for (let guard = 0; reach > 1e-6 && guard < 6; guard++) {
      if (!nextTile(e)) {
        if (e.path.length) { if (!claimStep(e, dt)) break; }
        else if (e.fx !== e.x || e.fy !== e.y) { setNext(e, [e.x, e.y]); e.to = [e.x, e.y]; }
        else break;
      }
      const [nx, ny] = nextTile(e), [tx, ty] = e.to;
      const dx = tx - e.fx, dy = ty - e.fy, d = Math.sqrt(dx * dx + dy * dy);
      const home = nx === e.x && ny === e.y;
      const k = d > reach ? reach / d : 1;
      const mx = e.fx + dx * k, my = e.fy + dy * k;
      if (crowding(e, mx, my)) {
        e.jam = (e.jam || 0) + dt;
        if (e.jam >= STALL) { e.jam = 0; e.path = []; setNext(e, [e.x, e.y]); e.to = [e.x, e.y]; }
        break;
      }
      e.jam = 0;
      if (d > 0) pose.aim?.(e, dx, dy, home || e.side || d <= 0.02);
      e.fx = mx; e.fy = my;
      if (k < 1) break;
      reach -= d;
      e.x = nx; e.y = ny;
      setNext(e, null);
    }
    if (e.fx !== sx || e.fy !== sy) pose.aim?.(e, e.fx - sx, e.fy - sy, true);
    if (!nextTile(e) && (e.fx !== e.x || e.fy !== e.y)) { setNext(e, [e.x, e.y]); e.to = [e.x, e.y]; }
  }

  function foeTrail(f, from, field) {
    const fp = footprint(f);
    const out = [[from[0], from[1]]];
    let [x, y] = from;
    while (out.length < FOE_SPAN) {
      let bx = -1, by = -1, best = field[y * W + x];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if ((nx === f.x && ny === f.y) || !inside(nx, ny) || !fits(nx, ny, fp, f)) continue;
        const v = field[ny * W + nx];
        if (v >= 0 && (best < 0 || v < best)) { best = v; bx = nx; by = ny; }
      }
      if (bx < 0) break;
      out.push([bx, by]);
      x = bx; y = by;
    }
    return out;
  }

  const unready = (f) => f.landing > 0 || f.enter > 0 || f.veil
    || (f.march && (f.duel ? dist(f.fx, f.fy, f.march.to[0], f.march.to[1]) > DUEL_MEET : dist(f.fx, f.fy, CX, CY) > MARCH_R));
  const duels = () => !dragon && !raid.active();
  const duelable = (f) => !!f.hunt && !f.summoned && !f.def.dragon && !f.def.raid;
  const foeHeroes = (f) => (duels() && duelable(f) ? (f.duel ? [f.duel] : []) : units);
  const duelTarget = (u) => (u.duel && !unready(u.duel) ? { foe: u.duel, d: reachDist(u.fx, u.fy, u.duel) } : null);
  const fieldOf = (f) => (duels() && f.duel?.duelFlow) || (f.sector != null ? sectorFlow[f.sector] : flow);

  function nearestFoe(x, y) {
    let best = null;
    let bd = Infinity;
    for (const f of foes) {
      if (unready(f)) continue;
      const d = reachDist(x, y, f);
      if (d < bd) { bd = d; best = f; }
    }
    return best ? { foe: best, d: bd } : null;
  }

  function radius(f) { return f.def.dragon ? 1.4 : f.def.radius || 0; }

  function duelThink(u, ux, uy, r, melee, slotOf, open, clear) {
    const f = u.duel;
    const [px, py] = u.post || [ux, uy];
    const mine = (x, y) => open(x, y) && areaOf(u, x, y);
    const way = (x, y) => open(x, y) && areaOf(u, x, y, true);
    const coming = !f || unready(f) || (units.length > 1 && !!f.free);
    if (!coming) f.readyAt ??= simT;
    const patient = f && f.readyAt != null && simT - f.readyAt < DUEL_CHASE;
    const stray = units.length > 1 && patient && !areaOf(u, ux, uy) && !areaOf(u, f.x, f.y);
    if (coming || stray || (patient && reachDist(px, py, f) > DUEL_MEET + r)) {
      commit(u, null);
      u.goal = null;
      u.chase = null;
      u.think = 0.2;
      const near = dist(ux, uy, px, py) <= (f && !unready(f) ? 1 : 2) && areaOf(u, ux, uy);
      if ((ux === px && uy === py) || (near && (units.length < 2 || !open(px, py)))) { u.path = []; return; }
      if (u.homing && u.path.length) return;
      const p = bfs(ux, uy, (x, y) => x === px && y === py, way) || bfs(ux, uy, (x, y) => x === px && y === py, open)
        || bfs(ux, uy, (x, y) => dist(x, y, px, py) <= 1.5, open);
      u.path = [];
      if (p && p.length) { route(u, p); u.homing = true; }
      return;
    }
    u.homing = false;
    const here = reachDist(ux, uy, f) <= r && (!melee || slotOf(ux, uy, f));
    if (here && (areaOf(u, ux, uy) || !bfs(ux, uy, (x, y) => areaOf(u, x, y) && reachDist(x, y, f) <= r && (!melee || slotOf(x, y, f)), way))) {
      u.goal = [ux, uy]; commit(u, melee ? f : null); u.path = []; u.think = 0.1;
      return;
    }
    if (patient && !u.step && (f.next || f.path.length) && reachDist(ux, uy, f) <= DUEL_MEET) { u.path = []; u.goal = null; u.think = 0.1; return; }
    if (u.path.length > 1 && u.goal && u.chase === f && slotOf(u.goal[0], u.goal[1], f)) { u.think = 0.2; return; }
    const p = bfs(ux, uy, (x, y) => mine(x, y) && slotOf(x, y, f) && roomy(x, y, u), (x, y) => clear(x, y) && way(x, y))
      || bfs(ux, uy, (x, y) => mine(x, y) && slotOf(x, y, f), way) || bfs(ux, uy, (x, y) => mine(x, y) && reachDist(x, y, f) <= r, way)
      || bfs(ux, uy, (x, y) => mine(x, y) && reachDist(x, y, f) <= r && (!melee || slotOf(x, y, f)), open)
      || bfs(ux, uy, (x, y) => slotOf(x, y, f) && roomy(x, y, u), clear) || bfs(ux, uy, (x, y) => slotOf(x, y, f), open)
      || bfs(ux, uy, (x, y) => reachDist(x, y, f) <= r, open);
    if (p) {
      route(u, p);
      u.goal = p.length ? p[p.length - 1] : [ux, uy];
      commit(u, melee ? f : null);
      u.chase = f;
      u.think = 0.2;
      return;
    }
    u.path = [];
    u.goal = null;
    u.think = 0.25 + rand() * 0.25;
  }

  function heroThink(u) {
    if (broken(u.hero)) {
      hooks.onBroken?.(u.hero);
      look.broken?.(u);
      note('leave', u.hero.id, 'broken');
      return 'gone';
    }
    if (u.hero.energy <= 0) {
      u.hero.status = 'rest';
      hooks.onRest?.(u.hero);
      look.rest?.(u);
      note('leave', u.hero.id, 'rest');
      return 'gone';
    }
    const [ux, uy] = u.step || [u.x, u.y];
    const open = (x, y) => fits(x, y, FOOT_1, u);
    const clear = (x, y) => open(x, y) && roomy(x, y, u);
    const n = nearestFoe(u.fx, u.fy);
    const r = reach(u);
    const melee = isMelee(u);
    const room = (f) => !melee || f === u.foe || (f.melee || 0) < meleeCap(f);
    const slotOf = (x, y, f) => {
      const d = reachDist(x, y, f);
      if (d > r) return false;
      if (!melee) return duels() || d >= Math.min(STANDOFF, r - 0.3);
      if (wideBody(f)) return true;
      const [fx, fy] = f.next || [f.x, f.y];
      return Math.abs(x - fx) === 1 && Math.abs(y - fy) === 1;
    };
    const taken = (x, y) => units.some((o) => o !== u && o.goal && o.goal[0] === x && o.goal[1] === y);
    if (duels()) { duelThink(u, ux, uy, r, melee, slotOf, open, clear); return; }
    if (n && n.d <= r && room(n.foe) && (!melee || slotOf(ux, uy, n.foe))) {
      u.goal = [ux, uy]; commit(u, melee ? n.foe : null); u.think = 0.1;
      u.path = [];
      if (!roomy(ux, uy, u)) {
        const p = bfs(ux, uy, (x, y) => (x !== ux || y !== uy) && slotOf(x, y, n.foe) && !taken(x, y) && roomy(x, y, u), clear);
        if (p && p.length <= 3) { route(u, p); u.goal = p[p.length - 1]; u.think = 0.25; } else u.think = 0.5;
      }
      return;
    }
    const covered = new Set(units.filter((o) => o !== u).map((o) => o.sector));
    const mine = (f) => reachDist(u.fx, u.fy, f) <= r + NEAR
      || (dist(f.fx, f.fy, CX, CY) <= HOLD_R && (f.sector == null || f.sector === u.sector || !covered.has(f.sector)));
    const ready = foes.filter((f) => !unready(f) && room(f));
    const own = ready.filter(mine);
    if (own.length) u.ownT = simT;
    const patient = !own.length && simT - (u.ownT ?? -CROSS_WAIT) < CROSS_WAIT;
    const targets = (own.length ? own : patient ? [] : ready)
      .map((f) => [f, reachDist(u.fx, u.fy, f)]).sort((a, b) => a[1] - b[1]).slice(0, 4);
    if (!targets.length) {
      const near = foes.filter((f) => !unready(f)).sort((a, b) => reachDist(u.fx, u.fy, a) - reachDist(u.fx, u.fy, b))[0];
      if (near && !patient) {
        const p = bfs(ux, uy, (x, y) => reachDist(x, y, near) <= r + NEAR, open);
        u.goal = null; u.foe = null; u.think = 0.3;
        if (p) route(u, p);
        return;
      }
      u.goal = null;
      u.foe = null;
      if (!u.path.length) {
        const [rx, ry] = RALLY[u.sector];
        const p = bfs(ux, uy, (x, y) => dist(x, y, rx, ry) < RALLY_R && roomy(x, y, u), open);
        if (p && p.length) route(u, p);
      }
      u.think = patient ? 0.3 : 0.6;
      return;
    }
    if (u.path.length > 1 && u.goal && targets.some(([f]) => f === u.chase) && slotOf(u.goal[0], u.goal[1], u.chase)) { u.think = 0.3; return; }
    for (const [f] of targets) {
      const p = bfs(ux, uy, (x, y) => slotOf(x, y, f) && !taken(x, y) && roomy(x, y, u), clear)
        || bfs(ux, uy, (x, y) => slotOf(x, y, f) && !taken(x, y), open);
      if (!p) continue;
      route(u, p);
      u.goal = p.length ? p[p.length - 1] : [ux, uy];
      commit(u, melee ? f : null);
      u.chase = f;
      u.think = 0.3;
      return;
    }
    let found = null;
    const any = bfs(ux, uy, (x, y) => (x !== ux || y !== uy) && (found = ready.find((f) => (melee ? slotOf(x, y, f) : reachDist(x, y, f) <= r))), open);
    if (any) { route(u, any); u.goal = any[any.length - 1]; commit(u, melee ? found : null); u.chase = found; u.think = 0.3; return; }
    const [f] = targets[0];
    const close = bfs(ux, uy, (x, y) => reachDist(x, y, f) <= r + NEAR, open);
    if (close && close.length) { route(u, close); u.goal = null; u.foe = null; u.think = 0.3; return; }
    u.path = [];
    u.goal = null;
    u.foe = null;
    u.think = 0.25 + rand() * 0.25;
  }

  function startAttack(u, foe) {
    const cs = combatStats(u.hero);
    u.cd = Math.max(u.cd, -cs.cd / 4) + cs.cd * (0.94 + rand() * 0.12);
    if (duels()) u.fightT = (u.fightT || 0) + cs.cd;
    const win =Math.min((HERO_ATTACK_MS[u.hero.key] || 0) / 1000 || ATTACK_TIME, cs.cd);
    u.atk = { t: 0, win, hit: win * CONTACT, foe, dir: screenDir(u.fx, u.fy, foe.fx, foe.fy), amp: isMelee(u) ? LUNGE : -RECOIL };
    pose.faceAt?.(u, foe);
  }

  function strike(u) {
    const cs = combatStats(u.hero);
    const kind = cs.kind;
    const stale = !foes.includes(u.atk.foe) || reachDist(u.fx, u.fy, u.atk.foe) > reach(u);
    const foe = stale ? (duels() ? duelTarget(u) : nearestFoe(u.fx, u.fy)) : { foe: u.atk.foe, d: 0 };
    if (!foe || foe.d > reach(u)) return;
    const target = foe.foe;
    pose.faceAt?.(u, target);
    u.atk.dir = screenDir(u.fx, u.fy, target.fx, target.fy);
    hooks.onStrike?.(u, target);
    const crit = rand() < cs.crit;
    const dmg = cs.atk * (0.85 + rand() * 0.3) * (crit ? cs.critMult : 1);
    look.strike?.(u, target, kind, crit);
    if (kind === 'slash') {
      shove(target, u.fx, u.fy);
      hitFoe(target, dmg, crit, u.hero, [u.fx, u.fy]);
      if (cs.aoe) for (const f of [...foes]) if (f !== target && dist(f.fx, f.fy, target.fx, target.fy) <= cs.aoe) hitFoe(f, dmg * cs.aoePct, false, u.hero);
      return;
    }
    const lead = Math.min(0.35, dist(u.fx, u.fy, target.fx, target.fy));
    const [lx, ly] = [target.fx - u.fx, target.fy - u.fy].map((v) => (v / (dist(u.fx, u.fy, target.fx, target.fy) || 1)) * lead);
    shots.push({ kind, x: u.fx + lx, y: u.fy + ly, z: 14 * PX, target, dmg, crit, hero: u.hero, f: 0, arc: kind === 'bomb' || kind === 'axe', aoe: cs.aoe, aoePct: cs.aoePct });
  }

  function screenDir(ax, ay, bx, by) {
    const x = (bx - ax - (by - ay)) * 16, y = (bx - ax + (by - ay)) * 8;
    const d = Math.sqrt(x * x + y * y) || 1;
    return [x / d, y / d];
  }

  function shove(e, ax, ay) {
    if (e.def?.dragon || e.def?.raid) return;
    e.kick = KICK_TIME;
    e.kickDir = screenDir(ax, ay, e.fx, e.fy);
    e.hurt = Math.max(e.hurt || 0, e.def ? FOE_HURT : HERO_HURT);
  }

  const huntHit = (foe, hero) => (hero && foe.hunt ? FARM.huntHit[HEROES[hero.key].rarity] : 1);

  function waitWork(u, dt) {
    let rate = u.fightT >= FIGHT_MIN ? u.fightW / u.fightT : 0;
    if (!rate) {
      const cs = combatStats(u.hero);
      rate = (1e6 * FARM.huntHit[HEROES[u.hero.key].rarity] * (1 + cs.crit * (cs.critMult - 1))) / cs.cd;
    }
    const short = rate * u.duelT - (u.fightW || 0) - (u.waitW || 0);
    const work = Math.floor(Math.max(0, Math.min(short, rate * dt)));
    u.waitW = (u.waitW || 0) + work;
    return work;
  }

  function workOn(foe, hero, loss) {
    if (!hero || foe.summoned || foe.def.dragon || !(loss > 0) || !(foe.hp > 0)) return;
    foe.work ??= new Map();
    const over = Math.max(0, loss - foe.hp) * (1 - HUNT_FOE_HP);
    const work = Math.floor(((Math.min(loss, foe.hp) + over) * 1e6) / combatStats(hero).atk);
    foe.work.set(hero, (foe.work.get(hero) || 0) + work);
    const u = units.find((o) => o.hero === hero);
    if (u) u.fightW = (u.fightW || 0) + work;
  }

  function hitFoe(foe, dmg, crit, hero, from) {
    if (!foes.includes(foe) || foe.landing > 0 || foe.veil) return;
    if (foe.def.wall) { raid.hitWall(foe, dmg); return; }
    if (hero) dmg = skillHit(foe, dmg, hero);
    if (foe.def.raid) { raid.hit(foe, dmg, crit, hero); return; }
    workOn(foe, hero, dmg * huntHit(foe, hero));
    foe.hp -= dmg * huntHit(foe, hero);
    foe.hurt = FOE_HURT;
    foe.flash = FLASH_TIME;
    look.hit?.(foe, dmg, crit, from);
    if (foe.def.dragon) {
      if ((foe.flinch ?? -9) < -1) foe.flinch = DRAGON_FLINCH;
      dragon.you += dmg;
      if (foe.hp <= 0) { dragon.last = 'You'; look.lastBlow?.(); dragonEnd(true); }
      return;
    }
    if (foe.hp <= 0) kill(foe, hero);
  }

  function skillHit(foe, dmg, hero) {
    const m = skillMods(hero.key);
    const def = foe.def;
    let bonus = 0;
    if (def.boss) bonus += m.slayer;
    if (def.dragon || foe.kind === 'wyrm') bonus += m.dragonbane;
    if (UNDEAD.has(foe.kind)) bonus += m.undeadbane;
    if (foe.hp >= foe.max) bonus += m.first;
    let rally = 0;
    for (const u of units) rally = Math.max(rally, skillMods(u.hero.key).rally);
    dmg *= (1 + bonus / 100) * (1 + rally / 100);
    if (!def.dragon) {
      if (m.frost) { foe.slowPct = Math.max(foe.slow > 0 ? foe.slowPct : 0, m.frost / 100); foe.slow = 2; }
      if (m.burn) (foe.burns ??= []).push({ t: BURN_TIME, dps: (dmg * m.burn) / 100 / BURN_TIME, hero });
    }
    return dmg;
  }

  function burnTick(f, dt) {
    const out = f.burns.map((b) => [b.hero, b.dps * Math.min(dt, b.t)]);
    for (const b of f.burns) b.t -= dt;
    f.burns = f.burns.filter((b) => b.t > 0);
    if (!f.burns.length) f.burns = null;
    return out;
  }

  function raidBurn(f, dt) {
    f.burnDue ??= new Map();
    for (const [hero, d] of burnTick(f, dt)) f.burnDue.set(hero, (f.burnDue.get(hero) || 0) + d);
    f.burnBook = (f.burnBook || 0) + dt;
    if (f.burns && f.burnBook < BURN_BOOK) return;
    f.burnBook = 0;
    const due = [...f.burnDue];
    f.burnDue.clear();
    for (const [hero, d] of due) raid.hit(f, d, false, hero);
  }


  function freeMove(f, dt) {
    f.age += dt;
    if (f.free === 'climb') { climbStep(f, dt); return; }
    const dig = f.free === 'dig';
    const mine = foeHeroes(f);
    const looks = mine.length > 0 && (!dig || (f.age < DIG_CHASE && mine.some((u) => (u.melee || 0) < MELEE_MAX)));
    if ((f.look -= dt) <= 0) {
      f.look = FREE_LOOK;
      if (looks && !mine.some((u) => (u.melee || 0) < MELEE_MAX && Math.max(Math.abs(u.fx - f.x), Math.abs(u.fy - f.y)) <= 3)) {
        const t = landing(f.fx, f.fy, f, mine);
        if (t) { [f.x, f.y] = t; hold(f, f.x, f.y); f.sector = sectorAt(f.x, f.y); }
      }
    }
    const dx = f.x - f.fx, dy = f.y - f.fy, d = Math.sqrt(dx * dx + dy * dy);
    const step = f.def.spd * (dig ? DIG_SPEED : 1) * (f.slow > 0 ? 1 - f.slowPct : 1) * dt;
    if (d > step) {
      f.fx += (dx / d) * step; f.fy += (dy / d) * step;
      pose.aim?.(f, dx, dy);
      f.veil = dig || !inside(Math.round(f.fx), Math.round(f.fy));
      return;
    }
    f.fx = f.x; f.fy = f.y;
    if (tooClose(f.x, f.y, f)) return;
    f.free = null;
    if (!dig) { f.veil = false; hooks.onFoeAct?.('fly'); return; }
    f.emerge = f.emergeFor = (FOE_EMERGE_MS[f.kind] || 0) / 1000 || EMERGE_TIME;
    look.emerge?.(f);
    hooks.onFoeAct?.('emerge');
  }

  function climbStep(f, dt) {
    const c = f.climb;
    c.t += dt;
    while (c.i < c.keys.length && c.t >= c.keys[c.i].t) { c.t -= c.keys[c.i].t; c.i++; }
    if (c.i >= c.keys.length) {
      Object.assign(f, { fx: f.x, fy: f.y, z: 0, front: false });
      if (tooClose(f.x, f.y, f)) return;
      Object.assign(f, { free: null, veil: false, climb: null });
      look.puff?.(f.fx, f.fy, 'smoke', 2);
      hooks.onFoeAct?.('climb');
      return;
    }
    const a = c.keys[c.i - 1], b = c.keys[c.i], k = c.t / b.t;
    const bx = b.x ?? f.x, by = b.y ?? f.y;
    f.fx = a.x + (bx - a.x) * k; f.fy = a.y + (by - a.y) * k;
    f.z = a.z + (b.z - a.z) * k + (b.x == null ? 4 * k * (1 - k) * 10 * PX : 0);
    f.front = !!b.front;
    if (bx !== a.x || by !== a.y) pose.aim?.(f, bx - a.x, by - a.y);
  }

  function takeOff(f) {
    const mine = foeHeroes(f);
    if (!mine.length) return;
    const t = landing(f.fx, f.fy, f, mine);
    if (!t) return;
    [f.x, f.y] = t;
    hold(f, f.x, f.y);
    Object.assign(f, { free: 'fly', look: FREE_LOOK, age: 1, sector: sectorAt(f.x, f.y) });
  }

  function heroInRange(x, y, range, heroes = units) {
    let best = null, bd = range;
    for (const u of heroes) { const d = dist(x, y, u.fx, u.fy); if (d <= bd) { bd = d; best = u; } }
    return best;
  }

  function flinch(u, volume = 0.2) {
    u.hurt = HERO_HURT;
    look.flinch?.(u, volume);
  }

  function wearShield(u, units) {
    const h = u.hero;
    if (!(h.shield > 0) || h.trial) return;
    h.shield = Math.max(0, h.shield - shieldWear(h, units));
    if (h.shield > 0) return;
    h.status = 'idle';
    h.hold = false;
    h.castle = false;
  }

  function foeShoot(f, u) {
    if (f.def.role === 'caster' && (f.casts = (f.casts || 0) + 1) % RUNE_EVERY === 0) {
      const x = Math.round(u.fx), y = Math.round(u.fy);
      runes.push({ x, y, t: RUNE_TIME });
      look.rune?.(x, y);
      hooks.onFoeAct?.('rune');
      return;
    }
    if (foeShots.length >= SHOTS_MAX) return;
    const d = dist(f.fx, f.fy, u.fx, u.fy) || 1;
    foeShots.push({ kind: f.def.bolt, x: f.fx + ((u.fx - f.fx) / d) * 0.35, y: f.fy + ((u.fy - f.fy) / d) * 0.35, f: 0, target: u, vx: u.fx - f.fx, vy: u.fy - f.fy });
    look.foeShot?.(f);
    hooks.onFoeAct?.(f.def.role === 'caster' ? 'bolt' : 'arrow');
  }

  function updateFoeShots(dt) {
    foeShots = foeShots.filter((s) => {
      s.f += dt * 14;
      const t = s.target, alive = units.includes(t);
      const tx = alive ? t.fx : s.lx ?? s.x, ty = alive ? t.fy : s.ly ?? s.y;
      s.lx = tx; s.ly = ty;
      const dx = tx - s.x, dy = ty - s.y, d = Math.sqrt(dx * dx + dy * dy), step = SHOT_SPEED * dt;
      s.vx = dx; s.vy = dy;
      if (d <= step + (alive ? 0.4 : 0)) {
        if (alive) {
          flinch(t, 0.12);
          shove(t, s.x, s.y);
          look.boltHit?.(t, s);
        }
        return false;
      }
      s.x += (dx / d) * step; s.y += (dy / d) * step;
      return true;
    });
    runes = runes.filter((r) => {
      if ((r.t -= dt) > 0) return true;
      for (const u of units) if (dist(u.fx, u.fy, r.x, r.y) <= RUNE_R) flinch(u, 0.12);
      return false;
    });
  }

  function startCharge(f) {
    const open = (x, y) => fits(x, y, FOOT_1, f);
    const prey = foeHeroes(f).filter((u) => { const d = dist(f.fx, f.fy, u.fx, u.fy); return d >= CHARGE_MIN && d <= CHARGE_MAX; })
      .sort((a, b) => dist(f.fx, f.fy, a.fx, a.fy) - dist(f.fx, f.fy, b.fx, b.fy)).slice(0, 4);
    for (const u of prey) for (const [dx, dy] of DIAGONALS) {
      const x = u.x + dx, y = u.y + dy;
      if (!inside(x, y) || !open(x, y)) continue;
      const line = sightLine(f.fx, f.fy, x, y, open);
      if (!line) continue;
      Object.assign(f, { path: line, rush: true });
      f.atk = { t: 0, win: CHARGE_WIND, hit: CHARGE_WIND, dir: screenDir(f.fx, f.fy, u.fx, u.fy), amp: -WINDUP_BACK };
      pose.faceAt?.(f, u);
      look.chargeStart?.(f);
      return true;
    }
    return false;
  }

  function endCharge(f) {
    f.rush = false;
    look.charge?.(f);
    for (const u of units) if (dist(u.fx, u.fy, f.fx, f.fy) <= 1.6) { flinch(u, 0.2); shove(u, f.fx, f.fy); }
    hooks.onFoeAct?.('charge');
  }

  function slam(f, target) {
    look.slam?.(f);
    for (const u of units) if (u !== target && reachDist(u.fx, u.fy, f) <= SLAM_R) flinch(u, 0.1);
    hooks.onFoeAct?.('slam');
  }

  function rotBurst(f) {
    look.rot?.(f);
    for (const u of units) if (dist(u.fx, u.fy, f.fx, f.fy) <= ROT_R) u.rot = ROT_TIME;
    hooks.onFoeAct?.('rot');
  }

  function seekRoom(f, fp, opts2) {
    const room = foeHeroes(f).filter((u) => (u.melee || 0) < MELEE_MAX);
    const wide = fp !== FOOT_1;
    let hero = null;
    const touches = (x, y) => (hero = room.find((u) => (wide
      ? Math.max(Math.abs(u.x - x), Math.abs(u.y - y)) <= 2
      : Math.abs(u.x - x) === 1 && Math.abs(u.y - y) === 1)));
    const goal = (x, y) => (x !== f.x || y !== f.y) && touches(x, y);
    const walkable = (x, y) => fits(x, y, fp, f);
    const p = room.length && ((f.duel && duels() && bfs(f.x, f.y, (x, y) => goal(x, y) && areaOf(hero, x, y), (x, y) => walkable(x, y) && areaOf(f.duel, x, y, true)))
      || bfs(f.x, f.y, goal, walkable));
    f.stall = 0;
    f.force = true;
    if (p && p.length) { route(f, p, FOE_SPAN); f.sector = hero.sector; return; }
    if (!opts2.length) return;
    const [x, y] = opts2[Math.floor(rand() * opts2.length)];
    f.path = [[x, y, x, y]];
  }

  function spawnDragon(kind) {
    const keys = Object.keys(DRAGONS);
    kind = kind || keys[Math.floor(rand() * keys.length)];
    const def = DRAGONS[kind];
    const hp = def.hp * (1 + (realmN - 1) * 0.3);
    const names = RIVALS.slice();
    for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    const rivals = names.slice(0, SERVER_MODE ? 0 : 6).map((name) => ({ name, dmg: 0, dps: 25 + rand() * 70 }));
    const foe = { id: ++nextId, kind, def: { name: def.name, boss: true, big: true, dragon: true, spd: 0 }, x: CX, y: CY, fx: CX, fy: CY, hp, max: hp, dir: 'down', frame: 0, ft: 0, hurt: 0, bite: 1, landing: 2.6, breath: 4, think: 0 };
    dragon = { foe, kind, name: def.name, you: 0, rivals, last: null, time: DRAGON_TIME, tick: 0 };
    foes.push(foe);
    reseat();
    note('dragon', foe.id, kind, Math.round(hp * 1000));
    look.dragonSpawn?.(kind);
    hooks.onDragonWarn?.(def.name, kind);
  }

  function dragonUpdate(f, dt) {
    f.ft += dt;
    if (f.ft > 0.22) { f.ft = 0; f.frame = (f.frame + 1) % 4; }
    f.hurt = Math.max(0, f.hurt - dt);
    f.roar = Math.max(0, (f.roar || 0) - dt);
    f.flinch = (f.flinch ?? -9) - dt;
    if (f.landing > 0) {
      f.landing -= dt;
      if (f.landing <= 0) {
        f.roar = DRAGON_ROAR;
        look.dragonLand?.(dragon);
        hooks.onDragonLand?.(dragon.name);
      }
      return;
    }
    dragon.time -= dt;
    if (dragon.time <= 0) { dragonEnd(false); return; }
    if ((dragon.tick -= dt) <= 0) {
      dragon.tick = 0.5;
      for (const r of dragon.rivals) {
        const dmg = r.dps * 0.5 * (0.6 + rand() * 0.8);
        r.dmg += dmg;
        f.hp -= dmg;
        look.rivalHit?.(f, dmg);
        if (f.hp <= 0) { dragon.last = r.name; dragonEnd(true); return; }
      }
    }
    if ((f.breath -= dt) <= 0) {
      f.breath = 3.5 + rand() * 2;
      f.breath0 = f.breath;
      const [dx, dy] = DIRS[Math.floor(rand() * 4)];
      look.breath?.(f, dx, dy);
      for (let i = 1; i <= 4; i++) {
        const bx = CX + dx * i;
        const by = CY + dy * i;
        for (const u of units) {
          if (Math.round(u.fx) === bx && Math.round(u.fy) === by) {
            tire(u, 3);
            u.hurt = HERO_HURT;
            look.burnt?.(u, 3);
          }
        }
      }
    }
  }

  function dragonEnd(killed) {
    const d = dragon;
    if (!d) return;
    dragon = null;
    dragonT = DRAGON_EVERY;
    foes = foes.filter((f) => f !== d.foe);
    const ranking = [{ name: 'You', dmg: d.you }, ...d.rivals.map((r) => ({ name: r.name, dmg: r.dmg }))]
      .filter((r) => r.dmg > 0).sort((a, b) => b.dmg - a.dmg);
    for (const [i, r] of ranking.entries()) {
      r.boxes = [];
      if (!killed) { r.boxes.push('ember'); continue; }
      if (r.name === d.last) r.boxes.push('lastblow');
      if (i === 0) r.boxes.push('top');
      else if (i < 3) r.boxes.push('champion');
      if (!r.boxes.length) r.boxes.push('ember');
    }
    const me = ranking.find((r) => r.name === 'You');
    const mine = me ? me.boxes : [];
    note('dragonEnd', d.foe.id, killed ? 1 : 0, d.last, ...mine);
    if (record) ledger.push([tickN, 'boxes', d.foe.id, ...mine]);
    look.dragonEnd?.(d, killed, mine);
    hooks.onDragonEnd?.({ name: d.name, kind: d.kind, killed, last: d.last, ranking, mine });
  }

  function tire(u, amount) {
    const spent = Math.min(u.hero.energy, amount);
    if (spent > 0) u.hero.energy -= spent;
  }

  function killCredit(u, work) {
    const gold = Math.round(1000 + skillMods(u.hero.key).gold * 10);
    const oil = clock() < oilUntil ? OIL_PAY : 1000;
    return Number((BigInt(u.pay) * BigInt(work) * BigInt(fightPm) * BigInt(oil) * BigInt(gold)) / PAY_DIV);
  }

  function payPot(u) {
    if (!u || !(u.pot >= MICRO_PER_CENT)) return 0;
    const cents = Math.floor(u.pot / MICRO_PER_CENT);
    u.pot -= cents * MICRO_PER_CENT;
    return cents;
  }

  function bank(cents, trial = false) {
    if (!(cents > 0)) return;
    look.pay?.(cents, trial);
  }

  function takeWavePot(kind) {
    const cents = Math.floor(wavePot / MICRO_PER_CENT);
    wavePot -= cents * MICRO_PER_CENT;
    if (record) ledger.push([tickN, 'bonus', kind, realmN, wave, cents]);
    bank(cents);
    return cents;
  }

  function kill(foe, hero) {
    foes = foes.filter((f) => f !== foe);
    if (foe.duel) { foe.duel.refillAt = simT + REFILL_GAP; foe.duel.duel = null; foe.duel = null; }
    const def = foe.def;
    if (foe.summoned) {
      look.summonDown?.(foe);
      raid.summonDown(foe);
      return;
    }
    if (hero) hero.energy = Math.min(maxEnergyOf(hero), hero.energy + skillMods(hero.key).secondwind);
    if (foe.work) for (const [h, w] of foe.work) { const u = units.find((x) => x.hero === h); if (u) u.work = (u.work || 0) + w; }
    const killer = units.find((u) => u.hero === hero);
    const work = killer ? killer.work || 0 : 0;
    const trial = !!hero?.trial;
    if (killer) {
      killer.work = 0;
      const credit = killCredit(killer, work);
      const toWave = trial ? 0 : Math.floor((credit * WAVE_PM) / 1000);
      killer.pot = (killer.pot || 0) + credit - toWave;
      wavePot += toWave;
    }
    const cents = payPot(killer);
    note('kill', foe.id, foe.kind, hero ? hero.id : null, work, cents);
    if (record && cents > 0) ledger.push([tickN, 'pay', hero.id, foe.id, cents]);
    bank(cents, trial);
    const amount = cents / 100;
    const rich = def.elite || def.boss;
    look.kill?.(foe, amount, rich);
    if (def.role === 'infect') rotBurst(foe);
    hooks.onKill?.({ kind: foe.kind, name: def.name, amount, hits: work / 1e6, hero, boss: !!def.boss, elite: !!def.elite });
    look.purse?.();
  }

  function waveDone() {
    if (wave >= WAVES) {
      const bonus = takeWavePot('realm') / 100;
      realmN++;
      note('realm', realmN);
      look.realm?.(realmN);
      hooks.onRealmClear?.(realm().name, bonus);
      changeMap(seedFor(realmN, 1));
      look.purse?.();
      waveBreak = WAVE_BREAK;
      wave = 0;
      return;
    }
    const bonus = takeWavePot('wave') / 100;
    hooks.onWaveClear?.(wave, bonus);
    look.purse?.();
    waveBreak = WAVE_BREAK;
    changeMap(seedFor(realmN, wave + 1));
  }

  function step(dt) {
    simT += dt;
    raid.update(dt);
    placePosts();
    pairUp();
    if (raid.active()) {
    } else if (waveBreak > 0) {
      if ((waveBreak -= dt) <= 0) startWave(wave + 1);
    } else if (wave > 0 && (waveT -= dt) <= 0) {
      foes = foes.filter((f) => f.def.dragon || f.def.raid || !f.def.boss);
      queue = [];
      waveDone();
    } else if ((spawnT -= dt) <= 0) {
      spawnT = 0;
      refill();
    }
    if (DRAGON_AUTO && !dragon && !raid.active() && (dragonT -= dt) <= 0) spawnDragon();
    look.afterSpawns?.();

    tallyMelee();
    if ((flowT -= dt) <= 0) { flowT = 0.2; buildFlow(); }
    rebuildOcc();
    for (const f of [...foes]) {
      if (f.def.dragon) { dragonUpdate(f, dt); continue; }
      if (f.def.raid && f.burns) raidBurn(f, dt);
      if (f.def.raid || f.def.wall) continue;
      const def = f.def;
      pose.steer?.(f, dt);
      f.hurt = Math.max(0, f.hurt - dt);
      f.flash = Math.max(0, (f.flash || 0) - dt);
      if (f.kick > 0) f.kick -= dt;
      if (f.atk && (f.atk.t += dt) >= f.atk.win) f.atk = null;
      if (f.enter > 0) { f.enter = Math.max(0, f.enter - (dt * ENTER_FROM) / (ENTER_TIME * f.from)); continue; }
      if (f.emerge > 0) { if ((f.emerge -= dt) <= 0) f.veil = false; continue; }
      if (f.slow > 0) f.slow -= dt;
      if (f.burns) {
        let dead = false;
        for (const [hero, d] of burnTick(f, dt)) {
          workOn(f, hero, d * huntHit(f, hero));
          f.hp -= d * huntHit(f, hero);
          if (f.hp <= 0) { kill(f, hero); dead = true; break; }
        }
        if (dead) continue;
      }
      f.ft += dt;
      if (f.ft > 0.18) { f.ft = 0; f.frame = (f.frame + 1) % 4; }
      if (def.role === 'fly') f.z += ((f.free ? FLY_Z : HOVER_Z) - f.z) * Math.min(1, dt * 6);
      if (f.free) { freeMove(f, dt); continue; }
      if (f.march && f.atk) continue;
      if (f.march && marching(f, dt)) { walk(f, def.spd * MARCH_PACE * dt * (f.slow > 0 ? 1 - f.slowPct : 1), dt); continue; }
      if (f.rush && !f.path.length && !f.next) endCharge(f);
      const loose = (f.stall || 0) > RALLY_STALL;
      const shooter = def.range > 0;
      let target = null;
      let td = Infinity;
      const placed = loose || !f.duel || !duels() || areaOf(f.duel, f.x, f.y);
      if (shooter) {
        const mouth = rimTiles().some(([x, y]) => dist(x, y, f.x, f.y) < GATE_CLEAR);
        const near = !placed ? null : heroInRange(f.fx, f.fy, mouth ? GATE_POINT_BLANK : def.range, foeHeroes(f));
        if (near) f.path = [];
        if (!f.next) target = near;
        f.shooting = target;
      } else {
        const mine = foeHeroes(f);
        if (placed && f.path.length && mine.some((u) => u.melee < MELEE_MAX && touching(f, u, loose))) f.path = [];
        if (!placed) f.prey = null;
        else if (!f.next) {
          if (f.prey && mine.includes(f.prey) && touching(f, f.prey, loose)) target = f.prey;
          else {
            f.prey = null;
            for (const u of mine) { const d = dist(f.fx, f.fy, u.fx, u.fy); if (d < td && u.melee < MELEE_MAX && touching(f, u, loose)) { td = d; target = u; } }
            if (target) { f.prey = target; target.melee++; }
          }
        }
      }
      if (target) {
        f.stall = 0;
        f.path = [];
        f.lost = 0;
        if (!f.atk && f.bite <= FOE_ATTACK * CONTACT) f.atk = { t: FOE_ATTACK * CONTACT - f.bite, win: FOE_ATTACK, hit: FOE_ATTACK * CONTACT, dir: screenDir(f.fx, f.fy, target.fx, target.fy), amp: shooter ? -RECOIL : LUNGE * 0.8 };
        if (!f.atk) pose.aim?.(f, target.fx - f.fx, target.fy - f.fy);
        else pose.faceAt?.(f, target);
        if ((f.bite -= dt) <= 0) {
          f.bite = def.rate || 1.2;
          pose.faceAt?.(f, target);
          hooks.onStrike?.(f, target);
          look.bite?.(f);
          if (shooter) { foeShoot(f, target); continue; }
          shove(target, f.fx, f.fy);
          flinch(target, 0.2);
          if (def.role === 'colossus' && (f.slams = (f.slams || 0) + 1) % SLAM_EVERY === 0) slam(f, target);
        }
        continue;
      }
      if (f.atk) continue;
      if (def.role === 'fly') {
        if ((f.lost = (f.lost || 0) + dt) >= LOST_TIME) { f.lost = 0; takeOff(f); }
        continue;
      }
      if (!foeHeroes(f).length && !f.next && !f.path.length) continue;
      if (def.role === 'warlord' && !f.rush && (f.chargeT -= dt) <= 0 && !f.next) {
        f.chargeT = startCharge(f) ? CHARGE_EVERY * (0.8 + rand() * 0.4) : 0.5;
        if (f.rush) continue;
      }
      if (!f.next && !f.path.length) {
        const fp = footprint(f);
        let options = DIRS.map(([dx, dy]) => [f.x + dx, f.y + dy]).filter(([x, y]) => fits(x, y, fp, f));
        const spaced = options.filter(([x, y]) => fp.every(([dx, dy]) => roomy(x + dx, y + dy, f)));
        f.stall = (f.stall || 0) + dt;
        if (spaced.length) options = spaced;
        else if (f.stall < PROWL) continue;
        if (!options.length) continue;
        const here = fieldOf(f)[f.y * W + f.x];
        const tight = spaced.length && !fp.every(([dx, dy]) => roomy(f.x + dx, f.y + dy, f));
        if (!tight && here >= 0 && options.every(([x, y]) => { const v = fieldOf(f)[y * W + x]; return v < 0 || v >= here; })) {
          if ((f.wait = (f.wait || 0) + dt) >= PROWL) { f.wait = 0; seekRoom(f, fp, options); }
          if (!f.path.length) continue;
          walk(f, def.spd * dt * (f.slow > 0 ? 1 - f.slowPct : 1), dt);
          continue;
        }
        f.wait = 0;
        const crowd = ([x, y]) => foes.reduce((n, o) => n + (o !== f && !o.def.dragon && !o.def.raid
          && ((Math.round(o.fx) === x && Math.round(o.fy) === y) || (o.next && o.next[0] === x && o.next[1] === y)) ? 1 : 0), 0);
        const field = fieldOf(f);
        const fv =([x, y]) => { const v = field[y * W + x]; return v < 0 ? 9999 : v + crowd([x, y]) * 1.6 + rand() * 0.5; };
        const scored = options.map((o) => [fv(o), o]);
        scored.sort((a, b) => a[0] - b[0]);
        options = scored.map((s) => s[1]);
        if (!spaced.length) { f.path = [[...options[0], ...options[0]]]; f.force = true; }
        else route(f, foeTrail(f, options[0], field), FOE_SPAN);
      }
      else if (f.next && f.path.length && f.path.length <= FOE_LOOK && !f.rush) {
        const field = fieldOf(f);
        const last =f.path[f.path.length - 1];
        const more = foeTrail(f, last, field).slice(1);
        if (more.length) f.path.push(...straighten(last[2], last[3], more, (x, y) => fits(x, y, footprint(f), f)));
      }
      if (f.rush) f.force = true;
      walk(f, def.spd * (f.rush ? CHARGE_SPEED : 1) * dt * (f.slow > 0 ? 1 - f.slowPct : 1), dt);
    }

    const leaving = [];
    for (const u of units) {
      const def = HEROES[u.hero.key];
      tire(u, (FARM.huntDrain / 60) * dt);
      wearShield(u, (SHIELD_HIT.awayPerMin / 60) * dt);
      u.rot = Math.max(0, (u.rot || 0) - dt);
      const speed = (1.4 + def.stats.spd * 0.22) * (u.rot > 0 ? ROT_SLOW : 1);
      pose.steer?.(u, dt);
      u.ft += dt;
      u.cd -= dt;
      u.hurt = Math.max(0, (u.hurt || 0) - dt);
      if (u.kick > 0) u.kick -= dt;
      const n = duels() ? duelTarget(u) : nearestFoe(u.fx, u.fy);
      if (u.atk) {
        const had = u.atk.t;
        u.atk.t += dt;
        if (u.atk.t < u.atk.hit && foes.includes(u.atk.foe)) pose.faceAt?.(u, u.atk.foe);
        if (had < u.atk.hit && u.atk.t >= u.atk.hit) strike(u);
        if (u.atk.t >= u.atk.win) u.atk = null;
      }
      const melee = isMelee(u);
      const foe = melee && u.foe && reachDist(u.fx, u.fy, u.foe) <= reach(u) ? u.foe : n?.foe;
      const inReach = foe && reachDist(u.fx, u.fy, foe) <= reach(u) && (!melee || foe === u.foe || foe.melee < meleeCap(foe));
      if (duels()) {
        u.duelT = (u.duelT || 0) + dt;
        if (!inReach) u.work = (u.work || 0) + waitWork(u, dt);
      }
      if (inReach && u.cd <= 0 && !u.atk && !u.step && simT >= swingAt[u.sector]) {
        swingAt[u.sector] = simT + SWING_GAP;
        if (melee) commit(u, foe);
        startAttack(u, foe);
      }
      if (inReach && u.cd <= 0 && u.path.length) u.path = [];
      if (u.step || (u.path.length && !u.atk)) {
        walk(u, speed * dt, dt);
        if (u.ft > 0.14) { u.ft = 0; u.frame = (u.frame + 1) % 4; }
      } else {
        u.frame = Math.floor(simT * 2 + u.hero.id.length) % 2 === 0 ? 0 : 2;
        const watch = inReach ? foe : n?.foe;
        if (watch) pose.aim?.(u, watch.fx - u.fx, watch.fy - u.fy);
      }
      if ((u.think -= dt) <= 0 && !u.atk && heroThink(u) === 'gone') leaving.push(u);
    }
    if (leaving.length) {
      for (const u of units) if (broken(u.hero) && !leaving.includes(u) && heroThink(u) === 'gone') leaving.push(u);
      for (const u of leaving) look.fall?.(u, broken(u.hero));
      units = units.filter((u) => !leaving.includes(u));
      spawnUnits();
      look.roster?.();
    }

    shots = shots.filter((s) => {
      s.f += dt * 12;
      const t = s.target;
      const alive = foes.includes(t);
      const tx = alive ? t.fx : s.lx ?? s.x;
      const ty = alive ? t.fy : s.ly ?? s.y;
      s.lx = tx; s.ly = ty;
      const dx = tx - s.x;
      const dy = ty - s.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const stepLen = 7 * dt;
      s.vx = dx; s.vy = dy;
      if (d <= stepLen + (alive ? 0.4 + radius(t) : 0)) {
        if (alive) { shove(t, s.x, s.y); hitFoe(t, s.dmg, s.crit, s.hero, [s.x, s.y]); }
        look.impact?.(s, tx, ty, !!SPLASH[s.kind]);
        if (s.aoe) for (const f of [...foes]) if (f !== t && dist(f.fx, f.fy, tx, ty) <= s.aoe) hitFoe(f, s.dmg * s.aoePct, false, s.hero);
        return false;
      }
      s.x += (dx / d) * stepLen;
      s.y += (dy / d) * stepLen;
      return true;
    });
    updateFoeShots(dt);
    updateFade(dt);
  }

  function tick() {
    tickN++;
    step(TICK);
  }

  function apply(a) {
    switch (a.type) {
      case 'roster': {
        const own = squad || (squad = []);
        const byId = new Map(own.map((h) => [h.id, h]));
        squad = a.heroes.map((h) => Object.assign(byId.get(h.id) || {}, h));
        refreshUnits();
        break;
      }
      case 'fight': setFight(a.pm / 1000); break;
      case 'oil': setOil(a.until); break;
      case 'load': setLoad(a.value); break;
      case 'hour': setHour(a.hour); break;
      case 'clock': setClock(a.ms); break;
      case 'dragon': summonDragon(a.kind); break;
      case 'realm': nextRealm(); break;
      case 'setRealm': setRealm(a.n); break;
      case 'regen': regenerate(a.realmIndex, a.opts); break;
      case 'wave': startWave(a.n); break;
      case 'spawn': spawnFoe(a.kind); break;
      case 'start': start(); break;
      default: throw new Error(`unknown hunt input ${a.type}`);
    }
  }
  function refreshUnits() {
    if (record && opts.heroes) input({ type: 'roster', heroes: roster().map((h) => heroInput(h, payOf(h))) });
    spawnUnits();
  }
  function setFight(m) {
    const pm = Math.round(m * 1000);
    if (pm === fightPm) return;
    fightPm = pm;
    input({ type: 'fight', pm });
  }
  function setOil(until) {
    until = Math.floor(until || 0);
    if (until === oilUntil) return;
    oilUntil = until;
    input({ type: 'oil', until });
  }
  function setLoad(v) {
    if (v === fieldLoad) return;
    fieldLoad = v;
    input({ type: 'load', value: v });
  }
  function setHour(h) {
    forcedHour = h;
    input({ type: 'hour', hour: h });
  }
  function setClock(ms) {
    clockBase = Math.floor(ms) - Math.floor(simT * 1000);
    input({ type: 'clock', ms: Math.floor(ms) });
  }
  function summonDragon(kind) {
    if (dragon || raid.active()) return;
    input({ type: 'dragon', kind });
    spawnDragon(kind);
  }
  function setRealm(n) {
    if (n === realmN) return;
    realmN = n;
    input({ type: 'setRealm', n });
  }
  function nextRealm() {
    input({ type: 'realm' });
    realmN++;
    wave = 0;
    waveBreak = WAVE_BREAK;
    note('realm', realmN);
    changeMap(seedFor(realmN, 1));
  }
  function regenerate(realmIndex = (realmN - 1) % REALMS.length, o = {}) {
    const s = o.seed ?? Math.floor(rand() * 4294967296);
    input({ type: 'regen', realmIndex, opts: { hold: !!o.hold, calm: !!o.calm, seed: s } });
    pendingMap = null;
    if (fadeDir > 0) fadeDir = -1;
    holdMap = !!o.hold;
    if (o.calm && !dragon) dragonT = Math.max(dragonT, 120);
    buildMap(s, realmIndex);
    foes = foes.filter((f) => f.def.dragon || f.def.raid);
    for (const u of units) { Object.assign(u, { step: null, fx: u.x, fy: u.y }); u.path = []; }
    reseat();
    return mapSeed;
  }
  function start() {
    input({ type: 'start' });
    wave = 0;
    waveBreak = 1.2;
  }

  function snapshot() {
    return structuredClone({ rngState, tickN, simT, clockBase, forcedHour, realmN, squad, mapSeed, mapIndex, units, foes, shots, foeShots, runes, queue, spawnT, fieldLoad, gateUse, wave, waveTotal, waveT, waveBreak, swingAt, fade, fadeDir, pendingMap, holdMap, occ, flow, sectorFlow, flowT, dragon, dragonT, wavePot, fightPm, oilUntil, nextId, events, ledger, inputs });
  }
  function restore(s) {
    ({ rngState, tickN, simT, clockBase, forcedHour, realmN, squad, mapSeed, mapIndex, units, foes, shots, foeShots, runes, queue, spawnT, fieldLoad, gateUse, wave, waveTotal, waveT, waveBreak, swingAt, fade, fadeDir, pendingMap, holdMap, occ, flow, sectorFlow, flowT, dragon, dragonT, wavePot, fightPm, oilUntil, nextId, events, ledger, inputs } = structuredClone(s));
    grid = huntGrid(mapIndex);
    rimGrid = null;
  }

  const isInt = (v) => Number.isSafeInteger(v);
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  function fieldState() {
    const keep = (f) => f.hunt && !f.summoned && !f.def.dragon && !f.def.raid && !f.def.wall && !f.def.vigil && f.hp > 0;
    const map = pendingMap || { seed: mapSeed, realmIndex: mapIndex };
    return {
      v: 1, realm: realmN, wave, waveT, waveBreak, waveTotal, queue: [...queue], spawnT, gateUse: [...gateUse],
      mapSeed: map.seed, mapIndex: map.realmIndex, rng: [...rngState], nextId,
      foes: foes.filter(keep).map((f) => ({ id: f.id, kind: f.kind, x: f.x, y: f.y, hp: f.hp, max: f.max, sector: f.sector, off: f.off, chargeT: f.chargeT, work: f.work ? [...f.work].map(([h, w]) => [h.id, w]) : [] })),
      units: units.map((u) => ({ id: u.hero.id, x: u.x, y: u.y, sector: u.sector, pot: u.pot || 0, work: u.work || 0 })),
    };
  }

  function resumeField(rec) {
    if (!rec || rec.v !== 1 || !isInt(rec.realm) || rec.realm < 1 || !isInt(rec.wave) || !isInt(rec.mapIndex)) return false;
    realmN = rec.realm;
    wave = Math.max(0, Math.min(WAVES, rec.wave));
    waveT = num(rec.waveT) ? Math.max(0, Math.min(WAVE_TIME, rec.waveT)) : WAVE_TIME;
    waveBreak = num(rec.waveBreak) ? Math.max(0, rec.waveBreak) : 0;
    if (!wave && !waveBreak) waveBreak = WAVE_BREAK;
    waveTotal = isInt(rec.waveTotal) ? rec.waveTotal : 0;
    queue = Array.isArray(rec.queue) ? rec.queue.filter((k) => ENEMIES[k]) : [];
    spawnT = num(rec.spawnT) ? rec.spawnT : 0.4;
    gateUse = Array.isArray(rec.gateUse) ? rec.gateUse.map((n) => (isInt(n) ? n : 0)) : [];
    if (Array.isArray(rec.rng) && rec.rng.length === 4 && rec.rng.every(isInt)) rngState = rec.rng.map((n) => n | 0);
    if (isInt(rec.nextId)) nextId = Math.max(nextId, rec.nextId);
    buildMap(isInt(rec.mapSeed) ? rec.mapSeed : seedFor(realmN, Math.max(1, wave)), ((rec.mapIndex % REALMS.length) + REALMS.length) % REALMS.length);
    pendingMap = null; fade = 0; fadeDir = 0;
    const heroes = new Map(roster().map((h) => [h.id, h]));
    foes = foes.filter((f) => f.def.dragon || f.def.raid);
    for (const r of Array.isArray(rec.foes) ? rec.foes : []) {
      const def = ENEMIES[r?.kind];
      if (!def || def.dragon || def.raid || !isInt(r.x) || !isInt(r.y) || !inside(r.x, r.y) || !(num(r.hp) && r.hp > 0) || !(num(r.max) && r.max >= r.hp)) continue;
      const f = { id: isInt(r.id) ? r.id : ++nextId, kind: r.kind, def, x: r.x, y: r.y, fx: r.x, fy: r.y, next: null, path: [], to: null, hp: r.hp, max: r.max, dir: 'down', frame: 0, ft: 0, hurt: 0, bite: 1, think: 0, off: isInt(r.off) ? r.off : 0, sector: isInt(r.sector) ? r.sector : sectorAt(r.x, r.y), hunt: true };
      if (def.role === 'warlord') f.chargeT = num(r.chargeT) ? r.chargeT : CHARGE_EVERY / 2;
      if (def.role === 'fly') f.z = HOVER_Z;
      const work = (Array.isArray(r.work) ? r.work : []).filter(([id, w]) => heroes.has(id) && isInt(w) && w > 0);
      if (work.length) f.work = new Map(work.map(([id, w]) => [heroes.get(id), w]));
      foes.push(f);
    }
    seats = new Map((Array.isArray(rec.units) ? rec.units : []).filter((u) => u && isInt(u.x) && isInt(u.y) && inside(u.x, u.y))
      .map((u) => [u.id, { x: u.x, y: u.y, sector: isInt(u.sector) ? ((u.sector % 4) + 4) % 4 : 0, pot: isInt(u.pot) && u.pot > 0 ? u.pot : 0, work: isInt(u.work) && u.work > 0 ? u.work : 0 }]));
    units = [];
    reseat();
    return true;
  }

  function advance(sec, kills = 0) {
    if (!(sec > 0)) return 0;
    const fallen = foes.filter((f) => f.hunt && !f.def.dragon && !f.def.raid).sort((a, b) => a.hp / a.max - b.hp / b.max || a.id - b.id)
      .slice(0, Math.max(0, Math.floor(kills)));
    foes = foes.filter((f) => !fallen.includes(f));
    const realmBefore = realmN;
    let t = sec, waves = 0;
    quiet = true;
    for (let guard = 0; t > 0 && guard < 1e6; guard++) {
      if (waveBreak > 0) {
        const d = Math.min(t, waveBreak);
        waveBreak -= d; t -= d;
        if (waveBreak <= 0) startWave(wave + 1);
        continue;
      }
      if (wave <= 0) { waveBreak = WAVE_BREAK; continue; }
      const d = Math.min(t, waveT);
      waveT -= d; t -= d;
      if (waveT > 0) break;
      foes = foes.filter((f) => f.def.dragon || f.def.raid || !f.def.boss);
      queue = [];
      waves++;
      if (wave >= WAVES) { realmN++; note('realm', realmN); wave = 0; }
      waveBreak = WAVE_BREAK;
    }
    quiet = false;
    if (waves) {
      if (realmN !== realmBefore) foes = foes.filter((f) => !f.hunt || f.def.dragon || f.def.raid);
      buildMap(seedFor(realmN, Math.max(1, waveBreak > 0 ? wave + 1 : wave)));
      pendingMap = null; fade = 0; fadeDir = 0;
      for (const e of [...units, ...foes]) { Object.assign(e, { next: null, step: null, fx: e.x, fy: e.y }); if (e.path) e.path = []; }
      reseat();
      look.map?.(mapSeed, mapIndex);
    }
    look.purse?.();
    return waves;
  }

  if (opts.resume) restore(opts.resume);
  else buildMap();
  const resumed = !opts.resume && resumeField(opts.field);

  return {
    tick, step, apply, start, refreshUnits, snapshot, fieldState, advance,
    resumed: () => resumed,
    setRaid: (r) => { raid = r || NO_RAID; },
    setFight, setOil, setLoad, setHour, setClock, setRealm, summonDragon, nextRealm, regenerate, startWave,
    spawnFoe, clearField() {
      for (const f of foes) if (!f.def.dragon && !f.def.raid) { queue.unshift(f.kind); look.puff?.(f.fx, f.fy, 'smoke', 2); }
      foes = foes.filter((f) => f.def.dragon || f.def.raid);
    },
    addFoe: (f) => { foes.push(f); reseat(); },
    removeFoe: (f) => { foes = foes.filter((o) => o !== f); },
    addWall: (x, y, hp, life) => {
      const foe = { id: ++nextId, kind: 'raid_icewall', def: { name: 'Glacier Wall', wall: true, spd: 0 }, x, y, fx: x, fy: y, next: null, path: [], hp, max: hp, life, dir: 'down', frame: 0, ft: 0, hurt: 0, bite: 1, think: 0 };
      foes.push(foe);
      hold(foe, x, y);
      return foe;
    },
    reseat, tire, passable, footprint, meleeCap, reach, isMelee, nearestFoe, radius, unready,
    fitsClear: (x, y) => fits(x, y) && !tooClose(x, y, null),
    units: () => units, foes: () => foes, shots: () => shots, foeShots: () => foeShots, runes: () => runes,
    dragon: () => dragon, wave: () => wave, realm: () => realmN, realmInfo: realm, fade: () => fade,
    hour: hourNow, dayPhase, now: clock, time: () => simT, ticks: () => tickN, seed: () => seed,
    map: () => ({ seed: mapSeed, realmIndex: mapIndex }),
    progress: () => {
      const boss = foes.find((f) => f.def.boss && !f.def.dragon) || foes.find((f) => f.def.role === 'warlord');
      return { name: realm().name, wave: Math.max(1, wave), waves: WAVES, timeLeft: Math.max(0, Math.ceil(waveT)), waveTime: WAVE_TIME, left: foes.filter((f) => !f.def.dragon).length + queue.length, total: waveTotal, boss: boss ? { name: boss.def.name, kind: boss.kind, hp: boss.hp, max: boss.max } : null };
    },
    dragonInfo: () => {
      if (!dragon) return { next: DRAGON_AUTO ? Math.max(0, Math.ceil(dragonT)) : null };
      const ranking = [{ name: 'You', dmg: dragon.you }, ...dragon.rivals].map((r) => ({ name: r.name, dmg: r.dmg })).sort((a, b) => b.dmg - a.dmg);
      return { name: dragon.name, kind: dragon.kind, hp: Math.max(0, dragon.foe.hp), max: dragon.foe.max, time: Math.max(0, Math.ceil(dragon.time)), landing: dragon.foe.landing > 0, ranking };
    },
    events: () => events, ledger: () => ledger, inputs: () => inputs,
    wavePot: () => wavePot,
  };
}

export function canonical(entries) {
  const check = (v) => {
    if (Array.isArray(v)) { v.forEach(check); return; }
    if (typeof v === 'number' && !Number.isSafeInteger(v)) throw new Error(`not an integer in a ledger record: ${v}`);
    if (v !== null && typeof v === 'object') throw new Error('objects are not canonical, use arrays');
  };
  check(entries);
  return JSON.stringify(entries);
}

export async function ledgerHash(entries) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(entries)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function replayHunt({ seed, realm = 1, startMs = 0, squad = [], actions = [], steps, start = true, resume = null, wavePot = 0 }) {
  const hunt = createHunt({ seed, realm, startMs, squad: squad.map((h) => ({ ...h })), record: true, resume, wavePot });
  if (!resume) { hunt.refreshUnits(); if (start) hunt.start(); }
  const acts = actions.slice().sort((a, b) => a.at - b.at);
  let i = 0;
  const from = hunt.ticks();
  while (i < acts.length && acts[i].at < from) i++;
  for (let t = from; t < from + steps; t++) {
    while (i < acts.length && acts[i].at <= t) hunt.apply(acts[i++]);
    hunt.tick();
  }
  const ledger = hunt.ledger();
  const paid = ledger.reduce((s, e) => s + (e[1] === 'pay' ? e[4] : e[1] === 'bonus' ? e[5] : 0), 0);
  return { events: hunt.events(), ledger, hash: await ledgerHash([...ledger, ['pot', hunt.wavePot()]]), paid, wavePot: hunt.wavePot(), snapshot: hunt.snapshot, hunt };
}
