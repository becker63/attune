// Bounded policy algebra over native program supports (policy-algebra-v1).
//   Policy := Single(program) | Union(policy, policy) | Gated(policy, gate)
// A union's witness set is the union of its members' witnesses; atoms are never conjoined.
// Ranking is the production Rank.ranking "expansion"; a closed gate keeps Studio's input
// ranking unchanged. Gates read only label-free features of the policy's own support.
mod PolicyAlgebra {
    pub enum Gate with Eq, ToString {
        case Always
        case Never
        case MinAnchors(Int32)
        case MaxSupport(Int32)
        case MinInTop(Int32)
    }

    pub enum Policy with Eq, ToString {
        case Single(String)
        case Union(Policy, Policy)
        case Gated(Policy, Gate)
    }

    /// Label-free features of a support set: (supported candidates, distinct anchors, supported in baseline top 10).
    pub type alias Features = (Int32, Int32, Int32)

    pub def members(p: Policy): List[String] = match p {
        case Policy.Single(id) => List#{id}
        case Policy.Union(a, b) => List.distinct(members(a) ::: members(b))
        case Policy.Gated(q, _) => members(q)
    }

    /// policy-complexity-v1: member atoms are summed (no sharing discount) and every gate other than Always costs one atom.
    pub def complexity(atoms: String -> Int32, p: Policy): Int32 = match p {
        case Policy.Single(id) => atoms(id)
        case Policy.Union(a, b) => complexity(atoms, a) + complexity(atoms, b)
        case Policy.Gated(q, Gate.Always) => complexity(atoms, q)
        case Policy.Gated(q, _) => complexity(atoms, q) + 1
    }

    pub def witnesses(hits: List[(String, String, String)], p: Policy): List[(String, String, String)] = {
        let ids = members(p);
        List.filter(match (id, _, _) -> List.memberOf(id, ids), hits)
    }

    pub def features(universe: List[String], hits: List[(String, String, String)], p: Policy): Features = {
        let ws = witnesses(hits, p);
        let support = Rank.support(List.map(match (_, a, b) -> (a, b, Nil), ws), universe, "normalized", 1);
        let anchors = List.map(match (_, a, _) -> a, ws) |> List.distinct |> List.length;
        let inTop = List.filter(h -> List.memberOf(h#path, List.take(10, universe)), support) |> List.length;
        (List.length(support), anchors, inTop)
    }

    pub def opens(g: Gate, f: Features): Bool = {
        let (support, anchors, inTop) = f;
        match g {
            case Gate.Always => true
            case Gate.Never => false
            case Gate.MinAnchors(n) => anchors >= n
            case Gate.MaxSupport(n) => support <= n
            case Gate.MinInTop(n) => inTop >= n
        }
    }

    /// Ranking of a policy. Ungated policies follow the production expansion policy.
    pub def apply(baseline: Campaign.Ranked, hits: List[(String, String, String)], p: Policy): Campaign.Ranked = {
        let universe = List.map(fst, baseline);
        match p {
            case Policy.Gated(q, g) => if (opens(g, features(universe, hits, q))) apply(baseline, hits, q) else baseline
            case _ => {
                let support = Rank.support(List.map(match (_, a, b) -> (a, b, Nil), witnesses(hits, p)), universe, "normalized", 1);
                Rank.ranking(baseline, support, "expansion")
            }
        }
    }

    /// The predeclared gate grid; Never is the no-op control.
    pub def grid(): List[Gate] = List#{Gate.Always, Gate.MinAnchors(2), Gate.MinAnchors(3), Gate.MaxSupport(3), Gate.MaxSupport(10), Gate.MinInTop(1)}

    pub def gateName(g: Gate): String = match g {
        case Gate.Always => "always"
        case Gate.Never => "never"
        case Gate.MinAnchors(n) => "anchors>=${n}"
        case Gate.MaxSupport(n) => "support<=${n}"
        case Gate.MinInTop(n) => "intop>=${n}"
    }

    pub def parse(ids: List[String]): Policy = match ids {
        case a :: Nil => Policy.Single(a)
        case a :: rest => Policy.Union(Policy.Single(a), parse(rest))
        case Nil => Policy.Single("")
    }
}
