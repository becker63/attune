/// The one exact relation application and its genuinely instrumented local memo.
///
/// `Attune.Envelope` fixes identity; this module is the single evaluator that
/// applies one directed atom to one exact frontier against one world's facts,
/// and the one small memo that records where a repeated exact lookup really
/// reused an earlier producer. It decides no coverage, evidence or verdict: it
/// produces an exact typed frontier or a classified rejection, never an empty
/// success for an illegal route.
pub mod Attune.Apply {

    use Attune.Envelope
    use Attune.Envelope.{Atom, Domain, Fact, FileId, Frontier, SymbolId, World}

    /// The exact identity of one memo entry: the world/semantic namespace, the
    /// exact typed input frontier and the next atom. The ordinal and the work tag
    /// are absent by design, so two transitions may share a key while recording
    /// different ordinals.
    pub type alias TransitionKey = (World, String, Frontier, Atom)

    /// The frontier of `world` in `domain` over exactly `texts`.
    pub def frontierOf(world: World, domain: Domain, texts: List[String]): Frontier =
        match domain {
            case Domain.Files =>
                Frontier.Files(world, List.toSet(List.map(FileId.FileId, texts)))
            case Domain.Symbols =>
                Frontier.Symbols(world, List.toSet(List.map(SymbolId.SymbolId, texts)))
        }

    /// Whether `text` names a member of `frontier`, compared by nominal identity.
    pub def holds(frontier: Frontier, text: String): Bool = match frontier {
        case Frontier.Files(_, ids) =>
            List.exists(id -> match id { case FileId.FileId(name) => name == text }, Set.toList(ids))
        case Frontier.Symbols(_, ids) =>
            List.exists(id -> match id { case SymbolId.SymbolId(name) => name == text }, Set.toList(ids))
    }

    /// Apply exactly one atom to one frontier against one world's facts.
    ///
    /// The atom's declared source domain must equal the frontier's domain and
    /// every fact must belong to the frontier's world; otherwise the route is a
    /// classified rejection, never an empty success. A legal application with no
    /// matching fact is `Ok` of the empty frontier in the atom's target domain,
    /// so emptiness stays a property of the answer and keeps its world.
    pub def apply(facts: List[Fact], input: Frontier, atom: Atom): Result[String, Frontier] = {
        let world = Envelope.worldOf(input);
        let domain = Envelope.domainOf(input);
        if (domain != Envelope.atomSource(atom))
            Err(Envelope.atomName(atom) + " needs " + Envelope.domainName(Envelope.atomSource(atom))
                + " but the current domain is " + Envelope.domainName(domain) + ".")
        else match List.find(fact -> fact#world != world, facts) {
            case Some(_) => Err("a fact from another world cannot apply here.")
            case None =>
                let targets = List.filterMap(fact ->
                    if (fact#atom == atom and holds(input, fact#source)) Some(fact#target) else None,
                    facts);
                Ok(frontierOf(world, Envelope.atomTarget(atom), targets))
        }
    }

    /// One instrumented lookup event: a cold miss that produced the answer at
    /// `ordinal`, or a hit that reused the producer recorded at `ordinal`.
    pub enum Lookup with Eq, ToString {
        case Miss(Int32)
        case Hit(Int32)
    }

    /// The exact memo: transition key, producing ordinal and exact typed output.
    pub type alias Memo = List[(TransitionKey, Int32, Frontier)]

    /// Look one exact transition up in the memo, computing it through the one
    /// evaluator only when it is absent. The returned events are the real
    /// lookups, in order, and the threaded ordinal is the real computation order,
    /// so a producer reference is never fabricated.
    pub def lookup(
        memo: Memo,
        next: Int32,
        namespace: String,
        input: Frontier,
        atom: Atom,
        facts: List[Fact]
    ): (Result[String, Frontier], Memo, List[Lookup], Int32) = {
        let key = (Envelope.worldOf(input), namespace, input, atom);
        match List.find(entry -> match entry { case (k, _, _) => k == key }, memo) {
            case Some(entry) => match entry {
                case (_, ordinal, output) => (Ok(output), memo, Lookup.Hit(ordinal) :: Nil, next)
            }
            case None => match apply(facts, input, atom) {
                case Ok(output) =>
                    (Ok(output), (key, next, output) :: memo, Lookup.Miss(next) :: Nil, next + 1)
                case Err(error) =>
                    (Err(error), memo, Lookup.Miss(next) :: Nil, next + 1)
            }
        }
    }

    /// The number of cold lookups in a recorded event sequence.
    pub def misses(events: List[Lookup]): Int32 = List.length(List.filter(isMiss, events))

    /// The number of real reuse hits in a recorded event sequence.
    pub def hits(events: List[Lookup]): Int32 = List.length(List.filter(isHit, events))

    def isMiss(event: Lookup): Bool = match event {
        case Lookup.Miss(_) => true
        case Lookup.Hit(_)  => false
    }

    def isHit(event: Lookup): Bool = match event {
        case Lookup.Hit(_)  => true
        case Lookup.Miss(_) => false
    }
}
