## Why

Day-0 deployment resources are intended to be run continuously through Alchemy, but several mutable providers still behave as command emitters: if dependencies are satisfied, they repeat the mutation instead of first observing whether the desired state already exists. That is especially risky for Tailscale auth material, SOPS recipient rotation, extra-files staging, USB writes, and `nixos-anywhere` installs.

## What Changes

- Harden mutable Day-0 providers so they observe current state before applying commands.
- Preserve the sharper destructive-resource rule: USB writes and `nixos-anywhere` installs are idempotent by observation, not by repeating destructive commands.
- Add observation commands for Tailscale auth material, SOPS recipient rotation, and `nixos-anywhere` extra-files staging.
- Consolidate provider transition helpers so Safe, External, and Irreversible resources share consistent blocked/ready/live/test behavior.
- Extend tests for observation-first behavior, typed proof handling, and redacted command metadata.

## Capabilities

### New Capabilities

- `day0-provider-idempotence`: Provider execution semantics for continuously rerunnable ThinkCentre Day-0 Alchemy resources.

### Modified Capabilities

- None. The previous network-bootstrap capability has not yet been archived into `openspec/specs`.

## Impact

- Affects `packages/home-deployment/src/model.ts`, `packages/home-deployment/src/providers.ts`, and home-deployment tests.
- Does not introduce a separate orchestration CLI or bypass native Alchemy plan/deploy/state semantics.
- Live provider behavior becomes more conservative: mutable external resources with satisfied dependencies may return Observed instead of reapplying when observation proves the desired state.
