














































use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::CotError;
use crate::events::NonceCancelled;
use crate::state::{Config, PlayerState};
use crate::voucher::{build_message, verify_voucher_signature, ClaimVoucher};

#[derive(Accounts)]
pub struct CancelNonce<'info> {

    #[account(mut)]
    pub settler: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = settler @ CotError::NotSettler,
    )]
    pub config: Box<Account<'info, Config>>,




    pub wallet: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = settler,
        space = 8 + PlayerState::INIT_SPACE,
        seeds = [PLAYER_SEED, wallet.key().as_ref()],
        bump,
    )]
    pub player_state: Box<Account<'info, PlayerState>>,

    pub system_program: Program<'info, System>,




    #[account(address = solana_sdk_ids::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}

pub fn cancel_nonce_handler(ctx: Context<CancelNonce>, voucher: ClaimVoucher) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let v = voucher;
    require!(now > v.expiry, CotError::VoucherNotExpired);


    let wallet = ctx.accounts.wallet.key();
    let message = build_message(ctx.program_id, &wallet, &v);
    verify_voucher_signature(
        &ctx.accounts.instructions_sysvar.to_account_info(),
        &ctx.accounts.config.voucher_signer,
        &message,
    )?;

    let ps = &mut ctx.accounts.player_state;
    if ps.owner == Pubkey::default() {

        ps.bump = ctx.bumps.player_state;
        ps.owner = wallet;
        ps.created_ts = now;
    }
    require!(v.nonce > ps.last_nonce, CotError::NonceNotIncreasing);
    ps.last_nonce = v.nonce;
    ps.last_cancelled_nonce = v.nonce;

    emit!(NonceCancelled {
        settler: ctx.accounts.settler.key(),
        player: wallet,
        nonce: v.nonce,
        expiry: v.expiry,
        ts: now,
    });
    Ok(())
}
