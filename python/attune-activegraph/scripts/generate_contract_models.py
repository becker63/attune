"""Generate or verify the Pydantic projection of Attune's Effect contract."""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Sequence
from pathlib import Path
from typing import cast

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = PROJECT_ROOT.parents[1]
CONTRACT_PATH = WORKSPACE_ROOT / "contracts" / "attune-tools.schema.json"
DIGEST_PATH = WORKSPACE_ROOT / "contracts" / "attune-tools.sha256"
GENERATED_ROOT = PROJECT_ROOT / "src" / "attune_activegraph" / "generated"
GENERATED_FILES = ("models.py", "contract.py")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")

GENERATOR_OPTIONS = (
    "--input-file-type",
    "jsonschema",
    "--schema-version",
    "2020-12",
    "--schema-version-mode",
    "strict",
    "--strict-refs",
    "--no-allow-remote-refs",
    "--output-model-type",
    "pydantic_v2.BaseModel",
    "--target-python-version",
    "3.12",
    "--target-pydantic-version",
    "2.12",
    "--formatters",
    "ruff-check",
    "ruff-format",
    "--disable-timestamp",
    "--enable-generated-header-marker",
    "--extra-fields",
    "forbid",
    "--strict-types",
    "str",
    "bytes",
    "int",
    "float",
    "bool",
    "--enum-field-as-literal",
    "all",
    "--use-annotated",
    "--use-standard-collections",
    "--use-union-operator",
    "--use-generic-base-class",
    "--use-missing-sentinel",
    "--snake-case-field",
    "--allow-population-by-field-name",
    "--use-title-as-name",
    "--use-schema-description",
    "--use-field-description",
    "--use-default-kwarg",
    "--keep-model-order",
    "--reuse-model",
    "--collapse-reuse-models",
    "--naming-strategy",
    "primary-first",
    "--infer-union-variant-names",
    "--skip-root-model",
)


def _contract_digest() -> str:
    try:
        contract_bytes = CONTRACT_PATH.read_bytes()
        expected_digest = DIGEST_PATH.read_text(encoding="utf-8").strip()
    except FileNotFoundError as error:
        raise SystemExit(f"missing contract artifact: {error.filename}") from error

    if SHA256_PATTERN.fullmatch(expected_digest) is None:
        raise SystemExit(f"{DIGEST_PATH} must contain one lowercase SHA-256 digest")

    observed_digest = hashlib.sha256(contract_bytes).hexdigest()
    if observed_digest != expected_digest:
        raise SystemExit(
            "contract digest mismatch: "
            f"{DIGEST_PATH} contains {expected_digest}, computed {observed_digest}"
        )

    try:
        document = cast(object, json.loads(contract_bytes))
    except json.JSONDecodeError as error:
        raise SystemExit(f"{CONTRACT_PATH} is not valid JSON: {error}") from error

    if not isinstance(document, dict):
        raise SystemExit(f"{CONTRACT_PATH} must contain a JSON object")
    if document.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        raise SystemExit(f"{CONTRACT_PATH} is not a Draft 2020-12 compound schema")
    if not isinstance(document.get("$defs"), dict):
        raise SystemExit(f"{CONTRACT_PATH} must install definitions beneath $defs")
    if not isinstance(document.get("x-attune"), dict):
        raise SystemExit(f"{CONTRACT_PATH} must contain the x-attune capability mapping")

    return observed_digest


def _write_contract_module(destination: Path, digest: str) -> None:
    destination.write_text(
        "\n".join(
            (
                '"""Generated Attune contract identity. Do not edit."""',
                "",
                "from typing import Final",
                "",
                f'CONTRACT_SHA256: Final = "{digest}"',
                'CONTRACT_RESOURCE_URI: Final = "attune://contracts"',
                "",
            )
        ),
        encoding="utf-8",
    )


def _generate(destination: Path) -> None:
    digest = _contract_digest()
    destination.mkdir(parents=True, exist_ok=True)
    models_path = destination / "models.py"
    command = (
        sys.executable,
        "-m",
        "datamodel_code_generator",
        "--input",
        str(CONTRACT_PATH),
        "--output",
        str(models_path),
        *GENERATOR_OPTIONS,
    )
    subprocess.run(command, cwd=PROJECT_ROOT, check=True)
    _write_contract_module(destination / "contract.py", digest)


def _unified_diff(expected: Path, observed: Path) -> str:
    expected_lines = expected.read_text(encoding="utf-8").splitlines(keepends=True)
    observed_lines = observed.read_text(encoding="utf-8").splitlines(keepends=True)
    return "".join(
        difflib.unified_diff(
            expected_lines,
            observed_lines,
            fromfile=str(expected),
            tofile=f"fresh/{observed.name}",
        )
    )


def _check(fresh_root: Path) -> None:
    failures: list[str] = []
    for name in GENERATED_FILES:
        expected = GENERATED_ROOT / name
        observed = fresh_root / name
        if not expected.is_file():
            failures.append(f"missing generated file: {expected}")
            continue
        if expected.read_bytes() != observed.read_bytes():
            failures.append(_unified_diff(expected, observed))

    if failures:
        details = "\n".join(failures)
        raise SystemExit(
            f"generated contract projection is stale:\n{details}\n"
            "run: uv run python scripts/generate_contract_models.py generate"
        )


def _publish(fresh_root: Path) -> None:
    GENERATED_ROOT.mkdir(parents=True, exist_ok=True)
    for name in GENERATED_FILES:
        source = fresh_root / name
        temporary = GENERATED_ROOT / f".{name}.tmp"
        shutil.copyfile(source, temporary)
        os.replace(temporary, GENERATED_ROOT / name)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("generate", "check"))
    command = cast(str, parser.parse_args(argv).command)

    with tempfile.TemporaryDirectory(prefix="attune-contract-models-") as temporary:
        fresh_root = Path(temporary)
        _generate(fresh_root)
        if command == "check":
            _check(fresh_root)
        else:
            _publish(fresh_root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
