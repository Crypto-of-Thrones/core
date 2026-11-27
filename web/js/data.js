import { t, gamePage } from './i18nsafe.js';
import { TICKER_DEFAULT } from './ticker.js';
import { MAINNET, SERVER_MODE } from './buildprofile.js';
import { cotPrice, roundCot, indexed, livePrices, livePayouts, liveIndexed, liveSpend, liveIndexOnly, indexOnly, spendBase, REWARD_FACTOR, rewardBase } from './realmlive.js';
import { BALANCE } from './balance.js';

export const TOKEN = gamePage ? t('net.token', null, 'tokens') : TICKER_DEFAULT;
export const GAME = 'Crypto of Thrones';

export const LORD_XP_BASE = 100;
export const LORD_CLAIM_LEVEL = 3;
export const LORD_MAX_LEVEL = 50;

export const WITHDRAW = {
  feePct: BALANCE.withdraw.feePct,
  feeStartPct: BALANCE.withdraw.feeStartPct,
  feeStepPct: BALANCE.withdraw.feeStepPct,

  min: BALANCE.withdraw.min,
  hold: BALANCE.withdraw.hold,
  teamFeeSol: 0.01,
  networkFeeSol: 0.000005,
  startSol: 1,
};

export const FARM_ROI = {
  lockOn: false,
  windowH: 24,
  peakDays: 7,
  lockPct: 70,
  lockFeePct: 50,
  fromX: 1.5,
  kneeX: 1.75,
  kneePct: 47.5,
  toX: 2,
  capPct: 95,
  solWeightPct: 100,
  vaultPct: 50,
};

export const TRIAL = Object.freeze({
  count: 15,
  keys: Object.freeze(['recruit', 'lionguard', 'woodsman']),
  level: 1,
  farmPct: 10,
  chestCap: rewardBase(15_000),
  releasePct: 40,
  afterDays: 7,
  wheelMinInvest: spendBase(2_500),
});

export const RECRUIT_GRANT = Object.freeze({
  slots: 100,
  usdMonth: 3,
  months: 2,
  cycleDays: 30,
  firstAfterDays: 30,
  activeDays: 20,
  windowDays: 30,
  discordMinAgeDays: 30,
  xMinAgeDays: 30,
  xMinFollowers: 50,
  requireVerifyRole: false,
  keepDaysAfterSpend: 30,
  priceMaxAgeDays: 1,
  betaUsdPx: 0.00284,
});

const it = (kind, n, extra) => ({ kind, n, ...extra });
export const PASS = {
  levels: 25,
  days: 25,
  price: 1,
  start: Date.UTC(2026, 10, 20),
  catchUpCap: 5,
  missions: [
    { key: 'login', icon: 'castle', label: t('data.pass.login.label', null, 'Log in'), hint: t('data.pass.login.hint', null, 'Open the game today.') },
    { key: 'hunt', icon: 'sword', label: t('data.pass.hunt.label', null, 'Join the hunt'), hint: t('data.pass.hunt.hint', null, 'Send a mercenary to the hunt.') },
    { key: 'discord', icon: 'users', label: t('data.pass.discord.label', null, 'Discord chat'), hint: t('data.pass.discord.hint', null, 'Talk on the Discord server.') },
    { key: 'wave', icon: 'map', label: t('data.pass.wave.label', null, 'Clear a wave'), hint: t('data.pass.wave.hint', null, 'Win a Hunt wave today.') },
    { key: 'spin', icon: 'star', label: t('data.pass.spin.label', null, 'Spin the wheel'), hint: t('data.pass.spin.hint', null, 'Use your free daily wheel spin in Claims.') },
    { key: 'share', icon: 'trophy', label: t('data.pass.share.label', null, 'Share a feat'), hint: t('data.pass.share.hint', null, 'Share any achievement with your invite link.') },
  ],
  target: spendBase(425_000),
  rewards: [
    { paid: [it('potion', 50)], free: null },
    { paid: [it('ticket', 30)], free: null },
    { paid: [it('train', 1)], free: null },
    { paid: [it('joust', 30)], free: null },
    { paid: [it('summon', 1)], free: null },
    { paid: [it('cosmetic', 1, { id: 'laurel' })], free: null },
    { paid: [it('chest', 10000)], free: null },
    { paid: [it('potion', 60)], free: null },
    { paid: [it('cosmetic', 1, { id: 'bn_forest' })], free: null },
    { paid: [it('summon', 1)], free: null },
    { paid: [it('cosmetic', 1, { id: 'sunName' })], free: null },
    { paid: [it('ticket', 40)], free: null },
    { paid: [it('train', 1)], free: null },
    { paid: [it('cosmetic', 1, { id: 'av_goldcrown' })], free: null },
    { paid: [it('summon', 1)], free: null },
    { paid: [it('joust', 40)], free: null },
    { paid: [it('herobox', 1)], free: null },
    { paid: [it('potion', 80)], free: null },
    { paid: [it('cosmetic', 1, { id: 'dragonbane' })], free: null },
    { paid: [it('summon', 1)], free: null },
    { paid: [it('ticket', 50)], free: null },
    { paid: [it('train', 1)], free: null },
    { paid: [it('boat', 1, { tier: 'rare' })], free: null },
    { paid: [it('cosmetic', 1, { id: 'ember' })], free: null },
    { paid: [it('summon', 1, { floor: 'uncommon' })], free: null },
  ],
};
export const LEVEL_PRICE = 2000;
export const LEVEL_RARITY_PRICE = { common: 2000, uncommon: 3500, rare: 6000, epic: 10000, legendary: 18000, mythic: 30000 };
export const LEVEL_MAX = { common: 20, uncommon: 25, rare: 30, epic: 35, legendary: 40, mythic: 50 };
export const levelPrice = (rarity, level, h = null) => mintPrice((LEVEL_RARITY_PRICE[rarity] ?? cotPrice(LEVEL_PRICE)) * Math.max(1, level), h);
export const LORD_XP_WAVE = 1;
export const LORD_XP_BOSS = 5;

export const RARITIES = {
  common:    { label: t('data.rarity.common', null, 'Common'),       color: '#b8b8b8', glow: '#e0e0e0', mult: 1.0, weight: BALANCE.summon.weights.common },
  uncommon:  { label: t('data.rarity.uncommon', null, 'Uncommon'),   color: '#5fd35f', glow: '#b6f5a8', mult: 1.2, weight: BALANCE.summon.weights.uncommon },
  rare:      { label: t('data.rarity.rare', null, 'Rare'),           color: '#3fa7ff', glow: '#9fd3ff', mult: 1.4, weight: BALANCE.summon.weights.rare },
  epic:      { label: t('data.rarity.epic', null, 'Epic'),           color: '#b25cff', glow: '#dcb2ff', mult: 2.0, weight: BALANCE.summon.weights.epic },
  legendary: { label: t('data.rarity.legendary', null, 'Legendary'), color: '#ffb000', glow: '#ffe08a', mult: 3.0, weight: BALANCE.summon.weights.legendary },
  mythic:    { label: t('data.rarity.mythic', null, 'Mythic'),       color: '#ff4d6d', glow: '#ffb3c1', mult: 5.0, weight: BALANCE.summon.weights.mythic },
};

export const PITY = [
  { rarity: 'uncommon', at: 15 },
  { rarity: 'rare',     at: 50 },
  { rarity: 'epic',     at: 100, alsoResetBy: ['legendary', 'mythic'] },
];

export const SUMMON_COST = BALANCE.summon.cost;
export const summonCost = () => cotPrice(SUMMON_COST);
export const MINT_TIER = { id: 2, factor: 0.1, plate: '1k', convertAt: Date.UTC(2026, 11, 25, 15) };
const mintField = (h) => h?.mint === MINT_TIER.id;
export const isMintTier = (h, now = Date.now()) => mintField(h) || (!!h && !h.trial && now >= MINT_TIER.convertAt);
export const mintFarmMult = (h, now) => (isMintTier(h, now) ? MINT_TIER.factor : 1);
export const legMintMult = (h) => (mintField(h) ? MINT_TIER.factor : 1);
export const mintConvert = (h, at) => {
  if (h && !h.trial && !mintField(h) && at >= MINT_TIER.convertAt) h.mint = MINT_TIER.id;
  return h;
};
export const mintDaysLeft = (now = Date.now()) => Math.max(0, Math.ceil((MINT_TIER.convertAt - now) / 86400e3));
export const mintPrice = (price, h) => (isMintTier(h) && price > 0 ? roundCot(price * MINT_TIER.factor) : price);
export const mintCost = () => cotPrice(SUMMON_COST * MINT_TIER.factor);
export const summonPrice = (from, war) => (from === 'war' && war !== 'new' ? summonCost() : mintCost());
export const SUMMON_BATCHES = [1, 5, 10, 15];

export const FARM_BASE_DAYS = { common: 90, uncommon: 80, rare: 60, epic: 40, legendary: 30, mythic: 20 };
const NET_PAYBACK = BALANCE.farm.paybackDays;
export const FARM_BOOST = Object.fromEntries(Object.entries(NET_PAYBACK).map(([r, d]) => [r, FARM_BASE_DAYS[r] / (0.8 * d)]));
export const FARM = {
  days: Object.fromEntries(Object.entries(FARM_BASE_DAYS).map(([r, d]) => [r, d / FARM_BOOST[r] / REWARD_FACTOR])),
  killsPerMin: { common: 3.77, uncommon: 4.4, rare: 5.63, epic: 8.53, legendary: 10.35, mythic: 12.67 },
  hitsPerKill: { common: 17.45, uncommon: 14.61, rare: 9.98, epic: 8.9, legendary: 9.8, mythic: 11.97 },
  huntDrain: 0.5,
  huntHit: { common: 1.1, uncommon: 1, rare: 0.75, epic: 0.9, legendary: 1.05, mythic: 1.35 },
  perLevel: 0.02,
  levelCap: 0.5,
  waveShare: 0.1,
};

export const HOUSES = {
  wolf:   { name: 'House Lynxmoor',   beast: 'lynx',       motto: 'Patience is a blade.',            colors: ['#9aa5b1', '#3b4652'] },
  lion:   { name: 'House Goldhorn',   beast: 'golden ram', motto: 'Horns high, coffers higher.',     colors: ['#c9302c', '#e8b83a'] },
  dragon: { name: 'House Cinderscale', beast: 'salamander', motto: 'Born of embers, never ash.',      colors: ['#1a1a1a', '#b3261e'] },
  kraken: { name: 'House Tidewing',   beast: 'ray',        motto: 'Glide below, strike above.',      colors: ['#e8c34a', '#2b2b2b'] },
  frost:  { name: 'The Silent Frost', beast: 'pale stag',  motto: 'Silence is the last season.',     colors: ['#a8e0ff', '#1b2a44'] },
  free:   { name: 'The Free Company', beast: 'open hand',  motto: 'Paid in full, or not at all.',    colors: ['#6b8e23', '#3a3a2a'] },
};

export const HEROES = {
  kael:      { name: 'Edric Frosthelm',  title: t('data.heroes.kael.title', null, 'Warden of the Marches'), house: 'wolf',   rarity: 'legendary', stats: { pow: 7, spd: 7, sta: 9, bmb: 3, rng: 3 } },
  daenara:   { name: 'Dunmar Kilnmaul',  title: t('data.heroes.daenara.title', null, 'The Kiln Warlock'), house: 'dragon', rarity: 'mythic',    stats: { pow: 9, spd: 8, sta: 9, bmb: 4, rng: 3 } },
  tyrus:     { name: 'Pip Coinwright',   title: t('data.heroes.tyrus.title', null, 'Master of Contraptions'), house: 'lion',   rarity: 'epic',      stats: { pow: 6, spd: 6, sta: 7, bmb: 3, rng: 3 } },
  cersa:     { name: 'Ilsabet Gildcrown', title: t('data.heroes.cersa.title', null, 'The Gilded Regent'), house: 'lion',   rarity: 'legendary', stats: { pow: 8, spd: 7, sta: 8, bmb: 3, rng: 3 } },
  aryna:     { name: 'Wren Quickstep',   title: t('data.heroes.aryna.title', null, 'The Silent Blade'), house: 'wolf',   rarity: 'rare',      stats: { pow: 5, spd: 6, sta: 6, bmb: 2, rng: 2 } },
  grom:      { name: 'Borin Scarjaw',    title: t('data.heroes.grom.title', null, 'Boar-helm Sellsword'), house: 'lion',   rarity: 'rare',      stats: { pow: 6, spd: 5, sta: 6, bmb: 2, rng: 2 } },
  brielle:   { name: 'Hilda Stonevow',   title: t('data.heroes.brielle.title', null, 'Oath of Stone'), house: 'free',   rarity: 'epic',      stats: { pow: 6, spd: 6, sta: 8, bmb: 2, rng: 2 } },
  theo:      { name: 'Corrin Tidebrand', title: t('data.heroes.theo.title', null, 'Corsair of the Coves'), house: 'kraken', rarity: 'rare',      stats: { pow: 5, spd: 5, sta: 7, bmb: 2, rng: 2 } },
  melara:    { name: 'Sefa Ashsong',     title: t('data.heroes.melara.title', null, 'Singer of Ashes'), house: 'free',   rarity: 'epic',      stats: { pow: 7, spd: 6, sta: 7, bmb: 2, rng: 2 } },
  khar:      { name: 'Tamur Steppewind', title: t('data.heroes.khar.title', null, 'Khan of the Winds'), house: 'dragon', rarity: 'legendary', stats: { pow: 7, spd: 8, sta: 8, bmb: 3, rng: 3 } },
  holdur:    { name: 'Ogg Mossback',     title: t('data.heroes.holdur.title', null, 'The Moss Giant'), house: 'wolf',   rarity: 'uncommon',  stats: { pow: 4, spd: 4, sta: 6, bmb: 1, rng: 1 } },
  frost:     { name: 'Vael',             title: t('data.heroes.frost.title', null, 'The Pale Regent'), house: 'frost',  rarity: 'mythic',    stats: { pow: 8, spd: 8, sta: 10, bmb: 3, rng: 4 } },
  recruit:   { name: 'Palisade Recruit', title: t('data.heroes.recruit.title', null, 'Fresh Spear'), house: 'wolf',   rarity: 'common',    stats: { pow: 3, spd: 4, sta: 4, bmb: 1, rng: 1 } },
  lionguard: { name: 'Gate Guard',       title: t('data.heroes.lionguard.title', null, 'Keeper of the Gate'), house: 'lion',   rarity: 'common',    stats: { pow: 3, spd: 3, sta: 5, bmb: 1, rng: 1 } },
  raider:    { name: 'Coastal Raider',   title: t('data.heroes.raider.title', null, 'Cove Cutthroat'), house: 'kraken', rarity: 'uncommon',  stats: { pow: 4, spd: 5, sta: 5, bmb: 1, rng: 1 } },
  wildling:  { name: 'Coldland Scout',   title: t('data.heroes.wildling.title', null, 'Tracker of the Fells'), house: 'free',   rarity: 'uncommon',  stats: { pow: 4, spd: 4, sta: 5, bmb: 2, rng: 2 } },
  woodsman:  { name: 'Hedge Woodsman',   title: t('data.heroes.woodsman.title', null, 'Axe for Hire'), house: 'free',   rarity: 'common',    stats: { pow: 4, spd: 3, sta: 4, bmb: 1, rng: 1 } },
  maren:     { name: 'Vorna Rimewrack',  title: t('data.heroes.maren.title', null, 'Rimecaller of the Abyss'), house: 'kraken', rarity: 'mythic', stats: { pow: 8, spd: 9, sta: 9, bmb: 3, rng: 4 } },
};

export const HERO_LORE = {
  kael: t('data.heroes.kael.lore', null, 'Has walked the frozen border so long the snow knows his step.'),
  daenara: t('data.heroes.daenara.lore', null, 'Forges his spells in a basalt kiln and cools them in his foes.'),
  tyrus: t('data.heroes.tyrus.lore', null, 'Every gear he builds pays for itself, usually with interest.'),
  cersa: t('data.heroes.cersa.lore', null, 'Rules with a golden smile and a ledger that never forgets.'),
  aryna: t('data.heroes.aryna.lore', null, 'You only hear her once the fight is already over.'),
  grom: t('data.heroes.grom.lore', null, 'Every scar on his jaw is a contract he saw through.'),
  brielle: t('data.heroes.brielle.lore', null, 'Swore never to take a step back, and the mountains believed her.'),
  theo: t('data.heroes.theo.lore', null, 'Raids the coves by moonlight and spends the loot by sunrise.'),
  melara: t('data.heroes.melara.lore', null, 'Her hymns turn cold embers into a holy blaze.'),
  khar: t('data.heroes.khar.lore', null, 'Rides ahead of the storm and leaves it far behind.'),
  holdur: t('data.heroes.holdur.lore', null, 'A gentle giant, until someone tramples his moss.'),
  frost: t('data.heroes.frost.lore', null, 'Where he walks, even the wind holds its breath.'),
  recruit: t('data.heroes.recruit.lore', null, 'New spear, new boots and everything still to prove.'),
  lionguard: t('data.heroes.lionguard.lore', null, 'Thirty years on the same gate, and no stranger got through.'),
  raider: t('data.heroes.raider.lore', null, 'Comes in with the tide and leaves with your silver.'),
  wildling: t('data.heroes.wildling.lore', null, 'Reads tracks in the snow the way scholars read letters.'),
  woodsman: t('data.heroes.woodsman.lore', null, 'Fells trees by day and foes by night, at the same fair price.'),
  maren: t('data.heroes.maren.lore', null, 'She froze a kraken mid-strike and left it in the ice as a warning.'),
};

export const SKILLS = {
  slayer: { name: t('data.skills.slayer.name', null, 'Boss Slayer'), base: 20, step: 1, desc: (v) => t('data.skills.slayer.desc', { v }, '+{v}% damage to bosses and dragons.') },
  frost:  { name: t('data.skills.frost.name', null, 'Frostbite'),    base: 20, step: 1, desc: (v) => t('data.skills.frost.desc', { v }, 'Hits slow the foe by {v}% for 2 seconds. Dragons are immune.') },
  burn:   { name: t('data.skills.burn.name', null, 'Ember Brand'),   base: 20, step: 1, desc: (v) => t('data.skills.burn.desc', { v }, 'Hits set the foe ablaze for {v}% extra damage over 3 seconds. Dragons are immune.') },
  keen:   { name: t('data.skills.keen.name', null, 'Keen Eye'),      base: 4,  step: 0.5, desc: (v) => t('data.skills.keen.desc', { v }, '+{v}% critical chance.') },
  rally:  { name: t('data.skills.rally.name', null, 'Rally Banner'), base: 4,  step: 0.5, desc: (v) => t('data.skills.rally.desc', { v }, 'Every mercenary on the field deals +{v}% damage. Only the strongest banner counts.') },
  gold:   { name: t('data.skills.gold.name', null, 'Gold Finder'),   base: 8,  step: 1, desc: (v) => t('data.skills.gold.desc', { v, token: TOKEN }, '+{v}% {token} from every kill this mercenary lands.') },
};

const RETIRED_SKILLS = ['dragonbane', 'undeadbane', 'cleave', 'blast', 'savage', 'first', 'secondwind', 'swift', 'ironhide'];

export const SKILL_SLOTS = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
export const SKILL_SCALE = { common: 1, uncommon: 1.1, rare: 1.25, epic: 1.5, legendary: 1.75, mythic: 2 };

const SKILL_SALT = 5;
const _skillCache = new Map();

export function heroSkills(key) {
  if (_skillCache.has(key)) return _skillCache.get(key);
  const rarity = HEROES[key].rarity;
  let seed = (2166136261 ^ SKILL_SALT) >>> 0;
  for (const ch of key) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pool = Object.keys(SKILLS);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const list = pool.slice(0, SKILL_SLOTS[rarity]).map((k) => {
    const s = SKILLS[k];
    const value = +(Math.round((s.base * SKILL_SCALE[rarity]) / s.step) * s.step).toFixed(2);
    return { key: k, name: s.name, value, text: s.desc(value) };
  });
  _skillCache.set(key, list);
  return list;
}

const _modCache = new Map();

export function skillMods(key) {
  let m = _modCache.get(key);
  if (m) return m;
  m = Object.fromEntries([...Object.keys(SKILLS), ...RETIRED_SKILLS].map((k) => [k, 0]));
  for (const s of heroSkills(key)) m[s.key] = s.value;
  _modCache.set(key, m);
  return m;
}

export const BLOCKS = {
  crate:  { hp: 1, reward: [0.5, 1.5] },
  barrel: { hp: 1, reward: [0.8, 2.0] },
  rock:   { hp: 3, reward: [2, 4] },
  ice:    { hp: 2, reward: [1.5, 3] },
  chest:  { hp: 5, reward: [8, 20] },
  gold:   { hp: 8, reward: [25, 60] },
};

export const ENEMIES = {
  wight:      { name: 'Frost Thrall',    hp: 8,   spd: 0.9 },
  spider:     { name: 'Rime Spider',     hp: 12,  spd: 1.6 },
  shadowwolf: { name: 'Hollow Wolf',     hp: 10,  spd: 2.0 },
  wraith:     { name: 'Sleet Wraith',    hp: 7,   spd: 2.3 },
  raider:     { name: 'Hill Raider',     hp: 10,  spd: 1.2 },
  walker:     { name: 'Hoarfrost Knight', hp: 40,  spd: 0.8, elite: true },
  bear:       { name: 'Rimehide Bear',   hp: 60,  spd: 0.7, elite: true },
  giant:     { name: 'Frost Giant',     hp: 90,  spd: 0.5, elite: true, big: true },
  wyrm:       { name: 'Ice Wyrm',        hp: 400, spd: 0.45, boss: true, big: true },
  harpy:      { name: 'Glacier Harpy',   hp: 6,   spd: 2.6, role: 'fly' },
  ghoul:      { name: 'Rime Ghoul',      hp: 11,  spd: 2.2, role: 'climb' },
  burrower:   { name: 'Grave Burrower',  hp: 14,  spd: 1.1, role: 'burrow' },
  archer:     { name: 'Bone Archer',     hp: 8,   spd: 1.0, role: 'ranged', range: 4.5, rate: 2.2, bolt: 'bonearrow' },
  seer:       { name: 'Hoarfrost Seer',  hp: 14,  spd: 0.8, role: 'caster', range: 5, rate: 2.8, bolt: 'runebolt' },
  blight:     { name: 'Blight Thrall',   hp: 24,  spd: 0.55, role: 'infect' },
  warlord:    { name: 'Rimebound Warlord', hp: 130, spd: 0.9, elite: true, role: 'warlord' },
  colossus:   { name: 'Glacier Colossus', hp: 260, spd: 0.4, elite: true, big: true, role: 'colossus' },
  briar_outlaw:   { name: 'Briar Outlaw',       hp: 10,  spd: 1.2, like: 'raider' },
  thornback:      { name: 'Thornback Wolf',     hp: 10,  spd: 2.0, like: 'shadowwolf' },
  rootling:       { name: 'Rootling',           hp: 8,   spd: 0.9, like: 'wight' },
  bramble_spider: { name: 'Bramble Spider',     hp: 7,   spd: 2.3, like: 'wraith' },
  mossback:       { name: 'Mossback Treant',    hp: 40,  spd: 0.8, elite: true, like: 'walker' },
  bristleboar:    { name: 'Bristleboar',        hp: 60,  spd: 0.7, elite: true, like: 'bear' },
  stagskull:      { name: 'Stagskull Behemoth', hp: 90,  spd: 0.5, elite: true, big: true, like: 'giant' },
  kobold:         { name: 'Lantern Kobold',     hp: 10,  spd: 1.2, like: 'raider' },
  rock_crawler:   { name: 'Rock Crawler',       hp: 12,  spd: 1.6, like: 'spider' },
  crystal_mite:   { name: 'Crystal Mite',       hp: 8,   spd: 0.9, like: 'wight' },
  cave_bat:       { name: 'Cave Bat',           hp: 7,   spd: 2.3, like: 'wraith' },
  crystal_golem:  { name: 'Crystal Golem',      hp: 90,  spd: 0.5, elite: true, big: true, like: 'giant' },
  delver_mole:    { name: 'Delver Mole',        hp: 60,  spd: 0.7, elite: true, like: 'bear' },
  drill_worm:     { name: 'Deepdrill Worm',     hp: 400, spd: 0.45, boss: true, big: true, like: 'wyrm' },
  ash_ghoul:      { name: 'Ash Ghoul',          hp: 8,   spd: 0.9, like: 'wight' },
  ash_votary:     { name: 'Ash Votary',         hp: 10,  spd: 1.2, like: 'raider' },
  cinder_hound:   { name: 'Cinder Hound',       hp: 10,  spd: 2.0, like: 'shadowwolf' },
  ember_imp:      { name: 'Ember Imp',          hp: 12,  spd: 1.6, like: 'spider' },
  smoulder:       { name: 'Smoulder Shade',     hp: 7,   spd: 2.3, like: 'wraith' },
  molten_knight:  { name: 'Molten Knight',      hp: 40,  spd: 0.8, elite: true, like: 'walker' },
  basalt_ram:     { name: 'Basalt Ram',         hp: 60,  spd: 0.7, elite: true, like: 'bear' },
  ash_colossus:   { name: 'Ash Colossus',       hp: 90,  spd: 0.5, elite: true, big: true, like: 'giant' },
  rime_sentinel:  { name: 'Rimeglass Sentinel', hp: 60,  spd: 0.9, vigil: true },
  hoarwisp:       { name: 'Hoarwisp',           hp: 30,  spd: 1.3, vigil: true, role: 'ranged', range: 4, rate: 2.6, bolt: 'runebolt' },
  rime_thrall:    { name: 'Rimebound Thrall',   hp: 20,  spd: 1.8, vigil: true, sheet: 'wight' },
  hoarfang:       { name: 'Hoarfang Spider',    hp: 35,  spd: 2.0, vigil: true, sheet: 'spider' },
  sleet_banshee:  { name: 'Sleet Banshee',      hp: 30,  spd: 2.2, vigil: true, sheet: 'wraith' },
  rime_acolyte:   { name: 'Rime Acolyte',       hp: 40,  spd: 0.8, vigil: true, sheet: 'seer', role: 'caster', range: 5, rate: 2.8, bolt: 'runebolt' },
  glacier_warden: { name: 'Glacier Warden',     hp: 160, spd: 0.8, vigil: true, elite: true, sheet: 'walker' },
  furnace_stoker: { name: 'Furnace Stoker',     hp: 120, spd: 0.7, vigil: true },
  slag_boar:      { name: 'Slag Boar',          hp: 50,  spd: 2.2, vigil: true },
  forge_hound:    { name: 'Forge Hound',        hp: 22,  spd: 2.2, vigil: true, sheet: 'cinder_hound' },
  spark_imp:      { name: 'Spark Imp',          hp: 28,  spd: 1.9, vigil: true, sheet: 'ember_imp' },
  cinder_priest:  { name: 'Cinder Priest',      hp: 45,  spd: 0.8, vigil: true, sheet: 'ash_votary', role: 'caster', range: 5, rate: 2.8, bolt: 'runebolt' },
  smoke_shade:    { name: 'Smoke Shade',        hp: 32,  spd: 1.4, vigil: true, sheet: 'smoulder', role: 'ranged', range: 4, rate: 2.6, bolt: 'runebolt' },
  molten_bulwark: { name: 'Molten Bulwark',     hp: 200, spd: 0.7, vigil: true, elite: true, sheet: 'molten_knight' },
  gale_rider:     { name: 'Gale Rider',         hp: 45,  spd: 2.6, vigil: true, role: 'fly' },
  squall_jelly:   { name: 'Squall Jelly',       hp: 70,  spd: 0.8, vigil: true },
  storm_harpy:    { name: 'Storm Harpy',        hp: 20,  spd: 2.6, vigil: true, sheet: 'harpy', tint: 4 },
  squall_wraith:  { name: 'Squall Wraith',      hp: 30,  spd: 2.2, vigil: true, sheet: 'wraith', tint: 4 },
  tide_caller:    { name: 'Tide Caller',        hp: 40,  spd: 0.8, vigil: true, sheet: 'seer', tint: 4, role: 'caster', range: 5, rate: 2.8, bolt: 'runebolt' },
  reef_crawler:   { name: 'Reef Crawler',       hp: 50,  spd: 1.2, vigil: true, sheet: 'rock_crawler', tint: 4, role: 'ranged', range: 4, rate: 2.6, bolt: 'runebolt' },
  tide_warlord:   { name: 'Tidebound Warlord',  hp: 220, spd: 0.8, vigil: true, elite: true, sheet: 'warlord', tint: 7 },
  hollow_gleaner: { name: 'Hollow Gleaner',     hp: 110, spd: 1.0, vigil: true },
  penumbra_asp:   { name: 'Penumbra Asp',       hp: 65,  spd: 1.0, vigil: true, role: 'ranged', range: 4, rate: 2.6, bolt: 'runebolt' },
  eclipse_hound:  { name: 'Eclipse Hound',      hp: 24,  spd: 2.2, vigil: true, sheet: 'shadowwolf', tint: 6 },
  umbral_shade:   { name: 'Umbral Shade',       hp: 32,  spd: 2.2, vigil: true, sheet: 'wraith', tint: 6 },
  eclipse_oracle: { name: 'Eclipse Oracle',     hp: 45,  spd: 0.8, vigil: true, sheet: 'seer', tint: 6, role: 'caster', range: 5, rate: 2.8, bolt: 'runebolt' },
  void_ghoul:     { name: 'Void Ghoul',         hp: 45,  spd: 1.6, vigil: true, sheet: 'ghoul', tint: 6 },
  umbral_knight:  { name: 'Umbral Knight',      hp: 240, spd: 0.8, vigil: true, elite: true, sheet: 'walker', tint: 6 },
};

export const HUNT_POWER_REF = 12;
export const HUNT_TIER_WAVE = 0.08;
export const NIGHT_FOES = ['ghoul', 'wraith', 'shadowwolf', 'thornback', 'bramble_spider', 'cave_bat', 'cinder_hound', 'smoulder'];
export const DAY_FOES = ['harpy', 'raider', 'briar_outlaw', 'kobold', 'ash_votary'];
export const HUNT_POOL_WEIGHT = 2;
export const HUNT_CAP_TIERS = 3;
export const HUNT_TROOPS = [
  { kind: 'harpy',    from: 0.8, weight: 2,    grow: 0.5,  pack: 3 },
  { kind: 'ghoul',    from: 1,   weight: 2,    grow: 0.5,  pack: 2 },
  { kind: 'archer',   from: 1.2, weight: 2,    grow: 0.4,  pack: 2 },
  { kind: 'burrower', from: 1.5, weight: 1.5,  grow: 0.4,  pack: 2 },
  { kind: 'blight',   from: 1.8, weight: 1.5,  grow: 0.4,  pack: 2 },
  { kind: 'seer',     from: 2.2, weight: 1.2,  grow: 0.4,  pack: 1 },
  { kind: 'walker',   from: 2.5, weight: 0.3,  grow: 0.15, pack: 1, cap: 2 },
  { kind: 'bear',     from: 3,   weight: 0.3,  grow: 0.15, pack: 1, cap: 2 },
  { kind: 'warlord',  from: 3.2, weight: 0.12, grow: 0.06, pack: 1, cap: 1 },
  { kind: 'giant',    from: 3.5, weight: 0.2,  grow: 0.1,  pack: 1, cap: 1 },
  { kind: 'colossus', from: 3.8, weight: 0.15, grow: 0.08, pack: 1, cap: 1 },
];

export const DRAGONS = {
  fire:   { name: 'Emberwing the Red',    hue: 6,   sat: 1.25, light: 1.0,  hp: 9000 },
  gold:   { name: 'Aurelith the Gilded',  hue: 44,  sat: 1.15, light: 1.05, hp: 11000 },
  shadow: { name: 'Gloomscale the Black', hue: 272, sat: 0.75, light: 0.55, hp: 13000 },
  ice:    { name: 'Rimefang the Pale',    hue: null, sat: 1, light: 1,      hp: 10000 },
};

export function foeName(kind, fallback) {
  if (Object.hasOwn(ENEMIES, kind)) return t(`data.enemy.${kind}`, null, ENEMIES[kind].name);
  if (Object.hasOwn(DRAGONS, kind)) return t(`data.dragon.${kind}`, null, DRAGONS[kind].name);
  return fallback ?? String(kind);
}

export const DRAGON_DRAW = 'dragonKind';
export const dragonDrawId = (realm, seq) => `dragon:${realm}:${seq}`;
export const dragonKindAt = (u) => { const k = Object.keys(DRAGONS); return k[Math.min(k.length - 1, Math.floor(u * k.length))]; };

export const BOX_COINS_BASE = { lastblow: [700, 1400], top: [350, 825], champion: [175, 410], ember: [35, 110] };
export const BOXES = {
  lastblow: { name: 'Last Blow Hoard', rarity: 'mythic',    coins: BOX_COINS_BASE.lastblow.map(rewardBase), hero: 0.5, heroFloor: 'epic' },
  top:      { name: "Slayer's Hoard",  rarity: 'legendary', coins: BOX_COINS_BASE.top.map(rewardBase),      hero: 0.3, heroFloor: 'rare' },
  champion: { name: 'Champion Chest',  rarity: 'epic',      coins: BOX_COINS_BASE.champion.map(rewardBase), hero: 0.1, heroFloor: 'rare' },
  ember:    { name: 'Ember Box',       rarity: 'rare',      coins: BOX_COINS_BASE.ember.map(rewardBase),    hero: 0,   heroFloor: 'common' },
};

export const CASTLES = [
  { tier: 1, numeral: 'I',   name: 'Thornpost Watch',   slots: 4,  rest: 2,  bonus: 0,   price: 1050000, supply: 50, flavor: t('data.castles.t1.flavor', null, 'A timber palisade with a lookout and a cookfire. Smoky, cramped and warm enough.') },
  { tier: 2, numeral: 'II',  name: 'Greystone Keep',    slots: 6,  rest: 5,  bonus: 25,  price: 2050000, supply: 30, flavor: t('data.castles.t2.flavor', null, 'A square stone keep on a low hill. Thick walls, straw beds and a hot hearth.') },
  { tier: 3, numeral: 'III', name: 'Hollowbrook Manor', slots: 8,  rest: 8,  bonus: 50,  price: 2800000, supply: 20, flavor: t('data.castles.t3.flavor', null, 'A walled manor by a mill stream, with a bathhouse and a kitchen that never sleeps.') },
  { tier: 4, numeral: 'IV',  name: 'Cragspire Hold',    slots: 10, rest: 11, bonus: 80,  price: 3550000, supply: 15, flavor: t('data.castles.t4.flavor', null, 'A fortress carved into the mountainside, where thermal springs ease every wound.') },
  { tier: 5, numeral: 'V',   name: 'Rimeveil Citadel',  slots: 12, rest: 14, bonus: 115, price: 4350000, supply: 10, flavor: t('data.castles.t5.flavor', null, 'Towers of blue ice and starstone. Its frost-wardens mend tired bodies with cold light.') },
  { tier: 6, numeral: 'VI',  name: 'Crownhaven',        slots: 14, rest: 17, bonus: 150, price: 4950000, supply: 5, flavor: t('data.castles.t6.flavor', null, 'The royal citadel of the realm. Mercenaries who sleep under its golden spires wake renewed.') },
];
export const OUTSIDE_REST = 0.5;
export const castleFarmMult = (c) => 1 + (c ? c.bonus : 0) / 100;

export const SHIELD_BASE = { common: 300, uncommon: 400, rare: 500, epic: 600, legendary: 750, mythic: 900 };
export const SHIELD_PER_LEVEL = 0.05;
export const SHIELD_HIT = { awayPerMin: 1.3 };
export const SHIELD_LIFE_MIN = 3 * 24 * 60;

export function maxShieldOf(h) {
  return Math.round(SHIELD_BASE[HEROES[h.key].rarity] * (1 + SHIELD_PER_LEVEL * (h.level - 1)));
}

export function shieldWear(h, units) {
  return (units * maxShieldOf(h)) / (SHIELD_HIT.awayPerMin * SHIELD_LIFE_MIN);
}

export const POTIONS = {
  repair: { common: 1, uncommon: 3, rare: 6, epic: 8, legendary: 11, mythic: 15 },
  firstOffPct: 50,
  healKit: 40,
  packs: [
    { n: 50, price: 6000 },
    { n: 125, price: 15000 },
    { n: 250, price: 30000 },
    { n: 500, price: 60000 },
    { n: 1000, price: 120000 },
    { n: 2500, price: 300000 },
  ],
};
export const REPAIR_RANGE = { min: Math.min(...Object.values(POTIONS.repair)), max: Math.max(...Object.values(POTIONS.repair)) };

export const WHEEL_PACKS = [
  { n: 1, price: 7000 },
  { n: 5, price: 31500 },
  { n: 15, price: 87000 },
];

export const FIELD_CAP = 15;

export const ACTIVE_CAP = 15;

export const SQUIRE = {
  usd: 150,
  base: 400000,
  step: 0,
  supply: 1000,
  mockSold: SERVER_MODE ? 0 : 30,
  tick: 3,
  ready: 0.8,
};
export const SQUIRE_LIST_BASE = SQUIRE.base;

export const FUSION = { size: 4, cost: { common: 2500, uncommon: 5000, rare: 10000, epic: 25000 }, crit: 0.001, from: ['common', 'uncommon', 'rare', 'epic'] };

export const PVP_COUNTED_FLAT_BASE = 1000;
export const PVP = {
  mockOpen: !MAINNET && !SERVER_MODE,
  band: BALANCE.pvp.band,
  share: BALANCE.pvp.share,
  protect: 4,
  vulnerable: 6,
  newbie: 24,
  openAt: Date.UTC(2026, 10, 25),
  protectLock: 6,
  list: 5,
  listEvery: 10,
  rerolls: 15,
  rerollCost: [500, 1000, 2000],
  take: BALANCE.pvp.take,
  toRaider: BALANCE.pvp.toRaider,
  attacks: 20,
  attacksFree: 5,
  perRaid: 10,
  burst: 5,
  burstWait: 10,
  listMin: 300,
  counted: 0.1,
  countedFlat: PVP_COUNTED_FLAT_BASE,
  again: 6,
  relist: 24,
  revenge: 7,
  raidChance: 0.3,
  rivalDays: 14,
  defenseReturnPct: 0.1,
  defenseReturnStep: 0.01,
  defenseBand: 0.8,
  defHist: 20,
  rivalFarm: 10000,
  rivalFarmPerRealm: 0.25,
};

export const JOUST = {
  entry: 50,
  win: 40,
  pool: 10,
  perDay: 10,
  winRating: 18,
  lossRating: 14,
  floor: 900,
  band: 60,
  seasonDays: 14,
  hpPerDur: 4,
  rounds: 30,
};
export const JOUST_BASE = Object.freeze({ entry: JOUST.entry, win: JOUST.win, pool: JOUST.pool, winBefore: 80 });

export const DUEL = {
  entry: 100,
  win: 160,
  pool: 40,
  split: [0.5, 0.3, 0.2],
  open: !MAINNET,
};
export const DUEL_BASE = Object.freeze({ entry: DUEL.entry, win: DUEL.win, pool: DUEL.pool });

export const BATTLE = { power: 1, armor: 100, rounds: 50 };

export const FIELD_LUCK = {
  normal: { base: 0.01, floor: 0.01 },
  revenge: { base: 0.01, floor: 0.01 },
};

export const HERO_BOX = {
  price: BALANCE.heroBox.price,
  refund: 0.5,
  batch: [1, 5, 10],
  ranks: {
    free:      { name: 'Militia Recruit',    power: 100,  weight: 0,    pity: 1,    atk: [5, 8],   def: [6, 14],  hp: 54 },
    common:    { name: 'Watchman',          power: 200,  weight: 9300, pity: 15,   atk: [10, 17], def: [12, 28],  hp: 108 },
    uncommon:  { name: 'Sentinel',           power: 300,  weight: 500,  pity: 30,   atk: [12, 21], def: [16, 36],  hp: 118 },
    rare:      { name: 'Shieldbearer',       power: 450,  weight: 160,  pity: 60,   atk: [15, 26], def: [22, 46],  hp: 130 },
    epic:      { name: 'Warden',             power: 700,  weight: 30,   pity: 120,  atk: [20, 34], def: [30, 60],  hp: 145 },
    legendary: { name: 'Lord Protector',     power: 1100, weight: 8,    pity: 240,  atk: [26, 44], def: [40, 78],  hp: 165 },
    mythic:    { name: 'Aegis of the Realm', power: 1800, weight: 2,    pity: null, atk: [34, 58], def: [52, 100], hp: 190 },
  },
};

export const HERO_RARITIES = {
  free: { label: t('data.rarity.free', null, 'Free'), color: '#8c8c8c', glow: '#c8c8c8', mult: 1.0 },
  ...RARITIES,
};

export const TRAINING = { cost: { atk: 25000, def: 25000, hp: 25000 }, chance: { start: 100, step: 5, floor: 50 } };

export const BATTERY = { chance: 0.1, bonus: 0.5 };

export const GEAR_SLOTS = {
  helm:   { label: t('data.gearSlots.helm.label', null, 'Helm'),     place: t('data.gearSlots.helm.place', null, 'Head'),    icon: 'shield' },
  armour: { label: t('data.gearSlots.armour.label', null, 'Armour'), place: t('data.gearSlots.armour.place', null, 'Chest'), icon: 'shield' },
  boots:  { label: t('data.gearSlots.boots.label', null, 'Boots'),   place: t('data.gearSlots.boots.place', null, 'Feet'),   icon: 'shield' },
  weapon: { label: t('data.gearSlots.weapon.label', null, 'Weapon'), place: t('data.gearSlots.weapon.place', null, 'Hand'),  icon: 'sword' },
};
export const GEAR_POWER = { atk: 3, def: 2, hp: 2 };
export const GEAR = {
  helm: {
    common:    { name: 'Iron Cap',           atk: 0, def: 0,  hp: 1 },
    uncommon:  { name: 'Steel Sallet',       atk: 0, def: 2,  hp: 2 },
    rare:      { name: 'Bluesteel Helm',     atk: 0, def: 3,  hp: 3 },
    epic:      { name: 'Runebound Helm',     atk: 0, def: 4,  hp: 4 },
    legendary: { name: 'Sunforged Helm',     atk: 0, def: 5,  hp: 5 },
    mythic:    { name: 'Dragonbone Helm',    atk: 0, def: 6, hp: 6 },
  },
  armour: {
    common:    { name: 'Padded Gambeson',    atk: 0, def: 1,  hp: 1 },
    uncommon:  { name: 'Steel Hauberk',      atk: 0, def: 2,  hp: 2 },
    rare:      { name: 'Bluesteel Cuirass',  atk: 0, def: 3,  hp: 3 },
    epic:      { name: 'Runebound Plate',    atk: 0, def: 4, hp: 4 },
    legendary: { name: 'Sunforged Plate',    atk: 0, def: 5, hp: 5 },
    mythic:    { name: 'Dragonbone Carapace', atk: 0, def: 6, hp: 6 },
  },
  boots: {
    common:    { name: 'Leather Boots',      atk: 0, def: 1,  hp: 0 },
    uncommon:  { name: 'Steel Greaves',      atk: 2, def: 2,  hp: 0 },
    rare:      { name: 'Bluesteel Sabatons', atk: 3, def: 3,  hp: 0 },
    epic:      { name: 'Runebound Striders', atk: 4, def: 4,  hp: 0 },
    legendary: { name: 'Sunforged Treads',   atk: 5, def: 5, hp: 0 },
    mythic:    { name: 'Dragonbone Stompers', atk: 6, def: 6, hp: 0 },
  },
  weapon: {
    common:    { name: 'Iron Shortsword',    atk: 1,  def: 0, hp: 0 },
    uncommon:  { name: 'Steel Longsword',    atk: 2,  def: 0, hp: 0 },
    rare:      { name: 'Bluesteel Blade',    atk: 3,  def: 0, hp: 0 },
    epic:      { name: 'Runebound Sword',    atk: 4, def: 0, hp: 0 },
    legendary: { name: 'Sunforged Greatblade', atk: 5, def: 0, hp: 0 },
    mythic:    { name: 'Dragonbone Reaver',  atk: 6, def: 0, hp: 0 },
  },
};

export const HORSES = {
  common:    { name: t('data.horses.common', null, 'Mudlark Cob'),          atk: 1, def: 1, spd: 2, price: 5000 },
  uncommon:  { name: t('data.horses.uncommon', null, 'Greymist Palfrey'),   atk: 2, def: 2, spd: 3, price: 12000 },
  rare:      { name: t('data.horses.rare', null, 'Nightsteel Destrier'),    atk: 3, def: 3, spd: 4, price: 30000 },
  epic:      { name: t('data.horses.epic', null, 'Silvermane Charger'),     atk: 4, def: 4, spd: 6, price: 80000 },
  legendary: { name: t('data.horses.legendary', null, 'Sunfire Warhorse'),  atk: 5, def: 5, spd: 8, price: 220000 },
};
export const HORSE_POWER = { atk: GEAR_POWER.atk, def: GEAR_POWER.def, spd: 1 };

export const HORSE_BREED = { gen0Breeds: 5, hours: 24, feePct: 10, growHours: 24 };

export const HOMESTEAD = {
  summon: { cost: 2500, batches: [1, 5, 10], start: 0, cap: 100 },
  crew: { cap: 100 },
  workers: {
    common:    { name: t('data.homestead.worker.common', null, 'Serf'),             speed: 1.0,  yield: 1.0 },
    uncommon:  { name: t('data.homestead.worker.uncommon', null, 'Cottager'),       speed: 1.1,  yield: 1.1 },
    rare:      { name: t('data.homestead.worker.rare', null, 'Yeoman'),             speed: 1.25, yield: 1.2 },
    epic:      { name: t('data.homestead.worker.epic', null, 'Reeve'),              speed: 1.45, yield: 1.35 },
    legendary: { name: t('data.homestead.worker.legendary', null, 'Steward'),       speed: 1.7,  yield: 1.55 },
    mythic:    { name: t('data.homestead.worker.mythic', null, 'Harvest Sage'),     speed: 2.0,  yield: 1.8 },
  },
  fields: 4,
  slots: 20,
  passFields: [2, 3],
  forest: 5,
  lake: 5,
  crops: {
    barley:  { name: t('data.homestead.crop.barley', null, 'Barley'),   minutes: 20,  yield: 6, value: 1, color: '#d9b45a' },
    rye:     { name: t('data.homestead.crop.rye', null, 'Rye'),         minutes: 40,  yield: 6, value: 2, color: '#b8925a' },
    oats:    { name: t('data.homestead.crop.oats', null, 'Oats'),       minutes: 60,  yield: 8, value: 2, color: '#e6d39a' },
    turnip:  { name: t('data.homestead.crop.turnip', null, 'Turnip'),   minutes: 90,  yield: 5, value: 4, color: '#c98ab8' },
    cabbage: { name: t('data.homestead.crop.cabbage', null, 'Cabbage'), minutes: 120, yield: 4, value: 6, color: '#7fb97a' },
    onion:   { name: t('data.homestead.crop.onion', null, 'Onion'),     minutes: 180, yield: 6, value: 5, color: '#e0a35a' },
    flax:    { name: t('data.homestead.crop.flax', null, 'Flax'),       minutes: 240, yield: 3, value: 12, color: '#7fa7e0' },
    hops:    { name: t('data.homestead.crop.hops', null, 'Hops'),       minutes: 480, yield: 3, value: 20, color: '#9fd35f' },
  },
  wood: 2,
  trees: {
    birch: { name: t('data.homestead.tree.birch', null, 'Birch'), minutes: 30,  wood: 3 },
    pine:  { name: t('data.homestead.tree.pine', null, 'Pine'),   minutes: 60,  wood: 5 },
    oak:   { name: t('data.homestead.tree.oak', null, 'Oak'),     minutes: 180, wood: 12 },
  },
  fishing: { minutes: 45, catch: 3 },
  fish: {
    roach:    { name: t('data.homestead.fish.roach', null, 'Roach'),             rarity: 'common',    weight: 2200, cm: [12, 30],   kg: [0.05, 0.6], value: 1 },
    perch:    { name: t('data.homestead.fish.perch', null, 'Perch'),             rarity: 'common',    weight: 2400, cm: [15, 35],   kg: [0.1, 0.9],  value: 2 },
    bream:    { name: t('data.homestead.fish.bream', null, 'Bream'),             rarity: 'common',    weight: 1400, cm: [25, 55],   kg: [0.4, 3],    value: 3 },
    tench:    { name: t('data.homestead.fish.tench', null, 'Tench'),             rarity: 'uncommon',  weight: 1300, cm: [25, 50],   kg: [0.5, 2.5],  value: 5 },
    carp:     { name: t('data.homestead.fish.carp', null, 'Carp'),               rarity: 'uncommon',  weight: 1200, cm: [30, 70],   kg: [1, 8],      value: 6 },
    grayling: { name: t('data.homestead.fish.grayling', null, 'Grayling'),       rarity: 'rare',      weight: 450,  cm: [30, 50],   kg: [0.4, 1.6],  value: 10 },
    zander:   { name: t('data.homestead.fish.zander', null, 'Zander'),           rarity: 'rare',      weight: 550,  cm: [40, 80],   kg: [1, 8],      value: 12 },
    trout:    { name: t('data.homestead.fish.trout', null, 'Brown Trout'),       rarity: 'epic',      weight: 180,  cm: [30, 80],   kg: [0.5, 8],    value: 22 },
    pike:     { name: t('data.homestead.fish.pike', null, 'Pike'),               rarity: 'epic',      weight: 200,  cm: [50, 120],  kg: [2, 15],     value: 25 },
    catfish:  { name: t('data.homestead.fish.catfish', null, 'Wels Catfish'),    rarity: 'legendary', weight: 100,  cm: [100, 250], kg: [10, 120],   value: 80 },
    sturgeon: { name: t('data.homestead.fish.sturgeon', null, 'Sturgeon'),       rarity: 'mythic',    weight: 20,   cm: [120, 300], kg: [20, 200],   value: 200 },
  },
  buildings: {
    mill:    { name: t('data.homestead.bld.mill', null, 'Mill'),       wood: 600,  minutes: 720 },
    bakery:  { name: t('data.homestead.bld.bakery', null, 'Bakery'),   wood: 900,  minutes: 1080, needs: 'mill' },
    kitchen: { name: t('data.homestead.bld.kitchen', null, 'Kitchen'), wood: 1200, minutes: 1440 },
  },
  grain: ['barley', 'rye', 'oats'],
  recipes: {
    flour:   { name: t('data.homestead.good.flour', null, 'Flour'),            at: 'mill',    minutes: 10, in: { grain: 3 }, out: 1 },
    bread:   { name: t('data.homestead.good.bread', null, 'Bread'),            at: 'bakery',  minutes: 20, in: { flour: 2 }, out: 1, energy: 10 },
    grilled: { name: t('data.homestead.good.grilled', null, 'Grilled Fish'),   at: 'kitchen', minutes: 15, in: { fish: 1, wood: 1 }, out: 1, energy: 12 },
    pottage: { name: t('data.homestead.good.pottage', null, 'Vegetable Pottage'), at: 'kitchen', minutes: 30, in: { turnip: 1, cabbage: 1, onion: 1 }, out: 2, energy: 16 },
    stew:    { name: t('data.homestead.good.stew', null, 'Fish Stew'),         at: 'kitchen', minutes: 40, in: { fish: 2, onion: 1, bread: 1 }, out: 2, energy: 24 },
  },
  batches: [1, 5, 10],
  batchesFree: 1,
  queue: { free: 1, pass: 5 },
  food: { required: false, dayCap: 7, barHours: 24, graceUntil: 0 },
};

export const DUNGEON = {
  minParty: 3,
  party: 5,
  runs: 3,
  freeRuns: 1,
  paths: [
    { key: 'p1', numeral: 'I',   name: 'Shallow Crypt',  difficulty: t('data.dungeon.p1.difficulty', null, 'Easy'), color: '#7bd389', hours: 1, fee: 0, power: 0,   luck: 0 },
    { key: 'p2', numeral: 'II',  name: 'Sunken Vaults',  difficulty: t('data.dungeon.p2.difficulty', null, 'Fair'), color: '#ffd166', hours: 2, fee: 0, power: 100, luck: 0.5 },
    { key: 'p3', numeral: 'III', name: 'Bone Gallery',   difficulty: t('data.dungeon.p3.difficulty', null, 'Hard'), color: '#ff9f4a', hours: 4, fee: 0, power: 300, luck: 1 },
    { key: 'p4', numeral: 'IV',  name: 'Cinder Deep',    difficulty: t('data.dungeon.p4.difficulty', null, 'Brutal'), color: '#ff6b5e', hours: 6, fee: 0, power: 700, luck: 2 },
    { key: 'p5', numeral: 'V',   name: 'Dragon Barrows', difficulty: t('data.dungeon.p5.difficulty', null, 'Deadly'), color: '#c07bff', hours: 8, fee: 0, power: 1400,luck: 3 },
  ],
  memberLuck: { common: 0, uncommon: 0.01, rare: 0.02, epic: 0.03, legendary: 0.04, mythic: 0.05 },
  maxLuck: 3.25,
};

export const EXPEDITION = {
  tiers: ['common', 'rare', 'epic', 'legendary', 'mythic'],
  freeVoyages: 1,
  boats: {
    common:    { ship: 1, name: 'Rowboat',       crew: 1, speed: 1.00, price: 5000 },
    rare:      { ship: 2, name: 'Fishing Sloop', crew: 2, speed: 0.85, price: 25000 },
    epic:      { ship: 3, name: 'Cog',           crew: 3, speed: 0.70, price: 60000 },
    legendary: { ship: 5, name: 'Carrack',       crew: 4, speed: 0.55, price: 240000 },
    mythic:    { ship: 6, name: 'War Galleon',   crew: 7, speed: 0.30, price: 900000 },
  },
  routes: [
    { key: 'r1', numeral: 'I',   name: 'Gullrock Shoals', sea: t('data.expedition.r1.sea', null, 'Calm'), color: '#7bd389', hours: 2,  power: 0,    risk: 5,  haul: 3, odds: [70, 25, 5, 0, 0] },
    { key: 'r2', numeral: 'II',  name: 'Mistveil Atoll',  sea: t('data.expedition.r2.sea', null, 'Fair'), color: '#8fe3ff', hours: 4,  power: 100,  risk: 10, haul: 4, odds: [45, 35, 17, 3, 0] },
    { key: 'r3', numeral: 'III', name: 'Stormcrown Reef', sea: t('data.expedition.r3.sea', null, 'Rough'), color: '#ffd166', hours: 8,  power: 300,  risk: 18, haul: 5, odds: [25, 35, 28, 11, 1] },
    { key: 'r4', numeral: 'IV',  name: 'Emberfang Isles', sea: t('data.expedition.r4.sea', null, 'Wild'), color: '#ff8a4a', hours: 12, power: 700,  risk: 25, haul: 6, odds: [15, 30, 33, 20, 2] },
    { key: 'r5', numeral: 'V',   name: 'Krakenmaw Deep',  sea: t('data.expedition.r5.sea', null, 'Deadly'), color: '#c07bff', hours: 24, power: 1400, risk: 35, haul: 8, odds: [10, 25, 35, 25, 5] },
  ],
  bonusStep: 200,
  speedup: { premium: 1.5, minShare: 0.1, step: 0.05, perHour: { voyage: 10000, dungeon: 10000 } },
};

export const GEMS = {
  brinestone: { name: 'Brinestone', tier: 'common',    color: '#8fd1bf' },
  tidepearl:  { name: 'Tidepearl',  tier: 'rare',      color: '#bfe3ff' },
  stormglass: { name: 'Stormglass', tier: 'epic',      color: '#b98bff' },
  emberheart: { name: 'Emberheart', tier: 'legendary', color: '#ffa53d' },
  krakeneye:  { name: 'Krakeneye',  tier: 'mythic',    color: '#ff4d6d' },
};

export const JEWEL_SLOTS = {
  amulet:   { label: t('data.jewelSlots.amulet.label', null, 'Amulet'),     place: t('data.jewelSlots.amulet.place', null, 'Amulet'),     icon: 'heart' },
  earring:  { label: t('data.jewelSlots.earring.label', null, 'Earring'),   place: t('data.jewelSlots.earring.place', null, 'Earring'),   icon: 'star' },
  ring:     { label: t('data.jewelSlots.ring.label', null, 'Ring'),         place: t('data.jewelSlots.ring.place', null, 'Ring'),         icon: 'sword' },
  necklace: { label: t('data.jewelSlots.necklace.label', null, 'Necklace'), place: t('data.jewelSlots.necklace.place', null, 'Necklace'), icon: 'shield' },
};
export const JEWELRY = {
  amulet: {
    common:    { name: 'Brine Charm',         atk: 0, def: 0, hp: 1 },
    rare:      { name: 'Tidepearl Amulet',    atk: 0, def: 0, hp: 3 },
    epic:      { name: 'Stormglass Talisman', atk: 0, def: 0, hp: 4 },
    legendary: { name: 'Emberheart Amulet',   atk: 0, def: 0, hp: 5 },
    mythic:    { name: 'Krakeneye Ward',      atk: 0, def: 0, hp: 6 },
  },
  earring: {
    common:    { name: 'Brine Drops',         atk: 0, def: 0, hp: 1 },
    rare:      { name: 'Pearl Studs',         atk: 3, def: 0, hp: 3 },
    epic:      { name: 'Storm Hoops',         atk: 4, def: 0, hp: 4 },
    legendary: { name: 'Ember Drops',         atk: 5, def: 0, hp: 5 },
    mythic:    { name: 'Krakeneye Earrings',  atk: 6, def: 0, hp: 6 },
  },
  ring: {
    common:    { name: 'Brine Band',          atk: 1,  def: 0, hp: 0 },
    rare:      { name: 'Pearl Signet',        atk: 3,  def: 0, hp: 0 },
    epic:      { name: 'Stormglass Ring',     atk: 4,  def: 0, hp: 0 },
    legendary: { name: 'Emberheart Ring',     atk: 5,  def: 0, hp: 0 },
    mythic:    { name: 'Krakeneye Seal',      atk: 6, def: 0, hp: 0 },
  },
  necklace: {
    common:    { name: 'Brine Cord',          atk: 0, def: 1,  hp: 0 },
    rare:      { name: 'Pearl Strand',        atk: 0, def: 3,  hp: 0 },
    epic:      { name: 'Stormglass Chain',    atk: 0, def: 4,  hp: 0 },
    legendary: { name: 'Emberheart Torc',     atk: 0, def: 5, hp: 0 },
    mythic:    { name: 'Krakeneye Collar',    atk: 0, def: 6, hp: 0 },
  },
};

export const FORGE = {
  slots: 2,
  upgrades: [60000, 60000, 60000],
  recipes: {
    common:    { gems: { brinestone: 4 },                 minutes: 15,   fee: 0 },
    rare:      { gems: { tidepearl: 4, brinestone: 4 },   minutes: 60,   fee: 0 },
    epic:      { gems: { stormglass: 4, tidepearl: 4 },   minutes: 240,  fee: 0 },
    legendary: { gems: { emberheart: 4, stormglass: 4 },  minutes: 720,  fee: 0 },
    mythic:    { gems: { krakeneye: 4, emberheart: 4 },   minutes: 1440, fee: 0 },
  },
};

export const FEE_SPLIT = [
  { key: 'burn',     label: 'Burned forever',      pct: BALANCE.feeSplit.burn, color: '#ff6b3d' },
  { key: 'rewards',  label: 'Reward pool (hunts)', pct: BALANCE.feeSplit.rewards, color: '#ffd166' },
  { key: 'treasury', label: 'Realm treasury',      pct: BALANCE.feeSplit.treasury, color: '#7bd389' },
  { key: 'referral', label: 'Vassals (invites)', pct: BALANCE.feeSplit.referral, color: '#6fb7ff' },
  { key: 'events',   label: 'Event prize pools',   pct: BALANCE.feeSplit.events,  color: '#c58cff' },
];

export const BURN_PCT = FEE_SPLIT.find((f) => f.key === 'burn').pct;

export const ECONOMY = {
  label: MAINNET ? '' : t('data.economy.demo', null, 'Demo only. Every number here is simulated: no {ticker}, pool or payout exists yet.'),
  mockOpen: !MAINNET && !SERVER_MODE,
  coinsPerFarm: 0.25,
  converter: { per: 100, floor: 300, step: 16, cap: 460, feePct: 5, min: 100, max: 50000 },
  pool: { revenueMin: 9000, revenueMax: 13000, prizePct: 50, reservePct: 10, accountCapPct: 5, realmKillsMin: 80000, realmKillsMax: 120000, history: 5 },
  stake: {
    days: 15,
    feeStartPct: 50,
    teamRef: 2000,
    teamMin: 0.25,
    pools: {
      farm: { curve: [[4, 474505], [7.94, 1096518], [12, 2135269], [15.92, 3758169], [20, 7117564]], ticks: [4, 8, 12, 16, 20] },
      mint: { curve: [[1, 1500000], [2.01, 3527550], [3.01, 6795075], [4.02, 12180600], [5, 22500000]], ticks: [1, 2, 3, 4, 5] },
      potion: { curve: [[5, 72000], [10.25, 173430], [20.3, 440673], [40.6, 1178050], [80, 3456000]], ticks: [5, 10, 20, 40, 80], log: true },
    },
  },
  market: { teamPct: 10, buysPerDay: 0 },
  dev: { coins: 500, kills: 500 },
};

export const MARKET = {
  rarities: ['legendary', 'mythic'],
  tax: ECONOMY.market.teamPct,
  maxListings: 20,
  rosterMax: 60,
  minPrice: 0.5,
  maxPrice: 5,
  heroFloor: { epic: 150000, legendary: 500000, mythic: 1500000 },
  horseFloor: 500,
  heroBase: { common: 6000, uncommon: 12000, rare: 25000, epic: 60000, legendary: 150000, mythic: 400000 },
  levelStep: 0.25,
  gearBase: { common: 1500, uncommon: 4000, rare: 10000, epic: 30000, legendary: 90000, mythic: 300000 },
  gemBase: { brinestone: 375, tidepearl: 2125, stormglass: 5375, emberheart: 17125, krakeneye: 57875 },
  horseBase: Object.fromEntries(Object.entries(HORSES).map(([r, x]) => [r, x.price])),
};

export const heroValue = (key, level = 1, h = null) =>
  Math.round((MARKET.heroBase[HEROES[key].rarity] * mintFarmMult(h) * (1 + MARKET.levelStep * (level - 1))) / 100) * 100;

export const heroListFloor = (rarity, h = null) => Math.round((MARKET.heroFloor[rarity] || 0) * mintFarmMult(h));

export const AUCTION = {
  mintMs: 24 * 3600e3,
  forfeitPct: 10,
  extendMs: 2 * 60e3,
  extendCapMs: 30 * 60e3,
  rivalMiss: 0.15,
  stepPct: 5,
  minStep: 1000,
  openPct: 50,
  rivals: [3, 9],
  rivalBid: [0.6, 1.6],
  rivalTries: 3,
  rivalJump: 3,
  noticeMs: 60 * 60e3,
  prizes: [
    { hero: 'brielle', level: 3 },
    { hero: 'khar', level: 2 },
    { hero: 'theo', level: 5 },
    { hero: 'melara', level: 4 },
    { hero: 'cersa', level: 1 },
    { hero: 'grom', level: 6 },
  ],
  hours: [2, 6, 12, 24],
  live: 20,
  results: 20,
};

export const AUCTIONS = [
  { id: 'auction_darker', name: 'Mercenary Auction: Vael', hero: 'frost', level: 5, minBid: 500000 },
];

export const REFERRAL = {
  link: 'https://play.cot.gg/j/',
  rewards: [
    { key: 'summons', need: 15, summons: 1, label: t('data.referral.rewards.summons', null, 'when a friend has summoned <b>15 mercenaries</b>') },
    { key: 'squire', summons: 3, label: t('data.referral.rewards.squire', null, 'when a friend buys their <b>first Squire</b>') },
  ],
  active: 2500,
  ranks: [
    { need: 0,   name: 'Landless Lord', pct: 5 },
    { need: 30,  name: 'Banneret',      pct: 5.5 },
    { need: 100, name: 'Marcher Lord',  pct: 6 },
    { need: 250, name: 'Realm Marshal', pct: 7 },
    { need: 500, name: 'High Liege',    pct: 8 },
  ],
  milestones: [
    { need: 1,   boxes: ['ember'] },
    { need: 20,  boxes: ['champion'] },
    { need: 40,  boxes: ['champion'] },
    { need: 100, boxes: ['top'] },
    { need: 250, boxes: ['top'], cards: 1 },
    { need: 500, boxes: ['lastblow', 'top'] },
  ],
};

export const REFERRAL_EVENT = {
  name: "The Host's Muster",
  potFloor: 250000,
  potShare: 2,
  top: [25, 15, 10, 7.5, 6, 5, 4, 3, 2.5, 2],
  rest: 20,
  restTo: 50,
  review: 72,
  doubleUpTo: 1000,
  vassalCap: 2000,
  rules: [
    { kind: 'summon',  icon: 'chest',  label: 'Mercenary Summon',   pts: '+25 pts',        per: SUMMON_COST, value: 25 },
    { kind: 'hero',    icon: 'shield', label: 'Hero Box',           pts: '+25 pts',        per: HERO_BOX.price, value: 25 },
    { kind: 'other',   icon: 'coin',   label: 'Other spends',       pts: '1 pt / 1,000',   per: 1000, value: 1 },
  ],
  notes: [
    'New vassals: 2x points up to 1,000 pts, then 1x',
    'Each vassal caps at 2,000 pts per event',
    `Only vassals who spent ${spendBase(25_000).toLocaleString('en-US')} ${TOKEN} score`,
  ],
};

export const FEATURES = Object.freeze({
  huntStake: false,
});

export const HUNT_STAKE = Object.freeze({
  floor: 50_000,
  top: 50,
  freeDays: 10,
  halfDays: 20,
  halfPct: 50,
  removeHoldMs: 24 * 3600e3,
});

liveIndexed(WITHDRAW, ['hold']);
for (const r of PASS.rewards) for (const it of [...(r.paid || []), ...(r.free || [])]) if (it.kind === 'chest') liveIndexed(it, ['n']);
livePrices(LEVEL_RARITY_PRICE);
for (const c of CASTLES) livePrices(c, ['price']);
for (const p of POTIONS.packs) livePrices(p, ['price']);
for (const p of WHEEL_PACKS) livePrices(p, ['price']);
livePrices(SQUIRE, ['base', 'step']);
livePrices(FUSION.cost);
livePrices(PVP, ['rerollCost']);
liveIndexed(PVP, ['listMin', 'countedFlat']);
livePayouts(PVP, ['rivalFarm']);
livePrices(JOUST, ['entry', 'pool']);
Object.defineProperty(JOUST, 'win', { enumerable: true, configurable: true, get: () => JOUST.entry - JOUST.pool });
livePrices(DUEL, ['entry', 'pool']);
Object.defineProperty(DUEL, 'win', { enumerable: true, configurable: true, get: () => 2 * DUEL.entry - DUEL.pool });
livePrices(HERO_BOX, ['price']);
livePrices(TRAINING.cost);
for (const b of Object.values(EXPEDITION.boats)) livePrices(b, ['price']);
livePrices(EXPEDITION.speedup.perHour);
livePrices(FORGE, ['upgrades']);
livePrices(MARKET.heroBase);
livePrices(MARKET.gearBase);
livePrices(MARKET.gemBase);
livePrices(MARKET.heroFloor);
for (const h of Object.values(HORSES)) livePrices(h, ['price']);
livePrices(MARKET.horseBase);
livePrices(HOMESTEAD.summon, ['cost']);
livePrices(AUCTION, ['minStep']);
for (const a of AUCTIONS) livePrices(a, ['minBid']);
for (const pool of Object.values(ECONOMY.stake.pools)) {
  const base = pool.curve;
  Object.defineProperty(pool, 'curve', { enumerable: true, configurable: true, get: () => base.map(([v, c]) => [v, indexOnly(c)]) });
}
liveSpend(REFERRAL, ['active']);
livePayouts(REFERRAL_EVENT, ['potFloor']);
for (const r of REFERRAL_EVENT.rules) liveSpend(r, ['per']);
