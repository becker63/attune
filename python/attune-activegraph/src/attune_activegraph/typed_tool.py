"""The single typed boundary around ActiveGraph's non-generic Tool API."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, cast

from activegraph import Tool, ToolContext  # pyright: ignore[reportMissingTypeStubs]
from activegraph.packs import tool as activegraph_tool  # pyright: ignore[reportMissingTypeStubs]
from pydantic import BaseModel

type TypedToolBody[InputT: BaseModel, OutputT: BaseModel] = Callable[[InputT, ToolContext], OutputT]


def typed_tool[InputT: BaseModel, OutputT: BaseModel](
    *,
    name: str,
    description: str,
    input_model: type[InputT],
    output_model: type[OutputT],
    deterministic: bool = False,
) -> Callable[[TypedToolBody[InputT, OutputT]], Tool]:
    """Adapt a typed Pydantic callable to ActiveGraph's runtime Tool."""

    decorate = activegraph_tool(
        name=name,
        description=description,
        input_schema=input_model,
        output_schema=output_model,
        deterministic=deterministic,
        export_globally=False,
    )

    def register(body: TypedToolBody[InputT, OutputT]) -> Tool:
        untyped = cast("Callable[..., Any]", body)
        return decorate(untyped)

    return register
