









use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::CotError;








#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, PartialEq, Eq, InitSpace)]
pub struct FeeSplit {

    pub burn_bps: u16,

    pub rewards_bps: u16,

    pub treasury_bps: u16,


    pub referral_bps: u16,

    pub events_bps: u16,
}

impl FeeSplit {

    pub fn total_bps(&self) -> u32 {
        self.burn_bps as u32
            + self.rewards_bps as u32
            + self.treasury_bps as u32
            + self.referral_bps as u32
            + self.events_bps as u32
    }


    pub fn is_active(&self) -> bool {
        self.total_bps() != 0
    }
}









#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, PartialEq, Eq, InitSpace)]
pub struct ClaimTax {
    pub start_bps: u16,
    pub floor_bps: u16,
    pub decay_bps_per_day: u16,
}


#[account]
#[derive(InitSpace, Debug)]
pub struct Config {

    pub version: u8,
    pub bump: u8,
    pub vault_authority_bump: u8,
    pub rewards_vault_bump: u8,
    pub referral_vault_bump: u8,
    pub events_vault_bump: u8,


    pub admin: Pubkey,


    pub pending_admin: Pubkey,

    pub guardian: Pubkey,

    pub voucher_signer: Pubkey,


    pub settler: Pubkey,


    pub mint: Pubkey,

    pub treasury: Pubkey,


    pub treasury_sol: Pubkey,


    pub split_profiles: [FeeSplit; MAX_SPLIT_PROFILES],


    pub daily_claim_cap: u64,

    pub epoch_claim_cap: u64,

    pub epoch_duration_secs: i64,

    pub current_epoch: u64,

    pub epoch_claimed: u64,

    pub claim_tax: ClaimTax,

    pub voucher_max_ttl_secs: i64,




    pub min_claim: u64,


    pub min_wallet_balance: u64,


    pub withdraw_fee_lamports: u64,

    pub claim_cooldown_secs: i64,


    pub claim_max_fee_bps: u16,



    pub paused: bool,


    pub total_spent: u64,
    pub total_burned: u64,

    pub total_claimed: u64,

    pub total_claim_tax: u64,

    pub total_sol_paid: u64,

    pub reserved: [u8; 128],
}

impl Config {



    pub fn validate(&self) -> Result<()> {


        require!(self.split_profiles[0].is_active(), CotError::InvalidSplitProfile);
        for p in self.split_profiles.iter() {
            require!(
                !p.is_active() || p.total_bps() == BPS_DENOMINATOR as u32,
                CotError::FeeSplitNotFullBps
            );
        }

        let t = &self.claim_tax;
        require!(
            t.start_bps <= MAX_CLAIM_TAX_BPS && t.floor_bps <= t.start_bps,
            CotError::ClaimTaxOutOfBounds
        );

        require!(
            self.daily_claim_cap > 0
                && self.epoch_claim_cap > 0
                && self.daily_claim_cap <= self.epoch_claim_cap,
            CotError::InvalidClaimCaps
        );

        require!(
            (MIN_EPOCH_DURATION_SECS..=MAX_EPOCH_DURATION_SECS).contains(&self.epoch_duration_secs),
            CotError::EpochDurationOutOfBounds
        );

        require!(
            (MIN_VOUCHER_TTL_SECS..=MAX_VOUCHER_TTL_SECS).contains(&self.voucher_max_ttl_secs),
            CotError::VoucherTtlOutOfBounds
        );


        require!(
            self.min_claim > 0 && self.min_claim <= self.daily_claim_cap,
            CotError::InvalidMinClaim
        );
        require!(
            self.withdraw_fee_lamports <= MAX_WITHDRAW_FEE_LAMPORTS,
            CotError::WithdrawFeeOutOfBounds
        );
        require!(
            (0..=MAX_CLAIM_COOLDOWN_SECS).contains(&self.claim_cooldown_secs),
            CotError::ClaimCooldownOutOfBounds
        );
        require!(
            self.claim_max_fee_bps <= MAX_CLAIM_FEE_BPS
                && self.claim_max_fee_bps >= self.claim_tax.floor_bps,
            CotError::ClaimFeeBoundsOutOfBounds
        );

        for key in [
            self.admin,
            self.guardian,
            self.voucher_signer,
            self.settler,
            self.treasury,
            self.treasury_sol,
        ] {
            require!(key != Pubkey::default(), CotError::ZeroKey);
        }
        Ok(())
    }


    pub fn profile(&self, index: u8) -> Result<FeeSplit> {
        let p = self
            .split_profiles
            .get(index as usize)
            .copied()
            .ok_or(CotError::InvalidSplitProfile)?;
        require!(p.is_active(), CotError::InvalidSplitProfile);
        Ok(p)
    }
}


#[account]
#[derive(InitSpace, Debug)]
pub struct PlayerState {
    pub bump: u8,

    pub owner: Pubkey,
    pub created_ts: i64,




    pub last_nonce: u64,


    pub last_claim_ts: i64,

    pub claim_day: u64,

    pub claimed_today: u64,




    pub last_order_seq: u64,

    pub total_spent: u64,
    pub total_claimed: u64,

    pub total_sol_paid: u64,






    pub last_cancelled_nonce: u64,

    pub reserved: [u8; 24],
}













#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, PartialEq, Eq, InitSpace)]
pub struct SettleAmounts {

    pub burn: u64,

    pub to_treasury: u64,

    pub to_referral: u64,

    pub to_events: u64,

    pub from_events: u64,

    pub from_referral: u64,
}

impl SettleAmounts {

    pub fn within(&self, caps: &SettleAmounts) -> bool {
        self.burn <= caps.burn
            && self.to_treasury <= caps.to_treasury
            && self.to_referral <= caps.to_referral
            && self.to_events <= caps.to_events
            && self.from_events <= caps.from_events
            && self.from_referral <= caps.from_referral
    }


    pub fn checked_add(&self, o: &SettleAmounts) -> Result<SettleAmounts> {
        let add = |a: u64, b: u64| a.checked_add(b).ok_or(CotError::MathOverflow);
        Ok(SettleAmounts {
            burn: add(self.burn, o.burn)?,
            to_treasury: add(self.to_treasury, o.to_treasury)?,
            to_referral: add(self.to_referral, o.to_referral)?,
            to_events: add(self.to_events, o.to_events)?,
            from_events: add(self.from_events, o.from_events)?,
            from_referral: add(self.from_referral, o.from_referral)?,
        })
    }


    fn zip(&self, o: &SettleAmounts, f: impl Fn(u64, u64) -> u64) -> SettleAmounts {
        SettleAmounts {
            burn: f(self.burn, o.burn),
            to_treasury: f(self.to_treasury, o.to_treasury),
            to_referral: f(self.to_referral, o.to_referral),
            to_events: f(self.to_events, o.to_events),
            from_events: f(self.from_events, o.from_events),
            from_referral: f(self.from_referral, o.from_referral),
        }
    }




    pub fn drained(&self, caps: &SettleAmounts, elapsed: i64) -> SettleAmounts {
        if elapsed >= SETTLE_WINDOW_SECS {
            return SettleAmounts::default();
        }
        if elapsed <= 0 {
            return *self;
        }

        self.zip(caps, |used, cap| {
            used.saturating_sub((cap as u128 * elapsed as u128 / SETTLE_WINDOW_SECS as u128) as u64)
        })
    }




    pub fn window_fits(&self, amounts: &SettleAmounts, caps: &SettleAmounts) -> bool {
        let fits = |used: u64, amount: u64, cap: u64| {
            amount == 0 || used.checked_add(amount).is_some_and(|v| v <= cap)
        };
        fits(self.burn, amounts.burn, caps.burn)
            && fits(self.to_treasury, amounts.to_treasury, caps.to_treasury)
            && fits(self.to_referral, amounts.to_referral, caps.to_referral)
            && fits(self.to_events, amounts.to_events, caps.to_events)
            && fits(self.from_events, amounts.from_events, caps.from_events)
            && fits(self.from_referral, amounts.from_referral, caps.from_referral)
    }


    pub fn rewards_out(&self) -> Result<u64> {
        self.burn
            .checked_add(self.to_treasury)
            .and_then(|v| v.checked_add(self.to_referral))
            .and_then(|v| v.checked_add(self.to_events))
            .ok_or(error!(CotError::MathOverflow))
    }
}







#[account]
#[derive(InitSpace, Debug)]
pub struct LedgerHead {

    pub version: u8,
    pub bump: u8,


    pub epochs_settled: u64,

    pub last_epoch: u64,

    pub last_root: [u8; 32],

    pub last_leaf_count: u64,

    pub last_hash: [u8; 32],

    pub last_settled_ts: i64,


    pub caps: SettleAmounts,

    pub totals: SettleAmounts,










    pub window_used: SettleAmounts,






    pub min_epoch: u64,



    pub reserved: [u8; 8],
}
