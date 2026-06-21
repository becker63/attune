## 1. Observation Commands

- [x] 1.1 Add non-mutating observation commands for Tailscale auth material, extra-files staging, and SOPS recipient rotation.
- [x] 1.2 Attach those observation commands to the typed Day-0 resources so Alchemy plan/bindings expose them.

## 2. Provider Hardening

- [x] 2.1 Consolidate provider transition helpers for safe observe, external observe-then-apply, and destructive proof-then-apply.
- [x] 2.2 Route Tailscale auth material, SOPS recipient rotation, and extra-files staging through observation-first external semantics.
- [x] 2.3 Preserve exact typed proof checks for USB media writes, machine bindings, and `nixos-anywhere` installs.
- [x] 2.4 Remove unused named Alchemy alias resources from the public provider collection so `ThinkCentreDay0Resource` is the canonical lifecycle node surface.

## 3. Tests And Validation

- [x] 3.1 Add tests for external resource observation metadata and blocked external resources not mutating.
- [x] 3.2 Update graph simulation tests to model runnable External resources explicitly.
- [x] 3.3 Run OpenSpec validation, home-deployment typecheck, and home-deployment tests.
