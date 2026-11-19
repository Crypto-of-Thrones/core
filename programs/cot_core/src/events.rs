












use anchor_lang::prelude::*;

use crate::constants::MAX_SPLIT_PROFILES;
use crate::state::{ClaimTax, FeeSplit, SettleAmounts};



#[event]
pub struct ConfigUpdated {
    pub admin: Pubkey,
    pub pending_admin: Pubkey,
    pub guardian: Pubkey,
    pub voucher_signer: Pubkey,
    pub settler: Pubkey,
    pub mint: Pubkey,
    pub mint_decimals: u8,
    pub treasury: Pubkey,
    pub treasury_sol: Pubkey,
    pub split_profiles: [FeeSplit; MAX_SPLIT_PROFILES],
    pub daily_claim_cap: u64,
    pub epoch_claim_cap: u64,
    pub epoch_duration_secs: i64,
    pub claim_tax: ClaimTax,
    pub voucher_max_ttl_secs: i64,
    pub min_claim: u64,
    pub min_wallet_balance: u64,
    pub withdraw_fee_lamports: u64,
    pub claim_cooldown_secs: i64,
    pub claim_max_fee_bps: u16,

    pub initial: bool,
}

#[event]
pub struct AdminAccepted {
    pub previous_admin: Pubkey,
    pub new_admin: Pubkey,
}

#[event]
pub struct PauseChanged {
    pub paused: bool,
    pub by: Pubkey,
    pub ts: i64,
}

#[event]
pub struct PlayerRegistered {
    pub player: Pubkey,
    pub ts: i64,
}




#[event]
pub struct Spent {
    pub player: Pubkey,

    pub kind: u8,

    pub profile: u8,

    pub order_seq: u64,
    pub amount: u64,
    pub burned: u64,
    pub to_rewards: u64,
    pub to_treasury: u64,

    pub to_referral: u64,

    pub to_events: u64,
}


#[event]
pub struct SolPaid {
    pub player: Pubkey,
    pub kind: u8,

    pub order_seq: u64,
    pub lamports: u64,
    pub treasury_sol: Pubkey,
}




#[event]
pub struct Claimed {
    pub player: Pubkey,

    pub gross: u64,

    pub fee: u64,

    pub net: u64,

    pub lots_hash: [u8; 32],

    pub ledger_ref: [u8; 32],
    pub nonce: u64,

    pub sol_fee_lamports: u64,
    pub day: u64,
    pub epoch: u64,
    pub epoch_claimed: u64,
}

#[event]
pub struct VaultFunded {
    pub funder: Pubkey,
    pub amount: u64,
}



#[event]
pub struct SettleCapsUpdated {
    pub admin: Pubkey,
    pub caps: SettleAmounts,
    pub initial: bool,
}





#[event]
pub struct EpochSettled {
    pub settler: Pubkey,
    pub epoch: u64,
    pub root: [u8; 32],
    pub leaf_count: u64,
    pub prev_hash: [u8; 32],
    pub hash: [u8; 32],


    pub skipped_epochs: u64,
    pub amounts: SettleAmounts,

    pub totals: SettleAmounts,
    pub epochs_settled: u64,
    pub ts: i64,
}




#[event]
pub struct NonceCancelled {
    pub settler: Pubkey,
    pub player: Pubkey,
    pub nonce: u64,




    pub expiry: i64,
    pub ts: i64,
}




#[event]
pub struct LedgerReanchored {
    pub admin: Pubkey,
    pub previous_epochs_settled: u64,
    pub previous_epoch: u64,
    pub previous_hash: [u8; 32],
    pub epoch: u64,
    pub root: [u8; 32],
    pub leaf_count: u64,
    pub hash: [u8; 32],
    pub min_epoch: u64,
    pub ts: i64,
}
