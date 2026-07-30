## ADDED Requirements

### Requirement: Opaque interpretation-ledger forwarding

The bridge SHALL support forwarding an ActiveGraph-owned
interpretation-ledger content address through an operation's existing
`FreeFormReference` collection. It SHALL NOT add a ledger field or operation
to the Effect-owned contract.

When an Attune operation cites a ledger, `attune-mcp` SHALL persist that opaque
reference with the exact accepted request. It SHALL NOT retrieve, interpret,
validate, revise, promote, or mechanically certify the ledger or the semantic
decision it describes.

When a ledger uses an Attune result as a semantic source, its `source_refs`
SHALL cite an exact artifact URI returned in that result's receipt rather than
an invented tool alias. The bridge SHALL continue to treat that URI and the
later ledger digest as opaque caller-owned references.

#### Scenario: Dependent capability cites a ledger

- **WHEN** an ActiveGraph behavior invokes an Attune capability after recording
  an interpretation
- **THEN** the wrapper forwards the returned `ledger:sha256:...` address through
  the existing caller-reference field
- **AND** the short optional note does not duplicate the ledger body

#### Scenario: MCP accepts the referenced request

- **WHEN** `attune-mcp` accepts an operation containing a ledger reference
- **THEN** its canonical request and receipt preserve that reference
- **AND** no new wire schema, operation, generated client model, or semantic
  lookup is introduced

#### Scenario: Ledger cites retained native evidence

- **WHEN** an agent reads a retained file before choosing the next capability
- **THEN** the ledger cites the file's exact
  `attune://investigations/.../artifacts/...` URI from the producing receipt
- **AND** it does not substitute `attune:joern:*`, `attune:maude:*`,
  `attune:property:*`, `joern.summary`, or a generic `result.json` label
