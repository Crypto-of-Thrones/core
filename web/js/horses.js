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

export function breedFields(x) {
  const y = {};
  if (x?.sex === 'm' || x?.sex === 'f') y.sex = x.sex;
  if (Number.isSafeInteger(x?.gen) && x.gen > 0 && x.gen <= 99) y.gen = x.gen;
  if (Number.isSafeInteger(x?.bred) && x.bred > 0 && x.bred <= 99) y.bred = x.bred;
  if (Number.isSafeInteger(x?.grown) && x.grown > 0) y.grown = x.grown;
  return y;
}

export const growing = (x, now = Date.now()) => Number.isSafeInteger(x?.grown) && now < x.grown;

export const freshHorses = () => ({ items: [], hero: null, mercs: {}, next: 1 });

export function normalizeHorses(r) {
  const out = freshHorses();
  if (!r || typeof r !== 'object') return out;
  const seen = new Set();
  for (const x of Array.isArray(r.items) ? r.items : []) {
    if (!x || typeof x.id !== 'string' || seen.has(x.id) || !horseDef(x.rarity)) continue;
    seen.add(x.id);
    out.items.push({ id: x.id, rarity: x.rarity, ...breedFields(x) });
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
  const pairs = [];
  const busy = new Set();
  for (const p of Array.isArray(r.stable) ? r.stable : []) {
    if (!p || typeof p.id !== 'string' || !seen.has(p.a) || !seen.has(p.b) || p.a === p.b || busy.has(p.a) || busy.has(p.b)) continue;
    if (!horseDef(p.rarity) || !Number.isSafeInteger(p.start) || !Number.isSafeInteger(p.end) || !Number.isSafeInteger(p.gen)) continue;
    busy.add(p.a); busy.add(p.b);
    const q = { id: p.id, a: p.a, b: p.b, rarity: p.rarity, gen: p.gen, start: p.start, end: p.end };
    if (p.sex === 'm' || p.sex === 'f') q.sex = p.sex;
    if (typeof p.draw === 'string') q.draw = p.draw;
    pairs.push(q);
  }
  if (pairs.length || Array.isArray(r.stable)) out.stable = pairs;
  const pn = Math.floor(Number(r.pnext));
  if (Number.isFinite(pn) && pn > 1) out.pnext = pn;
  for (const p of pairs) { const k = Number(p.id.replace(/^p/, '')); if (Number.isFinite(k) && k >= (out.pnext || 1)) out.pnext = k + 1; }
  return out;
}

export function addHorse(r, rarity, extra = null) {
  const x = { id: `m${r.next++}`, rarity };
  if (extra?.sex === 'm' || extra?.sex === 'f') x.sex = extra.sex;
  if (Number.isSafeInteger(extra?.gen) && extra.gen > 0) x.gen = extra.gen;
  if (Number.isSafeInteger(extra?.grown) && extra.grown > 0) x.grown = extra.grown;
  r.items.push(x);
  return x;
}

export const foalSex = (u) => (u < 0.5 ? 'm' : 'f');

export const inStable = (r, horseId) => !!r?.stable?.some((p) => p.a === horseId || p.b === horseId);

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

export function mountHorse(r, horseId, mercId = null, now = Date.now()) {
  const x = r?.items?.find((y) => y.id === horseId);
  if (!x || inStable(r, horseId)) return null;
  if (growing(x, now)) return null;
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

