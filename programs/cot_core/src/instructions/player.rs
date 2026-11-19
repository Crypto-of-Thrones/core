







use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::CotError;
use crate::events::{PlayerRegistered, VaultFunded};
use crate::state::{Config, PlayerState};
use crate::token_ops;





#[derive(Accounts)]
pub struct InitPlayer<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        init,
        payer = player,
        space = 8 + PlayerState::INIT_SPACE,
        seeds = [PLAYER_SEED, player.key().as_ref()],
        bump,
    )]
    pub player_state: Account<'info, PlayerState>,

    pub system_program: Program<'info, System>,
}

pub fn init_player_handler(ctx: Context<InitPlayer>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let s = &mut ctx.accounts.player_state;
    s.bump = ctx.bumps.player_state;
    s.owner = ctx.accounts.player.key();



    s.created_ts = now;
    emit!(PlayerRegistered {
        player: s.owner,
        ts: now,
    });
    Ok(())
}





#[derive(Accounts)]
pub struct FundVault<'info> {
    pub funder: Signer<'info>,

    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = mint)]
    pub config: Box<Account<'info, Config>>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = funder,
        token::token_program = token_program,
    )]
    pub funder_token: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [REWARDS_VAULT_SEED],
        bump = config.rewards_vault_bump,
        token::mint = mint,
        token::token_program = token_program,
    )]
    pub rewards_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}



pub fn fund_vault_handler(ctx: Context<FundVault>, amount: u64) -> Result<()> {
    require!(amount > 0, CotError::ZeroAmount);
    token_ops::transfer_from_user(
        &ctx.accounts.token_program,
        &ctx.accounts.funder_token,
        &ctx.accounts.rewards_vault,
        &ctx.accounts.mint,
        &ctx.accounts.funder,
        amount,
    )?;
    emit!(VaultFunded {
        funder: ctx.accounts.funder.key(),
        amount,
    });
    Ok(())
}
