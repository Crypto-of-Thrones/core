import { PVP } from './data.js';
import { fight, upsetFight } from './hero.js';
import { fieldPower, fieldLuck, battleId, luckRoll } from './fieldluck.js';

export const H = 3600e3;
export const DAY = 24 * H;

export const newbieEnd = (born) => (born < PVP.openAt ? Math.min(born + PVP.newbie * H, PVP.openAt) : born + PVP.newbie * H);

export const protectLockEnd = () => PVP.openAt + (PVP.protectLock || 0) * H;
export const protectLockLeft = (now) => (now >= PVP.openAt ? Math.max(0, protectLockEnd() - now) : 0);

export const shieldLeft = (protUntil, now) =>
  (protectLockLeft(now) > 0 && protUntil - PVP.protect * H < PVP.openAt ? 0 : Math.max(0, protUntil - now));

export const safeCut = (now) => (protectLockLeft(now) > 0 ? Math.max(now, PVP.openAt + PVP.protect * H) : now);

export const hourOf = (now) => Math.floor(now / H);
export const dayOf = (now) => Math.floor(now / DAY);

export const listFloor = () => PVP.listMin;

export const countedMin = (chest, flat = PVP.countedFlat) => Math.min(chest * PVP.counted, flat);

export const defenseReturnPct = (n) => Math.max(0, Math.round((PVP.defenseReturnPct - (Math.max(1, n) - 1) * PVP.defenseReturnStep) * 1e4) / 1e4);

export const battlePower = fieldPower;

export const ladderEligible = (att, dfd) => battlePower(att) >= PVP.defenseBand * battlePower(dfd);


export function battle(att, dfd, { id, round, roll, seed, revenge = false, rule }) {
  const log = [];
  let out = fight(att, dfd, log, seed);
  const luck = fieldLuck(att, dfd, out.won, roll, revenge, rule);
  if (luck.upset) {
    log.length = 0;
    out = upsetFight(att, dfd, log, seed);
  }
  const stats = (f) => ({ atk: f.atk, def: f.def, hp: f.hp });
  return { out, log, luck: { id, round, u: luck.u, roll, up: luck.upset, rev: !!revenge, att: stats(att), dfd: stats(dfd) } };
}

export function resolveRaid(k, randomness, { rule, countedFlat } = {}) {
  let won = true;
  let log = [];
  let luck = null;
  if (!k.free) {
    const roll = luckRoll(randomness, k.battle);
    const seed = Math.floor(luckRoll(randomness, battleId(k.battle, 'seed', '', '')) * 4294967296);
    const b = battle(k.att, k.dfd, { id: k.battle, round: k.round, roll, seed, revenge: k.revenge, rule });
    ({ log, luck } = b);
    won = b.out.won;
  }
  const take = won ? Math.floor(Math.min(k.chest * PVP.take, k.lootLeft)) : 0;
  const gain = Math.floor(take * PVP.toRaider);
  const floor = countedMin(k.chest / 1000, countedFlat) * 1000;
  const counted = won && take >= floor;
  return { won, take, gain, burned: take - gain, counted, floor, log, luck };
}
