{ pkgs }:
pkgs.writeShellApplication {
  name = "attune-property";
  runtimeInputs = [ pkgs.nodejs_22 pkgs.pnpm ];
  text = ''
    set -euo pipefail
    pnpm install --frozen-lockfile
    pnpm --filter joern-effect exec vitest run harness/source-sink/test
  '';
}
