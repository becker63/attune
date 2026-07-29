## MODIFIED Requirements

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
