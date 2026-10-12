/// Follow one relationship from an exact set of files or symbols.
///
///     files --defines--> symbols --calls--> symbols --defined_in--> files
///
/// FileId and SymbolId are separate types, even for equal names. A frontier is
/// the set reached so far, together with its repository world. A world includes
/// source identity and the rules used to interpret that source.
///
/// Applying a relation either returns a typed set or explains why the step is
/// invalid. An empty valid answer is different from an invalid step. Reuse below
/// requires the same world, relation, and complete input set.
pub mod Attune {
    /// One repository world identity. Two worlds never compare equal unless
    /// they are the same world.
    pub enum World with Eq, Order, ToString, Hash {
        case World(String)
    }

    /// A structured world identity: the canonical repository origin, the exact
    /// content/source epoch and the frontend/resolver/admission semantics. All
    /// three are part of identity, so a display name, a member count or an
    /// unchecked commit alone can never establish it.
    pub type alias WorldId = { origin = String, content = String, semantics = String }

    /// The world named by one structured identity. Changing any component yields
    /// a different world, so dirty content cannot reuse a clean world's identity.
    ///
    /// The three components are concatenated by an injective, length-prefixed
    /// encoding rather than by bare `@`/`#` separators. A component may itself
    /// contain `@` or `#` (a repository URL, a content digest, a semantic recipe),
    /// and a bare separator could not tell `origin="a@b", content="c"` from
    /// `origin="a", content="b@c"`. Prefixing each component with its decimal
    /// length and `:` makes the boundary explicit, so distinct components always
    /// yield distinct worlds while exactly equal components stay equal.
    pub def worldId(id: WorldId): World =
        World.World(component(id#origin) + component(id#content) + component(id#semantics))

    /// One identity component in an unambiguous, self-delimiting string form: the
    /// decimal length of the text, a `:`, then the exact text verbatim. The length
    /// fixes the boundary, so no input is restricted and no content is lost.
    def component(text: String): String =
        Int32.toString(String.length(text)) + ":" + text

    /// A file entity identity, valid only in the Files domain.
    pub enum FileId with Eq, Order, ToString, Hash {
        case FileId(String)
    }

    /// A symbol entity identity, valid only in the Symbols domain.
    pub enum SymbolId with Eq, Order, ToString, Hash {
        case SymbolId(String)
    }

    /// The two disjoint nominal domains of the envelope.
    pub enum Domain with Eq, Order, ToString, Hash {
        case Files
        case Symbols
    }

    /// One directed primitive relation. `defines` and `defined_in` are
    /// opposites, as are `imports`/`imported_by` and `calls`/`callers`.
    pub enum Atom with Eq, Order, ToString, Hash {
        case Defines
        case DefinedIn
        case Imports
        case ImportedBy
        case Calls
        case Callers
    }

    /// One directed relation fact in exactly one world. The world is part of the
    /// fact's identity, so a same-named edge in another world is a different
    /// fact and can never donate an edge.
    pub type alias Fact = { world = World, source = String, atom = Atom, target = String }

    /// A complete finite frontier: one world, one nominal domain and the exact
    /// finite set of entities in that domain. The constructor fixes the domain,
    /// so a frontier cannot pair a domain with members from another one.
    pub enum Frontier with Eq, Order, ToString, Hash {
        case Files(World, Set[FileId])
        case Symbols(World, Set[SymbolId])
    }

    /// The Files frontier of `world` over exactly `paths`.
    pub def files(world: World, paths: List[String]): Frontier =
        Frontier.Files(world, List.toSet(List.map(FileId.FileId, paths)))

    /// The Symbols frontier of `world` over exactly `names`.
    pub def symbols(world: World, names: List[String]): Frontier =
        Frontier.Symbols(world, List.toSet(List.map(SymbolId.SymbolId, names)))

    /// The world a frontier belongs to.
    pub def worldOf(frontier: Frontier): World = match frontier {
        case Frontier.Files(world, _)   => world
        case Frontier.Symbols(world, _) => world
    }

    /// The nominal domain a frontier belongs to.
    pub def domainOf(frontier: Frontier): Domain = match frontier {
        case Frontier.Files(_, _)   => Domain.Files
        case Frontier.Symbols(_, _) => Domain.Symbols
    }

    /// The lower-case name of a domain, for checked display and assertions.
    pub def domainName(domain: Domain): String = match domain {
        case Domain.Files   => "files"
        case Domain.Symbols => "symbols"
    }

    /// The lower-case name of an atom, the single vocabulary used by route
    /// validation and grammar display.
    pub def atomName(atom: Atom): String = match atom {
        case Atom.Defines    => "defines"
        case Atom.DefinedIn  => "defined_in"
        case Atom.Imports    => "imports"
        case Atom.ImportedBy => "imported_by"
        case Atom.Calls      => "calls"
        case Atom.Callers    => "callers"
    }

    /// The nominal domain an atom consumes.
    pub def atomSource(atom: Atom): Domain = match atom {
        case Atom.Defines    => Domain.Files
        case Atom.DefinedIn  => Domain.Symbols
        case Atom.Imports    => Domain.Files
        case Atom.ImportedBy => Domain.Files
        case Atom.Calls      => Domain.Symbols
        case Atom.Callers    => Domain.Symbols
    }

    /// The nominal domain an atom produces.
    pub def atomTarget(atom: Atom): Domain = match atom {
        case Atom.Defines    => Domain.Symbols
        case Atom.DefinedIn  => Domain.Files
        case Atom.Imports    => Domain.Files
        case Atom.ImportedBy => Domain.Files
        case Atom.Calls      => Domain.Symbols
        case Atom.Callers    => Domain.Symbols
    }

    /// Every directed atom, in one fixed order. This is the single signature
    /// table: grammar display and route validation both read it, so the two can
    /// never drift into separate vocabularies.
    pub def atoms(): List[Atom] =
        Atom.Defines :: Atom.DefinedIn :: Atom.Imports ::
            Atom.ImportedBy :: Atom.Calls :: Atom.Callers :: Nil

    /// The opposite of one directed atom. `defines`/`defined_in`,
    /// `imports`/`imported_by` and `calls`/`callers` are the three inverse
    /// pairs. Deriving an inverse relation reads this one typed table rather
    /// than a second string mapping, so the forward and inverse vocabularies
    /// cannot disagree.
    pub def inverse(atom: Atom): Atom = match atom {
        case Atom.Defines    => Atom.DefinedIn
        case Atom.DefinedIn  => Atom.Defines
        case Atom.Imports    => Atom.ImportedBy
        case Atom.ImportedBy => Atom.Imports
        case Atom.Calls      => Atom.Callers
        case Atom.Callers    => Atom.Calls
    }

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
        let world = worldOf(input);
        let domain = domainOf(input);
        if (domain != atomSource(atom))
            Err(atomName(atom) + " needs " + domainName(atomSource(atom))
                + " but the current domain is " + domainName(domain) + ".")
        else match List.find(fact -> fact#world != world, facts) {
            case Some(_) => Err("a fact from another world cannot apply here.")
            case None =>
                let targets = List.filterMap(fact ->
                    if (fact#atom == atom and holds(input, fact#source)) Some(fact#target) else None,
                    facts);
                Ok(frontierOf(world, atomTarget(atom), targets))
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
        let key = (worldOf(input), namespace, input, atom);
        if (List.exists(fact -> fact#world != worldOf(input), facts))
            (Err("a fact from another world cannot apply here."), memo, Nil, next)
        else match List.find(entry -> match entry { case (k, _, _) => k == key }, memo) {
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
