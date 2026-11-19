

















#![cfg(feature = "test-sbf")]

use anchor_lang::prelude::Pubkey;
use anchor_lang::{AccountDeserialize, AnchorDeserialize, Discriminator, InstructionData, ToAccountMetas};
use ed25519_dalek::{Signer as DalekSigner, SigningKey};
use litesvm::LiteSVM;
use solana_account::Account;
use solana_address::Address;
use solana_clock::Clock;
use solana_instruction::{AccountMeta, Instruction};
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Transaction;

use cot_core::constants::*;
use cot_core::events::{
    Claimed, ConfigUpdated, EpochSettled, LedgerReanchored, NonceCancelled, SettleCapsUpdated, SolPaid, Spent,
};
use cot_core::instructions::settle::{epoch_hash, SettleEpochArgs};
use cot_core::state::{ClaimTax, Config, FeeSplit, LedgerHead, PlayerState, SettleAmounts};
use cot_core::voucher::{build_message, ClaimVoucher};

const TOKEN_PROGRAM: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SYSTEM_PROGRAM: &str = "11111111111111111111111111111111";
const ED25519_PROGRAM: &str = "Ed25519SigVerify111111111111111111111111111";
const DECIMALS: u8 = 6;
const ONE: u64 = 1_000_000;
const START_TS: i64 = 1_800_000_000;
const SOL: u64 = 1_000_000_000;


const STANDARD: u8 = 0;
const MARKET: u8 = 1;
const LOTTERY: u8 = 2;
const BURN: u8 = 3;
const UNUSED: u8 = 5;





fn to_addr(p: &Pubkey) -> Address {
    Address::new_from_array(p.to_bytes())
}
fn to_pk(a: &Address) -> Pubkey {
    Pubkey::new_from_array(a.to_bytes())
}
fn pk_of(k: &Keypair) -> Pubkey {
    to_pk(&k.pubkey())
}
fn addr(s: &str) -> Address {
    s.parse().unwrap()
}
fn pda(seeds: &[&[u8]]) -> Pubkey {
    Pubkey::find_program_address(seeds, &cot_core::ID).0
}

fn convert_metas(metas: Vec<anchor_lang::prelude::AccountMeta>) -> Vec<AccountMeta> {
    metas
        .into_iter()
        .map(|m| AccountMeta {
            pubkey: Address::new_from_array(m.pubkey.to_bytes()),
            is_signer: m.is_signer,
            is_writable: m.is_writable,
        })
        .collect()
}

fn ix(accounts: impl ToAccountMetas, data: impl InstructionData) -> Instruction {
    Instruction {
        program_id: to_addr(&cot_core::ID),
        accounts: convert_metas(accounts.to_account_metas(None)),
        data: data.data(),
    }
}






fn base64_decode(s: &str) -> Vec<u8> {
    fn val(c: u8) -> u32 {
        match c {
            b'A'..=b'Z' => (c - b'A') as u32,
            b'a'..=b'z' => (c - b'a' + 26) as u32,
            b'0'..=b'9' => (c - b'0' + 52) as u32,
            b'+' => 62,
            b'/' => 63,
            _ => panic!("bad base64 byte {c}"),
        }
    }
    let bytes: Vec<u8> = s.bytes().filter(|c| *c != b'=').collect();
    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    for chunk in bytes.chunks(4) {
        let mut acc = 0u32;
        for (i, c) in chunk.iter().enumerate() {
            acc |= val(*c) << (18 - 6 * i);
        }
        let n = chunk.len() * 6 / 8;
        for i in 0..n {
            out.push((acc >> (16 - 8 * i)) as u8);
        }
    }
    out
}


fn events<T: Discriminator + AnchorDeserialize>(logs: &[String]) -> Vec<T> {
    logs.iter()
        .filter_map(|l| l.strip_prefix("Program data: "))
        .map(base64_decode)
        .filter(|d| d.len() >= 8 && &d[..8] == T::DISCRIMINATOR)
        .map(|d| T::deserialize(&mut &d[8..]).expect("event layout"))
        .collect()
}





fn pack_mint(authority: &Pubkey, supply: u64) -> Vec<u8> {
    let mut d = vec![0u8; 82];
    d[0..4].copy_from_slice(&1u32.to_le_bytes());
    d[4..36].copy_from_slice(authority.as_ref());
    d[36..44].copy_from_slice(&supply.to_le_bytes());
    d[44] = DECIMALS;
    d[45] = 1;

    d
}

fn pack_token_account(mint: &Pubkey, owner: &Pubkey, amount: u64) -> Vec<u8> {
    let mut d = vec![0u8; 165];
    d[0..32].copy_from_slice(mint.as_ref());
    d[32..64].copy_from_slice(owner.as_ref());
    d[64..72].copy_from_slice(&amount.to_le_bytes());
    d[108] = 1;
    d
}

fn token_amount(svm: &LiteSVM, a: &Pubkey) -> u64 {
    let acc = svm.get_account(&to_addr(a)).expect("token account");
    u64::from_le_bytes(acc.data[64..72].try_into().unwrap())
}

fn token_owner(svm: &LiteSVM, a: &Pubkey) -> Pubkey {
    let acc = svm.get_account(&to_addr(a)).expect("token account");
    Pubkey::new_from_array(acc.data[32..64].try_into().unwrap())
}

fn mint_supply(svm: &LiteSVM, m: &Pubkey) -> u64 {
    let acc = svm.get_account(&to_addr(m)).expect("mint");
    u64::from_le_bytes(acc.data[36..44].try_into().unwrap())
}

fn lamports(svm: &LiteSVM, a: &Pubkey) -> u64 {
    svm.get_account(&to_addr(a)).map(|a| a.lamports).unwrap_or(0)
}

fn read<T: AccountDeserialize>(svm: &LiteSVM, a: &Pubkey) -> T {
    let acc = svm.get_account(&to_addr(a)).expect("account");
    T::try_deserialize(&mut acc.data.as_slice()).expect("deserialize")
}





struct Env {
    svm: LiteSVM,
    deployer: Keypair,
    admin: Keypair,
    guardian: Keypair,
    settler: Keypair,
    treasury_sol: Keypair,
    voucher_key: SigningKey,
    mint: Pubkey,
    treasury: Pubkey,
    config: Pubkey,
    vault_authority: Pubkey,
    rewards_vault: Pubkey,
    referral_vault: Pubkey,
    events_vault: Pubkey,
}

struct Player {
    kp: Keypair,
    token: Pubkey,
    state: Pubkey,
}

fn split(burn: u16, rewards: u16, treasury: u16, referral: u16, events: u16) -> FeeSplit {
    FeeSplit {
        burn_bps: burn,
        rewards_bps: rewards,
        treasury_bps: treasury,
        referral_bps: referral,
        events_bps: events,
    }
}




fn profiles() -> [FeeSplit; MAX_SPLIT_PROFILES] {
    let mut p = [FeeSplit::default(); MAX_SPLIT_PROFILES];
    p[STANDARD as usize] = split(2_000, 5_000, 1_500, 1_000, 500);
    p[MARKET as usize] = split(600, 8_800, 600, 0, 0);
    p[LOTTERY as usize] = split(0, 10_000, 0, 0, 0);
    p[BURN as usize] = split(10_000, 0, 0, 0, 0);
    p
}

fn default_params(env: &Env) -> cot_core::InitializeParams {
    cot_core::InitializeParams {
        admin: pk_of(&env.admin),
        guardian: pk_of(&env.guardian),
        voucher_signer: env.voucher_signer(),
        settler: pk_of(&env.settler),
        treasury_sol: pk_of(&env.treasury_sol),
        split_profiles: profiles(),
        daily_claim_cap: 1_000 * ONE,
        epoch_claim_cap: 5_000 * ONE,
        epoch_duration_secs: 86_400,

        claim_tax: ClaimTax {
            start_bps: 1_500,
            floor_bps: 300,
            decay_bps_per_day: 200,
        },
        voucher_max_ttl_secs: 600,
        min_claim: ONE,
        min_wallet_balance: 2_500 * ONE,
        withdraw_fee_lamports: SOL / 100,
        claim_cooldown_secs: 86_400,
        claim_max_fee_bps: 1_500,
    }
}

impl Env {

    fn send_logs(&mut self, ixs: &[Instruction], payer: &Keypair, extra: &[&Keypair]) -> Result<Vec<String>, String> {
        self.svm.expire_blockhash();
        let mut signers: Vec<&Keypair> = vec![payer];
        signers.extend_from_slice(extra);
        let tx = Transaction::new_signed_with_payer(
            ixs,
            Some(&payer.pubkey()),
            &signers,
            self.svm.latest_blockhash(),
        );
        self.svm
            .send_transaction(tx)
            .map(|m| m.logs)
            .map_err(|e| format!("{:?}\n{}", e.err, e.meta.logs.join("\n")))
    }

    fn send(&mut self, ixs: &[Instruction], payer: &Keypair, extra: &[&Keypair]) -> Result<(), String> {
        self.send_logs(ixs, payer, extra).map(|_| ())
    }

    fn now(&self) -> i64 {
        self.svm.get_sysvar::<Clock>().unix_timestamp
    }

    fn warp(&mut self, secs: i64) {
        let mut c = self.svm.get_sysvar::<Clock>();
        c.unix_timestamp += secs;
        c.slot += 1;
        self.svm.set_sysvar::<Clock>(&c);
    }

    fn set_token_account(&mut self, owner: &Pubkey, amount: u64) -> Pubkey {
        let key = Pubkey::new_unique();
        self.svm
            .set_account(
                to_addr(&key),
                Account {
                    lamports: 2_039_280,
                    data: pack_token_account(&self.mint, owner, amount),
                    owner: addr(TOKEN_PROGRAM),
                    executable: false,
                    rent_epoch: 0,
                },
            )
            .unwrap();
        key
    }


    fn deploy() -> Env {
        let mut svm = LiteSVM::new();
        let so = concat!(env!("CARGO_MANIFEST_DIR"), "/../target/deploy/cot_core.so");
        svm.add_program_from_file(to_addr(&cot_core::ID), so)
            .expect("build the program first: target/deploy/cot_core.so");

        let deployer = Keypair::new();
        let admin = Keypair::new();
        let guardian = Keypair::new();
        let settler = Keypair::new();
        let treasury_sol = Keypair::new();
        for k in [&deployer, &admin, &guardian, &settler, &treasury_sol] {
            svm.airdrop(&k.pubkey(), 100_000_000_000).unwrap();
        }



        let program = svm.get_account(&to_addr(&cot_core::ID)).unwrap();
        let programdata = Address::new_from_array(program.data[4..36].try_into().unwrap());
        let mut pd = svm.get_account(&programdata).unwrap();

        pd.data[12] = 1;
        pd.data[13..45].copy_from_slice(deployer.pubkey().as_ref());
        svm.set_account(programdata, pd).unwrap();

        let mut c = svm.get_sysvar::<Clock>();
        c.unix_timestamp = START_TS;
        svm.set_sysvar::<Clock>(&c);

        let mint = Pubkey::new_unique();
        svm.set_account(
            to_addr(&mint),
            Account {
                lamports: 1_461_600,
                data: pack_mint(&Pubkey::new_unique(), u64::MAX / 2),
                owner: addr(TOKEN_PROGRAM),
                executable: false,
                rent_epoch: 0,
            },
        )
        .unwrap();

        let voucher_key = SigningKey::from_bytes(&[7u8; 32]);
        let mut env = Env {
            svm,
            deployer,
            admin,
            guardian,
            settler,
            treasury_sol,
            voucher_key,
            mint,
            treasury: Pubkey::default(),
            config: pda(&[CONFIG_SEED]),
            vault_authority: pda(&[VAULT_AUTHORITY_SEED]),
            rewards_vault: pda(&[REWARDS_VAULT_SEED]),
            referral_vault: pda(&[REFERRAL_VAULT_SEED]),
            events_vault: pda(&[EVENTS_VAULT_SEED]),
        };
        let admin_pk = pk_of(&env.admin);
        env.treasury = env.set_token_account(&admin_pk, 0);
        env
    }

    fn voucher_signer(&self) -> Pubkey {
        Pubkey::new_from_array(self.voucher_key.verifying_key().to_bytes())
    }

    fn initialize_ix(&self, authority: &Pubkey, params: cot_core::InitializeParams) -> Instruction {
        let program = svm_programdata(&self.svm);
        ix(
            cot_core::accounts::Initialize {
                authority: *authority,
                config: self.config,
                vault_authority: self.vault_authority,
                mint: self.mint,
                rewards_vault: self.rewards_vault,
                referral_vault: self.referral_vault,
                events_vault: self.events_vault,
                treasury: self.treasury,
                program: cot_core::ID,
                program_data: program,
                token_program: to_pk(&addr(TOKEN_PROGRAM)),
                system_program: to_pk(&addr(SYSTEM_PROGRAM)),
            },
            cot_core::instruction::Initialize { params },
        )
    }


    fn initialize(&mut self, params: cot_core::InitializeParams) -> Result<Vec<String>, String> {
        let deployer = self.deployer.insecure_clone();
        let i = self.initialize_ix(&pk_of(&deployer), params);
        self.send_logs(&[i], &deployer, &[])
    }



    fn ready() -> Env {
        let mut env = Env::deploy();
        let params = default_params(&env);
        env.initialize(params).expect("initialize");

        let admin = env.admin.insecure_clone();
        let funder_token = env.set_token_account(&pk_of(&admin), 1_000_000 * ONE);
        let f = ix(
            cot_core::accounts::FundVault {
                funder: pk_of(&admin),
                config: env.config,
                mint: env.mint,
                funder_token,
                rewards_vault: env.rewards_vault,
                token_program: to_pk(&addr(TOKEN_PROGRAM)),
            },
            cot_core::instruction::FundVault { amount: 100_000 * ONE },
        );
        env.send(&[f], &admin, &[]).expect("fund vault");
        env
    }

    fn new_player(&mut self) -> Player {
        let kp = Keypair::new();
        self.svm.airdrop(&kp.pubkey(), 10_000_000_000).unwrap();
        let p = pk_of(&kp);
        let token = self.set_token_account(&p, 100_000 * ONE);
        let state = pda(&[PLAYER_SEED, p.as_ref()]);
        let i = ix(
            cot_core::accounts::InitPlayer {
                player: p,
                player_state: state,
                system_program: to_pk(&addr(SYSTEM_PROGRAM)),
            },
            cot_core::instruction::InitPlayer {},
        );
        self.send(&[i], &kp, &[]).expect("init player");
        Player { kp, token, state }
    }

    fn next_seq(&self, player: &Player) -> u64 {
        let ps: PlayerState = read(&self.svm, &player.state);
        ps.last_order_seq + 1
    }

    fn spend_ix(&self, player: &Player, amount: u64, order_seq: u64, profile: u8) -> Instruction {
        ix(
            cot_core::accounts::Spend {
                player: pk_of(&player.kp),
                config: self.config,
                player_state: player.state,
                mint: self.mint,
                player_token: player.token,
                vault_authority: self.vault_authority,
                rewards_vault: self.rewards_vault,
                referral_vault: self.referral_vault,
                events_vault: self.events_vault,
                treasury: self.treasury,
                token_program: to_pk(&addr(TOKEN_PROGRAM)),
            },
            cot_core::instruction::Spend { amount, kind: 1, order_seq, profile },
        )
    }

    fn spend_with(&mut self, player: &Player, amount: u64, order_seq: u64, profile: u8) -> Result<Vec<String>, String> {
        let i = self.spend_ix(player, amount, order_seq, profile);
        let kp = player.kp.insecure_clone();
        self.send_logs(&[i], &kp, &[])
    }


    fn spend(&mut self, player: &Player, amount: u64) -> Result<(), String> {
        let seq = self.next_seq(player);
        self.spend_with(player, amount, seq, STANDARD).map(|_| ())
    }

    fn pay_sol_ix(&self, player: &Player, order_seq: u64, lamports: u64, treasury_sol: Pubkey) -> Instruction {
        ix(
            cot_core::accounts::PaySol {
                player: pk_of(&player.kp),
                config: self.config,
                player_state: player.state,
                treasury_sol,
                system_program: to_pk(&addr(SYSTEM_PROGRAM)),
            },
            cot_core::instruction::PaySol { kind: 7, order_seq, lamports },
        )
    }

    fn pay_sol(&mut self, player: &Player, order_seq: u64, lamports: u64) -> Result<Vec<String>, String> {
        let i = self.pay_sol_ix(player, order_seq, lamports, pk_of(&self.treasury_sol));
        let kp = player.kp.insecure_clone();
        self.send_logs(&[i], &kp, &[])
    }


    fn ed25519_ix(key: &SigningKey, msg: &[u8]) -> Instruction {
        let pk = key.verifying_key().to_bytes();
        let sig = key.sign(msg).to_bytes();
        let mut data = vec![1u8, 0u8];
        for v in [48u16, u16::MAX, 16, u16::MAX, 112, msg.len() as u16, u16::MAX] {
            data.extend_from_slice(&v.to_le_bytes());
        }
        data.extend_from_slice(&pk);
        data.extend_from_slice(&sig);
        data.extend_from_slice(msg);
        Instruction {
            program_id: addr(ED25519_PROGRAM),
            accounts: vec![],
            data,
        }
    }



    fn voucher(&self, amount: u64, nonce: u64) -> ClaimVoucher {
        ClaimVoucher {
            amount,
            fee: amount * 3 / 100,
            lots_hash: [0x11; 32],
            ledger_ref: [0x22; 32],
            nonce,
            expiry: self.now() + 300,
        }
    }

    fn claim_ix(&self, player: &Player, voucher: ClaimVoucher) -> Instruction {
        ix(
            cot_core::accounts::ClaimWithVoucher {
                player: pk_of(&player.kp),
                config: self.config,
                player_state: player.state,
                mint: self.mint,
                player_token: player.token,
                vault_authority: self.vault_authority,
                rewards_vault: self.rewards_vault,
                treasury_sol: pk_of(&self.treasury_sol),
                instructions_sysvar: to_pk(&addr("Sysvar1nstructions1111111111111111111111111")),
                token_program: to_pk(&addr(TOKEN_PROGRAM)),
                system_program: to_pk(&addr(SYSTEM_PROGRAM)),
            },
            cot_core::instruction::ClaimWithVoucher { voucher },
        )
    }



    fn claim_ixs(&self, player: &Player, signed: &ClaimVoucher, sent: ClaimVoucher) -> [Instruction; 2] {
        let msg = build_message(&cot_core::ID, &pk_of(&player.kp), signed);
        [Self::ed25519_ix(&self.voucher_key, &msg), self.claim_ix(player, sent)]
    }


    fn claim_with(&mut self, player: &Player, voucher: ClaimVoucher) -> Result<Vec<String>, String> {
        let ixs = self.claim_ixs(player, &voucher, voucher);
        let kp = player.kp.insecure_clone();
        self.send_logs(&ixs, &kp, &[])
    }


    fn claim(&mut self, player: &Player, amount: u64, nonce: u64) -> Result<(), String> {
        let v = self.voucher(amount, nonce);
        self.claim_with(player, v).map(|_| ())
    }

    fn pause(&mut self, by: &Keypair) -> Result<(), String> {
        let i = ix(
            cot_core::accounts::Pause {
                authority: pk_of(by),
                config: self.config,
            },
            cot_core::instruction::Pause {},
        );
        self.send(&[i], by, &[])
    }

    fn unpause(&mut self, by: &Keypair) -> Result<(), String> {
        let i = ix(
            cot_core::accounts::Unpause {
                admin: pk_of(by),
                config: self.config,
            },
            cot_core::instruction::Unpause {},
        );
        self.send(&[i], by, &[])
    }

    fn update_config(&mut self, by: &Keypair, params: cot_core::UpdateConfigParams) -> Result<(), String> {
        let i = ix(
            cot_core::accounts::UpdateConfig {
                admin: pk_of(by),
                config: self.config,
                mint: self.mint,
                new_treasury: None,
                token_program: to_pk(&addr(TOKEN_PROGRAM)),
            },
            cot_core::instruction::UpdateConfig { params },
        );
        self.send(&[i], by, &[])
    }
}

fn svm_programdata(svm: &LiteSVM) -> Pubkey {
    let program = svm.get_account(&to_addr(&cot_core::ID)).unwrap();
    Pubkey::new_from_array(program.data[4..36].try_into().unwrap())
}

#[track_caller]
fn expect_err<T>(r: Result<T, String>, needle: &str) {
    match r {
        Ok(_) => panic!("expected failure containing {needle:?}, got success"),
        Err(e) => assert!(e.contains(needle), "expected {needle:?} in:\n{e}"),
    }
}





#[test]
fn initialize_only_by_upgrade_authority_and_only_once() {
    let mut env = Env::deploy();
    let params = default_params(&env);


    let attacker = Keypair::new();
    env.svm.airdrop(&attacker.pubkey(), 10_000_000_000).unwrap();
    let i = env.initialize_ix(&pk_of(&attacker), params.clone());
    expect_err(env.send(&[i], &attacker, &[]), "NotUpgradeAuthority");

    let logs = env.initialize(params.clone()).unwrap();
    let cfg: Config = read(&env.svm, &env.config);
    assert_eq!(cfg.version, CONFIG_VERSION);
    assert_eq!(cfg.admin, pk_of(&env.admin));
    assert_eq!(cfg.settler, pk_of(&env.settler));
    assert_eq!(cfg.treasury_sol, pk_of(&env.treasury_sol));
    assert_eq!(cfg.split_profiles, profiles());
    assert_eq!(cfg.split_profiles[0].total_bps(), 10_000);
    assert_eq!(cfg.withdraw_fee_lamports, SOL / 100);
    assert_eq!(cfg.claim_cooldown_secs, 86_400);
    assert_eq!(cfg.claim_max_fee_bps, 1_500);
    assert_eq!(cfg.min_claim, ONE);
    assert_eq!(cfg.min_wallet_balance, 2_500 * ONE);


    for v in [env.rewards_vault, env.referral_vault, env.events_vault] {
        assert_eq!(token_owner(&env.svm, &v), env.vault_authority);
        assert_eq!(token_amount(&env.svm, &v), 0);
    }


    let ev = events::<ConfigUpdated>(&logs);
    assert_eq!(ev.len(), 1);
    assert!(ev[0].initial);
    assert_eq!(ev[0].mint_decimals, MINT_DECIMALS);
    assert_eq!(ev[0].split_profiles, profiles());
    assert_eq!(ev[0].settler, pk_of(&env.settler));
    assert_eq!(ev[0].treasury_sol, pk_of(&env.treasury_sol));
    assert_eq!(ev[0].withdraw_fee_lamports, SOL / 100);


    expect_err(env.initialize(params), "already in use");
}

#[test]
fn initialize_rejects_bad_split_profiles() {
    let mut env = Env::deploy();


    let mut params = default_params(&env);
    params.split_profiles[0].burn_bps = 1_999;
    expect_err(env.initialize(params), "FeeSplitNotFullBps");


    let mut params = default_params(&env);
    params.split_profiles[6] = split(100, 0, 0, 0, 0);
    expect_err(env.initialize(params), "FeeSplitNotFullBps");


    let mut params = default_params(&env);
    params.split_profiles[0] = FeeSplit::default();
    expect_err(env.initialize(params), "InvalidSplitProfile");
}

#[test]
fn initialize_rejects_wrong_mint_decimals() {
    let mut env = Env::deploy();


    let mut mint = env.svm.get_account(&to_addr(&env.mint)).unwrap();
    mint.data[44] = 9;
    env.svm.set_account(to_addr(&env.mint), mint).unwrap();
    let params = default_params(&env);
    expect_err(env.initialize(params), "MintDecimalsMismatch");
}

#[test]
fn initialize_rejects_mint_with_freeze_authority() {
    let mut env = Env::deploy();
    let mut mint = env.svm.get_account(&to_addr(&env.mint)).unwrap();
    mint.data[46..50].copy_from_slice(&1u32.to_le_bytes());
    mint.data[50..82].copy_from_slice(Pubkey::new_unique().as_ref());
    env.svm.set_account(to_addr(&env.mint), mint).unwrap();
    let params = default_params(&env);
    expect_err(env.initialize(params), "MintHasFreezeAuthority");
}

#[test]
fn initialize_bounds_withdrawal_rules_and_new_keys() {
    let mut env = Env::deploy();
    let cases: Vec<(Box<dyn Fn(&mut cot_core::InitializeParams)>, &str)> = vec![
        (Box::new(|p| p.withdraw_fee_lamports = MAX_WITHDRAW_FEE_LAMPORTS + 1), "WithdrawFeeOutOfBounds"),
        (Box::new(|p| p.claim_cooldown_secs = MAX_CLAIM_COOLDOWN_SECS + 1), "ClaimCooldownOutOfBounds"),
        (Box::new(|p| p.claim_cooldown_secs = -1), "ClaimCooldownOutOfBounds"),
        (Box::new(|p| p.claim_max_fee_bps = MAX_CLAIM_FEE_BPS + 1), "ClaimFeeBoundsOutOfBounds"),

        (Box::new(|p| p.claim_max_fee_bps = 299), "ClaimFeeBoundsOutOfBounds"),
        (Box::new(|p| p.min_claim = 0), "InvalidMinClaim"),
        (Box::new(|p| p.min_claim = p.daily_claim_cap + 1), "InvalidMinClaim"),
        (Box::new(|p| p.settler = Pubkey::default()), "ZeroKey"),
        (Box::new(|p| p.treasury_sol = Pubkey::default()), "ZeroKey"),
    ];
    for (edit, needle) in cases {
        let mut params = default_params(&env);
        edit(&mut params);
        expect_err(env.initialize(params), needle);
    }

    let mut params = default_params(&env);
    params.withdraw_fee_lamports = MAX_WITHDRAW_FEE_LAMPORTS;
    params.claim_cooldown_secs = MAX_CLAIM_COOLDOWN_SECS;
    params.claim_max_fee_bps = MAX_CLAIM_FEE_BPS;
    env.initialize(params).unwrap();
}





#[test]
fn update_config_admin_only_and_bounded() {
    let mut env = Env::ready();
    let guardian = env.guardian.insecure_clone();
    let admin = env.admin.insecure_clone();

    expect_err(
        env.update_config(&guardian, cot_core::UpdateConfigParams { daily_claim_cap: Some(1), ..Default::default() }),
        "NotAdmin",
    );
    expect_err(
        env.update_config(
            &admin,
            cot_core::UpdateConfigParams {
                claim_tax: Some(ClaimTax { start_bps: 3_001, floor_bps: 400, decay_bps_per_day: 200 }),
                ..Default::default()
            },
        ),
        "ClaimTaxOutOfBounds",
    );
    let mut bad = profiles();
    bad[MARKET as usize].burn_bps = 601;
    expect_err(
        env.update_config(&admin, cot_core::UpdateConfigParams { split_profiles: Some(bad), ..Default::default() }),
        "FeeSplitNotFullBps",
    );
    expect_err(
        env.update_config(
            &admin,
            cot_core::UpdateConfigParams { daily_claim_cap: Some(10_000 * ONE), ..Default::default() },
        ),
        "InvalidClaimCaps",
    );
    expect_err(
        env.update_config(
            &admin,
            cot_core::UpdateConfigParams { withdraw_fee_lamports: Some(MAX_WITHDRAW_FEE_LAMPORTS + 1), ..Default::default() },
        ),
        "WithdrawFeeOutOfBounds",
    );
    expect_err(
        env.update_config(&admin, cot_core::UpdateConfigParams { settler: Some(Pubkey::default()), ..Default::default() }),
        "ZeroKey",
    );

    expect_err(
        env.update_config(&admin, cot_core::UpdateConfigParams { min_claim: Some(1_001 * ONE), ..Default::default() }),
        "InvalidMinClaim",
    );

    let new_settler = Pubkey::new_unique();
    let mut table = profiles();
    table[4] = split(0, 10_000, 0, 0, 0);
    env.update_config(
        &admin,
        cot_core::UpdateConfigParams {
            daily_claim_cap: Some(500 * ONE),
            settler: Some(new_settler),
            split_profiles: Some(table),
            withdraw_fee_lamports: Some(SOL / 50),
            claim_cooldown_secs: Some(12 * 3_600),
            claim_max_fee_bps: Some(1_300),
            min_wallet_balance: Some(0),
            ..Default::default()
        },
    )
    .unwrap();
    let cfg: Config = read(&env.svm, &env.config);
    assert_eq!(cfg.daily_claim_cap, 500 * ONE);
    assert_eq!(cfg.settler, new_settler);
    assert_eq!(cfg.split_profiles, table);
    assert_eq!(cfg.withdraw_fee_lamports, SOL / 50);
    assert_eq!(cfg.claim_cooldown_secs, 12 * 3_600);
    assert_eq!(cfg.claim_max_fee_bps, 1_300);
    assert_eq!(cfg.min_wallet_balance, 0);
}

#[test]
fn guardian_pauses_only_admin_unpauses() {
    let mut env = Env::ready();
    let guardian = env.guardian.insecure_clone();
    let admin = env.admin.insecure_clone();
    let p = env.new_player();

    env.pause(&guardian).unwrap();
    expect_err(env.pause(&guardian), "AlreadyPaused");
    expect_err(env.spend(&p, 10 * ONE), "Paused");
    expect_err(env.pay_sol(&p, 1, SOL / 10), "Paused");
    expect_err(env.claim(&p, 10 * ONE, 1), "Paused");
    expect_err(env.unpause(&guardian), "NotAdmin");
    env.unpause(&admin).unwrap();
    expect_err(env.unpause(&admin), "NotPaused");
    env.spend(&p, 10 * ONE).unwrap();
    env.pay_sol(&p, 2, SOL / 10).unwrap();
}

#[test]
fn pause_does_not_block_vault_funding() {
    let mut env = Env::ready();
    let guardian = env.guardian.insecure_clone();
    let admin = env.admin.insecure_clone();
    env.pause(&guardian).unwrap();

    let funder_token = env.set_token_account(&pk_of(&admin), 10 * ONE);
    let vault0 = token_amount(&env.svm, &env.rewards_vault);
    let f = ix(
        cot_core::accounts::FundVault {
            funder: pk_of(&admin),
            config: env.config,
            mint: env.mint,
            funder_token,
            rewards_vault: env.rewards_vault,
            token_program: to_pk(&addr(TOKEN_PROGRAM)),
        },
        cot_core::instruction::FundVault { amount: 10 * ONE },
    );
    env.send(&[f], &admin, &[]).unwrap();
    assert_eq!(token_amount(&env.svm, &env.rewards_vault), vault0 + 10 * ONE);
}





#[test]
fn spend_standard_profile_follows_data_js_split() {
    let mut env = Env::ready();
    let p = env.new_player();

    let amount = 1_000 * ONE;
    let supply0 = mint_supply(&env.svm, &env.mint);
    let vault0 = token_amount(&env.svm, &env.rewards_vault);
    let treasury0 = token_amount(&env.svm, &env.treasury);
    let player0 = token_amount(&env.svm, &p.token);

    let logs = env.spend_with(&p, amount, 1, STANDARD).unwrap();

    assert_eq!(token_amount(&env.svm, &p.token), player0 - amount);
    assert_eq!(mint_supply(&env.svm, &env.mint), supply0 - 200 * ONE, "20% burned");
    assert_eq!(token_amount(&env.svm, &env.rewards_vault), vault0 + 500 * ONE, "50% stays");
    assert_eq!(token_amount(&env.svm, &env.treasury), treasury0 + 150 * ONE, "15% treasury");
    assert_eq!(token_amount(&env.svm, &env.referral_vault), 100 * ONE, "10% invites vault");

    assert_eq!(token_amount(&env.svm, &env.events_vault), 50 * ONE, "5% events vault");

    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!(ps.last_order_seq, 1);
    assert_eq!(ps.total_spent, amount);
    let cfg: Config = read(&env.svm, &env.config);
    assert_eq!(cfg.total_spent, amount);
    assert_eq!(cfg.total_burned, 200 * ONE);

    let ev = events::<Spent>(&logs);
    assert_eq!(ev.len(), 1);
    let e = &ev[0];
    assert_eq!(e.player, pk_of(&p.kp));
    assert_eq!((e.kind, e.profile, e.order_seq, e.amount), (1, STANDARD, 1, amount));
    assert_eq!(
        (e.burned, e.to_rewards, e.to_treasury, e.to_referral, e.to_events),
        (200 * ONE, 500 * ONE, 150 * ONE, 100 * ONE, 50 * ONE)
    );
}

#[test]
fn spend_other_profiles_route_as_configured() {
    let mut env = Env::ready();
    let p = env.new_player();
    let amount = 100 * ONE;


    let supply0 = mint_supply(&env.svm, &env.mint);
    let vault0 = token_amount(&env.svm, &env.rewards_vault);
    let treasury0 = token_amount(&env.svm, &env.treasury);
    env.spend_with(&p, amount, 1, MARKET).unwrap();
    assert_eq!(mint_supply(&env.svm, &env.mint), supply0 - 6 * ONE);
    assert_eq!(token_amount(&env.svm, &env.treasury), treasury0 + 6 * ONE);
    assert_eq!(token_amount(&env.svm, &env.rewards_vault), vault0 + 88 * ONE);
    assert_eq!(token_amount(&env.svm, &env.referral_vault), 0);
    assert_eq!(token_amount(&env.svm, &env.events_vault), 0);


    let supply0 = mint_supply(&env.svm, &env.mint);
    let vault0 = token_amount(&env.svm, &env.rewards_vault);
    let logs = env.spend_with(&p, amount, 2, LOTTERY).unwrap();
    assert_eq!(mint_supply(&env.svm, &env.mint), supply0);
    assert_eq!(token_amount(&env.svm, &env.rewards_vault), vault0 + amount);
    assert_eq!(events::<Spent>(&logs)[0].profile, LOTTERY);


    let supply0 = mint_supply(&env.svm, &env.mint);
    let vault0 = token_amount(&env.svm, &env.rewards_vault);
    env.spend_with(&p, amount, 3, BURN).unwrap();
    assert_eq!(mint_supply(&env.svm, &env.mint), supply0 - amount);
    assert_eq!(token_amount(&env.svm, &env.rewards_vault), vault0);


    expect_err(env.spend_with(&p, amount, 4, UNUSED), "InvalidSplitProfile");
    expect_err(env.spend_with(&p, amount, 4, MAX_SPLIT_PROFILES as u8), "InvalidSplitProfile");
    expect_err(env.spend_with(&p, amount, 4, u8::MAX), "InvalidSplitProfile");
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!(ps.last_order_seq, 3);
}

#[test]
fn spend_order_seq_is_strictly_increasing() {
    let mut env = Env::ready();
    let p = env.new_player();

    expect_err(env.spend_with(&p, ONE, 0, STANDARD), "OrderSeqNotIncreasing");
    env.spend_with(&p, ONE, 5, STANDARD).unwrap();

    expect_err(env.spend_with(&p, ONE, 5, STANDARD), "OrderSeqNotIncreasing");
    expect_err(env.spend_with(&p, ONE, 4, STANDARD), "OrderSeqNotIncreasing");

    env.spend_with(&p, ONE, 9, STANDARD).unwrap();

    let q = env.new_player();
    env.spend_with(&q, ONE, 1, STANDARD).unwrap();
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!(ps.last_order_seq, 9);
}

#[test]
fn spend_rejects_zero_amount_and_substituted_accounts() {
    let mut env = Env::ready();
    let p = env.new_player();
    let other = env.new_player();
    let kp = p.kp.insecure_clone();
    expect_err(env.spend_with(&p, 0, 1, STANDARD), "ZeroAmount");


    let va = env.vault_authority;
    let fake = env.set_token_account(&va, 0);
    for slot in [7usize, 8] {
        let mut i = env.spend_ix(&p, ONE, 1, STANDARD);
        i.accounts[slot].pubkey = to_addr(&fake);
        expect_err(env.send(&[i], &kp, &[]), "ConstraintSeeds");
    }


    let mut i = env.spend_ix(&p, ONE, 1, STANDARD);
    i.accounts[4].pubkey = to_addr(&other.token);
    expect_err(env.send(&[i], &kp, &[]), "ConstraintTokenOwner");


    let mut i = env.spend_ix(&p, ONE, 1, STANDARD);
    i.accounts[2].pubkey = to_addr(&other.state);
    expect_err(env.send(&[i], &kp, &[]), "ConstraintSeeds");


    let fake_treasury = env.set_token_account(&pk_of(&kp), 0);
    let mut i = env.spend_ix(&p, ONE, 1, STANDARD);
    i.accounts[9].pubkey = to_addr(&fake_treasury);
    expect_err(env.send(&[i], &kp, &[]), "ConstraintHasOne");

    env.spend_with(&p, ONE, 1, STANDARD).unwrap();
}





#[test]
fn pay_sol_moves_lamports_to_the_sol_treasury() {
    let mut env = Env::ready();
    let p = env.new_player();
    let t = pk_of(&env.treasury_sol);
    let t0 = lamports(&env.svm, &t);
    let price = SOL / 5;

    let logs = env.pay_sol(&p, 1, price).unwrap();
    assert_eq!(lamports(&env.svm, &t), t0 + price);
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_order_seq, ps.total_sol_paid), (1, price));
    let cfg: Config = read(&env.svm, &env.config);
    assert_eq!(cfg.total_sol_paid, price);

    let ev = events::<SolPaid>(&logs);
    assert_eq!(ev.len(), 1);
    assert_eq!(ev[0].player, pk_of(&p.kp));
    assert_eq!((ev[0].kind, ev[0].order_seq, ev[0].lamports), (7, 1, price));
    assert_eq!(ev[0].treasury_sol, t);

    expect_err(env.pay_sol(&p, 2, 0), "ZeroAmount");
}

#[test]
fn pay_sol_and_spend_share_one_order_counter() {
    let mut env = Env::ready();
    let p = env.new_player();
    env.spend_with(&p, ONE, 1, STANDARD).unwrap();

    expect_err(env.pay_sol(&p, 1, SOL / 100), "OrderSeqNotIncreasing");
    env.pay_sol(&p, 2, SOL / 100).unwrap();
    expect_err(env.pay_sol(&p, 2, SOL / 100), "OrderSeqNotIncreasing");
    expect_err(env.spend_with(&p, ONE, 2, STANDARD), "OrderSeqNotIncreasing");
    env.spend_with(&p, ONE, 3, STANDARD).unwrap();
}

#[test]
fn pay_sol_only_reaches_the_configured_treasury() {
    let mut env = Env::ready();
    let admin = env.admin.insecure_clone();
    let p = env.new_player();
    let kp = p.kp.insecure_clone();


    let thief = Keypair::new();
    env.svm.airdrop(&thief.pubkey(), SOL).unwrap();
    let i = env.pay_sol_ix(&p, 1, SOL / 10, pk_of(&thief));
    expect_err(env.send(&[i], &kp, &[]), "ConstraintHasOne");


    let other = env.new_player();
    let mut i = env.pay_sol_ix(&p, 1, SOL / 10, pk_of(&env.treasury_sol));
    i.accounts[2].pubkey = to_addr(&other.state);
    expect_err(env.send(&[i], &kp, &[]), "ConstraintSeeds");


    let new_t = Keypair::new();
    env.svm.airdrop(&new_t.pubkey(), SOL).unwrap();
    env.update_config(&admin, cot_core::UpdateConfigParams { treasury_sol: Some(pk_of(&new_t)), ..Default::default() })
        .unwrap();
    expect_err(env.pay_sol(&p, 1, SOL / 10), "ConstraintHasOne");
    let before = lamports(&env.svm, &pk_of(&new_t));
    let i = env.pay_sol_ix(&p, 1, SOL / 10, pk_of(&new_t));
    env.send(&[i], &kp, &[]).unwrap();
    assert_eq!(lamports(&env.svm, &pk_of(&new_t)), before + SOL / 10);
}

#[test]
fn pay_sol_needs_a_registered_player() {
    let mut env = Env::ready();
    let kp = Keypair::new();
    env.svm.airdrop(&kp.pubkey(), SOL).unwrap();
    let i = ix(
        cot_core::accounts::PaySol {
            player: pk_of(&kp),
            config: env.config,
            player_state: pda(&[PLAYER_SEED, pk_of(&kp).as_ref()]),
            treasury_sol: pk_of(&env.treasury_sol),
            system_program: to_pk(&addr(SYSTEM_PROGRAM)),
        },
        cot_core::instruction::PaySol { kind: 7, order_seq: 1, lamports: SOL / 10 },
    );
    expect_err(env.send(&[i], &kp, &[]), "AccountNotInitialized");
}





#[test]
fn claim_pays_net_of_lot_fee_charges_sol_and_emits_event() {
    let mut env = Env::ready();
    let p = env.new_player();
    let t = pk_of(&env.treasury_sol);
    let (tok0, vault0, t0, sol0) = (
        token_amount(&env.svm, &p.token),
        token_amount(&env.svm, &env.rewards_vault),
        lamports(&env.svm, &t),
        lamports(&env.svm, &pk_of(&p.kp)),
    );



    let v = ClaimVoucher { fee: 10_500_000, ..env.voucher(110 * ONE, 1) };
    let logs = env.claim_with(&p, v).unwrap();
    let net = 110 * ONE - 10_500_000;
    assert_eq!(token_amount(&env.svm, &p.token), tok0 + net);

    assert_eq!(token_amount(&env.svm, &env.rewards_vault), vault0 - net);

    assert_eq!(lamports(&env.svm, &t), t0 + SOL / 100);
    assert!(lamports(&env.svm, &pk_of(&p.kp)) <= sol0 - SOL / 100);

    let ev = events::<Claimed>(&logs);
    assert_eq!(ev.len(), 1);
    let e = &ev[0];
    assert_eq!(e.player, pk_of(&p.kp));
    assert_eq!((e.gross, e.fee, e.net), (110 * ONE, 10_500_000, net));
    assert_eq!((e.lots_hash, e.ledger_ref), (v.lots_hash, v.ledger_ref));
    assert_eq!((e.nonce, e.sol_fee_lamports), (1, SOL / 100));
    assert_eq!(e.day, (env.now() / 86_400) as u64);

    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_nonce, ps.last_claim_ts, ps.claimed_today), (1, env.now(), 110 * ONE));
    assert_eq!((ps.total_claimed, ps.total_sol_paid), (net, SOL / 100));
    let cfg: Config = read(&env.svm, &env.config);
    assert_eq!((cfg.total_claimed, cfg.total_claim_tax, cfg.total_sol_paid), (net, 10_500_000, SOL / 100));


    expect_err(env.claim_with(&p, v), "NonceNotIncreasing");
}

#[test]
fn claim_fee_must_lie_between_floor_and_ceiling() {
    let mut env = Env::ready();
    let p = env.new_player();
    let gross = 100 * ONE;


    let v = ClaimVoucher { fee: 15 * ONE + 1, ..env.voucher(gross, 1) };
    expect_err(env.claim_with(&p, v), "ClaimFeeAboveMax");

    let v = ClaimVoucher { fee: 3 * ONE - CLAIM_FEE_FLOOR_SLACK - 1, ..env.voucher(gross, 1) };
    expect_err(env.claim_with(&p, v), "ClaimFeeBelowFloor");
    let v = ClaimVoucher { fee: 0, ..env.voucher(gross, 1) };
    expect_err(env.claim_with(&p, v), "ClaimFeeBelowFloor");


    let v = ClaimVoucher { fee: 15 * ONE, ..env.voucher(gross, 1) };
    let before = token_amount(&env.svm, &p.token);
    env.claim_with(&p, v).unwrap();
    assert_eq!(token_amount(&env.svm, &p.token), before + 85 * ONE);


    env.warp(86_400);
    let v = ClaimVoucher { fee: 3 * ONE - CLAIM_FEE_FLOOR_SLACK, ..env.voucher(gross, 2) };
    env.claim_with(&p, v).unwrap();


    let admin = env.admin.insecure_clone();
    env.update_config(&admin, cot_core::UpdateConfigParams { claim_max_fee_bps: Some(1_000), ..Default::default() })
        .unwrap();
    env.warp(86_400);
    let v = ClaimVoucher { fee: 10 * ONE + 1, ..env.voucher(gross, 3) };
    expect_err(env.claim_with(&p, v), "ClaimFeeAboveMax");
}

#[test]
fn claim_enforces_minimum_and_lots_hash() {
    let mut env = Env::ready();
    let admin = env.admin.insecure_clone();
    let p = env.new_player();
    env.update_config(&admin, cot_core::UpdateConfigParams { min_claim: Some(100 * ONE), ..Default::default() })
        .unwrap();

    expect_err(env.claim(&p, 100 * ONE - 1, 1), "ClaimBelowMinimum");
    let v = ClaimVoucher { lots_hash: [0; 32], ..env.voucher(100 * ONE, 1) };
    expect_err(env.claim_with(&p, v), "MissingLotsHash");
    env.claim(&p, 100 * ONE, 1).unwrap();
}

#[test]
fn claim_once_per_cooldown() {
    let mut env = Env::ready();
    let p = env.new_player();
    env.claim(&p, 10 * ONE, 1).unwrap();
    let first = env.now();


    expect_err(env.claim(&p, 10 * ONE, 2), "ClaimCooldownActive");
    env.warp(86_400 - 1);
    expect_err(env.claim(&p, 10 * ONE, 2), "ClaimCooldownActive");

    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_claim_ts, ps.last_nonce), (first, 1));
    env.warp(1);
    env.claim(&p, 10 * ONE, 2).unwrap();
}

#[test]
fn claim_requires_minimum_wallet_balance() {
    let mut env = Env::ready();
    let p = env.new_player();
    let owner = pk_of(&p.kp);

    let low = Player { kp: p.kp.insecure_clone(), token: env.set_token_account(&owner, 2_500 * ONE - 1), state: p.state };
    expect_err(env.claim(&low, 10 * ONE, 1), "WalletBalanceTooLow");

    let exact = Player { kp: p.kp.insecure_clone(), token: env.set_token_account(&owner, 2_500 * ONE), state: p.state };
    env.claim(&exact, 10 * ONE, 1).unwrap();
}

#[test]
fn claim_sol_fee_only_reaches_the_configured_treasury() {
    let mut env = Env::ready();
    let admin = env.admin.insecure_clone();
    let p = env.new_player();
    let kp = p.kp.insecure_clone();


    let thief = Keypair::new();
    env.svm.airdrop(&thief.pubkey(), SOL).unwrap();
    let v = env.voucher(10 * ONE, 1);
    let mut ixs = env.claim_ixs(&p, &v, v);
    ixs[1].accounts[7].pubkey = thief.pubkey();
    expect_err(env.send(&ixs, &kp, &[]), "ConstraintHasOne");


    env.update_config(&admin, cot_core::UpdateConfigParams { withdraw_fee_lamports: Some(0), ..Default::default() })
        .unwrap();
    let t = pk_of(&env.treasury_sol);
    let t0 = lamports(&env.svm, &t);
    let logs = env.claim_with(&p, v).unwrap();
    assert_eq!(lamports(&env.svm, &t), t0);
    assert_eq!(events::<Claimed>(&logs)[0].sol_fee_lamports, 0);
}

#[test]
fn claim_fails_whole_when_the_player_cannot_pay_the_sol_fee() {
    let mut env = Env::ready();
    let p = env.new_player();
    let kp = p.kp.insecure_clone();

    let payer = Keypair::new();
    env.svm.airdrop(&payer.pubkey(), SOL).unwrap();
    let mut acc = env.svm.get_account(&kp.pubkey()).unwrap();
    acc.lamports = SOL / 100 - 1;
    env.svm.set_account(kp.pubkey(), acc).unwrap();

    let tok0 = token_amount(&env.svm, &p.token);
    let v = env.voucher(10 * ONE, 1);
    let ixs = env.claim_ixs(&p, &v, v);
    assert!(env.send(&ixs, &payer, &[&kp]).is_err());

    assert_eq!(token_amount(&env.svm, &p.token), tok0);
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!(ps.last_nonce, 0);
}

#[test]
fn claim_daily_and_epoch_caps() {
    let mut env = Env::ready();
    let admin = env.admin.insecure_clone();

    env.update_config(&admin, cot_core::UpdateConfigParams { claim_cooldown_secs: Some(0), ..Default::default() })
        .unwrap();
    let p = env.new_player();
    expect_err(env.claim(&p, 1_000 * ONE + 1, 1), "DailyCapExceeded");
    env.claim(&p, 600 * ONE, 1).unwrap();
    expect_err(env.claim(&p, 500 * ONE, 2), "DailyCapExceeded");
    env.claim(&p, 400 * ONE, 3).unwrap();


    let mut players = Vec::new();
    for _ in 0..5 {
        players.push(env.new_player());
    }
    for q in players.iter().take(4) {
        env.claim(q, 1_000 * ONE, 1).unwrap();
    }

    expect_err(env.claim(&players[4], 1 * ONE, 1), "EpochCapExceeded");


    env.warp(86_400);
    env.claim(&players[4], 1_000 * ONE, 1).unwrap();
}

#[test]
fn claim_rejects_bad_vouchers() {
    let mut env = Env::ready();
    let p = env.new_player();
    let kp = p.kp.insecure_clone();
    let now = env.now();
    let v = env.voucher(10 * ONE, 1);
    let send = |env: &mut Env, ixs: &[Instruction]| env.send(ixs, &kp, &[]);


    let rogue = SigningKey::from_bytes(&[9u8; 32]);
    let msg = build_message(&cot_core::ID, &pk_of(&p.kp), &v);
    let ixs = [Env::ed25519_ix(&rogue, &msg), env.claim_ix(&p, v)];
    expect_err(send(&mut env, &ixs), "WrongVoucherSigner");



    let tampered = [
        ClaimVoucher { amount: 2 * v.amount, ..v },
        ClaimVoucher { fee: v.fee - 1, ..v },
        ClaimVoucher { lots_hash: [0x33; 32], ..v },
        ClaimVoucher { ledger_ref: [0x44; 32], ..v },
        ClaimVoucher { nonce: 2, ..v },
        ClaimVoucher { expiry: v.expiry + 1, ..v },
    ];
    for sent in tampered {
        let ixs = env.claim_ixs(&p, &v, sent);
        expect_err(send(&mut env, &ixs), "VoucherMessageMismatch");
    }


    let other = env.new_player();
    let msg_other = build_message(&cot_core::ID, &pk_of(&other.kp), &v);
    let ixs = [Env::ed25519_ix(&env.voucher_key, &msg_other), env.claim_ix(&p, v)];
    expect_err(send(&mut env, &ixs), "VoucherMessageMismatch");


    let ixs = [env.claim_ix(&p, v)];
    expect_err(send(&mut env, &ixs), "MissingEd25519Instruction");


    let old = ClaimVoucher { expiry: now - 1, ..v };
    let ixs = env.claim_ixs(&p, &old, old);
    expect_err(send(&mut env, &ixs), "VoucherExpired");


    let far = ClaimVoucher { expiry: now + 3_600, ..v };
    let ixs = env.claim_ixs(&p, &far, far);
    expect_err(send(&mut env, &ixs), "VoucherExpiryTooFar");


    let mut v1 = msg;
    v1[..12].copy_from_slice(b"COT_CLAIM_V1");
    let ixs = [Env::ed25519_ix(&env.voucher_key, &v1), env.claim_ix(&p, v)];
    expect_err(send(&mut env, &ixs), "VoucherMessageMismatch");






    let mut e = Env::ed25519_ix(&env.voucher_key, &msg);
    e.data[14..16].copy_from_slice(&0u16.to_le_bytes());
    let ixs = [e, env.claim_ix(&p, v)];
    expect_err(send(&mut env, &ixs), "Ed25519CrossInstructionReference");


    env.claim_with(&p, v).unwrap();
}

#[test]
fn claim_pays_only_the_signing_players_own_token_account() {
    let mut env = Env::ready();
    let p = env.new_player();
    let thief = env.new_player();
    let kp = p.kp.insecure_clone();
    let v = env.voucher(10 * ONE, 1);


    let mut ixs = env.claim_ixs(&p, &v, v);
    ixs[1].accounts[4].pubkey = to_addr(&thief.token);
    expect_err(env.send(&ixs, &kp, &[]), "ConstraintTokenOwner");


    let [ed, claim] = env.claim_ixs(&p, &v, v);
    let mut data = vec![2u8, 0, 0, 0];
    data.extend_from_slice(&1u64.to_le_bytes());
    let transfer = Instruction {
        program_id: addr(SYSTEM_PROGRAM),
        accounts: vec![AccountMeta::new(kp.pubkey(), true), AccountMeta::new(env.treasury_sol.pubkey(), false)],
        data,
    };
    expect_err(env.send(&[ed.clone(), transfer, claim.clone()], &kp, &[]), "MissingEd25519Instruction");


    let v2 = ClaimVoucher { nonce: 2, ..v };
    let claim2 = env.claim_ix(&p, v2);
    expect_err(env.send(&[ed, claim, claim2], &kp, &[]), "MissingEd25519Instruction");


    let mut ixs = env.claim_ixs(&p, &v, v);
    ixs[1].accounts[2].pubkey = to_addr(&thief.state);
    expect_err(env.send(&ixs, &kp, &[]), "ConstraintSeeds");


    env.claim(&p, 10 * ONE, 5).unwrap();
    expect_err(env.claim(&p, 10 * ONE, 4), "NonceNotIncreasing");
}

#[test]
fn voucher_signer_rotation_revokes_old_key() {
    let mut env = Env::ready();
    let admin = env.admin.insecure_clone();
    let p = env.new_player();
    let new_key = SigningKey::from_bytes(&[8u8; 32]);
    let new_signer = Pubkey::new_from_array(new_key.verifying_key().to_bytes());
    env.update_config(
        &admin,
        cot_core::UpdateConfigParams { voucher_signer: Some(new_signer), ..Default::default() },
    )
    .unwrap();
    expect_err(env.claim(&p, 10 * ONE, 1), "WrongVoucherSigner");
    env.voucher_key = new_key;
    env.claim(&p, 10 * ONE, 1).unwrap();
}





#[test]
fn admin_rotation_is_two_step() {
    let mut env = Env::ready();
    let old = env.admin.insecure_clone();
    let guardian = env.guardian.insecure_clone();
    let next = Keypair::new();
    env.svm.airdrop(&next.pubkey(), 10_000_000_000).unwrap();
    let accept = |by: &Keypair| {
        ix(
            cot_core::accounts::AcceptAdmin { new_admin: pk_of(by), config: pda(&[CONFIG_SEED]) },
            cot_core::instruction::AcceptAdmin {},
        )
    };


    expect_err(env.send(&[accept(&next)], &next, &[]), "NotPendingAdmin");
    env.update_config(&old, cot_core::UpdateConfigParams { new_admin: Some(pk_of(&next)), ..Default::default() })
        .unwrap();

    let cfg: Config = read(&env.svm, &env.config);
    assert_eq!(cfg.admin, pk_of(&old));

    let stranger = Keypair::new();
    env.svm.airdrop(&stranger.pubkey(), 10_000_000_000).unwrap();
    expect_err(env.send(&[accept(&stranger)], &stranger, &[]), "NotPendingAdmin");

    env.send(&[accept(&next)], &next, &[]).unwrap();
    let cfg: Config = read(&env.svm, &env.config);
    assert_eq!(cfg.admin, pk_of(&next));
    assert_eq!(cfg.pending_admin, Pubkey::default());

    expect_err(
        env.update_config(&old, cot_core::UpdateConfigParams { daily_claim_cap: Some(1), ..Default::default() }),
        "NotAdmin",
    );
    env.pause(&guardian).unwrap();
    expect_err(env.unpause(&old), "NotAdmin");
    env.unpause(&next).unwrap();
}






fn settle_caps() -> SettleAmounts {
    SettleAmounts {
        burn: 1_000 * ONE,
        to_treasury: 1_000 * ONE,
        to_referral: 1_000 * ONE,
        to_events: 1_000 * ONE,
        from_events: 1_000 * ONE,
        from_referral: 1_000 * ONE,
    }
}

impl Env {
    fn ledger_head(&self) -> Pubkey {
        pda(&[LEDGER_HEAD_SEED])
    }

    fn init_ledger_head(&mut self, by: &Keypair, caps: SettleAmounts) -> Result<Vec<String>, String> {
        let i = ix(
            cot_core::accounts::InitLedgerHead {
                admin: pk_of(by),
                config: self.config,
                ledger_head: self.ledger_head(),
                system_program: to_pk(&addr(SYSTEM_PROGRAM)),
            },
            cot_core::instruction::InitLedgerHead { caps },
        );
        self.send_logs(&[i], by, &[])
    }

    fn set_settle_caps(&mut self, by: &Keypair, caps: SettleAmounts) -> Result<Vec<String>, String> {
        let i = ix(
            cot_core::accounts::SetSettleCaps {
                admin: pk_of(by),
                config: self.config,
                ledger_head: self.ledger_head(),
            },
            cot_core::instruction::SetSettleCaps { caps },
        );
        self.send_logs(&[i], by, &[])
    }

    fn settle_accounts(&self, settler: &Pubkey) -> cot_core::accounts::SettleEpoch {
        cot_core::accounts::SettleEpoch {
            settler: *settler,
            config: self.config,
            ledger_head: self.ledger_head(),
            mint: self.mint,
            vault_authority: self.vault_authority,
            rewards_vault: self.rewards_vault,
            referral_vault: self.referral_vault,
            events_vault: self.events_vault,
            treasury: self.treasury,
            token_program: to_pk(&addr(TOKEN_PROGRAM)),
        }
    }

    fn settle_by(&mut self, by: &Keypair, args: SettleEpochArgs) -> Result<Vec<String>, String> {
        let i = ix(self.settle_accounts(&pk_of(by)), cot_core::instruction::SettleEpoch { args });
        self.send_logs(&[i], by, &[])
    }

    fn settle(&mut self, args: SettleEpochArgs) -> Result<Vec<String>, String> {
        let s = self.settler.insecure_clone();
        self.settle_by(&s, args)
    }


    fn last_ended_epoch(&self) -> u64 {
        (self.now() / LEDGER_EPOCH_SECS) as u64 - 1
    }



    fn ready_ledger() -> Env {
        let mut env = Env::ready();
        let admin = env.admin.insecure_clone();
        env.init_ledger_head(&admin, settle_caps()).expect("init ledger head");
        let p = env.new_player();

        env.spend(&p, 10_000 * ONE).unwrap();
        env
    }
}


fn epoch_args(epoch: u64, root: [u8; 32], leaf_count: u64, prev_hash: [u8; 32], amounts: SettleAmounts) -> SettleEpochArgs {
    SettleEpochArgs {
        epoch,
        root,
        leaf_count,
        prev_hash,
        hash: epoch_hash(epoch, &root, leaf_count, &prev_hash),
        amounts,
    }
}

#[test]
fn ledger_head_init_admin_only_once_and_caps_admin_only() {
    let mut env = Env::ready();
    let admin = env.admin.insecure_clone();
    let settler = env.settler.insecure_clone();
    let guardian = env.guardian.insecure_clone();


    let e = env.last_ended_epoch();
    expect_err(env.settle(epoch_args(e, [1; 32], 1, LEDGER_GENESIS, SettleAmounts::default())), "AccountNotInitialized");

    expect_err(env.init_ledger_head(&settler, settle_caps()), "NotAdmin");
    expect_err(env.init_ledger_head(&guardian, settle_caps()), "NotAdmin");
    let logs = env.init_ledger_head(&admin, settle_caps()).unwrap();
    let ev = events::<SettleCapsUpdated>(&logs);
    assert_eq!(ev.len(), 1);
    assert!(ev[0].initial);
    assert_eq!(ev[0].caps, settle_caps());

    assert!(env.init_ledger_head(&admin, SettleAmounts::default()).is_err());

    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!(head.version, LEDGER_HEAD_VERSION);
    assert_eq!(head.epochs_settled, 0);
    assert_eq!(head.last_hash, LEDGER_GENESIS);
    assert_eq!(head.caps, settle_caps());

    let small = SettleAmounts { burn: 5, ..Default::default() };
    expect_err(env.set_settle_caps(&settler, small), "NotAdmin");
    expect_err(env.set_settle_caps(&guardian, small), "NotAdmin");
    let logs = env.set_settle_caps(&admin, small).unwrap();
    assert!(!events::<SettleCapsUpdated>(&logs)[0].initial);
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!(head.caps, small);
}

#[test]
fn settle_only_by_settler() {
    let mut env = Env::ready_ledger();
    let admin = env.admin.insecure_clone();
    let guardian = env.guardian.insecure_clone();
    let stranger = Keypair::new();
    env.svm.airdrop(&stranger.pubkey(), 10_000_000_000).unwrap();
    let e = env.last_ended_epoch();
    let args = epoch_args(e, [1; 32], 1, LEDGER_GENESIS, SettleAmounts::default());

    expect_err(env.settle_by(&admin, args), "NotSettler");
    expect_err(env.settle_by(&guardian, args), "NotSettler");
    expect_err(env.settle_by(&stranger, args), "NotSettler");
    env.settle(args).unwrap();


    let next = Keypair::new();
    env.svm.airdrop(&next.pubkey(), 10_000_000_000).unwrap();
    env.update_config(&admin, cot_core::UpdateConfigParams { settler: Some(pk_of(&next)), ..Default::default() })
        .unwrap();
    env.warp(LEDGER_EPOCH_SECS);
    let args2 = epoch_args(e + 1, [2; 32], 1, args.hash, SettleAmounts::default());
    expect_err(env.settle(args2), "NotSettler");
    env.settle_by(&next, args2).unwrap();
}

#[test]
fn settle_anchors_root_and_hash_in_ledger_head() {
    let mut env = Env::ready_ledger();
    let e = env.last_ended_epoch();
    let root = [0xab; 32];
    let args = epoch_args(e, root, 3, LEDGER_GENESIS, SettleAmounts::default());


    expect_err(env.settle(epoch_args(e, root, 3, [5; 32], SettleAmounts::default())), "PrevHashMismatch");

    expect_err(env.settle(SettleEpochArgs { root: [0xac; 32], ..args }), "EpochHashMismatch");
    expect_err(env.settle(SettleEpochArgs { leaf_count: 4, ..args }), "EpochHashMismatch");
    expect_err(env.settle(SettleEpochArgs { hash: [7; 32], ..args }), "EpochHashMismatch");

    let logs = env.settle(args).unwrap();
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!(head.epochs_settled, 1);
    assert_eq!(head.last_epoch, e);
    assert_eq!(head.last_root, root);
    assert_eq!(head.last_leaf_count, 3);
    assert_eq!(head.last_hash, args.hash);
    assert_eq!(head.last_settled_ts, env.now());

    let ev = events::<EpochSettled>(&logs);
    assert_eq!(ev.len(), 1);
    assert_eq!(ev[0].settler, pk_of(&env.settler));
    assert_eq!(ev[0].epoch, e);
    assert_eq!(ev[0].root, root);
    assert_eq!(ev[0].leaf_count, 3);
    assert_eq!(ev[0].prev_hash, LEDGER_GENESIS);
    assert_eq!(ev[0].hash, args.hash);
    assert_eq!(ev[0].skipped_epochs, 0);
    assert_eq!(ev[0].epochs_settled, 1);
}

#[test]
fn settle_epochs_strictly_increasing_and_chained() {
    let mut env = Env::ready_ledger();
    let none = SettleAmounts::default();
    let e = env.last_ended_epoch() - 40;
    let a1 = epoch_args(e, [1; 32], 2, LEDGER_GENESIS, none);
    env.settle(a1).unwrap();


    expect_err(env.settle(a1), "EpochAlreadySettled");
    expect_err(env.settle(epoch_args(e - 1, [1; 32], 2, LEDGER_GENESIS, none)), "EpochAlreadySettled");
    expect_err(env.settle(epoch_args(e, [9; 32], 2, a1.hash, none)), "EpochAlreadySettled");


    expect_err(env.settle(epoch_args(e + 1, [2; 32], 1, LEDGER_GENESIS, none)), "PrevHashMismatch");
    let a2 = epoch_args(e + 1, [2; 32], 1, a1.hash, none);
    env.settle(a2).unwrap();



    let empty1 = epoch_hash(e + 2, &LEDGER_GENESIS, 0, &a2.hash);
    let empty2 = epoch_hash(e + 3, &LEDGER_GENESIS, 0, &empty1);
    expect_err(env.settle(epoch_args(e + 4, [4; 32], 1, a2.hash, none)), "PrevHashMismatch");

    let fake = epoch_hash(e + 3, &[3; 32], 1, &empty1);
    expect_err(env.settle(epoch_args(e + 4, [4; 32], 1, fake, none)), "PrevHashMismatch");
    let a4 = epoch_args(e + 4, [4; 32], 1, empty2, none);
    let logs = env.settle(a4).unwrap();
    assert_eq!(events::<EpochSettled>(&logs)[0].skipped_epochs, 2);


    let a5 = epoch_args(e + 5, LEDGER_GENESIS, 0, a4.hash, none);
    env.settle(a5).unwrap();


    let mut h = a5.hash;
    for k in 6..6 + MAX_SETTLE_GAP_EPOCHS + 1 {
        h = epoch_hash(e + k, &LEDGER_GENESIS, 0, &h);
    }
    let too_far = e + 6 + MAX_SETTLE_GAP_EPOCHS + 1;
    expect_err(env.settle(epoch_args(too_far, [6; 32], 1, h, none)), "SettleGapTooLarge");

    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!(head.epochs_settled, 4);
    assert_eq!(head.last_epoch, e + 5);
    assert_eq!(head.last_hash, a5.hash);
}

#[test]
fn settle_rejects_epoch_that_has_not_ended() {
    let mut env = Env::ready_ledger();
    let none = SettleAmounts::default();
    let current = (env.now() / LEDGER_EPOCH_SECS) as u64;
    expect_err(env.settle(epoch_args(current, [1; 32], 1, LEDGER_GENESIS, none)), "EpochNotEnded");
    expect_err(env.settle(epoch_args(current + 1_000, [1; 32], 1, LEDGER_GENESIS, none)), "EpochNotEnded");
    expect_err(env.settle(epoch_args(u64::MAX, [1; 32], 1, LEDGER_GENESIS, none)), "MathOverflow");

    env.warp(LEDGER_EPOCH_SECS);
    env.settle(epoch_args(current, [1; 32], 1, LEDGER_GENESIS, none)).unwrap();
}

#[test]
fn settle_moves_chest_shares_and_vault_exits() {
    let mut env = Env::ready_ledger();
    let e = env.last_ended_epoch();
    let supply = mint_supply(&env.svm, &env.mint);
    let rewards = token_amount(&env.svm, &env.rewards_vault);
    let referral = token_amount(&env.svm, &env.referral_vault);
    let events_v = token_amount(&env.svm, &env.events_vault);
    let treasury = token_amount(&env.svm, &env.treasury);
    assert_eq!(referral, 1_000 * ONE);
    assert_eq!(events_v, 500 * ONE);
    let cfg_before: Config = read(&env.svm, &env.config);



    let amounts = SettleAmounts {
        burn: 200 * ONE,
        to_treasury: 150 * ONE,
        to_referral: 100 * ONE,
        to_events: 50 * ONE,
        from_events: 300 * ONE,
        from_referral: 120 * ONE,
    };
    let logs = env.settle(epoch_args(e, [1; 32], 5, LEDGER_GENESIS, amounts)).unwrap();

    assert_eq!(mint_supply(&env.svm, &env.mint), supply - 200 * ONE, "real burn");
    assert_eq!(token_amount(&env.svm, &env.treasury), treasury + 150 * ONE);
    assert_eq!(token_amount(&env.svm, &env.referral_vault), referral + 100 * ONE - 120 * ONE);
    assert_eq!(token_amount(&env.svm, &env.events_vault), events_v + 50 * ONE - 300 * ONE);
    assert_eq!(
        token_amount(&env.svm, &env.rewards_vault),
        rewards + 300 * ONE + 120 * ONE - 200 * ONE - 150 * ONE - 100 * ONE - 50 * ONE
    );

    let cfg: Config = read(&env.svm, &env.config);
    assert_eq!(cfg.total_burned, cfg_before.total_burned + 200 * ONE);
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!(head.totals, amounts);
    let ev = events::<EpochSettled>(&logs);
    assert_eq!(ev[0].amounts, amounts);
    assert_eq!(ev[0].totals, amounts);


    env.warp(LEDGER_EPOCH_SECS);
    let prev = head.last_hash;
    let small = SettleAmounts { from_events: 10 * ONE, ..Default::default() };
    env.settle(epoch_args(e + 1, [2; 32], 1, prev, small)).unwrap();
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!(head.totals.from_events, 310 * ONE);
    assert_eq!(head.totals.burn, 200 * ONE);
}

#[test]
fn settle_amounts_bounded_by_per_epoch_caps() {
    let mut env = Env::ready_ledger();
    let admin = env.admin.insecure_clone();
    let e = env.last_ended_epoch() - 10;
    let caps = SettleAmounts {
        burn: 10 * ONE,
        to_treasury: 10 * ONE,
        to_referral: 10 * ONE,
        to_events: 10 * ONE,
        from_events: 10 * ONE,
        from_referral: 10 * ONE,
    };
    env.set_settle_caps(&admin, caps).unwrap();


    let over = [
        SettleAmounts { burn: 10 * ONE + 1, ..Default::default() },
        SettleAmounts { to_treasury: 10 * ONE + 1, ..Default::default() },
        SettleAmounts { to_referral: 10 * ONE + 1, ..Default::default() },
        SettleAmounts { to_events: 10 * ONE + 1, ..Default::default() },
        SettleAmounts { from_events: 10 * ONE + 1, ..Default::default() },
        SettleAmounts { from_referral: 10 * ONE + 1, ..Default::default() },
    ];
    for a in over {
        expect_err(env.settle(epoch_args(e, [1; 32], 1, LEDGER_GENESIS, a)), "SettleCapExceeded");
    }

    let a1 = epoch_args(e, [1; 32], 1, LEDGER_GENESIS, caps);
    env.settle(a1).unwrap();


    env.set_settle_caps(&admin, SettleAmounts::default()).unwrap();
    let one = SettleAmounts { burn: 1, ..Default::default() };
    expect_err(env.settle(epoch_args(e + 1, [2; 32], 1, a1.hash, one)), "SettleCapExceeded");
    env.settle(epoch_args(e + 1, [2; 32], 1, a1.hash, SettleAmounts::default())).unwrap();
}

#[test]
fn settle_rejects_more_than_the_vaults_hold() {
    let mut env = Env::ready_ledger();
    let admin = env.admin.insecure_clone();
    let e = env.last_ended_epoch();
    let big = SettleAmounts {
        burn: u64::MAX,
        to_treasury: u64::MAX,
        to_referral: u64::MAX,
        to_events: u64::MAX,
        from_events: u64::MAX,
        from_referral: u64::MAX,
    };
    env.set_settle_caps(&admin, big).unwrap();
    let events_v = token_amount(&env.svm, &env.events_vault);
    let referral = token_amount(&env.svm, &env.referral_vault);
    let rewards = token_amount(&env.svm, &env.rewards_vault);

    let try_amounts = |a: SettleAmounts| epoch_args(e, [1; 32], 1, LEDGER_GENESIS, a);
    expect_err(env.settle(try_amounts(SettleAmounts { from_events: events_v + 1, ..Default::default() })), "InsufficientVault");
    expect_err(env.settle(try_amounts(SettleAmounts { from_referral: referral + 1, ..Default::default() })), "InsufficientVault");
    expect_err(env.settle(try_amounts(SettleAmounts { burn: rewards + 1, ..Default::default() })), "InsufficientVault");
    expect_err(
        env.settle(try_amounts(SettleAmounts { burn: u64::MAX, to_treasury: 1, ..Default::default() })),
        "MathOverflow",
    );

    let all = SettleAmounts { from_events: events_v, to_treasury: rewards + events_v, ..Default::default() };
    env.settle(try_amounts(all)).unwrap();
    assert_eq!(token_amount(&env.svm, &env.rewards_vault), 0);
    assert_eq!(token_amount(&env.svm, &env.events_vault), 0);
}

#[test]
fn settle_blocked_while_paused() {
    let mut env = Env::ready_ledger();
    let admin = env.admin.insecure_clone();
    let guardian = env.guardian.insecure_clone();
    let e = env.last_ended_epoch();
    let args = epoch_args(e, [1; 32], 1, LEDGER_GENESIS, SettleAmounts { burn: ONE, ..Default::default() });
    env.pause(&guardian).unwrap();
    expect_err(env.settle(args), "Paused");
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!(head.epochs_settled, 0);
    env.unpause(&admin).unwrap();
    env.settle(args).unwrap();
}

#[test]
fn settle_rejects_substituted_accounts() {
    let mut env = Env::ready_ledger();
    let settler = env.settler.insecure_clone();
    let e = env.last_ended_epoch();
    let args = epoch_args(e, [1; 32], 1, LEDGER_GENESIS, SettleAmounts { to_treasury: ONE, ..Default::default() });
    let va = env.vault_authority;
    let send = |env: &mut Env, accounts: cot_core::accounts::SettleEpoch| {
        let i = ix(accounts, cot_core::instruction::SettleEpoch { args });
        env.send(&[i], &settler, &[])
    };


    let mut a = env.settle_accounts(&pk_of(&settler));
    a.treasury = env.set_token_account(&pk_of(&settler), 0);
    expect_err(send(&mut env, a), "ConstraintHasOne");


    for which in 0..3 {
        let mut a = env.settle_accounts(&pk_of(&settler));
        let fake = env.set_token_account(&va, 1_000 * ONE);
        match which {
            0 => a.rewards_vault = fake,
            1 => a.referral_vault = fake,
            _ => a.events_vault = fake,
        }
        expect_err(send(&mut env, a), "ConstraintSeeds");
    }


    let mut a = env.settle_accounts(&pk_of(&settler));
    a.ledger_head = env.config;
    assert!(send(&mut env, a).is_err());

    env.settle(args).unwrap();
}





impl Env {
    fn cancel_accounts(&self, settler: &Pubkey, wallet: &Pubkey) -> cot_core::accounts::CancelNonce {
        cot_core::accounts::CancelNonce {
            settler: *settler,
            config: self.config,
            wallet: *wallet,
            player_state: pda(&[PLAYER_SEED, wallet.as_ref()]),
            system_program: to_pk(&addr(SYSTEM_PROGRAM)),
            instructions_sysvar: to_pk(&addr("Sysvar1nstructions1111111111111111111111111")),
        }
    }



    fn cancel_ixs(&self, by: &Pubkey, wallet: &Pubkey, key: &SigningKey, signed: &ClaimVoucher, sent: ClaimVoucher) -> [Instruction; 2] {
        let msg = build_message(&cot_core::ID, wallet, signed);
        let c = ix(self.cancel_accounts(by, wallet), cot_core::instruction::CancelNonce { voucher: sent });
        [Self::ed25519_ix(key, &msg), c]
    }

    fn cancel_by(&mut self, by: &Keypair, wallet: &Pubkey, v: ClaimVoucher) -> Result<Vec<String>, String> {
        let key = self.voucher_key.clone();
        let ixs = self.cancel_ixs(&pk_of(by), wallet, &key, &v, v);
        self.send_logs(&ixs, by, &[])
    }


    fn cancel(&mut self, wallet: &Pubkey, v: ClaimVoucher) -> Result<Vec<String>, String> {
        let s = self.settler.insecure_clone();
        self.cancel_by(&s, wallet, v)
    }
}

#[test]
fn cancel_nonce_only_by_settler_and_only_after_expiry() {
    let mut env = Env::ready();
    let p = env.new_player();
    let wallet = pk_of(&p.kp);
    let v = env.voucher(10 * ONE, 1);
    let (admin, guardian) = (env.admin.insecure_clone(), env.guardian.insecure_clone());


    expect_err(env.cancel(&wallet, v), "VoucherNotExpired");
    env.warp(v.expiry - env.now());
    expect_err(env.cancel(&wallet, v), "VoucherNotExpired");
    env.warp(1);

    for k in [&admin, &guardian, &p.kp] {
        expect_err(env.cancel_by(k, &wallet, v), "NotSettler");
    }
    let logs = env.cancel(&wallet, v).unwrap();
    let ev = events::<NonceCancelled>(&logs);
    assert_eq!(ev.len(), 1);
    assert_eq!((ev[0].settler, ev[0].player, ev[0].nonce, ev[0].expiry), (pk_of(&env.settler), wallet, 1, v.expiry));
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_nonce, ps.last_cancelled_nonce, ps.last_claim_ts), (1, 1, 0));


    expect_err(env.claim(&p, 10 * ONE, 1), "NonceNotIncreasing");
    expect_err(env.cancel(&wallet, v), "NonceNotIncreasing");

    env.claim(&p, 10 * ONE, 2).unwrap();
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_nonce, ps.last_cancelled_nonce), (2, 1));
}

#[test]
fn claim_and_cancel_of_one_nonce_never_both_succeed() {
    let mut env = Env::ready();
    let p = env.new_player();
    let wallet = pk_of(&p.kp);
    let v = env.voucher(10 * ONE, 1);
    env.claim_with(&p, v).unwrap();
    env.warp(v.expiry - env.now() + 1);

    expect_err(env.cancel(&wallet, v), "NonceNotIncreasing");
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_nonce, ps.last_cancelled_nonce), (1, 0));
}

#[test]
fn cancel_nonce_creates_the_player_state_of_a_new_wallet() {
    let mut env = Env::ready();
    let kp = Keypair::new();
    env.svm.airdrop(&kp.pubkey(), 10_000_000_000).unwrap();
    let wallet = pk_of(&kp);
    let state = pda(&[PLAYER_SEED, wallet.as_ref()]);
    let token = env.set_token_account(&wallet, 100_000 * ONE);
    let p = Player { kp, token, state };
    let v = env.voucher(10 * ONE, 3);
    env.warp(301);

    let settler_before = lamports(&env.svm, &pk_of(&env.settler));
    env.cancel(&wallet, v).unwrap();
    let ps: PlayerState = read(&env.svm, &state);
    assert_eq!((ps.owner, ps.created_ts, ps.last_nonce, ps.last_cancelled_nonce), (wallet, env.now(), 3, 3));
    assert_eq!(ps.bump, Pubkey::find_program_address(&[PLAYER_SEED, wallet.as_ref()], &cot_core::ID).1);

    assert!(lamports(&env.svm, &pk_of(&env.settler)) < settler_before);


    let i = ix(
        cot_core::accounts::InitPlayer { player: wallet, player_state: state, system_program: to_pk(&addr(SYSTEM_PROGRAM)) },
        cot_core::instruction::InitPlayer {},
    );
    let kp = p.kp.insecure_clone();
    assert!(env.send(&[i], &kp, &[]).is_err());
    expect_err(env.claim(&p, 10 * ONE, 3), "NonceNotIncreasing");
    env.claim(&p, 10 * ONE, 4).unwrap();
}

#[test]
fn cancel_nonce_works_while_paused_and_keeps_other_players_apart() {
    let mut env = Env::ready();
    let a = env.new_player();
    let b = env.new_player();
    let guardian = env.guardian.insecure_clone();
    let v = env.voucher(10 * ONE, 1);
    env.warp(301);
    env.pause(&guardian).unwrap();

    env.cancel(&pk_of(&a.kp), v).unwrap();
    let pb: PlayerState = read(&env.svm, &b.state);
    assert_eq!((pb.last_nonce, pb.last_cancelled_nonce), (0, 0));


    let s = env.settler.insecure_clone();
    let key = env.voucher_key.clone();
    let v9 = ClaimVoucher { nonce: 9, ..v };
    let mut ixs = env.cancel_ixs(&pk_of(&s), &pk_of(&b.kp), &key, &v9, v9);
    let mut accounts = env.cancel_accounts(&pk_of(&s), &pk_of(&b.kp));
    accounts.player_state = a.state;
    ixs[1] = ix(accounts, cot_core::instruction::CancelNonce { voucher: v9 });
    expect_err(env.send(&ixs, &s, &[]), "ConstraintSeeds");
}



#[test]
fn cancel_nonce_requires_the_signed_voucher_of_that_wallet() {
    let mut env = Env::ready();
    let p = env.new_player();
    let other = env.new_player();
    let wallet = pk_of(&p.kp);
    let settler = env.settler.insecure_clone();
    let s = pk_of(&settler);
    let key = env.voucher_key.clone();
    let v = env.voucher(10 * ONE, 1);
    env.warp(301);


    let alone = ix(env.cancel_accounts(&s, &wallet), cot_core::instruction::CancelNonce { voucher: v });
    expect_err(env.send(&[alone], &settler, &[]), "MissingEd25519Instruction");


    let rogue = SigningKey::from_bytes(&[9u8; 32]);
    let ixs = env.cancel_ixs(&s, &wallet, &rogue, &v, v);
    expect_err(env.send(&ixs, &settler, &[]), "WrongVoucherSigner");


    for sent in [
        ClaimVoucher { nonce: u64::MAX, ..v },
        ClaimVoucher { expiry: v.expiry - 1, ..v },
        ClaimVoucher { amount: v.amount + 1, ..v },
    ] {
        let ixs = env.cancel_ixs(&s, &wallet, &key, &v, sent);
        expect_err(env.send(&ixs, &settler, &[]), "VoucherMessageMismatch");
    }


    let msg = build_message(&cot_core::ID, &pk_of(&other.kp), &v);
    let ixs = [
        Env::ed25519_ix(&key, &msg),
        ix(env.cancel_accounts(&s, &wallet), cot_core::instruction::CancelNonce { voucher: v }),
    ];
    expect_err(env.send(&ixs, &settler, &[]), "VoucherMessageMismatch");


    let ixs = env.cancel_ixs(&s, &wallet, &key, &v, v);
    let filler = ix(
        cot_core::accounts::Pause { authority: pk_of(&env.guardian), config: env.config },
        cot_core::instruction::Pause {},
    );
    let guardian = env.guardian.insecure_clone();
    expect_err(env.send(&[ixs[0].clone(), filler, ixs[1].clone()], &settler, &[&guardian]), "MissingEd25519Instruction");


    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_nonce, ps.last_cancelled_nonce), (0, 0));
    env.cancel(&wallet, v).unwrap();
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_nonce, ps.last_cancelled_nonce), (1, 1));
}
















#[test]
fn audit_cancel_nonce_expiry_and_nonce_are_not_bound_to_a_voucher() {
    let mut env = Env::ready();
    let p = env.new_player();
    let wallet = pk_of(&p.kp);
    let settler = env.settler.insecure_clone();
    let s = pk_of(&settler);
    let key = env.voucher_key.clone();
    let live = env.voucher(10 * ONE, 1);
    assert!(live.expiry > env.now(), "the voucher is still live");



    let past = ClaimVoucher { expiry: env.now() - 1, ..live };
    let ixs = env.cancel_ixs(&s, &wallet, &key, &live, past);
    expect_err(env.send(&ixs, &settler, &[]), "VoucherMessageMismatch");
    expect_err(env.cancel(&wallet, live), "VoucherNotExpired");


    let max = ClaimVoucher { nonce: u64::MAX, expiry: 0, ..live };
    let ixs = env.cancel_ixs(&s, &wallet, &key, &live, max);
    expect_err(env.send(&ixs, &settler, &[]), "VoucherMessageMismatch");
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_nonce, ps.last_cancelled_nonce), (0, 0));


    env.claim_with(&p, live).unwrap();
    let ps: PlayerState = read(&env.svm, &p.state);
    assert_eq!((ps.last_nonce, ps.last_cancelled_nonce), (1, 0));
}







#[test]
fn audit_settle_caps_are_per_epoch_number_not_per_hour() {
    let mut env = Env::ready_ledger();
    let last = env.last_ended_epoch();
    let supply = mint_supply(&env.svm, &env.mint);

    let burn = SettleAmounts { burn: 600 * ONE, ..Default::default() };


    let a0 = epoch_args(last - 5, [7; 32], 1, LEDGER_GENESIS, burn);
    env.settle(a0).unwrap();
    let a1 = epoch_args(last - 4, [7; 32], 1, a0.hash, burn);
    expect_err(env.settle(a1), "SettleWindowCapExceeded");
    assert_eq!(mint_supply(&env.svm, &env.mint), supply - 600 * ONE);


    env.warp(SETTLE_WINDOW_SECS / 2);
    env.settle(a1).unwrap();
    let a2 = epoch_args(last - 3, [7; 32], 1, a1.hash, burn);
    expect_err(env.settle(a2), "SettleWindowCapExceeded");

    env.warp(SETTLE_WINDOW_SECS);
    env.settle(a2).unwrap();
    assert_eq!(mint_supply(&env.svm, &env.mint), supply - 1_800 * ONE);
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!((head.epochs_settled, head.last_epoch), (3, last - 3));
    assert_eq!(head.window_used.burn, 600 * ONE);
}



#[test]
fn settle_window_lets_roots_through_and_tracks_each_field() {
    let mut env = Env::ready_ledger();
    let admin = env.admin.insecure_clone();
    let e = env.last_ended_epoch() - 10;
    let full = SettleAmounts { burn: 1_000 * ONE, from_events: 300 * ONE, ..Default::default() };
    let a0 = epoch_args(e, [1; 32], 1, LEDGER_GENESIS, full);
    env.settle(a0).unwrap();


    let a1 = epoch_args(e + 1, [2; 32], 1, a0.hash, SettleAmounts { burn: 1, ..Default::default() });
    expect_err(env.settle(a1), "SettleWindowCapExceeded");
    let a1 = epoch_args(e + 1, [2; 32], 1, a0.hash, SettleAmounts { from_events: 150 * ONE, to_treasury: 1_000 * ONE, ..Default::default() });
    env.settle(a1).unwrap();

    let a2 = epoch_args(e + 2, [3; 32], 1, a1.hash, SettleAmounts::default());
    env.settle(a2).unwrap();



    env.set_settle_caps(&admin, SettleAmounts { burn: 100 * ONE, ..settle_caps() }).unwrap();
    env.warp(SETTLE_WINDOW_SECS / 2);
    let a3 = epoch_args(e + 3, [4; 32], 1, a2.hash, SettleAmounts { burn: ONE, ..Default::default() });
    expect_err(env.settle(a3), "SettleWindowCapExceeded");
    env.warp(SETTLE_WINDOW_SECS);
    env.settle(a3).unwrap();
}



#[test]
fn first_settlement_is_bounded_by_the_head_creation() {
    let mut env = Env::ready_ledger();
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    let hour = (START_TS / LEDGER_EPOCH_SECS) as u64;
    assert_eq!(head.min_epoch, hour - MAX_SETTLE_FIRST_LOOKBACK_EPOCHS);
    assert_eq!(head.window_used, SettleAmounts::default());
    let none = SettleAmounts::default();
    expect_err(env.settle(epoch_args(head.min_epoch - 1, [1; 32], 1, LEDGER_GENESIS, none)), "EpochBeforeLedgerStart");
    env.settle(epoch_args(head.min_epoch, [1; 32], 1, LEDGER_GENESIS, none)).unwrap();
}

impl Env {
    fn reanchor(&mut self, by: &Keypair, args: cot_core::ReanchorArgs) -> Result<Vec<String>, String> {
        let i = ix(
            cot_core::accounts::ReanchorLedgerHead {
                admin: pk_of(by),
                config: self.config,
                ledger_head: self.ledger_head(),
            },
            cot_core::instruction::ReanchorLedgerHead { args },
        );
        self.send_logs(&[i], by, &[])
    }
}




#[test]
fn reanchor_ledger_head_repairs_a_bad_anchor_admin_only() {
    let mut env = Env::ready_ledger();
    let admin = env.admin.insecure_clone();
    let settler = env.settler.insecure_clone();
    let guardian = env.guardian.insecure_clone();
    let e = env.last_ended_epoch() - 4;
    let burn = SettleAmounts { burn: 900 * ONE, ..Default::default() };


    let bad = epoch_args(e, [0xbb; 32], 9, LEDGER_GENESIS, burn);
    env.settle(bad).unwrap();

    let real = epoch_args(e, [0x11; 32], 2, LEDGER_GENESIS, SettleAmounts::default());
    let next = epoch_args(e + 1, [0x12; 32], 1, real.hash, SettleAmounts::default());
    expect_err(env.settle(next), "PrevHashMismatch");

    let args = cot_core::ReanchorArgs { epoch: e, root: real.root, leaf_count: real.leaf_count, hash: real.hash };
    expect_err(env.reanchor(&settler, args), "NotAdmin");
    expect_err(env.reanchor(&guardian, args), "NotAdmin");

    let current = (env.now() / LEDGER_EPOCH_SECS) as u64;
    expect_err(env.reanchor(&admin, cot_core::ReanchorArgs { epoch: current, ..args }), "EpochNotEnded");


    env.pause(&guardian).unwrap();
    let logs = env.reanchor(&admin, args).unwrap();
    env.unpause(&admin).unwrap();
    let ev = events::<LedgerReanchored>(&logs);
    assert_eq!(ev.len(), 1);
    assert_eq!(
        (ev[0].admin, ev[0].previous_epochs_settled, ev[0].previous_epoch, ev[0].previous_hash),
        (pk_of(&admin), 1, e, bad.hash)
    );
    assert_eq!((ev[0].epoch, ev[0].root, ev[0].leaf_count, ev[0].hash, ev[0].min_epoch), (e, real.root, 2, real.hash, e + 1));
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!((head.epochs_settled, head.last_epoch, head.last_root, head.last_hash), (1, e, real.root, real.hash));
    assert_eq!(head.version, LEDGER_HEAD_VERSION);


    let next = epoch_args(e + 1, [0x12; 32], 1, real.hash, SettleAmounts { burn: 200 * ONE, ..Default::default() });
    expect_err(env.settle(next), "SettleWindowCapExceeded");
    let next = SettleEpochArgs { amounts: SettleAmounts::default(), ..next };
    env.settle(next).unwrap();
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!((head.epochs_settled, head.last_epoch, head.last_hash), (2, e + 1, next.hash));
}



#[test]
fn reanchor_sets_where_a_fresh_chain_starts() {
    let mut env = Env::ready_ledger();
    let admin = env.admin.insecure_clone();
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    let start = head.min_epoch - 50;
    expect_err(
        env.settle(epoch_args(start, [1; 32], 1, LEDGER_GENESIS, SettleAmounts::default())),
        "EpochBeforeLedgerStart",
    );

    let args = cot_core::ReanchorArgs { epoch: start - 1, root: LEDGER_GENESIS, leaf_count: 0, hash: LEDGER_GENESIS };
    env.reanchor(&admin, args).unwrap();
    env.settle(epoch_args(start, [1; 32], 1, LEDGER_GENESIS, SettleAmounts::default())).unwrap();
    let head: LedgerHead = read(&env.svm, &env.ledger_head());
    assert_eq!((head.epochs_settled, head.last_epoch), (2, start));
}
