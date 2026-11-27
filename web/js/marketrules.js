import { HEROES, CASTLES, MARKET, heroValue, heroListFloor } from './data.js';

export const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step);

export const MARKET_TAX10_FROM = Date.UTC(2026, 10, 27, 0, 0, 0);
export const LEGACY_MARKET_TAX = Object.freeze({ burnPct: 6, treasuryPct: 6 });

export const taxPctAt = (now) => (Number.isFinite(now) && now < MARKET_TAX10_FROM
  ? LEGACY_MARKET_TAX.burnPct + LEGACY_MARKET_TAX.treasuryPct
  : MARKET.tax);

export const taxOf = (price, now) => Math.round((price * taxPctAt(now)) / 100);

export function marketFee(price, now) {
  const tax = taxOf(price, now);
  if (!(Number.isFinite(now) && now < MARKET_TAX10_FROM)) return { team: tax };
  const burn = Math.round((price * LEGACY_MARKET_TAX.burnPct) / 100);
  return { burn, treasury: tax - burn };
}

export const heroMarket = (key, level, h = null) => Math.max(heroValue(key, level, h), heroListFloor(HEROES[key].rarity, h));
export const valueOf = (l) => (l.kind === 'hero' ? heroMarket(l.hero.key, l.hero.level, l.hero) : l.kind === 'gear' ? MARKET.gearBase[l.item.rarity]
  : l.kind === 'squire' ? MARKET.squireFloor
  : l.kind === 'horse' ? MARKET.horseBase[l.horse.rarity]
  : l.kind === 'gem' ? MARKET.gemBase[l.gem.key] * l.gem.n : CASTLES[l.tier].price);
export const floorOf = (l) => (l.kind === 'hero' ? heroListFloor(HEROES[l.hero.key].rarity, l.hero) : l.kind === 'squire' ? MARKET.squireFloor : 0);
export function priceRange(value, floor = 0) {
  const lo = Math.max(roundTo(value * MARKET.minPrice, 100), floor);
  return [lo, Math.max(lo, roundTo(value * MARKET.maxPrice, 100))];
}
export const rangeOf = (l) => (l.kind === 'horse'
  ? [MARKET.horseFloor, priceRange(valueOf(l))[1]]
  : l.kind === 'squire' ? [MARKET.squireFloor, MARKET.squireTop]
  : priceRange(valueOf(l), floorOf(l)));

export const priceOk = (l, price) => {
  const [lo, hi] = rangeOf(l);
  return Number.isInteger(price) && price >= lo && price <= hi;
};
