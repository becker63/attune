use Seam.{Outcome, outcome}

import attune.inference.AttuneInference

/// P10 - typed artifacts and effect/handler seams.
///
/// Question. What identifies a produced artifact, and how do schema, producer
/// and input keep an evaluator's gold out of a prediction?
///
///   artifact identity = (schema, producer, input)
///     Embedding  producer=fixture-embed  input=corpus-1
///
///   acquisition  request -> recorded fake exchange -> decoded envelope
///                (approved SDK seam; no provider, credential or socket)
///   round trip   reread identity == stored identity    -> the same artifact
///   wrong schema Prediction     != Embedding           -> rejected
///   wrong input  corpus-2       != corpus-1            -> rejected
///
///   prediction input <- only an Embedding artifact
///   evaluator gold   <- only the evaluator type; no constructor into prediction
///
/// Proposition. An artifact is identified by its declared schema, its producer
/// and its exact input, never by its bytes alone. A replay is admitted only when
/// that identity matches, so a wrong schema or a different input rejects instead
/// of masquerading as the stored artifact. A gold label is a different nominal
/// type and only an embedding artifact yields a prediction input, so an
/// evaluator-gold-shaped value has no typed path into prediction.
///
/// Reused seam. The one effect is the approved LangChain4j embedding seam
/// `AttuneInference.embed` against a deterministic recorded exchange; no
/// provider is contacted and no credential is read. This proposal adds only the
/// typed artifact identity, the replay boundary and the prediction separation;
/// it adds no store, schema registry, scheduler or security framework.
///
/// Enforcement. RUNTIME. `acquire`, `accept` and `predictInput` are ordinary
/// typed functions; the compiler checks the record shapes but cannot see that a
/// replay identity is honest, so the laws below are executed native fixtures.
/// `predict` consumes only `PredictionInput`, which has no constructor from
/// `GoldLabel`, so the gold separation holds by nominal type; it is demonstrated
/// at runtime here and no isolated compiler-negative fixture is claimed.
///
/// Open. Final materialization granularity, shared build stages, parallel
/// runtime and production storage stay undecided.

/// The declared schema of a produced artifact. Closed: an evaluator's gold and a
/// prediction input are different schemas, not interchangeable labels.
pub enum Schema with Eq, ToString {
    case Embedding
    case Prediction
    case Gold
}

/// One produced artifact: declared schema, producer identity, exact input
/// identity and the producer's recorded payload bytes. The first three are the
/// artifact's identity; the payload is evidence, not the artifact's name.
pub type alias Artifact = { schema = Schema, producer = String, input = String, payload = String }

/// The exact identity of one artifact.
pub def artifactIdentity(artifact: Artifact): (Schema, String, String) =
    (artifact#schema, artifact#producer, artifact#input)

/// A prediction input is a distinct nominal type. Only an `Embedding` artifact
/// yields one, and no constructor accepts a gold label.
pub enum PredictionInput with Eq, ToString {
    case PredictionInput(String)
}

/// An evaluator gold label is its own type, sealed off from prediction.
pub enum GoldLabel with Eq {
    case GoldLabel(String)
}

/// The typed result of one acquisition: a produced artifact or a classified
/// rejection. A rejection is never an empty successful artifact.
pub enum Acquired {
    case Produced(Artifact)
    case Rejected(String)
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

/// The recorded fake embedding request for one authored input identity.
def request(model: String, input: String): String =
    "{\"model\":\"" + model + "\",\"inputs\":[\"" + input + "\"]}"

/// The one effect: acquire one artifact through the approved SDK seam against a
/// recorded fake exchange. A classified rejection is a typed value, never a
/// fabricated or empty artifact.
pub def acquire(model: String, input: String, status: Int32, body: String): Acquired \ IO = {
    let envelope = AttuneInference.embed(request(model, input), status, body);
    match outcome(envelope) {
        case Outcome.Rejected(kind) => Acquired.Rejected(kind)
        case Outcome.Decoded(_)     => Acquired.Produced(
            { schema = Schema.Embedding, producer = model, input = input, payload = envelope })
    }
}

/// The typed identity of an acquisition, or `None` for a rejection.
pub def acquiredIdentity(acquired: Acquired): Option[(Schema, String, String)] = match acquired {
    case Acquired.Produced(artifact) => Some(artifactIdentity(artifact))
    case Acquired.Rejected(_)        => None
}

/// The recorded payload of a produced artifact, or `None` for a rejection.
pub def acquiredPayload(acquired: Acquired): Option[String] = match acquired {
    case Acquired.Produced(artifact) => Some(artifact#payload)
    case Acquired.Rejected(_)        => None
}

/// The classified rejection kind, or `None` for a produced artifact.
pub def acquiredRejection(acquired: Acquired): Option[String] = match acquired {
    case Acquired.Produced(_)    => None
    case Acquired.Rejected(kind) => Some(kind)
}

/// The replay boundary: a re-read artifact is admitted only when its exact
/// identity equals the stored one, so a wrong schema or a different input
/// rejects instead of masquerading as the stored artifact.
pub def accept(stored: Artifact, candidate: Artifact): Result[String, Artifact] =
    if (artifactIdentity(stored) != artifactIdentity(candidate)) Err("artifact identity mismatch") else Ok(stored)

/// The only route by which a gold label becomes an artifact: a gold-schema
/// artifact, which `predictInput` refuses.
pub def goldArtifact(label: GoldLabel, task: String): Artifact = match label {
    case GoldLabel.GoldLabel(text) =>
        { schema = Schema.Gold, producer = "evaluator", input = task, payload = text }
}

/// One recorded embedding response, reused by the fixtures below.
def recordedBody(): String =
    "{\"object\":\"list\",\"data\":[{\"object\":\"embedding\",\"index\":0,\"embedding\":[0.5,-0.25]}],\"model\":\"fixture-embed\",\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":0,\"total_tokens\":1}}"

/// The authored artifact round-trips through the fake handler: two acquisitions
/// of the same identity are the same artifact, carrying the same payload.
@Test
def anAuthoredArtifactRoundTripsThroughTheFakeHandler(): Unit \ {Assert, IO} = {
    let stored = acquire("fixture-embed", "corpus-1", 200, recordedBody());
    let reread = acquire("fixture-embed", "corpus-1", 200, recordedBody());
    Assert.assertEq(expected = Some((Schema.Embedding, "fixture-embed", "corpus-1")), acquiredIdentity(stored));
    Assert.assertEq(expected = acquiredIdentity(stored), acquiredIdentity(reread));
    Assert.assertEq(expected = acquiredPayload(stored), acquiredPayload(reread))
}

/// A failed acquisition is a classified rejection, never an empty artifact.
@Test
def aFailedAcquisitionIsNotAnEmptyArtifact(): Unit \ {Assert, IO} = {
    let failed = acquire("fixture-embed", "corpus-1", 500, "{\"error\":\"upstream\"}");
    Assert.assertEq(expected = Some("transport"), acquiredRejection(failed));
    Assert.assertEq(expected = None, acquiredIdentity(failed))
}

/// A wrong schema does not round-trip: the same payload under a prediction
/// schema is a different artifact identity and is refused.
@Test
def aWrongSchemaDoesNotRoundTrip(): Unit \ Assert = {
    let stored = { schema = Schema.Embedding, producer = "fixture-embed", input = "corpus-1", payload = "vectors" };
    let wrong = { schema = Schema.Prediction, producer = "fixture-embed", input = "corpus-1", payload = "vectors" };
    Assert.assertEq(expected = false, artifactIdentity(stored) == artifactIdentity(wrong));
    Assert.assertErr(accept(stored, wrong))
}

/// A changed input or producer identity does not reuse the stored artifact, even
/// when every payload byte is identical.
@Test
def aChangedIdentityDoesNotReuseTheStoredArtifact(): Unit \ Assert = {
    let stored = { schema = Schema.Embedding, producer = "fixture-embed", input = "corpus-1", payload = "vectors" };
    let otherInput = { schema = Schema.Embedding, producer = "fixture-embed", input = "corpus-2", payload = "vectors" };
    let otherProducer = { schema = Schema.Embedding, producer = "fixture-other", input = "corpus-1", payload = "vectors" };
    Assert.assertEq(expected = stored#payload, otherInput#payload);
    Assert.assertErr(accept(stored, otherInput));
    Assert.assertErr(accept(stored, otherProducer))
}

/// A gold-shaped evaluator input has no path into prediction: the gold artifact
/// yields no prediction input and is not an acceptable replay candidate for one.
@Test
def goldShapedInputHasNoPathIntoPrediction(): Unit \ Assert = {
    let gold = goldArtifact(GoldLabel.GoldLabel("modified-pricing.rb"), "task-1");
    let embedding = { schema = Schema.Embedding, producer = "fixture-embed", input = "corpus-1", payload = "vectors" };
    Assert.assertEq(expected = Schema.Gold, gold#schema);
    Assert.assertEq(expected = None, predictInput(gold));
    Assert.assertEq(expected = Some(PredictionInput.PredictionInput("vectors")), predictInput(embedding));
    Assert.assertEq(expected = "prediction:vectors", predict(PredictionInput.PredictionInput("vectors")));
    Assert.assertEq(expected = false, Result.isOk(accept(gold, embedding)))
}
