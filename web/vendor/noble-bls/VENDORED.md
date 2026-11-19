Vendored BLS12-381 from @noble/curves 2.4.0 with @noble/hashes 2.4.0 (MIT, Paul Miller, audited, no runtime dependencies). Do not edit; update by re-vendoring.

Why: web/js/drand.js verifies drand quicknet beacons (BLS signatures on G1, scheme bls-unchained-g1-rfc9380) in the browser and in the game server Worker. The browser has no bundler and no npm, so the library ships as one ES module, loaded only when a beacon is verified.

Source tarballs (npm registry, checked against the registry integrity on 2026-11-09):
- @noble/curves 2.4.0  sha512-P4/62zrgfH33CneE3Dn4WhJVA22YUU0eR51wKIan4NVRvwsA0YnPTwWGpNbpuacSujmSFLvyzpyuR30+fbq2Ew==  (npm provenance attestation, SLSA v1)
- @noble/hashes 2.4.0  sha512-X5XaVWZIBCT7HHZGm5I7ZQXDwLG+bGXuSrMQAW+7Zvl87h1kmc1ZB1VSRJcpUfoUrGQp4Fkoxm5kZ+Ms+aW+eA==

Build (esbuild 0.28.2), from a directory holding both packages under node_modules/@noble/:

    printf "export { bls12_381 } from '@noble/curves/bls12-381.js';\n" > entry.mjs
    esbuild entry.mjs --bundle --format=esm --platform=neutral --target=es2022 --legal-comments=inline --outfile=bls12-381.js

Result: bls12-381.js, sha256 d02a3b49a04897371ca45a931dcaa2b1163ac0c7246e1b1caf8ec926de778f92. Not minified, so it can be read and diffed against the published sources. LICENSE is the MIT license of both packages (identical text).
