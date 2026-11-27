import { CASTLES, HEROES, FARM, FARM_BASE_DAYS, castleFarmMult, mintConvert } from './data.js';
import { isTrial } from './trial.js';
import { OIL_PAY } from './hunt.js';
import { FIGHT_HOUR, FIGHT_DAILY } from './promos.js';
import { REALM_LIVE } from './realmlive.js';
import { restFedSec, starvingAt } from './homestead.js';
import { huntSpan, ruleRateOf, restStep, squirePass, brokenOf, hitShieldOf, stakeMultOf, PACE_DEFAULT, LIVE_FLOOR, HUNT_MULT } from './huntsim.js';

export const ENGINE_V = 1;

export const FORGIVE_UNTIL = Date.UTC(2026, 10, 23, 3);

export const HERO_FIELDS = ['id', 'key', 'level', 'energy', 'shield', 'status', 'castle', 'hold', 'pin', 'battery', 'since', 'trial', 'ate', 'mint', 'fedUntil'];

export const FIGHT_Q = FIGHT_DAILY.step;

export function heroSnap(h) {
  const out = {};
  for (const k of HERO_FIELDS) if (h[k] !== undefined) out[k] = h[k];
  return out;
}

export function legInput(heroes, from, to, { live = false, paid, castle = -1, autoSend = true, keep = false, hunger = false, squire = false, squireFarm = false, oilUntil = 0, lots = [], realm = null } = {}) {
  return {
    v: ENGINE_V,
    from,
    to,
    live: !!live,
    ...(paid === 0 ? { paid: 0 } : {}),
    realm: { emission: realm?.emission ?? REALM_LIVE.emission, index: realm?.index ?? REALM_LIVE.index },
    castle: Number.isInteger(castle) && CASTLES[castle] ? castle : -1,
    ...(Number.isInteger(castle) && CASTLES[castle] ? { castleBonus: CASTLES[castle].bonus } : {}),
    farmDays: { ...(realm?.farmDays || FARM.days) },
    autoSend: autoSend !== false,
    keep: !!keep,
    hunger: !!hunger,
    squire: !!squire,
    squireRest: true,
    ...(squire && squireFarm ? { squireFarm: true } : {}),
    ...(hunger ? { hungerHunt: true } : {}),
    oilUntil: live && Number.isFinite(oilUntil) ? oilUntil : 0,
    lots: (lots || []).filter((l) => l && l.pool === 'farm').map((l) => ({ pool: 'farm', amount: l.amount, at: l.at })),
    heroes: heroes.map((h) => mintConvert(heroSnap(h), from)),
  };
}

export function castleIndexOf(castles) {
  const owned = castles?.owned || [];
  const active = castles?.active;
  if (Number.isInteger(active)) return active >= 0 && owned[active] > 0 && CASTLES[active] ? active : -1;
  for (let i = CASTLES.length - 1; i >= 0; i--) if (owned[i] > 0) return i;
  return -1;
}

export function legRules({ castles, squire, boosts, lots } = {}, hunger = false) {
  return {
    castle: castleIndexOf(castles),
    autoSend: castles?.autoSend !== false,
    keep: !!boosts?.keep,
    hunger: !!hunger,
    squire: (squire?.owned || 0) > 0 && squire.on !== false,
    squireFarm: (squire?.owned || 0) > 0 && squire.on !== false,
    oilUntil: Number.isFinite(boosts?.oil) ? boosts.oil : 0,
    lots: lots || [],
  };
}

export function accountForecast(acct, from, to, warShare, hunger = false) {
  const heroes = (acct?.heroes || []).filter((h) => HEROES[h.key]).map((h) => (['work', 'rest', 'idle'].includes(h.status) ? h : { ...h, status: 'idle' }));
  const ids = new Set(heroes.filter((h) => h.status === 'work' && !brokenOf(h) && !isTrial(h)).map((h) => h.id));
  return forecastLeg(legInput(heroes, from, to, { live: true, ...legRules(acct, hunger) }), warShare, ids);
}

export const LEGACY_CASTLE_BONUS = Object.freeze([0, 10, 25, 40, 60, 80]);

export function castleBonusOf(input) {
  if (!(input?.castle >= 0)) return 0;
  if (input.castleBonus === undefined) return LEGACY_CASTLE_BONUS[input.castle] ?? 0;
  if (!Number.isFinite(input.castleBonus) || input.castleBonus < 0) throw new Error(`hunt engine: bad castleBonus ${input.castleBonus}`);
  return input.castleBonus;
}

export const LEGACY_PAYBACK_DAYS = Object.freeze({ common: 82, uncommon: 31.5, rare: 16.9, epic: 12.6, legendary: 9.8, mythic: 7 });

export const LEGACY_FARM_DAYS = Object.freeze(Object.fromEntries(Object.entries(FARM_BASE_DAYS).map(([r, d]) => [r, d / (FARM_BASE_DAYS[r] / (0.8 * LEGACY_PAYBACK_DAYS[r]))])));

export function farmDaysOf(input) {
  if (input?.farmDays === undefined) return LEGACY_FARM_DAYS;
  const days = input.farmDays;
  if (!days || typeof days !== 'object') throw new Error('hunt engine: bad farmDays');
  for (const r of Object.keys(FARM.days)) if (!Number.isFinite(days[r]) || days[r] <= 0) throw new Error(`hunt engine: bad farmDays.${r} ${days[r]}`);
  return days;
}

export function runLeg(input, heroes = null, tap = null) {
  if (!input || input.v !== ENGINE_V) throw new Error(`hunt engine: unknown input version ${input?.v}`);
  const list = heroes || input.heroes.map((h) => ({ ...h }));
  const castle = input.castle >= 0 ? CASTLES[input.castle] : null;
  const castlePay = castleFarmMult(castle && { bonus: castleBonusOf(input) });
  const live = !!input.live;
  const q = {};
  let at = input.from;
  let sent = 0;
  const onPay = live || tap ? (x, trial, h) => {
    if (live) {
      const k = Math.floor(at / FIGHT_Q);
      q[k] ||= [0, 0];
      q[k][trial ? 1 : 0] += x;
    }
    if (tap) tap(x, trial, h);
  } : null;
  const { keep, hunger, autoSend, lots } = input;
  const starve = hunger && input.hungerHunt === true;
  const oilUntil = live ? input.oilUntil || 0 : 0;
  const oil = OIL_PAY / 1000;
  const farmDays = farmDaysOf(input);
  const saved = { emission: REALM_LIVE.emission, index: REALM_LIVE.index, days: FARM.days };
  REALM_LIVE.emission = input.realm?.emission ?? 1;
  REALM_LIVE.index = input.realm?.index ?? 1;
  FARM.days = farmDays;
  try {
    const run = huntSpan(list, input.from, input.to, (part, start) => {
      at = start;
      let stakeAt = -1;
      let stake = 1;
      const stakeNow = () => {
        if (stakeAt !== at) { stakeAt = at; stake = stakeMultOf(lots, part, at); }
        return stake;
      };
      return {
        ...(input.paid === 0 ? { paid: 0 } : {}), share: PACE_DEFAULT, rate: (h) => ruleRateOf(h, stakeNow() * castlePay) * (at < oilUntil ? oil : 1),
        rest: (dt) => { restStep(part, dt, { castle, autoSend, keep, hunger, now: at, starve }); at += dt * 1000; },
        ...(starve ? { fed: (h, dt) => restFedSec(h, true, at, dt) } : {}),
        squire: input.squire ? () => {
          const off = part.filter((h) => h.status !== 'work');
          squirePass(part, castle, input.squireRest === true, input.squireFarm === true ? 'farm' : 'rarity', starve ? (h) => starvingAt(h, true, at) : null);
          sent += off.filter((h) => h.status === 'work').length;
        } : null,
        broken: brokenOf, hit: hitShieldOf, onPay,
      };
    });
    const out = live ? { ...run, q } : run;
    return sent ? { ...out, sent } : out;
  } finally {
    REALM_LIVE.emission = saved.emission;
    REALM_LIVE.index = saved.index;
    FARM.days = saved.days;
  }
}

export function addQuarters(a, b) {
  for (const [k, [e, t]] of Object.entries(b || {})) {
    a[k] ||= [0, 0];
    a[k][0] += e;
    a[k][1] += t;
  }
  return a;
}

export function fightBonus(wins, q, locked) {
  let earned = 0;
  let trial = 0;
  const fight = [];
  for (const w of wins || []) {
    let e = 0;
    let t = 0;
    let quarters = 0;
    for (const [k, [qe, qt]] of Object.entries(q || {})) {
      if (Number(k) * FIGHT_Q < w.start || (Number(k) + 1) * FIGHT_Q > w.end) continue;
      quarters++;
      e += qe;
      t += qt;
    }
    const m = locked ? 0 : FIGHT_HOUR.mult - 1;
    earned += e * m;
    trial += t * m;
    fight.push({ day: w.day, round: w.round, randomness: w.randomness, signature: w.signature, secret: w.secret, commit: w.commit, seed: w.seed, start: w.start, end: w.end, quarters, bonus: e * m, ...(locked ? { locked: true } : {}) });
  }
  return { earned, trial, fight };
}

export const carryLeg = (acc, run) => ({
  earned: (acc?.earned || 0) + run.earned,
  trial: (acc?.trial || 0) + run.trial,
  kills: (acc?.kills || 0) + run.kills,
  fieldSec: (acc?.fieldSec || 0) + run.fieldSec,
  ...(run.q || acc?.q ? { q: addQuarters(addQuarters({}, acc?.q), run.q) } : {}),
});

export function replayHour(engine, fight = []) {
  if (!engine || engine.v !== ENGINE_V || !Array.isArray(engine.legs) || !engine.legs.length) throw new Error('hunt engine: no legs to replay');
  let acc = null;
  for (const leg of engine.legs) acc = carryLeg(acc, runLeg(leg));
  const live = !!engine.legs.at(-1).live;
  const fb = live && fight?.length ? fightBonus(fight, acc.q, !!fight[0].locked) : null;
  return {
    gross: acc.earned + (fb ? fb.earned : 0),
    trial: acc.trial + (fb ? fb.trial : 0),
    kills: acc.kills,
    fieldSec: acc.fieldSec,
  };
}

export function checkHour(refs, warShare) {
  if (!refs?.engine) return { ok: false, why: 'no engine input' };
  let replay;
  try {
    replay = replayHour(refs.engine, refs.fight);
  } catch (e) {
    return { ok: false, why: e.message };
  }
  const why = refs.fixed === true && refs.mult !== HUNT_MULT ? 'mult'
    : replay.gross !== refs.gross ? 'gross'
    : Math.round(replay.kills) !== refs.kills ? 'kills'
      : Math.round(replay.fieldSec) !== refs.fieldSec ? 'fieldSec'
        : refs.earned !== Math.max(0, Math.floor(refs.gross * refs.mult * 1000)) ? 'earned'
          : splitWhy(refs, warShare);
  return why ? { ok: false, why, replay } : { ok: true, replay };
}

export function splitWhy(refs, warShare) {
  const live = refs.live || null;
  const f = refs.forgiven;
  if (f !== undefined) {
    const n = (v) => Number.isSafeInteger(v) && v >= 0;
    if (!live || !f || !n(f.chest) || !n(f.war) || f.chest + f.war === 0 || (f.chest > 0 && refs.chest !== 0) || (f.war > 0 && refs.war !== 0)) return 'forgiven';
    if (!(Number.isFinite(refs.from) && refs.from < FORGIVE_UNTIL)) return 'forgiven';
  }
  const fc = f?.chest || 0;
  const fw = f?.war || 0;
  return live && !liveOk(live, f ? Infinity : refs.gross, warShare) ? 'live'
    : refs.war - fw + (live?.war || 0) !== Math.round(refs.earned * warShare) ? 'war'
      : refs.chest - fc + refs.war + (refs.roiCut || 0) + (live?.earned || 0) !== refs.earned ? 'split' : null;
}


const liveFloorOk = (f) => f === HUNT_MULT || f === LIVE_FLOOR;

export const liveEarned = (gross, floor = HUNT_MULT) => Math.max(0, Math.floor(gross * floor * 1000));

export const liveWar = (earned, warShare) => Math.round(earned * warShare);

export function forecastLeg(input, warShare, ids = null) {
  let part = 0;
  const run = runLeg(input, null, ids ? (x, trial, h) => { if (!trial && ids.has(h.id)) part += x; } : null);
  const gross = ids ? part : run.earned;
  const earned = liveEarned(gross);
  const war = liveWar(earned, warShare);
  return { gross, earned, war, chest: earned - war };
}

export const liveOk = (live, gross, warShare) => {
  const f = live?.floor ?? LIVE_FLOOR;
  return liveFloorOk(f) && Number.isFinite(live?.gross) && live.gross >= 0 && live.gross <= gross
    && live.earned === liveEarned(live.gross, f) && live.war === liveWar(live.earned, warShare);
};

export const checkLive = (r, warShare) => liveFloorOk(r.floor) && Number.isFinite(r.prev) && Number.isFinite(r.gross) && r.prev >= 0 && r.gross >= r.prev
  && r.earned === liveEarned(r.gross, r.floor) - liveEarned(r.prev, r.floor)
  && r.war === liveWar(liveEarned(r.gross, r.floor), warShare) - liveWar(liveEarned(r.prev, r.floor), warShare)
  && r.chest + r.war + (r.roiCut || 0) === r.earned;
