## Why

**Attune helps teams turn shared codebase taste into executable practice.**

Teams already contain taste: local judgment, repeated review comments, small conventions, architectural preferences, and situated knowledge about how a codebase should be cared for. Today that taste is often trapped in senior engineers' heads, scattered markdown guidance, old pull requests, Slack threads, and noisy AI review comments; Attune exists because **taste is not scarce. It is distributed. Attune helps teams notice it, test it, and carry it forward.**

Markdown instructions can steer agents, but they cannot prove that a practice survives contact with the codebase. Generic AI review can produce comments, but it rarely gives a team a clean, reviewable, durable practice. Attune takes a different posture: notice a recurring pattern, express it as an intent, ground it in examples, measure a deterministic candidate against real code, revise it with human feedback, and promote only the artifact the team accepts.

This spike proves the first vertical slice of that loop:

```text
Notice -> express -> measure -> discuss -> revise -> adopt
```

Or, in operational terms:

```text
agent proposes
deterministic tool measures
humans review and promote
repo receives the clean native artifact
Attune keeps the private lineage
```

## What Changes

- Introduce **Attune** as a product workbench for discovering, measuring, revising, and promoting shared codebase taste.
- Create the first **Rule Workbench** vertical slice around one concrete rule-authoring lifecycle.
- Represent rule workbench state as a private event stream, then project those events into a reviewable UI model.
- Define the core product object as a rule candidate grounded in:
  - intent
  - looks-like example
  - does-not-look-like example
  - structural proxy
  - native deterministic rule
  - measurement
  - known limits
  - human labels
  - revision history
  - promotion decision
- Require every candidate to include both a positive example and a negative example before it can be displayed as valid or promoted.
- Use ast-grep as the first deterministic compiler target and measurement instrument for the spike.
- Keep ast-grep focused as the first target, while leaving the product philosophy open to future deterministic tools such as ESLint, CodeQL, TypeScript-aware analyzers, rule clusters, tests, and custom checkers.
- Use an agent only to propose candidate intents, examples, structural proxies, and deterministic rules; the agent is not the authority.
- Use real measurement as the trust mechanism: proposed rules must be run against real fixture code before promotion.
- Let humans label findings, revise candidates, reject candidates, or promote candidates.
- Establish the first Attune visual system as a dark paper workbench: warm dark surfaces, quiet panels, editorial headings, precise code panes, and semantic accents.
- Compose the Workbench around the selected candidate: potential patterns in the persistent sidebar, three peer artifact panes for looks-like, does-not-look-like, and deterministic rule, compact candidate status, and a compact findings handoff strip.
- Keep finding review on a dedicated Findings page; the Workbench shows only a compact findings handoff with an `Open findings` action.
- Limit default Workbench candidate actions to `Revise rule` and `Promote rule`; ambiguous global controls such as `New scan`, `Give feedback`, `Run agent`, or `Auto-fix` are excluded until modeled as explicit domain commands.
- Generate an export preview containing clean repo-native artifacts after promotion.
- Preserve the boundary that the repository receives only accepted artifacts while Attune privately remembers attempts, false positives, rejected candidates, revisions, and promotion reasoning.
- Establish the platform decision: Node.js LTS is the official runtime compatibility target, Bun is the local package manager and script runner, and Nix pins the shared development toolchain.
- Add a Nix flake with Node, Bun, ast-grep, Chromium, and pre-commit tooling, using nix-pre-commit/git-hooks integration for local quality gates.

## Executable Shadows of Taste

Attune assumes that more codebase taste is executable than teams expect.

Taste is not always directly executable, but taste often has executable shadows: structural signals, scoped constraints, example-backed patterns, and deterministic checks that approximate a deeper practice. Attune helps teams find, measure, and refine those shadows.

A rule does not need to capture the whole philosophy of a codebase. It needs to capture one durable structural signal, measure it honestly, make its limits visible, and let humans decide whether the approximation is useful enough to adopt.

For example, a team may hold the architectural taste that styling should stay centralized in UI primitives, design tokens, and recipes. That is richer than formatting, but it can still cast deterministic shadows:

```text
no raw colors
no raw box shadows
no raw border radii
no raw className strings
no surface styling outside recipes
no styling props outside UI primitives
only geometry keys in inline styles
allow motion components where animation requires inline geometry/state
allow token definitions in theme files
```

The product claim is not that every aesthetic or architectural judgment can become a perfect rule. The claim is that many recurring judgments have more structure than teams initially expect. LLMs are useful here because they can help search the space of candidate encodings. Deterministic tools are useful because they make those encodings inspectable, measurable, revisable, and enforceable.

Attune helps teams discover the executable shadows of their shared taste: small deterministic programs, generated with AI assistance, measured against real code, and adopted only through human review.

## Capabilities

### New Capabilities

- `rule-workbench`: Review and operate on rule candidates through intent, examples, native deterministic rule content, measurement, labels, revisions, lineage, and export preview.
- `attune-visual-system`: Define the dark paper workbench shell, visual tokens, layout hierarchy, action hierarchy, page boundaries, and Scene-test expectations.
- `event-sourced-rule-lifecycle`: Store and project the rule authoring lifecycle as domain events so private lineage remains inspectable without polluting the target repository.
- `deterministic-rule-measurement`: Execute candidate ast-grep rules against fixture code and normalize measurement results into findings.
- `agent-rule-proposal-boundary`: Use fixture-backed and AI SDK mock-backed agents to propose structured candidates without storing raw provider responses as product truth.
- `fixture-first-development`: Boot the default development and test path from typed TypeScript scenarios without live model calls, GitHub, or a production database.
- `native-artifact-export-preview`: Generate a preview of clean ast-grep repository artifacts after human promotion.
- `node-bun-nix-toolchain`: Pin the development toolchain with Nix while keeping Node.js LTS as the runtime contract and Bun as the local package manager/script runner.

### Modified Capabilities

- None.

## Impact

- Adds a new OpenSpec-defined product direction for Attune.
- Establishes the first vertical spike around one TypeScript fixture scenario, likely boundary validation before core logic.
- Introduces Effect-native domain/eventing seams, FoldKit Rule Workbench UI seams, Vercel AI SDK model-boundary seams, ast-grep measurement seams, and export preview seams.
- Adds Node/Bun/Nix/pre-commit repository foundations so future implementation can be reproducible and locally fast while remaining Node-compatible.
- Does not add a production database, live GitHub App, webhook handling, live paid model dependency, custom DSL, custom bundle format, generic benchmark platform, or production exporter in this spike.
