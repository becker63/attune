# Enforce Nx/Nix policy gates

## Intent

Make Nx the public policy-gate command surface while keeping Nix as the reproducible substrate, and track repeated source shapes through Attune Source BOM shards.

## Scope

- Add public Nx workspace targets for fast policy checks, architecture policy checks, and proof-pressure checks.
- Keep Nix-backed validation available through flake/pre-commit checks without making Nix the everyday public API.
- Reconcile child-slice evidence honestly in the OpenSpec task list.
