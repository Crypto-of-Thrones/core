
export const DAY_MS = 86400e3;

const FEATURES = Object.freeze([
  { key: 'market', day: 2 },
  { key: 'pvp', day: 3 },
  { key: 'joust', day: 3 },
  { key: 'dungeons', day: 4 },
  { key: 'lottery', day: 7 },
]);

const byKey = new Map(FEATURES.map((f) => [f.key, f]));

const isPanelPlan = (plan) => plan !== null && typeof plan === 'object' && !Array.isArray(plan);

export function normalizePlan(plan) {
  if (Number.isSafeInteger(plan)) return plan;
  if (!isPanelPlan(plan)) return null;
  const out = {};
  for (const f of FEATURES) {
    const v = plan[f.key];
    if (v === false || Number.isSafeInteger(v)) out[f.key] = v;
  }
  return out;
}

function launchDay(start, now) {
  if (start == null || isPanelPlan(start)) return null;
  return Math.max(1, Math.floor((now - start) / DAY_MS) + 1);
}

export function featureOpen(key, start, now) {
  const f = byKey.get(key);
  if (!f || start == null) return true;
  if (isPanelPlan(start)) {
    const v = start[key];
    return v === undefined || (v !== false && now >= v);
  }
  return launchDay(start, now) >= f.day;
}
