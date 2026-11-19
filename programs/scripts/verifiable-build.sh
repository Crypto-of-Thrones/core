#!/usr/bin/env bash
set -euo pipefail

SOLANA_VERIFY_VERSION="0.5.2"
QUERY_SECURITY_TXT_VERSION="1.1.3"
EXPECTED_IMAGE_DIGEST="sha256:f71be5ca7620b7e40933b7f1294fa44e01d08c1fc5ba1f375a2478f5a01580d3"
LIBRARY="cot_core"

cluster="mainnet"
case "${1:-}" in
  "") ;;
  --devnet) cluster="devnet" ;;
  *) echo "usage: $0 [--devnet]" >&2; exit 2 ;;
esac

programs_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$programs_dir"

command -v docker >/dev/null || { echo "docker not found: install Docker first" >&2; exit 2; }

tools_root="${COT_VERIFY_TOOLS:-$HOME/.cache/cot-verify-tools}"
export CARGO_HOME="${COT_VERIFY_CARGO_HOME:-$HOME/.cache/cot-cargo-home}"
export CARGO_TARGET_DIR="${TMPDIR:-/tmp}/cot-verify-tools-build"
mkdir -p "$tools_root" "$CARGO_HOME"

install_tool() { # crate version binary
  if ! "$tools_root/bin/$3" --version 2>/dev/null | grep -q "$2"; then
    cargo install --locked --root "$tools_root" "$1" --version "$2"
  fi
}
install_tool solana-verify "$SOLANA_VERIFY_VERSION" solana-verify
[ -x "$tools_root/bin/query-security-txt" ] || cargo install --locked --root "$tools_root" query-security-txt --version "$QUERY_SECURITY_TXT_VERSION"
rm -rf "$CARGO_TARGET_DIR"
unset CARGO_TARGET_DIR
sv="$tools_root/bin/solana-verify"
qst="$tools_root/bin/query-security-txt"

build_args=(build --library-name "$LIBRARY")
if [ "$cluster" = "devnet" ]; then
  build_args+=(-- --features devnet)
fi

out="target/verifiable/$cluster"
log="$(mktemp)"
reclaim_target() {
  [ -d target ] || return 0
  docker run --rm -v "$programs_dir/target:/t" "solanafoundation/solana-verifiable-build@$EXPECTED_IMAGE_DIGEST" \
    chown -R "$(id -u):$(id -g)" /t >/dev/null 2>&1 || true
}
cleanup() {
  reclaim_target
  [ -d target ] && find target -mindepth 1 -maxdepth 1 ! -name verifiable -exec rm -rf {} +
  rm -f "$log"
}
trap cleanup EXIT

"$sv" "${build_args[@]}" 2>&1 | tee "$log"
reclaim_target

grep -q "$EXPECTED_IMAGE_DIGEST" "$log" || {
  echo "warning: the build log does not show the expected image digest $EXPECTED_IMAGE_DIGEST" >&2
}

so="target/deploy/$LIBRARY.so"
[ -f "$so" ] || { echo "build finished without $so" >&2; exit 1; }

mkdir -p "$out"
cp "$so" "$out/$LIBRARY.so"
exec_hash="$("$sv" get-executable-hash "$out/$LIBRARY.so")"
file_sha="$(sha256sum "$out/$LIBRARY.so" | awk '{print $1}')"
placeholders="$(grep -c "SET-AT-DEPLOY" "$out/$LIBRARY.so" || true)"
security_txt="$("$qst" "$out/$LIBRARY.so" 2>&1 || true)"

{
  echo "cluster: $cluster"
  echo "library: $LIBRARY"
  echo "source_commit: ${COT_SOURCE_COMMIT:-unknown (pass COT_SOURCE_COMMIT)}"
  echo "solana_verify: $SOLANA_VERIFY_VERSION"
  echo "solana (workspace.metadata.cli): $(sed -n 's/^solana = "\(.*\)"/\1/p' Cargo.toml)"
  echo "image: solanafoundation/solana-verifiable-build@$EXPECTED_IMAGE_DIGEST"
  echo "executable_hash (solana-verify): $exec_hash"
  echo "file_sha256: $file_sha"
  echo "size_bytes: $(stat -c %s "$out/$LIBRARY.so")"
  echo "set_at_deploy_placeholders: $placeholders"
  echo "--- query-security-txt ---"
  echo "$security_txt"
} | tee "$out/build-info.txt"

if [ "$cluster" = "mainnet" ] && [ "$placeholders" != "0" ]; then
  echo "NOT READY FOR MAINNET: $placeholders SET-AT-DEPLOY placeholder(s) left in the binary." >&2
fi
