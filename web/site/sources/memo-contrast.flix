// Website teaching contrast. Calls the current Attune lookup; no model or extraction.
// Both import facts occur in the checked Ruby shop correspondence fixture.
mod MemoContrast {
    @Test
    def sameAnswerIsNotTheSameQuestion(): Unit \ Assert = {
        let world = Attune.World.World("shop-v1");
        let receipt = Attune.files(world, List#{"shop/receipt.rb"});
        let checkout = Attune.files(world, List#{"shop/checkout.rb"});
        let pricing = Attune.files(world, List#{"shop/pricing.rb"});
        let render = Attune.symbols(world, List#{"Shop.Receipt.render"});
        let facts = List#{
            {world = world, source = "Shop.Receipt.render", atom = Attune.Atom.DefinedIn, target = "shop/receipt.rb"},
            {world = world, source = "shop/receipt.rb", atom = Attune.Atom.Imports, target = "shop/pricing.rb"},
            {world = world, source = "shop/checkout.rb", atom = Attune.Atom.Imports, target = "shop/pricing.rb"}
        };
        // A starts at a symbol, finds its file, then computes that file's imports.
        let (_, m1, _, n1) = Attune.lookup(Nil, 3, "demo", render, Attune.Atom.DefinedIn, facts);
        let (a, saved, workA, next) = Attune.lookup(m1, n1, "demo", receipt, Attune.Atom.Imports, facts);
        // B has two alternatives. Same input reuses; a different file computes.
        let (same, _, sameWork, _) = Attune.lookup(saved, next, "demo", receipt, Attune.Atom.Imports, facts);
        let (different, _, differentWork, _) = Attune.lookup(saved, next, "demo", checkout, Attune.Atom.Imports, facts);
        Assert.assertEq(expected = Ok(pricing), a);
        Assert.assertEq(expected = a, same);
        Assert.assertEq(expected = a, different);
        Assert.assertEq(expected = List#{Attune.Lookup.Miss(4)}, workA);
        Assert.assertEq(expected = List#{Attune.Lookup.Hit(4)}, sameWork);
        Assert.assertEq(expected = List#{Attune.Lookup.Miss(5)}, differentWork)
    }
}
