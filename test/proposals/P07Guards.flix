use Attune.Envelope.{Atom}
use Attune.View.{ViewFact}

/// P07 - evidence guards, support and witnesses.
///
/// Question. When do two pieces of evidence really support a branch, and when
/// is "two proofs" only one entity counted twice?
///
///   sealed scope shop-v1
///     branch calls-pricing
///       entity Pricing.total   Observed
///       entity Pricing.rate    Observed
///     branch imports-pricing
///       entity pricing.rb      Observed
///
///   witnesses(shop-v1, calls-pricing) = {Pricing.total, Pricing.rate}   2
///   two paths that both name Pricing.total are ONE supporter, not two
///   a shop-v2 entity cannot pay for shop-v1's own threshold
///   a Proposed entity is not Observed, so it cannot pay either
///
/// Proposition. Support is the number of distinct observed entities inside one
/// sealed scope, not the number of derivation paths. A threshold is an explicit
/// parameter that counts only entities of the asked status in the asked scope,
/// so a foreign scope or a proposed hypothesis can never meet it.
///
/// Reused envelope. An observation is the shared `Attune.View.ViewFact`, whose
/// scope is part of its identity, and the relation is a shared
/// `Attune.Envelope.Atom`. This proposal adds only the observed/proposed status
/// and the scope-respecting support count; it introduces no second evidence
/// store, census or scoring engine.
///
/// Enforcement. RUNTIME. `witnesses` and `meets` are ordinary typed functions.
/// The pinned compiler checks their shapes but cannot see that a threshold is
/// honest, so every law below is an executed native fixture. No dummy production
/// body is added and no separate compiler-negative fixture is claimed.
///
/// Open. Which calibrated values deserve retention, and which architectural
/// names are worth keeping, stay undecided. `meets` is a guard, not a scoring
/// model, and this proposal computes no support weight beyond a distinct count.

/// How one supporting entity was obtained. Observed evidence was measured;
/// Proposed evidence is a hypothesis. The two never merge, and only Observed
/// evidence can meet an observed guard.
pub enum Status with Eq {
    case Observed
    case Proposed
}

/// One piece of evidence: a shared scoped observation plus how it was obtained.
/// The supporting entity is the fact's own subject, and the fact's scope is part
/// of that identity, so a same-named entity in another scope is a different one.
pub type alias Support = { fact = ViewFact, status = Status }

/// The distinct observed entities that support `branch` in exactly `scope`. The
/// result dedupes by entity identity, so two derivations naming one entity are
/// one supporter and never two.
pub def witnesses(scope: String, branch: String, items: List[Support]): List[String] =
    List.distinct(List.filterMap(item ->
        if (item#fact#scope == scope and item#fact#target == branch and item#status == Status.Observed)
            Some(item#fact#source)
        else None, items))

/// An explicit threshold over one sealed scope: it counts only observed entities
/// of exactly this scope and branch. Another scope and a proposed hypothesis can
/// never pay for it.
pub def meets(threshold: Int32, scope: String, branch: String, items: List[Support]): Bool =
    List.length(witnesses(scope, branch, items)) >= threshold

/// One authored observation of one entity supporting one branch.
def support(scope: String, entity: String, branch: String, status: Status): Support =
    { fact = { scope = scope, source = entity, atom = Atom.Calls, target = branch },
      status = status }

/// Two distinct entities support two branches: the count follows the entities,
/// not a display name, so each branch sees exactly its own supporters.
@Test
def twoDistinctEntitiesSupportTwoBranches(): Unit \ Assert = {
    let items = List#{
        support("shop-v1", "Pricing.total", "calls-pricing", Status.Observed),
        support("shop-v1", "Pricing.rate", "calls-pricing", Status.Observed),
        support("shop-v1", "pricing.rb", "imports-pricing", Status.Observed)
    };
    Assert.assertEq(expected = List#{"Pricing.rate", "Pricing.total"},
        List.sort(witnesses("shop-v1", "calls-pricing", items)));
    Assert.assertEq(expected = List#{"pricing.rb"}, witnesses("shop-v1", "imports-pricing", items))
}

/// Two proof paths to one entity are one supporter: counting the paths would
/// report three, but the distinct-entity guard stays below the paths.
@Test
def twoProofPathsToOneEntityAreOneSupporter(): Unit \ Assert = {
    let items = List#{
        support("shop-v1", "Pricing.total", "calls-pricing", Status.Observed),
        support("shop-v1", "Pricing.total", "calls-pricing", Status.Observed),
        support("shop-v1", "Pricing.rate", "calls-pricing", Status.Observed)
    };
    let paths = List.length(List.filter(item -> item#fact#target == "calls-pricing", items));
    Assert.assertEq(expected = 3, paths);
    Assert.assertEq(expected = 2, List.length(witnesses("shop-v1", "calls-pricing", items)));
    Assert.assertEq(expected = false, meets(3, "shop-v1", "calls-pricing", items))
}

/// A similarly named entity in another scope cannot meet this scope's guard: the
/// cross-scope count is two, but the sealed-scope count is one.
@Test
def anotherScopesEntityCannotMeetTheGuard(): Unit \ Assert = {
    let items = List#{
        support("shop-v1", "Pricing.total", "calls-pricing", Status.Observed),
        support("shop-v2", "Pricing.total", "calls-pricing", Status.Observed)
    };
    let acrossScopes = List.length(List.filter(item -> item#fact#target == "calls-pricing", items));
    Assert.assertEq(expected = 2, acrossScopes);
    Assert.assertEq(expected = true, meets(1, "shop-v1", "calls-pricing", items));
    Assert.assertEq(expected = false, meets(2, "shop-v1", "calls-pricing", items))
}

/// Observed and proposed evidence stay distinct: a proposed entity is invisible
/// to the observed guard even though it names the same entity.
@Test
def proposedEvidenceIsNotObserved(): Unit \ Assert = {
    let proposed = List#{ support("shop-v1", "Pricing.total", "calls-pricing", Status.Proposed) };
    Assert.assertTrue(List.isEmpty(witnesses("shop-v1", "calls-pricing", proposed)));
    Assert.assertEq(expected = false, meets(1, "shop-v1", "calls-pricing", proposed));
    Assert.assertEq(expected = true, meets(1, "shop-v1", "calls-pricing",
        List#{ support("shop-v1", "Pricing.total", "calls-pricing", Status.Observed) }))
}
