"""Synchronous, typed access to one persistent Attune MCP stdio session."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import threading
from collections.abc import AsyncGenerator, Callable, Mapping
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol, TypeVar, cast

from activegraph import ToolError  # pyright: ignore[reportMissingTypeStubs]
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.types import CallToolResult, ReadResourceResult, TextContent, TextResourceContents
from pydantic import AnyUrl, BaseModel, ValidationError

from .generated.contract import CONTRACT_RESOURCE_URI, CONTRACT_SHA256
from .generated.models import AttuneToolFailure


class AttuneClientError(Exception):
    """Base class for failures produced by the Python capability bridge."""


class AttuneConfigurationError(AttuneClientError):
    """The local MCP launch configuration is invalid."""


class AttuneTransportError(AttuneClientError):
    """The stdio process or MCP session failed before returning typed data."""


class AttuneProtocolError(AttuneClientError):
    """The server returned data that does not satisfy the frozen contract."""


class ContractMismatchError(AttuneClientError):
    """The live server contract differs from this generated client."""

    def __init__(
        self,
        expected: str,
        observed: str,
        *,
        server_reported: str | None = None,
    ) -> None:
        self.expected = expected
        self.observed = observed
        self.server_reported = server_reported
        detail = (
            ""
            if server_reported is None or server_reported == observed
            else f" (server reported {server_reported})"
        )
        super().__init__(
            f"Attune contract mismatch: expected {expected}, observed {observed}{detail}"
        )


class AttuneCallFailure(ToolError, AttuneClientError):
    """An Effect-produced pre-acceptance failure, compatible with ActiveGraph."""

    def __init__(self, failure: AttuneToolFailure) -> None:
        self.failure = failure
        super().__init__(
            "tool.execution_error",
            f"{failure.code}: {failure.message}",
            payload_extras={
                "attune_failure": failure.model_dump(
                    mode="json",
                    by_alias=True,
                    exclude_unset=True,
                )
            },
        )


@dataclass(frozen=True)
class McpLaunch:
    """An argv-based stdio launch description; no shell is involved."""

    command: str
    args: tuple[str, ...] = ()
    cwd: Path | None = None
    environment: Mapping[str, str] | None = None


class McpSession(Protocol):
    """The small ClientSession surface used by the bridge and its tests."""

    async def initialize(self) -> object: ...

    async def read_resource(self, uri: AnyUrl) -> ReadResourceResult: ...

    async def call_tool(
        self,
        name: str,
        arguments: dict[str, Any] | None = None,
    ) -> CallToolResult: ...


SessionFactory = Callable[[McpLaunch], AbstractAsyncContextManager[McpSession]]
ModelT = TypeVar("ModelT", bound=BaseModel)


@asynccontextmanager
async def _stdio_session(launch: McpLaunch) -> AsyncGenerator[McpSession]:
    parameters = StdioServerParameters(
        command=launch.command,
        args=list(launch.args),
        cwd=launch.cwd,
        env=None if launch.environment is None else dict(launch.environment),
    )
    async with stdio_client(parameters) as streams:
        read_stream, write_stream = streams
        async with ClientSession(read_stream, write_stream) as session:
            # ClientSession has a wider call_tool signature than the protocol.
            yield cast(McpSession, session)


def _canonical_contract_bytes(contract: object) -> bytes:
    try:
        encoded = json.dumps(
            contract,
            ensure_ascii=False,
            allow_nan=False,
            indent=2,
        )
    except (TypeError, ValueError) as cause:
        raise AttuneProtocolError("contract resource contains non-JSON data") from cause
    return f"{encoded}\n".encode()


def _parse_arguments(raw: str) -> tuple[str, ...]:
    try:
        decoded = cast(object, json.loads(raw))
    except json.JSONDecodeError as cause:
        raise AttuneConfigurationError("ATTUNE_MCP_ARGS must be a JSON array") from cause
    if not isinstance(decoded, list):
        raise AttuneConfigurationError("ATTUNE_MCP_ARGS must be a JSON array of strings")
    items = cast(list[object], decoded)
    if not all(isinstance(item, str) for item in items):
        raise AttuneConfigurationError("ATTUNE_MCP_ARGS must be a JSON array of strings")
    arguments = tuple(cast(str, item) for item in items)
    if any("\0" in item for item in arguments):
        raise AttuneConfigurationError("ATTUNE_MCP_ARGS cannot contain NUL bytes")
    return arguments


class AttuneMcpClient:
    """Own one lazy MCP child/session behind a synchronous generic call API."""

    def __init__(
        self,
        launch: McpLaunch,
        *,
        expected_digest: str = CONTRACT_SHA256,
        session_factory: SessionFactory = _stdio_session,
        startup_timeout_seconds: float = 30.0,
        cleanup_timeout_seconds: float = 10.0,
    ) -> None:
        if not launch.command or "\0" in launch.command:
            raise AttuneConfigurationError("MCP command must be a non-empty executable name")
        if startup_timeout_seconds <= 0 or cleanup_timeout_seconds <= 0:
            raise AttuneConfigurationError("client timeouts must be positive")
        self._launch = launch
        self._expected_digest = expected_digest
        self._session_factory = session_factory
        self._startup_timeout_seconds = startup_timeout_seconds
        self._cleanup_timeout_seconds = cleanup_timeout_seconds

        self._state_lock = threading.RLock()
        self._ready = threading.Event()
        self._thread: threading.Thread | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._serve_task: asyncio.Task[None] | None = None
        self._stop_event: asyncio.Event | None = None
        self._session: McpSession | None = None
        self._thread_error: BaseException | None = None
        self._observed_digest: str | None = None
        self._closed = False

    @classmethod
    def from_environment(
        cls,
        environment: Mapping[str, str] | None = None,
        *,
        expected_digest: str = CONTRACT_SHA256,
        session_factory: SessionFactory = _stdio_session,
        startup_timeout_seconds: float = 30.0,
        cleanup_timeout_seconds: float = 10.0,
    ) -> AttuneMcpClient:
        """Build an argv-only launch from environment variables."""

        values = os.environ if environment is None else environment
        command = values.get("ATTUNE_MCP_COMMAND", "attune-mcp").strip()
        args = _parse_arguments(values.get("ATTUNE_MCP_ARGS", "[]"))
        raw_cwd = values.get("ATTUNE_MCP_CWD")
        if "\0" in command or (raw_cwd is not None and "\0" in raw_cwd):
            raise AttuneConfigurationError("MCP launch values cannot contain NUL bytes")
        cwd = None if raw_cwd is None or not raw_cwd.strip() else Path(raw_cwd).expanduser()
        return cls(
            McpLaunch(command=command, args=args, cwd=cwd),
            expected_digest=expected_digest,
            session_factory=session_factory,
            startup_timeout_seconds=startup_timeout_seconds,
            cleanup_timeout_seconds=cleanup_timeout_seconds,
        )

    @property
    def observed_digest(self) -> str | None:
        """The verified live digest, or ``None`` before the first connection."""

        with self._state_lock:
            return self._observed_digest

    @property
    def closed(self) -> bool:
        with self._state_lock:
            return self._closed

    def __enter__(self) -> AttuneMcpClient:
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def connect(self) -> None:
        """Initialize the lazy session and complete the contract handshake."""

        self._active_session()

    def call(
        self,
        name: str,
        arguments: Mapping[str, object],
        output_model: type[ModelT],
    ) -> ModelT:
        """Call one frozen MCP tool and validate its structured result."""

        session, loop = self._active_session()
        try:
            future = asyncio.run_coroutine_threadsafe(
                self._call_async(session, name, dict(arguments), output_model),
                loop,
            )
            return future.result()
        except (AttuneCallFailure, AttuneProtocolError, ContractMismatchError):
            raise
        except BaseException as cause:
            raise AttuneTransportError(f"MCP call {name!r} failed") from cause

    def close(self) -> None:
        """Close the session and owned child once, waiting for cleanup."""

        with self._state_lock:
            if self._closed:
                return
            self._closed = True
            loop = self._loop
            stop_event = self._stop_event
            serve_task = self._serve_task
            thread = self._thread

        if loop is not None and loop.is_running():
            if stop_event is not None:
                loop.call_soon_threadsafe(stop_event.set)
            elif serve_task is not None:
                loop.call_soon_threadsafe(serve_task.cancel)

        if thread is not None and thread is not threading.current_thread():
            thread.join(self._cleanup_timeout_seconds)
            if thread.is_alive():
                raise AttuneTransportError("timed out closing the MCP session")

    def _active_session(self) -> tuple[McpSession, asyncio.AbstractEventLoop]:
        with self._state_lock:
            if self._closed:
                raise AttuneTransportError("Attune MCP client is closed")
            if self._thread is None:
                self._ready.clear()
                self._thread = threading.Thread(
                    target=self._thread_main,
                    name="attune-mcp-client",
                    daemon=True,
                )
                self._thread.start()
            ready = self._ready

        if not ready.wait(self._startup_timeout_seconds):
            self.close()
            raise AttuneTransportError("timed out initializing the Attune MCP session")

        with self._state_lock:
            cause = self._thread_error
            session = self._session
            loop = self._loop
        if cause is not None:
            if isinstance(cause, AttuneClientError):
                raise cause
            raise AttuneTransportError("failed to initialize the Attune MCP session") from cause
        if session is None or loop is None or not loop.is_running():
            raise AttuneTransportError("Attune MCP session stopped during initialization")
        return session, loop

    def _thread_main(self) -> None:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        task = loop.create_task(self._serve())
        with self._state_lock:
            self._loop = loop
            self._serve_task = task
        try:
            loop.run_until_complete(task)
        except asyncio.CancelledError:
            pass
        finally:
            with self._state_lock:
                self._session = None
                self._stop_event = None
                self._serve_task = None
            self._ready.set()
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.close()

    async def _serve(self) -> None:
        try:
            async with self._session_factory(self._launch) as session:
                await session.initialize()
                digest = await self._verify_contract(session)
                stop_event = asyncio.Event()
                with self._state_lock:
                    if self._closed:
                        return
                    self._session = session
                    self._stop_event = stop_event
                    self._observed_digest = digest
                self._ready.set()
                await stop_event.wait()
        except asyncio.CancelledError:
            if not self._closed:
                with self._state_lock:
                    self._thread_error = AttuneTransportError(
                        "MCP session was cancelled during startup"
                    )
            raise
        except BaseException as cause:
            with self._state_lock:
                if not self._closed:
                    self._thread_error = cause
        finally:
            self._ready.set()

    async def _verify_contract(self, session: McpSession) -> str:
        try:
            result = await session.read_resource(AnyUrl(CONTRACT_RESOURCE_URI))
        except BaseException as cause:
            raise AttuneTransportError("could not read attune://contracts") from cause
        if len(result.contents) != 1 or not isinstance(result.contents[0], TextResourceContents):
            raise AttuneProtocolError("contract resource must contain exactly one text document")
        try:
            decoded = cast(object, json.loads(result.contents[0].text))
        except json.JSONDecodeError as cause:
            raise AttuneProtocolError("contract resource is not valid JSON") from cause
        if not isinstance(decoded, dict):
            raise AttuneProtocolError("contract resource must be a JSON object")
        document = cast(dict[str, object], decoded)
        reported = document.get("sha256")
        if not isinstance(reported, str) or len(reported) != 64:
            raise AttuneProtocolError("contract resource has no valid sha256")
        contract = document.get("contract")
        computed = hashlib.sha256(_canonical_contract_bytes(contract)).hexdigest()
        if computed != reported:
            raise ContractMismatchError(
                self._expected_digest,
                computed,
                server_reported=reported,
            )
        if reported != self._expected_digest:
            raise ContractMismatchError(self._expected_digest, reported)
        return reported

    async def _call_async(
        self,
        session: McpSession,
        name: str,
        arguments: dict[str, object],
        output_model: type[ModelT],
    ) -> ModelT:
        result = await session.call_tool(name, cast(dict[str, Any], arguments))
        payload = self._structured_payload(result, name)
        payload_object = cast(dict[str, object], payload) if isinstance(payload, dict) else None
        if payload_object is not None and payload_object.get("_tag") == "AttuneToolFailure":
            try:
                failure = AttuneToolFailure.model_validate(payload_object)
            except ValidationError as cause:
                raise AttuneProtocolError(
                    f"MCP tool {name!r} returned an invalid typed failure"
                ) from cause
            raise AttuneCallFailure(failure)
        if result.isError:
            raise AttuneProtocolError(
                f"MCP tool {name!r} returned an untyped protocol error: {payload!r}"
            )
        try:
            return output_model.model_validate(payload)
        except ValidationError as cause:
            raise AttuneProtocolError(
                f"MCP tool {name!r} returned data outside its generated result schema"
            ) from cause

    @staticmethod
    def _structured_payload(result: CallToolResult, name: str) -> object:
        if result.structuredContent is not None:
            return result.structuredContent
        text = [part.text for part in result.content if isinstance(part, TextContent)]
        if len(text) != 1:
            raise AttuneProtocolError(
                f"MCP tool {name!r} returned no unique structured JSON payload"
            )
        try:
            return json.loads(text[0])
        except json.JSONDecodeError as cause:
            raise AttuneProtocolError(f"MCP tool {name!r} returned invalid JSON text") from cause
