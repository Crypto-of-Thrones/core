

























#![cfg(feature = "test-sbf")]

use anchor_lang::prelude::Pubkey;
use anchor_lang::{InstructionData, ToAccountMetas};
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
use cot_core::instructions::settle::{epoch_hash, SettleEpochArgs};
use cot_core::state::{ClaimTax, FeeSplit, LedgerHead, SettleAmounts};
use cot_core::voucher::{build_message, ClaimVoucher};

const TOKEN_PROGRAM: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SYSTEM_PROGRAM: &str = "11111111111111111111111111111111";
const ED25519_PROGRAM: &str = "Ed25519SigVerify111111111111111111111111111";
const COMPUTE_BUDGET_PROGRAM: &str = "ComputeBudget111111111111111111111111111111";
const INSTRUCTIONS_SYSVAR: &str = "Sysvar1nstructions1111111111111111111111111";
const DECIMALS: u8 = 6;
const ONE: u64 = 1_000_000;
const SOL: u64 = 1_000_000_000;
const START_TS: i64 = 1_800_000_000;


const CU_BUDGET: u64 = 200_000;

const CU_MEASURE_LIMIT: u32 = 1_400_000;

fn to_addr(p: &Pubkey) -> Address {
    Address::new_from_array(p.to_bytes())
}

fn pk_of(k: &Keypair) -> Pubkey {
    Pubkey::new_from_array(k.pubkey().to_bytes())
}

fn addr(s: &str) -> Address {
    s.parse().unwrap()
}

fn pk(s: &str) -> Pubkey {
    Pubkey::new_from_array(addr(s).to_bytes())
}

fn pda(seeds: &[&[u8]]) -> Pubkey {
    Pubkey::find_program_address(seeds, &cot_core::ID).0
}

fn ix(accounts: impl ToAccountMetas, data: impl InstructionData) -> Instruction {
    Instruction {
        program_id: to_addr(&cot_core::ID),
        accounts: accounts
            .to_account_metas(None)
            .into_iter()
            .map(|m| AccountMeta {
                pubkey: to_addr(&m.pubkey),
                is_signer: m.is_signer,
                is_writable: m.is_writable,
            })
            .collect(),
        data: data.data(),
    }
}


fn cu_limit_ix(units: u32) -> Instruction {
    let mut data = vec![2u8];
    data.extend_from_slice(&units.to_le_bytes());
    Instruction {
        program_id: addr(COMPUTE_BUDGET_PROGRAM),
        accounts: vec![],
        data,
    }
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

fn split(burn: u16, rewards: u16, treasury: u16, referral: u16, events: u16) -> FeeSplit {
    FeeSplit {
        burn_bps: burn,
        rewards_bps: rewards,
        treasury_bps: treasury,
        referral_bps: referral,
        events_bps: events,
    }
}




const PROFILES: [(&str, u8); 4] = [("standard", 0), ("market", 1), ("lottery", 2), ("burn", 3)];

fn profiles() -> [FeeSplit; MAX_SPLIT_PROFILES] {
    let mut p = [FeeSplit::default(); MAX_SPLIT_PROFILES];
    p[0] = split(2_000, 5_000, 1_500, 1_000, 500);
    p[1] = split(600, 8_800, 600, 0, 0);
    p[2] = split(0, 10_000, 0, 0, 0);
    p[3] = split(10_000, 0, 0, 0, 0);
    p
}


struct Measure {
    name: String,

    program: u64,


    tx: u64,
}

struct Env {
    svm: LiteSVM,
    admin: Keypair,
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
    ledger_head: Pubkey,
}

struct Player {
    kp: Keypair,
    token: Pubkey,
    state: Pubkey,
    next_seq: u64,
}

impl Env {
    fn send(&mut self, ixs: &[Instruction], payer: &Keypair) -> Result<litesvm::types::TransactionMetadata, String> {
        self.svm.expire_blockhash();
        let tx = Transaction::new_signed_with_payer(ixs, Some(&payer.pubkey()), &[payer], self.svm.latest_blockhash());
        self.svm
            .send_transaction(tx)
            .map_err(|e| format!("{:?}\n{}", e.err, e.meta.logs.join("\n")))
    }




    fn measure(&mut self, name: &str, ixs: &[Instruction], payer: &Keypair) -> Measure {
        let mut all = vec![cu_limit_ix(CU_MEASURE_LIMIT)];
        all.extend_from_slice(ixs);
        let meta = self.send(&all, payer).unwrap_or_else(|e| panic!("{name} failed: {e}"));
        let prefix = format!("Program {} consumed ", cot_core::ID);
        let program = meta
            .logs
            .iter()
            .rev()
            .find_map(|l| l.strip_prefix(&prefix))
            .and_then(|rest| rest.split(' ').next())
            .and_then(|n| n.parse().ok())
            .unwrap_or_else(|| panic!("{name}: no consumed line in logs"));
        Measure {
            name: name.to_string(),
            program,
            tx: meta.compute_units_consumed,
        }
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

    fn token_account(&mut self, owner: &Pubkey, amount: u64) -> Pubkey {
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



    fn ready() -> Env {
        let mut svm = LiteSVM::new();
        let so = concat!(env!("CARGO_MANIFEST_DIR"), "/../target/deploy/cot_core.so");
        svm.add_program_from_file(to_addr(&cot_core::ID), so)
            .expect("build the program first: target/deploy/cot_core.so");

        let deployer = Keypair::new();
        let admin = Keypair::new();
        let settler = Keypair::new();
        let treasury_sol = Keypair::new();
        for k in [&deployer, &admin, &settler, &treasury_sol] {
            svm.airdrop(&k.pubkey(), 100 * SOL).unwrap();
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

        let mut env = Env {
            svm,
            admin,
            settler,
            treasury_sol,
            voucher_key: SigningKey::from_bytes(&[7u8; 32]),
            mint,
            treasury: Pubkey::default(),
            config: pda(&[CONFIG_SEED]),
            vault_authority: pda(&[VAULT_AUTHORITY_SEED]),
            rewards_vault: pda(&[REWARDS_VAULT_SEED]),
            referral_vault: pda(&[REFERRAL_VAULT_SEED]),
            events_vault: pda(&[EVENTS_VAULT_SEED]),
            ledger_head: pda(&[LEDGER_HEAD_SEED]),
        };
        let admin_pk = pk_of(&env.admin);
        env.treasury = env.token_account(&admin_pk, 0);

        let params = cot_core::InitializeParams {
            admin: admin_pk,
            guardian: Pubkey::new_unique(),
            voucher_signer: Pubkey::new_from_array(env.voucher_key.verifying_key().to_bytes()),
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
        };
        let init = ix(
            cot_core::accounts::Initialize {
                authority: pk_of(&deployer),
                config: env.config,
                vault_authority: env.vault_authority,
                mint: env.mint,
                rewards_vault: env.rewards_vault,
                referral_vault: env.referral_vault,
                events_vault: env.events_vault,
                treasury: env.treasury,
                program: cot_core::ID,
                program_data: Pubkey::new_from_array(programdata.to_bytes()),
                token_program: pk(TOKEN_PROGRAM),
                system_program: pk(SYSTEM_PROGRAM),
            },
            cot_core::instruction::Initialize { params },
        );
        env.send(&[init], &deployer).expect("initialize");

        let admin = env.admin.insecure_clone();
        let funder_token = env.token_account(&admin_pk, 1_000_000 * ONE);
        let fund = ix(
            cot_core::accounts::FundVault {
                funder: admin_pk,
                config: env.config,
                mint: env.mint,
                funder_token,
                rewards_vault: env.rewards_vault,
                token_program: pk(TOKEN_PROGRAM),
            },
            cot_core::instruction::FundVault { amount: 100_000 * ONE },
        );
        env.send(&[fund], &admin).expect("fund vault");

        let big = 1_000_000 * ONE;
        let head = ix(
            cot_core::accounts::InitLedgerHead {
                admin: admin_pk,
                config: env.config,
                ledger_head: env.ledger_head,
                system_program: pk(SYSTEM_PROGRAM),
            },
            cot_core::instruction::InitLedgerHead {
                caps: SettleAmounts {
                    burn: big,
                    to_treasury: big,
                    to_referral: big,
                    to_events: big,
                    from_events: big,
                    from_referral: big,
                },
            },
        );
        env.send(&[head], &admin).expect("init ledger head");
        env
    }

    fn new_player(&mut self) -> Player {
        let kp = Keypair::new();
        self.svm.airdrop(&kp.pubkey(), 10 * SOL).unwrap();
        let p = pk_of(&kp);
        let token = self.token_account(&p, 100_000 * ONE);
        let state = pda(&[PLAYER_SEED, p.as_ref()]);
        let i = ix(
            cot_core::accounts::InitPlayer {
                player: p,
                player_state: state,
                system_program: pk(SYSTEM_PROGRAM),
            },
            cot_core::instruction::InitPlayer {},
        );
        self.send(&[i], &kp).expect("init player");
        Player { kp, token, state, next_seq: 1 }
    }

    fn spend_ix(&self, p: &mut Player, amount: u64, profile: u8) -> Instruction {
        let order_seq = p.next_seq;
        p.next_seq += 1;
        ix(
            cot_core::accounts::Spend {
                player: pk_of(&p.kp),
                config: self.config,
                player_state: p.state,
                mint: self.mint,
                player_token: p.token,
                vault_authority: self.vault_authority,
                rewards_vault: self.rewards_vault,
                referral_vault: self.referral_vault,
                events_vault: self.events_vault,
                treasury: self.treasury,
                token_program: pk(TOKEN_PROGRAM),
            },
            cot_core::instruction::Spend { amount, kind: 1, order_seq, profile },
        )
    }

    fn pay_sol_ix(&self, p: &mut Player, lamports: u64) -> Instruction {
        let order_seq = p.next_seq;
        p.next_seq += 1;
        ix(
            cot_core::accounts::PaySol {
                player: pk_of(&p.kp),
                config: self.config,
                player_state: p.state,
                treasury_sol: pk_of(&self.treasury_sol),
                system_program: pk(SYSTEM_PROGRAM),
            },
            cot_core::instruction::PaySol { kind: 7, order_seq, lamports },
        )
    }



    fn claim_ixs(&self, p: &Player, amount: u64, nonce: u64) -> [Instruction; 2] {
        let v = ClaimVoucher {
            amount,
            fee: amount * 3 / 100,
            lots_hash: [0x11; 32],
            ledger_ref: [0x22; 32],
            nonce,
            expiry: self.now() + 300,
        };
        let msg = build_message(&cot_core::ID, &pk_of(&p.kp), &v);
        let mut data = vec![1u8, 0u8];
        for o in [48u16, u16::MAX, 16, u16::MAX, 112, msg.len() as u16, u16::MAX] {
            data.extend_from_slice(&o.to_le_bytes());
        }
        data.extend_from_slice(&self.voucher_key.verifying_key().to_bytes());
        data.extend_from_slice(&self.voucher_key.sign(&msg).to_bytes());
        data.extend_from_slice(&msg);
        let ed = Instruction {
            program_id: addr(ED25519_PROGRAM),
            accounts: vec![],
            data,
        };
        let claim = ix(
            cot_core::accounts::ClaimWithVoucher {
                player: pk_of(&p.kp),
                config: self.config,
                player_state: p.state,
                mint: self.mint,
                player_token: p.token,
                vault_authority: self.vault_authority,
                rewards_vault: self.rewards_vault,
                treasury_sol: pk_of(&self.treasury_sol),
                instructions_sysvar: pk(INSTRUCTIONS_SYSVAR),
                token_program: pk(TOKEN_PROGRAM),
                system_program: pk(SYSTEM_PROGRAM),
            },
            cot_core::instruction::ClaimWithVoucher { voucher: v },
        );
        [ed, claim]
    }

    fn settle_ix(&self, epoch: u64, prev_hash: [u8; 32], amounts: SettleAmounts) -> Instruction {
        let root = [epoch as u8; 32];
        let leaf_count = 1_000;
        let args = SettleEpochArgs {
            epoch,
            root,
            leaf_count,
            prev_hash,
            hash: epoch_hash(epoch, &root, leaf_count, &prev_hash),
            amounts,
        };
        ix(
            cot_core::accounts::SettleEpoch {
                settler: pk_of(&self.settler),
                config: self.config,
                ledger_head: self.ledger_head,
                mint: self.mint,
                vault_authority: self.vault_authority,
                rewards_vault: self.rewards_vault,
                referral_vault: self.referral_vault,
                events_vault: self.events_vault,
                treasury: self.treasury,
                token_program: pk(TOKEN_PROGRAM),
            },
            cot_core::instruction::SettleEpoch { args },
        )
    }

    fn last_hash(&self) -> [u8; 32] {
        let acc = self.svm.get_account(&to_addr(&self.ledger_head)).unwrap();
        let head: LedgerHead = anchor_lang::AccountDeserialize::try_deserialize(&mut acc.data.as_slice()).unwrap();
        head.last_hash
    }
}



fn six_moves() -> SettleAmounts {
    SettleAmounts {
        burn: 200 * ONE,
        to_treasury: 150 * ONE,
        to_referral: 100 * ONE,
        to_events: 50 * ONE,
        from_events: 30 * ONE,
        from_referral: 12 * ONE,
    }
}

#[test]
fn compute_units_stay_within_the_default_budget() {
    let mut env = Env::ready();
    let mut rows: Vec<Measure> = Vec::new();


    let mut p = env.new_player();
    let kp = p.kp.insecure_clone();
    for (name, profile) in PROFILES {
        let i = env.spend_ix(&mut p, 1_000 * ONE, profile);
        rows.push(env.measure(&format!("spend ({name}, profile {profile})"), &[i], &kp));
    }


    let i = env.pay_sol_ix(&mut p, SOL / 10);
    rows.push(env.measure("pay_sol", &[i], &kp));


    let c = env.new_player();
    let ckp = c.kp.insecure_clone();
    let first = env.claim_ixs(&c, 500 * ONE, 1);
    rows.push(env.measure("claim_with_voucher V3 (first claim)", &first, &ckp));
    env.warp(86_400);
    let second = env.claim_ixs(&c, 500 * ONE, 2);
    rows.push(env.measure("claim_with_voucher V3 (second claim, cooldown branch)", &second, &ckp));


    let settler = env.settler.insecure_clone();
    let e0 = (env.now() / LEDGER_EPOCH_SECS) as u64 - 1 - (MAX_SETTLE_GAP_EPOCHS + 2);
    let i = env.settle_ix(e0, LEDGER_GENESIS, six_moves());
    rows.push(env.measure("settle_epoch (first epoch, 6 moves)", &[i], &settler));
    let i = env.settle_ix(e0 + 1, env.last_hash(), six_moves());
    rows.push(env.measure("settle_epoch (no gap, 6 moves)", &[i], &settler));
    let last = e0 + 1;
    let target = last + 1 + MAX_SETTLE_GAP_EPOCHS;
    let mut prev = env.last_hash();
    for e in last + 1..target {
        prev = epoch_hash(e, &LEDGER_GENESIS, 0, &prev);
    }
    let i = env.settle_ix(target, prev, six_moves());
    rows.push(env.measure(
        &format!("settle_epoch (gap of {MAX_SETTLE_GAP_EPOCHS} epochs, 6 moves)"),
        &[i],
        &settler,
    ));

    println!("\n| Instruction (worst case) | cot_core CU | Transaction CU |");
    println!("|---|---:|---:|");
    for r in &rows {
        println!("| {} | {} | {} |", r.name, r.program, r.tx);
    }
    let over: Vec<&Measure> = rows.iter().filter(|r| r.program > CU_BUDGET).collect();
    assert!(
        over.is_empty(),
        "instructions above {CU_BUDGET} CU: {:?}",
        over.iter().map(|r| (&r.name, r.program)).collect::<Vec<_>>()
    );
}
