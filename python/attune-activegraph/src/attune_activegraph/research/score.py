"""Pure hidden-fixture scoring and decision projection for the first motifs."""

from __future__ import annotations

from dataclasses import dataclass

from .model import Evaluation, Result, TrialRecord

_COMPONENTS = (
    "localization",
    "precision",
    "recall",
    "falsification",
    "formal_utility",
    "lowering_quality",
    "calibration",
    "evidence_trace",
    "outcome_honesty",
    "repository_result",
)


@dataclass(frozen=True)
class _Fixture:
    evaluator: str
    digest: str
    true_locations: frozenset[str]
    negative_locations: frozenset[str]
    requires_falsifier: bool


_SNAPSHOT = _Fixture(
    "snapshot-revalidation-v1",
    "sha256:snapshot-revalidation-fixture-v1",
    frozenset({"artifact_promote", "repository_checkpoint"}),
    frozenset({"read_only_decoy", "ignored_snapshot"}),
    True,
)
_TERMINAL = _Fixture(
    "cancellation-terminalization-v1",
    "sha256:cancellation-terminalization-fixture-v1",
    frozenset({"investigation_finalize", "activity_release"}),
    frozenset({"correct_ordering", "indirect_helper"}),
    True,
)
_FIXTURES = {_SNAPSHOT.evaluator: _SNAPSHOT, _TERMINAL.evaluator: _TERMINAL}


def _score(result: Result, fixture: _Fixture) -> Evaluation:
    locations = set(result.locations)
    true = len(locations & fixture.true_locations) / len(fixture.true_locations)
    false = len(locations & fixture.negative_locations)
    precision = 1.0 if not locations else max(0.0, (len(locations) - false) / len(locations))
    falsification = 1.0 if (not fixture.requires_falsifier or result.falsifier) else 0.0
    calibrated = bool(result.residual_uncertainty) or result.lowering is None
    scores = {
        "localization": true,
        "precision": precision,
        "recall": true,
        "falsification": falsification,
        "formal_utility": falsification,
        "lowering_quality": 1.0 if result.lowering is not None else 0.5,
        "calibration": 1.0 if calibrated else 0.0,
        "evidence_trace": 1.0 if result.evidence_ids else 0.0,
        "outcome_honesty": 1.0
        if result.final_state.value != "survived-current-tests" or calibrated
        else 0.0,
        "repository_result": 1.0 if result.locations else 0.0,
    }
    accepted = min(scores.values()) >= 0.5 and scores["precision"] == 1.0
    return Evaluation(
        evaluator=fixture.evaluator, fixture_digest=fixture.digest, scores=scores, accepted=accepted
    )


def evaluate_snapshot_revalidation(result: Result) -> Evaluation:
    """Score only after submission; fixture details never enter agent context."""

    return _score(result, _SNAPSHOT)


def evaluate_cancellation_terminalization(result: Result) -> Evaluation:
    """Score the second temporal motif without a generic evaluator framework."""

    return _score(result, _TERMINAL)


def evaluate(result: Result, evaluator: str) -> Evaluation:
    try:
        return _score(result, _FIXTURES[evaluator])
    except KeyError as error:
        raise ValueError(f"unknown evaluator: {evaluator}") from error


def _by_arm(records: tuple[TrialRecord, ...]) -> dict[str, tuple[TrialRecord, ...]]:
    grouped: dict[str, list[TrialRecord]] = {}
    for record in records:
        if record.evaluation is not None:
            grouped.setdefault(record.arm_id, []).append(record)
    return {arm: tuple(rows) for arm, rows in grouped.items()}


def _accepted(rows: tuple[TrialRecord, ...]) -> bool:
    return bool(rows) and all(record.accepted for record in rows)


def _mean_tokens(rows: tuple[TrialRecord, ...]) -> float:
    return sum(record.metrics.tokens for record in rows) / len(rows)


def cold_next_decision(records: tuple[TrialRecord, ...]) -> str:
    """Return one conservative follow-up decision from measured cold rows."""

    by_arm = _by_arm(records)
    if not by_arm or not any(record.accepted for rows in by_arm.values() for record in rows):
        return "improve fixtures and evaluator calibration before expanding the campaign"
    attune, swarm = by_arm.get("C", ()), by_arm.get("B", ())
    if _accepted(attune) and _accepted(swarm) and _mean_tokens(attune) < _mean_tokens(swarm):
        return "add tool ablations, more motifs, and held-out repositories"
    if any("cold-cpg" in record.cache_labels for rows in by_arm.values() for record in rows):
        return "profile native startup while retaining gross cold cost"
    return "report the measured trade-off without a general performance claim"


def transfer_next_decision(
    cold_cost: float | None, prose_cost: float | None, packet_cost: float | None
) -> str:
    if packet_cost is None or cold_cost is None or prose_cost is None:
        return "calibrate evaluator and complete comparable transfer rows"
    if packet_cost < cold_cost and packet_cost < prose_cost:
        return "invest in packet quality and additional held-out motif families"
    if packet_cost >= prose_cost:
        return "simplify the packet or publish a negative executable-amortization result"
    return "collect more held-out transfer evidence before changing the packet design"
