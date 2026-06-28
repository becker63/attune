# Canopy Live Deployment Follow-Up

## Why

ARS does not perform a full Canopy production or live Kubernetes deployment.
Live platform mutation needs a separate human-reviewed plan.

## What Changes

- Scope Canopy live deployment, rollout, rollback, and operational checks.
- Express platform resources as ManagedRecipes with Effect Alchemy lifecycle.
- Preserve Nix/Arion/nix2container as implementation substrate behind
  recipe-owned lifecycle evidence.

## Non-Goals

- Do not make ARS responsible for live production rollout.
- Do not bypass human review for provider, scheduler, admission, or
  destructive infrastructure changes.
