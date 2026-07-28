"""Generate or verify the closed docs schema projection from Pydantic."""

from __future__ import annotations

import argparse
from pathlib import Path

from attune_activegraph.research.report import schema_documents, schema_drift


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("generate", "check"))
    parser.add_argument(
        "--schema-root",
        type=Path,
        default=Path(__file__).parents[3] / "packages/attune-docs/schema",
    )
    args = parser.parse_args()
    if args.mode == "check":
        drift = schema_drift(args.schema_root)
        if drift:
            raise SystemExit("research schema drift: " + ", ".join(drift))
        return
    args.schema_root.mkdir(parents=True, exist_ok=True)
    import json

    for name, schema in schema_documents().items():
        (args.schema_root / name).write_text(json.dumps(schema, sort_keys=True, indent=2) + "\n")


if __name__ == "__main__":
    main()
