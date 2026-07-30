"""Trial identities and immutable campaign schedules; no campaign runs on import."""

from __future__ import annotations

from dataclasses import dataclass, replace
from pathlib import Path
from time import time_ns
from uuid import uuid4

from .model import (
    CapabilityProfile,
    Case,
    Packet,
    PriorState,
    ResearchBenchSettings,
    ResearchBudget,
    Topology,
    TrialRecord,
    digest,
)
from .workspace import common_tool_digest

_COLD_CASES = ("snapshot-revalidation", "cancellation-terminalization")
_TRANSFER_TARGETS = ("checkpoint-held-out", "finalize-held-out")
_SEEDS = ("1", "2")
_BUDGET = ResearchBudget(prompt_tokens=120_000, completion_tokens=30_000, model_calls=24)


@dataclass(frozen=True)
class Arm:
    id: str
    topology: Topology
    capability: CapabilityProfile


_COLD_ARMS = (
    Arm("A", Topology.SINGLE, CapabilityProfile.CONVENTIONAL),
    Arm("B", Topology.SWARM, CapabilityProfile.CONVENTIONAL),
    Arm("C", Topology.SINGLE, CapabilityProfile.ATTUNE),
)


def prompt_digest() -> str:
    """Record the exact small prompt set without putting prompts in events."""

    root = Path(__file__).with_name("prompts")
    return digest({path.name: path.read_text() for path in sorted(root.glob("*.md"))})


@dataclass(frozen=True)
class Trial:
    id: str
    arm_id: str
    seed: str
    settings: ResearchBenchSettings
    case_id: str
    case_revealed_ns: int
    workspace_ready_ns: int | None = None


def fresh_trial(*, arm_id: str, seed: str, settings: ResearchBenchSettings) -> Trial:
    """Allocate a new run identity; replay never calls this constructor."""

    return Trial(
        id=f"research-{uuid4().hex}",
        arm_id=arm_id,
        seed=seed,
        settings=settings,
        case_id=settings.case_id,
        case_revealed_ns=time_ns(),
    )


def workspace_ready(trial: Trial) -> Trial:
    return replace(trial, workspace_ready_ns=time_ns())


def settings_for(
    *,
    case_id: str,
    campaign_id: str,
    topology: Topology,
    capability: CapabilityProfile,
    prior: PriorState = PriorState.COLD,
    prior_digest: str | None = None,
) -> ResearchBenchSettings:
    return ResearchBenchSettings(
        topology=topology,
        capability_profile=capability,
        prior_state=prior,
        prior_artifact_digest=prior_digest,
        case_id=case_id,
        campaign_id=campaign_id,
        aggregate_budget=_BUDGET,
        prompt_digest=prompt_digest(),
        common_tool_digest=common_tool_digest(),
    )


def cold_campaign() -> tuple[Trial, ...]:
    """Materialize the required 2 cases x 3 arms x 2 seeds = 12 definitions."""

    return tuple(
        fresh_trial(
            arm_id=arm.id,
            seed=seed,
            settings=settings_for(
                case_id=case_id,
                campaign_id="cold-capability-calibration",
                topology=arm.topology,
                capability=arm.capability,
            ),
        )
        for case_id in _COLD_CASES
        for arm in _COLD_ARMS
        for seed in _SEEDS
    )


def prose_control(packet: Packet) -> str:
    """Export the bounded non-executable control and reject target-specific detail."""

    ledger_semantics = tuple(
        value
        for ledger in packet.ledgers
        for values in (
            ledger.retained,
            ledger.omitted,
            ledger.assumptions,
            ledger.limitations,
        )
        for value in values
    )
    text = "\n".join(
        (
            packet.claim,
            *packet.applicability,
            *packet.exclusion_cues,
            *packet.unresolved_questions,
            *ledger_semantics,
        )
    )
    prohibited = (
        *(query.retained_form for query in packet.joern_queries),
        *packet.formal_artifacts,
        *packet.falsifiers,
        *packet.counterexamples,
    )
    if any(part and part in text for part in prohibited):
        raise ValueError("prose control may not contain executable packet material")
    return text


def transfer_campaign(packet: Packet) -> tuple[Trial, ...]:
    """Materialize the held-out 2 targets x 3 conditions x 2 seeds schedule."""

    prose_control(packet)
    conditions = (
        (PriorState.COLD, None),
        (PriorState.PROSE, packet.packet_digest),
        (PriorState.PACKET, packet.packet_digest),
    )
    return tuple(
        fresh_trial(
            arm_id=prior.value,
            seed=seed,
            settings=settings_for(
                case_id=case_id,
                campaign_id="packet-transfer-calibration",
                topology=Topology.SINGLE,
                capability=CapabilityProfile.ATTUNE,
                prior=prior,
                prior_digest=prior_digest,
            ),
        )
        for case_id in _TRANSFER_TARGETS
        for prior, prior_digest in conditions
        for seed in _SEEDS
    )


def replay_trial(record: TrialRecord) -> str:
    """Describe replay by recorded trace address; callers must not rematerialize it."""

    return record.trace_address


def case_fixture(case_id: str) -> Case:
    fixtures = {
        "snapshot-revalidation": Case(
            id=case_id,
            repository="attune",
            revision="fixture-snapshot",
            question="Find writer-authority snapshot revalidation gaps.",
            evaluator="snapshot-revalidation-v1",
            public_description="Find mutation paths whose snapshot validation may become stale.",
        ),
        "cancellation-terminalization": Case(
            id=case_id,
            repository="attune",
            revision="fixture-terminalization",
            question="Find cancellation-safe terminalization gaps.",
            evaluator="cancellation-terminalization-v1",
            public_description="Find terminalization ordering paths under cancellation.",
        ),
        "checkpoint-held-out": Case(
            id=case_id,
            repository="attune",
            revision="fixture-checkpoint-held-out",
            question="Test a checkpoint authority motif on a held-out path.",
            evaluator="snapshot-revalidation-v1",
            public_description="Evaluate checkpoint authority on a held-out fixture.",
        ),
        "finalize-held-out": Case(
            id=case_id,
            repository="attune",
            revision="fixture-finalize-held-out",
            question="Test a finalization-ordering motif on a held-out path.",
            evaluator="cancellation-terminalization-v1",
            public_description="Evaluate finalization ordering on a held-out fixture.",
        ),
    }
    try:
        return fixtures[case_id]
    except KeyError as error:
        raise ValueError(f"unknown benchmark case: {case_id}") from error
