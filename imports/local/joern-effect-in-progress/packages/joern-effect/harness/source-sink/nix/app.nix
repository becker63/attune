{ pkgs, joern }:
pkgs.writeShellApplication {
  name = "source-sink-harness";
  runtimeInputs = [ pkgs.nodejs_22 pkgs.pnpm joern ];
  text = ''
    set -euo pipefail
    pnpm --filter joern-effect test -- --run harness/source-sink/test
  '';
}
