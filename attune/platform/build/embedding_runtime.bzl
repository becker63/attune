"""Declared acquisition of the pinned CodeRankEmbed inference runtime.

Owner-approved POST-HOC EXPLORATORY EMBEDDING extension (2026-10-07): the
pinned third-party Python/PyTorch runtime is used SOLELY for declared model
inference. This rule packages/declares the runtime and model inputs; it never
runs inference and never touches the network at action time.

Both repositories read the ONE declared identity record
`//platform/embedding:runtime-lock.tsv` (also consumed by the Nix packaging
expression `platform/embedding/runtime.nix`), so the wheel set, the model file
set and their digests cannot drift between the two packagers. Every wheel and
every model file is verified against its declared SHA-256 before it is
materialized, exactly like the pinned corpus and world archives: a mutated,
substituted or different-revision artifact fails the fetch rather than entering
the study.

The materialized runtime is a pure file tree under `site-packages/` with no
absolute path dependency on the machine that fetched it, so it is a portable
declared input that a remote BuildBuddy action can carry in the CAS and load
with the pinned image's own CPython. No host embedding is involved.
"""

def _rows(ctx, lock):
    entries = []
    for line in ctx.read(lock).split("\n"):
        if not line.strip():
            continue
        fields = line.split("\t")
        if len(fields) >= 5:
            entries.append((fields[0], fields[1], fields[2], fields[3], fields[4]))
    return entries

def _embedding_runtime_impl(ctx):
    wheels = [row for row in _rows(ctx, ctx.attr.lock) if row[0] == "wheel"]
    if not wheels:
        fail("the declared embedding runtime lock names no wheel")

    for index, (_, name, _size, sha256, url) in enumerate(wheels):
        staging = "wheels/w" + str(index)
        ctx.download_and_extract(url = url, sha256 = sha256, output = staging)

        # Merge each wheel's payload into one importable site-packages tree.
        result = ctx.execute(["cp", "-r", staging + "/.", "site-packages/"])
        if result.return_code != 0:
            fail("could not merge %s into site-packages: %s" % (name, result.stderr))

    # A marker inside the merged tree lets a consumer derive the site-packages
    # directory from a declared input path without reading any file at analysis
    # time and without hardcoding a machine-specific path.
    ctx.file("site-packages/attune-runtime.marker", "")

    ctx.file("BUILD.bazel", """\
package(default_visibility = ["//visibility:public"])

filegroup(
    name = "site_packages",
    srcs = glob(["site-packages/**"], allow_empty = False),
)

exports_files(["site-packages/attune-runtime.marker"])
""")

attune_embedding_runtime = repository_rule(
    implementation = _embedding_runtime_impl,
    doc = """Materialize the pinned CodeRankEmbed Python/PyTorch inference runtime.

    `lock` is the declared runtime identity record
    (`wheel <filename> <bytes> <sha256> <url>` rows). Each wheel is downloaded on
    the client, verified against its declared digest and merged into one portable
    `site-packages/` tree.
    """,
    attrs = {"lock": attr.label(allow_single_file = True, mandatory = True)},
)

def _embedding_model_impl(ctx):
    files = [row for row in _rows(ctx, ctx.attr.lock) if row[0] == "model"]
    if not files:
        fail("the declared embedding runtime lock names no model file")

    for _, path, _size, sha256, url in files:
        ctx.download(url = url, sha256 = sha256, output = "model/" + path)

    ctx.file("BUILD.bazel", """\
package(default_visibility = ["//visibility:public"])

filegroup(
    name = "model",
    srcs = glob(["model/**"], allow_empty = False),
)

exports_files(["model/config.json"])
""")

attune_embedding_model = repository_rule(
    implementation = _embedding_model_impl,
    doc = """Materialize the exact pinned CodeRankEmbed revision's model files.

    `lock` is the declared runtime identity record
    (`model <path> <bytes> <sha256> <url>` rows). Each file is downloaded on the
    client and verified against its declared digest; the repository-relative
    layout (including `1_Pooling/config.json`) is preserved so the model loads
    from the declared directory exactly as published.
    """,
    attrs = {"lock": attr.label(allow_single_file = True, mandatory = True)},
)
