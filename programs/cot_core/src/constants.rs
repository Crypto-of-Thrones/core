





pub const BPS_DENOMINATOR: u64 = 10_000;


pub const SECONDS_PER_DAY: i64 = 86_400;







pub const CONFIG_SEED: &[u8] = b"config";


pub const VAULT_AUTHORITY_SEED: &[u8] = b"vault_authority";

pub const REWARDS_VAULT_SEED: &[u8] = b"rewards_vault";




pub const REFERRAL_VAULT_SEED: &[u8] = b"referral_vault";



pub const EVENTS_VAULT_SEED: &[u8] = b"events_vault";

pub const PLAYER_SEED: &[u8] = b"player";


pub const LEDGER_HEAD_SEED: &[u8] = b"ledger_head";







pub const LEDGER_EPOCH_SECS: i64 = 3_600;




pub const LEDGER_EPOCH_DOMAIN: &[u8] = b"COT-LEDGER-EPOCH-v1";



pub const LEDGER_GENESIS: [u8; 32] = [0u8; 32];





pub const MAX_SETTLE_GAP_EPOCHS: u64 = 24;





pub const LEDGER_HEAD_VERSION: u8 = 2;





pub const SETTLE_WINDOW_SECS: i64 = LEDGER_EPOCH_SECS;




pub const MAX_SETTLE_FIRST_LOOKBACK_EPOCHS: u64 = 7 * 24;









pub const VOUCHER_DOMAIN: &[u8; 12] = b"COT_CLAIM_V3";




pub const VOUCHER_MESSAGE_LEN: usize = 12 + 32 + 32 + 8 + 8 + 32 + 32 + 8 + 8;



pub const MAX_CLAIM_LOTS: u64 = 8;




pub const FEE_CENT_BASE_UNITS: u64 = 10_000;




pub const CLAIM_FEE_FLOOR_SLACK: u64 = MAX_CLAIM_LOTS * FEE_CENT_BASE_UNITS;







pub const CONFIG_VERSION: u8 = 2;





pub const MAX_SPLIT_PROFILES: usize = 8;





pub const MINT_DECIMALS: u8 = 6;



pub const MAX_WITHDRAW_FEE_LAMPORTS: u64 = 50_000_000;



pub const MAX_CLAIM_COOLDOWN_SECS: i64 = 7 * SECONDS_PER_DAY;



pub const MAX_CLAIM_FEE_BPS: u16 = 1_500;


pub const MAX_CLAIM_TAX_BPS: u16 = 3_000;


pub const MIN_EPOCH_DURATION_SECS: i64 = 3_600;
pub const MAX_EPOCH_DURATION_SECS: i64 = 7 * SECONDS_PER_DAY;




pub const MIN_VOUCHER_TTL_SECS: i64 = 60;
pub const MAX_VOUCHER_TTL_SECS: i64 = SECONDS_PER_DAY;




pub const REQUIRE_NO_FREEZE_AUTHORITY: bool = true;
