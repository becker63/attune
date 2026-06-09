# Attune

Attune helps teams turn code review taste into native static-analysis rules.

Every team has practices that live mostly in people’s heads: recurring patterns, architectural boundaries, habits reviewers keep repeating by hand, and little bits of taste that make a codebase feel like itself.

Attune turns those practices into reviewable, measured, repo-native rules.

It starts with a pattern. Attune helps shape that pattern with an agent, tests it against generated examples, measures it against the repository, produces an evidence document, and exports an ast-grep, ESLint, or Oxlint-backed rule before anything ships.

The surface is intentionally light:

```text
discover a pattern
shape it with the agent
review the evidence
export the rule
```

Underneath, Attune is adversarial.

Rules are not trusted because an agent wrote them. Agent outputs, events, view plans, evidence bundles, review documents, and exports all pass through typed schemas before they become product state. Candidate rules are attacked with generated examples before they are measured on a real repository. Review documents are allowed to be beautiful, but they are not allowed to overstate the evidence.

Attune’s frontend is allowed to be beautiful.

It is not allowed to lie.

## Why Attune exists

Static analysis tools are powerful, but adoption is usually the hard part.

Teams do not just need a rule. They need to agree that the rule represents a real practice, understand what it catches, see where it might be wrong, and decide whether it is worth committing to the repo.

Attune is designed around that review loop.

It does not treat rule generation as a magic one-shot model call. It treats rule generation as a small product workflow:

```text
practice
→ candidate rule
→ generated examples
→ counterexamples
→ revision
→ repo measurement
→ evidence document
→ export
```

The goal is not to replace code review with AI.

The goal is to take the parts of code review that are already repeated, pattern-shaped, and team-specific, then turn them into native rules with evidence attached.

## The product loop

Attune is organized around four surfaces.

### Discover

Find recurring practices that might be worth encoding.

A practice might be a deprecated API, a framework-specific boundary, a design system convention, a security-sensitive pattern, a data-loading habit, or a repeated reviewer comment.

Discover is not a dashboard. It is a shelf of possible practices.

### Workbench

Shape a candidate rule with the agent.

The workbench is artifact-first: intent, examples, counterexamples, rule source, synthetic checks, and repo findings. The chat is not the product. The chat is a control surface for revising the artifact.

### Review documents

Read the evidence before anything ships.

Findings, evidence, lineage, review decisions, and export packets are document kinds, not separate dashboards. They render as calm MDX review documents backed by typed resources.

### Settings

Define the boundaries.

Settings controls what Attune can inspect, which tools it can run, what it can export, which providers it can use, and how much it is allowed to spend.

## The hidden control plane

Attune borrows Kubernetes-style semantics without requiring Kubernetes.

Every durable product object is shaped like a resource:

```text
apiVersion
kind
metadata
spec
status
conditions
refs
generation
observedGeneration
```

`spec` is the desired intent.

`status` is what Attune observed.

`conditions` are the human-readable readiness, warning, and failure state.

`refs` preserve lineage.

`generation` and `observedGeneration` let the system know when measurements are stale.

The important resources include:

```text
PolicyWorkspace
DiscoveryRun
MotifFamily
RuleCandidate
RuleCheckRun
Counterexample
AgentRun
FindingSet
EvidenceBundle
ReviewDocument
ReviewDecision
RuleExport
```

This gives Attune a control-plane spine while keeping the product surface light.

## Effect Schema as the product ABI

Every durable object in Attune is an Effect Schema resource.

A schema is not just a validator. It is the shared contract between agents, event handlers, projections, migrations, view plans, review documents, property tests, and exports.

```ts
import { Schema } from "effect";

export const ResourceRef = <Kind extends string>(kind: Kind) =>
  Schema.Struct({
    kind: Schema.Literal(kind),
    name: Schema.String,
    uid: Schema.optional(Schema.String),
  });

export const Condition = Schema.Struct({
  type: Schema.String,
  status: Schema.Literal("True", "False", "Unknown"),
  severity: Schema.Literal("info", "warning", "error"),
  reason: Schema.String,
  message: Schema.String,
});

export const Metadata = Schema.Struct({
  name: Schema.String,
  uid: Schema.String,
  generation: Schema.Number,
  labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  annotations: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

export const AttuneResource = <Kind extends string, Spec, Status>(
  kind: Kind,
  spec: Schema.Schema<Spec>,
  status: Schema.Schema<Status>,
) =>
  Schema.Struct({
    apiVersion: Schema.Literal("attune.dev/v1alpha1"),
    kind: Schema.Literal(kind),
    metadata: Metadata,
    spec,
    status: Schema.extend(
      status,
      Schema.Struct({
        observedGeneration: Schema.Number,
        phase: Schema.String,
        conditions: Schema.Array(Condition),
      }),
    ),
  });
```

A rule candidate is just one resource in that language:

```ts
export const RuleCandidateSpec = Schema.Struct({
  workspaceRef: ResourceRef("PolicyWorkspace"),
  title: Schema.String,
  intent: Schema.String,
  target: Schema.Literal("ast-grep", "eslint", "oxlint"),
  ruleSource: Schema.String,
  examples: Schema.Struct({
    shouldMatch: Schema.Array(Schema.String),
    shouldNotMatch: Schema.Array(Schema.String),
  }),
});

export const RuleCandidateStatus = Schema.Struct({
  findingSetRef: Schema.optional(ResourceRef("FindingSet")),
  evidenceBundleRef: Schema.optional(ResourceRef("EvidenceBundle")),
  reviewDocumentRef: Schema.optional(ResourceRef("ReviewDocument")),
  measurements: Schema.optional(
    Schema.Struct({
      totalFindings: Schema.Number,
      sampledFindings: Schema.Number,
      syntheticCases: Schema.Number,
      syntheticFailures: Schema.Number,
      falsePositiveRisk: Schema.Literal("low", "medium", "high"),
    }),
  ),
});

export const RuleCandidate = AttuneResource(
  "RuleCandidate",
  RuleCandidateSpec,
  RuleCandidateStatus,
);
```

The agent can propose, revise, and explain.

It cannot bypass the schema boundary.

## The motif lab

Attune does not ask an agent to write a rule and hope.

A rule candidate enters a small adversarial lab before it is measured against a real repository. The lab generates synthetic positive and negative examples for the motif, admits only parseable TypeScript/TSX through OXC, runs the candidate rule with ast-grep, ESLint, or Oxlint, clusters failures into counterexample classes, and feeds only the useful failures back to the agent.

Every object in this loop is schema-shaped. Motif families, synthetic cases, rule candidates, check results, counterexamples, and review documents are Effect Schema resources.

```ts
export async function runMotifLab(input: {
  motif: MotifFamily;
  candidate: RuleCandidate;
}) {
  // 1. Generate synthetic cases
  const cases = fc.sample(fetchInRenderCases, 300);

  // 2. Parse/admit with OXC
  const admitted = cases
    .map(admitSyntheticCase)
    .filter((x) => x.ok)
    .map((x) => x.case);

  // 3. Normalize/format with oxfmt
  const normalized = admitted;

  // 4. Run candidate rule
  const results = await checkRuleCandidate(
    input.candidate.ruleSource,
    normalized,
  );

  // 5. Extract failures
  const failures = results.filter(
    (r) => r.actualMatch !== r.expectedMatch,
  );

  // 6. Cluster into counterexample classes
  const counterexamples = clusterFailures(failures, normalized);

  // 7. Return only the useful failures to the agent
  return {
    totalCases: normalized.length,
    passed: normalized.length - failures.length,
    failed: failures.length,
    counterexamples: counterexamples.slice(0, 5),
  };
}
```

This is structured fuzzing for code review policy.

Raw bytes are too weak an input language for kernel-adjacent systems; schemas give fuzzers something meaningful to mutate. In Attune, arbitrary snippets are too weak an input language for code-review policy; motif families give agents and property tests something meaningful to explore.

```text
agent proposes
Effect Schema decodes
FastCheck generates structured variants
OXC admits valid code
ast-grep / ESLint / Oxlint checks the candidate
counterexamples shrink
agent revises
real repo measurement happens only after the rule survives the lab
```

The goal is not to prove a rule universally correct.

The goal is to cheaply discover where the rule is wrong before a human reviewer or expensive model call has to care.

## Property tests as product machinery

Attune uses property testing in two places.

The first layer protects the architecture. It checks that resources, events, projections, review documents, and exports preserve truth across strange histories.

The second layer improves the product output. It attacks generated ast-grep, ESLint, and Oxlint rules with synthetic code families before the rule is measured against a real repository.

Both layers use the same core idea:

```text
Effect Schema defines the language.
FastCheck explores the language.
Effect interprets the result.
Attune records what happened.
```

The important rule is that tests do not invent a fake domain model.

They generate the same resources the product uses.

```ts
import * as fc from "fast-check";

export const conditionArb = fc.record({
  type: fc.string({ minLength: 1 }),
  status: fc.constantFrom("True", "False", "Unknown"),
  severity: fc.constantFrom("info", "warning", "error"),
  reason: fc.string({ minLength: 1 }),
  message: fc.string({ minLength: 1 }),
});

export const metadataArb = fc.record({
  name: fc.stringMatching(/[a-z][a-z0-9-]{2,32}/),
  uid: fc.uuid(),
  generation: fc.integer({ min: 1, max: 20 }),
  labels: fc.dictionary(fc.string(), fc.string()),
  annotations: fc.dictionary(fc.string(), fc.string()),
});
```

In implementation, Attune can derive most arbitraries from Effect Schema and override the fields that need domain-specific structure.

```ts
export const ruleCandidateArb = fc
  .record({
    metadata: metadataArb,
    target: fc.constantFrom("ast-grep", "eslint", "oxlint"),
    intent: fc.constantFrom(
      "avoid fetch calls inside React render paths",
      "prefer project logger over console",
      "avoid raw SQL inside route handlers",
      "use design system buttons instead of native buttons",
    ),
    ruleSource: fc.string({ minLength: 1 }),
    observedGenerationOffset: fc.integer({ min: 0, max: 3 }),
    syntheticCases: fc.integer({ min: 0, max: 500 }),
    syntheticFailures: fc.integer({ min: 0, max: 200 }),
    falsePositiveRisk: fc.constantFrom("low", "medium", "high"),
    conditions: fc.array(conditionArb, { maxLength: 5 }),
  })
  .map((x) => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "RuleCandidate",
    metadata: x.metadata,
    spec: {
      workspaceRef: { kind: "PolicyWorkspace", name: "default" },
      title: x.intent,
      intent: x.intent,
      target: x.target,
      ruleSource: x.ruleSource,
      examples: {
        shouldMatch: [],
        shouldNotMatch: [],
      },
    },
    status: {
      observedGeneration: Math.max(
        0,
        x.metadata.generation - x.observedGenerationOffset,
      ),
      phase: x.syntheticCases > 0 ? "Measured" : "Draft",
      conditions: x.conditions,
      measurements:
        x.syntheticCases > 0
          ? {
              totalFindings: 0,
              sampledFindings: 0,
              syntheticCases: x.syntheticCases,
              syntheticFailures: Math.min(
                x.syntheticFailures,
                x.syntheticCases,
              ),
              falsePositiveRisk: x.falsePositiveRisk,
            }
          : undefined,
    },
  }));
```

Now architectural laws become executable properties:

```ts
fc.assert(
  fc.property(ruleCandidateArb, (candidate) => {
    // Status cannot observe a future generation.
    expect(candidate.status.observedGeneration).toBeLessThanOrEqual(
      candidate.metadata.generation,
    );
  }),
);

fc.assert(
  fc.property(ruleCandidateArb, (candidate) => {
    const view = projectRuleCandidateView(candidate);

    if (candidate.status.observedGeneration < candidate.metadata.generation) {
      expect(view.actions).not.toContain("promote");
      expect(view.conditions).toContainEqual(
        expect.objectContaining({
          severity: "warning",
          reason: "StaleMeasurement",
        }),
      );
    }
  }),
);

fc.assert(
  fc.property(ruleCandidateArb, (candidate) => {
    const doc = materializeReviewDocument(candidate);

    if (candidate.status.measurements?.falsePositiveRisk === "high") {
      expect(doc.summary).not.toMatch(/ready to ship|safe to promote/i);
      expect(doc.conditions.some((c) => c.severity === "warning")).toBe(true);
    }
  }),
);
```

The frontend can be beautiful.

The property tests make sure it cannot lie.

## Event-stream properties

Attune is event-sourced, so the strongest tests generate histories, not just resources.

```ts
export const AttuneEvent = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("discovery.requested"),
    workspaceRef: ResourceRef("PolicyWorkspace"),
  }),
  Schema.Struct({
    type: Schema.Literal("rule_candidate.created"),
    candidate: RuleCandidate,
  }),
  Schema.Struct({
    type: Schema.Literal("rule_candidate.revised"),
    candidateRef: ResourceRef("RuleCandidate"),
    baseGeneration: Schema.Number,
    nextGeneration: Schema.Number,
    patch: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("rule_check.completed"),
    candidateRef: ResourceRef("RuleCandidate"),
    syntheticCases: Schema.Number,
    syntheticFailures: Schema.Number,
    counterexampleRefs: Schema.Array(ResourceRef("Counterexample")),
  }),
  Schema.Struct({
    type: Schema.Literal("review_document.materialized"),
    candidateRef: ResourceRef("RuleCandidate"),
    documentRef: ResourceRef("ReviewDocument"),
  }),
  Schema.Struct({
    type: Schema.Literal("rule_export.created"),
    candidateRef: ResourceRef("RuleCandidate"),
    exportRef: ResourceRef("RuleExport"),
  }),
);
```

From generated histories, Attune checks control-plane invariants:

```ts
fc.assert(
  fc.property(eventHistoryArb, (events) => {
    const projectionA = projectWorkspace(events);
    const projectionB = projectWorkspace(events);

    expect(projectionA).toEqual(projectionB);
  }),
);

fc.assert(
  fc.property(eventHistoryArb, (events) => {
    const projection = projectWorkspace(events);

    for (const exported of projection.ruleExports) {
      const decision = projection.reviewDecisions.find(
        (d) => d.spec.candidateRef.name === exported.spec.candidateRef.name,
      );

      expect(decision?.status.phase).toBe("Accepted");
    }
  }),
);

fc.assert(
  fc.property(eventHistoryArb, (events) => {
    const projection = projectWorkspace(events);

    for (const doc of projection.reviewDocuments) {
      for (const claim of doc.spec.claims) {
        expect(claim.sourceRefs.length).toBeGreaterThan(0);
        expect(allRefsResolve(claim.sourceRefs, projection)).toBe(true);
      }
    }
  }),
);
```

The laws are simple:

```text
same event stream → same projection
no export without accepted review
no review claim without evidence refs
no finding without a source span
no successful candidate from failed agent output
no stale measurement can be promoted
```

## Motif-family properties

Architecture tests keep Attune honest.

Motif-family tests help Attune produce better rules.

A motif family describes the code-review pattern being encoded. It contains positive shapes, negative shapes, preserving transforms, and boundary transforms.

```ts
export const MotifFamily = AttuneResource(
  "MotifFamily",
  Schema.Struct({
    language: Schema.Literal("typescript", "tsx"),
    target: Schema.Literal("ast-grep", "eslint", "oxlint"),
    title: Schema.String,
    intent: Schema.String,

    positiveShapes: Schema.Array(Schema.String),
    negativeShapes: Schema.Array(Schema.String),

    preservingTransforms: Schema.Array(
      Schema.Literal(
        "rename-symbols",
        "change-whitespace",
        "add-unrelated-import",
        "wrap-jsx-fragment",
        "convert-function-to-arrow",
      ),
    ),

    boundaryTransforms: Schema.Array(
      Schema.Literal(
        "move-into-loader",
        "move-into-event-handler",
        "move-into-test-file",
        "move-into-server-utility",
        "replace-with-project-api",
      ),
    ),
  }),
  Schema.Struct({
    generatedCases: Schema.Number,
    admittedCases: Schema.Number,
    rejectedCases: Schema.Number,
  }),
);
```

For a motif like “avoid `fetch()` inside React render paths,” the generator creates both positives and near-miss negatives.

```ts
const componentName = fc.stringMatching(/[A-Z][A-Za-z0-9]{2,24}/);

const endpoint = fc.constantFrom(
  "/api/user",
  "/api/posts",
  "/api/settings",
);

export const positiveFunctionComponent = fc
  .record({ componentName, endpoint })
  .map(({ componentName, endpoint }) => ({
    label: "positive" as const,
    reason: "fetch() is called directly inside a React component body",
    filename: `src/components/${componentName}.tsx`,
    expectedMatch: true,
    code: `
      export function ${componentName}() {
        const data = fetch("${endpoint}");
        return <div>{String(data)}</div>;
      }
    `,
  }));

export const positiveArrowComponent = fc
  .record({ componentName, endpoint })
  .map(({ componentName, endpoint }) => ({
    label: "positive" as const,
    reason: "fetch() is called directly inside an arrow component body",
    filename: `src/components/${componentName}.tsx`,
    expectedMatch: true,
    code: `
      export const ${componentName} = () => {
        const data = fetch("${endpoint}");
        return <div>{String(data)}</div>;
      };
    `,
  }));

export const negativeLoader = fc.record({ endpoint }).map(({ endpoint }) => ({
  label: "negative" as const,
  reason: "fetch() inside a loader is allowed",
  filename: "src/routes/user.tsx",
  expectedMatch: false,
  code: `
    export async function loader() {
      return fetch("${endpoint}");
    }
  `,
}));

export const negativeEventHandler = fc
  .record({ componentName, endpoint })
  .map(({ componentName, endpoint }) => ({
    label: "negative" as const,
    reason: "fetch() inside an event handler is not render-time fetch",
    filename: `src/components/${componentName}.tsx`,
    expectedMatch: false,
    code: `
      export function ${componentName}() {
        async function onClick() {
          await fetch("${endpoint}");
        }

        return <button onClick={onClick}>Load</button>;
      }
    `,
  }));
```

The generator is composed like a DSL:

```ts
export const fetchInRenderCases = fc.oneof(
  positiveFunctionComponent,
  positiveArrowComponent,
  negativeLoader,
  negativeEventHandler,
  negativeTestFile,
  negativeServerUtility,
);

export const generatedCaseSuite = fc.array(fetchInRenderCases, {
  minLength: 100,
  maxLength: 500,
});
```

Every generated case is admitted through OXC before it participates in a check.

```ts
export function admitSyntheticCase(testCase: SyntheticCase) {
  const parsed = parseTsxWithOxc(testCase.filename, testCase.code);

  if (!parsed.ok) {
    return {
      ok: false as const,
      reason: "Generated code did not parse",
      errors: parsed.errors,
    };
  }

  return {
    ok: true as const,
    case: testCase,
    ast: parsed.program,
  };
}
```

Then Attune checks the candidate rule:

```ts
fc.assert(
  fc.asyncProperty(generatedCaseSuite, async (cases) => {
    const admitted = cases
      .map(admitSyntheticCase)
      .filter((x) => x.ok)
      .map((x) => x.case);

    const results = await checkRuleCandidate(candidateRule, admitted);

    for (const result of results) {
      expect(result.actualMatch).toBe(result.expectedMatch);
    }
  }),
);
```

When this fails, the failure is not noise.

It is product material.

```ts
export const Counterexample = AttuneResource(
  "Counterexample",
  Schema.Struct({
    candidateRef: ResourceRef("RuleCandidate"),
    motifRef: ResourceRef("MotifFamily"),
    class: Schema.String,
    expected: Schema.Literal("match", "no-match"),
    actual: Schema.Literal("match", "no-match"),
    reason: Schema.String,
    filename: Schema.String,
    code: Schema.String,
  }),
  Schema.Struct({
    usedForRevision: Schema.Boolean,
  }),
);
```

The agent does not receive hundreds of failures.

It receives a small set of clustered counterexample classes:

```json
{
  "totalCases": 300,
  "passed": 241,
  "failed": 59,
  "counterexamples": [
    {
      "class": "allowed-loader-boundary",
      "expected": "no-match",
      "actual": "match",
      "reason": "fetch() inside loader is allowed",
      "filename": "src/routes/user.tsx",
      "code": "export async function loader() { return fetch('/api/user') }"
    },
    {
      "class": "missed-arrow-component",
      "expected": "match",
      "actual": "no-match",
      "reason": "arrow function components are render paths too",
      "filename": "src/components/UserCard.tsx",
      "code": "export const UserCard = () => { const data = fetch('/api/user'); return <div /> }"
    }
  ]
}
```

That is compact revision material.

The agent is not asked to reason over the whole repository again. It is asked to repair a precise rule boundary.

## Metamorphic properties

Some of the strongest tests are metamorphic.

They do not just ask whether a generated example matches. They ask whether a meaning-preserving transformation preserves the rule result.

```ts
fc.assert(
  fc.asyncProperty(
    fetchInRenderCases,
    preservingTransformArb,
    async (testCase, tx) => {
      const transformed = applyTransform(tx, testCase);

      const before = await checkRuleCandidate(candidateRule, [testCase]);
      const after = await checkRuleCandidate(candidateRule, [transformed]);

      expect(after[0].actualMatch).toBe(before[0].actualMatch);
    },
  ),
);
```

Examples:

```text
rename symbols → same result
change whitespace → same result
add unrelated imports → same result
wrap JSX in a fragment → same result
convert function component to arrow component → same result, if both are in scope
```

Boundary transforms intentionally change the result:

```ts
fc.assert(
  fc.asyncProperty(
    positiveFunctionComponent,
    boundaryTransformArb,
    async (testCase, tx) => {
      const transformed = applyTransform(tx, testCase);

      const before = await checkRuleCandidate(candidateRule, [testCase]);
      const after = await checkRuleCandidate(candidateRule, [transformed]);

      expect(before[0].actualMatch).toBe(true);
      expect(after[0].actualMatch).toBe(false);
    },
  ),
);
```

Examples:

```text
move fetch into loader → match disappears
move fetch into event handler → match disappears
move fetch into test file → match disappears
replace fetch with project client → match disappears
```

This is where property testing becomes a rule-forging tool.

It teaches the candidate the boundary of the motif.

## View-plan properties

The same DSL protects the UI.

Agents can generate review documents and view plans, but only through schema-valid blocks.

```ts
export const ReviewBlock = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("ResourceHeader"),
    resourceRef: ResourceRef("RuleCandidate"),
  }),
  Schema.Struct({
    type: Schema.Literal("NarrativeBlock"),
    title: Schema.String,
    body: Schema.String,
    sourceRefs: Schema.Array(ResourceRef("EvidenceBundle")),
  }),
  Schema.Struct({
    type: Schema.Literal("EvidenceTable"),
    findingSetRef: ResourceRef("FindingSet"),
  }),
  Schema.Struct({
    type: Schema.Literal("CodeExcerpt"),
    findingRef: ResourceRef("Finding"),
  }),
  Schema.Struct({
    type: Schema.Literal("DecisionBar"),
    actions: Schema.Array(
      Schema.Literal("promote", "revise", "reject", "export"),
    ),
  }),
);

export const ReviewDocumentPlan = AttuneResource(
  "ReviewDocumentPlan",
  Schema.Struct({
    candidateRef: ResourceRef("RuleCandidate"),
    blocks: Schema.Array(ReviewBlock),
  }),
  Schema.Struct({
    renderable: Schema.Boolean,
  }),
);
```

The view laws are direct:

```ts
fc.assert(
  fc.property(reviewDocumentPlanArb, (plan) => {
    const refs = collectRefs(plan);

    for (const ref of refs) {
      expect(ref.kind).toBeDefined();
      expect(ref.name).toBeTruthy();
    }
  }),
);

fc.assert(
  fc.property(attuneWorldArb, (world) => {
    const plan = materializeReviewDocumentPlan(world);

    if (world.candidate.status.phase === "Measured") {
      expect(plan.spec.blocks.some((b) => b.type === "DecisionBar")).toBe(true);
    }
  }),
);

fc.assert(
  fc.property(attuneWorldArb, (world) => {
    const plan = materializeReviewDocumentPlan(world);

    for (const block of plan.spec.blocks) {
      if (block.type === "NarrativeBlock") {
        expect(block.sourceRefs.length).toBeGreaterThan(0);
      }
    }
  }),
);
```

The agent can choose the prose, order, emphasis, and evidence.

It cannot invent arbitrary UI, cite missing resources, or make unsupported claims.

## The full loop

The same DSL composes across the whole product:

```text
Effect Schema resource
→ derived arbitrary
→ generated event history
→ Effect projection
→ Foldkit view
→ MDX document
→ property check
```

For policy generation:

```text
Effect Schema motif
→ FastCheck synthetic cases
→ OXC parse admission
→ ast-grep / ESLint / Oxlint rule check
→ Counterexample resources
→ agent revision
→ repo measurement
→ evidence bundle
→ review document
```

This is the core Attune bet:

```text
The model proposes.
The schemas constrain.
The generators explore.
The local tools attack.
The counterexamples teach.
The documents explain.
The human decides.
```

Property testing is not a side quest.

It is how Attune makes fast, cheaper models useful without pretending they are omniscient.

## Cost model

Attune is designed around interaction, speed, and cost control.

The product does not need to beat the smartest model at one giant one-shot repo reasoning task. It needs to make the loop fast enough that users can shape a rule interactively, while local deterministic tools do most of the adversarial work.

The expensive path is repeated model reasoning over broad repo context.

```text
model reads repo
model guesses rule
model inspects failures
model revises with more repo context
model revises again
human reviews noisy result
```

Attune tries to replace that with a cheaper loop:

```text
model proposes motif/rule
FastCheck generates hundreds of variants
OXC admits valid code
rule runs locally
failures shrink into counterexamples
model revises from compact feedback
only stronger candidates hit repo measurement
```

The important metric is not raw token cost.

It is cost per accepted useful rule.

Attune’s bet is that fast models, strict schemas, local AST tooling, property-generated counterexamples, and calm review documents can make useful rules cheaper to produce and easier to trust.

## Interface philosophy

Attune is frontend-first.

The interface should feel light, familiar, and pleasant to spend time in. The user should not feel like they are operating an event-sourced control plane or debugging an agent harness.

They should feel like they are reading and shaping a living technical memo.

The rigor is hidden until it matters:

```text
summary first
evidence second
counterexamples on demand
lineage in the drawer
native export at the end
```

MDX is the review surface. Foldkit renders projections. Effect owns the runtime. FastCheck attacks the assumptions. OXC keeps generated code honest. ast-grep, ESLint, and Oxlint produce native rules.

Attune is a breezy app with an adversarial systems core.
