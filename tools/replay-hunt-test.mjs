import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEROES, PVP, CASTLES, FARM } from '../web/js/data.js';
import { maxEnergyOf } from '../web/js/hunt.js';
import { maxShieldOf } from '../web/js/data.js';
import { spreadOf, LIVE_FLOOR, HUNT_MULT } from '../web/js/huntsim.js';
import { auditEntryHash, GENESIS } from '../web/js/net.js';
import { deriveOutcome } from '../web/js/drand.js';
import { REALM_LIVE } from '../web/js/realmlive.js';
import { ENGINE_V, LEGACY_CASTLE_BONUS, LEGACY_FARM_DAYS, farmDaysOf, legInput, runLeg, replayHour, checkHour, carryLeg, fightBonus, heroSnap, HERO_FIELDS, liveEarned, liveWar, checkLive } from '../web/js/huntengine.js';
import { replayInput } from './replay-hunt.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let n = 0;
const test = async (name, fn) => { await fn(); n++; console.log('ok', name); };

const HOUR = 3600e3;
const T0 = 1_762_000_000_000 - (1_762_000_000_000 % HOUR);
const keys = Object.keys(HEROES);
function roster() {
  return Array.from({ length: 12 }, (_, i) => {
    const h = { id: `g${i}`, key: keys[(i * 5) % keys.length], level: 1 + (i % 6), battery: i % 4 === 0, hold: i === 7, castle: i === 3 };
    h.energy = Math.round(maxEnergyOf(h) * ((1 + (i % 4)) / 4));
    h.shield = Math.round(maxShieldOf(h) * (0.4 + (i % 3) / 5));
    h.status = i % 3 === 2 ? 'rest' : i === 9 ? 'idle' : 'work';
    if (i === 10) h.trial = true;
    if (i === 11) h.since = T0 + 20 * 60e3;
    return { ...h, name: `not read ${i}`, gear: { x: i } };
  });
}
const RULES = { castle: 2, autoSend: true, keep: true, hunger: true, squire: true, oilUntil: T0 + 15 * 60e3, lots: [{ id: 's1', pool: 'farm', amount: 50_000, at: T0 - HOUR }, { id: 's2', pool: 'vault', amount: 9, at: 0 }] };

function refsOf(engine, replay, mult, extra = {}) {
  const earned = Math.max(0, Math.floor(replay.gross * mult * 1000));
  const war = Math.round(earned * PVP.share);
  const first = engine.legs[0];
  return { from: first.from, to: engine.legs.at(-1).to, sec: (engine.legs.at(-1).to - first.from) / 1000, gross: replay.gross, earned, chest: earned - war, war, mult, kills: Math.round(replay.kills), fieldSec: Math.round(replay.fieldSec), waves: 0, drops: [], ...extra, engine };
}

const GOLDEN = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/replay-hunt-golden.json'), 'utf8'));

function hours(legacy = false) {
  const h = hoursNow();
  if (legacy) for (const e of Object.values(h)) for (const leg of e.legs) { delete leg.castleBonus; delete leg.farmDays; }
  return h;
}
function hoursNow() {
  const one = { v: ENGINE_V, legs: [legInput(roster(), T0, T0 + HOUR, { live: true, ...RULES })] };
  const live = roster();
  const legA = legInput(live, T0, T0 + 25 * 60e3, { live: true, ...RULES });
  runLeg(legA, live);
  live[1].status = 'idle';
  live[2].status = 'work';
  live.push({ id: 'g12', key: keys[3], level: 4, energy: 80, shield: 60, status: 'work', since: T0 + 25 * 60e3 });
  const legB = legInput(live, T0 + 25 * 60e3, T0 + HOUR, { live: true, ...RULES, squire: false });
  const two = { v: ENGINE_V, legs: [legA, legB] };
  const away = { v: ENGINE_V, legs: [legInput(roster(), T0 - 6 * HOUR, T0, { live: false, ...RULES })] };
  return { one, two, away };
}
const FIGHT = [{ day: 1, round: 2, start: T0 + 30 * 60e3, end: T0 + 45 * 60e3 }];

await test('golden hours replay to the frozen numbers', () => {
  const h = hours();
  const got = {
    one: replayHour(h.one),
    two: replayHour(h.two, fightBonus(FIGHT, {}, false).fight),
    away: replayHour(h.away),
  };
  for (const k of Object.keys(GOLDEN.hours)) assert.deepEqual(got[k], GOLDEN.hours[k], `golden hour ${k}`);
});

await test('hours recorded before castleBonus replay on the castle table they were paid with', async () => {
  const h = hours(true);
  const got = {
    one: replayHour(h.one),
    two: replayHour(h.two, fightBonus(FIGHT, {}, false).fight),
    away: replayHour(h.away),
  };
  for (const k of Object.keys(GOLDEN.legacyHours)) assert.deepEqual(got[k], GOLDEN.legacyHours[k], `legacy golden hour ${k}`);
  assert.equal((await replayInput(refsOf(h.one, got.one, HUNT_MULT, { fixed: true }))).inputHash, GOLDEN.inputHash.legacy);
  assert.equal(checkHour(refsOf(h.one, got.one, HUNT_MULT, { fixed: true }), PVP.share).ok, true);
  const now = hours();
  assert.equal(now.one.legs[0].castleBonus, CASTLES[RULES.castle].bonus);
  assert.notEqual(LEGACY_CASTLE_BONUS[RULES.castle], CASTLES[RULES.castle].bonus, 'the golden castle changed its bonus');
  const good = refsOf(now.one, replayHour(now.one), HUNT_MULT, { fixed: true });
  assert.equal(checkHour(good, PVP.share).ok, true);
  const bent = structuredClone(good);
  bent.engine.legs[0].castleBonus += 10;
  assert.equal(checkHour(bent, PVP.share).why, 'gross');
  bent.engine.legs[0].castleBonus = -1;
  assert.equal(checkHour(bent, PVP.share).ok, false);
});

await test('hours recorded before farmDays replay on the farm days they were paid with', () => {
  assert.deepEqual(farmDaysOf({}), LEGACY_FARM_DAYS);
  assert.notDeepEqual(LEGACY_FARM_DAYS, FARM.days, 'the farm days changed since the legacy table');
  const now = hours();
  assert.deepEqual(now.one.legs[0].farmDays, FARM.days);
  const good = refsOf(now.one, replayHour(now.one), HUNT_MULT, { fixed: true });
  assert.equal(checkHour(good, PVP.share).ok, true);
  const bent = structuredClone(good);
  bent.engine.legs[0].farmDays.legendary *= 2;
  assert.equal(checkHour(bent, PVP.share).why, 'gross');
  bent.engine.legs[0].farmDays.legendary = 0;
  assert.equal(checkHour(bent, PVP.share).ok, false);
  bent.engine.legs[0].farmDays.legendary = FARM.days.legendary;
  delete bent.engine.legs[0].farmDays.mythic;
  assert.equal(checkHour(bent, PVP.share).ok, false);
  assert.equal(FARM.days.legendary, now.one.legs[0].farmDays.legendary);
});

await test('runLeg on the live roster equals the replay of its snapshot, extra fields and all', () => {
  const live = roster();
  const input = legInput(live, T0, T0 + HOUR, { live: true, ...RULES });
  const onLive = runLeg(input, live);
  const replay = runLeg(input);
  assert.deepEqual(replay, onLive);
  assert.ok(onLive.earned > 0 && onLive.trial > 0, 'the roster earns, the Recruit too');
  assert.deepEqual(input.heroes, roster().map(heroSnap));
  assert.ok(Object.keys(input.heroes[0]).every((k) => HERO_FIELDS.includes(k)));
});

await test('the replay sets the realm factors of the leg and restores them', () => {
  const input = legInput(roster(), T0, T0 + HOUR, { live: true, ...RULES });
  const base = runLeg(input).earned;
  const half = runLeg({ ...input, realm: { emission: 0.5, index: 1 } }).earned;
  assert.ok(Math.abs(half - base / 2) < 1e-6 * base, 'half the emission pays half');
  assert.deepEqual([REALM_LIVE.emission, REALM_LIVE.index], [1, 1]);
});

await test('carryLeg adds legs in the server order, and a split hour pays the stretch on each roster', () => {
  const h = hours();
  const a = runLeg(h.two.legs[0]);
  const b = runLeg(h.two.legs[1]);
  const acc = carryLeg(carryLeg(null, a), b);
  assert.equal(acc.earned, a.earned + b.earned);
  assert.equal(replayHour(h.two).gross, acc.earned);
});

await test('checkHour accepts an honest hour and names what a tampered one changed', () => {
  const h = hours();
  const mult = spreadOf(0.73);
  const good = refsOf(h.one, replayHour(h.one), mult);
  assert.deepEqual(checkHour(good, PVP.share).ok, true);
  const higher = structuredClone(good);
  higher.engine.legs[0].heroes[0].level += 1;
  assert.equal(checkHour(higher, PVP.share).why, 'gross');
  const fat = { ...good, earned: good.earned + 1, chest: good.chest + 1 };
  assert.equal(checkHour(fat, PVP.share).why, 'earned');
  const war = { ...good, war: good.war - 1, chest: good.chest + 1 };
  assert.equal(checkHour(war, PVP.share).why, 'war');
  assert.equal(checkHour({ ...good, engine: { v: 99, legs: [] } }, PVP.share).ok, false);
  const fight = fightBonus(FIGHT, {}, false).fight;
  const withFight = refsOf(h.two, replayHour(h.two, fight), mult, { fight });
  assert.equal(checkHour(withFight, PVP.share).ok, true);
  assert.equal(checkHour({ ...withFight, fight: [] }, PVP.share).why, 'gross');
});

function liveCredits(gross, floor) {
  const g1 = gross / 3;
  const g2 = (gross * 2) / 3;
  const c1 = { prev: 0, gross: g1, floor, earned: liveEarned(g1, floor), war: liveWar(liveEarned(g1, floor), PVP.share) };
  const c2 = { prev: g1, gross: g2, floor, earned: liveEarned(g2, floor) - liveEarned(g1, floor), war: liveWar(liveEarned(g2, floor), PVP.share) - liveWar(liveEarned(g1, floor), PVP.share) };
  for (const c of [c1, c2]) c.chest = c.earned - c.war;
  return [c1, c2];
}

function restOf(good, cs, liveFloor) {
  const live = { gross: cs.at(-1).gross, earned: cs.reduce((t, c) => t + c.earned, 0), war: cs.reduce((t, c) => t + c.war, 0), ...(liveFloor === undefined ? {} : { floor: liveFloor }) };
  const hourWar = Math.round(good.earned * PVP.share);
  return { ...good, live, war: hourWar - live.war, chest: good.earned - live.earned - (hourWar - live.war) };
}

await test('an hour credited live at full value checks, its credits check on their own, and the turn adds no bonus', () => {
  const h = hours();
  const good = refsOf(h.one, replayHour(h.one), HUNT_MULT, { fixed: true });
  assert.equal(checkHour(good, PVP.share).ok, true);
  assert.equal(checkHour({ ...good, mult: spreadOf(0.73), earned: Math.floor(good.gross * spreadOf(0.73) * 1000) }, PVP.share).why, 'mult');
  const [c1, c2] = liveCredits(good.gross, HUNT_MULT);
  for (const c of [c1, c2]) assert.equal(checkLive(c, PVP.share), true);
  assert.equal(c1.earned + c2.earned, Math.floor(c2.gross * 1000));
  assert.equal(checkLive({ ...c2, chest: c2.chest + 1 }, PVP.share), false);
  assert.equal(checkLive({ ...c2, floor: 1.1 }, PVP.share), false);
  const rest = restOf(good, [c1, c2], HUNT_MULT);
  assert.ok(rest.chest >= 0 && rest.war >= 0);
  assert.equal(rest.chest + c1.chest + c2.chest, good.chest);
  assert.ok(Math.abs(rest.chest + rest.war - (good.earned - Math.floor(c2.gross * 1000))) <= 1);
  assert.equal(checkHour(rest, PVP.share).ok, true);
  assert.equal(checkHour({ ...rest, live: { ...rest.live, earned: rest.live.earned + 1 } }, PVP.share).why, 'live');
  assert.equal(checkHour({ ...rest, live: { ...rest.live, gross: good.gross + 1 } }, PVP.share).why, 'live');
  assert.equal(checkHour({ ...rest, live: { ...rest.live, floor: 1.1 } }, PVP.share).why, 'live');
  assert.equal(checkHour({ ...rest, chest: rest.chest + 1 }, PVP.share).why, 'split');
  assert.equal(liveEarned(good.gross), good.earned);
});

await test('the live credits and reveals of builds 440 and 441 (drawn spread, live floor 0.9) still check', () => {
  const h = hours();
  const good = refsOf(h.one, replayHour(h.one), spreadOf(0.31));
  const [c1, c2] = liveCredits(good.gross, LIVE_FLOOR);
  for (const c of [c1, c2]) assert.equal(checkLive(c, PVP.share), true);
  const rest = restOf(good, [c1, c2]);
  assert.equal(checkHour(rest, PVP.share).ok, true);
  assert.equal(checkHour({ ...rest, live: { ...rest.live, floor: HUNT_MULT } }, PVP.share).why, 'live');
  assert.ok(liveEarned(good.gross, LIVE_FLOOR) <= Math.floor(good.gross * spreadOf(0) * 1000));
});

await test('replay-hunt CLI checks a whole ledger entry: hash, spread and engine', async () => {
  const h = hours();
  const randomness = 'ab'.repeat(32);
  const actionId = 'golden-hour-1';
  const [u0] = await deriveOutcome(randomness, actionId, 'hunt', 1);
  const data = { v: 2, actionId, stage: 'reveal', draw: { round: 123, chain: 'test', randomness }, refs: refsOf(h.one, replayHour(h.one), spreadOf(u0)) };
  const text = JSON.stringify(data);
  const entry = { seq: 1, ts: T0 + HOUR + 5000, kind: 'hunt', data: text, prev: GENESIS };
  entry.hash = await auditEntryHash(entry.prev, entry.seq, entry.ts, entry.kind, text);
  const ok = await replayInput(entry);
  assert.equal(ok.ok, true, JSON.stringify(ok.checks));
  assert.deepEqual(ok.checks, { entry: 'ok', spread: 'ok', engine: 'ok' });
  assert.equal(ok.inputHash, GOLDEN.inputHash.one);
  assert.equal((await replayInput(data.refs)).checks.engine, 'ok');
  assert.equal((await replayInput({ ...entry, hash: '0'.repeat(64) })).ok, false);
  const bent = { ...data, refs: { ...data.refs, mult: spreadOf(0.99) } };
  assert.equal((await replayInput(bent)).checks.spread, 'bad');
  const fixedRefs = refsOf(h.one, replayHour(h.one), HUNT_MULT, { fixed: true });
  const fixed = await replayInput({ ...data, refs: fixedRefs });
  assert.equal(fixed.ok, true, JSON.stringify(fixed.checks));
  assert.equal(fixed.checks.spread, 'ok');
  assert.equal((await replayInput({ ...data, refs: { ...fixedRefs, mult: spreadOf(u0) } })).checks.spread, 'bad');
  const old = await replayInput({ ...data.refs, engine: undefined });
  assert.equal(old.ok, false);
  assert.match(old.why, /no engine input/);
});

await test('the engine module to publish has no secrets and stays inside web/js', () => {
  const seen = new Set();
  const queue = ['huntengine.js'];
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const src = fs.readFileSync(path.join(ROOT, 'web/js', f), 'utf8');
    for (const m of src.matchAll(/^\s*(?:import|export)[^;]*?from\s+['"](\.[^'"]+)['"]/gm)) {
      const p = path.normalize(path.join(path.dirname(f), m[1]));
      assert.ok(!p.startsWith('..'), `${f} imports outside web/js: ${m[1]}`);
      queue.push(p);
    }
    assert.doesNotMatch(src, /BEGIN [A-Z ]*PRIVATE KEY|\bsk_(live|test)_|DRAND_TEST_SK\s*=|SIGNER_KEY\s*=|SECRET\s*=\s*['"]/, `${f} holds something secret`);
  }
  assert.deepEqual([...seen].sort(), GOLDEN.publish);
  assert.ok(CASTLES.length > 2, 'the castle of the golden rules exists');
});

console.log(`${n} replay-hunt tests passed`);
