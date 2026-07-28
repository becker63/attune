"""Host-native smoke check for the typed Attune MCP boundary."""

from __future__ import annotations

from activegraph.packs import (  # pyright: ignore[reportMissingTypeStubs]
    clear_discovery_cache,
    discover,
)

from .client import AttuneCallFailure, AttuneMcpClient
from .generated.models import RepositoryCheckpointInput, RepositoryCheckpointResult


def main() -> None:
    clear_discovery_cache()
    discovered = {candidate.name: candidate for candidate in discover()}
    if "attune_effect_tools" not in discovered:
        raise RuntimeError("ActiveGraph did not discover the attune_effect_tools pack")
    request = RepositoryCheckpointInput(
        expected_snapshot="0" * 40,
        investigation_id="0" * 26,
        invocation_id="smoke:unknown-investigation",
        policy="require-clean",
        references=[],
    )
    with AttuneMcpClient.from_environment() as client:
        try:
            client.call(
                "repository_checkpoint",
                request.model_dump(
                    mode="json",
                    by_alias=True,
                    exclude_unset=True,
                ),
                RepositoryCheckpointResult,
            )
        except AttuneCallFailure as failure:
            if failure.failure.code != "UnknownInvestigation":
                raise RuntimeError(
                    f"expected UnknownInvestigation, got {failure.failure.code}"
                ) from failure
        else:
            raise RuntimeError("unknown investigation unexpectedly checkpointed")
        digest = client.observed_digest
    if digest is None:
        raise RuntimeError("contract handshake did not complete")
    print(f"attune-activegraph smoke passed ({digest[:12]})")


if __name__ == "__main__":
    main()
