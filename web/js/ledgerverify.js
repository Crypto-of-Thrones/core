import { GENESIS, verifyAuditChain, sha256, toHex, utf8, concat, fromHex, REALM_PRIVATE_KIND, showsMask } from './net.js';
import { QUICKNET, deriveOutcome, fetchRound, roundAt, roundTime, verifyRound, drawRound } from './drand.js';
import { BATTERY, PVP, JOUST, JOUST_BASE, DRAGON_DRAW, HERO_BOX, dragonDrawId, dragonKindAt, summonCost, FUSION, MINT_TIER, mintCost, mintPrice } from './data.js';
import { roundCot, spendBase, PRICE_FACTOR } from './realmlive.js';
import { normalizePity, summonBatch } from './summon.js';
import { rollFusions } from './fusion.js';
import { nextRarity, rollBox, rollStats, boxRefund, canOpenBox, openBox } from './hero.js';
import { boxToMerc } from './pvpark.js';
import { rollTraining, trainChance, chanceUnder, LEGACY_TRAIN_FLOOR, TRAIN_RULES, trainCost } from './trainingrules.js';
import { TRAINING } from './data.js';
import { WHEEL, wedgeAt, LOGIN, FIRSTS, dropItems, WHEEL_ALL_MAX } from './claims.js';
import { chestPick } from './tasks.js';
import { taxOf } from './marketrules.js';
import { LADDER_RULES as LADDER, tierOf, tierItems, spendGated } from './ladderrules.js';
import { LOTTERY, DRAW_KIND, drawAt, drawId, drawUniforms, drawWinners, sealedEntries } from './lottery.js';
import { spreadOf, HUNT_MULT } from './huntsim.js';
import { checkHour, checkLive, splitWhy } from './huntengine.js';
import { fightRound, dailyFight } from './promos.js';
import { rollTreasure, heroPower } from './gear.js';
import { drawSeed, playJoust, joustGearRefs, foesOf } from './joust.js';
import { luckRoll, FIELD_LUCK_RULES, FIELD_LUCK_SINCE } from './fieldluck.js';
import { FIELD_LUCK, PVP_COUNTED_FLAT_BASE } from './data.js';
import { indexOnly } from './realmlive.js';
import { resolveRaid } from './pvprules.js';
import { isFighter, checkDuelLog, DUEL_FIGHT } from './duelsim.js';
import { DUEL, DUEL_BASE } from './data.js';
import { SQUIRE } from './data.js';
import { squireFullPrice, usdRefAge, SQUIRE_USD_MAX_DAYS } from './squire.js';
import { pagePromoPrice } from './pagepromo.js';
import { boxContents } from './boxrules.js';
import { createFight, fightResult, WORLD_BOSS } from './worldboss.js';
import { VIGIL_DRAW, fightOutcome, vigilDrawId } from './raidrules.js';
import { routeOf, rollVoyage } from './expedition.js';
import { rollWorkers, rollCatch, FISH_DRAW } from './homestead.js';
import { RECRUIT_GRANT } from './data.js';
import { payAmount, usdCentsOf } from './grant.js';
import { checkClaimRef } from './claimref.js';

const json = (x) => JSON.stringify(x);
const gatedPair = (x) => Array.isArray(x) && x.length === 2 && Number.isSafeInteger(x[1]) && spendGated(x[0], x[1]);
const dataText = (e) => (typeof e.data === 'string' ? e.data : json(e.data));
const dataOf = (e) => (typeof e.data === 'string' ? JSON.parse(e.data) : e.data) || {};

async function pityBroken(rev, rr, entries) {
  const prev = entries
    .filter((x) => x.seq < rev.seq && dataOf(x).refs?.pityBefore !== undefined && dataOf(x).draw?.randomness)
    .sort((a, b) => b.seq - a.seq)[0];
  if (!prev) return null;
  const between = entries.filter((x) => x.seq > prev.seq && x.seq < rev.seq);
  if (between.some((x) => x.kind === 'account_reset' || (Array.isArray(dataOf(x).refs?.heroes) && dataOf(x).refs.pityBefore === undefined))) return null;
  const pd = dataOf(prev);
  const rule = Object.hasOwn(RULES, pd.kind) ? RULES[pd.kind] : null;
  if (!rule?.after) return null;
  const pa = dataOf(entries.find((x) => dataOf(x).actionId === pd.actionId && dataOf(x).stage === 'act') || { data: {} }).refs || {};
  try {
    const u = await deriveOutcome(pd.draw.randomness, pd.actionId, pd.kind, rule.count(pa, pd.refs));
    return json(normalizePity(rr.pityBefore)) !== json(normalizePity(rule.after(u, pa, pd.refs)));
  } catch {
    return null;
  }
}

export async function verifyChain(entries, opts = {}) {
  const list = [...entries].sort((a, b) => a.seq - b.seq);
  for (let i = 1; i < list.length; i++) if (list[i].seq !== list[i - 1].seq + 1) return { ok: false, at: list[i].seq, why: 'gap' };
  const first = list[0];
  if (!first) return { ok: true, head: GENESIS };
  return verifyAuditChain(list.map((e) => ({ ...e, data: e.data == null ? null : dataText(e) })), first.seq === 1 ? GENESIS : first.prev, { realm: opts.realm === true });
}

const slice = (u, from = 0, to = u.length) => {
  let i = from;
  return () => {
    if (i >= to) throw new Error('rule read more uniforms than its share');
    return u[i++];
  };
};

function wheelShare(r) {
  if (r.of === undefined) return { of: 1, i: 0 };
  const ok = Number.isSafeInteger(r.of) && r.of >= 1 && r.of <= WHEEL_ALL_MAX && Number.isSafeInteger(r.spin) && r.spin >= 1 && r.spin <= r.of;
  if (!ok) throw new Error('wheel spin out of its draw');
  return { of: r.of, i: r.spin - 1 };
}

const ORDER = (() => { const o = []; for (let r = 'free'; r; r = nextRarity(r)) o.push(r); return o; })();
const rank = (r) => ORDER.indexOf(r);

const PRE_PRICE_FACTOR_BALANCES = new Set([
  'a17c16fa8c2656b598ca69b1c98a6a06bd01d4870f94a85e02058d67bf19cd2e',
  'ef003a180809d82fa4e80b3bab135f381fbadeb68c86340c884f8fc56a4b7741',
  'd77330a94438619633af47ae85975e1e9005abff8e39c87a2d69b440f9aca3e5',
  '3edf7c6ae47c966ad72d6b6732dddca8ce36ef4ead4a2c6cfa6178f11b5f7d8c',
  '0819e92bb6dccc556b33c8d211e298910155c49239ab1fa4895f3385247b4c4b',
  'e5e03f27858bfe9d5e9ed478471363460935bcde76717a68de7b86ba4d36363f',
]);

function duelWinCap(ctx) {
  const now = milli(2 * spendBase(DUEL_BASE.entry) - spendBase(DUEL_BASE.pool));
  const e = ctx?.act || ctx?.entry;
  return eraIn(ctx, e) === 'new' ? now : Math.max(now, milli(DUEL_BASE.win));
}

export const PRICE_FACTOR_FROM = Date.UTC(2026, 10, 20, 16);
export const STAMP_SLACK_MS = 60e3;
export function stampEra(x, entries = [], o = {}) {
  const d = dataOf(x);
  if (d.v !== 2) return 'either';
  const s = d.balance;
  const old = s !== undefined && PRE_PRICE_FACTOR_BALANCES.has(s);
  if (s !== undefined && !old) return 'new';
  if (o.mainnet === true) return old ? 'bad' : 'new';
  const t = Number.isSafeInteger(d.draw?.round) ? roundTime(d.draw.round, o.info || QUICKNET) : x.ts;
  if (old && !(t < PRICE_FACTOR_FROM + STAMP_SLACK_MS)) return 'bad';
  if (!old && !(t < BALANCE_STAMP_FROM)) return 'new';
  const later = entries.some((y) => {
    if (!(y.seq < x.seq)) return false;
    const b = dataOf(y).balance;
    return b !== undefined && (!old || !PRE_PRICE_FACTOR_BALANCES.has(b));
  });
  if (later) return old ? 'bad' : 'new';
  if (!entries.some((y) => y.seq === 1)) return 'wait';
  return old ? 'old' : 'either';
}

const eraKind = (kind) => Object.hasOwn(PRICES, kind) || kind === 'mailBox' || kind === 'dragonBox';

function eraIn(ctx, x) {
  if (!x) return 'either';
  if (ctx?.era) return ctx.era(x);
  const s = dataOf(x).balance;
  return s === undefined ? 'either' : PRE_PRICE_FACTOR_BALANCES.has(s) ? 'old' : 'new';
}

export const BALANCE_STAMP_FROM = Date.UTC(2026, 10, 13);
export const JOUST_WIN_FROM = Date.UTC(2026, 10, 15);

export function joustCharge(act, entries) {
  const id = act ? dataOf(act).refs?.entry : undefined;
  return typeof id === 'string' ? (entries || []).find((x) => dataOf(x).actionId === id && dataOf(x).stage === 'act') || null : act;
}

function liveAct(e, entries) {
  const d = dataOf(e);
  const run = d.actionId ? entries.filter((x) => dataOf(x).actionId === d.actionId).sort((x, y) => x.seq - y.seq) : [];
  const acts = run.filter((x) => dataOf(x).stage === 'act');
  const cancels = run.filter((x) => dataOf(x).stage === 'cancel');
  if (!cancels.length && acts.length <= 1) return { act: d.stage === 'act' ? e : acts[0] || null, cancelled: false };
  const lastBefore = (seq) => acts.filter((x) => x.seq < seq).pop() || null;
  const voided = new Set();
  for (const c of cancels) {
    const p = lastBefore(c.seq);
    if (!p) return entries.some((x) => x.seq === 1) ? null : 'wait';
    if (p.kind !== c.kind || voided.has(p) || run.some((x) => x.seq > p.seq && x.seq < c.seq && dataOf(x).stage === 'reveal')) return null;
    voided.add(p);
  }
  if (acts.slice(0, -1).some((x) => !voided.has(x))) return null;
  if (d.stage === 'act') return { act: e, cancelled: voided.has(e) };
  const act = lastBefore(e.seq);
  return act && !voided.has(act) ? { act, cancelled: false } : null;
}

export function matchJoinOk(act, entries, era) {
  const a = dataOf(act).refs || {};
  if (a.match === undefined) return true;
  const join = typeof a.entry === 'string' ? entries.find((x) => x !== act && dataOf(x).actionId === a.entry && dataOf(x).stage === 'act') : null;
  if (!join) return entries.some((x) => x.seq === 1) ? false : 'wait';
  const j = dataOf(join);
  const jr = j.refs || {};
  if (join.kind !== act.kind || jr.queue !== 'join' || join.seq > act.seq || priceOk(join, ...(era ? [era(join)] : [])) !== true) return false;
  const binds = entries.filter((x) => x.kind === act.kind && dataOf(x).stage === 'act' && dataOf(x).refs?.match !== undefined && dataOf(x).refs?.entry === a.entry)
    .sort((x, y) => x.seq - y.seq);
  const released = (p, q) => entries.some((y) => {
    const yd = dataOf(y);
    return y.kind === act.kind && y.seq > p.seq && y.seq < q.seq && yd.actionId === dataOf(p).actionId
      && (yd.stage === 'cancel' || (yd.stage === 'reveal' && yd.refs?.cancelled === true));
  });
  for (let i = 1; i < binds.length; i++) if (!released(binds[i - 1], binds[i])) return false;
  if (act.kind === 'duel') return !!a.costs && !!a.pools && a.costs[a.side] === chargeOf(j) && a.pools[a.side] === jr.pool;
  return a.win === jr.win && !!a.free === !!jr.free;
}

function joustWinCap(ctx, draw, info) {
  const now = milli(spendBase(JOUST_BASE.entry) - spendBase(JOUST_BASE.pool));
  const e = (ctx?.act && joustCharge(ctx.act, ctx.entries)) || ctx?.act || ctx?.entry;
  const stamp = e ? dataOf(e).balance : undefined;
  const old = ctx?.era ? eraIn(ctx, e) !== 'new'
    : stamp === undefined ? !!draw && roundTime(draw.round, info) < BALANCE_STAMP_FROM : PRE_PRICE_FACTOR_BALANCES.has(stamp);
  return old ? Math.max(now, milli(JOUST_BASE.win)) : now;
}

function boxEras(ctx) {
  const era = eraIn(ctx, ctx?.entry || ctx?.act);
  return era === 'new' ? [false] : era === 'old' ? [true] : [false, true];
}

export const RULES = {
  summon: {
    act: true,
    count: (a, r) => 3 * r.n,
    check: (u, a, r) => {
      if (!Number.isSafeInteger(a.n) || a.n !== r.n) return false;
      const n = r.n;
      const res = summonBatch(n, normalizePity(r.pityBefore), slice(u, 0, 2 * n));
      return res.length === r.heroes.length && res.every((x, i) => x.key === r.heroes[i][1] && (u[2 * n + i] < BATTERY.chance) === r.heroes[i][2]);
    },
    after: (u, a, r) => {
      const bars = normalizePity(r.pityBefore);
      summonBatch(r.n, bars, slice(u, 0, 2 * r.n));
      return bars;
    },
  },
  fusion: {
    count: (a) => 3 * a.fusions,
    check: (u, a, r) => {
      const res = rollFusions(a.rarity, a.fusions, slice(u, 0, 2 * a.fusions));
      return json(res.map(({ key, rarity, crit }) => ({ key, rarity, crit }))) === json(r.results);
    },
  },
  heroBox: {
    count: (a) => 3 * a.boxes,
    check: (u, a, r, extra, draw, ctx) => {
      const paid = Object.values(dataOf(ctx?.entry || {}).delta || {});
      if (paid.length > 1 || paid.some((x) => !(x > 0)) || (paid[0] || 0) !== milli(r.refund + (r.back || 0))) return false;
      if (r.unopened !== undefined && a.price > 0 && r.back !== r.unopened * a.price) return false;
      const [from, to] = r.uniforms || [];
      const rng = slice(u, from, to);
      const rolled = rollBox(rng);
      if (r.forced ? !(rank(rolled) <= rank(r.was) && r.rolled === nextRarity(r.was)) : rolled !== r.rolled) return false;
      const pity = r.forced ? (ctx?.entry ? boxPityOk(ctx.entry, r, ctx.entries || []) : null) : true;
      if (pity === false) return false;
      const up = rank(r.rolled) > rank(r.was);
      if (up !== r.up || r.to !== (up ? r.rolled : r.was)) return false;
      const refunds = a.price > 0 ? [Math.round(a.price * HERO_BOX.refund)]
        : heroBoxBeforePriceRef(ctx?.act) ? priceEras(dataOf(ctx.act)).map((e) => Math.round(priced(HERO_BOX.price, e) * HERO_BOX.refund)) : [boxRefund()];
      if (!refunds.some((refund) => r.refund === (!up && r.rolled === r.was ? refund : 0))) return false;
      const ok = !up || json(rollStats(r.rolled, rng)) === json(r.stats);
      return ok && pity === null ? null : ok;
    },
  },
  train: {
    count: () => 1,
    check: (u, a, r) => {
      if (r.chance !== a.chance) return false;
      if (a.floor === undefined) {
        return trainChance(a.tries, LEGACY_TRAIN_FLOOR) === a.chance && rollTraining(a.tries, () => u[0], LEGACY_TRAIN_FLOOR) === r.ok;
      }
      const rules = [TRAINING.chance, ...TRAIN_RULES].filter((x) => x.floor === a.floor);
      if (!rules.some((x) => chanceUnder(x, a.tries) === a.chance)) return false;
      return (u[0] * 100 < a.chance) === r.ok;
    },
  },
  farmWorker: {
    count: (a, r) => r.n,
    check: (u, a, r) => {
      const got = rollWorkers(r.n, slice(u, 0, r.n));
      return Array.isArray(r.workers) && got.length === r.workers.length && got.every((x, i) => x === r.workers[i][1]);
    },
  },
  farmFish: {
    count: (a, r) => FISH_DRAW * r.n,
    check: (u, a, r) => Number.isSafeInteger(a.n) && a.n === r.n && json(rollCatch(r.n, slice(u, 0, FISH_DRAW * r.n))) === json(r.fish),
  },
  wheel: {
    count: (a, r) => 4 * wheelShare(r).of,
    check: (u, a, r) => {
      const { i } = wheelShare(r);
      const s = u.slice(4 * i, 4 * i + 4);
      if (wedgeAt(s[0]) !== r.wedge || json(WHEEL[r.wedge].items) !== json(r.items)) return false;
      const rolls = r.items.some((it) => it.kind === 'summon' || it.kind === 'herobox');
      return replayRewards(s.slice(1), r.items, r) ?? (rolls ? null : true);
    },
  },
  dailyChest: {
    count: () => 1,
    check: (u, a, r) => chestPick(u[0], a.day, a.plan ?? null, a.pick ?? 1).kind === r.chest,
  },
  offer: {
    count: (a) => 3 * heroTotal(a.rolls),
    check: (u, a, r) => {
      const n = heroTotal(a.rolls);
      const bars = normalizePity(r.pityBefore);
      const rng = slice(u, 0, 2 * n);
      const res = a.rolls.flatMap(([floor, k]) => summonBatch(k, bars, rng, floor ?? undefined));
      return res.length === r.heroes.length && res.every((x, i) => x.key === r.heroes[i][1] && (u[2 * n + i] < BATTERY.chance) === r.heroes[i][2]);
    },
    after: (u, a, r) => {
      const bars = normalizePity(r.pityBefore);
      const rng = slice(u, 0, 2 * heroTotal(a.rolls));
      for (const [floor, k] of a.rolls) summonBatch(k, bars, rng, floor ?? undefined);
      return bars;
    },
  },
  dungeonSend: {
    count: () => 2,
    check: (u, a, r) => (r.missing ? null : r.luck === a.luck && json(rollTreasure(r.luck, slice(u, 0, 2))) === json({ slot: r.slot, rarity: r.rarity })),
  },
  voyageSend: {
    count: () => 1,
    check: (u, a, r) => {
      if (r.missing) return null;
      const route = routeOf(r.route);
      if (!route || r.route !== a.route || r.power !== a.power || r.seed !== Math.floor(u[0] * 4294967296) >>> 0) return false;
      const out = rollVoyage(route, r.power, r.seed);
      return out.storm === r.storm && out.total === r.total && json(out.gems) === json(r.gems);
    },
  },
  hunt: { count: (a, r) => huntCount(r), check: (u, a, r, extra, draw, ctx) => huntCheck(u, r, ctx.info, draw, ctx) },
  away: { count: () => 1, check: (u, a, r, extra, draw, ctx) => huntCheck(u, r, ctx.info, draw, ctx) },
  lotteryDraw: {
    id: (r) => drawId(r.day),
    count: () => LOTTERY.winners,
    async check(u, a, r, extra, draw) {
      if (!extra || !Array.isArray(extra.entries)) return null;
      const list = sealedEntries(extra.entries.map((x) => ({ name: x.acct, tickets: x.tickets, banned: x.banned === true })));
      const seal = toHex(await sha256(utf8(json({ v: 1, day: r.day, round: draw.round, chain: draw.chain, entries: list }))));
      if (seal !== r.seal) return false;
      const won = drawWinners(list, null, drawUniforms(u)).map((x) => ({ acct: x.name, tickets: x.tickets }));
      return json(won) === json(r.winners);
    },
  },


  joust: {
    act: true,
    count: () => 1,
    check: (u, a, r, extra, draw, ctx) => {
      if (r.cancelled) return a.match !== undefined && r.match === a.match && r.side === a.side && r.seed === undefined && r.won === undefined && r.pay === undefined && noChestPay(ctx);
      const seed = drawSeed(u[0]);
      if (r.seed !== seed || !Array.isArray(a.squad)) return false;
      const squad = a.squad.map(([id, key, level], i) => {
        const g = a.gear?.[i];
        const gear = g && g.some(Boolean) ? { atk: g[0], def: g[1], hp: g[2], ...(g.length > 3 && g[3] ? { spd: g[3] } : {}) } : null;
        return { id, key, level, ...(gear ? { gear } : {}) };
      });
      const { rival, gearB, res } = playJoust(seed, a.rating, squad, heroPower, Array.isArray(a.foes) ? foesOf(a.foes) : undefined);
      const b = a.side === 'b';
      if (b && !Number.isSafeInteger(a.mine)) return false;
      const won = b ? !res.won : res.won;
      const from = b ? a.mine : a.rating;
      const rating = won ? from + JOUST.winRating : Math.max(JOUST.floor, from - JOUST.lossRating);
      if (a.win !== undefined && !(Number.isSafeInteger(a.win) && a.win >= 0 && a.win <= joustWinCap(ctx, draw, ctx?.info))) return false;
      if (a.win === undefined && !(draw && roundTime(draw.round, ctx?.info) < JOUST_WIN_FROM)) return false;
      const win = a.win ?? milli(JOUST_BASE.winBefore);
      const met = b
        ? { name: a.name, rating: a.rating, squad: squad.map((h) => [h.key, h.level]), ...joustGearRefs(squad.map((h) => h.gear || null)) }
        : { name: rival.name, rating: rival.rating, squad: rival.squad.map((h) => [h.key, h.level]), ...joustGearRefs(gearB) };
      return won === r.won && res.rounds === r.rounds && r.rating === rating && r.pay === (won ? win : 0) && json(met) === json(r.rival);
    },
  },
  duel: {
    count: () => 0,
    check: (u, a, r, extra, draw, ctx) => {
      if (a.match === undefined || r.match !== a.match || r.side !== a.side) return false;
      if (r.cancelled) return r.won === undefined && r.pay === undefined && noChestPay(ctx);
      if (!isFighter(a.a?.fighter) || !isFighter(a.b?.fighter)) return false;
      const n = (v) => Number.isSafeInteger(v) && v >= 0;
      const { costs, pools } = a;
      if (!costs || !pools || ![costs.a, costs.b, pools.a, pools.b].every(n) || pools.a > costs.a || pools.b > costs.b) return false;
      if (a.win !== costs.a + costs.b - pools.a - pools.b || a.win > duelWinCap(ctx)) return false;
      if (![r.hpA, r.hpB, r.ticks].every(n)) return false;
      if (!/^[0-9a-f]{64}$/.test(String(r.log)) || r.maxA !== a.a.fighter.hp || r.maxB !== a.b.fighter.hp || r.hpA > r.maxA || r.hpB > r.maxB) return false;
      if (r.draw) {
        if (r.winner !== null || r.won !== false || r.pay !== 0 || r.pool !== 0 || r.refund !== costs[a.side]) return false;
      } else if (!(r.winner === 'a' || r.winner === 'b') || r.won !== (r.winner === a.side) || r.pay !== (r.won ? a.win : 0) || r.pool !== pools[a.side]) return false;
      if (r.reason === 'noshow') return r.draw === true;
      if (r.reason === 'forfeit') return !r.draw;
      if (r.reason !== 'ko' && r.reason !== 'time') return false;
      const x = r.hpA * r.maxB, y = r.hpB * r.maxA;
      return x === y ? r.draw === true : r.winner === (x > y ? 'a' : 'b');
    },
  },
  pvpRaid: {
    count: () => 1,
    check: (u, a, r, extra, draw, ctx) => {
      if (r.battle !== a.battle) return false;
      if (r.pay !== undefined ? !(r.won && r.pay === 'pvpLoot' && lootPaid(r, r.gain, ctx)) : !noChestPay(ctx)) return false;
      if (a.att === undefined ? raidActInputs(draw, ctx) : (json(a.att) !== json(r.att) || a.lootLeft !== r.lootLeft || json(a.defender?.dfd) !== json(r.dfd))) return false;
      if (r.att === undefined && !legacyRaid(draw, ctx)) return false;
      if (r.att !== undefined) {
        if (a.defender && (a.defender.free !== r.free || a.defender.chest !== r.chest)) return false;
        return raidReplay(r, draw, ctx).some((o) => o.won === r.won && o.take === r.take && o.gain === r.gain && o.burned === r.burned && countedMatches(o, r)
          && luckMatches(o, r));
      }
      if (a.defender?.free) return r.won === true && r.roll === undefined;
      if (r.roll !== undefined && r.roll !== luckRoll(draw.randomness, r.battle)) return false;
      return r.gain === Math.floor(r.take * PVP.toRaider) && r.burned === r.take - r.gain && (r.won || r.take === 0);
    },
  },
  pvpDefense: {
    count: () => 1,
    check: (u, a, r, extra, draw, ctx) => {
      if (r.battle !== a.battle || r.attacker !== a.attacker) return false;
      if (r.cancelled) return r.take === 0 && r.ret === 0 && r.pay === undefined && noChestPay(ctx);
      if (r.pay !== undefined ? !(r.held && r.pay === 'pvpDefend' && lootPaid(r, r.ret, ctx)) : !noChestPay(ctx)) return false;
      if (a.att === undefined ? raidActInputs(draw, ctx) : (json(a.att) !== json(r.att) || json(a.dfd) !== json(r.dfd) || a.lootLeft !== r.lootLeft)) return false;
      if (r.att === undefined && !legacyRaid(draw, ctx)) return false;
      if (r.att !== undefined) {
        if (a.free !== r.free || a.chest !== r.chest || !!a.revenge !== r.revenge) return false;
        return raidReplay(r, draw, ctx).some((o) => r.held === !o.won && r.raidTake === o.take && luckMatches(o, r));
      }
      if (a.free) return r.held === false && r.roll === undefined;
      return r.roll === undefined || r.roll === luckRoll(draw.randomness, r.battle);
    },
  },
  pvpReroll: {
    count: () => PVP.list,
    check: (u, a, r, extra, draw, ctx) => {
      if (!Array.isArray(r.pool)) return legacyRaid(draw, ctx) ? null : false;
      if (a.pool === undefined ? !legacyRaid(draw, ctx) : a.pool !== r.pool.length) return false;
      const pool = [...r.pool];
      const n = Math.min(PVP.list, pool.length);
      for (let i = 0; i < n; i++) {
        const j = i + Math.floor(u[i] * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return json(pool.slice(0, n)) === json(r.rows);
    },
  },
  mailBox: {
    count: () => 8,
    check: (u, a, r, extra, draw, ctx) => {
      if (a.herobox) return replayRewards(u, [{ kind: 'herobox', n: a.herobox }], r);
      let key;
      if (a.box) {
        const c = boxEras(ctx).map((base) => boxContents(a.box, u, base)).find((x) => r.amount === milli(x.coins));
        if (!c || r.to !== 'chest') return false;
        key = c.hero;
      } else if (a.hero) key = a.hero;
      else if (a.mint !== undefined && r.hero) {
        if (r.pityBefore === undefined) return null;
        key = summonBatch(1, normalizePity(r.pityBefore), slice(u, 0, 7), a.mint)[0].key;
      } else return r.hero ? null : false;
      if (!key) return !r.hero;
      return !!r.hero && r.hero.key === key && r.hero.battery === u[7] < BATTERY.chance;
    },
  },
  dragonBox: {
    count: () => 0,
    async check(u, a, r, extra, draw, ctx) {
      const grant = ctx.entries.map(dataOf).find((g) => g.fight === r.fight && Array.isArray(g.boxes) && g.boxes.some((b) => b.id === r.box));
      if (!grant || !ctx.acct) return null;
      if (grant.round !== draw.round || grant.boxes.find((b) => b.id === r.box).key !== r.key) return false;
      if (grant.mult !== undefined && (r.index ?? 1) !== grant.mult) return false;
      const uu = await deriveOutcome(draw.randomness, r.box, `${r.fight}|${ctx.acct}|${r.box}|${r.key}|${grant.rh}`);
      const paid = (c) => (r.index > 0 && r.index < 1 ? Math.round(c.coins * r.index * 100) / 100 : c.coins);
      return boxEras(ctx).some((base) => {
        const c = boxContents(r.key, uu, base);
        return paid(c) === r.coins && c.gems === r.gems && !!c.hero === !!r.hero;
      });
    },
  },
  passLevel: { count: (a) => passDrawCount(a.items), check: (u, a, r) => replayRewards(u, a.items, r) },
  arkBuy: { count: (a) => passDrawCount(a.items), check: (u, a, r) => replayRewards(u, a.items, r) },
  arkOpen: { count: (a) => passDrawCount(a.items), check: (u, a, r) => replayRewards(u, a.items, r) },
  wlPromo: { count: (a) => passDrawCount(a.items), check: (u, a, r) => replayRewards(u, a.items, r) },
  beginnerArk: { count: (a) => passDrawCount(a.items), check: (u, a, r) => replayRewards(u, a.items, r) },
  pvpArk: { count: (a) => passDrawCount(a.items), check: (u, a, r) => replayRewards(u, a.items, r) },
  achievement: {
    count: (a) => passDrawCount(a.items),
    check: (u, a, r) => {
      if (Array.isArray(a.claims)) {
        const held = a.held === undefined ? [] : a.held;
        const released = a.released === undefined ? [] : a.released;
        if (!Array.isArray(held) || !Array.isArray(released) || !held.every(gatedPair) || !released.every(gatedPair)) return false;
        if ((!a.claims.length && !released.length) || json(r.claims) !== json(a.claims.map((c) => (Array.isArray(c) ? [c[0], c[1]] : c)))) return false;
        const owed = new Set(held.map((x) => json(x)));
        let xp = 0;
        const items = [];
        for (const c of a.claims) {
          const [id, tier, value, goal] = Array.isArray(c) ? c : [];
          const l = LADDER[id];
          if (!l || !Number.isSafeInteger(tier) || tier < 1 || tier > l.goals.length || goal !== l.goals[tier - 1] || tierOf(l, value) < tier) return false;
          xp += l.xp[tier - 1];
          if (!owed.delete(json([id, tier]))) items.push(...tierItems(tier));
        }
        if (owed.size) return false;
        for (const [, tier] of released) items.push(...tierItems(tier));
        if (json(a.items) !== json([{ kind: 'xp', n: xp }, ...items])) return false;
        return replayRewards(u, a.items, r);
      }
      const l = LADDER[a.id];
      if (!l || !Number.isSafeInteger(a.tier) || a.tier < 1 || a.tier > l.goals.length || r.tier !== a.tier || r.id !== a.id) return false;
      if (a.goal !== l.goals[a.tier - 1] || tierOf(l, a.value) < a.tier) return false;
      if (a.held !== undefined && (a.held !== true || !spendGated(a.id, a.tier))) return false;
      if (json(a.items) !== json([{ kind: 'xp', n: l.xp[a.tier - 1] }, ...(a.held ? [] : tierItems(a.tier))])) return false;
      return replayRewards(u, a.items, r);
    },
  },
  bossPrize: {
    count: () => 0,
    async check(u, a, r, extra, draw, ctx) {
      const ev = extra;
      if (!ev?.book || !Array.isArray(ev.seeds) || ev.since || ev.more || ev.eventId !== r.event || !ctx.acct) return null;
      const book = { rooms: ev.book.rooms, joins: ev.book.joins.map(({ void: _v, ...j }) => j) };
      const seal = toHex(await sha256(utf8(json({ v: 1, event: ev.eventId, maxHp: ev.maxHp, fund: ev.fund, rooms: book.rooms, joins: book.joins }))));
      const seeds = toHex(await sha256(utf8(ev.seeds.join(','))));
      if (seal !== r.seal || seeds !== r.seeds || ev.seeds.at(-1) !== draw.randomness) return false;
      const w = { start: ev.start, end: ev.end, boss: ev.boss };
      if (r.beacons !== undefined) {
        const bs = ev.beacons;
        if (!Array.isArray(bs) || bs.length !== ev.seeds.length) return false;
        if (toHex(await sha256(utf8(json(bs.map((b) => [b.step, b.round, b.randomness, b.signature]))))) !== r.beacons) return false;
        for (let i = 0; i < bs.length; i++) {
          const b = bs[i];
          if (b.step !== i || b.round !== drawRound(w.start + (i + 1) * WORLD_BOSS.step * 1000, ctx.info) || b.randomness !== ev.seeds[i]) return false;
          if (!(await verifyRound({ round: b.round, randomness: b.randomness, signature: b.signature }, ctx.info))) return false;
        }
      }
      const f = createFight(w, [], ev.maxHp, { book: { ...book, seeds: ev.seeds } }).advance(ev.seeds.length).close();
      const res = fightResult(w, f, ev.fund);
      const i = res.ranking.findIndex((x) => x.name === ctx.acct);
      if (i < 0) return false;
      const x = res.ranking[i];
      return r.place === i + 1 && r.lords === res.ranking.length && r.killed === res.killed && r.dmg === x.dmg
        && json(r.boxes) === json(x.boxes) && json(r.medals) === json(x.medals) && json(r.looks) === json(x.looks)
        && creditsExactly(ctx, { warBal: milli(x.prize) });
    },
  },
  vigilPrize: {
    count: () => 0,
    async check(u, a, r, extra, draw, ctx) {
      const v = extra;
      if (!v || v.id !== r.fight || !Array.isArray(v.list) || !Number.isFinite(v.result?.rewardPool) || !ctx.acct) return null;
      const seal = toHex(await sha256(utf8(json({ v: 1, id: r.fight, round: draw.round, chain: draw.chain, list: v.list }))));
      if (seal !== r.seal) return false;
      const w = await deriveOutcome(draw.randomness, vigilDrawId(r.fight), VIGIL_DRAW, v.list.length);
      const o = fightOutcome(v.list, w, { n: v.n, at: v.at, boss: r.boss, rewardPool: v.result.rewardPool });
      const x = o.rows.find((y) => y.acct === ctx.acct);
      if (!x) return false;
      return r.killed === o.killed && r.entry === x.entry && r.rarity === x.rarity && r.dmg === x.dmg && r.rank === x.rank && r.of === x.of
        && r.prize === milli(x.prize) && r.pool === milli(x.pool) && (r.box || '') === (x.box || '');
    },
  },
};

export function boxPityOk(rev, r, entries) {
  const need = HERO_BOX.ranks?.[r.was]?.pity;
  if (!Number.isSafeInteger(need) || !Number.isSafeInteger(r.box) || r.box < 1) return false;
  const id = dataOf(rev).actionId;
  const batch = entries.filter((x) => x.kind === 'heroBox' && dataOf(x).actionId === id && dataOf(x).stage === 'reveal').map((x) => dataOf(x).refs || {});
  const ups = batch.filter((b) => b.box < r.box && b.up && b.to === r.was).map((b) => b.box);
  if (ups.length) return r.box - Math.max(...ups) >= need;
  let count = r.box;
  if (count >= need) return true;
  const first = Math.min(rev.seq, ...entries.filter((x) => x.kind === 'heroBox' && dataOf(x).actionId === id).map((x) => x.seq));
  const before = entries.filter((y) => y.seq < first).sort((a, b) => b.seq - a.seq);
  for (const x of before) {
    const d = dataOf(x);
    if (x.kind === 'account_reset' || x.kind === 'accountMoveIn' || (x.kind !== 'create' && d.v !== 2)) return null;
    if (d.stage !== 'reveal') continue;
    const rows = x.kind === 'heroBox' ? [{ from: d.refs?.was, up: d.refs?.up, to: d.refs?.to }] : Array.isArray(d.refs?.hero) ? [...d.refs.hero].reverse() : [];
    for (const b of rows) {
      if (b?.up && b.to === r.was) return count >= need;
      if (b?.up || b?.from !== r.was) return null;
      if (++count >= need) return true;
    }
  }
  if (before.some((x) => x.seq === 1)) return r.was === 'free' && count >= need;
  return null;
}

function replayRewards(u, items, r) {
  if (r.pityBefore === undefined || !Array.isArray(items)) return null;
  const next = slice(u);
  const bars = normalizePity(r.pityBefore);
  const heroes = [];
  const boxes = [];
  let hero = r.heroBefore ? { ...r.heroBefore } : null;
  const summon = (n, floor, top) => { for (const x of summonBatch(n, bars, next, floor, top)) heroes.push([x.key, next() < BATTERY.chance]); };
  for (const it of items) {
    if (it.kind === 'summon') summon(it.n || 1, it.floor, it.top);
    if (it.kind !== 'herobox') continue;
    if (!hero) return false;
    for (let k = 0; k < (it.n || 1); k++) {
      hero = { ...hero };
      if (boxToMerc(it, hero.rarity)) { summon(1, it.merc, it.merc); continue; }
      if (!canOpenBox(hero)) { summon(1, it.rarity === 'mythic' ? 'mythic' : undefined); continue; }
      const b = openBox(hero, next, it.rarity || null);
      boxes.push({ rolled: b.rolled, from: b.from, to: b.to, up: b.up });
    }
  }
  return json(heroes) === json((r.heroes || []).map((h) => [h[1], h[2]])) && json(boxes) === json(r.hero || []);
}

const milli = (coins) => Math.round(coins * 1000);

const creditsExactly = (ctx, want) => {
  const delta = ctx?.entry ? dataOf(ctx.entry).delta || {} : {};
  return [...new Set([...Object.keys(delta), ...Object.keys(want)])].every((k) => (delta[k] || 0) === (want[k] || 0));
};

const PAID = {
  hunt: (a, r, ctx) => creditsExactly(ctx, { chest: r.chest, war: r.war, warBal: r.roiVault || 0 }),
  away: (a, r, ctx) => creditsExactly(ctx, { chest: r.chest, war: r.war, warBal: r.roiVault || 0 }),
  joust: (a, r, ctx) => (r.cancelled ? null : creditsExactly(ctx, { chest: r.pay || 0 })),
  duel: (a, r, ctx) => {
    if (r.cancelled) return null;
    if (!r.draw) return creditsExactly(ctx, { chest: r.pay || 0 });
    const back = r.refund || 0;
    if (!back) return creditsExactly(ctx, {});
    if (r.to === 'bot') return creditsExactly(ctx, { bot: back });
    if (r.order) return r.order.amount === back && creditsExactly(ctx, { chest: back });
    if (r.to === 'chest') {
      const lots = Array.isArray(r.lots) ? r.lots : [];
      if (!lots.every((x) => Array.isArray(x) && Number.isFinite(x[1]) && x[1] > 0) || lots.reduce((t, x) => t + x[1], 0) > back) return false;
      return creditsExactly(ctx, { chest: back });
    }
    return false;
  },
  mailBox: (a, r, ctx) => creditsExactly(ctx, a.box ? { chest: r.amount } : {}),
  wlPromo: (a, r, ctx) => creditsExactly(ctx, {}),
  dragonBox: (a, r, ctx) => creditsExactly(ctx, { bot: milli(r.coins || 0) }) || creditsExactly(ctx, { chest: milli(r.coins || 0) }),
  heroBox: (a, r, ctx) => {
    const delta = dataOf(ctx.entry).delta || {};
    const paidFrom = Object.entries(dataOf(ctx.act || {}).delta || {}).filter(([, v]) => v < 0).map(([k]) => k);
    const ok = paidFrom.length ? paidFrom : ['bot', 'chest'];
    return Object.entries(delta).every(([k, v]) => !v || ok.includes(k));
  },
  pvpRaid: (a, r, ctx) => creditsExactly(ctx, r.pay !== undefined ? { chest: r.paid, warBal: r.roiVault || 0 } : {}),
  pvpDefense: (a, r, ctx) => creditsExactly(ctx, {
    war: -((r.take || 0) + (r.ret || 0)), ...(r.pay !== undefined ? { chest: r.paid, warBal: r.roiVault || 0 } : {}),
  }),
  bossPrize: () => null,
};

export const paidOk = (kind, a, r, ctx) => (Object.hasOwn(PAID, kind) ? PAID[kind](a, r, ctx) : creditsExactly(ctx, {}));

const priced = (catalog, d) => {
  const base = d.atFactor1 && PRICE_FACTOR !== 1 ? Math.round(catalog / PRICE_FACTOR) : catalog;
  return d.index?.charge > 0 && d.index.charge !== 1 ? roundCot(base * d.index.charge) : base;
};

export const HERO_BOX_PRICE_REF_FROM = Date.UTC(2026, 10, 14, 7, 28, 40);

function heroBoxBeforePriceRef(act) {
  const round = dataOf(act || {}).draw?.round;
  return Number.isFinite(act?.ts) && act.ts < HERO_BOX_PRICE_REF_FROM && Number.isSafeInteger(round) && roundTime(round, QUICKNET) < HERO_BOX_PRICE_REF_FROM + 60e3;
}

const PRICES = {
  summon: (a, d) => (d.from === 'card' ? 0 : milli(a.n * priced(a.mint === MINT_TIER.id && d.from !== 'war' ? mintCost() : summonCost(), d))),
  train: (a, d) => (a.free ? 0 : milli(priced(trainCost(a.stat), d))),
  joust: (a, d) => (a.queue === 'leave' ? undefined : a.free || a.match !== undefined ? 0 : milli(priced(JOUST.entry, d))),
  duel: (a, d) => (a.queue === 'join' ? milli(priced(DUEL.entry, d)) : a.match !== undefined ? 0 : undefined),
  fusion: (a, d) => milli(a.fusions * mintPrice(priced(FUSION.cost[a.rarity], d), a.mint === MINT_TIER.id ? a : null)),
  heroBox: (a, d, act) => (a.price === undefined && heroBoxBeforePriceRef(act) ? a.boxes * milli(priced(HERO_BOX.price, d))
    : a.price === priced(HERO_BOX.price, d) ? a.boxes * milli(a.price) : NaN),
  squire: (a) => {
    if (!(a.usd?.usd > 0) || a.offer) return undefined;
    if (a.usd.price !== SQUIRE.usd) return NaN;
    const full = squireFullPrice(SQUIRE, 0, a.usd.usd);
    if (a.promo) return a.promo.full === full ? milli(pagePromoPrice(full)) : NaN;
    return milli(full);
  },
};

const PAY_POCKET = { wallet: 'bot', chest: 'chest', war: 'warBal' };

const SOLANA_SIG = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

function chargeOf(d) {
  const delta = d.delta || {};
  const moves = ['bot', 'chest', 'war', 'warBal'].map((k) => [k, delta[k] || 0]).filter(([, v]) => v);
  if (d.chain?.lamports !== undefined) return NaN;
  if (d.chain?.amount !== undefined) return d.from === 'wallet' && SOLANA_SIG.test(String(d.chain.sig)) && !moves.length ? d.chain.amount : NaN;
  if (d.from === 'card') {
    const c = d.refs?.cards;
    const n = (v) => Number.isSafeInteger(v) && v >= 0;
    return d.kind === 'summon' && !moves.length && c && n(c.invite) && n(c.stake) && c.invite + c.stake === d.refs.n ? 0 : NaN;
  }
  if (moves.some(([k, v]) => v > 0 || k !== PAY_POCKET[d.from])) return NaN;
  return -moves.reduce((t, [, v]) => t + v, 0);
}

const priceEras = (d) => (d.balance === undefined ? [d, { ...d, atFactor1: true }]
  : PRE_PRICE_FACTOR_BALANCES.has(d.balance) ? [{ ...d, atFactor1: true }] : [d]);

export function priceOk(act, era = eraIn(null, act)) {
  const d = dataOf(act);
  const rule = Object.hasOwn(PRICES, d.kind) ? PRICES[d.kind] : null;
  if (!rule || d.stage !== 'act' || d.v !== 2) return null;
  const charged = chargeOf(d);
  if (era === 'bad') return false;
  const eras = era === 'new' ? [d] : era === 'old' ? [{ ...d, atFactor1: true }] : [d, { ...d, atFactor1: true }];
  let unknown = true;
  for (const e of eras) {
    let want;
    try { want = rule(d.refs || {}, e, act); } catch { return false; }
    if (want === undefined) continue;
    unknown = false;
    if (Number.isSafeInteger(want) && charged === want) return true;
  }
  return unknown ? null : false;
}

export const USD_DAY_CACHE_MS = 10 * 60e3;

const USD_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const dayAfter = (day) => new Date(Date.parse(`${day}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);

export async function checkUsdRef(usd, ts, getDay, maxDays) {
  const day = typeof usd?.day === 'string' && USD_DAY_RE.test(usd.day) ? usd.day : null;
  if (!day || !Number.isFinite(ts)) return 'bad';
  const age = usdRefAge(day, ts);
  if (!(age >= 0 && age <= maxDays)) return 'bad';
  if (typeof getDay !== 'function') return 'wait';
  const read = async (d) => {
    const r = await getDay(d);
    return r && typeof r === 'object' ? r : null;
  };
  let rec;
  try { rec = await read(day); } catch { return 'wait'; }
  if (!rec) return 'bad';
  const { hash, anchorTx, ...body } = rec;
  if (typeof hash !== 'string' || hash !== usd.hash || rec.day !== day) return 'bad';
  if (toHex(await sha256(utf8(JSON.stringify(body)))) !== hash) return 'bad';
  if (rec.held != null || rec.avgUsd !== usd.usd) return 'bad';
  const entryDay = new Date(ts).toISOString().slice(0, 10);
  for (let d = day; d < entryDay;) {
    d = dayAfter(d);
    let next;
    try { next = await read(d); } catch { return 'wait'; }
    const clean = next && next.held == null && Number(next.avgUsd) > 0;
    const inForce = !(Number(next?.publishedAt) > ts - USD_DAY_CACHE_MS);
    if (clean && inForce) return 'bad';
  }
  return 'ok';
}

const GRANT_SCALE = 1000;
const isAmount = (x) => Number.isSafeInteger(x) && x >= 0;

function bolsaPart(fv) {
  if (!fv || typeof fv !== 'object') return NaN;
  const parts = Array.isArray(fv.parts) ? fv.parts : [fv];
  return parts.filter((p) => p?.program === 'bolsa').reduce((t, p) => t + (isAmount(p.amount) ? p.amount : NaN), 0);
}

export const GRANT_CHECKED = new Set(['grantPay', 'grantVoid', 'withdraw', 'withdrawEarly']);

export async function checkGrant(e, d, opts = {}) {
  const r = d.refs || {};
  const chest = (n) => creditsExactly({ entry: e }, { chest: n });
  if (d.kind === 'grantVoid') {
    const fv = r.farmVoid;
    return fv?.program === 'bolsa' && isAmount(fv.amount) && chest(-fv.amount) ? 'ok' : 'bad';
  }
  if (d.kind === 'withdraw' || d.kind === 'withdrawEarly') {
    if (r.farmVoid === undefined) return null;
    const part = bolsaPart(r.farmVoid);
    return isAmount(part) && isAmount(r.amount) && chest(-(r.amount + part)) ? 'ok' : 'bad';
  }
  if (d.kind !== 'grantPay') return null;
  if (r.farmVoid !== undefined) {
    const fv = r.farmVoid;
    const ok = fv?.program === 'bolsa' && isAmount(fv.amount) && r.amount === 0 && isAmount(r.released) && r.released <= fv.amount;
    return ok && chest(-(fv.amount - r.released)) ? 'ok' : 'bad';
  }
  const p = r.price || {};
  const px = p.usd;
  if (!(typeof px === 'number' && Number.isFinite(px) && px > 0) || !(r.amount > 0) || !isAmount(r.amount) || !isAmount(r.chestLeft)) return 'bad';
  if (r.amount !== payAmount(px, r.chestLeft + r.amount, GRANT_SCALE, 1)) return 'bad';
  if (r.usdCents !== usdCentsOf(r.amount, px, GRANT_SCALE) || r.usdMonth !== RECRUIT_GRANT.usdMonth) return 'bad';
  if (!chest(r.amount)) return 'bad';
  if (p.src === 'beta') return opts.mainnet !== true && px === RECRUIT_GRANT.betaUsdPx && p.day === undefined && p.dayHash === undefined ? 'ok' : 'bad';
  if (p.src !== 'index') return 'bad';
  const s = await checkUsdRef({ usd: px, day: p.day, hash: p.dayHash }, e.ts, opts.usdDay, RECRUIT_GRANT.priceMaxAgeDays);
  return s === 'bad' ? 'usdRef' : s;
}

export const checkSquireUsd = (usd, ts, getDay) => checkUsdRef(usd, ts, getDay, SQUIRE_USD_MAX_DAYS);

const passDrawCount = (items) => Math.max(1, (items || []).reduce((t, it) => t + (it.kind === 'summon' || it.kind === 'herobox' ? (it.n || 1) * 3 : 0), 0));

const itemsPaid = (items, d) => {
  const coins = (Array.isArray(items) ? items : []).reduce((t, it) => t + (it?.kind === 'chest' ? milli(Number(it.n) || 0) : 0), 0);
  return creditsExactly({ entry: { data: d || {} } }, coins ? { chest: coins } : {});
};

export const STATIC_RULES = {
  login: { check: (r, d) => (!itemsPaid(r.items, d) ? false : r.day === undefined ? null : Number.isSafeInteger(r.day) && r.day >= 1 && json(LOGIN[Math.min(LOGIN.length - 1, r.day - 1)]) === json(r.items)) },
  first: { check: (r, d) => { if (!itemsPaid(r.items, d)) return false; if (r.first === undefined) return null; const f = FIRSTS.find((x) => x.id === r.first); return !!f && json(f.items) === json(r.items); } },
  huntLive: { check: (r) => (r.prev === undefined ? null : checkLive(r, PVP.share)) },
  marketSale: { check: (r) => (r.roiIn === undefined ? null : Number.isSafeInteger(r.roiIn) && Number.isSafeInteger(r.roiPass) && r.roiPass >= 0 && Number.isSafeInteger(r.price) && Number.isSafeInteger(r.tax) && r.tax >= 0 && r.roiIn === Math.min(r.price - r.tax, r.roiPass)) },
  marketBuy: {
    check: (r, d) => {
      if (r.roiOut === undefined) return null;
      if (r.roiInv !== undefined) {
        return d?.from === 'wallet' && Number.isSafeInteger(r.price) && r.price > 0 && r.roiInv === r.price
          && r.roiTax === Math.round(taxOf(r.price / 1000) * 1000)
          && Number.isSafeInteger(r.roiPass) && r.roiPass >= 0 && r.roiOut === Math.max(0, Math.min(r.price - r.roiTax, r.roiPass));
      }
      return Number.isSafeInteger(r.roiOut) && r.roiOut > 0 && r.roiOut === r.price && (r.roiPass === undefined || (Number.isSafeInteger(r.roiPass) && r.roiPass >= 0));
    },
  },
};

const isNum = (x) => Number.isSafeInteger(x);
const isStr = (x) => typeof x === 'string';
const plainObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
export const INERT_KINDS = {
  create: { data: ['acct'], check: (d, e, opts) => e.seq === 1 && isStr(d.acct) && /^[0-9a-f]{40}$/.test(d.acct) && (!opts.acct || d.acct === opts.acct) },
  equip: {
    v2: true, stage: 'act', refs: ['piece', 'slot', 'rarity', 'forge', 'on', 'off', 'until', 'pieces', 'power'],
    check: (r) => r.pieces === undefined || (Array.isArray(r.pieces) && r.pieces.every((p) => plainObj(p) && Object.keys(p).every((k) => ['piece', 'slot', 'rarity', 'forge', 'prev'].includes(k)))),
  },
  mount: { v2: true, stage: 'act', refs: ['horse', 'rarity', 'on', 'off'] },
  medal: { v2: true, stage: 'act', refs: ['medal', 'pin'] },
  cosmetic: { v2: true, stage: 'act', refs: ['wear'], check: (r) => plainObj(r.wear) && Object.values(r.wear).every((x) => isStr(x) || isNum(x)) },
  pvpDefense: { v2: true, stage: 'cancel', refs: [] },
  nick: { data: ['nick', 'from', 'key'] },
  invite_bind: { data: ['inviter', 'code'] },
  invite_join: { data: ['invitee'] },
  social_link: { data: ['net', 'ref', 'member', 'via'] },
  social_link_refused: { data: ['net', 'ref', 'reason', 'via'] },
  social_relink: { data: ['net', 'from', 'to', 'member'] },
  social_member: { data: ['member', 'by'] },
  social_tag: { data: ['tag'] },
  social_patron: { data: ['patron'] },
};

const noDelta = (x) => x === undefined || (plainObj(x) && Object.values(x).every((n) => n === 0));

export function inertEntry(e, d, opts = {}) {
  const k = Object.hasOwn(INERT_KINDS, e.kind) ? INERT_KINDS[e.kind] : null;
  if (!k || !plainObj(d) || d.draw !== undefined || !noDelta(d.delta)) return false;
  const keys = Object.keys(d);
  if (keys.includes('acc') && !isNum(d.acc)) return false;
  if (k.v2) {
    const top = ['v', 'kind', 'actionId', 'stage', 'delta', 'refs', 'rules', 'balance', 'acc'];
    if (d.v !== 2 || d.kind !== e.kind || d.stage !== k.stage || !plainObj(d.delta) || !plainObj(d.refs)) return false;
    if (!keys.every((x) => top.includes(x)) || !Object.keys(d.refs).every((x) => k.refs.includes(x))) return false;
    return !k.check || k.check(d.refs, e, opts) === true;
  }
  if (!keys.every((x) => x === 'acc' || k.data.includes(x))) return false;
  return !k.check || k.check(d, e, opts) === true;
}

const heroTotal = (rolls) => (Array.isArray(rolls) ? rolls.reduce((t, x) => t + x[1], 0) : NaN);

const huntCount = (r) => 1 + (Array.isArray(r.dropRolls) ? Math.max(0, ...r.dropRolls.map((x) => (Number.isSafeInteger(x?.[2]) ? x[2] : 0))) : 0);

export const HUNT_ENGINE_FROM = Date.UTC(2026, 10, 14);

async function huntCheck(u, r, info, draw, ctx) {
  if (r.engine === undefined && !(draw && roundTime(draw.round, info) < HUNT_ENGINE_FROM)) return false;
  if (r.mult !== (r.fixed === true ? HUNT_MULT : spreadOf(u[0])) || splitWhy(r, PVP.share)) return false;
  if (r.gross !== undefined && r.earned !== Math.max(0, Math.floor(r.gross * r.mult * 1000))) return false;
  if (r.engine !== undefined && !checkHour(r, PVP.share).ok) return false;
  if (r.dropRolls !== undefined) {
    if (!Array.isArray(r.dropRolls) || json(r.dropRolls.map((x) => x[0])) !== json(r.drops)) return false;
    for (const [, kind, k, items] of r.dropRolls) {
      const want = kind === 'boss' && k === null ? dropItems('boss') : kind === 'wave' && Number.isSafeInteger(k) && k >= 1 ? dropItems('wave', () => u[k]) : null;
      if (!want || json(want) !== json(items)) return false;
    }
  }
  let unread = false;
  for (const f of r.fight || []) {
    const p = await fightPaid(f, r, info, ctx?.context);
    if (p === false) return false;
    if (p === null) unread = true;
  }
  return unread ? null : true;
}

async function fightPaid(f, r, info, read) {
  if (!f || !Number.isSafeInteger(f.day) || f.round !== fightRound(f.day, info) || f.end <= r.from || f.start >= r.to) return false;
  if (!Number.isSafeInteger(f.quarters) || f.quarters < 0 || !(f.bonus >= 0) || (f.locked && f.bonus !== 0)) return false;
  if (!(await verifyRound({ round: f.round, randomness: f.randomness, signature: f.signature }, info))) return false;
  let d;
  try { d = dailyFight(f.day, f.randomness, f.secret, info); } catch { return false; }
  if (d.commit !== f.commit || d.seed !== f.seed || d.start !== f.start || d.end !== f.end) return false;
  let rec;
  try { rec = typeof read === 'function' ? await read('fightCommit', { day: f.day }) : null; } catch { rec = null; }
  if (!rec || typeof rec !== 'object') return null;
  const c = dataOf(rec);
  if (!(await verifyChain([rec], { realm: true })).ok || !fightCommitBound(rec, info)) return false;
  return c.day === f.day && c.commit === f.commit;
}

const lootPaid = (r, amount, ctx) => {
  const delta = ctx?.entry ? dataOf(ctx.entry).delta || {} : {};
  const cut = r.roiCut || 0;
  const vault = r.roiVault || 0;
  return r.to === 'chest' && Number.isSafeInteger(r.paid) && r.paid >= 0 && cut >= 0 && vault >= 0 && vault <= cut
    && r.paid + cut === amount && (delta.chest || 0) === r.paid && (delta.warBal || 0) === vault
    && (cut > 0 || (r.roiPct === undefined && r.roiVault === undefined));
};

const noChestPay = (ctx) => !((ctx?.entry ? dataOf(ctx.entry).delta || {} : {}).chest);

export const RAID_INPUTS_FROM = Date.UTC(2026, 10, 13);
const legacyRaid = (draw, ctx) => !!draw && roundTime(draw.round, ctx?.info) < RAID_INPUTS_FROM;

export const RAID_ACT_INPUTS_FROM = Date.UTC(2026, 10, 17, 1, 46);
const raidActInputs = (draw, ctx) => !!draw && roundTime(draw.round, ctx?.info) >= RAID_ACT_INPUTS_FROM;

export function luckRulesAt(ts, round, info = QUICKNET) {
  const rt = roundTime(round, info);
  const t = Number.isFinite(ts) ? ts : rt;
  const out = FIELD_LUCK_RULES.filter((L) => t >= L.since && t < L.until && rt < L.until);
  if (t >= FIELD_LUCK_SINCE && rt >= FIELD_LUCK_SINCE - FIELD_LUCK_ROUND_GAP_MS) out.push(FIELD_LUCK);
  return out;
}

export const FIELD_LUCK_ROUND_GAP_MS = 90e3;

const countedFlatOf = (ctx) => (PRE_PRICE_FACTOR_BALANCES.has(dataOf(ctx?.entry || {}).balance) ? indexOnly(PVP_COUNTED_FLAT_BASE) : undefined);

const raidReplay = (r, draw, ctx) => (r.round !== draw.round ? []
  : luckRulesAt(ctx?.entry?.ts, draw.round, ctx?.info || QUICKNET).map((rule) => resolveRaid({ battle: r.battle, round: r.round, att: r.att, dfd: r.dfd, free: r.free, chest: r.chest, lootLeft: r.lootLeft, revenge: r.revenge }, draw.randomness, { rule, countedFlat: countedFlatOf(ctx) })));

const luckMatches = (o, r) => (o.luck ? o.luck.roll === r.roll && o.luck.up === r.upset && (r.u === undefined || o.luck.u === r.u)
  : r.roll === undefined && r.u === undefined);

const countedMatches = (o, r) => (r.countedMin === undefined ? o.counted === r.counted
  : Number.isFinite(r.countedMin) && r.countedMin > 0 && r.countedMin <= (r.chest / 1000) * PVP.counted * 1000 && r.counted === (o.won && o.take >= r.countedMin));

export const COLLECTIVE = new Set(['lotteryDraw', 'vigilPrize', 'bossPrize', 'dragonBox']);

const RECORD_KINDS = new Set(['lotteryDraw', 'vigilPrize', 'bossPrize']);

const actionShaped = (d, kind) => ['stage', 'actionId', 'delta', 'refs', 'draw', 'round'].some((k) => d[k] !== undefined)
  || [PRICES, RULES, STATIC_RULES, PAID].some((t) => Object.hasOwn(t, kind));

export function revealsFit(kind, a, revs) {
  const shown = revs.filter((x) => !(x.redacted === true)).map((x) => dataOf(x).refs || {});
  const parts = (key, max) => {
    const of = shown[0]?.of;
    if (!Number.isSafeInteger(max) || max < 1 || revs.length > max) return false;
    if (!shown.length) return true;
    if (!Number.isSafeInteger(of) || of < 1 || of > max || revs.length > of) return false;
    const seen = new Set();
    return shown.every((r) => r.of === of && Number.isSafeInteger(r[key]) && r[key] >= 1 && r[key] <= of && !seen.has(r[key]) && !!seen.add(r[key]));
  };
  if (kind === 'heroBox') return parts('box', a.boxes);
  if (kind === 'wheel' && Array.isArray(a.spins)) return parts('spin', a.spins.length) && (!shown.length || shown[0].of === a.spins.length);
  return revs.length <= 1 && (kind !== 'wheel' || shown.every((r) => r.of === undefined));
}

const LOTTERY_SLACK_MS = 120e3;
export const LOTTERY_PINNED_DAY = Math.floor(Date.UTC(2026, 10, 20) / 86400e3);

export const VIGIL_PINNED_DAY = '2026-11-21';

export function vigilBound(r, draw, info, entries) {
  const signups = entries.filter((x) => x.kind === 'vigilEntry' && dataOf(x).stage === 'act' && dataOf(x).refs?.fight === r.fight);
  if (!signups.length) return null;
  const at = roundTime(draw.round, info);
  if (signups.every((x) => { const s = dataOf(x).refs; return s.round === draw.round && s.chain === draw.chain && x.ts < at; })) return true;
  return typeof r.fight === 'string' && r.fight.slice(0, 10) >= VIGIL_PINNED_DAY ? false : null;
}

export const lotteryBound = (r, draw, info) => {
  if (!Number.isSafeInteger(r.day) || roundTime(draw.round, info) <= drawAt(r.day)) return false;
  if (r.late === true) return r.rebound === undefined && draw.round === drawRound(drawAt(r.day) + LOTTERY_SLACK_MS, info);
  if (r.day >= LOTTERY_PINNED_DAY && (r.rebound !== undefined || draw.round !== drawRound(drawAt(r.day) + LOTTERY_SLACK_MS, info))) return false;
  if (r.sealedAt !== undefined && !(Number.isSafeInteger(r.sealedAt) && r.sealedAt < roundTime(draw.round, info))) return false;
  if (r.rebound !== undefined) {
    const rb = r.rebound;
    if (!Array.isArray(rb) || !rb.length || rb.at(-1).to !== draw.round) return false;
    for (let i = 0; i < rb.length; i++) {
      const x = rb[i] || {};
      if (!Number.isSafeInteger(x.from) || !Number.isSafeInteger(x.to) || x.to <= x.from || (i && rb[i - 1].to !== x.from)) return false;
      if (!Number.isSafeInteger(x.at) || x.at < roundTime(x.from, info) || x.at >= roundTime(x.to, info)) return false;
    }
  }
  return true;
};

export function fightCommitBound(e, info = QUICKNET) {
  const d = dataOf(e);
  if (e.kind !== 'fightCommit' || !Number.isSafeInteger(d.day) || d.round !== fightRound(d.day, info) || d.chain !== info.hash) return false;
  const due = roundTime(d.round, info);
  return e.ts < due && (Math.floor(e.ts / EPOCH_MS) + 1) * EPOCH_MS + CLOSE_GRACE_MS <= due;
}

export async function checkDragonKind(rec, info = QUICKNET) {
  const d = rec?.kindDraw;
  const m = /^r(\d+)-(\d+)-/.exec(rec?.id || '');
  if (!d || !m || d.chain !== info.hash || d.round !== roundAt(d.at, info) || !(await verifyRound(d, info))) return false;
  const u = await deriveOutcome(d.randomness, dragonDrawId(Number(m[1]), Number(m[2])), DRAGON_DRAW, 1);
  return dragonKindAt(u[0]) === rec.kind;
}

const EPOCH_MS = 3600e3;
const CLOSE_GRACE_MS = 5 * 60e3;
export const ANCHOR_WINDOW_MS = 2 * 3600e3;
export const epochCloses = (epoch) => (epoch + 1) * EPOCH_MS + CLOSE_GRACE_MS;
export const anchorDue = (epoch) => epochCloses(epoch) + ANCHOR_WINDOW_MS;
export const FUTURE_EPOCH_MS = 24 * 3600e3;
const futureEpoch = (epoch, now) => Number.isSafeInteger(epoch) && epoch * EPOCH_MS > now + FUTURE_EPOCH_MS;

export async function verifyEntry(e, entries, opts = {}) {
  const info = opts.info || QUICKNET;
  const steps = { chain: 'skip', beacon: 'skip', bound: 'skip', rule: 'skip', merkle: 'skip', ...(opts.anchor ? { anchor: 'skip' } : {}) };
  let merkle;
  let anchor = null;
  let rulesNeed = null;
  let sigOnly = false;
  let revMasked = false;
  let sigWhy;
  const done = (r) => ({
    ...r, ...(merkle ? { merkle } : {}), ...(anchor ? { anchor } : {}),
    ...(anchor?.status === 'fail' && r.status === 'ok' ? { status: 'fail', why: 'anchor' } : {}),
  });
  const bad = (why, round) => done({ status: 'bad', steps, why, round });
  if (e.private === true && !(opts.realm === true && REALM_PRIVATE_KIND.test(e.kind))) return bad('private');
  if (opts.realm === true && e.redacted !== undefined) return bad('redacted');
  const masked = e.redacted === true && e.data != null && e.data !== 'null';
  if (masked && !showsMask(e.data)) return bad('mask');
  const hidden = (round) => done({ status: 'hidden', steps, why: 'redacted', ...(round !== undefined ? { round } : {}) });
  const upTo = entries.filter((x) => x.seq <= e.seq);
  const c = await verifyChain(upTo.length ? upTo : [e], { realm: opts.realm === true });
  steps.chain = c.ok && upTo.some((x) => x.hash === e.hash) ? 'ok' : 'bad';
  if (steps.chain === 'bad') return c.why === 'mask' ? { ...bad('chain/mask'), at: c.at } : bad('chain');

  const d = dataOf(e);
  if (opts.merkle) {
    const m = (await opts.merkle(e, entries).catch(() => 'skip')) || 'skip';
    if (typeof m === 'object') merkle = m;
    steps.merkle = merkle ? merkle.status : m;
  }
  if (steps.merkle === 'bad') return bad('merkle');
  const ownRules = (x) => !(opts.rulesRef !== undefined && typeof x.rules === 'string' && x.rules && x.rules !== opts.rulesRef && opts.rulesRef !== 'any');
  if (opts.anchor) {
    anchor = (await opts.anchor(merkle || { status: steps.merkle }, e).catch((err) => ({ status: 'fail', why: err.message }))) || null;
    if (anchor) steps.anchor = anchor.status;
    if (anchor?.status === 'bad' || anchor?.status === 'missing') return bad('anchor');
  }
  if (e.redacted === true && !masked) return hidden();
  if (e.private === true) return done({ status: 'hidden', steps, why: 'private' });
  const eras = new Map();
  const era = (x) => {
    if (!eras.has(x)) eras.set(x, stampEra(x, entries, { info, mainnet: opts.mainnet === true }));
    return eras.get(x);
  };
  const stampGate = (list, round) => {
    for (const x of list) {
      if (!x || !eraKind(x.kind)) continue;
      const r = era(x);
      if (r === 'bad') return bad('stamp', round);
      if (r === 'wait') return done({ status: 'wait', steps, why: 'stamp', ...(round !== undefined ? { round } : {}) });
    }
    return null;
  };
  const versionGate = (x, round) => {
    if (!x || x.redacted === true) return null;
    const xd = dataOf(x);
    if (xd.v === 2 || !actionShaped(xd, x.kind)) return null;
    const legacyDraw = xd.v === undefined && Number.isSafeInteger(xd.round) && typeof xd.randomness === 'string' && typeof xd.signature === 'string';
    if (!legacyDraw) return bad('version', round);
    const v2 = (y) => y.redacted !== true && dataOf(y).v === 2;
    if (opts.mainnet === true || entries.some((y) => v2(y) && (y.seq < x.seq || (xd.actionId !== undefined && dataOf(y).actionId === xd.actionId)))) return bad('version', round);
    if (!entries.some((y) => y.seq === 1)) return done({ status: 'wait', steps, why: 'stamp', ...(round !== undefined ? { round } : {}) });
    return null;
  };
  if (!masked) {
    const g = versionGate(e, d.draw?.round ?? (Number.isSafeInteger(d.round) ? d.round : undefined));
    if (g) return g;
  }
  if (!masked && opts.mainnet === true && PRE_PRICE_FACTOR_BALANCES.has(d.balance)) return bad('stamp', d.draw?.round);
  let actProven = false;
  if (!masked && d.stage === 'act' && ownRules(d) && Object.hasOwn(PRICES, d.kind)) {
    const g = stampGate([e], d.draw?.round);
    if (g) return g;
    const p = priceOk(e, era(e));
    if (p === false) return bad('price');
    actProven = p === true;
  }
  if (!masked && d.stage === 'act' && (e.kind === 'duel' || e.kind === 'joust')) {
    const g = versionGate(joustCharge(e, entries), d.draw?.round) || stampGate([joustCharge(e, entries)], d.draw?.round);
    if (g) return g;
    const m = matchJoinOk(e, entries, era);
    if (m === false) return bad('bound', d.draw?.round);
    if (m === 'wait') return done({ status: 'wait', steps, why: 'act', ...(d.draw ? { round: d.draw.round } : {}) });
    if (d.refs?.match !== undefined) actProven = true;
  }
  if (!masked && d.v === 2 && GRANT_CHECKED.has(d.kind) && ownRules(d)) {
    const g = await checkGrant(e, d, opts);
    if (g === 'bad') return bad('rule');
    if (g === 'usdRef') return bad('usdRef');
    if (g === 'wait') return done({ status: 'wait', steps, why: 'usdRef' });
    if (g === 'ok') { steps.rule = 'ok'; actProven = true; }
  }
  if (!masked && opts.claimRef) {
    const cr = await checkClaimRef(e, d, opts.claimRef);
    if (cr) steps.claim = cr;
    if (cr === 'bad') return bad('claimRef');
    if (cr === 'fail') return done({ status: 'wait', steps, why: 'claimRef' });
  }
  if (!masked && d.stage === 'act' && d.kind === 'squire' && d.refs?.usd !== undefined) {
    steps.usd = await checkSquireUsd(d.refs.usd, e.ts, opts.usdDay);
    if (steps.usd === 'bad') return bad('usdRef');
    if (steps.usd === 'wait') return done({ status: 'wait', steps, why: 'usdRef' });
  }
  if (!d.draw && d.v === 2 && d.stage === 'reveal' && e.kind === 'duel') {
    if (masked) return hidden();
    const act = entries.find((x) => x.seq < e.seq && dataOf(x).actionId === d.actionId && dataOf(x).stage === 'act');
    if (!act) return bad('bound');
    if (act.kind !== 'duel' || entries.filter((x) => dataOf(x).actionId === d.actionId && dataOf(x).stage === 'reveal').length > 1) return bad('bound');
    const g = versionGate(act) || versionGate(joustCharge(act, entries)) || stampGate([act, joustCharge(act, entries)]);
    if (g) return g;
    const m = matchJoinOk(act, entries, era);
    if (m === false) return bad('bound');
    if (m === 'wait') return done({ status: 'wait', steps, why: 'act' });
    steps.bound = 'ok';
    if (!ownRules(d)) return done({ status: 'rules', steps: { ...steps, rule: 'other' }, rules: d.rules });
    const ar = dataOf(act).refs || {};
    const rr = d.refs || {};
    let ok;
    try { ok = RULES.duel.check([], ar, rr, null, null, { entries, acct: opts.acct || acctOf(entries), entry: e, act, info, era }); } catch { ok = false; }
    if (ok !== true) return bad('rule');
    if (PAID.duel(ar, rr, { entry: e }) === false) return bad('amount');
    if (rr.cancelled) {
      steps.rule = 'ok';
      return done({ status: 'ok', steps });
    }
    let log;
    try { log = opts.duelLog ? await opts.duelLog(ar.match) : null; } catch { log = null; }
    const c = await checkDuelLog(log, {
      match: ar.match, logHash: rr.log, a: ar.a.fighter, b: ar.b.fighter, max: DUEL_FIGHT.maxTicks,
      end: { winner: rr.winner, reason: rr.reason, tick: rr.ticks, hpA: rr.hpA, hpB: rr.hpB },
    });
    if (c.status === 'bad') return bad(c.why);
    if (c.status !== 'ok') {
      const why = !opts.duelLog ? 'duel log not read' : c.status === 'owner' ? 'duel log v1 not public' : 'duel log not available';
      return done({ status: 'sig', steps, why });
    }
    steps.rule = 'ok';
    return done({ status: 'ok', steps });
  }
  if (!d.draw) {
    if (d.v === 2 && d.stage === 'reveal' && Object.hasOwn(RULES, e.kind)) return bad('draw');
    if (d.v === undefined && Number.isSafeInteger(d.round) && typeof d.randomness === 'string' && typeof d.signature === 'string') {
      const proof = { round: d.round, chain: d.chain, randomness: d.randomness, signature: d.signature };
      if (d.chain !== info.hash || !(await verifyRound(proof, info).catch(() => false))) return bad('beacon', d.round);
      steps.beacon = 'ok';
      return masked ? hidden(d.round) : done({ status: 'sig', steps, round: d.round });
    }
    if (masked) return hidden();
    const hasStatic = Object.hasOwn(STATIC_RULES, e.kind) && d.v === 2;
    if (hasStatic && (!d.refs || typeof d.refs !== 'object')) return bad('rule');
    const st = hasStatic ? STATIC_RULES[e.kind].check(d.refs, d) : null;
    if (st === false) return bad('rule');
    if (st === true) steps.rule = 'ok';
    if (st !== true && !actProven) {
      if (inertEntry(e, d, opts)) return done({ status: 'ok', steps: { ...steps, rule: 'none' }, why: 'no value moved' });
      return done({ status: 'sig', steps, why: 'no rule' });
    }
    return done({ status: 'ok', steps });
  }

  if (masked && !d.draw.randomness) return hidden(d.draw.round);
  const same = (x) => d.actionId && dataOf(x).actionId === d.actionId;
  const live = liveAct(e, entries);
  if (live === 'wait') return done({ status: 'wait', steps, why: 'act', round: d.draw.round });
  if (!live) return bad('bound', d.draw.round);
  const reveals = d.draw.randomness ? [e] : live.cancelled ? [] : entries.filter((x) => same(x) && dataOf(x).draw?.randomness);
  if (!reveals.length) return done({ status: 'wait', steps, round: d.draw.round });
  const act = live.act;
  const round = d.draw.round;
  if (!masked && act) {
    const g = versionGate(act, round) || (act.kind === 'joust' ? versionGate(joustCharge(act, entries), round) : null);
    if (g) return g;
    const revs = entries.filter((x) => same(x) && x !== act && dataOf(x).draw?.randomness);
    if (revs.some((x) => x.kind !== act.kind || dataOf(x).stage !== 'reveal' || x.seq < act.seq) || !revealsFit(act.kind, dataOf(act).refs || {}, revs)) return bad('bound', round);
  }
  let actSigMasked = false;
  if (!masked && act && act !== e && ownRules(dataOf(act)) && Object.hasOwn(PRICES, act.kind)) {
    const g = stampGate([act], round);
    if (g) return g;
    const ad = dataOf(act);
    actSigMasked = act.redacted === true && act.data != null && act.data !== 'null' && ad.chain?.sig === 'hidden';
    if (!actSigMasked && priceOk(act, era(act)) === false) return bad('price', round);
  }

  const rebinds = act && d.actionId ? entries.filter((x) => dataOf(x).refs?.rebind?.send === d.actionId) : [];
  if (rebinds.length > 1) return bad('bound', round);
  const rebind = rebinds[0] || null;
  const rebindMasked = !!rebind && rebind.redacted === true && rebind.data != null && rebind.data !== 'null';
  const movedTo = (r) => {
    const m = rebind && dataOf(rebind).refs.rebind;
    return m && m.round === r && m.chain === info.hash && rebind.seq > act.seq ? rebind : null;
  };
  const REBIND_OF = { voyageSpeedup: 'voyageSend', dungeonSpeedup: 'dungeonSend' };
  const rebindOk = (x, r) => dataOf(x).stage === 'act' && Object.hasOwn(REBIND_OF, x.kind) && REBIND_OF[x.kind] === act.kind
    && x.ts >= act.ts && x.ts < roundTime(dataOf(act).draw?.round, info) && x.ts < roundTime(r, info);

  for (const rev of reveals) {
    const rd = dataOf(rev);
    const draw = rd.draw;
    const moved = movedTo(draw.round);
    if (draw.chain !== info.hash || (draw.round !== round && !moved && !rebindMasked)) return bad('beacon', round);
    let beacon = draw;
    if (!draw.signature) {
      try { beacon = await fetchRound(draw.round, { info, fetchFn: opts.fetchFn, fresh: true }); } catch (err) {
        return done({ status: err.code === 'drand_bad_beacon' ? 'bad' : err.code === 'drand_not_yet' ? 'wait' : 'fail', steps, why: 'beacon', round });
      }
      if (beacon.randomness !== draw.randomness) return bad('beacon', round);
    } else if (!(await verifyRound(draw, info))) return bad('beacon', round);
    steps.beacon = 'ok';

    if (!masked && !act && !(COLLECTIVE.has(rev.kind) && !rd.actionId)) {
      if (rd.actionId && !entries.some((x) => x.seq === 1)) return done({ status: 'wait', steps, why: 'act', round });
      return bad('bound', round);
    }

    const ad = act ? dataOf(act) : null;
    const boundOk = ad ? (rebindMasked ? null : rebind ? !!moved && rebindOk(moved, draw.round) : ad.draw?.round === draw.round && act.ts < roundTime(draw.round, info))
      : masked ? null : rd.kind === DRAW_KIND ? lotteryBound(rd.refs || {}, draw, info)
        : rd.kind === 'vigilPrize' ? vigilBound(rd.refs || {}, draw, info, entries) : null;
    if (boundOk === false) return bad('bound', round);
    if (boundOk) steps.bound = 'ok';
    if (masked) continue;
    if (rev.redacted === true && rev.data != null && rev.data !== 'null') {
      revMasked = true;
      continue;
    }

    const rule = Object.hasOwn(RULES, rd.kind) ? RULES[rd.kind] : null;
    if (!rule) {
      if (paidOk(rd.kind, ad?.refs || {}, rd.refs || {}, { entry: rev, act }) === false) return bad('amount', round);
      sigOnly = true;
      continue;
    }
    if (opts.rulesRef !== undefined && typeof rd.rules === 'string' && rd.rules && rd.rules !== opts.rulesRef && opts.rulesRef !== 'any') {
      steps.rule = 'other';
      rulesNeed = rd.rules;
      continue;
    }
    if (rule.act && !(act && joustCharge(act, entries)) && !entries.some((x) => x.seq === 1)) return done({ status: 'wait', steps, why: 'act', round });
    const g = stampGate([rev.kind === 'joust' && act ? joustCharge(act, entries) : null, rev.kind === 'mailBox' || rev.kind === 'dragonBox' ? rev : null], round);
    if (g) return g;
    if (act && rev.kind === 'joust') {
      const m = matchJoinOk(act, entries, era);
      if (m === false) return bad('bound', round);
      if (m === 'wait') return done({ status: 'wait', steps, why: 'act', round });
    }
    const ar = ad?.refs || {};
    const rr = rd.refs || {};
    let ok;
    try {
      const u = await deriveOutcome(draw.randomness, rule.id ? rule.id(rr) : rd.actionId, rd.kind, rule.count(ar, rr));
      const extra = opts.context ? await opts.context(rd.kind, rr).catch(() => null) : null;
      ok = await rule.check(u, ar, rr, extra, draw, { entries, acct: opts.acct || acctOf(entries), entry: rev, act, info, era, context: opts.context });
    } catch {
      ok = false;
    }
    if (ok === false) return bad('rule', round);
    if (paidOk(rd.kind, ar, rr, { entry: rev, act }) === false) return bad('amount', round);
    if (ok === null && rd.kind === 'heroBox' && rr.forced && !entries.some((x) => x.seq === 1)) return done({ status: 'wait', steps, why: 'act', round });
    if (ok === true) steps.rule = 'ok';
    else {
      sigOnly = true;
      if (RECORD_KINDS.has(rd.kind)) sigWhy = opts.context ? 'record not available' : 'record not read';
      else if ((rd.kind === 'hunt' || rd.kind === 'away') && Array.isArray(rr.fight) && rr.fight.length) {
        sigWhy = opts.context ? 'fight record not available' : 'fight record not read';
      }
    }
    if (ok === true && rr.pityBefore !== undefined && (await pityBroken(rev, rr, entries)) === true) return bad('pity', round);
  }
  if (masked || rebindMasked || revMasked || actSigMasked) return hidden(round);
  return done(rulesNeed ? { status: 'rules', steps, round, rules: rulesNeed } : sigOnly ? { status: 'sig', steps, round, ...(sigWhy ? { why: sigWhy } : {}) } : { status: 'ok', steps, round });
}



export async function leafHash(acct, seqFrom, seqTo, headHash) {
  return toHex(await sha256(utf8(`COT-LEDGER-LEAF-v1\n${acct}\n${seqFrom}\n${seqTo}\n${headHash}`)));
}

export async function epochHash(epoch, root, count, prevHash) {
  return toHex(await sha256(utf8(`COT-LEDGER-EPOCH-v1\n${epoch}\n${root}\n${count}\n${prevHash}`)));
}

export async function verifyMerkleProof(leafHex, path, root) {
  const node = (l, r) => sha256(concat(Uint8Array.of(1), l, r));
  try {
    let h = await sha256(concat(Uint8Array.of(0), fromHex(leafHex)));
    for (const s of path) {
      if (s.pos !== 'L' && s.pos !== 'R') return false;
      h = s.pos === 'L' ? await node(fromHex(s.hash), h) : await node(h, fromHex(s.hash));
    }
    return toHex(h) === root;
  } catch {
    return false;
  }
}

export const memoText = (env, p) => `COT-LEDGER v1 ${env} ${p.epoch} ${p.root} ${p.leafCount} ${p.hash}`;

export async function checkProof(p, entries, seq, acct = null) {
  const leaf = p?.leaf;
  if (!leaf || p.seq !== seq) return { status: 'bad', why: 'proof' };
  const out = { epoch: p.epoch, root: p.root, hash: p.hash, leafCount: p.leafCount, prevHash: p.prevHash, anchor: p.anchor || null };
  if (!p.closed) return { status: 'wait', ...out };
  const bad = (why) => ({ status: 'bad', why, ...out });
  if (acct && leaf.acct !== acct) return bad('acct');
  if (seq < leaf.seqFrom || seq > leaf.seqTo) return bad('range');
  const run = entries.filter((x) => x.seq >= seq && x.seq <= leaf.seqTo);
  if (run.length !== leaf.seqTo - seq + 1) return bad('range');
  const c = await verifyChain(run);
  if (!c.ok || c.head !== leaf.headHash) return bad('head');
  if ((await leafHash(leaf.acct, leaf.seqFrom, leaf.seqTo, leaf.headHash)) !== leaf.hash) return bad('leaf');
  if (!Array.isArray(p.path) || !(await verifyMerkleProof(leaf.hash, p.path, p.root))) return bad('path');
  if ((await epochHash(p.epoch, p.root, p.leafCount, p.prevHash)) !== p.hash) return bad('epoch');
  return { status: 'ok', ...out };
}

export function proofChecker(acct, getProof) {
  const leaves = [];
  return async (e, entries) => {
    let p = leaves.find((x) => x.leaf.seqFrom <= e.seq && e.seq <= x.leaf.seqTo && x.closed);
    if (!p) {
      p = await getProof(acct, e.seq);
      if (!p || p.error) return { status: 'wait' };
      if (p.closed && p.leaf) leaves.push(p);
    }
    return checkProof({ ...p, seq: e.seq }, entries, e.seq, acct);
  };
}


export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const MEMO_RE = /^COT-LEDGER v1 (\S+) (\d+) [0-9a-f]{64} \d+ [0-9a-f]{64}$/;
const SETTLE_DISCRIMINATOR = [148, 223, 178, 38, 201, 158, 167, 13];
const SETTLE_WALK = 24;
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function b58decode(s) {
  if (typeof s !== 'string') return null;
  let n = 0n;
  for (const ch of s) {
    const i = B58.indexOf(ch);
    if (i < 0) return null;
    n = n * 58n + BigInt(i);
  }
  const out = [];
  while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; }
  for (const ch of s) { if (ch !== '1') break; out.unshift(0); }
  return Uint8Array.from(out);
}

const u64At = (b, at) => { let x = 0n; for (let i = 7; i >= 0; i--) x = (x << 8n) | BigInt(b[at + i]); return x; };

export function settleArgs(data) {
  const b = b58decode(data);
  if (!b || b.length < 120 || SETTLE_DISCRIMINATOR.some((x, i) => b[i] !== x)) return null;
  return { epoch: u64At(b, 8), root: toHex(b.slice(16, 48)), leafCount: u64At(b, 48), prevHash: toHex(b.slice(56, 88)), hash: toHex(b.slice(88, 120)) };
}

const ago = (ms) => { const m = Math.max(0, Math.round(ms / 60e3)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

export async function checkAnchor(p, o = {}) {
  const now = o.now ?? Date.now();
  const a = p?.anchor || {};
  const late = now >= anchorDue(p.epoch);
  const notYet = (why) => (futureEpoch(p.epoch, now) ? { status: 'bad', why: `${why}, and the hour is in the future` } : late
    ? { status: 'missing', why: `${why}, ${ago(now - anchorDue(p.epoch))} past the anchoring window` }
    : { status: 'pending', why: `${why} for ${ago(now - epochCloses(p.epoch))}`, due: anchorDue(p.epoch) });
  if (a.mode === 'memo' && o.mainnet) return { status: 'bad', why: 'a Memo anchor is not valid on mainnet (settle_epoch only)' };
  if (a.mode !== 'memo' && a.mode !== 'settle') return notYet(`not anchored (mode ${a.mode || 'none'})`);
  if (a.status !== 'sent') return notYet(`anchor ${a.status || 'absent'}`);
  if (!a.sig) {
    if (a.mode !== 'settle' || !o.getEpoch) return { status: 'missing', why: 'anchored without a transaction to read' };
    let cur = p;
    for (let k = 1; k <= SETTLE_WALK; k++) {
      const next = await o.getEpoch(p.epoch + k).catch(() => null);
      if (!next || next.prevHash !== cur.hash) return { status: 'missing', why: `settled without a signature, epoch ${p.epoch + k} does not chain to it` };
      cur = next;
      if (next.anchor?.sig) {
        const r = await checkAnchor(next, { ...o, getEpoch: null });
        return r.status === 'ok' ? { ...r, why: `through epoch ${next.epoch}` } : r;
      }
    }
    return { status: 'missing', why: 'settled without a signature, no later settled epoch' };
  }
  if (!o.rpc) return o.mainnet ? { status: 'missing', why: 'no RPC to read the anchor' } : { status: 'unchecked', why: 'no RPC to read the anchor' };
  const res = await o.fetchFn(o.rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [a.sig, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }] }),
  });
  const tx = (await res.json())?.result;
  if (!tx) return { status: 'bad', why: 'transaction not found' };
  if (tx.meta?.err) return { status: 'bad', why: 'transaction failed' };
  const ins = tx.transaction?.message?.instructions || [];
  let env;
  if (a.mode === 'memo') {
    const memos = ins.filter((x) => x.programId === MEMO_PROGRAM_ID).map((x) => (typeof x.parsed === 'string' ? x.parsed : null));
    const m = memos.map((x) => MEMO_RE.exec(x || '')).find(Boolean);
    if (!m) return { status: 'bad', why: 'no ledger memo' };
    if (m[0] !== memoText(m[1], p)) return { status: 'bad', why: 'memo does not match the epoch' };
    env = m[1];
  } else {
    const s = ins.filter((x) => !o.programId || x.programId === o.programId).map((x) => settleArgs(x.data)).find(Boolean);
    if (!s) return { status: 'bad', why: 'no settle_epoch of the game program' };
    if (s.epoch !== BigInt(p.epoch) || s.root !== p.root || s.leafCount !== BigInt(p.leafCount) || s.prevHash !== p.prevHash || s.hash !== p.hash) {
      return { status: 'bad', why: 'settle_epoch does not match the epoch' };
    }
  }
  if (o.anchorKey) {
    const k = tx.transaction.message.accountKeys?.[0];
    if ((typeof k === 'string' ? k : k?.pubkey) !== o.anchorKey) return { status: 'bad', why: 'signed by another key' };
  }
  return { status: 'ok', ...(env ? { env } : {}) };
}

export function anchorChecker(o = {}) {
  const seen = new Map();
  return async (m, e) => {
    if (!m || m.status === 'bad' || m.status === 'skip') return null;
    if (m?.status !== 'ok') {
      const epoch = Number.isSafeInteger(m?.epoch) ? m.epoch : Math.floor(e.ts / EPOCH_MS);
      const now = o.now ?? Date.now();
      if (futureEpoch(epoch, now)) return { status: 'bad', why: `hour ${epoch} is in the future` };
      return now >= anchorDue(epoch)
        ? { status: 'missing', why: `hour ${epoch} has no sealed proof, ${ago(now - anchorDue(epoch))} past the anchoring window` }
        : { status: 'pending', why: `hour ${epoch} not sealed yet`, due: anchorDue(epoch) };
    }
    const a = m.anchor || {};
    const key = JSON.stringify([m.epoch, m.root, m.leafCount, m.prevHash, m.hash, a.mode, a.status, a.sig]);
    if (!seen.has(key)) seen.set(key, checkAnchor(m, o).catch((err) => ({ status: 'fail', why: err.message })));
    const r = await seen.get(key);
    if (r.status !== 'ok' && r.status !== 'bad') seen.delete(key);
    return r;
  };
}

export function ledgerClash(old, fresh) {
  const a = old || [];
  const b = fresh || [];
  if (!a.length) return null;
  const top = a.at(-1);
  if (!b.length) return { seq: top.seq, why: 'cut', old: top.hash, fresh: null };
  const bySeq = new Map(a.map((x) => [x.seq, x]));
  for (const x of b) {
    const y = bySeq.get(x.seq);
    if (y && y.hash !== x.hash) return { seq: x.seq, why: 'rewritten', old: y.hash, fresh: x.hash };
  }
  if (b.at(-1).seq < top.seq) return { seq: top.seq, why: 'cut', old: top.hash, fresh: null };
  const next = b.find((x) => x.seq === top.seq + 1);
  if (next && next.prev !== top.hash) return { seq: next.seq, why: 'rewritten', old: top.hash, fresh: next.prev };
  return null;
}

export const acctOf = (entries) => {
  const e = entries.find((x) => x.seq === 1 && x.kind === 'create');
  const a = e ? dataOf(e).acct : null;
  return typeof a === 'string' && /^[0-9a-f]{40}$/.test(a) ? a : null;
};
