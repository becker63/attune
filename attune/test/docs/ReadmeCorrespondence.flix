import attune.grit.fixtures.GritFixtures

use Attune.Docs
use Attune.{Atom, SymbolId, World}
use Attune.Repository
use Attune.Coverage.Outcome
use Attune.Study

/// The README contains this executable question, copied byte for byte.
/// Tests separately check its answers from real Ruby extraction and its source
/// correspondence. There is no renderer between the question and its answers.

def snapshot(): World = World.World("shop-v1")

def admitted(): Result[Attune.Repository.Grit.Error, Repository.Repository] \ IO =
    Repository.analyze(List.map(id -> (id, GritFixtures.source("test/grit/fixtures/" + id)),
        List#{"shop/pricing.rb", "shop/receipt.rb", "shop/checkout.rb"}))

/// Two distinct files import the same dependency. The query returns witnesses.
/// <!-- attune:snippet=shared-imports -->
def sharedImports(imports: List[(String, String)]): List[(String, String, String)] = {
    let facts = inject imports into Imports/2;
    let rules = #{
        Shared(first, second, dependency) :-
            Imports(first, dependency),
            Imports(second, dependency),
            if (first != second).
    };
    query facts, rules select (first, second, dependency)
        from Shared(first, second, dependency)
        |> Vector.toList |> List.sort
}
/// <!-- attune:end=shared-imports -->

@Test
def theQuestionFindsTheRealShopWitnesses(): Unit \ {Assert, IO} =
    match admitted() {
        case Err(error) => Assert.assertEq(expected = "admitted shop", "${error}")
        case Ok(repository) =>
            Assert.assertEq(expected = List#{
                ("shop/checkout.rb", "shop/pricing.rb"),
                ("shop/receipt.rb", "shop/pricing.rb")
            }, repository#imports);
            Assert.assertEq(expected = List#{
                ("shop/pricing.rb", "shop/checkout.rb"),
                ("shop/pricing.rb", "shop/receipt.rb")
            }, repository#importedBy);
            Assert.assertEq(expected = List#{
                ("shop/checkout.rb", "shop/receipt.rb", "shop/pricing.rb"),
                ("shop/receipt.rb", "shop/checkout.rb", "shop/pricing.rb")
            }, sharedImports(repository#imports));
            Assert.assertEq(expected = Outcome.Unknown,
                Repository.ask(snapshot(), repository, "Shop.Nothing.render", Atom.Calls))
    }

@Test
def oneImporterCannotFillBothRoles(): Unit \ Assert = {
    Assert.assertEq(expected = Nil, sharedImports(List#{("receipt.rb", "pricing.rb")}));
    Assert.assertEq(expected = Nil, sharedImports(Nil))
}

@Test
def theReadmeContainsTheTestedProgram(): Unit \ {Assert, IO} = {
    let source = Docs.snippet("shared-imports", GritFixtures.source("test/docs/ReadmeCorrespondence.flix"));
    Assert.assertOk(source);
    Assert.assertEq(expected = source, Docs.snippet("shared-imports", GritFixtures.source("README.md")))
}

@Test
def driftAndMalformedMarkersFail(): Unit \ {Assert, IO} = {
    let readme = GritFixtures.source("README.md");
    let drifted = String.replace(src = "first != second", dst = "first == second", readme);
    Assert.assertEq(expected = false,
        Docs.snippet("shared-imports", readme) == Docs.snippet("shared-imports", drifted));
    let open = Docs.snippetOpen("shared-imports");
    let close = Docs.snippetClose("shared-imports");
    Assert.assertErr(Docs.snippet("shared-imports", "no markers"));
    Assert.assertErr(Docs.snippet("shared-imports", open + "\nx\n" + open + "\n" + close));
    Assert.assertErr(Docs.snippet("shared-imports", close + "\nx\n" + open));
    Assert.assertErr(Docs.snippet("shared-imports", open + "\nx"));
    Assert.assertErr(Docs.snippet("shared-imports", close + "\nx\n" + close))
}

def readmeDeclaredPaths(): List[String] \ IO =
    List.map(name -> if (name == "README.md" or name == "LICENSE") name else "attune/" + name,
        String.lines(GritFixtures.declared()))

def symbolNode(name: String): Study.AnchorNode = Study.AnchorNode.AnchorSymbol(SymbolId.SymbolId(name))

def shopAnchor(task: String, node: Study.AnchorNode): Study.Anchor =
    { world = snapshot(), task = task, node = node }

/// The real admitted call relation, as world-typed nominal symbol anchors.
def admittedCalls(repository: Repository.Repository): List[Study.CallEdge] =
    List.map(pair -> match pair { case (caller, callee) => (symbolNode(caller), symbolNode(callee)) },
        repository#calls)

/// Every symbol that really occurs as an endpoint of an admitted call edge. The
/// coordination anchors are checked against this set, so an anchor that could
/// never meet a call edge is a failure rather than a quiet domain mismatch.
def admittedCallEndpoints(repository: Repository.Repository): List[Study.AnchorNode] =
    List.map(symbolNode, List.distinct(List.flatMap(pair -> match pair {
        case (caller, callee) => caller :: callee :: Nil
    }, repository#calls)))

/// Direct-call evidence is load-bearing: the same two same-boundary
/// ExtendsImplementation intents flip when their anchors move onto a real
/// admitted call edge. The anchors and the call relation are both nominal
/// symbols from the real extraction, so the guard decides instead of passing
/// vacuously across domains.
@Test
def directCallEvidenceFlipsTheE1Guard(): Unit \ {Assert, IO} = {
    match admitted() {
        case Err(error) => Assert.assertEq(expected = "admitted shop", "${error}")
        case Ok(repository) =>
            let endpoints = admittedCallEndpoints(repository);
            let receipt = symbolNode("Shop.Receipt.render");
            let checkout = symbolNode("Shop.Checkout.free_shipping?");
            let pricing = symbolNode("Shop.Pricing.total_cents");
            Assert.assertEq(expected = true,
                List.forAll(node -> List.memberOf(node, endpoints), receipt :: checkout :: pricing :: Nil));

            let intents = List#{
                { task = "receipt", operation = Study.Operation.ExtendsImplementation, boundary = "Shop::Pricing" },
                { task = "other", operation = Study.Operation.ExtendsImplementation, boundary = "Shop::Pricing" } };
            let carried = Study.Verdict.Unknown(List#{"E0:carried-evidence"});
            let earned = { verdict = carried, calls = admittedCalls(repository) };

            // Off the call: two distinct admitted symbols that do not call each other.
            let offCall = List#{ shopAnchor("receipt", receipt), shopAnchor("other", checkout) };
            Assert.assertEq(expected = Study.Verdict.Parallel(List#{"E1:DistinctAnchorsAndNoDirectCallOn(Shop::Pricing)"}),
                Study.e1({ anchors = offCall, earned = earned, intents = intents }));

            // On the call: the same intents with the second anchor moved onto the real
            // admitted edge Shop.Receipt.render -> Shop.Pricing.total_cents.
            let onCall = List#{ shopAnchor("receipt", receipt), shopAnchor("other", pricing) };
            Assert.assertEq(expected = carried, Study.e1({ anchors = onCall, earned = earned, intents = intents }));

            // Keep the contract-change and unknown-intent laws from the old reports.
            let changesContract = List#{
                { task = "receipt", operation = Study.Operation.ChangesContract, boundary = "Shop::Pricing" },
                { task = "other", operation = Study.Operation.ExtendsImplementation, boundary = "Shop::Pricing" } };
            Assert.assertEq(expected = Study.Verdict.Coordinate(List#{"E1:SameDeclaredBoundary(Shop::Pricing)"}),
                Study.e1({ anchors = offCall, earned = earned, intents = changesContract }));
            let unknownIntent = List#{
                { task = "receipt", operation = Study.Operation.ExtendsImplementation, boundary = "Shop::Pricing" },
                { task = "absent", operation = Study.Operation.UnknownIntent, boundary = "" } };
            Assert.assertEq(expected = Study.Verdict.Unknown(List#{"E1:UnknownIntent"}),
                Study.e1({ anchors = offCall, earned = earned, intents = unknownIntent }))
    }
}

/// Every local link in the README names a path the build declared. A remote URL
/// and an in-page anchor are not local links and are never fetched.
@Test
def everyLocalReadmeLinkNamesADeclaredPath(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = Nil, Docs.linkFindings(
        readmeDeclaredPaths(), "README.md", GritFixtures.source("README.md")));
    Assert.assertEq(expected = List#{"broken-link README.md src/Ghost.flix"},
        Docs.linkFindings(List#{"README.md"}, "README.md", "see [ghost](src/Ghost.flix)\n"));
    Assert.assertEq(expected = Nil,
        Docs.linkFindings(List#{"README.md"}, "README.md", "see [site](https://example.com)\n"))
}
