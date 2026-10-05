import attune.grit.fixtures.GritFixtures

use Attune.AsciiTree
use Attune.Docs
use Attune.{Atom, Domain, Fact, FileId, Frontier, SymbolId, World}
use Attune.Repository
use Attune.Coverage.{Coverage, Outcome, observe, outcomeName}
use Attune.Study
use Attune.View

/// The documentation correspondence fixture.
///
/// The authored Ruby shop flows through the real pinned Grit engine, Flix
/// admission, the typed view and the one writer. The generated payloads are
/// then compared with the actual marked payloads of the checked-in README and
/// of the `Attune.View` comment. Three checks stay distinct: the admitted
/// semantic sets are stated here, the renderer goldens live in `test/view`, and
/// this file compares the real document bytes. Nothing here rewrites a
/// document, and a drifted, missing, duplicated or broken block is a failure
/// rather than a silently skipped one.

def limits(): AsciiTree.Limits = AsciiTree.limits(32, 256, 100, 96, 16384)

def snapshot(): World = World.World("shop-v1")

def shopIds(): List[String] = "shop/pricing.rb" :: "shop/receipt.rb" :: "shop/checkout.rb" :: Nil

/// The authored shop world: the fixture bytes keyed by the admission identity,
/// read through the declared mechanical reader rather than a path of our own.
def shopWorld(): List[(String, String)] \ IO =
    List.map(id -> (id, GritFixtures.source("test/grit/fixtures/" + id)), shopIds())

def admitted(): Repository.Repository \ {Assert, IO} =
    match Repository.analyze(shopWorld()) {
        case Ok(repository) => repository
        case Err(error) =>
            Assert.assertEq(expected = "admitted", "${error}");
            emptyRepository()
    }

/// The no-edge repository, used only to reach a loud assertion failure.
def emptyRepository(): Repository.Repository = {
    declarations = Nil, defines = Nil, definedIn = Nil, imports = Nil, importedBy = Nil,
    calls = Nil, callers = Nil, reopened = Nil, refusals = Nil
}

/// The exact targets of `owner` in an admitted relation, as a sorted set.
def targets(edges: List[(String, String)], owner: String): List[String] =
    List.sort(List.distinct(List.filterMap(pair -> match pair {
        case (source, target) => if (source == owner) Some(target) else None
    }, edges)))

def files(names: List[String]): Frontier = Attune.files(snapshot(), names)

def symbols(names: List[String]): Frontier = Attune.symbols(snapshot(), names)

def step(id: Int32, input: Frontier, atom: Atom, output: Frontier, work: View.Work): View.Step =
    { id = id, snapshot = snapshot(), memo = "demo", input = input, atom = atom, output = output, work = work }

def route(name: String, seed: Frontier, steps: List[View.Step]): View.Route =
    { name = name, seed = seed, steps = steps }

def payload(result: Result[String, String]): String = Result.getWithDefault("", result)

/// The declared document population in the form the checkout-root README writes
/// its links: the checkout-root documents the launcher bound live (`README.md`,
/// `LICENSE`), and every declared workspace document under the workspace
/// directory. The README is maintained at the checkout root, beside the nested
/// workspace, so its local links are checkout-relative rather than relative to
/// the workspace root.
def readmeDeclaredPaths(): List[String] \ IO =
    List.map(
        name -> if (name == "README.md" or name == "LICENSE") name else "attune/" + name,
        String.lines(GritFixtures.declared())
    )

/// The route document, generated from the admitted shop edges: legal, legally
/// empty, and two routes that converge on one exact frontier where the second
/// records reuse of the earlier transition.
def routesDocument(repository: Repository.Repository): Result[String, String] = {
    let receipt = "shop/receipt.rb";
    let pricing = "shop/pricing.rb";
    let symbol = "Shop.Receipt.render";
    let deps = targets(repository#imports, receipt);
    let defined = targets(repository#definedIn, symbol);
    let importers = targets(repository#importedBy, pricing);
    let r = route("R", files(receipt :: Nil), List#{
        step(1, files(receipt :: Nil), Atom.Imports, files(deps), View.Work.Computed) });
    let e = route("E", files(pricing :: Nil), List#{
        step(2, files(pricing :: Nil), Atom.Imports, files(targets(repository#imports, pricing)), View.Work.Unrecorded) });
    let a = route("A", symbols(symbol :: Nil), List#{
        step(3, symbols(symbol :: Nil), Atom.DefinedIn, files(defined), View.Work.Computed),
        step(4, files(defined), Atom.Imports, files(deps), View.Work.Computed) });
    let b = route("B", files(receipt :: Nil), List#{
        step(5, files(receipt :: Nil), Atom.Imports, files(deps), View.Work.Reused(4)),
        step(6, files(deps), Atom.ImportedBy, files(importers), View.Work.Computed) });
    View.renderRoutes(limits(), snapshot(), "demo", r :: e :: a :: b :: Nil)
}

def viewFact(source: String, target: String): Fact =
    { world = World.World("shop-v1"), source = source, atom = Atom.Imports, target = target }

def fileSeed(id: String): View.ViewSeed = { id = id, domain = Domain.Files }

/// The selection view over the admitted imports: two seeds share one imported
/// center, so the induced view keeps both directed edges.
def viewDocument(repository: Repository.Repository): Result[String, String] =
    View.renderView(limits(), View.induced(
        List.map(pair -> match pair { case (source, target) => viewFact(source, target) }, repository#imports),
        "imports", "shop-v1", List#{fileSeed("shop/receipt.rb"), fileSeed("shop/checkout.rb")},
        List#{Atom.Imports}))

/// The declared join rule: two imports meet at one shared center.
def pairRules(): #{
    Imports(String, String, String),
    Pair(String, String, String, String)
} = #{
    Pair(s, a, b, center) :-
        Imports(s, a, center),
        Imports(s, b, center),
        if (a != b).
}

def premise(role: String, text: String, holds: Bool, bindings: List[(String, String)]): View.Premise =
    { role = role, text = text, holds = holds, bindings = bindings }

def application(scope: String, left: String, right: String, center: String, holds: Bool): View.Application =
    { head = "Pair(s, a, b, center)", scope = scope, premises = List#{
        premise("left", "Imports(s, a, center)", true, List#{("s", scope), ("a", left), ("center", center)}),
        premise("right", "Imports(s, b, center)", true, List#{("s", scope), ("b", right), ("center", center)}),
        premise("", "a != b", holds, Nil)
    } }

def sortedImports(repository: Repository.Repository): List[(String, String)] =
    List.sortBy(pair -> match pair { case (source, target) => source + " " + target }, repository#imports)

/// The join facts built from the admitted shop edges, so the native query runs
/// over the real extraction rather than a transcribed copy.
def shopJoin(edges: List[(String, String)]): Result[String, (String, #{
    Imports(String, String, String),
    Pair(String, String, String, String)
})] =
    match edges {
        case (first, center1) :: (second, center2) :: Nil =>
            if (center1 == center2)
                Ok((center1, #{ Imports("shop-v1", first, center1). Imports("shop-v1", second, center2). }))
            else Err("the shop import fixture needs one shared center")
        case _ => Err("the shop import fixture needs exactly two admitted edges")
    }

/// The Datalog claim over the real shop facts: the native query returns a
/// witness, and the rendered proof keeps every premise of that application.
def proofDocument(repository: Repository.Repository): Result[String, String] =
    match shopJoin(sortedImports(repository)) {
        case Err(error) => Err(error)
        case Ok((center, facts)) => {
            let rows = query facts, pairRules() select (a, b) from Pair("shop-v1", a, b, center);
            let pairs = List.sortBy(pair -> match pair { case (a, b) => a + " " + b },
                Set.toList(Vector.toSet(rows)));
            match pairs {
                case Nil => Err("the shop join produced no witness")
                case (a, b) :: _ => View.renderProof(limits(), {
                    goal = "Pair", scope = "shop-v1", outcome = Outcome.Witness, detail = "",
                    application = application("shop-v1", a, b, center, true), alternatives = Nil })
            }
        }
    }

/// The counterexample: one file cannot fill both roles, so the same rule has no
/// row on a scope with a single importer and the readout shows the false guard.
def counterexampleDocument(): Result[String, String] = {
    let facts = #{ Imports("one", "receipt.rb", "pricing.rb"). };
    let rows = query facts, pairRules() select (a, b) from Pair("one", a, b, "pricing.rb");
    if (not Vector.isEmpty(rows)) Err("the one-importer counterexample should have no row")
    else View.renderProof(limits(), {
        goal = "Pair", scope = "one", outcome = Outcome.NoMatch, detail = "",
        application = application("one", "receipt.rb", "receipt.rb", "pricing.rb", false), alternatives = Nil })
}

// ---------------------------------------------------- fixture applications
//
// The two whole-system fixture application reports. Both are built from the same
// real computations the rest of this fixture uses: the admitted shop edges, the
// shared Study policies over the real admitted call relation, the earned
// coverage bridge and the bounded `Attune.View` application projection. Every
// entry carries its provenance, so a frozen prediction, an observation, a
// historical replay and labelled fixture work can never be confused. This is
// labelled fixture work, not an external measurement.

def appLimits(): AsciiTree.Limits = AsciiTree.limits(32, 256, 200, 160, 16384)

def assumption(text: String): List[String] = text :: Nil

def appEntry(provenance: View.Provenance, subject: String, answer: String, assumptions: List[String]): View.AppEntry =
    { subject = subject, answer = answer, provenance = provenance, assumptions = assumptions }

def fileNode(id: String): Study.AnchorNode = Study.AnchorNode.AnchorFile(FileId.FileId(id))

def symbolNode(name: String): Study.AnchorNode = Study.AnchorNode.AnchorSymbol(SymbolId.SymbolId(name))

def shopAnchor(task: String, node: Study.AnchorNode): Study.Anchor =
    { world = snapshot(), task = task, node = node }

/// The real admitted call relation, as world-typed nominal symbol anchors.
def admittedCalls(repository: Repository.Repository): List[Study.CallEdge] =
    List.map(pair -> match pair { case (caller, callee) => (symbolNode(caller), symbolNode(callee)) },
        repository#calls)

/// The targets of one real admitted relation from one source, sorted and
/// distinct.
def relationTargets(edges: List[(String, String)], source: String): List[String] =
    List.sort(List.distinct(List.filterMap(pair -> match pair {
        case (origin, target) => if (origin == source) Some(target) else None
    }, edges)))

def firstOr(values: List[String], fallback: String): String = match values {
    case first :: _ => first
    case Nil        => fallback
}

/// The one witness-bearing coordination decision phrase.
def decision(verdict: Study.Verdict): String =
    View.because(Study.verdictName(verdict), Study.verdictWitness(verdict))

def shopFacts(repository: Repository.Repository): List[Fact] =
    Repository.scopedFacts(snapshot(), repository)#facts

def receiptCheckoutAnchors(): List[Study.Anchor] = List#{
    shopAnchor("receipt", fileNode("shop/receipt.rb")),
    shopAnchor("checkout", fileNode("shop/checkout.rb"))
}

/// The coordination report. The E1 decisions are the shared Study policies over
/// the real admitted call relation; the observations are the honest coverage
/// states of the same world; the historical row is the retained promotion value.
def coordinationReport(repository: Repository.Repository): View.ApplicationReport = {
    let earned = { verdict = Study.Verdict.Unknown(List#{"static:no-direct-call"}), calls = admittedCalls(repository) };
    let anchors = receiptCheckoutAnchors();
    let contract = List#{
        { task = "receipt", operation = Study.Operation.ChangesContract, boundary = "Shop::Pricing" },
        { task = "checkout", operation = Study.Operation.ExtendsImplementation, boundary = "Shop::Pricing" } };
    let bothExtend = List#{
        { task = "receipt", operation = Study.Operation.ExtendsImplementation, boundary = "Shop::Pricing" },
        { task = "checkout", operation = Study.Operation.ExtendsImplementation, boundary = "Shop::Pricing" } };
    let absent = List#{
        { task = "receipt", operation = Study.Operation.ExtendsImplementation, boundary = "Shop::Pricing" },
        { task = "absent", operation = Study.Operation.UnknownIntent, boundary = "" } };
    {
        application = "coordination",
        scope = "shop-v1",
        work = View.Provenance.Fixture,
        entries = List#{
            appEntry(View.Provenance.Prediction, "pair=receipt/checkout",
                decision(Study.e1({ anchors = anchors, earned = earned, intents = contract })),
                assumption("single-declared-boundary")),
            appEntry(View.Provenance.Prediction, "pair=receipt/checkout-both-extend",
                decision(Study.e1({ anchors = anchors, earned = earned, intents = bothExtend })),
                assumption("distinct-anchors-no-direct-call")),
            appEntry(View.Provenance.Prediction, "pair=receipt/absent",
                decision(Study.e1({ anchors = anchors, earned = earned, intents = absent })),
                assumption("unknown-intent-stays-unknown")),
            appEntry(View.Provenance.Observation, "pair=receipt/checkout", "Unmeasured",
                assumption("no-external-execution")),
            appEntry(View.Provenance.Observation, "query=Shop.Nothing.render",
                outcomeName(Repository.ask(snapshot(), repository, "Shop.Nothing.render", Atom.Calls)),
                assumption("coverage-partial")),
            appEntry(View.Provenance.Observation, "coverage=failure",
                outcomeName(observe(
                    { scope = snapshot(), subject = "shop/receipt.rb", atom = Atom.Imports },
                    Coverage.Failure("transport"), shopFacts(repository))),
                assumption("classified-failure-not-unmeasured-success")),
            appEntry(View.Provenance.History, "retained-corrected-v2",
                ToString.toString(Study.retainedV1Promotion()),
                assumption("historical-replay-is-not-external-execution")),
            appEntry(View.Provenance.Fixture, "acquired-shop",
                ToString.toString(Repository.scopeCoverage(repository)),
                assumption("three-authored-files"))
        }
    }
}

/// The localization report. The predicted candidate is the real admitted import
/// target, the empty continuation is a real empty target set, and the gold is a
/// labelled fixture value rather than an external label.
def localizationReport(repository: Repository.Repository): View.ApplicationReport = {
    let receiptTargets = relationTargets(repository#imports, "shop/receipt.rb");
    let hit = if (firstOr(receiptTargets, "EMPTY") == "shop/pricing.rb") "true" else "false";
    {
        application = "localization",
        scope = "shop-v1",
        work = View.Provenance.Fixture,
        entries = List#{
            appEntry(View.Provenance.Prediction, "task=receipt",
                firstOr(receiptTargets, "EMPTY"), assumption("structural-imports-only")),
            appEntry(View.Provenance.Prediction, "task=pricing",
                firstOr(relationTargets(repository#imports, "shop/pricing.rb"), "EMPTY"),
                assumption("legal-empty-continuation")),
            appEntry(View.Provenance.Observation, "task=receipt", "Unmeasured",
                assumption("no-external-execution")),
            appEntry(View.Provenance.Observation, "task=pricing",
                outcomeName(Repository.ask(snapshot(), repository, "shop/pricing.rb", Atom.Imports)),
                assumption("coverage-partial")),
            appEntry(View.Provenance.History, "task=receipt", "none",
                assumption("no-retained-localization-evidence")),
            appEntry(View.Provenance.Fixture, "task=receipt",
                "gold=shop/pricing.rb hit=" + hit, assumption("labelled-fixture-gold"))
        }
    }
}

def localizationDocument(repository: Repository.Repository): Result[String, String] =
    View.renderApplication(appLimits(), localizationReport(repository))

def coordinationDocument(repository: Repository.Repository): Result[String, String] =
    View.renderApplication(appLimits(), coordinationReport(repository))

/// The admitted shop edges are the independent semantic set: the real
/// extraction and admission decide them, not a renderer or a document.
@Test
def theAuthoredShopAdmitsTheExpectedEdges(): Unit \ {Assert, IO} = {
    let repository = admitted();
    Assert.assertEq(expected = List#{
        "shop/checkout.rb -> shop/pricing.rb",
        "shop/receipt.rb -> shop/pricing.rb"
    }, Repository.edgeTexts(repository#imports));
    Assert.assertEq(expected = List#{
        "shop/pricing.rb -> shop/checkout.rb",
        "shop/pricing.rb -> shop/receipt.rb"
    }, Repository.edgeTexts(repository#importedBy))
}

/// The README payloads are the regenerated ones. The answer and work tokens are
/// stated here independently of the document, and the comparison reads the
/// actual checked-in bytes: the test never rewrites the README.
@Test
def readmePayloadsEqualTheGeneratedDocuments(): Unit \ {Assert, IO} = {
    let repository = admitted();
    let readme = GritFixtures.source("README.md");
    Assert.assertEq(expected = Ok(payload(routesDocument(repository))), Docs.snippet("routes", readme));
    Assert.assertEq(expected = Ok(payload(viewDocument(repository))), Docs.snippet("view", readme));
    Assert.assertEq(expected = Ok(payload(proofDocument(repository))), Docs.snippet("proof", readme));
    Assert.assertEq(expected = Ok(payload(counterexampleDocument())), Docs.snippet("counterexample", readme));
    Assert.assertEq(expected = Ok(payload(localizationDocument(repository))), Docs.snippet("localization", readme));
    Assert.assertEq(expected = Ok(payload(coordinationDocument(repository))), Docs.snippet("coordination", readme));
    let routes = payload(Docs.snippet("routes", readme));
    Assert.assertTrue(String.contains(substr = "route=E status=EMPTY", routes));
    Assert.assertTrue(String.contains(substr = "[OK; REUSE t4]", routes))
}

/// The fixture application reports trace the real computations: the predicted
/// localization candidate is the admitted import target, the coordination
/// decisions are the shared Study policies over the real call relation, and the
/// observations keep unknown and failure apart from a measured status. The
/// provenances are asserted independently of the rendered bytes.
@Test
def applicationReportsTraceRealComputations(): Unit \ {Assert, IO} = {
    let repository = admitted();

    // The prediction is the real admitted import target, and the empty
    // continuation is a real empty target set rather than a missing row.
    Assert.assertEq(expected = List#{"shop/pricing.rb"}, relationTargets(repository#imports, "shop/receipt.rb"));
    Assert.assertEq(expected = Nil, relationTargets(repository#imports, "shop/pricing.rb"));
    let localization = localizationReport(repository);
    Assert.assertEq(
        expected = List#{"task=receipt", "task=pricing", "task=receipt", "task=pricing", "task=receipt", "task=receipt"},
        List.map(entry -> entry#subject, localization#entries));
    Assert.assertEq(
        expected = List#{
            View.Provenance.Prediction, View.Provenance.Prediction, View.Provenance.Observation,
            View.Provenance.Observation, View.Provenance.History, View.Provenance.Fixture
        },
        List.map(entry -> entry#provenance, localization#entries));
    Assert.assertEq(expected = List#{
        "shop/pricing.rb", "EMPTY", "Unmeasured", "UNKNOWN", "none", "gold=shop/pricing.rb hit=true"
    }, List.map(entry -> entry#answer, localization#entries));

    // The coordination decisions are witness-bearing, and the same world keeps
    // unknown and failure distinct from an unmeasured observation.
    let coordination = coordinationReport(repository);
    Assert.assertEq(expected = List#{
        "CoordinatesBecause(E1:SameDeclaredBoundary(Shop::Pricing))",
        "ParallelBecause(E1:DistinctAnchorsAndNoDirectCallOn(Shop::Pricing))",
        "UnknownBecause(E1:UnknownIntent)",
        "Unmeasured",
        "UNKNOWN",
        "FAILED",
        "NotEarned",
        "Partial"
    }, List.map(entry -> entry#answer, coordination#entries));
    Assert.assertEq(
        expected = List#{
            View.Provenance.Prediction, View.Provenance.Prediction, View.Provenance.Prediction,
            View.Provenance.Observation, View.Provenance.Observation, View.Provenance.Observation,
            View.Provenance.History, View.Provenance.Fixture
        },
        List.map(entry -> entry#provenance, coordination#entries));
    let document = payload(coordinationDocument(repository));
    Assert.assertTrue(String.contains(substr = "graph=application name=coordination scope=shop-v1 work=fixture", document));
    Assert.assertTrue(String.contains(substr = "observation query=Shop.Nothing.render = UNKNOWN", document));
    Assert.assertTrue(String.contains(substr = "observation coverage=failure = FAILED", document))
}

/// The selected View comment payload is the grammar the writer regenerates from
/// the one atom signature table, not a second hand-maintained copy.
@Test
def theViewCommentCarriesTheGeneratedGrammar(): Unit \ {Assert, IO} =
    Assert.assertEq(expected = Ok(payload(View.grammar(limits(), Domain.Symbols, 2))),
        Docs.snippet("grammar", GritFixtures.source("src/Attune/View.flix")))

/// A drifted payload is not the generated one and is never blessed; a missing
/// or duplicated marker is an explicit rejection rather than a silent skip. A
/// drifted application payload fails on the same footing as a drifted route.
@Test
def aDriftedOrMalformedPayloadFails(): Unit \ {Assert, IO} = {
    let readme = GritFixtures.source("README.md");
    let drifted = String.replace(src = "shop/receipt.rb", dst = "shop/ghost.rb", readme);
    Assert.assertEq(expected = false, Docs.snippet("routes", drifted) == Docs.snippet("routes", readme));
    let driftedDecision = String.replace(src = "CoordinatesBecause", dst = "ParallelBecause", readme);
    Assert.assertEq(expected = false,
        Docs.snippet("coordination", driftedDecision) == Docs.snippet("coordination", readme));
    Assert.assertErr(Docs.snippet("routes", "# no markers here\n"));
    let open = Docs.snippetOpen("routes");
    let close = Docs.snippetClose("routes");
    Assert.assertErr(Docs.snippet("routes", open + "\n" + open + "\n" + close + "\n"))
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
