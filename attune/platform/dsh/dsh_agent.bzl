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

    # The DECLARED per-task composition inputs of ONE pilot observation. They are
    # ordinary declared action inputs, so the composed review task of an
    # observation is built from the frozen prompt, the task's own public issue and
    # the task's own declared cohort records rather than from a build-time literal
    # or a host-global lookup. `ATTUNE_DSH_PILOT=1` (a declared `agent_env` value
    # of the pilot targets) makes the launcher consume them and fails closed
    # before any provider call when a binding is missing or names another world.
    pilot_inputs = []
    if ctx.attr.pilot_prompt:
        prompt_files = ctx.files.pilot_prompt
        if len(prompt_files) != 1:
            fail("the declared pilot prompt must be exactly ONE file")
        env["ATTUNE_DSH_PROMPT_FILE"] = prompt_files[0].path
        pilot_inputs.append(prompt_files[0])
    if ctx.attr.pilot_issues:
        issue_trees = ctx.files.pilot_issues
        if len(issue_trees) != 1:
            fail("the declared pilot issue record must be exactly ONE declared tree")
        env["ATTUNE_DSH_ISSUES_FILE"] = issue_trees[0].path + "/issues.tsv"
        pilot_inputs.append(issue_trees[0])
    if ctx.attr.pilot_cohort:
        cohort = ctx.files.pilot_cohort
        if len(cohort) != 1:
            fail("the declared pilot cohort must be exactly ONE declared tree")
        pilot_inputs.append(cohort[0])

    # The declared whole-file root of the complete authorized world of this
    # observation. The task's whole-world manifest names every file by
    # archive-relative reference, so the root is the declared `worlds/` parent of
    # the archive inputs this action declares — never a host-global path.
    if ctx.attr.world_archives:
        archives = ctx.files.world_archives
        if not archives:
            fail("the declared world archives of a pilot observation are empty")
        anchor = archives[0].path
        if "/worlds/" not in anchor:
            fail("the declared world archive input %s is not under a declared `worlds/` root" % anchor)
        env["ATTUNE_WHOLE_FILE_ROOT"] = anchor.rsplit("/worlds/", 1)[0]

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

        # The declared per-task / per-arm binding of ONE pilot observation. Every
        # value is the REAL name the mounted tool reads, and every path is the
        # declared per-task path under this action's own declared cohort tree, so
        # one observation binds one task world rather than a host cache. The
        # launcher consumes exactly these names and fails closed before any
        # provider call when one is missing or names another world.
        if ctx.attr.pilot:
            if not ctx.attr.pilot_cohort:
                fail("a pilot observation requires the declared cohort tree of its task")
            task = ctx.attr.agent_env.get("ATTUNE_RUN_TASK")
            arm = ctx.attr.agent_env.get("ATTUNE_RUN_ARM")
            if not task or not arm:
                fail("a pilot observation requires its declared run identity")
            root = ctx.files.pilot_cohort[0].path
            prefix = root + "/cohort-tool-" + task + "-"
            env["ATTUNE_DSH_PILOT"] = "1"
            env["ATTUNE_DSH_COHORT_ROOT"] = root
            env["ATTUNE_WORLD_FILES"] = prefix + "world-files.tsv"
            # The evidence world of the candidate-commit operation: one row per
            # ADMITTED whole file of BOTH declared revisions of THIS task, with its
            # declared whole-file identity digest, its sealed archive-relative
            # location and its declared permission. A candidate is therefore backed
            # by real authorized source of its own task — inside or outside the
            # initial bounded neighborhood — and never by the fixture world or by
            # another task's packet default.
            env["ATTUNE_EVIDENCE_WORLD"] = prefix + "evidence-world.tsv"
            # The COMPILED operation's own reference projections of the declared
            # regions, materialized by the same Flix stage law. The evidence tool
            # SERVES these records where they exist and the acquisition's own
            # measured reference elsewhere, so a candidate is never rejected
            # merely because no initial compiled projection exists.
            env["ATTUNE_EVIDENCE_PROJECTION"] = prefix + "reference-projections.tsv"
            env["ATTUNE_EVIDENCE_SOURCE_ROOT"] = env["ATTUNE_WHOLE_FILE_ROOT"]
            if not env.get("ATTUNE_EVIDENCE_SOURCE_ROOT"):
                fail("a pilot observation requires the declared whole-file root of its world")
            if arm == "R1_PACKETS":
                env["ATTUNE_PACKET_WORLD"] = prefix + "region-manifest.tsv"
                env["ATTUNE_PACKET_PROJECTION"] = prefix + "packet-records.tsv"
                env["ATTUNE_PACKET_SOURCE_ROOT"] = root
            # The declared durable paths of the common substrate, all inside this
            # run's own declared DSH home (a declared action output).
            for name, suffix in [
                ("ATTUNE_GUARD_RECORD", "guard-record.tsv"),
                ("ATTUNE_GUARD_CHECKPOINTS", "checkpoints.tsv"),
                ("ATTUNE_GUARD_RESTORED", "restored.tsv"),
                ("ATTUNE_PLAIN_LEDGER", "attune-plain-ledger.tsv"),
                ("ATTUNE_PACKET_LEDGER", "attune-packet-ledger.tsv"),
                ("ATTUNE_DETECTOR_SIDECAR", "detector-sidecar.tsv"),
                ("ATTUNE_DETECTOR_VISIBILITY", "detector-visibility.tsv"),
            ]:
                env[name] = home.path + "/" + suffix

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

    inputs = ctx.files.routes + ctx.files.data + pilot_inputs + ctx.files.world_archives
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
        "pilot_prompt": attr.label(
            allow_single_file = True,
            doc = """The FROZEN review prompt of the pilot, declared as an input of ONE
            observation. It is composed as the byte-exact prefix of the observation's
            review task."""),
        "pilot_issues": attr.label(
            allow_single_file = True,
            doc = """The admitted public issue record of the pilot (`issues.tsv`), declared
            as an input of ONE observation. Only this task's own public row is read."""),
        "pilot_cohort": attr.label(
            allow_single_file = True,
            doc = """The declared admitted cohort tree that carries this task's changed-file
            manifest, sealed region manifest and revision record. It is ONE declared
            tree, so one observation binds one per-task world rather than a host cache."""),
        "world_archives": attr.label_list(
            allow_files = True,
            doc = """The declared digest-verified source archives of THIS observation's
            world (both revisions). Their declared `worlds/` parent is the whole-file
            root the plain facade and the packet escape resolve unchanged files
            against, so the complete authorized population is reachable without
            copying a corpus byte into the action output."""),
        "version_only": attr.bool(
            default = False,
            doc = "Probe mode: run the CLI's own `--version` and no session.",
        ),
        "pilot": attr.bool(
            default = False,
            doc = """Declare ONE observation of the gated ReviewBench pilot. The action
            then exports the real per-task / per-arm binding the mounted tools read
            (the cohort root, the whole-world manifest, the evidence world/source
            root/projection, the R1-only packet world, and the durable guard,
            checkpoint, restore, ledger and detector-sidecar paths inside this run's
            own declared DSH home), and the launcher composes the review task from
            the declared prompt/issue/cohort inputs and fails closed before any
            provider call when a binding is missing or names another world."""),
    },
)
