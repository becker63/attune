"""Typed ActiveGraph tools projected from Attune's Effect contract."""

from __future__ import annotations

import atexit
import os
from collections.abc import Callable, Mapping
from importlib import import_module
from threading import Lock
from typing import Protocol, cast

from activegraph import Tool, ToolContext  # pyright: ignore[reportMissingTypeStubs]
from pydantic import BaseModel, Field, StrictStr

from attune_activegraph.generated.models import (
    ArtifactPromoteInput,
    ArtifactPromoteResult,
    AstGrepRunInput,
    AstGrepRunResult,
    InvestigationFinalizeInput,
    InvestigationFinalizeResult,
    JoernQueryInput,
    JoernQueryResult,
    MaudeRunInput,
    MaudeRunResult,
    PropertyRunInput,
    PropertyRunResult,
    RepositoryCheckpointInput,
    RepositoryCheckpointResult,
    RepositoryMaterializeInput,
    RepositoryMaterializeResult,
)
from attune_activegraph.identity import derive_invocation_id
from attune_activegraph.typed_tool import typed_tool

_INVOCATION_SENTINEL = "activegraph"
_RUN_IDENTITY_ENV = "ATTUNE_ACTIVEGRAPH_RUN_ID"

# Resolve generated forward references in their defining module before
# subclassing; otherwise Pydantic tries to resolve them in this module.
ArtifactPromoteInput.model_rebuild()
AstGrepRunInput.model_rebuild()
InvestigationFinalizeInput.model_rebuild()
JoernQueryInput.model_rebuild()
MaudeRunInput.model_rebuild()
PropertyRunInput.model_rebuild()
RepositoryCheckpointInput.model_rebuild()
RepositoryMaterializeInput.model_rebuild()


class AttuneCaller(Protocol):
    """The structural surface supplied by the persistent MCP client."""

    def call[OutputT: BaseModel](
        self,
        name: str,
        arguments: Mapping[str, object],
        output_model: type[OutputT],
    ) -> OutputT: ...


class _ClosableAttuneCaller(AttuneCaller, Protocol):
    def close(self) -> None: ...


class _ClientFactory(Protocol):
    def from_environment(self) -> _ClosableAttuneCaller: ...


class RepositoryMaterializeArgs(RepositoryMaterializeInput):
    invocation_id: StrictStr = Field(default=_INVOCATION_SENTINEL, alias="invocationId")


class RepositoryCheckpointArgs(RepositoryCheckpointInput):
    invocation_id: StrictStr = Field(default=_INVOCATION_SENTINEL, alias="invocationId")


class JoernQueryArgs(JoernQueryInput):
    invocation_id: StrictStr = Field(default=_INVOCATION_SENTINEL, alias="invocationId")


class MaudeRunArgs(MaudeRunInput):
    invocation_id: StrictStr = Field(default=_INVOCATION_SENTINEL, alias="invocationId")


class PropertyRunArgs(PropertyRunInput):
    invocation_id: StrictStr = Field(default=_INVOCATION_SENTINEL, alias="invocationId")


class AstGrepRunArgs(AstGrepRunInput):
    invocation_id: StrictStr = Field(default=_INVOCATION_SENTINEL, alias="invocationId")


class ArtifactPromoteArgs(ArtifactPromoteInput):
    invocation_id: StrictStr = Field(default=_INVOCATION_SENTINEL, alias="invocationId")


class InvestigationFinalizeArgs(InvestigationFinalizeInput):
    invocation_id: StrictStr = Field(default=_INVOCATION_SENTINEL, alias="invocationId")


class _LazyEnvironmentCaller:
    """Delay MCP startup until ActiveGraph invokes its first Attune tool."""

    def __init__(self) -> None:
        self._caller: AttuneCaller | None = None
        self._lock = Lock()

    def call[OutputT: BaseModel](
        self,
        name: str,
        arguments: Mapping[str, object],
        output_model: type[OutputT],
    ) -> OutputT:
        return self._get().call(name, arguments, output_model)

    def _get(self) -> AttuneCaller:
        if self._caller is not None:
            return self._caller
        with self._lock:
            if self._caller is None:
                module = import_module("attune_activegraph.client")
                factory = cast("_ClientFactory", module.AttuneMcpClient)
                client = factory.from_environment()
                self._caller = client
                atexit.register(client.close)
        return self._caller


def _environment_run_identity() -> str:
    run_identity = os.environ.get(_RUN_IDENTITY_ENV)
    if run_identity is None or not run_identity.strip():
        msg = (
            f"{_RUN_IDENTITY_ENV} must identify the durable ActiveGraph run "
            "before an Attune tool can execute"
        )
        raise RuntimeError(msg)
    return run_identity


def _invoke[OutputT: BaseModel](
    *,
    caller: AttuneCaller,
    run_identity: Callable[[], str],
    tool_name: str,
    call_site: str,
    args: BaseModel,
    ctx: ToolContext,
    output_model: type[OutputT],
) -> OutputT:
    arguments = args.model_dump(mode="json", by_alias=True, exclude_unset=True)
    arguments.pop("invocationId", None)
    frame_id = ctx.frame.id if ctx.frame is not None else None
    arguments["invocationId"] = derive_invocation_id(
        run_identity=run_identity(),
        event_id=ctx.event_id,
        behavior_name=ctx.behavior_name,
        call_site=call_site,
        frame_id=frame_id,
        tool_name=tool_name,
        arguments=arguments,
    )
    return caller.call(tool_name, arguments, output_model)


def make_attune_tools(
    *,
    caller: AttuneCaller | None = None,
    run_identity: str | None = None,
) -> tuple[Tool, ...]:
    """Build the eight contract-typed ActiveGraph tools."""

    resolved_caller = caller if caller is not None else _LazyEnvironmentCaller()
    if run_identity is None:
        resolve_run_identity = _environment_run_identity
    else:
        if not run_identity.strip():
            msg = "ActiveGraph run identity must be a non-empty string"
            raise ValueError(msg)
        stable_run_identity = run_identity

        def resolve_run_identity() -> str:
            return stable_run_identity

    @typed_tool(
        name="repository_materialize",
        description="Create or resume one exact repository-backed investigation.",
        input_model=RepositoryMaterializeArgs,
        output_model=RepositoryMaterializeResult,
        deterministic=False,
    )
    def repository_materialize(
        args: RepositoryMaterializeArgs, ctx: ToolContext
    ) -> RepositoryMaterializeResult:
        return _invoke(
            caller=resolved_caller,
            run_identity=resolve_run_identity,
            tool_name="repository_materialize",
            call_site="attune_effect.repository_materialize",
            args=args,
            ctx=ctx,
            output_model=RepositoryMaterializeResult,
        )

    @typed_tool(
        name="repository_checkpoint",
        description="Checkpoint an investigation at an exact clean Git commit.",
        input_model=RepositoryCheckpointArgs,
        output_model=RepositoryCheckpointResult,
        deterministic=False,
    )
    def repository_checkpoint(
        args: RepositoryCheckpointArgs, ctx: ToolContext
    ) -> RepositoryCheckpointResult:
        return _invoke(
            caller=resolved_caller,
            run_identity=resolve_run_identity,
            tool_name="repository_checkpoint",
            call_site="attune_effect.repository_checkpoint",
            args=args,
            ctx=ctx,
            output_model=RepositoryCheckpointResult,
        )

    @typed_tool(
        name="joern_query",
        description="Run native CPGQL through joern-effect against an exact commit.",
        input_model=JoernQueryArgs,
        output_model=JoernQueryResult,
        deterministic=False,
    )
    def joern_query(args: JoernQueryArgs, ctx: ToolContext) -> JoernQueryResult:
        return _invoke(
            caller=resolved_caller,
            run_identity=resolve_run_identity,
            tool_name="joern_query",
            call_site="attune_effect.joern_query",
            args=args,
            ctx=ctx,
            output_model=JoernQueryResult,
        )

    @typed_tool(
        name="maude_run",
        description="Run exact native Maude source and commands.",
        input_model=MaudeRunArgs,
        output_model=MaudeRunResult,
        deterministic=False,
    )
    def maude_run(args: MaudeRunArgs, ctx: ToolContext) -> MaudeRunResult:
        return _invoke(
            caller=resolved_caller,
            run_identity=resolve_run_identity,
            tool_name="maude_run",
            call_site="attune_effect.maude_run",
            args=args,
            ctx=ctx,
            output_model=MaudeRunResult,
        )

    @typed_tool(
        name="property_run",
        description="Run ordinary TypeScript fast-check and retain minimized failures.",
        input_model=PropertyRunArgs,
        output_model=PropertyRunResult,
        deterministic=False,
    )
    def property_run(args: PropertyRunArgs, ctx: ToolContext) -> PropertyRunResult:
        return _invoke(
            caller=resolved_caller,
            run_identity=resolve_run_identity,
            tool_name="property_run",
            call_site="attune_effect.property_run",
            args=args,
            ctx=ctx,
            output_model=PropertyRunResult,
        )

    @typed_tool(
        name="ast_grep_run",
        description="Test, scan, or apply repository-native ast-grep rules.",
        input_model=AstGrepRunArgs,
        output_model=AstGrepRunResult,
        deterministic=False,
    )
    def ast_grep_run(args: AstGrepRunArgs, ctx: ToolContext) -> AstGrepRunResult:
        return _invoke(
            caller=resolved_caller,
            run_identity=resolve_run_identity,
            tool_name="ast_grep_run",
            call_site="attune_effect.ast_grep_run",
            args=args,
            ctx=ctx,
            output_model=AstGrepRunResult,
        )

    @typed_tool(
        name="artifact_promote",
        description="Copy one retained native artifact into the investigation repository.",
        input_model=ArtifactPromoteArgs,
        output_model=ArtifactPromoteResult,
        deterministic=False,
    )
    def artifact_promote(args: ArtifactPromoteArgs, ctx: ToolContext) -> ArtifactPromoteResult:
        return _invoke(
            caller=resolved_caller,
            run_identity=resolve_run_identity,
            tool_name="artifact_promote",
            call_site="attune_effect.artifact_promote",
            args=args,
            ctx=ctx,
            output_model=ArtifactPromoteResult,
        )

    @typed_tool(
        name="investigation_finalize",
        description="Mechanically finalize one clean investigation.",
        input_model=InvestigationFinalizeArgs,
        output_model=InvestigationFinalizeResult,
        deterministic=False,
    )
    def investigation_finalize(
        args: InvestigationFinalizeArgs, ctx: ToolContext
    ) -> InvestigationFinalizeResult:
        return _invoke(
            caller=resolved_caller,
            run_identity=resolve_run_identity,
            tool_name="investigation_finalize",
            call_site="attune_effect.investigation_finalize",
            args=args,
            ctx=ctx,
            output_model=InvestigationFinalizeResult,
        )

    return (
        repository_materialize,
        repository_checkpoint,
        joern_query,
        maude_run,
        property_run,
        ast_grep_run,
        artifact_promote,
        investigation_finalize,
    )
