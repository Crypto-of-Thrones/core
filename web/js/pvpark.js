
export const PVP_LOOKS = Object.freeze(['pvp_seal', 'pvp_avatar', 'pvp_frame', 'pvp_banner', 'pvp_name', 'pvp_title']);

export const PVP_ARK = Object.freeze({
  tag: 100,
  usd: 200,
  stock: 50,
  cap: 1,
  lockDays: 30,
  saleDays: 7,
  items: Object.freeze([
    Object.freeze({ kind: 'herobox', n: 1, rarity: 'legendary', merc: 'legendary' }),
    Object.freeze({ kind: 'gear', rarity: 'legendary' }),
    Object.freeze({ kind: 'horse', rarity: 'legendary' }),
    ...PVP_LOOKS.map((id) => Object.freeze({ kind: 'cosmetic', id })),
  ]),
});

const HERO_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export const boxToMerc = (it, heroRarity) => !!it?.merc && HERO_ORDER.indexOf(heroRarity) >= HERO_ORDER.indexOf(it.rarity);

export const pvpRolls = () => PVP_ARK.items.filter((it) => it.kind === 'herobox' || it.kind === 'summon');

export function pvpSale(start, now) {
  if (!Number.isFinite(start)) return { start: null, end: null, status: 'off' };
  const end = start + PVP_ARK.saleDays * 864e5;
  return { start, end, status: now < start ? 'soon' : now < end ? 'open' : 'closed' };
}
