import { RIVALS, seeded } from './raidrules.js';
import { t } from './i18nsafe.js';
import { SERVER_MODE } from './buildprofile.js';
import { spendBase } from './realmlive.js';

export const LOTTERY = {
  price: spendBase(100),
  winners: 4,
  prizePct: 80,
  poolPct: 20,
  maxTickets: 10000,
  rivalTickets: [20, 400],
  history: 14,
};

const DAY = 86400e3;

export const dayOf = (now) => Math.floor(now / DAY);

export const drawAt = (day) => (day + 1) * DAY;

export const freshLottery = (now) => ({ day: dayOf(now), tickets: 0, held: 0, log: [] });

export function normalizeLottery(x, now) {
  const rec = freshLottery(now);
  if (!x || typeof x !== 'object') return rec;
  if (Number.isInteger(x.day) && x.day <= rec.day) rec.day = x.day;
  rec.tickets = Math.min(LOTTERY.maxTickets, Math.max(0, Math.floor(Number(x.tickets)) || 0));
  rec.held = Math.max(0, Math.floor(Number(x.held)) || 0);
  if (Array.isArray(x.log)) rec.log = x.log.filter((d) => d && Number.isInteger(d.day) && Array.isArray(d.winners)).slice(0, LOTTERY.history);
  return rec;
}

function rivalsOf(day) {
  if (SERVER_MODE) return [];
  const rng = seeded(`lottery:${day}`);
  const [min, max] = LOTTERY.rivalTickets;
  return RIVALS.map((name) => ({ name, final: Math.round(min + rng() * (max - min)) }));
  return [];
}

const dayProgress = (day, now) => Math.min(1, Math.max(0, (now - day * DAY) / DAY));

export function entriesAt(rec, now) {
  const p = dayProgress(rec.day, now);
  const rows = rivalsOf(rec.day).map((r) => ({ name: r.name, tickets: Math.max(1, Math.floor(r.final * p)) }));
  if (rec.tickets) rows.push({ name: 'You', tickets: rec.tickets, me: true });
  return rows;
}

export function potOf(entries) {
  const tickets = entries.reduce((s, x) => s + x.tickets, 0);
  const total = tickets * LOTTERY.price;
  const winners = Math.max(1, Math.min(LOTTERY.winners, entries.filter((x) => x.tickets > 0).length));
  return { tickets, total, prize: Math.floor((total * LOTTERY.prizePct) / 100 / winners), pool: Math.floor((total * LOTTERY.poolPct) / 100) };
}

export function winChance(entries) {
  const me = entries.find((x) => x.me);
  if (!me) return 0;
  const share = me.tickets / potOf(entries).tickets;
  return 1 - (1 - share) ** LOTTERY.winners;
}

export function drawWinners(entries, seed, rng = seeded(`lottery-draw:${seed}`)) {
  const left = entries.filter((x) => x.tickets > 0);
  const out = [];
  while (out.length < LOTTERY.winners && left.length) {
    let roll = rng() * left.reduce((s, x) => s + x.tickets, 0);
    const i = left.findIndex((x) => (roll -= x.tickets) < 0);
    out.push(left.splice(i < 0 ? left.length - 1 : i, 1)[0]);
  }
  return out;
}

export const DRAW_KIND = 'lotteryDraw';
export const drawId = (day) => `lottery-${day}`;

export const sealedEntries = (rows) => rows.filter((x) => x.tickets > 0).map((x) => ({ name: x.name, tickets: x.tickets }))
  .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

export function drawUniforms(u) {
  let i = 0;
  return () => {
    if (i >= u.length) throw new Error('lottery draw uniforms exhausted');
    return u[i++];
  };
}

export function rollLottery(rec, now) {
  const day = dayOf(now);
  if (rec.day >= day) return 0;
  const entries = entriesAt(rec, drawAt(rec.day));
  const { total, prize } = potOf(entries);
  const winners = drawWinners(entries, rec.day);
  const won = winners.some((x) => x.me) ? prize : 0;
  rec.log.unshift({ day: rec.day, tickets: rec.tickets, total, prize, winners: winners.map((x) => x.name), won });
  rec.log.length = Math.min(rec.log.length, LOTTERY.history);
  Object.assign(rec, { day, tickets: 0 });
  return won;
}

export function drawOf(day, tickets = 0) {
  const entries = entriesAt({ day, tickets }, drawAt(day));
  const pot = potOf(entries);
  const winners = drawWinners(entries, day);
  const won = winners.some((x) => x.me) ? pot.prize : 0;
  return { day, tickets, sold: pot.tickets, total: pot.total, prize: pot.prize, pool: pot.pool, winners: winners.map((x) => ({ name: x.name, tickets: x.tickets })), won };
}

export function historyOf(rec, n = LOTTERY.history) {
  const out = [];
  for (let day = rec.day - 1; day >= rec.day - n && day >= 0; day--) {
    const saved = rec.log.find((x) => x.day === day);
    const d = drawOf(day, saved ? saved.tickets || 0 : 0);
    if (saved) {
      const tickets = new Map(d.winners.map((x) => [x.name, x.tickets]));
      Object.assign(d, { prize: saved.prize, total: saved.total ?? d.total, won: saved.won || 0, winners: saved.winners.map((name) => ({ name, tickets: tickets.get(name) ?? 0 })) });
      if (typeof saved.sig === 'string') d.sig = saved.sig;
    }
    out.push(d);
  }
  return out;
}

export function ticketStats(draws) {
  const played = draws.filter((x) => x.tickets > 0);
  const tickets = played.reduce((s, x) => s + x.tickets, 0);
  const wins = played.filter((x) => x.won > 0);
  return { played, days: played.length, tickets, spent: tickets * LOTTERY.price, wins: wins.length, won: wins.reduce((s, x) => s + x.won, 0) };
}

export function ticketBlock(rec, n, wallet) {
  if (!Number.isInteger(n) || n < 1) return t('lottery.block.pick', null, 'Pick how many tickets to buy.');
  if (rec.tickets + n > LOTTERY.maxTickets) return t('lottery.block.max', { max: LOTTERY.maxTickets }, 'A lord can hold up to {max} tickets a day.');
  if (wallet < n * LOTTERY.price) return t('lottery.block.short', { n, cost: n * LOTTERY.price }, 'Not enough {ticker}: {n} tickets cost {cost}.');
  return '';
}
