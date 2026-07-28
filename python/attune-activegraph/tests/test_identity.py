from __future__ import annotations

from collections.abc import Mapping

import pytest

from attune_activegraph.identity import derive_invocation_id


def _identity(
    *,
    run_identity: str = "run-2026-07-27",
    event_id: str = "event-17",
    behavior_name: str = "challenge-theory",
    call_site: str = "attune_effect.maude_run",
    frame_id: str | None = "frame-3",
    tool_name: str = "maude_run",
    arguments: Mapping[str, object] = {"b": [2, 3], "a": 1},
) -> str:
    return derive_invocation_id(
        run_identity=run_identity,
        event_id=event_id,
        behavior_name=behavior_name,
        call_site=call_site,
        frame_id=frame_id,
        tool_name=tool_name,
        arguments=arguments,
    )


def test_invocation_identity_is_canonical_and_versioned() -> None:
    first = _identity(arguments={"b": [2, 3], "a": 1})
    second = _identity(arguments={"a": 1, "b": [2, 3]})

    assert first == second
    assert first.startswith("ag1:")
    assert len(first) == 68


def test_invocation_identity_ignores_caller_supplied_invocation_id() -> None:
    first = _identity(arguments={"value": 1, "invocationId": "ignored-one"})
    second = _identity(arguments={"invocation_id": "ignored-two", "value": 1})

    assert first == second


def test_each_identity_dimension_changes_the_result() -> None:
    baseline = _identity()
    variants = {
        _identity(run_identity="other-run"),
        _identity(event_id="other-event"),
        _identity(behavior_name="other-behavior"),
        _identity(call_site="other-call-site"),
        _identity(frame_id="other-frame"),
        _identity(tool_name="other-tool"),
        _identity(arguments={"a": 2}),
    }

    assert baseline not in variants
    assert len(variants) == 7


@pytest.mark.parametrize("run_identity", ["", " ", "\n\t"])
def test_run_identity_must_be_nonempty(run_identity: str) -> None:
    with pytest.raises(ValueError, match="non-empty"):
        _identity(run_identity=run_identity)
