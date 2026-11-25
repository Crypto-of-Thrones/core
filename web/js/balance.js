const freeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object') freeze(v); return Object.freeze(o); };

export const BALANCE = freeze({
  "summon": {
    "cost": 25000,
    "weights": {
      "common": 8287,
      "uncommon": 1036,
      "rare": 518,
      "epic": 104,
      "legendary": 51,
      "mythic": 4
    }
  },
  "farm": {
    "paybackDays": {
      "common": 81.25,
      "uncommon": 28.125,
      "rare": 18.75,
      "epic": 15,
      "legendary": 11.25,
      "mythic": 8.75
    }
  },
  "feeSplit": {
    "burn": 20,
    "rewards": 50,
    "treasury": 15,
    "referral": 10,
    "events": 5
  },
  "withdraw": {
    "feePct": 3,
    "feeStartPct": 15,
    "feeStepPct": 2,
    "min": 1000,
    "hold": 2500
  },
  "pvp": {
    "band": 0,
    "share": 0.2,
    "take": 0.5,
    "toRaider": 0.5
  },
  "heroBox": {
    "price": 25000
  },
  "priceIndex": {
    "capUsd": 4,
    "twapDays": 7,
    "maxDayMove": 0.4,
    "floor": 0.001,
    "sampleMinutes": 15,
    "minCoverage": 0.5,
    "warmDays": 1,
    "solUsdMaxSpread": 0.03,
    "solUsdMinSources": 2,
    "solUsdMaxAgeSec": 600,
    "chargeRunUp": 1.5,
    "chargeHighDays": 10,
    "chargeRefFromDays": 7,
    "chargeRefToDays": 14,
    "minPoolSol": 16.7,
    "alertUsd": 8
  },
  "price": {
    "factor": 0.4
  },
  "reward": {
    "factor": 0.4
  }
});

export const BALANCE_HASH = '2d9f49d32c68d58c69f6bc83901471989f83c932932e7e02e06165440a68895a';
