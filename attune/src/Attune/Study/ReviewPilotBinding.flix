///
/// The Study-owned prospective ReviewBench pilot SOURCE-ACCESS / TOOL-MOUNT /
/// TASK-BINDING declaration (`VAL-STUDY-002`, `VAL-STUDY-010`, `VAL-CROSS-001`).
///
/// This module states the ONE separately versioned binding identity the pilot
/// freezes BEFORE any outcome, APPENDED alongside the immutable `1143bc2` freeze
/// record (it never retro-defines it). The user approved the AskUser option
/// "Bounded plain-read interface (recommended)" on 2026-10-09:
///
///  - ONE shared bounded plain-read facade is mounted in BOTH arms (R0 and R1):
///    a bounded `list` / `read` / `whole-file` interface over the existing
///    sealed `packet_boundary` bytes, digest-verified and lossless, with explicit
///    omitted bytes and a continuation, exposing the COMPLETE authorized
///    population of every task;
///  - R1 mounts the SAME ordinary plain rights PLUS its R1-only progressive packet
///    operation; that packet operation is the ONLY arm difference in source access;
///  - native filesystem and shell source access are NOT selected, and the reviewer
///    profile disables them so the reviewer cannot bypass the packet / evaluator /
///    hidden-detector files by reading them directly;
///  - exactly the two detector families stay hidden plugin artifacts (sidecars) in
///    BOTH arms, never tool results, with no third hidden model-facing assistance;
///  - both arms carry the explicit run identifiers/mode and the per-task declared
///    source roots / CAS bindings rather than a global host cache, and the
///    candidate-commit tool binds the REAL task source (never a defaults fixture
///    world) while an outside-initial-region candidate is never rejected for lack
///    of an initial compiled projection.
///
/// It owns declarations only: it selects no outcome, judges nothing, reads no
/// golden finding and calls no provider. Every value here is frozen before the
/// twenty once-only observations exist.
///
pub mod Attune.Study.ReviewPilotBinding {

    use Attune.Study.ReviewPilot

    /// The declared identity of this separately versioned binding record. It is
    /// distinct from every identity of the frozen `1143bc2` protocol record, so a
    /// reader can never conflate the appended binding with the immutable previous
    /// version.
    pub def bindingIdentity(): String = "reviewbench-pilot-source-binding-v1"

    /// The declared version of the appended record. It is a version string, not a
    /// requirement: it names which binding declaration this is.
    pub def bindingVersion(): String = "2026-10-09"

    // ------------------------------------------- corrected remaining binding

    /// The declared identity of the CORRECTED reviewer binding (pilot integrity
    /// recovery, approved 2026-10-10). It is a NEW, separately named version
    /// alongside `reviewbench-pilot-source-binding-v1`; the original record is
    /// never retro-defined, and the six attempted slots `obs-2..obs-7` keep the
    /// binding they actually ran under. The untouched `obs-8..obs-21` are the ONLY
    /// observations that use this version, so the twenty-slot cohort is honestly
    /// MIXED-VERSION rather than a clean contemporaneous pair.
    pub def correctedBindingIdentity(): String = "reviewbench-pilot-source-binding-v2"

    /// The implementation commit of the corrected binding. It is frozen BEFORE any
    /// of `obs-8..obs-21` produced an outcome, so the version a reader sees is the
    /// code that really ran the remaining observations.
    pub def correctedBindingCommit(): String = "d0b3094"

    /// The declared model-facing tool catalog of the corrected binding, measured
    /// provider-free on the REAL registered registry: the shared bounded plain-read
    /// facade and the shared candidate-commit operation in BOTH arms.
    pub def correctedSharedToolNames(): List[String] =
        "attune_source_read" :: "attune_commit_candidate" :: Nil

    /// The ONE tool the corrected binding adds on top of the shared pair, in the
    /// packet arm only.
    pub def correctedPacketToolNames(): List[String] = "attune_packet_operation" :: Nil

    /// The declared slots of each version: the six attempted slots ran the v1
    /// binding and are never re-dispatched; the fourteen untouched slots are the
    /// only dispatchable observations.
    pub def correctedBindingSlots(): List[String] = "obs-8..obs-21" :: Nil
    pub def originalBindingSlots(): List[String] = "obs-2..obs-7" :: Nil

    // ------------------------------------------------ shared plain-read facade

    /// The declared identity of the ONE shared bounded plain-read facade. It is
    /// mounted IDENTICALLY in both arms, so the ordinary source rights are the
    /// same in R0 and R1 and the only arm difference is R1's packet operation.
    pub def plainFacadeIdentity(): String = "reviewbench-shared-plain-read-facade-v1"

    /// The declared model-facing tool name of the shared facade.
    pub def plainFacadeToolName(): String = "attune_source_read"

    /// The declared operations of the shared facade.
    pub def plainFacadeOperations(): List[String] = "list" :: "read" :: "whole-file" :: Nil

    /// The declared identity of the complete-population discovery rule: the facade
    /// exposes the complete authorized population of both revisions through a
    /// bounded manifest listing, so an overflow file, an admitted
    /// unsupported-encoding file and an unexpected outside-initial-neighborhood
    /// file all stay reachable.
    pub def populationIdentity(): String = "reviewbench-complete-authorized-population-v1"

    /// The declared identity of the corrected source-bearing packet protocol R1
    /// adds on top of the shared facade.
    pub def packetProtocolIdentity(): String = ReviewPilot.correctedPacketProtocolIdentity()

    /// The declared model-facing tool name of the R1-only progressive packet.
    pub def packetToolName(): String = "attune_packet_operation"

    // ------------------------------------------------------ reviewer boundary

    /// The declared identity of the pilot-specific data-scoped reviewer launcher.
    pub def reviewerProfileIdentity(): String = "reviewbench-pilot-reviewer-profile-v1"

    /// The broad native surfaces the reviewer profile DISABLES, so the reviewer
    /// cannot bypass the packet / evaluator / hidden-detector files by reading them
    /// directly. No new shell sandbox or general command executor is built.
    pub def disabledNativeSurfaces(): List[String] = "fs-read" :: "fs-write" :: "fs-edit" :: "glob" :: "grep" :: "bash" :: Nil

    /// The declared selection state of the broad native filesystem and the shell:
    /// NEITHER is selected. Source is reachable ONLY through the shared facade and
    /// (in R1) the packet operation.
    pub def nativeFilesystemSelected(): Bool = false
    pub def shellSelected(): Bool = false

    // ------------------------------------------------------------ run identity

    /// The declared explicit run identifiers of both arms. Every arm sets all four
    /// so one run has one identity.
    pub def runTaskEnv(): String = "ATTUNE_RUN_TASK"
    pub def runArmEnv(): String = "ATTUNE_RUN_ARM"
    pub def runObservationEnv(): String = "ATTUNE_RUN_OBSERVATION"
    pub def toolsModeEnv(): String = "DSH_TOOLS_MODE"
    pub def toolsModeValue(): String = "native"

    /// The declared common overlays both arms mount: the mechanical lifecycle
    /// guard, the candidate-commit tool and the hidden-detector sidecar. Together
    /// with the shared plain facade they are the common substrate.
    pub def guardOverlay(): String = "platform/dsh/tool/attune-guard.plugin.yml"
    pub def commitOverlay(): String = "platform/dsh/tool/attune-tool.plugin.yml"
    pub def detectorOverlay(): String = "platform/dsh/tool/attune-detector.plugin.yml"
    pub def plainOverlay(): String = "platform/dsh/tool/attune-plain.plugin.yml"
    pub def packetOverlay(): String = "platform/dsh/tool/attune-packet.plugin.yml"

    /// The overlays both arms mount, in declared order. The packet overlay is NOT
    /// one of them: it is the sole R1 addition.
    pub def commonOverlays(): List[String] =
        guardOverlay() :: commitOverlay() :: detectorOverlay() :: plainOverlay() :: Nil

    // ------------------------------------------------------------ detector mount

    /// The declared detector mount identity: exactly the two detector families,
    /// model-hidden in BOTH arms, never tool results, with no direct run/file
    /// content exposure of a detector to the reviewer.
    pub def detectorMountIdentity(): String = "reviewbench-pilot-detectors-v1"

    /// The two and ONLY two detector families.
    pub def detectorFamilies(): List[String] = "import-publication" :: "required-cli-input" :: Nil

    pub def detectorFamilyCount(): Int32 = 2

    /// Both detector outputs are model-hidden in both arms, and no third hidden
    /// model-facing assistance is added.
    pub def detectorsModelHidden(): Bool = true
    pub def thirdHiddenAssistance(): Bool = false

    // ------------------------------------------------------- candidate commit

    /// The declared identity of the shared candidate-commit interface. It is the
    /// SAME operation in both arms.
    pub def candidateCommitIdentity(): String = "reviewbench-pilot-candidate-commit-v1"

    /// The declared model-facing tool name of the candidate commit.
    pub def candidateCommitToolName(): String = "attune_commit_candidate"

    /// The candidate-commit tool binds the REAL task source plus all available
    /// evidence, never the defaults fixture world or projection, and it commits
    /// then continues (no first-finding stop).
    pub def candidateCommitBindsRealWorld(): Bool = true
    pub def candidateCommitCommitsThenContinues(): Bool = true

    /// An outside-initial-region candidate is NEVER rejected merely because no
    /// initial compiled projection exists for it.
    pub def outsideInitialRegionRejected(): Bool = false

    // ------------------------------------------------- per-task declared bindings

    /// The declared per-task whole-world file manifest reference (the COMPLETE
    /// authorized population of both revisions), resolved per task under the
    /// declared cohort/source roots rather than a global host cache.
    pub def perTaskWorldFiles(task: String): String = "cohort-tool-" + task + "-world-files.tsv"

    /// The declared per-task region manifest reference (the sealed changed world).
    pub def perTaskRegionManifest(task: String): String = "cohort-tool-" + task + "-region-manifest.tsv"

    /// The declared per-task compiled packet projection reference (the R1 packet
    /// world). R0 never mounts it.
    pub def perTaskPacketProjection(task: String): String = "cohort-tool-" + task + "-packet-records.tsv"

    /// Whether one arm mounts the shared plain facade. BOTH arms do, so the
    /// ordinary source rights are identical and only R1's packet distinguishes them.
    pub def armMountsPlainFacade(arm: ReviewPilot.Arm): Bool = match arm { case _ => true }

    /// Whether one arm mounts the R1-only progressive packet operation. Only a
    /// packet arm does, and its progressive packet is the sole arm difference.
    pub def armMountsPacket(arm: ReviewPilot.Arm): Bool = ReviewPilot.armReceivesPackets(arm)

    /// The declared model-facing operation set of one arm, in declared order.
    pub def armOperations(arm: ReviewPilot.Arm): List[String] =
        if (armMountsPacket(arm))
            plainFacadeToolName() :: packetToolName() :: candidateCommitToolName() :: Nil
        else plainFacadeToolName() :: candidateCommitToolName() :: Nil

    /// The declared overlay list of one arm: the common overlays, plus the packet
    /// overlay only for a packet arm.
    pub def armOverlays(arm: ReviewPilot.Arm): List[String] =
        if (armMountsPacket(arm)) List.append(commonOverlays(), packetOverlay() :: Nil) else commonOverlays()

    // --------------------------------------------------------- frozen invariants

    /// The declared invariants of the binding, each as `(name, holds)`. The law
    /// and the stage both read these, so the binding record and its check agree.
    pub def bindingInvariants(): List[(String, Bool)] = List#{
        ("plain-facade-shared-both-arms", List.forAll(arm -> armMountsPlainFacade(arm), ReviewPilot.initialArms())),
        ("packet-only-on-packet-arm",
            not armMountsPacket(ReviewPilot.Arm.R0Plain) and armMountsPacket(ReviewPilot.Arm.R1Packets)),
        ("r1-adds-only-the-packet",
            armOperations(ReviewPilot.Arm.R1Packets) == plainFacadeToolName() :: packetToolName() :: candidateCommitToolName() :: Nil),
        ("r0-carries-no-packet", armOperations(ReviewPilot.Arm.R0Plain) == plainFacadeToolName() :: candidateCommitToolName() :: Nil),
        ("r0-overlays-exclude-packet", not List.memberOf(packetOverlay(), armOverlays(ReviewPilot.Arm.R0Plain))),
        ("native-filesystem-not-selected", not nativeFilesystemSelected()),
        ("shell-not-selected", not shellSelected()),
        ("complete-population-discoverable", true),
        ("detectors-hidden-both-arms", detectorsModelHidden()),
        ("exactly-two-detectors", detectorFamilyCount() == 2),
        ("no-third-hidden-assistance", not thirdHiddenAssistance()),
        ("commit-binds-real-world", candidateCommitBindsRealWorld()),
        ("commit-continues", candidateCommitCommitsThenContinues()),
        ("outside-region-not-rejected", not outsideInitialRegionRejected()),
        ("binding-distinct-from-protocol", bindingIdentity() != ReviewPilot.protocolIdentity()),
        ("packet-protocol-separately-named",
            packetProtocolIdentity() != ReviewPilot.ordinaryArmProtocolIdentity())
    }

    /// Whether every declared binding invariant holds.
    pub def bindingHolds(): Bool = List.forAll(invariant -> match invariant {
        case (_, holds) => holds
    }, bindingInvariants())

    /// The declared record rows of the binding: one `(group, key, value)` row per
    /// frozen identity. They are written before any review outcome and are never
    /// tuned afterwards.
    pub def bindingRows(): List[(String, String, String)] = List#{
        ("binding", "identity", bindingIdentity()),
        ("binding", "version", bindingVersion()),
        ("binding", "source-access", "bounded-plain-read-shared-both-arms"),
        ("plain-facade", "identity", plainFacadeIdentity()),
        ("plain-facade", "tool", plainFacadeToolName()),
        ("plain-facade", "operations", List.join(",", plainFacadeOperations())),
        ("plain-facade", "population", populationIdentity()),
        ("packet", "protocol", packetProtocolIdentity()),
        ("packet", "tool", packetToolName()),
        ("packet", "arms", "R1_PACKETS"),
        ("reviewer", "profile", reviewerProfileIdentity()),
        ("reviewer", "disabled-surfaces", List.join(",", disabledNativeSurfaces())),
        ("reviewer", "native-filesystem-selected", "false"),
        ("reviewer", "shell-selected", "false"),
        ("run", "task-env", runTaskEnv()),
        ("run", "arm-env", runArmEnv()),
        ("run", "observation-env", runObservationEnv()),
        ("run", "tools-mode-env", toolsModeEnv()),
        ("run", "tools-mode-value", toolsModeValue()),
        ("run", "common-overlays", List.join(",", commonOverlays())),
        ("run", "packet-overlay", packetOverlay()),
        ("detectors", "identity", detectorMountIdentity()),
        ("detectors", "families", List.join(",", detectorFamilies())),
        ("detectors", "model-hidden", "true"),
        ("detectors", "third-assistance", "false"),
        ("commit", "identity", candidateCommitIdentity()),
        ("commit", "tool", candidateCommitToolName()),
        ("commit", "binds-real-world", "true"),
        ("commit", "commits-then-continues", "true"),
        ("commit", "outside-region-rejected", "false"),
        ("binding", "appended-before", "any-review-outcome"),
        ("binding", "previous-version", "reviewbench-pilot-protocol-v1@1143bc2"),
        ("corrected-binding", "identity", correctedBindingIdentity()),
        ("corrected-binding", "implementation-commit", correctedBindingCommit()),
        ("corrected-binding", "frozen-before", "obs-8..obs-21-outcome"),
        ("corrected-binding", "slots", List.join(",", correctedBindingSlots())),
        ("corrected-binding", "shared-tools", List.join(",", correctedSharedToolNames())),
        ("corrected-binding", "packet-tools", List.join(",", correctedPacketToolNames())),
        ("original-binding", "identity", bindingIdentity()),
        ("original-binding", "slots", List.join(",", originalBindingSlots())),
        ("original-binding", "slot-state", "attempted-never-redispatched"),
        ("cohort", "version-mix", "mixed-version-6-original-14-corrected"),
        ("cohort", "paired-causal-estimate", "false")
    }
}
