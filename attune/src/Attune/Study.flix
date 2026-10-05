/// Study's small typed evidence and artifact values.
///
/// Source facts, scoped observations, separately versioned static witnesses,
/// task declarations, predictions and execution observations are different typed
/// owners. A witness, a complete no-match, unknown and failure stay distinct; an
/// observation is `ObservedTrue`, `ObservedFalse` or `Unmeasured`, with a
/// classified error kept separate; and an artifact is identified by its declared
/// schema, producer and exact input rather than by its bytes. Nothing here reads
/// a document, contacts a provider or decides a corpus verdict.
pub mod Attune.Study {

    use Attune.Envelope.{Atom, Fact, World}

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

    /// How much of one scope's observation window was actually seen. `Complete`
    /// is an honest claim that nothing else was observed; the others can never
    /// support a complete no-match.
    pub enum Coverage with Eq {
        case Complete
        case Partial
        case Missing
        case Failure(String)
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

    /// The declared schema of one produced artifact. Closed: an evaluator's gold
    /// and a prediction input are different schemas, not interchangeable labels.
    pub enum Schema with Eq, ToString {
        case Embedding
        case Prediction
        case Gold
    }

    /// One produced artifact: declared schema, producer identity, exact input
    /// identity and the producer's recorded payload bytes. The first three are
    /// the artifact's identity; the payload is evidence, not the artifact's name.
    pub type alias Artifact = { schema = Schema, producer = String, input = String, payload = String }

    /// The exact identity of one artifact.
    pub def artifactIdentity(artifact: Artifact): (Schema, String, String) =
        (artifact#schema, artifact#producer, artifact#input)

    /// A prediction input is a distinct nominal type. Only an `Embedding`
    /// artifact yields one, and no constructor accepts a gold label.
    pub enum PredictionInput with Eq, ToString {
        case PredictionInput(String)
    }

    /// An evaluator gold label is its own type, sealed off from prediction.
    pub enum GoldLabel with Eq {
        case GoldLabel(String)
    }

    /// The single typed prediction entry point; it consumes only a prediction input.
    pub def predict(input: PredictionInput): String = match input {
        case PredictionInput.PredictionInput(payload) => "prediction:" + payload
    }

    /// Admit a prediction input from an artifact. Only the embedding schema yields
    /// one; a gold- or prediction-schema artifact has no path here.
    pub def predictInput(artifact: Artifact): Option[PredictionInput] =
        if (artifact#schema == Schema.Embedding) Some(PredictionInput.PredictionInput(artifact#payload))
        else None

    /// The replay boundary: a re-read artifact is admitted only when its exact
    /// identity equals the stored one, so a wrong schema or a different input
    /// rejects instead of masquerading as the stored artifact.
    pub def accept(stored: Artifact, candidate: Artifact): Result[String, Artifact] =
        if (artifactIdentity(stored) != artifactIdentity(candidate)) Err("artifact identity mismatch")
        else Ok(stored)

    /// The only route by which a gold label becomes an artifact: a gold-schema
    /// artifact, which `predictInput` refuses.
    pub def goldArtifact(label: GoldLabel, task: String): Artifact = match label {
        case GoldLabel.GoldLabel(text) =>
            { schema = Schema.Gold, producer = "evaluator", input = task, payload = text }
    }
}
