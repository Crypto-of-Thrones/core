
export const PAGE_PROMO = Object.freeze({ pct: 50, hours: 24, from: 'wallet' });

export function pagePromoWindow(start, now) {
  if (!Number.isFinite(start)) return { start: null, end: null, status: 'closed' };
  const end = start + PAGE_PROMO.hours * 3600e3;
  return { start, end, status: now < start ? 'soon' : now < end ? 'open' : 'closed' };
}

export const pagePromoPrice = (full) => (full * (100 - PAGE_PROMO.pct)) / 100;

export const squirePriceFrom = (full, from, win) => (win?.status === 'open' && from === PAGE_PROMO.from ? pagePromoPrice(full) : full);

export const pagePromoPreview = { sale: null };

let read = null;

export function notePagePromo(sale, serverNow) {
  if (sale && typeof sale === 'object') read = { sale, serverNow: Number(serverNow) || 0, at: Date.now() };
}

let offerRead = null;

export function noteSquireOffer(offer) {
  offerRead = offer && Number.isFinite(offer.price) && offer.price > 0 && typeof offer.from === 'string' ? { price: offer.price, from: offer.from } : null;
}

export const squireOfferFrom = () => offerRead?.from || null;

export const squireOfferPrice = (price, from) => (offerRead && offerRead.from === from && offerRead.price < price ? offerRead.price : price);

export const pagePromoClock = () => (!pagePromoPreview.sale && read?.serverNow ? read.serverNow + (Date.now() - read.at) : Date.now());

export function pagePromoLeft(win) {
  const ms = Math.max(0, (win?.end ?? 0) - pagePromoClock());
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(ms / 3600e3))}:${p(Math.floor((ms % 3600e3) / 60e3))}:${p(Math.floor((ms % 60e3) / 1e3))}`;
}

export function pagePromoNow() {
  const s = pagePromoPreview.sale || read?.sale;
  if (!s) return null;
  return Number.isFinite(s.start) ? pagePromoWindow(s.start, pagePromoClock()) : s;
}
