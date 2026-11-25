import { TRIAL } from './data.js';
import { t } from './i18nsafe.js';

const DAY_MS = 86400e3;

const num = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);

export const isTrial = (h) => !!h?.trial;

export const freshTrial = () => ({ minted: 0, chest: 0, earned: 0, released: 0, first: 0, dismissed: 0, gateDay: 0 });

export function normalizeTrial(r) {
  return { minted: num(r?.minted), chest: num(r?.chest), earned: num(r?.earned), released: num(r?.released), first: num(r?.first), dismissed: num(r?.dismissed), gateDay: num(r?.gateDay) };
}

export const recruitKey = (i) => TRIAL.keys[((i % TRIAL.keys.length) + TRIAL.keys.length) % TRIAL.keys.length];

export function asRecruit(h) {
  h.trial = true;
  h.level = TRIAL.level;
  h.battery = false;
  return h;
}

export const trialFarmMult = (h) => (isTrial(h) ? TRIAL.farmPct / 100 : 1);

export const trialPaying = (r) => r.minted > 0 && !(r.first > 0) && !(r.dismissed > 0);

export function trialPay(r, amount, scale = 1, cent = 0.01) {
  if (!(amount > 0) || !trialPaying(r)) return 0;
  const room = Math.max(0, TRIAL.chestCap * scale - r.chest);
  const take = Math.floor(Math.min(amount, room) / cent + 1e-6) * cent;
  if (!(take > 0)) return 0;
  r.chest = Math.round((r.chest + take) / cent) * cent;
  r.earned = Math.round((r.earned + take) / cent) * cent;
  return take;
}

export function releaseOf(r, spent, cent = 0.01) {
  if (!(spent > 0) || !(r.chest > 0)) return 0;
  return Math.min(r.chest, Math.floor((spent * TRIAL.releasePct) / 100 / cent + 1e-6) * cent);
}

export function applyRelease(r, spent, now, cent = 0.01) {
  if (!(spent > 0)) return 0;
  if (r.minted > 0 && !(r.first > 0)) r.first = now;
  const amt = releaseOf(r, spent, cent);
  if (!(amt > 0)) return 0;
  r.chest = Math.max(0, Math.round((r.chest - amt) / cent) * cent);
  r.released = Math.round((r.released + amt) / cent) * cent;
  return amt;
}

export const dismissAt = (r) => (r.first > 0 ? r.first + TRIAL.afterDays * DAY_MS : 0);

export const dismissDue = (r, now) => !(r.dismissed > 0) && r.first > 0 && now >= dismissAt(r);

export function burnBlock(h) {
  if (!isTrial(h)) return 'notTrial';
  if (h.status === 'work') return 'hunting';
  if (h.status === 'rest' && h.castle) return 'castle';
  return '';
}

export const burnableRecruits = (heroes) => (Array.isArray(heroes) ? heroes : []).filter((h) => !burnBlock(h));

export const wheelSpentOf = (roi) => num(roi?.invT ?? roi?.inv) + num(roi?.ws);

export const wheelFreeOk = (invested) => num(invested) >= TRIAL.wheelMinInvest - 1e-9;

export const wheelFreeMissing = (invested) => Math.max(0, Math.ceil(TRIAL.wheelMinInvest - num(invested)));

export const paidFirst = (heroes) => [...heroes.filter((h) => !isTrial(h)), ...heroes.filter(isTrial)];

export function benchRecruitFor(hero, heroes, cap) {
  if (isTrial(hero) || hero.status === 'work') return null;
  const working = heroes.filter((x) => x.status === 'work');
  if (working.length < cap) return null;
  const r = working.filter(isTrial).pop();
  if (!r) return null;
  r.status = 'idle';
  r.castle = false;
  r.hold = false;
  return r;
}

export function trialBlock(h, what) {
  if (!isTrial(h)) return '';
  const fallback = {
    sell: 'Trainees cannot be sold or listed.',
    fuse: 'Trainees cannot be fused.',
    level: 'Trainees stay at level 1.',
    expedition: 'Trainees only hunt: no Expeditions or Dungeons.',
    joust: 'Trainees cannot fight in the Joust.',
    event: 'Trainees join only with the free entry, without a prize.',
  }[what];
  return fallback ? t(`trial.block.${what}`, null, fallback) : t('trial.block.expedition', null, 'Trainees only hunt: no Expeditions or Dungeons.');
}
