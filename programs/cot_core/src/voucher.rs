




















use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use solana_instructions_sysvar::{load_current_index_checked, load_instruction_at_checked};

use crate::constants::{VOUCHER_DOMAIN, VOUCHER_MESSAGE_LEN};
use crate::errors::CotError;



pub const ED25519_OFFSETS_START: usize = 2;
pub const ED25519_OFFSETS_LEN: usize = 14;
pub const ED25519_DATA_START: usize = ED25519_OFFSETS_START + ED25519_OFFSETS_LEN;
pub const ED25519_PUBKEY_LEN: usize = 32;
pub const ED25519_SIGNATURE_LEN: usize = 64;
pub const CANONICAL_PUBKEY_OFFSET: usize = ED25519_DATA_START;
pub const CANONICAL_SIGNATURE_OFFSET: usize = CANONICAL_PUBKEY_OFFSET + ED25519_PUBKEY_LEN;
pub const CANONICAL_MESSAGE_OFFSET: usize = CANONICAL_SIGNATURE_OFFSET + ED25519_SIGNATURE_LEN;
pub const CANONICAL_DATA_LEN: usize = CANONICAL_MESSAGE_OFFSET + VOUCHER_MESSAGE_LEN;


pub const SAME_INSTRUCTION: u16 = u16::MAX;




#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ClaimVoucher {

    pub amount: u64,


    pub fee: u64,


    pub lots_hash: [u8; 32],


    pub ledger_ref: [u8; 32],

    pub nonce: u64,

    pub expiry: i64,
}












pub fn build_message(program_id: &Pubkey, player: &Pubkey, v: &ClaimVoucher) -> [u8; VOUCHER_MESSAGE_LEN] {
    let mut msg = [0u8; VOUCHER_MESSAGE_LEN];
    let mut o = 0;
    let parts: [&[u8]; 9] = [
        VOUCHER_DOMAIN.as_slice(),
        program_id.as_ref(),
        player.as_ref(),
        &v.amount.to_le_bytes(),
        &v.fee.to_le_bytes(),
        &v.lots_hash,
        &v.ledger_ref,
        &v.nonce.to_le_bytes(),
        &v.expiry.to_le_bytes(),
    ];
    for part in parts {
        msg[o..o + part.len()].copy_from_slice(part);
        o += part.len();
    }
    debug_assert_eq!(o, VOUCHER_MESSAGE_LEN);
    msg
}

fn read_u16(data: &[u8], at: usize) -> Result<u16> {
    let bytes: [u8; 2] = data
        .get(at..at + 2)
        .and_then(|s| s.try_into().ok())
        .ok_or(CotError::MalformedEd25519Instruction)?;
    Ok(u16::from_le_bytes(bytes))
}



pub fn check_ed25519_instruction(
    ix: &Instruction,
    expected_signer: &Pubkey,
    expected_message: &[u8; VOUCHER_MESSAGE_LEN],
) -> Result<()> {

    require_keys_eq!(
        ix.program_id,
        solana_sdk_ids::ed25519_program::ID,
        CotError::MissingEd25519Instruction
    );
    require!(ix.accounts.is_empty(), CotError::MalformedEd25519Instruction);

    let data = &ix.data;

    require!(
        data.len() == CANONICAL_DATA_LEN,
        CotError::MalformedEd25519Instruction
    );


    require!(data[0] == 1, CotError::WrongSignatureCount);
    require!(data[1] == 0, CotError::MalformedEd25519Instruction);


    let signature_offset = read_u16(data, 2)?;
    let signature_instruction_index = read_u16(data, 4)?;
    let public_key_offset = read_u16(data, 6)?;
    let public_key_instruction_index = read_u16(data, 8)?;
    let message_data_offset = read_u16(data, 10)?;
    let message_data_size = read_u16(data, 12)?;
    let message_instruction_index = read_u16(data, 14)?;





    require!(
        signature_instruction_index == SAME_INSTRUCTION
            && public_key_instruction_index == SAME_INSTRUCTION
            && message_instruction_index == SAME_INSTRUCTION,
        CotError::Ed25519CrossInstructionReference
    );




    require!(
        public_key_offset as usize == CANONICAL_PUBKEY_OFFSET
            && signature_offset as usize == CANONICAL_SIGNATURE_OFFSET
            && message_data_offset as usize == CANONICAL_MESSAGE_OFFSET
            && message_data_size as usize == VOUCHER_MESSAGE_LEN,
        CotError::MalformedEd25519Instruction
    );


    let pubkey_bytes = &data[CANONICAL_PUBKEY_OFFSET..CANONICAL_PUBKEY_OFFSET + ED25519_PUBKEY_LEN];
    require!(
        pubkey_bytes == expected_signer.as_ref(),
        CotError::WrongVoucherSigner
    );


    let msg_bytes = &data[CANONICAL_MESSAGE_OFFSET..CANONICAL_MESSAGE_OFFSET + VOUCHER_MESSAGE_LEN];
    require!(
        msg_bytes == expected_message.as_slice(),
        CotError::VoucherMessageMismatch
    );
    Ok(())
}




pub fn verify_voucher_signature(
    instructions_sysvar: &AccountInfo,
    expected_signer: &Pubkey,
    expected_message: &[u8; VOUCHER_MESSAGE_LEN],
) -> Result<()> {
    let current = load_current_index_checked(instructions_sysvar)? as usize;

    let prev = current
        .checked_sub(1)
        .ok_or(CotError::MissingEd25519Instruction)?;
    let ix = load_instruction_at_checked(prev, instructions_sysvar)?;
    check_ed25519_instruction(&ix, expected_signer, expected_message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    fn canonical_ix(signing: &SigningKey, msg: &[u8]) -> Instruction {
        let pk = signing.verifying_key().to_bytes();
        let sig = signing.sign(msg).to_bytes();
        let mut data = vec![1u8, 0u8];
        for v in [
            CANONICAL_SIGNATURE_OFFSET as u16,
            SAME_INSTRUCTION,
            CANONICAL_PUBKEY_OFFSET as u16,
            SAME_INSTRUCTION,
            CANONICAL_MESSAGE_OFFSET as u16,
            msg.len() as u16,
            SAME_INSTRUCTION,
        ] {
            data.extend_from_slice(&v.to_le_bytes());
        }
        data.extend_from_slice(&pk);
        data.extend_from_slice(&sig);
        data.extend_from_slice(msg);
        Instruction {
            program_id: solana_sdk_ids::ed25519_program::ID,
            accounts: vec![],
            data,
        }
    }

    fn setup() -> (SigningKey, Pubkey, [u8; VOUCHER_MESSAGE_LEN], Instruction) {
        let signing = SigningKey::generate(&mut rand::rngs::OsRng);
        let signer = Pubkey::new_from_array(signing.verifying_key().to_bytes());
        let msg = build_message(&crate::ID, &Pubkey::new_unique(), &voucher(1_000, 7, 1_700_000_000));
        let ix = canonical_ix(&signing, &msg);
        (signing, signer, msg, ix)
    }

    fn voucher(amount: u64, nonce: u64, expiry: i64) -> ClaimVoucher {
        ClaimVoucher {
            amount,
            fee: amount * 3 / 100,
            lots_hash: [0xAB; 32],
            ledger_ref: [0xCD; 32],
            nonce,
            expiry,
        }
    }

    fn err_of(r: Result<()>) -> anchor_lang::error::Error {
        r.expect_err("expected failure")
    }

    fn assert_err(r: Result<()>, e: CotError) {
        assert_eq!(err_of(r), anchor_lang::error::Error::from(e));
    }

    #[test]
    fn message_layout_is_stable() {
        let p = Pubkey::new_from_array([2u8; 32]);
        let w = Pubkey::new_from_array([3u8; 32]);
        let v = ClaimVoucher {
            amount: 0x0102,
            fee: 0x0506,
            lots_hash: [4u8; 32],
            ledger_ref: [5u8; 32],
            nonce: 0x0304,
            expiry: -1,
        };
        let m = build_message(&p, &w, &v);
        assert_eq!(m.len(), 172);
        assert_eq!(&m[0..12], b"COT_CLAIM_V3");
        assert_eq!(&m[12..44], &[2u8; 32]);
        assert_eq!(&m[44..76], &[3u8; 32]);
        assert_eq!(&m[76..84], &0x0102u64.to_le_bytes());
        assert_eq!(&m[84..92], &0x0506u64.to_le_bytes());
        assert_eq!(&m[92..124], &[4u8; 32]);
        assert_eq!(&m[124..156], &[5u8; 32]);
        assert_eq!(&m[156..164], &0x0304u64.to_le_bytes());
        assert_eq!(&m[164..172], &(-1i64).to_le_bytes());
    }

    #[test]
    fn accepts_canonical_instruction() {
        let (_, signer, msg, ix) = setup();
        check_ed25519_instruction(&ix, &signer, &msg).unwrap();
    }

    #[test]
    fn rejects_other_program() {
        let (_, signer, msg, mut ix) = setup();
        ix.program_id = Pubkey::new_unique();
        assert_err(check_ed25519_instruction(&ix, &signer, &msg), CotError::MissingEd25519Instruction);
    }

    #[test]
    fn rejects_each_cross_instruction_index_independently() {

        for at in [4usize, 8, 14] {
            let (_, signer, msg, mut ix) = setup();
            ix.data[at..at + 2].copy_from_slice(&0u16.to_le_bytes());
            assert_err(
                check_ed25519_instruction(&ix, &signer, &msg),
                CotError::Ed25519CrossInstructionReference,
            );
        }
    }

    #[test]
    fn rejects_two_signatures() {
        let (_, signer, msg, mut ix) = setup();
        ix.data[0] = 2;
        assert_err(check_ed25519_instruction(&ix, &signer, &msg), CotError::WrongSignatureCount);
    }

    #[test]
    fn rejects_non_canonical_offsets() {
        for (at, val) in [(2usize, 47u16), (6, 15), (10, 111), (12, 99)] {
            let (_, signer, msg, mut ix) = setup();
            ix.data[at..at + 2].copy_from_slice(&val.to_le_bytes());
            assert_err(
                check_ed25519_instruction(&ix, &signer, &msg),
                CotError::MalformedEd25519Instruction,
            );
        }
    }

    #[test]
    fn rejects_trailing_bytes_and_truncation() {
        let (_, signer, msg, mut ix) = setup();
        ix.data.push(0);
        assert_err(check_ed25519_instruction(&ix, &signer, &msg), CotError::MalformedEd25519Instruction);
        let (_, signer, msg, mut ix) = setup();
        ix.data.pop();
        assert_err(check_ed25519_instruction(&ix, &signer, &msg), CotError::MalformedEd25519Instruction);
    }

    #[test]
    fn rejects_wrong_signer() {
        let (_, _, msg, ix) = setup();
        assert_err(
            check_ed25519_instruction(&ix, &Pubkey::new_unique(), &msg),
            CotError::WrongVoucherSigner,
        );
    }

    #[test]
    fn rejects_any_message_field_change() {
        let (signing, signer, _, _) = setup();
        let player = Pubkey::new_unique();
        let base = voucher(1_000, 7, 100);
        let signed = build_message(&crate::ID, &player, &base);
        let ix = canonical_ix(&signing, &signed);
        let changed: [fn(&mut ClaimVoucher); 6] = [
            |v| v.amount += 1,
            |v| v.fee += 1,
            |v| v.lots_hash[31] ^= 1,
            |v| v.ledger_ref[0] ^= 1,
            |v| v.nonce += 1,
            |v| v.expiry += 1,
        ];
        let mut variants = vec![
            build_message(&Pubkey::new_unique(), &player, &base),
            build_message(&crate::ID, &Pubkey::new_unique(), &base),
        ];
        for f in changed {
            let mut v = base;
            f(&mut v);
            variants.push(build_message(&crate::ID, &player, &v));
        }
        for expected in variants {
            assert_err(
                check_ed25519_instruction(&ix, &signer, &expected),
                CotError::VoucherMessageMismatch,
            );
        }
    }

    #[test]
    fn rejects_instruction_with_accounts() {
        let (_, signer, msg, mut ix) = setup();
        ix.accounts.push(anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
            Pubkey::new_unique(),
            false,
        ));
        assert_err(check_ed25519_instruction(&ix, &signer, &msg), CotError::MalformedEd25519Instruction);
    }
}
