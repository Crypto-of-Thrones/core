
const ramp = (first, step, n) => Array.from({ length: n }, (_, i) => first + step * i);

const VENTURES = [['p1', 'crypt', [1, 5, 10, 25, 50, 100]], ['p2', 'vaults', [1, 5, 10, 25, 50, 100]], ['p3', 'gallery', [1, 4, 8, 16, 32, 64]],
  ['p4', 'cinder', [1, 3, 6, 12, 24, 48]], ['p5', 'barrows', [1, 3, 6, 12, 24, 48]]];

export const LADDER_RULES = {
  slayer: { stat: 'kills', goals: [1, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200, 102400], xp: ramp(50, 50, 12) },
  streak: { stat: 'streak', goals: [10, 20, 40, 80, 160], xp: ramp(100, 75, 5) },
  kingslayer: { stat: 'bosses', goals: [1, 10, 20, 40, 80, 160, 320, 640], xp: ramp(75, 50, 8) },
  realms: { stat: 'realms', goals: [1, 2, 4, 8, 16, 32], xp: ramp(150, 100, 6) },
  waves: { stat: 'waves', goals: [1, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000], xp: ramp(30, 30, 10) },
  delver: { stat: 'expeditions', goals: [1, 5, 10, 20, 40, 80, 160], xp: ramp(50, 40, 7) },
  raider: { stat: 'raidsWon', goals: [1, 5, 10, 20, 40, 80, 160], xp: ramp(50, 40, 7) },
  avenger: { stat: 'revenges', goals: [1, 3, 6, 12, 24], xp: ramp(75, 50, 5) },
  jouster: { stat: 'joustWins', goals: [1, 5, 10, 20, 40, 80, 160], xp: ramp(50, 40, 7) },
  champion: { stat: 'joustRank', lower: true, goals: [5, 3, 1], xp: [150, 300, 600] },
  raven: { stat: 'summons', goals: [1, 10, 25, 50, 100, 200, 400, 800], xp: ramp(50, 50, 8) },
  legends: { stat: 'mythics', goals: [1, 2, 4, 8], xp: ramp(600, 200, 4) },
  fuser: { stat: 'fusions', goals: [1, 5, 10, 20, 40, 80], xp: ramp(50, 40, 6) },
  ascend: { stat: 'heroRank', goals: [1, 2, 3, 4, 5], xp: [100, 200, 350, 550, 800] },
  veteran: { stat: 'mercLevels', goals: [10, 25, 50, 100, 200, 400, 800, 1600], xp: ramp(40, 40, 8) },
  boxes: { stat: 'heroBoxes', goals: [10, 20, 40, 80, 160, 320], xp: ramp(50, 40, 6) },
  drill: { stat: 'training', goals: [5, 10, 20, 40, 80, 160], xp: ramp(50, 40, 6) },
  ...Object.fromEntries(VENTURES.map(([path, id, goals], i) => [id, { stat: `run_${path}`, goals, xp: ramp(50 + 25 * i, 40 + 10 * i, goals.length) }])),
  sailor: { stat: 'voyages', goals: [1, 5, 10, 25, 50, 100, 200], xp: ramp(50, 40, 7) },
  jeweler: { stat: 'forged', goals: [1, 5, 10, 25, 50, 100], xp: ramp(60, 40, 6) },
  paid: { stat: 'withdrawals', goals: [1, 5, 10, 20, 40], xp: ramp(100, 50, 5) },
  castles: { stat: 'castles', goals: [2, 4, 8, 16], xp: ramp(100, 100, 4) },
  keep: { stat: 'castleTier', goals: [2, 3, 4, 5, 6], xp: ramp(100, 100, 5) },
  trader: { stat: 'marketSales', goals: [1, 5, 10, 20, 40, 80], xp: ramp(50, 40, 6) },
  tickets: { stat: 'tickets', goals: [10, 20, 40, 80, 160, 320], xp: ramp(50, 30, 6) },
  apothecary: { stat: 'potionsUsed', goals: [10, 50, 100, 250, 500, 1000, 2500], xp: ramp(40, 30, 7) },
  staker: { stat: 'stakeDays', goals: [1, 3, 7, 14, 30, 60, 90], xp: ramp(50, 40, 7) },
  loyal: { stat: 'logins', goals: [1, 3, 7, 14, 30, 60, 100, 200], xp: ramp(30, 30, 8) },
  banners: { stat: 'vassals', goals: [5, 10, 20, 40, 80], xp: ramp(300, 150, 5) },
  devoted: { stat: 'dailyBest', goals: [3, 7, 14, 28, 56], xp: ramp(100, 100, 5) },
  tour: { stat: 'tour', goals: [1], xp: [50] },
  dragonsbane: { stat: 'lastBlows', goals: [1, 2, 4, 8, 16, 32], xp: ramp(150, 100, 6) },
  hoarder: { stat: 'dragonBoxes', goals: [1, 5, 10, 20, 40, 80], xp: ramp(75, 50, 6) },
  siege: { stat: 'wbDamage', goals: [10e3, 25e3, 50e3, 100e3, 200e3, 400e3, 800e3, 1.6e6], xp: ramp(50, 40, 8) },
  skyfall: { stat: 'wbKills', goals: [1, 5, 10, 20, 40], xp: ramp(100, 50, 5) },
  lucky: { stat: 'lotteryWins', goals: [1, 2, 4, 8], xp: ramp(150, 100, 4) },
  pass: { stat: 'passLevels', goals: [1, 5, 10, 25, 50, 100], xp: ramp(50, 50, 6) },
};

const meets = (l, value, goal) => (l.lower ? value > 0 && value <= goal : value >= goal);

export function tierOf(l, value) {
  let n = 0;
  while (n < l.goals.length && meets(l, value, l.goals[n])) n++;
  return n;
}

export function tierItems(t) {
  if (t % 3) return [];
  return [[{ kind: 'potion', n: 5 }], [], [{ kind: 'summon', n: 1, floor: 'uncommon' }]][t / 3 - 1] || [{ kind: 'herobox', n: 1 }];
}

export const SPEND_GATED = Object.freeze(['slayer', 'waves']);

export const spendGated = (id, t) => SPEND_GATED.includes(id) && tierItems(t).some((it) => it.kind === 'summon' || it.kind === 'herobox');
