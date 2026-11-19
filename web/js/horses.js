import { HORSES, HORSE_POWER } from './data.js';
import { t } from './i18nsafe.js';

export const HORSE_RARITIES = Object.keys(HORSES);

export const horseDef = (x) => HORSES[typeof x === 'string' ? x : x?.rarity] || null;

export const horseArt = (rarity) => `horses/horse_${rarity}.png`;

export const horseIcon = (rarity) => `horses/horse_${rarity}_icon.png`;

export function horseStatText(x) {
  const d = horseDef(x);
  if (!d) return '';
  return [['atk', t('gear.stat.atk', null, 'ATK')], ['def', t('gear.stat.def', null, 'DEF')], ['spd', t('horses.stat.spd', null, 'SPD')]]
    .filter(([k]) => d[k] > 0).map(([k, l]) => `+${d[k]} ${l}`).join(' ');
}

export const freshHorses = () => ({ items: [], hero: null, mercs: {}, next: 1 });

export function normalizeHorses(r) {
  const out = freshHorses();
  if (!r || typeof r !== 'object') return out;
  const seen = new Set();
  for (const x of Array.isArray(r.items) ? r.items : []) {
    if (!x || typeof x.id !== 'string' || seen.has(x.id) || !horseDef(x.rarity)) continue;
    seen.add(x.id);
    out.items.push({ id: x.id, rarity: x.rarity });
  }
  const ridden = new Set();
  if (seen.has(r.hero)) { out.hero = r.hero; ridden.add(r.hero); }
  for (const [mid, hid] of Object.entries(r.mercs && typeof r.mercs === 'object' ? r.mercs : {})) {
    if (!/^[A-Za-z0-9_:-]{1,64}$/.test(mid) || !seen.has(hid) || ridden.has(hid)) continue;
    out.mercs[mid] = hid;
    ridden.add(hid);
  }
  const n = Math.floor(Number(r.next));
  out.next = Number.isFinite(n) && n > 0 ? n : 1;
  for (const x of out.items) { const k = Number(x.id.replace(/^m/, '')); if (Number.isFinite(k) && k >= out.next) out.next = k + 1; }
  return out;
}

export function addHorse(r, rarity) {
  const x = { id: `m${r.next++}`, rarity };
  r.items.push(x);
  return x;
}

export function riderOf(r, horseId) {
  if (!r || !horseId) return null;
  if (r.hero === horseId) return 'hero';
  for (const [mid, hid] of Object.entries(r.mercs || {})) if (hid === horseId) return mid;
  return null;
}

export function mountOf(r, mercId = null) {
  const hid = mercId == null || mercId === 'hero' ? r?.hero : r?.mercs?.[mercId];
  return (hid && r.items.find((x) => x.id === hid)) || null;
}

export function mountHorse(r, horseId, mercId = null) {
  const x = r?.items?.find((y) => y.id === horseId);
  if (!x) return null;
  dismountHorse(r, horseId);
  if (mercId == null || mercId === 'hero') r.hero = x.id;
  else (r.mercs ||= {})[mercId] = x.id;
  return x;
}

export function dismountHorse(r, horseId) {
  if (r.hero === horseId) r.hero = null;
  for (const [mid, hid] of Object.entries(r.mercs || {})) if (hid === horseId) delete r.mercs[mid];
}

export function dropMercHorse(r, mercId) {
  if (r?.mercs) delete r.mercs[mercId];
}

export function horseBonus(r, mercId = null) {
  const d = horseDef(mountOf(r, mercId));
  return d ? { atk: d.atk, def: d.def, spd: d.spd } : null;
}

export const horsePower = (b) => (b ? b.atk * HORSE_POWER.atk + b.def * HORSE_POWER.def + b.spd * HORSE_POWER.spd : 0);

export const listableHorse = (r, horseId) => !!r?.items?.some((x) => x.id === horseId) && riderOf(r, horseId) === null;
