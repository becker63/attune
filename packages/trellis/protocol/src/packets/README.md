# Packet protocol receipts

Packet lifecycle evidence is protocol-owned, but it is not a second ledger.

`PacketReceiptPayload` and `MigrationJudgmentReceiptPayload` are payload schemas for
`RecipeObservation` rows. Storage remains the shared recipe observation spine unless a
future OpenSpec change proves that the existing observation boundary is insufficient.

The packet protocol may name receipts for product clarity, but durable persistence keeps
using `RecipeObservation` and recipe receipt store boundaries. Packet handlers should
therefore emit bounded receipt payloads with privacy summaries instead of raw prompts,
raw traces, full source files, command output, patch text, or raw diffs.
