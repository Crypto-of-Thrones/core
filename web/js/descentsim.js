import { BATTLE } from './data.js';
import { ATTACK } from './hunt.js';

export const TICK_HZ = 60;
const sec = (t) => Math.round(t * TICK_HZ);
const ups = (u) => u / TICK_HZ;

export const DESCENT = Object.freeze({
  floors: 100,
  protoFloors: 20,
  bossEvery: 10,
  halfW: 340,
  halfD: 254,
  door: Object.freeze([0, -236]),
  start: Object.freeze([0, 145]),
  floorTicks: 5 * 60 * TICK_HZ,
  spawnGap: sec(0.35),
  firstSpawn: sec(0.5),
  waveBase: 2,
  bossSize: 2,
  bossHp: 15,
  bossDmg: 2,
  bossRest: sec(1.2),
  maxAlive: 10,
  clearTicks: sec(3),
  offer: 3,
  iframes: sec(0.4),
  heroRadius: 14,
  dodgeCd: sec(1.1),
  rollTicks: sec(0.2),
  rollDist: 130,
  rollGrace: sec(0.08),
  enterOut: 24,
  enterPace: 2,
  enterSpread: 0.5,
  enterMin: 120,
});

const FIELD_DIAG = Math.sqrt(DESCENT.halfW * DESCENT.halfW + DESCENT.halfD * DESCENT.halfD);

export const onField = (x, y, r = 0) => Math.abs(x) <= DESCENT.halfW - r && Math.abs(y) <= DESCENT.halfD - r;

export const ACT = Object.freeze({ none: 0, skill1: 1, skill2: 2, skill3: 3, dodge: 4 });
const ACT_MAX = 4;

const D = Math.SQRT1_2;
export const DIRS = Object.freeze([[0, 0], [0, -1], [D, -D], [1, 0], [D, D], [0, 1], [-D, D], [-1, 0], [-D, -D]].map((v) => Object.freeze(v)));
const C1 = Math.sqrt(2 + Math.SQRT2) / 2;
const S1 = Math.sqrt(2 - Math.SQRT2) / 2;

export const STYLE_OF_ATTACK = Object.freeze({ arrow: 'ranged', bomb: 'caster', fire: 'caster', frost: 'caster', holy: 'caster', slash: 'melee', axe: 'melee' });
export const styleOf = (key) => STYLE_OF_ATTACK[ATTACK[key]] || 'melee';

const STYLES = {
  ranged: { range: 250, perRng: 8, shot: ups(420), splash: 0, cd: 1, hp: 1, atk: 1 },
  caster: { range: 215, perRng: 8, shot: ups(320), splash: 40, cd: 1.4, hp: 1, atk: 0.7 },
  melee: { range: 60, perRng: 2, shot: 0, splash: 0, cd: 0.85, hp: 1.3, atk: 1.2 },
};

export const SKILLS = Object.freeze({
  ranged: Object.freeze([
    { id: 'pierce', kind: 'pierce', cd: sec(4), mul: 2.5 },
    { id: 'fan', kind: 'fan', cd: sec(6), mul: 1.2 },
    { id: 'mend', kind: 'regen', cd: sec(14), frac: 0.25 },
  ]),
  caster: Object.freeze([
    { id: 'nova', kind: 'burst', cd: sec(5), mul: 1.8, radius: 120, push: 40 },
    { id: 'blink', kind: 'blink', cd: sec(6), dist: 140, mul: 1.4, radius: 70, push: 20 },
    { id: 'barrier', kind: 'shield', cd: sec(14), frac: 0.35, time: sec(5) },
  ]),
  melee: Object.freeze([
    { id: 'whirl', kind: 'burst', cd: sec(4), mul: 2, radius: 110, reachMul: 1.8, push: 30 },
    { id: 'stun', kind: 'cone', cd: sec(6), mul: 1.8, reachMul: 1.4, cone: D, stun: sec(1.5) },
    { id: 'rally', kind: 'regen', cd: sec(12), frac: 0.35 },
  ]),
});

export const FOES = Object.freeze({
  spider: { kind: 'leap', hp: 14, dmg: 6, speed: ups(84), radius: 14, cd: sec(1.6), reach: 160, hop: 110, wind: sec(0.6), jump: 210, area: 38, dashTicks: sec(0.5) },
  ghoul: { kind: 'charge', hp: 34, dmg: 11, speed: ups(51), radius: 18, cd: sec(2.2), reach: 130, wind: sec(0.5), dash: 170, dashTicks: sec(0.3) },
  archer: { kind: 'shoot', hp: 20, dmg: 9, speed: ups(43), radius: 15, cd: sec(1.3), wind: sec(0.45), keep: 170, bolt: ups(150) },
  wraith: { kind: 'burst', hp: 16, dmg: 13, speed: ups(96), radius: 14, cd: 0, reach: 26, wind: sec(0.45), area: 62 },
  wight: { kind: 'slam', hp: 40, dmg: 14, speed: ups(48), radius: 18, cd: sec(1.6), reach: 40, wind: sec(0.6), area: 76 },
  seer: { kind: 'spread', hp: 24, dmg: 8, speed: ups(40), radius: 15, cd: sec(2.3), keep: 190, bolt: ups(135) },
});

const LUNGES = Object.freeze(['charge']);
export const isLunge = (what) => LUNGES.includes(what);

export const HIT = Object.freeze({ lunge: 6, bolt: 4 });

export const blowOf = (def) => ({ wind: def.wind, area: def.area });

export const STAGES = Object.freeze([
  Object.freeze({ mobs: Object.freeze(['spider', 'ghoul', 'archer']) }),
  Object.freeze({ mobs: Object.freeze(['wraith', 'wight', 'seer']) }),
]);

export const UPGRADES = Object.freeze({
  power: (h) => { h.atk = Math.round(h.atk * 1.2); },
  haste: (h) => { h.cd = Math.max(sec(0.2), Math.round(h.cd * 0.85)); },
  vigor: (h) => { h.maxHp += Math.round(h.maxHp * 0.25); },
  swift: (h) => { h.speed *= 1.1; },
  keen: (h) => { h.crit = Math.min(0.6, h.crit + 0.1); },
  ward: (h) => { h.ward = Math.min(0.5, h.ward + 0.1); },
  reach: (h) => { h.range = Math.round(h.range * 1.15); },
});
const UPGRADE_KEYS = Object.keys(UPGRADES);

export const FOE_SCALE = Object.freeze({ hp: 1.15, dmg: 1.15 });
export const floorScale = (floor) => ({ hp: FOE_SCALE.hp * (1 + 0.2 * (floor - 1)), dmg: FOE_SCALE.dmg * (1 + 0.08 * (floor - 1)) });
export const isBossFloor = (floor) => floor % DESCENT.bossEvery === 0;
export const stageOf = (floor) => Math.min(STAGES.length, Math.ceil(floor / DESCENT.bossEvery));
export const floorInStage = (floor) => ((floor - 1) % DESCENT.bossEvery) + 1;
export const waveSize = (floor) => floor + DESCENT.waveBase;

export function seedOf(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h >>> 0;
}

export function rand(s) {
  s.r = (s.r + 0x6d2b79f5) >>> 0;
  let t = s.r;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const HERO = Object.freeze({ style: 'melee', hp: 100, atk: Object.freeze([4, 0.5]), speed: 160, accel: 0.3, glide: 0.14, stop: 0.05, cd: 0.66 });

export function heroStats(hero) {
  if (!hero || typeof hero.key !== 'string' || !['atk', 'def', 'hp'].every((k) => Number.isFinite(hero[k]))) throw new Error('descent: bad hero');
  const style = HERO.style;
  const p = STYLES[style];
  const maxHp = HERO.hp;
  return {
    key: hero.key,
    style,
    maxHp,
    hp: maxHp,
    atk: Math.max(1, Math.round((HERO.atk[0] + Math.max(0, hero.atk) * HERO.atk[1]) * p.atk)),
    def: Math.max(0, Math.round(hero.def)),
    speed: ups(HERO.speed),
    vx: 0,
    vy: 0,
    cd: Math.max(sec(0.2), Math.round(HERO.cd * TICK_HZ * p.cd)),
    range: p.range,
    shot: p.shot,
    splash: p.splash,
    crit: 0.05,
    ward: 0,
    sk: [0, 0, 0],
    dodgeCd: 0,
    invTo: 0,
    shield: 0,
    shieldTo: 0,
  };
}

export function floorPlan(s, floor) {
  if (isBossFloor(floor)) { const boss = bossOf(s, floor); return [boss, ...STAGES[stageOf(floor) - 1].mobs.filter((k) => k !== boss)]; }
  return Array.from({ length: waveSize(floor) }, () => mobOf(s, floor));
}

export function bossOf(s, floor) {
  const mobs = STAGES[stageOf(floor) - 1].mobs;
  return mobs[Math.floor(rand(s) * mobs.length)];
}

export function mobOf(s, floor) {
  const mobs = STAGES[stageOf(floor) - 1].mobs;
  const w = [[mobs[0], 5], [mobs[1], 3], [mobs[2], 2 + floorInStage(floor) / 10]];
  const total = w.reduce((a, [, v]) => a + v, 0);
  let r = rand(s) * total;
  for (const [key, v] of w) { if (r < v) return key; r -= v; }
  return w[0][0];
}

function startFloor(s, flow = false) {
  const h = s.hero;
  const [x, y] = flow ? [h.x, h.y] : DESCENT.start;
  Object.assign(h, {
    x, y, vx: 0, vy: 0, cdLeft: sec(0.2), hurtAt: -999, atkAt: -999, fx: 0, fy: -1, moving: false,
    sk: [0, 0, 0], dodgeCd: 0, invTo: 0, shield: 0, shieldTo: 0,
    move: null,
    skillAt: -999, skillSlot: 0,
    ...(flow ? { vx: h.vx, vy: h.vy, fx: h.fx, fy: h.fy, moving: h.moving, move: h.move, invTo: h.invTo } : {}),
  });
  s.queue = floorPlan(s, s.floor);
  s.spawned = 0;
  s.killed = 0;
  s.foes = [];
  s.shots = [];
  s.floorTick = 0;
  s.spawnIn = DESCENT.firstSpawn;
  s.sides = [];
  s.offer = [];
  s.lull = 0;
  s.phase = 'fight';
}

export function newRun({ seed, hero, floors = DESCENT.protoFloors, floor = 1 }) {
  const s = {
    v: 11,
    seed: String(seed),
    r: seedOf(seed),
    floors,
    floor: Math.min(floors, Math.max(1, Math.floor(floor) || 1)),
    tick: 0,
    kills: 0,
    picks: [],
    nextId: 1,
    hero: heroStats(hero),
  };
  startFloor(s);
  return s;
}

const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

function keepIn(e, r) {
  if (e.enter) return;
  const lx = DESCENT.halfW - r, ly = DESCENT.halfD - r;
  if (e.x > lx) e.x = lx; else if (e.x < -lx) e.x = -lx;
  if (e.y > ly) e.y = ly; else if (e.y < -ly) e.y = -ly;
}

function moveToward(e, tx, ty, step) {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1e-9) return;
  const k = Math.min(step, d) / d;
  e.x += dx * k;
  e.y += dy * k;
  e.fx = dx / d;
  e.fy = dy / d;
}

const invulnerable = (s) => s.tick < s.hero.invTo;

function hurtHero(s, dmg, out) {
  const h = s.hero;
  if (s.tick - h.hurtAt < DESCENT.iframes || h.hp <= 0) return;
  if (invulnerable(s)) { out?.push({ t: 'evade', x: h.x, y: h.y }); return; }
  const mul = (BATTLE.armor / (BATTLE.armor + h.def)) * (1 - h.ward);
  let n = Math.max(1, Math.round(dmg * mul));
  h.hurtAt = s.tick;
  const soak = Math.min(h.shield, n);
  h.shield -= soak;
  n -= soak;
  if (!n) { out?.push({ t: 'block', x: h.x, y: h.y, n: soak }); return; }
  h.hp = Math.max(0, h.hp - n);
  out?.push({ t: 'hurt', x: h.x, y: h.y, n });
}

function hurtFoe(s, f, dmg, crit, out) {
  if (f.hp <= 0) return;
  f.hp = Math.max(0, f.hp - dmg);
  f.hurtAt = s.tick;
  out?.push({ t: 'hit', id: f.id, x: f.x, y: f.y, n: dmg, crit });
}

function nearest(s) {
  let best = null;
  let bd = Infinity;
  for (const f of s.foes) {
    if (f.hp <= 0) continue;
    const d = dist2(f.x, f.y, s.hero.x, s.hero.y);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}

function heroAttack(s, out) {
  const h = s.hero;
  if (h.cdLeft > 0) { h.cdLeft--; return; }
  const f = nearest(s);
  if (!f) return;
  const reach = h.range + f.radius;
  if (dist2(f.x, f.y, h.x, h.y) > reach * reach) return;
  const crit = rand(s) < h.crit;
  const dmg = crit ? h.atk * 2 : h.atk;
  h.cdLeft = h.cd;
  h.atkAt = s.tick;
  const d = Math.sqrt(dist2(f.x, f.y, h.x, h.y)) || 1;
  h.fx = (f.x - h.x) / d;
  h.fy = (f.y - h.y) / d;
  if (!h.shot) {
    out?.push({ t: 'swing', x: h.x, y: h.y });
    for (const g of s.foes) {
      const r = h.range + g.radius;
      if (g.hp > 0 && dist2(g.x, g.y, h.x, h.y) <= r * r) hurtFoe(s, g, dmg, crit, out);
    }
    return;
  }
  s.shots.push({ id: s.nextId++, own: 'hero', x: h.x, y: h.y, vx: h.fx * h.shot, vy: h.fy * h.shot, dmg, crit, splash: h.splash, ttl: Math.ceil((h.range + 60) / h.shot) });
  out?.push({ t: 'shoot', x: h.x, y: h.y, style: h.style });
}

function moveShots(s, out) {
  const h = s.hero;
  const keep = [];
  for (const b of s.shots) {
    b.x += b.vx;
    b.y += b.vy;
    b.ttl--;
    let done = b.ttl <= 0 || !onField(b.x, b.y);
    if (!done && b.hits) {
      for (const g of s.foes) {
        if (g.hp > 0 && !b.hits.includes(g.id) && dist2(g.x, g.y, b.x, b.y) <= (g.radius + 10) * (g.radius + 10)) {
          b.hits.push(g.id);
          hurtFoe(s, g, b.dmg, b.crit, out);
        }
      }
    } else if (!done && b.own === 'hero') {
      const f = s.foes.find((g) => g.hp > 0 && dist2(g.x, g.y, b.x, b.y) <= (g.radius + 6) * (g.radius + 6));
      if (f) {
        done = true;
        if (b.splash) {
          out?.push({ t: 'blast', x: b.x, y: b.y, r: b.splash });
          for (const g of s.foes) if (g.hp > 0 && dist2(g.x, g.y, b.x, b.y) <= (b.splash + g.radius) * (b.splash + g.radius)) hurtFoe(s, g, b.dmg, b.crit, out);
        } else hurtFoe(s, f, b.dmg, b.crit, out);
      }
    } else if (!done && b.own === 'foe' && !invulnerable(s) && dist2(h.x, h.y, b.x, b.y) <= (DESCENT.heroRadius + HIT.bolt) * (DESCENT.heroRadius + HIT.bolt)) {
      done = true;
      hurtHero(s, b.dmg, out);
    }
    if (!done) keep.push(b);
  }
  s.shots = keep;
}

function bolt(s, f, ux, uy, speed, dmg) {
  s.shots.push({ id: s.nextId++, own: 'foe', key: f.key, x: f.x, y: f.y, vx: ux * speed, vy: uy * speed, dmg, crit: false, splash: 0, ttl: Math.ceil((2 * FIELD_DIAG) / speed) });
}

function windUp(s, f, def, what, out) {
  const h = s.hero;
  const d = Math.sqrt(dist2(f.x, f.y, h.x, h.y));
  if (d > 1e-9) { f.fx = (h.x - f.x) / d; f.fy = (h.y - f.y) / d; }
  f.ax = f.fx;
  f.ay = f.fy;
  if (what === 'leap') {
    const k = d > def.jump ? def.jump / d : 1;
    const t = { x: f.x + (h.x - f.x) * k, y: f.y + (h.y - f.y) * k, enter: false };
    keepIn(t, f.radius);
    f.tx = t.x;
    f.ty = t.y;
  }
  f.wind = blowOf(def, what).wind;
  f.pend = what;
  f.atkAt = s.tick;
  out?.push({ t: 'windup', id: f.id, what, x: f.x, y: f.y });
}

function unleash(s, f, def, out) {
  const h = s.hero;
  const what = f.pend;
  f.pend = '';
  f.atkAt = s.tick;
  if (isLunge(what) || what === 'leap') {
    f.dash = def.dashTicks;
    f.hit = false;
    return;
  }
  if (what === 'shoot') {
    bolt(s, f, f.ax, f.ay, def.bolt, f.dmg);
    f.cdLeft = def.cd;
    out?.push({ t: 'fshoot', id: f.id, x: f.x, y: f.y });
    return;
  }
  const area = blowOf(def, what).area;
  out?.push({ t: 'slam', id: f.id, x: f.x, y: f.y, r: area });
  const r = area + DESCENT.heroRadius;
  if (dist2(f.x, f.y, h.x, h.y) <= r * r) hurtHero(s, f.dmg, out);
  if (what === 'burst' && !f.boss) { f.hp = 0; f.burst = true; }
  else if (what === 'burst') f.cdLeft = DESCENT.bossRest;
  else f.cdLeft = def.cd;
}

function lungeStep(s, f, def, out) {
  const h = s.hero;
  const v = def.dash / def.dashTicks;
  f.x += f.ax * v;
  f.y += f.ay * v;
  f.fx = f.ax;
  f.fy = f.ay;
  f.moving = true;
  const r = f.radius + DESCENT.heroRadius + HIT.lunge;
  if (!f.hit && dist2(f.x, f.y, h.x, h.y) <= r * r) {
    f.hit = true;
    hurtHero(s, f.dmg, out);
  }
  if (--f.dash <= 0) { f.dash = 0; f.cdLeft = def.cd; }
}

function leapStep(s, f, def, out) {
  const h = s.hero;
  f.moving = true;
  if (f.dash > 1) {
    f.x += (f.tx - f.x) / f.dash;
    f.y += (f.ty - f.y) / f.dash;
    f.dash--;
    return;
  }
  f.x = f.tx;
  f.y = f.ty;
  f.dash = 0;
  f.cdLeft = def.cd;
  out?.push({ t: 'slam', id: f.id, x: f.x, y: f.y, r: def.area, land: true });
  if (dist2(f.tx, f.ty, h.x, h.y) <= def.area * def.area) hurtHero(s, f.dmg, out);
}

function foeAct(s, f, out) {
  const h = s.hero;
  const def = FOES[f.key];
  if (f.stun > 0) { f.stun--; f.moving = false; return; }
  if (f.cdLeft > 0) f.cdLeft--;
  const d2 = dist2(f.x, f.y, h.x, h.y);
  const touch = f.radius + DESCENT.heroRadius;
  f.moving = false;
  if (f.enter) {
    moveToward(f, 0, 0, def.speed * DESCENT.enterPace);
    f.moving = true;
    if (onField(f.x, f.y, f.radius)) f.enter = false;
    return;
  }
  if (f.dash) { if (def.kind === 'leap') leapStep(s, f, def, out); else lungeStep(s, f, def, out); }
  else if (f.wind > 0) { if (--f.wind <= 0) unleash(s, f, def, out); }
  else if (def.kind === 'charge' || def.kind === 'leap' || def.kind === 'slam' || def.kind === 'burst') {
    const r = touch + def.reach;
    if (d2 > r * r) { moveToward(f, h.x, h.y, def.speed); f.moving = true; }
    else if (f.cdLeft <= 0) windUp(s, f, def, def.kind, out);
    else if (def.hop && d2 < (touch + def.hop) * (touch + def.hop)) {
      const d = Math.sqrt(d2);
      const ux = d > 1e-9 ? (f.x - h.x) / d : -f.ax, uy = d > 1e-9 ? (f.y - h.y) / d : -f.ay;
      f.x += ux * def.speed;
      f.y += uy * def.speed;
      f.fx = -ux;
      f.fy = -uy;
      f.moving = true;
    }
  } else if (def.kind === 'shoot' || def.kind === 'spread') {
    const d = Math.sqrt(d2);
    if (d > def.keep + 20) { moveToward(f, h.x, h.y, def.speed); f.moving = true; }
    else if (d < def.keep - 30) { moveToward(f, h.x, h.y, -def.speed); f.moving = true; }
    if (def.kind === 'shoot') { if (f.cdLeft <= 0 && d > 1) windUp(s, f, def, 'shoot', out); }
    else if (f.cdLeft <= 0 && d > 1) {
      f.cdLeft = def.cd;
      f.atkAt = s.tick;
      f.fx = (h.x - f.x) / d;
      f.fy = (h.y - f.y) / d;
      for (const [c, sn] of def.kind === 'spread' ? FAN.slice(1, 4) : [[1, 0]]) bolt(s, f, f.fx * c - f.fy * sn, f.fx * sn + f.fy * c, def.bolt, f.dmg);
      out?.push({ t: 'fshoot', id: f.id, x: f.x, y: f.y });
    }
  }
  keepIn(f, f.radius);
}

function separate(s) {
  const L = s.foes;
  for (let i = 0; i < L.length; i++) {
    for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      const min = (a.radius + b.radius) * 0.8;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2);
      const ux = d > 1e-9 ? dx / d : 1, uy = d > 1e-9 ? dy / d : 0;
      const push = (min - d) / 2;
      a.x -= ux * push; a.y -= uy * push;
      b.x += ux * push; b.y += uy * push;
    }
  }
  for (const f of L) keepIn(f, f.radius);
}

export const SIDES = Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]].map((v) => Object.freeze(v)));

function entryPoint(s, r) {
  if (!s.sides.length) {
    const order = [0, 1, 2, 3];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    s.sides = order;
  }
  let side = s.sides.shift();
  const [nx, ny] = SIDES[side];
  const northSouth = nx === 0;
  const across = (northSouth ? DESCENT.halfD : DESCENT.halfW) + r + DESCENT.enterOut;
  const along = (rand(s) - 0.5) * 2 * DESCENT.enterSpread * (northSouth ? DESCENT.halfW : DESCENT.halfD);
  let x = nx * across - ny * along, y = ny * across + nx * along;
  const h = s.hero;
  if (dist2(x, y, h.x, h.y) < DESCENT.enterMin * DESCENT.enterMin) { x = -x; y = -y; side = (side + 2) % 4; }
  return [x, y, side];
}

function spawn(s, out) {
  if (!s.queue.length) return;
  if (s.spawnIn > 0) { s.spawnIn--; return; }
  if (s.foes.length >= DESCENT.maxAlive) return;
  const boss = isBossFloor(s.floor) && s.spawned === 0;
  const key = s.queue.shift();
  s.spawned++;
  const def = FOES[key];
  const sc = floorScale(s.floor);
  const hp = Math.round(def.hp * sc.hp * (boss ? DESCENT.bossHp : 1));
  const radius = def.radius * (boss ? DESCENT.bossSize : 1);
  const [x, y, side] = boss ? [DESCENT.door[0] + (rand(s) - 0.5) * 80, DESCENT.door[1] + radius, -1] : entryPoint(s, radius);
  const f = {
    id: s.nextId++, key, boss, x, y,
    hp, max: hp, dmg: Math.round(def.dmg * sc.dmg * (boss ? DESCENT.bossDmg : 1)), radius, cdLeft: def.cd >> 1, hurtAt: -99, atkAt: -99,
    fx: side < 0 ? 0 : -SIDES[side][0], fy: side < 0 ? 1 : -SIDES[side][1], moving: true, born: s.tick,
    wind: 0, pend: '', dash: 0, hit: false, burst: false,
    enter: side >= 0,
    ax: 0, ay: 0, tx: 0, ty: 0,
    stun: 0,
  };
  keepIn(f, f.radius);
  s.foes.push(f);
  s.spawnIn = DESCENT.spawnGap;
  out?.push({ t: 'spawn', id: f.id, key, boss, x: f.x, y: f.y, side });
}

function drawOffer(s) {
  const pool = [...UPGRADE_KEYS];
  const out = [];
  while (out.length < DESCENT.offer && pool.length) out.push(pool.splice(Math.floor(rand(s) * pool.length), 1)[0]);
  return out;
}

function burst(s, x, y, r, dmg, push, out, id) {
  out?.push(id ? { t: 'burst', x, y, r, id } : { t: 'burst', x, y, r });
  for (const f of s.foes) {
    const reach = r + f.radius;
    if (f.hp <= 0 || dist2(f.x, f.y, x, y) > reach * reach) continue;
    hurtFoe(s, f, dmg, false, out);
    moveToward(f, x, y, -push);
    keepIn(f, f.radius);
  }
}

function coneStrike(s, k, ux, uy, dmg, out) {
  const h = s.hero;
  const r = Math.round(h.range * k.reachMul);
  out?.push({ t: 'cone', x: h.x, y: h.y, ux, uy, r, id: k.id });
  for (const f of s.foes) {
    if (f.hp <= 0) continue;
    const dx = f.x - h.x, dy = f.y - h.y;
    const reach = r + f.radius;
    const d2 = dx * dx + dy * dy;
    if (d2 > reach * reach) continue;
    const d = Math.sqrt(d2);
    if (d > 1e-9 && dx * ux + dy * uy < k.cone * d) continue;
    hurtFoe(s, f, dmg, false, out);
    if (f.hp <= 0) continue;
    if (f.wind > 0 || f.dash > 0) { f.wind = 0; f.pend = ''; f.dash = 0; f.cdLeft = FOES[f.key].cd; }
    f.stun = Math.max(f.stun, f.boss ? Math.round(k.stun / 2) : k.stun);
    out?.push({ t: 'stun', id: f.id, x: f.x, y: f.y });
  }
}

function heroShot(s, ux, uy, speed, dmg, pierce) {
  const h = s.hero;
  const reach = pierce ? 2 * FIELD_DIAG : h.range + 60;
  s.shots.push({ id: s.nextId++, own: 'hero', x: h.x, y: h.y, vx: ux * speed, vy: uy * speed, dmg, crit: false, splash: pierce ? 0 : h.splash, ttl: Math.ceil(reach / speed), ...(pierce ? { hits: [] } : {}) });
}

const FAN = [[D, -D], [C1, -S1], [1, 0], [C1, S1], [D, D]];

function useAct(s, act, ax, ay, out) {
  const h = s.hero;
  if (h.move) return;
  if (!ax && !ay) { ax = h.fx; ay = h.fy; }
  if (act === ACT.dodge) {
    if (h.dodgeCd > 0) return;
    const n = DESCENT.rollTicks;
    h.dodgeCd = DESCENT.dodgeCd;
    h.move = { kind: 'roll', left: n, n, vx: (ax * DESCENT.rollDist) / n, vy: (ay * DESCENT.rollDist) / n, mul: 0, hit: [] };
    h.invTo = s.tick + n + DESCENT.rollGrace;
    h.fx = ax;
    h.fy = ay;
    out?.push({ t: 'dodge', x: h.x, y: h.y });
    return;
  }
  const slot = act - 1;
  const k = SKILLS[h.style][slot];
  if (!k || h.sk[slot] > 0) return;
  h.sk[slot] = k.cd;
  h.skillAt = s.tick;
  h.skillSlot = slot;
  const dmg = Math.round(h.atk * (k.mul || 0));
  out?.push({ t: 'skill', slot, id: k.id, x: h.x, y: h.y });
  if (k.kind === 'pierce' || k.kind === 'fan' || k.kind === 'cone') {
    const f = nearest(s);
    let ux = h.fx, uy = h.fy;
    if (f) {
      const d = Math.sqrt(dist2(f.x, f.y, h.x, h.y));
      if (d > 1e-9) { ux = (f.x - h.x) / d; uy = (f.y - h.y) / d; }
    }
    h.fx = ux;
    h.fy = uy;
    h.atkAt = s.tick;
    const speed = h.shot || ups(420);
    if (k.kind === 'cone') coneStrike(s, k, ux, uy, dmg, out);
    else if (k.kind === 'pierce') heroShot(s, ux, uy, speed * 1.4, dmg, true);
    else for (const [c, sn] of FAN) heroShot(s, ux * c - uy * sn, ux * sn + uy * c, speed, dmg, false);
  } else if (k.kind === 'burst') {
    h.atkAt = s.tick;
    burst(s, h.x, h.y, k.reachMul ? Math.max(k.radius, Math.round(h.range * k.reachMul)) : k.radius, dmg, k.push, out, k.id);
  } else if (k.kind === 'blink') {
    h.x += ax * k.dist;
    h.y += ay * k.dist;
    keepIn(h, DESCENT.heroRadius);
    h.fx = ax;
    h.fy = ay;
    h.atkAt = s.tick;
    h.invTo = Math.max(h.invTo, s.tick + sec(0.15));
    burst(s, h.x, h.y, k.radius, dmg, k.push, out);
  } else if (k.kind === 'dash') {
    const n = k.dashTicks;
    h.move = { kind: 'dash', left: n, vx: (ax * k.dist) / n, vy: (ay * k.dist) / n, mul: k.mul, hit: [] };
    h.invTo = Math.max(h.invTo, s.tick + n + 1);
    h.fx = ax;
    h.fy = ay;
    h.atkAt = s.tick;
  } else if (k.kind === 'regen') {
    const n = Math.min(h.maxHp - h.hp, Math.round(h.maxHp * k.frac));
    h.hp += n;
    out?.push({ t: 'regen', x: h.x, y: h.y, n });
  } else if (k.kind === 'shield') {
    h.shield = Math.round(h.maxHp * k.frac);
    h.shieldTo = s.tick + k.time;
    out?.push({ t: 'shield', x: h.x, y: h.y, n: h.shield });
  }
}

function moveStep(s, out) {
  const h = s.hero;
  const m = h.move;
  const k = m.kind === 'roll' ? (2 * m.left) / (m.n + 1) : 1;
  const sx = m.vx * k, sy = m.vy * k;
  h.x += sx;
  h.y += sy;
  keepIn(h, DESCENT.heroRadius);
  h.moving = true;
  if (m.left === 1) {
    const v = Math.sqrt(sx * sx + sy * sy);
    const c = v > h.speed ? h.speed / v : 1;
    h.vx = sx * c;
    h.vy = sy * c;
  }
  if (m.kind === 'dash') {
    const dmg = Math.round(h.atk * m.mul);
    for (const f of s.foes) {
      const r = f.radius + DESCENT.heroRadius + 12;
      if (f.hp > 0 && !m.hit.includes(f.id) && dist2(f.x, f.y, h.x, h.y) <= r * r) {
        m.hit.push(f.id);
        hurtFoe(s, f, dmg, false, out);
      }
    }
  }
  if (--m.left <= 0) h.move = null;
}

function walk(h, v) {
  const tx = v ? v[0] * h.speed : 0, ty = v ? v[1] * h.speed : 0;
  const k = v ? HERO.accel : HERO.glide;
  h.vx += (tx - h.vx) * k;
  h.vy += (ty - h.vy) * k;
  if (!v && h.vx * h.vx + h.vy * h.vy < HERO.stop * HERO.stop) { h.vx = 0; h.vy = 0; }
  if (!h.vx && !h.vy) return;
  h.x += h.vx;
  h.y += h.vy;
  h.moving = true;
  if (v) { h.fx = v[0]; h.fy = v[1]; }
  const lx = DESCENT.halfW - DESCENT.heroRadius, ly = DESCENT.halfD - DESCENT.heroRadius;
  if (h.x > lx || h.x < -lx) { if (h.vx * h.x > 0) h.vx = 0; h.x = h.x > 0 ? lx : -lx; }
  if (h.y > ly || h.y < -ly) { if (h.vy * h.y > 0) h.vy = 0; h.y = h.y > 0 ? ly : -ly; }
}

export function step(s, dir, out = null, act = 0) {
  if (s.phase !== 'fight') return s;
  s.tick++;
  s.floorTick++;
  const h = s.hero;
  for (let i = 0; i < h.sk.length; i++) if (h.sk[i] > 0) h.sk[i]--;
  if (h.dodgeCd > 0) h.dodgeCd--;
  if (h.shield && s.tick >= h.shieldTo) h.shield = 0;
  const v = DIRS[dir] || DIRS[0];
  const held = dir > 0 && dir < DIRS.length;
  h.moving = held;
  if (act > 0 && act <= ACT_MAX) useAct(s, act, held ? v[0] : 0, held ? v[1] : 0, out);
  if (h.move) moveStep(s, out);
  else walk(h, held ? v : null);
  if (h.move) { if (h.cdLeft > 0) h.cdLeft--; } else heroAttack(s, out);
  moveShots(s, out);
  for (const f of s.foes) if (f.hp > 0) foeAct(s, f, out);
  separate(s);
  const alive = [];
  for (const f of s.foes) {
    if (f.hp > 0) { alive.push(f); continue; }
    if (!f.burst) { s.killed++; s.kills++; }
    out?.push({ t: 'kill', id: f.id, key: f.key, boss: f.boss, x: f.x, y: f.y, fx: f.fx, fy: f.fy });
  }
  s.foes = alive;
  spawn(s, out);
  if (h.hp <= 0) { s.phase = 'dead'; out?.push({ t: 'dead' }); return s; }
  if (s.lull) {
    if (--s.lull) return s;
    if (s.floor >= s.floors) { s.phase = 'won'; out?.push({ t: 'won' }); return s; }
    if (!isBossFloor(s.floor)) {
      s.floor++;
      startFloor(s, true);
      out?.push({ t: 'wave', floor: s.floor });
      return s;
    }
    s.phase = 'pick';
    s.offer = drawOffer(s);
    return s;
  }
  if (!s.queue.length && !s.foes.length) {
    s.foes = [];
    s.queue = [];
    s.shots = s.shots.filter((b) => b.own !== 'foe');
    s.lull = DESCENT.clearTicks;
    out?.push({ t: 'clear', floor: s.floor });
    return s;
  }
  if (s.floorTick >= DESCENT.floorTicks) { s.phase = 'timeout'; out?.push({ t: 'timeout' }); }
  return s;
}

export function pick(s, i) {
  if (s.phase !== 'pick' || !(i >= 0 && i < s.offer.length)) return false;
  const key = s.offer[i];
  UPGRADES[key](s.hero);
  s.picks.push(key);
  s.floor++;
  startFloor(s);
  return true;
}

export const cleared = (s) => (s.phase === 'pick' || s.phase === 'won' || (s.phase === 'fight' && s.lull > 0) ? s.floor : s.floor - 1);

export const summary = (s) => ({ phase: s.phase, floor: s.floor, cleared: cleared(s), tick: s.tick, kills: s.kills, hp: s.hero.hp, picks: s.picks.slice() });

export function createLog() {
  return { v: 2, moves: [], acts: [], picks: [], end: 0 };
}
export function logMove(log, tick, dir) {
  const last = log.moves[log.moves.length - 1];
  if (!last ? dir !== 0 : last[1] !== dir) log.moves.push([tick, dir]);
}
export function logAct(log, tick, act) {
  const last = log.acts[log.acts.length - 1];
  if (!(act > 0 && act <= ACT_MAX) || (last && last[0] >= tick)) return false;
  log.acts.push([tick, act]);
  return true;
}

function checkPairs(list, lo, hi, max) {
  if (!Array.isArray(list) || list.length > max) throw new Error('descent: bad input log');
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!Array.isArray(e) || e.length !== 2) throw new Error('descent: bad input log');
    const [t, c] = e;
    if (!Number.isInteger(t) || !Number.isInteger(c) || t < 1 || c < lo || c > hi || (i && t <= list[i - 1][0])) throw new Error('descent: bad input log');
  }
}

export function replay(opts, log) {
  const s = newRun(opts);
  const most = s.floors * (DESCENT.floorTicks + DESCENT.clearTicks);
  if (!log || typeof log !== 'object') throw new Error('descent: bad input log');
  const moves = log.moves || [];
  const acts = log.acts || [];
  const picks = log.picks || [];
  checkPairs(moves, 0, DIRS.length - 1, most);
  checkPairs(acts, 1, ACT_MAX, most);
  if (!Array.isArray(picks) || picks.length > s.floors || !picks.every(Number.isInteger)) throw new Error('descent: bad input log');
  const end = Math.min(Number.isInteger(log.end) ? log.end : 0, most);
  let m = 0;
  let a = 0;
  let dir = 0;
  let p = 0;
  while (s.tick < end) {
    if (s.phase === 'pick') {
      if (p >= picks.length || !pick(s, picks[p++])) break;
      continue;
    }
    if (s.phase !== 'fight') break;
    const next = s.tick + 1;
    while (m < moves.length && moves[m][0] <= next) dir = moves[m++][1];
    while (a < acts.length && acts[a][0] < next) a++;
    const act = a < acts.length && acts[a][0] === next ? acts[a++][1] : 0;
    step(s, dir, null, act);
  }
  return s;
}
