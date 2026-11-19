import { HOMESTEAD } from './data.js';
import { rollRarity } from './summon.js';

export const CROPS = Object.keys(HOMESTEAD.crops);
export const TREES = Object.keys(HOMESTEAD.trees);
export const FISH = Object.keys(HOMESTEAD.fish);

export const BUILDINGS = Object.keys(HOMESTEAD.buildings);
export const GOODS = Object.keys(HOMESTEAD.recipes);
export const DISHES = GOODS.filter((k) => HOMESTEAD.recipes[k].energy > 0);

export const SITES = Object.freeze({ field: HOMESTEAD.fields * HOMESTEAD.slots, forest: HOMESTEAD.forest, lake: HOMESTEAD.lake });

export const CATCH_LOG = 12;

export const FISH_DRAW = 2;

export const workerDef = (rarity) => HOMESTEAD.workers[rarity] || null;

export const validItem = (site, item) => (site === 'field' ? Object.hasOwn(HOMESTEAD.crops, item)
  : site === 'forest' ? Object.hasOwn(HOMESTEAD.trees, item) : site === 'lake' && item === 'fish');

const baseMin = (site, item) => (site === 'field' ? HOMESTEAD.crops[item].minutes : site === 'forest' ? HOMESTEAD.trees[item].minutes : HOMESTEAD.fishing.minutes);

const baseHaul = (site, item) => (site === 'field' ? HOMESTEAD.crops[item].yield : site === 'forest' ? HOMESTEAD.trees[item].wood : HOMESTEAD.fishing.catch);

export const taskMs = (site, item, rarity) => Math.round((baseMin(site, item) * 60) / workerDef(rarity).speed) * 1000;

export const taskYield = (site, item, rarity) => Math.max(1, Math.round(baseHaul(site, item) * workerDef(rarity).yield));

export const freshHomestead = () => ({
  workers: [], next: 1, tasks: [], tnext: 1, barn: { crops: {}, wood: 0, fish: {}, goods: {} }, catches: [], best: {}, seeded: false,
  buildings: {}, jobs: [], knext: 1, meals: { day: 0, fed: {} },
});

const ID = /^[A-Za-z0-9_:-]{1,64}$/;
const posInt = (x) => Number.isSafeInteger(x) && x > 0;
const count = (x) => { const n = Math.floor(Number(x)); return Number.isFinite(n) && n > 0 ? n : 0; };

function counts(o, keys) {
  const out = {};
  for (const k of keys) { const n = count(o?.[k]); if (n) out[k] = n; }
  return out;
}

function nextId(n, list, prefix) {
  let out = posInt(n) ? n : 1;
  for (const x of list) { const k = Number(String(x.id).slice(prefix.length)); if (x.id.startsWith(prefix) && Number.isSafeInteger(k) && k >= out) out = k + 1; }
  return out;
}

export function normalizeHomestead(r) {
  const out = freshHomestead();
  if (!r || typeof r !== 'object') return out;
  const seen = new Set();
  for (const w of Array.isArray(r.workers) ? r.workers : []) {
    if (!w || typeof w.id !== 'string' || !ID.test(w.id) || seen.has(w.id) || !workerDef(w.rarity)) continue;
    seen.add(w.id);
    out.workers.push({ id: w.id, rarity: w.rarity });
  }
  const rarity = Object.fromEntries(out.workers.map((w) => [w.id, w.rarity]));
  const busy = new Set();
  const used = new Set();
  const tids = new Set();
  for (const x of Array.isArray(r.tasks) ? r.tasks : []) {
    if (!x || typeof x.id !== 'string' || !ID.test(x.id) || tids.has(x.id) || !rarity[x.worker] || (holdsWorker(x) && busy.has(x.worker))) continue;
    if (!Object.hasOwn(SITES, x.site) || !Number.isSafeInteger(x.slot) || x.slot < 0 || x.slot >= SITES[x.site] || used.has(`${x.site}:${x.slot}`)) continue;
    if (!validItem(x.site, x.item) || !Number.isFinite(x.start) || !Number.isFinite(x.end) || x.end < x.start || !posInt(x.n)) continue;
    tids.add(x.id);
    if (holdsWorker(x)) busy.add(x.worker);
    used.add(`${x.site}:${x.slot}`);
    out.tasks.push({ id: x.id, worker: x.worker, rarity: rarity[x.worker], site: x.site, slot: x.slot, item: x.item, start: x.start, end: x.end, n: x.n });
  }
  out.next = nextId(r.next, out.workers, 'w');
  out.tnext = nextId(r.tnext, out.tasks, 't');
  const b = r.barn && typeof r.barn === 'object' ? r.barn : {};
  out.barn = { crops: counts(b.crops, CROPS), wood: count(b.wood), fish: counts(b.fish, FISH), goods: counts(b.goods, GOODS) };
  for (const k of BUILDINGS) { const e = r.buildings?.[k]?.end; if (Number.isFinite(e)) out.buildings[k] = { end: e }; }
  const jids = new Set();
  const jbld = {};
  for (const j of Array.isArray(r.jobs) ? r.jobs : []) {
    const d = j && HOMESTEAD.recipes[j.recipe];
    if (!d || !Object.hasOwn(HOMESTEAD.recipes, j.recipe) || typeof j.id !== 'string' || !ID.test(j.id) || jids.has(j.id) || j.bld !== d.at || (jbld[j.bld] || 0) >= HOMESTEAD.queue.pass || !out.buildings[j.bld]) continue;
    if (!HOMESTEAD.batches.includes(j.n) || !Number.isFinite(j.start) || !Number.isFinite(j.end) || j.end < j.start) continue;
    jids.add(j.id);
    jbld[j.bld] = (jbld[j.bld] || 0) + 1;
    out.jobs.push({ id: j.id, bld: j.bld, recipe: j.recipe, n: j.n, start: j.start, end: j.end });
  }
  out.knext = nextId(r.knext, out.jobs, 'k');
  const m = r.meals && typeof r.meals === 'object' ? r.meals : {};
  out.meals = { day: Number.isSafeInteger(m.day) && m.day > 0 ? m.day : 0, fed: {} };
  for (const [k, v] of Object.entries(m.fed && typeof m.fed === 'object' ? m.fed : {})) if (ID.test(k) && count(v)) out.meals.fed[k] = count(v);
  const okFish = (f) => f && Object.hasOwn(HOMESTEAD.fish, f.sp) && Number.isFinite(f.cm) && f.cm > 0 && Number.isFinite(f.kg) && f.kg > 0;
  out.catches = (Array.isArray(r.catches) ? r.catches : []).filter(okFish).slice(0, CATCH_LOG).map((f) => ({ sp: f.sp, cm: f.cm, kg: f.kg, at: Number.isFinite(f.at) ? f.at : 0 }));
  for (const sp of FISH) if (okFish({ sp, ...r.best?.[sp] })) out.best[sp] = { cm: r.best[sp].cm, kg: r.best[sp].kg };
  out.seeded = r.seeded === true;
  return out;
}

export const holdsWorker = (x) => x.site !== 'field';

export const taskOf = (r, id) => r.tasks.find((x) => x.worker === id && holdsWorker(x)) || null;

export const slotTask = (r, site, slot) => r.tasks.find((x) => x.site === site && x.slot === slot) || null;

export function idleWorkers(r) {
  const rank = Object.keys(HOMESTEAD.workers);
  return r.workers.filter((w) => !taskOf(r, w.id)).sort((a, b) => rank.indexOf(b.rarity) - rank.indexOf(a.rarity));
}

export const passPlot = (site, slot) => site === 'field' && HOMESTEAD.passFields.includes(Math.floor(slot / HOMESTEAD.slots));

export function assignBlock(r, workerId, site, slot, item, pass = false) {
  if (!r.workers.some((w) => w.id === workerId)) return 'worker';
  if (taskOf(r, workerId)) return 'busy';
  if (!Object.hasOwn(SITES, site)) return 'site';
  if (!Number.isSafeInteger(slot) || slot < 0 || slot >= SITES[site]) return 'slot';
  if (!pass && passPlot(site, slot)) return 'pass';
  if (slotTask(r, site, slot)) return 'taken';
  if (!validItem(site, item)) return 'item';
  return '';
}

export function startTask(r, workerId, site, slot, item, now) {
  const rarity = r.workers.find((w) => w.id === workerId).rarity;
  const x = { id: `t${r.tnext++}`, worker: workerId, rarity, site, slot, item, start: now, end: now + taskMs(site, item, rarity), n: taskYield(site, item, rarity) };
  r.tasks.push(x);
  return x;
}

export function collectBlock(r, taskId, now) {
  const x = r.tasks.find((y) => y.id === taskId);
  if (!x) return 'task';
  return now < x.end ? 'early' : '';
}

export function closeTask(r, taskId) {
  const i = r.tasks.findIndex((y) => y.id === taskId);
  return r.tasks.splice(i, 1)[0];
}

export function harvestTask(r, taskId) {
  const x = closeTask(r, taskId);
  if (x.site === 'field') r.barn.crops[x.item] = (r.barn.crops[x.item] || 0) + x.n;
  else r.barn.wood += x.n;
  return { task: x.id, site: x.site, item: x.item, n: x.n };
}

export function fishSpecies(u) {
  const total = FISH.reduce((s, k) => s + HOMESTEAD.fish[k].weight, 0);
  let n = u * total;
  for (const k of FISH) if ((n -= HOMESTEAD.fish[k].weight) < 0) return k;
  return FISH[FISH.length - 1];
}

export function fishOf(u0, u1) {
  const sp = fishSpecies(u0);
  const d = HOMESTEAD.fish[sp];
  const cm = Math.round((d.cm[0] + (d.cm[1] - d.cm[0]) * u1 * u1) * 10) / 10;
  const kg = Math.round(Math.max(d.kg[0], d.kg[1] * (cm / d.cm[1]) ** 3) * 100) / 100;
  return { sp, cm, kg };
}

export function rollCatch(n, rng = Math.random) {
  return Array.from({ length: n }, () => { const u0 = rng(); return fishOf(u0, rng()); });
}

export function fishValue(f) {
  const d = HOMESTEAD.fish[f.sp];
  return Math.round(d.value * (1 + (f.cm - d.cm[0]) / (d.cm[1] - d.cm[0])));
}

export function stowFish(r, fish, now) {
  for (const f of fish) {
    r.barn.fish[f.sp] = (r.barn.fish[f.sp] || 0) + 1;
    r.catches.unshift({ sp: f.sp, cm: f.cm, kg: f.kg, at: now });
    const b = r.best[f.sp];
    if (!b || f.cm > b.cm) r.best[f.sp] = { cm: f.cm, kg: f.kg };
  }
  r.catches.length = Math.min(r.catches.length, CATCH_LOG);
}

export function landFish(r, taskId, fish, now) {
  const x = closeTask(r, taskId);
  stowFish(r, fish, now);
  return { task: x.id, n: x.n, fish };
}

export const rollWorkers = (n, rng = Math.random) => Array.from({ length: n }, () => rollRarity(rng));

export function summonBlock(r, n) {
  if (!HOMESTEAD.summon.batches.includes(n)) return 'batch';
  return r.workers.length + n > HOMESTEAD.summon.cap ? 'cap' : '';
}

export function addWorker(r, rarity) {
  const w = { id: `w${r.next++}`, rarity };
  r.workers.push(w);
  return w;
}

export function seedWorkers(r) {
  if (r.seeded) return [];
  r.seeded = true;
  return Array.from({ length: HOMESTEAD.summon.start }, () => addWorker(r, 'common'));
}

export function barnValue(r) {
  let v = r.barn.wood * HOMESTEAD.wood;
  for (const [k, n] of Object.entries(r.barn.crops)) v += n * HOMESTEAD.crops[k].value;
  for (const [k, n] of Object.entries(r.barn.fish)) v += n * HOMESTEAD.fish[k].value;
  return v;
}


export const builtAt = (r, key, now) => Number.isFinite(r.buildings[key]?.end) && now >= r.buildings[key].end;

export function buildBlock(r, key, now) {
  const d = Object.hasOwn(HOMESTEAD.buildings, key) ? HOMESTEAD.buildings[key] : null;
  if (!d) return 'building';
  if (r.buildings[key]) return 'built';
  if (d.needs && !builtAt(r, d.needs, now)) return 'needs';
  return r.barn.wood < d.wood ? 'wood' : '';
}

export function finishBuildings(r, now) {
  const done = BUILDINGS.filter((k) => !builtAt(r, k, now));
  for (const k of done) r.buildings[k] = { end: now };
  return done;
}

export function startBuild(r, key, now) {
  const d = HOMESTEAD.buildings[key];
  r.barn.wood -= d.wood;
  r.buildings[key] = { end: now + d.minutes * 60000 };
  return { bld: key, wood: d.wood, end: r.buildings[key].end };
}

const sourcesOf = (key) => (key === 'grain' ? HOMESTEAD.grain
  : key === 'fish' ? [...FISH].sort((a, b) => HOMESTEAD.fish[a].value - HOMESTEAD.fish[b].value) : [key]);

const shelf = (r, k) => (k === 'wood' ? null : Object.hasOwn(HOMESTEAD.crops, k) ? r.barn.crops : Object.hasOwn(HOMESTEAD.fish, k) ? r.barn.fish : r.barn.goods);

export function stockOf(r, key) {
  if (key === 'wood') return r.barn.wood;
  return sourcesOf(key).reduce((s, k) => s + (shelf(r, k)[k] || 0), 0);
}

function takeStock(r, key, n) {
  const used = {};
  if (key === 'wood') { r.barn.wood -= n; return { wood: n }; }
  for (const k of sourcesOf(key)) {
    const o = shelf(r, k);
    const x = Math.min(n, o[k] || 0);
    if (!x) continue;
    o[k] -= x;
    if (!o[k]) delete o[k];
    used[k] = x;
    n -= x;
    if (!n) break;
  }
  return used;
}

export const queueCap = (pass) => (pass ? HOMESTEAD.queue.pass : HOMESTEAD.queue.free);

export const jobsAt = (r, bld) => r.jobs.filter((j) => j.bld === bld).sort((a, b) => a.start - b.start);

export const jobAt = (r, bld) => jobsAt(r, bld)[0] || null;

export function cookBlock(r, recipe, n, now, cap = HOMESTEAD.queue.free) {
  const d = Object.hasOwn(HOMESTEAD.recipes, recipe) ? HOMESTEAD.recipes[recipe] : null;
  if (!d) return 'recipe';
  if (!HOMESTEAD.batches.includes(n)) return 'batch';
  if (!builtAt(r, d.at, now)) return 'building';
  if (jobsAt(r, d.at).length >= cap) return cap < HOMESTEAD.queue.pass ? 'busy' : 'queue';
  return Object.entries(d.in).every(([k, q]) => stockOf(r, k) >= q * n) ? '' : 'stock';
}

export function startCook(r, recipe, n, now) {
  const d = HOMESTEAD.recipes[recipe];
  const used = {};
  for (const [k, q] of Object.entries(d.in)) for (const [x, u] of Object.entries(takeStock(r, k, q * n))) used[x] = (used[x] || 0) + u;
  const start = Math.max(now, ...jobsAt(r, d.at).map((j) => j.end));
  const job = { id: `k${r.knext++}`, bld: d.at, recipe, n, start, end: start + d.minutes * n * 60000 };
  r.jobs.push(job);
  return { job, used };
}

export function serveBlock(r, jobId, now) {
  const j = r.jobs.find((x) => x.id === jobId);
  if (!j) return 'job';
  return now < j.end ? 'early' : '';
}

export function serveJob(r, jobId) {
  const j = r.jobs.splice(r.jobs.findIndex((x) => x.id === jobId), 1)[0];
  const n = j.n * HOMESTEAD.recipes[j.recipe].out;
  r.barn.goods[j.recipe] = (r.barn.goods[j.recipe] || 0) + n;
  return { job: j.id, recipe: j.recipe, n };
}

export const mealDay = (now) => Math.floor(now / 86400000) + 1;

export const hungerOn = (systemOn) => !!(HOMESTEAD.food.required && systemOn);

export const fedToday = (r, heroId, now) => (r.meals.day === mealDay(now) ? r.meals.fed[heroId] || 0 : 0);

export const restFed = (h, hunger) => !hunger || !!h.trial || h.ate === true;

export function eatBlock(r, h, max, dish, now, cap, hunger = false) {
  if (!DISHES.includes(dish)) return 'dish';
  if (!(r.barn.goods[dish] > 0)) return 'none';
  if (h.trial) return 'trial';
  if (h.status !== 'rest') return 'status';
  if (!(h.energy < max)) return 'full';
  if (hunger) return h.ate === true ? 'ate' : '';
  return fedToday(r, h.id, now) >= cap ? 'cap' : '';
}

export const mealEnergy = (r, heroId, dish, now, cap, hunger = false) => (hunger ? 0 : Math.max(0, Math.min(HOMESTEAD.recipes[dish].energy, cap - fedToday(r, heroId, now))));

export function eatDish(r, h, max, dish, now, cap, hunger = false) {
  if (!--r.barn.goods[dish]) delete r.barn.goods[dish];
  if (hunger) {
    h.ate = true;
    return { hero: h.id, dish, energy: 0, after: h.energy, ate: true };
  }
  const pts = mealEnergy(r, h.id, dish, now, cap);
  const day = mealDay(now);
  if (r.meals.day !== day) r.meals = { day, fed: {} };
  r.meals.fed[h.id] = (r.meals.fed[h.id] || 0) + pts;
  h.energy = Math.min(max, h.energy + pts);
  if (h.energy >= max && !h.hold) { h.status = 'idle'; h.castle = false; }
  return { hero: h.id, dish, energy: pts, after: h.energy };
}
