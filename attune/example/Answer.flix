use Attune.{Artifacts, Effects}

/// This action replays an authored answer. A live SDK action would need its
/// own explicit network/credential boundary; the offline graph never calls it.
def main(): Unit \ IO = {
    let request = Artifacts.required(Artifacts.decodeRequest(Artifacts.input("request")));
    let saved = Artifacts.required(Artifacts.decodeAnswer(Artifacts.input("saved")));
    let vector = Artifacts.required(Effects.withSavedAnswers(
        () -> Effects.Embedding.vectorFor(request), List#{saved}));
    Artifacts.write(Artifacts.encodeAnswer(request, vector))
}
