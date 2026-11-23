import { HEROES, RARITIES, PITY } from './data.js';

const ORDER = Object.keys(RARITIES);
const TOTAL = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0);

export const rarityRank = (r) => ORDER.indexOf(r);

const poolFrom = (floor, top = ORDER.at(-1)) => ORDER.slice(rarityRank(floor), rarityRank(top) + 1);
const poolWeight = (pool) => pool.reduce((s, k) => s + RARITIES[k].weight, 0);

export const rarityChance = (r, floor = ORDER[0], top = ORDER.at(-1)) => {
  const pool = poolFrom(floor, top);
  return pool.includes(r) ? RARITIES[r].weight / poolWeight(pool) : 0;
};

export const floorChance = (floor) => poolWeight(poolFrom(floor)) / TOTAL;

export const emptyPity = () => Object.fromEntries(PITY.map((b) => [b.rarity, 0]));

export function normalizePity(p) {
  const out = emptyPity();
  for (const b of PITY) {
    const v = Number(p?.[b.rarity]);
    if (Number.isFinite(v) && v > 0) out[b.rarity] = Math.min(Math.floor(v), b.at);
  }
  return out;
}

export function rollRarity(rng = Math.random, floor = ORDER[0], top = ORDER.at(-1)) {
  const pool = poolFrom(floor, top);
  let n = rng() * poolWeight(pool);
  for (const k of pool) { if ((n -= RARITIES[k].weight) < 0) return k; }
  return pool[0];
}

export function pullRarity(pity, rng = Math.random, floor = ORDER[0], top = ORDER.at(-1)) {
  const bars = PITY.filter((b) => rarityRank(b.rarity) <= rarityRank(top));
  for (const b of bars) pity[b.rarity] = (pity[b.rarity] || 0) + 1;
  let forced = null;
  for (const b of bars) if (pity[b.rarity] >= b.at && rarityRank(b.rarity) >= rarityRank(floor)) forced = b.rarity;
  const rarity = forced || rollRarity(rng, floor, top);
  for (const b of bars) {
    if (b.rarity === rarity || b.alsoResetBy?.includes(rarity)) pity[b.rarity] = 0;
    else pity[b.rarity] = Math.min(pity[b.rarity], b.at);
  }
  return { rarity, pity: !!forced };
}

export function pickHero(rarity, rng = Math.random) {
  const pool = Object.keys(HEROES).filter((k) => HEROES[k].rarity === rarity);
  return pool[Math.floor(rng() * pool.length)];
}

export function summonBatch(n, pity, rng = Math.random, floor = ORDER[0], top = ORDER.at(-1)) {
  return Array.from({ length: n }, () => {
    const r = pullRarity(pity, rng, floor, top);
    const hero = { key: pickHero(r.rarity, rng), rarity: r.rarity, pity: r.pity };
    return floor === ORDER[0] ? hero : { ...hero, boxed: true };
  });
}

export const SUMMON_REVEAL = Object.freeze({ charge: 900, deal1: 250, deal: 450 });

export const summonRevealMs = (n) => SUMMON_REVEAL.charge + (n === 1 ? SUMMON_REVEAL.deal1 : SUMMON_REVEAL.deal);
