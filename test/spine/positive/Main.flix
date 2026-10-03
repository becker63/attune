use Attune.Envelope.{Atom, World}

/// The spine's positive fixture.
///
/// It is compiled with the pinned `build-fatjar` in a prerequisite action and
/// then executed as a standalone JVM inside the isolated namespace. It checks
/// exact frontier identity (world, domain and complete finite set) and the one
/// shared atom vocabulary. A failure here is a real assertion failure, not a
/// swallowed log line.
def main(): Unit \ {IO, Assert} = {
    let world = World.World("w1");
    let left = Attune.Envelope.files(world, List#{"a.flix", "b.flix"});
    let right = Attune.Envelope.files(world, List#{"b.flix", "a.flix"});
    Assert.assertEq(expected = left, right);

    // A different world or a different element set is not the same frontier.
    let otherWorld = Attune.Envelope.files(World.World("w2"), List#{"a.flix", "b.flix"});
    Assert.assertEq(expected = false, left == otherWorld);

    // Domains stay distinct and named through the single vocabulary.
    Assert.assertEq(expected = "files", Attune.Envelope.domainName(Attune.Envelope.domainOf(left)));
    let symbols = Attune.Envelope.symbols(world, List#{"s"});
    Assert.assertEq(expected = "symbols", Attune.Envelope.domainName(Attune.Envelope.domainOf(symbols)));

    // The six directed atoms carry their declared source and target domains.
    Assert.assertEq(expected = "imported_by", Attune.Envelope.atomName(Atom.ImportedBy));
    Assert.assertEq(expected = "files", Attune.Envelope.domainName(Attune.Envelope.atomSource(Atom.Defines)));
    Assert.assertEq(expected = "symbols", Attune.Envelope.domainName(Attune.Envelope.atomTarget(Atom.Defines)));
    Assert.assertEq(expected = "symbols", Attune.Envelope.domainName(Attune.Envelope.atomSource(Atom.Callers)));

    println("spine-positive-ok")
}
