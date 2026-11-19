import { HEROES, RARITIES, FUSION } from './data.js';
import { pickHero } from './summon.js';
import { t } from './i18nsafe.js';
import { isTrial, trialBlock } from './trial.js';

const ORDER = Object.keys(RARITIES);

export const canFuseRarity = (r) => FUSION.from.includes(r);

export function fusionTarget(r, crit = false) {
  if (!canFuseRarity(r)) return null;
  return ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(r) + (crit ? 2 : 1))];
}

export const fusionCount = (n) => Math.floor(Math.max(0, n) / FUSION.size);

export const FUSION_MAX_PICK = 125 * FUSION.size;

export function fuseBlock(hero) {
  if (isTrial(hero)) return trialBlock(hero, 'fuse');
  if (!canFuseRarity(HEROES[hero.key].rarity)) return t('fusion.block.rarity', { rarity: RARITIES[HEROES[hero.key].rarity].label }, '{rarity} mercenaries cannot be fused.');
  if (hero.joust) return t('authority.reason.joustQueue', null, 'This mercenary is enrolled in the Joust queue. Leave the queue first.');
  if (hero.status === 'work') return t('fusion.block.hunting', null, 'Hunting. Bench it in Mercenaries first.');
  if (hero.status === 'rest' && hero.castle) return t('fusion.block.castle', null, 'Resting in a castle slot. Wait until it wakes or bench it first.');
  return '';
}

export function pickBlock(heroes) {
  const n = heroes.length;
  if (!n) return t('fusion.pick.none', { n: FUSION.size }, 'Pick {n} mercenaries of the same rarity.');
  if (n < FUSION.size) return t('fusion.pick.more', { n: FUSION.size - n }, 'Pick {n} more to fuse.');
  if (n > FUSION_MAX_PICK) return t('fusion.pick.max', { max: FUSION_MAX_PICK, extra: n - FUSION_MAX_PICK }, 'One fusion order takes at most {max} mercenaries. Remove {extra}.');
  const extra = n % FUSION.size;
  if (extra) return t('fusion.pick.groups', { size: FUSION.size, more: FUSION.size - extra, extra }, 'Fusions take groups of {size}. Pick {more} more or remove {extra}.');
  const r = HEROES[heroes[0].key].rarity;
  if (heroes.some((x) => HEROES[x.key].rarity !== r)) return t('fusion.pick.oneRarity', null, 'Every picked mercenary must share one rarity.');
  for (const x of heroes) { const why = fuseBlock(x); if (why) return why; }
  return '';
}

export function rollFusions(rarity, n, rng = Math.random) {
  return Array.from({ length: n }, () => {
    const crit = rng() < FUSION.crit;
    const target = fusionTarget(rarity, crit);
    return { key: pickHero(target, rng), rarity: target, crit };
  });
}

export const FUSION_REVEAL = Object.freeze({ charge: 900, lead: 350, step: 260, tail: 300 });

export const fusionRevealMs = (n) => FUSION_REVEAL.charge + FUSION_REVEAL.lead + Math.max(0, n) * FUSION_REVEAL.step + FUSION_REVEAL.tail;
