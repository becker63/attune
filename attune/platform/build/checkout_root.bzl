"""Record the live checkout root and the resolved git binary.

The source-policy gate scans the whole checkout (Git tracked, index, and
eligible untracked paths). This rule only records paths and the git version;
no source content is read here and no file is classified.
"""

def _local_checkout_impl(repository_ctx):
    workspace = repository_ctx.path(Label("//:BUILD.bazel")).dirname.realpath
    checkout = workspace.dirname
    if not checkout.get_child("MODULE.bazel").exists:
        fail("the attune workspace must live inside the checkout root that carries MODULE.bazel")
    git = repository_ctx.which("git")
    if git == None:
        fail("git is required for the source-policy gate; run inside the pinned developer shell")
    git = git.realpath
    version = repository_ctx.execute([git, "--version"])
    if version.return_code != 0 or not version.stdout.startswith("git version 2."):
        fail("a git 2.x client is required for the source-policy gate, found: " + version.stdout.strip())
    nix_instantiate = repository_ctx.which("nix-instantiate")
    if nix_instantiate == None:
        fail("nix-instantiate is required for the source-policy gate's parse-only Nix check; run inside the pinned developer shell")

    # No realpath: nix-instantiate is a multi-call dispatcher and must be
    # invoked under its own name for `--parse` to resolve.
    parsed_nix = repository_ctx.execute([nix_instantiate, "--version"])
    if parsed_nix.return_code != 0:
        fail("a working nix-instantiate is required for the source-policy gate, found: " + nix_instantiate)
    repository_ctx.file("checkout_root.txt", str(checkout) + "\n")
    repository_ctx.file("git.txt", str(git) + "\n")
    repository_ctx.file("nix.txt", str(nix_instantiate) + "\n")
    repository_ctx.file("BUILD.bazel", """\
package(default_visibility = ["//visibility:public"])

exports_files([
    "checkout_root.txt",
    "git.txt",
    "nix.txt",
])
""")

local_checkout = repository_rule(
    implementation = _local_checkout_impl,
    local = True,
    configure = True,
    doc = "The live checkout root, resolved git client, and resolved Nix parser, for the read-only source-policy gate.",
)
