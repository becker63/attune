"""Typed ActiveGraph provenance for grounded research and onboarding guides.

The adapter in this module records two independent stories:

* content provenance says why a claim or guide section is supported; and
* execution provenance says which agent run, prompt, configuration, and tools
  produced it.

A successful execution is therefore never treated as factual support.  The
static documentation build can export the resulting trace as JSON and does not
need ActiveGraph at read time.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import defaultdict, deque
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from pathlib import Path
from typing import Any, Literal, Self, cast

import rfc8785
from activegraph import (  # pyright: ignore[reportMissingTypeStubs]
    Graph,
    Object,
    ObjectType,
    Pack,
    Relation,
    RelationType,
    Runtime,
)
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    JsonValue,
    field_validator,
    model_validator,
)

PROVENANCE_SCHEMA_VERSION = 1
PROVENANCE_PACK_VERSION = "0.3.0"
DEFAULT_PROVENANCE_ACTOR = "attune-documentation-provenance"
_ADDRESS_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")

SOURCE_REVISION = "attune_doc_source_revision"
MANIFEST_INPUT = "attune_doc_manifest_input"
MANIFEST_FACT = "attune_doc_manifest_fact"
AGENT_CONFIGURATION = "attune_doc_agent_configuration"
AGENT_RUN = "attune_doc_agent_run"
PROMPT = "attune_doc_prompt"
TOOL_CALL = "attune_doc_tool_call"
EVIDENCE = "attune_doc_evidence"
RESEARCH_CLAIM = "attune_doc_research_claim"
UNRESOLVED_QUESTION = "attune_doc_unresolved_question"
GUIDE_SECTION = "attune_doc_guide_section"
GUIDE_DRAFT = "attune_doc_guide_draft"
VALIDATION_RESULT = "attune_doc_validation_result"
APPROVAL_DECISION = "attune_doc_approval_decision"
APPROVAL_CARRY_FORWARD = "attune_doc_approval_carry_forward"
RENDERED_ARTIFACT = "attune_doc_rendered_artifact"
PUBLICATION_REVISION = "attune_doc_publication_revision"
INVALIDATION = "attune_doc_invalidation"

DERIVED_FROM = "derivedFrom"
INFORMED_BY = "informedBy"
CITES = "cites"
VALIDATED_BY = "validatedBy"
APPROVED_BY = "approvedBy"
APPROVAL_CARRIED_FORWARD_BY = "approvalCarriedForwardBy"
CARRIES_APPROVAL_FROM = "carriesApprovalFrom"
REVALIDATES_APPROVAL = "revalidatesApproval"
RENDERS = "renders"

USES_INPUT = "usesInput"
CONFIGURED_BY = "configuredBy"
USES_PROMPT = "usesPrompt"
INVOKES = "invokes"
PRODUCED_BY = "producedBy"
INVALIDATES = "invalidates"

_CONTENT_EDGES = frozenset({DERIVED_FROM, INFORMED_BY, CITES})
_EXECUTION_EDGES = frozenset({USES_INPUT, CONFIGURED_BY, USES_PROMPT, INVOKES, PRODUCED_BY})
_REVIEW_EDGES = frozenset(
    {
        VALIDATED_BY,
        APPROVED_BY,
        APPROVAL_CARRIED_FORWARD_BY,
        CARRIES_APPROVAL_FROM,
        REVALIDATES_APPROVAL,
    }
)
_PRESENTATION_EDGES = frozenset({RENDERS})
_INVALIDATION_EDGES = frozenset({INVALIDATES})
_PUBLIC_TRACE_EDGES = frozenset(
    {
        DERIVED_FROM,
        INFORMED_BY,
        CITES,
        USES_INPUT,
        CONFIGURED_BY,
        PRODUCED_BY,
        VALIDATED_BY,
        APPROVED_BY,
        APPROVAL_CARRIED_FORWARD_BY,
        CARRIES_APPROVAL_FROM,
        REVALIDATES_APPROVAL,
        RENDERS,
        INVALIDATES,
    }
)


class ProvenanceInvariantError(ValueError):
    """A requested provenance relation would violate the publication contract."""


class AgentKind(StrEnum):
    RESEARCH = "research"
    DOCUMENTATION = "documentation"


class RunStatus(StrEnum):
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Certainty(StrEnum):
    DIRECT = "direct"
    INFERENCE = "inference"


class ValidationOutcome(StrEnum):
    PASSED = "passed"
    FAILED = "failed"


class ApprovalOutcome(StrEnum):
    APPROVED = "approved"
    REJECTED = "rejected"


class QuestionStatus(StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"


class ToolCallStatus(StrEnum):
    COMPLETED = "completed"
    FAILED = "failed"


class ProvenanceKind(StrEnum):
    CONTENT = "content"
    EXECUTION = "execution"
    REVIEW = "review"
    PRESENTATION = "presentation"
    INVALIDATION = "invalidation"


class DocumentationAuthorityScope(StrEnum):
    VALIDATION = "validation"
    REVIEW = "review"
    APPROVAL_CARRY_FORWARD = "approval-carry-forward"
    PUBLICATION = "publication"


@dataclass(frozen=True, slots=True)
class DocumentationAuthority:
    """Host-authenticated authority resolved from an opaque credential.

    ``qualifier`` is the exact validator/workflow version or reviewer role.
    Publication authority has no qualifier.
    """

    scope: DocumentationAuthorityScope
    actor: str
    qualifier: str | None = None

    def __post_init__(self) -> None:
        if not self.actor.strip():
            raise ValueError("documentation authority actor must not be blank")
        if self.scope is DocumentationAuthorityScope.PUBLICATION:
            if self.qualifier is not None:
                raise ValueError("publication authority must not have a qualifier")
        elif self.qualifier is None or not self.qualifier.strip():
            raise ValueError(f"{self.scope.value} authority requires a non-blank qualifier")


type DocumentationAuthorityResolver[CredentialT] = Callable[
    [CredentialT],
    DocumentationAuthority | None,
]


def _canonical_address(record_type: str, payload: dict[str, Any]) -> str:
    encoded = json.dumps(
        {
            "recordType": record_type,
            "schemaVersion": PROVENANCE_SCHEMA_VERSION,
            "value": payload,
        },
        allow_nan=False,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    return f"sha256:{hashlib.sha256(encoded).hexdigest()}"


def _semantic_digest(value: JsonValue) -> str:
    """Return the bare SHA-256 format used by the deterministic docs package."""

    encoded = rfc8785.dumps(value)
    return hashlib.sha256(encoded).hexdigest()


def _trace_edge_id(relation_type: str, source: str, target: str) -> str:
    value = cast(
        JsonValue,
        {
            "source": source,
            "target": target,
            "type": relation_type,
        },
    )
    return f"sha256:{_semantic_digest(value)}"


def _parse_timestamp(value: str, *, field_name: str) -> datetime:
    if (
        re.fullmatch(
            r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?"
            r"(?:Z|[+-]\d{2}:\d{2})",
            value,
        )
        is None
    ):
        raise ValueError(
            f"{field_name} must be an RFC 3339 timestamp with timezone Z or an ±HH:MM offset"
        )
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as cause:
        raise ValueError(f"{field_name} must be an ISO-8601 timestamp") from cause
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f"{field_name} must include a timezone")
    return parsed


def _utf16_sort_key(value: str) -> tuple[int, ...]:
    """Match JavaScript's deterministic UTF-16 code-unit string ordering."""

    encoded = value.encode("utf-16-be", errors="surrogatepass")
    return tuple(
        int.from_bytes(encoded[index : index + 2], "big") for index in range(0, len(encoded), 2)
    )


class AddressedRecord(BaseModel):
    """Immutable record whose address is derived from its complete semantic value."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal[1] = PROVENANCE_SCHEMA_VERSION
    content_address: str = ""

    @model_validator(mode="after")
    def _verify_content_address(self) -> Self:
        optional_free_text = {"content_address", "error", "excerpt", "message", "rationale"}
        for field_name, value in self.__dict__.items():
            if (
                isinstance(value, str)
                and field_name not in optional_free_text
                and not value.strip()
            ):
                raise ValueError(f"{field_name} must not be blank")
        payload = self.model_dump(mode="json", exclude={"content_address"})
        expected = _canonical_address(type(self).__name__, payload)
        if self.content_address and self.content_address != expected:
            msg = (
                f"content address mismatch for {type(self).__name__}: "
                f"expected {expected}, got {self.content_address}"
            )
            raise ValueError(msg)
        object.__setattr__(self, "content_address", expected)
        return self


class ContentBinding(BaseModel):
    """One immutable content-support edge stored inside its source record."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    relation_type: str
    target_address: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")

    @field_validator("relation_type")
    @classmethod
    def _require_content_relation(cls, value: str) -> str:
        if value not in _CONTENT_EDGES:
            raise ValueError("relation_type must be a content provenance edge")
        return value


class ContentBoundRecord(AddressedRecord):
    """Addressed record that commits to its exact outgoing content edges."""

    content_bindings: tuple[ContentBinding, ...] = ()

    @field_validator("content_bindings")
    @classmethod
    def _require_canonical_bindings(
        cls,
        values: tuple[ContentBinding, ...],
    ) -> tuple[ContentBinding, ...]:
        keys = [(value.relation_type, value.target_address) for value in values]
        if len(set(keys)) != len(keys):
            raise ValueError("content_bindings must not contain duplicates")
        if keys != sorted(keys):
            raise ValueError("content_bindings must use canonical relation/address order")
        return values


class SourceRevision(AddressedRecord):
    repository: str = Field(min_length=1)
    revision: str = Field(min_length=1)
    source_digest: str = Field(pattern=r"^[0-9a-f]{64}$")


class ManifestInput(AddressedRecord):
    revision: str = Field(min_length=1)
    manifest_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    locator: str = Field(min_length=1)


class ManifestFact(AddressedRecord):
    fact_id: str = Field(min_length=1)
    symbol_id: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    value: JsonValue


class AgentConfiguration(AddressedRecord):
    agent_name: str = Field(min_length=1)
    agent_version: str = Field(min_length=1)
    model: str = Field(min_length=1)
    settings: dict[str, JsonValue] = Field(default_factory=dict)


class AgentRun(AddressedRecord):
    run_identity: str = Field(min_length=1)
    kind: AgentKind
    status: RunStatus
    agent_name: str = Field(min_length=1)
    agent_version: str = Field(min_length=1)


class PromptRecord(AddressedRecord):
    name: str = Field(min_length=1)
    version: str = Field(min_length=1)
    body: str = Field(min_length=1)


class ToolCallRecord(AddressedRecord):
    call_id: str = Field(min_length=1)
    tool_name: str = Field(min_length=1)
    arguments: JsonValue
    result: JsonValue | None = None
    status: ToolCallStatus
    error: str | None = None


class EvidenceRecord(ContentBoundRecord):
    evidence_id: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    locator: str = Field(min_length=1)
    excerpt: str = ""


class ResearchClaim(ContentBoundRecord):
    claim_id: str = Field(min_length=1)
    text: str = Field(min_length=1)
    certainty: Certainty


class UnresolvedQuestion(AddressedRecord):
    question_id: str = Field(min_length=1)
    text: str = Field(min_length=1)
    status: QuestionStatus = QuestionStatus.OPEN


class GuideSection(ContentBoundRecord):
    guide_id: str = Field(min_length=1)
    section_id: str = Field(min_length=1)
    heading: str = Field(min_length=1)
    prose: str = Field(min_length=1)
    claim_ids: tuple[str, ...] = ()
    manifest_revision: str = Field(min_length=1)

    @field_validator("claim_ids")
    @classmethod
    def _require_canonical_claim_ids(cls, values: tuple[str, ...]) -> tuple[str, ...]:
        if any(not value.strip() for value in values):
            raise ValueError("claim_ids must not contain blank values")
        if len(set(values)) != len(values):
            raise ValueError("claim_ids must not contain duplicates")
        return values


class GuideDraft(AddressedRecord):
    """One complete guide draft as reviewed by the documentation workflow."""

    guide_id: str = Field(min_length=1)
    source_revision: str = Field(min_length=1)
    manifest_revision: str = Field(min_length=1)
    manifest_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    draft_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    evidence_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    section_addresses: tuple[str, ...] = Field(min_length=1)

    @field_validator("section_addresses")
    @classmethod
    def _validate_section_addresses(cls, values: tuple[str, ...]) -> tuple[str, ...]:
        if len(set(values)) != len(values):
            raise ValueError("section_addresses must not contain duplicates")
        if any(_ADDRESS_PATTERN.fullmatch(value) is None for value in values):
            raise ValueError("section_addresses must contain content addresses")
        return values


class ValidationResult(AddressedRecord):
    subject_address: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    validation_id: str = Field(min_length=1)
    validation_time: str = Field(min_length=1)
    validator: str = Field(min_length=1)
    validator_version: str = Field(min_length=1)
    outcome: ValidationOutcome
    checks: tuple[str, ...] = Field(min_length=1)
    message: str = ""

    @field_validator("checks")
    @classmethod
    def _require_canonical_checks(cls, values: tuple[str, ...]) -> tuple[str, ...]:
        if any(not value.strip() for value in values):
            raise ValueError("checks must not contain blank values")
        if len(set(values)) != len(values):
            raise ValueError("checks must not contain duplicates")
        return values

    @field_validator("validation_time")
    @classmethod
    def _require_validation_timezone(cls, value: str) -> str:
        _parse_timestamp(value, field_name="validation_time")
        return value


class ApprovalDecision(AddressedRecord):
    subject_address: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    decision_id: str = Field(min_length=1)
    source_revision: str = Field(min_length=1)
    manifest_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    draft_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    evidence_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    reviewer: str = Field(min_length=1)
    reviewer_role: str = Field(min_length=1)
    outcome: ApprovalOutcome
    decision_time: str = Field(min_length=1)
    rationale: str = ""

    @field_validator("decision_time")
    @classmethod
    def _require_timezone(cls, value: str) -> str:
        _parse_timestamp(value, field_name="decision_time")
        return value


class ApprovalCarryForward(AddressedRecord):
    """Explicit workflow revalidation of one prior human guide approval."""

    carry_forward_id: str = Field(min_length=1)
    current_draft_address: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    prior_draft_address: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    prior_approval_address: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    draft_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    evidence_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    workflow: str = Field(min_length=1)
    workflow_version: str = Field(min_length=1)
    revalidation_time: str = Field(min_length=1)
    reason: str = Field(min_length=1)

    @field_validator(
        "carry_forward_id",
        "workflow",
        "workflow_version",
        "reason",
    )
    @classmethod
    def _require_nonblank_attribution(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("approval carry-forward attribution fields must not be blank")
        return value

    @field_validator("revalidation_time")
    @classmethod
    def _require_revalidation_timezone(cls, value: str) -> str:
        _parse_timestamp(value, field_name="revalidation_time")
        return value


class RenderedArtifact(AddressedRecord):
    guide_id: str = Field(min_length=1)
    path: str = Field(min_length=1)
    media_type: str = Field(min_length=1)
    artifact_digest: str = Field(pattern=r"^[0-9a-f]{64}$")
    renderer: str = Field(min_length=1)
    renderer_version: str = Field(min_length=1)


class PublicationRevision(AddressedRecord):
    guide_id: str = Field(min_length=1)
    revision: str = Field(min_length=1)
    site: str = Field(min_length=1)
    published_by: str = Field(min_length=1)
    artifact_address: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class ManifestFactChange(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    fact_id: str = Field(min_length=1)
    previous_address: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    current_address: str | None = Field(
        default=None,
        pattern=r"^sha256:[0-9a-f]{64}$",
    )

    @field_validator("fact_id")
    @classmethod
    def _require_nonblank_fact_id(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("fact_id must not be blank")
        return value


class InvalidationRecord(AddressedRecord):
    manifest_revision: str = Field(min_length=1)
    changes: tuple[ManifestFactChange, ...] = Field(min_length=1)
    reason: str = Field(min_length=1)

    @field_validator("changes")
    @classmethod
    def _require_unique_changes(
        cls,
        values: tuple[ManifestFactChange, ...],
    ) -> tuple[ManifestFactChange, ...]:
        fact_ids = [value.fact_id for value in values]
        if len(fact_ids) != len(set(fact_ids)):
            raise ValueError("invalidation changes must use unique fact ids")
        previous_addresses = [value.previous_address for value in values]
        if len(previous_addresses) != len(set(previous_addresses)):
            raise ValueError("invalidation changes must use unique previous addresses")
        return values


@dataclass(frozen=True, slots=True)
class DocumentationTrustPolicy:
    """Local authority policy for review, validation, carry-forward, and release.

    The policy is deliberately not stored in ActiveGraph: replaying a graph
    cannot grant a new authority. ``created_by`` is treated as an identity
    authenticated by the event-store boundary. The in-process ``Graph`` API
    itself does not authenticate that string, so raw graph/event-store
    mutation is a trusted local boundary. This policy provides authorization
    and configuration integrity, not authentication.
    """

    trusted_validator_versions: frozenset[tuple[str, str]]
    trusted_reviewer_roles: frozenset[tuple[str, str]]
    trusted_workflow_versions: frozenset[tuple[str, str]]
    trusted_publishers: frozenset[str]

    def __post_init__(self) -> None:
        for label, authorities in (
            ("validator", self.trusted_validator_versions),
            ("reviewer", self.trusted_reviewer_roles),
            ("workflow", self.trusted_workflow_versions),
        ):
            if any(
                len(authority) != 2 or not authority[0].strip() or not authority[1].strip()
                for authority in authorities
            ):
                raise ValueError(f"trusted {label} authorities must be non-blank pairs")
        if any(not publisher.strip() for publisher in self.trusted_publishers):
            raise ValueError("trusted publisher authorities must be non-blank")

    @classmethod
    def attune_defaults(cls) -> Self:
        """Return the narrow authorities used by the checked-in docs workflow."""

        return cls(
            trusted_validator_versions=frozenset({("grounding-validator", "1.0.0")}),
            trusted_reviewer_roles=frozenset(
                {
                    ("documentation-maintainer", "maintainer"),
                    ("maintainer@example.com", "documentation-maintainer"),
                }
            ),
            trusted_workflow_versions=frozenset({("documentation-approval-revalidator", "1.0.0")}),
            trusted_publishers=frozenset({"release-workflow"}),
        )

    def require_validation_authority(
        self,
        record: ValidationResult,
        *,
        actor: str,
    ) -> None:
        authority = (record.validator, record.validator_version)
        if actor != record.validator or authority not in self.trusted_validator_versions:
            raise ProvenanceInvariantError(
                "validation result is not authorized by the local documentation trust policy"
            )

    def require_review_authority(
        self,
        record: ApprovalDecision,
        *,
        actor: str,
    ) -> None:
        authority = (record.reviewer, record.reviewer_role)
        if actor != record.reviewer or authority not in self.trusted_reviewer_roles:
            raise ProvenanceInvariantError(
                "approval decision is not authorized by the local documentation trust policy"
            )

    def require_workflow_authority(
        self,
        record: ApprovalCarryForward,
        *,
        actor: str,
    ) -> None:
        authority = (record.workflow, record.workflow_version)
        if actor != record.workflow or authority not in self.trusted_workflow_versions:
            raise ProvenanceInvariantError(
                "approval carry-forward is not authorized by the local documentation trust policy"
            )

    def require_publisher_authority(
        self,
        record: PublicationRevision,
        *,
        actor: str,
    ) -> None:
        if actor != record.published_by or actor not in self.trusted_publishers:
            raise ProvenanceInvariantError(
                "publication revision is not authorized by the local documentation trust policy"
            )


DEFAULT_DOCUMENTATION_TRUST_POLICY = DocumentationTrustPolicy.attune_defaults()


type ProvenanceRecord = (
    SourceRevision
    | ManifestInput
    | ManifestFact
    | AgentConfiguration
    | AgentRun
    | PromptRecord
    | ToolCallRecord
    | EvidenceRecord
    | ResearchClaim
    | UnresolvedQuestion
    | GuideSection
    | GuideDraft
    | ValidationResult
    | ApprovalDecision
    | ApprovalCarryForward
    | RenderedArtifact
    | PublicationRevision
    | InvalidationRecord
)


def _expected_record_actor(record: AddressedRecord) -> str:
    """Return the only actor allowed to author a stored provenance record."""

    if isinstance(record, AgentRun):
        return record.run_identity
    if isinstance(record, ValidationResult):
        return record.validator
    if isinstance(record, ApprovalDecision):
        return record.reviewer
    if isinstance(record, ApprovalCarryForward):
        return record.workflow
    if isinstance(record, PublicationRevision):
        return record.published_by
    return DEFAULT_PROVENANCE_ACTOR


@dataclass(frozen=True)
class NodeRef[RecordT: AddressedRecord]:
    """Typed handle to one immutable content record in ActiveGraph."""

    object_id: str
    type_name: str
    record: RecordT


type InputRef = NodeRef[SourceRevision] | NodeRef[ManifestInput]
type ContentRef = (
    NodeRef[SourceRevision]
    | NodeRef[ManifestInput]
    | NodeRef[ManifestFact]
    | NodeRef[EvidenceRecord]
    | NodeRef[ResearchClaim]
)
type GroundingRef = NodeRef[ManifestFact] | NodeRef[EvidenceRecord] | NodeRef[ResearchClaim]
type ValidationSubjectRef = (
    NodeRef[ResearchClaim] | NodeRef[GuideSection] | NodeRef[GuideDraft] | NodeRef[RenderedArtifact]
)
type ReviewSubjectRef = NodeRef[ResearchClaim] | NodeRef[GuideDraft]


class AffectedResearchClaim(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    object_id: str
    claim_id: str
    content_address: str


class StaleGuideSection(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    object_id: str
    guide_id: str
    section_id: str
    content_address: str


class InvalidationReport(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    invalidation_address: str
    manifest_revision: str
    changed_fact_ids: tuple[str, ...]
    research_claims: tuple[AffectedResearchClaim, ...]
    guide_sections: tuple[StaleGuideSection, ...]


class StaleGuideReport(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    guide_ids: tuple[str, ...]
    sections: tuple[StaleGuideSection, ...]
    invalidation_addresses: tuple[str, ...]


class ReviewBinding(BaseModel):
    """Exact source and semantic digests a review decision must attest."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    source_revision: str
    manifest_digest: str
    draft_digest: str
    evidence_digest: str


def _validate_public_trace_data(
    type_name: str,
    data: dict[str, JsonValue],
) -> None:
    expected_fields = _PUBLIC_TRACE_FIELDS.get(type_name)
    model = _RECORD_MODELS.get(type_name)
    if expected_fields is None or model is None:
        raise ValueError("trace node type is not a public provenance object type")
    if set(data) != set(expected_fields):
        raise ValueError(
            f"trace node {type_name} data must contain exactly: {', '.join(expected_fields)}"
        )
    try:
        record = model.model_validate(data)
    except ValueError as cause:
        raise ValueError(f"trace node {type_name} data is invalid") from cause
    full_data = record.model_dump(mode="json")
    normalized = {field: full_data[field] for field in expected_fields}
    encoded_data = json.dumps(
        data,
        allow_nan=False,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    encoded_normalized = json.dumps(
        normalized,
        allow_nan=False,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    if encoded_data != encoded_normalized:
        raise ValueError(f"trace node {type_name} data contains coerced or non-canonical values")


class TraceNode(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    type: str
    content_address: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    data: dict[str, JsonValue]

    @field_validator("type")
    @classmethod
    def _require_public_object_type(cls, value: str) -> str:
        if value not in _PUBLIC_TRACE_FIELDS:
            raise ValueError("trace node type is not a public provenance object type")
        return value

    @model_validator(mode="after")
    def _verify_trace_node_id(self) -> Self:
        _validate_public_trace_data(self.type, self.data)
        expected = f"sha256:{
            _semantic_digest(
                cast(
                    JsonValue,
                    {
                        'type': self.type,
                        'data': self.data,
                        'content_address': self.content_address,
                    },
                )
            )
        }"
        if self.id != expected:
            raise ValueError(f"trace node id mismatch: expected {expected}, got {self.id}")
        return self


class TraceEdge(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    source: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    target: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    type: str
    provenance_kind: ProvenanceKind

    @field_validator("type")
    @classmethod
    def _require_public_relation_type(cls, value: str) -> str:
        if value not in _PUBLIC_TRACE_EDGES:
            raise ValueError("trace edge type is not a public provenance relation type")
        return value

    @model_validator(mode="after")
    def _verify_trace_edge(self) -> Self:
        expected_kind = _edge_kind(self.type)
        if self.provenance_kind is not expected_kind:
            raise ValueError(
                f"trace edge {self.type} must use provenance kind {expected_kind.value}"
            )
        expected_id = _trace_edge_id(self.type, self.source, self.target)
        if self.id != expected_id:
            raise ValueError(f"trace edge id mismatch: expected {expected_id}, got {self.id}")
        return self


class TraceExport(BaseModel):
    """Static, deterministic, redacted explanation of one guide's provenance."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal[1] = PROVENANCE_SCHEMA_VERSION
    activegraph_run_id: str
    guide_id: str
    stale: bool
    nodes: tuple[TraceNode, ...]
    edges: tuple[TraceEdge, ...]

    @field_validator("activegraph_run_id", "guide_id")
    @classmethod
    def _require_nonblank_trace_identity(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("trace identity fields must not be blank")
        return value

    @model_validator(mode="after")
    def _verify_closed_trace(self) -> Self:
        node_ids = [node.id for node in self.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("trace nodes must not contain duplicate ids")
        content_addresses = [node.content_address for node in self.nodes]
        if len(content_addresses) != len(set(content_addresses)):
            raise ValueError("trace nodes must not contain duplicate content addresses")

        edge_ids = [edge.id for edge in self.edges]
        if len(edge_ids) != len(set(edge_ids)):
            raise ValueError("trace edges must not contain duplicate ids")
        edge_keys = [(edge.source, edge.type, edge.target) for edge in self.edges]
        if len(edge_keys) != len(set(edge_keys)):
            raise ValueError("trace edges must not contain duplicate semantic relations")

        known_nodes = set(node_ids)
        dangling = sorted(
            {
                endpoint
                for edge in self.edges
                for endpoint in (edge.source, edge.target)
                if endpoint not in known_nodes
            }
        )
        if dangling:
            raise ValueError(f"trace edges reference unknown node ids: {', '.join(dangling)}")
        node_type_by_id = {node.id: node.type for node in self.nodes}
        for edge in self.edges:
            source_type = node_type_by_id[edge.source]
            target_type = node_type_by_id[edge.target]
            allowed_sources, allowed_targets = _RELATION_RULES[edge.type]
            exact_endpoints = _EXACT_RELATION_ENDPOINTS.get(edge.type)
            if (
                source_type not in allowed_sources
                or target_type not in allowed_targets
                or (
                    exact_endpoints is not None
                    and (source_type, target_type) not in exact_endpoints
                )
            ):
                raise ValueError(
                    f"trace edge {edge.type} has illegal endpoints {source_type} -> {target_type}"
                )
        return self

    def write_json(self, path: Path) -> None:
        """Write canonical trace JSON for a static-site build."""

        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            f"{self.model_dump_json(by_alias=True, indent=2)}\n",
            encoding="utf-8",
        )


_OBJECT_TYPES = (
    ObjectType(SOURCE_REVISION, SourceRevision, "One exact source revision."),
    ObjectType(MANIFEST_INPUT, ManifestInput, "One exact generated API manifest."),
    ObjectType(MANIFEST_FACT, ManifestFact, "One addressable fact from an API manifest."),
    ObjectType(
        AGENT_CONFIGURATION,
        AgentConfiguration,
        "The exact configuration of a research or documentation agent.",
    ),
    ObjectType(AGENT_RUN, AgentRun, "One research or documentation execution."),
    ObjectType(PROMPT, PromptRecord, "An exact agent prompt."),
    ObjectType(TOOL_CALL, ToolCallRecord, "One recorded tool invocation."),
    ObjectType(EVIDENCE, EvidenceRecord, "Evidence used by a research claim or guide."),
    ObjectType(RESEARCH_CLAIM, ResearchClaim, "A research conclusion."),
    ObjectType(UNRESOLVED_QUESTION, UnresolvedQuestion, "An unresolved agent question."),
    ObjectType(GUIDE_SECTION, GuideSection, "One grounded onboarding-guide section."),
    ObjectType(GUIDE_DRAFT, GuideDraft, "One complete, reviewable onboarding-guide draft."),
    ObjectType(VALIDATION_RESULT, ValidationResult, "A deterministic validation result."),
    ObjectType(APPROVAL_DECISION, ApprovalDecision, "A human review decision."),
    ObjectType(
        APPROVAL_CARRY_FORWARD,
        ApprovalCarryForward,
        "An explicit workflow revalidation of one prior human guide approval.",
    ),
    ObjectType(RENDERED_ARTIFACT, RenderedArtifact, "A deterministic rendered guide."),
    ObjectType(PUBLICATION_REVISION, PublicationRevision, "A published static-site revision."),
    ObjectType(INVALIDATION, InvalidationRecord, "A manifest-change invalidation."),
)

_CONTENT_SOURCE_TYPES = (
    SOURCE_REVISION,
    MANIFEST_INPUT,
    MANIFEST_FACT,
    EVIDENCE,
    RESEARCH_CLAIM,
    GUIDE_SECTION,
)
_CONTENT_SUBJECT_TYPES = (
    MANIFEST_FACT,
    EVIDENCE,
    RESEARCH_CLAIM,
    GUIDE_SECTION,
    GUIDE_DRAFT,
)
_REVIEW_SUBJECT_TYPES = (RESEARCH_CLAIM, GUIDE_DRAFT)
_VALIDATION_SUBJECT_TYPES = (
    RESEARCH_CLAIM,
    GUIDE_SECTION,
    GUIDE_DRAFT,
    RENDERED_ARTIFACT,
)
_EXECUTION_PRODUCT_TYPES = (
    EVIDENCE,
    RESEARCH_CLAIM,
    UNRESOLVED_QUESTION,
    GUIDE_SECTION,
    GUIDE_DRAFT,
    RENDERED_ARTIFACT,
)

_RELATION_TYPES = (
    RelationType(
        DERIVED_FROM,
        source_types=_CONTENT_SUBJECT_TYPES,
        target_types=_CONTENT_SOURCE_TYPES,
        description="Content is mechanically derived from another content record.",
    ),
    RelationType(
        INFORMED_BY,
        source_types=(GUIDE_SECTION,),
        target_types=(RESEARCH_CLAIM,),
        description="A guide section is informed by an approved research conclusion.",
    ),
    RelationType(
        CITES,
        source_types=(RESEARCH_CLAIM, GUIDE_SECTION, GUIDE_DRAFT),
        target_types=(
            SOURCE_REVISION,
            MANIFEST_INPUT,
            MANIFEST_FACT,
            EVIDENCE,
            RESEARCH_CLAIM,
        ),
        description="A claim or guide section cites factual support.",
    ),
    RelationType(
        VALIDATED_BY,
        source_types=_VALIDATION_SUBJECT_TYPES,
        target_types=(VALIDATION_RESULT,),
        description="Content passed or failed a deterministic validation.",
    ),
    RelationType(
        APPROVED_BY,
        source_types=_REVIEW_SUBJECT_TYPES,
        target_types=(APPROVAL_DECISION,),
        description="Content received a human review decision.",
    ),
    RelationType(
        APPROVAL_CARRIED_FORWARD_BY,
        source_types=(GUIDE_DRAFT,),
        target_types=(APPROVAL_CARRY_FORWARD,),
        description="A current guide draft has an explicit approval carry-forward.",
    ),
    RelationType(
        CARRIES_APPROVAL_FROM,
        source_types=(APPROVAL_CARRY_FORWARD,),
        target_types=(GUIDE_DRAFT,),
        description="An approval carry-forward names its prior reviewed guide draft.",
    ),
    RelationType(
        REVALIDATES_APPROVAL,
        source_types=(APPROVAL_CARRY_FORWARD,),
        target_types=(APPROVAL_DECISION,),
        description="An approval carry-forward revalidates one prior human decision.",
    ),
    RelationType(
        RENDERS,
        source_types=(RENDERED_ARTIFACT, PUBLICATION_REVISION),
        target_types=(GUIDE_DRAFT, RENDERED_ARTIFACT),
        description="A static artifact renders content, or a publication renders an artifact.",
    ),
    RelationType(
        USES_INPUT,
        source_types=(AGENT_RUN,),
        target_types=(SOURCE_REVISION, MANIFEST_INPUT),
        description="An execution consumed an exact content input.",
    ),
    RelationType(
        CONFIGURED_BY,
        source_types=(AGENT_RUN,),
        target_types=(AGENT_CONFIGURATION,),
        description="An execution used an exact agent configuration.",
    ),
    RelationType(
        USES_PROMPT,
        source_types=(AGENT_RUN,),
        target_types=(PROMPT,),
        description="An execution used an exact prompt.",
    ),
    RelationType(
        INVOKES,
        source_types=(AGENT_RUN,),
        target_types=(TOOL_CALL,),
        description="An execution invoked a recorded tool call.",
    ),
    RelationType(
        PRODUCED_BY,
        source_types=_EXECUTION_PRODUCT_TYPES,
        target_types=(AGENT_RUN,),
        description="A record was produced by an execution.",
    ),
    RelationType(
        INVALIDATES,
        source_types=(INVALIDATION,),
        target_types=(MANIFEST_FACT, RESEARCH_CLAIM, GUIDE_SECTION),
        description="A manifest change makes dependent content stale.",
    ),
)

_RELATION_RULES = {
    relation.name: (
        frozenset(relation.source_types),
        frozenset(relation.target_types),
    )
    for relation in _RELATION_TYPES
}
_EXACT_RELATION_ENDPOINTS: dict[str, frozenset[tuple[str, str]]] = {
    RENDERS: frozenset(
        {
            (RENDERED_ARTIFACT, GUIDE_DRAFT),
            (PUBLICATION_REVISION, RENDERED_ARTIFACT),
        }
    ),
}

provenance_pack = Pack(
    name="attune_documentation_provenance",
    version=PROVENANCE_PACK_VERSION,
    description=(
        "Typed content, execution, review, rendering, and invalidation provenance "
        "for Attune research and onboarding documentation."
    ),
    object_types=_OBJECT_TYPES,
    relation_types=_RELATION_TYPES,
)

_RECORD_MODELS: dict[str, type[AddressedRecord]] = {
    SOURCE_REVISION: SourceRevision,
    MANIFEST_INPUT: ManifestInput,
    MANIFEST_FACT: ManifestFact,
    AGENT_CONFIGURATION: AgentConfiguration,
    AGENT_RUN: AgentRun,
    PROMPT: PromptRecord,
    TOOL_CALL: ToolCallRecord,
    EVIDENCE: EvidenceRecord,
    RESEARCH_CLAIM: ResearchClaim,
    UNRESOLVED_QUESTION: UnresolvedQuestion,
    GUIDE_SECTION: GuideSection,
    GUIDE_DRAFT: GuideDraft,
    VALIDATION_RESULT: ValidationResult,
    APPROVAL_DECISION: ApprovalDecision,
    APPROVAL_CARRY_FORWARD: ApprovalCarryForward,
    RENDERED_ARTIFACT: RenderedArtifact,
    PUBLICATION_REVISION: PublicationRevision,
    INVALIDATION: InvalidationRecord,
}

_PUBLIC_TRACE_FIELDS: dict[str, tuple[str, ...]] = {
    SOURCE_REVISION: ("repository", "revision", "source_digest", "schema_version"),
    MANIFEST_INPUT: ("revision", "manifest_digest", "locator", "schema_version"),
    MANIFEST_FACT: ("fact_id", "symbol_id", "kind", "value", "schema_version"),
    AGENT_CONFIGURATION: (
        "agent_name",
        "agent_version",
        "model",
        "schema_version",
    ),
    AGENT_RUN: (
        "run_identity",
        "kind",
        "status",
        "agent_name",
        "agent_version",
        "schema_version",
    ),
    EVIDENCE: ("evidence_id", "kind", "locator", "schema_version"),
    RESEARCH_CLAIM: ("claim_id", "text", "certainty", "schema_version"),
    GUIDE_SECTION: (
        "guide_id",
        "section_id",
        "heading",
        "prose",
        "claim_ids",
        "manifest_revision",
        "schema_version",
    ),
    GUIDE_DRAFT: (
        "guide_id",
        "source_revision",
        "manifest_revision",
        "manifest_digest",
        "draft_digest",
        "evidence_digest",
        "section_addresses",
        "schema_version",
    ),
    VALIDATION_RESULT: (
        "subject_address",
        "validation_id",
        "validation_time",
        "validator",
        "validator_version",
        "outcome",
        "checks",
        "schema_version",
    ),
    APPROVAL_DECISION: (
        "subject_address",
        "decision_id",
        "source_revision",
        "manifest_digest",
        "draft_digest",
        "evidence_digest",
        "reviewer",
        "reviewer_role",
        "outcome",
        "decision_time",
        "schema_version",
    ),
    APPROVAL_CARRY_FORWARD: (
        "carry_forward_id",
        "current_draft_address",
        "prior_draft_address",
        "prior_approval_address",
        "draft_digest",
        "evidence_digest",
        "workflow",
        "workflow_version",
        "revalidation_time",
        "reason",
        "schema_version",
    ),
    RENDERED_ARTIFACT: (
        "guide_id",
        "path",
        "media_type",
        "artifact_digest",
        "renderer",
        "renderer_version",
        "schema_version",
    ),
    PUBLICATION_REVISION: (
        "guide_id",
        "revision",
        "site",
        "published_by",
        "artifact_address",
        "schema_version",
    ),
    INVALIDATION: ("manifest_revision", "changes", "reason", "schema_version"),
}


def _edge_kind(relation_type: str) -> ProvenanceKind:
    if relation_type in _CONTENT_EDGES:
        return ProvenanceKind.CONTENT
    if relation_type in _EXECUTION_EDGES:
        return ProvenanceKind.EXECUTION
    if relation_type in _REVIEW_EDGES:
        return ProvenanceKind.REVIEW
    if relation_type in _PRESENTATION_EDGES:
        return ProvenanceKind.PRESENTATION
    if relation_type in _INVALIDATION_EDGES:
        return ProvenanceKind.INVALIDATION
    msg = f"unknown documentation provenance edge: {relation_type}"
    raise ProvenanceInvariantError(msg)


class DocumentationProvenance[CredentialT]:
    """Narrow typed adapter around an ActiveGraph graph projection.

    Privileged writes require an opaque host credential. The host-installed
    resolver authenticates that credential to an actor independently of the
    submitted record. Raw ``Graph`` access and adapter installation remain the
    explicitly trusted local boundary.
    """

    def __init__(
        self,
        graph: Graph,
        *,
        authority_resolver: DocumentationAuthorityResolver[CredentialT],
        trust_policy: DocumentationTrustPolicy = DEFAULT_DOCUMENTATION_TRUST_POLICY,
    ) -> None:
        self._graph = graph
        self._authority_resolver = authority_resolver
        self._trust_policy = trust_policy

    @classmethod
    def install(
        cls,
        runtime: Runtime,
        *,
        authority_resolver: DocumentationAuthorityResolver[CredentialT],
        trust_policy: DocumentationTrustPolicy = DEFAULT_DOCUMENTATION_TRUST_POLICY,
    ) -> DocumentationProvenance[CredentialT]:
        """Load the pack with host authentication and an immutable trust policy."""

        runtime.load_pack(provenance_pack)
        return cls(
            runtime.graph,
            authority_resolver=authority_resolver,
            trust_policy=trust_policy,
        )

    @property
    def graph(self) -> Graph:
        """Return the shared graph.

        Provenance objects are append-only. Mutating or deleting them through
        the graph invalidates subsequent adapter trust decisions.
        """

        return self._graph

    @property
    def trust_policy(self) -> DocumentationTrustPolicy:
        """Return the local authority policy used for every trust decision."""

        return self._trust_policy

    def record_source_revision(
        self,
        record: SourceRevision,
    ) -> NodeRef[SourceRevision]:
        return self._put(SOURCE_REVISION, record)

    def record_manifest_input(
        self,
        record: ManifestInput,
    ) -> NodeRef[ManifestInput]:
        return self._put(MANIFEST_INPUT, record)

    def record_manifest_fact(
        self,
        record: ManifestFact,
        *,
        manifest: NodeRef[ManifestInput],
    ) -> NodeRef[ManifestFact]:
        self._assert_ref(manifest, MANIFEST_INPUT)
        for relation in self._all_relations():
            if relation.type != DERIVED_FROM or relation.target != manifest.object_id:
                continue
            existing = self._validated_object(relation.source)
            if (
                existing.type == MANIFEST_FACT
                and existing.data.get("fact_id") == record.fact_id
                and existing.data.get("content_address") != record.content_address
            ):
                raise ProvenanceInvariantError(
                    f"manifest {manifest.record.revision!r} already contains "
                    f"fact {record.fact_id!r}"
                )
        fact = self._put(MANIFEST_FACT, record)
        self._relate(fact, manifest, DERIVED_FROM)
        return fact

    def record_agent_configuration(
        self,
        record: AgentConfiguration,
    ) -> NodeRef[AgentConfiguration]:
        return self._put(AGENT_CONFIGURATION, record)

    def record_run(
        self,
        record: AgentRun,
        *,
        configuration: NodeRef[AgentConfiguration],
        inputs: Sequence[InputRef],
    ) -> NodeRef[AgentRun]:
        configuration_record = self._assert_ref(configuration, AGENT_CONFIGURATION)
        if (
            configuration_record.agent_name != record.agent_name
            or configuration_record.agent_version != record.agent_version
        ):
            raise ProvenanceInvariantError("agent run name/version must match its configuration")
        source_inputs = [item for item in inputs if isinstance(item.record, SourceRevision)]
        manifest_inputs = [item for item in inputs if isinstance(item.record, ManifestInput)]
        if len(source_inputs) != 1 or len(manifest_inputs) != 1 or len(inputs) != 2:
            raise ProvenanceInvariantError(
                "an agent run requires exactly one source revision and one manifest input"
            )
        for input_ref in inputs:
            self._assert_ref(input_ref)
        for existing in self._graph.objects(type=AGENT_RUN):
            validated = cast(AgentRun, self._validated_record(existing, AGENT_RUN))
            if (
                validated.run_identity == record.run_identity
                and validated.content_address != record.content_address
            ):
                raise ProvenanceInvariantError(
                    f"run identity {record.run_identity!r} already identifies another run"
                )
        run = self._put(AGENT_RUN, record, actor=record.run_identity)
        self._relate(run, configuration, CONFIGURED_BY)
        for input_ref in inputs:
            self._relate(run, input_ref, USES_INPUT)
        return run

    def record_prompt(
        self,
        record: PromptRecord,
        *,
        run: NodeRef[AgentRun],
    ) -> NodeRef[PromptRecord]:
        self._assert_ref(run, AGENT_RUN)
        prompt = self._put(PROMPT, record)
        self._relate(run, prompt, USES_PROMPT)
        return prompt

    def record_tool_call(
        self,
        record: ToolCallRecord,
        *,
        run: NodeRef[AgentRun],
    ) -> NodeRef[ToolCallRecord]:
        self._assert_ref(run, AGENT_RUN)
        for relation in self._relations(
            run.object_id,
            INVOKES,
            direction="outgoing",
        ):
            existing = self._validated_object(relation.target)
            if (
                existing.type == TOOL_CALL
                and existing.data.get("call_id") == record.call_id
                and existing.data.get("content_address") != record.content_address
            ):
                raise ProvenanceInvariantError(
                    f"run {run.record.run_identity!r} already contains tool call {record.call_id!r}"
                )
        call = self._put(TOOL_CALL, record)
        self._relate(run, call, INVOKES)
        return call

    def record_unresolved_question(
        self,
        record: UnresolvedQuestion,
        *,
        run: NodeRef[AgentRun],
    ) -> NodeRef[UnresolvedQuestion]:
        self._assert_ref(run, AGENT_RUN)
        question = self._put(UNRESOLVED_QUESTION, record)
        self._relate(question, run, PRODUCED_BY)
        return question

    def record_evidence(
        self,
        record: EvidenceRecord,
        *,
        run: NodeRef[AgentRun],
        derived_from: Sequence[ContentRef],
    ) -> NodeRef[EvidenceRecord]:
        self._require_run(run, allowed_kinds=(AgentKind.RESEARCH, AgentKind.DOCUMENTATION))
        if not derived_from:
            raise ProvenanceInvariantError("evidence must be derived from content")
        self._require_current_content(derived_from)
        self._require_approved_research_lineage(derived_from)
        self._require_content_matches_run(derived_from, run)
        record = self._record_with_content_bindings(
            record,
            ((DERIVED_FROM, source) for source in derived_from),
        )
        evidence = self._put(EVIDENCE, record)
        self._relate(evidence, run, PRODUCED_BY)
        for source in derived_from:
            self._relate(evidence, source, DERIVED_FROM)
        return evidence

    def record_research_claim(
        self,
        record: ResearchClaim,
        *,
        run: NodeRef[AgentRun],
        derived_from: Sequence[ContentRef],
        cites: Sequence[ContentRef] = (),
    ) -> NodeRef[ResearchClaim]:
        self._require_run(run, allowed_kinds=(AgentKind.RESEARCH,))
        support = (*derived_from, *cites)
        if not support:
            raise ProvenanceInvariantError(
                "a research claim needs content provenance independent of its run"
            )
        self._require_grounded_support(support)
        self._require_current_content(support)
        self._require_content_matches_run(support, run)
        record = self._record_with_content_bindings(
            record,
            (
                *((DERIVED_FROM, source) for source in derived_from),
                *((CITES, source) for source in cites),
            ),
        )
        claim = self._put(RESEARCH_CLAIM, record)
        self._relate(claim, run, PRODUCED_BY)
        for source in derived_from:
            self._relate(claim, source, DERIVED_FROM)
        for source in cites:
            self._relate(claim, source, CITES)
        return claim

    def record_guide_section(
        self,
        record: GuideSection,
        *,
        run: NodeRef[AgentRun],
        derived_from: Sequence[ContentRef] = (),
        informed_by: Sequence[NodeRef[ResearchClaim]] = (),
        cites: Sequence[ContentRef] = (),
    ) -> NodeRef[GuideSection]:
        self._require_run(run, allowed_kinds=(AgentKind.DOCUMENTATION,))
        support = (*derived_from, *informed_by, *cites)
        if not support:
            raise ProvenanceInvariantError("a guide section must cite grounded content")
        self._require_grounded_support(support)
        self._require_current_content(support)
        self._require_content_matches_run(support, run)
        linked_claim_ids: set[str] = set()
        for source in support:
            source_record = self._assert_ref(source)
            if isinstance(source_record, ResearchClaim):
                linked_claim_ids.add(source_record.claim_id)
                if not self._is_publishable_review(source.object_id):
                    raise ProvenanceInvariantError(
                        f"research claim {source_record.claim_id!r} is not approved"
                    )
        if not linked_claim_ids.issubset(record.claim_ids):
            missing = sorted(linked_claim_ids - set(record.claim_ids))
            raise ProvenanceInvariantError(
                f"guide section claim_ids omit linked research claims: {', '.join(missing)}"
            )
        manifest = self._run_manifest(run.object_id)
        if record.manifest_revision != manifest.revision:
            raise ProvenanceInvariantError(
                "guide section manifest revision does not match its documentation run"
            )
        for claim in informed_by:
            if not self._is_publishable_review(claim.object_id):
                raise ProvenanceInvariantError(
                    f"research claim {claim.record.claim_id!r} is not approved"
                )
        record = self._record_with_content_bindings(
            record,
            (
                *((DERIVED_FROM, source) for source in derived_from),
                *((INFORMED_BY, claim) for claim in informed_by),
                *((CITES, source) for source in cites),
            ),
        )
        section = self._put(GUIDE_SECTION, record)
        self._relate(section, run, PRODUCED_BY)
        for source in derived_from:
            self._relate(section, source, DERIVED_FROM)
        for claim in informed_by:
            self._relate(section, claim, INFORMED_BY)
        for source in cites:
            self._relate(section, source, CITES)
        return section

    def record_guide_draft(
        self,
        record: GuideDraft,
        *,
        run: NodeRef[AgentRun],
        source: NodeRef[SourceRevision],
        manifest: NodeRef[ManifestInput],
        sections: Sequence[NodeRef[GuideSection]],
    ) -> NodeRef[GuideDraft]:
        """Bind one complete website draft to its exact inputs and sections."""

        self._require_run(run, allowed_kinds=(AgentKind.DOCUMENTATION,))
        source_record = self._assert_ref(source, SOURCE_REVISION)
        manifest_record = self._assert_ref(manifest, MANIFEST_INPUT)
        run_source_ref = self._run_input_object(run.object_id, SOURCE_REVISION)
        if source.object_id != run_source_ref.id:
            raise ProvenanceInvariantError("guide draft source is not the documentation run source")
        run_manifest_ref = self._run_input_object(run.object_id, MANIFEST_INPUT)
        if manifest.object_id != run_manifest_ref.id:
            raise ProvenanceInvariantError(
                "guide draft manifest is not the documentation run manifest"
            )
        if (
            record.source_revision != source_record.revision
            or record.manifest_revision != manifest_record.revision
            or record.manifest_digest != manifest_record.manifest_digest
        ):
            raise ProvenanceInvariantError(
                "guide draft source/manifest binding does not match its inputs"
            )
        if not sections:
            raise ProvenanceInvariantError("a guide draft must contain guide sections")
        expected_addresses: list[str] = []
        for section in sections:
            section_record = self._assert_ref(section, GUIDE_SECTION)
            self._validate_content_bound_lineage((section.object_id,))
            if section_record.guide_id != record.guide_id:
                raise ProvenanceInvariantError("guide draft sections must belong to the same guide")
            if section_record.manifest_revision != record.manifest_revision:
                raise ProvenanceInvariantError("guide draft section uses another manifest revision")
            if not self._content_reaches(section.object_id, manifest.object_id):
                raise ProvenanceInvariantError(
                    "guide draft section is not grounded in the bound manifest"
                )
            if section.object_id in self._invalidated_object_ids():
                raise ProvenanceInvariantError("guide draft contains an invalidated section")
            if not self._has_passed_validation(section.object_id):
                raise ProvenanceInvariantError(
                    "guide draft contains a section without current validation"
                )
            expected_addresses.append(section_record.content_address)
        if tuple(expected_addresses) != record.section_addresses:
            raise ProvenanceInvariantError(
                "guide draft section addresses do not match the reviewed section order"
            )
        draft = self._put(GUIDE_DRAFT, record)
        self._relate(draft, run, PRODUCED_BY)
        self._relate(draft, source, CITES)
        self._relate(draft, manifest, CITES)
        for section in sections:
            self._relate(draft, section, DERIVED_FROM)
        return draft

    def record_validation(
        self,
        record: ValidationResult,
        *,
        subject: ValidationSubjectRef,
        authority: CredentialT,
    ) -> NodeRef[ValidationResult]:
        actor = self._authorize_record(record, authority)
        self._assert_ref(
            subject,
            (RESEARCH_CLAIM, GUIDE_SECTION, GUIDE_DRAFT, RENDERED_ARTIFACT),
        )
        self._require_subject_address(record.subject_address, subject)
        self._require_unique_decision_id(
            subject.object_id,
            VALIDATED_BY,
            "validation_id",
            record.validation_id,
            record.content_address,
        )
        validation = self._put(
            VALIDATION_RESULT,
            record,
            actor=actor,
        )
        self._relate(
            subject,
            validation,
            VALIDATED_BY,
            actor=actor,
        )
        return validation

    def record_approval(
        self,
        record: ApprovalDecision,
        *,
        subject: ReviewSubjectRef,
        authority: CredentialT,
    ) -> NodeRef[ApprovalDecision]:
        actor = self._authorize_record(record, authority)
        subject_record = self._assert_ref(subject, (RESEARCH_CLAIM, GUIDE_DRAFT))
        self._require_subject_address(record.subject_address, subject)
        expected = self._review_binding(subject.object_id)
        if (
            record.source_revision != expected.source_revision
            or record.manifest_digest != expected.manifest_digest
            or record.draft_digest != expected.draft_digest
            or record.evidence_digest != expected.evidence_digest
        ):
            raise ProvenanceInvariantError(
                "approval source, manifest, draft, or evidence binding does not "
                "match the reviewed content"
            )
        if record.outcome is ApprovalOutcome.APPROVED and not self._has_passed_validation(
            subject.object_id
        ):
            raise ProvenanceInvariantError(
                "approval requires a passed validation for the same content address"
            )
        if (
            record.outcome is ApprovalOutcome.APPROVED
            and subject.object_id in self._invalidated_object_ids()
        ):
            raise ProvenanceInvariantError("approval cannot bind invalidated content")
        if isinstance(subject_record, GuideDraft):
            stale_sections = [
                address
                for address in subject_record.section_addresses
                if self._object_id_for_address(address) in self._invalidated_object_ids()
            ]
            if stale_sections and record.outcome is ApprovalOutcome.APPROVED:
                raise ProvenanceInvariantError(
                    "approval cannot bind a draft containing invalidated sections"
                )
        self._require_unique_decision_id(
            subject.object_id,
            APPROVED_BY,
            "decision_id",
            record.decision_id,
            record.content_address,
        )
        approval = self._put(
            APPROVAL_DECISION,
            record,
            actor=actor,
        )
        self._relate(
            subject,
            approval,
            APPROVED_BY,
            actor=actor,
        )
        return approval

    def record_approval_carry_forward(
        self,
        record: ApprovalCarryForward,
        *,
        current_draft: NodeRef[GuideDraft],
        prior_draft: NodeRef[GuideDraft],
        prior_approval: NodeRef[ApprovalDecision],
        authority: CredentialT,
    ) -> NodeRef[ApprovalCarryForward]:
        """Explicitly revalidate a prior human approval for an unchanged draft."""

        actor = self._authorize_record(record, authority)
        self._assert_ref(current_draft, GUIDE_DRAFT)
        self._assert_ref(prior_draft, GUIDE_DRAFT)
        self._assert_ref(prior_approval, APPROVAL_DECISION)
        if self._latest_approval_decision(current_draft.object_id) is not None:
            raise ProvenanceInvariantError(
                "approval carry-forward requires a current draft without a human decision"
            )
        if not self._approval_carry_forward_is_current(
            record,
            current_draft_id=current_draft.object_id,
            prior_draft_id=prior_draft.object_id,
            prior_approval_id=prior_approval.object_id,
        ):
            raise ProvenanceInvariantError(
                "approval carry-forward requires current validation and the latest "
                "approved prior decision"
            )

        existing_objects: list[tuple[Object, ApprovalCarryForward]] = []
        for obj in self._graph.objects(type=APPROVAL_CARRY_FORWARD):
            if obj.data.get("current_draft_address") != record.current_draft_address:
                continue
            existing_objects.append(
                (
                    obj,
                    cast(
                        ApprovalCarryForward,
                        self._validated_record(obj, APPROVAL_CARRY_FORWARD),
                    ),
                )
            )
        if len(existing_objects) > 1:
            raise ProvenanceInvariantError(
                "a guide draft must have at most one approval carry-forward"
            )
        if existing_objects:
            existing, existing_record = existing_objects[0]
            if existing_record != record:
                raise ProvenanceInvariantError(
                    "the current guide draft already has another approval carry-forward"
                )
            carry_forward = NodeRef(
                existing.id,
                APPROVAL_CARRY_FORWARD,
                existing_record,
            )
        else:
            carry_forward = self._put(
                APPROVAL_CARRY_FORWARD,
                record,
                actor=actor,
            )
        self._relate(
            current_draft,
            carry_forward,
            APPROVAL_CARRIED_FORWARD_BY,
            actor=actor,
        )
        self._relate(
            carry_forward,
            prior_draft,
            CARRIES_APPROVAL_FROM,
            actor=actor,
        )
        self._relate(
            carry_forward,
            prior_approval,
            REVALIDATES_APPROVAL,
            actor=actor,
        )
        if not self._stored_approval_carry_forward_is_current(
            current_draft.object_id,
            carry_forward.object_id,
        ):
            raise ProvenanceInvariantError(
                "recorded approval carry-forward is not currently publishable"
            )
        return carry_forward

    def record_rendered_artifact(
        self,
        record: RenderedArtifact,
        *,
        run: NodeRef[AgentRun],
        draft: NodeRef[GuideDraft],
    ) -> NodeRef[RenderedArtifact]:
        self._require_run(run, allowed_kinds=(AgentKind.DOCUMENTATION,))
        draft_record = self._assert_ref(draft, GUIDE_DRAFT)
        if draft_record.guide_id != record.guide_id:
            raise ProvenanceInvariantError("rendered draft must belong to the artifact guide")
        draft_run = self._producing_run_object(draft.object_id)
        if draft_run.id != run.object_id:
            raise ProvenanceInvariantError(
                "rendered artifact must use the documentation run that produced its draft"
            )
        render_source = self._run_source(run.object_id)
        render_manifest = self._run_manifest(run.object_id)
        if (
            render_source.revision != draft_record.source_revision
            or render_manifest.revision != draft_record.manifest_revision
            or render_manifest.manifest_digest != draft_record.manifest_digest
        ):
            raise ProvenanceInvariantError(
                "renderer run inputs do not match the approved guide draft"
            )
        if not self._is_publishable_review(draft.object_id):
            raise ProvenanceInvariantError(
                "a rendered artifact requires a currently approved guide draft"
            )
        artifact = self._put(RENDERED_ARTIFACT, record)
        self._relate(artifact, run, PRODUCED_BY)
        self._relate(artifact, draft, RENDERS)
        self._repair_rendered_artifact_lineage(artifact.object_id)
        return artifact

    def record_publication(
        self,
        record: PublicationRevision,
        *,
        artifact: NodeRef[RenderedArtifact],
        authority: CredentialT,
    ) -> NodeRef[PublicationRevision]:
        actor = self._authorize_record(record, authority)
        artifact_record = self._assert_ref(artifact, RENDERED_ARTIFACT)
        if artifact_record.guide_id != record.guide_id:
            raise ProvenanceInvariantError("publication and artifact guide ids must match")
        if artifact_record.content_address != record.artifact_address:
            raise ProvenanceInvariantError(
                "publication artifact address does not match its rendered artifact"
            )
        self._require_unique_publication_revision(record)
        self._repair_rendered_artifact_lineage(artifact.object_id)
        drafts = self._rendered_drafts(artifact.object_id)
        if len(drafts) != 1:
            raise ProvenanceInvariantError("the artifact must render exactly one guide draft")
        draft = drafts[0]
        draft_record = cast(GuideDraft, self._validated_record(draft, GUIDE_DRAFT))
        stale = self._stale_section_ids()
        stale_sections = [
            self._object_id_for_address(address)
            for address in draft_record.section_addresses
            if self._object_id_for_address(address) in stale
        ]
        if stale_sections:
            raise ProvenanceInvariantError(
                f"publication contains stale guide sections: {', '.join(stale_sections)}"
            )
        if not self._is_publishable_review(draft.id):
            raise ProvenanceInvariantError(
                "publication requires a currently validated and approved guide draft"
            )
        publication = self._put(
            PUBLICATION_REVISION,
            record,
            actor=actor,
        )
        self._relate(
            publication,
            artifact,
            RENDERS,
            actor=actor,
        )
        self._validated_publication_artifact(publication.object_id)
        return publication

    def invalidate_manifest_facts(
        self,
        *,
        manifest_revision: str,
        changes: Sequence[ManifestFactChange],
        reason: str,
    ) -> InvalidationReport:
        record = InvalidationRecord(
            manifest_revision=manifest_revision,
            changes=tuple(changes),
            reason=reason,
        )
        fact_objects = self._validated_invalidation_fact_objects(record)
        invalidation = self._put(INVALIDATION, record)

        affected = self._reverse_content_dependents(obj.id for obj in fact_objects)
        research = sorted(
            (self._affected_research_claim(obj) for obj in affected if obj.type == RESEARCH_CLAIM),
            key=lambda item: (item.claim_id, item.content_address),
        )
        sections = sorted(
            (self._stale_guide_section(obj) for obj in affected if obj.type == GUIDE_SECTION),
            key=lambda item: (item.guide_id, item.section_id, item.content_address),
        )

        for fact in fact_objects:
            self._relate_ids(invalidation.object_id, fact.id, INVALIDATES)
        for item in (*research, *sections):
            target = self._graph.get_object(item.object_id)
            if target is not None:
                self._relate_ids(invalidation.object_id, target.id, INVALIDATES)
        expected_targets = self._invalidation_target_ids(
            self._validated_object(invalidation.object_id, INVALIDATION),
            record,
        )
        projected_targets = {
            relation.target
            for relation in self._relations(
                invalidation.object_id,
                INVALIDATES,
                direction="outgoing",
            )
        }
        if projected_targets != expected_targets:
            raise ProvenanceInvariantError(
                "invalidation retry did not repair its complete target projection"
            )

        return InvalidationReport(
            invalidation_address=record.content_address,
            manifest_revision=manifest_revision,
            changed_fact_ids=tuple(sorted({change.fact_id for change in changes})),
            research_claims=tuple(research),
            guide_sections=tuple(sections),
        )

    def stale_guides(self) -> StaleGuideReport:
        section_ids = self._stale_section_ids()
        sections = sorted(
            (
                self._stale_guide_section(section)
                for section_id in section_ids
                if (section := self._graph.get_object(section_id)) is not None
                and section.type == GUIDE_SECTION
            ),
            key=lambda item: (item.guide_id, item.section_id, item.content_address),
        )
        invalidation_addresses: set[str] = set()
        for obj in self._graph.objects(type=INVALIDATION):
            record = cast(
                InvalidationRecord,
                self._validated_record(obj, INVALIDATION),
            )
            if not (self._invalidation_target_ids(obj, record) & section_ids):
                continue
            invalidation_addresses.add(record.content_address)
        return StaleGuideReport(
            guide_ids=tuple(sorted({section.guide_id for section in sections})),
            sections=tuple(sections),
            invalidation_addresses=tuple(sorted(invalidation_addresses)),
        )

    def _authoritative_projection_edges(self) -> set[tuple[str, str, str]]:
        """Project aggregate records into semantic edges without trusting indexes."""

        edges: set[tuple[str, str, str]] = set()
        for obj in self._graph.objects(type=VALIDATION_RESULT):
            record = cast(
                ValidationResult,
                self._validated_record(obj, VALIDATION_RESULT),
            )
            subject_id = self._object_id_for_address(record.subject_address)
            self._validated_object(subject_id, _VALIDATION_SUBJECT_TYPES)
            edges.add((VALIDATED_BY, subject_id, obj.id))
        for obj in self._graph.objects(type=APPROVAL_DECISION):
            record = cast(
                ApprovalDecision,
                self._validated_record(obj, APPROVAL_DECISION),
            )
            subject_id = self._object_id_for_address(record.subject_address)
            subject = self._validated_object(subject_id, _REVIEW_SUBJECT_TYPES)
            subject_record = self._validated_record(subject)
            if isinstance(subject_record, GuideDraft):
                expected = ReviewBinding(
                    source_revision=subject_record.source_revision,
                    manifest_digest=subject_record.manifest_digest,
                    draft_digest=subject_record.draft_digest,
                    evidence_digest=subject_record.evidence_digest,
                )
            else:
                expected = self._review_binding(subject_id)
            if (
                record.source_revision != expected.source_revision
                or record.manifest_digest != expected.manifest_digest
                or record.draft_digest != expected.draft_digest
                or record.evidence_digest != expected.evidence_digest
            ):
                raise ProvenanceInvariantError(
                    "approval record has stale or mismatched review bindings"
                )
            edges.add((APPROVED_BY, subject_id, obj.id))
        for obj in self._graph.objects(type=APPROVAL_CARRY_FORWARD):
            record = cast(
                ApprovalCarryForward,
                self._validated_record(obj, APPROVAL_CARRY_FORWARD),
            )
            current_id = self._object_id_for_address(record.current_draft_address)
            prior_id = self._object_id_for_address(record.prior_draft_address)
            approval_id = self._object_id_for_address(record.prior_approval_address)
            self._validate_approval_carry_forward_binding(
                record,
                current_draft_id=current_id,
                prior_draft_id=prior_id,
                prior_approval_id=approval_id,
            )
            edges.update(
                {
                    (APPROVAL_CARRIED_FORWARD_BY, current_id, obj.id),
                    (CARRIES_APPROVAL_FROM, obj.id, prior_id),
                    (REVALIDATES_APPROVAL, obj.id, approval_id),
                }
            )
        for obj in self._graph.objects(type=INVALIDATION):
            record = cast(
                InvalidationRecord,
                self._validated_record(obj, INVALIDATION),
            )
            edges.update(
                (INVALIDATES, obj.id, target_id)
                for target_id in self._invalidation_target_ids(obj, record)
            )
        return edges

    def export_guide_trace(self, guide_id: str) -> TraceExport:
        """Export one self-contained static trace without crossing into other guides."""

        section_ids = {
            obj.id
            for obj in self._graph.objects(type=GUIDE_SECTION)
            if obj.data.get("guide_id") == guide_id
        }
        if not section_ids:
            raise KeyError(f"unknown guide: {guide_id}")

        self._validate_guide_presentation_lineage(guide_id)
        object_edges = {
            (relation.type, relation.source, relation.target) for relation in self._all_relations()
        }
        object_edges.update(self._authoritative_projection_edges())
        outgoing: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
        incoming_presentation: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
        incoming_guide_drafts: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
        incoming_invalidation: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
        for edge in object_edges:
            relation_type, source_id, target_id = edge
            outgoing[source_id].append(edge)
            if relation_type == RENDERS:
                incoming_presentation[target_id].append(edge)
            elif relation_type == DERIVED_FROM:
                source = self._graph.get_object(source_id)
                if source is not None and source.type == GUIDE_DRAFT:
                    incoming_guide_drafts[target_id].append(edge)
            elif relation_type == INVALIDATES:
                incoming_invalidation[target_id].append(edge)

        included_nodes = set(section_ids)
        included_edges: set[tuple[str, str, str]] = set()
        queue = deque(sorted(section_ids))
        expanded: set[str] = set()
        while queue:
            current = queue.popleft()
            if current in expanded:
                continue
            expanded.add(current)

            for edge in outgoing.get(current, ()):
                relation_type, _, target_id = edge
                if relation_type not in (
                    _CONTENT_EDGES | _EXECUTION_EDGES | _REVIEW_EDGES | _PRESENTATION_EDGES
                ):
                    continue
                target = self._validated_object(target_id)
                if target.type in (PROMPT, TOOL_CALL, UNRESOLVED_QUESTION):
                    # Public traces are claim-scoped. Run-wide prompt bodies,
                    # tool payloads, and unrelated questions remain in the
                    # internal graph but are never copied into a static site.
                    continue
                included_edges.add(edge)
                if target_id not in included_nodes:
                    included_nodes.add(target_id)
                    queue.append(target_id)

            for edge in incoming_presentation.get(current, ()):
                _, source_id, _ = edge
                included_edges.add(edge)
                if source_id not in included_nodes:
                    included_nodes.add(source_id)
                    queue.append(source_id)

            for edge in incoming_guide_drafts.get(current, ()):
                _, source_id, _ = edge
                included_edges.add(edge)
                if source_id not in included_nodes:
                    included_nodes.add(source_id)
                    queue.append(source_id)

            for edge in incoming_invalidation.get(current, ()):
                _, source_id, _ = edge
                included_edges.add(edge)
                included_nodes.add(source_id)

        object_by_id = {
            obj.id: obj for obj in self._graph.all_objects() if obj.id in included_nodes
        }
        trace_node_by_object_id = {
            obj.id: self._trace_node(obj)
            for obj in sorted(
                object_by_id.values(),
                key=lambda item: (
                    item.type,
                    str(item.data.get("content_address", "")),
                    item.id,
                ),
            )
        }
        trace_nodes = tuple(
            sorted(
                trace_node_by_object_id.values(),
                key=lambda item: (item.type, item.content_address),
            )
        )
        semantic_edges = sorted(
            {
                (
                    relation_type,
                    trace_node_by_object_id[source_id].id,
                    trace_node_by_object_id[target_id].id,
                )
                for relation_type, source_id, target_id in included_edges
            }
        )
        trace_edges = tuple(
            TraceEdge(
                id=self._stable_trace_edge_id(
                    relation_type,
                    source,
                    target,
                ),
                source=source,
                target=target,
                type=relation_type,
                provenance_kind=_edge_kind(relation_type),
            )
            for relation_type, source, target in semantic_edges
        )
        return TraceExport(
            activegraph_run_id=self._graph.run_id,
            guide_id=guide_id,
            stale=bool(section_ids & self._stale_section_ids()),
            nodes=trace_nodes,
            edges=trace_edges,
        )

    def _record_with_content_bindings[RecordT: ContentBoundRecord](
        self,
        record: RecordT,
        bindings: Iterable[tuple[str, NodeRef[Any]]],
    ) -> RecordT:
        expected_by_key: dict[tuple[str, str], ContentBinding] = {}
        for relation_type, target in bindings:
            target_record = self._assert_ref(target)
            binding = ContentBinding(
                relation_type=relation_type,
                target_address=target_record.content_address,
            )
            expected_by_key[(binding.relation_type, binding.target_address)] = binding
        expected = tuple(expected_by_key[key] for key in sorted(expected_by_key))
        if record.content_bindings and record.content_bindings != expected:
            raise ProvenanceInvariantError(
                "record content bindings do not match its requested support relations"
            )
        payload = record.model_dump(
            mode="json",
            exclude={"content_address", "content_bindings"},
        )
        payload["content_bindings"] = [binding.model_dump(mode="json") for binding in expected]
        model = type(record)
        return model.model_validate(payload)

    def _resolve_authority(
        self,
        credential: CredentialT,
    ) -> DocumentationAuthority:
        """Resolve an opaque host credential without consulting submitted data."""

        try:
            authority = self._authority_resolver(credential)
        except Exception as cause:
            raise ProvenanceInvariantError(
                "documentation authority credential could not be resolved"
            ) from cause
        if not isinstance(authority, DocumentationAuthority):
            raise ProvenanceInvariantError(
                "documentation authority credential is missing or invalid"
            )
        return authority

    def _authorize_record(
        self,
        record: AddressedRecord,
        credential: CredentialT,
    ) -> str:
        """Authenticate and authorize before any graph read or projection repair."""

        authority = self._resolve_authority(credential)
        self._require_resolved_authority(record, authority)
        self._require_trusted_authority(record, actor=authority.actor)
        return authority.actor

    @staticmethod
    def _require_resolved_authority(
        record: AddressedRecord,
        authority: DocumentationAuthority,
    ) -> None:
        if isinstance(record, ValidationResult):
            expected = DocumentationAuthority(
                DocumentationAuthorityScope.VALIDATION,
                record.validator,
                record.validator_version,
            )
        elif isinstance(record, ApprovalDecision):
            expected = DocumentationAuthority(
                DocumentationAuthorityScope.REVIEW,
                record.reviewer,
                record.reviewer_role,
            )
        elif isinstance(record, ApprovalCarryForward):
            expected = DocumentationAuthority(
                DocumentationAuthorityScope.APPROVAL_CARRY_FORWARD,
                record.workflow,
                record.workflow_version,
            )
        elif isinstance(record, PublicationRevision):
            expected = DocumentationAuthority(
                DocumentationAuthorityScope.PUBLICATION,
                record.published_by,
            )
        else:
            raise ProvenanceInvariantError(
                f"{type(record).__name__} does not accept host authority"
            )
        if authority != expected:
            raise ProvenanceInvariantError(
                "documentation authority credential does not authorize this "
                "record scope, actor, and qualifier"
            )

    def _require_unique_publication_revision(
        self,
        record: PublicationRevision,
    ) -> None:
        """Keep a guide revision bound to one immutable publication record."""

        matches: list[PublicationRevision] = []
        for obj in self._graph.objects(type=PUBLICATION_REVISION):
            existing = cast(
                PublicationRevision,
                self._validated_record(obj, PUBLICATION_REVISION),
            )
            if (existing.guide_id, existing.revision) != (
                record.guide_id,
                record.revision,
            ):
                continue
            matches.append(existing)
            if existing != record:
                raise ProvenanceInvariantError(
                    "guide publication revision is already bound to another "
                    "artifact, site, or publisher"
                )
        if len(matches) > 1:
            raise ProvenanceInvariantError(
                "guide publication revision has multiple authoritative records"
            )

    def _put[RecordT: AddressedRecord](
        self,
        type_name: str,
        record: RecordT,
        *,
        actor: str = DEFAULT_PROVENANCE_ACTOR,
    ) -> NodeRef[RecordT]:
        if not _ADDRESS_PATTERN.fullmatch(record.content_address):
            raise ProvenanceInvariantError("record does not have a valid content address")
        model = _RECORD_MODELS.get(type_name)
        if model is None or not isinstance(record, model):
            raise ProvenanceInvariantError(
                f"record {type(record).__name__} does not match graph type {type_name!r}"
            )
        expected_actor = _expected_record_actor(record)
        if actor != expected_actor:
            raise ProvenanceInvariantError(
                f"{type(record).__name__} must be attributed to {expected_actor!r}"
            )
        self._require_trusted_authority(record, actor=actor)
        for obj in self._graph.objects(type=type_name):
            existing = self._validated_record(obj, type_name)
            if existing.content_address == record.content_address:
                if existing != record:
                    raise ProvenanceInvariantError(
                        "one content address resolved to two different records"
                    )
                return NodeRef(obj.id, type_name, record)
        obj = self._graph.add_object(
            type_name,
            record.model_dump(mode="json"),
            actor=actor,
        )
        self._validated_record(obj, type_name)
        return NodeRef(obj.id, type_name, record)

    def _require_trusted_authority(
        self,
        record: AddressedRecord,
        *,
        actor: str,
    ) -> None:
        if isinstance(record, ValidationResult):
            self._trust_policy.require_validation_authority(record, actor=actor)
        elif isinstance(record, ApprovalDecision):
            self._trust_policy.require_review_authority(record, actor=actor)
        elif isinstance(record, ApprovalCarryForward):
            self._trust_policy.require_workflow_authority(record, actor=actor)
        elif isinstance(record, PublicationRevision):
            self._trust_policy.require_publisher_authority(record, actor=actor)

    def _relate[SourceT: AddressedRecord, TargetT: AddressedRecord](
        self,
        source: NodeRef[SourceT],
        target: NodeRef[TargetT],
        relation_type: str,
        *,
        actor: str = DEFAULT_PROVENANCE_ACTOR,
    ) -> None:
        self._assert_ref(source)
        self._assert_ref(target)
        self._relate_ids(
            source.object_id,
            target.object_id,
            relation_type,
            actor=actor,
        )

    def _relate_ids(
        self,
        source_id: str,
        target_id: str,
        relation_type: str,
        *,
        actor: str = DEFAULT_PROVENANCE_ACTOR,
    ) -> None:
        kind = _edge_kind(relation_type)
        source = self._validated_object(source_id)
        target = self._validated_object(target_id)
        expected_actor = self._expected_relation_actor(
            relation_type,
            self._validated_record(source),
            self._validated_record(target),
        )
        if actor != expected_actor:
            raise ProvenanceInvariantError(
                f"{relation_type} must be attributed to {expected_actor!r}"
            )
        outgoing = self._relations(
            source_id,
            relation_type,
            direction="outgoing",
        )
        if self._requires_single_relation_target(source.type, relation_type):
            if len(outgoing) > 1:
                raise ProvenanceInvariantError(
                    f"{source.type} must have exactly one {relation_type} target"
                )
            if outgoing and outgoing[0].target != target_id:
                raise ProvenanceInvariantError(
                    f"{source.type} already has another {relation_type} target"
                )
        matches = [relation for relation in outgoing if relation.target == target_id]
        if len(matches) > 1:
            raise ProvenanceInvariantError(
                f"duplicate {relation_type} relation from {source_id} to {target_id}"
            )
        if matches:
            return
        relation = self._graph.add_relation(
            source_id,
            target_id,
            relation_type,
            {"provenance_kind": kind.value},
            actor=actor,
        )
        self._validated_relation(relation, relation_type)

    @staticmethod
    def _requires_single_relation_target(source_type: str, relation_type: str) -> bool:
        return (source_type == RENDERED_ARTIFACT and relation_type in (PRODUCED_BY, RENDERS)) or (
            source_type == PUBLICATION_REVISION and relation_type == RENDERS
        )

    def _expected_relation_actor(
        self,
        relation_type: str,
        source: AddressedRecord,
        target: AddressedRecord,
    ) -> str:
        if relation_type == VALIDATED_BY:
            if not isinstance(target, ValidationResult):
                raise ProvenanceInvariantError("validatedBy must target a validation result")
            return target.validator
        if relation_type == APPROVED_BY:
            if not isinstance(target, ApprovalDecision):
                raise ProvenanceInvariantError("approvedBy must target an approval decision")
            return target.reviewer
        if relation_type == APPROVAL_CARRIED_FORWARD_BY:
            if not isinstance(target, ApprovalCarryForward):
                raise ProvenanceInvariantError(
                    "approvalCarriedForwardBy must target an approval carry-forward"
                )
            return target.workflow
        if relation_type in (CARRIES_APPROVAL_FROM, REVALIDATES_APPROVAL):
            if not isinstance(source, ApprovalCarryForward):
                raise ProvenanceInvariantError(
                    f"{relation_type} must originate from an approval carry-forward"
                )
            return source.workflow
        if relation_type == RENDERS and isinstance(source, PublicationRevision):
            return source.published_by
        return DEFAULT_PROVENANCE_ACTOR

    def _validated_relation(
        self,
        relation: Relation,
        expected_type: str | None = None,
    ) -> Relation:
        if expected_type is not None and relation.type != expected_type:
            raise ProvenanceInvariantError(
                f"provenance relation {relation.id} has type {relation.type!r}; "
                f"expected {expected_type!r}"
            )
        rule = _RELATION_RULES.get(relation.type)
        if rule is None:
            raise ProvenanceInvariantError(
                f"relation {relation.id} is not documentation provenance"
            )
        source = self._validated_object(relation.source)
        target = self._validated_object(relation.target)
        allowed_sources, allowed_targets = rule
        if source.type not in allowed_sources or target.type not in allowed_targets:
            raise ProvenanceInvariantError(
                f"{relation.type} has illegal endpoints {source.type} -> {target.type}"
            )
        exact_endpoints = _EXACT_RELATION_ENDPOINTS.get(relation.type)
        if exact_endpoints is not None and (source.type, target.type) not in exact_endpoints:
            raise ProvenanceInvariantError(
                f"{relation.type} has illegal endpoints {source.type} -> {target.type}"
            )
        expected_data = {"provenance_kind": _edge_kind(relation.type).value}
        if relation.data != expected_data:
            raise ProvenanceInvariantError(f"{relation.type} relation has forged provenance data")
        source_record = self._validated_record(source)
        target_record = self._validated_record(target)
        expected_actor = self._expected_relation_actor(
            relation.type,
            source_record,
            target_record,
        )
        if relation.provenance.get("created_by") != expected_actor:
            raise ProvenanceInvariantError(
                f"{relation.type} relation is not attributed to {expected_actor!r}"
            )
        if (
            relation.type == VALIDATED_BY
            and isinstance(target_record, ValidationResult)
            and target_record.subject_address != source_record.content_address
        ):
            raise ProvenanceInvariantError("validation relation is bound to another subject")
        if (
            relation.type == APPROVED_BY
            and isinstance(target_record, ApprovalDecision)
            and target_record.subject_address != source_record.content_address
        ):
            raise ProvenanceInvariantError("approval relation is bound to another subject")
        if (
            relation.type == APPROVAL_CARRIED_FORWARD_BY
            and isinstance(target_record, ApprovalCarryForward)
            and target_record.current_draft_address != source_record.content_address
        ):
            raise ProvenanceInvariantError(
                "approval carry-forward relation is bound to another current draft"
            )
        if (
            relation.type == CARRIES_APPROVAL_FROM
            and isinstance(source_record, ApprovalCarryForward)
            and source_record.prior_draft_address != target_record.content_address
        ):
            raise ProvenanceInvariantError(
                "approval carry-forward relation is bound to another prior draft"
            )
        if (
            relation.type == REVALIDATES_APPROVAL
            and isinstance(source_record, ApprovalCarryForward)
            and source_record.prior_approval_address != target_record.content_address
        ):
            raise ProvenanceInvariantError(
                "approval carry-forward relation is bound to another approval"
            )
        if relation.type == RENDERS:
            if (
                isinstance(source_record, RenderedArtifact)
                and isinstance(target_record, GuideDraft)
                and source_record.guide_id != target_record.guide_id
            ):
                raise ProvenanceInvariantError(
                    "rendered artifact relation targets a draft from another guide"
                )
            if isinstance(source_record, PublicationRevision) and isinstance(
                target_record,
                RenderedArtifact,
            ):
                if source_record.guide_id != target_record.guide_id:
                    raise ProvenanceInvariantError(
                        "publication relation targets an artifact from another guide"
                    )
                if source_record.artifact_address != target_record.content_address:
                    raise ProvenanceInvariantError(
                        "publication relation targets an artifact outside its committed binding"
                    )
        return relation

    def _relations(
        self,
        object_id: str | None = None,
        relation_type: str | None = None,
        *,
        direction: str = "both",
    ) -> list[Relation]:
        relations = self._graph.get_relations(
            object_id,
            relation_type,
            direction=direction,
        )
        validated: list[Relation] = []
        for relation in relations:
            if relation.type not in _RELATION_RULES:
                if relation_type is not None:
                    raise ProvenanceInvariantError(
                        f"relation {relation.id} is not documentation provenance"
                    )
                continue
            validated.append(self._validated_relation(relation, relation_type))
        return validated

    def _all_relations(self) -> list[Relation]:
        relations = [
            self._validated_relation(relation)
            for relation in self._graph.all_relations()
            if relation.type in _RELATION_RULES
        ]
        keys = [(relation.type, relation.source, relation.target) for relation in relations]
        if len(keys) != len(set(keys)):
            raise ProvenanceInvariantError(
                "documentation provenance contains duplicate relation projections"
            )
        return relations

    def _validated_record(
        self,
        obj: Object,
        expected_type: str | tuple[str, ...] | None = None,
    ) -> AddressedRecord:
        if expected_type is not None:
            allowed = (expected_type,) if isinstance(expected_type, str) else expected_type
            if obj.type not in allowed:
                raise ProvenanceInvariantError(
                    f"provenance object {obj.id} has type {obj.type!r}; "
                    f"expected {', '.join(allowed)}"
                )
        model = _RECORD_MODELS.get(obj.type)
        if model is None:
            raise ProvenanceInvariantError(f"object {obj.id} is not documentation provenance")
        try:
            record = model.model_validate(obj.data)
        except ValueError as cause:
            raise ProvenanceInvariantError(
                f"provenance object {obj.id} failed content-address validation"
            ) from cause
        expected_actor = _expected_record_actor(record)
        if obj.provenance.get("created_by") != expected_actor:
            raise ProvenanceInvariantError(
                f"{obj.type} object is not attributed to {expected_actor!r}"
            )
        self._require_trusted_authority(record, actor=expected_actor)
        return record

    def _validated_object(
        self,
        object_id: str,
        expected_type: str | tuple[str, ...] | None = None,
    ) -> Object:
        obj = self._graph.get_object(object_id)
        if obj is None:
            raise ProvenanceInvariantError(f"unknown provenance object: {object_id}")
        self._validated_record(obj, expected_type)
        return obj

    def _assert_ref[RecordT: AddressedRecord](
        self,
        ref: NodeRef[RecordT],
        expected_type: str | tuple[str, ...] | None = None,
    ) -> RecordT:
        obj = self._validated_object(ref.object_id, expected_type)
        if ref.type_name != obj.type:
            raise ProvenanceInvariantError(
                f"node reference type {ref.type_name!r} does not match object type {obj.type!r}"
            )
        stored = self._validated_record(obj, expected_type)
        if type(stored) is not type(ref.record) or stored != ref.record:
            raise ProvenanceInvariantError(
                f"node reference {ref.object_id} does not identify its supplied record"
            )
        return cast(RecordT, stored)

    def _validated_content_binding_targets(
        self,
        obj: Object,
        record: ContentBoundRecord,
    ) -> tuple[tuple[str, Object], ...]:
        if not record.content_bindings:
            raise ProvenanceInvariantError(
                f"{obj.type} record does not bind its content support relations"
            )
        expected = {
            (
                binding.relation_type,
                self._object_id_for_address(binding.target_address),
            )
            for binding in record.content_bindings
        }
        actual_relations = [
            relation
            for relation in self._relations(
                obj.id,
                direction="outgoing",
            )
            if relation.type in _CONTENT_EDGES
        ]
        actual = {(relation.type, relation.target) for relation in actual_relations}
        if len(actual) != len(actual_relations) or actual != expected:
            raise ProvenanceInvariantError(
                f"{obj.type} content relations no longer match its addressed bindings"
            )
        return tuple(
            (
                binding.relation_type,
                self._validated_object(self._object_id_for_address(binding.target_address)),
            )
            for binding in record.content_bindings
        )

    def _latest_validation_result(
        self,
        subject_id: str,
    ) -> ValidationResult | None:
        subject = self._validated_object(subject_id, _VALIDATION_SUBJECT_TYPES)
        subject_record = self._validated_record(subject)
        candidates_by_address: dict[str, ValidationResult] = {}
        candidate_object_ids: dict[str, str] = {}
        for obj in self._graph.objects(type=VALIDATION_RESULT):
            validation = cast(
                ValidationResult,
                self._validated_record(obj, VALIDATION_RESULT),
            )
            if validation.subject_address != subject_record.content_address:
                continue
            if validation.content_address in candidate_object_ids:
                raise ProvenanceInvariantError(
                    "one validation result content address identifies multiple objects"
                )
            candidates_by_address[validation.content_address] = validation
            candidate_object_ids[validation.content_address] = obj.id
        for relation in self._relations(
            subject_id,
            VALIDATED_BY,
            direction="outgoing",
        ):
            validation = cast(
                ValidationResult,
                self._validated_record(
                    self._validated_object(relation.target, VALIDATION_RESULT),
                    VALIDATION_RESULT,
                ),
            )
            if validation.subject_address != subject_record.content_address:
                raise ProvenanceInvariantError("validation relation is bound to another subject")
            if validation.content_address not in candidates_by_address:
                raise ProvenanceInvariantError(
                    "validation projection does not identify an authoritative result"
                )
        if not candidates_by_address:
            return None
        return max(
            candidates_by_address.values(),
            key=lambda item: (
                _parse_timestamp(item.validation_time, field_name="validation_time"),
                _utf16_sort_key(item.validation_id),
                _utf16_sort_key(item.content_address),
            ),
        )

    def _has_passed_validation(self, subject_id: str) -> bool:
        latest = self._latest_validation_result(subject_id)
        if latest is None:
            return False
        return latest.outcome is ValidationOutcome.PASSED

    def _latest_approval_decision(
        self,
        subject_id: str,
    ) -> ApprovalDecision | None:
        subject = self._validated_object(subject_id, _REVIEW_SUBJECT_TYPES)
        subject_record = self._validated_record(subject)
        expected = self._review_binding(subject_id)
        candidates_by_address: dict[str, ApprovalDecision] = {}
        candidate_object_ids: dict[str, str] = {}
        for obj in self._graph.objects(type=APPROVAL_DECISION):
            approval = cast(
                ApprovalDecision,
                self._validated_record(obj, APPROVAL_DECISION),
            )
            if approval.subject_address != subject_record.content_address:
                continue
            if (
                approval.source_revision != expected.source_revision
                or approval.manifest_digest != expected.manifest_digest
                or approval.draft_digest != expected.draft_digest
                or approval.evidence_digest != expected.evidence_digest
            ):
                raise ProvenanceInvariantError(
                    "approval record has stale or mismatched review bindings"
                )
            if approval.content_address in candidate_object_ids:
                raise ProvenanceInvariantError(
                    "one approval decision content address identifies multiple objects"
                )
            candidates_by_address[approval.content_address] = approval
            candidate_object_ids[approval.content_address] = obj.id
        for relation in self._relations(
            subject_id,
            APPROVED_BY,
            direction="outgoing",
        ):
            approval = cast(
                ApprovalDecision,
                self._validated_record(
                    self._validated_object(relation.target, APPROVAL_DECISION),
                    APPROVAL_DECISION,
                ),
            )
            if approval.subject_address != subject_record.content_address:
                raise ProvenanceInvariantError("approval relation is bound to another subject")
            if (
                approval.source_revision != expected.source_revision
                or approval.manifest_digest != expected.manifest_digest
                or approval.draft_digest != expected.draft_digest
                or approval.evidence_digest != expected.evidence_digest
            ):
                raise ProvenanceInvariantError(
                    "approval relation has stale or mismatched review bindings"
                )
            if approval.content_address not in candidates_by_address:
                raise ProvenanceInvariantError(
                    "approval projection does not identify an authoritative decision"
                )
        if not candidates_by_address:
            return None
        return max(
            candidates_by_address.values(),
            key=lambda item: (
                _parse_timestamp(item.decision_time, field_name="decision_time"),
                _utf16_sort_key(item.decision_id),
                _utf16_sort_key(item.content_address),
            ),
        )

    def _is_approved(self, subject_id: str) -> bool:
        latest = self._latest_approval_decision(subject_id)
        if latest is None:
            return False
        return latest.outcome is ApprovalOutcome.APPROVED

    def _is_publishable_review(self, subject_id: str) -> bool:
        subject = self._validated_object(subject_id, _REVIEW_SUBJECT_TYPES)
        if subject_id in self._invalidated_object_ids() or not self._has_passed_validation(
            subject_id
        ):
            return False
        if subject.type == GUIDE_DRAFT and self._draft_lineage_is_invalidated(subject_id):
            return False
        latest = self._latest_approval_decision(subject_id)
        if latest is not None:
            return latest.outcome is ApprovalOutcome.APPROVED
        if subject.type == GUIDE_DRAFT:
            return self._has_current_approval_carry_forward(subject_id)
        return False

    def _has_current_approval_carry_forward(self, current_draft_id: str) -> bool:
        current_draft = cast(
            GuideDraft,
            self._validated_record(
                self._validated_object(current_draft_id, GUIDE_DRAFT),
                GUIDE_DRAFT,
            ),
        )
        relations = self._relations(
            current_draft_id,
            APPROVAL_CARRIED_FORWARD_BY,
            direction="outgoing",
        )
        candidates: list[tuple[Object, ApprovalCarryForward]] = []
        for obj in self._graph.objects(type=APPROVAL_CARRY_FORWARD):
            if obj.data.get("current_draft_address") != current_draft.content_address:
                continue
            candidates.append(
                (
                    obj,
                    cast(
                        ApprovalCarryForward,
                        self._validated_record(obj, APPROVAL_CARRY_FORWARD),
                    ),
                )
            )
        if not candidates:
            if relations:
                raise ProvenanceInvariantError(
                    "approval carry-forward projection has no authoritative record"
                )
            return False
        if len(candidates) != 1:
            raise ProvenanceInvariantError(
                "a guide draft must have exactly one approval carry-forward"
            )
        carry_object, record = candidates[0]
        if len(relations) > 1:
            raise ProvenanceInvariantError(
                "guide draft has duplicate approval carry-forward projections"
            )
        if any(relation.target != carry_object.id for relation in relations):
            raise ProvenanceInvariantError(
                "guide draft has a forged approval carry-forward projection"
            )
        return self._approval_carry_forward_is_current(
            record,
            current_draft_id=current_draft_id,
            prior_draft_id=self._object_id_for_address(record.prior_draft_address),
            prior_approval_id=self._object_id_for_address(
                record.prior_approval_address,
            ),
        )

    def _stored_approval_carry_forward_is_current(
        self,
        current_draft_id: str,
        carry_forward_id: str,
    ) -> bool:
        record, prior_draft_id, prior_approval_id = self._stored_approval_carry_forward_binding(
            current_draft_id,
            carry_forward_id,
        )
        return self._approval_carry_forward_is_current(
            record,
            current_draft_id=current_draft_id,
            prior_draft_id=prior_draft_id,
            prior_approval_id=prior_approval_id,
        )

    def _stored_approval_carry_forward_binding(
        self,
        current_draft_id: str,
        carry_forward_id: str,
    ) -> tuple[ApprovalCarryForward, str, str]:
        self._validated_object(current_draft_id, GUIDE_DRAFT)
        carry_forward = self._validated_object(
            carry_forward_id,
            APPROVAL_CARRY_FORWARD,
        )
        record = cast(
            ApprovalCarryForward,
            self._validated_record(carry_forward, APPROVAL_CARRY_FORWARD),
        )
        current_relations = self._relations(
            current_draft_id,
            APPROVAL_CARRIED_FORWARD_BY,
            direction="outgoing",
        )
        if len(current_relations) != 1 or current_relations[0].target != carry_forward_id:
            raise ProvenanceInvariantError(
                "approval carry-forward must belong to exactly one current guide draft"
            )
        incoming_relations = self._relations(
            carry_forward_id,
            APPROVAL_CARRIED_FORWARD_BY,
            direction="incoming",
        )
        if len(incoming_relations) != 1 or incoming_relations[0].source != current_draft_id:
            raise ProvenanceInvariantError(
                "approval carry-forward has a forged current-draft relation"
            )
        prior_relations = self._relations(
            carry_forward_id,
            CARRIES_APPROVAL_FROM,
            direction="outgoing",
        )
        approval_relations = self._relations(
            carry_forward_id,
            REVALIDATES_APPROVAL,
            direction="outgoing",
        )
        if len(prior_relations) != 1 or len(approval_relations) != 1:
            raise ProvenanceInvariantError(
                "approval carry-forward must identify exactly one prior draft and approval"
            )
        if carry_forward.provenance.get("created_by") != record.workflow:
            raise ProvenanceInvariantError(
                "approval carry-forward object is not attributed to its workflow"
            )
        for relation in (
            current_relations[0],
            prior_relations[0],
            approval_relations[0],
        ):
            if (
                relation.provenance.get("created_by") != record.workflow
                or relation.data.get("provenance_kind") != ProvenanceKind.REVIEW.value
            ):
                raise ProvenanceInvariantError(
                    "approval carry-forward relation has forged workflow provenance"
                )
        prior_draft_id = prior_relations[0].target
        prior_approval_id = approval_relations[0].target
        self._validate_approval_carry_forward_binding(
            record,
            current_draft_id=current_draft_id,
            prior_draft_id=prior_draft_id,
            prior_approval_id=prior_approval_id,
        )
        return record, prior_draft_id, prior_approval_id

    def _approval_carry_forward_is_current(
        self,
        record: ApprovalCarryForward,
        *,
        current_draft_id: str,
        prior_draft_id: str,
        prior_approval_id: str,
    ) -> bool:
        self._validate_approval_carry_forward_binding(
            record,
            current_draft_id=current_draft_id,
            prior_draft_id=prior_draft_id,
            prior_approval_id=prior_approval_id,
        )
        current_draft = self._validated_object(current_draft_id, GUIDE_DRAFT)
        prior_draft = self._validated_object(prior_draft_id, GUIDE_DRAFT)
        if self._draft_lineage_is_invalidated(
            current_draft_id
        ) or self._draft_lineage_is_invalidated(prior_draft_id):
            return False
        self._validate_guide_draft_lineage(
            current_draft,
            cast(GuideDraft, self._validated_record(current_draft, GUIDE_DRAFT)),
        )
        self._validate_guide_draft_lineage(
            prior_draft,
            cast(GuideDraft, self._validated_record(prior_draft, GUIDE_DRAFT)),
        )
        current_validation = self._latest_validation_result(current_draft_id)
        prior_validation = self._latest_validation_result(prior_draft_id)
        if (
            current_validation is None
            or current_validation.outcome is not ValidationOutcome.PASSED
            or prior_validation is None
            or prior_validation.outcome is not ValidationOutcome.PASSED
        ):
            return False
        revalidation_time = _parse_timestamp(
            record.revalidation_time,
            field_name="revalidation_time",
        )
        if revalidation_time < max(
            _parse_timestamp(
                current_validation.validation_time,
                field_name="validation_time",
            ),
            _parse_timestamp(
                prior_validation.validation_time,
                field_name="validation_time",
            ),
        ):
            return False
        latest_prior = self._latest_approval_decision(prior_draft_id)
        return (
            latest_prior is not None
            and latest_prior.content_address == record.prior_approval_address
            and latest_prior.outcome is ApprovalOutcome.APPROVED
        )

    def _validate_approval_carry_forward_binding(
        self,
        record: ApprovalCarryForward,
        *,
        current_draft_id: str,
        prior_draft_id: str,
        prior_approval_id: str,
    ) -> None:
        if current_draft_id == prior_draft_id:
            raise ProvenanceInvariantError(
                "approval carry-forward requires distinct current and prior drafts"
            )
        current = cast(
            GuideDraft,
            self._validated_record(
                self._validated_object(current_draft_id, GUIDE_DRAFT),
                GUIDE_DRAFT,
            ),
        )
        prior = cast(
            GuideDraft,
            self._validated_record(
                self._validated_object(prior_draft_id, GUIDE_DRAFT),
                GUIDE_DRAFT,
            ),
        )
        approval = cast(
            ApprovalDecision,
            self._validated_record(
                self._validated_object(prior_approval_id, APPROVAL_DECISION),
                APPROVAL_DECISION,
            ),
        )
        if (
            record.current_draft_address != current.content_address
            or record.prior_draft_address != prior.content_address
            or record.prior_approval_address != approval.content_address
        ):
            raise ProvenanceInvariantError(
                "approval carry-forward record addresses do not match its relations"
            )
        if current.guide_id != prior.guide_id:
            raise ProvenanceInvariantError(
                "approval carry-forward drafts must belong to the same guide"
            )
        if record.draft_digest != current.draft_digest or record.draft_digest != prior.draft_digest:
            raise ProvenanceInvariantError(
                "approval carry-forward requires identical draft digests"
            )
        if (
            record.evidence_digest != current.evidence_digest
            or record.evidence_digest != prior.evidence_digest
        ):
            raise ProvenanceInvariantError(
                "approval carry-forward requires identical evidence digests"
            )
        if self._guide_draft_semantic_content_digest(
            current
        ) != self._guide_draft_semantic_content_digest(prior):
            raise ProvenanceInvariantError(
                "approval carry-forward requires unchanged draft prose and evidence lineage"
            )
        current_run = self._producing_run_object(current_draft_id)
        prior_run = self._producing_run_object(prior_draft_id)
        current_source = self._run_input_object(current_run.id, SOURCE_REVISION)
        current_manifest = self._run_input_object(current_run.id, MANIFEST_INPUT)
        prior_source = self._run_input_object(prior_run.id, SOURCE_REVISION)
        prior_manifest = self._run_input_object(prior_run.id, MANIFEST_INPUT)
        if (
            self._validated_record(current_source, SOURCE_REVISION).content_address
            == self._validated_record(prior_source, SOURCE_REVISION).content_address
            and self._validated_record(current_manifest, MANIFEST_INPUT).content_address
            == self._validated_record(prior_manifest, MANIFEST_INPUT).content_address
        ):
            raise ProvenanceInvariantError(
                "approval carry-forward requires changed source or manifest metadata"
            )
        if (
            approval.subject_address != prior.content_address
            or approval.source_revision != prior.source_revision
            or approval.manifest_digest != prior.manifest_digest
            or approval.draft_digest != prior.draft_digest
            or approval.evidence_digest != prior.evidence_digest
            or approval.outcome is not ApprovalOutcome.APPROVED
        ):
            raise ProvenanceInvariantError(
                "approval carry-forward does not reference an approved prior binding"
            )
        if _parse_timestamp(
            record.revalidation_time,
            field_name="revalidation_time",
        ) < _parse_timestamp(approval.decision_time, field_name="decision_time"):
            raise ProvenanceInvariantError(
                "approval carry-forward cannot predate the prior human decision"
            )

    def _repair_rendered_artifact_lineage(
        self,
        artifact_id: str,
    ) -> tuple[Object, Object]:
        """Validate or repair the two-edge projection of one rendered artifact.

        ``RenderedArtifact`` predates aggregate lineage fields, so an object
        event can survive a crash before either relation event is written.  A
        repair is safe only when the guide id selects one currently
        publishable draft and that draft has one authoritative producing run.
        Ambiguity is rejected instead of guessing.
        """

        artifact = self._validated_object(artifact_id, RENDERED_ARTIFACT)
        artifact_record = cast(
            RenderedArtifact,
            self._validated_record(artifact, RENDERED_ARTIFACT),
        )
        produced_relations = self._relations(
            artifact_id,
            PRODUCED_BY,
            direction="outgoing",
        )
        render_relations = self._relations(
            artifact_id,
            RENDERS,
            direction="outgoing",
        )
        if len(produced_relations) > 1 or len(render_relations) > 1:
            raise ProvenanceInvariantError(
                "rendered artifact must have one producing run and one guide draft"
            )

        stored_run = (
            self._validated_object(produced_relations[0].target, AGENT_RUN)
            if produced_relations
            else None
        )
        stored_draft = (
            self._validated_object(render_relations[0].target, GUIDE_DRAFT)
            if render_relations
            else None
        )
        if stored_draft is not None:
            draft_record = cast(
                GuideDraft,
                self._validated_record(stored_draft, GUIDE_DRAFT),
            )
            if draft_record.guide_id != artifact_record.guide_id:
                raise ProvenanceInvariantError("rendered artifact relation targets another guide")
            expected_run = self._producing_run_object(stored_draft.id)
            candidates = [(stored_draft, expected_run)]
        else:
            candidates: list[tuple[Object, Object]] = []
            for draft in self._graph.objects(type=GUIDE_DRAFT):
                draft_record = cast(
                    GuideDraft,
                    self._validated_record(draft, GUIDE_DRAFT),
                )
                if draft_record.guide_id != artifact_record.guide_id:
                    continue
                producing_run = self._producing_run_object(draft.id)
                if stored_run is not None and producing_run.id != stored_run.id:
                    continue
                if self._is_publishable_review(draft.id):
                    candidates.append((draft, producing_run))
        if len(candidates) != 1:
            raise ProvenanceInvariantError(
                "rendered artifact lineage cannot be reconstructed uniquely"
            )
        draft, run = candidates[0]
        if stored_run is not None and stored_run.id != run.id:
            raise ProvenanceInvariantError(
                "rendered artifact producing run does not match its draft"
            )
        self._validate_stored_run(run, allowed_kinds=(AgentKind.DOCUMENTATION,))
        draft_record = cast(
            GuideDraft,
            self._validated_record(draft, GUIDE_DRAFT),
        )
        if (
            self._run_source(run.id).revision != draft_record.source_revision
            or self._run_manifest(run.id).revision != draft_record.manifest_revision
            or self._run_manifest(run.id).manifest_digest != draft_record.manifest_digest
        ):
            raise ProvenanceInvariantError(
                "rendered artifact run inputs do not match its guide draft"
            )
        self._relate_ids(artifact_id, run.id, PRODUCED_BY)
        self._relate_ids(artifact_id, draft.id, RENDERS)
        return run, draft

    def _validated_publication_artifact(self, publication_id: str) -> Object:
        publication = self._validated_object(
            publication_id,
            PUBLICATION_REVISION,
        )
        publication_record = cast(
            PublicationRevision,
            self._validated_record(publication, PUBLICATION_REVISION),
        )
        self._require_unique_publication_revision(publication_record)
        relations = self._relations(
            publication_id,
            RENDERS,
            direction="outgoing",
        )
        if not relations:
            artifact_id = self._object_id_for_address(
                publication_record.artifact_address,
            )
            self._validated_object(artifact_id, RENDERED_ARTIFACT)
            self._relate_ids(
                publication_id,
                artifact_id,
                RENDERS,
                actor=publication_record.published_by,
            )
            relations = self._relations(
                publication_id,
                RENDERS,
                direction="outgoing",
            )
        if len(relations) != 1:
            raise ProvenanceInvariantError("publication revision must render exactly one artifact")
        artifact = self._validated_object(
            relations[0].target,
            RENDERED_ARTIFACT,
        )
        artifact_record = cast(
            RenderedArtifact,
            self._validated_record(artifact, RENDERED_ARTIFACT),
        )
        if publication_record.guide_id != artifact_record.guide_id:
            raise ProvenanceInvariantError(
                "publication revision renders an artifact from another guide"
            )
        if publication_record.artifact_address != artifact_record.content_address:
            raise ProvenanceInvariantError(
                "publication revision renders an artifact outside its committed binding"
            )
        self._repair_rendered_artifact_lineage(artifact.id)
        return artifact

    def _validate_guide_presentation_lineage(self, guide_id: str) -> None:
        """Repair artifact indexes, then enforce exact presentation cardinality."""

        for artifact in self._graph.objects(type=RENDERED_ARTIFACT):
            record = cast(
                RenderedArtifact,
                self._validated_record(artifact, RENDERED_ARTIFACT),
            )
            if record.guide_id == guide_id:
                self._repair_rendered_artifact_lineage(artifact.id)
        for publication in self._graph.objects(type=PUBLICATION_REVISION):
            record = cast(
                PublicationRevision,
                self._validated_record(publication, PUBLICATION_REVISION),
            )
            if record.guide_id == guide_id:
                self._validated_publication_artifact(publication.id)

    def _rendered_drafts(self, artifact_id: str) -> list[Object]:
        self._validated_object(artifact_id, RENDERED_ARTIFACT)
        drafts: list[Object] = []
        for relation in self._relations(
            artifact_id,
            RENDERS,
            direction="outgoing",
        ):
            target = self._validated_object(relation.target)
            if target.type == GUIDE_DRAFT:
                drafts.append(target)
        return drafts

    def _reverse_content_dependents(self, start_ids: Iterable[str]) -> list[Object]:
        reverse: dict[str, list[str]] = defaultdict(list)
        for relation in self._all_relations():
            if relation.type in _CONTENT_EDGES:
                reverse[relation.target].append(relation.source)
        seen = set(start_ids)
        queue = deque(sorted(seen))
        while queue:
            target = queue.popleft()
            for source in reverse.get(target, ()):
                if source not in seen:
                    seen.add(source)
                    queue.append(source)
        return [
            self._validated_object(obj.id)
            for object_id in sorted(seen)
            if (obj := self._graph.get_object(object_id)) is not None
        ]

    def _content_reaches(self, subject_id: str, target_id: str) -> bool:
        outgoing: dict[str, list[str]] = defaultdict(list)
        for relation in self._all_relations():
            if relation.type in _CONTENT_EDGES:
                outgoing[relation.source].append(relation.target)
        seen = {subject_id}
        queue = deque([subject_id])
        while queue:
            source = queue.popleft()
            if source == target_id:
                return True
            for target in outgoing.get(source, ()):
                if target not in seen:
                    seen.add(target)
                    queue.append(target)
        return False

    def _validate_content_bound_lineage(self, start_ids: Iterable[str]) -> None:
        queue = deque(start_ids)
        seen: set[str] = set()
        while queue:
            object_id = queue.popleft()
            if object_id in seen:
                continue
            seen.add(object_id)
            obj = self._validated_object(object_id)
            record = self._validated_record(obj)
            if not isinstance(record, ContentBoundRecord):
                continue
            for _, target in self._validated_content_binding_targets(obj, record):
                queue.append(target.id)

    def _guide_draft_semantic_content_digest(self, draft: GuideDraft) -> str:
        sections: list[JsonValue] = []
        for address in draft.section_addresses:
            section_obj = self._validated_object(
                self._object_id_for_address(address),
                GUIDE_SECTION,
            )
            section = cast(
                GuideSection,
                self._validated_record(section_obj, GUIDE_SECTION),
            )
            self._validate_content_bound_lineage((section_obj.id,))
            support: list[JsonValue] = []
            for relation_type, target in self._validated_content_binding_targets(
                section_obj,
                section,
            ):
                if target.type in (SOURCE_REVISION, MANIFEST_INPUT):
                    continue
                target_record = self._validated_record(target)
                support.append(
                    cast(
                        JsonValue,
                        {
                            "relation_type": relation_type,
                            "target_address": target_record.content_address,
                            "target_type": target.type,
                        },
                    )
                )
            sections.append(
                cast(
                    JsonValue,
                    {
                        "guide_id": section.guide_id,
                        "section_id": section.section_id,
                        "heading": section.heading,
                        "prose": section.prose,
                        "claim_ids": list(section.claim_ids),
                        "support": support,
                    },
                )
            )
        return _semantic_digest(cast(JsonValue, sections))

    def _draft_lineage_is_invalidated(self, draft_id: str) -> bool:
        self._validated_object(draft_id, GUIDE_DRAFT)
        lineage_ids = {draft_id}
        queue = deque([draft_id])
        while queue:
            source = queue.popleft()
            for relation in self._relations(
                source,
                direction="outgoing",
            ):
                if relation.type not in _CONTENT_EDGES:
                    continue
                self._validated_object(relation.target)
                if relation.target not in lineage_ids:
                    lineage_ids.add(relation.target)
                    queue.append(relation.target)
        return bool(lineage_ids & self._invalidated_object_ids())

    def _invalidated_object_ids(self) -> set[str]:
        invalidated: set[str] = set()
        for obj in self._graph.objects(type=INVALIDATION):
            record = cast(
                InvalidationRecord,
                self._validated_record(obj, INVALIDATION),
            )
            invalidated.update(self._invalidation_target_ids(obj, record))
        return invalidated

    def _invalidation_target_ids(
        self,
        invalidation: Object,
        record: InvalidationRecord,
    ) -> set[str]:
        fact_ids = {fact.id for fact in self._validated_invalidation_fact_objects(record)}
        expected = {
            obj.id
            for obj in self._reverse_content_dependents(fact_ids)
            if obj.type in (MANIFEST_FACT, RESEARCH_CLAIM, GUIDE_SECTION)
        }
        projections = self._relations(
            invalidation.id,
            INVALIDATES,
            direction="outgoing",
        )
        projected = {relation.target for relation in projections}
        if len(projected) != len(projections):
            raise ProvenanceInvariantError("invalidation has duplicate target projections")
        if not projected.issubset(expected):
            raise ProvenanceInvariantError(
                "invalidation projection targets content outside its addressed changes"
            )
        return expected

    def _validated_invalidation_fact_objects(
        self,
        record: InvalidationRecord,
    ) -> tuple[Object, ...]:
        """Resolve one semantic manifest delta from its addressed record."""

        changes = record.changes
        if len({change.fact_id for change in changes}) != len(changes):
            raise ProvenanceInvariantError("invalidation contains duplicate fact ids")
        if len({change.previous_address for change in changes}) != len(changes):
            raise ProvenanceInvariantError("invalidation contains duplicate previous addresses")
        current_manifests = [
            obj
            for obj in self._graph.objects(type=MANIFEST_INPUT)
            if cast(
                ManifestInput,
                self._validated_record(obj, MANIFEST_INPUT),
            ).revision
            == record.manifest_revision
        ]
        if len(current_manifests) != 1:
            raise ProvenanceInvariantError(
                f"manifest revision {record.manifest_revision!r} must identify exactly one input"
            )
        current_manifest = current_manifests[0]
        previous_addresses = {change.previous_address for change in changes}
        fact_objects = tuple(
            obj
            for obj in self._graph.objects(type=MANIFEST_FACT)
            if cast(
                ManifestFact,
                self._validated_record(obj, MANIFEST_FACT),
            ).content_address
            in previous_addresses
        )
        found_addresses = {
            cast(
                ManifestFact,
                self._validated_record(obj, MANIFEST_FACT),
            ).content_address
            for obj in fact_objects
        }
        missing = sorted(previous_addresses - found_addresses)
        if missing:
            raise ProvenanceInvariantError(
                f"cannot invalidate unknown previous fact addresses: {', '.join(missing)}"
            )
        current_facts = self._manifest_facts(current_manifest.id)
        for change in changes:
            previous = next(
                obj
                for obj in fact_objects
                if cast(
                    ManifestFact,
                    self._validated_record(obj, MANIFEST_FACT),
                ).content_address
                == change.previous_address
            )
            previous_record = cast(
                ManifestFact,
                self._validated_record(previous, MANIFEST_FACT),
            )
            if previous_record.fact_id != change.fact_id:
                raise ProvenanceInvariantError(
                    f"previous address does not identify changed fact {change.fact_id!r}"
                )
            current_members = [
                obj
                for obj in current_facts
                if cast(
                    ManifestFact,
                    self._validated_record(obj, MANIFEST_FACT),
                ).fact_id
                == change.fact_id
            ]
            if change.current_address is None:
                if current_members:
                    raise ProvenanceInvariantError(
                        f"deleted fact {change.fact_id!r} still exists in current manifest"
                    )
                continue
            current_matches = [
                obj
                for obj in self._graph.objects(type=MANIFEST_FACT)
                if cast(
                    ManifestFact,
                    self._validated_record(obj, MANIFEST_FACT),
                ).content_address
                == change.current_address
            ]
            if len(current_matches) != 1:
                raise ProvenanceInvariantError(
                    f"current address does not uniquely identify changed fact {change.fact_id!r}"
                )
            current = current_matches[0]
            current_record = cast(
                ManifestFact,
                self._validated_record(current, MANIFEST_FACT),
            )
            if current_record.fact_id != change.fact_id:
                raise ProvenanceInvariantError(
                    f"current address does not identify changed fact {change.fact_id!r}"
                )
            if len(current_members) != 1 or current_members[0].id != current.id:
                raise ProvenanceInvariantError(
                    f"current fact {change.fact_id!r} is not uniquely owned by "
                    f"manifest revision {record.manifest_revision!r}"
                )
            if change.current_address == change.previous_address:
                raise ProvenanceInvariantError(
                    f"changed fact {change.fact_id!r} retained the same content address"
                )
        return fact_objects

    def _stale_section_ids(self) -> set[str]:
        return {
            object_id
            for object_id in self._invalidated_object_ids()
            if self._validated_object(object_id).type == GUIDE_SECTION
        }

    def _require_current_content(self, refs: Sequence[ContentRef]) -> None:
        invalidated = self._invalidated_object_ids()
        for ref in refs:
            self._assert_ref(ref)
        stale = sorted(ref.object_id for ref in refs if ref.object_id in invalidated)
        if stale:
            raise ProvenanceInvariantError(
                f"content provenance includes invalidated records: {', '.join(stale)}"
            )

    def _require_grounded_support(self, refs: Sequence[ContentRef]) -> None:
        grounded = False
        for ref in refs:
            record = self._assert_ref(ref)
            if isinstance(record, (ManifestFact, EvidenceRecord)):
                grounded = True
            elif isinstance(record, ResearchClaim):
                grounded = True
                if not self._is_publishable_review(ref.object_id):
                    raise ProvenanceInvariantError(
                        f"research claim {record.claim_id!r} is not approved"
                    )
        if not grounded:
            raise ProvenanceInvariantError(
                "content support requires a manifest fact, evidence record, "
                "or approved research claim"
            )
        self._require_approved_research_lineage(refs)

    def _require_approved_research_lineage(self, refs: Sequence[ContentRef]) -> None:
        self._require_approved_research_object_ids(ref.object_id for ref in refs)

    def _require_approved_research_object_ids(
        self,
        object_ids: Iterable[str],
    ) -> None:
        queue = deque(object_ids)
        seen: set[str] = set()
        while queue:
            object_id = queue.popleft()
            if object_id in seen:
                continue
            seen.add(object_id)
            obj = self._validated_object(object_id)
            record = self._validated_record(obj)
            if isinstance(record, ContentBoundRecord):
                self._validated_content_binding_targets(obj, record)
            if isinstance(record, ResearchClaim) and not self._is_publishable_review(object_id):
                raise ProvenanceInvariantError(
                    f"research claim {record.claim_id!r} is not approved"
                )
            for relation in self._relations(
                object_id,
                direction="outgoing",
            ):
                if relation.type in _CONTENT_EDGES:
                    queue.append(relation.target)

    def _require_content_matches_run(
        self,
        refs: Sequence[ContentRef],
        run: NodeRef[AgentRun],
    ) -> None:
        manifest = self._run_input_object(run.object_id, MANIFEST_INPUT)
        source = self._run_input_object(run.object_id, SOURCE_REVISION)
        for ref in refs:
            record = self._assert_ref(ref)
            if isinstance(record, SourceRevision) and ref.object_id != source.id:
                raise ProvenanceInvariantError("content uses another source revision")
            if isinstance(record, ManifestInput) and ref.object_id != manifest.id:
                raise ProvenanceInvariantError("content uses another manifest input")
            if isinstance(record, (ManifestFact, EvidenceRecord, ResearchClaim)) and not (
                self._content_reaches(ref.object_id, manifest.id)
                or self._content_reaches(ref.object_id, source.id)
            ):
                raise ProvenanceInvariantError(
                    "content support is not grounded in the run's manifest"
                )

    def _require_run(
        self,
        run: NodeRef[AgentRun],
        *,
        allowed_kinds: tuple[AgentKind, ...],
    ) -> AgentRun:
        record = self._assert_ref(run, AGENT_RUN)
        self._validate_stored_run(
            self._validated_object(run.object_id, AGENT_RUN),
            allowed_kinds=allowed_kinds,
        )
        return record

    def _validate_stored_run(
        self,
        run: Object,
        *,
        allowed_kinds: tuple[AgentKind, ...],
    ) -> AgentRun:
        record = cast(AgentRun, self._validated_record(run, AGENT_RUN))
        if record.status is not RunStatus.COMPLETED:
            raise ProvenanceInvariantError("publishable content requires a completed agent run")
        if record.kind not in allowed_kinds:
            expected = ", ".join(kind.value for kind in allowed_kinds)
            raise ProvenanceInvariantError(
                f"agent run kind {record.kind.value!r} cannot produce this record; "
                f"expected {expected}"
            )
        configurations = [
            self._validated_object(relation.target, AGENT_CONFIGURATION)
            for relation in self._relations(
                run.id,
                CONFIGURED_BY,
                direction="outgoing",
            )
        ]
        if len(configurations) != 1:
            raise ProvenanceInvariantError("agent run must have exactly one configuration")
        configuration = cast(
            AgentConfiguration,
            self._validated_record(configurations[0], AGENT_CONFIGURATION),
        )
        if (
            configuration.agent_name != record.agent_name
            or configuration.agent_version != record.agent_version
        ):
            raise ProvenanceInvariantError("stored agent run no longer matches its configuration")
        self._run_input_object(run.id, SOURCE_REVISION)
        self._run_input_object(run.id, MANIFEST_INPUT)
        return record

    def _run_input_object(self, run_id: str, input_type: str) -> Object:
        self._validated_object(run_id, AGENT_RUN)
        inputs: list[Object] = []
        for relation in self._relations(
            run_id,
            USES_INPUT,
            direction="outgoing",
        ):
            target = self._validated_object(relation.target)
            if target.type == input_type:
                inputs.append(target)
        if len(inputs) != 1:
            raise ProvenanceInvariantError(f"agent run must have exactly one {input_type} input")
        return inputs[0]

    def _run_source(self, run_id: str) -> SourceRevision:
        return cast(
            SourceRevision,
            self._validated_record(
                self._run_input_object(run_id, SOURCE_REVISION),
                SOURCE_REVISION,
            ),
        )

    def _run_manifest(self, run_id: str) -> ManifestInput:
        return cast(
            ManifestInput,
            self._validated_record(
                self._run_input_object(run_id, MANIFEST_INPUT),
                MANIFEST_INPUT,
            ),
        )

    def _producing_run_object(self, subject_id: str) -> Object:
        runs = [
            self._validated_object(relation.target, AGENT_RUN)
            for relation in self._relations(
                subject_id,
                PRODUCED_BY,
                direction="outgoing",
            )
        ]
        if len(runs) != 1:
            raise ProvenanceInvariantError(
                "reviewed content must have exactly one producing agent run"
            )
        return runs[0]

    def _review_binding(self, subject_id: str) -> ReviewBinding:
        subject = self._validated_object(subject_id, _REVIEW_SUBJECT_TYPES)
        record = self._validated_record(subject)
        if isinstance(record, GuideDraft):
            self._validate_guide_draft_lineage(subject, record)
            return ReviewBinding(
                source_revision=record.source_revision,
                manifest_digest=record.manifest_digest,
                draft_digest=record.draft_digest,
                evidence_digest=record.evidence_digest,
            )
        if not isinstance(record, ResearchClaim):
            raise ProvenanceInvariantError("unsupported review subject")
        self._validate_content_bound_lineage((subject_id,))
        run = self._producing_run_object(subject_id)
        self._validate_stored_run(run, allowed_kinds=(AgentKind.RESEARCH,))
        source = self._run_source(run.id)
        manifest = self._run_manifest(run.id)
        evidence_addresses = sorted(
            self._validated_record(self._validated_object(relation.target)).content_address
            for relation in self._relations(
                subject_id,
                direction="outgoing",
            )
            if relation.type in _CONTENT_EDGES
        )
        return ReviewBinding(
            source_revision=source.revision,
            manifest_digest=manifest.manifest_digest,
            draft_digest=record.content_address.removeprefix("sha256:"),
            evidence_digest=_semantic_digest(cast(JsonValue, evidence_addresses)),
        )

    def _validate_guide_draft_lineage(
        self,
        draft: Object,
        record: GuideDraft,
    ) -> None:
        run = self._producing_run_object(draft.id)
        self._validate_stored_run(run, allowed_kinds=(AgentKind.DOCUMENTATION,))
        source = self._run_input_object(run.id, SOURCE_REVISION)
        manifest = self._run_input_object(run.id, MANIFEST_INPUT)
        source_record = cast(
            SourceRevision,
            self._validated_record(source, SOURCE_REVISION),
        )
        manifest_record = cast(
            ManifestInput,
            self._validated_record(manifest, MANIFEST_INPUT),
        )
        if (
            record.source_revision != source_record.revision
            or record.manifest_revision != manifest_record.revision
            or record.manifest_digest != manifest_record.manifest_digest
        ):
            raise ProvenanceInvariantError("guide draft no longer matches its producing run inputs")
        content_targets = {
            (relation.type, relation.target)
            for relation in self._relations(
                draft.id,
                direction="outgoing",
            )
            if relation.type in _CONTENT_EDGES
        }
        section_ids = {self._object_id_for_address(address) for address in record.section_addresses}
        expected_content_targets = {
            (CITES, source.id),
            (CITES, manifest.id),
            *((DERIVED_FROM, section_id) for section_id in section_ids),
        }
        if content_targets != expected_content_targets:
            raise ProvenanceInvariantError(
                "guide draft content relations no longer match its reviewed lineage"
            )
        for section_id in section_ids:
            section = cast(
                GuideSection,
                self._validated_record(
                    self._validated_object(section_id, GUIDE_SECTION),
                    GUIDE_SECTION,
                ),
            )
            self._validate_content_bound_lineage((section_id,))
            if (
                section.guide_id != record.guide_id
                or section.manifest_revision != record.manifest_revision
                or not self._content_reaches(section_id, manifest.id)
                or not self._has_passed_validation(section_id)
            ):
                raise ProvenanceInvariantError("guide draft contains a stale or mismatched section")
        self._require_approved_research_object_ids(section_ids)

    def review_binding(self, subject: ReviewSubjectRef) -> ReviewBinding:
        """Return the exact semantic digests a decision for ``subject`` must bind."""

        self._assert_ref(subject, _REVIEW_SUBJECT_TYPES)
        return self._review_binding(subject.object_id)

    def _require_unique_decision_id(
        self,
        subject_id: str,
        relation_type: str,
        identity_field: str,
        identity: str,
        content_address: str,
    ) -> None:
        subject = self._validated_record(self._validated_object(subject_id))
        object_type = {
            VALIDATED_BY: VALIDATION_RESULT,
            APPROVED_BY: APPROVAL_DECISION,
        }.get(relation_type)
        if object_type is None:
            raise ProvenanceInvariantError(
                f"{relation_type} does not identify a decision record type"
            )
        for obj in self._graph.objects(type=object_type):
            existing = self._validated_record(obj, object_type)
            if (
                getattr(existing, "subject_address", None) == subject.content_address
                and getattr(existing, identity_field, None) == identity
                and existing.content_address != content_address
            ):
                raise ProvenanceInvariantError(
                    f"{identity_field} {identity!r} already identifies another decision"
                )

    def _manifest_facts(self, manifest_id: str) -> list[Object]:
        self._validated_object(manifest_id, MANIFEST_INPUT)
        return [
            self._validated_object(relation.source, MANIFEST_FACT)
            for relation in self._relations(
                manifest_id,
                DERIVED_FROM,
                direction="incoming",
            )
        ]

    def _object_id_for_address(self, address: str) -> str:
        matches: list[str] = []
        for obj in self._graph.all_objects():
            if obj.data.get("content_address") != address:
                continue
            self._validated_record(obj)
            matches.append(obj.id)
        if len(matches) != 1:
            raise ProvenanceInvariantError(
                f"content address {address} must identify exactly one provenance object"
            )
        return matches[0]

    def _require_subject_address(
        self,
        address: str,
        subject: ValidationSubjectRef | ReviewSubjectRef,
    ) -> None:
        stored = self._assert_ref(subject)
        if address != stored.content_address:
            raise ProvenanceInvariantError(
                "review record subject address does not match the reviewed content"
            )

    @staticmethod
    def _affected_research_claim(obj: Object) -> AffectedResearchClaim:
        return AffectedResearchClaim(
            object_id=obj.id,
            claim_id=str(obj.data["claim_id"]),
            content_address=str(obj.data["content_address"]),
        )

    @staticmethod
    def _stale_guide_section(obj: Object) -> StaleGuideSection:
        return StaleGuideSection(
            object_id=obj.id,
            guide_id=str(obj.data["guide_id"]),
            section_id=str(obj.data["section_id"]),
            content_address=str(obj.data["content_address"]),
        )

    def _trace_node(self, obj: Object) -> TraceNode:
        record = self._validated_record(obj)
        if obj.type == APPROVAL_CARRY_FORWARD:
            carry_forward = cast(ApprovalCarryForward, record)
            self._validate_approval_carry_forward_binding(
                carry_forward,
                current_draft_id=self._object_id_for_address(
                    carry_forward.current_draft_address,
                ),
                prior_draft_id=self._object_id_for_address(
                    carry_forward.prior_draft_address,
                ),
                prior_approval_id=self._object_id_for_address(
                    carry_forward.prior_approval_address,
                ),
            )
        public_fields = _PUBLIC_TRACE_FIELDS.get(obj.type)
        if public_fields is None:
            raise ProvenanceInvariantError(
                f"provenance object {obj.id} has no public trace projection"
            )
        full_data = record.model_dump(mode="json")
        public_data = {field: full_data[field] for field in public_fields}
        decoded = cast(
            object,
            json.loads(
                json.dumps(
                    public_data,
                    allow_nan=False,
                    ensure_ascii=False,
                    separators=(",", ":"),
                    sort_keys=True,
                )
            ),
        )
        if not isinstance(decoded, dict):
            raise ProvenanceInvariantError(f"provenance object {obj.id} is not JSON")
        data = cast(dict[str, JsonValue], decoded)
        public_id = f"sha256:{
            _semantic_digest(
                cast(
                    JsonValue,
                    {
                        'type': obj.type,
                        'data': data,
                        'content_address': record.content_address,
                    },
                )
            )
        }"
        return TraceNode(
            id=public_id,
            type=obj.type,
            content_address=record.content_address,
            data=data,
        )

    @staticmethod
    def _stable_trace_edge_id(relation_type: str, source: str, target: str) -> str:
        return _trace_edge_id(relation_type, source, target)


__all__ = [
    "APPROVAL_CARRIED_FORWARD_BY",
    "APPROVAL_CARRY_FORWARD",
    "APPROVED_BY",
    "CARRIES_APPROVAL_FROM",
    "CITES",
    "DEFAULT_DOCUMENTATION_TRUST_POLICY",
    "DERIVED_FROM",
    "GUIDE_DRAFT",
    "INFORMED_BY",
    "RENDERS",
    "REVALIDATES_APPROVAL",
    "VALIDATED_BY",
    "AddressedRecord",
    "AgentConfiguration",
    "AgentKind",
    "AgentRun",
    "ApprovalCarryForward",
    "ApprovalDecision",
    "ApprovalOutcome",
    "Certainty",
    "ContentBinding",
    "ContentBoundRecord",
    "DocumentationAuthority",
    "DocumentationAuthorityResolver",
    "DocumentationAuthorityScope",
    "DocumentationProvenance",
    "DocumentationTrustPolicy",
    "EvidenceRecord",
    "GuideDraft",
    "GuideSection",
    "InvalidationReport",
    "ManifestFact",
    "ManifestFactChange",
    "ManifestInput",
    "NodeRef",
    "PromptRecord",
    "ProvenanceInvariantError",
    "ProvenanceKind",
    "PublicationRevision",
    "QuestionStatus",
    "RenderedArtifact",
    "ResearchClaim",
    "ReviewBinding",
    "RunStatus",
    "SourceRevision",
    "StaleGuideReport",
    "ToolCallRecord",
    "ToolCallStatus",
    "TraceExport",
    "UnresolvedQuestion",
    "ValidationOutcome",
    "ValidationResult",
    "provenance_pack",
]
