# Attune Three-Tool Tiering Note

## Thesis

Attune should scope its first serious product architecture around **three analysis targets**:

```text
ast-grep  -> structural matching
ESLint    -> programmable repo policy
CodeQL    -> semantic/path analysis
```

This is the right scope because it gives Attune a clean, teachable escalation model without becoming a generic wrapper around every static-analysis tool.

The product is not “AI generates lint rules.”

The product is:

> Attune is the adoption layer for serious static analysis.

The underlying tools are already powerful. Attune does not need to make ast-grep, ESLint, or CodeQL rigorous. They already are. Attune’s job is to make their power approachable, reviewable, measurable, and adoptable by normal engineering teams.

```text
Human judgment
-> examples
-> generated encoding
-> deterministic measurement
-> human review
-> clean repo artifact
```

That loop is the product. The tool target changes. The product grammar stays stable.

---

## Why these three tools

The three tools cover three distinct levels of codebase policy:

```text
syntax shape
project policy
semantic relationship
```

That maps directly onto the kinds of team judgment Attune wants to help encode.

| Tier | Tool     | Primary question                                      | Best for                                                                                       |
| ---- | -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1    | ast-grep | Does this syntactic shape appear?                     | Structural patterns, syntax smells, local code shape, fast probes                              |
| 2    | ESLint   | Is this project-local usage allowed here?             | JS/TS/TSX policy, import boundaries, allowlists, custom exceptions, style firewalls            |
| 3    | CodeQL   | Can this semantic relationship happen in the program? | Dataflow, taint, source-to-sink paths, guards, reachability, security and architecture queries |

The short version:

```text
ast-grep: syntax
ESLint: policy
CodeQL: semantics
```

This is memorable enough to become product language.

---

## The shared Attune loop

Every target should go through the same lifecycle.

```text
Discover
  Attune notices candidate patterns and generates dossiers.

Workbench
  A human inspects good examples, bad examples, and the deterministic encoding.

Findings
  The tool runs and produces normalized evidence.

Lineage
  Attune shows how the pattern, examples, encoding, and measurement changed over time.

Exports
  Attune prepares clean repo-native artifacts and opens or prepares a Git bot PR.
```

This matters because Attune should not expose three unrelated products. It should expose one product loop with three analysis targets.

The user should not begin by choosing a tool. The user should begin with a pattern.

```text
“This codebase seems to prefer X.”
“This is what good looks like.”
“This is what bad looks like.”
“This exception is intentional.”
```

Then Attune recommends the right encoding target.

---

## Tier 1: ast-grep as the structural shadow

### Role

ast-grep is the first and fastest measuring instrument.

It should be used when the pattern is mostly visible in local syntax.

```text
Does this JSX prop appear?
Does this call expression appear inside this shape?
Does this import pattern exist?
Does this object property exist?
Does this literal shape appear?
```

### Attune framing

```text
Power: structural matching
Pain: writing precise AST patterns
Attune: examples -> structural rule -> measured matches
```

### Good Attune examples

```text
Avoid raw className strings.
Avoid inline style attributes in app components.
Use named exports from feature modules.
Do not call useEffect with an empty body.
Do not import from sibling feature internals.
Do not use raw hex colors in TSX.
```

### Workbench shape

For ast-grep, the Workbench’s third pane is simple:

```text
Looks like
Does not look like
ast-grep YAML
```

### Finding shape

ast-grep findings are usually match-oriented:

```ts
type AstGrepFinding = {
  target: 'ast-grep'
  file: string
  startLine: number
  endLine: number
  excerpt: string
  message: string
  severity: 'info' | 'warning' | 'error'
}
```

### Export shape

A promoted ast-grep policy exports:

```text
sgconfig.yml or equivalent config
rules/<rule-id>.yml
fixtures/<rule-id>/valid.tsx
fixtures/<rule-id>/invalid.tsx
short documentation note
```

### Product risk

ast-grep can be deceptively powerful, but the product should not overclaim it. It is best for structural shadows. If the rule needs lots of path exceptions, framework awareness, scope logic, or procedural checks, Attune should escalate.

---

## Tier 2: ESLint as programmable repo policy

### Role

ESLint is the natural target when the pattern is still in JS/TS/TSX code, but the policy needs procedural judgment.

It is especially good when the rule needs:

```text
filename allowlists
path-based exceptions
JSX attribute parsing
property-key extraction
scope or ancestor checks
custom options
multiple sub-rules
repo-native lint integration
fixers or suggestions
project-specific exceptions
```

### Attune framing

```text
Power: programmable repo policy
Pain: custom rule authoring and exception modeling
Attune: intent + examples + allowlists -> rule cluster -> lint findings
```

### Good Attune examples

```text
Styling belongs in UI primitives and recipes.
Effects stay at the boundary.
Environment reads must go through config modules.
Feature modules should not import sibling feature internals.
Client components must not import server-only modules.
Domain services should not depend on UI components.
Panda/token styling should be used instead of raw values.
```

### Why this tier matters

The SAT style firewall is the canonical example of this tier.

The taste is singular:

```text
Styling belongs in UI primitives, theme recipes, and tokens.
```

But the deterministic encoding is plural:

```text
no raw colors
no raw box shadows
no raw border radius
no styling props outside UI/theme paths
no surface props outside recipes
inline style only allows geometry
motion components may use geometry for animation
style token definitions are allowed to define tokens
raw className strings are discouraged or blocked
```

That is not one rule. It is a **rule cluster**.

Attune should treat this as a first-class artifact:

```ts
type EslintEncoding = {
  target: 'eslint'
  kind: 'rule-cluster'
  rules: ReadonlyArray<{
    id: string
    purpose: string
    severity: 'error' | 'warn'
    knownExceptions: ReadonlyArray<string>
  }>
  files: ReadonlyArray<ExportFile>
}
```

### Workbench shape

For ESLint, the Workbench’s third pane becomes a cluster overview:

```text
Looks like
Does not look like
ESLint rule cluster
```

The deterministic pane should include:

```text
cluster title
sub-rule list
selected sub-rule code preview
allowlist / exception summary
severity summary
export file list
```

### Findings shape

ESLint findings should be grouped by sub-rule:

```text
no-raw-colors                  12 findings
no-surface-props-outside-ui     7 findings
no-inline-style-except-geometry 5 findings
prefer-panda-css               10 findings
```

Normalized finding:

```ts
type EslintFinding = {
  target: 'eslint'
  subRuleId: string
  file: string
  startLine: number
  endLine: number
  excerpt: string
  message: string
  severity: 'warning' | 'error'
}
```

### Export shape

A promoted ESLint policy exports:

```text
eslint/<policy-id>.mjs
eslint.config.mjs patch or config snippet
tests/<policy-id>.test.ts
fixtures/<policy-id>/valid.tsx
fixtures/<policy-id>/invalid.tsx
short policy documentation
```

### Product risk

ESLint is powerful enough that Attune could accidentally become a custom-linter IDE. Avoid that. The user should still operate at the level of intent, examples, exceptions, findings, and promotion. Direct code editing should be an advanced escape hatch, not the default path.

---

## Tier 3: CodeQL as semantic/path analysis

### Role

CodeQL is the sleeper hit. It is the target when the practice is not just a local code shape or project-specific lint rule, but a semantic relationship across the program.

CodeQL should be recommended when the pattern involves:

```text
source-to-sink flow
taint tracking
sanitizers or guards
cross-function relationships
call chains
reachability
privileged operations
framework lifecycle paths
security-sensitive APIs
architecture properties that require transitive reasoning
```

### Attune framing

```text
Power: semantic/path analysis
Pain: query language, library modeling, dataflow APIs, packs, and path query authoring
Attune: source/sink/guard story -> CodeQL query -> semantic path findings
```

### Good Attune examples

```text
User-controlled request data must not reach shell execution.
Tenant-scoped database calls must include a tenant predicate.
Privileged mutations must pass through authorization.
Server secrets must not flow into client-visible modules.
Untrusted HTML must pass through an approved sanitizer before rendering.
Generated code must not bypass domain services on the way to persistence.
Route handlers must not write to storage without an audit event.
```

### Why this tier matters

CodeQL’s unique product value is the **path story**.

A CodeQL finding is not just:

```text
This line matched.
```

It can be:

```text
request.body.email
-> normalizeUserInput()
-> buildQueryFilter()
-> db.user.findMany()
-> missing tenant predicate
```

That is perfect for Attune’s editorial review UI. CodeQL turns a semantic rule into a narrative that a human can inspect.

### Workbench shape

For CodeQL, the Workbench’s three panes should become:

```text
Looks like: safe semantic path
Does not look like: unsafe semantic path
CodeQL query: source/sink/guard model
```

The deterministic pane should not only show raw QL. It should also summarize:

```text
sources
sinks
allowed sanitizers / guards
required dominance or path condition
query purpose
expected result kind
```

### Findings shape

CodeQL findings need the same normalized finding shape as other tools, plus `path`.

```ts
type CodeQlFinding = {
  target: 'codeql'
  file: string
  startLine: number
  endLine: number
  excerpt: string
  message: string
  severity: 'warning' | 'error'
  path: ReadonlyArray<{
    kind: 'source' | 'step' | 'guard' | 'sink'
    file: string
    line: number
    label: string
    excerpt?: string
  }>
}
```

The Findings page should render CodeQL findings as readable flow stories.

```text
Source
  request.body.email
Step
  passed into normalizeUserInput
Step
  assigned into query filter
Sink
  db.user.findMany without tenant predicate
```

### Export shape

A promoted CodeQL policy exports:

```text
codeql-pack.yml
queries/<policy-id>.ql
qlpack dependencies or library files
query suites if needed
fixtures / expected results when practical
GitHub code scanning workflow snippet when appropriate
short policy documentation
```

### Product risk

CodeQL is powerful, but it is expensive in complexity. It should not be the first implementation target. It should be designed into the domain from the beginning, then added when Attune has already proven the loop with ast-grep and ESLint.

The important thing is to reserve space for CodeQL concepts now:

```text
source
sink
guard
sanitizer
path steps
query pack
semantic finding
```

---

## Tool recommendation logic

Attune should recommend a target based on what the pattern requires.

```text
Use ast-grep when:
- the pattern is visible in local syntax
- examples are enough to define the shape
- the rule does not need much procedural exception logic
- the measurement needs to be fast and cheap

Use ESLint when:
- the pattern is JS/TS/TSX-specific
- the rule needs path allowlists or project-specific exceptions
- the rule needs AST visitors, scope, JSX handling, or custom options
- the repo already expects lint results in CI
- the pattern naturally becomes a rule cluster

Use CodeQL when:
- the pattern is about flow, reachability, guards, or source/sink relationships
- the evidence is cross-file or cross-function
- a finding needs a path explanation
- the policy is security-sensitive or architecture-sensitive
- the rule needs semantic modeling rather than local syntax
```

The product should not ask the user to choose first. The Discover dossier should include:

```text
Recommended target: ESLint rule cluster
Reason: needs project-specific path exceptions and JSX attribute logic
```

or:

```text
Recommended target: CodeQL semantic query
Reason: requires source-to-sink tracking across function boundaries
```

---

## Product ontology

The domain should not be centered on a single tool.

Avoid:

```text
AstGrepRule
LintRule
CodeQlQuery
```

Prefer:

```text
Pattern
Candidate
Encoding
Measurement
Finding
Decision
Export
```

Recommended core types:

```ts
type AnalysisTarget = 'ast-grep' | 'eslint' | 'codeql'

type PatternPolicy = {
  id: PatternId
  title: string
  intent: string
  examples: {
    looksLike: CodeExample
    doesNotLookLike: CodeExample
  }
  encodings: ReadonlyArray<PolicyEncoding>
  measurements: ReadonlyArray<PolicyMeasurement>
  decision: 'draft' | 'deferred' | 'promoted' | 'rejected'
}

type PolicyEncoding =
  | {
      id: EncodingId
      target: 'ast-grep'
      kind: 'structural-rule'
      yaml: string
    }
  | {
      id: EncodingId
      target: 'eslint'
      kind: 'rule-cluster'
      files: ReadonlyArray<ExportFile>
      rules: ReadonlyArray<{
        id: string
        purpose: string
        severity: 'error' | 'warn'
      }>
    }
  | {
      id: EncodingId
      target: 'codeql'
      kind: 'semantic-query'
      files: ReadonlyArray<ExportFile>
      sources: ReadonlyArray<string>
      sinks: ReadonlyArray<string>
      guards: ReadonlyArray<string>
    }

type NormalizedFinding = {
  id: FindingId
  patternId: PatternId
  encodingId: EncodingId
  target: AnalysisTarget
  subRuleId?: string
  file: string
  startLine: number
  endLine: number
  excerpt: string
  message: string
  severity: 'info' | 'warning' | 'error'
  path?: ReadonlyArray<FindingPathStep>
}
```

The normalized finding layer is the heart of composing tools.

The UI should not care whether a finding came from ast-grep, ESLint, or CodeQL. It should care:

```text
What pattern does this support?
Which encoding produced it?
What code did it touch?
Is the finding accepted, false positive, ignored, or useful for revision?
```

---

## UI implications

### Discover

Discover should show the recommended target for each pattern.

```text
Styling belongs in UI primitives and recipes
Recommended target: ESLint rule cluster
Reason: needs path allowlists and project-specific exceptions
```

```text
Tenant-scoped data access must include tenant predicate
Recommended target: CodeQL semantic query
Reason: requires source-to-sink and query-builder path tracking
```

```text
Avoid raw className strings
Recommended target: ast-grep structural rule
Reason: visible local TSX syntax shape
```

### Workbench

Workbench keeps the same layout regardless of target:

```text
Looks like
Does not look like
Deterministic encoding
```

The third pane changes by target:

```text
ast-grep YAML
ESLint rule cluster
CodeQL query + source/sink/guard model
```

### Findings

Findings should normalize across targets but reveal target-specific evidence.

```text
ast-grep: code match
ESLint: sub-rule finding
CodeQL: path finding
```

### Lineage

Lineage should show target escalation when it happens.

```text
Candidate A: ast-grep structural probe
Candidate B: ESLint rule cluster after exceptions were discovered
Candidate C: CodeQL query after cross-function flow was needed
```

### Exports

Exports should prepare one clean artifact packet, even if multiple tools are involved.

```text
attune-policy-style-firewall/
  eslint/style-firewall.mjs
  eslint.config.patch
  fixtures/valid.tsx
  fixtures/invalid.tsx
  README.md
```

or:

```text
attune-policy-tenant-flow/
  codeql-pack.yml
  queries/tenant-scope.ql
  suites/attune.qls
  README.md
```

---

## Implementation order

Do not build all three at once.

Recommended order:

```text
1. Normalize the domain around PatternPolicy, Encoding, Measurement, Finding, Decision, Export.
2. Implement ast-grep first for the fast structural loop.
3. Implement ESLint second using the SAT style firewall as the advanced golden fixture.
4. Add CodeQL third when the UI and finding model can support path stories.
```

The important thing is that the domain should be target-agnostic from the start.

Even if the first runner is ast-grep, the product model should already understand:

```text
single rule
rule cluster
semantic query
finding path
sub-rule id
export packet
```

---

## What not to support yet

Do not add every analysis tool.

Avoid for now:

```text
Semgrep
Biome plugins
custom TypeScript compiler plugins
Sonar rules
PMD
Checkstyle
Clang tooling
language-specific one-offs
```

Those may be useful later, but they blur the first product story.

The three-tool scope is enough:

```text
ast-grep  = syntax
ESLint    = policy
CodeQL    = semantics
```

That is a complete product frame.

---

## Strategic positioning

The sharper product line:

> Attune turns repeated review guidance into measured static-analysis artifacts.

The more ambitious line:

> Attune helps teams compile codebase taste into deterministic engineering practice.

The adoption-layer line:

> Attune makes serious static analysis approachable, reviewable, and adoptable.

The three-tool scope makes the product more credible because it does not overclaim magic. It says:

```text
We use the right deterministic tool for the shape of the practice.
```

That is the heart of Attune.

---

## Final scope statement

Attune should focus on exactly three analysis targets for the foreseeable product spike:

```text
ast-grep for structural shadows.
ESLint for programmable repo policy.
CodeQL for semantic path stories.
```

Everything else should be deferred until this loop is proven.

This scope is wide enough to show that Attune is not ast-grep SaaS, but narrow enough to build a coherent product.
