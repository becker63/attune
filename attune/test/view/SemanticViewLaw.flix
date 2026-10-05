use Attune.{Atom, Domain, Fact, World}
use Attune.AsciiTree
use Attune.View

/// Native `@Test` laws for the semantic-view adapter.
///
/// A view is a query, not another repository: the seed and selected relations
/// produce exact node and edge sets, and the induced lateral edge between two
/// selected files survives even though no traversal tree would draw it. Cycles,
/// self-loops and parallel relation kinds use the exact labeled adjacency
/// fallback, which never drops, reverses or relabels an edge.
///
/// The independent semantic set and the renderer byte golden stay two checks:
/// the set asserts the typed nodes and directed edges, the golden asserts the
/// exact document, and a third law confirms the document presents precisely the
/// set. Geometry (draw order, tree or adjacency) is presentation only, so
/// reversing the authored input order or refusing a non-ASCII label never
/// changes a typed edge.

def limits(): AsciiTree.Limits = AsciiTree.limits(16, 64, 100, 64, 4096)

def lines(xs: List[String]): String = List.join("\n", xs) + "\n"

def fact(scope: String, source: String, atom: Atom, target: String): Fact =
    { world = World.World(scope), source = source, atom = atom, target = target }

def seed(id: String): View.ViewSeed = { id = id, domain = Domain.Files }

/// Two seeds share one child, and one seed also imports the other. The induced
/// view keeps all three edges, and the wrong-scope edge does not leak in.
@Test
def anInducedViewKeepsTheLateralEdge(): Unit \ Assert = {
    let facts = List#{
        fact("shop", "receipt.rb", Atom.Imports, "pricing.rb"),
        fact("shop", "checkout.rb", Atom.Imports, "pricing.rb"),
        fact("shop", "receipt.rb", Atom.Imports, "checkout.rb"),
        fact("other", "receipt.rb", Atom.Imports, "ghost.rb")
    };
    let view = View.induced(facts, "imports", "shop",
        List#{seed("receipt.rb"), seed("checkout.rb")}, List#{Atom.Imports});
    Assert.assertEq(
        expected = List#{"Files{checkout.rb}", "Files{pricing.rb}", "Files{receipt.rb}"},
        View.viewNodeTexts(view));
    Assert.assertEq(
        expected = List#{
            "Files{checkout.rb} --imports--> Files{pricing.rb}",
            "Files{receipt.rb} --imports--> Files{checkout.rb}",
            "Files{receipt.rb} --imports--> Files{pricing.rb}"
        },
        List.sort(View.viewEdgeTexts(view)));
    Assert.assertEq(expected = false,
        List.exists(text -> String.contains(substr = "ghost", text), View.viewNodeTexts(view)));
    Assert.assertEq(expected = false, View.treeMode(view))
}

/// A rooted, single-parent view renders as a tree with the relation label on
/// each edge.
@Test
def aTreeShapedViewRendersAsATree(): Unit \ Assert = {
    let facts = List#{
        fact("shop", "receipt.rb", Atom.Imports, "pricing.rb"),
        fact("shop", "pricing.rb", Atom.Imports, "util.rb")
    };
    let view = View.induced(facts, "deps", "shop", List#{seed("receipt.rb")}, List#{Atom.Imports});
    Assert.assertEq(expected = true, View.treeMode(view));
    let expected = lines(
        "graph=view name=deps scope=shop mode=tree" ::
        "" ::
        "deps: Files{receipt.rb}" ::
        "      `-- imports -> Files{pricing.rb}" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderView(limits(), view))
}

/// A two-node cycle cannot be a tree; the fallback keeps both directions.
@Test
def aCycleUsesTheExactAdjacencyFallback(): Unit \ Assert = {
    let facts = List#{
        fact("shop", "a.rb", Atom.Imports, "b.rb"),
        fact("shop", "b.rb", Atom.Imports, "a.rb")
    };
    let view = View.induced(facts, "cycle", "shop", List#{seed("a.rb")}, List#{Atom.Imports});
    Assert.assertEq(expected = false, View.treeMode(view));
    let expected = lines(
        "graph=view name=cycle scope=shop mode=adjacency" ::
        "" ::
        "nodes" ::
        "+-- Files{a.rb}" ::
        "`-- Files{b.rb}" ::
        "" ::
        "edges" ::
        "+-- Files{a.rb} --imports--> Files{b.rb}" ::
        "`-- Files{b.rb} --imports--> Files{a.rb}" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderView(limits(), view))
}

/// A self-loop is not silently pruned.
@Test
def aSelfLoopIsRenderedNotDropped(): Unit \ Assert = {
    let facts = List#{ fact("shop", "a.rb", Atom.Imports, "a.rb") };
    let view = View.induced(facts, "loop", "shop", List#{seed("a.rb")}, List#{Atom.Imports});
    let expected = lines(
        "graph=view name=loop scope=shop mode=adjacency" ::
        "" ::
        "nodes" ::
        "`-- Files{a.rb}" ::
        "" ::
        "edges" ::
        "`-- Files{a.rb} --imports--> Files{a.rb}" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderView(limits(), view))
}

/// Two relation kinds between the same endpoints both survive, with direction
/// and relation labels intact.
@Test
def parallelRelationKindsSurviveWithTheirLabels(): Unit \ Assert = {
    let facts = List#{
        fact("shop", "a.rb", Atom.Imports, "b.rb"),
        fact("shop", "a.rb", Atom.ImportedBy, "b.rb")
    };
    let view = View.induced(facts, "parallel", "shop", List#{seed("a.rb")},
        List#{Atom.Imports, Atom.ImportedBy});
    Assert.assertEq(expected = false, View.treeMode(view));
    let expected = lines(
        "graph=view name=parallel scope=shop mode=adjacency" ::
        "" ::
        "nodes" ::
        "+-- Files{a.rb}" ::
        "`-- Files{b.rb}" ::
        "" ::
        "edges" ::
        "+-- Files{a.rb} --imported_by--> Files{b.rb}" ::
        "`-- Files{a.rb} --imports--> Files{b.rb}" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderView(limits(), view));
    Assert.assertEq(expected = false,
        List.exists(text -> String.contains(substr = "Files{b.rb} --imports--> Files{a.rb}", text),
            View.viewEdgeTexts(view)))
}

/// Input order is geometry, not identity: reversing the authored facts yields
/// the identical node set, the identical directed edge set and the identical
/// document. A layout may reorder the same edges but can never change one.
@Test
def aGeometryOnlyChangeKeepsEveryEdge(): Unit \ Assert = {
    let facts = List#{
        fact("shop", "receipt.rb", Atom.Imports, "pricing.rb"),
        fact("shop", "checkout.rb", Atom.Imports, "pricing.rb"),
        fact("shop", "receipt.rb", Atom.Imports, "checkout.rb")
    };
    let seeds = List#{seed("receipt.rb"), seed("checkout.rb")};
    let view = View.induced(facts, "imports", "shop", seeds, List#{Atom.Imports});
    let redrawn = View.induced(List.reverse(facts), "imports", "shop", seeds, List#{Atom.Imports});
    Assert.assertEq(expected = View.viewNodeTexts(view), View.viewNodeTexts(redrawn));
    Assert.assertEq(expected = List.sort(View.viewEdgeTexts(view)), List.sort(View.viewEdgeTexts(redrawn)));
    Assert.assertEq(expected = View.renderView(limits(), view), View.renderView(limits(), redrawn))
}

/// An edge is identified by its directed endpoints and its relation, so no
/// drawing may reverse an arrow or relabel a relation. The reversed fact
/// projects as the reversed edge (a different identity), and the same endpoints
/// under `imported_by` project with that exact label. The envelope admits
/// exactly the six directed atoms and no write relation, so `imports` cannot be
/// relabelled as a write.
@Test
def anEdgeKeepsItsDirectionAndRelation(): Unit \ Assert = {
    let forward = View.induced(
        List#{ fact("shop", "a.rb", Atom.Imports, "b.rb") }, "forward", "shop",
        List#{seed("a.rb")}, List#{Atom.Imports});
    let backward = View.induced(
        List#{ fact("shop", "b.rb", Atom.Imports, "a.rb") }, "backward", "shop",
        List#{seed("b.rb")}, List#{Atom.Imports});
    let relabelled = View.induced(
        List#{ fact("shop", "a.rb", Atom.ImportedBy, "b.rb") }, "relabelled", "shop",
        List#{seed("a.rb")}, List#{Atom.ImportedBy});
    Assert.assertEq(expected = List#{"Files{a.rb} --imports--> Files{b.rb}"}, View.viewEdgeTexts(forward));
    Assert.assertEq(expected = List#{"Files{b.rb} --imports--> Files{a.rb}"}, View.viewEdgeTexts(backward));
    Assert.assertEq(expected = false, View.viewEdgeTexts(forward) == View.viewEdgeTexts(backward));
    Assert.assertEq(expected = List#{"Files{a.rb} --imported_by--> Files{b.rb}"}, View.viewEdgeTexts(relabelled));
    Assert.assertEq(expected = false, View.viewEdgeTexts(forward) == View.viewEdgeTexts(relabelled));
    Assert.assertEq(expected = 6, List.length(Attune.atoms()));
    Assert.assertEq(expected = false, List.exists(atom -> Attune.atomName(atom) == "writes", Attune.atoms()))
}

/// The rendered adjacency document presents exactly the semantic set: every
/// typed node and every typed directed edge appears in the bytes. The set is
/// the independent expectation and the golden is checked separately, so the
/// golden can never silently drop or add an edge the set still carries.
@Test
def theDocumentPresentsExactlyTheSemanticSet(): Unit \ Assert = {
    let facts = List#{
        fact("shop", "a.rb", Atom.Imports, "b.rb"),
        fact("shop", "b.rb", Atom.Imports, "a.rb")
    };
    let view = View.induced(facts, "cycle", "shop", List#{seed("a.rb")}, List#{Atom.Imports});
    let document = match View.renderView(limits(), view) {
        case Ok(text) => text
        case Err(_)   => ""
    };
    Assert.assertEq(expected = true,
        List.forAll(text -> String.contains(substr = text, document), View.viewNodeTexts(view)));
    Assert.assertEq(expected = true,
        List.forAll(text -> String.contains(substr = text, document), View.viewEdgeTexts(view)))
}

/// Presentation may reject a non-ASCII identity, but that rejection never
/// erases the scientific result: the induced node and directed edge sets are
/// still the exact typed values, and only the drawing is refused.
@Test
def aNonAsciiLabelRejectsPresentationWithoutLosingTheResult(): Unit \ Assert = {
    let facts = List#{
        fact("shop", "café.rb", Atom.Imports, "pricing.rb"),
        fact("shop", "checkout.rb", Atom.Imports, "pricing.rb")
    };
    let view = View.induced(facts, "imports", "shop", List#{seed("café.rb")}, List#{Atom.Imports});
    Assert.assertEq(expected = false, View.safeId("café.rb"));
    Assert.assertErr(View.renderView(limits(), view));
    Assert.assertEq(expected = List#{"Files{café.rb}", "Files{pricing.rb}"}, View.viewNodeTexts(view));
    Assert.assertEq(expected = List#{"Files{café.rb} --imports--> Files{pricing.rb}"}, View.viewEdgeTexts(view))
}
