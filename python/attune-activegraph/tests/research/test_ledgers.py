from __future__ import annotations

import json
import logging
import re
from collections.abc import Callable
from pathlib import Path
from typing import cast

import pytest
from activegraph import (  # pyright: ignore[reportMissingTypeStubs]
    Frame,
    Graph,
    ToolContext,
)
from activegraph.runtime.behavior_graph import (  # pyright: ignore[reportMissingTypeStubs]
    BehaviorGraph,
)
from pydantic import ValidationError

from attune_activegraph.research.ledger import (
    ledger_packet_index,
    ledger_reference,
    make_interpretation_tool,
)
from attune_activegraph.research.model import (
    CapabilityProfile,
    Case,
    Claim,
    ClaimState,
    Evidence,
    InterpretationLedger,
    LedgerReference,
    Packet,
    PriorState,
    ResearchBenchSettings,
    ResearchBudget,
    Topology,
)
from attune_activegraph.research.pack import (
    InvestigationOutput,
    _investigated,  # pyright: ignore[reportPrivateUsage]
    make_research_pack,
)
from attune_activegraph.research.run import prose_control


def ledger(**updates: object) -> InterpretationLedger:
    values: dict[str, object] = {
        "case_id": "payment-retry",
        "question": "Can replay charge the same order twice?",
        "source_refs": ("attune:joern:receipt-1",),
        "retained": (
            "ORDER_KEY_EXPR = order.id",
            "CRASH_WINDOW = charge -> crash -> record",
        ),
        "omitted": ("provider implementation",),
        "assumptions": ("the same operation key reuses the first charge",),
        "next_step": "execute a keyed and unkeyed Maude retry model",
        "expected_discriminator": ("unkeyed reaches two charges while keyed does not"),
        "limitations": ("provider key lifetime is not established",),
    }
    values.update(updates)
    return InterpretationLedger.model_validate(values)


def settings(profile: CapabilityProfile) -> ResearchBenchSettings:
    return ResearchBenchSettings(
        topology=Topology.SINGLE,
        capability_profile=profile,
        prior_state=PriorState.COLD,
        case_id="payment-retry",
        campaign_id="ledger-fixture",
        aggregate_budget=ResearchBudget(
            prompt_tokens=10,
            completion_tokens=10,
            model_calls=2,
        ),
    )


def context() -> ToolContext:
    return ToolContext(
        behavior_name="investigate",
        event_id="event-ledger",
        frame=Frame(goal="research", id="frame-ledger"),
        idempotency_key="ledger-tool-call",
        timeout_seconds=30,
        logger=logging.getLogger("test"),
        external_io_mode="runtime_recorded",
    )


def test_ledger_is_closed_frozen_non_empty_and_content_addressed() -> None:
    first = ledger()
    assert first.ledger_digest.startswith("sha256:")
    assert first.ledger_digest == ledger().ledger_digest
    assert first.ledger_digest != ledger(next_step="run a property").ledger_digest

    with pytest.raises(ValidationError, match="frozen"):
        first.question = "changed"
    with pytest.raises(ValidationError, match="at least 1 item"):
        ledger(source_refs=())
    with pytest.raises(ValidationError, match="at least 1 character"):
        ledger(retained=("",))
    with pytest.raises(ValidationError, match="Extra inputs"):
        InterpretationLedger.model_validate(
            {
                **first.model_dump(exclude={"ledger_digest"}),
                "meaning": "not a contract field",
            }
        )


def test_record_interpretation_is_case_bound_and_deterministic() -> None:
    tool = make_interpretation_tool("payment-retry")
    assert tool.name == "record_interpretation"
    assert tool.input_schema is InterpretationLedger
    assert tool.output_schema is LedgerReference
    assert tool.deterministic is True

    body = cast(
        "Callable[[InterpretationLedger, ToolContext], LedgerReference]",
        tool.fn,
    )
    value = ledger()
    assert body(value, context()) == LedgerReference(ref=ledger_reference(value))
    with pytest.raises(ValueError, match="configured case"):
        body(ledger(case_id="another-case"), context())


def test_every_arm_gets_the_ledger_tool_and_attune_adds_only_eight(
    tmp_path: Path,
) -> None:
    conventional = make_research_pack(
        settings=settings(CapabilityProfile.CONVENTIONAL),
        workspace_root=str(tmp_path),
        run_identity="run",
    )
    treatment = make_research_pack(
        settings=settings(CapabilityProfile.ATTUNE),
        workspace_root=str(tmp_path),
        run_identity="run",
    )

    assert [tool.name for tool in conventional.tools].count("record_interpretation") == 1
    assert [tool.name for tool in treatment.tools].count("record_interpretation") == 1
    assert len(treatment.tools) == len(conventional.tools) + 8
    for behavior in conventional.behaviors:
        assert behavior.where == {"object.type": "Case"}
        assert getattr(behavior, "max_tool_turns", None) == 16


def test_case_handler_emits_explicit_relation_and_merges_ledger_refs() -> None:
    graph = Graph(run_id="ledger-handler")
    case = Case(
        id="payment-retry",
        repository="fixture",
        revision="a" * 40,
        question="Can replay charge twice?",
        evaluator="payment-retry-v1",
        public_description="Inspect payment replay behavior.",
    )
    case_object = graph.add_object("Case", case.model_dump(mode="json"))
    event = graph.events[-1]
    behavior_graph = BehaviorGraph(
        graph,
        actor="investigate",
        caused_by=event.id,
        frame_id=None,
    )
    ledger_ref = ledger_reference(ledger())
    output = InvestigationOutput(
        case_id=case.id,
        claim=Claim(
            id="claim-1",
            statement="The unkeyed charge can be replayed.",
            state=ClaimState.CHALLENGED,
        ),
        evidence=Evidence(
            id="evidence-1",
            summary="A minimized replay charges twice.",
            refs=("attune:receipt:property-1", ledger_ref),
        ),
        relation="challenges",
        ledger_refs=(ledger_ref, "attune:artifact:counterexample-1"),
    )

    _investigated(event, behavior_graph, None, output)

    evidence = graph.objects(type="Evidence")
    assert len(evidence) == 1
    assert evidence[0].data["refs"] == [
        "attune:receipt:property-1",
        ledger_ref,
        "attune:artifact:counterexample-1",
    ]
    assert [(relation.type, relation.target) for relation in graph.relations()] == [
        ("addresses", case_object.id),
        ("challenges", graph.objects(type="Claim")[0].id),
    ]


def test_packet_index_and_prose_keep_semantics_without_coordinates() -> None:
    first = ledger()
    revision = ledger(
        assumptions=("provider key lifetime exceeds the application retry horizon",),
        supersedes=ledger_reference(first),
    )
    packet = Packet(
        motif_id="retryable-payment",
        source_case_ids=("payment-retry",),
        source_run_ids=("run-1",),
        source_artifact_refs=("attune:artifact:packet-source",),
        claim="Replay needs stable operation identity.",
        ledgers=(first, revision),
    )

    index = ledger_packet_index((packet,))
    superseded = revision.supersedes
    assert superseded is not None
    assert index[ledger_reference(first)] == (packet.packet_digest,)
    assert index[ledger_reference(revision)] == (packet.packet_digest,)
    assert revision.supersedes == ledger_reference(first)

    prose = prose_control(packet)
    for semantic in (
        *first.retained,
        *first.omitted,
        *first.assumptions,
        *first.limitations,
        *revision.assumptions,
    ):
        assert semantic in prose
    for coordinate in (
        *first.source_refs,
        first.next_step,
        first.expected_discriminator,
        superseded,
        packet.source_artifact_refs[0],
    ):
        assert coordinate not in prose


def test_documented_research_pack_is_production_shaped_and_names_native_files() -> None:
    guide = (Path(__file__).resolve().parents[4] / "packages/attune-guide/src/index.ts").read_text()

    def fences(language: str) -> list[str]:
        blocks: list[str] = []
        lines: list[str] = []
        inside = False
        for line in guide.splitlines():
            marker = line.strip()
            if marker == f"* ```{language}":
                inside = True
                lines = []
            elif inside and marker == "* ```":
                blocks.append("\n".join(lines))
                inside = False
            elif inside:
                source = line.lstrip()[1:]
                lines.append(source[1:] if source.startswith(" ") else source)
        return blocks

    python_blocks = fences("python")
    assert len(python_blocks) == 1
    declaration = python_blocks[0]
    compile(declaration, "<attune-guide-research-pack>", "exec")
    assert "def make_research_pack(" in declaration
    for token in (
        "make_workspace_tools",
        "make_pack",
        "make_interpretation_tool",
        "Pack",
        "Case",
        "Claim",
        "Evidence",
        "Result",
        "investigate",
        "synthesize",
        "supports",
        "challenges",
        "def make_interpretation_tool(case_id: str) -> Tool:",
        "input_model=InterpretationLedger",
        "output_model=LedgerReference",
        "deterministic=True",
        "if ledger.case_id != case_id:",
        "return LedgerReference(ref=ledger_reference(ledger))",
    ):
        assert token in declaration

    for obsolete in (
        "ToolCall",
        "PAYMENT_MODEL_CALL",
        "PAYMENT_PROPERTY_CALL",
        "PAYMENT_RULE_CALL",
        "PAYMENT_MODEL_LEDGER",
        "PAYMENT_PROPERTY_LEDGER",
        "PAYMENT_RULE_LEDGER",
    ):
        assert obsolete not in guide

    for native_file in (
        "joern-output.json",
        "stdout.txt",
        "run-details.json",
        "counterexample.json",
        "findings.jsonl",
    ):
        assert native_file in guide

    for invented_coordinate in (
        "joern.summary",
        "attune:joern:",
        "attune:maude:",
        "attune:property:",
        "workspace_write",
        '"query_ref"',
        '"output_ref"',
        '"findings_ref"',
        "<exact ActiveGraph run id>",
    ):
        assert invented_coordinate not in guide
    assert guide.count('mcp.call("repository_checkpoint"') == 2
    assert guide.count('mcp.call("artifact_promote"') == 1
    assert "checkpoint-payment-research-01" in guide
    assert "repo/payment-retry.property.ts" in guide
    assert "operation-scoped" in guide
    assert "ordinary access to the mounted worktree" not in guide
    assert 'from "./src/fulfill-order.ts"' in guide

    packet_blocks = [block for block in fences("json") if '"motif_id"' in block]
    assert len(packet_blocks) == 1
    packet_source = packet_blocks[0]
    assert set(re.findall(r"\{([^{}\n]+)\}", packet_source)) == {"id"}
    packet = Packet.model_validate(
        json.loads(packet_source.replace("{id}", "investigation-payment-retry-01"))
    )
    assert len(packet.joern_queries) == 1
    assert packet.joern_queries[0].cpgql is not None
    assert packet.joern_queries[0].dsl is None
    assert len(packet.lowerings) == 1
    lowering = packet.lowerings[0]
    assert lowering.kind == "ast-grep"
    assert lowering.artifact_ref is not None
    assert lowering.proven_scope is not None
    assert lowering.omitted_semantics

    retained_rows = [
        json.loads(block) for block in fences("json") if '"call": "findPayment"' in block
    ]
    assert retained_rows == [
        [
            {
                "call": "findPayment",
                "code": "services.orders.findPayment(order.id)",
                "file": "src/fulfill-order.ts",
                "line": 26,
            },
            {
                "call": "charge",
                "code": "services.payments.charge(order.customerId, order.totalCents)",
                "file": "src/fulfill-order.ts",
                "line": 29,
            },
            {
                "call": "crashPoint",
                "code": 'services.crashPoint("after-charge")',
                "file": "src/fulfill-order.ts",
                "line": 33,
            },
            {
                "call": "recordPaid",
                "code": "services.orders.recordPaid(order.id, payment.id)",
                "file": "src/fulfill-order.ts",
                "line": 34,
            },
        ]
    ]

    findings = [
        json.loads(block)
        for block in fences("json")
        if '"ruleId":"review-retryable-payment-without-operation-key"' in block
    ]
    assert len(findings) == 1
    finding = findings[0]
    assert finding["range"] == {
        "byteOffset": {"start": 750, "end": 823},
        "start": {"line": 28, "column": 24},
        "end": {"line": 31, "column": 3},
    }
    assert finding["metaVariables"]["single"]["TOTAL_CENTS"]["range"]["byteOffset"] == {
        "start": 802,
        "end": 818,
    }
    assert finding["metaVariables"]["single"]["CUSTOMER_ID"]["range"]["byteOffset"] == {
        "start": 780,
        "end": 796,
    }
    assert finding["metaVariables"]["single"]["PAYMENTS"]["range"]["byteOffset"] == {
        "start": 750,
        "end": 767,
    }
    assert finding["note"] is None
    assert finding["labels"] == [
        {
            "text": finding["text"],
            "range": finding["range"],
            "style": "primary",
        }
    ]
