"""The declared per-task / per-arm runner of the gated ReviewBench pilot.

ONE declared DSH action per (task, arm) of the frozen balanced dispatch: the ten
original admitted tasks x the two initial arms (`R0_PLAIN`, `R1_PACKETS`) = the
twenty once-only observations. Each target declares its OWN run identity, its OWN
per-task world binding and its OWN overlay set, so no observation can inherit
another task's world or another arm's operations:

  - BOTH arms mount the shared bounded plain-read facade (`attune_source_read`),
    the shared candidate-commit operation and the two model-hidden detector
    families, plus the mechanical lifecycle guard;
  - ONLY the packet arm additionally mounts the R1-only progressive packet
    operation (`attune_packet_operation`), which is the sole arm difference in
    source access;
  - both arms carry the identical caps and the identical declared provider route.

The macro decides no science: the arm identities, the dispatch order and the
observation numbers are the frozen `Attune.Study.ReviewPilot` record, and the
per-task world references are the declared names of
`Attune.Study.ReviewPilotBinding`. The action itself is the existing
`dsh_agent_run` rule, so it is the same hermetic DSH launcher, the same declared
platform and the same credential exchange as every other run of this adapter.
"""

load("//platform/dsh:dsh_agent.bzl", "dsh_agent_run")

# The ten original admitted tasks, in the exact order of the frozen balanced
# deterministic dispatch (`pilot-dispatch.tsv`): each task's `R0_PLAIN` then
# `R1_PACKETS`, and no task is repeated.
PILOT_TASKS = [
    "EdV4H_usketch-534",
    "agent-sh_agentsys-298",
    "brianc_node-postgres-3650",
    "caasi_town-zero-6",
    "capawesome-team_cli-126",
    "haoling_diary-notebook-blog-transformer-24",
    "heyitsaamir_teamscli-31",
    "jenkinsci_gitea-plugin-141",
    "ls1intum_Artemis-12479",
    "rulecom_rule-io-sdk-40",
]

def pilot_runner_target_name(task, arm):
    return "reviewbench_pilot__%s_%s" % (task, arm.lower())

def attune_pilot_runners(
        name,
        prompt,
        issues,
        cohort,
        world_repo,
        routes,
        common_overlays,
        packet_overlay):
    """Declare the twenty once-only pilot observations as ONE filegroup.

    Args:
      name: the aggregating filegroup name; each target is
        `reviewbench_pilot__<task>_<arm>`.
      prompt: the frozen review prompt of the pilot (the byte-exact prefix of
        every composed observation).
      issues: the admitted public issue tree (`issues.tsv`).
      cohort: the declared admitted cohort tree carrying every task's world
        records, sealed changed bytes and compiled packet projection.
      world_repo: the declared digest-verified source-archive repository of the
        task worlds (both revisions).
      routes: the declared provider route patch of the pilot.
      common_overlays: the overlays BOTH arms mount.
      packet_overlay: the ONE overlay only the packet arm mounts.
    """
    targets = []
    observation = 1
    for task in PILOT_TASKS:
        for arm in ("R0_PLAIN", "R1_PACKETS"):
            observation += 1
            overlays = list(common_overlays)
            if arm == "R1_PACKETS":
                overlays.append(packet_overlay)
            target = pilot_runner_target_name(task, arm)
            dsh_agent_run(
                name = target,
                agent_env = {
                    "ATTUNE_RUN_TASK": task,
                    "ATTUNE_RUN_ARM": arm,
                    "ATTUNE_RUN_OBSERVATION": str(observation),
                    "DSH_TOOLS_MODE": "native",
                },
                data = [cohort],
                pilot = True,
                pilot_cohort = cohort,
                pilot_issues = issues,
                pilot_prompt = prompt,
                plugin_patches = overlays,
                routes = routes,
                tags = ["manual"],
                # The launcher REPLACES this one positional argument with the
                # composed review task of the observation (see
                # `platform/dsh/pilot_task.mjs`); it is never sent verbatim.
                task = "PILOT-TASK-COMPOSED-AT-RUN-TIME",
                world_archives = [
                    "%s//:%s-base" % (world_repo, task),
                    "%s//:%s-head" % (world_repo, task),
                ],
            )
            targets.append(":" + target)
    native.filegroup(name = name, srcs = targets)
