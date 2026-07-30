## Context

The research pack currently has four graph objects (`Case`, `Claim`,
`Evidence`, and `Result`) and five relations. ActiveGraph records the ordered
model/tool history, while the eight Attune wrappers forward exact typed MCP
requests and receive receipts and retained native artifacts. The missing value
is the model-authored interpretation between heterogeneous evidence forms.

The documentation has represented those decisions through a succession of
payment-specific constants and illustrative Python calls. That is useful as a
test of the value types but not as an explanation of the production mechanism:
the generic pack should retain the semantic decision before the dependent
call, while the tool narrative should continue from the exact retained file
named by the preceding receipt. MCP still receives only the ledger's opaque
content address through the existing `FreeFormReference`.

## Goals / Non-Goals

**Goals:**

- Make every retained cross-representation decision explicit, immutable,
  content-addressed, ordered in ActiveGraph history, and revisable by
  supersession.
- Keep the ledger available to every experimental arm as common apparatus.
- Bind a dependent Attune request to the preceding ledger without extending
  the MCP ABI.
- Let synthesis and packets select the small decision edges that survive.
- Make support/challenge relation choice explicit.
- Teach the real generic pack once before the documentation's payment
  investigation, then let retained native files—not repeated miniature
  ActiveGraph programs—carry the visible investigation forward.
- Keep ledger ownership distinct from the real repository workflow:
  `artifact_promote` carries selected complete retained bytes into the
  operation-scoped repository view, and an explicit checkpoint—not a ledger or
  invented write tool—creates the next exact snapshot.

**Non-Goals:**

- A fifth ActiveGraph object, new relation, graph query layer, or ActiveGraph
  core change.
- A ledger MCP operation, request field, Effect schema, generated client model,
  AgentFS semantic store, or server-side ledger lookup.
- Mechanical validation that an abstraction, assumption, discriminator, or
  lowering is correct.
- A universal IR, canonical tool pipeline, automatic model/property/rule
  synthesis, or automatic packet rewrite.
- Copying whole ledger bodies into `FreeFormReference.note`.

## Decisions

### 1. Keep ledgers as closed immutable Pydantic values

`InterpretationLedger` lives in
`attune_activegraph.research.model` beside the other consumer-owned boundary
documents. It uses the existing frozen, extra-forbidden `Model` base and the
existing canonical SHA-256 helper.

The closed fields are:

- `schema_version: Literal[1]`
- `case_id`
- `question`
- non-empty `source_refs`
- non-empty `retained`
- `omitted`
- `assumptions`
- `next_step`
- `expected_discriminator`
- `limitations`
- optional `supersedes`
- computed `ledger_digest`

`omitted` is intentional: it states that source detail is outside this
particular abstraction without declaring that detail globally irrelevant.
`expected_discriminator` forces the decision to state what the next experiment
is expected to distinguish, reducing polished post-hoc rationale.

Alternatives rejected: a graph object would violate the fixed research
topology; an MCP schema would assign semantic authority to a service that
cannot validate it; an untyped dict would make comparison, revision, and
packet freezing ambiguous.

### 2. Record through one deterministic common ActiveGraph tool

A small `research/ledger.py` module declares `LedgerReference` and a
case-bound `record_interpretation` typed tool. The function rejects a ledger
whose `case_id` differs from the immutable pack settings and has no filesystem,
process, network, or MCP effect:

```text
InterpretationLedger
  -> ActiveGraph records typed tool input and event position
  -> ledger:sha256:<canonical ledger digest>
```

The tool is composed after the ordinary workspace tools and before any
treatment-only Attune tools. Consequently conventional and Attune arms both
receive the same semantic bookkeeping, while the treatment still differs by
exactly eight MCP capabilities. Its schema participates in the pinned common
tool digest. The investigate behavior raises its bounded turn allowance from
six to sixteen so a returned ledger reference can precede each dependent tool
call rather than being fabricated in the same response.

Alternatives rejected: reconstructing ledgers during synthesis loses actual
decision order; storing them in a new side database duplicates ActiveGraph's
event authority; treatment-only availability confounds the benchmark.

### 3. Use the existing caller-reference aperture

The dependent capability receives:

```json
{
  "ref": "ledger:sha256:<digest>",
  "note": "short local purpose"
}
```

The ActiveGraph wrapper forwards this ordinary generated input unchanged.
`attune-mcp` already persists canonical request bytes and references before
external execution. No TypeScript, wire-schema, generated-model, or operation
registry change is required.

The note stays short and non-authoritative. The ledger body remains in
ActiveGraph history and, if selected, in a frozen motif packet.

When an Attune receipt is the source of a decision, the ledger's
`source_refs` cite the exact artifact URI from that receipt rather than a
human-authored alias. For example:

```text
attune://investigations/{investigationId}/artifacts/joern/{invocationId}/joern-output.json
```

The URI identifies bytes that the client can read through the existing MCP
resource surface. It does not claim that the file already contains the next
semantic interpretation. Symbolic strings such as `attune:joern:...`,
`attune:maude:...`, or `attune:property:...` are therefore inappropriate as
native evidence references in the guide.

### 4. Preserve four graph objects and make relation choice literal

`InvestigationOutput` adds:

```python
relation: Literal["supports", "challenges"]
ledger_refs: tuple[str, ...] = ()
```

The handler adds those references to the emitted `Evidence.refs` without
discarding existing receipt or artifact references, then emits
`output.relation`. It does not infer the relation from claim state or evidence
content.

The same edit corrects the existing handler boundary to ActiveGraph 1.10:
behavior filters match `object.type`, handlers read the triggering Case from
the event payload, and the constrained `BehaviorGraph` stamps actor and causal
metadata itself. Focused tests execute these handlers rather than merely
loading their pack metadata.

`Result.retained_ledger_refs` records which decision edges survive synthesis.
This field contains opaque references, not duplicated bodies.

### 5. Embed only selected bodies in packets

`Packet.ledgers` contains immutable `InterpretationLedger` values selected by
synthesis. ActiveGraph history retains every authored ledger, including wrong,
abandoned, or superseded decisions; a packet carries only those intentionally
chosen to travel.

A deterministic `ledger_packet_index` projection derives
`ledger:sha256:... -> packet digest(s)` from packet contents. It is not stored
as another source of truth. A later ledger may cite an earlier reference in
`supersedes`; packets and earlier ledgers remain immutable while the index
identifies packets requiring review.

The bounded prose control receives flattened `retained`, `omitted`,
`assumptions`, and `limitations` text. It excludes source references,
supersession/dependency coordinates, next-operation/replay coordinates,
expected discriminator structure, and all native executable artifacts.

### 6. Add a mechanical ActiveGraph documentation chapter

`## ActiveGraph` appears between `The model` and `The tools`. It explains:

- the four object and five relation surface;
- the ledger as a typed decision value rather than a graph object;
- why `record_interpretation` runs before a dependent capability;
- how the returned digest enters the existing linked
  [`FreeFormReference`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--FreeFormReference);
- how `Result` and `Packet` retain selected references/bodies; and
- why documentation definition links are publication apparatus rather than
  production semantic lineage.

The ActiveGraph chapter contains one condensed, source-faithful Python fence
covering the real `make_research_pack` composition and case-bound
`make_interpretation_tool`. It preserves the production four-object,
five-relation pack, the common interpretation tool, the conditional eight-tool
Attune arm, and the two behaviors while eliding descriptions that do not
change that declaration.

The payment investigation then keeps native Scala, Maude, TypeScript, JSON,
JSONL, and YAML artifacts. Its visible TypeScript remains compiler checked as
one virtual program. It does not repeat three payment-specific `ToolCall`
fences or print computed ledger digests. Instead, each continuation names the
preceding receipt artifact and shows the bytes the agent reads:

- Joern `joern-output.json`;
- Maude `stdout.txt`;
- property `counterexample.json`, `run-details.json`, and complete
  `property.ts`; and
- ast-grep `findings.jsonl`, correlated with the candidate input rule tracked
  in the initial fixture.

After the property evidence, the generic ActiveGraph behavior records the
rule-residue ledger and selects the receipt-listed complete `property.ts`.
`artifact_promote` copies those exact bytes to the repository-root destination
`payment-retry.property.ts`, which keeps the property's `./src` import
executable. Promotion leaves `HEAD` at `EXACT_SNAPSHOT` and the worktree dirty.
A real `repository_checkpoint` request with policy `commit` stages every
non-ignored worktree change and returns `RESEARCH_SNAPSHOT`; `ast_grep_run`
scans that exact snapshot with the candidate rule already tracked in the
initial fixture. Seven TypeScript fences carry these eight MCP calls. The
documentation does not invent a raw worktree-write operation,
`activegraph.call`, or effect of `record_interpretation`.

The adjacent artifact explanation will make the storage mechanics explicit
without exposing private paths. One AgentFS database/capsule belongs to the
investigation. Each accepted operation acquires a validated private FUSE mount
that presents sibling `repo/` and `artifacts/` namespaces from an immutable
base and an isolated copy-up/whiteout delta. Accepted terminal activity drains
before unmount; later operations remount the same persistent capsule/delta.
`repo/` is the normal attached Git branch available to owned operations;
`artifacts/` is append-only evidence. The raw mount path is not part of the MCP
wire surface. `artifact_promote` is the explicit exact-byte copy from selected
receipt-complete evidence into the repository view, and its output remains
uncommitted until a later repository checkpoint. None of these mechanics
grants the ledger semantic authority.

The full URI shape is
`attune://investigations/{investigationId}/artifacts/{tool}/{invocationId}/{file}`.
The generic ActiveGraph behavior records the relevant URI in the next
`InterpretationLedger`, and the subsequent generated wrapper forwards the
runtime ledger reference. The publication does not fake that behavior with a
direct ActiveGraph client. It also does not rename native output
`joern.summary` or `result.json`, or replace exact receipt artifacts with
symbolic `attune:<tool>:<invocation>` strings.

No card, stage UI, new runtime bundle, or second documentation route is added.
The guide and compiler gates continue to count every physical source and test
line; their measured totals are recalculated after this replacement rather
than preserved by compressing the production declaration or artifact
evidence.

## Risks / Trade-offs

- [A ledger becomes polished hindsight] → Record it before the dependent call
  and require an expected discriminator.
- [Strings become an accidental universal IR] → Keep each ledger local to one
  question, preserve opaque native sources, and permit unresolved or rejected
  transitions.
- [A caller claims a nonexistent ledger digest] → Preserve it as caller
  context; MCP truth remains limited to the accepted bytes and operation. An
  ActiveGraph/packet consumer may validate availability in its own boundary.
- [Packet size grows] → Embed only selected small ledgers; native artifacts
  remain behind exact references.
- [Supersession implies mutation] → Make supersession a forward reference in a
  new immutable ledger and derive impact from packet contents.
- [The benchmark treatment gains extra structure] → Include
  `record_interpretation` in every arm and flatten equivalent semantic content
  into the prose control.
- [The docs imply payment-specific examples are the production ledger API] →
  Show one condensed declaration of the real generic Python pack and
  interpretation tool, then continue through the exact retained files named by
  receipts.
- [A friendly alias is mistaken for durable evidence] → Require the receipt's
  complete artifact URI and native filename; ban invented tool aliases and
  generic summary/result filenames from the investigation transcript.

## Migration Plan

1. Add the Python values, deterministic tool, common-pack composition, explicit
   relation, result/packet fields, prose projection, and reverse index with
   focused tests.
2. Correct the Case-event behavior boundary, raise the bounded tool-turn
   allowance, and update research prompts so materially different dependent
   experiments are preceded by `record_interpretation`.
3. Add the documentation chapter with one condensed production declaration;
   replace illustrative payment-specific ActiveGraph turns with exact
   receipt-returned artifact URIs and their native file contents.
4. Run Python formatting, lint, type checking, schemas, budget, tests, strict
   OpenSpec validation, deterministic documentation build, and responsive
   browser journeys.
5. Keep deployment pending editorial acceptance. Rollback removes optional
   ledger fields/tool composition and the documentation chapter; no MCP or
   persisted runtime migration is required.

## Open Questions

None for V0. Whether accepted packets later need a persisted review queue is a
separate consumer workflow decision; this change supplies only the immutable
supersession and rebuildable impact projection.
