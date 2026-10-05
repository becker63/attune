use Attune.{Atom, Fact, Frontier, World}

/// Native `@Test` laws for the measured local exact memo (VAL-CORE-003).
///
/// The same evaluator runs enabled and disabled over one declared serial fixture
/// with repeated exact lookups, a legal empty reuse, equal-output/different-input
/// lookups and a cross-world lookup. The key is the world/semantic namespace, the
/// exact typed input frontier and the next atom; the value keeps the exact output
/// frontier. The recorded events are the real lookups, so the hit and miss counts
/// and the producer order are not fabricated.

def w(): World = World.World("shop-v1")

def w2(): World = World.World("shop-v2")

def fact(source: String, atom: Atom, target: String): Fact =
    { world = w(), source = source, atom = atom, target = target }

def facts(): List[Fact] = List#{
    fact("Shop.Receipt.render", Atom.DefinedIn, "shop/receipt.rb"),
    fact("shop/receipt.rb", Atom.Imports, "shop/pricing.rb")
}

def files(names: List[String]): Frontier = Attune.files(w(), names)

def files2(names: List[String]): Frontier = Attune.files(w2(), names)

def symbols(names: List[String]): Frontier = Attune.symbols(w(), names)

def lookupAt(memo: Attune.Memo, next: Int32, input: Frontier, atom: Atom): (Result[String, Frontier], Attune.Memo, List[Attune.Lookup], Int32) =
    Attune.lookup(memo, next, "demo", input, atom, facts())

/// The declared serial run: five cold lookups, one empty reuse and one repeated
/// producer reuse. The events, the ordinals and the answers are all checked.
@Test
def theSerialFixtureRecordsExactHitsAndMisses(): Unit \ Assert = {
    let (a1, m1, e1, n1) = lookupAt(Nil, 0, symbols(List#{"Shop.Receipt.render"}), Atom.DefinedIn);
    let (a2, m2, e2, n2) = lookupAt(m1, n1, files(List#{"shop/receipt.rb"}), Atom.Imports);
    let (a3, m3, e3, n3) = lookupAt(m2, n2, files(List#{"shop/pricing.rb"}), Atom.Imports);
    let (a4, m4, e4, n4) = lookupAt(m3, n3, files(List#{"shop/pricing.rb"}), Atom.Imports);
    let (a5, m5, e5, n5) = lookupAt(m4, n4, symbols(List#{"Shop.Receipt.render"}), Atom.DefinedIn);
    let (a6, m6, e6, n6) = lookupAt(m5, n5, files(List#{"shop/checkout.rb"}), Atom.Imports);
    let (a7, _, e7, _) = Attune.lookup(m6, n6, "demo", files2(List#{"shop/pricing.rb"}), Atom.Imports, Nil);
    let events = e1 ::: e2 ::: e3 ::: e4 ::: e5 ::: e6 ::: e7;
    Assert.assertEq(expected = 5, Attune.misses(events));
    Assert.assertEq(expected = 2, Attune.hits(events));
    Assert.assertEq(expected = List#{
        Attune.Lookup.Miss(0), Attune.Lookup.Miss(1), Attune.Lookup.Miss(2),
        Attune.Lookup.Hit(2), Attune.Lookup.Hit(0), Attune.Lookup.Miss(3), Attune.Lookup.Miss(4)
    }, events);
    // Cached and uncached answers agree through the one evaluator.
    Assert.assertEq(expected = Attune.apply(facts(), symbols(List#{"Shop.Receipt.render"}), Atom.DefinedIn), a1);
    Assert.assertEq(expected = Attune.apply(facts(), files(List#{"shop/receipt.rb"}), Atom.Imports), a2);
    Assert.assertEq(expected = Attune.apply(facts(), files(List#{"shop/pricing.rb"}), Atom.Imports), a3);
    Assert.assertEq(expected = Attune.apply(facts(), files(List#{"shop/checkout.rb"}), Atom.Imports), a6);
    Assert.assertEq(expected = Attune.apply(Nil, files2(List#{"shop/pricing.rb"}), Atom.Imports), a7);
    // The repeated empty answer really hits the producer, and the repeated
    // non-empty answer really hits its own producer.
    Assert.assertEq(expected = Ok(files(Nil)), a3);
    Assert.assertEq(expected = a3, a4);
    Assert.assertEq(expected = a1, a5);
    // Equal outputs from unequal inputs and another world are not reuse.
    Assert.assertEq(expected = a3, a6);
    Assert.assertEq(expected = false, a3 == a7)
}
