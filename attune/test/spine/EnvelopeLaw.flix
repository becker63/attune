use Attune.{Atom, Domain, World}

/// Native `@Test` laws for the shared nominal envelope.
///
/// These run as native Flix tests through the pinned 0.76.1 engine, inside the
/// declared pinned user/network namespace. They check exact frontier identity
/// (world, domain and complete finite set) and the one shared atom vocabulary.
/// A failure here is a real assertion failure, not a swallowed log line.

@Test
def frontierIdentityIgnoresElementOrder(): Unit \ Assert = {
    let world = World.World("w1");
    let left = Attune.files(world, List#{"a.flix", "b.flix"});
    let right = Attune.files(world, List#{"b.flix", "a.flix"});
    Assert.assertEq(expected = left, right)
}

@Test
def anotherWorldOrSetIsNotTheSameFrontier(): Unit \ Assert = {
    let world = World.World("w1");
    let left = Attune.files(world, List#{"a.flix", "b.flix"});
    let otherWorld = Attune.files(World.World("w2"), List#{"a.flix", "b.flix"});
    let otherSet = Attune.files(world, List#{"a.flix"});
    Assert.assertEq(expected = false, left == otherWorld);
    Assert.assertEq(expected = false, left == otherSet)
}

@Test
def domainsStayDistinctAndNamed(): Unit \ Assert = {
    let world = World.World("w1");
    let files = Attune.files(world, List#{"a.flix"});
    let symbols = Attune.symbols(world, List#{"s"});
    Assert.assertEq(expected = "files", Attune.domainName(Attune.domainOf(files)));
    Assert.assertEq(expected = "symbols", Attune.domainName(Attune.domainOf(symbols)));
    Assert.assertEq(expected = Domain.Files, Attune.domainOf(files));
    Assert.assertEq(expected = Domain.Symbols, Attune.domainOf(symbols))
}

@Test
def atomsCarryTheirDeclaredDomains(): Unit \ Assert = {
    Assert.assertEq(expected = "imported_by", Attune.atomName(Atom.ImportedBy));
    Assert.assertEq(expected = "files", Attune.domainName(Attune.atomSource(Atom.Defines)));
    Assert.assertEq(expected = "symbols", Attune.domainName(Attune.atomTarget(Atom.Defines)));
    Assert.assertEq(expected = "symbols", Attune.domainName(Attune.atomSource(Atom.Callers)));
    Assert.assertEq(expected = "files", Attune.domainName(Attune.atomTarget(Atom.DefinedIn)))
}
