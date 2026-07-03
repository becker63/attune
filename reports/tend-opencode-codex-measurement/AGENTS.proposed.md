# AGENTS Proposed Measurement Guidance

Derived from measurement session measurement:2026-07-01:4ac244a5fdcc40fb.

- Use `tend-opencode fingerprint --format json` and `tend-opencode run-harness-test --format json` before harnessed measurement.
- Use framework-runtime targets for local TimescaleDB/Postgres lifecycle.
- Use `tend-opencode observe --format json -- <command...>` for expensive commands.
- Treat reports as projections from DB-backed observations.
- Keep root `reports/tend-opencode-codex-measurement/` as generated report output from the framework store.
- Compare treatment against one selected comparable historical baseline session before planning the heavy recipe-only migration repeat.
- Do not store raw prompts, full conversations, secrets, raw traces, or full command output.
