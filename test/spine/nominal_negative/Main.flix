use Attune.Envelope.{FileId, Frontier, World}

/// The compiler negative fixture.
///
/// A `FileId` cannot inhabit the Symbols domain, so the pinned compiler must
/// reject this program before it can ever run. The `flix_reject` action records
/// the diagnostic and fails unless the rejection is real.
def main(): Unit \ IO = {
    let world = World.World("w1");
    let invalid = Frontier.Symbols(world, Set#{FileId.FileId("a.flix")});
    println(invalid)
}
