use Attune.Envelope.{Atom}
use Attune.View
use Attune.View.{Outcome, ViewFact}

/// P04 - scoped observations and completeness.
///
/// Question. When is "no such fact" a complete answer, and when is it only the
/// absence of evidence?
///
///   facts(shop-v1) = { shop-v1: pricing.rb --defines--> Pricing }
///
///   observe(shop-v1, pricing.rb, defines) with Complete evidence  -> WITNESS
///   observe(shop-v1, receipt.rb, defines) with Complete evidence  -> NO-MATCH
///   observe(shop-v2, pricing.rb, defines) with Complete evidence  -> NO-MATCH
///   observe(shop-v1, pricing.rb, defines) with Missing evidence   -> UNKNOWN
///   observe(shop-v1, pricing.rb, defines) after a failed read      -> FAILED
///
///   The shop-v1 `pricing.rb` fact is a witness in shop-v1 only. A same-named
///   file in shop-v2 is a different entity, so shop-v1 cannot donate a witness
///   to shop-v2, and an absent scope is never reported as a complete no-match.
///
/// Proposition. A positive match, a complete no-match, unknown and failure are
/// four distinct outcomes. `NO-MATCH` is only honest when the observation for
/// that exact scope is declared complete; partial or missing evidence stays
/// `UNKNOWN`, and a failed read is `FAILED`, never emptiness.
///
/// Reused envelope. The witness is the shared `Attune.View.ViewFact`, whose
/// `scope` is part of its identity, and the outcome vocabulary is the shared
/// closed `Attune.View.Outcome` that the proof adapter already uses. This
/// proposal adds only the coverage distinction and the scope-respecting lookup;
/// no second evidence store, census or threshold is introduced.
///
/// Enforcement. RUNTIME. `Coverage`, `Query` and `observe` are ordinary typed
/// values: the compiler cannot see that a `Complete` claim is honest, so the
/// scope check and the completeness ladder are runtime laws, exercised by the
/// native fixtures below. No dummy production body is added.
///
/// Open. Production scope recipes, census populations and empirical thresholds
/// stay undecided. `Complete` is a claim the caller must earn; this proposal does
/// not try to compute it.

/// How much of one scope's observation window was actually seen. `Complete` is
/// an honest claim that nothing else was observed; the others can never support
/// a complete no-match.
pub enum Coverage with Eq {
    case Complete
    case Partial
    case Missing
    case Failure(String)
}

/// One scoped question: name an entity inside exactly one scope and ask one
/// directed atom about it.
pub type alias Query = { scope = String, subject = String, atom = Atom }

/// Resolve a scoped question against a coverage claim and the observed facts.
/// The scope is part of the match, so a fact from another scope is never donated.
pub def observe(ask: Query, coverage: Coverage, facts: List[ViewFact]): Outcome = match coverage {
    case Coverage.Failure(_) => Outcome.Failed
    case Coverage.Complete  => if (hasWitness(ask, facts)) Outcome.Witness else Outcome.NoMatch
    case Coverage.Partial   => if (hasWitness(ask, facts)) Outcome.Witness else Outcome.Unknown
    case Coverage.Missing   => Outcome.Unknown
}

/// A witness is a fact of exactly this scope, subject and atom. The target is
/// the answer, not part of the question.
def hasWitness(ask: Query, facts: List[ViewFact]): Bool =
    List.exists(fact ->
        fact#scope == ask#scope and fact#source == ask#subject and fact#atom == ask#atom,
        facts)

/// One authored scoped fact.
def fact(scope: String, source: String, atom: Atom, target: String): ViewFact =
    { scope = scope, source = source, atom = atom, target = target }

/// A present fact answers its own scoped question.
@Test
def aPositiveMatchIsAWitness(): Unit \ Assert = {
    let facts = List#{fact("shop-v1", "pricing.rb", Atom.Defines, "Pricing")};
    let ask = { scope = "shop-v1", subject = "pricing.rb", atom = Atom.Defines };
    Assert.assertEq(expected = Outcome.Witness, observe(ask, Coverage.Complete, facts));
    Assert.assertEq(expected = "WITNESS", View.outcomeName(observe(ask, Coverage.Complete, facts)))
}

/// A complete observation with no matching fact is a no-match, not unknown.
@Test
def aCompleteNoMatchIsNotUnknown(): Unit \ Assert = {
    let facts = List#{fact("shop-v1", "pricing.rb", Atom.Defines, "Pricing")};
    let ask = { scope = "shop-v1", subject = "receipt.rb", atom = Atom.Defines };
    Assert.assertEq(expected = Outcome.NoMatch, observe(ask, Coverage.Complete, facts));
    Assert.assertEq(expected = "NO-MATCH", View.outcomeName(observe(ask, Coverage.Complete, facts)));
    Assert.assertEq(expected = false, observe(ask, Coverage.Complete, facts) == Outcome.Unknown)
}

/// No evidence is unknown; it is never a complete no-match.
@Test
def missingEvidenceStaysUnknown(): Unit \ Assert = {
    let ask = { scope = "shop-v1", subject = "pricing.rb", atom = Atom.Defines };
    Assert.assertEq(expected = Outcome.Unknown, observe(ask, Coverage.Missing, Nil));
    Assert.assertEq(expected = false, observe(ask, Coverage.Missing, Nil) == Outcome.NoMatch);
    Assert.assertEq(expected = false, observe(ask, Coverage.Missing, Nil) == Outcome.Failed)
}

/// A failed read is its own outcome, distinct from unknown and emptiness.
@Test
def failureIsNotEmptiness(): Unit \ Assert = {
    let ask = { scope = "shop-v1", subject = "pricing.rb", atom = Atom.Defines };
    let failed = observe(ask, Coverage.Failure("acquisition-error"), Nil);
    Assert.assertEq(expected = Outcome.Failed, failed);
    Assert.assertEq(expected = "FAILED", View.outcomeName(failed));
    Assert.assertEq(expected = false, failed == Outcome.Unknown)
}

/// A similarly named file in another scope cannot donate a witness.
@Test
def aForeignSimilarlyNamedFileCannotDonateAWitness(): Unit \ Assert = {
    let facts = List#{fact("shop-v1", "pricing.rb", Atom.Defines, "Pricing")};
    let own = { scope = "shop-v1", subject = "pricing.rb", atom = Atom.Defines };
    let foreign = { scope = "shop-v2", subject = "pricing.rb", atom = Atom.Defines };
    Assert.assertEq(expected = Outcome.Witness, observe(own, Coverage.Complete, facts));
    Assert.assertEq(expected = Outcome.NoMatch, observe(foreign, Coverage.Complete, facts));
    Assert.assertEq(expected = Outcome.Unknown, observe(foreign, Coverage.Partial, facts))
}
