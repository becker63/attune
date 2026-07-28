"""Python-owned experiment facts, grounded narrative checks, and bundle export."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from .model import (
    Aggregate,
    Approval,
    Certainty,
    Manifest,
    PublicationBundle,
    Report,
    ReportClaim,
    ReportRequest,
    TrialRecord,
    digest,
)

EXPORTER_VERSION = "researchbench-v0"


def report_request(
    manifest: Manifest,
    *,
    editorial_policy: tuple[str, ...],
    prior_pages: tuple[str, ...] = (),
    framing: str | None = None,
) -> ReportRequest:
    """Construct the constrained input for the host's report-model behavior."""

    return ReportRequest(
        manifest=manifest,
        public_cases=tuple(case.public_description for case in manifest.cases),
        editorial_policy=editorial_policy,
        prior_pages=prior_pages,
        framing=framing,
    )


def _json(value: object) -> str:
    return json.dumps(value, sort_keys=True, indent=2, ensure_ascii=True) + "\n"


def _cost(record: TrialRecord) -> float:
    metrics = record.metrics
    return (
        metrics.provider_cost
        if metrics.provider_cost is not None
        else float(metrics.prompt_tokens + metrics.completion_tokens)
    )


def _aggregate(arm_id: str, records: tuple[TrialRecord, ...]) -> Aggregate:
    accepted = [record for record in records if record.evaluation and record.evaluation.accepted]
    total_cost = sum(_cost(record) for record in records)
    metrics = {
        "cost_per_accepted": total_cost / len(accepted) if accepted else None,
        "accepted_rate": len(accepted) / len(records) if records else None,
        "gross_milliseconds": float(sum(record.metrics.gross_milliseconds for record in records)),
        "native_milliseconds": float(sum(record.metrics.native_milliseconds for record in records)),
        "prompt_tokens": float(sum(record.metrics.prompt_tokens for record in records)),
        "completion_tokens": float(sum(record.metrics.completion_tokens for record in records)),
    }
    return Aggregate(
        arm_id=arm_id, count=len(records), accepted_count=len(accepted), metrics=metrics
    )


def make_manifest(
    *,
    experiment_id: str,
    campaign_id: str,
    title: str,
    questions: tuple[str, ...],
    source_revision: str,
    pack_digest: str,
    evaluator_digest: str,
    runs: tuple[TrialRecord, ...],
) -> Manifest:
    """Project all terminal and incomplete rows into one factual document."""

    grouped: dict[str, list[TrialRecord]] = defaultdict(list)
    for record in runs:
        grouped[record.arm_id].append(record)
    aggregates = tuple(_aggregate(arm, tuple(records)) for arm, records in sorted(grouped.items()))
    by_arm = {aggregate.arm_id: aggregate for aggregate in aggregates}

    def ratio(numerator: str, denominator: str) -> float | None:
        left = by_arm.get(numerator)
        right = by_arm.get(denominator)
        if left is None or right is None:
            return None
        numerator_cost = left.metrics["cost_per_accepted"]
        denominator_cost = right.metrics["cost_per_accepted"]
        if numerator_cost in (None, 0.0) or denominator_cost is None:
            return None
        return denominator_cost / numerator_cost

    settings = tuple({record.settings.settings_digest: record.settings for record in runs}.values())
    cases = tuple({record.case_id: record.case_id for record in runs})
    from .run import case_fixture

    return Manifest(
        experiment_id=experiment_id,
        campaign_id=campaign_id,
        title=title,
        research_questions=questions,
        source_revision=source_revision,
        benchmark_pack_digest=pack_digest,
        evaluator_digest=evaluator_digest,
        arms=settings,
        cases=tuple(case_fixture(case_id) for case_id in cases),
        runs=runs,
        aggregates=aggregates,
        comparisons={
            "C/A": {"cost_leverage": ratio("C", "A")},
            "B/A": {"cost_leverage": ratio("B", "A")},
            "C/B": {"cost_leverage": ratio("C", "B")},
        },
    )


def _metric_values(manifest: Manifest) -> dict[str, float | None]:
    values: dict[str, float | None] = {}
    for aggregate in manifest.aggregates:
        for name, value in aggregate.metrics.items():
            values[f"aggregate:{aggregate.arm_id}:{name}"] = value
    for comparison, metrics in manifest.comparisons.items():
        for name, value in metrics.items():
            values[f"comparison:{comparison}:{name}"] = value
    return values


def validate_report(report: Report, manifest: Manifest) -> tuple[str, ...]:
    """Return all claim-level problems; no model is allowed to repair facts."""

    issues: list[str] = []
    if report.experiment_id != manifest.experiment_id:
        issues.append("report experiment id is stale")
    if report.manifest_digest != manifest.manifest_digest:
        issues.append("report manifest digest is stale")
    metrics = _metric_values(manifest)
    runs = {record.run_id for record in manifest.runs}
    artifacts = {reference for record in manifest.runs for reference in record.artifact_refs}
    for section in report.sections:
        for claim in section.claims:
            _validate_claim(claim, metrics, runs, artifacts, issues)
    if not report.threats_to_validity:
        issues.append("report omits threats to validity")
    return tuple(issues)


def _validate_claim(
    claim: ReportClaim,
    metrics: dict[str, float | None],
    runs: set[str],
    artifacts: set[str],
    issues: list[str],
) -> None:
    missing_metrics = set(claim.metric_refs) - set(metrics)
    missing_runs = set(claim.run_refs) - runs
    missing_artifacts = set(claim.artifact_refs) - artifacts
    if missing_metrics:
        issues.append(f"{claim.id}: missing metrics {sorted(missing_metrics)}")
    if missing_runs:
        issues.append(f"{claim.id}: missing runs {sorted(missing_runs)}")
    if missing_artifacts:
        issues.append(f"{claim.id}: missing artifacts {sorted(missing_artifacts)}")
    if claim.certainty is Certainty.MEASURED:
        if len(claim.metric_refs) != 1 or claim.value is None:
            issues.append(f"{claim.id}: measured claim needs exactly one numeric metric")
        elif metrics.get(claim.metric_refs[0]) != claim.value:
            issues.append(f"{claim.id}: measured value is not derivable from its metric")
    if claim.certainty is Certainty.INFERENCE and not (claim.metric_refs or claim.run_refs):
        issues.append(f"{claim.id}: inference needs measured support")
    if claim.certainty is Certainty.SPECULATION and "abstract" in claim.statement.lower():
        issues.append(f"{claim.id}: speculation cannot be an established abstract finding")
    if any(
        secret in claim.statement.lower()
        for secret in ("prompt", "private message", "tool payload")
    ):
        issues.append(f"{claim.id}: claim contains redacted material")


def approve(
    report: Report, manifest: Manifest, *, reviewer: str, decision_id: str, decided_at: str
) -> Approval:
    """Make approval explicit and bind it to exactly one immutable revision."""

    issues = validate_report(report, manifest)
    if issues:
        raise ValueError("cannot approve invalid report: " + "; ".join(issues))
    evidence = evidence_projection(report)
    return Approval(
        experiment_id=manifest.experiment_id,
        manifest_digest=manifest.manifest_digest,
        report_digest=report.report_digest,
        evidence_digest=digest(evidence),
        exporter_version=EXPORTER_VERSION,
        reviewer=reviewer,
        decision_id=decision_id,
        decided_at=decided_at,
    )


def evidence_projection(report: Report) -> dict[str, object]:
    """Derive evidence solely from reviewed claim references."""

    return {
        "schemaVersion": 1,
        "experimentId": report.experiment_id,
        "claims": [
            {
                "id": claim.id,
                "certainty": claim.certainty.value,
                "metrics": claim.metric_refs,
                "runs": claim.run_refs,
                "artifacts": claim.artifact_refs,
                "limitations": claim.limitation_refs,
            }
            for section in report.sections
            for claim in section.claims
        ],
    }


def publication_link(bundle: PublicationBundle, runs: tuple[TrialRecord, ...]) -> dict[str, object]:
    """Small redacted link suitable for an existing generic trace/event record."""

    return {
        "publication": bundle.publication_digest,
        "activegraph": bundle.activegraph_publication_address,
        "runs": tuple(record.run_id for record in runs),
        "evaluators": tuple(
            record.evaluation.fixture_digest for record in runs if record.evaluation is not None
        ),
    }


def render_markdown(manifest: Manifest, report: Report, approval: Approval) -> str:
    """Render facts from the manifest and prose from the already-valid report."""

    issues = validate_report(report, manifest)
    if issues:
        raise ValueError("cannot render invalid report: " + "; ".join(issues))
    if (
        approval.manifest_digest != manifest.manifest_digest
        or approval.report_digest != report.report_digest
    ):
        raise ValueError("approval does not bind this report and manifest")
    rows = "\n".join(
        "| "
        f"{item.arm_id} | {item.count} | {item.accepted_count} | "
        f"{item.metrics['cost_per_accepted']} |"
        for item in manifest.aggregates
    )
    sections = "\n\n".join(
        f"## {section.heading}\n\n{section.prose}" for section in report.sections
    )
    return (
        f"# {report.title}\n\n{report.abstract}\n\n"
        f"Publication status: approved by `{approval.reviewer}`.\n\n"
        "## Measured results\n\n"
        "| Arm | Runs | Accepted | Cost per accepted result |\n"
        "| --- | ---: | ---: | ---: |\n"
        f"{rows}\n\n{sections}\n\n## Threats to validity\n\n"
        + "\n".join(f"- {threat}" for threat in report.threats_to_validity)
        + "\n"
    )


def export_bundle(
    root: Path,
    slug: str,
    manifest: Manifest,
    report: Report,
    approval: Approval,
    *,
    activegraph_publication_address: str,
    prior_revision: str | None = None,
) -> PublicationBundle:
    """Write the five closed files below an explicit experiment directory."""

    markdown = render_markdown(manifest, report, approval)
    evidence = evidence_projection(report)
    bundle = PublicationBundle(
        experiment_id=manifest.experiment_id,
        manifest_digest=manifest.manifest_digest,
        report_digest=report.report_digest,
        evidence_digest=digest(evidence),
        approval_digest=approval.approval_digest,
        activegraph_publication_address=activegraph_publication_address,
        exporter_version=EXPORTER_VERSION,
        prior_revision=prior_revision,
    )
    target = root / slug
    target.mkdir(parents=True, exist_ok=True)
    files: dict[str, str] = {
        "publication.json": _json(bundle.model_dump(mode="json")),
        "manifest.json": _json(manifest.model_dump(mode="json")),
        "report.json": _json(report.model_dump(mode="json")),
        "approval.json": _json(approval.model_dump(mode="json")),
        "evidence.json": _json(evidence),
        "index.md": markdown,
    }
    for name, content in files.items():
        path = target / name
        if path.exists() and path.read_bytes() != content.encode():
            raise ValueError(f"immutable bundle already exists with different {name}: {path}")
        path.write_text(content)
    return bundle


def schema_documents() -> dict[str, dict[str, Any]]:
    """The only source for closed docs-side JSON Schema files."""

    from .model import Approval, Manifest, PublicationBundle, Report

    return {
        "experiment-manifest.schema.json": Manifest.model_json_schema(),
        "experiment-report.schema.json": Report.model_json_schema(),
        "experiment-approval.schema.json": Approval.model_json_schema(),
        "experiment-publication.schema.json": PublicationBundle.model_json_schema(),
    }


def schema_drift(schema_root: Path) -> tuple[str, ...]:
    """Return mismatched schema names without rewriting checked-in authority."""

    expected = {name: _json(document).encode() for name, document in schema_documents().items()}
    return tuple(
        name
        for name, content in expected.items()
        if not (schema_root / name).is_file() or (schema_root / name).read_bytes() != content
    )
