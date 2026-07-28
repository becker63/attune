from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import pytest
from pydantic import ValidationError

from attune_activegraph.generated.models import (
    ArtifactPromoteInput,
    AttuneToolFailure,
    CancelledReceipt,
    FailedReceipt,
    InvestigationFinalizeResult2,
    JoernQueryInput,
    JoernQueryResult,
    JoernQueryResult1,
    RepositoryCheckpointInput,
    RepositoryCheckpointResult,
    RepositoryCheckpointResult1,
    RepositoryMaterializeInput,
)

INVESTIGATION_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
INVOCATION_ID = f"ag1:{'a' * 64}"
SNAPSHOT_ID = "b" * 40
DIGEST = "c" * 64
STARTED_AT = "2026-07-27T12:00:00Z"
COMPLETED_AT = "2026-07-27T12:00:01.123Z"


def _success_receipt(*, tool: str = "repository") -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "invocationId": INVOCATION_ID,
        "investigationId": INVESTIGATION_ID,
        "tool": tool,
        "operation": "contract-test",
        "snapshotId": SNAPSHOT_ID,
        "toolchainDigest": DIGEST,
        "inputDigest": DIGEST,
        "status": "succeeded",
        "artifacts": [],
        "startedAt": STARTED_AT,
        "completedAt": COMPLETED_AT,
    }


def _terminal_receipt(status: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "invocationId": INVOCATION_ID,
        "investigationId": INVESTIGATION_ID,
        "tool": "repository",
        "operation": "contract-test",
        "toolchainDigest": DIGEST,
        "inputDigest": DIGEST,
        "status": status,
        "artifacts": [],
        "startedAt": STARTED_AT,
        "completedAt": COMPLETED_AT,
        "failure": {
            "code": "Cancelled" if status == "cancelled" else "ProcessExitFailure",
            "message": f"representative {status} operation",
        },
    }


def _joern_input() -> dict[str, Any]:
    return {
        "invocationId": INVOCATION_ID,
        "references": [{"ref": "notes://hypothesis", "note": "free-form context"}],
        "investigationId": INVESTIGATION_ID,
        "expectedSnapshot": SNAPSHOT_ID,
        "cpgql": "cpg.method.name.l",
        "outputFormat": "json",
        "frontend": "jssrc",
        "importOptions": {"schemaVersion": 1},
        "timeoutMilliseconds": 30_000,
    }


def test_wire_aliases_and_python_field_names_are_both_accepted() -> None:
    camel_case = JoernQueryInput.model_validate(_joern_input())
    snake_case = JoernQueryInput.model_validate(
        {
            "invocation_id": INVOCATION_ID,
            "references": [],
            "investigation_id": INVESTIGATION_ID,
            "expected_snapshot": SNAPSHOT_ID,
            "cpgql": "cpg.method.name.l",
            "output_format": "text",
            "frontend": "auto",
            "import_options": {"schema_version": 1},
            "timeout_milliseconds": 30_000,
        }
    )

    assert camel_case.expected_snapshot == SNAPSHOT_ID
    assert snake_case.import_options.schema_version == 1
    assert snake_case.model_dump(by_alias=True)["timeoutMilliseconds"] == 30_000


def test_models_reject_extra_fields_and_unknown_literals() -> None:
    extra = _joern_input() | {"semanticOntology": "not part of the service contract"}
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        JoernQueryInput.model_validate(extra)

    unsupported_frontend = _joern_input() | {"frontend": "c"}
    with pytest.raises(ValidationError, match="Input should be"):
        JoernQueryInput.model_validate(unsupported_frontend)


def test_result_union_accepts_success_failed_and_cancelled_receipts() -> None:
    success = RepositoryCheckpointResult.model_validate(
        {
            "snapshotId": SNAPSHOT_ID,
            "createdCommit": True,
            "receipt": _success_receipt(),
        }
    )
    failed = RepositoryCheckpointResult.model_validate({"receipt": _terminal_receipt("failed")})
    cancelled_payload = _terminal_receipt("cancelled") | {"snapshotId": None}
    cancelled = RepositoryCheckpointResult.model_validate({"receipt": cancelled_payload})

    assert isinstance(success.root, RepositoryCheckpointResult1)
    assert success.root.receipt.status == "succeeded"
    assert isinstance(failed.root, InvestigationFinalizeResult2)
    assert isinstance(failed.root.receipt, FailedReceipt)
    assert failed.root.receipt.failure.code == "ProcessExitFailure"
    assert isinstance(cancelled.root, InvestigationFinalizeResult2)
    assert isinstance(cancelled.root.receipt, CancelledReceipt)
    cancelled_receipt = cancelled.root.receipt.model_dump(mode="json", by_alias=True)
    assert cancelled_receipt["snapshotId"] is None


def test_optional_nullable_fields_distinguish_omission_from_null() -> None:
    base: dict[str, Any] = {
        "invocationId": INVOCATION_ID,
        "references": [],
        "remote": "https://example.test/attune.git",
        "revision": "main",
    }
    omitted = RepositoryMaterializeInput.model_validate(base)
    explicit_null = RepositoryMaterializeInput.model_validate(base | {"investigationId": None})

    assert "investigationId" not in omitted.model_dump(by_alias=True, exclude_unset=True)
    assert explicit_null.model_dump(by_alias=True, exclude_unset=True)["investigationId"] is None

    checkpoint: dict[str, Any] = {
        "invocationId": INVOCATION_ID,
        "references": [],
        "investigationId": INVESTIGATION_ID,
        "expectedSnapshot": SNAPSHOT_ID,
        "policy": "commit",
    }
    assert "message" not in RepositoryCheckpointInput.model_validate(checkpoint).model_dump(
        by_alias=True, exclude_unset=True
    )
    explicit_message = RepositoryCheckpointInput.model_validate(checkpoint | {"message": None})
    dumped_message = explicit_message.model_dump(mode="json", by_alias=True, exclude_unset=True)
    assert dumped_message["message"] is None


@pytest.mark.parametrize(
    "summary",
    [
        None,
        42,
        "native Joern output",
        ["method", {"line": 7}],
        {"matches": [{"name": "commitReceipt"}], "complete": True},
    ],
)
def test_joern_summary_accepts_arbitrary_json(summary: Any) -> None:
    result = JoernQueryResult.model_validate(
        {
            "cpgId": DIGEST,
            "snapshotId": SNAPSHOT_ID,
            "summary": summary,
            "receipt": _success_receipt(tool="joern"),
        }
    )

    assert isinstance(result.root, JoernQueryResult1)
    assert result.root.summary == summary


def test_projected_repository_and_artifact_constraints_are_enforced() -> None:
    artifact_uri = (
        f"attune://investigations/{INVESTIGATION_ID}/artifacts/joern/{INVOCATION_ID}/result.json"
    )
    valid: dict[str, Any] = {
        "artifactUri": artifact_uri,
        "destinationPath": ".attune/queries/direct-bypass.cpgql",
        "expectedSnapshot": SNAPSHOT_ID,
        "investigationId": INVESTIGATION_ID,
        "invocationId": INVOCATION_ID,
        "references": [],
    }
    promoted = ArtifactPromoteInput.model_validate(valid)
    assert promoted.artifact_uri == artifact_uri

    invalid_cases: tuple[Mapping[str, Any], ...] = (
        {"artifactUri": "file:///tmp/result.json"},
        {"artifactUri": artifact_uri.rsplit("/", 1)[0] + "/"},
        {"destinationPath": "x" * 4097},
        {"expectedSnapshot": "main"},
        {"investigationId": "I" * 26},
    )
    for invalid in invalid_cases:
        with pytest.raises(ValidationError):
            ArtifactPromoteInput.model_validate(valid | invalid)


def test_representative_pre_acceptance_tool_failure_is_typed() -> None:
    failure = AttuneToolFailure.model_validate(
        {
            "_tag": "AttuneToolFailure",
            "code": "ContractMismatch",
            "message": "live MCP contract does not match the generated client",
            "expected": DIGEST,
            "observed": "d" * 64,
            "path": "attune://contracts",
        }
    )

    assert failure.field_tag == "AttuneToolFailure"
    assert failure.code == "ContractMismatch"
    dumped_failure = failure.model_dump(mode="json", by_alias=True, exclude_unset=True)
    assert dumped_failure["expected"] == DIGEST
