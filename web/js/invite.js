import { REFERRAL, REFERRAL_EVENT, BOXES, HEROES, RARITIES, MARKET, summonCost } from './data.js';
import { seeded } from './raidrules.js';
import { spendBase } from './realmlive.js';
import { SERVER_MODE } from './buildprofile.js';

const HOUR = 3600e3;
const WEEK = 168 * HOUR;
const MONDAY = 96 * HOUR;

export const weekOf = (now) => Math.floor((now - MONDAY) / WEEK);
export const weekEnd = (week) => (week + 1) * WEEK + MONDAY;
export const ARK_PAYDAY = 15 * HOUR;
export const arkPaydayLast = (now) => {
  const t = weekEnd(weekOf(now) - 1) + ARK_PAYDAY;
  return t <= now ? t : t - WEEK;
};
export const arkPaydayNext = (now) => arkPaydayLast(now) + WEEK;
export const arkBatchId = (t) => new Date(t).toISOString().slice(0, 10);
const weekProgress = (week, now) => Math.min(1, Math.max(0, 1 - (weekEnd(week) - now) / WEEK));

const NAME_A = ['Frost', 'Iron', 'Ash', 'Bram', 'Cinder', 'Dusk', 'Ember', 'Fen', 'Grim', 'Hollow', 'Ivy', 'Jade'];
const NAME_B = ['Maxi', 'Lord', 'Reeve', 'Thane', 'Wolf', 'Hawk', 'Crown', 'Bane', 'Vane', 'Shore'];
const NAMES = NAME_A.flatMap((a) => NAME_B.map((b) => a + b));

function shuffledNames(seed, pool = NAMES) {
  const r = seeded(seed);
  const list = [...pool];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const PROFILES = [
  { base: 0, rate: 0 },
  { base: 30000, rate: 400 },
  { base: 400000, rate: 2000 },
  { base: 1700000, rate: 5000, squire: true },
  { base: 5000, rate: 300 },
  { base: 90000, rate: 1500, twin: true },
];
const VASSAL_ART = ['recruit', 'raider', 'wildling', 'lionguard', 'tyrus', 'aryna', 'holdur', 'kael'];


const freshEvent = (week) => ({ week, pts: 0, spent: 0 });

export function freshInvite(now = Date.now(), rng = Math.random) {
  return { device: rng().toString(36).slice(2, 10), cards: 0, stakeCards: 0, cardsEarned: 0, vassals: [], next: 1, claimed: [], earned: 0, won: 0, event: freshEvent(weekOf(now)), results: [] };
}

const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);

function normalizeVassal(v) {
  if (!v || typeof v !== 'object' || typeof v.name !== 'string' || !Number.isFinite(v.at)) return null;
  return {
    id: Number.isInteger(v.id) ? v.id : 0,
    name: v.name,
    key: HEROES[v.key] ? v.key : 'recruit',
    at: v.at,
    base: num(v.base),
    rate: num(v.rate),
    squire: !!v.squire,
    block: v.block === 'device' || v.block === 'denied' ? v.block : '',
    seen: num(v.seen),
    week: Number.isInteger(v.week) ? v.week : -1,
    raw: num(v.raw),
    earned: num(v.earned),
    cards: num(v.cards),
    paid: Array.isArray(v.paid) ? v.paid.filter((k) => REFERRAL.rewards.some((r) => r.key === k)) : [],
    ...(Number.isSafeInteger(v.summons) && v.summons >= 0 ? { summons: v.summons } : {}),
    ...(Number.isFinite(v.held) && v.held > 0 ? { held: v.held } : {}),
    ...(Array.isArray(v.arks) ? { arks: v.arks.filter((a) => a && typeof a.tier === 'string' && /^[a-z]{2,16}$/.test(a.tier) && Number.isSafeInteger(a.no) && a.no > 0).map((a) => ({ tier: a.tier, no: a.no })) } : {}),
  };
}

export function normalizeInvite(x, now = Date.now()) {
  const e = freshInvite(now);
  if (!x || typeof x !== 'object') return e;
  const ev = x.event;
  const results = Array.isArray(x.results) ? x.results.filter((r) => r && Number.isInteger(r.week) && Number.isFinite(r.prize) && r.prize > 0 && Number.isFinite(r.readyAt)) : [];
  return {
    device: typeof x.device === 'string' && x.device ? x.device : e.device,
    cards: Math.floor(num(x.cards)),
    stakeCards: Math.min(Math.floor(num(x.cards)), Math.floor(num(x.stakeCards))),
    cardsEarned: Math.floor(num(x.cardsEarned)),
    vassals: Array.isArray(x.vassals) ? x.vassals.map(normalizeVassal).filter(Boolean) : [],
    next: Number.isInteger(x.next) && x.next > 0 ? x.next : 1,
    claimed: Array.isArray(x.claimed) ? x.claimed.filter((n) => REFERRAL.milestones.some((m) => m.need === n)) : [],
    earned: num(x.earned),
    won: num(x.won),
    event: ev && typeof ev === 'object' && Number.isInteger(ev.week) ? { week: ev.week, pts: num(ev.pts), spent: num(ev.spent) } : e.event,
    results,
    ...(typeof x.code === 'string' && /^[1-9A-HJ-NP-Za-km-z]{6,12}$/.test(x.code) ? { code: x.code } : {}),
  };
}


export function joinBlock(inv, newcomer, wallet = null) {
  if (wallet && newcomer.wallet === wallet) return 'self';
  return newcomer.device === inv.device ? 'device' : '';
}

export function addFakeVassal(inv, now) {
  const n = inv.next++;
  const p = PROFILES[(n - 1) % PROFILES.length];
  const v = normalizeVassal({
    id: n,
    name: shuffledNames('vassals')[(n - 1) % NAMES.length],
    key: VASSAL_ART[(n - 1) % VASSAL_ART.length],
    at: now,
    base: p.base,
    rate: p.rate,
    squire: p.squire,
    block: joinBlock(inv, { device: p.twin ? inv.device : `fake-${n}` }),
  });
  inv.vassals.push(v);
  return v;
}

export const vassalSpent = (v, now) => v.base + (v.rate * Math.max(0, now - v.at)) / HOUR;

export const vassalActive = (v, now) => !v.block && vassalSpent(v, now) >= REFERRAL.active;

export const activeVassals = (inv, now) => inv.vassals.filter((v) => vassalActive(v, now)).length;

export const vassalStatus = (v, now) => (v.block ? 'blocked' : vassalActive(v, now) ? 'active' : 'pending');

export const vassalSummons = (v, now) => (Number.isSafeInteger(v.summons) ? v.summons : Math.floor(vassalSpent(v, now) / summonCost()));

export function vassalPoints(raw, isNew) {
  const { doubleUpTo: top, vassalCap: cap } = REFERRAL_EVENT;
  return Math.min(cap, isNew ? (raw <= top / 2 ? raw * 2 : top + (raw - top / 2)) : raw);
}

export function settleVassals(inv, now, live = true) {
  rollEvent(inv, now);
  const ev = inv.event;
  const pct = rankOf(activeVassals(inv, now)).pct;
  let commission = 0;
  let cards = 0;
  for (const v of inv.vassals) {
    if (!vassalActive(v, now)) continue;
    const spent = vassalSpent(v, now);
    const delta = spent - v.seen;
    if (delta > 0) {
      const pay = (delta * pct) / 100;
      v.earned += pay;
      commission += pay;
      if (v.week !== ev.week) { v.week = ev.week; v.raw = 0; }
      const isNew = weekOf(v.at) === ev.week;
      const raw = v.raw + delta / spendBase(1000);
      if (live) {
        ev.pts += vassalPoints(raw, isNew) - vassalPoints(v.raw, isNew);
        ev.spent += delta;
        v.raw = raw;
      }
      v.seen = spent;
    }
    for (const r of REFERRAL.rewards) {
      const reached = r.key === 'summons' ? vassalSummons(v, now) >= r.need : v.squire;
      if (reached && !v.paid.includes(r.key)) {
        v.paid.push(r.key);
        v.cards += r.summons;
        cards += r.summons;
      }
    }
  }
  inv.earned += commission;
  inv.cards += cards;
  inv.cardsEarned += cards;
  return { commission, cards };
}


export const rankOf = (active) => REFERRAL.ranks.filter((r) => active >= r.need).at(-1);

export function rankProgress(active) {
  const rank = rankOf(active);
  const next = REFERRAL.ranks.find((r) => r.need > active) || null;
  if (!next) return { rank, next, left: 0, pct: 100 };
  return { rank, next, left: next.need - active, pct: Math.floor(((active - rank.need) / (next.need - rank.need)) * 100) };
}


export function milestoneState(inv, m, active) {
  if (inv.claimed.includes(m.need)) return 'claimed';
  return active >= m.need ? 'ready' : 'locked';
}

function heroValueFrom(floor) {
  const order = Object.keys(RARITIES);
  const pool = order.slice(order.indexOf(floor));
  const weight = pool.reduce((t, r) => t + RARITIES[r].weight, 0);
  return pool.reduce((t, r) => t + (RARITIES[r].weight * MARKET.heroBase[r]) / weight, 0);
}

export function boxValue(key) {
  const b = BOXES[key];
  return (b.coins[0] + b.coins[1]) / 2 + b.hero * heroValueFrom(b.heroFloor);
}

export const rewardValue = (m) => m.boxes.reduce((t, k) => t + boxValue(k), 0) + (m.cards || 0) * summonCost();

const FIELD = 120;
const TOP_SCORE = [6000, 9000];
const DECAY = 0.06;
const HEAD_START = 0.03;

function eventRivals(kind, id, topScore, pool) {
  const r = seeded(`${kind}:${id}`);
  const top = topScore[0] + r() * (topScore[1] - topScore[0]);
  const names = shuffledNames(`${kind}-names:${id}`, pool);
  return Array.from({ length: Math.min(FIELD, names.length) }, (_, i) => ({
    name: names[i],
    final: top * Math.exp(-DECAY * i) * (0.9 + r() * 0.2),
    curve: 0.7 + r() * 0.6,
  }));
}

export function rivalsAt(kind, id, topScore, p, pool) {
  if (SERVER_MODE) return [];
  return eventRivals(kind, id, topScore, pool)
    .map((x) => ({ name: x.name, pts: Math.floor(x.final * (HEAD_START + (1 - HEAD_START) * p ** x.curve)) }))
    .sort((a, b) => b.pts - a.pts);
}

const musterRivals = (week, p) => rivalsAt('muster', week, TOP_SCORE, p);

const realmSpent = (week, p) => SERVER_MODE ? 0 : (8e6 + seeded(`muster-spend:${week}`)() * 12e6) * p;

export function eventPot(ev, now) {
  if (ev.server) return ev.server.pot || 0;
  const p = weekProgress(ev.week, now);
  return Math.round(REFERRAL_EVENT.potFloor + ((realmSpent(ev.week, p) + ev.spent) * REFERRAL_EVENT.potShare) / 100);
}

export function prizeShare(place, event = REFERRAL_EVENT) {
  const { top, rest, restTo } = event;
  if (place <= top.length) return top[place - 1];
  return place <= restTo ? rest / (restTo - top.length) : 0;
}

export const prizeOf = (place, pot, event = REFERRAL_EVENT) => Math.floor((pot * prizeShare(place, event)) / 100);

export const eventPlace = (ev, now) => (ev.server
  ? ev.server.place || 1
  : 1 + musterRivals(ev.week, weekProgress(ev.week, now)).filter((x) => x.pts > ev.pts).length);

export function eventBoard(ev, now) {
  if (ev.server) return Array.isArray(ev.server.board) ? ev.server.board : [];
  const pot = eventPot(ev, now);
  const rows = musterRivals(ev.week, weekProgress(ev.week, now));
  rows.splice(eventPlace(ev, now) - 1, 0, { name: 'You', pts: Math.floor(ev.pts), me: true });
  return rows.slice(0, REFERRAL_EVENT.top.length).map((x, i) => ({ ...x, place: i + 1, prize: prizeOf(i + 1, pot) }));
}

export function pointsFor(kind, amount) {
  const rule = REFERRAL_EVENT.rules.find((r) => r.kind === kind);
  return rule ? (amount * rule.value) / rule.per : 0;
}

export function earnPoints(inv, kind, amount, now, live = true) {
  rollEvent(inv, now);
  if (!live || kind === 'market') return;
  inv.event.pts += pointsFor(kind, amount);
  inv.event.spent += amount;
}

function closeResult(inv, at, readyAt) {
  const ev = inv.event;
  const prize = ev.pts >= 1 ? prizeOf(eventPlace(ev, at), eventPot(ev, at)) : 0;
  if (prize > 0) inv.results.push({ week: ev.week, pts: Math.floor(ev.pts), place: eventPlace(ev, at), prize, readyAt });
  return prize;
}

export function rollEvent(inv, now) {
  const week = weekOf(now);
  if (inv.event.week === week) return;
  const end = weekEnd(inv.event.week);
  closeResult(inv, end, end + REFERRAL_EVENT.review * HOUR);
  inv.event = freshEvent(week);
}

export function closeEventNow(inv, now) {
  rollEvent(inv, now);
  const prize = closeResult(inv, now, now);
  inv.event = freshEvent(inv.event.week);
  return prize;
}

export function claimStatus(inv, now) {
  const ready = inv.results.filter((r) => r.readyAt <= now);
  const waiting = inv.results.filter((r) => r.readyAt > now);
  if (ready.length) return { state: 'ready', prize: ready.reduce((t, r) => t + r.prize, 0), readyAt: 0 };
  return waiting.length ? { state: 'review', prize: 0, readyAt: Math.min(...waiting.map((r) => r.readyAt)) } : { state: 'none', prize: 0, readyAt: 0 };
}

export function takePrizes(inv, now) {
  const prize = claimStatus(inv, now).prize;
  inv.results = inv.results.filter((r) => r.readyAt > now);
  inv.won += prize;
  return prize;
}

const LAUNCH_WEEK = 2900;

export function recruiterBoard(active, now) {
  const r = seeded('recruiters');
  const names = shuffledNames('recruiters');
  const weeks = Math.max(0, weekOf(now) - LAUNCH_WEEK);
  const rows = Array.from({ length: SERVER_MODE ? 0 : 60 }, (_, i) => ({ name: names[i], count: Math.floor(14 + 170 * Math.exp(-0.09 * i) * (0.9 + r() * 0.2) * (1 + weeks / 200)) }))
    .sort((a, b) => b.count - a.count);
  const place = 1 + rows.filter((x) => x.count > active).length;
  rows.splice(place - 1, 0, { name: 'You', count: active, me: true });
  return { place, rows: rows.slice(0, 10).map((x, i) => ({ ...x, place: i + 1 })) };
}
