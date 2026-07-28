## Retired onboarding requirements

### Requirement: Structured grounded prose drafts

**Reason**: Narrative authority now lives in reviewed source TSDoc; a parallel
agent draft model adds vocabulary and drift without improving the checked API.

**Migration**: Move caller-relevant, source-supported explanation into the
nearest public declaration and its checked `@example`.

### Requirement: Grounding validation and deterministic rendering

**Reason**: Source TSDoc, compiler checks, exact spans, and Git review replace
guide claim/evidence validation.

**Migration**: Use the API manifest's declaration, documentation, example, and
provenance records.

### Requirement: Reviewed onboarding publication

**Reason**: Git review of source comments is the one editorial decision;
separate guide approvals, carry-forward, and publication traces are removed.

**Migration**: Review and commit TSDoc changes through the normal source
workflow, then publish the deterministic reference.

### Requirement: Initial onboarding guide set

**Reason**: The package page and six API pages are small enough to tell the
complete lifecycle without a separate onboarding section.

**Migration**: Start at the package reference and follow its lifecycle-ordered
API links.

### Requirement: Repository-wide onboarding map

**Reason**: This change deliberately removes onboarding as a second information
architecture; source and experiment evidence remain linked where relevant.

**Migration**: Use package/API provenance links and the repository source tree.
