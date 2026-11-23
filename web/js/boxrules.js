import { HEROES, RARITIES, BOXES, BOX_COINS_BASE } from './data.js';

const RARITY_ORDER = Object.keys(RARITIES);

export function pickRarity(u, floor = 'common') {
  const entries = RARITY_ORDER.slice(RARITY_ORDER.indexOf(floor)).map((k) => [k, RARITIES[k].weight]);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let n = u * total;
  for (const [k, w] of entries) { if ((n -= w) < 0) return k; }
  return entries[entries.length - 1][0];
}

export function pickHero(uRarity, uHero, floor) {
  const rarity = pickRarity(uRarity, floor);
  const pool = Object.keys(HEROES).filter((k) => HEROES[k].rarity === rarity);
  return pool[Math.min(pool.length - 1, Math.floor(uHero * pool.length))];
}

export function boxContents(key, u, base = false) {
  const b = BOXES[key];
  const coins = base ? BOX_COINS_BASE[key] : b.coins;
  const out = {
    coins: Math.round(coins[0] + u[0] * (coins[1] - coins[0])),
    gems: b.gems ? Math.round(b.gems[0] + u[1] * (b.gems[1] - b.gems[0])) : 0,
    hero: null,
  };
  if (u[2] < b.hero) out.hero = pickHero(u[3], u[4], b.heroFloor);
  return out;
}
