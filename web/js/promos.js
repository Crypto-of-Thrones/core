import { HEROES, RARITIES, SUMMON_COST, summonCost } from './data.js';
import { cotPrice, livePrices, livePayouts, liveIndexed } from './realmlive.js';
import { floorChance } from './summon.js';
import { seeded, VIGIL_WINDOW_ID } from './raidrules.js';
import { rivalsAt, prizeOf } from './invite.js';
import { SERVER_MODE } from './buildprofile.js';
import { WORLD_BOSSES } from './worldboss.js';
import { t } from './i18nsafe.js';
import { MAINNET } from './buildprofile.js';
import { QUICKNET, roundAt, hexToBytes, bytesToHex } from './drand.js';
import { sha256 } from './fieldluck.js';

export const DEV_TOOLS = !MAINNET;

const HOUR = 3600e3;
export const DAY = 24 * HOUR;


export const COFFERS = {
  uncommon:  { name: 'Verdant Coffer',   art: 'offers/coffer_uncommon.png' },
  rare:      { name: 'Azure Coffer',     art: 'offers/coffer_rare.png' },
  epic:      { name: 'Amethyst Coffer',  art: 'offers/coffer_epic.png' },
  legendary: { name: 'Sunforged Coffer', art: 'offers/coffer_legendary.png' },
};

export const SOL_RATE = 4_000_000;

const inSol = (sol) => ({ sol, price: Math.round(sol * SOL_RATE) });

export const PROMOS = [
  {
    id: 'welcome_satchel', tag: t('promos.offers.welcomeSatchel.tag', null, 'First purchase'), name: 'Recruit Satchel', art: 'offers/satchel.png', days: 14, limit: 1, first: true, schedule: null,
    blurb: t('promos.offers.welcomeSatchel.blurb', null, 'For lords who never bought an offer. One per account.'),
    steps: [{ name: 'Recruit Satchel', price: 99000, items: { coffers: { uncommon: 1 }, summons: 3 } }],
  },
  {
    id: 'raven_flock', tag: t('promos.offers.ravenFlock.tag', null, 'Discounted summons'), name: 'Raven Flock', art: 'offers/ravens.png', days: 3, limit: 3, schedule: null,
    blurb: t('promos.offers.ravenFlock.blurb', null, 'Ten summons sent at once, for less than ten. Up to 3 per account.'),
    steps: [{ name: 'Raven Flock', price: 185000, items: { summons: 10 } }],
  },
  {
    id: 'verdant_coffer', tag: t('promos.offers.verdantCoffer.tag', null, 'Guaranteed box'), name: 'Verdant Coffer', art: COFFERS.uncommon.art, days: 7, limit: 10, schedule: null,
    blurb: t('promos.offers.verdantCoffer.blurb', null, 'Never a Common. Up to 10 per account.'),
    steps: [{ name: 'Verdant Coffer', price: 129000, items: { coffers: { uncommon: 1 } } }],
  },
  {
    id: 'azure_coffer', tag: t('promos.offers.azureCoffer.tag', null, 'Limited stock'), name: 'Azure Coffer', art: COFFERS.rare.art, days: 3, limit: 5, stock: 300, schedule: null,
    blurb: t('promos.offers.azureCoffer.blurb', null, 'Rare or better, while the realm stock lasts. Up to 5 per account.'),
    steps: [{ name: 'Azure Coffer', price: 279000, items: { coffers: { rare: 1 } } }],
  },
  {
    id: 'four_banners', tag: t('promos.offers.fourBanners.tag', null, 'Bundle'), name: 'Four Banners', art: 'offers/banners.png', days: 5, limit: 1, schedule: null,
    blurb: t('promos.offers.fourBanners.blurb', null, 'One coffer of every color and five summons. One per account.'),
    steps: [{ name: 'Four Banners', price: 4190000, items: { coffers: { legendary: 1, epic: 1, rare: 1, uncommon: 1 }, summons: 5 } }],
  },
  {
    id: 'oath_ladder', tag: t('promos.offers.oathLadder.tag', null, 'Step-up'), name: 'The Oath Ladder', art: 'offers/stair.png', days: 7, limit: 5, schedule: null,
    blurb: t('promos.offers.oathLadder.blurb', null, 'Five oaths, once per account. Each one you buy opens the next.'),
    steps: [
      { name: 'Oath of the Squire', price: 117000, items: { coffers: { uncommon: 1 } } },
      { name: 'Oath of the Blade', price: 337000, items: { coffers: { rare: 1 }, summons: 3 } },
      { name: 'Oath of the Banner', price: 726000, items: { coffers: { rare: 2, uncommon: 1 }, summons: 5 } },
      { name: 'Oath of the Keep', price: 1547000, items: { coffers: { epic: 1, rare: 2 } } },
      { name: 'Oath of the Crown', price: 3820000, items: { coffers: { legendary: 1, epic: 1 }, summons: 10 } },
    ],
  },
  {
    id: 'season_steps', tag: t('promos.offers.seasonSteps.tag', null, 'End of season'), name: 'The Last March', art: COFFERS.legendary.art, days: 5, limit: 7, season: true, schedule: null,
    blurb: t('promos.offers.seasonSteps.blurb', null, 'Seven rewards before the season closes. Buy them in order, each one only once.'),
    steps: [
      { name: 'Lone Rider', price: 23750, items: { summons: 1 } },
      { name: 'Twin Riders', price: 45000, items: { summons: 2 } },
      { name: 'War Party', price: 63750, items: { summons: 3 } },
      { name: 'Vanguard', price: 80000, items: { summons: 4 } },
      { name: 'Warband', price: 93750, items: { summons: 5 } },
      { name: 'Amethyst Pact', ...inSol(0.275), items: { coffers: { epic: 1 } } },
      { name: 'Sunforged Pact', ...inSol(0.74), items: { coffers: { legendary: 1 } } },
    ],
  },
];

export const SUMMON_RANKING = {
  id: 'raven_call', kind: 'ranking', name: 'The Raven Call', tag: t('promos.ranking.tag', null, 'Summon ranking'), art: 'offers/trophy.png', days: 7, schedule: null,
  blurb: t('promos.ranking.blurb', null, 'A race to summon the most. Rarer mercenaries score more.'),
  points: { common: 1, uncommon: 3, rare: 6, epic: 15, legendary: 40, mythic: 100 },
  rivalTop: [900, 1400],
  potFloor: 300000,
  potShare: 1.5,
  top: [26, 15, 10, 7, 6, 5, 4, 3, 2.5, 1.5],
  rest: 20,
  restTo: 50,
  review: 72,
  realmSpend: [5e6, 12e6],
};

for (const p of PROMOS) for (const s of p.steps || []) if (!s.sol) livePrices(s, ['price']);
livePayouts(SUMMON_RANKING, ['potFloor']);
liveIndexed(SUMMON_RANKING, ['realmSpend']);

export const FIGHT_HOUR = {
  id: 'fight_hour', kind: 'event', name: 'Fight Hour', tag: t('promos.fightHour.tag', null, 'Hunt event'), art: 'enemies/spider_portrait.png', hours: 1, schedule: null,
  blurb: t('promos.fightHour.blurb', null, 'Hunt farm doubled for an hour. Click every spider that lands to keep it.'),
  mult: 2,
  every: 30e3,
  grace: 10e3,
  pack: [[1, 70], [2, 20], [3, 10]],
};

export const MUSTER = {
  id: 'host_muster', kind: 'event', name: "The Host's Muster", tag: t('promos.muster.tag', null, 'Invite event'), art: 'offers/trophy.png', days: 7, schedule: null,
};

export const musterLive = (windows, now) => windowState(windows[MUSTER.id], now) === 'live';

const PROMO_IDS = [...PROMOS.map((p) => p.id), SUMMON_RANKING.id, FIGHT_HOUR.id, MUSTER.id, ...WORLD_BOSSES.map((b) => b.id), VIGIL_WINDOW_ID];
export const promoById = (id) => PROMOS.find((p) => p.id === id) || null;


export const cofferValue = (floor) => cotPrice(Math.round(SUMMON_COST / floorChance(floor) / 1000) * 1000);

export function offerValue(items) {
  const coffers = Object.entries(items.coffers || {}).reduce((t, [floor, n]) => t + cofferValue(floor) * n, 0);
  return coffers + (items.summons || 0) * summonCost();
}

export const listSol = (items) => Number((offerValue(items) / SOL_RATE).toFixed(3));

export const discountOf = (step) => Math.round((1 - step.price / offerValue(step.items)) * 100);

export function offerRolls(items) {
  const order = Object.keys(RARITIES).reverse();
  const coffers = Object.entries(items.coffers || {}).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  return items.summons ? [...coffers, [undefined, items.summons]] : coffers;
}


const freshRanking = () => ({ start: 0, end: 0, pts: 0, summons: 0, spent: 0, filed: false, results: [], won: 0 });

const freshFight = () => ({ day: 0, start: 0, on: true, next: 0, until: 0, left: 0 });

export const freshPromos = () => ({ windows: {}, bought: {}, buys: 0, ranking: freshRanking(), fight: freshFight(), auto: true, daily: null, secrets: {}, fightNews: [] });

export function keepFightSecrets(rec, day) {
  rec.secrets ||= {};
  let changed = false;
  for (const k of Object.keys(rec.secrets)) if (Number(k) < day) { delete rec.secrets[k]; changed = true; }
  for (const k of [day, day + 1]) if (!isHex32(rec.secrets[k])) { rec.secrets[k] = newFightSecret(); changed = true; }
  return changed;
}

const count = (v) => (Number.isInteger(v) && v > 0 ? v : 0);
const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
const goodWindow = (w) => w && Number.isFinite(w.start) && Number.isFinite(w.end) && w.start < w.end;

function normalizeRanking(r) {
  const e = freshRanking();
  if (!r || typeof r !== 'object') return e;
  const results = Array.isArray(r.results) ? r.results.filter((x) => x && Number.isFinite(x.week) && Number.isFinite(x.prize) && x.prize > 0 && Number.isFinite(x.readyAt)) : [];
  const run = goodWindow(r) ? { start: r.start, end: r.end, pts: num(r.pts), summons: count(r.summons), spent: num(r.spent), filed: !!r.filed } : {};
  return { ...e, ...run, results, won: num(r.won) };
}

function normalizeFight(f) {
  const left = count(f?.left);
  return { day: count(f?.day), start: num(f?.start), on: f?.on !== false, next: num(f?.next), until: num(f?.until), left: Math.min(left, Math.max(...FIGHT_HOUR.pack.map(([n]) => n))) };
}

export function normalizePromos(x) {
  const e = freshPromos();
  if (!x || typeof x !== 'object') return e;
  for (const id of PROMO_IDS) if (goodWindow(x.windows?.[id])) e.windows[id] = { start: x.windows[id].start, end: x.windows[id].end };
  for (const p of PROMOS) { const n = count(x.bought?.[p.id]); if (n) e.bought[p.id] = Math.min(n, p.limit); }
  e.buys = count(x.buys);
  e.ranking = normalizeRanking(x.ranking);
  e.fight = normalizeFight(x.fight);
  e.auto = x.auto !== false;
  const d = x.daily;
  if (d && Number.isInteger(d.day) && Number.isInteger(d.round) && isHex32(d.randomness) && isHex32(d.secret)) e.daily = { day: d.day, round: d.round, randomness: d.randomness, secret: d.secret };
  const days = Object.keys(x.secrets && typeof x.secrets === 'object' ? x.secrets : {}).map(Number).filter((k) => Number.isInteger(k) && k > 0 && isHex32(x.secrets[k]));
  for (const k of days.sort((a, b) => b - a).slice(0, 2)) e.secrets[k] = x.secrets[k];
  const news = Array.isArray(x.fightNews) ? x.fightNews.filter((n) => goodWindow(n)) : [];
  e.fightNews = news.filter((n, i) => news.findIndex((m) => m.start === n.start) === i).map((n) => ({ start: n.start, end: n.end }))
    .sort((a, b) => b.start - a.start).slice(0, FIGHT_NEWS.keep);
  return e;
}

export const FIGHT_NEWS = Object.freeze({ keep: 7, grace: 60e3 });

export function noteFightStart(rec, w, now, present) {
  const ws = windowState(w, now);
  if ((ws !== 'live' && ws !== 'ended') || now - w.start > DAY) return null;
  rec.fightNews ||= [];
  if (rec.fightNews.some((n) => n.start === w.start)) return null;
  rec.fightNews = [{ start: w.start, end: w.end }, ...rec.fightNews].sort((a, b) => b.start - a.start).slice(0, FIGHT_NEWS.keep);
  const alert = ws === 'live';
  return { start: w.start, end: w.end, alert, seen: alert && !!present && now - w.start <= FIGHT_NEWS.grace };
}

export const fightNewsId = (start) => `fight:${start}`;


export function promoWindows(saved, dev = DEV_TOOLS, server = null) {
  const out = {};
  for (const p of [...PROMOS, SUMMON_RANKING, FIGHT_HOUR, MUSTER, ...WORLD_BOSSES]) {
    if (!p.schedule) continue;
    const w = { start: Date.parse(p.schedule.start), end: Date.parse(p.schedule.end) };
    if (goodWindow(w)) out[p.id] = w;
  }
  const all = dev ? { ...out, ...saved } : out;
  if (!server || typeof server !== 'object') return all;
  for (const p of PROMOS) {
    delete all[p.id];
    if (goodWindow(server[p.id])) all[p.id] = { start: server[p.id].start, end: server[p.id].end };
  }
  return all;
}

export function offerWindows(rows, now) {
  const all = Object.entries(promoWindows({}, false)).filter(([id]) => promoById(id)).map(([id, w]) => ({ id, ...w }));
  for (const r of rows || []) if (promoById(r.id) && goodWindow(r)) all.push({ id: r.id, start: r.start, end: r.end });
  const out = {};
  for (const w of all.sort((a, b) => a.start - b.start)) {
    if (w.end <= now || windowState(out[w.id], now) === 'live') continue;
    if (!out[w.id] || w.start <= now) out[w.id] = { start: w.start, end: w.end };
  }
  return out;
}

export function windowState(w, now) {
  if (!w) return 'off';
  if (now < w.start) return 'scheduled';
  return now < w.end ? 'live' : 'ended';
}

export function calendarMonth(year, month, windows, names, now) {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(year, month, 1 - lead + i));
    const start = d.getTime();
    const end = Date.UTC(year, month, 2 - lead + i);
    const events = Object.entries(windows)
      .filter(([, w]) => w.start < end && w.end > start)
      .sort(([, a], [, b]) => a.start - b.start)
      .map(([id, w]) => ({ id, name: names[id] || id, state: windowState(w, now) }));
    days.push({ start, day: d.getUTCDate(), inMonth: d.getUTCMonth() === month, events });
  }
  return days;
}

export function windowBlock(start, end, now) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return t('promos.window.pick', null, 'Pick a start and an end');
  if (end <= start) return t('promos.window.order', null, 'The end must come after the start');
  return end <= now ? t('promos.window.over', null, 'That window is already over') : '';
}


export function currentStep(p, rec) {
  const index = p.steps.length === 1 ? 0 : Math.min(rec.bought[p.id] || 0, p.steps.length - 1);
  return { step: p.steps[index], index };
}

export function stockLeft(p, w, now, mine) {
  if (!p.stock) return null;
  const r = seeded(`stock:${p.id}:${w.start}`);
  const share = 0.7 + r() * 0.35;
  const curve = 0.7 + r() * 0.6;
  const t = Math.min(1, Math.max(0, (now - w.start) / (w.end - w.start)));
  return Math.max(0, p.stock - Math.floor(p.stock * share * t ** curve) - mine);
}

export function realmStock(p, rec, w, now) {
  if (!p.stock) return null;
  const real = rec.stock?.[p.id];
  if (Number.isInteger(real)) return Math.max(0, real);
  return SERVER_MODE ? null : stockLeft(p, w, now, rec.bought[p.id] || 0);
}

export function offerBlock(p, rec, windows, now) {
  const w = windows[p.id];
  if (windowState(w, now) !== 'live') return 'off';
  const mine = rec.bought[p.id] || 0;
  if (p.first && rec.buys > 0) return 'used';
  if (mine >= p.limit) return 'limit';
  return realmStock(p, rec, w, now) === 0 ? 'sold' : '';
}

export const visibleOffers = (rec, windows, now) => PROMOS.filter((p) => !['off', 'used'].includes(offerBlock(p, rec, windows, now)));


const rankProgress = (r, now) => Math.min(1, Math.max(0, (now - r.start) / (r.end - r.start)));
const rankRivals = (r, now) => rivalsAt('summons', r.start, SUMMON_RANKING.rivalTop, rankProgress(r, now));

export function rankingPot(r, now) {
  const { potFloor, potShare, realmSpend: [lo, hi] } = SUMMON_RANKING;
  const realm = SERVER_MODE ? 0 : (lo + seeded(`summons-spend:${r.start}`)() * (hi - lo)) * rankProgress(r, now);
  return Math.round(potFloor + ((realm + r.spent) * potShare) / 100);
}

export const rankingPlace = (r, now) => 1 + rankRivals(r, now).filter((x) => x.pts > r.pts).length;

export const rankingPrize = (r, now) => (r.pts >= 1 ? prizeOf(rankingPlace(r, now), rankingPot(r, now), SUMMON_RANKING) : 0);

export function rankingBoard(r, now) {
  const pot = rankingPot(r, now);
  const rows = rankRivals(r, now);
  rows.splice(rankingPlace(r, now) - 1, 0, { name: 'You', pts: r.pts, me: true });
  return rows.slice(0, SUMMON_RANKING.top.length).map((x, i) => ({ ...x, place: i + 1, prize: prizeOf(i + 1, pot, SUMMON_RANKING) }));
}

function fileRanking(r, at, readyAt) {
  const prize = rankingPrize(r, at);
  if (prize > 0) r.results.push({ week: r.start, pts: r.pts, place: rankingPlace(r, at), prize, readyAt });
  r.filed = true;
  return prize;
}

export function rollRanking(rec, w, now) {
  const r = rec.ranking;
  if (r.start && !r.filed && now >= r.end) fileRanking(r, r.end, r.end + SUMMON_RANKING.review * HOUR);
  if (w && w.start !== r.start) rec.ranking = { ...freshRanking(), start: w.start, end: w.end, results: r.results, won: r.won };
}

export function closeRankingNow(rec, now) {
  const r = rec.ranking;
  return r.start && !r.filed ? fileRanking(r, now, now) : 0;
}

export const pointsOf = (list) => list.reduce((t, x) => t + SUMMON_RANKING.points[HEROES[x.key].rarity], 0);

export function scoreSummons(r, list, paid, now) {
  if (r.filed || now < r.start || now >= r.end) return;
  r.pts += pointsOf(list);
  r.summons += list.length;
  r.spent += paid;
}

export const rankingVisible = (rec, windows, now) => windowState(windows[SUMMON_RANKING.id], now) === 'live' || rec.ranking.results.length > 0;


const utcDay = (now) => Math.floor(now / DAY);

export function fightBlock(rec, windows, now) {
  if (windowState(windows[FIGHT_HOUR.id], now) === 'live') return t('promos.fightHour.live', { name: FIGHT_HOUR.name }, '{name} is already live');
  return rec.fight.day === utcDay(now) ? t('promos.fightHour.used', { name: FIGHT_HOUR.name }, '{name} was already used today (UTC)') : '';
}

export function startFight(rec, now) {
  rec.windows[FIGHT_HOUR.id] = { start: now, end: now + FIGHT_HOUR.hours * HOUR };
  rec.fight.day = utcDay(now);
}

function fightPack(start, at) {
  const { pack } = FIGHT_HOUR;
  let roll = seeded(`fight:${start}:${at}`)() * pack.reduce((t, [, w]) => t + w, 0);
  return pack.find(([, w]) => (roll -= w) < 0)[0];
}

export function fightTick(rec, w, now, ready = true) {
  if (windowState(w, now) !== 'live') { rec.fight.left = 0; return; }
  if (rec.fight.start !== w.start) rec.fight = { ...freshFight(), day: rec.fight.day, start: w.start, next: w.start + FIGHT_HOUR.every };
  const run = rec.fight;
  if (run.left && now >= run.until) { run.left = 0; run.on = false; }
  if (!run.left && ready && now >= run.next) {
    run.left = fightPack(run.start, run.next);
    run.until = now + FIGHT_HOUR.grace;
    run.next = now + FIGHT_HOUR.every;
  }
}

export function fightHit(run) {
  if (!run.left) return false;
  if (--run.left === 0) run.on = true;
  return true;
}

export const FIGHT_DAILY = { from: HOUR, step: 15 * 60e3, slots: 88, domain: 'cot-fight-hour/v2' };

export const fightDay = utcDay;

export const fightRound = (day, info = QUICKNET) => roundAt(day * DAY, info);

export const fightDrawId = (day) => bytesToHex(sha256(new TextEncoder().encode(`${FIGHT_DAILY.domain}|${day}`)));

const HEX64 = /^[0-9a-f]{64}$/;

export const isHex32 = (s) => typeof s === 'string' && HEX64.test(s);

export const fightCommit = (secret) => bytesToHex(sha256(hexToBytes(secret)));

export const newFightSecret = () => bytesToHex(globalThis.crypto.getRandomValues(new Uint8Array(32)));

export function dailyFight(day, randomness, secret, info = QUICKNET) {
  if (!isHex32(secret)) throw new Error('fight hour: bad secret');
  const parts = [hexToBytes(randomness), hexToBytes(fightDrawId(day)), hexToBytes(secret)];
  const msg = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { msg.set(p, at); at += p.length; }
  const seed = bytesToHex(sha256(msg));
  const slot = Math.floor((parseInt(seed.slice(0, 8), 16) / 4294967296) * FIGHT_DAILY.slots);
  const start = day * DAY + FIGHT_DAILY.from + slot * FIGHT_DAILY.step;
  return { day, round: fightRound(day, info), commit: fightCommit(secret), secret, seed, slot, start, end: start + FIGHT_HOUR.hours * HOUR };
}

export function checkFightReveal(d, commit, randomness, info = QUICKNET) {
  if (!d || !isHex32(d.secret) || !isHex32(commit) || fightCommit(d.secret) !== commit) return false;
  try {
    const again = dailyFight(d.day, randomness, d.secret, info);
    return again.seed === d.seed && again.start === d.start && again.round === d.round;
  } catch { return false; }
}

const dailyMemo = { key: '', out: null };

export function dailyWindow(d, now, on = true) {
  if (!on || !d || d.day !== utcDay(now) || d.round !== fightRound(d.day) || !isHex32(d.secret)) return null;
  const key = `${d.day}:${d.randomness}:${d.secret}`;
  if (dailyMemo.key !== key) {
    try { dailyMemo.out = dailyFight(d.day, d.randomness, d.secret); } catch { dailyMemo.out = null; }
    dailyMemo.key = key;
  }
  return dailyMemo.out;
}

export const fightDrawShown = (d, now) => (!d || now >= d.start ? d : { day: d.day, round: d.round, commit: d.commit, surprise: true });

export const fightExtraWindow = (w, now) => (w && !w.auto && windowState(w, now) !== 'ended' ? w : null);

export const fightSurprise = (w, now) => !!w?.auto && windowState(w, now) === 'scheduled';

export function fightPlate(w, d, now) {
  const ws = windowState(w, now);
  if (ws === 'live') return null;
  if (ws === 'scheduled' && w.start - now < DAY) return fightSurprise(w, now) ? { kind: 'surprise' } : { kind: 'next', at: w.start };
  if (!d) return null;
  if (d.surprise || !(now >= d.start)) return { kind: 'surprise' };
  return now >= d.end ? { kind: 'done', at: d.start } : null;
}

export const fightChip = (w, d, now) => (windowState(w, now) === 'live' ? { kind: 'live' } : fightPlate(w, d, now));

export function pickFightWindow(manual, daily, now) {
  const all = [manual, daily && { start: daily.start, end: daily.end, auto: true }].filter(Boolean);
  return all.find((w) => windowState(w, now) === 'live')
    || all.filter((w) => windowState(w, now) === 'scheduled').sort((a, b) => a.start - b.start)[0]
    || all[0];
}

export const fightMult = (rec, w, now) => (windowState(w, now) === 'live' && rec.fight.start === w.start && rec.fight.on ? FIGHT_HOUR.mult : 1);
