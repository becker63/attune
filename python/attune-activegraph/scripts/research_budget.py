"""Keep the deliberately small research module visible in CI."""

from __future__ import annotations

import argparse
import io
import tokenize
from pathlib import Path

REVIEW_THRESHOLD = 2_000
HARD_CAP = 2_200
FILE_CAP = 600
EXCLUSIONS = "tests, generated code, fixtures, prompts, benchmark data, and scripts"


def code_lines(path: Path) -> int:
    ignored: set[int] = set()
    for token in tokenize.generate_tokens(io.StringIO(path.read_text()).readline):
        if token.type in {tokenize.COMMENT, tokenize.STRING}:
            ignored.update(range(token.start[0], token.end[0] + 1))
    return sum(
        1
        for number, line in enumerate(path.read_text().splitlines(), 1)
        if line.strip() and number not in ignored
    )


def report(root: Path) -> tuple[dict[str, int], int]:
    files = sorted(root.glob("*.py"))
    counts = {
        str(path.relative_to(root.parent)): code_lines(path)
        for path in files
        if path.name != "__init__.py"
    }
    return counts, sum(counts.values())


def main() -> None:
    parser = argparse.ArgumentParser(description=f"Research LOC excludes {EXCLUSIONS}.")
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).parents[1] / "src/attune_activegraph/research"
    )
    args = parser.parse_args()
    counts, total = report(args.root)
    for path, count in counts.items():
        print(f"{count:4} {path}")
    print(f"{total:4} total (review above {REVIEW_THRESHOLD}; cap {HARD_CAP}; file cap {FILE_CAP})")
    oversized = [path for path, count in counts.items() if count > FILE_CAP]
    if oversized or total > HARD_CAP:
        raise SystemExit("research LOC budget exceeded: " + ", ".join(oversized))
    if total > REVIEW_THRESHOLD:
        print("architecture review required")


if __name__ == "__main__":
    main()
