use Attune.Envelope.{Frontier, SymbolId, World}

/// Isolated compiler negative cited by P02.
///
/// A frontier constructor fixes its member domain: `Frontier.Files` carries a
/// `Set[FileId]`, so a `SymbolId` cannot inhabit it. The pinned compiler must
/// reject this program during `check`, which is the one static domain witness
/// P02 relies on. The sequencing check in `P02Composition.flix` is runtime and
/// is labeled as such; this file exists only to be rejected.
@Test
def domainWitnessNegative(): Unit \ Assert = {
    let world = World.World("shop-v1");
    let invalid = Frontier.Files(world, Set#{SymbolId.SymbolId("Receipt.render")});
    Assert.assertEq(expected = invalid, invalid)
}
