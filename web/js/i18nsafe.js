import { ticker } from './ticker.js';
import { embedded, hostI18n } from './hostbase.js';

const I18N_MODULE = './i18n.js';
export const gamePage = typeof document !== 'undefined' && !!document.querySelector?.('script[src*="js/main."]');
const i18n = gamePage ? await import( I18N_MODULE).catch(() => null) : null;

const dictionary = () => i18n || (embedded() ? hostI18n() : null);

export const locale = dictionary()?.locale || 'en';

export function t(key, params, en) {
  const d = dictionary();
  const v = d && d.known(key) ? d.t(key, params) : key;
  if (v !== key) return v;
  const text = en && typeof en === 'object' ? en[new Intl.PluralRules('en').select(Number(params?.count) || 0)] ?? en.other : en;
  return String(text ?? key).replace(/\{(\w+)\}/g, (m, k) => (params && k in params ? String(params[k]) : k === 'ticker' ? ticker() : m));
}
