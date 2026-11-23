
export function squireStep(heroes, { cap, slots = 0, ready = 0.8, maxEnergy, maxShield, power, rank = () => 0 }) {
  heroes = heroes.filter((x) => x.status === 'work' || !x.pin);
  let changes = 0;
  const broken = (x) => x.shield <= 0;
  const ratio = (x) => x.energy / maxEnergy(x);
  const isReady = (x) => !broken(x) && x.energy >= ready * maxEnergy(x);
  const toWork = (x) => { x.status = 'work'; x.castle = false; x.hold = false; changes++; };
  const toRest = (x) => { x.status = 'rest'; x.castle = false; x.hold = true; changes++; };
  const working = () => heroes.filter((x) => x.status === 'work');
  const byPower = (a, b) => rank(b) - rank(a) || power(b) - power(a);

  for (const x of heroes) if (broken(x) && x.status === 'work') { x.status = 'idle'; x.castle = false; x.hold = false; changes++; }

  const hunt = working().sort(byPower);
  while (hunt.length > cap) toRest(hunt.pop());
  const bench = heroes.filter((x) => x.status !== 'work' && isReady(x)).sort(byPower);
  while (hunt.length < cap && bench.length) {
    const x = bench.shift();
    toWork(x);
    hunt.push(x);
  }
  hunt.sort(byPower);
  for (const x of bench) {
    const weakest = hunt[hunt.length - 1];
    if (!weakest || byPower(x, weakest) >= 0) break;
    hunt.pop();
    toRest(weakest);
    toWork(x);
    hunt.push(x);
    hunt.sort(byPower);
  }

  for (const x of heroes) if (x.status === 'idle' && !broken(x) && !isReady(x)) toRest(x);

  if (slots > 0) {
    const guests = heroes.filter((x) => x.status === 'rest' && x.castle);
    const tired = heroes.filter((x) => x.status === 'rest' && !x.castle && ratio(x) < 1).sort((a, b) => ratio(a) - ratio(b));
    while (guests.length < slots && tired.length) {
      const x = tired.shift();
      x.castle = true;
      guests.push(x);
      changes++;
    }
    for (let guard = 0; guard < slots && tired.length; guard++) {
      guests.sort((a, b) => ratio(b) - ratio(a));
      const out = guests[0];
      const x = tired[0];
      const moreTired = ratio(x) < ratio(out) - 0.1;
      const stronger = ratio(x) < ratio(out) && power(x) > power(out);
      if (!moreTired && !stronger) break;
      tired.shift();
      x.castle = true;
      out.castle = false;
      guests[0] = x;
      changes++;
      if (working().length < cap && !broken(out)) toWork(out);
    }
  }
  return changes;
}

export const squirePrice = (cfg, sold) => cfg.base + cfg.step * sold;
