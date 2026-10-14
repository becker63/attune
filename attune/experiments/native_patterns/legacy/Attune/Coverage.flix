/// The one canonical generic coverage, evidence and support vocabulary.
///
/// This is the shared core home for the values every later owner reuses: an
/// exact acquisition scope carried with its world-bearing nominal facts, how
/// much of that scope was actually observed, the witness/no-match/unknown/
/// failure outcome, the observed/proposed status of one supporter, and the
/// tri-state observation component.
///
/// The ownership direction is deliberate and acyclic. `Attune.Repository` earns
/// acquisition completeness and supplies one nominal world-bearing facts /
/// earned scoped coverage bridge. `Attune.Theory` consumes core values and a
/// world's facts and never imports Study or View. `Attune.Study` consumes the
/// structural artifacts. Nothing here reads a document, contacts a provider or
/// decides a corpus verdict, and no arbitrary passed-in coverage state can
/// substitute for acquisition evidence: a complete no-match needs `Complete`
/// coverage, which only an owner that actually earned it may claim.
pub mod Attune.Coverage {

    use Attune.{Atom, Fact, World}

    /// How much of one scope's observation window was actually seen. `Complete`
    /// is an honest claim that nothing else was observed; the others can never
    /// support a complete no-match. It is the companion of this module, so it
    /// stays the first declaration here.
    pub enum Coverage with Eq, ToString {
        case Complete
        case Partial
        case Missing
        case Failure(String)
    }

    /// One exact acquisition scope: its world and the complete finite set of
    /// facts acquired for it. The world is part of the scope's identity, so a
    /// fact from another world can never donate a witness here.
    pub type alias WorldFacts = { world = World, facts = List[Fact] }

    /// The facts of one scope, carried with their world explicitly.
    pub def scoped(world: World, facts: List[Fact]): WorldFacts = { world = world, facts = facts }

    /// One logical outcome, distinct from an answer's emptiness.
    pub enum Outcome with Eq, ToString {
        case Witness
        case NoMatch
        case Unknown
        case Failed
    }

    /// The stable outcome name.
    pub def outcomeName(outcome: Outcome): String = match outcome {
        case Outcome.Witness => "WITNESS"
        case Outcome.NoMatch => "NO-MATCH"
        case Outcome.Unknown => "UNKNOWN"
        case Outcome.Failed  => "FAILED"
    }

    /// One scoped question: name an entity inside exactly one scope and ask one
    /// directed atom about it.
    pub type alias Query = { scope = World, subject = String, atom = Atom }

    /// Resolve a scoped question against a coverage claim and the observed facts.
    /// The scope is part of the match, so a fact from another scope is never
    /// donated.
    pub def observe(ask: Query, coverage: Coverage, facts: List[Fact]): Outcome = match coverage {
        case Coverage.Failure(_) => Outcome.Failed
        case Coverage.Complete  => if (hasWitness(ask, facts)) Outcome.Witness else Outcome.NoMatch
        case Coverage.Partial   => if (hasWitness(ask, facts)) Outcome.Witness else Outcome.Unknown
        case Coverage.Missing   => Outcome.Unknown
    }

    /// A witness is a fact of exactly this scope, subject and atom. The target is
    /// the answer, not part of the question.
    def hasWitness(ask: Query, facts: List[Fact]): Bool =
        List.exists(fact ->
            fact#world == ask#scope and fact#source == ask#subject and fact#atom == ask#atom, facts)

    /// How one supporting entity was obtained. Observed evidence was measured;
    /// Proposed evidence is a hypothesis, and only Observed evidence can meet an
    /// observed guard.
    pub enum Status with Eq {
        case Observed
        case Proposed
    }

    /// One piece of evidence: a shared scoped fact plus how it was obtained. The
    /// supporting entity is the fact's own source and the fact's scope is part of
    /// that identity, so a same-named entity in another scope is a different one.
    pub type alias Support = { fact = Fact, status = Status }

    /// The distinct observed entities that support `branch` in exactly `scope`.
    /// The result dedupes by entity identity, so two derivations naming one
    /// entity are one supporter and never two.
    pub def witnesses(scope: World, branch: String, items: List[Support]): List[String] =
        List.distinct(List.filterMap(item ->
            if (item#fact#world == scope and item#fact#target == branch and item#status == Status.Observed)
                Some(item#fact#source)
            else None, items))

    /// An explicit threshold over one sealed scope: it counts only observed
    /// entities of exactly this scope and branch.
    pub def meets(threshold: Int32, scope: World, branch: String, items: List[Support]): Bool =
        List.length(witnesses(scope, branch, items)) >= threshold

    /// The tri-state observation component, separate from any classified error.
    /// A missing or failed observation is `Unmeasured`, never `ObservedFalse`.
    pub enum Observation with Eq, ToString {
        case ObservedTrue
        case ObservedFalse
        case Unmeasured
    }

    /// The stable observation name.
    pub def observationName(observation: Observation): String = match observation {
        case Observation.ObservedTrue  => "true"
        case Observation.ObservedFalse => "false"
        case Observation.Unmeasured    => "unmeasured"
    }
}
