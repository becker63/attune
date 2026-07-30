"""The common, intentionally treatment-free workspace capability profile."""

from __future__ import annotations

import subprocess
from collections.abc import Iterable
from pathlib import Path

from activegraph import Tool, ToolContext  # pyright: ignore[reportMissingTypeStubs]
from pydantic import Field

from attune_activegraph.typed_tool import typed_tool

from .model import InterpretationLedger, LedgerReference, Model, digest

_DENIED = frozenset(
    {
        "attune-mcp",
        "joern",
        "maude",
        "ast-grep",
        "sg",
        "fast-check",
        "nix",
        "nix-shell",
        "nix develop",
    }
)
_ALLOWED = frozenset({"git", "rg", "pytest", "pnpm", "uv", "node", "npm"})


class WorkspacePolicyError(ValueError):
    """A conventional command attempted to reconstruct treatment access."""


class ReadArgs(Model):
    path: str


class WriteArgs(Model):
    path: str
    content: str


class SearchArgs(Model):
    query: str
    glob: str = "*"


class CommandArgs(Model):
    argv: tuple[str, ...] = Field(min_length=1)


class TextResult(Model):
    text: str


class PathsResult(Model):
    paths: tuple[str, ...]


class CommandResult(Model):
    exit_code: int
    stdout: str
    stderr: str


def _path(root: Path, relative: str) -> Path:
    candidate = (root / relative).resolve()
    if candidate != root and root not in candidate.parents:
        raise WorkspacePolicyError(f"workspace path escapes root: {relative}")
    return candidate


def conventional_command_allowed(argv: Iterable[str]) -> None:
    """Reject native-tool, Nix, and shell escapes before process launch."""

    words = tuple(argv)
    if not words:
        raise WorkspacePolicyError("command must not be empty")
    joined = " ".join(words).lower()
    if any(blocked in joined for blocked in _DENIED):
        raise WorkspacePolicyError("conventional profile cannot access Attune-native tooling")
    if any(token in {"sh", "bash", "zsh", "fish", "env", "which", "command"} for token in words):
        raise WorkspacePolicyError("raw shell and discovery commands are not available")
    if words[0] not in _ALLOWED:
        raise WorkspacePolicyError(f"command is not allowlisted: {words[0]}")


def common_tool_digest() -> str:
    """Pin the audited capability surface in trial configuration."""

    return digest(
        {
            "commands": sorted(_ALLOWED),
            "record_interpretation": {
                "input": InterpretationLedger.model_json_schema(),
                "output": LedgerReference.model_json_schema(),
            },
        }
    )


def make_workspace_tools(root: Path) -> tuple[Tool, ...]:
    """Create ordinary coding-agent tools rooted in one isolated checkout."""

    root = root.resolve()

    @typed_tool(
        name="workspace_read",
        description="Read a UTF-8 file inside the isolated workspace.",
        input_model=ReadArgs,
        output_model=TextResult,
        deterministic=True,
    )
    def read(args: ReadArgs, _ctx: ToolContext) -> TextResult:
        return TextResult(text=_path(root, args.path).read_text())

    @typed_tool(
        name="workspace_list",
        description="List files beneath the isolated workspace.",
        input_model=ReadArgs,
        output_model=PathsResult,
        deterministic=True,
    )
    def list_paths(args: ReadArgs, _ctx: ToolContext) -> PathsResult:
        directory = _path(root, args.path)
        return PathsResult(
            paths=tuple(sorted(str(path.relative_to(root)) for path in directory.rglob("*")))
        )

    @typed_tool(
        name="workspace_search",
        description="Search workspace text without treatment-native binaries.",
        input_model=SearchArgs,
        output_model=PathsResult,
        deterministic=True,
    )
    def search(args: SearchArgs, _ctx: ToolContext) -> PathsResult:
        matches = (
            str(path.relative_to(root))
            for path in root.glob(args.glob)
            if path.is_file() and args.query in path.read_text(errors="replace")
        )
        return PathsResult(paths=tuple(sorted(matches)))

    @typed_tool(
        name="workspace_write",
        description="Write a UTF-8 file inside the isolated workspace.",
        input_model=WriteArgs,
        output_model=TextResult,
    )
    def write(args: WriteArgs, _ctx: ToolContext) -> TextResult:
        target = _path(root, args.path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(args.content)
        return TextResult(text=str(target.relative_to(root)))

    @typed_tool(
        name="workspace_command",
        description="Run an audited conventional repository command.",
        input_model=CommandArgs,
        output_model=CommandResult,
    )
    def command(args: CommandArgs, _ctx: ToolContext) -> CommandResult:
        conventional_command_allowed(args.argv)
        completed = subprocess.run(
            args.argv,
            cwd=root,
            capture_output=True,
            check=False,
            text=True,
            timeout=60,
        )
        return CommandResult(
            exit_code=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
        )

    return read, list_paths, search, write, command
