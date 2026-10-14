// Host-only acquisition through the historical secret boundary; never an RBE action.
use Attune.{Artifacts,Decisions}
use Attune.Decisions.{Request,Choice}
use Util.Json
use Util.Json.FromJson
use Util.Json.ToJson.toJson
use Fs.FileWrite
import attune.inference.AttuneDecisions
import java.lang.System
import java.nio.charset.StandardCharsets
def main(): Unit \ IO = {
    let(endpoint,model,recipe,payload,legal,ledger): (String,String,String,String,List[String],Budget.Ledger)=Campaign.input("decision");
    let requested: Request=Request.Request(endpoint,model,recipe,payload);
    let root=Artifacts.required(Result.mapErr(_ -> "Malformed native request.",Json.parse(payload)));
    let payloadModel: String=Artifacts.required(Result.mapErr(_ -> "Missing requested model.",FromJson.decodeAtKey("model",root)));
    Artifacts.required(if(endpoint == "https://openrouter.ai/api/alpha/decisions" and model == "typesafe/jev-1.13" and payloadModel == model and (recipe == "native-composition-prior-v1" or recipe == "native-composition-prior-v2-dotenv") and List.length(legal) > 0 and List.length(legal) <= 32 and Array.length(payload.getBytes(StandardCharsets.UTF_8)) <= 65536)Ok(())else Err("Denied native Choice identity or request bound."));
    let reserved=Artifacts.required(Budget.reserve(ledger));
    // Commit the shared reservation before network dispatch, including crashes.
    let reservedText=Json.toCompactString(toJson(reserved));
    Artifacts.required(FileWrite.runWithIO(() -> Result.mapErr(_ -> "Cannot persist budget reservation.",FileWrite.write({str=reservedText},"budget.reserved.json"))));
    let started=System.nanoTime();
    let answer=run { Choice.decide(requested) } with handler Choice {
        def decide(request,continueWith)=continueWith(if(request != requested)Err("Denied native Choice request.")else Ok(AttuneDecisions.decide(payload)))
    };
    let body=Artifacts.required(answer);
    let elapsed=System.nanoTime()-started;
    let decoded=match Decisions.decode(body,legal) {
        case Ok((resolved,probabilities,confidence)) => (true,resolved,probabilities,confidence,"")
        case Err(reason) => (false,"",Decisions.uniform(legal),0.0f64,reason)
    };
    Artifacts.write(Json.toCompactString(toJson(((endpoint,model,recipe,payload),body,decoded,AttuneDecisions.lastAttempts(),elapsed,reserved))))
}
