use Attune.{Atom, Fact, Frontier, World}

/// Native `@Test` laws for the one exact six-atom application (VAL-CORE-002).
///
/// The same evaluator applies each of the six directed atoms to one exact
/// frontier against one world's facts. A legal route preserves the world and the
/// atom's declared target domain; a legal empty answer stays an empty frontier in
/// that domain rather than a rejection; an illegal domain composition or a
/// foreign-world fact is a classified rejection, never an empty success.

def w(): World = World.World("shop-v1")

def fact(source: String, atom: Atom, target: String): Fact =
    { world = w(), source = source, atom = atom, target = target }

def facts(): List[Fact] = List#{
    fact("shop/pricing.rb", Atom.Defines, "Pricing.total"),
    fact("Pricing.total", Atom.DefinedIn, "shop/pricing.rb"),
    fact("shop/receipt.rb", Atom.Imports, "shop/pricing.rb"),
    fact("shop/pricing.rb", Atom.ImportedBy, "shop/receipt.rb"),
    fact("Shop.Receipt.render", Atom.Calls, "Pricing.total"),
    fact("Pricing.total", Atom.Callers, "Shop.Receipt.render")
}

def files(names: List[String]): Frontier = Attune.files(w(), names)

def symbols(names: List[String]): Frontier = Attune.symbols(w(), names)

/// All six primitive signatures apply to their exact source domain and produce
/// their declared target frontier.
@Test
def allSixAtomsApplyWithTheirDeclaredDomains(): Unit \ Assert = {
    Assert.assertEq(expected = Ok(symbols(List#{"Pricing.total"})),
        Attune.apply(facts(), files(List#{"shop/pricing.rb"}), Atom.Defines));
    Assert.assertEq(expected = Ok(files(List#{"shop/pricing.rb"})),
        Attune.apply(facts(), symbols(List#{"Pricing.total"}), Atom.DefinedIn));
    Assert.assertEq(expected = Ok(files(List#{"shop/pricing.rb"})),
        Attune.apply(facts(), files(List#{"shop/receipt.rb"}), Atom.Imports));
    Assert.assertEq(expected = Ok(files(List#{"shop/receipt.rb"})),
        Attune.apply(facts(), files(List#{"shop/pricing.rb"}), Atom.ImportedBy));
    Assert.assertEq(expected = Ok(symbols(List#{"Pricing.total"})),
        Attune.apply(facts(), symbols(List#{"Shop.Receipt.render"}), Atom.Calls));
    Assert.assertEq(expected = Ok(symbols(List#{"Shop.Receipt.render"})),
        Attune.apply(facts(), symbols(List#{"Pricing.total"}), Atom.Callers))
}

/// A legal route composes Files -> defines -> Symbols -> defined_in -> Files
/// through the one evaluator.
@Test
def aLegalRouteComposesThroughOneEvaluator(): Unit \ Assert = {
    match Attune.apply(facts(), files(List#{"shop/pricing.rb"}), Atom.Defines) {
        case Err(error) => Assert.fail(error)
        case Ok(symbolsFrontier) => match Attune.apply(facts(), symbolsFrontier, Atom.DefinedIn) {
            case Err(error)   => Assert.fail(error)
            case Ok(filesFrontier) => Assert.assertEq(expected = files(List#{"shop/pricing.rb"}), filesFrontier)
        }
    }
}

/// A legal empty continuation keeps its world and its declared target domain,
/// and the two empty domains stay distinct values.
@Test
def legalEmptinessKeepsItsWorldAndDomain(): Unit \ Assert = {
    let empty = Attune.apply(facts(), files(List#{"shop/ghost.rb"}), Atom.Imports);
    Assert.assertEq(expected = Ok(files(Nil)), empty);
    Assert.assertEq(expected = "shop-v1", match empty {
        case Ok(frontier) => match Attune.worldOf(frontier) { case World.World(name) => name }
        case Err(_)       => "rejected"
    });
    Assert.assertEq(expected = false, files(Nil) == symbols(Nil))
}

/// An illegal domain composition is a classified rejection, never an empty success.
@Test
def illegalDomainCompositionIsRejection(): Unit \ Assert = {
    Assert.assertErr(Attune.apply(facts(), symbols(List#{"Pricing.total"}), Atom.Imports));
    Assert.assertErr(Attune.apply(facts(), files(List#{"shop/pricing.rb"}), Atom.DefinedIn))
}

/// A fact from another world cannot apply here.
@Test
def aForeignWorldFactIsRejection(): Unit \ Assert = {
    let foreign = { world = World.World("shop-v2"), source = "shop/receipt.rb", atom = Atom.Imports, target = "shop/pricing.rb" };
    Assert.assertErr(Attune.apply(foreign :: Nil, files(List#{"shop/receipt.rb"}), Atom.Imports))
}
