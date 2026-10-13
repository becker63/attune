"""Record the live workspace for the local metadata audit. No source content."""

def _local_workspace_impl(repository_ctx):
    root = str(repository_ctx.path(Label("//:BUILD.bazel")).dirname.realpath)
    repository_ctx.file("workspace_root.txt", root + "\n")
    repository_ctx.file("BUILD.bazel", """\
package(default_visibility = ["//visibility:public"])

exports_files(["workspace_root.txt"])
""")

local_workspace = repository_rule(
    implementation = _local_workspace_impl,
    local = True,
    configure = True,
    doc = "The live root workspace path, for the local read-only workspace audit.",
)
