from __future__ import annotations

import hashlib
import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import pytest
from mcp.types import CallToolResult, ReadResourceResult, TextResourceContents
from pydantic import AnyUrl, BaseModel, ConfigDict

from attune_activegraph.client import (
    AttuneCallFailure,
    AttuneConfigurationError,
    AttuneMcpClient,
    AttuneProtocolError,
    ContractMismatchError,
    McpLaunch,
    McpSession,
)


class _Output(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ok: bool


def _contract_document(contract: object) -> tuple[str, str]:
    encoded = f"{json.dumps(contract, ensure_ascii=False, allow_nan=False, indent=2)}\n"
    return encoded, hashlib.sha256(encoded.encode()).hexdigest()


class _FakeSession:
    def __init__(
        self,
        *,
        contract: object | None = None,
        reported_digest: str | None = None,
        tool_result: CallToolResult | None = None,
    ) -> None:
        self.contract = {"$schema": "test"} if contract is None else contract
        _, digest = _contract_document(self.contract)
        self.reported_digest = digest if reported_digest is None else reported_digest
        self.tool_result = tool_result or CallToolResult(
            content=[],
            structuredContent={"ok": True},
        )
        self.initializations = 0
        self.resource_reads = 0
        self.calls: list[tuple[str, dict[str, Any] | None]] = []

    async def initialize(self) -> object:
        self.initializations += 1
        return object()

    async def read_resource(self, uri: AnyUrl) -> ReadResourceResult:
        self.resource_reads += 1
        document = {
            "sha256": self.reported_digest,
            "contract": self.contract,
        }
        return ReadResourceResult(
            contents=[
                TextResourceContents(
                    uri=uri,
                    mimeType="application/json",
                    text=f"{json.dumps(document, indent=2)}\n",
                )
            ]
        )

    async def call_tool(
        self,
        name: str,
        arguments: dict[str, Any] | None = None,
    ) -> CallToolResult:
        self.calls.append((name, arguments))
        return self.tool_result


class _FakeFactory:
    def __init__(self, session: _FakeSession) -> None:
        self.session = session
        self.entries = 0
        self.exits = 0
        self.launches: list[McpLaunch] = []

    def __call__(self, launch: McpLaunch):
        @asynccontextmanager
        async def opened() -> AsyncGenerator[McpSession]:
            self.launches.append(launch)
            self.entries += 1
            try:
                yield self.session
            finally:
                self.exits += 1

        return opened()


def _client(
    session: _FakeSession,
    *,
    expected_digest: str | None = None,
) -> tuple[AttuneMcpClient, _FakeFactory]:
    _, digest = _contract_document(session.contract)
    factory = _FakeFactory(session)
    return (
        AttuneMcpClient(
            McpLaunch(command="unused"),
            expected_digest=digest if expected_digest is None else expected_digest,
            session_factory=factory,
            startup_timeout_seconds=2,
            cleanup_timeout_seconds=2,
        ),
        factory,
    )


def test_reuses_one_initialized_session_for_multiple_calls() -> None:
    session = _FakeSession()
    client, factory = _client(session)

    with client:
        first = client.call("first", {"value": 1}, _Output)
        second = client.call("second", {"value": 2}, _Output)

    assert first.ok and second.ok
    assert session.initializations == 1
    assert session.resource_reads == 1
    assert [name for name, _ in session.calls] == ["first", "second"]
    assert factory.entries == 1
    assert factory.exits == 1
    assert client.closed


def test_contract_mismatch_stops_before_tool_invocation_and_cleans_up() -> None:
    session = _FakeSession()
    client, factory = _client(session, expected_digest="f" * 64)

    with pytest.raises(ContractMismatchError) as captured:
        client.connect()
    client.close()
    client.close()

    assert captured.value.expected != captured.value.observed
    assert session.calls == []
    assert factory.entries == 1
    assert factory.exits == 1


def test_direct_attune_failure_is_tool_error_and_cleanup_is_idempotent() -> None:
    session = _FakeSession(
        tool_result=CallToolResult(
            content=[],
            structuredContent={
                "_tag": "AttuneToolFailure",
                "code": "UnknownInvestigation",
                "message": "unknown investigation",
            },
        )
    )
    client, factory = _client(session)

    with pytest.raises(AttuneCallFailure) as captured:
        client.call("repository_checkpoint", {}, _Output)
    client.close()
    client.close()

    assert captured.value.reason == "tool.execution_error"
    assert captured.value.failure.code == "UnknownInvestigation"
    assert factory.exits == 1


def test_accepted_terminal_failure_is_returned_to_the_output_model() -> None:
    class _Accepted(BaseModel):
        status: str

    session = _FakeSession(
        tool_result=CallToolResult(
            content=[],
            structuredContent={"status": "failed"},
        )
    )
    client, _ = _client(session)

    with client:
        result = client.call("accepted", {}, _Accepted)

    assert result.status == "failed"


def test_untyped_mcp_error_is_a_protocol_failure() -> None:
    session = _FakeSession(
        tool_result=CallToolResult(
            content=[],
            structuredContent={"message": "broken"},
            isError=True,
        )
    )
    client, _ = _client(session)

    with client, pytest.raises(AttuneProtocolError):
        client.call("broken", {}, _Output)


def test_environment_arguments_are_json_argv_not_shell_text() -> None:
    client = AttuneMcpClient.from_environment(
        {
            "ATTUNE_MCP_COMMAND": "/path with spaces/attune-mcp",
            "ATTUNE_MCP_ARGS": '["--flag", "literal;not-a-shell-command"]',
            "ATTUNE_MCP_CWD": "/tmp/work tree",
        }
    )
    assert not client.closed
    client.close()

    with pytest.raises(AttuneConfigurationError):
        AttuneMcpClient.from_environment({"ATTUNE_MCP_ARGS": "--flag"})
