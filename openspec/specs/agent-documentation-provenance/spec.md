# agent-documentation-provenance Specification

## Purpose

Require published experiment pages to link to coarse experiment bundles at immutable revisions.

## Requirements

### Requirement: Coarse experiment publication linkage

The Python provenance boundary SHALL retain a stable content-addressed link
from a completed ActiveGraph research run and its evaluator result to the
immutable exported PublicationBundle. It SHALL preserve the distinction between
execution history and factual support, but SHALL reuse existing events and
generic record/trace facilities rather than adding experiment-specific graph
objects, per-relation traversals, authorization machinery, or approval
carry-forward behavior.

#### Scenario: Inspect a published experiment

- **WHEN** a reviewer follows a publication bundle's ActiveGraph address
- **THEN** the trace identifies the originating run, evaluator result, and
  frozen bundle address
- **AND** it does not expose private prompts, messages, or full tool payloads

### Requirement: Immutable experiment revision

Changed evaluator output, manifest facts, report content, or approval SHALL
produce a new immutable publication bundle/revision in Python. The static docs
site SHALL consume the new bundle only after its bound approval; it SHALL NOT
perform graph invalidation or lifecycle repair.

#### Scenario: Replace a published report

- **WHEN** a corrected report revision is approved
- **THEN** Python exports a new bound bundle and links it to the prior revision
- **AND** the prior checked-in record remains an immutable historical artifact
