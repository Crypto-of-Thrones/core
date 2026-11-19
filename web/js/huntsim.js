import { HEROES, RARITIES, FARM, SUMMON_COST, OUTSIDE_REST, BATTERY, FIELD_CAP, SQUIRE, SHIELD_HIT, shieldWear, skillMods, maxShieldOf } from './data.js';
import { payoutMult } from './realmlive.js';
import { squireStep } from './squire.js';
import { maxEnergyOf } from './hunt.js';
import { stakeFarmPct, teamFactor } from './stakerules.js';
import { isTrial, paidFirst, trialFarmMult } from './trial.js';
import { restFed } from './homestead.js';

export const HUNT_STEP_S = 10;
export const AWAY_MAX_S = 7 * 86400;
export const AWAY_MIN_PAY_S = 5;
export const PACE_DEFAULT = 0.8;
export const SETTLE_SPREAD = 0.1;

export const spreadOf = (u) => 1 + SETTLE_SPREAD * (2 * u - 1);

export const LIVE_FLOOR = 1 - SETTLE_SPREAD;

export const HUNT_MULT = 1;

export function huntRun(heroes, sec, { paid = sec, share = 1, rate, rest, squire, broken, hit, onPay = null }) {
  const total = Math.max(0, Number(sec) || 0);
  const pace = Math.max(0, Math.min(1, share));
  let t = 0, earned = 0, trial = 0, kills = 0, huntSec = 0, fieldSec = 0, tick = 0;
  while (t < total) {
    const dt = Math.min(HUNT_STEP_S, total - t);
    const field = paidFirst(heroes.filter((h) => h.status === 'work' && !broken(h))).slice(0, FIELD_CAP);
    let onField = 0;
    for (const h of field) {
      const drain = FARM.huntDrain / 60;
      const on = Math.min(dt, h.energy / drain);
      h.energy = Math.max(0, h.energy - on * drain);
      huntSec += on;
      onField = Math.max(onField, on);
      const pay = Math.max(0, Math.min(on, paid - t));
      if (pay > 0) {
        kills += (pay * pace * FARM.killsPerMin[HEROES[h.key].rarity]) / 60;
        if (isTrial(h)) {
          const x = pay * pace * rate(h);
          trial += x;
          if (onPay) onPay(x, true, h);
        } else {
          const x = pay * pace * rate(h);
          earned += x;
          if (onPay) onPay(x, false, h);
          if (hit(h, shieldWear(h, (pay * SHIELD_HIT.awayPerMin) / 60))) continue;
        }
      }
      if (h.energy <= 0) h.status = 'rest';
    }
    fieldSec += onField;
    rest(dt);
    if (squire && (tick += dt) >= SQUIRE.tick) { tick = 0; squire(); }
    t += dt;
  }
  return { earned, trial, kills, huntSec, fieldSec };
}

export function huntSpan(heroes, from, to, opts) {
  const cuts = [...new Set(heroes.map((h) => h.since).filter((s) => s > from && s < to))].sort((a, b) => a - b);
  const out = { earned: 0, trial: 0, kills: 0, huntSec: 0, fieldSec: 0 };
  let a = from;
  for (const b of [...cuts, to]) {
    if (b > a) {
      const list = heroes.filter((h) => !(h.since > a));
      const r = huntRun(list, (b - a) / 1000, opts(list, a));
      for (const k of Object.keys(out)) out[k] += r[k];
    }
    a = b;
  }
  return out;
}


export function heroPowerOf(hero) {
  const d = HEROES[hero.key];
  return Math.round((d.stats.pow * 3 + d.stats.spd + d.stats.sta * 2 + d.stats.bmb * 4 + d.stats.rng * 4) * RARITIES[d.rarity].mult * (1 + (hero.level - 1) * 0.1));
}

export function restRateOf(hero, castle, keep = false) {
  const base = (hero.castle && castle ? castle.rest : OUTSIDE_REST) + (hero.battery ? BATTERY.bonus : 0);
  return base * (keep ? 1.2 : 1);
}

export const teamPowerOf = (heroes) => heroes.reduce((t, x) => t + (x.status !== 'idle' ? heroPowerOf(x) : 0), 0);

export function stakeMultOf(lots, heroes, at = Infinity) {
  const staked = (lots || []).reduce((t, l) => t + (l.pool === 'farm' && l.at <= at ? l.amount : 0), 0);
  return staked > 0 ? 1 + stakeFarmPct(staked, teamFactor(teamPowerOf(heroes))) / 100 : 1;
}

export function farmPerEnergyOf(h, mult = 1) {
  const r = HEROES[h.key].rarity;
  const perHour = SUMMON_COST / (FARM.days[r] * 24);
  const level = 1 + Math.min(FARM.levelCap, FARM.perLevel * (h.level - 1));
  return (perHour / 60) * (1 / OUTSIDE_REST + 1 / FARM.huntDrain) * level * mult * payoutMult() * trialFarmMult(h);
}

export function killPayOf(h, mult = 1) {
  const r = HEROES[h.key].rarity;
  return (farmPerEnergyOf(h, mult) * FARM.huntDrain * FARM.hitsPerKill[r]) / (FARM.killsPerMin[r] * FARM.hitsPerKill[r]);
}

export const ruleRateOf = (h, mult = 1) => (FARM.killsPerMin[HEROES[h.key].rarity] / 60) * killPayOf(h, mult) * (1 + skillMods(h.key).gold / 100);

export const RETURN_MIN = 0.1;

export const canReturnOf = (h) => h.energy >= Math.max(1, maxEnergyOf(h) * RETURN_MIN);

export const brokenOf = (h) => h.shield <= 0;

export function hitShieldOf(h, points) {
  if (brokenOf(h)) return false;
  h.shield = Math.max(0, h.shield - points);
  if (h.shield > 0) return false;
  h.status = 'idle';
  h.hold = false;
  h.castle = false;
  return true;
}

export function restStep(heroes, dt, { castle = null, autoSend = true, keep = false, hunger = false } = {}) {
  const slots = castle ? castle.slots : 0;
  let inside = 0;
  for (const x of heroes) {
    if (x.status !== 'rest') { x.castle = false; delete x.ate; continue; }
    if (x.castle) { if (inside < slots) inside++; else x.castle = false; }
  }
  if (autoSend && inside < slots) {
    const tired = heroes.filter((x) => x.status === 'rest' && !x.castle && !x.hold && x.energy < maxEnergyOf(x))
      .sort((a, b) => a.energy / maxEnergyOf(a) - b.energy / maxEnergyOf(b));
    for (const x of tired.slice(0, slots - inside)) x.castle = true;
  }
  for (const x of heroes) {
    if (x.status !== 'rest') continue;
    const max = maxEnergyOf(x);
    if (restFed(x, hunger)) x.energy = Math.min(max, x.energy + (dt / 60) * restRateOf(x, castle, keep));
    if (x.energy >= max && !x.hold) {
      x.status = 'idle';
      x.castle = false;
      delete x.ate;
    }
  }
}

export const squirePowerOf = (h) => heroPowerOf(h) - (isTrial(h) ? 1e6 : 0);

const SQUIRE_RARITY_ORDER = Object.keys(RARITIES);
export const squireRankOf = (h) => (isTrial(h) ? -1 : Math.max(0, SQUIRE_RARITY_ORDER.indexOf(HEROES[h.key]?.rarity)));

export function squirePass(heroes, castle = null) {
  const ready = (x) => x.energy >= maxEnergyOf(x) * SQUIRE.ready;
  const bench = heroes.filter((x) => x.status === 'idle' && !brokenOf(x) && ready(x));
  return squireStep(heroes.filter((x) => x.status === 'work' || x.status === 'rest' || bench.includes(x)), {
    cap: FIELD_CAP, slots: castle ? castle.slots : 0, ready: SQUIRE.ready, maxEnergy: maxEnergyOf, maxShield: maxShieldOf, power: squirePowerOf, rank: squireRankOf,
  }) > 0;
}
