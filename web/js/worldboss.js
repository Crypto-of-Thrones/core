import { FEE_SPLIT, HERO_BOX, GEAR } from './data.js';
import { seeded } from './raidrules.js';
import { livePrices, liveIndexed } from './realmlive.js';
import { t } from './i18nsafe.js';

const BOSS_RULES = {
  kind: 'boss', tag: t('worldboss.data.tag', null, 'World boss'), days: 2 / 24, schedule: null,
  roar: 'wb_roar',
  roar_far: 'wb_roar_far',
  rooms: 8,
  roomsMax: 40,
  roomCap: 30,
  step: 10,
  rivals: 300,
  join: 0.75,
  killAt: 0.7,
  hit: 0.3,
  armor: 40,
  band: 1,
  hurtRef: 360,
  hurtCap: 0.08,
  dps: 1,
  hp: 3,
  eventsFund: [20e6, 40e6],
  poolPct: 6,
  floorPct: 20,
  entry: 25000,
  roomFee: 5000,
  potPct: 80,
  fill: 15 * 60,
  roomMin: 5,
  guestEvery: 30,
  lone: 1,
  rivalRooms: 4,
  privJoin: 0.3,
  killBonusPct: 25,
  goldPct: 1,
  silverPct: 10,
  podium: 3,
  emblemPct: 10,
};

export const BOSS_PHASES = [{ at: 1, hit: 1 }, { at: 0.66, hit: 1.7 }, { at: 0.33, hit: 2.6 }];

const phases = (names) => BOSS_PHASES.map((p, i) => ({ at: p.at, name: names[i], hit: p.hit }));

const sideRig = (key, body, wing, shoulder, mouth, root) => ({ src: `enemies/${key}_side.png`, body, jaw: [0, body[3] + 2, body[2], body[3]], wing, shoulder, mouth, root });
const frontRig = (key, body, wing, shoulders, mouth, root, eyes, nostrils, perch) => ({ src: `enemies/${key}_front.png`, body, jaw: [0, body[3] + 2, body[2], body[3]], wing, shoulders, mouth, root, eyes, nostrils, perch });
const perch = (grip, claws, hand, erase, spread) => ({ grip, claws, hand, erase, spread });
const sitRig = (key, h, floor, frames, scale = 1) => ({ src: `enemies/${key}_sit_hd.png`, res: 4, h, floor, frames, scale });
const backRig = (key, body, wing, shoulders, mouth, root) => ({ src: `enemies/${key}_back.png`, body, jaw: [0, body[3] + 2, body[2], body[3]], wing, shoulders, mouth, root });
const hd8 = (r) => ({ ...r, hd: 8 });

export const WORLD_BOSSES = [
  {
    ...BOSS_RULES,
    id: 'skyfall_siege', name: 'The Skyfall Siege', art: 'enemies/dragon_fire_portrait.png',
    blurb: t('worldboss.data.blurbSkyfall', null, 'Pyrrhax descends on the realm. Every lord sends their castle Hero into the Cinder Deep.'),
    boss: { name: 'Pyrrhax, the Sky Tyrant', short: 'Pyrrhax', sheet: 'dragon_fire' },
    voice: 'pyrrhax',
    dungeon: 'The Cinder Deep', arena: 'arenas/cinder_deep.png',
    phases: phases(['Skyfire', 'Molten Wings', 'Last Inferno']),
    rigs: { back: backRig('pyrrhax', [0, 0, 117, 130], [0, 264, 82, 121], [[48, 51], [69, 51]], [58, 19], [71, 104]) },
  },
  {
    ...BOSS_RULES,
    id: 'glacier_waking', name: 'The Glacier Waking', art: 'enemies/skaldrith_portrait.png',
    blurb: t('worldboss.data.blurbGlacier', null, 'Skaldrith uncoils under the ice. Every lord sends their castle Hero into the Rimeglass Hall.'),
    boss: { name: 'Skaldrith, the Rime Wyrm', short: 'Skaldrith', sheet: null },
    roar: 'wb_roar_skaldrith', roar_far: 'wb_roar_far_skaldrith', voice: 'skaldrith',
    dungeon: 'The Rimeglass Hall', arena: 'arenas/rimeglass_hall.png',
    phases: phases(['Hoarfrost', 'Shattered Rime', 'White Silence']),
    rigs: {
      side: hd8(sideRig('skaldrith', [0, 0, 302, 120], [0, 244, 159, 77], [92, 50], [12, 47], [8, 63])),
      front: hd8(frontRig('skaldrith', [0, 0, 121, 130], [0, 264, 82, 123], [[40, 41], [64, 41]], [50, 28], [68, 112], [[44, 20], [53, 20]], [[47, 24], [51, 24]], perch(49, [33, 72], [17, 46, 12, 10], [[12, 40, 24, 24], [82, 38, 20, 22]], 0.8))),
      back: hd8(backRig('skaldrith', [0, 0, 96, 130], [0, 264, 79, 107], [[36, 50], [60, 50]], [48, 12], [69, 95])),
      sit: sitRig('skaldrith', 1405, 1405, [[0, 866, 454], [868, 870, 390], [1740, 1106, 425], [2848, 1075, 465]], 1.4),
    },
    breath: { ramp: ['#ffffff', '#e8fdff', '#bff4ff', '#7cc4e8', '#4a8fc0', '#2f5f8a'], embers: ['#ffffff', '#e8fdff', '#bff4ff', '#7cc4e8'], smoke: ['#5a6a80', '#3a4658'], glow: '150,220,255', stage: ['#0a1020', '#14284a', '#2f5f8a'] },
  },
  {
    ...BOSS_RULES,
    id: 'ossuary_wake', name: 'The Ossuary Wake', art: 'enemies/morvaine_portrait.png',
    blurb: t('worldboss.data.blurbOssuary', null, 'Morvaine rises from the bones of the old abbey. Every lord sends their castle Hero into the Sunken Ossuary.'),
    boss: { name: 'Morvaine, the Hollow Drake', short: 'Morvaine', sheet: null },
    roar: 'wb_roar_morvaine', roar_far: 'wb_roar_far_morvaine', voice: 'morvaine',
    dungeon: 'The Sunken Ossuary', arena: 'arenas/sunken_ossuary.png',
    phases: phases(['Grave Breath', 'Rattling Host', 'Soulfire Requiem']),
    rigs: {
      side: sideRig('morvaine', [0, 0, 253, 71], [0, 146, 159, 73], [74, 28], [10, 40], [9, 51]),
      front: frontRig('morvaine', [0, 0, 87, 130], [0, 264, 80, 127], [[35, 50], [52, 50]], [43, 36], [64, 118], [[40, 26], [47, 26]], [[42, 31], [45, 31]], perch(58, [24, 63], [11, 49, 10, 9], [[7, 44, 18, 18], [63, 44, 18, 18]], 0.75)),
      back: backRig('morvaine', [0, 0, 86, 130], [0, 264, 85, 129], [[34, 50], [52, 50]], [43, 12], [74, 120]),
      sit: sitRig('morvaine', 1363, 1363, [[0, 762, 368], [764, 902, 438], [1668, 937, 393], [2607, 946, 461]], 1.6),
    },
    breath: { ramp: ['#f4ffe0', '#d8ffb0', '#8cf07a', '#3fbf5a', '#1f7a3a', '#0f3d1e'], embers: ['#f4ffe0', '#d8ffb0', '#8cf07a', '#3fbf5a'], smoke: ['#2b2a33', '#1d1a24'], glow: '110,240,120', stage: ['#0e0c12', '#1d1424', '#1f4a2a'] },
  },
  {
    ...BOSS_RULES,
    id: 'tempest_tide', name: 'The Tempest Tide', art: 'enemies/thalassyr_portrait.png',
    blurb: t('worldboss.data.blurbTempest', null, 'Thalassyr rides the storm into the harbor. Every lord sends their castle Hero onto the docks of Gullwreck Harbor.'),
    boss: { name: 'Thalassyr, the Tide Serpent', short: 'Thalassyr', sheet: null },
    roar: 'wb_roar_thalassyr', roar_far: 'wb_roar_far_thalassyr', voice: 'thalassyr',
    dungeon: 'Gullwreck Harbor', arena: 'arenas/gullwreck_harbor.png',
    phases: phases(['Squall', 'Thunderscale', 'Maelstrom']),
    rigs: {
      side: sideRig('thalassyr', [0, 0, 251, 69], [0, 142, 124, 66], [66, 28], [14, 31], [8, 51]),
      front: frontRig('thalassyr', [0, 0, 95, 130], [0, 264, 92, 126], [[35, 50], [59, 50]], [47, 33], [87, 107], [[42, 26], [53, 26]], [[45, 30], [49, 30]], perch(58, [28, 67], [15, 44, 10, 9], [[11, 40, 20, 18], [65, 40, 20, 18]], 0.8)),
      back: backRig('thalassyr', [0, 0, 144, 130], [0, 264, 93, 120], [[62, 55], [82, 55]], [72, 22], [84, 111]),
      sit: sitRig('thalassyr', 1293, 1293, [[0, 728, 418], [730, 903, 487], [1635, 924, 508], [2561, 891, 584]], 1.7),
    },
    breath: { ramp: ['#ffffff', '#e6e0ff', '#b9a8ff', '#9b7af0', '#5a3aa8', '#2c4f80'], embers: ['#ffffff', '#d6ccff', '#9b7af0', '#7fe0c4'], smoke: ['#34405a', '#232c40'], glow: '170,150,255', stage: ['#070f1c', '#0d2a3a', '#1f5a6a'] },
  },
  {
    ...BOSS_RULES,
    id: 'sunscour_march', name: 'The Sunscour March', art: 'enemies/zarakesh_portrait.png',
    blurb: t('worldboss.data.blurbSunscour', null, 'Zarakesh digs out of the dunes. Every lord sends their castle Hero into the Dunescar Ruins.'),
    boss: { name: 'Zarakesh, the Dune Sovereign', short: 'Zarakesh', sheet: null },
    roar: 'wb_roar_zarakesh', roar_far: 'wb_roar_far_zarakesh', voice: 'zarakesh',
    dungeon: 'The Dunescar Ruins', arena: 'arenas/dunescar_ruins.png',
    phases: phases(['Sandgale', 'Sunscour', 'Buried Crown']),
    rigs: {
      side: sideRig('zarakesh', [0, 0, 252, 64], [0, 132, 156, 52], [72, 30], [10, 32], [6, 38]),
      front: frontRig('zarakesh', [0, 0, 101, 130], [0, 264, 86, 130], [[37, 54], [63, 54]], [50, 33], [76, 120], [[47, 26], [54, 26]], [[49, 31], [52, 31]], perch(62, [31, 70], [14, 48, 10, 10], [[12, 44, 18, 20], [72, 44, 18, 20]], 0.8)),
      back: backRig('zarakesh', [0, 0, 91, 130], [0, 264, 85, 127], [[35, 46], [57, 46]], [45, 10], [60, 121]),
      sit: sitRig('zarakesh', 1252, 1252, [[0, 733, 370], [735, 866, 413], [1603, 887, 310], [2492, 947, 375]], 1.6),
    },
    breath: { ramp: ['#fff2c2', '#f4d87e', '#e0b44a', '#b8862e', '#8a5a22', '#5a3416'], embers: ['#fff2c2', '#f4d87e', '#e0b44a', '#b8862e'], smoke: ['#6e5a40', '#4a3a28'], glow: '255,200,110', stage: ['#1a1008', '#4a2c14', '#a8742e'] },
  },
];
for (const b of WORLD_BOSSES) { livePrices(b, ['entry', 'roomFee']); liveIndexed(b, ['eventsFund']); }

export let WORLD_BOSS = WORLD_BOSSES[0];

export const bossById = (id) => WORLD_BOSSES.find((b) => b.id === id) || null;

const STATE_ORDER = { live: 0, scheduled: 1, ended: 2 };

export function pickWorldBoss(windows, now) {
  const rank = (b) => {
    const w = windows[b.id];
    const st = wbState(w, now);
    return st === 'off' ? null : [STATE_ORDER[st], st === 'scheduled' ? w.start : -w.end];
  };
  let best = null;
  let bestRank = null;
  for (const b of WORLD_BOSSES) {
    const r = rank(b);
    if (r && (!bestRank || r[0] < bestRank[0] || (r[0] === bestRank[0] && r[1] < bestRank[1]))) { best = b; bestRank = r; }
  }
  WORLD_BOSS = best || WORLD_BOSSES[0];
  return WORLD_BOSS;
}

export function bossClash(id, start, end, windows, now) {
  if (!bossById(id)) return '';
  for (const b of WORLD_BOSSES) {
    const w = windows[b.id];
    if (b.id === id || !w || wbState(w, now) === 'ended') continue;
    if (w.start < end && w.end > start) return wbState(w, now) === 'live' ? t('worldboss.data.clashLive', { name: b.name }, 'Only one world boss at a time: {name} is live in that window. Stop it first.')
      : t('worldboss.data.clashScheduled', { name: b.name }, 'Only one world boss at a time: {name} is scheduled in that window. Stop it first.');
  }
  return '';
}

export const EVENTS_PCT = FEE_SPLIT.find((f) => f.key === 'events').pct;

const RIVAL_HEROES = [['common', 34], ['uncommon', 24], ['rare', 18], ['epic', 12], ['legendary', 8], ['mythic', 4]];
const TRAIN = 12;
const GEAR_WORN = 0.75;
const TIERS = RIVAL_HEROES.map(([r]) => r);

const NAME_A = ['Frost', 'Rook', 'Tide', 'Coin', 'Ash', 'Iron', 'Gold', 'Moon', 'Storm', 'Raven', 'Wolf', 'Thorn', 'Ember', 'Stone', 'Night', 'Sun', 'Grim', 'Oak'];
const NAME_B = ['Maxi', 'Lord', 'King', 'Bankr', 'fang', 'ward', 'mere', 'shield', 'blade', 'heart', 'born', 'claw', 'helm', 'vale', 'crow', 'brand'];

export function wbState(w, now) {
  if (!w) return 'off';
  if (now < w.start) return 'scheduled';
  return now < w.end ? 'live' : 'ended';
}

export const stepsOf = (w) => Math.max(1, Math.floor((w.end - w.start) / 1000 / WORLD_BOSS.step));

export const stepAt = (w, now) => Math.min(stepsOf(w), Math.max(0, Math.floor((now - w.start) / 1000 / WORLD_BOSS.step)));

export function prizePool(w) {
  const [lo, hi] = WORLD_BOSS.eventsFund;
  const fund = Math.round(lo + seeded(`wb-fund:${w.start}`)() * (hi - lo));
  return { fund, pool: Math.floor((fund * WORLD_BOSS.poolPct) / 100) };
}

function rollLord(rng, used, atOf) {
  const total = RIVAL_HEROES.reduce((t, r) => t + r[1], 0);
  let name;
  do name = `${NAME_A[Math.floor(rng() * NAME_A.length)]}${NAME_B[Math.floor(rng() * NAME_B.length)]}${rng() < 0.4 ? Math.floor(rng() * 90 + 10) : ''}`;
  while (used.has(name));
  used.add(name);
  const at = atOf(rng);
  let roll = rng() * total;
  const [rarity] = RIVAL_HEROES.find((r) => (roll -= r[1]) < 0) || RIVAL_HEROES[0];
  const rank = HERO_BOX.ranks[rarity];
  const pick = ([lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
  let atk = pick(rank.atk) + Math.floor(rng() * (TRAIN + 1));
  let def = pick(rank.def) + Math.floor(rng() * (TRAIN + 1));
  let hp = rank.hp + Math.floor(rng() * (2 * TRAIN + 1));
  const tier = TIERS.indexOf(rarity);
  for (const slot of Object.keys(GEAR)) {
    if (rng() >= GEAR_WORN) continue;
    const piece = GEAR[slot][TIERS[Math.max(0, tier - (rng() < 0.5 ? 1 : 0))]];
    atk += piece.atk;
    def += piece.def;
    hp += piece.hp;
  }
  hp *= WORLD_BOSS.hp;
  return { name, at, heroes: [{ id: `${name}#hero`, key: `realm_${rarity}`, rarity, atk, def, hp }] };
}

export function rivalField(w) {
  const rng = seeded(`wb-field:${w.start}`);
  const steps = stepsOf(w);
  const used = new Set();
  const lords = [];
  for (let i = 0; i < WORLD_BOSS.rivals; i++) lords.push(rollLord(rng, used, (r) => Math.floor(r() ** 1.6 * steps * WORLD_BOSS.join)));
  return lords.sort((a, b) => a.at - b.at);
}

const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function roomCode(seed) {
  const rng = seeded(`wb-code:${seed}`);
  return Array.from({ length: 6 }, () => CODE_ABC[Math.floor(rng() * CODE_ABC.length)]).join('');
}

export const fillSteps = () => Math.max(1, Math.round(WORLD_BOSS.fill / WORLD_BOSS.step));

export function rivalHosts(w, field) {
  const rng = seeded(`wb-rooms:${w.start}`);
  const late = stepsOf(w) / 2;
  const pool = field.filter((l) => l.at <= late);
  const out = new Map();
  while (out.size < Math.min(WORLD_BOSS.rivalRooms, pool.length)) {
    const l = pool[Math.floor(rng() * pool.length)];
    if (!out.has(l.name)) out.set(l.name, roomCode(`${w.start}:${l.name}`));
  }
  return out;
}

export function phaseOf(hp, max) {
  const share = max > 0 ? hp / max : 0;
  let i = 0;
  WORLD_BOSS.phases.forEach((p, k) => { if (share <= p.at) i = k; });
  return i;
}

export const powerOf = (x) => x.atk + (x.def || 0) / 2 + x.hp / WORLD_BOSS.hp / 4;

const BAND_POWER = TIERS.map((r) => {
  const k = HERO_BOX.ranks[r];
  const g = ['weapon', 'armour'].reduce((t, s) => ({ atk: t.atk + GEAR[s][r].atk, def: t.def + GEAR[s][r].def, hp: t.hp + GEAR[s][r].hp }), { atk: 0, def: 0, hp: 0 });
  const mid = ([lo, hi]) => (lo + hi) / 2;
  return powerOf({ atk: mid(k.atk) + TRAIN / 2 + g.atk, def: mid(k.def) + TRAIN / 2 + g.def, hp: (k.hp + TRAIN + g.hp) * WORLD_BOSS.hp });
});

export function tierOf(x) {
  const p = Math.log(Math.max(1, powerOf(x)));
  let best = 0;
  BAND_POWER.forEach((b, i) => { if (Math.abs(Math.log(b) - p) < Math.abs(Math.log(BAND_POWER[best]) - p)) best = i; });
  return best;
}

export function roomScore(tiers, tier) {
  let s = 0;
  tiers.forEach((n, t) => { s += Math.abs(t - tier) <= WORLD_BOSS.band ? n : -n; });
  return s;
}

export function hurtOf(hero, s, mult, roll) {
  const base = WORLD_BOSS.hit * mult * s * Math.sqrt(hero.hp / WORLD_BOSS.hurtRef) * (WORLD_BOSS.armor / (WORLD_BOSS.armor + hero.def));
  return Math.min(hero.hp * WORLD_BOSS.hurtCap, base * (0.8 + roll * 0.4));
}

export function createFight(w, joins = [], maxHp = null, { rivals = true, room = w.room || null, book = null } = {}) {
  if (book) { rivals = false; room = null; joins = []; }
  const field = rivals ? rivalField(w) : [];
  const hosts = rivals ? rivalHosts(w, field) : new Map();
  const max = maxHp ?? bossHp(w);
  const newRoom = (kind = 'public', extra = {}) => ({ alive: 0, lords: new Set(), tiers: TIERS.map(() => 0), kind, code: null, host: null, created: 0, startAt: null, started: kind === 'public', cancelled: false, expired: false, size: 0, hard: 1, pending: [], blocked: new Set(), ...extra });
  const f = {
    step: 0, hp: max, max, phase: 0, killStep: null, last: null, fees: 0,
    booked: !!book, feesBooked: 0, feeBooked: 0,
    rooms: Array.from({ length: WORLD_BOSS.rooms }, () => newRoom()),
    lords: new Map(), heroes: new Map(), waiting: [], dealt: [0], sum: 0,
  };
  const live = [];
  let next = 0;
  const mine = [...joins].sort((a, b) => a.step - b.step);
  let mineNext = 0;
  let ownOpened = false;
  const cap = WORLD_BOSS.roomCap;
  const guestRng = room && rivals ? seeded(`wb-guest:${w.start}:${room.code}`) : null;
  const guestNames = new Set(field.map((l) => l.name));
  const guestGap = () => 1 + Math.floor(guestRng() * Math.max(1, Math.round((2 * WORLD_BOSS.guestEvery) / WORLD_BOSS.step) - 1));
  let guestAt = null;

  const lordOf = (name, me) => {
    if (!f.lords.has(name)) f.lords.set(name, { name, dmg: 0, me, heroes: 0, alive: 0, fallen: 0 });
    return f.lords.get(name);
  };
  const publicCount = () => f.rooms.reduce((t, r) => t + (r.kind === 'public'), 0);
  const roomFor = (n) => {
    const i = f.rooms.findIndex((r) => r.kind === 'public' && r.alive + n <= cap);
    return i >= 0 || n > cap ? i : publicCount() < WORLD_BOSS.roomsMax ? f.rooms.length : -1;
  };
  const pickRoom = (heroes) => {
    const n = heroes.length;
    const tier = tierOf(heroes[0] || {});
    let best = -1;
    let bestScore = -Infinity;
    f.rooms.forEach((r, i) => {
      if (r.kind !== 'public' || r.alive + n > cap) return;
      const s = roomScore(r.tiers, tier);
      if (s > bestScore) { bestScore = s; best = i; }
    });
    return best >= 0 ? best : roomFor(n);
  };
  const place = (name, me, heroes, room) => {
    const lord = lordOf(name, me);
    const r = f.rooms[room];
    r.alive += heroes.length;
    r.lords.add(name);
    for (const x of heroes) {
      const tier = tierOf(x);
      r.tiers[tier]++;
      const hero = { id: x.id, key: x.key || 'realm_common', tier, lord: name, room, alive: true, dmg: 0, taken: 0, hp: x.hp, atk: x.atk, def: x.def || 0, fellAt: null, at: f.step, hit: 0, hurt: 0 };
      f.heroes.set(x.id, hero);
      if (r.started) live.push(hero);
      else r.pending.push(hero);
      lord.heroes++;
      lord.alive++;
    }
  };
  const enter = (name, me, heroes) => {
    const room = pickRoom(heroes);
    if (room < 0) return false;
    if (room === f.rooms.length) f.rooms.push(newRoom());
    place(name, me, heroes, room);
    return true;
  };
  const openRoom = (host, code, booked = null) => {
    f.rooms.push(newRoom('private', { code, host, created: f.step, startAt: host === 'You' || booked ? null : f.step + fillSteps(), booked }));
    f.fees++;
    if (booked?.fee != null) { f.feesBooked++; f.feeBooked += booked.fee; }
    return f.rooms.length - 1;
  };
  f.roomOf = (code) => f.rooms.findIndex((r) => r.kind === 'private' && r.code === code);
  f.roomBlock = (code, n = 1, lord = 'You') => {
    const r = f.rooms[f.roomOf(code)];
    if (!r) return t('worldboss.data.noRoom', null, 'No room has that code');
    if (r.blocked.has(lord)) return t('worldboss.data.kicked', null, 'The host kicked that lord out of this room');
    if (r.cancelled) return t('worldboss.data.roomCancelled', null, 'That room was cancelled by its host');
    if (r.expired) return t('worldboss.data.roomExpired', null, 'That room never started and the event is over');
    if (r.started) return t('worldboss.data.roomStarted', null, 'That room has already started its fight');
    return r.alive + n > cap ? t('worldboss.data.roomFull', null, 'That room is full') : '';
  };
  const filling = () => f.rooms.filter((r) => r.kind === 'private' && !r.started && !r.cancelled && !r.expired && r.alive < cap);
  const takePrivate = (p) => {
    const open = filling().filter((r) => !r.blocked.has(p.name));
    if (!open.length) return false;
    const rng = seeded(`wb-pick:${w.start}:${p.name}`);
    if (rng() >= WORLD_BOSS.privJoin) return false;
    place(p.name, false, p.heroes, f.rooms.indexOf(open[Math.floor(rng() * open.length)]));
    return true;
  };
  const startsNow = (r) => {
    if (r.started || r.cancelled || r.expired || r.alive < WORLD_BOSS.roomMin) return false;
    if (r.booked) return r.booked.startAt === f.step;
    if (r.host === 'You') return room?.startAt === f.step;
    return r.alive >= cap || f.step >= r.startAt;
  };
  const startRooms = () => {
    for (const r of f.rooms) {
      if (!startsNow(r)) continue;
      r.started = true;
      r.startAt = f.step;
      r.size = r.alive;
      r.hard = 1 + WORLD_BOSS.lone * (1 - r.size / cap);
      live.push(...r.pending);
      r.pending = [];
    }
  };
  const cancelRoom = (code) => {
    const r = f.rooms[f.roomOf(code)];
    if (!r || r.started || r.cancelled) return;
    r.cancelled = true;
    const out = r.pending;
    r.pending = [];
    r.alive = 0;
    r.tiers = TIERS.map(() => 0);
    r.lords.clear();
    for (const x of out) {
      f.heroes.delete(x.id);
      const lord = f.lords.get(x.lord);
      lord.heroes--;
      lord.alive--;
      const back = { id: x.id, key: x.key, atk: x.atk, def: x.def, hp: x.hp };
      if (!book && x.lord !== 'You' && !enter(x.lord, false, [back])) f.waiting.push({ name: x.lord, heroes: [back] });
    }
  };
  const kickOut = (code, name) => {
    const r = f.rooms[f.roomOf(code)];
    if (!r || r.started || r.cancelled || r.expired || name === r.host) return;
    r.blocked.add(name);
    r.lords.delete(name);
    r.pending = r.pending.filter((x) => {
      if (x.lord !== name) return true;
      f.heroes.delete(x.id);
      r.alive--;
      r.tiers[x.tier]--;
      const lord = f.lords.get(x.lord);
      lord.heroes--;
      lord.alive--;
      return false;
    });
  };
  f.close = () => {
    for (const r of f.rooms) {
      if (r.kind !== 'private' || r.started || r.cancelled || r.expired) continue;
      r.expired = true;
      for (const x of r.pending) {
        f.heroes.delete(x.id);
        const lord = f.lords.get(x.lord);
        lord.heroes--;
        lord.alive--;
      }
      r.pending = [];
      r.alive = 0;
      r.tiers = TIERS.map(() => 0);
    }
    return f;
  };
  const guests = () => {
    const r = f.rooms[f.roomOf(room.code)];
    if (!guestRng || !r) return;
    if (guestAt == null) guestAt = f.step + guestGap();
    while (guestAt <= f.step && !r.started && !r.cancelled && !r.expired && r.alive < cap) {
      const p = rollLord(guestRng, guestNames, () => f.step);
      if (!r.blocked.has(p.name)) place(p.name, false, p.heroes, f.rooms.indexOf(r));
      guestAt += guestGap();
    }
  };
  let bookNext = 0;
  const bookArrive = () => {
    for (const b of book.rooms) if (b.step === f.step) openRoom(b.host, b.code, b);
    for (const b of book.rooms) {
      for (const k of b.kicks || []) if (k.step === f.step) kickOut(b.code, k.lord);
      if (b.cancelAt === f.step) cancelRoom(b.code);
    }
    while (bookNext < book.joins.length && book.joins[bookNext].step <= f.step) {
      const j = book.joins[bookNext++];
      if (f.heroes.has(j.hero.id)) continue;
      if (j.room) { if (!f.roomBlock(j.room, 1, j.lord)) place(j.lord, j.lord === 'You', [j.hero], f.roomOf(j.room)); } else enter(j.lord, j.lord === 'You', [j.hero]);
      if (j.entry != null && f.heroes.has(j.hero.id)) f.lords.get(j.lord).entry = j.entry;
    }
  };
  const arrive = () => {
    if (f.killStep != null) return;
    f.waiting = f.waiting.filter((p) => !enter(p.name, false, p.heroes));
    while (next < field.length && field[next].at <= f.step) {
      const p = field[next++];
      if (hosts.has(p.name)) { place(p.name, false, p.heroes, openRoom(p.name, hosts.get(p.name))); continue; }
      if (takePrivate(p)) continue;
      if (!enter(p.name, false, p.heroes)) f.waiting.push(p);
    }
    if (room && !ownOpened && room.step <= f.step) { ownOpened = true; openRoom('You', room.code); }
    if (ownOpened) guests();
    if (ownOpened && room.kicks) for (const k of room.kicks) if (k.step === f.step) kickOut(room.code, k.lord);
    if (room && room.cancelAt === f.step) cancelRoom(room.code);
    if (book) bookArrive();
    while (mineNext < mine.length && mine[mineNext].step <= f.step) {
      const j = mine[mineNext++];
      const heroes = j.heroes.filter((x) => !f.heroes.has(x.id));
      if (!heroes.length) continue;
      if (j.room) { if (!f.roomBlock(j.room, heroes.length)) place('You', true, heroes, f.roomOf(j.room)); } else enter('You', true, heroes);
    }
    startRooms();
  };
  const fight = () => {
    const s = WORLD_BOSS.step;
    const hitMult = WORLD_BOSS.phases[f.phase].hit;
    const rng = seeded(`wb-step:${book ? book.seeds[f.step] : w.start}:${f.step}`);
    for (const hero of live) { hero.hit = 0; hero.hurt = 0; }
    for (const hero of live) {
      if (f.killStep != null) break;
      const dmg = Math.min(f.hp, hero.atk * WORLD_BOSS.dps * s * (0.75 + rng() * 0.5));
      hero.hit = dmg;
      hero.dmg += dmg;
      f.lords.get(hero.lord).dmg += dmg;
      f.hp -= dmg;
      f.sum += dmg;
      if (f.hp <= 0) { f.hp = 0; f.killStep = f.step + 1; f.last = hero.lord; }
    }
    f.phase = phaseOf(f.hp, f.max);
    if (f.killStep != null) return;
    for (let i = live.length - 1; i >= 0; i--) {
      const hero = live[i];
      const hurt = hurtOf(hero, s, hitMult * f.rooms[hero.room].hard, rng());
      hero.hurt = Math.min(hurt, hero.hp - hero.taken);
      hero.taken += hurt;
      if (hero.taken < hero.hp) continue;
      hero.alive = false;
      hero.fellAt = f.step + 1;
      f.rooms[hero.room].alive--;
      f.rooms[hero.room].tiers[hero.tier]--;
      const lord = f.lords.get(hero.lord);
      lord.alive--;
      lord.fallen++;
      live.splice(i, 1);
    }
  };

  arrive();
  f.advance = (to) => {
    to = Math.min(to, stepsOf(w));
    if (book) to = Math.min(to, book.seeds.length);
    while (f.step < to && f.killStep == null) {
      fight();
      f.step++;
      f.dealt.push(f.sum);
      arrive();
    }
    if (f.killStep != null) f.step = Math.max(f.step, to);
    if (f.killStep != null || f.step >= stepsOf(w)) f.close();
    return f;
  };
  f.tryJoin = (n) => roomFor(n);
  f.total = () => f.sum;
  return f;
}

const hpCache = new Map();

export function bossHp(w) {
  const key = `${w.start}:${w.end}`;
  if (hpCache.has(key)) return hpCache.get(key);
  const steps = stepsOf(w);
  const target = Math.max(1, Math.round(steps * WORLD_BOSS.killAt));
  let hp = createFight(w, [], Infinity, { room: null }).advance(target).total();
  for (let i = 0; i < 3; i++) {
    const run = createFight(w, [], hp, { room: null }).advance(steps);
    hp = run.killStep != null && run.killStep < target ? (hp * target) / run.killStep : run.dealt[target];
  }
  hp = Math.max(1, Math.round(hp));
  hpCache.set(key, hp);
  return hp;
}

export function splitPrize(pool, rows) {
  const out = new Map();
  const field = rows.filter((r) => r.dmg > 0).sort((a, b) => b.dmg - a.dmg);
  if (!field.length || pool <= 0) return out;
  const total = field.reduce((t, r) => t + r.dmg, 0);
  const floor = (pool * WORLD_BOSS.floorPct) / 100;
  const exact = field.map((r) => floor / field.length + ((pool - floor) * r.dmg) / total);
  const whole = exact.map(Math.floor);
  let left = pool - whole.reduce((t, v) => t + v, 0);
  const order = exact.map((v, i) => [v - whole[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) { if (left <= 0) break; whole[i]++; left--; }
  field.forEach((r, i) => out.set(r.name, whole[i]));
  return out;
}

export function boxesOf(ranking, killed, last) {
  return ranking.map((r, i) => {
    if (!killed) return ['ember'];
    const b = [];
    if (r.name === last) b.push('lastblow');
    if (i === 0) b.push('top');
    else if (i < 3) b.push('champion');
    return b.length ? b : ['ember'];
  });
}

export function eventPot(w, f, fund = null) {
  const { fund: base, pool: events } = fund == null ? prizePool(w) : { fund, pool: Math.floor((fund * WORLD_BOSS.poolPct) / 100) };
  const counted = [...f.lords.values()].filter((l) => l.heroes > 0 && (l.dmg > 0 || (f.killStep == null && !f.booked)));
  const entries = counted.length;
  const fees = f.feeBooked + (f.fees - f.feesBooked) * WORLD_BOSS.roomFee;
  const paid = counted.reduce((t, l) => t + (l.entry ?? WORLD_BOSS.entry), 0) + fees;
  const toPot = Math.floor((paid * WORLD_BOSS.potPct) / 100);
  const pool = events + toPot;
  const bonus = f.killStep != null ? Math.floor((pool * WORLD_BOSS.killBonusPct) / 100) : 0;
  return { fund: base, events, entries, rooms: f.fees, paid, toPot, burned: paid - toPot, pool, bonus, total: pool + bonus };
}

export const medalCuts = (n) => ({ gold: Math.max(1, Math.ceil((n * WORLD_BOSS.goldPct) / 100)), silver: Math.max(1, Math.ceil((n * WORLD_BOSS.silverPct) / 100)) });

export const medalBossOf = (b) => b.boss.short.toLowerCase();

export function medalsOf(ranking, killed, boss) {
  const cut = medalCuts(ranking.length);
  return ranking.map((r, i) => {
    const tier = i < cut.gold ? 'gold' : i < cut.silver ? 'silver' : 'bronze';
    return killed ? [`wb_${boss}_${tier}`, `wb_${boss}_victory`] : [`wb_${boss}_${tier}`];
  });
}

export const bossLookIds = (bossId) => ({ frame: `wb_${bossId}_frame`, title: `wb_${bossId}_title`, emblem: `wb_${bossId}_emblem` });

export function looksOf(ranking, bossId) {
  const ids = bossLookIds(bossId);
  const emblems = Math.max(1, Math.ceil((ranking.length * WORLD_BOSS.emblemPct) / 100));
  return ranking.map((r, i) => [...(i < WORLD_BOSS.podium ? [ids.frame, ids.title] : []), ...(i < emblems ? [ids.emblem] : [])]);
}

export function fightResult(w, f, fund = null) {
  const pot = eventPot(w, f, fund);
  const rows = [...f.lords.values()].filter((l) => l.dmg > 0).sort((a, b) => b.dmg - a.dmg);
  const prizes = splitPrize(pot.total, rows);
  const killed = f.killStep != null;
  const boxes = boxesOf(rows, killed, f.last);
  const boss = bossById(w.boss) || WORLD_BOSS;
  const medals = medalsOf(rows, killed, medalBossOf(boss));
  const looks = looksOf(rows, boss.id);
  const ranking = rows.map((l, i) => ({ name: l.name, dmg: Math.round(l.dmg), prize: prizes.get(l.name) || 0, boxes: boxes[i], medals: medals[i], looks: looks[i], me: l.me }));
  return { killed, last: f.last, pool: pot.total, fund: pot.fund, pot, ranking, mine: ranking.find((r) => r.me) || null };
}


export function roomPower(f, i, w) {
  const r = f.rooms[i];
  let rate = 0;
  for (const x of f.heroes.values()) if (x.alive && x.room === i) rate += x.atk * WORLD_BOSS.dps;
  const from = r.started || r.startAt == null ? f.step : Math.max(f.step, r.startAt);
  const left = Math.max(0, (stepsOf(w) - from) * WORLD_BOSS.step);
  const need = left > 0 ? f.hp / left : Infinity;
  const ratio = need > 0 ? rate / need : 0;
  const verdict = f.killStep != null ? 'fallen' : !left || r.cancelled || r.expired ? 'over' : ratio >= 1 ? 'kill' : 'short';
  return { rate, left, need, ratio, verdict, short: verdict === 'short' ? Math.max(1, Math.ceil((1 - ratio) * 100)) : 0 };
}

export function roomList(f, w) {
  const cap = WORLD_BOSS.roomCap;
  return f.rooms.map((r, i) => {
    const filling = r.kind === 'private' && !r.started && !r.cancelled && !r.expired;
    return {
      i, no: i + 1, kind: r.kind, code: r.code, host: r.host, alive: r.alive, cap, min: WORLD_BOSS.roomMin,
      open: !r.cancelled && r.alive < cap && (r.kind === 'public' || filling) && f.killStep == null,
      full: r.alive >= cap, fighting: r.started && !r.cancelled && r.alive > 0, filling, cancelled: r.cancelled, expired: r.expired,
      fillLeft: filling && r.startAt != null ? Math.max(0, (r.startAt - f.step) * WORLD_BOSS.step) : 0,
      power: roomPower(f, i, w),
    };
  });
}

export function filterRooms(list, q = '', kind = 'all', state = 'all') {
  const s = String(q).trim().toLowerCase().replace(/^#/, '');
  return list.filter((r) => {
    if (kind !== 'all' && r.kind !== kind) return false;
    if (state !== 'all' && !r[state]) return false;
    if (!s) return true;
    return String(r.no) === s || (r.code || '').toLowerCase().includes(s) || (r.host || '').toLowerCase().includes(s);
  });
}


export const freshRecord = (w = null) => ({ start: w?.start || 0, end: w?.end || 0, joins: [], room: null, pays: [], stopAt: null, paid: false, result: null, boss: w ? WORLD_BOSS.id : null });

export const MY_HERO = 'You#hero';

const CODE_RE = /^[A-Z0-9]{6}$/;

export const voided = (rec, j) => !!(rec.room && rec.room.cancelAt != null && j.room === rec.room.code && j.step <= rec.room.cancelAt);

export const entryPaid = (rec) => (rec.pays || []).some((p) => p.kind === 'entry' && !p.refunded);

export const roomCost = (rec, wb = WORLD_BOSS) => (entryPaid(rec) ? 0 : wb.entry) + wb.roomFee;

export const liveJoins = (rec) => rec.joins.filter((j) => !voided(rec, j));

export function normalizeRecord(x) {
  if (!x || typeof x !== 'object' || !Number.isFinite(x.start) || !Number.isFinite(x.end) || x.end <= x.start) return freshRecord();
  const pos = (v) => Number.isFinite(v) && v > 0;
  const step = (v) => Number.isInteger(v) && v >= 0;
  const hero = (h) => h && h.id === MY_HERO && pos(h.atk) && pos(h.hp) && Number.isFinite(h.def) && h.def >= 0;
  const r = x.room;
  const cancelAt = r && step(r.cancelAt) && r.cancelAt >= r.step ? r.cancelAt : null;
  const startAt = r && cancelAt == null && step(r.startAt) && r.startAt >= r.step ? r.startAt : null;
  const room = r && typeof r === 'object' && step(r.step) && CODE_RE.test(r.code) ? { step: r.step, code: r.code, cancelAt, startAt } : null;
  const kicks = room && Array.isArray(r.kicks) ? r.kicks.filter((k) => k && step(k.step) && k.step >= r.step && typeof k.lord === 'string' && k.lord && k.lord !== 'You' && k.lord.length <= 40).slice(0, WORLD_BOSS.roomCap).map((k) => ({ step: k.step, lord: k.lord })) : [];
  if (kicks.length) room.kicks = kicks;
  const valid = Array.isArray(x.joins) ? x.joins.filter((j) => j && step(j.step) && Array.isArray(j.heroes) && j.heroes.length === 1 && hero(j.heroes[0]) && (j.room === undefined || CODE_RE.test(j.room))) : [];
  const joins = [];
  for (const j of valid) {
    if (joins.length >= 2 || (joins.length === 1 && !voided({ room }, joins[0]))) break;
    joins.push(j.room ? { step: j.step, heroes: j.heroes, room: j.room } : { step: j.step, heroes: j.heroes });
  }
  const pays = Array.isArray(x.pays) ? x.pays.filter((p) => p && (p.kind === 'entry' || p.kind === 'room') && (p.from === 'wallet' || p.from === 'chest') && pos(p.amount)).slice(0, 4).map((p) => ({ kind: p.kind, from: p.from, amount: p.amount, refunded: !!p.refunded })) : [];
  return { start: x.start, end: x.end, joins, room, pays, stopAt: Number.isInteger(x.stopAt) ? x.stopAt : null, paid: !!x.paid, result: x.paid && x.result && typeof x.result === 'object' ? x.result : null, boss: bossById(x.boss) ? x.boss : null };
}

export const sentHero = (rec) => liveJoins(rec)[0]?.heroes[0] || null;

export function joinBlock(rec, f, step, steps, code = '') {
  if (f.killStep != null) return t('worldboss.data.bossFallen', null, 'The boss has already fallen');
  if (step >= steps || rec.stopAt != null) return t('worldboss.data.eventOver', null, 'The event is over');
  if (liveJoins(rec).length) return t('worldboss.data.alreadyIn', null, 'Your Hero is already in the event: it enters only once, and a fallen Hero stays out until the event ends');
  if (code) return f.roomBlock(code);
  return f.tryJoin(1) < 0 ? t('worldboss.data.allFull', null, 'Every room is full: a slot opens when a hero falls') : '';
}

export function openBlock(rec, f, step, steps) {
  const why = joinBlock(rec, f, step, steps, '');
  if (why && why !== t('worldboss.data.allFull', null, 'Every room is full: a slot opens when a hero falls')) return why;
  if (rec.room) return t('worldboss.data.oneRoom', null, 'You can open one room per event');
  return step + fillSteps() >= steps
    ? t('worldboss.data.tooLate', { count: Math.round(WORLD_BOSS.fill / 60) }, {
      one: 'Too late to open a room: it needs {count} minutes to gather its Heroes before the event ends',
      other: 'Too late to open a room: it needs {count} minutes to gather its Heroes before the event ends',
    })
    : '';
}

export function cancelBlock(rec, f) {
  if (!rec.room || rec.room.cancelAt != null) return t('worldboss.data.noOpenRoom', null, 'You have no open room');
  const r = f.rooms[f.roomOf(rec.room.code)];
  if (!r) return t('worldboss.data.noOpenRoom', null, 'You have no open room');
  if (r.expired) return t('worldboss.data.eventOver', null, 'The event is over');
  return r.started ? t('worldboss.data.noCancel', null, 'The fight in your room has started: it can no longer be cancelled') : '';
}

export function startBlock(rec, f, step, steps) {
  if (!rec.room || rec.room.cancelAt != null) return t('worldboss.data.onlyHost', null, 'Only the host of a room can start its expedition');
  const r = f.rooms[f.roomOf(rec.room.code)];
  if (!r) return t('worldboss.data.onlyHost', null, 'Only the host of a room can start its expedition');
  if (rec.room.startAt != null || r.started) return t('worldboss.data.expStarted', null, 'The expedition has already started');
  if (f.killStep != null) return t('worldboss.data.bossFallen', null, 'The boss has already fallen');
  if (step >= steps || rec.stopAt != null || r.expired) return t('worldboss.data.eventOver', null, 'The event is over');
  const min = WORLD_BOSS.roomMin;
  return r.alive < min ? t('worldboss.data.needMin', { min, alive: r.alive }, 'At least {min} Heroes are needed to start: {alive} inside') : '';
}

export function kickBlock(rec, f, step, steps, name) {
  const notHost = () => t('worldboss.data.kickHost', null, 'Only the host of a room can kick a Hero out of its lobby');
  if (!rec.room || rec.room.cancelAt != null) return notHost();
  const r = f.rooms[f.roomOf(rec.room.code)];
  if (!r) return notHost();
  if (name === 'You' || name === r.host) return t('worldboss.data.kickSelf', null, 'The host cannot kick itself out');
  if (rec.room.startAt != null || r.started) return t('worldboss.data.expStarted', null, 'The expedition has already started');
  if (f.killStep != null) return t('worldboss.data.bossFallen', null, 'The boss has already fallen');
  if (step >= steps || rec.stopAt != null || r.expired) return t('worldboss.data.eventOver', null, 'The event is over');
  return r.lords.has(name) ? '' : t('worldboss.data.kickAbsent', null, 'That lord is not in your lobby');
}

export function lobbyOf(f, code) {
  const i = f.roomOf(code);
  const r = f.rooms[i];
  if (!r) return null;
  const lords = [];
  for (const x of f.heroes.values()) {
    if (x.room !== i) continue;
    lords.push({ name: x.lord, key: x.key, rarity: x.key.replace(/^realm_/, ''), power: Math.round(powerOf(x)), host: x.lord === r.host, me: x.lord === 'You' });
  }
  const min = WORLD_BOSS.roomMin;
  return { i, no: i + 1, code: r.code, host: r.host, started: r.started, cancelled: r.cancelled, expired: r.expired, alive: r.alive, cap: WORLD_BOSS.roomCap, min, ready: r.alive >= min, lords };
}

export function expiredEntry(rec, f) {
  const j = liveJoins(rec)[0];
  if (!j) return false;
  if (f.killStep != null && f.heroes.get(MY_HERO)?.dmg === 0) return true;
  return !!(j.room && f.rooms[f.roomOf(j.room)]?.expired && !f.heroes.has(MY_HERO));
}
