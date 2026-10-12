"""Declared admission of the exact retained reviewbench source worlds.

The three exposed development verification fixtures (`usketch#534`,
`teamscli#31`, `Artemis#12479`) name exact repository revisions whose authorized
source bytes are retained, read-only, under the mission's
`attune-reviewbench-worlds` cache. The mission forbids acquiring a new corpus for
a separate revision, so the bounded development checks must read exactly those
retained bytes rather than a fetched or reconstructed copy.

This rule admits a declared file list into the graph as declared inputs without
copying anything into the checkout and without any network access: each declared
file is admitted through a `file://` URL whose declared SHA-256 must match, so a
mutated, truncated or substituted retained file fails the fetch instead of
entering the check. It decides no science: it resolves declared paths, verifies
declared digests and writes the declared filegroups. The identity of the exact
revision a file belongs to travels with the manifest, not with this rule.

Only the files a bounded development check actually reads are declared here.
`Unknown`/`Unavailable` outcomes name the retained revision they inspected; they
never claim a source that was not read.
"""

def _impl(ctx):
    lines = [line for line in ctx.read(ctx.attr.manifest).split("\n") if line.strip()]
    entries = []
    for line in lines:
        fields = line.split("\t")
        if len(fields) >= 4 and fields[0] != "name":
            entries.append((fields[0], fields[2], fields[3]))

    if not entries:
        fail("the declared retained-world manifest names no file")

    groups = []
    for name, path, sha256 in entries:
        # `file://` keeps the read local to the authorized retained cache while
        # the declared digest still verifies the exact bytes, exactly as the
        # hosted-Qwen fixture admission does. The materialized file carries a
        # distinct name so the filegroup that exposes it has no self-edge.
        output = "file_" + name
        ctx.download(
            url = "file://" + ctx.attr.root + "/" + path,
            output = output,
            sha256 = sha256,
        )
        groups.append(
            "filegroup(\n    name = \"%s\",\n    srcs = [\"%s\"],\n)\n" % (name, output),
        )

    ctx.file(
        "BUILD.bazel",
        "package(default_visibility = [\"//visibility:public\"])\n\n"
            + "\n".join(groups)
            + "\nfilegroup(\n    name = \"all\",\n    srcs = [\n"
            + "".join(["        \"file_%s\",\n" % name for name, _, _ in entries])
            + "    ],\n)\n",
    )
    # The declared identity record travels with the admitted bytes, so a consumer
    # can compare what was read with what the manifest declared.
    ctx.file("retained.tsv", "\n".join(lines) + "\n")

attune_retained_worlds = repository_rule(
    implementation = _impl,
    doc = """Admit the declared files of the exact retained reviewbench source worlds.

    `manifest` is the committed identity record (`name <tab> world <tab> path
    <tab> sha256`) and `root` is the authorized retained-world cache directory.
    Every declared file is admitted through a `file://` URL and verified against
    its recorded digest; one `filegroup` per file and a whole-set `all` group are
    exposed. `token` is the declared admission identity: bump it to force
    re-admission after the retained cache changes.
    """,
    attrs = {
        "manifest": attr.label(allow_single_file = True, mandatory = True),
        "root": attr.string(mandatory = True),
        "token": attr.string(default = "1"),
    },
)
