# Changelog

All notable changes to this repository are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Crypto-of-Thrones/core/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Crypto-of-Thrones/core/releases/tag/v0.1.0
