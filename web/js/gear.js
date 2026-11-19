import { GEAR, GEAR_SLOTS, GEAR_POWER, DUNGEON, RARITIES, HEROES, JEWELRY, JEWEL_SLOTS, BATTLE, EXPEDITION, MARKET } from './data.js';
import { trainedMark } from './training.js';
import { forgeBonus, forgeLevelOf, rushPrice } from './expedition.js';
import { t } from './i18nsafe.js';
import { horseBonus, horsePower, mountOf } from './horses.js';

export const SLOTS = Object.keys(GEAR_SLOTS);

export const JEWEL_KEYS = Object.keys(JEWEL_SLOTS);

export const ALL_SLOTS = [...SLOTS, ...JEWEL_KEYS];

export const isJewel = (pieceOrSlot) => !!JEWEL_SLOTS[typeof pieceOrSlot === 'string' ? pieceOrSlot : pieceOrSlot?.slot];

const ORDER = Object.keys(RARITIES);

export const gearDef = (piece) => {
  const d = GEAR[piece?.slot]?.[piece?.rarity] || JEWELRY[piece?.slot]?.[piece?.rarity] || null;
  return piece?.forge ? forgeBonus(d, piece.forge) : d;
};

export const gearArt = (slot, rarity) => `gear/${slot}_${rarity}.png`;

export const slotArt = (slot) => `gear/slot_${slot}.png`;

export function gearStatText(piece) {
  const d = gearDef(piece);
  if (!d) return '';
  return [['atk', t('gear.stat.atk', null, 'ATK')], ['def', t('gear.stat.def', null, 'DEF')], ['hp', t('gear.stat.hp', null, 'HP')]].filter(([k]) => d[k] > 0).map(([k, l]) => `+${d[k]} ${l}`).join(' ');
}

export const freshGear = () => ({ items: [], equipped: Object.fromEntries(ALL_SLOTS.map((s) => [s, null])), mercs: {}, next: 1 });

export const freshDungeon = () => ({ runs: [], next: 1, found: Object.fromEntries(ORDER.map((r) => [r, 0])), rest: [] });

export function normalizeGear(g) {
  const out = freshGear();
  if (!g || typeof g !== 'object') return out;
  const seen = new Set();
  if (Array.isArray(g.items)) {
    for (const p of g.items) {
      if (!p || typeof p.id !== 'string' || seen.has(p.id) || !gearDef(p)) continue;
      seen.add(p.id);
      out.items.push({ id: p.id, slot: p.slot, rarity: p.rarity, ...(Number.isFinite(p.resaleAt) ? { resaleAt: p.resaleAt } : {}) });
      const lvl = isJewel(p) ? forgeLevelOf(p.forge) : 0;
      if (lvl) out.items.at(-1).forge = lvl;
    }
  }
  for (const s of ALL_SLOTS) {
    const id = g.equipped?.[s];
    if (out.items.some((p) => p.id === id && p.slot === s)) out.equipped[s] = id;
  }
  const worn = new Set(Object.values(out.equipped).filter(Boolean));
  for (const [mid, slots] of Object.entries(g.mercs && typeof g.mercs === 'object' ? g.mercs : {})) {
    if (!/^[A-Za-z0-9_:-]{1,64}$/.test(mid) || !slots || typeof slots !== 'object') continue;
    const keep = {};
    for (const s of ALL_SLOTS) {
      const id = slots[s];
      if (!worn.has(id) && out.items.some((p) => p.id === id && p.slot === s)) { keep[s] = id; worn.add(id); }
    }
    if (Object.keys(keep).length) out.mercs[mid] = keep;
  }
  const n = Math.floor(Number(g.next));
  out.next = Number.isFinite(n) && n > 0 ? n : 1;
  for (const p of out.items) { const k = Number(p.id.replace(/^g/, '')); if (Number.isFinite(k) && k >= out.next) out.next = k + 1; }
  return out;
}

export function normalizeDungeon(d, restore = () => {}) {
  const out = freshDungeon();
  if (!d || typeof d !== 'object') return out;
  if (Array.isArray(d.runs)) {
    for (const r of d.runs) {
      const party = Array.isArray(r?.party) ? r.party.filter((x) => x && HEROES[x.key]) : [];
      const ok = r && DUNGEON.paths.some((t) => t.key === r.path) && Number.isFinite(r.start) && Number.isFinite(r.end) && r.end >= r.start && party.length;
      if (!ok) { if (party.length) restore(party); continue; }
      const due = Number.isFinite(r.due) && r.due >= r.end ? { due: r.due } : {};
      out.runs.push({ id: String(r.id), path: r.path, start: r.start, end: r.end, ...due, luck: clampLuck(Number(r.luck) || 0), party });
    }
  }
  const n = Math.floor(Number(d.next));
  out.next = Number.isFinite(n) && n > 0 ? n : out.runs.length + 1;
  for (const r of out.runs) { const k = Number(r.id.replace(/^d/, '')); if (Number.isFinite(k) && k >= out.next) out.next = k + 1; }
  for (const r of ORDER) { const v = Math.floor(Number(d.found?.[r])); if (Number.isFinite(v) && v > 0) out.found[r] = v; }
  out.rest = (Array.isArray(d.rest) ? d.rest : []).filter((x) => Number.isFinite(x) && x > 0).slice(-DUNGEON.runs);
  return out;
}

export const pathOf = (key) => DUNGEON.paths.find((t) => t.key === key) || null;

const clampLuck = (l) => Math.max(0, Math.min(DUNGEON.maxLuck, l));

export const canExplore = (merc) => !!merc && !!HEROES[merc.key] && !merc.trial && !merc.joust;

export const onHunt = (merc) => merc?.status === 'work';

export const strongestIds = (mercs, max, powerOf, blocked = () => false) => mercs
  .filter((m) => !blocked(m))
  .map((m, i) => [m, powerOf(m), i])
  .sort((a, b) => b[1] - a[1] || a[2] - b[2])
  .slice(0, Math.max(0, max))
  .map(([m]) => m.id);

export function strongestPick(mercs, max, min, powerOf, blocked = () => false) {
  const ids = strongestIds(mercs.filter((m) => !onHunt(m)), max, powerOf, blocked);
  const need = Math.min(max, min) - ids.length;
  return need > 0 ? [...ids, ...strongestIds(mercs.filter(onHunt), need, powerOf, blocked)] : ids;
}

export function partyLuck(pathKey, party) {
  const t = pathOf(pathKey);
  if (!t?.luck) return 0;
  const members = party.reduce((s, x) => s + (DUNGEON.memberLuck[HEROES[x.key]?.rarity] || 0), 0);
  return clampLuck(t.luck + members);
}

export function dropWeights(luck = 0) {
  const l = clampLuck(luck);
  const total = ORDER.reduce((s, r) => s + RARITIES[r].weight, 0);
  const w = {};
  let rest = total;
  for (const r of ORDER.slice(1)) { w[r] = RARITIES[r].weight * (1 + l); rest -= w[r]; }
  return { [ORDER[0]]: rest, ...w };
}

export function dropChances(luck = 0) {
  const w = dropWeights(luck);
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  return Object.fromEntries(Object.entries(w).map(([r, v]) => [r, v / total]));
}

export function rollDropRarity(luck = 0, rng = Math.random) {
  const w = dropWeights(luck);
  let n = rng() * Object.values(w).reduce((s, v) => s + v, 0);
  for (const r of ORDER) { if ((n -= w[r]) < 0) return r; }
  return ORDER[0];
}

export function rollTreasure(luck = 0, rng = Math.random) {
  const rarity = rollDropRarity(luck, rng);
  const slot = SLOTS[Math.min(SLOTS.length - 1, Math.floor(rng() * SLOTS.length))];
  return { slot, rarity };
}

export function gearBonus(g) {
  const out = { atk: 0, def: 0, hp: 0 };
  if (!g) return out;
  for (const s of ALL_SLOTS) {
    const p = g.items.find((x) => x.id === g.equipped[s]);
    const d = gearDef(p);
    if (d) { out.atk += d.atk; out.def += d.def; out.hp += d.hp; }
  }
  return out;
}

export function wornBy(g, pieceId) {
  if (!g || !pieceId) return null;
  if (Object.values(g.equipped || {}).includes(pieceId)) return 'hero';
  for (const [mid, slots] of Object.entries(g.mercs || {})) if (Object.values(slots || {}).includes(pieceId)) return mid;
  return null;
}

export const wearerGear = (g, mercId = null) => (mercId == null || mercId === 'hero' ? g : { items: g?.items || [], equipped: g?.mercs?.[mercId] || {} });

export function equipPiece(g, pieceId, mercId = null) {
  const p = g?.items?.find((x) => x.id === pieceId);
  if (!p || !ALL_SLOTS.includes(p.slot)) return null;
  takeOff(g, pieceId);
  if (mercId == null) g.equipped[p.slot] = p.id;
  else { g.mercs ||= {}; (g.mercs[mercId] ||= {})[p.slot] = p.id; }
  return p;
}

export function equipBlock(g, pieceId) {
  if (!g?.items?.some((x) => x.id === pieceId)) return 'piece';
  return wornBy(g, pieceId) !== null ? 'gearWorn' : '';
}

export function unequipSlot(g, slot, mercId = null) {
  if (!ALL_SLOTS.includes(slot)) return false;
  if (mercId == null) {
    if (!g?.equipped?.[slot]) return false;
    g.equipped[slot] = null;
    return true;
  }
  const m = g?.mercs?.[mercId];
  if (!m?.[slot]) return false;
  delete m[slot];
  if (!Object.keys(m).length) delete g.mercs[mercId];
  return true;
}

function takeOff(g, pieceId) {
  for (const s of ALL_SLOTS) if (g.equipped?.[s] === pieceId) g.equipped[s] = null;
  for (const [mid, slots] of Object.entries(g.mercs || {})) {
    for (const s of ALL_SLOTS) if (slots[s] === pieceId) delete slots[s];
    if (!Object.keys(slots).length) delete g.mercs[mid];
  }
}

export function dropMercGear(g, mercId) {
  if (g?.mercs) delete g.mercs[mercId];
}

export function pvpBonus(g, mercId) {
  const b = gearBonus(wearerGear(g, mercId));
  return b.atk || b.def || b.hp ? b : null;
}

export const gearPower = (b) => (b ? b.atk * GEAR_POWER.atk + b.def * GEAR_POWER.def + b.hp * GEAR_POWER.hp : 0);

export function bestGearPlan(g, mercId = null) {
  const items = g?.items || [];
  const worn = wearerGear(g, mercId).equipped || {};
  const score = (p) => gearPower(gearDef(p));
  const out = [];
  for (const slot of ALL_SLOTS) {
    const cur = items.find((x) => x.id === worn[slot]) || null;
    let best = null;
    for (const p of items) {
      if (p.slot !== slot || !gearDef(p) || wornBy(g, p.id) !== null) continue;
      const d = best ? score(p) - score(best) : 1;
      if (d > 0 || (d === 0 && ORDER.indexOf(p.rarity) > ORDER.indexOf(best.rarity))) best = p;
    }
    const gain = best ? score(best) - (cur ? score(cur) : 0) : 0;
    if (gain > 0) out.push({ slot, piece: best.id, prev: cur?.id ?? null, gain });
  }
  return out;
}

export const mercPower = (hero, g, horses = null) => heroPower(hero) + gearPower(pvpBonus(g, hero.id)) + horsePower(horseBonus(horses, hero.id));

export const partyPowerOf = (party, g, horses = null) => party.reduce((s, h) => s + mercPower(h, g, horses), 0);

export const partyGearRefs = (party, g, horses = null) => {
  const rows = party.map((h) => pvpBonus(g, h.id));
  const rides = party.map((h) => mountOf(horses, h.id)?.rarity || null);
  return {
    ...(rows.some(Boolean) ? { gear: rows.map((b) => (b ? [b.atk, b.def, b.hp] : [0, 0, 0])) } : {}),
    ...(rides.some(Boolean) ? { horses: rides } : {}),
  };
};

export function mountedBonus(g, horses, mercId) {
  const b = pvpBonus(g, mercId);
  const m = horseBonus(horses, mercId);
  if (!m) return b;
  return { atk: (b?.atk || 0) + m.atk, def: (b?.def || 0) + m.def, hp: b?.hp || 0, spd: m.spd };
}

export function pvpFighter(f, b, hpScale = 1) {
  if (!b) return f;
  const hp = f.hp + Math.round(b.hp * hpScale);
  return { ...f, atk: f.atk + b.atk, def: (f.def || 0) + b.def, hp, ...(f.max !== undefined ? { max: f.max + Math.round(b.hp * hpScale) } : {}), ...(b.spd ? { spd: (f.spd || 0) + b.spd } : {}) };
}

export const pvpArmor = (def) => (def > 0 ? BATTLE.armor / (BATTLE.armor + def) : 1);

export function gearedFighter(f, g) {
  const b = gearBonus(g);
  return { atk: f.atk + b.atk, def: f.def + b.def, hp: f.hp + b.hp };
}

export const gearMark = (n) => (n > 0 ? `<em class="gr-plus" title="${t('gear.mark.title', { n }, '+{n} from equipment')}">+${n}</em>` : '');

export const mountMark = (n) => (n > 0 ? `<em class="gr-plus" title="${t('gear.mark.mountTitle', { n }, '+{n} from the mount')}">+${n}</em>` : '');

export function riddenFighter(f, horses) {
  const m = horseBonus(horses, null);
  return m ? { ...f, atk: f.atk + m.atk, def: f.def + m.def } : f;
}

export const statSum = (total, trained, gear, mount = 0) => `<b>${total}</b>${trained > 0 || gear > 0 || mount > 0
  ? `<small class="st-sum">(${total - trained - gear - mount}${trainedMark(trained)}${gearMark(gear)}${mountMark(mount)})</small>` : ''}`;

export function heroPower(hero) {
  const d = HEROES[hero.key];
  return Math.round((d.stats.pow * 3 + d.stats.spd + d.stats.sta * 2 + d.stats.bmb * 4 + d.stats.rng * 4) * RARITIES[d.rarity].mult * (1 + (hero.level - 1) * 0.1));
}

export const REVEAL_MS = 1350;

export const runLeft = (run, now = Date.now()) => Math.max(0, Math.ceil((run.end - now) / 1000));

export const runDone = (run, now = Date.now()) => now >= run.end;


export const runDue = (run) => (Number.isFinite(run?.due) ? run.due : run.end);

export const runReadyAt = (run) => runDue(run);

export const runValue = (luck = 0) => Object.entries(dropChances(luck)).reduce((s, [r, p]) => s + p * (MARKET.gearBase[r] || 0), 0);

export function runSpeedupPrice(run, now = Date.now()) {
  if (!pathOf(run?.path) || !(now < run.end) || !(run.end > run.start)) return 0;
  const hourly = rushPrice('dungeon', run.end - now);
  if (hourly !== null) return hourly;
  const { premium, minShare, step } = EXPEDITION.speedup;
  const full = runValue(run.luck || 0) * premium;
  const left = Math.min(1, Math.ceil(((run.end - now) / (run.end - run.start)) / step - 1e-9) * step);
  return Math.ceil(Math.max(left, minShare) * full);
}

export const runRests = (rest, now = Date.now()) => (Array.isArray(rest) ? rest.filter((x) => Number.isFinite(x) && x > now).sort((a, b) => a - b) : []);

export const slotsUsed = (d, now = Date.now()) => (d?.runs?.length || 0) + runRests(d?.rest, now).length;
