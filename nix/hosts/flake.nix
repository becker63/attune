{
  description = "Attune home cluster NixOS hosts";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    import ./default.nix { inherit nixpkgs; };
}
