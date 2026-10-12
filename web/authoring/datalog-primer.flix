// Teaching harness around the exact current ReadmeCorrespondence pairRules.
// The two facts below are the shop fixture's expected admitted imports.
// This harness does not run Grit or reproduce the benchmark.
def pairRules(): #{
    Imports(String, String, String),
    Pair(String, String, String, String)
} = #{
    Pair(s, a, b, center) :-
        Imports(s, a, center),
        Imports(s, b, center),
        if (a != b).
}

def shopFacts(): #{ Imports(String, String, String), Pair(String, String, String, String) } = #{
    Imports("shop-v1", "shop/checkout.rb", "shop/pricing.rb").
    Imports("shop-v1", "shop/receipt.rb", "shop/pricing.rb").
}

def shopPairs(): Vector[(String, String)] = {
    let facts = shopFacts();
    let center = "shop/pricing.rb";
    let rows = query facts, pairRules() select (a, b) from Pair("shop-v1", a, b, center);
    rows
}

@Test
def exactlyTwoOrderedPairs(): Unit \ Assert =
    Assert.assertEq(expected = Set#{("shop/checkout.rb", "shop/receipt.rb"),
        ("shop/receipt.rb", "shop/checkout.rb")}, Vector.toSet(shopPairs()))

@Test
def oneImporterCannotPairWithItself(): Unit \ Assert = {
    let facts = #{ Imports("one", "receipt.rb", "pricing.rb"). };
    let rows = query facts, pairRules() select (a, b) from Pair("one", a, b, "pricing.rb");
    Assert.assertEq(expected = true, Vector.isEmpty(rows))
}

// Separate authored recursion example. These are teaching paths, not a source world.
def reachable(): Vector[(String, String)] = {
    let facts = #{ Imports("screen", "format"). Imports("format", "units"). };
    let rules = #{
        Reaches(a, b) :- Imports(a, b).
        Reaches(a, c) :- Reaches(a, b), Imports(b, c).
    };
    query facts, rules select (a, b) from Reaches(a, b)
}

@Test
def recursionAddsTheIndirectConnection(): Unit \ Assert =
    Assert.assertEq(expected = Set#{("screen", "format"), ("format", "units"),
        ("screen", "units")}, Vector.toSet(reachable()))
