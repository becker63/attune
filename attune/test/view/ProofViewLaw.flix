use Attune.AsciiTree
use Attune.Coverage.{Outcome, outcomeName}
use Attune.Envelope
use Attune.Envelope.{Atom, World}
use Attune.View

/// Native `@Test` laws for the proof adapter, driven by a native Datalog fixture.
///
/// The rule below is a real first-class Datalog fragment. The query verifies
/// that the authored world has exactly the two convergent applications, and the
/// rendered proof preserves one application with ALL its premises while marking
/// the second as a separate alternative. A false premise, an unknown state and a
/// failure stay distinct from a witness, and a proof readout stays a different
/// document from a route readout under the one writer.

def limits(): AsciiTree.Limits = AsciiTree.limits(16, 64, 100, 100, 4096)

def lines(xs: List[String]): String = List.join("\n", xs) + "\n"

/// One conjunction with two distinct importers meeting at one center.
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

def app(head: String, scope: String, premises: List[View.Premise]): View.Application =
    { head = head, scope = scope, premises = premises }

/// The positive witness keeps the head, every premise and the exact bindings,
/// and the second Datalog solution is marked separately.
@Test
def aConjunctionProofKeepsEveryPremise(): Unit \ Assert = {
    let facts = #{
        Imports("good", "receipt.rb", "pricing.rb").
        Imports("good", "checkout.rb", "pricing.rb").
    };
    let rows = query facts, pairRules() select (a, b) from Pair("good", a, b, "pricing.rb");
    Assert.assertEq(
        expected = Set#{("receipt.rb", "checkout.rb"), ("checkout.rb", "receipt.rb")},
        Vector.toSet(rows));
    let main = app("Pair(s, a, b, center)", "good", List#{
        premise("left", "Imports(s, a, center)", true,
            List#{("s", "good"), ("a", "receipt.rb"), ("center", "pricing.rb")}),
        premise("right", "Imports(s, b, center)", true,
            List#{("s", "good"), ("b", "checkout.rb"), ("center", "pricing.rb")}),
        premise("", "a != b", true, Nil)
    });
    let alternative = app("Pair(s, a, b, center)", "good", List#{
        premise("left", "Imports(s, a, center)", true,
            List#{("s", "good"), ("a", "checkout.rb"), ("center", "pricing.rb")}),
        premise("right", "Imports(s, b, center)", true,
            List#{("s", "good"), ("b", "receipt.rb"), ("center", "pricing.rb")}),
        premise("", "a != b", true, Nil)
    });
    let proof = { goal = "Pair", scope = "good", outcome = Outcome.Witness, detail = "",
        application = main, alternatives = alternative :: Nil };
    let expected = lines(
        "graph=proof goal=Pair scope=good" ::
        "outcome=WITNESS" ::
        "" ::
        "Pair(s, a, b, center) :-" ::
        "+-- left Imports(s, a, center)  [s=good, a=receipt.rb, center=pricing.rb]" ::
        "+-- right Imports(s, b, center)  [s=good, b=checkout.rb, center=pricing.rb]" ::
        "`-- a != b  [true]" ::
        "" ::
        "alternative 1: Pair(s, a, b, center) :-" ::
        "               +-- left Imports(s, a, center)  [s=good, a=checkout.rb, center=pricing.rb]" ::
        "               +-- right Imports(s, b, center)  [s=good, b=receipt.rb, center=pricing.rb]" ::
        "               `-- a != b  [true]" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderProof(limits(), proof))
}

/// One file cannot fill two distinct roles: the native query returns no row, and
/// the readout shows the false guard rather than an empty success.
@Test
def aFalsePremiseIsANoMatchNotAWitness(): Unit \ Assert = {
    let facts = #{ Imports("one", "receipt.rb", "pricing.rb"). };
    let rows = query facts, pairRules() select (a, b) from Pair("one", a, b, "pricing.rb");
    Assert.assertTrue(Vector.isEmpty(rows));
    let proof = { goal = "Pair", scope = "one", outcome = Outcome.NoMatch, detail = "",
        application = app("Pair(s, a, b, center)", "one", List#{
            premise("left", "Imports(s, a, center)", true,
                List#{("s", "one"), ("a", "receipt.rb"), ("center", "pricing.rb")}),
            premise("right", "Imports(s, b, center)", true,
                List#{("s", "one"), ("b", "receipt.rb"), ("center", "pricing.rb")}),
            premise("", "a != b", false, Nil)
        }),
        alternatives = Nil };
    let expected = lines(
        "graph=proof goal=Pair scope=one" ::
        "outcome=NO-MATCH" ::
        "" ::
        "Pair(s, a, b, center) :-" ::
        "+-- left Imports(s, a, center)  [s=one, a=receipt.rb, center=pricing.rb]" ::
        "+-- right Imports(s, b, center)  [s=one, b=receipt.rb, center=pricing.rb]" ::
        "`-- a != b  [false]" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderProof(limits(), proof))
}

/// Unknown and failure are their own states, not a match and not each other.
@Test
def unknownAndFailureStayDistinct(): Unit \ Assert = {
    let noApplication = app("Pair(s, a, b, center)", "good", Nil);
    let unknown = { goal = "Pair", scope = "good", outcome = Outcome.Unknown,
        detail = "evidence-incomplete", application = noApplication, alternatives = Nil };
    let failed = { goal = "Pair", scope = "good", outcome = Outcome.Failed,
        detail = "extractor-error", application = noApplication, alternatives = Nil };
    Assert.assertEq(
        expected = Ok(lines("graph=proof goal=Pair scope=good" :: "outcome=UNKNOWN" ::
            "detail=evidence-incomplete" :: Nil)),
        View.renderProof(limits(), unknown));
    Assert.assertEq(
        expected = Ok(lines("graph=proof goal=Pair scope=good" :: "outcome=FAILED" ::
            "detail=extractor-error" :: Nil)),
        View.renderProof(limits(), failed));
    Assert.assertEq(expected = false, outcomeName(unknown#outcome) == outcomeName(failed#outcome));
    Assert.assertEq(expected = false, outcomeName(unknown#outcome) == outcomeName(Outcome.Witness))
}

/// A proof readout and a route readout are different documents under the one
/// writer: a proof carries `:-` premises with their bindings, while a route
/// carries `->` steps and a recorded answer status. Geometry never merges the
/// two meanings, and a proved claim is never presented as a route.
@Test
def proofAndRouteReadoutsStayDistinct(): Unit \ Assert = {
    let main = app("ViewImport(shop, x, y)", "shop", List#{
        premise("pair", "Imports(shop, receipt.rb, pricing.rb)", true, List#{("x", "receipt.rb")})
    });
    let proof = { goal = "ViewImport", scope = "shop", outcome = Outcome.Witness, detail = "",
        application = main, alternatives = Nil };
    let proofText = match View.renderProof(limits(), proof) {
        case Ok(text) => text
        case Err(_)   => ""
    };
    let world = World.World("shop-v1");
    let recorded = { id = 1, snapshot = world, memo = "demo",
        input = Envelope.files(world, List#{"receipt.rb"}), atom = Atom.Imports,
        output = Envelope.files(world, List#{"pricing.rb"}), work = View.Work.Computed };
    let route = { name = "R", seed = Envelope.files(world, List#{"receipt.rb"}), steps = recorded :: Nil };
    let routeText = match View.renderRoutes(limits(), world, "demo", route :: Nil) {
        case Ok(text) => text
        case Err(_)   => ""
    };
    Assert.assertEq(expected = true, String.contains(substr = "graph=proof", proofText));
    Assert.assertEq(expected = true, String.contains(substr = ":-", proofText));
    Assert.assertEq(expected = true, String.contains(substr = "graph=route", routeText));
    Assert.assertEq(expected = true, String.contains(substr = " -> ", routeText))
}
