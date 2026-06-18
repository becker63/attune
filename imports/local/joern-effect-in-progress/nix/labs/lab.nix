{ pkgs, check, property, joernSourceSink }:
pkgs.writeShellApplication {
  name = "attune-lab";
  runtimeInputs = [ check property joernSourceSink ];
  text = ''
    set -euo pipefail
    attune-check
    attune-property
    attune-joern-source-sink
  '';
}
