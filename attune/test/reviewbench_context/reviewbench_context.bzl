"""The declared ReviewBench shared-context graph (`VAL-REVIEW-002`).

The frozen 24-task cohort's structural admission is already measured: ten tasks
are admitted to the paired structural study and fourteen are named attrition.
This macro expands that verified admission into the shared-context graph the
paired review arms consume:

- `world_facts_<world>` acquires one exact world's (base or head) earned
  Repository facts once, from that world's real declared clean-source bytes,
  bounded to the world's changed first-party source. The declared world deadline
  is enforced by the action's own out-of-process timeout: Bazel kills a worker
  that exceeds it, and no in-process cancellation is claimed.
- `task_context_<task>` lowers one admitted task's head-world facts into its
  bounded public scoped relations and source witnesses through the shared
  `Attune.Theory` owner, once per exact world pair.
- `shared_context` reduces the already-materialized trees into the one declared
  context record and performs no acquisition at all, so it is a provider-free
  replay of the frozen context.

Every target is `manual`, so the ordinary `bazel test //...` gate never fetches a
world archive and never runs the pinned Grit engine.
"""

load(
    "//platform/build:native.bzl",
    "attune_declared_record_file",
    "native_flix_consumer_test",
    "native_flix_java_test",
    "native_study_stage",
)

# The verified structural admission of the frozen metadata-only cohort, as
# `(task key, PR number, repository NWO, language, split)` records. The key is the
# repository NWO with its path separator folded plus the PR number, which is
# exactly the canonical `WorldId` stem `Attune.Study.ReviewBench.worldId` derives.
# The cohort-bound audit re-reads the real measurement tree and refuses a record
# that the measured admission does not carry, so this declaration cannot drift
# from the verified admission.
CONTEXT_TASKS = [
    ("capawesome-team_cli-126", 126, "capawesome-team/cli", "TypeScript", "development"),
    ("heyitsaamir_teamscli-31", 31, "heyitsaamir/teamscli", "TypeScript", "development"),
    ("haoling_diary-notebook-blog-transformer-24", 24, "haoling/diary-notebook-blog-transformer", "TypeScript", "development"),
    ("caasi_town-zero-6", 6, "caasi/town-zero", "TypeScript", "development"),
    ("EdV4H_usketch-534", 534, "EdV4H/usketch", "TypeScript", "development"),
    ("rulecom_rule-io-sdk-40", 40, "rulecom/rule-io-sdk", "TypeScript", "final"),
    ("brianc_node-postgres-3650", 3650, "brianc/node-postgres", "JavaScript", "development"),
    ("agent-sh_agentsys-298", 298, "agent-sh/agentsys", "JavaScript", "development"),
    ("jenkinsci_gitea-plugin-141", 141, "jenkinsci/gitea-plugin", "Java", "calibration"),
    ("ls1intum_Artemis-12479", 12479, "ls1intum/Artemis", "Java", "calibration"),
]

def context_world_id(key, role):
    """The declared `WorldId` of one task's exported role."""
    return "%s-%s" % (key, role)

def attune_reviewbench_context(
        name,
        tasks,
        stage_srcs,
        java_deps,
        grit_libs,
        measure = "//test/reviewbench:reviewbench_measure",
        admission = "//test/reviewbench:reviewbench_admission",
        world_repo = "@reviewbench_worlds",
        qwen_repo = "@reviewbench_qwen_fixtures",
        jev_repo = "@reviewbench_jev_observed",
        law_srcs = None,
        audit_srcs = None):
    """Expand the verified structural admission into the shared-context graph.

    Args:
      name: the graph name; it also names the one aggregate context target.
      tasks: the verified admitted records, as `attune` triples.
      stage_srcs: the explicit Flix sources every declared stage compiles.
      java_deps: the explicit dependency jars every stage compiles against.
      grit_libs: the prepared pinned Grit shared library the extraction loads.
      measure: the admitted real measurement tree the changed-file records are read from.
      admission: the admitted real projection tree the public issue text is read from.
      world_repo: the declared acquisition repository of the world archives.
      qwen_repo: the declared admission repository of the hosted-Qwen fixtures.
      jev_repo: the declared admission repository of the sanitized native JEV observations.
      law_srcs: the explicit Flix sources of the corpus-free context laws.
      audit_srcs: the explicit Flix sources of the corpus-bound context audit.
    """
    world_targets = []
    world_bindings = []
    task_targets = []
    task_bindings = []
    qwen_sources = [qwen_repo + "//:queries"]

    for (key, pr, _nwo, _language, _split) in tasks:
        for role in ("base", "head"):
            world_id = context_world_id(key, role)
            attune_declared_record_file(
                name = "worlddecl_%s" % world_id,
                kind = "world",
                fields = [world_id, key, str(pr), role],
            )
            native_study_stage(
                name = "world_facts_%s" % world_id,
                stage = "reviewbench_world_facts",
                srcs = stage_srcs,
                inputs = [":worlddecl_%s" % world_id, measure],
                input_names = ["world", "changed"],
                java_deps = java_deps,
                native_libs = grit_libs,
                world_sources = ["%s//:%s" % (world_repo, world_id)],
                tags = ["manual"],
                deadline_seconds = 120,
            )
            world_targets.append(":world_facts_%s" % world_id)
            world_bindings.append("world_%s" % world_id)

        native_study_stage(
            name = "task_context_%s" % key,
            stage = "reviewbench_task_context",
            srcs = stage_srcs,
            inputs = [
                ":worlddecl_%s" % context_world_id(key, "head"),
                ":world_facts_%s" % context_world_id(key, "base"),
                ":world_facts_%s" % context_world_id(key, "head"),
            ],
            input_names = ["world", "basefacts", "headfacts"],
            java_deps = java_deps,
            tags = ["manual"],
        )
        task_targets.append(":task_context_%s" % key)
        task_bindings.append("task_%s" % key)
        qwen_sources.append("%s//:code_%s" % (qwen_repo, key))

    native_study_stage(
        name = name,
        stage = "reviewbench_shared_context",
        srcs = stage_srcs,
        inputs = world_targets + task_targets,
        input_names = world_bindings + task_bindings,
        java_deps = java_deps,
        tags = ["manual"],
    )

    # The combined hosted-Qwen assisted context (`VAL-REVIEW-002`): one bounded
    # reduction of the admitted immutable hosted fixtures into the per-task cosine
    # ranking of the admitted changed-source candidates against the task's public
    # issue. It consumes the declared fixture admission only, so it runs no model,
    # calls no provider and re-executes no world extraction or Theory lowering.
    native_study_stage(
        name = name + "_qwen",
        stage = "reviewbench_qwen_context",
        srcs = stage_srcs,
        java_deps = java_deps,
        world_sources = qwen_sources,
        tags = ["manual"],
    )

    # The declared native JEV public-context memo (`VAL-REVIEW-002`, owner
    # decision 2026-10-08). The request stage is provider-free: it builds the
    # exact assisted-context payloads from the materialized task contexts, the
    # materialized hosted-Qwen ranking and the admitted public projection, and it
    # writes the exact memo identity of every logical decision. The context stage
    # reduces the sanitized observations the NATIVE Java OpenRouter Decisions
    # boundary wrote OUTSIDE the mutable Bazel outputs; it makes no provider call,
    # so a replay of the JEV context is free.
    native_study_stage(
        name = name + "_jev_requests",
        stage = "reviewbench_jev_requests",
        srcs = stage_srcs,
        inputs = [":" + name + "_qwen", admission] + task_targets,
        input_names = ["qwen", "admission"] + task_bindings,
        java_deps = java_deps,
        tags = ["manual"],
    )

    native_study_stage(
        name = name + "_jev_context",
        stage = "reviewbench_jev_context",
        srcs = stage_srcs,
        inputs = [":" + name + "_jev_requests", jev_repo + "//:observed"],
        input_names = ["requests", "observed"],
        java_deps = java_deps,
        tags = ["manual"],
    )

    if law_srcs:
        # The corpus-free context laws are pure, so the ordinary offline gate
        # runs them; no world, no archive and no Grit program is touched. The
        # pinned Grit jar is on the class path only because the frontend language
        # table's parent module is compiled.
        native_flix_java_test(
            name = "%s_law" % name,
            srcs = law_srcs,
            java_deps = java_deps,
        )

    if audit_srcs:
        # The corpus-bound audit reads the real materialized context trees and
        # refuses a record outside the declared contract. `manual`, so the gate
        # never runs it. Its laws import the shared `Attune.Study.ReviewBench`
        # owner, which reaches the pinned Grit seam through `Attune.Repository`,
        # so the audit compiles through the same explicit JVM class path route.
        native_flix_consumer_test(
            name = "%s_audit" % name,
            srcs = audit_srcs,
            produced = [":" + name] + world_targets + task_targets + [":" + name + "_jev_context"],
            java_deps = java_deps,
            tags = ["manual"],
        )
