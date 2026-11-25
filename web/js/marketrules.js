import { HEROES, CASTLES, MARKET, ECONOMY, heroValue, heroListFloor } from './data.js';

export const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step);

export const taxOf = (price) => Math.round((price * MARKET.tax) / 100);

export function marketFee(price) {
  const m = ECONOMY.market;
  const burn = Math.round((price * m.burnPct) / 100);
  return { burn, treasury: Math.round((price * (m.burnPct + m.treasuryPct)) / 100) - burn };
}

export const heroMarket = (key, level, h = null) => Math.max(heroValue(key, level, h), heroListFloor(HEROES[key].rarity, h));
export const valueOf = (l) => (l.kind === 'hero' ? heroMarket(l.hero.key, l.hero.level, l.hero) : l.kind === 'gear' ? MARKET.gearBase[l.item.rarity]
  : l.kind === 'horse' ? MARKET.horseBase[l.horse.rarity]
  : l.kind === 'gem' ? MARKET.gemBase[l.gem.key] * l.gem.n : CASTLES[l.tier].price);
export const floorOf = (l) => (l.kind === 'hero' ? heroListFloor(HEROES[l.hero.key].rarity, l.hero) : 0);
export function priceRange(value, floor = 0) {
  const lo = Math.max(roundTo(value * MARKET.minPrice, 100), floor);
  return [lo, Math.max(lo, roundTo(value * MARKET.maxPrice, 100))];
}
export const rangeOf = (l) => priceRange(valueOf(l), floorOf(l));

export const priceOk = (l, price) => {
  const [lo, hi] = rangeOf(l);
  return Number.isInteger(price) && price >= lo && price <= hi;
};
