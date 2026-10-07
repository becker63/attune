"""Declared admission of the host-acquired hosted-Qwen (Q) embedding fixtures.

Owner-authorized hosted-Qwen continuation (2026-10-07): Q is the only embedding
arm whose vectors are not produced by a Bazel action, because its single route is
the hosted OpenRouter embeddings API reached through the pinned LangChain4j
1.18.1 SDK and its credential must never become a declared build input. The
mission-local acquisition helper (`runtime/QwenEmbeddingAcquirer.java`) therefore
runs on the host, reads exactly one authorized credential entry internally, and
materializes one immutable vector fixture file per declared group beside a
sanitized identity manifest.

This rule admits those host files into the graph as declared inputs without
copying them into the checkout and without putting any credential, request or
response payload into the repository. It reads the committed sanitized manifest,
admits every fixture file through a `file://` URL whose declared SHA-256 must
match, and exposes one `filegroup` per declared group plus a whole-set `all`
group. A mutated, truncated or substituted fixture fails the fetch instead of
entering the study.

The rule decides no science: it resolves declared paths, verifies declared
digests and writes declared filegroups. No ranking, metric, provider or recipe
logic lives here, and the manifest carries identity only (group, side, logical
rows, unique inputs, truncated rows, unmeasured rows, frozen cap, provider,
resolved model, frozen recipe, digest); the vector payloads stay in the host
fixture directory.
"""

def _impl(ctx):
    lines = [line for line in ctx.read(ctx.attr.manifest).split("\n") if line.strip()]
    entries = []
    for line in lines:
        fields = line.split("\t")
        if len(fields) >= 11 and fields[0] != "name":
            entries.append((fields[0], fields[10]))

    if not entries:
        fail("the declared hosted-Qwen fixture manifest names no fixture")

    groups = []
    for name, sha256 in entries:
        # `file://` keeps the acquisition on the host (the credential never
        # becomes a declared input) while the declared digest still verifies the
        # exact bytes, exactly as the network acquisitions of the pinned world
        # archives and the pinned CodeRankEmbed runtime do.
        ctx.download(
            url = "file://" + ctx.attr.root + "/fixtures/" + name + ".tsv",
            output = name + ".tsv",
            sha256 = sha256,
        )
        groups.append(
            "filegroup(\n    name = \"%s\",\n    srcs = [\"%s.tsv\"],\n)\n" % (name, name),
        )

    ctx.file(
        "BUILD.bazel",
        "package(default_visibility = [\"//visibility:public\"])\n\n"
            + "\n".join(groups)
            + "\nfilegroup(\n    name = \"all\",\n    srcs = [\n"
            + "".join(["        \"%s.tsv\",\n" % name for name, _ in entries])
            + "    ],\n)\n",
    )
    # The declared identity record travels with the materialized bytes, so a
    # consumer can compare what was admitted with what the manifest declared.
    ctx.file("fixtures.tsv", "\n".join(lines) + "\n")

attune_qwen_fixtures = repository_rule(
    implementation = _impl,
    doc = """Admit the declared host-acquired hosted-Qwen embedding fixtures.

    `manifest` is the committed sanitized identity record
    (`name <tab> side <tab> logical_rows <tab> unique_inputs <tab> truncated_rows
    <tab> unmeasured_rows <tab> cap_code_units <tab> provider <tab> resolved_model
    <tab> recipe <tab> sha256`), and `root` is the host fixture directory the
    acquisition command wrote. Every declared fixture is admitted through a
    `file://` URL and verified against its recorded digest; one `filegroup` per
    group and a whole-set `all` group are exposed. `token` is the declared refresh
    identity: bump it to force re-admission after a new acquisition.
    """,
    attrs = {
        "manifest": attr.label(allow_single_file = True, mandatory = True),
        "root": attr.string(mandatory = True),
        "token": attr.string(default = "1"),
    },
)
