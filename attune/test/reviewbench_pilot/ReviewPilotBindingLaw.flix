use Attune.Study.ReviewPilot
use Attune.Study.ReviewPilotBinding

/// The corpus-free laws of the appended prospective pilot source-binding
/// declaration (`VAL-STUDY-002`, `VAL-STUDY-010`).
///
/// They drive the exact production binding identities and invariants over the
/// pure declaration. No corpus, no network, no golden finding and no provider is
/// touched, so the ordinary gate runs them.

def invariantOf(name: String): Bool =
    match List.find(entry -> match entry { case (key, _) => key == name },
        ReviewPilotBinding.bindingInvariants()) {
        case Some((_, holds)) => holds
        case None             => false
    }

@Test
def theBindingIsSeparatelyVersionedAndAppendedWithoutRedefiningTheProtocol(): Unit \ Assert = {
    // The appended record is a SEPARATE version from the immutable 1143bc2 protocol
    // record, so it can never be read as a retro-definition of it.
    Assert.assertEq(expected = true,
        ReviewPilotBinding.bindingIdentity() != ReviewPilot.protocolIdentity());
    Assert.assertEq(expected = "reviewbench-pilot-source-binding-v1",
        ReviewPilotBinding.bindingIdentity());
    Assert.assertEq(expected = true, ReviewPilotBinding.bindingHolds());
    // Every declared invariant holds, individually.
    Assert.assertEq(expected = true,
        List.forAll(entry -> match entry { case (_, holds) => holds },
            ReviewPilotBinding.bindingInvariants()))
}

@Test
def theSharedPlainFacadeIsIdenticalInBothArmsAndOnlyR1AddsThePacket(): Unit \ Assert = {
    // Both initial arms mount the SAME shared plain facade.
    Assert.assertEq(expected = true,
        ReviewPilotBinding.armMountsPlainFacade(ReviewPilot.Arm.R0Plain));
    Assert.assertEq(expected = true,
        ReviewPilotBinding.armMountsPlainFacade(ReviewPilot.Arm.R1Packets));
    // The packet operation is the SOLE arm difference: R0 carries no packet and
    // R1 adds the corrected source-bearing packet on top of the same plain rights.
    Assert.assertEq(expected = false, ReviewPilotBinding.armMountsPacket(ReviewPilot.Arm.R0Plain));
    Assert.assertEq(expected = true, ReviewPilotBinding.armMountsPacket(ReviewPilot.Arm.R1Packets));
    Assert.assertEq(expected = true,
        ReviewPilotBinding.armOperations(ReviewPilot.Arm.R0Plain)
            == ReviewPilotBinding.plainFacadeToolName() :: ReviewPilotBinding.candidateCommitToolName() :: Nil);
    Assert.assertEq(expected = true,
        ReviewPilotBinding.armOperations(ReviewPilot.Arm.R1Packets)
            == ReviewPilotBinding.plainFacadeToolName() :: ReviewPilotBinding.packetToolName()
                :: ReviewPilotBinding.candidateCommitToolName() :: Nil);
    // The packet protocol is separately named from the ordinary arm protocol.
    Assert.assertEq(expected = ReviewPilot.correctedPacketProtocolIdentity(),
        ReviewPilotBinding.packetProtocolIdentity());
    // The three declared plain operations are exactly list / read / whole-file.
    Assert.assertEq(expected = "list" :: "read" :: "whole-file" :: Nil,
        ReviewPilotBinding.plainFacadeOperations())
}

@Test
def nativeFilesystemAndShellAreNotSelectedAndTheReviewerCannotBypassTheArtifacts(): Unit \ Assert = {
    Assert.assertEq(expected = false, ReviewPilotBinding.nativeFilesystemSelected());
    Assert.assertEq(expected = false, ReviewPilotBinding.shellSelected());
    // The reviewer profile disables every broad native surface the reviewer could
    // use to read the packet / evaluator / hidden-detector files directly.
    Assert.assertEq(expected = true,
        List.forAll(surface -> List.memberOf(surface, ReviewPilotBinding.disabledNativeSurfaces()),
            List#{"fs-read", "fs-write", "fs-edit", "glob", "grep", "bash"}))
}

@Test
def exactlyTwoDetectorFamiliesStayHiddenInBothArmsWithNoThirdAssistance(): Unit \ Assert = {
    Assert.assertEq(expected = 2, ReviewPilotBinding.detectorFamilyCount());
    Assert.assertEq(expected = "import-publication" :: "required-cli-input" :: Nil,
        ReviewPilotBinding.detectorFamilies());
    Assert.assertEq(expected = true, ReviewPilotBinding.detectorsModelHidden());
    Assert.assertEq(expected = false, ReviewPilotBinding.thirdHiddenAssistance());
    // The plain facade mounts no third model-facing assistance and the candidate
    // commit binds the REAL task world rather than a defaults fixture.
    Assert.assertEq(expected = true, ReviewPilotBinding.candidateCommitBindsRealWorld());
    Assert.assertEq(expected = true, ReviewPilotBinding.candidateCommitCommitsThenContinues());
    Assert.assertEq(expected = false, ReviewPilotBinding.outsideInitialRegionRejected())
}

@Test
def theRunIdentifiersAndPerTaskBindingsAreDeclared(): Unit \ Assert = {
    Assert.assertEq(expected = "ATTUNE_RUN_TASK", ReviewPilotBinding.runTaskEnv());
    Assert.assertEq(expected = "ATTUNE_RUN_ARM", ReviewPilotBinding.runArmEnv());
    Assert.assertEq(expected = "ATTUNE_RUN_OBSERVATION", ReviewPilotBinding.runObservationEnv());
    Assert.assertEq(expected = "DSH_TOOLS_MODE", ReviewPilotBinding.toolsModeEnv());
    Assert.assertEq(expected = "native", ReviewPilotBinding.toolsModeValue());
    // The per-task declared references are distinct, so the packet world is never
    // confused with the shared whole-world population.
    Assert.assertEq(expected = true,
        ReviewPilotBinding.perTaskWorldFiles("t") != ReviewPilotBinding.perTaskRegionManifest("t"));
    Assert.assertEq(expected = true,
        ReviewPilotBinding.perTaskRegionManifest("t") != ReviewPilotBinding.perTaskPacketProjection("t"));
    // The packet overlay is mounted only through the packet arm's declared list.
    Assert.assertEq(expected = false,
        List.memberOf(ReviewPilotBinding.packetOverlay(), ReviewPilotBinding.armOverlays(ReviewPilot.Arm.R0Plain)));
    Assert.assertEq(expected = true,
        List.memberOf(ReviewPilotBinding.packetOverlay(), ReviewPilotBinding.armOverlays(ReviewPilot.Arm.R1Packets)))
}

@Test
def theBindingInvariantsAreNamedSoTheRecordAndItsCheckAgree(): Unit \ Assert = {
    let names = List.map(entry -> match entry { case (name, _) => name },
        ReviewPilotBinding.bindingInvariants());
    Assert.assertEq(expected = true, List.memberOf("plain-facade-shared-both-arms", names));
    Assert.assertEq(expected = true, invariantOf("packet-only-on-packet-arm"));
    Assert.assertEq(expected = true, invariantOf("r1-adds-only-the-packet"));
    Assert.assertEq(expected = true, invariantOf("r0-carries-no-packet"));
    Assert.assertEq(expected = true, invariantOf("native-filesystem-not-selected"));
    Assert.assertEq(expected = true, invariantOf("shell-not-selected"));
    Assert.assertEq(expected = true, invariantOf("exactly-two-detectors"));
    Assert.assertEq(expected = true, invariantOf("commit-binds-real-world"));
    Assert.assertEq(expected = true, invariantOf("outside-region-not-rejected"));
    Assert.assertEq(expected = false, invariantOf("not-a-declared-invariant"))
}
