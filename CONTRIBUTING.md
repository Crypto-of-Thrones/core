# Contributing

Thank you for helping keep the game honest. The most valuable contribution to this repository is
an independent check: running the verifier, replaying draws and reading the rules.

## Reporting a verification divergence

A divergence is any case where the published code and the public record disagree: an entry that
fails `tools/verify/verify.mjs`, a draw whose outcome does not match the rule, a hunt hour that
does not replay, or a program hash that differs from the deployed program.

1. Make sure you run the code of the release the game uses (see the release tag and
   `core-manifest.json`).
2. Save the evidence: the account id, the entry `seq` and hash, the drand round, and the full
   output of the verifier with `--json`. A saved ledger (`--file`) lets anyone reproduce it.
3. Open an issue with the **Draw divergence** template (for draws) or the **Verification bug**
   template (for the verifier, the replay or the build).
4. If the divergence could be exploited, for example to predict or choose a draw or to pass a
   forged entry, do not open an issue: follow [SECURITY.md](SECURITY.md) instead.

## Proposing a change

Pull requests are welcome for the verifier, the replay tools, the documentation and the tests.
Changes to game rules are decided by the game team and land here through a release.

- Keep each pull request focused on one change and describe what it fixes and how you tested it.
- Run the tests before opening it: `node tools/replay-hunt-test.mjs` and, for the program,
  `cargo test` in `programs/`.
- Comments, when needed, are short technical English that describe what the code does.
- The `guard` workflow checks the files and the commit messages of every pull request (secrets,
  local paths, invisible characters, generated-text marks). On a pull request from a fork it
  runs without the project's private deny list and says so in a warning; the full check runs
  again when a maintainer applies the change. The author and time zone rules apply only to the
  commits on `main`, never to your commits.

### How changes are merged

Pull requests from outside the team are reviewed on GitHub, but they are never merged with the
GitHub button. A maintainer applies the approved change locally, commits it as the Crypto of
Thrones organization with a signed commit, and pushes it, so that every commit on `main` is
signed by the project and the history stays linear. Your pull request is then closed with a link
to the commit, and you are credited in the release notes.

The guard hooks in `tools/guard/hooks` are for maintainers: they only accept the organization's
commit identity, so do not install them in your own clone.

## Code of conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
