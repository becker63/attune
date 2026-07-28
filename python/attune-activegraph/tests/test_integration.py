from __future__ import annotations

import os
from pathlib import Path

import pytest

from attune_activegraph.client import AttuneCallFailure, AttuneMcpClient, McpLaunch
from attune_activegraph.generated.models import (
    RepositoryCheckpointInput,
    RepositoryCheckpointResult,
)


@pytest.mark.skipif(
    os.environ.get("ATTUNE_RUN_INTEGRATION") != "1",
    reason="set ATTUNE_RUN_INTEGRATION=1 to run the host-native MCP check",
)
def test_real_stdio_contract_handshake_and_unknown_investigation(tmp_path: Path) -> None:
    repository = Path(__file__).resolve().parents[3]
    server = repository / "packages/attune-mcp/dist/main.mjs"
    assert server.is_file(), "build packages/attune-mcp before the integration check"
    environment = dict(os.environ)
    environment.update(
        {
            "ATTUNE_HOME": str(tmp_path / "runtime"),
            "ATTUNE_CONTRACT_BUNDLE": str(repository / "contracts/attune-tools.schema.json"),
            "ATTUNE_CONTRACT_DIGEST": str(repository / "contracts/attune-tools.sha256"),
        }
    )
    request = RepositoryCheckpointInput(
        expected_snapshot="0" * 40,
        investigation_id="0" * 26,
        invocation_id="integration:unknown-investigation",
        policy="require-clean",
        references=[],
    )

    with (
        AttuneMcpClient(
            McpLaunch(
                command="node",
                args=(str(server),),
                cwd=repository,
                environment=environment,
            )
        ) as client,
        pytest.raises(AttuneCallFailure) as captured,
    ):
        client.call(
            "repository_checkpoint",
            request.model_dump(
                mode="json",
                by_alias=True,
                exclude_unset=True,
            ),
            RepositoryCheckpointResult,
        )

    assert captured.value.failure.code == "UnknownInvestigation"
    assert client.observed_digest is not None
