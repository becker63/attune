# Trellis Language Service

`trellis-ls` is the public agent interface for this package. Agents should call
the CLI and consume JSON stdout plus exit codes; TypeScript imports from this
package are implementation details for the framework and tests.

Canonical commands:

```bash
trellis-ls diagnostics --project tsconfig.json --format json
trellis-ls fixes --project tsconfig.json --diagnostic-id <id> --format json
trellis-ls apply --project tsconfig.json --fix-id <id> --mode diff --format json
trellis-ls apply --project tsconfig.json --fix-id <id> --mode write --format json
trellis-ls check --project tsconfig.json --format json
```

JSON output is versioned with `schemaVersion: 1` and includes command metadata,
scope, and `evidenceMode`. Basic diagnostics, fixes, apply diff, safe local
apply, and check run without live Postgres; durable observations must use the
existing framework receipt and observation spine when configured.

Exit codes:

- `0`: command completed without configured blocking diagnostics or refusal.
- `1`: diagnostics met the selected fail threshold, or apply refused a fix.
- `2`: CLI input, project loading, configuration, or runtime failure.

`effect-oxlint` remains transitional CI pressure. Durable architecture
invariants should be exposed through Trellis diagnostics and fixes rather than
documented as the agent repair protocol.
