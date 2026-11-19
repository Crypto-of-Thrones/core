







use crate::constants::{BPS_DENOMINATOR, CLAIM_FEE_FLOOR_SLACK};
use crate::errors::CotError;
use crate::state::FeeSplit;
use anchor_lang::prelude::*;


pub fn bps_of(amount: u64, bps: u16) -> Result<u64> {
    let v = (amount as u128)
        .checked_mul(bps as u128)
        .and_then(|x| x.checked_div(BPS_DENOMINATOR as u128))
        .ok_or(CotError::MathOverflow)?;
    u64::try_from(v).map_err(|_| error!(CotError::MathOverflow))
}



#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct SpendShares {
    pub burn: u64,

    pub rewards: u64,
    pub treasury: u64,

    pub referral: u64,

    pub events: u64,
}





pub fn split_spend(amount: u64, split: &FeeSplit) -> Result<SpendShares> {
    let burn = bps_of(amount, split.burn_bps)?;
    let treasury = bps_of(amount, split.treasury_bps)?;
    let referral = bps_of(amount, split.referral_bps)?;
    let events = bps_of(amount, split.events_bps)?;

    let others = burn
        .checked_add(treasury)
        .and_then(|x| x.checked_add(referral))
        .and_then(|x| x.checked_add(events))
        .ok_or(CotError::MathOverflow)?;


    let rewards = amount.checked_sub(others).ok_or(CotError::MathOverflow)?;

    Ok(SpendShares {
        burn,
        rewards,
        treasury,
        referral,
        events,
    })
}
















pub fn claim_fee_net(gross: u64, fee: u64, floor_bps: u16, max_bps: u16) -> Result<u64> {
    require!(fee <= bps_of(gross, max_bps)?, CotError::ClaimFeeAboveMax);
    let floor_fee = bps_of(gross, floor_bps)?.saturating_sub(CLAIM_FEE_FLOOR_SLACK);
    require!(fee >= floor_fee, CotError::ClaimFeeBelowFloor);

    gross.checked_sub(fee).ok_or(error!(CotError::MathOverflow))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn standard_split() -> FeeSplit {

        FeeSplit {
            burn_bps: 2_000,
            rewards_bps: 5_000,
            treasury_bps: 1_500,
            referral_bps: 1_000,
            events_bps: 500,
        }
    }

    fn market_split() -> FeeSplit {

        FeeSplit {
            burn_bps: 600,
            rewards_bps: 8_800,
            treasury_bps: 600,
            referral_bps: 0,
            events_bps: 0,
        }
    }

    fn sum(s: &SpendShares) -> u64 {
        s.burn + s.rewards + s.treasury + s.referral + s.events
    }

    #[test]
    fn split_standard_matches_data_js() {
        let s = split_spend(1_000_000, &standard_split()).unwrap();
        assert_eq!(s.burn, 200_000);
        assert_eq!(s.rewards, 500_000);
        assert_eq!(s.treasury, 150_000);
        assert_eq!(s.referral, 100_000);
        assert_eq!(s.events, 50_000);
        assert_eq!(sum(&s), 1_000_000);
    }

    #[test]
    fn split_market_profile() {
        let s = split_spend(1_000_000, &market_split()).unwrap();
        assert_eq!((s.burn, s.treasury, s.rewards), (60_000, 60_000, 880_000));
        assert_eq!((s.referral, s.events), (0, 0));
    }

    #[test]
    fn split_conserves_odd_amounts_and_dust_goes_to_rewards() {
        for amount in [1u64, 7, 9_999, 10_001, 123_456_789, u64::MAX / 3, u64::MAX] {
            for split in [standard_split(), market_split()] {
                let s = split_spend(amount, &split).unwrap();
                assert_eq!(sum(&s), amount, "amount {amount} split {split:?}");
            }
        }
        let s = split_spend(1, &standard_split()).unwrap();
        assert_eq!(s.rewards, 1);
    }


    const FLOOR: u16 = 300;
    const MAX: u16 = 1_500;
    const ONE: u64 = 1_000_000;

    fn assert_err(r: Result<u64>, e: CotError) {
        assert_eq!(r.expect_err("expected failure"), anchor_lang::error::Error::from(e));
    }

    #[test]
    fn fee_of_mixed_lots_matches_chestlots() {


        let gross = 110_000 * ONE;
        let fee = 10_500 * ONE;
        assert_eq!(claim_fee_net(gross, fee, FLOOR, MAX).unwrap(), 99_500 * ONE);
    }

    #[test]
    fn fee_bounds_are_inclusive() {
        let gross = 100_000 * ONE;
        assert_eq!(claim_fee_net(gross, 15_000 * ONE, FLOOR, MAX).unwrap(), 85_000 * ONE);
        assert_eq!(claim_fee_net(gross, 3_000 * ONE, FLOOR, MAX).unwrap(), 97_000 * ONE);
        assert_err(claim_fee_net(gross, 15_000 * ONE + 1, FLOOR, MAX), CotError::ClaimFeeAboveMax);
    }

    #[test]
    fn fee_floor_allows_one_cent_per_lot_only() {
        let gross = 100_000 * ONE;
        let floor = 3_000 * ONE;
        claim_fee_net(gross, floor - CLAIM_FEE_FLOOR_SLACK, FLOOR, MAX).unwrap();
        assert_err(
            claim_fee_net(gross, floor - CLAIM_FEE_FLOOR_SLACK - 1, FLOOR, MAX),
            CotError::ClaimFeeBelowFloor,
        );
        assert_err(claim_fee_net(gross, 0, FLOOR, MAX), CotError::ClaimFeeBelowFloor);
    }

    #[test]
    fn fee_floor_covers_worst_case_cent_rounding() {


        let gross = 8 * 330_000;
        assert_eq!(claim_fee_net(gross, 0, FLOOR, MAX).unwrap(), gross);
    }

    #[test]
    fn fee_math_never_overflows() {
        let max_fee = bps_of(u64::MAX, MAX).unwrap();
        assert_eq!(claim_fee_net(u64::MAX, max_fee, FLOOR, MAX).unwrap(), u64::MAX - max_fee);
    }
}
