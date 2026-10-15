use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let programs: List[(String,Language.Program)]=Payload.input("programs");
    let pairs=List.flatMap(match(id,p) -> List.flatMap(atom -> {
        let(kind,a,b)=atom;
        let deleted=List.filter(x -> x != atom,p);
        let reversed=(kind,b,a)::deleted;
        let variants=List#{("Remove",deleted)} ::: (if(kind == 0 or kind == 2)List#{("Reverse",reversed)}else Nil);
        List.filterMap(match(mutation,raw) -> {let q=Language.canonical(raw);if(Language.valid(q) and Language.key(q) != id)Some((id,Language.key(q),mutation,atom))else None},variants)
    },p),programs) |> List.distinct;
    Payload.write(Json.toCompactString(toJson(pairs)))
}
