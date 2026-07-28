## ADDED Requirements

### Requirement: Small Python and graph surface

The benchmark SHALL live in the existing `attune_activegraph.research` Python
module and SHALL expose only four ActiveGraph object types: `Case`, `Claim`,
`Evidence`, and `Result`. It SHALL use at most five relations: `addresses`,
`supports`, `challenges`, `refines`, and optional `usesPacket`. Arm
configuration and ActiveGraph run identity SHALL remain settings/events;
Packets, Manifests, Reports, and Approvals SHALL be immutable Pydantic
documents/files, not graph objects.

The complete first campaign SHALL target 1,400--1,900 handwritten production
Python lines across the new research module and direct bridge/provenance
additions, excluding tests, generated code, fixtures, prompts, and checked-in
experiment data. It SHALL require architecture review above 2,000 lines and
SHALL NOT exceed 2,200 lines without an approved design revision explaining
which existing runtime mechanism could not be reused.

#### Scenario: Review the new research surface

- **WHEN** CI counts the documented production file set
- **THEN** it reports each contributing file and the scoped total
- **AND** it reports that architecture review is required above 2,000 and
  rejects a total above 2,200 until the design budget is revised

#### Scenario: Add a research concept

- **WHEN** implementation needs repository subject, candidate artifact,
  experiment choice, metric, evaluator score, packet, manifest, report, or
  approval information
- **THEN** it stores that information as a field, tagged value, event, or
  immutable document
- **AND** it does not add a fifth graph object merely to mirror that data

### Requirement: ActiveGraph supplies mechanics

Researchbench SHALL reuse ActiveGraph for event history, scheduling, structured
model/tool loops, model and tool tracing, replay, pack composition, aggregate
budget recording, and shared swarm state. It SHALL NOT implement another agent
runtime, workflow engine, evaluator engine, graph-query layer, or orchestration
subsystem.

#### Scenario: Configure an Attune arm

- **WHEN** a runner selects the Attune capability profile
- **THEN** the pack composes common workspace tools with the existing eight
  typed bridge tools
- **AND** it does not duplicate MCP execution, replay, receipt, or lifecycle
  logic

### Requirement: Two behavior implementations and configured topology

The pack SHALL implement one `investigate` LLM behavior and one `synthesize`
LLM behavior. Single topology SHALL run `investigate` with one `researcher`
role configuration. Swarm topology SHALL run that same behavior with `scout`,
`adversary`, `experimenter`, and `lowerer` role configurations, then use
`synthesize` to produce the same `Result` contract. A deterministic close or
projection behavior MAY run after result submission.

#### Scenario: Run a conventional swarm

- **WHEN** the swarm arm starts
- **THEN** each configured role writes the same Claim/Evidence shapes into one
  ActiveGraph run
- **AND** the synthesizer produces the same Result shape used by a single arm

### Requirement: Python-owned parameterized research pack

The system SHALL provide a validated `ResearchBenchSettings` configuration with
topology, capability profile, prior state, prior artifact digest, case ID,
campaign ID, and aggregate budget. It SHALL record settings, pack/prompt/model/
common-tool/case/evaluator digests and cache policy in ActiveGraph and the
experiment manifest.

#### Scenario: Create an arm run

- **WHEN** a campaign starts an arm
- **THEN** the Python module creates a run from one immutable settings record
- **AND** records every required version and digest before agent work begins

### Requirement: Common ActiveGraph apparatus and result

Every arm SHALL use the same ActiveGraph version/event store, tool/model
tracing, aggregate accounting, Result contract, hidden evaluator boundary,
metric projection, and publication exporter. ActiveGraph SHALL not be a
treatment arm. Result SHALL retain the primary claim or unsupported conclusion,
scope, evidence references, locations, falsifier/non-falsifier explanation,
lowering/non-lowerability, uncertainty, packet candidate, and final state.
`survived-current-tests` SHALL remain distinct from proof.

#### Scenario: Bounded evidence has no counterexample

- **WHEN** a run completes a bounded Maude or property search without a
  counterexample
- **THEN** the stored result does not present that outcome as universal proof

### Requirement: Isolated and replayable trials

Every fresh trial SHALL receive a fresh ActiveGraph run, exact revision, frozen
case, and isolated workspace/investigation. Recorded ActiveGraph replay SHALL
consume recorded MCP responses; a fresh trial SHALL not reuse prior run or
investigation identity.

#### Scenario: Inspect a completed run

- **WHEN** an operator replays a recorded benchmark run
- **THEN** Attune calls are not re-executed solely for replay
- **AND** a newly scheduled trial obtains a new run and investigation identity
