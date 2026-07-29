# grounded-experiment-reports Specification

## Purpose

Define a deterministic, Python-owned report lifecycle from manifest and draft validation through V0 approval and immutable publication.

## Requirements

### Requirement: Python-owned pre-publication lifecycle

Python/ActiveGraph SHALL own deterministic experiment extraction, metric
projection, hidden-evaluator acceptance, report-agent execution, report-claim
grounding, measured/inference/speculation classification, semantic validation,
approval recording, invalidation, supersession, and publication-bundle export.
The TypeScript docs package SHALL NOT query ActiveGraph, interpret raw research
events, call a report model, calculate experiment metrics, validate research
claims, or decide publication validity.

#### Scenario: Complete a benchmark run

- **WHEN** a Result reaches the hidden evaluator boundary
- **THEN** Python records/evaluates the result and constructs all
  pre-publication research and report facts before static-site consumption

### Requirement: Deterministic Python manifest and pure report projection

The Python module SHALL extract a closed, versioned manifest from exact
ActiveGraph records, receipt/artifact references, configuration, accounting,
and evaluator output. It SHALL retain terminal and incomplete runs and
recompute aggregates, comparisons, ratios, success rates, latency, and
break-even from run rows. Pure Python functions SHALL validate a structured
draft against the frozen manifest and render the approved Markdown page; they
shall not introduce a generic report engine or arbitrary graph traversal.

#### Scenario: Failed run exists

- **WHEN** an arm run fails, cancels, rejects, or remains incomplete
- **THEN** its row remains in the manifest and relevant total-cost and success
  calculations

#### Scenario: Render an approved report

- **WHEN** a manifest, valid draft, and bound approval are available
- **THEN** Python produces Markdown and optional deterministic chart data from
  those inputs alone
- **AND** no additional model call or arbitrary graph query can alter a fact

### Requirement: Constrained report draft and validation

The report agent SHALL receive only a frozen manifest, redacted public case
descriptions, editorial policy, approved comparator pages, and bounded human
framing. It SHALL return a structured draft whose claims carry certainty and
metric/run/artifact/limitation references. Python validation SHALL reject stale
manifests, missing references, non-derived numbers, reversed comparisons,
unsupported inference, speculation presented as fact, success-only accounting,
incomparable arms, invalid swarm speed claims, cache-only amortization, omitted
threats, and private payloads.

#### Scenario: Claim reverses a ratio

- **WHEN** a measured claim reverses numerator and denominator semantics
- **THEN** Python validation rejects it with the expected and stated direction

### Requirement: Explicit V0 approval and immutable bundle

A host-authorized human approval SHALL bind experiment ID, manifest/report
digests, exporter version, reviewer/decision identity, and decision time. A
correction SHALL create a new immutable experiment revision and new approval;
V0 SHALL NOT implement approval carry-forward, repairable presentation
relations, or a publication role lattice.

Python SHALL export `publication.json`, `manifest.json`, `report.json`,
`approval.json`, and generated `index.md` under
`packages/attune-docs/content/experiments/<slug>/`. `publication.json` SHALL
bind all component digests, exporter version, and the stable ActiveGraph
publication address. `evidence.json`, when emitted, SHALL be derived from
report references rather than independently authored.

#### Scenario: Evaluator correction affects one experiment

- **WHEN** corrected evaluator output changes an experiment revision
- **THEN** Python invalidates that revision and requires a new approval before
  exporting its replacement
- **AND** unrelated experiment bundles remain valid

### Requirement: Pydantic export contract and static docs boundary

Pydantic models SHALL remain the only handwritten authority for Manifest,
Report, Approval, and PublicationBundle contracts. Python SHALL continue to
generate and drift-check their closed JSON Schemas and approved Markdown. The
TypeScript documentation build SHALL only verify the frozen bundle/digest
boundary when experiment publication is enabled; it SHALL NOT create
experiment-domain TypeScript models, query ActiveGraph, recompute metrics,
validate claims, or independently author factual tables or charts.

Approved generated Markdown MAY enter through `remark-parse` and `remark-gfm`
and reuse the generic `rehype-sanitize`-guarded MDAST-to-HAST publication tail.
It SHALL remain in an independent static experiment namespace and SHALL NOT
enter the API MDAST tree, declaration resolver/checker, compact guide
contents, canonical type-link space, or one-page Attune guide/API artifact
contract.

Experiment publication SHALL NOT create shared page records, routes, search
records, a client navigation model, or a documentation manifest. Disabling
experiment publication SHALL leave API `index.html` and `styles.css`
byte-identical.

#### Scenario: Approved experiment Markdown is published

- **WHEN** an approved frozen experiment bundle is present and publication is
  enabled
- **THEN** TypeScript verifies the closed schema/digest boundary and lowers the
  already-generated Markdown through the generic static tail
- **AND** no experiment fact or model is recomputed in TypeScript
- **AND** the API type document remains unchanged

#### Scenario: Experiment publication is disabled

- **WHEN** no approved bundle is selected for publication
- **THEN** the API document builds without an experiment namespace
- **AND** no placeholder route, search entry, page record, or navigation item
  is produced

#### Scenario: Experiment Markdown attempts API semantics

- **WHEN** approved Markdown contains text or code resembling a repository type
  name
- **THEN** it remains ordinary experiment content
- **AND** does not enter the API declaration completeness or compiler-definition
  link contract
