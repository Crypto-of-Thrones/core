import { TRAINING } from './data.js';

export const TRAIN_STATS = ['atk', 'def', 'hp'];

export const TRAIN_SHOW_MS = 3000;

export const trainCost = (stat) => TRAINING.cost[stat];

export const LEGACY_TRAIN_FLOOR = 5;

export const TRAIN_RULES = Object.freeze([
  Object.freeze({ start: 100, step: 5, floor: 50 }),
]);

export const chanceUnder = (r, tries) => Math.max(r.floor, r.start - r.step * Math.max(0, Math.floor(Number(tries)) || 0));

export function trainChance(tries = 0, floor = TRAINING.chance.floor) {
  const { start, step } = TRAINING.chance;
  return Math.max(floor, start - step * Math.max(0, Math.floor(Number(tries)) || 0));
}

export const trainedPoints = (t) => TRAIN_STATS.reduce((s, k) => s + (t[k] || 0), 0);

export const rollTraining = (tries, rng = Math.random, floor = TRAINING.chance.floor) => rng() * 100 < trainChance(tries, floor);

export const freshTraining = () => ({ atk: 0, def: 0, hp: 0, tries: { atk: 0, def: 0, hp: 0 } });

const count = (n) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

export function normalizeTraining(t) {
  const out = freshTraining();
  if (!t || typeof t !== 'object') return out;
  for (const k of TRAIN_STATS) {
    out[k] = count(t[k]);
    out.tries[k] = t.tries && typeof t.tries === 'object' ? count(t.tries[k]) : out[k];
  }
  return out;
}
