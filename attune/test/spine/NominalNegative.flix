use Attune.Envelope.{FileId, Frontier, World}

/// The compiler negative fixture.
///
/// A `FileId` cannot inhabit the Symbols domain, so the pinned compiler must
/// reject this program during `check`, before it can ever run. No `main` is
/// required: the isolated check target only records the rejection and its
/// diagnostic.
@Test
def nominalNegative(): Unit \ Assert = {
    let world = World.World("w1");
    let invalid = Frontier.Symbols(world, Set#{FileId.FileId("a.flix")});
    Assert.assertEq(expected = invalid, invalid)
}
