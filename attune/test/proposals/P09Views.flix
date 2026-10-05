use Attune.Envelope
use Attune.Envelope.{Atom, Domain, Fact, World}
use Attune.AsciiTree
use Attune.Study.{Outcome}
use Attune.View

/// P09 - semantic views and diagram projection.
///
/// Question. When a selected view is projected into a diagram, what fixes an
/// edge's identity, and what must no layout ever be able to change?
///
///   seeds {receipt.rb, checkout.rb}, relation imports, scope shop
///     receipt.rb  --imports--> pricing.rb
///     checkout.rb --imports--> pricing.rb
///     receipt.rb  --imports--> checkout.rb    (induced lateral edge)
///
///   geometry (draw order, tree or adjacency)  -> the same three edges
///   reversed arrow        Imports(b->a)  !=  Imports(a->b)
///   relabelled relation   Defines(a->b)  !=  Imports(a->b)
///   proof readout   Name :- its premises  !=  route readout  Name -> steps
///
/// Proposition. A projected edge is identified by its directed endpoints and
/// its relation, and nothing else. A drawing may reorder or re-lay the same
/// edges, so a geometry-only change preserves every edge identity; reversing an
/// arrow or changing its relation is a different edge and is never an accepted
/// projection of the original. Proof meaning and route meaning stay distinct.
///
/// Reused envelope. `Attune.View.induced` already computes the induced view,
/// `viewNodeTexts`/`viewEdgeTexts` print node and directed edge sets, and
/// `renderProof`/`renderRoutes` are the shared proof and route adapters over the
/// one `Attune.AsciiTree` writer. This proposal adds only the edge identity key
/// and its projection laws; it adds no second view catalog or layout engine.
///
/// Enforcement. RUNTIME. `edgeKey`, `reversed` and `relabelled` are ordinary
/// typed functions and the compiler accepts a wrongly drawn edge, so the laws
/// below are executed native fixtures. No compiler-negative fixture is claimed.
///
/// Open. A full view catalog, large-graph layout and general C4 recovery stay
/// undecided; this is one induced view over the actual renderer envelope.

/// The exact identity of one projected edge: directed endpoints and relation.
/// Position, draw order and layout mode are geometry, not identity.
pub def edgeKey(edge: View.ViewEdge): (String, Atom, String) =
    (edge#source, edge#relation, edge#target)

/// A wrong projection that reverses one arrow: a different edge identity.
pub def reversed(edge: View.ViewEdge): View.ViewEdge =
    { source = edge#target, relation = edge#relation, target = edge#source }

/// A wrong projection that relabels one edge: a different edge identity.
pub def relabelled(edge: View.ViewEdge, relation: Atom): View.ViewEdge =
    { source = edge#source, relation = relation, target = edge#target }

def limits(): AsciiTree.Limits = AsciiTree.limits(16, 64, 100, 64, 4096)

def fact(scope: String, source: String, atom: Atom, target: String): Fact =
    { world = World.World(scope), source = source, atom = atom, target = target }

def seed(id: String): View.ViewSeed = { id = id, domain = Domain.Files }

/// The authored shop graph: two seeds with a shared child and a lateral edge
/// from one seed to the other.
def shopFacts(): List[Fact] = List#{
    fact("shop", "receipt.rb", Atom.Imports, "pricing.rb"),
    fact("shop", "checkout.rb", Atom.Imports, "pricing.rb"),
    fact("shop", "receipt.rb", Atom.Imports, "checkout.rb")
}

def seeds(): List[View.ViewSeed] = List#{ seed("receipt.rb"), seed("checkout.rb") }

/// The seed-and-relation view produces the exact node set and the exact directed
/// edge set, including the lateral edge between the two seeds that no traversal
/// tree would draw.
@Test
def anInducedViewProjectsTheExactDirectedEdges(): Unit \ Assert = {
    let view = View.induced(shopFacts(), "imports", "shop", seeds(), List#{Atom.Imports});
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
    Assert.assertEq(expected = true,
        List.exists(edge -> edgeKey(edge) == ("receipt.rb", Atom.Imports, "checkout.rb"), view#edges))
}

/// A geometry-only change reorders the same edges without changing one identity:
/// reversing the authored input order yields the identical drawing and keys.
@Test
def aGeometryOnlyChangeKeepsEveryEdge(): Unit \ Assert = {
    let view = View.induced(shopFacts(), "imports", "shop", seeds(), List#{Atom.Imports});
    let redrawn = View.induced(List.reverse(shopFacts()), "imports", "shop", seeds(), List#{Atom.Imports});
    Assert.assertEq(expected = List.sort(View.viewEdgeTexts(view)), List.sort(View.viewEdgeTexts(redrawn)));
    Assert.assertEq(expected = View.renderView(limits(), view), View.renderView(limits(), redrawn))
}

/// Geometry cannot reverse an arrow: the reversed edge is a different identity
/// that carries the swapped endpoints.
@Test
def geometryCannotReverseAnEdge(): Unit \ Assert = {
    let edge = { source = "receipt.rb", relation = Atom.Imports, target = "pricing.rb" };
    Assert.assertEq(expected = false, edgeKey(edge) == edgeKey(reversed(edge)));
    Assert.assertEq(expected = ("pricing.rb", Atom.Imports, "receipt.rb"), edgeKey(reversed(edge)))
}

/// Imports cannot be relabelled as a write: the envelope admits exactly its six
/// directed atoms and no `writes`, so a relabel is a different declared atom or
/// does not typecheck at all.
@Test
def importsCannotBeRelabelledAsAWrite(): Unit \ Assert = {
    let edge = { source = "receipt.rb", relation = Atom.Imports, target = "pricing.rb" };
    Assert.assertEq(expected = false, edgeKey(edge) == edgeKey(relabelled(edge, Atom.Defines)));
    Assert.assertEq(expected = 6, List.length(Envelope.atoms()));
    Assert.assertEq(expected = false, List.exists(atom -> Envelope.atomName(atom) == "writes", Envelope.atoms()))
}

/// A proof readout and a route readout are different documents under the one
/// writer: a proof carries `:-` premises while a route carries `->` steps and a
/// recorded answer status.
@Test
def proofAndRouteMeaningsStayDistinct(): Unit \ Assert = {
    let premise = { role = "pair", text = "Imports(shop, receipt.rb, pricing.rb)", holds = true, bindings = List#{("x", "receipt.rb")} };
    let application = { head = "ViewImport(shop, x, y)", scope = "shop", premises = List#{premise} };
    let proof = { goal = "ViewImport", scope = "shop", outcome = Outcome.Witness, detail = "", application = application, alternatives = Nil };
    let proofText = match View.renderProof(limits(), proof) {
        case Ok(text) => text
        case Err(_)   => ""
    };
    let world = World.World("shop-v1");
    let recorded = { id = 1, snapshot = world, memo = "demo", input = Envelope.files(world, List#{"receipt.rb"}), atom = Atom.Imports, output = Envelope.files(world, List#{"pricing.rb"}), work = View.Work.Computed };
    let route = { name = "R", seed = Envelope.files(world, List#{"receipt.rb"}), steps = List#{recorded} };
    let routeText = match View.renderRoutes(limits(), world, "demo", List#{route}) {
        case Ok(text) => text
        case Err(_)   => ""
    };
    Assert.assertEq(expected = true, String.contains(substr = "graph=proof", proofText));
    Assert.assertEq(expected = true, String.contains(substr = ":-", proofText));
    Assert.assertEq(expected = true, String.contains(substr = "graph=route", routeText));
    Assert.assertEq(expected = true, String.contains(substr = " -> ", routeText))
}
