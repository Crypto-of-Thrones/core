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
      "common": 82,
      "uncommon": 28.12,
      "rare": 16.9,
      "epic": 8.4,
      "legendary": 3.316,
      "mythic": 1.759
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
    "min": 100000,
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
    "minPoolSol": 16.7
  }
});

export const BALANCE_HASH = '0819e92bb6dccc556b33c8d211e298910155c49239ab1fa4895f3385247b4c4b';
