

























use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod math;
pub mod state;
pub mod token_ops;
pub mod voucher;

pub use instructions::*;
pub use state::SettleAmounts;
pub use voucher::ClaimVoucher;







#[cfg(feature = "devnet")]
declare_id!("9Ba34xzmNb9WP8YrhRi2brwnFJLdNsAZrQmgA6FRK5k4");
#[cfg(not(feature = "devnet"))]
declare_id!("AZkgkmGfmqLrLpKDrAjtJXrKt6LA8agJxU5PYSwRrAAv");
























#[cfg(not(feature = "no-entrypoint"))]
solana_security_txt::security_txt! {
    name: "Crypto of Thrones - cot_core",
    project_url: "https://cot.gg",


    contacts: "email:SET-AT-DEPLOY-security-mailbox",
    policy: "https://cot.gg/security",
    preferred_languages: "pt,en",
    encryption: "SET-AT-DEPLOY <URL of the PGP key, or delete this line>",
    source_code: "SET-AT-DEPLOY https://github.com/<public repository>",
    source_release: "SET-AT-DEPLOY <release tag>",
    source_revision: "SET-AT-DEPLOY <git commit of the verified build>",

    auditors: "SET-AT-DEPLOY https://cot.gg/wiki/security-and-audits#audit-report"
}

#[program]
pub mod cot_core {
    use super::*;




    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        initialize_handler(ctx, params)
    }



    pub fn update_config(ctx: Context<UpdateConfig>, params: UpdateConfigParams) -> Result<()> {
        update_config_handler(ctx, params)
    }


    pub fn accept_admin(ctx: Context<AcceptAdmin>) -> Result<()> {
        accept_admin_handler(ctx)
    }


    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        pause_handler(ctx)
    }


    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        unpause_handler(ctx)
    }


    pub fn init_player(ctx: Context<InitPlayer>) -> Result<()> {
        init_player_handler(ctx)
    }



    pub fn spend(ctx: Context<Spend>, amount: u64, kind: u8, order_seq: u64, profile: u8) -> Result<()> {
        spend_handler(ctx, amount, kind, order_seq, profile)
    }



    pub fn pay_sol(ctx: Context<PaySol>, kind: u8, order_seq: u64, lamports: u64) -> Result<()> {
        pay_sol_handler(ctx, kind, order_seq, lamports)
    }




    pub fn claim_with_voucher(ctx: Context<ClaimWithVoucher>, voucher: ClaimVoucher) -> Result<()> {
        claim_with_voucher_handler(ctx, voucher)
    }


    pub fn fund_vault(ctx: Context<FundVault>, amount: u64) -> Result<()> {
        fund_vault_handler(ctx, amount)
    }



    pub fn init_ledger_head(ctx: Context<InitLedgerHead>, caps: SettleAmounts) -> Result<()> {
        init_ledger_head_handler(ctx, caps)
    }



    pub fn set_settle_caps(ctx: Context<SetSettleCaps>, caps: SettleAmounts) -> Result<()> {
        set_settle_caps_handler(ctx, caps)
    }





    pub fn settle_epoch(ctx: Context<SettleEpoch>, args: SettleEpochArgs) -> Result<()> {
        settle_epoch_handler(ctx, args)
    }









    pub fn cancel_nonce(ctx: Context<CancelNonce>, voucher: ClaimVoucher) -> Result<()> {
        cancel_nonce_handler(ctx, voucher)
    }




    pub fn reanchor_ledger_head(ctx: Context<ReanchorLedgerHead>, args: ReanchorArgs) -> Result<()> {
        reanchor_ledger_head_handler(ctx, args)
    }
}
