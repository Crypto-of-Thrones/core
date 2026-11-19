import { PVP } from './data.js';
import { fight, upsetFight } from './hero.js';
import { fieldPower, fieldLuck, battleId, luckRoll } from './fieldluck.js';

export const H = 3600e3;
export const DAY = 24 * H;

export const hourOf = (now) => Math.floor(now / H);
export const dayOf = (now) => Math.floor(now / DAY);

export const listFloor = () => PVP.listMin;

export const countedMin = (chest) => Math.min(chest * PVP.counted, PVP.countedFlat);

export const defenseReturnPct = (n) => Math.max(0, Math.round((PVP.defenseReturnPct - (Math.max(1, n) - 1) * PVP.defenseReturnStep) * 1e4) / 1e4);

export const battlePower = fieldPower;

export const ladderEligible = (att, dfd) => battlePower(att) >= PVP.defenseBand * battlePower(dfd);


export function battle(att, dfd, { id, round, roll, seed, revenge = false }) {
  const log = [];
  let out = fight(att, dfd, log, seed);
  const luck = fieldLuck(att, dfd, out.won, roll, revenge);
  if (luck.upset) {
    log.length = 0;
    out = upsetFight(att, dfd, log, seed);
  }
  const stats = (f) => ({ atk: f.atk, def: f.def, hp: f.hp });
  return { out, log, luck: { id, round, u: luck.u, roll, up: luck.upset, rev: !!revenge, att: stats(att), dfd: stats(dfd) } };
}

export function resolveRaid(k, randomness) {
  let won = true;
  let log = [];
  let luck = null;
  if (!k.free) {
    const roll = luckRoll(randomness, k.battle);
    const seed = Math.floor(luckRoll(randomness, battleId(k.battle, 'seed', '', '')) * 4294967296);
    const b = battle(k.att, k.dfd, { id: k.battle, round: k.round, roll, seed, revenge: k.revenge });
    ({ log, luck } = b);
    won = b.out.won;
  }
  const take = won ? Math.floor(Math.min(k.chest * PVP.take, k.lootLeft)) : 0;
  const gain = Math.floor(take * PVP.toRaider);
  const counted = won && take >= countedMin(k.chest / 1000) * 1000;
  return { won, take, gain, burned: take - gain, counted, log, luck };
}
