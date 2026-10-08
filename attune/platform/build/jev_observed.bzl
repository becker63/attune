"""Declared admission of the host-acquired ReviewBench JEV observations.

Owner decision 2026-10-08 (`library/reviewbench-native-jev.md`): the ReviewBench
JEV acquisitions run through the NATIVE Java OpenRouter Decisions boundary, whose
credential is resolved internally and must never become a declared build input.
The mission-local native acquisition therefore runs on the host and writes its
sanitized observations beside its receipts, outside the mutable Bazel outputs.

This rule admits exactly that one sanitized observation file into the graph as a
declared input without copying it into the checkout. It reads the committed
identity record (the declared relative file name and its SHA-256), admits the
file through a `file://` URL whose digest must match, and exposes it as the
`observed` filegroup. A mutated, truncated or substituted manifest fails the
fetch instead of entering the study.

The rule decides no science: it resolves one declared path, verifies one declared
digest and writes one declared filegroup. The manifest carries identity only
(relative name and digest); the sanitized observations stay in the host fixture
directory, and the credential, the exact payloads and the raw provider bodies
never enter the repository.
"""

def _impl(ctx):
    lines = [line for line in ctx.read(ctx.attr.manifest).split("\n") if line.strip()]
    entries = []
    for line in lines:
        fields = line.split("\t")
        if len(fields) >= 2 and fields[0] != "name":
            entries.append((fields[0], fields[1]))

    if not entries:
        fail("the declared JEV observation manifest names no observation file")

    for name, sha256 in entries:
        # `file://` keeps the acquisition on the host (the credential never
        # becomes a declared input) while the declared digest still verifies the
        # exact bytes, exactly as the network acquisitions of the pinned world
        # archives do.
        ctx.download(
            url = "file://" + ctx.attr.root + "/" + name,
            output = "observed.tsv",
            sha256 = sha256,
        )

    ctx.file(
        "BUILD.bazel",
        "package(default_visibility = [\"//visibility:public\"])\n\n" +
        "filegroup(\n    name = \"observed\",\n    srcs = [\"observed.tsv\"],\n)\n",
    )

    # The declared identity record travels with the materialized bytes, so a
    # consumer can compare what was admitted with what the manifest declared.
    ctx.file("identity.tsv", "\n".join(lines) + "\n")

attune_jev_observed = repository_rule(
    implementation = _impl,
    doc = """Admit the declared host-acquired ReviewBench JEV observations.

    `manifest` is the committed sanitized identity record
    (`name <tab> sha256`), and `root` is the host fixture directory the native
    acquisition wrote. The declared observation file is admitted through a
    `file://` URL and verified against its recorded digest, and is exposed as the
    `observed` filegroup. `token` is the declared refresh identity: bump it to
    force re-admission after a new acquisition.
    """,
    attrs = {
        "manifest": attr.label(allow_single_file = True, mandatory = True),
        "root": attr.string(mandatory = True),
        "token": attr.string(default = "1"),
    },
)
