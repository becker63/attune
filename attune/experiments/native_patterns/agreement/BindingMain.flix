
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
    let raw: Campaign.Observations=Campaign.input("observations");
    let admitted: Campaign.Admitted=Campaign.input("admitted");
    let (identity, _, _, _, _, state, errors)=admitted;
    let (bound, decisions)=Binding.analyze(raw, admitted);
    let wire=List.map(match (Attune.FileId.FileId(a), Attune.SymbolId.SymbolId(s), Attune.FileId.FileId(b), Attune.SymbolId.SymbolId(t), lo, hi) -> (a, s, b, t, lo, hi), bound);
    Artifacts.write(Json.toCompactString(toJson((identity, wire, decisions, state, errors))))
}
