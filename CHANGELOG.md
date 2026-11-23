# Changelog

All notable changes to this repository are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
