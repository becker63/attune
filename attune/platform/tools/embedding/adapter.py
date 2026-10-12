#!/usr/bin/env python3
"""Minimal CodeRankEmbed inference adapter (owner-approved 2026-10-07).

This file is the ONLY first-party Python permitted in this workspace, and it is
a mechanical inference surface and nothing else. It follows a DECLARED rows
manifest produced by the Study-owned stage graph, tokenizes exactly those
declared inputs, runs the pinned third-party model once, and serializes the raw
CLS vectors. It carries:

  * no scientific policy, no selection, no ranking and no metrics;
  * no ingestion of any corpus, catalog or evaluator label;
  * no network access and no credential handling.

The declared model, tokenizer and runtime wheels are digest-pinned inputs
(`platform/embedding/runtime-lock.tsv`); the process never resolves a dependency
at run time. The recipe (documented query prefix on queries only, BERT WordPiece
tokenization, right-side longest-first max truncation, CLS pooling, unnormalized
outputs) is passed in as declared arguments, not decided here.

The rows manifest is a TSV with columns `key`, `side`, `path`, `text_file`; the
`text_file` is resolved against `--text-root` when given, otherwise it is used
as given (relative to the action's working directory). Each emitted row carries
the logical fixture identity the mission declares: model revision, recipe
identity, and the SHA-256 of the exact input bytes that were embedded. The
vector payload is data, never identity.
"""

import argparse
import hashlib
import json
import os
import sys


def _read(path):
    with open(path, "rb") as handle:
        return handle.read()


def _rows(path):
    rows = []
    for line in _read(path).decode("utf-8").split("\n"):
        if not line.strip():
            continue
        fields = line.split("\t")
        if len(fields) < 4:
            raise SystemExit("malformed rows manifest line: %r" % line)
        rows.append((fields[0], fields[1], fields[2], fields[3]))
    return rows


def _prior_vectors(paths):
    """Index the declared prior fixtures by their logical identity.

    The logical key is `(model revision, recipe, exact embedded input bytes)`.
    The vector payload is data and never identity, so a prior row is reusable
    exactly when its three-key identity repeats; the key is never the row label
    or the batch position. Missing or unreadable prior files contribute nothing.
    """
    index = {}
    for path in paths:
        if not path or not os.path.exists(path):
            continue
        for line in _read(path).decode("utf-8").split("\n"):
            if not line.strip():
                continue
            fields = line.split("\t")
            if len(fields) < 9:
                continue
            index[(fields[3], fields[4], fields[5])] = fields[8]
    return index


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--rows", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--report", required=False)
    parser.add_argument("--text-root", default="")
    parser.add_argument("--model-revision", required=True)
    parser.add_argument("--recipe", required=True)
    parser.add_argument("--query-prefix", required=True)
    parser.add_argument("--max-length", type=int, required=True)
    parser.add_argument("--pooling", default="cls")
    parser.add_argument(
        "--prior",
        action="append",
        default=[],
        help="declared prior fixture TSV whose logical rows are reused verbatim",
    )
    args = parser.parse_args()

    revision = args.model_revision
    recipe = args.recipe
    prefix = args.query_prefix
    max_length = args.max_length
    if args.pooling != "cls":
        raise SystemExit("unsupported pooling %r" % args.pooling)

    rows = _rows(args.rows)
    prior = _prior_vectors(args.prior)

    # Resolve every row's exact embedded input bytes first, so the logical key is
    # known before any model byte is loaded. A row whose three-key identity is
    # already declared in a prior fixture is memoized: it is never re-inferred.
    resolved_rows = []
    for key, side, path, text_file in rows:
        resolved = text_file if not args.text_root else os.path.join(args.text_root, text_file)
        text = _read(resolved).decode("utf-8")
        embedded = (prefix + text) if side == "query" else text
        embedded_bytes = embedded.encode("utf-8")
        input_sha256 = hashlib.sha256(embedded_bytes).hexdigest()
        resolved_rows.append((key, side, path, embedded, input_sha256))

    pending = [
        row for row in resolved_rows if (revision, recipe, row[4]) not in prior
    ]

    tokenizer = None
    model = None
    torch = None
    if pending:
        # Imported and loaded only inside the declared inference boundary, and
        # only when at least one logical row actually needs inference. A fully
        # memoized replay therefore loads no model bytes at all.
        import torch
        from transformers import AutoModel, AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(args.model_dir, trust_remote_code=True)
        model = AutoModel.from_pretrained(args.model_dir, trust_remote_code=True)
        model.eval()

    report = {
        "model_revision": revision,
        "recipe": recipe,
        "query_prefix": prefix,
        "max_length": max_length,
        "pooling": args.pooling,
        "torch": None if torch is None else torch.__version__,
        "transformers": None if torch is None else __import__("transformers").__version__,
        "inferred_count": 0,
        "memoized_count": 0,
        "rows": [],
    }

    with open(args.out, "w", encoding="utf-8") as out:
        for key, side, path, embedded, input_sha256 in resolved_rows:
            identity = (revision, recipe, input_sha256)
            if identity in prior:
                values = prior[identity]
                dim = len(values.split(","))
                finite = True
                report["memoized_count"] += 1
                report["rows"].append(
                    {
                        "key": key,
                        "side": side,
                        "path": path,
                        "input_sha256": input_sha256,
                        "dim": dim,
                        "finite": finite,
                        "memo": "reused",
                    }
                )
            else:
                encoded = tokenizer(
                    [embedded],
                    return_tensors="pt",
                    truncation=True,
                    max_length=max_length,
                    padding=False,
                )
                with torch.no_grad():
                    output = model(**encoded)
                vector = output.last_hidden_state[:, 0, :][0].tolist()

                finite = all(v == v and abs(v) != float("inf") for v in vector)
                values = ",".join(repr(float(v)) for v in vector)
                dim = len(vector)
                report["inferred_count"] += 1
                report["rows"].append(
                    {
                        "key": key,
                        "side": side,
                        "path": path,
                        "input_sha256": input_sha256,
                        "dim": dim,
                        "finite": finite,
                        "memo": "inferred",
                        "input_tokens": int(encoded["input_ids"].shape[1]),
                        # The exact token ids the shipped tokenizer produced, so
                        # the known `do_lower_case` conflict is settled by
                        # observation rather than by editing either shipped file.
                        "input_ids": [int(t) for t in encoded["input_ids"][0].tolist()],
                        "tokenizer_do_lower_case": tokenizer.init_kwargs.get("do_lower_case"),
                    }
                )

            out.write(
                "\t".join(
                    [
                        key,
                        side,
                        path,
                        revision,
                        recipe,
                        input_sha256,
                        str(dim),
                        "finite" if finite else "nonfinite",
                        values,
                    ]
                )
                + "\n"
            )

    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2, sort_keys=True)
            handle.write("\n")


if __name__ == "__main__":
    sys.exit(main())
