<p align="center">
  <img src=".github/assets/banner.png" alt="Crypto of Thrones core" width="100%">
</p>

<h1 align="center">Crypto of Thrones · core</h1>

<p align="center">
  <strong>Verifiable draws · Hash-chained ledger · Deterministic game rules</strong>
</p>

<p align="center">
  <a href="https://github.com/Crypto-of-Thrones/core/actions/workflows/guard.yml"><img src="https://github.com/Crypto-of-Thrones/core/actions/workflows/guard.yml/badge.svg" alt="guard"></a>
</p>

This repository holds the code that decides what a player of [Crypto of Thrones](https://cot.gg)
earns and spends: every random draw, every recorded action and every on-chain payment rule. It is
published so that anyone, player or auditor, can recompute the game's results on their own machine
and check them against the public record, without trusting the game servers.

## Contents

- [What this repository is](#what-this-repository-is)
- [What it is not](#what-it-is-not)
- [Quickstart](#quickstart)
- [How a draw is verifiable](#how-a-draw-is-verifiable)
- [The hash-chained ledger](#the-hash-chained-ledger)
- [The deterministic engine and replay](#the-deterministic-engine-and-replay)
- [The on-chain program and its verifiable build](#the-on-chain-program-and-its-verifiable-build)
- [Verification pipeline](#verification-pipeline)
- [Repository layout](#repository-layout)
- [Trust model](#trust-model)
- [Audit FAQ](#audit-faq)
- [Contributing and security](#contributing-and-security)
- [License](#license)
- [Official links](#official-links)

## What this repository is

- **The draw derivation.** How a public [drand](https://drand.love) beacon round becomes the
  uniform numbers of a draw, with the beacon's BLS signature checked locally.
- **The ledger verifier.** The hash chain of every account's public ledger, the hourly Merkle
  epochs anchored on Solana, and a checker that re-runs the rule of each recorded action.
- **The deterministic game rules.** The hunt engine and the rule modules (summons, fusion,
  training, boxes, lottery, raids, joust, world boss, expeditions, homestead and more), with the
  tables and percentages they read. The game server imports these same modules.
- **The on-chain program.** The Solana program (Anchor) that holds player balances, checks signed
  vouchers, splits fees and settles the ledger epochs, with a reproducible build script.

## What it is not

- It is not the game client, its art or its interface.
- It is not the game server, the signing service, the back office or any operational tooling.
- It is not an SDK or a library with a stable API. Module paths and exports follow the game.
- It does not contain keys, credentials, wallet setup or deployment procedures, and never will.
- It is not open source in the OSI sense. See [License](#license).

## Quickstart

Requirements: [Node.js](https://nodejs.org) 20.19+ or 22+. No `npm install` is needed: the code has
no dependencies besides the vendored, pinned BLS library in `web/vendor/noble-bls/`. The root
`package.json` only marks every `.js` file as an ES module.

```sh
git clone https://github.com/Crypto-of-Thrones/core.git
cd core

# 1. Run the hunt replay tests against the frozen golden hours
node tools/replay-hunt-test.mjs

# 2. Replay one hunt hour (a ledger entry or its engine input, as JSON)
node tools/replay-hunt.mjs hour.json

# 3. Verify the whole public ledger of an account on mainnet (<audit-id>: the account's public
#    audit id, 32 characters of a-z and 2-7, as in the game's public audit links)
node tools/verify/verify.mjs <audit-id> --mainnet --base https://api.cot.gg \
  --rpc https://api.mainnet-beta.solana.com --program Cyz7fwhJomMxGtNtj752YcuoSvKASRaYTzrxhHu31FaC

# 3b. The same on the public devnet beta
node tools/verify/verify.mjs <audit-id> --base https://api-beta.cot.gg --rpc https://api.devnet.solana.com
```

`verify.mjs` downloads the account's public ledger, checks the hash chain, the Merkle proof of
every entry (only with `--acct`: without it the `merkle` step is reported as `skip`), the
anchoring transaction on Solana, every drand beacon, and re-runs the rule of each entry. It checks every entry to the end, prints one line per entry and a summary, and then exits
with code 1 if any check failed (0 when everything passed, 2 on a usage error or when the ledger
cannot be read, 3 when every check passed but no draw was replayed, see below). Useful flags:

| Flag | Meaning |
|---|---|
| `--base URL` | The game server that serves the public ledger (`https://api.cot.gg` on mainnet, `https://api-beta.cot.gg` for the beta) |
| `--rpc URL` | Any Solana JSON-RPC endpoint; the anchors are read on chain through it |
| `--mainnet` | Mainnet rules: `--rpc` is required and only `settle_epoch` anchors are accepted |
| `--acct ACCT` | Optional: the account's own id (40 hex characters), needed only for the Merkle step; the public proof leaves it out |
| `--file entries.json` | Verify a saved copy of the ledger instead of downloading it |
| `--from YYYY-MM-DD`, `--days N` | Limit the time window |
| `--known SEQ:HASH` | Pin an entry you saved earlier; a rewritten history then fails |
| `--program ID` | The program id whose ledger head anchors the epochs |
| `--rules-ref COMMIT` | The commit of the rule code you are running (see below) |
| `--json` | Machine-readable output |

Each draw entry names the commit of the rule code that produced it (its `rules` field). That
commit belongs to the game's source repository, which this repository does not share: its history
starts fresh at each export. So every release records the commit it was exported from in the
`rules` field of `core-manifest.json`, and the verifier uses that value as the commit of the code
you run (none when a file under `web/js/` no longer matches the SHA-256 the manifest lists). It
replays a draw only when the entry's commit and yours match; any other draw reports `rule=other`
and names its commit. To replay those draws, run the verifier from the release whose
`core-manifest.json` has that `rules` value, or pass `--rules-ref any` to replay every draw with
the code you have (a rule changed between the two commits then shows as a failed replay, not as
fraud by itself). `--rules-ref COMMIT` sets the commit of the code you run explicitly.

A run where every check passed but something is still open ends with `PASS, NOT FINAL` and the
reason: entries recorded under other rules (their replay was not run), anchors still pending or
not read on chain, or entries still waiting for a step. With `--json` the same reasons are in the
`reasons` array (`code` `rules` with the `commits`, `anchors` with `pending` and `unchecked`, or
`wait`). The exit code is 0 for any pass, final or not, with one exception: when the account
has draws and none of them was replayed (all recorded under other rules, or checked by signature
only), no outcome was verified, so the run prints a `NOT VERIFIED: 0 of N draw entries replayed` line
(`noReplay` in `--json`) and exits with code 3. Each server deploy records its own commit, so a
release often matches none of them: re-run with the release named in that line, or with
`--rules-ref any`.

Read the `replayed X of N draw entries (Y signature only, Z other rules)` line that every run prints
before its verdict (`replay` in `--json`, with `replayed`, `total`, `signatureOnly` and
`otherRules`). N counts ledger entries that carry a draw, so a paid act and its reveal are 2
entries. Exit code 0 only says that every check that ran passed: a run that replayed 1 of
50 draw entries also exits 0. Only the X replayed entries had their outcome recomputed; the others were
checked by their drand signature or left for the release of their rules.

### What a run proves

A `PASS` row means the entry is in the account's hash chain, in an anchored epoch, and that a rule
of this repository re-ran it: a drand draw replayed to the same outcome, a fixed reward table, the
catalog price of a paid action, or the queue join that paid a match. One kind of `PASS` re-runs
nothing: an entry of a kind that moves no value at all (equipping owned gear, wearing a cosmetic,
an invite or social record, the account's opening entry) passes when it has no balance change and
only the fields its kind is written with. Its row says `rule=none` and `(no value moved)`, and the
summary counts these entries on a `NOTE:` line, apart from the replayed ones.

Every other entry that no rule here re-runs yet (a hunt send, a drop, a quest reward, an invite
commission, a dungeon or voyage collect, a beta grant, a lottery ticket, a trial grant, a US$
return conversion, and more) is proven by its hash chain and anchor only. It reports `SIG` with
`(no rule)`, and the run ends `PASS, NOT FINAL` with the `norule` reason. Many accounts therefore
do not reach a final `PASS` today. That is the honest state of the verifier, not a regression: an
entry is called fully proven only when a rule re-ran it, and each new rule turns its kind's rows
into `PASS` without any change to the ledger.

To build the on-chain program reproducibly (needs Docker and Rust):

```sh
cd programs && bash scripts/verifiable-build.sh
```

## How a draw is verifiable

Every random outcome in the game (a summon, a box, a training roll, a lottery, a raid, a hunt
drop) comes from a public randomness beacon that nobody, including the game, can predict or
change: the drand **quicknet** chain of the League of Entropy (`web/js/drand.js`).

1. **Commit before the randomness exists.** When a player acts, the server records an `act` entry
   in the player's ledger that charges the action and names a drand round a few seconds in the
   future (`roundAt` and `drawRound` in `drand.js`; quicknet publishes one round every 3 seconds).
   Scheduled draws, such as the daily lottery, pin their round from the draw time in the same way.
2. **Wait for the beacon.** The round is published by drand as `{ round, randomness, signature }`.
3. **Check the beacon.** The signature is a BLS12-381 short signature (scheme
   `bls-unchained-g1-rfc9380`) over `SHA-256(round as 8 big-endian bytes)`, verified against the
   quicknet public key pinned in `QUICKNET`. The randomness must equal `SHA-256(signature)`.
4. **Derive the uniforms.** For draw id `id` in context `kind`, block `b` of the seed is
   `HMAC-SHA256(key = randomness, message = JSON ["cot-draw/v1", kind, id, b])`. Each 32-byte block
   gives eight uniforms in `[0, 1)`, one per 4 bytes read as a big-endian `uint32 / 2^32`.
5. **Apply the rule.** The action's own pure rule function (for example `summonBatch` or
   `rollTraining`) turns the uniforms into the outcome. The verifier runs the same function and
   compares the result with what the ledger recorded.

```mermaid
sequenceDiagram
    autonumber
    participant P as Player
    participant S as Game server
    participant L as Public ledger
    participant D as drand quicknet
    participant V as Verifier (this repo)
    P->>S: action (summon, box, lottery ticket...)
    S->>L: "act" entry: charge and future round R
    D-->>S: round R published: randomness, BLS signature
    S->>L: "reveal" entry: outcome, beacon proof
    V->>L: download entries
    V->>D: fetch round R (any relay)
    V->>V: verify BLS signature and randomness = SHA-256(signature)
    V->>V: uniforms = HMAC-SHA256(randomness, ["cot-draw/v1", kind, id, block])
    V->>V: re-run the rule function and compare with the recorded outcome
```

Because the round is named before it exists and the derivation is public, the server cannot
choose a favorable outcome. Because the rule function is public, it cannot apply a different rule.

## The hash-chained ledger

Each account has an append-only public ledger. Every entry `{ seq, ts, kind, data, prev, hash }`
is bound to the one before it (`web/js/net.js`):

```
hash = SHA-256(prev + "\n" + seq + "\n" + ts + "\n" + kind + "\n" + data)
```

The first entry links to a genesis value of 64 zeros. Changing, removing or reordering any entry
breaks every hash after it.

Every hour the server closes an **epoch**: each account's range of entries becomes a leaf
(`COT-LEDGER-LEAF-v1`, account, first and last seq, head hash), the leaves form a Merkle tree
(domain-separated: `0x00` prefix for leaves, `0x01` for nodes), and the epoch hash chains the root
to the previous epoch (`COT-LEDGER-EPOCH-v1`). The epoch is then anchored on Solana: on mainnet
through the program's `settle_epoch` instruction, on the devnet beta through a Memo transaction.
`web/js/ledgerverify.js` checks the leaf, the Merkle path, the epoch hash and the anchoring
transaction.

```mermaid
flowchart LR
    G["genesis<br/>000...000"] --> E1["entry 1<br/>hash 1"]
    E1 --> E2["entry 2<br/>hash 2"]
    E2 --> E3["..."]
    E3 --> EN["entry n<br/>head hash"]
    EN --> LF["epoch leaf<br/>account, seq range, head"]
    LF --> MR["Merkle root<br/>of all accounts"]
    MR --> EH["epoch hash<br/>chained to previous epoch"]
    EH --> SOL[("Solana<br/>settle_epoch")]
```

## The deterministic engine and replay

The hunt (the game's main income) runs through a deterministic engine, `web/js/huntengine.js`.
Given the same input it always produces the same result, with no clock, no randomness of its own
and no network. The server pays every hunt hour by calling `checkHour` on the recorded input, and
the input is published inside the hunt entry of the ledger.

- `tools/replay-hunt.mjs` takes one hunt entry (or its engine input) and recomputes the hour: the
  entry hash, the spread drawn from the beacon, and the engine result. It also prints the SHA-256
  of the engine input, which anyone can compare with the published one.
- `tools/replay-hunt-test.mjs` replays frozen golden hours (`tools/fixtures/replay-hunt-golden.json`)
  and checks that the engine's import closure stays inside `web/js/` and holds no secret.

## The on-chain program and its verifiable build

`programs/cot_core/` is the Solana program, written with [Anchor](https://www.anchor-lang.com).
It keeps the vault and player accounts, spends and pays with fee splits checked in integer math,
accepts claims only with a voucher signed by the game's signer and a unique nonce, and settles the
hourly ledger epochs (`settle_epoch`). `programs/cot_core/idl/cot_core.json` is its interface.

### Deployed program

| | |
|---|---|
| Cluster | Solana mainnet-beta (live since 2026-11-20) |
| Program id | `Cyz7fwhJomMxGtNtj752YcuoSvKASRaYTzrxhHu31FaC` |
| Framework | Anchor 1.2.2, Solana 3.1.10 toolchain (`programs/Anchor.toml`) |
| Executable hash (`solana-verify get-program-hash`) | `9051ee392c5fd8ec8b1e83e3af5c55555c1e59fbd75b910cb2f91bd99d4663aa` |
| SHA-256 of the deployed `cot_core.so` (627,576 bytes) | `1c8110880a347156f1be0082cdc3a9833c0b1253d52f147d3bd7a7c97f621251` |
| Upgrade authority | a Squads multisig vault (2 of 3 signers, 24 hour time lock); read it on chain with `solana program show <program id>` |
| Devnet beta program | `9Ba34xzmNb9WP8YrhRi2brwnFJLdNsAZrQmgA6FRK5k4` (built with the cargo feature `devnet`) |

### Audit scope of the program

Everything under `programs/cot_core/`: about 3,600 lines of Rust in `src/`, the instruction
interface in `idl/cot_core.json`, and the tests in `tests/` (LiteSVM integration tests and a
compute budget test).

- Instructions: `initialize`, `accept_admin`, `update_config`, `set_settle_caps`, `pause`,
  `unpause`, `fund_vault`, `init_player`, `spend`, `pay_sol`, `claim_with_voucher`,
  `cancel_nonce`, `init_ledger_head`, `settle_epoch`, `reanchor_ledger_head`.
- Accounts: `Config`, `PlayerState`, `LedgerHead`, plus the program-derived token vaults.
- Points worth the closest look: the ed25519 voucher check and nonce replay protection
  (`voucher.rs`, `instructions/claim.rs`, `instructions/cancel.rs`), the fee split and integer
  math (`math.rs`, `instructions/spend.rs`), the token transfers (`token_ops.rs`, Token and
  Token-2022), the settlement window and its per-hour caps (`instructions/settle.rs`), and the
  admin and pause paths (`instructions/admin.rs`).

### Reproduce the deployed binary

`programs/scripts/verifiable-build.sh` builds the program with
[solana-verify](https://github.com/solana-foundation/solana-verifiable-build) 0.5.2 inside the
official Docker image pinned by digest, so the same tree always gives the same program hash.
Needs Docker and Rust.

```sh
git clone https://github.com/Crypto-of-Thrones/core.git && cd core/programs
bash scripts/verifiable-build.sh          # mainnet build, default features
solana-verify get-program-hash -u https://api.mainnet-beta.solana.com \
  Cyz7fwhJomMxGtNtj752YcuoSvKASRaYTzrxhHu31FaC
```

The executable hash the script prints must equal the on-chain one. Every token of the Rust
sources keeps the line and column it had in the tree the program was deployed from (only
comments were removed), so the file and line locations compiled into the binary are the same.

The program embeds a `security.txt` (`programs/cot_core/src/lib.rs`, read it with
`query-security-txt`). Its `source_revision` and `source_release` name the commit and branch of
the game's own repository the deployed binary was built from. That history is not public, so the
binding between this repository and the deployed program is the reproduced hash above, not the
commit id. The `auditors` field says that no external audit has been completed yet.

## Verification pipeline

Every entry goes through the same steps, reported in this order (`verifyEntry` in
`web/js/ledgerverify.js`). A step that does not apply to an entry is reported as `skip`; the
`merkle` step runs only when `--acct` is given, and is `skip` otherwise. Every
entry is checked; the run ends with a summary and exits with code 1 if any entry failed.

```mermaid
flowchart TD
    A["Public ledger<br/>GET entries of an account"] --> B{"chain<br/>links and hashes"}
    B -- ok --> E{"beacon<br/>drand BLS signature"}
    E -- ok --> F{"bound<br/>round named before it existed"}
    F -- ok --> G{"rule<br/>same function, same outcome"}
    G -- ok --> C{"merkle<br/>leaf, path, epoch hash"}
    C -- ok --> D{"anchor<br/>epoch root on Solana"}
    D -- ok --> H(["entry verified"])
    B -- bad --> X(["entry failed"])
    E -- bad --> X
    F -- bad --> X
    G -- bad --> X
    C -- bad --> X
    D -- bad --> X
    H --> S(["next entry, then summary<br/>exit 1 if any entry failed"])
    X --> S
```

## Repository layout

```
.
├── web/js/                 game rules, draw derivation and ledger verifier (ES modules)
│   ├── drand.js            beacon rounds, BLS verification, uniforms
│   ├── net.js              ledger entry hash, chain check, Merkle root
│   ├── ledgerverify.js     per-entry verification: chain, beacon, bound, rule, Merkle, anchor
│   ├── huntengine.js       deterministic hunt engine (checkHour, replayHour)
│   ├── data.js, balance.js tables, prices, chances and fee split
│   └── ...                 one module per game system
├── web/vendor/noble-bls/   pinned third-party BLS12-381 (MIT), byte for byte
├── tools/
│   ├── verify/verify.mjs   command line ledger verifier
│   ├── replay-hunt.mjs     hunt hour replay
│   ├── replay-hunt-test.mjs, fixtures/
│   └── guard/              repository guard (hooks and CI)
├── programs/               Solana program (Anchor) and verifiable build script
├── core-manifest.json      SHA-256 of every file and of the whole tree
└── docs/releases/          release notes
```

Two modules are published as reduced versions of the game's own files. `web/js/buildprofile.js`
keeps only the constants the rules and the verifier read (network, program id, mode switches).
`web/js/launchplan.js` keeps only the feature-opening logic of the features whose opening changes
an exported rule (the daily task draw and the daily chest). Neither change alters a rule.

## Trust model

| You trust | Because |
|---|---|
| drand quicknet | A threshold network of independent organizations; any single member cannot bias a round |
| SHA-256, HMAC-SHA256, BLS12-381 | Standard primitives; the BLS code is vendored with its upstream hash |
| Solana | The epoch anchors and the program state are read from the chain through any RPC you choose |
| This repository | Only to the extent you read it; the verifier needs nothing else from us |

You do **not** need to trust the game server: it cannot rewrite history (hash chain and on-chain
anchors), cannot choose a draw (future round, public derivation) and cannot apply another rule
(public rule functions re-run by the verifier). What the verifier cannot see: actions that never
reach the ledger, and the game client's display. If the client shows something the ledger does
not hold, the ledger is what counts.

## Audit FAQ

**Which commit is live?** For the program, the one whose verifiable build gives the on-chain
executable hash (see [Deployed program](#deployed-program)); the release notes say which release
that is. For the game rules, each ledger entry names its rule commit, and the `rules` field of
`core-manifest.json` names the commit this tree was exported from. `core-manifest.json` also lists
the SHA-256 of every file and a `tree` hash of the whole set.

**Can the server pick a good round?** No. The `act` entry that charges the player names a round
that does not exist yet, and the verifier checks that the entry was written before that round's
time (the `bound` step).

**Why are there no comments in the code?** The modules are exported from the game's repository
with comments removed. Rust files keep every token on its original line and column, so the
locations compiled into the program do not move.

**Why does a modified module or a stub not change results?** The two reduced modules only drop
constants and features that no exported rule reads; the full test suite of the export runs on the
reduced tree.

**Some ledger entries come without data. Why?** A few entry kinds that name personal identifiers
(a wallet change, an old social link row) are published redacted. Their hash is still bound by
the next entry and by the epoch proof, and a draw, a payment or a reward can never be redacted.

**I found a divergence. What now?** Open a "Draw divergence" or "Verification bug" issue with the
account, the entry `seq` and the verifier output. If it could be exploited, write to hi@cot.gg
first (see [SECURITY.md](SECURITY.md)).

## Contributing and security

- [CONTRIBUTING.md](CONTRIBUTING.md): how to report a verification divergence and propose a change.
- [SECURITY.md](SECURITY.md): private vulnerability reports, scope, response times and safe harbor.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): Contributor Covenant 2.1.
- [CHANGELOG.md](CHANGELOG.md) and [release notes](docs/releases/).

## License

This repository is licensed under the **Business Source License 1.1** ([LICENSE](LICENSE)).

In plain words:

- **You may** read the code, audit it, compile it, run the tests, rebuild the program
  reproducibly, run the ledger verifier and the hunt replay, and publish your findings. Modified
  copies are fine for these purposes.
- **You may not** run this code, or a derivative of it, as part of a game, service or on-chain
  program offered to others.
- **On the Change Date** (2030-11-18), each version becomes available under the Apache License 2.0.

This is the "Additional Use Grant" of the license. The license text is authoritative; for other
uses, write to hi@cot.gg.

## Official links

- Website: [cot.gg](https://cot.gg)
- Wiki: [cot.gg/wiki](https://cot.gg/wiki)
- Security policy: [cot.gg/security](https://cot.gg/security)
- Contact: hi@cot.gg
- drand quicknet: [docs.drand.love](https://docs.drand.love)
