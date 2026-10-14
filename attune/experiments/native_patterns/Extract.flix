use Attune.Artifacts
use Attune.Repository.Grit
use Util.Json
use Util.Json.ToJson.toJson
import attune.grit.AttuneGritNative
import java.lang.System

def main(): Unit \ IO = {
    let start = System.nanoTime();
    let sources: Campaign.Source = Campaign.input("source");
    let observations = List.map(match (path, source) -> {
        let language = Artifacts.required(Option.toOk("Unsupported source: " + path, Grit.language(path)));
        def runProgram(program) = {
            let programText = Artifacts.required(Result.mapErr(ToString.toString, Grit.program(language, program)));
            let wire = AttuneGritNative.evaluate(Grit.name(language), programText, path, source);
            // Admission owns validation. Preserve failed envelopes and continue extraction.
            wire
        };
        (path, source, runProgram(Grit.Program.Defines), runProgram(Grit.Program.Imports), runProgram(Grit.Program.Calls))
    }, sources);
    Artifacts.write(Json.toCompactString(toJson(observations)));
    println("extract_and_serialize_ns=${System.nanoTime() - start}; files=${List.length(sources)}")
}
