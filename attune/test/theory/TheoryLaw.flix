use Attune.{Atom, FileId, World}
use Attune.Theory

def world(): World = Attune.worldId({origin = "shop", content = "source-1", semantics = "ruby-1"})

def facts(): List[Attune.Fact] = List#{
    {world = world(), source = "checkout.rb", atom = Atom.Imports, target = "pricing.rb"},
    {world = world(), source = "receipt.rb", atom = Atom.Imports, target = "pricing.rb"},
    {world = world(), source = "pricing.rb", atom = Atom.Defines, target = "total"},
    {world = world(), source = "total", atom = Atom.DefinedIn, target = "pricing.rb"}
}

@Test
def twoImportsJoinOnTheSameDependency(): Unit \ Assert =
    Assert.assertEq(expected = Ok(List#{
        (FileId.FileId("checkout.rb"), FileId.FileId("receipt.rb"), FileId.FileId("pricing.rb")),
        (FileId.FileId("receipt.rb"), FileId.FileId("checkout.rb"), FileId.FileId("pricing.rb"))
    }), Theory.sharedImports({world = world(), facts = facts()}))

@Test
def oneFileCannotOccupyBothRoles(): Unit \ Assert = {
    Assert.assertEq(expected = Ok(Nil), Theory.sharedImports({world = world(), facts = List.take(1, facts())}));
    Assert.assertEq(expected = Ok(Nil), Theory.sharedImports({world = world(), facts = Nil}))
}

@Test
def foreignWorldsNeverJoin(): Unit \ Assert =
    Assert.assertErr(Theory.sharedImports({world = World.World("other"), facts = facts()}))

@Test
def routesReadLeftToRight(): Unit \ Assert = {
    let start = Attune.files(world(), List#{"receipt.rb"});
    Assert.assertEq(expected = Ok(Attune.symbols(world(), List#{"total"})),
        Theory.follow(facts(), start, List#{Atom.Imports, Atom.Defines}));
    Assert.assertErr(Theory.follow(facts(), start, List#{Atom.Calls}));
    Assert.assertEq(expected = Ok(Attune.files(world(), Nil)),
        Theory.follow(facts(), start, List#{Atom.ImportedBy}))
}

@Test
def descriptionsIgnoreFactOrderButKeepExactAnswers(): Unit \ Assert = {
    let start = Attune.files(world(), List#{"receipt.rb"});
    let questions = List#{List#{Atom.Imports}, List#{Atom.Imports, Atom.Defines}};
    Assert.assertEq(expected = Theory.describe(facts(), start, questions),
        Theory.describe(List.reverse(facts()), start, questions));
    Assert.assertEq(expected = false,
        Theory.describe(facts(), start, questions) == Theory.describe(Nil, start, questions))
}

@Test
def finiteRoutesCanVisitACycleWithoutSearchingForever(): Unit \ Assert =
    Assert.assertEq(expected = Ok(Attune.symbols(world(), List#{"total"})),
        Theory.follow(facts(), Attune.symbols(world(), List#{"total"}),
            List#{Atom.DefinedIn, Atom.Defines, Atom.DefinedIn, Atom.Defines}))

@Test
def oversizedPanelsAreRejected(): Unit \ Assert =
    Assert.assertErr(Theory.describe(facts(), Attune.files(world(), Nil), List.repeat(65, Nil)))
