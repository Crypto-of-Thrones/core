import { EXPEDITION, GEMS, JEWELRY, JEWEL_SLOTS, FORGE, HEROES, MARKET } from './data.js';

export const TIERS = EXPEDITION.tiers;

export const GEM_KEYS = TIERS.map((t) => Object.keys(GEMS).find((k) => GEMS[k].tier === t));

export const JEWEL_TYPES = Object.keys(JEWEL_SLOTS);

export const routeOf = (key) => EXPEDITION.routes.find((r) => r.key === key) || null;

export const boatOf = (tier) => EXPEDITION.boats[tier] || null;

export const voyageMs = (route, tier) => Math.round(route.hours * boatOf(tier).speed * 3600e3);

export const gemArt = (gem) => `gems/${gem}.png`;
export const routeArt = (key) => `expedition/${key}.png`;

export const jewelDef = (slot, tier) => JEWELRY[slot]?.[tier] || null;

export const freshExpedition = () => ({
  boats: [], voyages: [], gems: Object.fromEntries(GEM_KEYS.map((g) => [g, 0])), forge: [], forgeLevel: 0, next: 1,
  found: Object.fromEntries(GEM_KEYS.map((g) => [g, 0])), rest: {},
});

const count = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };

export function normalizeExpedition(e, restore = () => {}) {
  const out = freshExpedition();
  if (!e || typeof e !== 'object') return out;
  if (Array.isArray(e.boats)) out.boats = TIERS.filter((t) => e.boats.includes(t));
  if (Array.isArray(e.voyages)) {
    for (const v of e.voyages) {
      const party = Array.isArray(v?.party) ? v.party.filter((x) => x && HEROES[x.key]) : [];
      const ok = v && routeOf(v.route) && out.boats.includes(v.boat) && !out.voyages.some((w) => w.boat === v.boat)
        && Number.isFinite(v.start) && Number.isFinite(v.end) && v.end >= v.start && party.length && party.length <= boatOf(v.boat).crew;
      if (!ok) { if (party.length) restore(party); continue; }
      const due = Number.isFinite(v.due) && v.due >= v.end ? { due: v.due } : {};
      out.voyages.push({ id: String(v.id), boat: v.boat, route: v.route, start: v.start, end: v.end, ...due, seed: v.seed == null ? null : Number(v.seed) >>> 0, power: count(v.power), party });
    }
  }
  for (const g of GEM_KEYS) { out.gems[g] = count(e.gems?.[g]); out.found[g] = count(e.found?.[g]); }
  if (Array.isArray(e.forge)) {
    for (const f of e.forge) {
      if (!f || !jewelDef(f.slot, f.rarity) || !Number.isFinite(f.start) || !Number.isFinite(f.end) || f.end < f.start) continue;
      out.forge.push({ id: String(f.id), slot: f.slot, rarity: f.rarity, start: f.start, end: f.end });
    }
  }
  out.forgeLevel = forgeLevelOf(e.forgeLevel);
  out.rest = restOf(e.rest);
  out.next = Math.max(count(e.next) || 1, 1);
  for (const r of [...out.voyages, ...out.forge]) { const k = Number(r.id.replace(/^[vf]/, '')); if (Number.isFinite(k) && k >= out.next) out.next = k + 1; }
  return out;
}


function mix(seed, lane) {
  let z = (seed + Math.imul(lane, 0x9e3779b9)) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}

export function sfc32(seed) {
  const s = [mix(seed, 1), mix(seed, 2), mix(seed, 3), 1];
  const next = () => {
    const t = (((s[0] + s[1]) | 0) + s[3]) | 0;
    s[3] = (s[3] + 1) | 0;
    s[0] = s[1] ^ (s[1] >>> 9);
    s[1] = (s[2] + (s[2] << 3)) | 0;
    s[2] = (s[2] << 21) | (s[2] >>> 11);
    s[2] = (s[2] + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) next();
  return next;
}

export const stormChance = (route, power) => (route.risk / 100) * Math.min(1, (route.power + 100) / (Math.max(0, power) + 100));

export const calmHaul = (route, power) => route.haul + Math.min(route.haul, Math.floor(Math.max(0, power - route.power) / EXPEDITION.bonusStep));

export function gemChances(route) {
  const total = route.odds.reduce((a, b) => a + b, 0);
  return Object.fromEntries(GEM_KEYS.map((g, i) => [g, route.odds[i] / total]));
}

export function rollVoyage(route, power, seed) {
  const rng = sfc32(seed >>> 0);
  const storm = rng() < stormChance(route, power);
  const calm = calmHaul(route, power);
  const total = storm ? Math.max(1, Math.floor(calm / 2)) : calm;
  const sum = route.odds.reduce((a, b) => a + b, 0);
  const gems = Object.fromEntries(GEM_KEYS.map((g) => [g, 0]));
  for (let i = 0; i < total; i++) {
    let n = rng() * sum;
    let pick = GEM_KEYS[0];
    for (let j = 0; j < GEM_KEYS.length; j++) { if ((n -= route.odds[j]) < 0) { pick = GEM_KEYS[j]; break; } }
    gems[pick]++;
  }
  return { storm, gems, total };
}

export const GEM_PRICE_DAYS = 3;

const lotOf = (x) => {
  const key = typeof x?.gem === 'string' ? x.gem : x?.gem?.key;
  const n = Number(x?.n ?? x?.gem?.n);
  const price = Number(x?.price);
  return GEM_KEYS.includes(key) && n > 0 && price > 0 && Number.isFinite(price) ? { key, each: price / n } : null;
};

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function gemMarketPrices(sales = [], listings = [], now = Date.now()) {
  const since = now - GEM_PRICE_DAYS * 24 * 3600e3;
  const sold = {};
  const listed = {};
  for (const s of sales) { const l = lotOf(s); if (l && !(s.at < since)) (sold[l.key] ??= []).push(l.each); }
  for (const x of listings) { const l = lotOf(x); if (l) listed[l.key] = Math.min(listed[l.key] ?? Infinity, l.each); }
  return Object.fromEntries(GEM_KEYS.map((g) => [g,
    sold[g] ? { price: median(sold[g]), source: 'sales' }
      : listed[g] ? { price: listed[g], source: 'listing' }
        : { price: MARKET.gemBase[g], source: 'reference' }]));
}

export function voyageValue(route, tier, power, huntPerHour = 0, prices = null) {
  const hours = voyageMs(route, tier) / 3600e3;
  const storm = stormChance(route, power);
  const calm = calmHaul(route, power);
  const gems = (1 - storm) * calm + storm * Math.max(1, Math.floor(calm / 2));
  const ch = gemChances(route);
  const of = (g) => prices?.[g] || { price: MARKET.gemBase[g], source: 'reference' };
  const perGem = GEM_KEYS.reduce((t, g) => t + ch[g] * of(g).price, 0);
  const used = new Set(GEM_KEYS.filter((g) => ch[g] > 0).map((g) => of(g).source));
  const source = used.size === 1 ? [...used][0] : 'mixed';
  const gross = gems * perGem;
  return { hours, storm, gems, gross, cargo: gross * (1 - MARKET.tax / 100), source, hunt: Math.max(0, huntPerHour) * hours };
}


export const recipeOf = (tier) => FORGE.recipes[tier] || null;

export const FORGE_MAX = FORGE.upgrades.length;

export const forgeLevelOf = (v) => Math.min(FORGE_MAX, Math.max(0, Math.floor(Number(v)) || 0));

export const forgeUpgradePrice = (level) => FORGE.upgrades[forgeLevelOf(level)] || 0;

export const forgeBonus = (d, level) => {
  const l = forgeLevelOf(level);
  if (!d || !l) return d;
  return { ...d, atk: d.atk > 0 ? d.atk + l : 0, def: d.def > 0 ? d.def + l : 0, hp: d.hp > 0 ? d.hp + l : 0 };
};

export const hasGems = (gems, tier) => Object.entries(recipeOf(tier)?.gems || {}).every(([g, n]) => (gems[g] || 0) >= n);

export const timeLeft = (job, now = Date.now()) => Math.max(0, Math.ceil((job.end - now) / 1000));

export const jobDone = (job, now = Date.now()) => now >= job.end;


export const voyageDue = (v) => (Number.isFinite(v?.due) ? v.due : v.end);

export const boatReadyAt = (v) => voyageDue(v) + (voyageDue(v) - v.start);

export const boatRestLeft = (rest, tier, now = Date.now()) => Math.max(0, (Number(rest?.[tier]) || 0) - now);

export const seaCap = (boats, pass) => (pass === true ? boats : Math.min(boats, EXPEDITION.freeVoyages));

export function rushPrice(system, msLeft) {
  const perHour = EXPEDITION.speedup.perHour?.[system] || 0;
  if (!(perHour > 0)) return null;
  return msLeft > 0 ? Math.ceil(msLeft / 3600e3) * perHour : 0;
}

export function speedupPrice(v, now = Date.now()) {
  const route = routeOf(v?.route);
  if (!route || !boatOf(v.boat) || !(now < v.end) || !(v.end > v.start)) return 0;
  const hourly = rushPrice('voyage', v.end - now);
  if (hourly !== null) return hourly;
  const { premium, minShare, step } = EXPEDITION.speedup;
  const full = voyageValue(route, v.boat, v.power || 0).gross * premium;
  const left = Math.min(1, Math.ceil(((v.end - now) / (v.end - v.start)) / step - 1e-9) * step);
  return Math.ceil(Math.max(left, minShare) * full);
}

const restOf = (r) => Object.fromEntries(TIERS.filter((t) => Number.isFinite(r?.[t]) && r[t] > 0).map((t) => [t, r[t]]));
