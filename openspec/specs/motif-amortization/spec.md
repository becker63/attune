# motif-amortization Specification

## Purpose

Define content-addressed motif reuse and leakage-resistant transfer measurement that separates execution reuse from semantic reuse.

## Requirements

### Requirement: Frozen content-addressed motif packets

An accepted source investigation SHALL produce an immutable content-addressed
motif packet with schema version, source identities/references, claim,
applicability/exclusion cues, repository signals, query families, formal
artifacts, falsifiers, counterexamples, lowerings, semantic loss, and unresolved
questions. The packet SHALL be frozen before held-out target trials begin.

#### Scenario: Target result extends a motif

- **WHEN** a held-out investigation discovers new information
- **THEN** it creates a new packet revision when retained
- **AND** SHALL NOT mutate the source packet used by earlier trials

### Requirement: Leakage-resistant transfer conditions

The transfer campaign SHALL run fresh Attune-single graph runs, model contexts,
and investigations for cold, prose-control, and motif-packet conditions. Prose
shall contain bounded claim/applicability/exclusion/limitation text but no
executable queries, artifacts, replay coordinates, or rule bytes. Imported
state SHALL be the only cross-run input.

#### Scenario: Construct a prose control

- **WHEN** the runner creates a prose transfer trial
- **THEN** it excludes executable packet components and target-specific paths,
  labels, transcripts, and evaluator outcomes

### Requirement: Initial transfer calibration

After an accepted snapshot-revalidation source result, the campaign SHALL run
two held-out targets across cold, prose-control, and motif-packet conditions
with two seeds, yielding twelve transfer runs. Enshrined reuse MAY be added but
SHALL be separately labelled.

#### Scenario: Schedule transfer trials

- **WHEN** the frozen source packet is available
- **THEN** the campaign schedules twelve fresh held-out transfer runs
- **AND** records the source packet digest on every applicable run

### Requirement: Transfer campaign interpretation

The twelve-run transfer calibration SHALL be a separate decision point from
cold discovery. A packet result SHALL support executable amortization only when
packet-assisted held-out work improves accepted-cost measures over both cold
and bounded prose conditions without relying only on execution caches. If prose
matches the packet, the report SHALL recommend simplifying the packet or
rejecting executable-amortization value for that motif; if evaluator quality is
unstable, it SHALL recommend calibration work before corpus expansion.

#### Scenario: Packet and prose perform equivalently

- **WHEN** packet-assisted and prose-assisted held-out trials have no
  meaningful accepted-cost or quality separation
- **THEN** the report does not claim structured executable amortization
- **AND** records the motif as a candidate for packet simplification or
  negative-result publication

### Requirement: Amortization calculation separates execution reuse

The extractor SHALL compute and label conventional baseline, Attune cold,
prose, and packet cost per accepted target; tool/prose/packet leverage,
packet-over-prose, and break-even when defined. Replay, receipt idempotency,
CPG reuse, prompt caching, reused checkouts, and enshrined rule execution SHALL
be measured separately and SHALL NOT support semantic amortization claims.

#### Scenario: A packet trial uses a warm CPG

- **WHEN** a packet-assisted trial also reuses a CPG
- **THEN** the manifest exposes that cache state separately
- **AND** validation rejects an amortization finding based only on that reuse
