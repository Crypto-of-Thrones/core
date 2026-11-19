







use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use super::initialize::config_snapshot;
use crate::constants::*;
use crate::errors::CotError;
use crate::events::{AdminAccepted, PauseChanged};
use crate::state::{ClaimTax, Config, FeeSplit};








#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct UpdateConfigParams {

    pub new_admin: Option<Pubkey>,
    pub guardian: Option<Pubkey>,


    pub voucher_signer: Option<Pubkey>,

    pub settler: Option<Pubkey>,

    pub treasury_sol: Option<Pubkey>,

    pub split_profiles: Option<[FeeSplit; MAX_SPLIT_PROFILES]>,
    pub daily_claim_cap: Option<u64>,
    pub epoch_claim_cap: Option<u64>,
    pub epoch_duration_secs: Option<i64>,
    pub claim_tax: Option<ClaimTax>,
    pub voucher_max_ttl_secs: Option<i64>,
    pub min_claim: Option<u64>,
    pub min_wallet_balance: Option<u64>,
    pub withdraw_fee_lamports: Option<u64>,
    pub claim_cooldown_secs: Option<i64>,
    pub claim_max_fee_bps: Option<u16>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ CotError::NotAdmin,
        has_one = mint,
    )]
    pub config: Account<'info, Config>,

    pub mint: InterfaceAccount<'info, Mint>,


    #[account(token::mint = mint, token::token_program = token_program)]
    pub new_treasury: Option<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn update_config_handler(ctx: Context<UpdateConfig>, p: UpdateConfigParams) -> Result<()> {
    let config = &mut ctx.accounts.config;

    if let Some(v) = p.new_admin {
        require!(v != Pubkey::default(), CotError::ZeroKey);
        config.pending_admin = v;
    }
    if let Some(v) = p.guardian {
        config.guardian = v;
    }
    if let Some(v) = p.voucher_signer {
        config.voucher_signer = v;
    }
    if let Some(v) = p.settler {
        config.settler = v;
    }
    if let Some(v) = p.treasury_sol {
        config.treasury_sol = v;
    }
    if let Some(v) = p.split_profiles {
        config.split_profiles = v;
    }
    if let Some(v) = p.daily_claim_cap {
        config.daily_claim_cap = v;
    }
    if let Some(v) = p.epoch_claim_cap {
        config.epoch_claim_cap = v;
    }
    if let Some(v) = p.epoch_duration_secs {


        config.epoch_duration_secs = v;
        config.current_epoch = u64::MAX;
        config.epoch_claimed = 0;
    }
    if let Some(v) = p.claim_tax {
        config.claim_tax = v;
    }
    if let Some(v) = p.voucher_max_ttl_secs {
        config.voucher_max_ttl_secs = v;
    }
    if let Some(v) = p.min_claim {
        config.min_claim = v;
    }
    if let Some(v) = p.min_wallet_balance {
        config.min_wallet_balance = v;
    }
    if let Some(v) = p.withdraw_fee_lamports {
        config.withdraw_fee_lamports = v;
    }
    if let Some(v) = p.claim_cooldown_secs {
        config.claim_cooldown_secs = v;
    }
    if let Some(v) = p.claim_max_fee_bps {
        config.claim_max_fee_bps = v;
    }
    if let Some(t) = &ctx.accounts.new_treasury {
        config.treasury = t.key();
    }

    config.validate()?;
    emit!(config_snapshot(config, false));
    Ok(())
}





#[derive(Accounts)]
pub struct AcceptAdmin<'info> {
    pub new_admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.pending_admin == new_admin.key() @ CotError::NotPendingAdmin,
    )]
    pub config: Account<'info, Config>,
}

pub fn accept_admin_handler(ctx: Context<AcceptAdmin>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let previous_admin = config.admin;
    config.admin = ctx.accounts.new_admin.key();
    config.pending_admin = Pubkey::default();
    emit!(AdminAccepted {
        previous_admin,
        new_admin: config.admin,
    });
    Ok(())
}





#[derive(Accounts)]
pub struct Pause<'info> {

    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = authority.key() == config.guardian || authority.key() == config.admin
            @ CotError::NotGuardianOrAdmin,
    )]
    pub config: Account<'info, Config>,
}

pub fn pause_handler(ctx: Context<Pause>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    require!(!config.paused, CotError::AlreadyPaused);
    config.paused = true;
    emit!(PauseChanged {
        paused: true,
        by: ctx.accounts.authority.key(),
        ts: Clock::get()?.unix_timestamp,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct Unpause<'info> {


    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ CotError::NotAdmin,
    )]
    pub config: Account<'info, Config>,
}

pub fn unpause_handler(ctx: Context<Unpause>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    require!(config.paused, CotError::NotPaused);
    config.paused = false;
    emit!(PauseChanged {
        paused: false,
        by: ctx.accounts.admin.key(),
        ts: Clock::get()?.unix_timestamp,
    });
    Ok(())
}
