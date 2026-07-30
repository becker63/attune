## Why

Attune can prove which external operation ran against exact repository state,
but the current research pack has no immutable record of the agent-authored
semantic decision that selected the next representation or experiment. The
documentation currently expands that mechanism into payment-specific
`ToolCall` continuations and hard-coded ledger digests. Those examples obscure
the generic production pack and make invented semantic references look more
important than the retained files an agent actually reads.

## What Changes

- Add an immutable, content-addressed `InterpretationLedger` value to
  `attune_activegraph.research` with the local question, opaque sources,
  retained and omitted facts, agent assumptions, selected next step, expected
  discriminator, limitations, and optional superseded digest.
- Add one common deterministic `record_interpretation` ActiveGraph tool. Its
  typed call records the ledger body and event order; its result is only a
  `ledger:sha256:...` reference suitable for the next operation's existing
  caller-reference field.
- Keep the graph at `Case`, `Claim`, `Evidence`, and `Result`. Evidence may cite
  ledger references, synthesis selects surviving ledger references, and motif
  packets embed only the selected immutable ledger bodies.
- Make `InvestigationOutput` choose `supports` or `challenges` explicitly
  instead of always emitting `supports`.
- Give every benchmark arm the ledger tool as fixed ActiveGraph apparatus and
  flatten only retained facts, omissions, assumptions, and limitations into
  the prose control.
- Add a mechanical `ActiveGraph` chapter before `The tools` with one condensed,
  source-faithful Python declaration of `make_research_pack` and its
  case-bound `make_interpretation_tool`.
- Revise the payment investigation so every continuation names the exact
  retained native file and `attune://` artifact URI returned by the preceding
  receipt. The generic behavior records that URI in
  `InterpretationLedger.source_refs` before the next capability; the page does
  not stage three payment-specific Python calls or hard-code their computed
  ledger digests.
- Treat `joern-output.json`, Maude `stdout.txt`, property
  `counterexample.json` plus `run-details.json`, and ast-grep
  `findings.jsonl` as the visible evidence chain. The initial tracked fixture
  includes the candidate ast-grep rule, and the require-clean checkpoint binds
  it with the source into `EXACT_SNAPSHOT`. After property evidence, the agent
  selects the receipt-listed complete `property.ts` through its ledger.
  `artifact_promote` copies those exact bytes to
  `repo/payment-retry.property.ts`; keeping the destination at repository root
  preserves its `./src` import. Promotion leaves `HEAD` at `EXACT_SNAPSHOT`
  and the worktree dirty. `repository_checkpoint(policy: "commit")` stages
  every non-ignored change and returns `RESEARCH_SNAPSHOT` for the ast-grep
  scan against the tracked rule. The seven TypeScript fences therefore contain
  eight real MCP calls without inventing a raw worktree-write operation,
  `activegraph.call`, or ledger side effect. Reject
  symbolic `attune:joern:*`, `attune:maude:*`, and
  `attune:property:*` aliases, `joern.summary`, and generic `result.json`
  substitutes for those native artifacts.
- Explain the mechanical workspace that makes that sequence real: one
  investigation-owned AgentFS database/capsule and operation-scoped validated
  FUSE acquisition with effective `repo/` and `artifacts/` siblings over an
  immutable base plus isolated copy-up/whiteout delta. Accepted activity drains
  before unmount; later operations remount the same persistent capsule/delta.
  The attached Git repository is available to owned operations, but the raw
  mount path is not MCP wire surface. Selected complete tool output enters
  `repo/` only through explicit `artifact_promote` and remains uncommitted until
  checkpointed. Keep private runtime storage paths out of the publication.
- Preserve the eight-operation MCP ABI and generated clients unchanged.
  `attune-mcp` stores the opaque `FreeFormReference` with the exact request but
  never retrieves, interprets, validates, revises, or promotes the ledger.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `research-benchmark-runtime`: Require immutable interpretation ledgers,
  common ledger recording, explicit evidence relation choice, and surviving
  ledger references in synthesis.
- `activegraph-capability-bridge`: Permit ledger digests only through the
  existing opaque caller-reference field without changing the Effect-owned
  contract.
- `motif-amortization`: Embed selected ledger bodies in frozen packets, expose
  rebuildable packet impact, and keep the prose control semantically comparable
  without executable or provenance coordinates.
- `deterministic-api-reference`: Add the mechanical ActiveGraph chapter, show
  the production pack once, and continue the checked tool investigation
  through exact receipt-returned native artifact files.

## Impact

- Python:
  `python/attune-activegraph/src/attune_activegraph/research/{model,ledger,pack,run}.py`,
  research exports, and focused tests.
- Documentation:
  `packages/attune-guide`, the Attune documentation reader/compiler, semantic
  fixtures, navigation, responsive browser contracts, and the deterministic
  five-file publication.
- OpenSpec: four delta specifications plus this design and implementation task
  set.
- Unchanged: `attune-mcp` operations and schemas, generated Python MCP models,
  AgentFS storage authority, ActiveGraph core, and the four graph object types.
