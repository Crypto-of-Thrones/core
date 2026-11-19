import { COIN_NAME, SERVER_MODE, SERVER_URL } from './buildprofile.js';

export const TICKER_DEFAULT = '$COIN';
export const TICKER_RE = /^\$[A-Za-z][A-Za-z0-9]{1,9}$/;
const STORE_KEY = 'cot.ticker.v1';

const valid = (v) => typeof v === 'string' && TICKER_RE.test(v);
const store = () => (typeof window !== 'undefined' ? globalThis.localStorage : null);
const stored = () => { try { return store()?.getItem(STORE_KEY) ?? null; } catch { return null; } };

const toCss = (v) => { try { globalThis.document?.documentElement?.style.setProperty('--ticker', JSON.stringify(v)); } catch {  } };

let current = valid(COIN_NAME) ? COIN_NAME : valid(stored()) ? stored() : TICKER_DEFAULT;
toCss(current);

export const ticker = () => current;

export function setTicker(v) {
  if (!valid(v)) return current;
  current = v;
  toCss(v);
  try { store()?.setItem(STORE_KEY, v); } catch {  }
  return current;
}

export const withTicker = (text) => String(text).replaceAll('{ticker}', current);

export async function refreshTicker(server = SERVER_URL, fetchFn = globalThis.fetch) {
  try {
    const r = await fetchFn(`${String(server).replace(/\/$/, '')}/public-config`);
    if (r.ok) setTicker((await r.json())?.ticker);
  } catch {  }
  return current;
}

if (SERVER_MODE && typeof window !== 'undefined' && typeof globalThis.fetch === 'function') refreshTicker();
