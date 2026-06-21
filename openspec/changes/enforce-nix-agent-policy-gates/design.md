# Design

Nx owns user-facing policy entrypoints. Nix owns pinned tooling and deeper reproducibility checks. The integration slice only closes tasks when implementation or validation evidence exists on this branch; missing child-slice work remains unchecked and is called out as follow-up work.
