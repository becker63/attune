use Attune.{Artifacts, Effects}
use Util.Json
use Util.Json.ToJson.ToJson

/// The same algorithm resumes against artifacts supplied by Bazel.
/// All three independent answer actions must finish before this action runs.
def main(): Unit \ IO = {
    let answers = List.map(name -> Artifacts.required(Artifacts.decodeAnswer(Artifacts.input(name))),
        List#{"question", "cart", "mail"});
    let files = List#{("cart.rb", Artifacts.input("cart-source")), ("mail.rb", Artifacts.input("mail-source"))};
    let issue = Artifacts.input("issue");
    let ranking = Artifacts.required(Effects.withSavedAnswers(() -> Effects.locate(issue, files), answers));
    Artifacts.write(Json.toCompactString(ToJson.toJson(ranking)))
}
