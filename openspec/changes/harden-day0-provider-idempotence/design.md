## Overview

The provider layer should treat Alchemy resources as continuously observable lifecycle nodes. Applying a resource means "make or confirm desired state", not "always run the mutation command".

This change adds observation-first behavior for mutable resources and keeps destructive resources behind both current observation and fresh typed proof.

## Provider Semantics

Safe resources continue to run non-mutating observations.

External resources that mutate local or remote identity, secret, or staging state use an observation-first helper:

- If the resource is already marked ready, return Observed evidence.
- If the resource is blocked, return Blocked without mutation.
- In Live mode, run `observeCommand` when one exists. If it succeeds, return Observed and skip the mutation command.
- Otherwise run the normal command in Live mode, or simulate the transition in Test/DryRun.

Irreversible resources use the stricter destructive helper:

- Ready resources return Observed.
- Blocked resources return Blocked.
- Live mode first runs `observeCommand` and returns Observed if the target is already in the desired state.
- If observation does not prove desired state, require exact typed manual proof for the expected gate.
- Only then may the destructive command run.

## Observation Commands

Tailscale auth material observation decrypts the encrypted SOPS file locally and checks that every expected host has an auth-key entry, without printing secret values.

Extra-files staging observation compares the staged bootstrap age key and encrypted secret file against the expected source files and verifies file permissions.

SOPS recipient rotation observation compares the host SSH-derived age recipient with the committed public recipient file and verifies the encrypted secret file can still be decrypted.

## Out Of Scope

- Building a separate Attune planner.
- Replacing Alchemy v2 state/plan/deploy UX.
- Validating actual Tailscale key liveness before host enrollment; live node readiness remains the per-host Tailscale readiness resource.
