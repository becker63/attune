# Audit Rubric

These thresholds are deterministic-ish heuristics. They do not judge beauty, but they catch common ways Attune drifts away from clean editorial dark mode.

## Thresholds

- Max major panels per page: 6
- Max primary buttons per page: 1, except Workbench may have Revise + Promote if hierarchy distinguishes them
- Max repeated metric values: 1 repeated location
- Max nested panel depth: 2
- Max visible settings sections: 1 selected document plus rail
- Code pane minimum height: 180px for primary code panes
- Page title required
- Page subtitle required except ultra-focused subviews
- No direct use of raw hex colors outside token definitions unless explicitly in syntax highlighting
- No generic button labels:
  - Give feedback
  - Ask AI
  - Generate
  - Run agent
  - Autofix
  - Auto-fix

## Manual Audit Questions

- What is the one thing this page is about?
- What is the dominant artifact?
- What can be deleted?
- Are there too many equally weighted surfaces?
- Are metrics duplicated?
- Would this screenshot be mistaken for a dashboard?
- Does the page teach the Attune product loop?
- Are code panes readable enough to review, not just notice?
- Are agent-generated words inside typed slots?
- Is the strongest action actually the next product decision?

## Audit Response Pattern

For every flag, choose one:
- fix it immediately,
- add a short explanation for why the flag is acceptable,
- defer it into a page-specific runbook if the user asked for planning rather than edits.

Do not use audit flags as a substitute for visual judgment. If the page technically passes but still feels busy, keep simplifying.
