# Define Post-Infra Product Story

## Summary

After the local compute, Joern proof, and Nx/Nix infrastructure rollout, Attune needs the next product story to be explicit:

> Attune finds the codebase-specific patterns a team keeps enforcing by instinct, then turns the surviving ones into evidence-backed rules, proof recipes, review guidance, and agent work.

This change defines that story as an OpenSpec change so the next implementation phase has a crisp target. It also captures the Rego law layer, Linear clean-slate work ledger, and ThinCentre cluster readiness work needed to make the product loop operational.

## Motivation

The current infrastructure proves several important pieces:

- Joern-backed proof recipes can generate useful evidence.
- Axiom traces can show which recipe shapes are high-yield, fragile, or hard to reach.
- Nx and Nix can carry reproducible generation, testing, and container execution.
- The local compute control plane can turn runs into durable analysis and optimization packets.

The next product phase should not be "more infra." It should turn that infra into a market-facing loop:

```text
observe codebase behavior
  -> infer repeated repo-specific pattern
  -> produce evidence and counterexamples
  -> propose deterministic rule or recipe
  -> route work through Linear
  -> validate through Nx, Rego, Joern, and property tests
  -> promote accepted convention into canon
```

## Scope

This is a planning/spec change. It defines the next rollout, not the full implementation.

In scope:

- Product story for post-infra Attune.
- Pattern categories Attune should discover first.
- Evidence-backed product artifacts.
- Rego law-layer boundaries for platform, agent, optimization, Nix, Linear, and Kubernetes safety.
- Linear clean-slate and issue-led work ledger.
- Codex/Linear/GitHub execution rail for background PR drafting with strict gates.
- ThinCentre cluster setup task list and USB/NixOS readiness plan.

Out of scope:

- Implementing the product UI.
- Implementing the scheduler/control plane.
- Rewriting current Joern fuzzer code.
- Provisioning physical machines.
- Deleting Linear data without a connected Linear action and explicit user-visible target.

## Source Inputs

This spec is derived from:

- The Joern proof/fuzzer run evidence already captured in Axiom.
- The OpenSpec changes `document-local-compute-control-plane` and `add-joern-proof-router-dsl`.
- The product-pattern notes supplied on 2026-06-19.
- The Rego law-layer notes supplied on 2026-06-19.

## Success Criteria

- The repository has a spec for the post-infra product story.
- The spec states what marketable patterns Attune should find first.
- The spec distinguishes product decisions in Effect from hard safety constraints in Rego.
- Linear has a clean new project or equivalent clean-slate issue set for the rollout.
- Codex-safe work is labeled and routed separately from safety-sensitive work that requires human review.
- The first human-owned ThinCentre/NixOS cluster setup tasks are represented as issues.
- Future implementation can start from this spec without re-litigating the product direction.
