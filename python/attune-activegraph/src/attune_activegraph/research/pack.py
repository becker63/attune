"""The four-object ActiveGraph pack; topology is settings, not a runtime."""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

from activegraph import (  # pyright: ignore[reportMissingTypeStubs]
    LLMBehavior,
    ObjectType,
    Pack,
    RelationType,
    Tool,
)
from activegraph.packs import llm_behavior  # pyright: ignore[reportMissingTypeStubs]

from attune_activegraph.pack import make_pack
from attune_activegraph.tools import AttuneCaller

from .model import (
    CapabilityProfile,
    Case,
    Claim,
    Evidence,
    Model,
    ResearchBenchSettings,
    Result,
    Topology,
    digest,
)
from .workspace import make_workspace_tools

PACK_VERSION = "0.0.0"
ROLES: dict[Topology, tuple[str, ...]] = {
    Topology.SINGLE: ("researcher",),
    Topology.SWARM: ("scout", "adversary", "experimenter", "lowerer"),
}


class InvestigationOutput(Model):
    case_id: str
    claim: Claim
    evidence: Evidence


def _case_id(graph: Any) -> str:
    cases = [item for item in graph.objects() if item.type == "Case"]
    if len(cases) != 1:
        raise ValueError("research behavior needs exactly one Case object")
    return str(cases[0].data["id"])


def _investigated(event: Any, graph: Any, _ctx: Any, output: InvestigationOutput) -> None:
    if output.case_id != _case_id(graph):
        raise ValueError("investigation output must address the current case")
    claim = graph.add_object(
        "Claim", output.claim.model_dump(mode="json"), actor="investigate", caused_by=event.id
    )
    evidence = graph.add_object(
        "Evidence", output.evidence.model_dump(mode="json"), actor="investigate", caused_by=event.id
    )
    case = next(item for item in graph.objects() if item.type == "Case")
    graph.add_relation(claim.id, case.id, "addresses", actor="investigate", caused_by=event.id)
    graph.add_relation(evidence.id, claim.id, "supports", actor="investigate", caused_by=event.id)


def _synthesized(event: Any, graph: Any, _ctx: Any, output: Result) -> None:
    if output.case_id != _case_id(graph):
        raise ValueError("result must address the current case")
    graph.add_object(
        "Result", output.model_dump(mode="json"), actor="synthesize", caused_by=event.id
    )


def _llm(
    name: str, output: type[Model], handler: Callable[..., None], tools: tuple[Tool, ...]
) -> LLMBehavior:
    decorate = llm_behavior(
        name=name,
        on=["object.created"],
        where={"type": "Case"},
        description="Produce bounded research records; never treat bounded tests as proof.",
        output_schema=output,
        creates=["Claim", "Evidence"] if name == "investigate" else ["Result"],
        tools=list(tools),
        max_tool_turns=6,
    )
    return decorate(handler)


def make_research_pack(
    *,
    settings: ResearchBenchSettings,
    workspace_root: str,
    caller: AttuneCaller | None = None,
    run_identity: str | None = None,
) -> Pack:
    """Compose common tools and, only for treatment, the eight bridge tools."""

    workspace = make_workspace_tools(Path(workspace_root))
    attune: tuple[Tool, ...] = ()
    if settings.capability_profile is CapabilityProfile.ATTUNE:
        attune = make_pack(caller=caller, run_identity=run_identity).tools
    tools = workspace + attune
    return Pack(
        name="attune_researchbench",
        version=f"{PACK_VERSION}+{digest(settings)[:19]}",
        description="Four-object benchmark consumer pack over Attune's typed bridge.",
        object_types=(
            ObjectType("Case", Case, "Visible immutable research assignment."),
            ObjectType("Claim", Claim, "Bounded assertion under investigation."),
            ObjectType("Evidence", Evidence, "Interpretation of opaque execution evidence."),
            ObjectType("Result", Result, "Common final result for every arm."),
        ),
        relation_types=(
            RelationType("addresses", ("Claim",), ("Case",)),
            RelationType("supports", ("Evidence",), ("Claim",)),
            RelationType("challenges", ("Evidence",), ("Claim",)),
            RelationType("refines", ("Claim",), ("Claim",)),
            RelationType("usesPacket", ("Case",), ("Evidence",)),
        ),
        behaviors=(
            _llm("investigate", InvestigationOutput, _investigated, tools),
            _llm("synthesize", Result, _synthesized, tools),
        ),
        tools=tools,
        settings_schema=ResearchBenchSettings,
    )
