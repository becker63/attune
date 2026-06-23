## 1. OpenSpec And Inventory

- [x] 1.1 Create the `compress-attune-package-surface` OpenSpec proposal, design, and capability specs.
- [x] 1.2 Inventory package-local Attune files across `packages/*` and `framework/*`.
- [x] 1.3 Record generated companion, typecheck, and Source BOM migration debt in a handoff.

## 2. One-File Surface Policy

- [x] 2.1 Add an architecture policy diagnostic for `attune/package-local-surface/one-attune-file`.
- [x] 2.2 Classify current package-local generated companions as staged migration warnings rather than silent final architecture.
- [x] 2.3 Keep framework-internal or transitional exceptions explicit and reviewable.
- [x] 2.4 Ensure package declaration size diagnostics still check only `src/attune.package.ts`.

## 3. Check/Repair Public Surface

- [x] 3.1 Verify or add `workspace:attune-check` and `workspace:attune-repair` as the public workspace verbs.
- [x] 3.2 Add public `<project>:attune-check` and `<project>:attune-repair` aliases for active packages where practical.
- [x] 3.3 Add a repair-plan type or route table that lets diagnostics point at public repair targets while preserving internal generator details.
- [x] 3.4 Keep lower-level package-contract, framework-policy, generator, evidence, and proof-pressure targets classified as internal or advanced.

## 4. Documentation And Agent Guidance

- [x] 4.1 Simplify AGENTS.md around the default check/repair loop and the one-file package-local Attune rule.
- [x] 4.2 Update the Attune Framework Operating Surface doc with public command tiers, generated/cache layout, and human-review boundaries.
- [x] 4.3 Remove default-agent guidance that teaches raw generator invocation before diagnostics and repair.

## 5. Validation And Handoff

- [x] 5.1 Validate the OpenSpec change.
- [x] 5.2 Run `workspace:attune-check`, `workspace:attune-repair`, `workspace:package-contracts-check`, and `workspace:framework-policy-check`.
- [x] 5.3 Run whitespace/diff checks.
- [x] 5.4 Commit and push the implemented cleanup.
