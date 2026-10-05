use Attune.Envelope.{Atom, Domain}
use Attune.AsciiTree
use Attune.View

/// Native `@Test` laws for the semantic-view adapter.
///
/// A view is a query, not another repository: the seed and selected relations
/// produce exact node and edge sets, and the induced lateral edge between two
/// selected files survives even though no traversal tree would draw it. Cycles,
/// self-loops and parallel relation kinds use the exact labeled adjacency
/// fallback, which never drops, reverses or relabels an edge.

def limits(): AsciiTree.Limits = AsciiTree.limits(16, 64, 100, 64, 4096)

def lines(xs: List[String]): String = List.join("\n", xs) + "\n"

def fact(scope: String, source: String, atom: Atom, target: String): View.ViewFact =
    { scope = scope, source = source, atom = atom, target = target }

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
