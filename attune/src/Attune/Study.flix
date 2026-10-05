/// Study's small typed structural-artifact values.
///
/// Study consumes the structural artifacts of one world: the declared schema of
/// a produced artifact, the artifact itself identified by schema, producer and
/// exact input rather than by its bytes, a prediction input sealed off from
/// gold, and an evaluator gold label. The generic coverage, evidence and support
/// vocabulary Study used to carry now lives in its one canonical core home,
/// `Attune.Coverage`, so Repository and Theory never have to import Study to
/// describe coverage and no Repository -> Study -> Theory cycle can form.
///
/// Nothing here reads a document, contacts a provider or decides a corpus
/// verdict.
pub mod Attune.Study {

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
