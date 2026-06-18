{ pkgs, buck2 }:
pkgs.writeShellApplication {
  name = "attune-check";
  runtimeInputs = [
    pkgs.coreutils
    pkgs.git
    pkgs.gnutar
    pkgs.nodejs_22
    pkgs.pnpm
    pkgs.watchman
    buck2
  ];
  text = ''
    set -euo pipefail
    source_root="$PWD"
    workdir="$(mktemp -d "''${TMPDIR:-/tmp}/attune-check.XXXXXX")"
    cleanup() {
      rm -rf "$workdir"
    }
    trap cleanup EXIT

    git ls-files -co --exclude-standard -z |
      tar --null -T - -cf - |
      tar -xf - -C "$workdir"

    cd "$workdir"
    pnpm install --frozen-lockfile
    env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u https_proxy -u http_proxy -u all_proxy buck2 kill >/dev/null 2>&1 || true
    env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u https_proxy -u http_proxy -u all_proxy buck2 build //...
    pnpm --filter @attune/eventing test
    pnpm --filter @attune/eventing build
    pnpm --filter @attune/fork typecheck
    pnpm --filter @attune/fork build
    pnpm --filter joern-effect typecheck
    pnpm --filter joern-effect build
    pnpm --filter joern-effect test
    printf 'attune-check completed for %s\n' "$source_root"
  '';
}
