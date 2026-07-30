"""Small, frozen contracts for the research benchmark and its publication bundle."""

from __future__ import annotations

import hashlib
import json
from enum import StrEnum
from math import ceil
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from attune_activegraph.generated.models import JoernStructuredDsl


class Model(BaseModel):
    """Every boundary document is closed and immutable."""

    model_config = ConfigDict(extra="forbid", frozen=True)


def canonical_bytes(value: BaseModel | object) -> bytes:
    """Return stable JSON bytes for a model or JSON-compatible value."""

    data = (
        value.model_dump(mode="json", exclude_none=True) if isinstance(value, BaseModel) else value
    )
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def digest(value: BaseModel | object) -> str:
    """Content address a public document without depending on a database."""

    return f"sha256:{hashlib.sha256(canonical_bytes(value)).hexdigest()}"


type NonEmptyText = Annotated[str, Field(min_length=1)]


class Topology(StrEnum):
    SINGLE = "single"
    SWARM = "swarm"


class CapabilityProfile(StrEnum):
    CONVENTIONAL = "conventional"
    ATTUNE = "attune"


class PriorState(StrEnum):
    COLD = "cold"
    PROSE = "prose"
    PACKET = "motif-packet"
    ENSHRINED = "enshrined"


class ClaimState(StrEnum):
    PROPOSED = "proposed"
    SUPPORTED = "supported"
    CHALLENGED = "challenged"
    REJECTED = "rejected"
    SURVIVED_CURRENT_TESTS = "survived-current-tests"
    UNRESOLVED = "unresolved"


class RunStatus(StrEnum):
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    INCOMPLETE = "incomplete"


class Certainty(StrEnum):
    MEASURED = "measured"
    INFERENCE = "inference"
    SPECULATION = "speculation"


class ResearchBudget(Model):
    prompt_tokens: Annotated[int, Field(ge=0)]
    completion_tokens: Annotated[int, Field(ge=0)]
    model_calls: Annotated[int, Field(ge=0)]


class Case(Model):
    id: Annotated[str, Field(min_length=1)]
    repository: Annotated[str, Field(min_length=1)]
    revision: Annotated[str, Field(min_length=1)]
    question: Annotated[str, Field(min_length=1)]
    evaluator: Annotated[str, Field(min_length=1)]
    public_description: Annotated[str, Field(min_length=1)]

    @computed_field
    @property
    def case_digest(self) -> str:
        return digest(self.model_dump(exclude={"case_digest"}))


class ResearchBenchSettings(Model):
    topology: Topology
    capability_profile: CapabilityProfile
    prior_state: PriorState
    prior_artifact_digest: str | None = None
    case_id: Annotated[str, Field(min_length=1)]
    campaign_id: Annotated[str, Field(min_length=1)]
    aggregate_budget: ResearchBudget
    cache_policy: tuple[str, ...] = ()
    model_configuration_digest: str = "unconfigured"
    prompt_digest: str = "unconfigured"
    common_tool_digest: str = "unconfigured"

    @computed_field
    @property
    def settings_digest(self) -> str:
        return digest(self.model_dump(exclude={"settings_digest"}))


class Claim(Model):
    id: Annotated[str, Field(min_length=1)]
    statement: Annotated[str, Field(min_length=1)]
    state: ClaimState
    scope: tuple[str, ...] = ()
    limitations: tuple[str, ...] = ()


class Evidence(Model):
    id: Annotated[str, Field(min_length=1)]
    summary: Annotated[str, Field(min_length=1)]
    refs: tuple[str, ...] = ()
    snapshot: str | None = None
    complete: bool = True


class InterpretationLedger(Model):
    """One explicit, model-authored decision between evidence forms."""

    schema_version: Literal[1] = 1
    case_id: NonEmptyText
    question: NonEmptyText
    source_refs: Annotated[tuple[NonEmptyText, ...], Field(min_length=1)]
    retained: Annotated[tuple[NonEmptyText, ...], Field(min_length=1)]
    omitted: tuple[NonEmptyText, ...] = ()
    assumptions: tuple[NonEmptyText, ...] = ()
    next_step: NonEmptyText
    expected_discriminator: NonEmptyText
    limitations: tuple[NonEmptyText, ...] = ()
    supersedes: NonEmptyText | None = None

    @computed_field
    @property
    def ledger_digest(self) -> str:
        return digest(self.model_dump(exclude={"ledger_digest"}))


class LedgerReference(Model):
    """Opaque content address returned to the next capability call."""

    ref: NonEmptyText


class Lowering(Model):
    artifact_ref: str | None = None
    kind: Literal["ast-grep", "other"] | None = None
    proven_scope: str | None = None
    omitted_semantics: tuple[str, ...] = ()


class JoernQuery(Model):
    """One stored query using either the native or generated bridge route."""

    cpgql: str | None = None
    dsl: JoernStructuredDsl | None = None

    @model_validator(mode="after")
    def _one_route(self) -> JoernQuery:
        if (self.cpgql is None) == (self.dsl is None):
            raise ValueError("Joern packet entry needs exactly one of cpgql or dsl")
        return self

    @property
    def retained_form(self) -> str:
        if self.cpgql is not None:
            return self.cpgql
        if self.dsl is None:
            raise RuntimeError("validated Joern query has no retained form")
        return self.dsl.model_dump_json(by_alias=True)


class Result(Model):
    case_id: str
    primary_claim: str
    claim_ids: tuple[str, ...]
    evidence_ids: tuple[str, ...]
    locations: tuple[str, ...]
    scope: tuple[str, ...] = ()
    falsifier: str | None = None
    non_falsifier_reason: str | None = None
    lowering: Lowering | None = None
    residual_uncertainty: tuple[str, ...] = ()
    retained_ledger_refs: tuple[str, ...] = ()
    packet_candidate: bool = False
    final_state: ClaimState = ClaimState.UNRESOLVED


class Packet(Model):
    schema_version: Literal[1] = 1
    motif_id: str
    source_case_ids: tuple[str, ...]
    source_run_ids: tuple[str, ...]
    source_artifact_refs: tuple[str, ...]
    claim: str
    applicability: tuple[str, ...] = ()
    exclusion_cues: tuple[str, ...] = ()
    repository_signals: tuple[str, ...] = ()
    joern_queries: tuple[JoernQuery, ...] = ()
    formal_artifacts: tuple[str, ...] = ()
    falsifiers: tuple[str, ...] = ()
    counterexamples: tuple[str, ...] = ()
    lowerings: tuple[Lowering, ...] = ()
    ledgers: tuple[InterpretationLedger, ...] = ()
    unresolved_questions: tuple[str, ...] = ()

    @computed_field
    @property
    def packet_digest(self) -> str:
        return digest(self.model_dump(exclude={"packet_digest"}))


class TrialMetrics(Model):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    provider_cost: float | None = None
    model_calls: int = 0
    gross_milliseconds: int = 0
    discovery_milliseconds: int = 0
    model_milliseconds: int = 0
    native_milliseconds: int = 0
    tool_calls: int = 0
    tool_failures: int = 0
    repeated_reads: int = 0
    duplicated_experiments: int = 0
    conflicting_claims: int = 0
    synthesis_tokens: int = 0
    concurrent_branches: bool = False

    @property
    def cost_units(self) -> float:
        return (
            self.provider_cost
            if self.provider_cost is not None
            else float(self.prompt_tokens + self.completion_tokens)
        )

    @property
    def tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens


class Evaluation(Model):
    evaluator: str
    fixture_digest: str
    scores: dict[str, float]
    accepted: bool


class TrialRecord(Model):
    run_id: str
    arm_id: str
    case_id: str
    seed: str
    status: RunStatus
    settings: ResearchBenchSettings
    trace_address: str
    investigation_id: str | None = None
    final_snapshot: str | None = None
    receipt_refs: tuple[str, ...] = ()
    artifact_refs: tuple[str, ...] = ()
    cache_labels: tuple[str, ...] = ()
    metrics: TrialMetrics
    evaluation: Evaluation | None = None
    failure_code: str | None = None

    @property
    def accepted(self) -> bool:
        return self.evaluation is not None and self.evaluation.accepted


class Aggregate(Model):
    arm_id: str
    case_id: str | None = None
    count: int
    accepted_count: int
    metrics: dict[str, float | None]


class Manifest(Model):
    schema_version: Literal[1] = 1
    experiment_id: str
    campaign_id: str
    title: str
    research_questions: tuple[str, ...]
    source_revision: str
    benchmark_pack_digest: str
    evaluator_digest: str
    arms: tuple[ResearchBenchSettings, ...]
    cases: tuple[Case, ...]
    runs: tuple[TrialRecord, ...]
    aggregates: tuple[Aggregate, ...]
    comparisons: dict[str, dict[str, float | None]]
    amortization: dict[str, float | None] | None = None

    @computed_field
    @property
    def manifest_digest(self) -> str:
        return digest(self.model_dump(exclude={"manifest_digest"}))


class ReportClaim(Model):
    id: str
    statement: str
    certainty: Certainty
    metric_refs: tuple[str, ...] = ()
    run_refs: tuple[str, ...] = ()
    artifact_refs: tuple[str, ...] = ()
    limitation_refs: tuple[str, ...] = ()
    value: float | None = None
    direction: Literal["higher", "lower"] | None = None


class ReportSection(Model):
    id: str
    heading: str
    prose: str
    claims: tuple[ReportClaim, ...] = ()


class Report(Model):
    schema_version: Literal[1] = 1
    experiment_id: str
    manifest_digest: str
    title: str
    abstract: str
    sections: tuple[ReportSection, ...]
    limitations: tuple[str, ...]
    threats_to_validity: tuple[str, ...]
    next_experiments: tuple[str, ...] = ()
    unresolved_questions: tuple[str, ...] = ()

    @computed_field
    @property
    def report_digest(self) -> str:
        return digest(self.model_dump(exclude={"report_digest"}))


class ReportRequest(Model):
    """The exact bounded input a host may give its report-model behavior."""

    manifest: Manifest
    public_cases: tuple[str, ...]
    editorial_policy: tuple[str, ...]
    prior_pages: tuple[str, ...] = ()
    framing: str | None = None


class Approval(Model):
    experiment_id: str
    manifest_digest: str
    report_digest: str
    evidence_digest: str
    exporter_version: str
    reviewer: str
    decision_id: str
    decided_at: str
    decision: Literal["approved"] = "approved"

    @computed_field
    @property
    def approval_digest(self) -> str:
        return digest(self.model_dump(exclude={"approval_digest"}))


class PublicationBundle(Model):
    schema_version: Literal[1] = 1
    experiment_id: str
    manifest_digest: str
    report_digest: str
    evidence_digest: str
    approval_digest: str
    activegraph_publication_address: str
    exporter_version: str
    prior_revision: str | None = None

    @computed_field
    @property
    def publication_digest(self) -> str:
        return digest(self.model_dump(exclude={"publication_digest"}))


def break_even(
    source_cost: float | None, marginal_cost: float | None, baseline_cost: float | None
) -> int | None:
    """Return the first related target count that repays source research."""

    if source_cost is None or marginal_cost is None or baseline_cost is None:
        return None
    savings = baseline_cost - marginal_cost
    if savings <= 0:
        return None
    return max(0, ceil((source_cost - marginal_cost) / savings))
