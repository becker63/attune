# OpenSpec Validation Agent Handoff

Agent:
- openspec-validation-agent

Wave:
- Phase 0: Foundation Freeze And Worktree Survey

Ownership:
- OpenSpec validation only. No source implementation files edited.

Changed:
- Added this handoff report only.

Generated:
- None.

Validated:
- `openspec validate standardize-effect-package-contracts --type change`

Not run:
- Nx workspace checks. This validation slice was scoped to OpenSpec artifacts.

Contract status:
- package: not applicable
- PackageContract: not applicable
- PackageLayer: not applicable
- PackageTestLayer: not applicable
- attune.package.typecheck: not applicable
- PackageTypeGuidance: not applicable
- package views: not applicable
- property evidence: not applicable
- Nx targets: public target names are internally consistent except for the final-ratchet issue below

Residual migration debt:
- The final-ratchet language has one contradiction that should be fixed before implementation agents rely on it.
- `agent-migration-plan.md` says the migration is complete only when no migration-only aliases, stale command surfaces, manual source ledgers, or report-only exceptions remain.
- `design.md` still says temporary adapters, aliases, report-only exceptions, manual BOM source fields, unowned waiver categories, and transitional generated files may either be removed or recorded as deliberate long-lived package-contract waivers.
- `specs/effect-package-contracts/spec.md` similarly allows a migration-only alias, compatibility export, or report-only exception to remain after ratchet when backed by a non-expired waiver.
- That conflicts with the aggressive in-place fork direction and could cause ratchet agents to preserve migration-only material instead of deleting it.

Proposed patch:
- In `design.md`, change the completed-migration paragraph so migration-only aliases, compatibility exports, report-only exceptions, manual BOM source fields, duplicate public command surfaces, stale package scripts, and transitional generated files must be removed before final ratchet. Keep long-lived waivers only for genuine lower-level architecture exceptions, not migration scaffolding or command surfaces.
- In `specs/effect-package-contracts/spec.md`, change `Scenario: Migration alias remains after ratchet` so any migration-only alias, compatibility export, or report-only exception MUST be absent after final ratchet, with no waiver path. Keep the existing temporary-waiver scenario for pre-ratchet migration only.
- In `tasks.md`, tighten task 14.7 so expired waivers are not the only waiver concern; final cleanup must reject all migration-scaffolding waivers after ratchet except explicitly non-migration architecture waivers with owners and review dates.

Blocked by:
- Needs the spec owner/integration agent to apply the proposed wording patch.

Next agent:
- Phase 0 integration agent or ratchet-agent should patch final-ratchet wording before Phase 1 implementation begins.
