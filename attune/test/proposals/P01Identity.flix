use Attune.Envelope
use Attune.Envelope.{Domain, Frontier, World}
use Attune.View

/// P01 - world, entity and frontier identity.
///
/// Question. When do two frontiers name the same observation?
///
///   one observation = (world, domain, complete finite member set)
///
///   Files{w1,{a/pricing.rb,b/pricing.rb}}  == reordered set       same value
///   Files{w1,{a/pricing.rb,b/pricing.rb}}  != Files{w1,{a/pricing.rb}}  size alone
///   Files{w1,{a/pricing.rb}}               != Files{w1,{b/pricing.rb}}  same basename
///   Files{w1,{a.flix}}                     != Files{w2,{a.flix}}        other world
///   Files{w1,{a.flix}}                     != Symbols{w1,{a}}           other domain
///
/// Proposition. Identity is that exact triple. A member count, an insertion
/// order and a printed basename are presentation and never merge two distinct
/// observations.
///
/// Reused envelope. `Attune.Envelope` already defines `World`, `FileId`,
/// `SymbolId` and the domain-tagged `Frontier`, and the shared projection
/// `Attune.View.members` already reads a frontier without comparing two
/// domains. This proposal adds only the exact identity key and its laws, so
/// there is no second Atom/State schema and no new store.
///
/// Enforcement. Executed: every assertion below runs under the pinned native
/// test engine. The nominal separation (a `FileId` cannot enter the Symbols
/// constructor) is a compiler guarantee already demonstrated by
/// `//test/spine:nominal_negative_test`; nothing here is claimed static.
///
/// Open. Durable encoding, and whether extra identity witnesses earn their
/// complexity, stay undecided. `identityKey` is a canonical in-memory key, not
/// a storage format.

/// The exact identity key: world, domain and the complete member set in one
/// canonical order. Two frontiers share a key exactly when they are equal, so
/// the key introduces no identity of its own.
pub enum IdentityKey with Eq, ToString {
    case IdentityKey(World, Domain, List[String])
}

/// The identity key of one frontier, built from the shared projections only.
pub def identityKey(frontier: Frontier): IdentityKey =
    IdentityKey.IdentityKey(Envelope.worldOf(frontier), Envelope.domainOf(frontier),
        List.sort(View.members(frontier)))

/// A Files frontier of one world over exactly these paths.
def files(world: World, paths: List[String]): Frontier = Envelope.files(world, paths)

/// A Symbols frontier of one world over exactly these names.
def symbols(world: World, names: List[String]): Frontier = Envelope.symbols(world, names)

/// Reordering one exact set is the same observation.
@Test
def reorderingOneExactSetPreservesIdentity(): Unit \ Assert = {
    let world = World.World("shop-v1");
    let left = files(world, List#{"a/pricing.rb", "b/pricing.rb"});
    let right = files(world, List#{"b/pricing.rb", "a/pricing.rb"});
    Assert.assertEq(expected = left, right);
    Assert.assertEq(expected = identityKey(left), identityKey(right))
}

/// Equal size is not identity: two sets with the same cardinality stay distinct.
@Test
def equalSizedUnequalSetsDoNotMerge(): Unit \ Assert = {
    let world = World.World("shop-v1");
    let left = files(world, List#{"a.flix", "b.flix"});
    let right = files(world, List#{"a.flix", "c.flix"});
    Assert.assertEq(expected = 2, List.length(View.members(left)));
    Assert.assertEq(expected = 2, List.length(View.members(right)));
    Assert.assertEq(expected = false, left == right);
    Assert.assertEq(expected = false, identityKey(left) == identityKey(right))
}

/// A shared display basename does not merge two entities.
@Test
def equalBasenamesKeepDistinctIdentities(): Unit \ Assert = {
    let world = World.World("shop-v1");
    let left = files(world, List#{"a/pricing.rb"});
    let right = files(world, List#{"b/pricing.rb"});
    Assert.assertEq(expected = "Files{a/pricing.rb}", View.frontierLabel(left));
    Assert.assertEq(expected = "Files{b/pricing.rb}", View.frontierLabel(right));
    Assert.assertEq(expected = false, left == right)
}

/// Another world or another domain never merges with this one.
@Test
def anotherWorldOrDomainDoesNotMerge(): Unit \ Assert = {
    let w1 = World.World("shop-v1");
    let w2 = World.World("shop-v2");
    let here = files(w1, List#{"a.flix"});
    Assert.assertEq(expected = false, here == files(w2, List#{"a.flix"}));
    Assert.assertEq(expected = false, here == symbols(w1, List#{"a.flix"}));
    Assert.assertEq(expected = "files", Envelope.domainName(Envelope.domainOf(here)));
    Assert.assertEq(expected = "symbols", Envelope.domainName(Envelope.domainOf(symbols(w1, List#{"a.flix"}))))
}
