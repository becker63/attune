## Attune

Attune helps teams turn code review taste into native static-analysis rules.

It starts with a practice: a recurring pattern, a boundary, a habit, a thing reviewers keep saying by hand. Attune helps shape that practice into an ast-grep, ESLint, or Oxlint-backed rule, tests the rule against generated examples, measures it against the repository, and produces a reviewable document before anything ships.

The surface is intentionally light: discover a pattern, shape it with the agent, review the evidence, export the rule.

Underneath, Attune is much more adversarial.

Every durable object is an Effect Schema resource. Agent outputs, events, view plans, evidence bundles, review documents, and exports all pass through typed schemas before they become product state. The system borrows Kubernetes-style semantics — `apiVersion`, `kind`, `metadata`, `spec`, `status`, conditions, and refs — without requiring Kubernetes.

Rules are not trusted because an agent wrote them.

A candidate enters a motif lab first. FastCheck generates positive cases, negative cases, and near-miss variants for the pattern being encoded. OXC parses and admits only valid TypeScript/TSX. ast-grep, ESLint, or Oxlint runs the candidate rule. Failures are shrunk and clustered into counterexample classes, then fed back to the agent as compact revision material.

```text
agent proposes
Effect Schema decodes
FastCheck generates variants
OXC admits valid code
ast-grep / ESLint / Oxlint checks the rule
counterexamples shrink
agent revises
repo measurement follows
MDX explains the evidence
```

This is structured fuzzing for code review policy.

Raw snippets are too weak an input language for rule synthesis. Attune uses motif families to give the generator a domain-shaped space to explore. The goal is not to prove a rule universally correct. The goal is to cheaply discover where the rule is wrong before a reviewer or expensive model call has to care.

Attune’s frontend is allowed to be beautiful.

It is not allowed to lie.


## The motif lab

Attune does not ask an agent to write a rule and hope.

A rule candidate enters a small adversarial lab before it is measured against a real repository. The lab generates synthetic positive and negative examples for the motif, admits only parseable TypeScript/TSX through OXC, runs the candidate rule with ast-grep, ESLint, or Oxlint, clusters failures into counterexample classes, and feeds only the useful failures back to the agent.

Every object in this loop is schema-shaped. Motif families, synthetic cases, rule candidates, check results, counterexamples, and review documents are Effect Schema resources. The agent can propose, revise, and explain, but durable product state only exists after it passes through the schema boundary.

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

This is the same shape as structured fuzzing.

Raw bytes are too weak an input language for kernel-adjacent systems; schemas give fuzzers something meaningful to mutate. In Attune, arbitrary snippets are too weak an input language for code-review policy; motif families give agents and property tests something meaningful to explore.

The loop is:

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

The goal is not to prove a rule is universally correct. The goal is to cheaply discover where the rule is wrong before a human reviewer or expensive model call has to care.

Attune’s surface can stay light and editorial because the rule has already been attacked underneath.
