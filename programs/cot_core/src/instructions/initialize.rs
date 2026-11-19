





use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use spl_token_2022_interface::extension::{BaseStateWithExtensions, ExtensionType, StateWithExtensions};

use crate::constants::*;
use crate::errors::CotError;
use crate::events::ConfigUpdated;
use crate::program::CotCore;
use crate::state::{ClaimTax, Config, FeeSplit};




#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitializeParams {
    pub admin: Pubkey,
    pub guardian: Pubkey,
    pub voucher_signer: Pubkey,
    pub settler: Pubkey,
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
}

#[derive(Accounts)]
pub struct Initialize<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Box<Account<'info, Config>>,



    #[account(seeds = [VAULT_AUTHORITY_SEED], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,



    #[account(
        init,
        payer = authority,
        seeds = [REWARDS_VAULT_SEED],
        bump,
        token::mint = mint,
        token::authority = vault_authority,
        token::token_program = token_program,
    )]
    pub rewards_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        seeds = [REFERRAL_VAULT_SEED],
        bump,
        token::mint = mint,
        token::authority = vault_authority,
        token::token_program = token_program,
    )]
    pub referral_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        seeds = [EVENTS_VAULT_SEED],
        bump,
        token::mint = mint,
        token::authority = vault_authority,
        token::token_program = token_program,
    )]
    pub events_vault: Box<InterfaceAccount<'info, TokenAccount>>,


    #[account(
        token::mint = mint,
        token::token_program = token_program,
    )]
    pub treasury: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, CotCore>,

    #[account(
        constraint = program_data.upgrade_authority_address == Some(authority.key())
            @ CotError::NotUpgradeAuthority
    )]
    pub program_data: Account<'info, ProgramData>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}











fn check_mint(mint: &InterfaceAccount<Mint>) -> Result<()> {
    require!(mint.decimals == MINT_DECIMALS, CotError::MintDecimalsMismatch);
    if REQUIRE_NO_FREEZE_AUTHORITY {
        require!(mint.freeze_authority.is_none(), CotError::MintHasFreezeAuthority);
    }

    let info = mint.to_account_info();
    if *info.owner == anchor_spl::token_2022::ID {
        let data = info.try_borrow_data()?;
        let state = StateWithExtensions::<spl_token_2022_interface::state::Mint>::unpack(&data)
            .map_err(|_| error!(CotError::UnsupportedMintExtension))?;
        let types = state
            .get_extension_types()
            .map_err(|_| error!(CotError::UnsupportedMintExtension))?;
        for t in types {
            match t {
                ExtensionType::MetadataPointer | ExtensionType::TokenMetadata => {}
                _ => return err!(CotError::UnsupportedMintExtension),
            }
        }
    }
    Ok(())
}

pub fn initialize_handler(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
    check_mint(&ctx.accounts.mint)?;

    let config = &mut ctx.accounts.config;
    config.version = CONFIG_VERSION;
    config.bump = ctx.bumps.config;
    config.vault_authority_bump = ctx.bumps.vault_authority;
    config.rewards_vault_bump = ctx.bumps.rewards_vault;
    config.referral_vault_bump = ctx.bumps.referral_vault;
    config.events_vault_bump = ctx.bumps.events_vault;
    config.admin = params.admin;
    config.pending_admin = Pubkey::default();
    config.guardian = params.guardian;
    config.voucher_signer = params.voucher_signer;
    config.settler = params.settler;
    config.mint = ctx.accounts.mint.key();
    config.treasury = ctx.accounts.treasury.key();
    config.treasury_sol = params.treasury_sol;
    config.split_profiles = params.split_profiles;
    config.daily_claim_cap = params.daily_claim_cap;
    config.epoch_claim_cap = params.epoch_claim_cap;
    config.epoch_duration_secs = params.epoch_duration_secs;
    config.current_epoch = 0;
    config.epoch_claimed = 0;
    config.claim_tax = params.claim_tax;
    config.voucher_max_ttl_secs = params.voucher_max_ttl_secs;
    config.min_claim = params.min_claim;
    config.min_wallet_balance = params.min_wallet_balance;
    config.withdraw_fee_lamports = params.withdraw_fee_lamports;
    config.claim_cooldown_secs = params.claim_cooldown_secs;
    config.claim_max_fee_bps = params.claim_max_fee_bps;
    config.paused = false;
    config.validate()?;

    emit!(config_snapshot(config, true));
    Ok(())
}


pub(crate) fn config_snapshot(config: &Config, initial: bool) -> ConfigUpdated {
    ConfigUpdated {
        admin: config.admin,
        pending_admin: config.pending_admin,
        guardian: config.guardian,
        voucher_signer: config.voucher_signer,
        settler: config.settler,
        mint: config.mint,

        mint_decimals: MINT_DECIMALS,
        treasury: config.treasury,
        treasury_sol: config.treasury_sol,
        split_profiles: config.split_profiles,
        daily_claim_cap: config.daily_claim_cap,
        epoch_claim_cap: config.epoch_claim_cap,
        epoch_duration_secs: config.epoch_duration_secs,
        claim_tax: config.claim_tax,
        voucher_max_ttl_secs: config.voucher_max_ttl_secs,
        min_claim: config.min_claim,
        min_wallet_balance: config.min_wallet_balance,
        withdraw_fee_lamports: config.withdraw_fee_lamports,
        claim_cooldown_secs: config.claim_cooldown_secs,
        claim_max_fee_bps: config.claim_max_fee_bps,
        initial,
    }
}
