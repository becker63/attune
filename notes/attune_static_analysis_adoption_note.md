# Attune Product Note — Agent-Assisted Adoption of Serious Static Analysis

## Core insight

Attune is not primarily an ast-grep product.

Attune is a product flow for making serious code-analysis tools easier to adopt by turning team judgment into examples, measured candidates, and clean repo-native artifacts.

The practical wedge can start with ast-grep, but the deeper product is broader:

```text
Teams are producing more AI-generated code.
They need repo-native guardrails that survive outside the chat session.
The tools already exist, but they are hard to adopt.
Agents are good at noticing patterns and proposing encodings.
Deterministic analysis tools are good at measuring those encodings.
Humans should decide what becomes practice.
```

A concise product statement:

> Attune turns repeated engineering judgment into reviewable, measured, repo-native rules.

A more ambitious statement:

> Attune helps teams compile codebase taste into deterministic engineering practice.

A more immediately sellable statement:

> Attune turns repeated code review guidance into static-analysis rules your repo can actually run.

---

## Why this matters now

AI-generated code is increasing the amount of code teams must review, normalize, and maintain. Prompt instructions and markdown guidance help, but they are not enough. They are easy to ignore, hard to measure, and rarely become durable repository behavior.

Most teams already have tools that can constrain generated code:

- ast-grep
- ESLint
- Semgrep
- CodeQL
- TypeScript-aware analyzers
- custom lint rules
- repository queries
- CI checks
- test fixtures

But these tools are often unfamiliar, difficult to author, and underused. Engineers may think of them as tools for formatting, simple conventions, or security checks, when in practice they can encode much larger semantic surfaces.

The opportunity is not to replace those tools. The opportunity is to make them adoptable.

Attune gives those tools a product flow.

---

## The underappreciated power of static-analysis tools

Many engineers underestimate what static-analysis tools can express.

They are often treated as tools for small conventions:

```text
no unused imports
no inline styles
no console.log
prefer this import path
```

But they can also encode deeper engineering practice:

```text
side effects belong at boundaries
feature modules should not import sibling internals
shared UI should not depend on application features
raw environment reads should stay behind configuration services
server actions should not leak into client components
component styling should flow through primitives and recipes
error handling should normalize into a project-level result type
security-sensitive calls should pass through approved wrappers
AI-generated code should not bypass established service seams
```

These are not just style preferences. They are executable shadows of architecture, maintainability, safety, and team taste.

The product insight is:

```text
A lot more engineering judgment is statically encodable than teams expect.
```

The rule does not need to capture the whole philosophy perfectly. It needs to capture a useful, inspectable, measurable approximation that the team can revise and promote.

---

## Why agents belong in the loop

Agents are not the authority in Attune. They are the pattern-noticing and candidate-generation layer.

Agents are useful because they can help move from vague engineering judgment to concrete artifacts:

```text
repeated review comments
old PR feedback
project docs
local codebase patterns
senior engineer intuition
examples of good and bad code
```

into:

```text
plain-language intent
positive examples
negative examples
candidate deterministic encoding
known risks
measurement interpretation
revision suggestions
exportable docs
```

The agent is good at noticing patterns, writing prose, generating examples, and searching the space of possible encodings.

The deterministic tool is good at parsing code, matching structure, measuring coverage, producing findings, failing loudly, and running in CI.

The human is good at deciding what matters.

Attune should preserve that division of labor:

```text
Agent proposes.
Deterministic tool measures.
Human promotes.
Repo receives the clean artifact.
```

---

## Product loop

The core Attune loop should remain stable even as tool targets expand:

```text
Discover
→ Workbench
→ Findings
→ Lineage
→ Exports
```

### 1. Discover

Attune scans a repository and materializes candidate pattern dossiers.

The page is editorial, not a raw result table. It answers:

```text
What patterns might be real in this codebase?
Which ones are clear enough to inspect?
Which ones need better examples?
Which ones are probably too broad?
```

Agent-generated content is welcome here, but the layout should remain fixed and deterministic.

The agent can generate:

- title
- icon token
- one-line intent
- why it noticed the pattern
- example references
- possible tool target
- known risk
- suggested next action

FoldKit owns:

- layout
- state
- navigation
- selection
- action hierarchy
- accessibility

### 2. Workbench

The Workbench is the candidate inspection surface.

It should show:

```text
Looks like
Does not look like
Deterministic rule / query / analyzer artifact
Revision prompt
Compact measurement
Open findings
Promote rule
```

The Workbench should not require users to hand-author ast-grep, ESLint, CodeQL, or Semgrep rules. Those artifacts are visible for inspection because they are the thing being promoted, but the default authoring interface should be intent-level revision.

The important interaction is:

```text
User clarifies intent
→ agent updates examples and encoding
→ deterministic tool re-measures
→ new candidate version appears
```

### 3. Findings

Findings are where the deterministic encoding touches real code.

The user labels what happened:

```text
true positive
false positive
ignore
use as example
```

Findings review teaches the system what the team means and creates evidence for revision.

### 4. Lineage

Lineage explains why the candidate exists and how it changed.

It should read like a provenance story, not an event log:

```text
Agent proposed pattern.
Examples were grounded.
Candidate A measured too broad.
False positives were labeled.
Candidate B narrowed the rule.
Precision improved.
The candidate was promoted.
```

Lineage is private Attune memory by default.

### 5. Exports

Exports distinguish clean repository artifacts from private Attune history.

The repository receives:

```text
native rule/query/analyzer artifact
positive fixtures
negative fixtures
short docs or policy note
CI integration if appropriate
```

The repository does not receive:

```text
agent attempts
raw prompts
raw provider responses
rejected candidates
intermediate measurements
false-positive labels
private reviewer notes
```

The Git bot should open a draft PR, not silently mutate the repo.

---

## Tool targets as compiler backends

Attune should eventually abstract over multiple deterministic tools, but it should not start by building a generic abstraction for its own sake.

A good mental model:

```text
Pattern candidate
  → Encoding target
  → Measurement runner
  → Findings normalizer
  → Export packet
```

Possible encoding targets:

```ts
type EncodingTarget =
  | 'ast-grep'
  | 'eslint'
  | 'semgrep'
  | 'codeql'
  | 'typescript-analyzer'
  | 'repo-query'
  | 'test-fixture'
  | 'docs-only'
```

The product should eventually recommend targets based on the pattern:

```text
This pattern is structural.
Use ast-grep.

This pattern is about imports and module boundaries.
Use ESLint or a TypeScript-aware analyzer.

This pattern needs taint/dataflow reasoning.
Use CodeQL or Semgrep.

This pattern is mostly explanatory.
Use docs and examples only.
```

The user should not have to understand the tool landscape before getting value.

Attune should make the target visible, but not make target selection the first thing the user has to do.

---

## Why ast-grep first

ast-grep is the right first target because it is:

- local
- fast
- structural
- easy to run in fixture mode
- easy to inspect
- good for TypeScript/TSX examples
- close enough to many codebase convention and architecture-boundary patterns

But the product should avoid becoming ast-grep SaaS.

The internal noun should not be `AstGrepRule` as the central concept.

The central nouns should be:

```text
Pattern
Candidate
Example
Encoding
Measurement
Finding
Decision
Export
```

ast-grep is one encoding and measurement target.

---

## What Attune is not

Attune is not:

```text
an AI code reviewer
an ast-grep GUI
an ESLint rule marketplace
a CodeQL dashboard
a style guide generator
a generic scan-results dashboard
an agent observability tool
a compliance console
```

Attune is:

```text
an agent-assisted workbench for adopting serious static analysis from real team practice.
```

It makes the path from judgment to deterministic enforcement visible, measured, and human-controlled.

---

## Product promise

A team should be able to say:

```text
We keep saying this in review.
Attune found examples.
It proposed a deterministic encoding.
We measured it against the repo.
We labeled where it was wrong.
The candidate improved.
We promoted it.
The Git bot opened a PR with clean artifacts.
Now the repo can help enforce what we already believe.
```

That is the product.

---

## Strong initial wedge

The first buyer/user should not be asked to buy the whole philosophy.

The sharp wedge is:

> You keep writing the same review comments. Attune turns the ones that survive measurement into native repo rules.

This is concrete, useful, and demoable.

The demo should show:

```text
1. A real repo.
2. A set of candidate patterns.
3. One selected pattern opened in the Workbench.
4. Positive and negative examples.
5. A generated ast-grep rule.
6. A measurement run.
7. A false positive.
8. A revision prompt.
9. A better candidate.
10. Promotion.
11. A Git bot PR with clean rule + fixtures + docs.
```

If this demo feels good, the product is real.

---

## SearchBench lineage

This direction is downstream of the code-analysis and agent-evaluation work from SearchBench.

SearchBench made several instincts concrete:

```text
measure before trusting
compare before claiming improvement
keep artifacts reviewable
separate agent behavior from deterministic evidence
make cost and evidence visible
export durable artifacts instead of vibes
```

Attune applies those instincts to codebase policy itself.

Instead of evaluating code-search policies for agents, Attune helps teams create and measure deterministic policies for their repositories.

The same philosophical move remains:

```text
Do not trust the model as the policy.
Use the model to propose policy.
Use deterministic systems to measure it.
Use humans to promote it.
```

---

## Product architecture implication

Attune should have a stable product model that can survive multiple analysis engines.

Suggested conceptual model:

```ts
type Pattern = {
  id: PatternId
  title: string
  intent: string
  status: PatternStatus
  dossier: PatternDossier
  candidates: ReadonlyArray<Candidate>
}

type Candidate = {
  id: CandidateId
  patternId: PatternId
  version: string
  examples: ExamplePair
  encoding: Encoding
  measurement: MeasurementSummary
  findings: ReadonlyArray<Finding>
  knownLimits: ReadonlyArray<string>
  decision: CandidateDecision
}

type Encoding = {
  target: EncodingTarget
  language: string
  content: string
  explanation: string
}

type MeasurementSummary = {
  target: EncodingTarget
  status: 'not_run' | 'passed' | 'failed' | 'parse_error'
  matchCount: number
  reviewedCount: number
  falsePositiveCount: number
  ignoredCount: number
  durationMs: number
}

type ExportPacket = {
  target: EncodingTarget
  files: ReadonlyArray<ExportFile>
  gitBotPlan: GitBotPlan
  privateLineageExcluded: boolean
}
```

This keeps the product stable while allowing tool-specific modules:

```text
astgrep/
eslint/
codeql/
semgrep/
typescriptAnalyzer/
export/
```

---

## Implementation guidance

Do not abstract over every tool immediately.

Recommended order:

```text
1. Make the full UI shell real with fixture-backed data.
2. Prove ast-grep end to end.
3. Add revision prompt flow for examples + rule generation.
4. Export a Git bot PR with ast-grep rule + fixtures + docs.
5. Add a second target only when a real pattern demands it.
```

The first additional target should be chosen because ast-grep fails to express an important pattern.

Good candidates:

```text
ESLint / TypeScript analyzer:
  import boundaries, module ownership, React hook usage, framework conventions

CodeQL / Semgrep:
  dataflow, taint, security-sensitive API usage, unsafe boundary crossings
```

Avoid creating a generic plugin architecture until the product loop is proven.

---

## Risks

### Risk: generated patterns are obvious or low-signal

Mitigation:

- use real repos
- show why the pattern was noticed
- include supporting examples
- show known risks
- make defer/reject cheap
- measure against real code

### Risk: deterministic encodings overclaim taste

Mitigation:

- call them approximations
- show examples first
- preserve known limits
- make false positives central to revision
- require human promotion

### Risk: users do not understand static-analysis targets

Mitigation:

- choose a recommended target automatically
- expose the target as metadata
- explain the deterministic shape in plain language
- avoid making users hand-author rule syntax by default

### Risk: Attune becomes a dashboard

Mitigation:

- keep the page flow decision-oriented
- end in a Git artifact
- avoid generic metrics
- keep human actions few and meaningful

### Risk: Attune becomes an AI reviewer

Mitigation:

- do not comment on every diff by default
- focus on promoted repo-native rules
- make the agent preparatory, not authoritative

---

## The enduring product principle

The agent may materialize the dossier.

FoldKit owns the stage.

Deterministic tools produce evidence.

Humans make the decision.

The repo receives the clean artifact.

That is Attune.
