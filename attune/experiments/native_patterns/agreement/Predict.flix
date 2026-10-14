use Attune.{Artifacts, Studio}
use Util.Json
use Util.Json.ToJson.toJson

type alias Config = (String, String, Int32, String, String, Int32, String, Option[String])
type alias Prediction = (String, Campaign.Ranked, List[String], List[(String, Float64)], String, List[String])
type alias Diagnostic = (String, String, Int32, List[Rules.Witness], List[(String, String)], String, List[String])
def main(): Unit \ IO = {
    let baseline: Campaign.Ranked=Campaign.input("ranking");
    let (task, repo, world, revision, expectedIdentity): (String, String, String, String, String)=Campaign.input("task");
    let configs: List[Config]=Campaign.input("configurations");
    let old: List[Prediction]=Campaign.input("old");
    let primary: Campaign.Admitted=Campaign.input("primary");
    let exact: Campaign.Admitted=Campaign.input("exact-path-v1");
    let substituted: Campaign.Admitted=Campaign.input("exact-js-ts-v2");
    let (bindingIdentity, bindings, _, bindingState, bindingErrors): (String, List[(String, String, String, String, Int32, Int32)], List[(String, Int32, Int32, String, String, String, String)], String, List[String])=Campaign.input("binding");
    let (primaryIdentity, _, _, _, _, _, _)=primary;
    Artifacts.required(if(primaryIdentity == expectedIdentity and (bindingState != "Completed" or bindingIdentity == primaryIdentity))Ok(())else Err("Mismatched source world or binding recipe."));
    let bound=List.map(match(a, s, b, t, lo, hi) -> (Attune.FileId.FileId(a), Attune.SymbolId.SymbolId(s), Attune.FileId.FileId(b), Attune.SymbolId.SymbolId(t), lo, hi), bindings);
    let graphs=Map.empty() |> Map.insert("primary", primary) |> Map.insert("binding-v1", primary) |> Map.insert("exact-path-v1", exact) |> Map.insert("exact-js-ts-v2", substituted);
    let keys=List.filterMap(match(_, template, n, _, mode, _, recipe, _) -> if(mode == "baseline" or mode == "current")None else Some((recipe, template, n)), configs) |> List.toSet |> Set.toList;
    let universe=List.map(fst, baseline);
    Artifacts.required(if(List.length(universe) == Set.size(List.toSet(universe)))Ok(())else Err("Invalid Qwen universe."));
    let diagnostics: List[Diagnostic]=List.map(match(recipe, template, n) -> {
        let admitted=Map.getWithDefault(recipe, primary, graphs);
        let (_, _, _, _, _, state, errors)=admitted;
        let seeds=List.take(n, universe);
        let ws=Rules.matches(template, admitted, seeds, if(template == "BoundAgreement")bound else Nil);
        let pairs=List.map(match(a, b, _) -> (a, b), ws) |> List.toSet |> Set.toList;
        (recipe, template, n, ws, pairs, if(recipe == "binding-v1")bindingState else state, if(recipe == "binding-v1")bindingErrors else errors)
    }, keys);
    let index=List.toMap(List.map(match(recipe, template, n, ws, _, state, errors) -> ((recipe, template, n), (ws, state, errors)), diagnostics));
    let oldIndex=List.toMap(List.map(match (name, ranking, pool, support, state, errors) -> (name, (name, ranking, pool, support, state, errors)), old));
    let predictions: List[Prediction]=List.map(match(name, template, n, normalization, mode, minimum, recipe, reused) -> {
        let admitted=Map.getWithDefault(recipe, primary, graphs);
        let (identity, triples, _, _, _, state, errors)=admitted;
        let (ws, executed, failures)=Map.getWithDefault((recipe, template, n), (Nil, state, errors), index);
        let support=Rank.support(ws, universe, normalization, minimum);
        let ranking=if(mode == "baseline")baseline else if(executed != "Completed")Nil else if(mode == "current"){
            let facts=List.map(Campaign.fact(Attune.World.World(identity)), triples);
            let structural=Studio.structural(List.take(n, universe), Attune.World.World(identity), facts);
            List.map(h -> (h#path, Some(h#score)), Studio.combine(Rank.hits(baseline), structural))
        }else Rank.ranking(baseline, support, mode);
        match reused {
            case Some(oldName) => {
                let (_, saved, pool, scores, priorState, priorErrors)=Artifacts.required(Option.toOk("Missing exact inherited prediction: "+oldName, Map.get(oldName, oldIndex)));
                Artifacts.required(if(List.map(fst, saved) == List.map(fst, ranking) and (mode == "baseline" or priorState == executed))Ok(())else Err("RefactorRegression: inherited complete ranks differ: "+name));
                (name, saved, pool, scores, priorState, priorErrors)
            }
            case None => (name, ranking, List.map(fst, List.take(32, ranking)), List.map(h -> (h#path, h#score), support), if(mode == "baseline")"Completed"else executed, if(mode == "baseline")Nil else failures)
        }
    }, configs);
    let identities=List.map(match(recipe, admitted) -> {let(id, _, _, _, _, state, errors)=admitted;(recipe, id, state, errors)}, Map.toList(graphs));
    Artifacts.write(Json.toCompactString(toJson((task, repo, world, revision, predictions, diagnostics, identities))))
}
