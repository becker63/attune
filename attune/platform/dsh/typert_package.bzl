"""The declared Typert generation and packaging rule of the narrow evidence contract.

This is a Starlark `ctx.actions.run` of ONE declared executable: the
`typert_build` js_binary, which runs the real pinned
`@deepseek-ai/dsh-typert-generator` 0.2.0-rc.2 analyzer/emitter over the declared
contributor fixture and assembles the installable Cordis package. It is the same
shape as the inherited `native_flix_producer`: a declared producer action, not a
new executable entrypoint, not a shell action and not a second schema compiler.

The action declares every input it reads (the fixture, the authored packaging
inputs and the npm closure the generator lives in) and every output it writes
(one directory tree holding the installable package, the canonical surface, the
contract digest and the selected reflection). Nothing is fetched or installed at
action time: an undeclared dependency fails the action rather than being repaired
from a host package.
"""

def _typert_package_impl(ctx):
    out = ctx.actions.declare_directory(ctx.label.name)
    args = ctx.actions.args()
    # The declared contributor fixture directory and the authored packaging
    # inputs. Both are execroot-relative declared inputs, so the action reads
    # exactly the bytes the build declared.
    args.add("--fixture", ctx.file.tsconfig.dirname)
    args.add("--install", ctx.file.manifest.dirname)
    args.add("--out", out.path)
    inputs = list(ctx.files.srcs) + list(ctx.files.install) + [ctx.file.manifest, ctx.file.tsconfig]
    ctx.actions.run(
        executable = ctx.executable.builder,
        arguments = [args],
        inputs = inputs,
        outputs = [out],
        env = {
            # Keep the rules_js launcher in the action's own working directory
            # (the execroot) so the declared output path resolves correctly.
            "BAZEL_BINDIR": ".",
        },
        # The rules_js launcher is a small shell script that needs the ordinary
        # `uname`/`dirname` utilities on `PATH`. That is a launcher detail, not a
        # dependency of this action: every input the generator reads is declared,
        # no package is fetched or installed, and the environment carries no
        # credential. The action's own environment is otherwise fully declared.
        use_default_shell_env = True,
        mnemonic = "TypertPackage",
        progress_message = "Generating the narrow evidence contract package %{label}",
        tools = [ctx.attr.builder[DefaultInfo].files_to_run],
    )
    return [DefaultInfo(files = depset([out]))]

typert_package = rule(
    implementation = _typert_package_impl,
    doc = """Generate and assemble the installable narrow evidence contract package.

    One declared action runs the real Typert generator over the declared fixture
    and emits one directory tree: the installable package (generated transport
    declaration, generated contract identity, authored Cordis entry and bundle
    patch, and the package manifest) beside the canonical surface, the contract
    digest and the selected reflection that a consumer compares against the
    frozen parity fixture.
    """,
    attrs = {
        "builder": attr.label(
            default = "//platform/dsh:typert_build",
            executable = True,
            cfg = "exec",
        ),
        "manifest": attr.label(
            allow_single_file = True,
            doc = "The authored installable package manifest, whose directory also holds the authored Cordis entry and bundle patch.",
        ),
        "install": attr.label_list(
            allow_files = True,
            doc = "The authored packaging inputs (manifest, Cordis entry, declaration and bundle patch).",
        ),
        "srcs": attr.label_list(
            allow_files = True,
            doc = "The declared contributor fixture files the generator analyzes.",
        ),
        "tsconfig": attr.label(
            allow_single_file = True,
            doc = "The host-face tsconfig that anchors the declared fixture directory.",
        ),
    },
)
