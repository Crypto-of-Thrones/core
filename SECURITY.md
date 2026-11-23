# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately, by e-mail to **hi@cot.gg** with the subject
`security`. Do not open a public issue, pull request or discussion for a vulnerability before it
is fixed.

Include, as far as you can:

- the affected file, function and commit (or release tag);
- the steps to reproduce, or a proof of concept;
- the impact you expect (for example a draw that can be predicted, a ledger entry that verifies
  while it should not, or a program instruction that moves funds it should not);
- whether the issue is already public or known to others.

## Response times

| Step | Target |
|---|---|
| Acknowledgement of your report | within 3 business days |
| First assessment (valid or not, severity) | within 10 business days |
| Status updates until the fix ships | at least every 14 days |

We tell you when the fix is released and, with your permission, credit you in the release notes.

## Scope

In scope:

- the draw derivation and beacon verification (`web/js/drand.js`);
- the ledger hash chain, Merkle epochs and verifier (`web/js/net.js`, `web/js/ledgerverify.js`,
  `tools/verify/verify.mjs`);
- the deterministic engine and the rule modules under `web/js/`, and the hunt replay
  (`tools/replay-hunt.mjs`);
- the on-chain program under `programs/cot_core/` and its verifiable build script, deployed on
  Solana mainnet-beta as `Cyz7fwhJomMxGtNtj752YcuoSvKASRaYTzrxhHu31FaC` (and on devnet, for the
  public beta, as `9Ba34xzmNb9WP8YrhRi2brwnFJLdNsAZrQmgA6FRK5k4`).

Out of scope:

- the game servers, the website, the game client and its interface (report those to the same
  address, but they are not covered by this repository);
- third-party code in `web/vendor/` (report upstream; tell us if it affects the game);
- denial of service by volume, social engineering, physical attacks, and reports from automated
  scanners without a demonstrated impact.

## Safe harbor

We will not pursue or support legal action against you for security research that:

- is done in good faith to find and report a vulnerability in the scope above;
- avoids privacy violations, data destruction and service disruption, and uses only accounts you
  own or have permission to use;
- does not move, lock or withdraw funds that are not yours, and does not exploit an issue beyond
  what is needed to show it;
- gives us reasonable time to fix the issue before any public disclosure.

If in doubt about whether a test is acceptable, ask first at hi@cot.gg.
