"""Build the checked-in guide trace consumed by the static documentation site."""

from __future__ import annotations

import hashlib
from pathlib import Path

from activegraph import Graph, Runtime  # pyright: ignore[reportMissingTypeStubs]

from attune_activegraph.provenance import (
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
    GuideDraft,
    GuideSection,
    ManifestFact,
    ManifestInput,
    PublicationRevision,
    RenderedArtifact,
    ResearchClaim,
    RunStatus,
    SourceRevision,
    ToolCallRecord,
    ToolCallStatus,
    TraceExport,
    ValidationOutcome,
    ValidationResult,
)


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


_VALIDATOR_AUTHORITY = object()
_REVIEWER_AUTHORITY = object()
_WORKFLOW_AUTHORITY = object()
_PUBLISHER_AUTHORITY = object()


def _resolve_authority(
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
            "documentation-maintainer",
            "maintainer",
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
    return None


def build_trace() -> TraceExport:
    """Create a small, complete research-to-publication provenance trace."""

    runtime = Runtime(Graph(run_id="example-documentation-run"))
    provenance = DocumentationProvenance[object].install(
        runtime,
        authority_resolver=_resolve_authority,
    )
    source = provenance.record_source_revision(
        SourceRevision(
            repository="attune-main-v2",
            revision="example-source-v1",
            source_digest=_digest("example source tree"),
        )
    )
    manifest = provenance.record_manifest_input(
        ManifestInput(
            revision="example-manifest-v1",
            manifest_digest=_digest("example manifest"),
            locator="reference/api-manifest.json",
        )
    )
    fact = provenance.record_manifest_fact(
        ManifestFact(
            fact_id="investigation.execute.active-only",
            symbol_id="investigation.InvestigationService.execute",
            kind="lifecycle",
            value={"requires": "ActiveInvestigation"},
        ),
        manifest=manifest,
    )
    research_configuration = provenance.record_agent_configuration(
        AgentConfiguration(
            agent_name="repository-researcher",
            agent_version="1.0.0",
            model="grounded-research-model",
        )
    )
    research_run = provenance.record_run(
        AgentRun(
            run_identity="example-research-run",
            kind=AgentKind.RESEARCH,
            status=RunStatus.COMPLETED,
            agent_name="repository-researcher",
            agent_version="1.0.0",
        ),
        configuration=research_configuration,
        inputs=(source, manifest),
    )
    provenance.record_tool_call(
        ToolCallRecord(
            call_id="private-research-call",
            tool_name="repository_read",
            arguments={"token": "must-not-enter-public-trace"},
            result={"private": "must-not-enter-public-trace"},
            status=ToolCallStatus.COMPLETED,
        ),
        run=research_run,
    )
    claim = provenance.record_research_claim(
        ResearchClaim(
            claim_id="research.active-execution",
            text="Only an active investigation can execute an operation.",
            certainty=Certainty.DIRECT,
        ),
        run=research_run,
        derived_from=(fact,),
        cites=(fact,),
    )
    provenance.record_validation(
        ValidationResult(
            subject_address=claim.record.content_address,
            validation_id="claim-grounding-v1",
            validation_time="2026-07-27T11:55:00Z",
            validator="grounding-validator",
            validator_version="1.0.0",
            outcome=ValidationOutcome.PASSED,
            checks=("known-fact", "current-manifest"),
        ),
        subject=claim,
        authority=_VALIDATOR_AUTHORITY,
    )
    claim_binding = provenance.review_binding(claim)
    provenance.record_approval(
        ApprovalDecision(
            subject_address=claim.record.content_address,
            decision_id="claim-review-v1",
            source_revision=claim_binding.source_revision,
            manifest_digest=claim_binding.manifest_digest,
            draft_digest=claim_binding.draft_digest,
            evidence_digest=claim_binding.evidence_digest,
            reviewer="documentation-maintainer",
            reviewer_role="maintainer",
            outcome=ApprovalOutcome.APPROVED,
            decision_time="2026-07-27T12:00:00Z",
        ),
        subject=claim,
        authority=_REVIEWER_AUTHORITY,
    )

    documentation_configuration = provenance.record_agent_configuration(
        AgentConfiguration(
            agent_name="onboarding-writer",
            agent_version="1.0.0",
            model="grounded-documentation-model",
        )
    )
    documentation_run = provenance.record_run(
        AgentRun(
            run_identity="example-guide-run",
            kind=AgentKind.DOCUMENTATION,
            status=RunStatus.COMPLETED,
            agent_name="onboarding-writer",
            agent_version="1.0.0",
        ),
        configuration=documentation_configuration,
        inputs=(source, manifest),
    )
    section = provenance.record_guide_section(
        GuideSection(
            guide_id="investigation-quickstart",
            section_id="execute",
            heading="Execute an operation",
            prose="Use the active investigation capability to execute a typed operation.",
            claim_ids=(claim.record.claim_id,),
            manifest_revision=manifest.record.revision,
        ),
        run=documentation_run,
        informed_by=(claim,),
        cites=(fact,),
    )
    provenance.record_validation(
        ValidationResult(
            subject_address=section.record.content_address,
            validation_id="section-grounding-v1",
            validation_time="2026-07-27T12:02:00Z",
            validator="grounding-validator",
            validator_version="1.0.0",
            outcome=ValidationOutcome.PASSED,
            checks=("known-fact", "approved-research", "current-manifest"),
        ),
        subject=section,
        authority=_VALIDATOR_AUTHORITY,
    )
    draft = provenance.record_guide_draft(
        GuideDraft(
            guide_id=section.record.guide_id,
            source_revision=source.record.revision,
            manifest_revision=manifest.record.revision,
            manifest_digest=manifest.record.manifest_digest,
            draft_digest=_digest("example complete structured guide draft"),
            evidence_digest=_digest("example complete guide evidence"),
            section_addresses=(section.record.content_address,),
        ),
        run=documentation_run,
        source=source,
        manifest=manifest,
        sections=(section,),
    )
    provenance.record_validation(
        ValidationResult(
            subject_address=draft.record.content_address,
            validation_id="guide-grounding-v1",
            validation_time="2026-07-27T12:03:00Z",
            validator="grounding-validator",
            validator_version="1.0.0",
            outcome=ValidationOutcome.PASSED,
            checks=("known-fact", "approved-research", "current-manifest"),
        ),
        subject=draft,
        authority=_VALIDATOR_AUTHORITY,
    )
    draft_binding = provenance.review_binding(draft)
    prior_approval = provenance.record_approval(
        ApprovalDecision(
            subject_address=draft.record.content_address,
            decision_id="guide-review-v1",
            source_revision=draft_binding.source_revision,
            manifest_digest=draft_binding.manifest_digest,
            draft_digest=draft_binding.draft_digest,
            evidence_digest=draft_binding.evidence_digest,
            reviewer="documentation-maintainer",
            reviewer_role="maintainer",
            outcome=ApprovalOutcome.APPROVED,
            decision_time="2026-07-27T12:05:00Z",
        ),
        subject=draft,
        authority=_REVIEWER_AUTHORITY,
    )

    current_source = provenance.record_source_revision(
        SourceRevision(
            repository=source.record.repository,
            revision="example-source-v2-metadata-only",
            source_digest=_digest("example source tree with unrelated metadata"),
        )
    )
    current_manifest = provenance.record_manifest_input(
        ManifestInput(
            revision="example-manifest-v2-metadata-only",
            manifest_digest=_digest("example manifest with unrelated metadata"),
            locator=manifest.record.locator,
        )
    )
    provenance.record_manifest_fact(fact.record, manifest=current_manifest)
    current_documentation_run = provenance.record_run(
        AgentRun(
            run_identity="example-guide-run-metadata-v2",
            kind=AgentKind.DOCUMENTATION,
            status=RunStatus.COMPLETED,
            agent_name="onboarding-writer",
            agent_version="1.0.0",
        ),
        configuration=documentation_configuration,
        inputs=(current_source, current_manifest),
    )
    current_section = provenance.record_guide_section(
        GuideSection(
            guide_id=section.record.guide_id,
            section_id=section.record.section_id,
            heading=section.record.heading,
            prose=section.record.prose,
            claim_ids=section.record.claim_ids,
            manifest_revision=current_manifest.record.revision,
        ),
        run=current_documentation_run,
        informed_by=(claim,),
        cites=(fact,),
    )
    provenance.record_validation(
        ValidationResult(
            subject_address=current_section.record.content_address,
            validation_id="section-grounding-metadata-v2",
            validation_time="2026-07-27T12:07:00Z",
            validator="grounding-validator",
            validator_version="1.0.0",
            outcome=ValidationOutcome.PASSED,
            checks=("known-fact", "approved-research", "current-manifest"),
        ),
        subject=current_section,
        authority=_VALIDATOR_AUTHORITY,
    )
    current_draft = provenance.record_guide_draft(
        GuideDraft(
            guide_id=current_section.record.guide_id,
            source_revision=current_source.record.revision,
            manifest_revision=current_manifest.record.revision,
            manifest_digest=current_manifest.record.manifest_digest,
            draft_digest=draft.record.draft_digest,
            evidence_digest=draft.record.evidence_digest,
            section_addresses=(current_section.record.content_address,),
        ),
        run=current_documentation_run,
        source=current_source,
        manifest=current_manifest,
        sections=(current_section,),
    )
    provenance.record_validation(
        ValidationResult(
            subject_address=current_draft.record.content_address,
            validation_id="guide-grounding-metadata-v2",
            validation_time="2026-07-27T12:08:00Z",
            validator="grounding-validator",
            validator_version="1.0.0",
            outcome=ValidationOutcome.PASSED,
            checks=("known-fact", "approved-research", "current-manifest"),
        ),
        subject=current_draft,
        authority=_VALIDATOR_AUTHORITY,
    )
    provenance.record_approval_carry_forward(
        ApprovalCarryForward(
            carry_forward_id="guide-review-metadata-v2",
            current_draft_address=current_draft.record.content_address,
            prior_draft_address=draft.record.content_address,
            prior_approval_address=prior_approval.record.content_address,
            draft_digest=current_draft.record.draft_digest,
            evidence_digest=current_draft.record.evidence_digest,
            workflow="documentation-approval-revalidator",
            workflow_version="1.0.0",
            revalidation_time="2026-07-27T12:10:00Z",
            reason="Only source and manifest metadata changed.",
        ),
        current_draft=current_draft,
        prior_draft=draft,
        prior_approval=prior_approval,
        authority=_WORKFLOW_AUTHORITY,
    )
    artifact = provenance.record_rendered_artifact(
        RenderedArtifact(
            guide_id=current_section.record.guide_id,
            path="guides/investigation-quickstart/index.html",
            media_type="text/html",
            artifact_digest=_digest("example rendered guide"),
            renderer="attune-static-docs",
            renderer_version="1.0.0",
        ),
        run=current_documentation_run,
        draft=current_draft,
    )
    provenance.record_publication(
        PublicationRevision(
            guide_id=current_section.record.guide_id,
            revision="example-pages-v1",
            site="https://example.github.io/attune/",
            published_by="release-workflow",
            artifact_address=artifact.record.content_address,
        ),
        artifact=artifact,
        authority=_PUBLISHER_AUTHORITY,
    )
    return provenance.export_guide_trace(current_section.record.guide_id)


def main() -> None:
    build_trace().write_json(Path(__file__).with_name("guide-trace.json"))


if __name__ == "__main__":
    main()
