











use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::CotError;
use crate::events::Spent;
use crate::math::split_spend;
use crate::state::{Config, PlayerState};
use crate::token_ops;

#[derive(Accounts)]
pub struct Spend<'info> {
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = mint,
        has_one = treasury,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
        mut,
        seeds = [PLAYER_SEED, player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Box<Account<'info, PlayerState>>,

    #[account(mut)]
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

pub fn spend_handler(
    ctx: Context<Spend>,
    amount: u64,
    kind: u8,
    order_seq: u64,
    profile: u8,
) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(!config.paused, CotError::Paused);
    require!(amount > 0, CotError::ZeroAmount);
    require!(
        order_seq > ctx.accounts.player_state.last_order_seq,
        CotError::OrderSeqNotIncreasing
    );
    let split = config.profile(profile)?;
    let shares = split_spend(amount, &split)?;
    let bump = config.vault_authority_bump;


    ctx.accounts.player_state.last_order_seq = order_seq;


    let before = ctx.accounts.rewards_vault.amount;
    token_ops::transfer_from_user(
        &ctx.accounts.token_program,
        &ctx.accounts.player_token,
        &ctx.accounts.rewards_vault,
        &ctx.accounts.mint,
        &ctx.accounts.player,
        amount,
    )?;


    ctx.accounts.rewards_vault.reload()?;
    let received = ctx
        .accounts
        .rewards_vault
        .amount
        .checked_sub(before)
        .ok_or(CotError::MathOverflow)?;
    require!(received == amount, CotError::TransferAmountMismatch);




    token_ops::burn_from_vault(
        &ctx.accounts.token_program,
        &ctx.accounts.rewards_vault,
        &ctx.accounts.mint,
        &ctx.accounts.vault_authority,
        bump,
        shares.burn,
    )?;
    token_ops::transfer_from_vault(
        &ctx.accounts.token_program,
        &ctx.accounts.rewards_vault,
        &ctx.accounts.treasury,
        &ctx.accounts.mint,
        &ctx.accounts.vault_authority,
        bump,
        shares.treasury,
    )?;
    token_ops::transfer_from_vault(
        &ctx.accounts.token_program,
        &ctx.accounts.rewards_vault,
        &ctx.accounts.referral_vault,
        &ctx.accounts.mint,
        &ctx.accounts.vault_authority,
        bump,
        shares.referral,
    )?;
    token_ops::transfer_from_vault(
        &ctx.accounts.token_program,
        &ctx.accounts.rewards_vault,
        &ctx.accounts.events_vault,
        &ctx.accounts.mint,
        &ctx.accounts.vault_authority,
        bump,
        shares.events,
    )?;



    let ps = &mut ctx.accounts.player_state;
    ps.total_spent = ps.total_spent.checked_add(amount).ok_or(CotError::MathOverflow)?;

    let config = &mut ctx.accounts.config;
    config.total_spent = config.total_spent.checked_add(amount).ok_or(CotError::MathOverflow)?;
    config.total_burned = config
        .total_burned
        .checked_add(shares.burn)
        .ok_or(CotError::MathOverflow)?;

    emit!(Spent {
        player: ctx.accounts.player.key(),
        kind,
        profile,
        order_seq,
        amount,
        burned: shares.burn,
        to_rewards: shares.rewards,
        to_treasury: shares.treasury,
        to_referral: shares.referral,
        to_events: shares.events,
    });
    Ok(())
}
