## MODIFIED Requirements

### Requirement: Explicit lifecycle service

`Attune` SHALL be an explicit documented service interface and value whose
members expose the legal investigation lifecycle in source order.

#### Scenario: Service members are extractable

- **WHEN** the documentation compiler reads the exact production source roots
  and source-authored package entrypoint
- **THEN** every public `Attune` lifecycle method has its own signature, anchor,
  summary, and immutable source provenance
- **AND** the document does not depend on an inferred `ReturnType` alias or
  built-declaration extraction

#### Scenario: Lifecycle types prevent illegal transitions

- **WHEN** TypeScript checks a call that supplies an investigation in the wrong
  state
- **THEN** the call fails to type-check
- **AND** a correctly sequenced materialize, activate, execute, and finalize
  program type-checks

### Requirement: Public concepts are source documented

The public API SHALL remain centered on exactly `Attune`,
`Investigation<State>`, `AttuneReceipt`, `AttuneToolkit`,
`InvestigationLifecycleError`, and `AttuneToolFailure`, with the existing
public `Attune` lifecycle members. The documentation change SHALL NOT add
aliases, wrapper types, generated input/output lenses, page models, or
documentation-only nouns to explain that surface.

The opening curriculum SHALL initially teach only this shared model:

1. `Investigation<State>` carries authority over one exact repository state.
2. `Attune` changes or uses that authority.
3. `AttuneReceipt` preserves durable evidence for accepted work.

`InvestigationLifecycleError`, `AttuneToolFailure`, and `AttuneToolkit` SHALL
be introduced afterward as boundaries around that model, not as three
additional peer fundamentals. Package TSDoc SHALL begin with one causal
sentence explaining that Attune materializes an exact repository state,
issues typed authority to operate on it, and preserves every accepted
operation as a durable receipt. It SHALL own the three-part model, one plain
text lifecycle/evidence diagram, and exactly one required
`@example` whose first body line is `A complete investigation`.

That complete checked program SHALL resolve, in causal order,
`Attune.materialize`, `Attune.activate`, `Attune.execute`, inspection of the
returned `AttuneReceipt`, and `Attune.finalize`. It SHALL finalize the current
active `Investigation` returned by execution rather than silently reusing a
stale pre-execution capability. It SHALL narrow rejected materialization
before activation and supply the actual finalization input required by the
public signature. Its visible source SHALL annotate active authority as
`Investigation<"active">`, assign the returned evidence to
`AttuneReceipt`, and read or branch on `execution.receipt.status`. The program
SHALL render once. Later public sections SHALL
refer to its one stable anchor and reuse its vocabulary; they SHALL NOT clone
it, create reverse occurrence identities, or invent isolated tutorial
contexts. The visible program SHALL include compiler-resolved occurrences of
`Attune`, `Investigation<"active">`, `AttuneReceipt`, and every lifecycle
member it claims to demonstrate. Every additionally authored example SHALL
type-check, but no declaration or member SHALL receive a numeric example
quota.

The package entrypoint SHALL source-author the public curriculum by directly
reexporting the six concepts in this order:

```text
Investigation
Attune
AttuneReceipt
InvestigationLifecycleError
AttuneToolFailure
AttuneToolkit
```

Reexports SHALL resolve to the declarations that own canonical TSDoc and
source spans. The `Attune` interface member order SHALL remain
`materialize`, `activate`, `acquireActive`, `execute`, `finalize`, and
`recoverTerminal`. This curriculum order SHALL NOT replace exact production
build roots as the exhaustive documentation universe.

`Investigation<State>` TSDoc SHALL explain what authority its state proves,
which lifecycle transitions it permits, which evidence binds it to an exact
snapshot, and what invalidates it. `Attune` and its members SHALL deepen the
same running program in lifecycle order, including restart and interrupted
exchange as variations through `acquireActive` and `recoverTerminal`.
`AttuneReceipt` SHALL distinguish acceptance from terminal completion,
explain the existing `"succeeded"`, `"failed"`, and `"cancelled"` states, and
explain durable recovery after an interrupted exchange. Incomplete or
interrupted execution SHALL NOT be presented as a fourth receipt state.

`InvestigationLifecycleError` and `AttuneToolFailure` SHALL appear together
under `Failures`. Their TSDoc SHALL explain respectively that supplied
authority cannot permit a transition and that a call cannot cross the trusted
tool boundary, including the caller's recovery decision. `AttuneToolkit`
SHALL follow failures and explain only the installation/schema boundary
around the same operations; it SHALL NOT become a parallel application API.

Each public declaration and member SHALL carry substantive TSDoc at its
canonical source owner. TypeScript annotations SHALL state parameters,
generics, lifecycle states, success values, error channels, and requirements.
TSDoc SHALL explain why those facts matter to the caller: authority held,
evidence produced, state preserved or invalidated, caller decision, recovery,
and related public concepts wherever applicable.

Every public `Attune` Effect signature SHALL spell its error channel directly
with `AttuneToolFailure`, `InvestigationLifecycleError`, or `never` as
applicable. A private operation-specific conditional or generic alias SHALL
NOT hide those public recovery choices in the canonical signature. Any
existing alias-based signature rewrite SHALL preserve assignability and
runtime behavior through type and implementation tests.

Every public type/member occurrence in the opening program, exact signatures,
visible examples, and authored TSDoc `{@link}` references within prose or
parameter/return explanations SHALL resolve to the canonical in-document
declaration. Each public declaration SHALL have an immutable source link.
Human editorial review SHALL judge whether the three-part model, public
prose, running example, and failure guidance tell one coherent caller story;
the compiler SHALL enforce structure, order, checked code, and resolved
evidence rather than a prose score.

#### Scenario: Three ideas establish the mental model

- **WHEN** a reader begins the public guide
- **THEN** `Investigation`, `Attune`, and `AttuneReceipt` are introduced as
  authority, action, and evidence before any boundary concept
- **AND** the opening does not present all six public names as unrelated peers

#### Scenario: Complete investigation carries current authority

- **WHEN** the package's one required program executes and then finalizes
- **THEN** all five causal events resolve in the required order
- **AND** rejected materialization is narrowed before activation
- **AND** finalization uses the active investigation returned by execution
- **AND** supplies the finalization input required by the public signature
- **AND** visible annotations name active `Investigation` authority and
  `AttuneReceipt` evidence while receipt status is inspected
- **AND** the program renders only once

#### Scenario: Public sections return to the running investigation

- **WHEN** `Investigation<State>`, `Attune`, or `AttuneReceipt` explains a
  concept already exercised by the complete program
- **THEN** the section's TSDoc contains an ordinary CommonMark link to the one
  `#complete-investigation` anchor and reuses its bindings
- **AND** does not render a cloned lifecycle example

#### Scenario: Boundary concepts are introduced

- **WHEN** the guide finishes the authority/action/evidence model
- **THEN** both failure declarations appear together under `Failures`
- **AND** `AttuneToolkit` follows as the installation/schema boundary

#### Scenario: Receipt explains interruption

- **WHEN** the receipt narrative discusses an accepted exchange interrupted
  before its result reaches the caller
- **THEN** it relates the absence to `Attune.recoverTerminal`
- **AND** does not invent an additional receipt status

#### Scenario: Public failure is documented

- **WHEN** a public Effect callable has a non-`never` resolved error channel
- **THEN** every public failure type has one exact `@failure` explanation with
  a caller recovery decision
- **AND** every failure name links to its canonical public declaration

#### Scenario: Private failure alias hides a public decision

- **WHEN** a public `Attune` signature exposes an operation-specific private
  alias instead of its actual public failure concepts
- **THEN** the signature is rewritten to the equivalent explicit public error
  union
- **AND** type tests prove the public correlation and runtime contract did not
  change

#### Scenario: Documentation pressure creates another noun

- **WHEN** an implementation proposes a wrapper, alias, shape type, page model,
  or generated lens solely to make the documentation pipeline easier
- **THEN** the proposal is rejected unless the runtime API independently needs
  that concept

#### Scenario: Public prose passes mechanically but not editorially

- **WHEN** a public comment has valid syntax but presents the six names as
  disconnected items or does not explain its role in the shared model
- **THEN** public editorial review fails before publication
