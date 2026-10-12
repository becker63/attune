{
  description = "Attune: run the offline walkthrough or test the implementation";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = inputs: (import ./attune/flake.nix).outputs inputs;
}
