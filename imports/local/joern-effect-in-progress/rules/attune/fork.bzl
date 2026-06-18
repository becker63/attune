load(":providers.bzl", "ForkCheckInfo")
load(":validation.bzl", "validate_phase_name")

def _fork_check_impl(ctx):
    if ctx.attrs.phase != "all":
        validate_phase_name(ctx.attrs.phase)
    out = ctx.actions.declare_output(ctx.label.name + ".fork.txt")
    command = "pnpm fork:direct -- --phase {}".format(ctx.attrs.phase)
    ctx.actions.write(out, command + "\n")
    return [DefaultInfo(default_output = out), ForkCheckInfo(phase = ctx.attrs.phase, command = command)]

fork_check = rule(
    impl = _fork_check_impl,
    attrs = {
        "phase": attrs.string(default = "all"),
    },
)
