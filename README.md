## The motif lab

Attune does not ask an agent to write a rule and hope.

A rule candidate enters a small adversarial lab before it is measured against a real repository. The lab generates synthetic positive and negative examples for the motif, admits only parseable TypeScript/TSX through OXC, runs the candidate rule with ast-grep or ESLint, clusters failures into counterexample classes, and feeds only the useful failures back to the agent.

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

  // 3. Normalize/format later with oxfmt
  const normalized = admitted;

  // 4. Run candidate rule
  const results = await checkAstGrepRule(
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
FastCheck generates structured variants
OXC admits valid code
ast-grep / ESLint checks the candidate
counterexamples shrink
agent revises
real repo measurement happens only after the rule survives the lab
```

The goal is not to prove a rule is universally correct. The goal is to cheaply discover where the rule is wrong before a human reviewer or expensive model call has to care.

Attune’s surface can stay light and editorial because the rule has already been attacked underneath.
