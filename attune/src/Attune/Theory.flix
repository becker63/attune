/// Small questions, ordinary functions, native Datalog.
/// Routes follow edges in order. Rules join several observations.
pub mod Attune.Theory {
    use Attune.{Atom, Fact, FileId, Frontier}
    use Attune.Coverage.WorldFacts

    /// Read left to right: defined_in, imports, defines.
    /// Each step checks the kind of set it receives, even when it is empty.
    pub def follow(facts: List[Fact], start: Frontier, route: List[Atom]): Result[String, Frontier] =
        match route {
            case Nil => if (List.forAll(fact -> fact#world == Attune.worldOf(start), facts))
                Ok(start) else Err("a fact from another world cannot apply here.")
            case step :: rest => forM (
                next <- Attune.apply(facts, start, step);
                answer <- follow(facts, next, rest)
            ) yield answer
        }

    /// Rules are values. Two different files share an import.
    /// FileId prevents a symbol from filling any of these positions.
    pub def sharedRules(): #{ Imports(FileId, FileId), Shared(FileId, FileId, FileId) } = #{
        Shared(first, second, dependency) :-
            Imports(first, dependency),
            Imports(second, dependency),
            if (first != second).
    }

    /// Check the world before joining. Sort answers because Datalog's
    /// evaluation order is not a display order.
    pub def sharedImports(world: WorldFacts): Result[String, List[(FileId, FileId, FileId)]] =
        if (List.exists(fact -> fact#world != world#world, world#facts))
            Err("a fact from another world cannot donate an import.")
        else {
            let imports = List.filterMap(fact ->
                if (fact#atom == Atom.Imports) Some((FileId.FileId(fact#source), FileId.FileId(fact#target)))
                else None, world#facts);
            let facts = inject imports into Imports/2;
            Ok(query facts, sharedRules() select (first, second, dependency)
                from Shared(first, second, dependency)
                |> Vector.toList |> List.sort)
        }

    /// Repeatable answers to a declared panel of questions, not a claim of a
    /// unique fingerprint. The archived Atlas descriptor search is retired.
    pub def describe(facts: List[Fact], start: Frontier, questions: List[List[Atom]]):
        Result[String, List[(List[Atom], Frontier)]] =
        if (List.length(questions) > 64 or List.exists(route -> List.length(route) > 8, questions))
            Err("a description allows at most 64 routes of 8 steps.")
        else Result.traverse(route -> Result.map(answer -> (route, answer), follow(facts, start, route)), questions)
}
