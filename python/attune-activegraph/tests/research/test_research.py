from __future__ import annotations

import json
from pathlib import Path

import pytest
from activegraph import Graph, Runtime  # pyright: ignore[reportMissingTypeStubs]

from attune_activegraph.research.model import (
    CapabilityProfile,
    ClaimState,
    Packet,
    PriorState,
    ResearchBenchSettings,
    ResearchBudget,
    Result,
    RunStatus,
    Topology,
    TrialMetrics,
    TrialRecord,
)
from attune_activegraph.research.pack import make_research_pack
from attune_activegraph.research.report import (
    approve,
    export_bundle,
    make_manifest,
    schema_drift,
    validate_report,
)
from attune_activegraph.research.run import (
    cold_campaign,
    prompt_digest,
    prose_control,
    transfer_campaign,
)
from attune_activegraph.research.score import evaluate_snapshot_revalidation
from attune_activegraph.research.workspace import WorkspacePolicyError, conventional_command_allowed


def result() -> Result:
    return Result(
        case_id="snapshot-revalidation",
        primary_claim="writer lock requires revalidation",
        claim_ids=("claim-1",),
        evidence_ids=("evidence-1",),
        locations=("artifact_promote", "repository_checkpoint"),
        falsifier="property-ref",
        residual_uncertainty=("helper ordering is not syntactically complete",),
        final_state=ClaimState.SUPPORTED,
    )


def record() -> TrialRecord:
    settings = ResearchBenchSettings(
        topology=Topology.SINGLE,
        capability_profile=CapabilityProfile.CONVENTIONAL,
        prior_state=PriorState.COLD,
        case_id="snapshot-revalidation",
        campaign_id="cold-capability-calibration",
        aggregate_budget=ResearchBudget(prompt_tokens=10, completion_tokens=10, model_calls=1),
    )
    return TrialRecord(
        run_id="run-1",
        arm_id="A",
        case_id="snapshot-revalidation",
        seed="1",
        status=RunStatus.COMPLETED,
        settings=settings,
        trace_address="sha256:trace",
        metrics=TrialMetrics(prompt_tokens=10, completion_tokens=5),
        evaluation=evaluate_snapshot_revalidation(result()),
    )


def test_cold_campaign_is_twelve_fresh_definitions() -> None:
    campaign = cold_campaign()
    assert len(campaign) == 12
    assert len({trial.id for trial in campaign}) == 12
    assert {trial.arm_id for trial in campaign} == {"A", "B", "C"}
    assert all(trial.settings.prompt_digest == prompt_digest() for trial in campaign)


def test_transfer_is_twelve_and_prose_excludes_executable_material() -> None:
    packet = Packet(
        motif_id="snapshot",
        source_case_ids=("snapshot-revalidation",),
        source_run_ids=("run-1",),
        source_artifact_refs=("sha256:artifact",),
        claim="revalidate after writer authority",
        applicability=("mutating operation",),
        joern_queries=("cpg query",),
        formal_artifacts=("maude-ref",),
    )
    assert "cpg query" not in prose_control(packet)
    assert len(transfer_campaign(packet)) == 12


def test_conventional_policy_denies_treatment_and_shell_escapes() -> None:
    for argv in (("joern",), ("nix", "develop"), ("bash", "-c", "attune-mcp")):
        with pytest.raises(WorkspacePolicyError):
            conventional_command_allowed(argv)
    conventional_command_allowed(("git", "status"))


def test_pack_has_only_four_objects_and_adds_eight_treatment_tools(tmp_path: Path) -> None:
    base = ResearchBenchSettings(
        topology=Topology.SINGLE,
        capability_profile=CapabilityProfile.CONVENTIONAL,
        prior_state=PriorState.COLD,
        case_id="snapshot-revalidation",
        campaign_id="fixture",
        aggregate_budget=ResearchBudget(prompt_tokens=1, completion_tokens=1, model_calls=1),
    )
    conventional = make_research_pack(
        settings=base, workspace_root=str(tmp_path), run_identity="run"
    )
    treatment = make_research_pack(
        settings=base.model_copy(update={"capability_profile": CapabilityProfile.ATTUNE}),
        workspace_root=str(tmp_path),
        run_identity="run",
    )
    assert [item.name for item in conventional.object_types] == [
        "Case",
        "Claim",
        "Evidence",
        "Result",
    ]
    assert len(treatment.tools) == len(conventional.tools) + 8
    assert [behavior.name for behavior in conventional.behaviors] == ["investigate", "synthesize"]
    runtime = Runtime(Graph(run_id="research-smoke"), behaviors=(), tools=())
    assert runtime.load_pack(conventional, settings=base)


def test_report_bundle_is_derived_and_immutable(tmp_path: Path) -> None:
    manifest = make_manifest(
        experiment_id="fixture-experiment",
        campaign_id="cold-capability-calibration",
        title="Fixture experiment",
        questions=("Does a fixture work?",),
        source_revision="fixture",
        pack_digest="sha256:pack",
        evaluator_digest="sha256:evaluator",
        runs=(record(),),
    )
    from attune_activegraph.research.model import Certainty, Report, ReportClaim, ReportSection

    metric = "aggregate:A:accepted_rate"
    report = Report(
        experiment_id=manifest.experiment_id,
        manifest_digest=manifest.manifest_digest,
        title="Fixture experiment",
        abstract="A bounded fixture result.",
        sections=(
            ReportSection(
                id="result",
                heading="Result",
                prose="The fixture is accepted.",
                claims=(
                    ReportClaim(
                        id="rate",
                        statement="Measured acceptance.",
                        certainty=Certainty.MEASURED,
                        metric_refs=(metric,),
                        value=1.0,
                    ),
                ),
            ),
        ),
        limitations=("Fixture only.",),
        threats_to_validity=("No live provider was invoked.",),
    )
    assert validate_report(report, manifest) == ()
    approval = approve(
        report,
        manifest,
        reviewer="tester",
        decision_id="decision",
        decided_at="2026-07-28T00:00:00Z",
    )
    bundle = export_bundle(
        tmp_path,
        "fixture",
        manifest,
        report,
        approval,
        activegraph_publication_address="sha256:graph",
    )
    assert (
        json.loads((tmp_path / "fixture/publication.json").read_text())["publication_digest"]
        == bundle.publication_digest
    )
    with pytest.raises(ValueError, match="approval does not bind"):
        export_bundle(
            tmp_path,
            "fixture",
            manifest,
            report.model_copy(update={"title": "changed"}),
            approval,
            activegraph_publication_address="sha256:graph",
        )


def test_checked_in_schemas_match_python_models() -> None:
    root = Path(__file__).parents[4] / "packages/attune-docs/schema"
    assert schema_drift(root) == ()
