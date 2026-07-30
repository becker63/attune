"""The four-object ActiveGraph pack; topology is settings, not a runtime."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any, Literal, cast

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

from .ledger import make_interpretation_tool
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
    relation: Literal["supports", "challenges"]
    ledger_refs: tuple[str, ...] = ()


def _case(event: Any) -> tuple[str, str]:
    payload = cast("Mapping[str, object]", event.payload)
    candidate = payload.get("object")
    if not isinstance(candidate, Mapping):
        raise ValueError("research behavior needs one triggering Case object")
    item = cast("Mapping[str, object]", candidate)
    if item.get("type") != "Case":
        raise ValueError("research behavior needs one triggering Case object")
    object_id = item.get("id")
    candidate_data = item.get("data")
    if not isinstance(object_id, str) or not isinstance(candidate_data, Mapping):
        raise ValueError("research behavior received a malformed Case event")
    data = cast("Mapping[str, object]", candidate_data)
    case_id = data.get("id")
    if not isinstance(case_id, str) or not case_id:
        raise ValueError("research behavior received a Case without an id")
    return object_id, case_id


def _investigated(event: Any, graph: Any, _ctx: Any, output: InvestigationOutput) -> None:
    case_object_id, case_id = _case(event)
    if output.case_id != case_id:
        raise ValueError("investigation output must address the current case")
    evidence_value = output.evidence.model_copy(
        update={"refs": tuple(dict.fromkeys((*output.evidence.refs, *output.ledger_refs)))}
    )
    claim = graph.add_object(
        "Claim",
        output.claim.model_dump(mode="json"),
    )
    evidence = graph.add_object(
        "Evidence",
        evidence_value.model_dump(mode="json"),
    )
    graph.add_relation(claim.id, case_object_id, "addresses")
    graph.add_relation(evidence.id, claim.id, output.relation)


def _synthesized(event: Any, graph: Any, _ctx: Any, output: Result) -> None:
    _, case_id = _case(event)
    if output.case_id != case_id:
        raise ValueError("result must address the current case")
    graph.add_object("Result", output.model_dump(mode="json"))


def _llm(
    name: str, output: type[Model], handler: Callable[..., None], tools: tuple[Tool, ...]
) -> LLMBehavior:
    decorate = llm_behavior(
        name=name,
        on=["object.created"],
        where={"object.type": "Case"},
        description="Produce bounded research records; never treat bounded tests as proof.",
        output_schema=output,
        creates=["Claim", "Evidence"] if name == "investigate" else ["Result"],
        tools=list(tools),
        max_tool_turns=16,
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
    interpretation = (make_interpretation_tool(settings.case_id),)
    tools = workspace + interpretation + attune
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
