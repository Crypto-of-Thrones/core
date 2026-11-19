import { HERO_BOX, BATTLE } from './data.js';
import { t } from './i18nsafe.js';

const ORDER = Object.keys(HERO_BOX.ranks);
const RANKS = HERO_BOX.ranks;
const TOTAL = ORDER.reduce((t, r) => t + RANKS[r].weight, 0);

const rank = (r) => ORDER.indexOf(r);

export const isFreeHero = (hero) => hero?.rarity === 'free';

export const pvpBlock = (hero) => (isFreeHero(hero) ? t('hero.pvp.freeBlock', { name: RANKS.common.name }, 'Open a Hero Box to become a {name} and fight in PvP') : '');

export const nextRarity = (r) => ORDER[rank(r) + 1] || null;

export const boxChance = (r) => RANKS[r].weight / TOTAL;

export function boxOutcomes(r) {
  const out = { up: 0, same: 0, none: 0 };
  for (const k of ORDER) out[rank(k) > rank(r) ? 'up' : k === r ? 'same' : 'none'] += boxChance(k);
  return out;
}

export const realmHeroPower = (hero) => RANKS[hero.rarity].power;

export const realmHeroName = (hero) => RANKS[hero.rarity].name;

export const realmHeroKey = (hero) => `realm_${RANKS[hero.rarity] ? hero.rarity : 'common'}`;

export const boxRefund = () => Math.round(HERO_BOX.price * HERO_BOX.refund);

const between = ([lo, hi], rng) => lo + Math.min(hi - lo, Math.floor(rng() * (hi - lo + 1)));

export const rollStats = (rarity, rng = Math.random) => ({ atk: between(RANKS[rarity].atk, rng), def: between(RANKS[rarity].def, rng) });

export const heroHp = (hero) => RANKS[hero.rarity].hp;

export const fighter = (hero) => ({ atk: hero.atk, def: hero.def, hp: heroHp(hero) });

const inRange = (v, [lo, hi]) => Number.isInteger(v) && v >= lo && v <= hi;

export const freshHero = (rng = Math.random) => ({ rarity: 'free', pity: 0, opened: 0, ...rollStats('free', rng) });

export function normalizeHero(h, rng = Math.random) {
  const out = { rarity: 'common', pity: 0, opened: 0 };
  if (h && typeof h === 'object') {
    if (RANKS[h.rarity]) out.rarity = h.rarity;
    const at = RANKS[out.rarity].pity;
    const p = Math.floor(Number(h.pity));
    if (Number.isFinite(p) && p > 0 && at) out.pity = Math.min(p, at - 1);
    const o = Math.floor(Number(h.opened));
    if (Number.isFinite(o) && o > 0) out.opened = o;
  }
  const r = RANKS[out.rarity];
  if (h && inRange(h.atk, r.atk) && inRange(h.def, r.def)) return { ...out, atk: h.atk, def: h.def };
  return { ...out, ...rollStats(out.rarity, rng) };
}

export function fight(att, dfd, log = null, seed = 0) {
  const hit = (a, d) => Math.max(1, Math.round(a.atk * BATTLE.power * BATTLE.armor / (BATTLE.armor + d.def)));
  const rng = seededRng(seed >>> 0);
  const coinA = rng() < 0.5;
  let opener = rng() < 0.5 ? 'att' : 'dfd';
  let ha = att.hp;
  let hd = dfd.hp;
  for (let i = 0; i < BATTLE.rounds; i++) {
    const toA = hit(dfd, att);
    const toD = hit(att, dfd);
    const na = ha - toA;
    const nd = hd - toD;
    const end = na <= 0 || nd <= 0 || i === BATTLE.rounds - 1;
    let won = nd <= 0 && na > 0;
    let coin = false;
    if (end && (na <= 0) === (nd <= 0)) {
      const share = na / att.hp - nd / dfd.hp;
      const sum = (att.atk + att.def + att.hp) - (dfd.atk + dfd.def + dfd.hp);
      coin = !share && !sum;
      won = share ? share > 0 : sum ? sum > 0 : coinA;
    }
    const sA = end && won && na <= 0 ? ha - 1 : toA;
    const sD = end && !won && nd <= 0 ? hd - 1 : toD;
    ha -= sA;
    hd -= sD;
    if (log) {
      const sa = { by: 'dfd', dmg: sA, hp: Math.max(0, ha) };
      const sd = { by: 'att', dmg: sD, hp: Math.max(0, hd) };
      const attFirst = end && (na <= 0 || nd <= 0) ? !won : opener === 'att';
      log.push(...(attFirst ? [sd, sa] : [sa, sd]));
      opener = opener === 'att' ? 'dfd' : 'att';
    }
    if (end) return { won, hpA: Math.max(0, ha), hpD: Math.max(0, hd), coin };
  }
  return { won: false, hpA: ha, hpD: hd, coin: false };
}

export function upsetFight(att, dfd, log = null, seed = 0) {
  const fav = fight(att, dfd, null, seed).won;
  for (let k = 1.1, i = 0; i < 400; k *= 1.1, i++) {
    const a = fav ? att : { ...att, atk: Math.ceil(att.atk * k) };
    const d = fav ? { ...dfd, atk: Math.ceil(dfd.atk * k) } : dfd;
    const tmp = [];
    const out = fight(a, d, tmp, seed);
    if (out.won !== fav) {
      if (log) log.push(...tmp);
      return out;
    }
  }
  return { won: !fav, hpA: fav ? 0 : att.hp, hpD: fav ? dfd.hp : 0, coin: false };
}

export const seededRng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const winChance = (att, dfd) => {
  const out = fight(att, dfd);
  return out.coin ? 0.5 : out.won ? 1 : 0;
};

export const canOpenBox = (hero) => !!nextRarity(hero.rarity);

export function boxesToGuarantee(hero) {
  const at = RANKS[hero.rarity].pity;
  return at ? at - hero.pity : null;
}

export function rollBox(rng = Math.random) {
  let n = rng() * TOTAL;
  for (const r of ORDER) { if ((n -= RANKS[r].weight) < 0) return r; }
  return 'common';
}

export function openBox(hero, rng = Math.random, fixed = null) {
  if (!canOpenBox(hero)) return null;
  const from = hero.rarity;
  hero.pity += 1;
  hero.opened += 1;
  let rolled = fixed || rollBox(rng);
  let forced = false;
  if (!fixed && rank(rolled) <= rank(from) && hero.pity >= RANKS[from].pity) {
    rolled = nextRarity(from);
    forced = true;
  }
  const up = rank(rolled) > rank(from);
  if (up) Object.assign(hero, { rarity: rolled, pity: 0 }, rollStats(rolled, rng));
  return { rolled, from, to: hero.rarity, up, forced, refund: !up && rolled === from ? boxRefund() : 0 };
}

export function openBatch(hero, n, rng = Math.random) {
  const boxes = [];
  while (boxes.length < n && canOpenBox(hero)) boxes.push(openBox(hero, rng));
  const unopened = n - boxes.length;
  const paid = n * HERO_BOX.price;
  const refund = boxes.reduce((t, x) => t + x.refund, 0);
  const back = unopened * HERO_BOX.price;
  return { boxes, unopened, paid, refund, back, net: paid - refund - back };
}
