let
  lock = builtins.fromJSON (builtins.readFile ./flake.lock);
  nixpkgsInput = lock.nodes.root.inputs.nixpkgs;
  nixpkgsLocked = lock.nodes.${nixpkgsInput}.locked;
  nixpkgs = builtins.fetchTree nixpkgsLocked;
  system = builtins.currentSystem;
in
import nixpkgs {
  inherit system;
  config.allowUnfreePredicate = pkg: builtins.elem (pkg.pname or (builtins.parseDrvName (pkg.name or "")).name) [
    "timescaledb"
  ];
}
