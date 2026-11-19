
let assetBase = null;
let dictBase = null;

const folder = (url) => {
  const s = String(url);
  return s.endsWith('/') ? s : `${s}/`;
};

export function setAssetBase(url) { assetBase = url == null ? null : folder(url); }

export function setDictBase(url) { dictBase = url == null ? null : folder(url); }

export const hostAssetBase = () => assetBase;

export const hostDictBase = () => dictBase;

export const embedded = () => assetBase != null || dictBase != null;

let i18nModule = null;

export function setHostI18n(mod) { i18nModule = mod || null; }

export const hostI18n = () => i18nModule;
