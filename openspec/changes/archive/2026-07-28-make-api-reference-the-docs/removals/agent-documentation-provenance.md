## Retired guide-provenance requirements

### Requirement: Traceable documentation and research runs

**Reason**: The combined documentation-and-research graph was implemented
almost entirely for retired guide publication. Exact TSDoc/source provenance
now covers documentation, while Python experiment bundles retain their own
coarse immutable linkage.

**Migration**: Follow immutable source spans for API documentation and the
Python-owned publication bundle for experiment evidence.

### Requirement: Content and execution provenance separation

**Reason**: No generated guide claim enters the publication build, so a graph
distinction between guide factual support and guide-agent execution is no
longer needed.

**Migration**: Only reviewed source TSDoc is published.

### Requirement: Selective guide invalidation

**Reason**: Guide sections no longer exist; declaration and example digests
directly identify the pages that changed.

**Migration**: Regenerate the deterministic API manifest and reference.

### Requirement: Exact static publication binding

**Reason**: Guide draft, approval, carry-forward, validation, render, and
publication graph objects are removed with the guide pipeline.

**Migration**: Bind static documentation to one source revision, exact spans,
and content digests; retain immutable Python experiment bundle revisions.

### Requirement: Redacted deterministic public traces

**Reason**: The static site no longer consumes guide trace exports.

**Migration**: Publish source provenance links for the API and the existing
redacted fields of Python-owned experiment bundles.
