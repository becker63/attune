"""Declared acquisition of the exact pinned clean-source world archives.

The selected panel's worlds are pinned GitHub source archives: one canonical
repository at one exact revision, whose exact bytes the admitted
`export_records.tsv` already records by SHA-256. This rule turns that admitted
identity record into real materialized source bytes. It downloads each declared
archive on the client and verifies it against the declared SHA-256 before
extracting it, so a mutated, substituted or different-revision archive fails the
fetch instead of entering the study.

The rule decides no science: it reads the declared manifest, verifies each
declared digest, extracts each archive under its declared world id, and writes
one `filegroup` per world. The declared manifest is owned by `Attune.Study`
(emitted by `//test/study:archives_prepare` and admitted by the integration
owner), so no repository, revision or digest is restated here as truth.

This is a public-input acquisition, distinct from the credential-free,
network-denied scientific guests: the fetch happens on the client, and no action
that runs a world extraction ever reaches the network.
"""

def _impl(ctx):
    lines = [line for line in ctx.read(ctx.attr.manifest).split("\n") if line.strip()]
    entries = []
    for line in lines:
        fields = line.split("\t")
        if len(fields) >= 5 and fields[0] == "archive":
            entries.append((fields[1], fields[2], fields[3], fields[4]))

    if not entries:
        fail("the declared world-archive manifest names no archive")

    for world, repo, revision, sha256 in entries:
        # The GitHub archive's single top-level directory is derived from the
        # repository's display name, which is not always its path name (for
        # example `solid/community-server` archives as `CommunitySolidServer-…`),
        # so no prefix is stripped here: the world's repository-relative source
        # tree is recovered by dropping that one leading directory in the stage
        # that reads the bytes. The rule decides nothing about the content.
        ctx.download_and_extract(
            url = "https://github.com/%s/archive/%s.tar.gz" % (repo, revision),
            sha256 = sha256,
            output = "worlds/" + world,
        )

    groups = []
    for world, _, _, _ in entries:
        groups.append(
            "filegroup(\n    name = \"%s\",\n    srcs = glob([\"worlds/%s/**\"], allow_empty = False),\n)\n" % (world, world),
        )
    ctx.file(
        "BUILD.bazel",
        "package(default_visibility = [\"//visibility:public\"])\n\n" + "\n".join(groups),
    )
    # The declared identity record travels with the materialized bytes, so a
    # consumer can compare what was fetched with what the manifest declared.
    ctx.file("archives.tsv", "\n".join(lines) + "\n")

attune_world_sources = repository_rule(
    implementation = _impl,
    doc = """Materialize the declared pinned clean-source world archives.

    `manifest` is the admitted `Attune.Study` archive identity record
    (`archive <world> <repository> <revision> <sha256>`). Each archive is
    downloaded on the client and verified against its declared digest before it
    is extracted under `worlds/<world>/`; one `filegroup` per world exposes the
    materialized source bytes.
    """,
    attrs = {
        "manifest": attr.label(allow_single_file = True, mandatory = True),
    },
)
