use Attune.Effects
use Attune.Study.Qwen

/// An offline walkthrough. These two-dimensional vectors are authored examples,
/// not Qwen output, benchmark observations, or evidence of localization quality.
def main(): Unit \ IO = {
    let files = List#{("cart.rb", "def total; price * quantity; end"), ("mail.rb", "def send; deliver; end")};
    let saved = List#{
        (Effects.Request.Request(Qwen.modelIdentity(), Qwen.recipeIdentity(), Effects.queryText("wrong cart total")), List#{1.0f64, 0.0f64}),
        (Effects.Request.Request(Qwen.modelIdentity(), Qwen.recipeIdentity(), "def total; price * quantity; end"), List#{1.0f64, 0.0f64}),
        (Effects.Request.Request(Qwen.modelIdentity(), Qwen.recipeIdentity(), "def send; deliver; end"), List#{0.0f64, 1.0f64})
    };
    println("Attune / a request is not an execution\n");
    println("issue + files -> embedding requests -> saved answers -> rank files");
    println("                                         |\n                                         +-- no provider calls\n");
    match Effects.withSavedAnswers(() -> Effects.locate("wrong cart total", files), saved) {
        case Ok(ranking) => List.forEach(entry -> println("  " + Int32.toString(entry#rank) + ". " + entry#path), ranking)
        case Err(reason) => println("Unavailable: " + reason)
    };
    println("\nAuthored vectors: this demonstrates execution, not model quality.");
    println("Change the model, recipe, or input: the saved answer no longer applies.");
    println("\nFlix checks effects. Bazel schedules work and reuses unchanged artifacts.");
    println("Read attune/src/Attune/Effects.flix from the repository root.\nRun nix run .#test to check the implementation.")
}
