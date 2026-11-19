










































use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::CotError;
use crate::events::{EpochSettled, LedgerReanchored, SettleCapsUpdated};
use crate::state::{Config, LedgerHead, SettleAmounts};
use crate::token_ops;






fn push_decimal(out: &mut Vec<u8>, mut v: u64) {
    let mut buf = [0u8; 20];
    let mut i = buf.len();
    loop {
        i -= 1;
        buf[i] = b'0' + (v % 10) as u8;
        v /= 10;
        if v == 0 {
            break;
        }
    }
    out.extend_from_slice(&buf[i..]);
}


fn push_hex(out: &mut Vec<u8>, bytes: &[u8; 32]) {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    for b in bytes {
        out.push(HEX[(b >> 4) as usize]);
        out.push(HEX[(b & 0x0f) as usize]);
    }
}


pub fn epoch_hash(epoch: u64, root: &[u8; 32], leaf_count: u64, prev_hash: &[u8; 32]) -> [u8; 32] {

    let mut msg = Vec::with_capacity(LEDGER_EPOCH_DOMAIN.len() + 4 + 40 + 128);
    msg.extend_from_slice(LEDGER_EPOCH_DOMAIN);
    msg.push(b'\n');
    push_decimal(&mut msg, epoch);
    msg.push(b'\n');
    push_hex(&mut msg, root);
    msg.push(b'\n');
    push_decimal(&mut msg, leaf_count);
    msg.push(b'\n');
    push_hex(&mut msg, prev_hash);
    solana_sha256_hasher::hashv(&[&msg]).to_bytes()
}




pub fn expected_prev_hash(head: &LedgerHead, epoch: u64) -> Result<([u8; 32], u64)> {
    if head.epochs_settled == 0 {
        require!(epoch >= head.min_epoch, CotError::EpochBeforeLedgerStart);
        return Ok((LEDGER_GENESIS, 0));
    }
    require!(epoch > head.last_epoch, CotError::EpochAlreadySettled);
    let skipped = epoch - head.last_epoch - 1;
    require!(skipped <= MAX_SETTLE_GAP_EPOCHS, CotError::SettleGapTooLarge);
    let mut h = head.last_hash;
    for e in head.last_epoch + 1..epoch {

        h = epoch_hash(e, &LEDGER_GENESIS, 0, &h);
    }
    Ok((h, skipped))
}





#[derive(Accounts)]
pub struct InitLedgerHead<'info> {

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ CotError::NotAdmin,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
        init,
        payer = admin,
        space = 8 + LedgerHead::INIT_SPACE,
        seeds = [LEDGER_HEAD_SEED],
        bump,
    )]
    pub ledger_head: Box<Account<'info, LedgerHead>>,

    pub system_program: Program<'info, System>,
}

pub fn init_ledger_head_handler(ctx: Context<InitLedgerHead>, caps: SettleAmounts) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let hour = u64::try_from(now / LEDGER_EPOCH_SECS).map_err(|_| error!(CotError::MathOverflow))?;
    let head = &mut ctx.accounts.ledger_head;
    head.version = LEDGER_HEAD_VERSION;
    head.bump = ctx.bumps.ledger_head;
    head.epochs_settled = 0;
    head.last_epoch = 0;
    head.last_root = LEDGER_GENESIS;
    head.last_leaf_count = 0;
    head.last_hash = LEDGER_GENESIS;
    head.last_settled_ts = 0;
    head.caps = caps;
    head.totals = SettleAmounts::default();
    head.window_used = SettleAmounts::default();
    head.min_epoch = hour.saturating_sub(MAX_SETTLE_FIRST_LOOKBACK_EPOCHS);

    emit!(SettleCapsUpdated {
        admin: ctx.accounts.admin.key(),
        caps,
        initial: true,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct SetSettleCaps<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ CotError::NotAdmin,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(mut, seeds = [LEDGER_HEAD_SEED], bump = ledger_head.bump)]
    pub ledger_head: Box<Account<'info, LedgerHead>>,
}

pub fn set_settle_caps_handler(ctx: Context<SetSettleCaps>, caps: SettleAmounts) -> Result<()> {
    ctx.accounts.ledger_head.caps = caps;
    emit!(SettleCapsUpdated {
        admin: ctx.accounts.admin.key(),
        caps,
        initial: false,
    });
    Ok(())
}









#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct ReanchorArgs {
    pub epoch: u64,
    pub root: [u8; 32],
    pub leaf_count: u64,
    pub hash: [u8; 32],
}

#[derive(Accounts)]
pub struct ReanchorLedgerHead<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ CotError::NotAdmin,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(mut, seeds = [LEDGER_HEAD_SEED], bump = ledger_head.bump)]
    pub ledger_head: Box<Account<'info, LedgerHead>>,
}
















pub fn reanchor_ledger_head_handler(ctx: Context<ReanchorLedgerHead>, args: ReanchorArgs) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let epoch_end = i64::try_from(args.epoch)
        .ok()
        .and_then(|e| e.checked_add(1))
        .and_then(|e| e.checked_mul(LEDGER_EPOCH_SECS))
        .ok_or(CotError::MathOverflow)?;
    require!(epoch_end <= now, CotError::EpochNotEnded);

    let head = &mut ctx.accounts.ledger_head;
    let (previous_epochs_settled, previous_epoch, previous_hash) =
        (head.epochs_settled, head.last_epoch, head.last_hash);
    head.version = LEDGER_HEAD_VERSION;
    head.epochs_settled = head.epochs_settled.max(1);
    head.last_epoch = args.epoch;
    head.last_root = args.root;
    head.last_leaf_count = args.leaf_count;
    head.last_hash = args.hash;
    head.min_epoch = args.epoch.checked_add(1).ok_or(CotError::MathOverflow)?;

    emit!(LedgerReanchored {
        admin: ctx.accounts.admin.key(),
        previous_epochs_settled,
        previous_epoch,
        previous_hash,
        epoch: args.epoch,
        root: args.root,
        leaf_count: args.leaf_count,
        hash: args.hash,
        min_epoch: head.min_epoch,
        ts: now,
    });
    Ok(())
}









#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct SettleEpochArgs {
    pub epoch: u64,
    pub root: [u8; 32],
    pub leaf_count: u64,
    pub prev_hash: [u8; 32],
    pub hash: [u8; 32],
    pub amounts: SettleAmounts,
}

#[derive(Accounts)]
pub struct SettleEpoch<'info> {
    pub settler: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = settler @ CotError::NotSettler,
        has_one = mint,
        has_one = treasury,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(mut, seeds = [LEDGER_HEAD_SEED], bump = ledger_head.bump)]
    pub ledger_head: Box<Account<'info, LedgerHead>>,


    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,


    #[account(seeds = [VAULT_AUTHORITY_SEED], bump = config.vault_authority_bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [REWARDS_VAULT_SEED],
        bump = config.rewards_vault_bump,
        token::mint = mint,
        token::authority = vault_authority,
        token::token_program = token_program,
    )]
    pub rewards_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [REFERRAL_VAULT_SEED],
        bump = config.referral_vault_bump,
        token::mint = mint,
        token::authority = vault_authority,
        token::token_program = token_program,
    )]
    pub referral_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [EVENTS_VAULT_SEED],
        bump = config.events_vault_bump,
        token::mint = mint,
        token::authority = vault_authority,
        token::token_program = token_program,
    )]
    pub events_vault: Box<InterfaceAccount<'info, TokenAccount>>,


    #[account(mut, token::mint = mint, token::token_program = token_program)]
    pub treasury: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn settle_epoch_handler(ctx: Context<SettleEpoch>, args: SettleEpochArgs) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(!ctx.accounts.config.paused, CotError::Paused);


    let epoch_end = i64::try_from(args.epoch)
        .ok()
        .and_then(|e| e.checked_add(1))
        .and_then(|e| e.checked_mul(LEDGER_EPOCH_SECS))
        .ok_or(CotError::MathOverflow)?;
    require!(epoch_end <= now, CotError::EpochNotEnded);


    let head = &ctx.accounts.ledger_head;
    let (prev, skipped) = expected_prev_hash(head, args.epoch)?;
    require!(args.prev_hash == prev, CotError::PrevHashMismatch);
    require!(
        epoch_hash(args.epoch, &args.root, args.leaf_count, &args.prev_hash) == args.hash,
        CotError::EpochHashMismatch
    );


    let a = args.amounts;
    require!(a.within(&head.caps), CotError::SettleCapExceeded);


    let elapsed = now.saturating_sub(head.last_settled_ts);
    let window = head.window_used.drained(&head.caps, elapsed);
    require!(window.window_fits(&a, &head.caps), CotError::SettleWindowCapExceeded);
    let window_used = window.checked_add(&a)?;

    require!(ctx.accounts.events_vault.amount >= a.from_events, CotError::InsufficientVault);
    require!(ctx.accounts.referral_vault.amount >= a.from_referral, CotError::InsufficientVault);
    let rewards_available = ctx
        .accounts
        .rewards_vault
        .amount
        .checked_add(a.from_events)
        .and_then(|v| v.checked_add(a.from_referral))
        .ok_or(CotError::MathOverflow)?;
    require!(rewards_available >= a.rewards_out()?, CotError::InsufficientVault);


    let totals = head.totals.checked_add(&a)?;
    let head = &mut ctx.accounts.ledger_head;
    head.epochs_settled = head.epochs_settled.checked_add(1).ok_or(CotError::MathOverflow)?;
    head.last_epoch = args.epoch;
    head.last_root = args.root;
    head.last_leaf_count = args.leaf_count;
    head.last_hash = args.hash;
    head.last_settled_ts = now;
    head.totals = totals;
    head.window_used = window_used;
    let epochs_settled = head.epochs_settled;

    let config = &mut ctx.accounts.config;
    config.total_burned = config.total_burned.checked_add(a.burn).ok_or(CotError::MathOverflow)?;
    let bump = config.vault_authority_bump;


    let acc = &ctx.accounts;
    token_ops::transfer_from_vault(
        &acc.token_program,
        &acc.events_vault,
        &acc.rewards_vault,
        &acc.mint,
        &acc.vault_authority,
        bump,
        a.from_events,
    )?;
    token_ops::transfer_from_vault(
        &acc.token_program,
        &acc.referral_vault,
        &acc.rewards_vault,
        &acc.mint,
        &acc.vault_authority,
        bump,
        a.from_referral,
    )?;
    token_ops::burn_from_vault(
        &acc.token_program,
        &acc.rewards_vault,
        &acc.mint,
        &acc.vault_authority,
        bump,
        a.burn,
    )?;
    token_ops::transfer_from_vault(
        &acc.token_program,
        &acc.rewards_vault,
        &acc.treasury,
        &acc.mint,
        &acc.vault_authority,
        bump,
        a.to_treasury,
    )?;
    token_ops::transfer_from_vault(
        &acc.token_program,
        &acc.rewards_vault,
        &acc.referral_vault,
        &acc.mint,
        &acc.vault_authority,
        bump,
        a.to_referral,
    )?;
    token_ops::transfer_from_vault(
        &acc.token_program,
        &acc.rewards_vault,
        &acc.events_vault,
        &acc.mint,
        &acc.vault_authority,
        bump,
        a.to_events,
    )?;

    emit!(EpochSettled {
        settler: acc.settler.key(),
        epoch: args.epoch,
        root: args.root,
        leaf_count: args.leaf_count,
        prev_hash: args.prev_hash,
        hash: args.hash,
        skipped_epochs: skipped,
        amounts: a,
        totals,
        epochs_settled,
        ts: now,
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hex32(s: &str) -> [u8; 32] {
        let mut out = [0u8; 32];
        for (i, b) in out.iter_mut().enumerate() {
            *b = u8::from_str_radix(&s[2 * i..2 * i + 2], 16).unwrap();
        }
        out
    }

    fn head(epochs_settled: u64, last_epoch: u64, last_hash: [u8; 32]) -> LedgerHead {
        LedgerHead {
            version: LEDGER_HEAD_VERSION,
            bump: 255,
            epochs_settled,
            last_epoch,
            last_root: LEDGER_GENESIS,
            last_leaf_count: 0,
            last_hash,
            last_settled_ts: 0,
            caps: SettleAmounts::default(),
            totals: SettleAmounts::default(),
            window_used: SettleAmounts::default(),
            min_epoch: 0,
            reserved: [0; 8],
        }
    }

    #[test]
    fn ledger_head_size_is_unchanged() {

        assert_eq!(8 + LedgerHead::INIT_SPACE, 266);
    }

    #[test]
    fn first_settlement_respects_min_epoch() {
        let mut h = head(0, 0, LEDGER_GENESIS);
        h.min_epoch = 100;
        assert!(expected_prev_hash(&h, 99).is_err());
        assert_eq!(expected_prev_hash(&h, 100).unwrap(), (LEDGER_GENESIS, 0));

        h.epochs_settled = 1;
        h.last_epoch = 10;
        assert_eq!(expected_prev_hash(&h, 11).unwrap().1, 0);
    }

    #[test]
    fn window_drains_with_time_and_bounds_non_zero_moves() {
        let caps = SettleAmounts { burn: 3_600, to_events: 10, ..Default::default() };
        let used = SettleAmounts { burn: 3_600, to_events: 10, ..Default::default() };
        assert_eq!(used.drained(&caps, 0), used);
        assert_eq!(used.drained(&caps, -5), used);
        assert_eq!(used.drained(&caps, 900).burn, 2_700);
        assert_eq!(used.drained(&caps, 900).to_events, 8);
        assert_eq!(used.drained(&caps, SETTLE_WINDOW_SECS - 1).burn, 1);
        assert_eq!(used.drained(&caps, SETTLE_WINDOW_SECS), SettleAmounts::default());

        let low = SettleAmounts::default();
        assert_eq!(used.drained(&low, 100), used);
        assert_eq!(used.drained(&low, SETTLE_WINDOW_SECS), SettleAmounts::default());

        let w = SettleAmounts { burn: 3_000, ..Default::default() };
        assert!(w.window_fits(&SettleAmounts { burn: 600, ..Default::default() }, &caps));
        assert!(!w.window_fits(&SettleAmounts { burn: 601, ..Default::default() }, &caps));

        assert!(used.window_fits(&SettleAmounts::default(), &low));
        let max = SettleAmounts { burn: u64::MAX, ..Default::default() };
        assert!(!max.window_fits(&SettleAmounts { burn: 1, ..Default::default() }, &max));
    }


    const E500000: &str = "d130e98782223d1f6f137f01e8be04d4b91e6f7db7968350c58f12b91bd79b37";
    const E500001_EMPTY: &str = "f9b74cbb53900ce638d080cb4c54ee92f4ffa8dcd9630fbb00b98d9064ee3740";

    #[test]
    fn epoch_hash_matches_ledgerdo() {
        let h1 = epoch_hash(500_000, &[0xab; 32], 3, &LEDGER_GENESIS);
        assert_eq!(h1, hex32(E500000));
        let h2 = epoch_hash(500_001, &LEDGER_GENESIS, 0, &h1);
        assert_eq!(h2, hex32(E500001_EMPTY));
    }

    #[test]
    fn epoch_hash_decimal_edges() {
        assert_eq!(
            epoch_hash(0, &LEDGER_GENESIS, 0, &LEDGER_GENESIS),
            hex32("17add4cc3ca72d05bb2744e12f22ea170f67740ae3f32579402bba1b6e465755")
        );
        assert_eq!(
            epoch_hash(u64::MAX, &LEDGER_GENESIS, 0, &LEDGER_GENESIS),
            hex32("1f4bd94977bc5292185c895116610382a6b9674d60172b70001244db387d1136")
        );
    }

    #[test]
    fn first_settlement_chains_to_genesis() {
        assert_eq!(expected_prev_hash(&head(0, 0, [9; 32]), 42).unwrap(), (LEDGER_GENESIS, 0));
    }

    #[test]
    fn next_epoch_chains_to_last_hash() {
        let h = head(1, 500_000, hex32(E500000));
        assert_eq!(expected_prev_hash(&h, 500_001).unwrap(), (hex32(E500000), 0));
    }

    #[test]
    fn gap_rebuilds_empty_epochs() {
        let h = head(1, 500_000, hex32(E500000));
        assert_eq!(expected_prev_hash(&h, 500_002).unwrap(), (hex32(E500001_EMPTY), 1));
        let max = 500_000 + MAX_SETTLE_GAP_EPOCHS + 1;
        assert_eq!(expected_prev_hash(&h, max).unwrap().1, MAX_SETTLE_GAP_EPOCHS);
        assert!(expected_prev_hash(&h, max + 1).is_err());
    }

    #[test]
    fn repeated_or_older_epoch_rejected() {
        let h = head(1, 500_000, hex32(E500000));
        assert!(expected_prev_hash(&h, 500_000).is_err());
        assert!(expected_prev_hash(&h, 499_999).is_err());
    }

    #[test]
    fn amounts_caps_and_totals() {
        let caps = SettleAmounts {
            burn: 10,
            to_treasury: 10,
            to_referral: 10,
            to_events: 10,
            from_events: 10,
            from_referral: 10,
        };
        let a = SettleAmounts { burn: 10, to_events: 3, ..Default::default() };
        assert!(a.within(&caps));
        assert!(!SettleAmounts { from_referral: 11, ..a }.within(&caps));
        assert_eq!(a.rewards_out().unwrap(), 13);
        assert_eq!(a.checked_add(&a).unwrap().burn, 20);
        let big = SettleAmounts { burn: u64::MAX, ..Default::default() };
        assert!(big.checked_add(&a).is_err());
        assert!(SettleAmounts { to_treasury: 1, ..big }.rewards_out().is_err());
    }
}
