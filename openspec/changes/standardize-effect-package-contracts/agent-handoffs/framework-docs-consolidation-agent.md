Agent: framework-docs-consolidation-agent
Wave: local coordinator wave after framework foundation checkpoint
Ownership: `docs/attuned/Attune Framework Core Primitives.md`, documentation task status
Changed:
- Expanded the core framework primitive doc with the canonical package contract
  shape, companion typecheck/layer/type-guidance surfaces, typed builder and law
  model, invariant ownership ladder, framework Nx action model, generated
  Schema-coded harnesses, optional Effect RPC tradeoff, `PackageTypeGuidance`,
  FastCheck transform/filter evidence rules, workerized property tiers, protocol
  runtime/cache posture, language-service authoring loop, and Source
  BOM/generator-shape migration posture.
- Marked the corresponding OpenSpec documentation tasks complete.
Generated:
- No generated source or reports.
Validated:
- Documentation-only change; no command required for the doc text itself.
Not run:
- Full docs lint or workspace validation.
Contract status:
- Agents now have one canonical framework vocabulary document for package
  contracts, diagnostics-first repair, generated harnesses, FastCheck evidence,
  and no checked-in protocol reports.
Residual migration debt:
- Generator templates still need to be implemented or refreshed to match the
  documented shape.
- Language-service and framework Nx implementations still need to project the
  whole documented UX end-to-end.
Blocked by:
- None.
Next agent:
- Framework Nx and language-service agents should use this document as the
  authoring vocabulary while implementing concrete generators/code actions.
