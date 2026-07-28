from __future__ import annotations

import logging
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import cast

import pytest
from activegraph import (  # pyright: ignore[reportMissingTypeStubs]
    Frame,
    Tool,
    ToolContext,
)
from activegraph.packs import (  # pyright: ignore[reportMissingTypeStubs]
    clear_discovery_cache,
    discover,
)
from pydantic import BaseModel

from attune_activegraph.generated.models import (
    ArtifactPromoteResult,
    AstGrepRunResult,
    InvestigationFinalizeResult,
    JoernQueryResult,
    MaudeRunResult,
    PropertyRunResult,
    RepositoryCheckpointResult,
    RepositoryMaterializeResult,
)
from attune_activegraph.pack import PACK_VERSION, make_pack, pack
from attune_activegraph.tools import (
    ArtifactPromoteArgs,
    AstGrepRunArgs,
    InvestigationFinalizeArgs,
    JoernQueryArgs,
    MaudeRunArgs,
    PropertyRunArgs,
    RepositoryCheckpointArgs,
    RepositoryMaterializeArgs,
    make_attune_tools,
)

_INVESTIGATION_ID = "01K00000000000000000000000"
_SNAPSHOT = "a" * 40


@dataclass(frozen=True)
class _Call:
    name: str
    arguments: Mapping[str, object]
    output_model: str


class _FakeCaller:
    def __init__(self) -> None:
        self.calls: list[_Call] = []

    def call[OutputT: BaseModel](
        self,
        name: str,
        arguments: Mapping[str, object],
        output_model: type[OutputT],
    ) -> OutputT:
        self.calls.append(
            _Call(
                name=name,
                arguments=dict(arguments),
                output_model=output_model.__name__,
            )
        )
        return output_model.model_construct(root={"fake": True})


def _context() -> ToolContext:
    return ToolContext(
        behavior_name="collect-evidence",
        event_id="event-4",
        frame=Frame(goal="investigate", id="frame-2"),
        idempotency_key="transient-activegraph-key",
        timeout_seconds=30,
        logger=logging.getLogger("test"),
        external_io_mode="runtime_recorded",
    )


_CASES: tuple[tuple[type[BaseModel], type[BaseModel], dict[str, object]], ...] = (
    (
        RepositoryMaterializeArgs,
        RepositoryMaterializeResult,
        {"remote": "/fixture/repo", "revision": "main", "references": []},
    ),
    (
        RepositoryCheckpointArgs,
        RepositoryCheckpointResult,
        {
            "expectedSnapshot": _SNAPSHOT,
            "investigationId": _INVESTIGATION_ID,
            "policy": "require-clean",
            "references": [],
        },
    ),
    (
        JoernQueryArgs,
        JoernQueryResult,
        {
            "cpgql": "cpg.method.name.l",
            "expectedSnapshot": _SNAPSHOT,
            "frontend": "auto",
            "importOptions": {"schemaVersion": 1},
            "investigationId": _INVESTIGATION_ID,
            "outputFormat": "json",
            "references": [],
            "timeoutMilliseconds": 1_000,
        },
    ),
    (
        MaudeRunArgs,
        MaudeRunResult,
        {
            "commands": "reduce in TEST : value .",
            "expectedSnapshot": _SNAPSHOT,
            "investigationId": _INVESTIGATION_ID,
            "moduleSource": "mod TEST is endm",
            "references": [],
            "timeoutMilliseconds": 1_000,
        },
    ),
    (
        PropertyRunArgs,
        PropertyRunResult,
        {
            "expectedSnapshot": _SNAPSHOT,
            "investigationId": _INVESTIGATION_ID,
            "parameters": {"numRuns": 10, "timeoutMilliseconds": 1_000},
            "propertySource": "export default defineProperty({})",
            "references": [],
        },
    ),
    (
        AstGrepRunArgs,
        AstGrepRunResult,
        {
            "configPath": "sgconfig.yml",
            "expectedSnapshot": _SNAPSHOT,
            "investigationId": _INVESTIGATION_ID,
            "mode": "scan",
            "references": [],
            "rulePaths": ["rules/example.yml"],
            "timeoutMilliseconds": 1_000,
        },
    ),
    (
        ArtifactPromoteArgs,
        ArtifactPromoteResult,
        {
            "artifactUri": (
                f"attune://investigations/{_INVESTIGATION_ID}/artifacts/joern/run-1/result.json"
            ),
            "destinationPath": ".attune/evidence/result.json",
            "expectedSnapshot": _SNAPSHOT,
            "investigationId": _INVESTIGATION_ID,
            "references": [],
        },
    ),
    (
        InvestigationFinalizeArgs,
        InvestigationFinalizeResult,
        {
            "expectedSnapshot": _SNAPSHOT,
            "investigationId": _INVESTIGATION_ID,
            "references": [],
        },
    ),
)


def test_pack_is_digest_versioned_and_semantically_empty() -> None:
    assert pack.version == PACK_VERSION
    assert "+contract." in pack.version
    assert pack.object_types == ()
    assert pack.relation_types == ()
    assert pack.behaviors == ()
    assert pack.prompts == ()
    assert pack.policies == ()
    assert len(pack.tools) == 8


def test_pack_is_discoverable_from_installed_metadata() -> None:
    clear_discovery_cache()
    discovered = {candidate.name: candidate for candidate in discover()}

    assert discovered["attune_effect_tools"].pack == pack


def test_tools_are_concrete_nondeterministic_contract_wrappers() -> None:
    caller = _FakeCaller()
    tools = make_attune_tools(caller=caller, run_identity="durable-run-9")

    assert [tool.name for tool in tools] == [
        "repository_materialize",
        "repository_checkpoint",
        "joern_query",
        "maude_run",
        "property_run",
        "ast_grep_run",
        "artifact_promote",
        "investigation_finalize",
    ]
    assert all(tool.deterministic is False for tool in tools)

    for tool, (input_model, output_model, payload) in zip(tools, _CASES, strict=True):
        assert tool.input_schema is input_model
        output_schema = tool.output_schema
        assert output_schema is output_model
        args = input_model.model_validate(payload)
        body = cast("Callable[[BaseModel, ToolContext], BaseModel]", tool.fn)
        result = body(args, _context())
        assert isinstance(result, output_schema)


def test_wrapper_overwrites_invocation_id_and_calls_typed_client() -> None:
    caller = _FakeCaller()
    tool = make_attune_tools(caller=caller, run_identity="durable-run-9")[0]
    args = RepositoryMaterializeArgs(
        remote="/fixture/repo",
        revision="main",
        references=[],
        invocationId="caller-value-is-ignored",
    )
    body = cast("Callable[[RepositoryMaterializeArgs, ToolContext], BaseModel]", tool.fn)
    result = body(args, _context())

    output_schema = tool.output_schema
    assert output_schema is not None
    assert isinstance(result, output_schema)
    assert len(caller.calls) == 1
    call = caller.calls[0]
    assert call.name == "repository_materialize"
    invocation_id = call.arguments["invocationId"]
    assert isinstance(invocation_id, str)
    assert invocation_id.startswith("ag1:")
    assert invocation_id != "caller-value-is-ignored"


def test_factory_rejects_empty_explicit_run_identity() -> None:
    with pytest.raises(ValueError, match="non-empty"):
        make_pack(caller=_FakeCaller(), run_identity=" ")


def test_default_pack_defers_missing_environment_failure_until_invocation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("ATTUNE_ACTIVEGRAPH_RUN_ID", raising=False)
    tool = cast("Tool", pack.tools[0])
    args = RepositoryMaterializeArgs(
        remote="/fixture/repo",
        revision="main",
        references=[],
    )

    with pytest.raises(RuntimeError, match="ATTUNE_ACTIVEGRAPH_RUN_ID"):
        tool.fn(args, _context())
