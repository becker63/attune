use Attune.Artifacts

/// The default command builds the graph, then reads its produced result.
def main(): Unit \ IO = {
    println("Attune / a request is not an execution\n");
    println("Flix requests -> declared files -> Bazel actions -> saved answers");
    println("                                                        |");
    println("                                              Flix ranks the files\n");
    println(Artifacts.input("example/ranking.json"));
    println("These tiny vectors are authored fixtures, not model measurements.");
    println("Change a model, recipe, or input: an old answer no longer applies.");
    println("\nRead src/Attune/Effects.flix, then example/BUILD.bazel.");
    println("Bazel schedules the three answer actions. Flix uses no concurrency.")
}
