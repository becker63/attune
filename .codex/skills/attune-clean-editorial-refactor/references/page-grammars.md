# Page Grammars

Use page grammar before color. If a page has the wrong shape, restyling will not fix it.

## Discover

Purpose: choose which pattern deserves inspection.

Grammar: pattern shelf + selected editorial dossier.

Primary regions:
- readiness filters
- pattern shelf
- selected dossier
- supporting examples
- deterministic-shape preview
- risk note

Primary action: Open in Workbench.

Page-level action: Start scan.

Secondary actions:
- Defer
- Reject
- change readiness filter
- search or sort pattern shelf

What to remove:
- dashboard metrics
- raw scan table
- direct promote
- chat panel
- giant repository analytics

What must be visually dominant:
- selected pattern dossier
- evidence examples and deterministic-shape preview

Allowed generated content:
- pattern title
- intent
- why noticed
- example captions
- risk note
- deterministic shape description
- icon token from curated set

Disallowed generated content:
- arbitrary layout
- arbitrary HTML/CSS
- raw scan payloads
- new action labels

## Workbench

Purpose: inspect and revise one candidate artifact.

Grammar: three code panes + revision prompt + compact findings handoff.

Primary regions:
- Looks like
- Does not look like
- Deterministic rule
- Revise with intent prompt
- compact candidate status
- compact findings handoff

Primary actions:
- Revise candidate
- Promote rule

Secondary actions:
- Open findings
- Copy rule
- expand/collapse code pane
- Back to Discover if contextual

What to remove:
- standalone measurement panel
- full findings review queue
- lineage timeline by default
- generic scan controls
- direct YAML editing as the default interaction

What must be visually dominant:
- the three artifact panes
- deterministic rule as an inspection artifact, not the whole product

Allowed generated content:
- title
- intent
- examples
- rule YAML
- revision suggestions
- measurement summary prose

Disallowed generated content:
- page layout
- promotion truth
- raw provider payloads
- arbitrary buttons

## Findings

Purpose: review what the deterministic rule touched.

Grammar: review queue + selected finding dossier.

Primary regions:
- filters/search
- finding queue
- selected finding code excerpt
- why it matched
- decision cards

Primary actions:
- True positive
- False positive
- Ignore

Secondary:
- Use as example
- Back to Workbench
- previous/next finding

What to remove:
- analytics dashboard
- duplicated metric cards
- raw ast-grep output table
- global promote/export actions

What must be visually dominant:
- selected finding code excerpt
- decision cards

Allowed generated content:
- why it matched
- review note prompt copy
- selector explanation
- suggested example rationale

Disallowed generated content:
- labels that imply accusation
- raw ast-grep JSON
- arbitrary severity taxonomy

## Lineage

Purpose: explain how the candidate evolved and why it is trustworthy.

Grammar: simple timeline + selected event article.

Primary regions:
- compact event timeline
- selected event detail
- before/after diff if relevant
- impact row
- trust note

Primary action: none by default.

Secondary:
- Back to Workbench
- Open export preview

What to remove:
- raw event log
- 8+ dense event cards on first view
- giant trust checklist
- repeated metrics
- chain-of-thought framing

What must be visually dominant:
- selected event article
- the specific artifact change and its evidence

Allowed generated content:
- human-readable event title
- what changed
- why it matters
- impact summary

Disallowed generated content:
- raw event payload
- hidden reasoning
- unbounded timeline narration

## Exports

Purpose: review clean repo artifacts and Git bot handoff.

Grammar: clean artifact package + Git bot handoff.

Primary regions:
- file list
- selected file preview
- Git bot plan
- boundary note

Primary action: Create draft PR.

Secondary:
- Copy patch
- Preview files

What to remove:
- private lineage details from file list
- CI dashboard
- GitHub clone UI
- autonomous push language
- export debate that belongs in Workbench/Findings/Lineage

What must be visually dominant:
- selected clean artifact preview
- boundary between repo artifacts and private Attune history

Allowed generated content:
- PR title/body draft
- artifact summary
- README note
- branch naming suggestion within configured policy

Disallowed generated content:
- Git permission state
- private lineage in export files
- prompt traces
- rejected candidate notes

## Settings

Purpose: configure repo-specific Attune behavior without becoming an admin dashboard.

Grammar: settings section rail + selected settings document.

Primary regions:
- settings rail
- selected settings document
- save bar

Primary action: Save changes.

Secondary: Restore defaults.

What to remove:
- 2x2 grid showing every setting at once
- dense admin panels
- too many toggles visible simultaneously
- scan defaults as a dashboard card unless selected in rail

What must be visually dominant:
- one selected settings document
- the boundary being configured

Allowed generated content:
- explanatory copy
- reserved-state labels
- validation summaries

Disallowed generated content:
- authority escalation claims
- autonomous enforcement copy
- hidden configuration changes
