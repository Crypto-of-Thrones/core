























use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::CotError;
use crate::events::Claimed;
use crate::math::claim_fee_net;
use crate::state::{Config, PlayerState};
use crate::token_ops;
use crate::voucher::{build_message, verify_voucher_signature, ClaimVoucher};

#[derive(Accounts)]
pub struct ClaimWithVoucher<'info> {

    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = mint,
        has_one = treasury_sol,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
        mut,
        seeds = [PLAYER_SEED, player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Box<Account<'info, PlayerState>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,




    #[account(
        mut,
        token::mint = mint,
        token::authority = player,
        token::token_program = token_program,
    )]
    pub player_token: Box<InterfaceAccount<'info, TokenAccount>>,


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




    #[account(mut)]
    pub treasury_sol: SystemAccount<'info>,



    #[account(address = solana_sdk_ids::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn claim_with_voucher_handler(ctx: Context<ClaimWithVoucher>, voucher: ClaimVoucher) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &ctx.accounts.config;
    let player = ctx.accounts.player.key();
    let v = voucher;

    require!(!config.paused, CotError::Paused);
    require!(v.amount > 0, CotError::ZeroAmount);


    require!(now <= v.expiry, CotError::VoucherExpired);
    let max_expiry = now
        .checked_add(config.voucher_max_ttl_secs)
        .ok_or(CotError::MathOverflow)?;
    require!(v.expiry <= max_expiry, CotError::VoucherExpiryTooFar);
    require!(
        v.nonce > ctx.accounts.player_state.last_nonce,
        CotError::NonceNotIncreasing
    );


    let message = build_message(ctx.program_id, &player, &v);
    verify_voucher_signature(
        &ctx.accounts.instructions_sysvar.to_account_info(),
        &config.voucher_signer,
        &message,
    )?;



    require!(v.amount >= config.min_claim, CotError::ClaimBelowMinimum);
    require!(v.lots_hash != [0u8; 32], CotError::MissingLotsHash);
    let net = claim_fee_net(v.amount, v.fee, config.claim_tax.floor_bps, config.claim_max_fee_bps)?;

    let ps = &ctx.accounts.player_state;
    if ps.last_claim_ts > 0 {
        let next_allowed = ps
            .last_claim_ts
            .checked_add(config.claim_cooldown_secs)
            .ok_or(CotError::MathOverflow)?;
        require!(now >= next_allowed, CotError::ClaimCooldownActive);
    }
    require!(
        ctx.accounts.player_token.amount >= config.min_wallet_balance,
        CotError::WalletBalanceTooLow
    );


    let day = u64::try_from(now / SECONDS_PER_DAY).map_err(|_| error!(CotError::MathOverflow))?;
    let epoch =
        u64::try_from(now / config.epoch_duration_secs).map_err(|_| error!(CotError::MathOverflow))?;

    let claimed_today = if ps.claim_day == day { ps.claimed_today } else { 0 };
    let new_today = claimed_today.checked_add(v.amount).ok_or(CotError::MathOverflow)?;
    require!(new_today <= config.daily_claim_cap, CotError::DailyCapExceeded);

    let epoch_claimed = if config.current_epoch == epoch { config.epoch_claimed } else { 0 };
    let new_epoch_claimed = epoch_claimed.checked_add(v.amount).ok_or(CotError::MathOverflow)?;
    require!(new_epoch_claimed <= config.epoch_claim_cap, CotError::EpochCapExceeded);

    require!(
        ctx.accounts.rewards_vault.amount >= net,
        CotError::InsufficientVault
    );
    let sol_fee = config.withdraw_fee_lamports;


    let ps = &mut ctx.accounts.player_state;
    ps.last_nonce = v.nonce;
    ps.last_claim_ts = now;
    ps.claim_day = day;
    ps.claimed_today = new_today;
    ps.total_claimed = ps.total_claimed.checked_add(net).ok_or(CotError::MathOverflow)?;
    ps.total_sol_paid = ps.total_sol_paid.checked_add(sol_fee).ok_or(CotError::MathOverflow)?;

    let config = &mut ctx.accounts.config;
    config.current_epoch = epoch;
    config.epoch_claimed = new_epoch_claimed;
    config.total_claimed = config.total_claimed.checked_add(net).ok_or(CotError::MathOverflow)?;
    config.total_claim_tax = config.total_claim_tax.checked_add(v.fee).ok_or(CotError::MathOverflow)?;
    config.total_sol_paid = config.total_sol_paid.checked_add(sol_fee).ok_or(CotError::MathOverflow)?;
    let vault_bump = config.vault_authority_bump;



    if sol_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.treasury_sol.to_account_info(),
                },
            ),
            sol_fee,
        )?;
    }


    token_ops::transfer_from_vault(
        &ctx.accounts.token_program,
        &ctx.accounts.rewards_vault,
        &ctx.accounts.player_token,
        &ctx.accounts.mint,
        &ctx.accounts.vault_authority,
        vault_bump,
        net,
    )?;

    emit!(Claimed {
        player,
        gross: v.amount,
        fee: v.fee,
        net,
        lots_hash: v.lots_hash,
        ledger_ref: v.ledger_ref,
        nonce: v.nonce,
        sol_fee_lamports: sol_fee,
        day,
        epoch,
        epoch_claimed: new_epoch_claimed,
    });
    Ok(())
}
