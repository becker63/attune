def attune_codegen(name, command, srcs = []):
    _attune_codegen(
        name = name,
        srcs = srcs,
        command = command,
    )

def _attune_codegen_impl(ctx):
    out = ctx.actions.declare_output(ctx.label.name + ".codegen.txt")
    ctx.actions.write(out, ctx.attrs.command + "\n")
    return [DefaultInfo(default_output = out)]

_attune_codegen = rule(
    impl = _attune_codegen_impl,
    attrs = {
        "command": attrs.string(),
        "srcs": attrs.list(attrs.source(), default = []),
    },
)
