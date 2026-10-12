// The corpus-free replicated-observation laws (`VAL-REPL-001`).
//
// These drive the exact production identity and vote statements in
// `Attune.Study.Replication` with hand-built immutable values, so the five-
// observation family's identity law is pinned by a declared target rather than
// by an ad-hoc recomputation:
//
// - replications of one semantic request share the semantic request key and the
//   semantic memo identity, and differ only by their local replicate id;
// - the observation key is the semantic request key plus that id, so two
//   replications of one semantic request are two observations;
// - only `Relevant` casts a vote; `NotRelevant`, `Unknown` and a typed `Failed`
//   carry no vote and are never a negative.
//
// No corpus, world, Grit, receipt or label artifact is touched here.

use Attune.Study.Jev
use Attune.Study.Replication

/// The declared five-observation order is exactly replicates 1..5, and replicate
/// 1 is the preserved original.
@Test
def thePreregisteredReplicateOrderIsOneThroughFive(): Unit \ Assert = {
    Assert.assertEq(expected = 1 :: 2 :: 3 :: 4 :: 5 :: Nil, Replication.replicateIds());
    Assert.assertEq(expected = "A1", Replication.replicateName("A", 1));
    Assert.assertEq(expected = "S5", Replication.replicateName("S", 5))
}

/// Replications of one semantic request share the semantic request key, and the
/// observation key adds the local replicate id, so the five replications of one
/// semantic request are five distinct observations.
@Test
def theObservationKeyAddsTheReplicateIdToTheSemanticRequestKey(): Unit \ Assert = {
    let payload = "af9882e5d294f09dddc7de8fe7d00a2a8961f45bc75c67089fdb18602b5921c3";
    Assert.assertEq(expected = payload, Replication.semanticRequestKey(payload));
    let keys = List.map(id -> Replication.observationKey(payload, id), Replication.replicateIds());
    Assert.assertEq(expected = 5, List.length(List.distinct(keys)));
    Assert.assertEq(expected = "af9882e5#r3", Replication.observationKey("af9882e5", 3));
    Assert.assertEq(expected = false, Replication.observationKey(payload, 2) == Replication.observationKey(payload, 3))
}

/// The semantic memo identity is shared by every replication of one logical
/// decision, while the observation identity adds the local replicate id to it.
@Test
def theSemanticIdentityIsSharedAndTheObservationIdentityAddsTheReplicateId(): Unit \ Assert = {
    let semantic = Replication.semanticIdentity("m", "p", "A", "t.tsk", "src/a.ts", "hash");
    Assert.assertEq(expected = "m|p|A|t.tsk|src/a.ts|hash", semantic);
    Assert.assertEq(expected = semantic + "|r1", Replication.observationIdentity("m", "p", "A", "t.tsk", "src/a.ts", "hash", 1));
    Assert.assertEq(expected = false,
        Replication.observationIdentity("m", "p", "A", "t.tsk", "src/a.ts", "hash", 1)
            == Replication.observationIdentity("m", "p", "A", "t.tsk", "src/a.ts", "hash", 2))
}

/// Only a `Relevant` typed outcome casts a vote. An explicit `Unknown` and a
/// typed `Failed` keep their own identity and cast no vote, and none of the
/// non-`Relevant` outcomes is a negative.
@Test
def onlyRelevantCastsAVote(): Unit \ Assert = {
    Assert.assertEq(expected = 1, Replication.vote(Jev.JevOutcome.Relevant));
    Assert.assertEq(expected = 0, Replication.vote(Jev.JevOutcome.NotRelevant));
    Assert.assertEq(expected = 0, Replication.vote(Jev.JevOutcome.Unknown));
    Assert.assertEq(expected = 0, Replication.vote(Jev.JevOutcome.Failed("Timeout")));
    Assert.assertEq(expected = true, Replication.voted(Jev.JevOutcome.Relevant));
    Assert.assertEq(expected = false, Replication.voted(Jev.JevOutcome.Unknown));
    Assert.assertEq(expected = "Failed:Transport", Jev.outcomeName(Jev.parseOutcome("Failed:Transport")))
}
