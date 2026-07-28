from __future__ import annotations

import hashlib
import json
import runpy
import subprocess
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import cast

import pytest
from activegraph import Graph, Runtime  # pyright: ignore[reportMissingTypeStubs]
from activegraph.packs import (  # pyright: ignore[reportMissingTypeStubs]
    clear_discovery_cache,
    discover,
)

from attune_activegraph.pack import pack as effect_tools_pack
from attune_activegraph.provenance import (
    AGENT_CONFIGURATION,
    AGENT_RUN,
    APPROVAL_CARRIED_FORWARD_BY,
    APPROVAL_CARRY_FORWARD,
    APPROVAL_DECISION,
    APPROVED_BY,
    CARRIES_APPROVAL_FROM,
    CITES,
    DEFAULT_PROVENANCE_ACTOR,
    GUIDE_DRAFT,
    GUIDE_SECTION,
    INVALIDATES,
    INVALIDATION,
    MANIFEST_FACT,
    PRODUCED_BY,
    PROMPT,
    PUBLICATION_REVISION,
    RENDERED_ARTIFACT,
    RENDERS,
    RESEARCH_CLAIM,
    REVALIDATES_APPROVAL,
    SOURCE_REVISION,
    TOOL_CALL,
    VALIDATED_BY,
    VALIDATION_RESULT,
    AgentConfiguration,
    AgentKind,
    AgentRun,
    ApprovalCarryForward,
    ApprovalDecision,
    ApprovalOutcome,
    Certainty,
    DocumentationAuthority,
    DocumentationAuthorityScope,
    DocumentationProvenance,
    DocumentationTrustPolicy,
    EvidenceRecord,
    GuideDraft,
    GuideSection,
    InvalidationRecord,
    ManifestFact,
    ManifestFactChange,
    ManifestInput,
    NodeRef,
    PromptRecord,
    ProvenanceInvariantError,
    ProvenanceKind,
    PublicationRevision,
    RenderedArtifact,
    ResearchClaim,
    RunStatus,
    SourceRevision,
    ToolCallRecord,
    ToolCallStatus,
    TraceEdge,
    TraceExport,
    TraceNode,
    ValidationOutcome,
    ValidationResult,
    provenance_pack,
)


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


type ReviewRef = NodeRef[ResearchClaim] | NodeRef[GuideDraft]
type ValidationRef = (
    NodeRef[ResearchClaim] | NodeRef[GuideSection] | NodeRef[GuideDraft] | NodeRef[RenderedArtifact]
)
type TestDocumentationProvenance = DocumentationProvenance[object]

_VALIDATOR_AUTHORITY = object()
_REVIEWER_AUTHORITY = object()
_WORKFLOW_AUTHORITY = object()
_PUBLISHER_AUTHORITY = object()
_VALIDATOR_AS_REVIEW_AUTHORITY = object()
_REVIEWER_AS_VALIDATION_AUTHORITY = object()
_WORKFLOW_AS_PUBLICATION_AUTHORITY = object()
_PUBLISHER_AS_WORKFLOW_AUTHORITY = object()


def _resolve_test_authority(
    credential: object,
) -> DocumentationAuthority | None:
    if credential is _VALIDATOR_AUTHORITY:
        return DocumentationAuthority(
            DocumentationAuthorityScope.VALIDATION,
            "grounding-validator",
            "1.0.0",
        )
    if credential is _REVIEWER_AUTHORITY:
        return DocumentationAuthority(
            DocumentationAuthorityScope.REVIEW,
            "maintainer@example.com",
            "documentation-maintainer",
        )
    if credential is _WORKFLOW_AUTHORITY:
        return DocumentationAuthority(
            DocumentationAuthorityScope.APPROVAL_CARRY_FORWARD,
            "documentation-approval-revalidator",
            "1.0.0",
        )
    if credential is _PUBLISHER_AUTHORITY:
        return DocumentationAuthority(
            DocumentationAuthorityScope.PUBLICATION,
            "release-workflow",
        )
    if credential is _VALIDATOR_AS_REVIEW_AUTHORITY:
        return DocumentationAuthority(
            DocumentationAuthorityScope.REVIEW,
            "grounding-validator",
            "documentation-maintainer",
        )
    if credential is _REVIEWER_AS_VALIDATION_AUTHORITY:
        return DocumentationAuthority(
            DocumentationAuthorityScope.VALIDATION,
            "maintainer@example.com",
            "1.0.0",
        )
    if credential is _WORKFLOW_AS_PUBLICATION_AUTHORITY:
        return DocumentationAuthority(
            DocumentationAuthorityScope.PUBLICATION,
            "documentation-approval-revalidator",
        )
    if credential is _PUBLISHER_AS_WORKFLOW_AUTHORITY:
        return DocumentationAuthority(
            DocumentationAuthorityScope.APPROVAL_CARRY_FORWARD,
            "release-workflow",
            "1.0.0",
        )
    return None


def _record_validation(
    provenance: TestDocumentationProvenance,
    subject: ValidationRef,
    *,
    identity: str,
    time: str,
    outcome: ValidationOutcome = ValidationOutcome.PASSED,
) -> NodeRef[ValidationResult]:
    return provenance.record_validation(
        ValidationResult(
            subject_address=subject.record.content_address,
            validation_id=identity,
            validation_time=time,
            validator="grounding-validator",
            validator_version="1.0.0",
            outcome=outcome,
            checks=("known-facts", "current-revision", "no-asserted-open-questions"),
        ),
        subject=subject,
        authority=_VALIDATOR_AUTHORITY,
    )


def _record_approval(
    provenance: TestDocumentationProvenance,
    subject: ReviewRef,
    *,
    identity: str,
    time: str,
    outcome: ApprovalOutcome = ApprovalOutcome.APPROVED,
    reviewer: str = "maintainer@example.com",
) -> NodeRef[ApprovalDecision]:
    binding = provenance.review_binding(subject)
    return provenance.record_approval(
        ApprovalDecision(
            subject_address=subject.record.content_address,
            decision_id=identity,
            source_revision=binding.source_revision,
            manifest_digest=binding.manifest_digest,
            draft_digest=binding.draft_digest,
            evidence_digest=binding.evidence_digest,
            reviewer=reviewer,
            reviewer_role="documentation-maintainer",
            outcome=outcome,
            decision_time=time,
            rationale="Evidence and prose agree.",
        ),
        subject=subject,
        authority=_REVIEWER_AUTHORITY,
    )


@dataclass(frozen=True)
class _Scenario:
    provenance: TestDocumentationProvenance
    source: NodeRef[SourceRevision]
    manifest: NodeRef[ManifestInput]
    research_run: NodeRef[AgentRun]
    documentation_run: NodeRef[AgentRun]
    maude_fact: NodeRef[ManifestFact]
    maude_metadata_fact: NodeRef[ManifestFact]
    joern_fact: NodeRef[ManifestFact]
    maude_claim: NodeRef[ResearchClaim]
    joern_claim: NodeRef[ResearchClaim]
    maude_section: NodeRef[GuideSection]
    joern_section: NodeRef[GuideSection]
    maude_draft: NodeRef[GuideDraft]
    joern_draft: NodeRef[GuideDraft]
    maude_approval: NodeRef[ApprovalDecision]
    maude_artifact: NodeRef[RenderedArtifact]
    joern_artifact: NodeRef[RenderedArtifact]


def _approved_scenario(
    *,
    preseed_unrelated_object: bool = False,
    provenance: TestDocumentationProvenance | None = None,
) -> _Scenario:
    if provenance is None:
        runtime = Runtime(Graph(run_id="docs-provenance-test"))
        provenance = DocumentationProvenance[object].install(
            runtime,
            authority_resolver=_resolve_test_authority,
        )
    if preseed_unrelated_object:
        provenance.record_agent_configuration(
            AgentConfiguration(
                agent_name="unrelated-agent",
                agent_version="1",
                model="unrelated-model",
            )
        )

    source = provenance.record_source_revision(
        SourceRevision(
            repository="attune-main-v2",
            revision="abc123",
            source_digest=_digest("source-tree"),
        )
    )
    manifest = provenance.record_manifest_input(
        ManifestInput(
            revision="manifest-v1",
            manifest_digest=_digest("manifest-v1"),
            locator="reference/api-manifest.json",
        )
    )
    maude_fact = provenance.record_manifest_fact(
        ManifestFact(
            fact_id="tool.maude_run.signature",
            symbol_id="tools.maude.MaudeRun",
            kind="signature",
            value={"input": "MaudeRunInput", "result": "MaudeRunResult"},
        ),
        manifest=manifest,
    )
    maude_metadata_fact = provenance.record_manifest_fact(
        ManifestFact(
            fact_id="tool.maude_run.documentation-metadata",
            symbol_id="tools.maude.MaudeRun",
            kind="documentation-metadata",
            value={"category": "execution", "manifestNote": "v1"},
        ),
        manifest=manifest,
    )
    joern_fact = provenance.record_manifest_fact(
        ManifestFact(
            fact_id="tool.joern_query.signature",
            symbol_id="tools.joern.JoernQuery",
            kind="signature",
            value={"input": "JoernQueryInput", "result": "JoernQueryResult"},
        ),
        manifest=manifest,
    )

    research_configuration = provenance.record_agent_configuration(
        AgentConfiguration(
            agent_name="repository-researcher",
            agent_version="2.1.0",
            model="research-model",
            settings={"privateApiKey": "must-not-enter-public-trace"},
        )
    )
    research_run = provenance.record_run(
        AgentRun(
            run_identity="research-run-1",
            kind=AgentKind.RESEARCH,
            status=RunStatus.COMPLETED,
            agent_name="repository-researcher",
            agent_version="2.1.0",
        ),
        configuration=research_configuration,
        inputs=(source, manifest),
    )
    provenance.record_prompt(
        PromptRecord(
            name="explain-tool-lifecycle",
            version="1",
            body="private prompt body must not enter the public trace",
        ),
        run=research_run,
    )
    provenance.record_tool_call(
        ToolCallRecord(
            call_id="research-tool-1",
            tool_name="maude_run",
            arguments={"secret": "must-not-enter-public-trace"},
            result={"private": "must-not-enter-public-trace"},
            status=ToolCallStatus.COMPLETED,
        ),
        run=research_run,
    )

    evidence = provenance.record_evidence(
        EvidenceRecord(
            evidence_id="source.investigation-service",
            kind="source",
            locator="packages/attune-mcp/src/investigation/service.ts",
            excerpt="Private source excerpt is retained internally only.",
        ),
        run=research_run,
        derived_from=(source,),
    )
    maude_claim = provenance.record_research_claim(
        ResearchClaim(
            claim_id="research.maude.typed-result",
            text="Maude execution retains its operation-specific result type.",
            certainty=Certainty.DIRECT,
        ),
        run=research_run,
        derived_from=(maude_fact, evidence),
        cites=(maude_fact,),
    )
    _record_validation(
        provenance,
        maude_claim,
        identity="validate-maude-claim",
        time="2026-07-27T11:40:00Z",
    )
    _record_approval(
        provenance,
        maude_claim,
        identity="approve-maude-claim",
        time="2026-07-27T11:45:00Z",
    )

    joern_claim = provenance.record_research_claim(
        ResearchClaim(
            claim_id="research.joern.typed-result",
            text="Joern queries retain their operation-specific result type.",
            certainty=Certainty.DIRECT,
        ),
        run=research_run,
        derived_from=(joern_fact,),
        cites=(joern_fact,),
    )
    _record_validation(
        provenance,
        joern_claim,
        identity="validate-joern-claim",
        time="2026-07-27T11:41:00Z",
    )
    _record_approval(
        provenance,
        joern_claim,
        identity="approve-joern-claim",
        time="2026-07-27T11:46:00Z",
    )

    documentation_configuration = provenance.record_agent_configuration(
        AgentConfiguration(
            agent_name="onboarding-writer",
            agent_version="3.0.0",
            model="documentation-model",
            settings={"audience": "new-contributor"},
        )
    )
    documentation_run = provenance.record_run(
        AgentRun(
            run_identity="documentation-run-1",
            kind=AgentKind.DOCUMENTATION,
            status=RunStatus.COMPLETED,
            agent_name="onboarding-writer",
            agent_version="3.0.0",
        ),
        configuration=documentation_configuration,
        inputs=(source, manifest),
    )

    maude_section = provenance.record_guide_section(
        GuideSection(
            guide_id="investigation-quickstart",
            section_id="run-maude",
            heading="Run a Maude operation",
            prose="Execute Maude through the active investigation capability.",
            claim_ids=(maude_claim.record.claim_id,),
            manifest_revision=manifest.record.revision,
        ),
        run=documentation_run,
        informed_by=(maude_claim,),
        cites=(maude_fact, maude_metadata_fact),
    )
    _record_validation(
        provenance,
        maude_section,
        identity="validate-maude-section",
        time="2026-07-27T11:50:00Z",
    )
    maude_draft = provenance.record_guide_draft(
        GuideDraft(
            guide_id=maude_section.record.guide_id,
            source_revision=source.record.revision,
            manifest_revision=manifest.record.revision,
            manifest_digest=manifest.record.manifest_digest,
            draft_digest=_digest("complete maude guide draft"),
            evidence_digest=_digest("complete maude guide evidence"),
            section_addresses=(maude_section.record.content_address,),
        ),
        run=documentation_run,
        source=source,
        manifest=manifest,
        sections=(maude_section,),
    )
    _record_validation(
        provenance,
        maude_draft,
        identity="validate-maude-draft",
        time="2026-07-27T11:52:00Z",
    )
    maude_approval = _record_approval(
        provenance,
        maude_draft,
        identity="approve-maude-draft",
        time="2026-07-27T12:00:00Z",
    )

    joern_section = provenance.record_guide_section(
        GuideSection(
            guide_id="joern-quickstart",
            section_id="run-query",
            heading="Run a Joern query",
            prose="Execute CPGQL through the active investigation capability.",
            claim_ids=(joern_claim.record.claim_id,),
            manifest_revision=manifest.record.revision,
        ),
        run=documentation_run,
        informed_by=(joern_claim,),
        cites=(joern_fact,),
    )
    _record_validation(
        provenance,
        joern_section,
        identity="validate-joern-section",
        time="2026-07-27T11:51:00Z",
    )
    joern_draft = provenance.record_guide_draft(
        GuideDraft(
            guide_id=joern_section.record.guide_id,
            source_revision=source.record.revision,
            manifest_revision=manifest.record.revision,
            manifest_digest=manifest.record.manifest_digest,
            draft_digest=_digest("complete joern guide draft"),
            evidence_digest=_digest("complete joern guide evidence"),
            section_addresses=(joern_section.record.content_address,),
        ),
        run=documentation_run,
        source=source,
        manifest=manifest,
        sections=(joern_section,),
    )
    _record_validation(
        provenance,
        joern_draft,
        identity="validate-joern-draft",
        time="2026-07-27T11:53:00Z",
    )
    _record_approval(
        provenance,
        joern_draft,
        identity="approve-joern-draft",
        time="2026-07-27T12:01:00Z",
    )

    maude_artifact = provenance.record_rendered_artifact(
        RenderedArtifact(
            guide_id=maude_draft.record.guide_id,
            path="guides/investigation-quickstart/index.html",
            media_type="text/html",
            artifact_digest=_digest("rendered-maude-guide"),
            renderer="attune-static-docs",
            renderer_version="1.0.0",
        ),
        run=documentation_run,
        draft=maude_draft,
    )
    joern_artifact = provenance.record_rendered_artifact(
        RenderedArtifact(
            guide_id=joern_draft.record.guide_id,
            path="guides/joern-quickstart/index.html",
            media_type="text/html",
            artifact_digest=_digest("rendered-joern-guide"),
            renderer="attune-static-docs",
            renderer_version="1.0.0",
        ),
        run=documentation_run,
        draft=joern_draft,
    )
    provenance.record_publication(
        PublicationRevision(
            guide_id=maude_draft.record.guide_id,
            revision="pages-1",
            site="https://example.github.io/attune/",
            published_by="release-workflow",
            artifact_address=maude_artifact.record.content_address,
        ),
        artifact=maude_artifact,
        authority=_PUBLISHER_AUTHORITY,
    )

    return _Scenario(
        provenance=provenance,
        source=source,
        manifest=manifest,
        research_run=research_run,
        documentation_run=documentation_run,
        maude_fact=maude_fact,
        maude_metadata_fact=maude_metadata_fact,
        joern_fact=joern_fact,
        maude_claim=maude_claim,
        joern_claim=joern_claim,
        maude_section=maude_section,
        joern_section=joern_section,
        maude_draft=maude_draft,
        joern_draft=joern_draft,
        maude_approval=maude_approval,
        maude_artifact=maude_artifact,
        joern_artifact=joern_artifact,
    )


@dataclass(frozen=True)
class _CurrentMetadataRevision:
    prior: _Scenario
    source: NodeRef[SourceRevision]
    manifest: NodeRef[ManifestInput]
    metadata_fact: NodeRef[ManifestFact]
    documentation_run: NodeRef[AgentRun]
    section: NodeRef[GuideSection]
    draft: NodeRef[GuideDraft]


@dataclass(frozen=True)
class _CarryForwardScenario:
    current: _CurrentMetadataRevision
    carry_forward: NodeRef[ApprovalCarryForward]
    artifact: NodeRef[RenderedArtifact]


def _current_metadata_revision(
    *,
    preseed_unrelated_object: bool = False,
    provenance: TestDocumentationProvenance | None = None,
    draft_digest: str | None = None,
    evidence_digest: str | None = None,
    prose: str | None = None,
    include_unreviewed_evidence: bool = False,
) -> _CurrentMetadataRevision:
    prior = _approved_scenario(
        preseed_unrelated_object=preseed_unrelated_object,
        provenance=provenance,
    )
    provenance = prior.provenance
    source = provenance.record_source_revision(
        SourceRevision(
            repository=prior.source.record.repository,
            revision="def456",
            source_digest=_digest("source-tree-with-unrelated-metadata"),
        )
    )
    manifest = provenance.record_manifest_input(
        ManifestInput(
            revision="manifest-v2-metadata-only",
            manifest_digest=_digest("manifest-v2-metadata-only"),
            locator=prior.manifest.record.locator,
        )
    )
    provenance.record_manifest_fact(prior.maude_fact.record, manifest=manifest)
    metadata_fact = provenance.record_manifest_fact(
        prior.maude_metadata_fact.record,
        manifest=manifest,
    )
    if include_unreviewed_evidence:
        provenance.record_manifest_fact(prior.joern_fact.record, manifest=manifest)
    documentation_configuration = provenance.record_agent_configuration(
        AgentConfiguration(
            agent_name="onboarding-writer",
            agent_version="3.0.0",
            model="documentation-model",
            settings={"audience": "new-contributor"},
        )
    )
    documentation_run = provenance.record_run(
        AgentRun(
            run_identity="documentation-run-2",
            kind=AgentKind.DOCUMENTATION,
            status=RunStatus.COMPLETED,
            agent_name="onboarding-writer",
            agent_version="3.0.0",
        ),
        configuration=documentation_configuration,
        inputs=(source, manifest),
    )
    section = provenance.record_guide_section(
        GuideSection(
            guide_id=prior.maude_section.record.guide_id,
            section_id=prior.maude_section.record.section_id,
            heading=prior.maude_section.record.heading,
            prose=prose or prior.maude_section.record.prose,
            claim_ids=prior.maude_section.record.claim_ids,
            manifest_revision=manifest.record.revision,
        ),
        run=documentation_run,
        informed_by=(prior.maude_claim,),
        cites=(
            prior.maude_fact,
            metadata_fact,
            *((prior.joern_fact,) if include_unreviewed_evidence else ()),
        ),
    )
    _record_validation(
        provenance,
        section,
        identity="validate-maude-section-metadata-v2",
        time="2026-07-27T12:08:00Z",
    )
    draft = provenance.record_guide_draft(
        GuideDraft(
            guide_id=section.record.guide_id,
            source_revision=source.record.revision,
            manifest_revision=manifest.record.revision,
            manifest_digest=manifest.record.manifest_digest,
            draft_digest=draft_digest or prior.maude_draft.record.draft_digest,
            evidence_digest=evidence_digest or prior.maude_draft.record.evidence_digest,
            section_addresses=(section.record.content_address,),
        ),
        run=documentation_run,
        source=source,
        manifest=manifest,
        sections=(section,),
    )
    _record_validation(
        provenance,
        draft,
        identity="validate-maude-draft-metadata-v2",
        time="2026-07-27T12:09:00Z",
    )
    return _CurrentMetadataRevision(
        prior=prior,
        source=source,
        manifest=manifest,
        metadata_fact=metadata_fact,
        documentation_run=documentation_run,
        section=section,
        draft=draft,
    )


def _carry_forward_record(
    current: _CurrentMetadataRevision,
    *,
    draft_digest: str | None = None,
    evidence_digest: str | None = None,
    prior_approval: NodeRef[ApprovalDecision] | None = None,
    reason: str = "Only source and manifest metadata changed.",
    revalidation_time: str = "2026-07-27T12:10:00Z",
) -> ApprovalCarryForward:
    prior_decision = prior_approval or current.prior.maude_approval
    return ApprovalCarryForward(
        carry_forward_id="carry-forward-maude-metadata-v2",
        current_draft_address=current.draft.record.content_address,
        prior_draft_address=current.prior.maude_draft.record.content_address,
        prior_approval_address=prior_decision.record.content_address,
        draft_digest=draft_digest or current.draft.record.draft_digest,
        evidence_digest=evidence_digest or current.draft.record.evidence_digest,
        workflow="documentation-approval-revalidator",
        workflow_version="1.0.0",
        revalidation_time=revalidation_time,
        reason=reason,
    )


def _carry_forward_scenario(
    *,
    preseed_unrelated_object: bool = False,
) -> _CarryForwardScenario:
    current = _current_metadata_revision(preseed_unrelated_object=preseed_unrelated_object)
    carry_forward = current.prior.provenance.record_approval_carry_forward(
        _carry_forward_record(current),
        current_draft=current.draft,
        prior_draft=current.prior.maude_draft,
        prior_approval=current.prior.maude_approval,
        authority=_WORKFLOW_AUTHORITY,
    )
    artifact = current.prior.provenance.record_rendered_artifact(
        RenderedArtifact(
            guide_id=current.draft.record.guide_id,
            path="guides/investigation-quickstart/metadata-v2.html",
            media_type="text/html",
            artifact_digest=_digest("rendered-maude-guide-metadata-v2"),
            renderer="attune-static-docs",
            renderer_version="1.0.0",
        ),
        run=current.documentation_run,
        draft=current.draft,
    )
    return _CarryForwardScenario(
        current=current,
        carry_forward=carry_forward,
        artifact=artifact,
    )


def _record_changed_maude_fact(
    scenario: _Scenario,
) -> tuple[NodeRef[ManifestInput], NodeRef[ManifestFact]]:
    manifest = scenario.provenance.record_manifest_input(
        ManifestInput(
            revision="manifest-v2",
            manifest_digest=_digest("manifest-v2"),
            locator="reference/api-manifest.json",
        )
    )
    fact = scenario.provenance.record_manifest_fact(
        ManifestFact(
            fact_id=scenario.maude_fact.record.fact_id,
            symbol_id=scenario.maude_fact.record.symbol_id,
            kind="signature",
            value={"input": "MaudeRunInput", "result": "MaudeRunResultV2"},
        ),
        manifest=manifest,
    )
    return manifest, fact


def test_provenance_pack_is_separate_discoverable_and_shared_runtime_safe() -> None:
    assert provenance_pack.name == "attune_documentation_provenance"
    assert provenance_pack.tools == ()
    assert provenance_pack.behaviors == ()
    assert len(provenance_pack.object_types) == 18
    assert {relation.name for relation in provenance_pack.relation_types} >= {
        "derivedFrom",
        "informedBy",
        "cites",
        "validatedBy",
        "approvedBy",
        "approvalCarriedForwardBy",
        "carriesApprovalFrom",
        "revalidatesApproval",
        "renders",
    }

    clear_discovery_cache()
    discovered = {candidate.name: candidate.pack for candidate in discover()}
    assert discovered["attune_documentation_provenance"] == provenance_pack

    first_runtime = Runtime(Graph(run_id="shared-runtime-first"))
    assert first_runtime.load_pack(effect_tools_pack)
    assert first_runtime.load_pack(provenance_pack)
    second_runtime = Runtime(Graph(run_id="shared-runtime-second"))
    assert second_runtime.load_pack(provenance_pack)
    assert second_runtime.load_pack(effect_tools_pack)


def test_provenance_schema_version_is_an_exact_literal() -> None:
    with pytest.raises(ValueError, match="Input should be 1"):
        SourceRevision(
            schema_version=2,  # pyright: ignore[reportArgumentType]
            repository="attune-main-v2",
            revision="future-version",
            source_digest=_digest("future-source"),
        )


def test_public_trace_sequences_are_nonblank_unique_and_publishable() -> None:
    subject_address = f"sha256:{_digest('validation-subject')}"
    validation = {
        "subject_address": subject_address,
        "validation_id": "validation",
        "validation_time": "2026-07-27T12:00:00Z",
        "validator": "grounding-validator",
        "validator_version": "1.0.0",
        "outcome": ValidationOutcome.PASSED,
    }
    for checks in ((), (" ",), ("known-facts", "known-facts")):
        with pytest.raises(ValueError):
            ValidationResult.model_validate({**validation, "checks": checks})

    section = {
        "guide_id": "guide",
        "section_id": "section",
        "heading": "Heading",
        "prose": "Prose",
        "manifest_revision": "manifest",
    }
    for claim_ids in ((" ",), ("claim", "claim")):
        with pytest.raises(ValueError):
            GuideSection.model_validate({**section, "claim_ids": claim_ids})

    with pytest.raises(ValueError, match="must not be blank"):
        PublicationRevision(
            guide_id=" ",
            revision="revision",
            site="https://example.invalid/",
            published_by="release-workflow",
            artifact_address=f"sha256:{_digest('artifact')}",
        )
    with pytest.raises(ValueError, match="must not be blank"):
        ManifestFactChange(
            fact_id=" ",
            previous_address=subject_address,
        )


def test_approved_research_feeds_a_guide_level_reviewed_static_trace() -> None:
    scenario = _approved_scenario()

    trace = scenario.provenance.export_guide_trace("investigation-quickstart")
    assert not trace.stale
    assert {node.type for node in trace.nodes} >= {
        AGENT_RUN,
        APPROVAL_DECISION,
        GUIDE_DRAFT,
        GUIDE_SECTION,
        MANIFEST_FACT,
        PUBLICATION_REVISION,
        RESEARCH_CLAIM,
    }
    assert {edge.provenance_kind for edge in trace.edges} >= {
        ProvenanceKind.CONTENT,
        ProvenanceKind.EXECUTION,
        ProvenanceKind.REVIEW,
        ProvenanceKind.PRESENTATION,
    }
    assert all(
        node.data.get("guide_id") != "joern-quickstart"
        for node in trace.nodes
        if node.type in (GUIDE_SECTION, GUIDE_DRAFT)
    )
    draft_approval = next(
        node
        for node in trace.nodes
        if node.type == APPROVAL_DECISION
        and node.data.get("subject_address") == scenario.maude_draft.record.content_address
    )
    assert draft_approval.data["source_revision"] == scenario.source.record.revision
    assert draft_approval.data["manifest_digest"] == scenario.manifest.record.manifest_digest
    assert draft_approval.data["draft_digest"] == scenario.maude_draft.record.draft_digest
    assert draft_approval.data["evidence_digest"] == scenario.maude_draft.record.evidence_digest
    assert len(str(draft_approval.data["draft_digest"])) == 64
    assert not str(draft_approval.data["draft_digest"]).startswith("sha256:")
    draft_node = next(
        node
        for node in trace.nodes
        if node.type == GUIDE_DRAFT and node.data.get("guide_id") == "investigation-quickstart"
    )
    artifact_node = next(node for node in trace.nodes if node.type == RENDERED_ARTIFACT)
    publication_node = next(node for node in trace.nodes if node.type == PUBLICATION_REVISION)
    edge_triples = {(edge.source, edge.type, edge.target) for edge in trace.edges}
    assert (draft_node.id, "approvedBy", draft_approval.id) in edge_triples
    assert (artifact_node.id, "renders", draft_node.id) in edge_triples
    assert (publication_node.id, "renders", artifact_node.id) in edge_triples


def test_prior_approval_is_not_silently_applied_to_a_current_draft() -> None:
    current = _current_metadata_revision()

    with pytest.raises(ProvenanceInvariantError, match="currently approved guide draft"):
        current.prior.provenance.record_rendered_artifact(
            RenderedArtifact(
                guide_id=current.draft.record.guide_id,
                path="guides/investigation-quickstart/not-approved.html",
                media_type="text/html",
                artifact_digest=_digest("must-not-render-with-implicit-approval"),
                renderer="attune-static-docs",
                renderer_version="1.0.0",
            ),
            run=current.documentation_run,
            draft=current.draft,
        )


def test_metadata_only_revision_can_explicitly_carry_forward_human_approval() -> None:
    scenario = _carry_forward_scenario()
    provenance = scenario.current.prior.provenance

    assert scenario.current.source.record.content_address != (
        scenario.current.prior.source.record.content_address
    )
    assert scenario.current.manifest.record.content_address != (
        scenario.current.prior.manifest.record.content_address
    )
    assert scenario.current.section.record.heading == (
        scenario.current.prior.maude_section.record.heading
    )
    assert scenario.current.section.record.prose == (
        scenario.current.prior.maude_section.record.prose
    )
    assert scenario.current.section.record.claim_ids == (
        scenario.current.prior.maude_section.record.claim_ids
    )
    assert scenario.current.draft.record.draft_digest == (
        scenario.current.prior.maude_draft.record.draft_digest
    )
    assert scenario.current.draft.record.evidence_digest == (
        scenario.current.prior.maude_draft.record.evidence_digest
    )
    workflow_events = [
        event
        for event in provenance.graph.events
        if event.actor == "documentation-approval-revalidator"
    ]
    assert [event.type for event in workflow_events] == [
        "object.created",
        "relation.created",
        "relation.created",
        "relation.created",
    ]
    publication = provenance.record_publication(
        PublicationRevision(
            guide_id=scenario.current.draft.record.guide_id,
            revision="pages-metadata-v2",
            site="https://example.github.io/attune/",
            published_by="release-workflow",
            artifact_address=scenario.artifact.record.content_address,
        ),
        artifact=scenario.artifact,
        authority=_PUBLISHER_AUTHORITY,
    )
    assert publication.record.guide_id == scenario.current.draft.record.guide_id

    trace = provenance.export_guide_trace(scenario.current.draft.record.guide_id)
    carry_node = next(
        node
        for node in trace.nodes
        if node.content_address == scenario.carry_forward.record.content_address
    )
    current_node = next(
        node
        for node in trace.nodes
        if node.content_address == scenario.current.draft.record.content_address
    )
    prior_node = next(
        node
        for node in trace.nodes
        if node.content_address == scenario.current.prior.maude_draft.record.content_address
    )
    approval_node = next(
        node
        for node in trace.nodes
        if node.content_address == scenario.current.prior.maude_approval.record.content_address
    )
    assert carry_node.type == APPROVAL_CARRY_FORWARD
    assert carry_node.data == {
        "carry_forward_id": "carry-forward-maude-metadata-v2",
        "current_draft_address": scenario.current.draft.record.content_address,
        "prior_draft_address": scenario.current.prior.maude_draft.record.content_address,
        "prior_approval_address": (scenario.current.prior.maude_approval.record.content_address),
        "draft_digest": scenario.current.draft.record.draft_digest,
        "evidence_digest": scenario.current.draft.record.evidence_digest,
        "workflow": "documentation-approval-revalidator",
        "workflow_version": "1.0.0",
        "revalidation_time": "2026-07-27T12:10:00Z",
        "reason": "Only source and manifest metadata changed.",
        "schema_version": 1,
    }
    edges = {(edge.source, edge.type, edge.target) for edge in trace.edges}
    assert (
        current_node.id,
        APPROVAL_CARRIED_FORWARD_BY,
        carry_node.id,
    ) in edges
    assert (carry_node.id, CARRIES_APPROVAL_FROM, prior_node.id) in edges
    assert (carry_node.id, REVALIDATES_APPROVAL, approval_node.id) in edges
    assert all(
        edge.provenance_kind is ProvenanceKind.REVIEW
        for edge in trace.edges
        if edge.type
        in {
            APPROVAL_CARRIED_FORWARD_BY,
            CARRIES_APPROVAL_FROM,
            REVALIDATES_APPROVAL,
        }
    )


@pytest.mark.parametrize(
    ("draft_digest", "evidence_digest", "expected"),
    [
        (_digest("changed guide prose"), None, "identical draft digests"),
        (None, _digest("changed guide evidence"), "identical evidence digests"),
    ],
)
def test_carry_forward_rejects_mismatched_prose_or_evidence(
    draft_digest: str | None,
    evidence_digest: str | None,
    expected: str,
) -> None:
    current = _current_metadata_revision(
        prose=(
            "Execute Maude through a changed, no-longer-reviewed workflow."
            if draft_digest is not None
            else None
        ),
        draft_digest=draft_digest,
        evidence_digest=evidence_digest,
    )
    with pytest.raises(ProvenanceInvariantError, match=expected):
        current.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(current),
            current_draft=current.draft,
            prior_draft=current.prior.maude_draft,
            prior_approval=current.prior.maude_approval,
            authority=_WORKFLOW_AUTHORITY,
        )


@pytest.mark.parametrize(
    ("prose", "include_unreviewed_evidence"),
    [
        ("Changed prose that dishonestly reuses the prior digest.", False),
        (None, True),
    ],
)
def test_carry_forward_rejects_stale_digest_reuse(
    prose: str | None,
    include_unreviewed_evidence: bool,
) -> None:
    current = _current_metadata_revision(
        prose=prose,
        include_unreviewed_evidence=include_unreviewed_evidence,
    )
    assert current.draft.record.draft_digest == (current.prior.maude_draft.record.draft_digest)
    assert current.draft.record.evidence_digest == (
        current.prior.maude_draft.record.evidence_digest
    )
    with pytest.raises(
        ProvenanceInvariantError,
        match="unchanged draft prose and evidence lineage",
    ):
        current.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(current),
            current_draft=current.draft,
            prior_draft=current.prior.maude_draft,
            prior_approval=current.prior.maude_approval,
            authority=_WORKFLOW_AUTHORITY,
        )


def test_carry_forward_requires_current_and_latest_prior_review_state() -> None:
    predates_validation = _current_metadata_revision()
    with pytest.raises(ProvenanceInvariantError, match="current validation"):
        predates_validation.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(
                predates_validation,
                revalidation_time="2026-07-27T12:01:00Z",
            ),
            current_draft=predates_validation.draft,
            prior_draft=predates_validation.prior.maude_draft,
            prior_approval=predates_validation.prior.maude_approval,
            authority=_WORKFLOW_AUTHORITY,
        )

    stale = _current_metadata_revision()
    newer_approval = _record_approval(
        stale.prior.provenance,
        stale.prior.maude_draft,
        identity="newer-prior-approval",
        time="2026-07-27T12:11:00Z",
    )
    assert newer_approval.record.outcome is ApprovalOutcome.APPROVED
    with pytest.raises(ProvenanceInvariantError, match="latest approved prior decision"):
        stale.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(stale),
            current_draft=stale.draft,
            prior_draft=stale.prior.maude_draft,
            prior_approval=stale.prior.maude_approval,
            authority=_WORKFLOW_AUTHORITY,
        )

    rejected = _current_metadata_revision()
    _record_approval(
        rejected.prior.provenance,
        rejected.prior.maude_draft,
        identity="reject-prior-before-carry-forward",
        time="2026-07-27T12:11:00Z",
        outcome=ApprovalOutcome.REJECTED,
    )
    with pytest.raises(ProvenanceInvariantError, match="latest approved prior decision"):
        rejected.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(rejected),
            current_draft=rejected.draft,
            prior_draft=rejected.prior.maude_draft,
            prior_approval=rejected.prior.maude_approval,
            authority=_WORKFLOW_AUTHORITY,
        )

    prior_failed = _current_metadata_revision()
    _record_validation(
        prior_failed.prior.provenance,
        prior_failed.prior.maude_draft,
        identity="fail-prior-before-carry-forward",
        time="2026-07-27T12:11:00Z",
        outcome=ValidationOutcome.FAILED,
    )
    with pytest.raises(ProvenanceInvariantError, match="current validation"):
        prior_failed.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(prior_failed),
            current_draft=prior_failed.draft,
            prior_draft=prior_failed.prior.maude_draft,
            prior_approval=prior_failed.prior.maude_approval,
            authority=_WORKFLOW_AUTHORITY,
        )

    current_failed = _current_metadata_revision()
    _record_validation(
        current_failed.prior.provenance,
        current_failed.draft,
        identity="fail-current-before-carry-forward",
        time="2026-07-27T12:11:00Z",
        outcome=ValidationOutcome.FAILED,
    )
    with pytest.raises(ProvenanceInvariantError, match="current validation"):
        current_failed.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(current_failed),
            current_draft=current_failed.draft,
            prior_draft=current_failed.prior.maude_draft,
            prior_approval=current_failed.prior.maude_approval,
            authority=_WORKFLOW_AUTHORITY,
        )


def test_completed_execution_never_substitutes_for_grounding_or_research_review() -> None:
    scenario = _approved_scenario()
    provenance = scenario.provenance
    unsupported = provenance.record_research_claim

    with pytest.raises(ProvenanceInvariantError, match="content provenance"):
        unsupported(
            ResearchClaim(
                claim_id="unsupported",
                text="A completed run proves this claim.",
                certainty=Certainty.INFERENCE,
            ),
            run=scenario.research_run,
            derived_from=(),
        )

    unapproved = provenance.record_research_claim(
        ResearchClaim(
            claim_id="unapproved",
            text="This claim has a fact but no current review.",
            certainty=Certainty.DIRECT,
        ),
        run=scenario.research_run,
        derived_from=(scenario.maude_fact,),
    )
    with pytest.raises(ProvenanceInvariantError, match="not approved"):
        provenance.record_guide_section(
            GuideSection(
                guide_id="unapproved-guide",
                section_id="section",
                heading="Heading",
                prose="Unapproved research must not enter narrative.",
                claim_ids=(unapproved.record.claim_id,),
                manifest_revision=scenario.manifest.record.revision,
            ),
            run=scenario.documentation_run,
            derived_from=(unapproved,),
        )
    with pytest.raises(ProvenanceInvariantError, match="not approved"):
        provenance.record_guide_section(
            GuideSection(
                guide_id="unapproved-citation",
                section_id="section",
                heading="Heading",
                prose="Cites cannot bypass review either.",
                claim_ids=(unapproved.record.claim_id,),
                manifest_revision=scenario.manifest.record.revision,
            ),
            run=scenario.documentation_run,
            cites=(unapproved,),
        )
    with pytest.raises(ProvenanceInvariantError, match="not approved"):
        provenance.record_evidence(
            EvidenceRecord(
                evidence_id="laundered-unapproved-research",
                kind="research-summary",
                locator="internal/research",
            ),
            run=scenario.research_run,
            derived_from=(unapproved,),
        )


def test_run_kind_status_inputs_and_configuration_are_enforced() -> None:
    runtime = Runtime(Graph(run_id="run-invariants"))
    provenance = DocumentationProvenance[object].install(
        runtime,
        authority_resolver=_resolve_test_authority,
    )
    source = provenance.record_source_revision(
        SourceRevision(repository="repo", revision="rev", source_digest=_digest("source"))
    )
    manifest = provenance.record_manifest_input(
        ManifestInput(revision="manifest", manifest_digest=_digest("manifest"), locator="m")
    )
    fact = provenance.record_manifest_fact(
        ManifestFact(fact_id="f", symbol_id="s", kind="signature", value="v"),
        manifest=manifest,
    )
    configuration = provenance.record_agent_configuration(
        AgentConfiguration(agent_name="researcher", agent_version="1", model="model")
    )

    with pytest.raises(ProvenanceInvariantError, match="match its configuration"):
        provenance.record_run(
            AgentRun(
                run_identity="mismatch",
                kind=AgentKind.RESEARCH,
                status=RunStatus.COMPLETED,
                agent_name="different",
                agent_version="1",
            ),
            configuration=configuration,
            inputs=(source, manifest),
        )
    with pytest.raises(ProvenanceInvariantError, match="exactly one source"):
        provenance.record_run(
            AgentRun(
                run_identity="missing-source",
                kind=AgentKind.RESEARCH,
                status=RunStatus.COMPLETED,
                agent_name="researcher",
                agent_version="1",
            ),
            configuration=configuration,
            inputs=(manifest,),
        )

    failed = provenance.record_run(
        AgentRun(
            run_identity="failed",
            kind=AgentKind.RESEARCH,
            status=RunStatus.FAILED,
            agent_name="researcher",
            agent_version="1",
        ),
        configuration=configuration,
        inputs=(source, manifest),
    )
    with pytest.raises(ProvenanceInvariantError, match="completed agent run"):
        provenance.record_research_claim(
            ResearchClaim(
                claim_id="failed-claim",
                text="A failed run cannot author publishable content.",
                certainty=Certainty.DIRECT,
            ),
            run=failed,
            derived_from=(fact,),
        )


def test_stored_content_and_node_references_are_revalidated_before_trust() -> None:
    scenario = _approved_scenario()
    scenario.provenance.graph.patch_object(
        scenario.maude_section.object_id,
        {"prose": "changed after approval"},
        actor="documentation-agent",
    )
    with pytest.raises(ProvenanceInvariantError, match="content-address validation"):
        scenario.provenance.export_guide_trace("investigation-quickstart")
    with pytest.raises(ProvenanceInvariantError, match="content-address validation"):
        scenario.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-after-mutation",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=scenario.maude_artifact.record.content_address,
            ),
            artifact=scenario.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )

    clean = _approved_scenario()
    fake_record = GuideDraft(
        guide_id=clean.maude_draft.record.guide_id,
        source_revision=clean.maude_draft.record.source_revision,
        manifest_revision=clean.maude_draft.record.manifest_revision,
        manifest_digest=clean.maude_draft.record.manifest_digest,
        draft_digest=_digest("different draft"),
        evidence_digest=clean.maude_draft.record.evidence_digest,
        section_addresses=clean.maude_draft.record.section_addresses,
    )
    forged = NodeRef(
        clean.maude_draft.object_id,
        clean.maude_draft.type_name,
        fake_record,
    )
    with pytest.raises(ProvenanceInvariantError, match="does not identify"):
        clean.provenance.review_binding(forged)


def test_publication_reconstructs_a_uniquely_identified_partial_artifact() -> None:
    scenario = _approved_scenario()
    record = RenderedArtifact(
        guide_id=scenario.maude_draft.record.guide_id,
        path="guides/investigation-quickstart/recovered.html",
        media_type="text/html",
        artifact_digest=_digest("partially-written-rendered-artifact"),
        renderer="attune-static-docs",
        renderer_version="1.0.0",
    )
    raw_artifact = scenario.provenance.graph.add_object(
        RENDERED_ARTIFACT,
        record.model_dump(mode="json"),
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    artifact_ref = NodeRef(raw_artifact.id, RENDERED_ARTIFACT, record)

    publication = scenario.provenance.record_publication(
        PublicationRevision(
            guide_id=record.guide_id,
            revision="pages-recovered-artifact",
            site="https://example.github.io/attune/",
            published_by="release-workflow",
            artifact_address=record.content_address,
        ),
        artifact=artifact_ref,
        authority=_PUBLISHER_AUTHORITY,
    )

    assert publication.record.revision == "pages-recovered-artifact"
    assert {
        relation.type
        for relation in scenario.provenance.graph.get_relations(
            raw_artifact.id,
            direction="outgoing",
        )
    } == {PRODUCED_BY, RENDERS}


def test_trace_export_repairs_a_uniquely_identified_partial_artifact() -> None:
    scenario = _approved_scenario()
    record = RenderedArtifact(
        guide_id=scenario.maude_draft.record.guide_id,
        path="guides/investigation-quickstart/export-recovered.html",
        media_type="text/html",
        artifact_digest=_digest("export-recovered-rendered-artifact"),
        renderer="attune-static-docs",
        renderer_version="1.0.0",
    )
    raw_artifact = scenario.provenance.graph.add_object(
        RENDERED_ARTIFACT,
        record.model_dump(mode="json"),
        actor=DEFAULT_PROVENANCE_ACTOR,
    )

    trace = scenario.provenance.export_guide_trace(record.guide_id)

    assert any(node.content_address == record.content_address for node in trace.nodes)
    assert {
        relation.type
        for relation in scenario.provenance.graph.get_relations(
            raw_artifact.id,
            direction="outgoing",
        )
    } == {PRODUCED_BY, RENDERS}


def test_render_and_publication_relations_enforce_guide_semantics() -> None:
    artifact_contamination = _approved_scenario()
    artifact_contamination.provenance.graph.add_relation(
        artifact_contamination.maude_artifact.object_id,
        artifact_contamination.joern_draft.object_id,
        RENDERS,
        {"provenance_kind": ProvenanceKind.PRESENTATION.value},
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    with pytest.raises(ProvenanceInvariantError, match="another guide"):
        artifact_contamination.provenance.export_guide_trace(
            artifact_contamination.maude_draft.record.guide_id
        )

    publication_contamination = _approved_scenario()
    publication_object = publication_contamination.provenance.graph.objects(
        type=PUBLICATION_REVISION
    )[0]
    publication_record = PublicationRevision.model_validate(publication_object.data)
    publication_contamination.provenance.graph.add_relation(
        publication_object.id,
        publication_contamination.joern_artifact.object_id,
        RENDERS,
        {"provenance_kind": ProvenanceKind.PRESENTATION.value},
        actor=publication_record.published_by,
    )
    with pytest.raises(ProvenanceInvariantError, match="another guide"):
        publication_contamination.provenance.export_guide_trace(
            publication_contamination.maude_draft.record.guide_id
        )


def test_presentation_cardinality_rejects_conflicting_extra_edges() -> None:
    extra_run = _approved_scenario()
    extra_run.provenance.graph.add_relation(
        extra_run.maude_artifact.object_id,
        extra_run.research_run.object_id,
        PRODUCED_BY,
        {"provenance_kind": ProvenanceKind.EXECUTION.value},
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    with pytest.raises(ProvenanceInvariantError, match="one producing run"):
        extra_run.provenance.export_guide_trace(extra_run.maude_draft.record.guide_id)

    extra_draft = _current_metadata_revision()
    extra_draft.prior.provenance.graph.add_relation(
        extra_draft.prior.maude_artifact.object_id,
        extra_draft.draft.object_id,
        RENDERS,
        {"provenance_kind": ProvenanceKind.PRESENTATION.value},
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    with pytest.raises(ProvenanceInvariantError, match="one guide draft"):
        extra_draft.prior.provenance.export_guide_trace(extra_draft.draft.record.guide_id)

    extra_artifact = _approved_scenario()
    second_artifact = extra_artifact.provenance.record_rendered_artifact(
        RenderedArtifact(
            guide_id=extra_artifact.maude_draft.record.guide_id,
            path="guides/investigation-quickstart/second.html",
            media_type="text/html",
            artifact_digest=_digest("second-rendered-artifact"),
            renderer="attune-static-docs",
            renderer_version="1.0.0",
        ),
        run=extra_artifact.documentation_run,
        draft=extra_artifact.maude_draft,
    )
    publication_object = extra_artifact.provenance.graph.objects(type=PUBLICATION_REVISION)[0]
    publication_record = PublicationRevision.model_validate(publication_object.data)
    extra_artifact.provenance.graph.add_relation(
        publication_object.id,
        second_artifact.object_id,
        RENDERS,
        {"provenance_kind": ProvenanceKind.PRESENTATION.value},
        actor=publication_record.published_by,
    )
    with pytest.raises(ProvenanceInvariantError, match="outside its committed binding"):
        extra_artifact.provenance.export_guide_trace(extra_artifact.maude_draft.record.guide_id)


def test_repeated_publication_cannot_rebind_revision_to_another_artifact() -> None:
    scenario = _approved_scenario()
    second_artifact = scenario.provenance.record_rendered_artifact(
        RenderedArtifact(
            guide_id=scenario.maude_draft.record.guide_id,
            path="guides/investigation-quickstart/rebound.html",
            media_type="text/html",
            artifact_digest=_digest("rebound-rendered-artifact"),
            renderer="attune-static-docs",
            renderer_version="1.0.0",
        ),
        run=scenario.documentation_run,
        draft=scenario.maude_draft,
    )
    repeated = PublicationRevision(
        guide_id=scenario.maude_draft.record.guide_id,
        revision="pages-1",
        site="https://example.github.io/attune/",
        published_by="release-workflow",
        artifact_address=scenario.maude_artifact.record.content_address,
    )

    with pytest.raises(ProvenanceInvariantError, match="artifact address"):
        scenario.provenance.record_publication(
            repeated,
            artifact=second_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )


def test_exact_relation_data_actor_and_endpoint_rules_are_enforced() -> None:
    wrong_data = _approved_scenario()
    wrong_data.provenance.graph.add_relation(
        wrong_data.maude_draft.object_id,
        wrong_data.joern_fact.object_id,
        CITES,
        {
            "provenance_kind": ProvenanceKind.CONTENT.value,
            "attacker_extension": True,
        },
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    with pytest.raises(ProvenanceInvariantError, match="forged provenance data"):
        wrong_data.provenance.export_guide_trace("investigation-quickstart")

    wrong_endpoint = _approved_scenario()
    publication = wrong_endpoint.provenance.graph.objects(
        type=PUBLICATION_REVISION,
    )[0]
    publication_record = PublicationRevision.model_validate(publication.data)
    wrong_endpoint.provenance.graph.add_relation(
        publication.id,
        wrong_endpoint.maude_draft.object_id,
        RENDERS,
        {"provenance_kind": ProvenanceKind.PRESENTATION.value},
        actor=publication_record.published_by,
    )
    with pytest.raises(ProvenanceInvariantError, match="illegal endpoints"):
        wrong_endpoint.provenance.export_guide_trace("investigation-quickstart")


def test_carry_forward_rejects_forged_refs_relations_and_records() -> None:
    forged_ref = _current_metadata_revision()
    prior = forged_ref.prior.maude_approval.record
    fake_approval = ApprovalDecision(
        subject_address=prior.subject_address,
        decision_id="forged-prior-approval",
        source_revision=prior.source_revision,
        manifest_digest=prior.manifest_digest,
        draft_digest=prior.draft_digest,
        evidence_digest=prior.evidence_digest,
        reviewer=prior.reviewer,
        reviewer_role=prior.reviewer_role,
        outcome=prior.outcome,
        decision_time=prior.decision_time,
    )
    forged_approval_ref = NodeRef(
        forged_ref.prior.maude_approval.object_id,
        forged_ref.prior.maude_approval.type_name,
        fake_approval,
    )
    with pytest.raises(ProvenanceInvariantError, match="does not identify"):
        forged_ref.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(forged_ref, prior_approval=forged_approval_ref),
            current_draft=forged_ref.draft,
            prior_draft=forged_ref.prior.maude_draft,
            prior_approval=forged_approval_ref,
            authority=_WORKFLOW_AUTHORITY,
        )

    forged_lineage = _current_metadata_revision()
    forged_lineage.prior.provenance.graph.add_relation(
        forged_lineage.draft.object_id,
        forged_lineage.prior.joern_fact.object_id,
        CITES,
        {"provenance_kind": ProvenanceKind.CONTENT.value},
        actor="attacker",
    )
    with pytest.raises(ProvenanceInvariantError, match="not attributed"):
        forged_lineage.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(forged_lineage),
            current_draft=forged_lineage.draft,
            prior_draft=forged_lineage.prior.maude_draft,
            prior_approval=forged_lineage.prior.maude_approval,
            authority=_WORKFLOW_AUTHORITY,
        )

    forged_section_support = _current_metadata_revision()
    forged_section_support.prior.provenance.graph.add_relation(
        forged_section_support.section.object_id,
        forged_section_support.prior.joern_fact.object_id,
        CITES,
        {"provenance_kind": ProvenanceKind.CONTENT.value},
        actor="attacker",
    )
    with pytest.raises(ProvenanceInvariantError, match="not attributed"):
        forged_section_support.prior.provenance.record_approval_carry_forward(
            _carry_forward_record(forged_section_support),
            current_draft=forged_section_support.draft,
            prior_draft=forged_section_support.prior.maude_draft,
            prior_approval=forged_section_support.prior.maude_approval,
            authority=_WORKFLOW_AUTHORITY,
        )

    forged_relation = _carry_forward_scenario()
    forged_relation.current.prior.provenance.graph.add_relation(
        forged_relation.carry_forward.object_id,
        forged_relation.current.prior.joern_draft.object_id,
        CARRIES_APPROVAL_FROM,
        {"provenance_kind": ProvenanceKind.REVIEW.value},
        actor="attacker",
    )
    with pytest.raises(ProvenanceInvariantError, match="not attributed"):
        forged_relation.current.prior.provenance.record_publication(
            PublicationRevision(
                guide_id=forged_relation.current.draft.record.guide_id,
                revision="pages-forged-carry-relation",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=forged_relation.artifact.record.content_address,
            ),
            artifact=forged_relation.artifact,
            authority=_PUBLISHER_AUTHORITY,
        )
    with pytest.raises(ProvenanceInvariantError, match="not attributed"):
        forged_relation.current.prior.provenance.export_guide_trace(
            forged_relation.current.draft.record.guide_id
        )

    forged_record = _carry_forward_scenario()
    forged_record.current.prior.provenance.graph.patch_object(
        forged_record.carry_forward.object_id,
        {"reason": "tampered after revalidation"},
        actor="attacker",
    )
    with pytest.raises(ProvenanceInvariantError, match="content-address validation"):
        forged_record.current.prior.provenance.record_publication(
            PublicationRevision(
                guide_id=forged_record.current.draft.record.guide_id,
                revision="pages-forged-carry-record",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=forged_record.artifact.record.content_address,
            ),
            artifact=forged_record.artifact,
            authority=_PUBLISHER_AUTHORITY,
        )
    with pytest.raises(ProvenanceInvariantError, match="content-address validation"):
        forged_record.current.prior.provenance.export_guide_trace(
            forged_record.current.draft.record.guide_id
        )

    unattributed = _current_metadata_revision()
    unattributed_record = _carry_forward_record(unattributed)
    graph = unattributed.prior.provenance.graph
    raw_carry = graph.add_object(
        APPROVAL_CARRY_FORWARD,
        unattributed_record.model_dump(mode="json"),
        actor="attacker",
    )
    for source, target, relation_type in (
        (
            unattributed.draft.object_id,
            raw_carry.id,
            APPROVAL_CARRIED_FORWARD_BY,
        ),
        (
            raw_carry.id,
            unattributed.prior.maude_draft.object_id,
            CARRIES_APPROVAL_FROM,
        ),
        (
            raw_carry.id,
            unattributed.prior.maude_approval.object_id,
            REVALIDATES_APPROVAL,
        ),
    ):
        graph.add_relation(
            source,
            target,
            relation_type,
            {"provenance_kind": ProvenanceKind.REVIEW.value},
            actor="attacker",
        )
    with pytest.raises(ProvenanceInvariantError, match="not attributed"):
        unattributed.prior.provenance.record_rendered_artifact(
            RenderedArtifact(
                guide_id=unattributed.draft.record.guide_id,
                path="guides/investigation-quickstart/unattributed.html",
                media_type="text/html",
                artifact_digest=_digest("unattributed-carry-forward"),
                renderer="attune-static-docs",
                renderer_version="1.0.0",
            ),
            run=unattributed.documentation_run,
            draft=unattributed.draft,
        )

    forged_kind = _current_metadata_revision()
    forged_kind_record = _carry_forward_record(forged_kind)
    graph = forged_kind.prior.provenance.graph
    raw_carry = graph.add_object(
        APPROVAL_CARRY_FORWARD,
        forged_kind_record.model_dump(mode="json"),
        actor=forged_kind_record.workflow,
    )
    for index, (source, target, relation_type) in enumerate(
        (
            (
                forged_kind.draft.object_id,
                raw_carry.id,
                APPROVAL_CARRIED_FORWARD_BY,
            ),
            (
                raw_carry.id,
                forged_kind.prior.maude_draft.object_id,
                CARRIES_APPROVAL_FROM,
            ),
            (
                raw_carry.id,
                forged_kind.prior.maude_approval.object_id,
                REVALIDATES_APPROVAL,
            ),
        )
    ):
        graph.add_relation(
            source,
            target,
            relation_type,
            {
                "provenance_kind": (
                    ProvenanceKind.CONTENT.value if index == 0 else ProvenanceKind.REVIEW.value
                )
            },
            actor=forged_kind_record.workflow,
        )
    with pytest.raises(ProvenanceInvariantError, match="forged provenance data"):
        forged_kind.prior.provenance.record_rendered_artifact(
            RenderedArtifact(
                guide_id=forged_kind.draft.record.guide_id,
                path="guides/investigation-quickstart/forged-kind.html",
                media_type="text/html",
                artifact_digest=_digest("forged-carry-forward-kind"),
                renderer="attune-static-docs",
                renderer_version="1.0.0",
            ),
            run=forged_kind.documentation_run,
            draft=forged_kind.draft,
        )


def test_partial_carry_forward_replays_from_sqlite_and_repairs_edges(
    tmp_path: Path,
) -> None:
    database = tmp_path / "partial-carry-forward.sqlite"
    runtime = Runtime(
        Graph(run_id="partial-carry-forward-replay"),
        persist_to=str(database),
    )
    provenance = DocumentationProvenance[object].install(
        runtime,
        authority_resolver=_resolve_test_authority,
    )
    current = _current_metadata_revision(provenance=provenance)
    record = _carry_forward_record(current)
    raw_carry = provenance.graph.add_object(
        APPROVAL_CARRY_FORWARD,
        record.model_dump(mode="json"),
        actor=record.workflow,
    )
    provenance.graph.add_relation(
        current.draft.object_id,
        raw_carry.id,
        APPROVAL_CARRIED_FORWARD_BY,
        {"provenance_kind": ProvenanceKind.REVIEW.value},
        actor=record.workflow,
    )

    replayed_runtime = Runtime.load(
        str(database),
        run_id="partial-carry-forward-replay",
    )
    replayed = DocumentationProvenance[object].install(
        replayed_runtime,
        authority_resolver=_resolve_test_authority,
    )
    repaired = replayed.record_approval_carry_forward(
        record,
        current_draft=current.draft,
        prior_draft=current.prior.maude_draft,
        prior_approval=current.prior.maude_approval,
        authority=_WORKFLOW_AUTHORITY,
    )

    assert repaired.object_id == raw_carry.id
    relations = replayed.graph.get_relations(repaired.object_id, direction="both")
    assert {
        relation.type
        for relation in relations
        if relation.source == repaired.object_id or relation.target == repaired.object_id
    } >= {
        APPROVAL_CARRIED_FORWARD_BY,
        CARRIES_APPROVAL_FROM,
        REVALIDATES_APPROVAL,
    }


@pytest.mark.parametrize(
    "invalid_time",
    [
        "2026-07-27T12:10:00",
        "2026-07-27T12:10:00+0000",
        "2026-07-27 12:10:00Z",
        "Mon, 27 Jul 2026 12:10:00 Z",
    ],
)
def test_carry_forward_requires_timezone_aware_revalidation_time(
    invalid_time: str,
) -> None:
    current = _current_metadata_revision()
    payload = _carry_forward_record(current).model_dump(
        mode="json",
        exclude={"content_address"},
    )
    payload["revalidation_time"] = invalid_time
    with pytest.raises(ValueError, match="timezone"):
        ApprovalCarryForward.model_validate(payload)


@pytest.mark.parametrize(
    "field",
    ["carry_forward_id", "workflow", "workflow_version", "reason"],
)
def test_carry_forward_requires_nonblank_workflow_attribution(field: str) -> None:
    current = _current_metadata_revision()
    payload = _carry_forward_record(current).model_dump(
        mode="json",
        exclude={"content_address"},
    )
    payload[field] = " \t "
    with pytest.raises(ValueError, match="must not be blank"):
        ApprovalCarryForward.model_validate(payload)


def test_approval_requires_exact_guide_source_manifest_draft_and_evidence() -> None:
    scenario = _approved_scenario()
    binding = scenario.provenance.review_binding(scenario.maude_draft)
    with pytest.raises(ProvenanceInvariantError, match="binding does not match"):
        scenario.provenance.record_approval(
            ApprovalDecision(
                subject_address=scenario.maude_draft.record.content_address,
                decision_id="mismatched-binding",
                source_revision="another-source",
                manifest_digest=binding.manifest_digest,
                draft_digest=binding.draft_digest,
                evidence_digest=binding.evidence_digest,
                reviewer="maintainer@example.com",
                reviewer_role="documentation-maintainer",
                outcome=ApprovalOutcome.REJECTED,
                decision_time="2026-07-27T12:10:00Z",
            ),
            subject=scenario.maude_draft,
            authority=_REVIEWER_AUTHORITY,
        )


def test_later_rejection_and_validation_failure_revoke_publication() -> None:
    rejected = _approved_scenario()
    _record_approval(
        rejected.provenance,
        rejected.maude_draft,
        identity="reject-maude-draft",
        time="2026-07-27T13:00:00Z",
        outcome=ApprovalOutcome.REJECTED,
    )
    with pytest.raises(ProvenanceInvariantError, match="currently validated and approved"):
        rejected.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-rejected",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=rejected.maude_artifact.record.content_address,
            ),
            artifact=rejected.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )
    failed = _approved_scenario()
    _record_validation(
        failed.provenance,
        failed.maude_draft,
        identity="new-validator-failure",
        time="2026-07-27T13:00:00Z",
        outcome=ValidationOutcome.FAILED,
    )
    with pytest.raises(ProvenanceInvariantError, match="currently validated and approved"):
        failed.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-validation-failed",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=failed.maude_artifact.record.content_address,
            ),
            artifact=failed.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )
    research_rejected = _approved_scenario()
    _record_approval(
        research_rejected.provenance,
        research_rejected.maude_claim,
        identity="reject-maude-research",
        time="2026-07-27T13:00:00Z",
        outcome=ApprovalOutcome.REJECTED,
    )
    with pytest.raises(
        ProvenanceInvariantError,
        match=r"research claim .* is not approved",
    ):
        research_rejected.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-research-rejected",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=research_rejected.maude_artifact.record.content_address,
            ),
            artifact=research_rejected.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )


def test_disconnected_review_and_validation_objects_remain_authoritative() -> None:
    rejected = _approved_scenario()
    rejection_binding = rejected.provenance.review_binding(rejected.maude_draft)
    rejection = ApprovalDecision(
        subject_address=rejected.maude_draft.record.content_address,
        decision_id="disconnected-rejection",
        source_revision=rejection_binding.source_revision,
        manifest_digest=rejection_binding.manifest_digest,
        draft_digest=rejection_binding.draft_digest,
        evidence_digest=rejection_binding.evidence_digest,
        reviewer="maintainer@example.com",
        reviewer_role="documentation-maintainer",
        outcome=ApprovalOutcome.REJECTED,
        decision_time="2026-07-27T13:30:00Z",
    )
    raw_rejection = rejected.provenance.graph.add_object(
        APPROVAL_DECISION,
        rejection.model_dump(mode="json"),
        actor=rejection.reviewer,
    )
    assert all(
        relation.target != raw_rejection.id
        for relation in rejected.provenance.graph.get_relations(
            rejected.maude_draft.object_id,
            APPROVED_BY,
            direction="outgoing",
        )
    )
    with pytest.raises(ProvenanceInvariantError, match="currently validated and approved"):
        rejected.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-disconnected-rejection",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=rejected.maude_artifact.record.content_address,
            ),
            artifact=rejected.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )
    rejection_trace = rejected.provenance.export_guide_trace(
        "investigation-quickstart",
    )
    rejection_node = next(
        node for node in rejection_trace.nodes if node.content_address == rejection.content_address
    )
    assert any(
        edge.type == APPROVED_BY and edge.target == rejection_node.id
        for edge in rejection_trace.edges
    )
    repaired_rejection = rejected.provenance.record_approval(
        rejection,
        subject=rejected.maude_draft,
        authority=_REVIEWER_AUTHORITY,
    )
    assert repaired_rejection.object_id == raw_rejection.id
    assert any(
        relation.target == raw_rejection.id
        for relation in rejected.provenance.graph.get_relations(
            rejected.maude_draft.object_id,
            APPROVED_BY,
            direction="outgoing",
        )
    )

    failed = _approved_scenario()
    validation = ValidationResult(
        subject_address=failed.maude_draft.record.content_address,
        validation_id="disconnected-validation-failure",
        validation_time="2026-07-27T13:30:00Z",
        validator="grounding-validator",
        validator_version="1.0.0",
        outcome=ValidationOutcome.FAILED,
        checks=("known-facts",),
    )
    raw_validation = failed.provenance.graph.add_object(
        VALIDATION_RESULT,
        validation.model_dump(mode="json"),
        actor=validation.validator,
    )
    with pytest.raises(ProvenanceInvariantError, match="currently validated and approved"):
        failed.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-disconnected-validation",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=failed.maude_artifact.record.content_address,
            ),
            artifact=failed.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )
    validation_trace = failed.provenance.export_guide_trace(
        "investigation-quickstart",
    )
    validation_node = next(
        node
        for node in validation_trace.nodes
        if node.content_address == validation.content_address
    )
    assert any(
        edge.type == VALIDATED_BY and edge.target == validation_node.id
        for edge in validation_trace.edges
    )
    repaired_validation = failed.provenance.record_validation(
        validation,
        subject=failed.maude_draft,
        authority=_VALIDATOR_AUTHORITY,
    )
    assert repaired_validation.object_id == raw_validation.id
    assert any(
        relation.target == raw_validation.id
        for relation in failed.provenance.graph.get_relations(
            failed.maude_draft.object_id,
            VALIDATED_BY,
            direction="outgoing",
        )
    )


def test_attacker_authored_review_and_validation_records_are_never_trusted() -> None:
    attacked_review = _approved_scenario()
    binding = attacked_review.provenance.review_binding(attacked_review.maude_draft)
    rejection = ApprovalDecision(
        subject_address=attacked_review.maude_draft.record.content_address,
        decision_id="attacker-rejection",
        source_revision=binding.source_revision,
        manifest_digest=binding.manifest_digest,
        draft_digest=binding.draft_digest,
        evidence_digest=binding.evidence_digest,
        reviewer="maintainer@example.com",
        reviewer_role="documentation-maintainer",
        outcome=ApprovalOutcome.REJECTED,
        decision_time="2026-07-27T13:45:00Z",
    )
    attacked_review.provenance.graph.add_object(
        APPROVAL_DECISION,
        rejection.model_dump(mode="json"),
        actor="attacker",
    )
    with pytest.raises(ProvenanceInvariantError, match="not attributed"):
        attacked_review.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-attacker-review",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=attacked_review.maude_artifact.record.content_address,
            ),
            artifact=attacked_review.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )

    attacked_validation = _approved_scenario()
    failure = ValidationResult(
        subject_address=attacked_validation.maude_draft.record.content_address,
        validation_id="attacker-validation",
        validation_time="2026-07-27T13:45:00Z",
        validator="grounding-validator",
        validator_version="1.0.0",
        outcome=ValidationOutcome.FAILED,
        checks=("known-facts",),
    )
    attacked_validation.provenance.graph.add_object(
        VALIDATION_RESULT,
        failure.model_dump(mode="json"),
        actor="attacker",
    )
    with pytest.raises(ProvenanceInvariantError, match="not attributed"):
        attacked_validation.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-attacker-validation",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=attacked_validation.maude_artifact.record.content_address,
            ),
            artifact=attacked_validation.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )

    attacked_invalidation = _approved_scenario()
    invalidation = InvalidationRecord(
        manifest_revision="attacker-revision",
        changes=(
            ManifestFactChange(
                fact_id=attacked_invalidation.maude_fact.record.fact_id,
                previous_address=attacked_invalidation.maude_fact.record.content_address,
            ),
        ),
        reason="attacker-authored invalidation",
    )
    attacked_invalidation.provenance.graph.add_object(
        INVALIDATION,
        invalidation.model_dump(mode="json"),
        actor="attacker",
    )
    with pytest.raises(ProvenanceInvariantError, match="not attributed"):
        attacked_invalidation.provenance.stale_guides()


def test_local_policy_rejects_self_attributed_untrusted_authorities() -> None:
    attacked_review = _approved_scenario()
    _record_approval(
        attacked_review.provenance,
        attacked_review.maude_draft,
        identity="trusted-rejection-before-attacker",
        time="2026-07-27T13:00:00Z",
        outcome=ApprovalOutcome.REJECTED,
    )
    binding = attacked_review.provenance.review_binding(attacked_review.maude_draft)
    attacker_approval = ApprovalDecision(
        subject_address=attacked_review.maude_draft.record.content_address,
        decision_id="later-self-attributed-attacker-approval",
        source_revision=binding.source_revision,
        manifest_digest=binding.manifest_digest,
        draft_digest=binding.draft_digest,
        evidence_digest=binding.evidence_digest,
        reviewer="attacker",
        reviewer_role="documentation-maintainer",
        outcome=ApprovalOutcome.APPROVED,
        decision_time="2026-07-27T14:00:00Z",
    )
    attacked_review.provenance.graph.add_object(
        APPROVAL_DECISION,
        attacker_approval.model_dump(mode="json"),
        actor=attacker_approval.reviewer,
    )
    with pytest.raises(ProvenanceInvariantError, match="local documentation trust policy"):
        attacked_review.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-untrusted-later-approval",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=attacked_review.maude_artifact.record.content_address,
            ),
            artifact=attacked_review.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )

    attacked_validation = _approved_scenario()
    _record_validation(
        attacked_validation.provenance,
        attacked_validation.maude_draft,
        identity="trusted-failure-before-attacker",
        time="2026-07-27T13:00:00Z",
        outcome=ValidationOutcome.FAILED,
    )
    attacker_validation = ValidationResult(
        subject_address=attacked_validation.maude_draft.record.content_address,
        validation_id="later-self-attributed-attacker-pass",
        validation_time="2026-07-27T14:00:00Z",
        validator="attacker-validator",
        validator_version="evil",
        outcome=ValidationOutcome.PASSED,
        checks=("pretend-pass",),
    )
    attacked_validation.provenance.graph.add_object(
        VALIDATION_RESULT,
        attacker_validation.model_dump(mode="json"),
        actor=attacker_validation.validator,
    )
    with pytest.raises(ProvenanceInvariantError, match="local documentation trust policy"):
        attacked_validation.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-untrusted-later-validation",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=attacked_validation.maude_artifact.record.content_address,
            ),
            artifact=attacked_validation.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )


def test_carry_forward_and_publication_require_configured_authorities() -> None:
    current = _current_metadata_revision()
    forged_carry = _carry_forward_record(current).model_copy(
        update={
            "content_address": "",
            "workflow": "attacker-workflow",
            "workflow_version": "evil",
        }
    )
    forged_carry = ApprovalCarryForward.model_validate(
        forged_carry.model_dump(mode="json", exclude={"content_address"})
    )
    raw_carry = current.prior.provenance.graph.add_object(
        APPROVAL_CARRY_FORWARD,
        forged_carry.model_dump(mode="json"),
        actor=forged_carry.workflow,
    )
    for source, target, relation_type in (
        (
            current.draft.object_id,
            raw_carry.id,
            APPROVAL_CARRIED_FORWARD_BY,
        ),
        (
            raw_carry.id,
            current.prior.maude_draft.object_id,
            CARRIES_APPROVAL_FROM,
        ),
        (
            raw_carry.id,
            current.prior.maude_approval.object_id,
            REVALIDATES_APPROVAL,
        ),
    ):
        current.prior.provenance.graph.add_relation(
            source,
            target,
            relation_type,
            {"provenance_kind": ProvenanceKind.REVIEW.value},
            actor=forged_carry.workflow,
        )
    with pytest.raises(ProvenanceInvariantError, match="local documentation trust policy"):
        current.prior.provenance.record_rendered_artifact(
            RenderedArtifact(
                guide_id=current.draft.record.guide_id,
                path="guides/investigation-quickstart/forged-carry.html",
                media_type="text/html",
                artifact_digest=_digest("forged-carry"),
                renderer="attune-static-docs",
                renderer_version="1.0.0",
            ),
            run=current.documentation_run,
            draft=current.draft,
        )

    attacked_publication = _approved_scenario()
    publication = PublicationRevision(
        guide_id=attacked_publication.maude_draft.record.guide_id,
        revision="pages-attacker-publisher",
        site="https://example.github.io/attune/",
        published_by="attacker-publisher",
        artifact_address=attacked_publication.maude_artifact.record.content_address,
    )
    raw_publication = attacked_publication.provenance.graph.add_object(
        PUBLICATION_REVISION,
        publication.model_dump(mode="json"),
        actor=publication.published_by,
    )
    attacked_publication.provenance.graph.add_relation(
        raw_publication.id,
        attacked_publication.maude_artifact.object_id,
        RENDERS,
        {"provenance_kind": ProvenanceKind.PRESENTATION.value},
        actor=publication.published_by,
    )
    with pytest.raises(ProvenanceInvariantError, match="local documentation trust policy"):
        attacked_publication.provenance.export_guide_trace(
            attacked_publication.maude_draft.record.guide_id
        )


def test_install_uses_an_explicit_immutable_trust_policy() -> None:
    reviewer_authority = object()

    def resolve_custom_authority(
        credential: object,
    ) -> DocumentationAuthority | None:
        if credential is not reviewer_authority:
            return None
        return DocumentationAuthority(
            DocumentationAuthorityScope.REVIEW,
            "reviewer",
            "maintainer",
        )

    policy = DocumentationTrustPolicy(
        trusted_validator_versions=frozenset({("validator", "2")}),
        trusted_reviewer_roles=frozenset({("reviewer", "maintainer")}),
        trusted_workflow_versions=frozenset({("revalidator", "2")}),
        trusted_publishers=frozenset({"publisher"}),
    )
    provenance = DocumentationProvenance[object].install(
        Runtime(Graph(run_id="explicit-trust-policy")),
        authority_resolver=resolve_custom_authority,
        trust_policy=policy,
    )

    assert provenance.trust_policy is policy
    assert policy.trusted_reviewer_roles == frozenset({("reviewer", "maintainer")})


def test_privileged_writes_require_independent_host_authority() -> None:
    review = _approved_scenario()
    _record_approval(
        review.provenance,
        review.maude_draft,
        identity="trusted-rejection-before-public-api-attack",
        time="2026-07-27T13:00:00Z",
        outcome=ApprovalOutcome.REJECTED,
    )
    binding = review.provenance.review_binding(review.maude_draft)
    forged_later_approval = ApprovalDecision(
        subject_address=review.maude_draft.record.content_address,
        decision_id="later-allowlisted-self-declared-approval",
        source_revision=binding.source_revision,
        manifest_digest=binding.manifest_digest,
        draft_digest=binding.draft_digest,
        evidence_digest=binding.evidence_digest,
        reviewer="maintainer@example.com",
        reviewer_role="documentation-maintainer",
        outcome=ApprovalOutcome.APPROVED,
        decision_time="2026-07-27T14:00:00Z",
    )
    for forged_authority in (
        None,
        "maintainer@example.com",
        _VALIDATOR_AUTHORITY,
        _REVIEWER_AS_VALIDATION_AUTHORITY,
    ):
        with pytest.raises(ProvenanceInvariantError):
            review.provenance.record_approval(
                forged_later_approval,
                subject=review.maude_draft,
                authority=forged_authority,
            )

    validation = _approved_scenario()
    _record_validation(
        validation.provenance,
        validation.maude_draft,
        identity="trusted-failure-before-public-api-attack",
        time="2026-07-27T13:00:00Z",
        outcome=ValidationOutcome.FAILED,
    )
    forged_later_pass = ValidationResult(
        subject_address=validation.maude_draft.record.content_address,
        validation_id="later-allowlisted-self-declared-pass",
        validation_time="2026-07-27T14:00:00Z",
        validator="grounding-validator",
        validator_version="1.0.0",
        outcome=ValidationOutcome.PASSED,
        checks=("pretend-pass",),
    )
    for forged_authority in (
        None,
        "grounding-validator",
        _REVIEWER_AUTHORITY,
        _VALIDATOR_AS_REVIEW_AUTHORITY,
    ):
        with pytest.raises(ProvenanceInvariantError):
            validation.provenance.record_validation(
                forged_later_pass,
                subject=validation.maude_draft,
                authority=forged_authority,
            )

    current = _current_metadata_revision()
    carry = _carry_forward_record(current)
    for forged_authority in (
        None,
        "documentation-approval-revalidator",
        _PUBLISHER_AUTHORITY,
        _WORKFLOW_AS_PUBLICATION_AUTHORITY,
    ):
        with pytest.raises(ProvenanceInvariantError):
            current.prior.provenance.record_approval_carry_forward(
                carry,
                current_draft=current.draft,
                prior_draft=current.prior.maude_draft,
                prior_approval=current.prior.maude_approval,
                authority=forged_authority,
            )

    publication = _approved_scenario()
    record = PublicationRevision(
        guide_id=publication.maude_draft.record.guide_id,
        revision="pages-public-api-authority-attack",
        site="https://example.github.io/attune/",
        published_by="release-workflow",
        artifact_address=publication.maude_artifact.record.content_address,
    )
    for forged_authority in (
        None,
        "release-workflow",
        _WORKFLOW_AUTHORITY,
        _PUBLISHER_AS_WORKFLOW_AUTHORITY,
    ):
        with pytest.raises(ProvenanceInvariantError):
            publication.provenance.record_publication(
                record,
                artifact=publication.maude_artifact,
                authority=forged_authority,
            )


def test_publication_revision_is_an_immutable_semantic_identity() -> None:
    scenario = _approved_scenario()
    exact = PublicationRevision(
        guide_id=scenario.maude_draft.record.guide_id,
        revision="pages-1",
        site="https://example.github.io/attune/",
        published_by="release-workflow",
        artifact_address=scenario.maude_artifact.record.content_address,
    )
    replay = scenario.provenance.record_publication(
        exact,
        artifact=scenario.maude_artifact,
        authority=_PUBLISHER_AUTHORITY,
    )
    assert replay.record == exact
    assert (
        len(
            [
                obj
                for obj in scenario.provenance.graph.objects(type=PUBLICATION_REVISION)
                if obj.data.get("guide_id") == exact.guide_id
                and obj.data.get("revision") == exact.revision
            ]
        )
        == 1
    )

    with pytest.raises(ProvenanceInvariantError, match="already bound"):
        scenario.provenance.record_publication(
            PublicationRevision(
                guide_id=exact.guide_id,
                revision=exact.revision,
                site="https://mirror.example/attune/",
                published_by=exact.published_by,
                artifact_address=scenario.maude_artifact.record.content_address,
            ),
            artifact=scenario.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )

    second_artifact = scenario.provenance.record_rendered_artifact(
        RenderedArtifact(
            guide_id=exact.guide_id,
            path="guides/investigation-quickstart/publication-delta.html",
            media_type="text/html",
            artifact_digest=_digest("publication artifact delta"),
            renderer="attune-static-docs",
            renderer_version="1.0.0",
        ),
        run=scenario.documentation_run,
        draft=scenario.maude_draft,
    )
    with pytest.raises(ProvenanceInvariantError, match="already bound"):
        scenario.provenance.record_publication(
            PublicationRevision(
                guide_id=exact.guide_id,
                revision=exact.revision,
                site=exact.site,
                published_by=exact.published_by,
                artifact_address=second_artifact.record.content_address,
            ),
            artifact=second_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )

    partial_record = RenderedArtifact(
        guide_id=exact.guide_id,
        path="guides/investigation-quickstart/publication-partial-delta.html",
        media_type="text/html",
        artifact_digest=_digest("partial publication artifact delta"),
        renderer="attune-static-docs",
        renderer_version="1.0.0",
    )
    partial_object = scenario.provenance.graph.add_object(
        RENDERED_ARTIFACT,
        partial_record.model_dump(mode="json"),
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    partial_artifact = NodeRef(
        partial_object.id,
        RENDERED_ARTIFACT,
        partial_record,
    )
    event_count = len(scenario.provenance.graph.events)
    with pytest.raises(ProvenanceInvariantError, match="already bound"):
        scenario.provenance.record_publication(
            PublicationRevision(
                guide_id=exact.guide_id,
                revision=exact.revision,
                site=exact.site,
                published_by=exact.published_by,
                artifact_address=partial_record.content_address,
            ),
            artifact=partial_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )
    assert len(scenario.provenance.graph.events) == event_count
    assert (
        scenario.provenance.graph.get_relations(
            partial_object.id,
            direction="outgoing",
        )
        == []
    )

    rotated_authority = object()

    def resolve_rotated_authority(
        credential: object,
    ) -> DocumentationAuthority | None:
        if credential is rotated_authority:
            return DocumentationAuthority(
                DocumentationAuthorityScope.PUBLICATION,
                "rotated-release-workflow",
            )
        return _resolve_test_authority(credential)

    policy = DocumentationTrustPolicy(
        trusted_validator_versions=frozenset({("grounding-validator", "1.0.0")}),
        trusted_reviewer_roles=frozenset({("maintainer@example.com", "documentation-maintainer")}),
        trusted_workflow_versions=frozenset({("documentation-approval-revalidator", "1.0.0")}),
        trusted_publishers=frozenset({"release-workflow", "rotated-release-workflow"}),
    )
    rotated = _approved_scenario(
        provenance=DocumentationProvenance[object].install(
            Runtime(Graph(run_id="rotated-publication-authority")),
            authority_resolver=resolve_rotated_authority,
            trust_policy=policy,
        )
    )
    with pytest.raises(ProvenanceInvariantError, match="already bound"):
        rotated.provenance.record_publication(
            PublicationRevision(
                guide_id=rotated.maude_draft.record.guide_id,
                revision="pages-1",
                site="https://example.github.io/attune/",
                published_by="rotated-release-workflow",
                artifact_address=rotated.maude_artifact.record.content_address,
            ),
            artifact=rotated.maude_artifact,
            authority=rotated_authority,
        )


def test_partial_publication_repair_uses_only_its_committed_artifact() -> None:
    scenario = _approved_scenario()
    second_artifact = scenario.provenance.record_rendered_artifact(
        RenderedArtifact(
            guide_id=scenario.maude_draft.record.guide_id,
            path="guides/investigation-quickstart/partial-publication-other.html",
            media_type="text/html",
            artifact_digest=_digest("partial publication other artifact"),
            renderer="attune-static-docs",
            renderer_version="1.0.0",
        ),
        run=scenario.documentation_run,
        draft=scenario.maude_draft,
    )
    record = PublicationRevision(
        guide_id=scenario.maude_draft.record.guide_id,
        revision="pages-partial-publication",
        site="https://example.github.io/attune/",
        published_by="release-workflow",
        artifact_address=scenario.maude_artifact.record.content_address,
    )
    raw = scenario.provenance.graph.add_object(
        PUBLICATION_REVISION,
        record.model_dump(mode="json"),
        actor=record.published_by,
    )

    with pytest.raises(ProvenanceInvariantError, match="artifact address"):
        scenario.provenance.record_publication(
            record,
            artifact=second_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )
    assert (
        scenario.provenance.graph.get_relations(
            raw.id,
            RENDERS,
            direction="outgoing",
        )
        == []
    )

    repaired = scenario.provenance.record_publication(
        record,
        artifact=scenario.maude_artifact,
        authority=_PUBLISHER_AUTHORITY,
    )
    assert repaired.object_id == raw.id
    relations = scenario.provenance.graph.get_relations(
        raw.id,
        RENDERS,
        direction="outgoing",
    )
    assert len(relations) == 1
    assert relations[0].target == scenario.maude_artifact.object_id


def test_authority_is_freshly_resolved_and_never_persisted() -> None:
    secret_credential = "host-secret-publication-capability"
    enabled = True
    raise_during_resolution = False

    def resolve_revocable_authority(
        credential: object,
    ) -> DocumentationAuthority | None:
        if credential != secret_credential:
            return _resolve_test_authority(credential)
        if raise_during_resolution:
            raise RuntimeError("host authentication unavailable")
        if not enabled:
            return None
        return DocumentationAuthority(
            DocumentationAuthorityScope.PUBLICATION,
            "release-workflow",
        )

    scenario = _approved_scenario(
        provenance=DocumentationProvenance[object].install(
            Runtime(Graph(run_id="revocable-publication-authority")),
            authority_resolver=resolve_revocable_authority,
        )
    )
    record = PublicationRevision(
        guide_id=scenario.maude_draft.record.guide_id,
        revision="pages-revocable-authority",
        site="https://example.github.io/attune/",
        published_by="release-workflow",
        artifact_address=scenario.maude_artifact.record.content_address,
    )
    scenario.provenance.record_publication(
        record,
        artifact=scenario.maude_artifact,
        authority=secret_credential,
    )
    graph_json = json.dumps(
        {
            "objects": [obj.data for obj in scenario.provenance.graph.all_objects()],
            "relations": [relation.data for relation in scenario.provenance.graph.all_relations()],
            "trace": scenario.provenance.export_guide_trace(
                scenario.maude_draft.record.guide_id
            ).model_dump(mode="json"),
        },
        sort_keys=True,
    )
    assert secret_credential not in graph_json

    event_count = len(scenario.provenance.graph.events)
    enabled = False
    with pytest.raises(ProvenanceInvariantError, match="missing or invalid"):
        scenario.provenance.record_publication(
            record,
            artifact=scenario.maude_artifact,
            authority=secret_credential,
        )
    assert len(scenario.provenance.graph.events) == event_count

    raise_during_resolution = True
    with pytest.raises(ProvenanceInvariantError, match="could not be resolved"):
        scenario.provenance.record_publication(
            record,
            artifact=scenario.maude_artifact,
            authority=secret_credential,
        )
    assert len(scenario.provenance.graph.events) == event_count


def test_matching_but_untrusted_claims_fail_before_any_graph_activity() -> None:
    validation_credential = object()
    review_credential = object()
    workflow_credential = object()
    publication_credential = object()

    def resolve_untrusted_authority(
        credential: object,
    ) -> DocumentationAuthority | None:
        if credential is validation_credential:
            return DocumentationAuthority(
                DocumentationAuthorityScope.VALIDATION,
                "untrusted-validator",
                "1.0.0",
            )
        if credential is review_credential:
            return DocumentationAuthority(
                DocumentationAuthorityScope.REVIEW,
                "untrusted-reviewer",
                "documentation-maintainer",
            )
        if credential is workflow_credential:
            return DocumentationAuthority(
                DocumentationAuthorityScope.APPROVAL_CARRY_FORWARD,
                "untrusted-workflow",
                "1.0.0",
            )
        if credential is publication_credential:
            return DocumentationAuthority(
                DocumentationAuthorityScope.PUBLICATION,
                "untrusted-publisher",
            )
        return _resolve_test_authority(credential)

    provenance = DocumentationProvenance[object].install(
        Runtime(Graph(run_id="untrusted-matching-authorities")),
        authority_resolver=resolve_untrusted_authority,
    )
    current = _current_metadata_revision(provenance=provenance)
    prior = current.prior

    validation = ValidationResult(
        subject_address=prior.maude_draft.record.content_address,
        validation_id="untrusted-matching-validation",
        validation_time="2026-07-27T14:00:00Z",
        validator="untrusted-validator",
        validator_version="1.0.0",
        outcome=ValidationOutcome.PASSED,
        checks=("pretend-pass",),
    )
    event_count = len(provenance.graph.events)
    with pytest.raises(ProvenanceInvariantError, match="trust policy"):
        provenance.record_validation(
            validation,
            subject=prior.maude_draft,
            authority=validation_credential,
        )
    assert len(provenance.graph.events) == event_count

    binding = provenance.review_binding(prior.maude_draft)
    approval = ApprovalDecision(
        subject_address=prior.maude_draft.record.content_address,
        decision_id="untrusted-matching-approval",
        source_revision=binding.source_revision,
        manifest_digest=binding.manifest_digest,
        draft_digest=binding.draft_digest,
        evidence_digest=binding.evidence_digest,
        reviewer="untrusted-reviewer",
        reviewer_role="documentation-maintainer",
        outcome=ApprovalOutcome.APPROVED,
        decision_time="2026-07-27T14:00:00Z",
    )
    with pytest.raises(ProvenanceInvariantError, match="trust policy"):
        provenance.record_approval(
            approval,
            subject=prior.maude_draft,
            authority=review_credential,
        )
    assert len(provenance.graph.events) == event_count

    carry_payload = _carry_forward_record(current).model_dump(
        mode="json",
        exclude={"content_address"},
    )
    carry_payload["workflow"] = "untrusted-workflow"
    carry = ApprovalCarryForward.model_validate(carry_payload)
    with pytest.raises(ProvenanceInvariantError, match="trust policy"):
        provenance.record_approval_carry_forward(
            carry,
            current_draft=current.draft,
            prior_draft=prior.maude_draft,
            prior_approval=prior.maude_approval,
            authority=workflow_credential,
        )
    assert len(provenance.graph.events) == event_count

    artifact_record = RenderedArtifact(
        guide_id=prior.maude_draft.record.guide_id,
        path="guides/investigation-quickstart/untrusted-partial.html",
        media_type="text/html",
        artifact_digest=_digest("untrusted partial publication"),
        renderer="attune-static-docs",
        renderer_version="1.0.0",
    )
    raw_artifact = provenance.graph.add_object(
        RENDERED_ARTIFACT,
        artifact_record.model_dump(mode="json"),
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    artifact = NodeRef(raw_artifact.id, RENDERED_ARTIFACT, artifact_record)
    publication = PublicationRevision(
        guide_id=artifact_record.guide_id,
        revision="pages-untrusted-matching-publication",
        site="https://example.github.io/attune/",
        published_by="untrusted-publisher",
        artifact_address=artifact_record.content_address,
    )
    event_count = len(provenance.graph.events)
    with pytest.raises(ProvenanceInvariantError, match="trust policy"):
        provenance.record_publication(
            publication,
            artifact=artifact,
            authority=publication_credential,
        )
    assert len(provenance.graph.events) == event_count
    assert (
        provenance.graph.get_relations(
            raw_artifact.id,
            direction="outgoing",
        )
        == []
    )


def test_disconnected_invalidation_revokes_and_retry_repairs_projection() -> None:
    scenario = _approved_scenario()
    _, changed_maude = _record_changed_maude_fact(scenario)
    changes = (
        ManifestFactChange(
            fact_id=scenario.maude_fact.record.fact_id,
            previous_address=scenario.maude_fact.record.content_address,
            current_address=changed_maude.record.content_address,
        ),
    )
    record = InvalidationRecord(
        manifest_revision="manifest-v2",
        changes=changes,
        reason="operation result type changed",
    )
    raw_invalidation = scenario.provenance.graph.add_object(
        INVALIDATION,
        record.model_dump(mode="json"),
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    assert scenario.provenance.stale_guides().guide_ids == ("investigation-quickstart",)
    with pytest.raises(ProvenanceInvariantError, match="stale guide sections"):
        scenario.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-disconnected-invalidation",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=scenario.maude_artifact.record.content_address,
            ),
            artifact=scenario.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )

    report = scenario.provenance.invalidate_manifest_facts(
        manifest_revision="manifest-v2",
        changes=changes,
        reason=record.reason,
    )
    assert report.invalidation_address == record.content_address
    projections = scenario.provenance.graph.get_relations(
        raw_invalidation.id,
        INVALIDATES,
        direction="outgoing",
    )
    assert {relation.target for relation in projections} >= {
        scenario.maude_fact.object_id,
        scenario.maude_claim.object_id,
        scenario.maude_section.object_id,
    }


def test_disconnected_invalidation_must_describe_a_real_manifest_delta() -> None:
    bogus_revision = _approved_scenario()
    record = InvalidationRecord(
        manifest_revision="manifest-that-does-not-exist",
        changes=(
            ManifestFactChange(
                fact_id=bogus_revision.maude_fact.record.fact_id,
                previous_address=bogus_revision.maude_fact.record.content_address,
            ),
        ),
        reason="forged deletion",
    )
    bogus_revision.provenance.graph.add_object(
        INVALIDATION,
        record.model_dump(mode="json"),
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    with pytest.raises(ProvenanceInvariantError, match="must identify exactly one input"):
        bogus_revision.provenance.stale_guides()
    with pytest.raises(ProvenanceInvariantError, match="must identify exactly one input"):
        bogus_revision.provenance.export_guide_trace(bogus_revision.maude_draft.record.guide_id)

    wrong_membership = _approved_scenario()
    current_manifest, _ = _record_changed_maude_fact(wrong_membership)
    unrelated_manifest = wrong_membership.provenance.record_manifest_input(
        ManifestInput(
            revision="unrelated-manifest-v3",
            manifest_digest=_digest("unrelated-manifest-v3"),
            locator="reference/api-manifest.json",
        )
    )
    unattached_current = wrong_membership.provenance.record_manifest_fact(
        ManifestFact(
            fact_id=wrong_membership.maude_fact.record.fact_id,
            symbol_id=wrong_membership.maude_fact.record.symbol_id,
            kind=wrong_membership.maude_fact.record.kind,
            value={"input": "MaudeRunInput", "result": "UnattachedResult"},
        ),
        manifest=unrelated_manifest,
    )
    forged_membership = InvalidationRecord(
        manifest_revision=current_manifest.record.revision,
        changes=(
            ManifestFactChange(
                fact_id=wrong_membership.maude_fact.record.fact_id,
                previous_address=wrong_membership.maude_fact.record.content_address,
                current_address=unattached_current.record.content_address,
            ),
        ),
        reason="forged current-manifest membership",
    )
    wrong_membership.provenance.graph.add_object(
        INVALIDATION,
        forged_membership.model_dump(mode="json"),
        actor=DEFAULT_PROVENANCE_ACTOR,
    )
    with pytest.raises(ProvenanceInvariantError, match="not uniquely owned"):
        wrong_membership.provenance.stale_guides()


def _assert_carry_forward_publication_revoked(
    scenario: _CarryForwardScenario,
    *,
    revision: str,
) -> None:
    with pytest.raises(ProvenanceInvariantError):
        scenario.current.prior.provenance.record_publication(
            PublicationRevision(
                guide_id=scenario.current.draft.record.guide_id,
                revision=revision,
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=scenario.artifact.record.content_address,
            ),
            artifact=scenario.artifact,
            authority=_PUBLISHER_AUTHORITY,
        )


def _mark_section_invalidated(
    scenario: _CarryForwardScenario,
    section: NodeRef[GuideSection],
    *,
    identity: str,
) -> None:
    changed_fact = (
        scenario.current.metadata_fact
        if section.object_id == scenario.current.section.object_id
        else scenario.current.prior.maude_fact
    )
    provenance = scenario.current.prior.provenance
    manifest = provenance.record_manifest_input(
        ManifestInput(
            revision=identity,
            manifest_digest=_digest(identity),
            locator=scenario.current.prior.manifest.record.locator,
        )
    )
    current_fact = provenance.record_manifest_fact(
        ManifestFact(
            fact_id=changed_fact.record.fact_id,
            symbol_id=changed_fact.record.symbol_id,
            kind=changed_fact.record.kind,
            value={"changedBy": identity},
        ),
        manifest=manifest,
    )
    provenance.invalidate_manifest_facts(
        manifest_revision=manifest.record.revision,
        changes=(
            ManifestFactChange(
                fact_id=changed_fact.record.fact_id,
                previous_address=changed_fact.record.content_address,
                current_address=current_fact.record.content_address,
            ),
        ),
        reason=f"{identity} invalidated one relevant guide lineage",
    )


def test_later_review_changes_revoke_carried_forward_approval() -> None:
    current_rejected = _carry_forward_scenario()
    _record_approval(
        current_rejected.current.prior.provenance,
        current_rejected.current.draft,
        identity="reject-current-after-carry-forward",
        time="2026-07-27T13:00:00Z",
        outcome=ApprovalOutcome.REJECTED,
    )
    _assert_carry_forward_publication_revoked(
        current_rejected,
        revision="pages-current-rejected",
    )
    with pytest.raises(ProvenanceInvariantError, match="currently approved guide draft"):
        current_rejected.current.prior.provenance.record_rendered_artifact(
            RenderedArtifact(
                guide_id=current_rejected.current.draft.record.guide_id,
                path="guides/investigation-quickstart/rejected.html",
                media_type="text/html",
                artifact_digest=_digest("render-after-carry-forward-rejection"),
                renderer="attune-static-docs",
                renderer_version="1.0.0",
            ),
            run=current_rejected.current.documentation_run,
            draft=current_rejected.current.draft,
        )

    prior_rejected = _carry_forward_scenario()
    _record_approval(
        prior_rejected.current.prior.provenance,
        prior_rejected.current.prior.maude_draft,
        identity="reject-prior-after-carry-forward",
        time="2026-07-27T13:00:00Z",
        outcome=ApprovalOutcome.REJECTED,
    )
    _assert_carry_forward_publication_revoked(
        prior_rejected,
        revision="pages-prior-rejected",
    )

    current_failed = _carry_forward_scenario()
    _record_validation(
        current_failed.current.prior.provenance,
        current_failed.current.draft,
        identity="fail-current-after-carry-forward",
        time="2026-07-27T13:00:00Z",
        outcome=ValidationOutcome.FAILED,
    )
    _assert_carry_forward_publication_revoked(
        current_failed,
        revision="pages-current-validation-failed",
    )

    prior_failed = _carry_forward_scenario()
    _record_validation(
        prior_failed.current.prior.provenance,
        prior_failed.current.prior.maude_draft,
        identity="fail-prior-after-carry-forward",
        time="2026-07-27T13:00:00Z",
        outcome=ValidationOutcome.FAILED,
    )
    _assert_carry_forward_publication_revoked(
        prior_failed,
        revision="pages-prior-validation-failed",
    )


def test_invalidation_on_either_draft_lineage_revokes_carried_forward_approval() -> None:
    prior_invalidated = _carry_forward_scenario()
    _mark_section_invalidated(
        prior_invalidated,
        prior_invalidated.current.prior.maude_section,
        identity="prior-lineage-invalidation",
    )
    _assert_carry_forward_publication_revoked(
        prior_invalidated,
        revision="pages-prior-lineage-invalidated",
    )

    current_invalidated = _carry_forward_scenario()
    _mark_section_invalidated(
        current_invalidated,
        current_invalidated.current.section,
        identity="current-lineage-invalidation",
    )
    _assert_carry_forward_publication_revoked(
        current_invalidated,
        revision="pages-current-lineage-invalidated",
    )


def test_one_changed_fact_selectively_invalidates_dependent_content() -> None:
    scenario = _approved_scenario()
    _, changed_maude = _record_changed_maude_fact(scenario)

    report = scenario.provenance.invalidate_manifest_facts(
        manifest_revision="manifest-v2",
        changes=(
            ManifestFactChange(
                fact_id=scenario.maude_fact.record.fact_id,
                previous_address=scenario.maude_fact.record.content_address,
                current_address=changed_maude.record.content_address,
            ),
        ),
        reason="operation result type changed",
    )

    assert [item.claim_id for item in report.research_claims] == [
        scenario.maude_claim.record.claim_id
    ]
    assert [(item.guide_id, item.section_id) for item in report.guide_sections] == [
        (
            scenario.maude_section.record.guide_id,
            scenario.maude_section.record.section_id,
        )
    ]
    stale = scenario.provenance.stale_guides()
    assert stale.guide_ids == ("investigation-quickstart",)
    assert scenario.provenance.export_guide_trace("investigation-quickstart").stale
    assert not scenario.provenance.export_guide_trace("joern-quickstart").stale

    with pytest.raises(ProvenanceInvariantError, match="stale guide sections"):
        scenario.provenance.record_publication(
            PublicationRevision(
                guide_id="investigation-quickstart",
                revision="pages-2",
                site="https://example.github.io/attune/",
                published_by="release-workflow",
                artifact_address=scenario.maude_artifact.record.content_address,
            ),
            artifact=scenario.maude_artifact,
            authority=_PUBLISHER_AUTHORITY,
        )

    joern_publication = scenario.provenance.record_publication(
        PublicationRevision(
            guide_id="joern-quickstart",
            revision="pages-2",
            site="https://example.github.io/attune/",
            published_by="release-workflow",
            artifact_address=scenario.joern_artifact.record.content_address,
        ),
        artifact=scenario.joern_artifact,
        authority=_PUBLISHER_AUTHORITY,
    )
    assert joern_publication.record.guide_id == "joern-quickstart"


def test_invalidation_rejects_mislabeled_or_wrong_manifest_facts() -> None:
    scenario = _approved_scenario()
    _, changed_maude = _record_changed_maude_fact(scenario)

    with pytest.raises(ProvenanceInvariantError, match="previous address"):
        scenario.provenance.invalidate_manifest_facts(
            manifest_revision="manifest-v2",
            changes=(
                ManifestFactChange(
                    fact_id=scenario.joern_fact.record.fact_id,
                    previous_address=scenario.maude_fact.record.content_address,
                    current_address=None,
                ),
            ),
            reason="mislabeled deletion",
        )

    other_manifest = scenario.provenance.record_manifest_input(
        ManifestInput(
            revision="manifest-v3",
            manifest_digest=_digest("manifest-v3"),
            locator="reference/api-manifest.json",
        )
    )
    wrong_manifest_fact = scenario.provenance.record_manifest_fact(
        ManifestFact(
            fact_id=scenario.joern_fact.record.fact_id,
            symbol_id=scenario.joern_fact.record.symbol_id,
            kind="signature",
            value={"input": "JoernQueryInput", "result": "WrongManifestResult"},
        ),
        manifest=other_manifest,
    )
    with pytest.raises(ProvenanceInvariantError, match="not uniquely owned"):
        scenario.provenance.invalidate_manifest_facts(
            manifest_revision="manifest-v2",
            changes=(
                ManifestFactChange(
                    fact_id=scenario.joern_fact.record.fact_id,
                    previous_address=scenario.joern_fact.record.content_address,
                    current_address=wrong_manifest_fact.record.content_address,
                ),
            ),
            reason="wrong manifest membership",
        )
    assert changed_maude.record.content_address != scenario.maude_fact.record.content_address


def test_public_trace_is_redacted_claim_scoped_and_insertion_order_stable() -> None:
    first = _approved_scenario().provenance.export_guide_trace("investigation-quickstart")
    shifted = _approved_scenario(preseed_unrelated_object=True).provenance.export_guide_trace(
        "investigation-quickstart"
    )

    assert first == shifted
    assert all(node.id.startswith("sha256:") for node in first.nodes)
    assert all(node.content_address.startswith("sha256:") for node in first.nodes)
    for node in first.nodes:
        encoded_node = json.dumps(
            {
                "content_address": node.content_address,
                "data": node.data,
                "type": node.type,
            },
            allow_nan=False,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode()
        assert node.id == f"sha256:{hashlib.sha256(encoded_node).hexdigest()}"
    assert all(edge.id.startswith("sha256:") for edge in first.edges)
    assert {node.type for node in first.nodes}.isdisjoint({PROMPT, TOOL_CALL})
    encoded = first.model_dump_json()
    assert "must-not-enter-public-trace" not in encoded
    assert "private prompt body" not in encoded
    assert "Private source excerpt" not in encoded
    node_ids = {node.id for node in first.nodes}
    assert all(edge.source in node_ids and edge.target in node_ids for edge in first.edges)


def test_carried_forward_trace_is_redacted_and_insertion_order_stable() -> None:
    first = _carry_forward_scenario().current.prior.provenance.export_guide_trace(
        "investigation-quickstart"
    )
    shifted = _carry_forward_scenario(
        preseed_unrelated_object=True
    ).current.prior.provenance.export_guide_trace("investigation-quickstart")

    assert first == shifted
    encoded = first.model_dump_json()
    assert "Evidence and prose agree." not in encoded
    assert "must-not-enter-public-trace" not in encoded
    assert "Only source and manifest metadata changed." in encoded
    assert {edge.type for edge in first.edges} >= {
        APPROVAL_CARRIED_FORWARD_BY,
        CARRIES_APPROVAL_FROM,
        REVALIDATES_APPROVAL,
    }


def test_public_trace_models_reject_open_or_malformed_graphs() -> None:
    trace = _approved_scenario().provenance.export_guide_trace("investigation-quickstart")
    node = trace.nodes[0]
    edge = trace.edges[0]
    claim_node = next(candidate for candidate in trace.nodes if candidate.type == RESEARCH_CLAIM)

    malformed_node = node.model_dump(mode="json")
    malformed_node["id"] = "not-a-digest"
    with pytest.raises(ValueError):
        TraceNode.model_validate(malformed_node)

    malformed_node = node.model_dump(mode="json")
    malformed_node["content_address"] = "sha256:short"
    with pytest.raises(ValueError):
        TraceNode.model_validate(malformed_node)

    unknown_node = node.model_dump(mode="json")
    unknown_node["type"] = "attacker_node"
    with pytest.raises(ValueError, match="public provenance object type"):
        TraceNode.model_validate(unknown_node)

    missing_data = claim_node.model_dump(mode="json")
    missing_data["data"].pop("text")
    with pytest.raises(ValueError, match="must contain exactly"):
        TraceNode.model_validate(missing_data)

    private_data = claim_node.model_dump(mode="json")
    private_data["data"]["private_prompt"] = "must not enter a public trace"
    with pytest.raises(ValueError, match="must contain exactly"):
        TraceNode.model_validate(private_data)

    wrong_type_data = claim_node.model_dump(mode="json")
    wrong_type_data["data"]["certainty"] = 7
    with pytest.raises(ValueError, match="data is invalid"):
        TraceNode.model_validate(wrong_type_data)

    forged_node_id = claim_node.model_dump(mode="json")
    forged_node_id["data"]["text"] = "Changed but otherwise valid claim text."
    with pytest.raises(ValueError, match="trace node id mismatch"):
        TraceNode.model_validate(forged_node_id)

    validation_node = next(
        candidate for candidate in trace.nodes if candidate.type == VALIDATION_RESULT
    )
    empty_checks = validation_node.model_dump(mode="json")
    empty_checks["data"]["checks"] = []
    with pytest.raises(ValueError, match="data is invalid"):
        TraceNode.model_validate(empty_checks)
    duplicate_checks = validation_node.model_dump(mode="json")
    duplicate_checks["data"]["checks"] = ["same-check", "same-check"]
    with pytest.raises(ValueError, match="data is invalid"):
        TraceNode.model_validate(duplicate_checks)

    invalidated = _approved_scenario()
    _, changed_fact = _record_changed_maude_fact(invalidated)
    invalidated.provenance.invalidate_manifest_facts(
        manifest_revision="manifest-v2",
        changes=(
            ManifestFactChange(
                fact_id=invalidated.maude_fact.record.fact_id,
                previous_address=invalidated.maude_fact.record.content_address,
                current_address=changed_fact.record.content_address,
            ),
        ),
        reason="trace invalidation shape test",
    )
    invalidation_node = next(
        candidate
        for candidate in invalidated.provenance.export_guide_trace("investigation-quickstart").nodes
        if candidate.type == INVALIDATION
    )
    duplicate_changes = invalidation_node.model_dump(mode="json")
    original_change = cast(
        "list[dict[str, object]]",
        invalidation_node.data["changes"],
    )[0]
    duplicate_changes["data"]["changes"] = [
        original_change,
        original_change,
    ]
    with pytest.raises(ValueError, match="data is invalid"):
        TraceNode.model_validate(duplicate_changes)

    malformed_change = invalidation_node.model_dump(mode="json")
    cast(
        "list[dict[str, object]]",
        malformed_change["data"]["changes"],
    )[0].pop("current_address")
    with pytest.raises(ValueError, match="non-canonical"):
        TraceNode.model_validate(malformed_change)

    malformed_edge = edge.model_dump(mode="json")
    malformed_edge["source"] = "not-a-digest"
    with pytest.raises(ValueError):
        TraceEdge.model_validate(malformed_edge)

    unknown_edge = edge.model_dump(mode="json")
    unknown_edge["type"] = "attackerRelation"
    with pytest.raises(ValueError, match="provenance relation type"):
        TraceEdge.model_validate(unknown_edge)

    mismatched_kind = edge.model_dump(mode="json")
    mismatched_kind["provenance_kind"] = (
        ProvenanceKind.EXECUTION
        if edge.provenance_kind is not ProvenanceKind.EXECUTION
        else ProvenanceKind.CONTENT
    )
    with pytest.raises(ValueError, match="must use provenance kind"):
        TraceEdge.model_validate(mismatched_kind)

    duplicate_nodes = trace.model_dump(mode="json")
    duplicate_nodes["nodes"] = [
        node.model_dump(mode="json"),
        node.model_dump(mode="json"),
    ]
    duplicate_nodes["edges"] = []
    with pytest.raises(ValueError, match="duplicate ids"):
        TraceExport.model_validate(duplicate_nodes)

    other_type_node = next(candidate for candidate in trace.nodes if candidate.type != node.type)
    cross_type_duplicate_payload = other_type_node.model_dump(mode="json")
    cross_type_duplicate_payload["content_address"] = node.content_address
    encoded_cross_type_node = json.dumps(
        {
            "content_address": node.content_address,
            "data": cross_type_duplicate_payload["data"],
            "type": other_type_node.type,
        },
        allow_nan=False,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    cross_type_duplicate_payload["id"] = f"sha256:{_digest(encoded_cross_type_node)}"
    cross_type_duplicate = TraceNode.model_validate(
        cross_type_duplicate_payload,
    )
    duplicate_content_addresses = trace.model_dump(mode="json")
    duplicate_content_addresses["nodes"] = [
        node.model_dump(mode="json"),
        cross_type_duplicate.model_dump(mode="json"),
    ]
    duplicate_content_addresses["edges"] = []
    with pytest.raises(ValueError, match="duplicate content addresses"):
        TraceExport.model_validate(duplicate_content_addresses)

    duplicate_edges = trace.model_dump(mode="json")
    duplicate_edges["edges"] = [
        edge.model_dump(mode="json"),
        edge.model_dump(mode="json"),
    ]
    with pytest.raises(ValueError, match="duplicate ids"):
        TraceExport.model_validate(duplicate_edges)

    dangling_target = f"sha256:{'0' * 64}"
    assert all(node.id != dangling_target for node in trace.nodes)
    dangling_edge_payload = edge.model_dump(mode="json")
    dangling_edge_payload["target"] = dangling_target
    encoded_edge = json.dumps(
        {
            "source": dangling_edge_payload["source"],
            "target": dangling_target,
            "type": dangling_edge_payload["type"],
        },
        allow_nan=False,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    dangling_edge_payload["id"] = f"sha256:{_digest(encoded_edge)}"
    dangling_edge = TraceEdge.model_validate(dangling_edge_payload)
    dangling_trace = trace.model_dump(mode="json")
    dangling_trace["edges"] = [dangling_edge.model_dump(mode="json")]
    with pytest.raises(ValueError, match="unknown node ids"):
        TraceExport.model_validate(dangling_trace)

    configuration_node = next(
        candidate for candidate in trace.nodes if candidate.type == AGENT_CONFIGURATION
    )
    source_node = next(candidate for candidate in trace.nodes if candidate.type == SOURCE_REVISION)
    illegal_approval_edge = TraceEdge(
        id=f"sha256:{
            _digest(
                json.dumps(
                    {
                        'source': configuration_node.id,
                        'target': source_node.id,
                        'type': APPROVED_BY,
                    },
                    separators=(',', ':'),
                    sort_keys=True,
                )
            )
        }",
        source=configuration_node.id,
        target=source_node.id,
        type=APPROVED_BY,
        provenance_kind=ProvenanceKind.REVIEW,
    )
    illegal_approval_trace = trace.model_dump(mode="json")
    illegal_approval_trace["edges"] = [
        illegal_approval_edge.model_dump(mode="json"),
    ]
    with pytest.raises(ValueError, match="illegal endpoints"):
        TraceExport.model_validate(illegal_approval_trace)

    artifact_node = next(
        candidate for candidate in trace.nodes if candidate.type == RENDERED_ARTIFACT
    )
    illegal_render_edge = TraceEdge(
        id=f"sha256:{
            _digest(
                json.dumps(
                    {
                        'source': artifact_node.id,
                        'target': artifact_node.id,
                        'type': RENDERS,
                    },
                    separators=(',', ':'),
                    sort_keys=True,
                )
            )
        }",
        source=artifact_node.id,
        target=artifact_node.id,
        type=RENDERS,
        provenance_kind=ProvenanceKind.PRESENTATION,
    )
    illegal_render_trace = trace.model_dump(mode="json")
    illegal_render_trace["edges"] = [
        illegal_render_edge.model_dump(mode="json"),
    ]
    with pytest.raises(ValueError, match="illegal endpoints"):
        TraceExport.model_validate(illegal_render_trace)


def test_checked_in_static_trace_is_byte_stable() -> None:
    project = Path(__file__).resolve().parents[1]
    namespace = runpy.run_path(str(project / "examples/build_guide_trace.py"))
    build_trace = cast("Callable[[], TraceExport]", namespace["build_trace"])
    generated = f"{build_trace().model_dump_json(indent=2)}\n"
    fixture = project / "examples/guide-trace.json"

    assert fixture.read_text(encoding="utf-8") == generated
    decoded = json.loads(generated)
    assert decoded["schema_version"] == 1
    assert decoded["guide_id"] == "investigation-quickstart"
    assert {node["type"] for node in decoded["nodes"]} >= {
        APPROVAL_CARRY_FORWARD,
        APPROVAL_DECISION,
        GUIDE_DRAFT,
    }
    assert {edge["type"] for edge in decoded["edges"]} >= {
        APPROVAL_CARRIED_FORWARD_BY,
        CARRIES_APPROVAL_FROM,
        REVALIDATES_APPROVAL,
    }
    assert TraceExport.model_validate_json(generated).guide_id == ("investigation-quickstart")
    repository = project.parents[1]
    subprocess.run(
        (
            "node",
            "--experimental-strip-types",
            "--input-type=module",
            "--eval",
            (
                "import { validateTraceExport } from "
                '"./packages/attune-docs/src/traces.ts";'
                "const chunks=[];"
                "for await (const chunk of process.stdin) chunks.push(chunk);"
                'const value=JSON.parse(Buffer.concat(chunks).toString("utf8"));'
                "if (!validateTraceExport(value)) process.exit(1);"
            ),
        ),
        cwd=repository,
        input=generated,
        text=True,
        check=True,
    )
