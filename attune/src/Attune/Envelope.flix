/// The shared nominal envelope.
///
/// This is the one small vocabulary every later Attune surface shares: a world
/// identity, the two nominal entity domains, the six directed atom signatures,
/// and a complete finite frontier. It makes no runtime cache, topology or
/// evaluation decision; it only fixes exact identity.
///
/// Identity is deliberately nominal. A `FileId` and a `SymbolId` are different
/// types, so the pinned compiler rejects a program that mixes domains. A
/// frontier carries its world and its complete finite element set, so equality
/// compares the world, the domain and every element rather than a display name.
pub mod Attune.Envelope {
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
    pub def worldId(id: WorldId): World =
        World.World(id#origin + "@" + id#content + "#" + id#semantics)

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
}
