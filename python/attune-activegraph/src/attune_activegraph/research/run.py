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


def _settings(
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
        aggregate_budget=ResearchBudget(
            prompt_tokens=120_000, completion_tokens=30_000, model_calls=24
        ),
        prompt_digest=prompt_digest(),
        common_tool_digest=common_tool_digest(),
    )


def cold_campaign() -> tuple[Trial, ...]:
    """Materialize the required 2 cases x 3 arms x 2 seeds = 12 definitions."""

    arms = (
        ("A", Topology.SINGLE, CapabilityProfile.CONVENTIONAL),
        ("B", Topology.SWARM, CapabilityProfile.CONVENTIONAL),
        ("C", Topology.SINGLE, CapabilityProfile.ATTUNE),
    )
    return tuple(
        fresh_trial(
            arm_id=arm_id,
            seed=seed,
            settings=_settings(
                case_id=case_id,
                campaign_id="cold-capability-calibration",
                topology=topology,
                capability=capability,
            ),
        )
        for case_id in _COLD_CASES
        for arm_id, topology, capability in arms
        for seed in ("1", "2")
    )


def prose_control(packet: Packet) -> str:
    """Export the bounded non-executable control and reject target-specific detail."""

    text = "\n".join(
        (packet.claim, *packet.applicability, *packet.exclusion_cues, *packet.unresolved_questions)
    )
    prohibited = (
        *packet.joern_queries,
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
            settings=_settings(
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
        for seed in ("1", "2")
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
    }
    try:
        return fixtures[case_id]
    except KeyError as error:
        raise ValueError(f"unknown benchmark case: {case_id}") from error
