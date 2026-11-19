
export const REALM_LIVE = { emission: 1, index: 1, charge: 0 };

export const FIXED_PRICES = true;

export const chargeIx = () => Math.min(1, REALM_LIVE.charge > REALM_LIVE.index ? REALM_LIVE.charge : REALM_LIVE.index);

export const roundCot = (x) => (x >= 100 ? Math.round(x) : x >= 1 ? Math.round(x * 100) / 100 : Math.max(0.001, Math.round(x * 1000) / 1000));

export const cotPrice = (base) => (base > 0 ? roundCot(base * chargeIx()) : base);

export const payoutMult = () => REALM_LIVE.emission * REALM_LIVE.index;

export const payout = (base) => (base > 0 ? Math.round(base * payoutMult() * 100) / 100 : base);

export const indexed = (base) => (base > 0 ? Math.round(base * REALM_LIVE.index * 100) / 100 : base);

function live(obj, keys, fn, deep) {
  for (const k of keys || Object.keys(obj)) {
    const v = obj[k];
    if (deep && v && typeof v === 'object' && !Array.isArray(v)) { live(v, null, fn, deep); continue; }
    if (typeof v !== 'number' && !(Array.isArray(v) && v.every((x) => typeof x === 'number'))) continue;
    let base = v;
    Object.defineProperty(obj, k, {
      enumerable: true,
      configurable: true,
      get: () => (Array.isArray(base) ? base.map(fn) : fn(base)),
      set: (x) => { base = x; },
    });
  }
  return obj;
}

export const livePrices = (obj, keys = null, { deep = false } = {}) => live(obj, keys, cotPrice, deep);

export const livePayouts = (obj, keys = null, { deep = false } = {}) => live(obj, keys, payout, deep);

export const liveIndexed = (obj, keys = null, { deep = false } = {}) => live(obj, keys, indexed, deep);

export function applyRealmIndex(rec) {
  const ix = Number(rec?.index);
  if (!(ix > 0 && ix <= 1)) return false;
  if (FIXED_PRICES) {
    const e = Number(rec?.emission);
    if (e > 0 && e <= 1) REALM_LIVE.emission = e;
    Object.assign(REALM_LIVE, { index: 1, charge: 0 });
    Object.assign(INDEX_DAY, { live: false, day: '', hash: '' });
    return true;
  }
  REALM_LIVE.index = ix;
  const cx = Number(rec?.charge?.index);
  REALM_LIVE.charge = cx >= ix && cx <= 1 ? cx : 0;
  const e = Number(rec?.emission);
  if (e > 0 && e <= 1) REALM_LIVE.emission = e;
  const day = typeof rec?.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rec.day) ? rec.day : '';
  const hash = typeof rec?.hash === 'string' && /^[0-9a-f]{64}$/.test(rec.hash) ? rec.hash : '';
  Object.assign(INDEX_DAY, { live: rec?.live === true && !!day, day, hash });
  return true;
}

export const INDEX_DAY = { live: false, day: '', hash: '' };
