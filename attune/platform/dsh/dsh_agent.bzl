"""The declared native DSH agent-run action of the narrow evidence substrate.

This is a Starlark `ctx.actions.run` of ONE declared executable: the hermetic
`//platform/dsh:dsh` CLI (the pinned DSH 0.2.0-rc.2 runtime with its declared npm
closure). It is the same shape as the inherited `native_flix_producer`: a declared
producer action, not a new executable entrypoint, not a shell action and not a
second agent loop. DSH itself owns the model/tool lifecycle; this rule only
declares the inputs, the environment and the outputs.

The credential never enters the action as a declared input, argument or file. On
the dedicated remote platform the existing BuildBuddy `ACCESS_TOKEN` secret
exchange injects it into the action environment, where the declared route reads
it by that exact name (`apiKeyEnv: ACCESS_TOKEN`), exactly like the inherited Sol
and ReviewBench arms.
"""

def _dsh_agent_run_impl(ctx):
    # The declared entry point tees the CLI's own stdout into this file, so the
    # native `--json` event stream (or a probe's plain output) is a real action
    # output rather than a log line.
    events = ctx.actions.declare_file(ctx.label.name + ".events.jsonl")
    outputs = [events]

    # The declared DSH launcher materializes its own runfiles beside itself
    # (`<executable>.runfiles`). The one authored plugin overlay of this adapter
    # must be named by its RUNFILES path, because the declared DSH loader anchors
    # an inserted relative plugin name beside the overlay file; the overlay and
    # the plugin it names are declared data of the launcher, so both are present
    # there without a host `node_modules` and without an extra action input.
    runfiles_root = ctx.executable.dsh.path + ".runfiles"

    args = ctx.actions.args()
    env = {
        # The native stdout stream, teed by the declared entry point.
        "ATTUNE_DSH_EVENTS_OUT": events.path,
        # The js_binary launcher would otherwise change directory to the root of
        # the Bazel output tree, which would make the action's declared output
        # paths (relative to the execroot) resolve against the wrong base. `.`
        # is rules_js's documented value for a launcher that must stay in the
        # action's own working directory, which is the execroot.
        "BAZEL_BINDIR": ".",
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
    }

    plugin_patch_paths = []
    for target in ctx.attr.plugin_patches:
        for file in target[DefaultInfo].files.to_list():
            plugin_patch_paths.append(
                runfiles_root + "/" + ctx.expand_location(
                    "$(rlocationpath %s)" % file.owner,
                    targets = [target],
                ),
            )

    if ctx.attr.version_only:
        args.add("--version")
    elif ctx.attr.dump_config:
        # The Cordis load probe: composing the profile requires every declared
        # plugin to load from the linked npm closure, so the dumped tree is
        # evidence that the produced artifact really loads and does not silently
        # fall back to host node_modules. It makes no provider call and reads no
        # secret.
        args.add("--profile", ctx.attr.profile)
        for route in ctx.files.routes:
            args.add("--patch", route.path)
        for patch in plugin_patch_paths:
            args.add("--patch", patch)
        args.add("--dump-config")
    else:
        # The native DSH home of this run. It is a declared output directory, so
        # the persisted session tree is a real action output rather than a side
        # effect outside the action boundary. DSH creates it itself.
        home = ctx.actions.declare_directory(ctx.label.name + ".dsh-home")
        outputs.append(home)
        env["DSH_HOME"] = home.path

        # The pinned RBE container has no usable sandbox backend (no bubblewrap
        # and no Landlock-enforcing kernel), so DSH's own bash sandbox refuses to
        # run a command unconfined and every tool result would be an error. This
        # declares DSH's own supported permission mode for that ephemeral,
        # network-isolated container; it is a declared DSH setting, not a
        # substitute transport, model or credential. It is not a security claim:
        # the guest execution boundary is never treated as one (see the mission's
        # native/PTC scoping rule).
        env["DSH_PERMISSION_MODE"] = ctx.attr.permission_mode

        # The DECLARED per-task / per-arm run identity and world bindings of one
        # pilot observation. They are ordinary declared environment values of THIS
        # action, so one run has one identity and one per-task declared source
        # root/CAS binding rather than a global host cache. The values are written
        # by the declaring target (see the pilot runner), never read from the host.
        for key, value in ctx.attr.agent_env.items():
            env[key] = value

        args.add("--profile", ctx.attr.profile)
        for route in ctx.files.routes:
            args.add("--patch", route.path)
        for patch in plugin_patch_paths:
            args.add("--patch", patch)
        args.add("--json")
        args.add(ctx.attr.task)

    inputs = ctx.files.routes + ctx.files.data
    ctx.actions.run(
        executable = ctx.executable.dsh,
        arguments = [args],
        inputs = inputs,
        outputs = outputs,
        env = env,
        tools = [ctx.attr.dsh[DefaultInfo].files_to_run],
        execution_requirements = {"no-local": "1"} if ctx.attr.remote_only else {},
        mnemonic = "DshAgentRun",
        progress_message = "Native DSH agent run %{label}",
        use_default_shell_env = False,
    )
    return [DefaultInfo(files = depset(outputs))]

dsh_agent_run = rule(
    implementation = _dsh_agent_run_impl,
    doc = """Run one bounded native DSH invocation as a declared action.

    The action runs the pinned DSH CLI once with the declared profile, route
    patches and task, captures its stdout as a declared output, and materializes
    the native session tree as a declared output directory. It declares
    `no-local`, so it can only be the evidence of a real remote execution when
    the caller selects the dedicated remote platform.
    """,
    attrs = {
        "dsh": attr.label(
            default = "//platform/dsh:dsh",
            executable = True,
            cfg = "exec",
        ),
        "profile": attr.string(default = "headless"),
        "dump_config": attr.bool(
            default = False,
            doc = "Probe mode: compose the declared profile and dump the resolved Cordis plugin tree.",
        ),
        "remote_only": attr.bool(
            default = True,
            doc = "Declare `no-local` so the action can only be remote evidence.",
        ),
        "permission_mode": attr.string(
            default = "danger-full-access",
            doc = "The declared DSH permission mode of the run.",
        ),
        "routes": attr.label_list(
            allow_files = True,
            doc = "The declared provider-route patches this run boots with.",
        ),
        "plugin_patches": attr.label_list(
            allow_files = True,
            doc = """The declared loader overlays that mount the authored plugins of
            this adapter. They are passed by their RUNFILES path, because the
            declared DSH loader anchors an inserted relative plugin name beside
            the overlay file and the overlays are declared data of the launcher.""",
        ),
        "task": attr.string(doc = "The one task string handed to the DSH app."),
        "agent_env": attr.string_dict(
            doc = """The declared per-task / per-arm run identity and world bindings
            of one observation (e.g. `ATTUNE_RUN_TASK`, `ATTUNE_RUN_ARM`,
            `ATTUNE_RUN_OBSERVATION`, `DSH_TOOLS_MODE` and the per-task declared
            source roots). They are declared values of THIS action, so one run has
            one identity and one per-task binding rather than a global host cache."""),
        "data": attr.label_list(
            allow_files = True,
            doc = """Extra declared inputs of the run (the per-task declared world
            files / archives the mounted tools read). They are ordinary declared
            action inputs, never a host-global path lookup."""),
        "version_only": attr.bool(
            default = False,
            doc = "Probe mode: run the CLI's own `--version` and no session.",
        ),
    },
)
