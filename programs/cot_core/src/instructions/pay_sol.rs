








use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::*;
use crate::errors::CotError;
use crate::events::SolPaid;
use crate::state::{Config, PlayerState};

#[derive(Accounts)]
pub struct PaySol<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = treasury_sol,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
        mut,
        seeds = [PLAYER_SEED, player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Box<Account<'info, PlayerState>>,




    #[account(mut)]
    pub treasury_sol: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn pay_sol_handler(ctx: Context<PaySol>, kind: u8, order_seq: u64, lamports: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, CotError::Paused);
    require!(lamports > 0, CotError::ZeroAmount);
    require!(
        order_seq > ctx.accounts.player_state.last_order_seq,
        CotError::OrderSeqNotIncreasing
    );


    let ps = &mut ctx.accounts.player_state;
    ps.last_order_seq = order_seq;
    ps.total_sol_paid = ps
        .total_sol_paid
        .checked_add(lamports)
        .ok_or(CotError::MathOverflow)?;
    let config = &mut ctx.accounts.config;
    config.total_sol_paid = config
        .total_sol_paid
        .checked_add(lamports)
        .ok_or(CotError::MathOverflow)?;


    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.treasury_sol.to_account_info(),
            },
        ),
        lamports,
    )?;

    emit!(SolPaid {
        player: ctx.accounts.player.key(),
        kind,
        order_seq,
        lamports,
        treasury_sol: ctx.accounts.treasury_sol.key(),
    });
    Ok(())
}
