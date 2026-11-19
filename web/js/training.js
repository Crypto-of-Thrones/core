import { fighter } from './hero.js';
import { t } from './i18nsafe.js';

export { TRAIN_STATS, TRAIN_SHOW_MS, trainCost, trainChance, trainedPoints, rollTraining, freshTraining, normalizeTraining } from './trainingrules.js';

export const STAT_NAMES = { atk: t('training.stat.atk', null, 'Attack'), def: t('training.stat.def', null, 'Defense'), hp: t('training.stat.hp', null, 'HP') };

export const trainedMark = (n) => (n > 0 ? `<em class="tr-plus" title="${t('training.mark.title', { n }, '+{n} trained on this Hero')}">+${n}</em>` : '');

export function trainedFighter(hero, t) {
  const f = fighter(hero);
  return { atk: f.atk + t.atk, def: f.def + t.def, hp: f.hp + t.hp };
}
