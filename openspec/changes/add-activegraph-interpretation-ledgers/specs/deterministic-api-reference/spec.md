## ADDED Requirements

### Requirement: Mechanical ActiveGraph chapter

The single documentation publication SHALL place a source-authored
`h2#activegraph` chapter between `The model` and `The tools` and include it in
the compact conceptual contents. The chapter SHALL explain the four graph
objects, five relations, immutable `InterpretationLedger`,
`record_interpretation` event ordering, `Result` ledger selection, packet
embedding, and the opaque handoff through the existing linked
`FreeFormReference`.

It SHALL state that publication definition links are documentation navigation,
not production semantic lineage. It SHALL NOT present the ledger as a graph
object, MCP schema, universal IR, or mechanically proven interpretation.

The chapter SHALL include one condensed source-faithful Python declaration of
the production `make_research_pack` and case-bound
`make_interpretation_tool`. The declaration SHALL preserve the four objects,
five relations, common interpretation tool, conditional eight-wrapper Attune
arm, investigate/synthesize behaviors, case check, deterministic tool
metadata, and `LedgerReference` return while eliding only descriptions and
unrelated implementation detail. It SHALL replace—not precede—three
payment-specific illustrative `ToolCall` continuations.

#### Scenario: Reader reaches the tool investigation

- **WHEN** a reader moves from `The model` into the payment investigation
- **THEN** the intervening `ActiveGraph` chapter shows which layer records the
  semantic decision and which layer executes the dependent operation
- **AND** the linked `FreeFormReference` remains the literal MCP boundary

#### Scenario: Contents projects the chapter

- **WHEN** the compact contents is inspected
- **THEN** `ActiveGraph` appears after `The model` and before `The tools`
- **AND** no ledger field or individual ledger becomes another navigation item

### Requirement: Tool investigation continues through retained native files

The checked transcript under `The tools` SHALL represent the same ordered
payment investigation without expanding every decision edge into another
payment-specific ActiveGraph program. After each MCP operation, the
continuation SHALL name the exact retained file selected from the producing
receipt's `artifacts` array, show the relevant native bytes, and state that the
generic ActiveGraph behavior records that artifact URI in
`InterpretationLedger.source_refs` before choosing the next capability.

The required evidence chain SHALL include:

- `joern-output.json` at the producing Joern artifact URI;
- Maude `stdout.txt` at the producing Maude artifact URI;
- property `counterexample.json`, `run-details.json`, and complete
  `property.ts` at their producing property artifact URIs; and
- ast-grep `findings.jsonl` at its producing artifact URI, correlated with the
  candidate input rule tracked in the initial fixture at
  `rules/review-retryable-payment-without-operation-key.yml`.

Every URI SHALL use the receipt-returned
`attune://investigations/{investigationId}/artifacts/{tool}/{invocationId}/{file}`
shape. The transcript SHALL NOT manufacture symbolic
`attune:joern:*`, `attune:maude:*`, or `attune:property:*` sources, call a
native Joern result `joern.summary`, substitute a generic `result.json`, print
a hard-coded computed ledger digest, or imply that the receipt establishes the
agent's semantic transition.

The real generated wrapper MAY forward the runtime ledger reference through
the dependent operation's existing `references` input, but the publication
SHALL explain that behavior in prose rather than stage a direct
`activegraph.call`, a TypeScript ActiveGraph API, or three illustrative Python
`ToolCall` exchanges. After property evidence narrows the lowering, the agent
SHALL record its rule-residue ledger and select the receipt-listed
`property.ts` with `complete: true`. `artifact_promote` SHALL copy those exact
bytes to `repo/payment-retry.property.ts`; the repository-root destination
SHALL preserve the property's `./src` import. Promotion SHALL leave `HEAD` at
`EXACT_SNAPSHOT` and the worktree dirty. The publication SHALL then show
`repository_checkpoint(policy: "commit")` staging and committing every
non-ignored change and returning `RESEARCH_SNAPSHOT`. `ast_grep_run` SHALL use
that snapshot with the candidate rule already tracked in
`EXACT_SNAPSHOT`. Seven TypeScript fences SHALL carry these eight MCP calls.
The transcript SHALL NOT invent a raw mount write, `activegraph.call`, or
`record_interpretation` side effect.

#### Scenario: Joern evidence selects the model

- **WHEN** the LLM chooses a Maude abstraction from retained Joern results
- **THEN** the transcript identifies and shows the receipt-returned
  `joern-output.json` that the agent reads
- **AND** the generic behavior records that exact artifact URI in the
  payment-model ledger before `maude_run`

#### Scenario: Counterexample narrows the rule

- **WHEN** the property result supplies a concrete counterexample
- **THEN** the transcript shows both `counterexample.json` and
  `run-details.json` from the property receipt before the bounded lowering
- **AND** selects complete `property.ts` from that same receipt for
  `artifact_promote`
- **AND** the generic behavior cites those exact artifact URIs while the
  detector retains its stated semantic limitations

#### Scenario: Final scan remains native evidence

- **WHEN** selected executable research is carried forward after the property
  evidence
- **THEN** `artifact_promote` copies receipt-complete `property.ts` to
  `repo/payment-retry.property.ts` and leaves `HEAD` at `EXACT_SNAPSHOT`
- **AND** `repository_checkpoint(policy: "commit")` commits all non-ignored
  changes and returns the `RESEARCH_SNAPSHOT` used by ast-grep
- **AND** the tracked candidate rule remains the scan input
- **AND** neither promotion nor the semantic ledger is presented as a raw
  mount write or another ActiveGraph operation
- **AND** it shows `findings.jsonl` from the ast-grep receipt rather than a
  model-authored result summary

### Requirement: Mounted repository and retained evidence remain distinct

The documentation SHALL explain that one AgentFS database/capsule belongs to
each investigation and that each accepted operation acquires a validated
private FUSE mount with effective sibling `repo/` and `artifacts/` namespaces.
The view SHALL merge an immutable base with the investigation's isolated
copy-up/whiteout delta. Accepted activity SHALL drain to terminal state before
unmount; later operations SHALL remount the same capsule/delta, recovering
repository writes, deletions, attached Git commits, and retained evidence
without mutating the base.

`repo/` SHALL be described as the normal attached Attune-controlled Git branch
available to owned operations. `artifacts/` SHALL be append-only invocation
evidence. The raw mount path SHALL not be an MCP wire field or a between-call
client filesystem. Native tool output SHALL remain in `artifacts/` unless a
caller deliberately invokes `artifact_promote` to copy one receipt-listed
complete byte sequence into a contained `repo/` path. Promotion SHALL leave
`HEAD` unchanged and remain uncommitted until a later explicit repository
checkpoint. The chapter SHALL not expose private runtime-home, base-checkout,
binding, capsule-file, or mount paths or treat these mechanics as a semantic
model.

#### Scenario: Agent carries selected work into Git

- **WHEN** an agent promotes receipt-listed complete tool output from
  `artifacts/`
- **THEN** the private operation-scoped repository view reflects that
  uncommitted exact-byte copy while `HEAD` remains unchanged
- **AND** `repository_checkpoint(policy: "commit")` is the explicit MCP
  operation that stages all non-ignored changes and returns a new full commit
- **AND** a later exact-state tool receives that returned snapshot
