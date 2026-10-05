/// P05 - native first-class Datalog composition.
///
/// Question. How do two native fragments actually join, and why is putting
/// their rules in one set not the same as requiring both?
///
///   world good:  receipt.rb  --imports--> pricing.rb
///                checkout.rb --imports--> pricing.rb
///
///   fragment pairRules(requireDistinct): two Imports join on a shared scope s
///                                       and a shared center
///     Pair(s, a, b, center) :- Imports(s, a, center), Imports(s, b, center)
///
///   fragment separatedRules(maxPeer): consumes Pair as an explicit shared role
///     Separated(s, a, b, center) :- Pair(...), Peer(s, a, b, n), n <= maxPeer
///
///   loose and strict Pair rules on one self-import fact Imports("one", r, p)
///     loose  -> {(receipt.rb, receipt.rb)}   [1 row]
///     strict -> {}                           [0 rows]
///     union  -> {(receipt.rb, receipt.rb)}   [1 row]
///     conjunction would be {}: union is NOT conjunction of answers
///
/// Proposition. A parameterized fragment is composed by a real shared-role
/// join, not by string substitution. Projection (`select`) and explicit
/// distinctness (`a != b`) are separate choices, and an explicit candidate id
/// keeps two candidates' rows from leaking into one another.
///
/// Vocabulary. The relation vocabulary here is deliberately tiny; the final
/// vocabulary stays open. Every fragment declares the same fixed public schema
/// with bounded role slots, which is the small lowering strategy: no runtime
/// rule text, no string DSL and no custom solver.
///
/// Enforcement. RUNTIME. The union, projection and isolation laws below are
/// executed native fixtures; the fragment arities, term types and shared schema
/// are checked by the compiler when this file compiles. No separate
/// compiler-negative fixture is added, so no static composition claim is made.
///
/// Open. Whether candidate isolation travels as an explicit id column or as
/// hygienic local predicates, and which relations survive, stay undecided.

/// The one fixed public schema every fragment and fact set shares, so native
/// fragments compose. Unused predicates stay empty.
pub type alias ShopSchema = #{
    Imports(String, String, String),
    Peer(String, String, String, Int32),
    Pair(String, String, String, String),
    Separated(String, String, String, String),
    PairCand(String, String, String, String, String)
}

/// The parameterized shared-center join. `requireDistinct` is an ordinary typed
/// parameter captured by the fragment; it only tightens the guard.
pub def pairRules(requireDistinct: Bool): ShopSchema = #{
    Pair(s, a, b, center) :-
        Imports(s, a, center),
        Imports(s, b, center),
        if (not requireDistinct or a != b).
}

/// Both Pair rules in one set: this is rule-set union written as one fragment,
/// so it can be compared against the strict candidate on its own.
def unionPairRules(): ShopSchema = #{
    Pair(s, a, b, center) :- Imports(s, a, center), Imports(s, b, center).
    Pair(s, a, b, center) :- Imports(s, a, center), Imports(s, b, center), if (a != b).
}

/// A second fragment that consumes `Pair` as an explicit shared role and adds a
/// bounded measured condition.
pub def separatedRules(maxPeer: Int32): ShopSchema = #{
    Separated(s, a, b, center) :-
        Pair(s, a, b, center),
        Peer(s, a, b, n),
        if (n <= maxPeer).
}

/// Two candidates lowered to one fixed schema with an explicit candidate id
/// column, instead of two dynamically fabricated predicate names.
pub def candidateRules(): ShopSchema = #{
    PairCand("loose", s, a, b, center) :-
        Imports(s, a, center), Imports(s, b, center).
    PairCand("strict", s, a, b, center) :-
        Imports(s, a, center), Imports(s, b, center), if (a != b).
}

/// The authored tiny world used by these fixtures.
def pairFacts(): ShopSchema = #{
    Imports("good", "receipt.rb", "pricing.rb").
    Imports("good", "checkout.rb", "pricing.rb").
    Peer("good", "receipt.rb", "checkout.rb", 0).
    Peer("good", "checkout.rb", "receipt.rb", 0).
}

def oneSelfImport(): ShopSchema = #{
    Imports("one", "receipt.rb", "pricing.rb").
}

/// Two parameterized fragments join on the shared scope/center role: every pair
/// row must also carry a measured peer row.
@Test
def fragmentsJoinOnASharedRole(): Unit \ Assert = {
    let pairs = query pairFacts(), pairRules(true) select (a, b) from Pair("good", a, b, "pricing.rb");
    Assert.assertEq(expected = Set#{("receipt.rb", "checkout.rb"), ("checkout.rb", "receipt.rb")},
        Vector.toSet(pairs));
    let joined = query pairFacts(), pairRules(true), separatedRules(0)
        select s from Separated(s, a, b, "pricing.rb");
    Assert.assertEq(expected = Set#{"good"}, Vector.toSet(joined))
}

/// Rule-set union is not conjunction of answers: the strict candidate is empty
/// alone, but the loose rule answers once both rules share one set.
@Test
def unionOfRulesIsNotConjunction(): Unit \ Assert = {
    let loose = query oneSelfImport(), pairRules(false) select (a, b) from Pair("one", a, b, "pricing.rb");
    let strict = query oneSelfImport(), pairRules(true) select (a, b) from Pair("one", a, b, "pricing.rb");
    let union = query oneSelfImport(), unionPairRules() select (a, b) from Pair("one", a, b, "pricing.rb");
    Assert.assertEq(expected = Set#{("receipt.rb", "receipt.rb")}, Vector.toSet(loose));
    Assert.assertTrue(Vector.isEmpty(strict));
    Assert.assertEq(expected = Vector.toSet(loose), Vector.toSet(union));
    Assert.assertEq(expected = false, Vector.toSet(union) == Vector.toSet(strict))
}

/// Projection keeps the shared roles and drops the internal pair roles, while
/// the concrete assignment and the distinctness guard stay visible.
@Test
def projectionAndDistinctnessAreExplicit(): Unit \ Assert = {
    let centers = query pairFacts(), pairRules(true) select (s, center) from Pair(s, a, b, center);
    Assert.assertEq(expected = Set#{("good", "pricing.rb")}, Vector.toSet(centers));
    let assignments = query pairFacts(), pairRules(true) select (a, b) from Pair("good", a, b, "pricing.rb");
    Assert.assertEq(expected = 2, Vector.length(assignments))
}

/// Two candidates evaluated together do not contaminate one another because the
/// candidate id is part of the shared intermediate; each result matches the
/// same candidate evaluated separately.
@Test
def candidatesDoNotLeakAcrossAnExplicitId(): Unit \ Assert = {
    let loose = query oneSelfImport(), candidateRules()
        select (a, b) from PairCand("loose", "one", a, b, "pricing.rb");
    let strict = query oneSelfImport(), candidateRules()
        select (a, b) from PairCand("strict", "one", a, b, "pricing.rb");
    let separateLoose = query oneSelfImport(), pairRules(false) select (a, b) from Pair("one", a, b, "pricing.rb");
    let separateStrict = query oneSelfImport(), pairRules(true) select (a, b) from Pair("one", a, b, "pricing.rb");
    Assert.assertEq(expected = Vector.toSet(separateLoose), Vector.toSet(loose));
    Assert.assertEq(expected = Vector.toSet(separateStrict), Vector.toSet(strict));
    Assert.assertTrue(Vector.isEmpty(strict))
}

/// The counterexample to isolation: without the candidate id, one shared Pair
/// predicate lets the loose row answer the strict candidate too.
@Test
def aSharedPredicateLeaksBetweenCandidates(): Unit \ Assert = {
    let leaky = query oneSelfImport(), unionPairRules() select (a, b) from Pair("one", a, b, "pricing.rb");
    let strictAlone = query oneSelfImport(), pairRules(true) select (a, b) from Pair("one", a, b, "pricing.rb");
    Assert.assertEq(expected = 1, Vector.length(leaky));
    Assert.assertTrue(Vector.isEmpty(strictAlone))
}
