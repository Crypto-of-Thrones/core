
import { DESCENT, HERO, DIRS, ACT } from './descentsim.js';
import { BATTLE } from './data.js';

export const TICK_HZ = 20;
export const TICK_MS = 1000 / TICK_HZ;
const DESCENT_HZ = 60;
const sec = (t) => Math.round(t * TICK_HZ);
const ease = (k) => 1 - (1 - k) ** (DESCENT_HZ / TICK_HZ);

export const ACT_ATTACK = ACT.skill1;
export const DUEL_ACTS = Object.freeze([ACT.none, ACT_ATTACK, ACT.dodge]);

export const GUARD = Object.freeze({ speed: 0.5, cut: 7 });
export const guardCut = (n) => Math.max(1, Math.round((n * (10 - GUARD.cut)) / 10));

export const MELEE_RANGE = 60;

export const SWING = Object.freeze({ wind: sec(0.2), cd: Math.max(sec(0.2), Math.round(HERO.cd * 0.85 * TICK_HZ)) });

export const DUEL_FIGHT = Object.freeze({
  connectMs: 20e3,
  countMs: 3e3,
  maxTicks: 90 * TICK_HZ,
  graceMs: 10e3,
  inputRate: 40,
  actsQueued: 2,
});

export const START = Object.freeze({ a: Object.freeze([-150, 30]), b: Object.freeze([150, 30]) });

const R = DESCENT.heroRadius;
const SPEED = HERO.speed / TICK_HZ;
const ACCEL = ease(HERO.accel);
const GLIDE = ease(HERO.glide);
const STOP = (HERO.stop * DESCENT_HZ) / TICK_HZ;
const ROLL_TICKS = Math.max(2, Math.round((DESCENT.rollTicks * TICK_HZ) / DESCENT_HZ));
const ROLL_GRACE = Math.max(1, Math.round((DESCENT.rollGrace * TICK_HZ) / DESCENT_HZ));
const DODGE_CD = Math.round((DESCENT.dodgeCd * TICK_HZ) / DESCENT_HZ);
export const ROLL = Object.freeze({ ticks: ROLL_TICKS, grace: ROLL_GRACE, cd: DODGE_CD, dist: DESCENT.rollDist });

export const strike = (atk, def) => Math.max(1, Math.round((atk * BATTLE.power * BATTLE.armor) / (BATTLE.armor + def)));

export const isFighter = (f) => !!f && [f.atk, f.def, f.hp].every((v) => Number.isSafeInteger(v) && v >= 0) && f.hp >= 1;

function newHero(f, at, fx) {
  return {
    x: at[0], y: at[1], vx: 0, vy: 0, fx, fy: 0,
    hp: f.hp, maxHp: f.hp, atk: f.atk, def: f.def,
    cd: 0,
    dodgeCd: 0,
    invTo: 0,
    roll: null,
    wind: 0,
    guard: false,
    acts: [],
    hits: 0,
  };
}

export function newDuel(a, b, maxTicks = DUEL_FIGHT.maxTicks) {
  if (!isFighter(a) || !isFighter(b)) throw new Error('duel: bad fighter');
  if (!Number.isSafeInteger(maxTicks) || maxTicks < 1) throw new Error('duel: bad time limit');
  return { tick: 0, phase: 'fight', maxTicks, a: newHero(a, START.a, 1), b: newHero(b, START.b, -1), dir: [0, 0], guard: [0, 0], end: null };
}

export const validInput = (dir, act, guard = 0) => Number.isInteger(dir) && dir >= 0 && dir < DIRS.length && DUEL_ACTS.includes(act) && (guard === 0 || guard === 1);

export function feed(s, side, dir, act = 0, guard = 0) {
  if (s.phase !== 'fight' || (side !== 'a' && side !== 'b') || !validInput(dir, act, guard)) return false;
  s.dir[side === 'a' ? 0 : 1] = dir;
  (s.guard ||= [0, 0])[side === 'a' ? 0 : 1] = guard;
  const h = s[side];
  if (act && h.acts.length < DUEL_FIGHT.actsQueued) h.acts.push(act);
  return true;
}

const dist2 = (p, q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;

function keepIn(h) {
  const lx = DESCENT.halfW - R, ly = DESCENT.halfD - R;
  if (h.x > lx || h.x < -lx) { if (h.vx * h.x > 0) h.vx = 0; h.x = h.x > 0 ? lx : -lx; }
  if (h.y > ly || h.y < -ly) { if (h.vy * h.y > 0) h.vy = 0; h.y = h.y > 0 ? ly : -ly; }
}

function walk(h, v) {
  const sp = h.guard ? SPEED * GUARD.speed : SPEED;
  const tx = v ? v[0] * sp : 0, ty = v ? v[1] * sp : 0;
  const k = v ? ACCEL : GLIDE;
  h.vx += (tx - h.vx) * k;
  h.vy += (ty - h.vy) * k;
  if (!v && h.vx * h.vx + h.vy * h.vy < STOP * STOP) { h.vx = 0; h.vy = 0; }
  h.x += h.vx;
  h.y += h.vy;
  if (v && !h.guard) { h.fx = v[0]; h.fy = v[1]; }
  keepIn(h);
}

function setGuard(h, o, held) {
  const up = !!held && !h.roll;
  if (up && !h.guard) {
    h.wind = 0;
    const d = Math.sqrt(dist2(h, o)) || 1;
    h.fx = (o.x - h.x) / d;
    h.fy = (o.y - h.y) / d;
  }
  h.guard = up;
}

const frontal = (o, h) => (h.x - o.x) * o.fx + (h.y - o.y) * o.fy > 0;

function rollStep(h) {
  const m = h.roll;
  const k = (2 * m.left) / (m.n + 1);
  const sx = m.vx * k, sy = m.vy * k;
  h.x += sx;
  h.y += sy;
  keepIn(h);
  if (m.left === 1) {
    const v = Math.sqrt(sx * sx + sy * sy);
    const c = v > SPEED ? SPEED / v : 1;
    h.vx = sx * c;
    h.vy = sy * c;
  }
  if (--m.left <= 0) h.roll = null;
}

function act(s, h, o, v, out, side) {
  const a = h.acts.shift();
  if (!a || h.roll) return;
  if (a === ACT.dodge) {
    if (h.dodgeCd > 0) return;
    const ax = v ? v[0] : h.fx, ay = v ? v[1] : h.fy;
    h.wind = 0;
    h.guard = false;
    h.roll = { left: ROLL_TICKS, n: ROLL_TICKS, vx: (ax * ROLL.dist) / ROLL_TICKS, vy: (ay * ROLL.dist) / ROLL_TICKS };
    h.dodgeCd = DODGE_CD;
    h.invTo = s.tick + ROLL_TICKS + ROLL_GRACE;
    out?.push({ t: 'dodge', side });
    return;
  }
  if (a === ACT_ATTACK) {
    if (h.cd > 0 || h.wind || h.guard) return;
    h.wind = SWING.wind;
    h.cd = SWING.cd;
    const d = Math.sqrt(dist2(h, o)) || 1;
    h.fx = (o.x - h.x) / d;
    h.fy = (o.y - h.y) / d;
    out?.push({ t: 'swing', side });
  }
}

function separate(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const min = 2 * R;
  if (d >= min) return;
  const ux = d > 1e-9 ? dx / d : 1, uy = d > 1e-9 ? dy / d : 0;
  const push = (min - d) / 2;
  a.x -= ux * push; a.y -= uy * push;
  b.x += ux * push; b.y += uy * push;
  keepIn(a);
  keepIn(b);
}

function blow(s, h, o) {
  if (!h.wind || --h.wind > 0) return null;
  const reach = MELEE_RANGE + R;
  if (dist2(h, o) > reach * reach) return 0;
  if (s.tick < o.invTo) return -1;
  return strike(h.atk, o.def);
}

function shareAhead(a, b) {
  const x = Math.max(0, a.hp) * b.maxHp, y = Math.max(0, b.hp) * a.maxHp;
  return x === y ? null : x > y;
}

function finish(s, winner, reason, out) {
  s.phase = 'end';
  s.end = { winner, reason, tick: s.tick, hpA: Math.max(0, s.a.hp), hpB: Math.max(0, s.b.hp), maxA: s.a.maxHp, maxB: s.b.maxHp, hitsA: s.a.hits, hitsB: s.b.hits };
  out?.push({ t: 'end', winner, reason });
}

function byShare(s, reason, out) {
  const ahead = shareAhead(s.a, s.b);
  finish(s, ahead === null ? null : ahead ? 'a' : 'b', reason, out);
}

export function stepDuel(s, out = null) {
  if (s.phase !== 'fight') return s;
  s.tick++;
  const { a, b } = s;
  for (const h of [a, b]) {
    if (h.cd > 0) h.cd--;
    if (h.dodgeCd > 0) h.dodgeCd--;
  }
  const va = s.dir[0] > 0 ? DIRS[s.dir[0]] : null;
  const vb = s.dir[1] > 0 ? DIRS[s.dir[1]] : null;
  const g = s.guard || [0, 0];
  setGuard(a, b, g[0]);
  setGuard(b, a, g[1]);
  act(s, a, b, va, out, 'a');
  act(s, b, a, vb, out, 'b');
  if (a.roll) rollStep(a); else walk(a, va);
  if (b.roll) rollStep(b); else walk(b, vb);
  separate(a, b);
  const toB = blow(s, a, b);
  const toA = blow(s, b, a);
  for (const [n, h, o, side] of [[toB, a, b, 'a'], [toA, b, a, 'b']]) {
    if (n === null) continue;
    if (n > 0) {
      const blocked = o.guard && frontal(o, h);
      const dmg = blocked ? guardCut(n) : n;
      o.hp = Math.max(0, o.hp - dmg);
      h.hits++;
      out?.push(blocked ? { t: 'block', side, n: dmg, hp: o.hp } : { t: 'hit', side, n: dmg, hp: o.hp });
    } else out?.push({ t: n < 0 ? 'evade' : 'miss', side });
  }
  if (a.hp <= 0 && b.hp <= 0) byShare(s, 'ko', out);
  else if (a.hp <= 0) finish(s, 'b', 'ko', out);
  else if (b.hp <= 0) finish(s, 'a', 'ko', out);
  else if (s.tick >= s.maxTicks) byShare(s, 'time', out);
  return s;
}

export function forfeit(s, side, both = false) {
  if (s.phase !== 'fight') return s;
  if (both) finish(s, null, 'noshow');
  else finish(s, side === 'a' ? 'b' : 'a', 'forfeit');
  return s;
}


export const logRow = (tick, side, dir, act, guard = 0) => {
  const row = [tick, side === 'a' ? 0 : side === 'b' ? 1 : 2, dir, act];
  if (guard === 1) row.push(1);
  return row;
};

export function replayDuel(a, b, log, maxTicks = DUEL_FIGHT.maxTicks) {
  const s = newDuel(a, b, maxTicks);
  let i = 0;
  while (s.phase === 'fight') {
    while (i < log.length && log[i][0] === s.tick) {
      const row = log[i++];
      const [, side, dir, act] = row;
      if (dir === -1) { forfeit(s, side === 0 ? 'a' : 'b', side === 2); break; }
      if (row.length > 5 || (row.length === 5 && row[4] !== 1)) throw new Error('duel replay: bad row');
      if (!feed(s, side === 0 ? 'a' : 'b', dir, act, row.length === 5 ? 1 : 0)) throw new Error('duel replay: bad row');
    }
    if (s.phase !== 'fight') break;
    if (i < log.length && log[i][0] < s.tick) throw new Error('duel replay: rows out of order');
    stepDuel(s);
  }
  return s.end;
}

export async function duelSideId(match, acct) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`cot-duel-side\n${match}\n${acct}`));
  return [...new Uint8Array(d)].slice(0, 16).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export const duelRecord = (m) => (m.v === 2 ? JSON.stringify({
  v: 2, match: m.match, hz: TICK_HZ, max: m.max ?? DUEL_FIGHT.maxTicks,
  a: { fighter: { atk: m.a.fighter.atk, def: m.a.fighter.def, hp: m.a.fighter.hp } },
  b: { fighter: { atk: m.b.fighter.atk, def: m.b.fighter.def, hp: m.b.fighter.hp } },
  log: m.log, end: m.end,
}) : JSON.stringify({
  v: 1, match: m.match, hz: TICK_HZ, max: m.max ?? DUEL_FIGHT.maxTicks,
  a: { id: m.a.id, fighter: { atk: m.a.fighter.atk, def: m.a.fighter.def, hp: m.a.fighter.hp } },
  b: { id: m.b.id, fighter: { atk: m.b.fighter.atk, def: m.b.fighter.def, hp: m.b.fighter.hp } },
  log: m.log, end: m.end,
}));

export async function duelLogHash(m) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(duelRecord(m)));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function checkDuelLog(r, want) {
  if (r?.v1 === true && r.hashCheck === 'owner') return { status: 'owner' };
  const rec = r?.record;
  if (!rec || typeof rec !== 'object' || !Array.isArray(rec.log) || !rec.end) return { status: 'none' };
  const bad = (why) => ({ status: 'bad', why });
  if (rec.match !== want.match) return bad('match');
  if (want.max !== undefined && (rec.max ?? DUEL_FIGHT.maxTicks) !== want.max) return bad('max');
  const same = (x, y) => !!x && !!y && ['atk', 'def', 'hp'].every((k) => x[k] === y[k]);
  if ((want.a || want.b) && !(same(rec.a?.fighter, want.a) && same(rec.b?.fighter, want.b))) return bad('fighters');
  const ENDS = ['winner', 'reason', 'tick', 'hpA', 'hpB'];
  let end, hash;
  try {
    end = replayDuel(rec.a.fighter, rec.b.fighter, rec.log, rec.max);
    hash = await duelLogHash(rec);
  } catch { return bad('replay'); }
  if (!ENDS.every((k) => end?.[k] === rec.end[k])) return bad('replay');
  if (hash !== want.logHash || (r.hash && r.hash !== hash)) return bad('hash');
  if (want.end && !ENDS.every((k) => end[k] === want.end[k])) return bad('replay');
  return { status: 'ok' };
}

export function heroSnap(s, h) {
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  const flags = (h.roll ? 1 : 0) | (h.wind ? 2 : 0) | (s.tick < h.invTo ? 4 : 0) | (h.guard ? 8 : 0);
  return [r1(h.x), r1(h.y), r1(h.vx), r1(h.vy), r2(h.fx), r2(h.fy), h.hp, flags, h.wind, h.cd, h.dodgeCd];
}
