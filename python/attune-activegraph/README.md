# attune-activegraph

This package is the typed Python projection of Attune's Effect MCP capability
boundary and the narrow provenance adapter used by Attune's research and
documentation agents. It exposes two independent ActiveGraph packs:

- `attune_effect_tools` gives ActiveGraph eight mechanical tools and defines no
  investigation semantics, object types, relations, behaviors, or prompts.
- `attune_documentation_provenance` defines only the typed records and
  relations needed to audit grounded research and static onboarding guides.

The authority chain is deliberately one way:

```text
Effect Schema
  -> contracts/attune-tools.schema.json
  -> generated Pydantic models
  -> eight handwritten ActiveGraph wrappers
  -> one persistent host-native MCP session
```

The server's `attune://contracts` resource is checked against the digest built
into this package before the first call. A mismatch fails before an
investigation operation is sent.

## Contract generation

Python 3.12 and every dependency are pinned by `.python-version`,
`pyproject.toml`, and `uv.lock`.

```sh
uv sync --locked
uv run python scripts/generate_contract_models.py generate
uv run python scripts/generate_contract_models.py check
```

`generate` consumes the checked-in Draft 2020-12 compound schema and writes
`generated/models.py` plus the expected digest module. `check` regenerates into
a temporary directory and compares exact bytes, so it never repairs drift
silently. Do not hand-edit generated files and do not generate production
models dynamically from `tools/list`.

## ActiveGraph use

The distribution exposes the `attune_effect_tools` ActiveGraph pack. Its
version includes the contract-digest prefix, and all tools are declared
nondeterministic to ActiveGraph so replay uses its recorded response.

Configure a stable run identity before a live call:

```sh
export ATTUNE_ACTIVEGRAPH_RUN_ID=my-durable-activegraph-run
export ATTUNE_MCP_COMMAND=attune-mcp
```

`ATTUNE_MCP_ARGS` may contain a JSON array of arguments and
`ATTUNE_MCP_CWD` may select a working directory. Arguments are passed directly;
the bridge never invokes a shell. The default pack is safe to import without
these variables and starts the server lazily on its first call.

Each wrapper replaces the input's placeholder `invocationId` with an `ag1:`
identifier derived from the configured run identity, ActiveGraph event,
behavior/frame context, tool name, canonical arguments, and contract digest.
This lets a retry recover the same Effect receipt after a client-side crash.
ActiveGraph's attempt-scoped idempotency key is not used as durable identity.

Callers embedding the bridge should close `AttuneMcpClient` explicitly or use
it as a context manager. One client owns one MCP session and one child process;
subsequent calls reuse both.

## Checks

```sh
uv run ruff format --check .
uv run ruff check .
uv run basedpyright
uv run pytest
uv build
uv run attune-activegraph-smoke
```

The smoke is host-native. It performs the contract handshake and validates one
typed `UnknownInvestigation` failure; it does not use a VM, mount AgentFS, or
run Joern. Nx connects these checks to the authoritative TypeScript schema
check, while Nix consumes the same `uv.lock` for the packaged environment.

Effect remains responsible for repositories, AgentFS, subprocesses, receipts,
artifacts, cancellation, and cleanup. ActiveGraph remains free to interpret
gaps and maintain semantic trajectories using whatever objects, relations, and
Markdown a research pack finds useful.

## Documentation provenance

Load the schema-only provenance pack into the same runtime used by the research
and documentation agents:

```python
from activegraph import Graph, Runtime
from attune_activegraph.provenance import (
    DocumentationAuthority,
    DocumentationAuthorityScope,
    DocumentationProvenance,
    DocumentationTrustPolicy,
)

runtime = Runtime(Graph(run_id="docs-2026-07-27"))
trust = DocumentationTrustPolicy(
    trusted_validator_versions=frozenset({("grounding-validator", "1.0.0")}),
    trusted_reviewer_roles=frozenset({("becker63", "maintainer")}),
    trusted_workflow_versions=frozenset({("documentation-approval-revalidator", "1.0.0")}),
    trusted_publishers=frozenset({"release-workflow"}),
)
validator_credential = object()
reviewer_credential = object()
workflow_credential = object()
publisher_credential = object()
authorities = {
    validator_credential: DocumentationAuthority(
        DocumentationAuthorityScope.VALIDATION,
        "grounding-validator",
        "1.0.0",
    ),
    reviewer_credential: DocumentationAuthority(
        DocumentationAuthorityScope.REVIEW,
        "becker63",
        "maintainer",
    ),
    workflow_credential: DocumentationAuthority(
        DocumentationAuthorityScope.APPROVAL_CARRY_FORWARD,
        "documentation-approval-revalidator",
        "1.0.0",
    ),
    publisher_credential: DocumentationAuthority(
        DocumentationAuthorityScope.PUBLICATION,
        "release-workflow",
    ),
}


def resolve_authority(credential: object) -> DocumentationAuthority | None:
    return authorities.get(credential)


provenance = DocumentationProvenance[object].install(
    runtime,
    authority_resolver=resolve_authority,
    trust_policy=trust,
)
```

Omitting `trust_policy` installs the checked-in Attune defaults: validator
`grounding-validator` at version `1.0.0`; reviewer/role pairs
`documentation-maintainer`/`maintainer` and
`maintainer@example.com`/`documentation-maintainer`; carry-forward workflow
`documentation-approval-revalidator` at version `1.0.0`; and publisher
`release-workflow`. Hosts whose identities differ must pass an explicit policy
as above instead of teaching the graph about new authorities.

The resolver is mandatory. The plain objects above illustrate opaque
capabilities for a local host; a production host should resolve only its
authenticated session or signer credentials. Each privileged method also
requires its corresponding capability through the `authority=` argument. The
resolved claim includes the operation scope and exact role or version, so a
review capability cannot be reused for validation, carry-forward, or release.
Resolution, scope matching, and policy checks occur before any graph lookup or
repair, and credentials are never persisted in ActiveGraph.

The adapter records immutable, content-addressed source revisions, API
manifests and facts, agent configurations, prompts, tool calls, research
claims, unresolved questions, guide sections, validation, human approval,
rendering, publication, and invalidation. Content edges (`derivedFrom`,
`informedBy`, and `cites`) remain separate from execution edges, so a completed
agent run cannot make an unsupported claim publishable.

Each completed agent run is bound to exactly one source revision, one manifest,
and a matching agent configuration. Research claims can inform narrative
sections only while their latest deterministic validation and human-review
decisions pass.

The trust policy is local configuration and is never reconstructed from graph
records. It authorizes exact validator/version, reviewer/role,
carry-forward-workflow/version, and publisher identities before those records
can affect rendering, publication, or export.

ActiveGraph's in-process `actor` argument is attribution, not authentication:
`Graph.add_object` and `Graph.add_relation` accept caller-supplied strings. Raw
`Graph` and `EventStore` mutation—and the ability to install another adapter
over that graph—is therefore a trusted local boundary. Production hosts must
withhold those surfaces and mediate documentation writes through their
credential-resolving adapter (or provide authenticated/signed events). The
adapter prevents a submitted record from naming its way into authority; it
does not turn an untrusted graph writer or installer into an authenticated
principal.

`GuideDraft` is the review boundary shared with `packages/attune-docs`. It binds
the ordered section content addresses to the website workflow's complete
64-character `draftDigest` and `evidenceDigest`, plus the exact source revision
and manifest digest. `review_binding(...)` returns the values an
`ApprovalDecision` must attest. Publishing requires the latest validation and
approval decisions to pass and every section to remain current; a later failure
or rejection revokes that permission.

Each `PublicationRevision` also commits to the exact rendered artifact's
content address. The pair `(guide_id, revision)` is single-binding: an
authorized retry may restore a missing edge only to that artifact, while a
different artifact, site, or publisher requires a new revision.

An approval for an older draft is never silently treated as approval of a
current draft. When only source or manifest metadata changed,
`record_approval_carry_forward(...)` can add an explicit
`ApprovalCarryForward` record after the current draft passes validation. The
record names the current draft, prior draft, and prior human decision by content
address; repeats the exactly equal `draft_digest` and `evidence_digest`; and
records `carry_forward_id`, `workflow`, `workflow_version`,
timezone-aware `revalidation_time`, and a non-blank `reason`. The revalidation
time cannot predate either draft's current passed validation or the prior human
decision. The graph exposes the review path as:

```text
current GuideDraft --approvalCarriedForwardBy--> ApprovalCarryForward
ApprovalCarryForward --carriesApprovalFrom-----> prior GuideDraft
ApprovalCarryForward --revalidatesApproval-----> prior ApprovalDecision
```

Rendering and publication accept this path only while both draft lineages
remain valid, both drafts retain passed validation, and the named human
decision remains the latest approved decision for the prior draft. A later
current-draft decision takes precedence. Rejection, validation failure, or
content invalidation on either lineage therefore revokes the carry-forward
without deleting its audit record.

Evidence, research-claim, and guide-section records commit internally to their
exact content-support edges. Carry-forward also compares a metadata-independent
projection of the two ordered section sets, including prose and non-metadata
support addresses. Reusing an old digest string after changing prose, cited
evidence, or a support relation therefore fails closed; source and manifest
input coordinates are the only excluded metadata.

The graph is shared and mutable, but provenance records are append-only by
contract. Before using a node or relation for approval, rendering, publication,
invalidation, or trace export, the adapter reconstructs its typed record and
recomputes its content address. A patched record or forged `NodeRef` therefore
fails closed instead of inheriting an old approval.

`invalidate_manifest_facts(...)` walks reverse content edges from only the
changed fact records. `stale_guides()` reports the affected research
conclusions and guide sections without broad invalidation of unrelated pages.

`export_guide_trace(guide_id)` returns deterministic schema-v1 JSON containing
sorted nodes and edges. A node's public `id` hashes its redacted type/data
projection plus its opaque `content_address`; that address identifies the
independently validated internal record without revealing omitted fields.
Edge ids hash their public source, target, and type.
None depend on graph insertion counters. Each edge identifies its provenance kind as
`content`, `execution`, `review`, `presentation`, or `invalidation`.
`TraceExport.write_json(path)` writes that trace for a static-site build; the
site does not import or query ActiveGraph at runtime. This public projection is
claim-scoped and redacted: prompt bodies, tool arguments/results, configuration
settings, evidence excerpts, validation messages, and approval rationales stay
in the internal graph and are not copied into Pages artifacts.

The checked-in [example trace](examples/guide-trace.json) is generated by:

```sh
uv run python examples/build_guide_trace.py
```

The test suite compares the generated bytes to the fixture. A Node-only Pages
build can therefore consume or copy that JSON directly and fail early if its
expected schema drifts.
