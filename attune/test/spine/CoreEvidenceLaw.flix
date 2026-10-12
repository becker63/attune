use Attune.{Atom, Fact, World}
use Attune.Coverage

def w(): World = World.World("shop-v1")

def fact(source: String, atom: Atom, target: String): Fact =
    { world = w(), source = source, atom = atom, target = target }

def support(entity: String, branch: String, status: Coverage.Status): Coverage.Support =
    { fact = fact(entity, Atom.Calls, branch), status = status }

/// A positive match, a complete no-match, unknown and failure stay distinct.
@Test
def witnessNoMatchUnknownAndFailureStayDistinct(): Unit \ Assert = {
    let facts = List#{ fact("pricing.rb", Atom.Defines, "Pricing") };
    let own = { scope = w(), subject = "pricing.rb", atom = Atom.Defines };
    let missing = { scope = w(), subject = "receipt.rb", atom = Atom.Defines };
    Assert.assertEq(expected = Coverage.Outcome.Witness, Coverage.observe(own, Coverage.Coverage.Complete, facts));
    Assert.assertEq(expected = Coverage.Outcome.NoMatch, Coverage.observe(missing, Coverage.Coverage.Complete, facts));
    Assert.assertEq(expected = Coverage.Outcome.Unknown, Coverage.observe(missing, Coverage.Coverage.Partial, facts));
    Assert.assertEq(expected = Coverage.Outcome.Unknown, Coverage.observe(own, Coverage.Coverage.Missing, Nil));
    Assert.assertEq(expected = Coverage.Outcome.Failed, Coverage.observe(own, Coverage.Coverage.Failure("acquisition-error"), Nil));
    Assert.assertEq(expected = false, Coverage.observe(missing, Coverage.Coverage.Missing, Nil) == Coverage.Outcome.NoMatch)
}

/// A similarly named file in another scope cannot donate a witness.
@Test
def aForeignScopeCannotDonateAWitness(): Unit \ Assert = {
    let facts = List#{ fact("pricing.rb", Atom.Defines, "Pricing") };
    let foreign = { scope = World.World("shop-v2"), subject = "pricing.rb", atom = Atom.Defines };
    Assert.assertEq(expected = Coverage.Outcome.NoMatch, Coverage.observe(foreign, Coverage.Coverage.Complete, facts));
    Assert.assertEq(expected = Coverage.Outcome.Unknown, Coverage.observe(foreign, Coverage.Coverage.Partial, facts))
}

/// Support counts distinct observed entities, never proof paths, and proposed
/// evidence cannot meet an observed guard.
@Test
def supportCountsDistinctEntitiesNotPaths(): Unit \ Assert = {
    let items = List#{
        support("Pricing.total", "calls-pricing", Coverage.Status.Observed),
        support("Pricing.total", "calls-pricing", Coverage.Status.Observed),
        support("Pricing.rate", "calls-pricing", Coverage.Status.Observed)
    };
    Assert.assertEq(expected = 3, List.length(List.filter(item -> item#fact#target == "calls-pricing", items)));
    Assert.assertEq(expected = 2, List.length(Coverage.witnesses(w(), "calls-pricing", items)));
    Assert.assertEq(expected = false, Coverage.meets(3, w(), "calls-pricing", items));
    Assert.assertEq(expected = false, Coverage.meets(1, w(), "calls-pricing",
        List#{ support("Pricing.total", "calls-pricing", Coverage.Status.Proposed) }))
}

/// The tri-state observation is not a boolean: unmeasured is distinct from false.
@Test
def observationTriStateIsNotABoolean(): Unit \ Assert = {
    Assert.assertEq(expected = "true", Coverage.observationName(Coverage.Observation.ObservedTrue));
    Assert.assertEq(expected = "false", Coverage.observationName(Coverage.Observation.ObservedFalse));
    Assert.assertEq(expected = "unmeasured", Coverage.observationName(Coverage.Observation.Unmeasured));
    Assert.assertEq(expected = false, Coverage.Observation.Unmeasured == Coverage.Observation.ObservedFalse)
}
