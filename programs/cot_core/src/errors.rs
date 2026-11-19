



use anchor_lang::prelude::*;

#[error_code]
pub enum CotError {

    #[msg("Signer is not the program upgrade authority")]
    NotUpgradeAuthority,
    #[msg("Signer is not the configured admin")]
    NotAdmin,
    #[msg("Signer is neither the guardian nor the admin")]
    NotGuardianOrAdmin,
    #[msg("Signer is not the pending admin")]
    NotPendingAdmin,


    #[msg("Fee split basis points must add up to exactly 10000")]
    FeeSplitNotFullBps,
    #[msg("Split profile is out of range, inactive, or profile 0 is missing")]
    InvalidSplitProfile,
    #[msg("Claim tax parameters are out of bounds")]
    ClaimTaxOutOfBounds,
    #[msg("Claim caps must be positive and the daily cap cannot exceed the epoch cap")]
    InvalidClaimCaps,
    #[msg("Epoch duration is out of bounds")]
    EpochDurationOutOfBounds,
    #[msg("Voucher TTL is out of bounds")]
    VoucherTtlOutOfBounds,
    #[msg("A required key is the default (all zero) pubkey")]
    ZeroKey,
    #[msg("Mint has a Token-2022 extension that this program does not accept")]
    UnsupportedMintExtension,
    #[msg("Mint still has a freeze authority")]
    MintHasFreezeAuthority,
    #[msg("Token account mint does not match the configured mint")]
    MintMismatch,
    #[msg("Mint decimals do not match the decimals this program expects")]
    MintDecimalsMismatch,
    #[msg("Minimum claim must be positive and not above the daily cap")]
    InvalidMinClaim,
    #[msg("Withdrawal SOL fee is above the hard ceiling")]
    WithdrawFeeOutOfBounds,
    #[msg("Claim cooldown is out of bounds")]
    ClaimCooldownOutOfBounds,
    #[msg("Maximum claim fee must lie between the tax floor and the hard ceiling")]
    ClaimFeeBoundsOutOfBounds,


    #[msg("Program is paused")]
    Paused,
    #[msg("Program is already paused")]
    AlreadyPaused,
    #[msg("Program is not paused")]
    NotPaused,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Arithmetic overflow or underflow")]
    MathOverflow,


    #[msg("Order sequence must be strictly greater than the last paid order")]
    OrderSeqNotIncreasing,


    #[msg("Instruction before the claim is not an Ed25519 signature verification")]
    MissingEd25519Instruction,
    #[msg("Ed25519 instruction is malformed or does not use the canonical layout")]
    MalformedEd25519Instruction,
    #[msg("Ed25519 instruction must verify exactly one signature")]
    WrongSignatureCount,
    #[msg("Ed25519 offsets must reference data inside the Ed25519 instruction itself")]
    Ed25519CrossInstructionReference,
    #[msg("Voucher was not signed by the configured voucher signer")]
    WrongVoucherSigner,
    #[msg("Signed message does not match the expected voucher")]
    VoucherMessageMismatch,
    #[msg("Voucher has expired")]
    VoucherExpired,
    #[msg("Voucher expiry is too far in the future")]
    VoucherExpiryTooFar,
    #[msg("Voucher nonce must be strictly greater than the last used nonce")]
    NonceNotIncreasing,
    #[msg("Claim exceeds the player daily cap")]
    DailyCapExceeded,
    #[msg("Claim exceeds the global epoch cap")]
    EpochCapExceeded,
    #[msg("Reward vault balance is too low")]
    InsufficientVault,
    #[msg("Token transfer did not deliver the expected amount")]
    TransferAmountMismatch,


    #[msg("Claim is below the minimum withdrawal")]
    ClaimBelowMinimum,
    #[msg("Voucher fee is above the maximum lot fee")]
    ClaimFeeAboveMax,
    #[msg("Voucher fee is below the floor lot fee")]
    ClaimFeeBelowFloor,
    #[msg("Voucher lots hash is missing (all zero)")]
    MissingLotsHash,
    #[msg("Only one withdrawal is allowed per cooldown window")]
    ClaimCooldownActive,
    #[msg("Wallet holds less than the minimum balance required to withdraw")]
    WalletBalanceTooLow,


    #[msg("Signer is not the configured settler")]
    NotSettler,
    #[msg("Epoch is not after the last settled epoch")]
    EpochAlreadySettled,
    #[msg("Epoch skips more empty epochs than one settlement may rebuild")]
    SettleGapTooLarge,
    #[msg("Epoch has not ended yet")]
    EpochNotEnded,
    #[msg("Previous hash does not chain to the last settled epoch")]
    PrevHashMismatch,
    #[msg("Epoch hash does not match epoch, root, leaf count and previous hash")]
    EpochHashMismatch,
    #[msg("Settlement amount exceeds the per-epoch cap")]
    SettleCapExceeded,



    #[msg("Voucher has not expired yet on the cluster clock")]
    VoucherNotExpired,



    #[msg("Settlement amount exceeds what the caps allow in the current real-time window")]
    SettleWindowCapExceeded,
    #[msg("Epoch is before the first epoch the ledger head accepts")]
    EpochBeforeLedgerStart,
}
