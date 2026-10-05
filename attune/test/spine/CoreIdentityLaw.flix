use Attune.Envelope
use Attune.Envelope.{World, WorldId}

/// Native `@Test` laws for exact nominal identity (VAL-CORE-001).
///
/// A frontier is identified by its world, its nominal domain and its complete
/// finite member set. Reordering one exact set is the same observation, but an
/// equal cardinality, a shared display basename, another world or another domain
/// is a different one. World identity carries the canonical origin, the exact
/// content/source epoch and the frontend/admission semantics, so dirty content
/// cannot reuse a clean world's identity. A failure here is a real assertion
/// failure, not a swallowed log line.

/// Reordering one exact finite set is the same observation.
@Test
def reorderingOneExactSetPreservesIdentity(): Unit \ Assert = {
    let world = World.World("shop-v1");
    Assert.assertEq(
        expected = Envelope.files(world, List#{"a/pricing.rb", "b/pricing.rb"}),
        Envelope.files(world, List#{"b/pricing.rb", "a/pricing.rb"}))
}

/// Equal size is not identity: two sets with the same cardinality stay distinct.
@Test
def equalSizedUnequalSetsDoNotMerge(): Unit \ Assert = {
    let world = World.World("shop-v1");
    Assert.assertEq(expected = false,
        Envelope.files(world, List#{"a.flix", "b.flix"}) == Envelope.files(world, List#{"a.flix", "c.flix"}))
}

/// A shared display basename does not merge two entities.
@Test
def sameBasenamesAtDifferentPathsStayDistinct(): Unit \ Assert = {
    let world = World.World("shop-v1");
    Assert.assertEq(expected = false,
        Envelope.files(world, List#{"a/pricing.rb"}) == Envelope.files(world, List#{"b/pricing.rb"}))
}

/// Same-name declarations with different qualifications stay distinct, and the
/// nominal domains never merge.
@Test
def qualificationsAndDomainsStayDistinct(): Unit \ Assert = {
    let world = World.World("shop-v1");
    Assert.assertEq(expected = false,
        Envelope.symbols(world, List#{"A.render"}) == Envelope.symbols(world, List#{"B.render"}));
    Assert.assertEq(expected = false,
        Envelope.symbols(world, List#{"render"}) == Envelope.symbols(world, List#{"A.render"}));
    Assert.assertEq(expected = false,
        Envelope.files(world, List#{"x"}) == Envelope.symbols(world, List#{"x"}))
}

/// World identity carries origin, exact content epoch and semantics, so a dirty
/// content or a changed semantic recipe never reuses a clean world's identity.
@Test
def worldIdentityIncludesContentAndSemantics(): Unit \ Assert = {
    let clean = Envelope.worldId({ origin = "repo", content = "clean", semantics = "v1" });
    let same = Envelope.worldId({ origin = "repo", content = "clean", semantics = "v1" });
    let dirty = Envelope.worldId({ origin = "repo", content = "dirty", semantics = "v1" });
    let other = Envelope.worldId({ origin = "repo", content = "clean", semantics = "v2" });
    let fork = Envelope.worldId({ origin = "fork", content = "clean", semantics = "v1" });
    Assert.assertEq(expected = true, clean == same);
    Assert.assertEq(expected = false, clean == dirty);
    Assert.assertEq(expected = false, clean == other);
    Assert.assertEq(expected = false, clean == fork)
}
