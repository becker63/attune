# Grounded prose-agent workflow

The prose agent explains the repository; it does not discover API facts from
raw source. Its input is one exact `api-manifest.json`, an audience/page brief,
approved research findings, and the controlled vocabulary for the page.

1. Run `pnpm --filter attune-docs manifest`.
2. Give the resulting manifest and
   `schema/prose-draft.schema.json` to the model as a strict structured-output
   contract. This is the only schema the prose model receives. It intentionally
   has no `review` field, reviewer identity, decision, or publication digest.
3. Require every non-trivial claim to cite stable symbol and fact IDs from that
   manifest. The fact digest is copied into the evidence record.
4. Parse the returned JSON through `parseProseAgentOutput` before reading
   nested values. It rejects unknown keys, including any agent-authored
   `review`. Shape validation does not establish truth.
5. Run grounding validation. It rejects stale source identity, missing
   evidence, unknown symbols or facts, changed fact digests, and open questions
   presented as assertions.
6. After human review, run the explicit `guides:approve` command. It writes a
   separately persisted artifact conforming to
   `schema/guide-approval.schema.json`, containing reviewer identity, decision
   time, source revision, manifest digest, structured-draft digest, and cited
   evidence digest. Build and CI never create or refresh this artifact.
7. Join prose and approval through `attachGuideApproval`, then run publication
   validation. An agent-provided `status: approved` can never cross this
   boundary; an absent, stale, or mismatched persisted approval is
   unpublishable.
8. If only unrelated source/manifest facts changed and the complete draft and
   cited-evidence digests are identical, retain the human decision only by
   recording an explicit ActiveGraph `ApprovalCarryForward`. The workflow
   record links the current and prior drafts to the still-latest human
   decision; it cannot override a rejection, failed validation, or
   invalidation, and the static trace validator requires that exact chain.
9. Render Markdown and static HTML deterministically. The Markdown, evidence
   JSON, and optional ActiveGraph `TraceExport` remain inspectable beside the
   page.

ActiveGraph records the agent execution separately from its factual support.
Its `content`, `execution`, `review`, `presentation`, and `invalidation` edges
may be exported at build time. GitHub Pages never needs a Python or graph
runtime.

When cited fact digests change, `checkGuideStaleness` identifies the affected
claims. Unrelated pages remain current. A new prose-agent execution is not
publishable until its own draft is grounded and approved.
