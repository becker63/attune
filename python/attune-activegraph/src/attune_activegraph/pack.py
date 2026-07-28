"""Digest-versioned ActiveGraph pack for Attune's Effect tools."""

from __future__ import annotations

from activegraph import Pack  # pyright: ignore[reportMissingTypeStubs]

from attune_activegraph.generated.contract import CONTRACT_SHA256
from attune_activegraph.tools import AttuneCaller, make_attune_tools

PACK_VERSION = f"0.0.0+contract.{CONTRACT_SHA256[:12]}"


def make_pack(
    *,
    caller: AttuneCaller | None = None,
    run_identity: str | None = None,
) -> Pack:
    """Create a semantic-free pack backed by the authoritative MCP service."""

    return Pack(
        name="attune_effect_tools",
        version=PACK_VERSION,
        description="Typed wrappers for Attune's authoritative Effect MCP capabilities.",
        object_types=(),
        relation_types=(),
        behaviors=(),
        tools=make_attune_tools(caller=caller, run_identity=run_identity),
        policies=(),
        prompts=(),
    )


# Construction is intentionally inert: environment and MCP are resolved on first call.
pack = make_pack()
