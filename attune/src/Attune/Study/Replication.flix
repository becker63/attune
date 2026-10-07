///
/// The replicated-observation semantics of the five-observation lexical JEV
/// family (`VAL-REPL-001`).
///
/// One semantic request identity is shared by every replication of the same
/// logical decision: `(model, prompt, condition, task, candidate, payload hash)`.
/// A replication adds only its local `replicate_id`, so the identity of one
/// *observation* is the shared semantic memo identity plus that id, and the
/// observation key is the semantic request key plus the replicate id. Two
/// replications of one semantic request are therefore two observations rather
/// than one memo entry served twice, and no replication rewrites another's
/// bytes.
///
/// Only a `Relevant` typed outcome casts a vote. `NotRelevant`, `Unknown` and a
/// typed `Failed` carry no vote and are never a negative; a failed observation
/// stays visible beside the votes instead of silently dropping out of the
/// population.
///
/// This module owns no metric and no provider mechanics. It states the identity
/// and vote law that the downstream family artifact records and that the later
/// stability and ensemble reductions reuse.
///
pub mod Attune.Study.Replication {

    use Attune.Study.Jev

    /// The declared replicate identities of the five-observation family, in
    /// preregistered order. Replicate 1 is the existing original observation that
    /// is never discarded, re-requested or rewritten; replicates 2..5 are the
    /// four deliberately new observations.
    pub def replicateIds(): List[Int32] = 1 :: 2 :: 3 :: 4 :: 5 :: Nil

    /// The semantic request key of one logical decision: its exact payload hash.
    /// Every replication of that decision carries the same key.
    pub def semanticRequestKey(payloadHash: String): String = payloadHash

    /// The observation key: the semantic request key plus the local replicate id.
    /// Replications of one semantic request are distinct observations, and two
    /// different semantic requests are never conflated merely by sharing a
    /// replicate id.
    pub def observationKey(semanticRequestKey: String, replicateId: Int32): String =
        semanticRequestKey + "#r" + Int32.toString(replicateId)

    /// The semantic memo identity shared by every replication of one logical
    /// decision: model, prompt, condition, task, candidate and payload hash.
    pub def semanticIdentity(
        model: String,
        prompt: String,
        condition: String,
        task: String,
        candidate: String,
        payloadHash: String): String =
        List.join("|", model :: prompt :: condition :: task :: candidate :: payloadHash :: Nil)

    /// The observation identity: the shared semantic memo identity plus the local
    /// replicate id.
    pub def observationIdentity(
        model: String,
        prompt: String,
        condition: String,
        task: String,
        candidate: String,
        payloadHash: String,
        replicateId: Int32): String =
        semanticIdentity(model, prompt, condition, task, candidate, payloadHash) + "|r" + Int32.toString(replicateId)

    /// The vote of one typed outcome: only `Relevant` counts. A typed `Failed`
    /// and an explicit `Unknown` cast no vote, and neither is a negative.
    pub def vote(outcome: Jev.JevOutcome): Int32 = if (Jev.promotes(outcome)) 1 else 0

    /// Whether one typed outcome is a vote at all.
    pub def voted(outcome: Jev.JevOutcome): Bool = Jev.promotes(outcome)

    /// The declared name of one replicated condition: `A1`..`A5`, `S1`..`S5`.
    pub def replicateName(condition: String, replicateId: Int32): String =
        condition + Int32.toString(replicateId)
}
