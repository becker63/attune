# AGENTS Proposed Measurement Guidance

Derived from measurement session measurement:2026-06-28:db-first-opencode.

- Use `tend-opencode fingerprint --format json` and `tend-opencode run-harness-test --format json` before harnessed measurement.
- Use framework-runtime targets for local TimescaleDB/Postgres lifecycle.
- Use `tend-opencode observe --format json -- <command...>` for expensive commands.
- Treat reports as projections from DB-backed observations.
- Keep root `reports/tend-opencode-codex-measurement/` as generated report output from the framework store.
- Do not store raw prompts, full conversations, secrets, raw traces, or full command output.
