"""Stable ActiveGraph-to-Attune invocation identities."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping

from attune_activegraph.generated.contract import CONTRACT_SHA256

_INVOCATION_VERSION = "ag1"
_INVOCATION_FIELDS = frozenset({"invocationId", "invocation_id"})


def _require_run_identity(run_identity: str) -> str:
    if not run_identity.strip():
        msg = "ActiveGraph run identity must be a non-empty string"
        raise ValueError(msg)
    return run_identity


def derive_invocation_id(
    *,
    run_identity: str,
    event_id: str,
    behavior_name: str,
    call_site: str,
    frame_id: str | None,
    tool_name: str,
    arguments: Mapping[str, object],
) -> str:
    """Derive the idempotency key for one durable ActiveGraph tool call.

    ActiveGraph's transient ``ToolContext.idempotency_key`` is deliberately
    excluded. The identity is instead tied to an explicit durable run
    identity, graph/event context, the exact Effect contract, and canonical
    tool arguments.
    """

    stable_arguments = {
        key: value for key, value in arguments.items() if key not in _INVOCATION_FIELDS
    }
    identity_record = {
        "arguments": stable_arguments,
        "behaviorName": behavior_name,
        "callSite": call_site,
        "contractSha256": CONTRACT_SHA256,
        "eventId": event_id,
        "frameId": frame_id,
        "runIdentity": _require_run_identity(run_identity),
        "toolName": tool_name,
        "version": _INVOCATION_VERSION,
    }
    canonical = json.dumps(
        identity_record,
        allow_nan=False,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    return f"{_INVOCATION_VERSION}:{hashlib.sha256(canonical).hexdigest()}"
