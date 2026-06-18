let
  flake = builtins.getFlake (toString ./.);
  system = builtins.currentSystem;
in
import flake.inputs.nixpkgs {
  inherit system;
}
