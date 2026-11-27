# Changelog

All notable changes to this repository are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.8] - 2026-11-27

### Fixed

- External report: `marketSale`, `marketBuy` and `huntLive` entries are held to the exact balance
  change the game books (`STATIC_PAID`), not only to their `refs`; a mismatch is `bad` (`amount`).
  Such an entry that carries a draw is `bad` (`draw`), never `wait`.
- External report: with `--mainnet` a sale pays only the Hunt chest and a wallet purchase is
  accepted only as an on-chain order; the test wallet pocket fails.
- External report: a cancelled Duel or Joust reveal must move no balance at all.

### Changed

- The Market sale tax is checked by the entry's time: 10% in one team row from 2026-11-27 00:00
  UTC (`MARKET_TAX10_FROM`), 12% in the previous two rows before it; an undated wallet purchase
  fails.
- A queue Joust match where both lords paid may pay the foe's win to the winner (`refs.foeWin`,
  capped, with `refs.foeEntry`).
- A Squire act with a live quote (`refs.quote`) is priced at `quote.cot`.
- A Mint 1k summon paid from the new war balance is priced at the Mint 1k price.
- Farm hunger: a hunt leg recorded with `hungerHunt` replays the food rule (one meal keeps a
  mercenary fed for `barHours` hours, with an opening grace).
- New `horseBreed` reveal rule (horse breeding is not open in the game).
- Pass owners claim the boat reward at any level; the Pale Vigil reward seed is 168,000 base.
- The on-chain program is unchanged from v0.1.4.

Release notes: [docs/releases/v0.1.8.md](docs/releases/v0.1.8.md).

## [0.1.7] - 2026-11-26

### Fixed

- External report (byfor): a hunt hour that overlaps a Fight Hour window replays in full only
  against the realm log commitment of its day, published before the drand round of the window.
  Without that record the entry is `SIG` (`why: fight record not read`), never `PASS`.
- Internal review: each reveal is held to one paid act of its own kind and credits only what its
  payout rule gives.
- Internal review: a Duel or Joust bind needs the paid queue join of its lord; one join backs one
  bind.
- Internal review: every action entry must use the current (v2) format once the account's chain
  uses it, and always on mainnet.
- Internal review: the live Field Luck rule of a raid is chosen from the era of its drand round.
- Internal review: an act whose reveal is served masked ends as `hidden`, never `PASS`.
- Internal review: an on-chain order whose signature is served masked reads `hidden`, not `bad`.
- Internal review: after a raid hold is released (`pvpDefense` cancel) and held again, its
  reveal binds to the live act, not the cancelled one.
- Internal review: grants and credits are re-checked against the rule of their kind (fixed
  tables, Hero Box pity, raid and hold inputs, lake trip catch size, Duel time limit, on-chain
  order signature, balance stamp era); an unanchored hour dated in the future fails.

### Changed

- An entry with no rule to re-run passes only when its kind moves no value (`INERT_KINDS`) and
  it holds only its written fields; its row says `rule=none` and `(no value moved)` and the
  summary counts these on a `NOTE:` line. Any other such entry is `SIG` with `why: no rule`
  (`norule` reason). An entry that carries a draw is never `no rule`, so it counts in the
  `replayed X of N draw entries` line.
- README: new section "What a run proves".
- privacy: on-chain withdrawal references no longer link a wallet to a game account; earlier withdrawals keep the previous form
- The on-chain program is unchanged from v0.1.4.

Release notes: [docs/releases/v0.1.7.md](docs/releases/v0.1.7.md).

## [0.1.6.1] - 2026-11-25

### Changed

- The game server records, in each `pvpRaid` and `pvpDefense` reveal, the upset threshold
  (`refs.u`), and in each `pvpRaid` reveal the counted floor (`refs.countedMin`). The verifier
  requires `refs.u` to equal the threshold of the entry's era and checks the counted flag against
  `refs.countedMin`. Entries without these fields verify as before.
- `resolveRaid` (`web/js/pvprules.js`) takes an optional `{ rule, countedFlat }` and returns
  `floor`; `countedMin` takes an optional flat floor. `web/js/data.js` adds
  `PVP_COUNTED_FLAT_BASE`.
- Hunt engine: Squire farm order (CRY-718). When the player opts in, the Squire can staff
  mercenaries by farm rate instead of rarity; the default order is unchanged. The replay reads the
  recorded `squireFarm`.
- Lottery: the pot is the sum of what each ticket was sold for (`potOf`, `web/js/lottery.js`).
- The on-chain program is unchanged from v0.1.4.

### Added

- Recruit Grant rules (`web/js/grant.js`) and their verifier check (`checkGrant`): the program is
  not enabled on mainnet.

### Fixed

- A list of account ids masked to `hidden` (for example `refs.rows` and `refs.pool` of a
  `pvpReroll` reveal) shows its mask: the row is `hidden`, not a forged row.
- A chain run stopped by another row marked redacted with no mask answers `why: chain/mask` with
  `at`, instead of `why: chain`.
- Raids are replayed with the Field Luck rule of their era (`FIELD_LUCK_RULES`, `luckRulesAt`).
- A Hero Box charge from before 2026-11-14 07:28:40 UTC with no `refs.price` is held to the
  catalog price of its balance era.
- A raid stamped with a balance version from before the 2026-11-19 reward factor settles its
  counted floor at factor 1.

Release notes: [docs/releases/v0.1.6.1.md](docs/releases/v0.1.6.1.md).

## [0.1.6] - 2026-11-25

### Changed

- The Squire act carries a US$ reference (`refs.usd`). The verifier checks it against the
  published daily price record (hash, average price, age of at most 2 days, no newer clean record
  in force) and recomputes the Squire price from it, with the page promotion price when the act
  names one.
- Requirements are now Node.js 20.19+ or 22+. A new root `package.json` with
  `{ "type": "module" }` loads every `.js` file as an ES module. There are still no dependencies.
- The on-chain program is unchanged from v0.1.4.

### Added

- Page promotion price module (`web/js/pagepromo.js`), imported by the verifier.
- Every run prints `replayed X of N draw entries (Y signature only, Z other rules)` before its
  verdict, and `--json` carries the same counts in `replay`.

### Fixed

- A hunt or away reveal from 2026-11-14 00:00 UTC on must publish `refs.engine` (report 4).
- The summon act's `n` must be a safe integer equal to the reveal's `n` (report 5).
- The Joust win is capped by the current entry fee minus the pool share; the older fixed cap
  applies only to entries charged before the price change (report 6).
- Summon and Joust reveals whose paid act is not in a partial download are reported as `wait`
  instead of replayed without it.
- A passing run with draw entries and no replayed draw prints `NOT VERIFIED`, and exits with
  code 3 instead of 0 (R1).
- The export tool normalizes allowlist paths before its deny and exclude checks (R2) and denies
  the anti-cheat tools (R3). The exported files are unchanged by these fixes.
- The README examples take the public audit id, and the README documents that the Merkle step
  needs `--acct` (R1, R6).

Release notes: [docs/releases/v0.1.6.md](docs/releases/v0.1.6.md).

## [0.1.5] - 2026-11-25

### Changed

- Game rules follow the live game: withdrawal minimum; referral, invite and free spin
  thresholds; Battle Pass gates on the second and third Dungeon and voyage slot and on the daily
  raid limit; a new mint tier for new mercenaries; mercenaries on the Farm; ranged mercenaries
  and duel posts in the hunt; Squire sends in the hunt mission; achievement ladders gated on the
  first spend; banned realms out of prize draws; PvP Protect lock after the PvP opening; random
  world boss room codes.
- The public view masks account ids embedded in public strings, and the verifier reports
  redacted or shortened rows as hidden instead of verifying them.
- The on-chain program is unchanged from v0.1.4.

### Added

- PvP Ark rule module (`web/js/pvpark.js`) and market rules (`web/js/marketrules.js`), imported
  by the verifier.
- The verifier replays a Duel from its published fight log; a Duel with no readable log is
  `SIG`, never `PASS`.

### Fixed

- The anchor cache is keyed by the whole proof, not the epoch only, so a second proof of the same
  hour never reuses the on-chain check of the first one.
- A draw rebind is accepted only from the single speed-up of the same send, at most one per
  send, and a rebind on a masked row never supports a `PASS`.
- Audit reads retry on HTTP 503 with `Retry-After`.

Release notes: [docs/releases/v0.1.5.md](docs/releases/v0.1.5.md).

## [0.1.4] - 2026-11-23

### Changed

- The on-chain program tree is the one deployed on Solana mainnet-beta on 2026-11-20: the
  mainnet program id `Cyz7fwhJomMxGtNtj752YcuoSvKASRaYTzrxhHu31FaC` in `declare_id!` and
  `Anchor.toml`, and the filled `security.txt` (contact, source code, release, revision, audit
  status). Its verifiable build reproduces the on-chain executable hash. The program logic and
  the IDL are unchanged from v0.1.3.
- Game rules follow the live game: token prices and token rewards scaled by
  `BALANCE.price.factor` and `BALANCE.reward.factor`, withdrawal limits, Battle Pass seasons and
  prices, daily tasks and chest, horses, the Squire bench and rest rule, fusion and invite rules.
- README: deployed program table (program id, executable hash, binary SHA-256, upgrade
  authority model), audit scope of the program, reproduction steps and the mainnet verifier
  command. SECURITY.md names the deployed program ids.

### Added

- Rule modules of the Duel (`web/js/duelsim.js`) and of the Dungeon Descent training mode
  (`web/js/descentsim.js`).
- The verifier reports `SIG` for a draw checked by its drand signature only (a kind without a
  replay rule, or whose public record cannot be read), and a pass with such draws says so.

### Fixed

- The verifier replays entries recorded before the price and reward factors with the rules of
  their time (boxes, Duel wins, price checks), and replays the Vigil prize.

Release notes: [docs/releases/v0.1.4.md](docs/releases/v0.1.4.md).

## [0.1.3] - 2026-11-19

### Changed

- `spl-token-2022-interface` 4.0.0 in the on-chain program (still on the Solana 3.x crates that
  Anchor 1.2.2 uses). The instruction interface (IDL) is unchanged.
- Test dependencies: `ed25519-dalek` 3, `rand` 0.10, `solana-clock` 4 and `solana-instruction` 4.
- CI: `actions/checkout` 7.0.1, pinned by commit SHA.

### Security

- The three advisories reported for `curve25519-dalek` 3.2.0, `ed25519-dalek` 1.0.1 and `rand`
  0.7.3 reach only the LiteSVM test harness (`litesvm` 0.18.2, a dev-dependency) and are not
  linked into the program. They will clear when a `litesvm` release drops them.

Release notes: [docs/releases/v0.1.3.md](docs/releases/v0.1.3.md).

## [0.1.2] - 2026-11-19

### Fixed

- The verifier refuses an epoch proof whose leaf belongs to another account, in the command line
  tool and in the browser check.
- A drawn reveal that carries no `draw` field now fails instead of skipping the rule replay.
- The verifier no longer reports a false failure on an active account whose newest entries land
  while it downloads the days.
- The hunt client keeps each duel area bound to the right unit when a mercenary is replaced in the
  same post, so a resumed hunt matches a live one.

Release notes: [docs/releases/v0.1.2.md](docs/releases/v0.1.2.md).

## [0.1.1] - 2026-11-19

### Added

- `core-manifest.json` records `rules`, the commit the release was exported from, the same value
  the game server stamps on every ledger entry. The verifier uses it as the commit of the code it
  runs, so draws recorded under the release's rules are replayed in this repository.
- `--json` output of the verifier has a `reasons` array that says why a pass is not final.

### Fixed

- The verifier no longer tells you to `git checkout` a commit that does not exist in this
  repository; it names the release to run, or `--rules-ref any`.
- A pass that is not final names its real reason: entries under other rules are no longer
  reported as "anchors pending or not read on chain".
- The repository guard accepts the header line Cargo writes into `Cargo.lock`, so dependency
  updates are no longer blocked, and the guard no longer flags its own source.

Release notes: [docs/releases/v0.1.1.md](docs/releases/v0.1.1.md).

## [0.1.0] - 2026-11-19

### Added

- drand quicknet beacon verification (BLS12-381) and the derivation of draw uniforms.
- Hash-chained public ledger, hourly Merkle epochs and the per-entry verifier.
- Command line ledger verifier (`tools/verify/verify.mjs`).
- Deterministic hunt engine, hunt hour replay and golden replay tests.
- Game rule modules and the tables they read.
- Solana program `cot_core` (Anchor), its IDL and the verifiable build script.
- Repository guard for commits, pushes and CI.
- Documentation: README with diagrams, security policy, contributing guide, code of conduct,
  issue and pull request templates.

Release notes: [docs/releases/v0.1.0.md](docs/releases/v0.1.0.md).

[Unreleased]: https://github.com/Crypto-of-Thrones/core/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/Crypto-of-Thrones/core/releases/tag/v0.1.4
[0.1.3]: https://github.com/Crypto-of-Thrones/core/releases/tag/v0.1.3
[0.1.2]: https://github.com/Crypto-of-Thrones/core/releases/tag/v0.1.2
[0.1.1]: https://github.com/Crypto-of-Thrones/core/releases/tag/v0.1.1
[0.1.0]: https://github.com/Crypto-of-Thrones/core/releases/tag/v0.1.0
