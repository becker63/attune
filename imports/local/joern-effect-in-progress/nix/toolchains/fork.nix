{ pkgs }:
pkgs.writeShellApplication {
  name = "attune-fork-toolchain";
  runtimeInputs = [ pkgs.nodejs_22 pkgs.pnpm ];
  text = ''
    set -euo pipefail
    pnpm --filter @attune/eventing build
    tsx packages/fork/src/cli.ts "$@"
  '';
}
