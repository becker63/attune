{ pkgs, joern }:
pkgs.writeShellApplication {
  name = "attune-joern-source-sink";
  runtimeInputs = [ pkgs.nodejs_22 pkgs.pnpm joern ];
  text = ''
    set -euo pipefail
    pnpm install --frozen-lockfile
    pnpm --filter joern-effect test -- --run harness/source-sink/test
  '';
}
