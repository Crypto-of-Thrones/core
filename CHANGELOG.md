# Changelog

All notable changes to this repository are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Crypto-of-Thrones/core/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/Crypto-of-Thrones/core/releases/tag/v0.1.1
[0.1.0]: https://github.com/Crypto-of-Thrones/core/releases/tag/v0.1.0
