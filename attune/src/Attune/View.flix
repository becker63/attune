/// The typed route, grammar, serial-event, proof and semantic-view adapters.
///
/// Every readout here is derived from the one shared `Attune.Envelope`
/// vocabulary: a frontier carries its world, its nominal domain and its exact
/// finite member set, and an atom declares its source and target domains. A
/// renderer cannot invent a fact, a cache hit, a proof premise or a view edge;
/// it only presents the typed records it was given. All text is composed by the
/// single `Attune.AsciiTree` writer, so the byte policy lives in one place.
///
/// The route adapter keeps two axes apart. `OK`/`EMPTY` describe an answer, and
/// `Unrecorded`/`COMPUTED`/`REUSE` describe recorded work. A reuse tag is only
/// accepted when the named producer is present, earlier, and has the exact same
/// world, memo scope, input frontier, atom and output; equal output alone proves
/// nothing. The grammar adapter generates legal continuations from the same
/// atom table the validator reads. The proof adapter preserves one rule
/// application with ALL its premises and marks alternatives separately. The
/// view adapter keeps an induced lateral edge and falls back to an exact labeled
/// adjacency listing whenever a tree cannot honestly carry the edges.
pub mod Attune.View {

    use Attune.Envelope
    use Attune.Envelope.{Atom, Domain, Fact, FileId, Frontier, SymbolId, World}
    use Attune.Coverage.{Outcome, outcomeName}
    use Attune.AsciiTree

    // ------------------------------------------------------------ projections

    /// The displayed domain name. Identity is nominal; this is presentation.
    pub def domainLabel(domain: Domain): String = match domain {
        case Domain.Files   => "Files"
        case Domain.Symbols => "Symbols"
    }

    /// The exact member identities of a frontier, as strings. This drops the
    /// nominal wrapper for display only; it never compares two domains.
    pub def members(frontier: Frontier): List[String] = match frontier {
        case Frontier.Files(_, ids) =>
            List.map(id -> match id { case FileId.FileId(text) => text }, Set.toList(ids))
        case Frontier.Symbols(_, ids) =>
            List.map(id -> match id { case SymbolId.SymbolId(text) => text }, Set.toList(ids))
    }

    /// A frontier is empty exactly when its member set is empty.
    pub def empty(frontier: Frontier): Bool = match frontier {
        case Frontier.Files(_, ids)   => Set.isEmpty(ids)
        case Frontier.Symbols(_, ids) => Set.isEmpty(ids)
    }

    /// The answer status of a frontier: `EMPTY` or `OK`. This is the answer
    /// axis and says nothing about recorded work.
    pub def outcome(frontier: Frontier): String = if (empty(frontier)) "EMPTY" else "OK"

    /// The canonical displayed frontier label. Members are compared by identity
    /// and printed in one deterministic lexical order, so set insertion order is
    /// never mistaken for architecture.
    pub def frontierLabel(frontier: Frontier): String =
        domainLabel(Envelope.domainOf(frontier)) + "{" +
            List.join(", ", List.sort(members(frontier))) + "}"

    /// The name of a world, for a document header.
    pub def worldName(world: World): String = match world {
        case World.World(name) => name
    }

    /// The safe alphabet for an identity or a name. Anything else is rejected by
    /// the one explicit policy rather than clipped or silently merged.
    pub def safeId(text: String): Bool = String.nonEmpty(text) and String.forAll(c ->
        (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or
            (c >= '0' and c <= '9') or c == '_' or c == '-' or
            c == '.' or c == '/' or c == ':' or c == '?', text)

    /// Every member of a frontier is a safe identity.
    pub def safeFrontier(frontier: Frontier): Bool = List.forAll(safeId, members(frontier))

    // ---------------------------------------------------------------- routing

    /// Execution evidence, independent of the answer's emptiness. `Unrecorded`
    /// makes no execution claim; `Reused` names the recorded event that produced
    /// the cached answer.
    pub enum Work with Eq {
        case Unrecorded
        case Computed
        case Reused(Int32)
    }

    /// One recorded transition. IDs are positive ordinals within one recorded
    /// serial run; a locally incremented display number is not a global cache
    /// identity.
    pub type alias Step = {
        id       = Int32,
        snapshot = World,
        memo     = String,
        input    = Frontier,
        atom     = Atom,
        output   = Frontier,
        work     = Work
    }

    /// One named route: a seed frontier and its recorded steps in order.
    pub type alias Route = { name = String, seed = Frontier, steps = List[Step] }

    /// A memo hit needs the same world, memo scope, exact input, atom and answer
    /// as its recorded producer. Equal output alone is insufficient, the
    /// producer must be present and earlier, and no reuse may be inferred.
    pub def validateStep(previous: Frontier, step: Step, seen: List[Step]): Result[String, Unit] = {
        let name = Envelope.atomName(step#atom);
        let ids = List.map(item -> item#id, seen);
        if (step#id <= 0 or not List.forAll(id -> id < step#id, ids))
            Err("Event IDs must increase in this recorded serial run.")
        else if (not safeFrontier(step#input) or not safeFrontier(step#output))
            Err("Unsupported label; escape it without changing identity.")
        else if (step#input != previous) Err("Broken route: next input is not previous output.")
        else if (Envelope.domainOf(previous) != Envelope.atomSource(step#atom))
            Err(name + " needs " + domainLabel(Envelope.atomSource(step#atom)) +
                "; received " + domainLabel(Envelope.domainOf(previous)) + ".")
        else if (Envelope.worldOf(step#input) != Envelope.worldOf(step#output))
            Err("A transition cannot cross worlds.")
        else if (Envelope.domainOf(step#output) != Envelope.atomTarget(step#atom))
            Err("Wrong output domain in recorded step.")
        else if (empty(previous) and not empty(step#output))
            Err("These relation steps cannot create members from an empty input.")
        else match step#work {
            case Work.Unrecorded => Ok(())
            case Work.Computed   => Ok(())
            case Work.Reused(id) => match List.find(item -> item#id == id, seen) {
                case None => Err("Reuse producer is missing or is not earlier in this run.")
                case Some(origin) =>
                    if (origin#work != Work.Computed) Err("Reuse must name the producing computation.")
                    else if (origin#snapshot != step#snapshot or origin#memo != step#memo)
                        Err("Reuse crosses a snapshot or memo boundary.")
                    else if (origin#input != step#input or origin#atom != step#atom)
                        Err("Reuse does not have the producer's exact typed transition key.")
                    else if (origin#output != step#output) Err("Reuse changed the cached answer.")
                    else Ok(())
            }
        }
    }

    /// Validate one route batch. Every step must share the batch's one snapshot
    /// and one memo scope, and the chain must be exact.
    def validateSteps(
        snapshot: World,
        memo: String,
        previous: Frontier,
        steps: List[Step],
        seen: List[Step]
    ): Result[String, List[Step]] = match steps {
        case Nil => Ok(seen)
        case step :: rest =>
            if (step#snapshot != snapshot or step#memo != memo)
                Err("A route batch has one snapshot and one memo scope.")
            else match validateStep(previous, step, seen) {
                case Err(error) => Err(error)
                case Ok(_)      => validateSteps(snapshot, memo, step#output, rest, step :: seen)
            }
    }

    /// Validate every route before any document is made. All routes share one
    /// recorded serial run, so their event IDs must be globally increasing.
    pub def validateRoutes(
        snapshot: World,
        memo: String,
        routes: List[Route],
        seen: List[Step]
    ): Result[String, Unit] = match routes {
        case Nil => Ok(())
        case route :: rest =>
            if (not safeId(route#name) or not safeFrontier(route#seed)) Err("Unsupported route label.")
            else match validateSteps(snapshot, memo, route#seed, route#steps, seen) {
                case Err(error)   => Err(error)
                case Ok(nextSeen) => validateRoutes(snapshot, memo, rest, nextSeen)
            }
    }

    /// The answer and work axes rendered on one line.
    pub def annotation(step: Step): String = {
        let answer = outcome(step#output);
        match step#work {
            case Work.Unrecorded => "[" + answer + "]"
            case Work.Computed   => "[" + answer + "; COMPUTED t" + Int32.toString(step#id) + "]"
            case Work.Reused(id) => "[" + answer + "; REUSE t" + Int32.toString(id) + "]"
        }
    }

    /// The path projection of a route's recorded events. This follows the run's
    /// own order and never sorts it; an answer annotation is shown when it is
    /// meaningful (the terminal step, an empty answer, or recorded work).
    def stepTree(steps: List[Step]): List[AsciiTree.Tree] = match steps {
        case Nil => Nil
        case step :: rest =>
            let name = Envelope.atomName(step#atom);
            let show = step#work != Work.Unrecorded or List.isEmpty(rest) or empty(step#output);
            let suffix = if (show) "  " + annotation(step) else "";
            AsciiTree.Tree.Node(name + " -> " + frontierLabel(step#output) + suffix, stepTree(rest)) :: Nil
    }

    /// The answer status of a whole route: the last output, or the seed when
    /// there is no step.
    pub def routeStatus(route: Route): String = match List.last(route#steps) {
        case None       => outcome(route#seed)
        case Some(step) => outcome(step#output)
    }

    /// The typed path line, derived from the same steps as the value tree.
    pub def typedPath(route: Route): String =
        domainLabel(Envelope.domainOf(route#seed)) + List.join("", List.map(step -> {
            let name = Envelope.atomName(step#atom);
            " -> " + name + " -> " + domainLabel(Envelope.atomTarget(step#atom))
        }, route#steps))

    /// Validate every record before drawing anything, then render one document.
    /// An illegal route rejects; it never becomes an empty success.
    pub def renderRoutes(
        limits: AsciiTree.Limits,
        snapshot: World,
        memo: String,
        routes: List[Route]
    ): Result[String, String] =
        if (not safeId(worldName(snapshot)) or not safeId(memo)) Err("Unsupported snapshot or memo label.")
        else if (List.isEmpty(routes)) Err("Choose at least one recorded route.")
        else if (List.length(List.distinct(List.map(route -> route#name, routes))) != List.length(routes))
            Err("Route names must be unique within this document.")
        else match validateRoutes(snapshot, memo, routes, Nil) {
            case Err(error) => Err(error)
            case Ok(_)      => renderValidatedRoutes(limits, snapshot, memo, routes)
        }

    def renderValidatedRoutes(
        limits: AsciiTree.Limits,
        snapshot: World,
        memo: String,
        routes: List[Route]
    ): Result[String, String] = {
        let header = "graph=route snapshot=" + worldName(snapshot) + " memo=" + memo +
            " schedule=recorded-serial\n\n";
        match routeBodies(limits, routes, Nil) {
            case Err(error) => Err(error)
            case Ok(bodies) => AsciiTree.withinBytes(limits, header + List.join("\n", bodies))
        }
    }

    def routeBodies(
        limits: AsciiTree.Limits,
        routes: List[Route],
        acc: List[String]
    ): Result[String, List[String]] = match routes {
        case Nil => Ok(List.reverse(acc))
        case route :: rest =>
            let tree = AsciiTree.Tree.Node(frontierLabel(route#seed), stepTree(route#steps));
            match AsciiTree.render(limits, route#name + ": ", tree) {
                case Err(error) => Err(error)
                case Ok(text)   => routeBodies(limits, rest,
                    ("route=" + route#name + " status=" + routeStatus(route) + "\n\n" +
                        typedPath(route) + "\n\n" + text) :: acc)
            }
    }

    // ---------------------------------------------------------------- grammar

    /// The longest atom label, so the rendered `->` column lines up for every
    /// branch. `imported_by` is longer than `calls`.
    pub def atomWidth(): Int32 =
        List.foldLeft((width, atom) -> bigger(width, String.length(Envelope.atomName(atom))), 0, Envelope.atoms())

    /// The complete legal continuation tree for one domain, generated from the
    /// single atom signature table. It renders POSSIBLE continuations; it does
    /// not execute a route.
    ///
    /// The depth-two Symbols grammar is checked against this comment by the
    /// documentation correspondence fixture, so the commented payload cannot
    /// drift from the generated one:
    ///
    /// <!-- attune:snippet=grammar -->
    /// graph=grammar depth=2
    ///
    /// Symbols
    /// +-- defined_in  -> Files
    /// |   +-- defines     -> Symbols
    /// |   +-- imports     -> Files
    /// |   `-- imported_by -> Files
    /// +-- calls       -> Symbols
    /// |   +-- defined_in  -> Files
    /// |   +-- calls       -> Symbols
    /// |   `-- callers     -> Symbols
    /// `-- callers     -> Symbols
    ///     +-- defined_in  -> Files
    ///     +-- calls       -> Symbols
    ///     `-- callers     -> Symbols
    /// <!-- attune:end=grammar -->
    pub def grammar(limits: AsciiTree.Limits, domain: Domain, depth: Int32): Result[String, String] =
        if (depth < 0 or depth > 7) Err("Display grammar depth must be within 0..7.")
        else {
            let tree = AsciiTree.Tree.Node(domainLabel(domain), grammarBranches(domain, depth));
            match AsciiTree.render(limits, "", tree) {
                case Err(error) => Err(error)
                case Ok(text)   => AsciiTree.withinBytes(limits,
                    "graph=grammar depth=" + Int32.toString(depth) + "\n\n" + text)
            }
        }

    def grammarBranches(domain: Domain, remaining: Int32): List[AsciiTree.Tree] =
        if (remaining <= 0) Nil
        else List.filterMap(atom -> {
            if (Envelope.atomSource(atom) != domain) None
            else Some(AsciiTree.Tree.Node(
                String.padRight(atomWidth(), ' ', Envelope.atomName(atom)) + " -> " +
                    domainLabel(Envelope.atomTarget(atom)),
                grammarBranches(Envelope.atomTarget(atom), remaining - 1)))
        }, Envelope.atoms())

    // ------------------------------------------------------------------ proof

    /// One premise of one rule application: the named role it fills, the literal
    /// premise, whether it holds for this binding, and the exact bindings. A
    /// premise that does not hold is shown as false rather than dropped.
    pub type alias Premise = {
        role     = String,
        text     = String,
        holds    = Bool,
        bindings = List[(String, String)]
    }

    /// One application of one rule: the head, its scope, and ALL its premises in
    /// order. A rule with every premise holds; dropping any is a weaker claim.
    pub type alias Application = { head = String, scope = String, premises = List[Premise] }

    /// A proof readout: the main application, any separately marked
    /// alternatives, the outcome, and an optional detail for unknown/failure.
    pub type alias Proof = {
        goal         = String,
        scope        = String,
        outcome      = Outcome,
        detail       = String,
        application  = Application,
        alternatives = List[Application]
    }

    /// Render a proof. `WITNESS` and `NO-MATCH` carry the application (with its
    /// premises); `UNKNOWN` and `FAILED` are distinct states with no application.
    pub def renderProof(limits: AsciiTree.Limits, proof: Proof): Result[String, String] =
        if (not safeId(proof#goal) or not safeId(proof#scope)) Err("Unsupported proof label.")
        else {
            let header = "graph=proof goal=" + proof#goal + " scope=" + proof#scope + "\n" +
                "outcome=" + outcomeName(proof#outcome) + "\n" +
                (if (String.isEmpty(proof#detail)) "" else "detail=" + proof#detail + "\n");
            if (proof#outcome == Outcome.Unknown or proof#outcome == Outcome.Failed)
                AsciiTree.withinBytes(limits, header)
            else match applications(limits, proof#application :: proof#alternatives, 0, Nil) {
                case Err(error) => Err(error)
                case Ok(blocks) => AsciiTree.withinBytes(limits, header + "\n" + List.join("\n", blocks))
            }
        }

    /// Render each application with an explicit lead, so an alternative is
    /// visibly separate from the main application rather than folded into it.
    def applications(
        limits: AsciiTree.Limits,
        apps: List[Application],
        index: Int32,
        acc: List[String]
    ): Result[String, List[String]] = match apps {
        case Nil => Ok(List.reverse(acc))
        case app :: rest =>
            let lead = if (index == 0) "" else "alternative " + Int32.toString(index) + ": ";
            match AsciiTree.render(limits, lead, applicationTree(app)) {
                case Err(error) => Err(error)
                case Ok(text)   => applications(limits, rest, index + 1, text :: acc)
            }
    }

    def applicationTree(app: Application): AsciiTree.Tree =
        AsciiTree.Tree.Node(app#head + " :-", List.map(premiseTree, app#premises))

    def premiseTree(premise: Premise): AsciiTree.Tree = {
        let role = if (String.isEmpty(premise#role)) "" else premise#role + " ";
        AsciiTree.Tree.Node(role + premise#text + "  [" + premiseAnnotation(premise) + "]", Nil)
    }

    def premiseAnnotation(premise: Premise): String = {
        let bindings = List.join(", ", List.map(pair -> match pair {
            case (key, value) => key + "=" + value
        }, premise#bindings));
        if (not premise#holds) (if (String.isEmpty(bindings)) "false" else bindings + "; false")
        else if (String.isEmpty(bindings)) "true"
        else bindings
    }

    // ------------------------------------------------------------ semantic view

    /// A seed node with its nominal domain.
    pub type alias ViewSeed = { id = String, domain = Domain }

    /// A view node: a stable identity, its domain and a display label.
    pub type alias ViewNode = { id = String, domain = Domain, label = String }

    /// A view edge: direction, relation and endpoints are all preserved.
    pub type alias ViewEdge = { source = String, relation = Atom, target = String }

    /// One selected view. `scope` is part of node identity, so an edge from
    /// another scope cannot leak in.
    pub type alias View = { name = String, scope = String, nodes = List[ViewNode], edges = List[ViewEdge] }

    /// The induced view of `seeds` under `relations` in one scope: the seeds and
    /// their direct targets are the nodes, and EVERY selected relation between
    /// two selected nodes is an edge. An induced lateral edge between two seeds
    /// therefore survives even though no traversal tree would draw it.
    pub def induced(
        facts: List[Fact],
        name: String,
        scope: String,
        seeds: List[ViewSeed],
        relations: List[Atom]
    ): View = {
        let selected = List.filter(fact ->
            fact#world == World.World(scope) and memberOf(fact#atom, relations), facts);
        let seedIds = List.map(seed -> seed#id, seeds);
        let children = List.filterMap(fact ->
            if (List.exists(id -> id == fact#source, seedIds))
                Some({ id = fact#target, domain = Envelope.atomTarget(fact#atom) })
            else None,
            selected);
        let nodes = nodesOf(seeds, children);
        let nodeIds = List.map(node -> node#id, nodes);
        let edges = List.filterMap(fact ->
            if (List.exists(id -> id == fact#source, nodeIds) and List.exists(id -> id == fact#target, nodeIds))
                Some({ source = fact#source, relation = fact#atom, target = fact#target })
            else None,
            selected);
        { name = name, scope = scope, nodes = nodes, edges = edges }
    }

    def memberOf(atom: Atom, relations: List[Atom]): Bool =
        List.exists(other -> other == atom, relations)

    def nodesOf(seeds: List[ViewSeed], children: List[ViewSeed]): List[ViewNode] = {
        let ids = List.distinct(List.sort(List.map(entry -> entry#id, seeds ::: children)));
        List.map(id -> {
            let domain = domainOf(seeds, children, id);
            { id = id, domain = domain, label = domainLabel(domain) + "{" + id + "}" }
        }, ids)
    }

    def domainOf(seeds: List[ViewSeed], children: List[ViewSeed], id: String): Domain =
        match List.find(entry -> entry#id == id, seeds) {
            case Some(entry) => entry#domain
            case None => match List.find(entry -> entry#id == id, children) {
                case Some(entry) => entry#domain
                case None        => Domain.Files
            }
        }

    /// The displayed node labels, sorted, for independent set assertions.
    pub def viewNodeTexts(view: View): List[String] = List.map(node -> node#label, view#nodes)

    /// The displayed edge lines, for independent set assertions. Direction and
    /// relation are explicit, so geometry can never reverse or relabel an edge.
    pub def viewEdgeTexts(view: View): List[String] =
        List.map(edge -> edgeText(view, edge), view#edges)

    /// Whether the view can be drawn as one rooted tree: one root, no self-loop,
    /// no parallel edge, every other node exactly one parent, and every node
    /// reachable from the root. Anything else uses the exact adjacency fallback.
    pub def treeMode(view: View): Bool = {
        let roots = List.filter(node -> not hasIncoming(view, node#id), view#nodes);
        let noSelf = not List.exists(edge -> edge#source == edge#target, view#edges);
        let noParallel = List.length(List.distinct(List.map(edge -> edge#source + " " + edge#target, view#edges)))
            == List.length(view#edges);
        let oneParent = List.forAll(node ->
            List.length(List.filter(edge -> edge#target == node#id, view#edges)) <= 1, view#nodes);
        if (not noSelf or not noParallel or not oneParent) false
        else match roots {
            case root :: Nil => List.length(descendants(view, root#id)) == List.length(view#nodes)
            case _           => false
        }
    }

    /// Render a view: a tree when one rooted tree can carry every edge, and an
    /// exact labeled adjacency listing otherwise. The fallback is a layout mode
    /// of the same path, not a second source of meaning.
    pub def renderView(limits: AsciiTree.Limits, view: View): Result[String, String] =
        if (not safeId(view#name) or not safeId(view#scope)) Err("Unsupported view label.")
        else if (not List.forAll(node -> safeId(node#id), view#nodes)) Err("Unsupported view node label.")
        else if (treeMode(view)) renderTreeView(limits, view)
        else renderAdjacencyView(limits, view)

    def renderTreeView(limits: AsciiTree.Limits, view: View): Result[String, String] =
        match List.filter(node -> not hasIncoming(view, node#id), view#nodes) {
            case root :: Nil => match AsciiTree.render(limits, view#name + ": ", viewTree(view, root#id)) {
                case Err(error) => Err(error)
                case Ok(text)   => AsciiTree.withinBytes(limits, viewHeader(view, "tree") + text)
            }
            case _ => Err("A tree view needs exactly one root.")
        }

    def renderAdjacencyView(limits: AsciiTree.Limits, view: View): Result[String, String] = {
        let nodesTree = AsciiTree.Tree.Node("nodes",
            List.map(node -> AsciiTree.Tree.Node(node#label, Nil), view#nodes));
        let edgesTree = AsciiTree.Tree.Node("edges",
            List.map(text -> AsciiTree.Tree.Node(text, Nil), sortedEdgeTexts(view)));
        match AsciiTree.bounds(limits, nodesTree) {
            case Err(error) => Err(error)
            case Ok(_) => match AsciiTree.bounds(limits, edgesTree) {
                case Err(error) => Err(error)
                case Ok(_)      => AsciiTree.withinBytes(limits,
                    viewHeader(view, "adjacency") + AsciiTree.draw("", nodesTree) + "\n" + AsciiTree.draw("", edgesTree))
            }
        }
    }

    def viewHeader(view: View, mode: String): String =
        "graph=view name=" + view#name + " scope=" + view#scope + " mode=" + mode + "\n\n"

    def viewTree(view: View, id: String): AsciiTree.Tree = {
        let edges = List.sortBy(edge -> Envelope.atomName(edge#relation) + " " + edge#target,
            List.filter(edge -> edge#source == id, view#edges));
        AsciiTree.Tree.Node(labelOf(view, id), List.map(edge -> {
            let child = viewTree(view, edge#target);
            match child {
                case AsciiTree.Tree.Node(childLabel, grandchildren) =>
                    AsciiTree.Tree.Node(Envelope.atomName(edge#relation) + " -> " + childLabel, grandchildren)
            }
        }, edges))
    }

    def sortedEdgeTexts(view: View): List[String] =
        List.sort(List.map(edge -> edgeText(view, edge), view#edges))

    def edgeText(view: View, edge: ViewEdge): String =
        labelOf(view, edge#source) + " --" + Envelope.atomName(edge#relation) + "--> "
            + labelOf(view, edge#target)

    def labelOf(view: View, id: String): String = match List.find(node -> node#id == id, view#nodes) {
        case Some(node) => node#label
        case None       => id
    }

    def hasIncoming(view: View, id: String): Bool =
        List.exists(edge -> edge#target == id, view#edges)

    /// Every node reachable from `root` along view edges, as a distinct set.
    def descendants(view: View, root: String): List[String] =
        visit(view, root :: Nil, Nil)

    def visit(view: View, pending: List[String], seen: List[String]): List[String] = match pending {
        case Nil => seen
        case node :: rest =>
            let children = List.map(edge -> edge#target,
                List.filter(edge -> edge#source == node, view#edges));
            let fresh = List.filter(child ->
                not List.exists(prior -> prior == child, seen) and
                    not List.exists(queued -> queued == child, rest), children);
            visit(view, rest ::: fresh, node :: seen)
    }

    // ------------------------------------------------------- application reports

    /// How one application-report entry was obtained. The four provenances stay
    /// apart: a frozen prediction is not an observation, a historical replay is
    /// not a fresh execution, and labelled fixture work is never an external
    /// result.
    pub enum Provenance with Eq, ToString {
        case Prediction
        case Observation
        case History
        case Fixture
    }

    /// The stable provenance name one report writes on its header and entries.
    pub def provenanceName(provenance: Provenance): String = match provenance {
        case Provenance.Prediction  => "prediction"
        case Provenance.Observation => "observation"
        case Provenance.History     => "history"
        case Provenance.Fixture     => "fixture"
    }

    /// One application-report entry: what it is about, the answer or decision it
    /// carries, how that answer was obtained, and the assumptions it rests on.
    pub type alias AppEntry = {
        subject     = String,
        answer      = String,
        provenance  = Provenance,
        assumptions = List[String]
    }

    /// One whole-system application report: the application, the world scope and
    /// the whole report's own provenance. A report is `Fixture` work unless an
    /// owner has a fresh external execution to label.
    pub type alias ApplicationReport = {
        application = String,
        scope       = String,
        work        = Provenance,
        entries     = List[AppEntry]
    }

    /// The witness-bearing phrase of one coordination decision. `Parallel`,
    /// `Coordinate` and `Unknown` render as `ParallelBecause(...)`,
    /// `CoordinatesBecause(...)` and `UnknownBecause(...)`, so a decision is
    /// never flattened to a bare label and an abstention keeps its witnesses.
    pub def because(decision: String, witnesses: List[String]): String =
        becauseName(decision) + "(" + List.join(", ", witnesses) + ")"

    def becauseName(decision: String): String = match decision {
        case "Parallel"   => "ParallelBecause"
        case "Coordinate" => "CoordinatesBecause"
        case _            => "UnknownBecause"
    }

    /// Render one whole-system application report. The header names the
    /// application, the world scope and the report's own provenance, and every
    /// entry carries its provenance beside its answer, so a labelled fixture or
    /// a historical replay can never read as a fresh external observation.
    pub def renderApplication(limits: AsciiTree.Limits, report: ApplicationReport): Result[String, String] =
        if (not safeId(report#application) or not safeId(report#scope)) Err("Unsupported application label.")
        else if (List.isEmpty(report#entries)) Err("An application report carries at least one entry.")
        else {
            let header = "graph=application name=" + report#application + " scope=" + report#scope
                + " work=" + provenanceName(report#work) + "\n\n";
            match applicationEntries(limits, report#entries, Nil) {
                case Err(error) => Err(error)
                case Ok(bodies) => AsciiTree.withinBytes(limits, header + List.join("\n", bodies))
            }
        }

    def applicationEntries(
        limits: AsciiTree.Limits,
        entries: List[AppEntry],
        acc: List[String]
    ): Result[String, List[String]] = match entries {
        case Nil => Ok(List.reverse(acc))
        case entry :: rest =>
            match AsciiTree.render(limits, "", applicationEntry(entry)) {
                case Err(error) => Err(error)
                case Ok(text)   => applicationEntries(limits, rest, text :: acc)
            }
    }

    /// One entry as a single label: the provenance, the subject, the answer and
    /// the assumptions. The witness-bearing decision already sits in the answer,
    /// so it is never re-flattened here.
    def applicationEntry(entry: AppEntry): AsciiTree.Tree = {
        let assuming = if (List.isEmpty(entry#assumptions)) ""
            else " assuming(" + List.join("; ", entry#assumptions) + ")";
        AsciiTree.Tree.Node(
            provenanceName(entry#provenance) + " " + entry#subject + " = " + entry#answer + assuming, Nil)
    }

    def bigger(left: Int32, right: Int32): Int32 = if (left > right) left else right
}
