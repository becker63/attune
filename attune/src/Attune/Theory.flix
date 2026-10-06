/// Theory: bounded canonical descriptors lowered to fixed native Flix fragments.
///
/// Theory is the one owner of the admitted finite template family. It decides
/// exactly three things and nothing else.
///
/// **Admission.** A descriptor carries one to three positive binary atoms over
/// at most four typed role slots, at most two projected outputs and at most one
/// bound inequality. A role's nominal domain is derived from the core atom
/// signature table, so a role used as a file in one atom and as a symbol in
/// another is unsafe and rejects. The positive atoms must be connected, no atom
/// may name the same role twice, and every output and inequality role must be
/// bound by a positive atom.
///
/// **Canonical identity.** Two descriptors name the same candidate exactly when
/// one consistent renaming of their role slots makes the atom bodies, the bound
/// inequality and the projected outputs equal. The canonical form is the least
/// of the at most `maxRenamings()` renamings, so role spelling, conjunct body
/// order and duplicate conjuncts normalize while a changed inequality, a
/// reversed relation direction and a changed output role stay distinct. This is
/// alpha-equivalence, not graph isomorphism and not logical equivalence.
///
/// **Lowering.** One deterministic population of at most `maxCandidates()`
/// canonical candidates is sharded at about `shardSize()` descriptors per shard,
/// at most `maxShards()` shards per world. The declared shard index is carried
/// explicitly, so `shardAt` selects exactly that one node's own bounded slice
/// (`theory_shard_<world>_<index>`) rather than a guessed or first chunk, and an
/// index outside the bounded list is an empty slice. A world's facts and that
/// slice's descriptors become native `Edge` and `Desc` facts, and the fixed
/// compiler-checked rule set below materializes anchor-free `Binding` and
/// `Output` rows. Only the `Task` rule joins an application anchor, so a task or
/// pair join never re-evaluates the structure. Candidate and world are part of
/// every intermediate and result row, so no witness crosses a partition, and
/// duplicate candidate ids can never union distinct descriptors.
///
/// The `Desc` shape a rule selects on is the relation-independent lowering key
/// `shapeKey(lowering(...))`, not the full canonical form: relation spelling can
/// reorder the role wiring under alpha-canonicalization, so keying a rule on the
/// canonical shape would let some admitted conjunction select no rule and answer
/// empty. `lowering` minimizes the role wiring with the relation names ignored
/// and transforms the relation, output and inequality slots by the same renaming,
/// so every spelling of one structural wiring lands on one fixed rule family
/// while descriptor identity keeps its public canonical form.
///
/// Theory reads no document, contacts no provider, ranks no task and owns no
/// verdict. It consumes core values and one world's facts through
/// `Attune.Coverage` and never imports Study or View. There is no runtime rule
/// text, no second evaluator and no search.
pub mod Attune.Theory {

    use Attune.Coverage.WorldFacts
    use Attune.{Atom, Domain, Fact, World}

    // -------------------------------------------------------------- entities

    /// One nominal-tagged entity inside a lowered fragment. The tag is derived
    /// from the core atom signature table, so a file named `same` and a symbol
    /// named `same` are different entities even though their payloads are equal.
    pub enum Entity with Eq, Order, ToString, Hash {
        case File(String)
        case Symbol(String)
    }

    /// The stable display form of one tagged entity.
    pub def entityText(entity: Entity): String = match entity {
        case Entity.File(name)   => "file:" + name
        case Entity.Symbol(name) => "symbol:" + name
    }

    /// The nominal domain a tagged entity belongs to.
    pub def entityDomain(entity: Entity): Domain = match entity {
        case Entity.File(_)   => Domain.Files
        case Entity.Symbol(_) => Domain.Symbols
    }

    /// The tagged entity for one name in one domain.
    pub def entityOf(name: String, domain: Domain): Entity = match domain {
        case Domain.Files   => Entity.File(name)
        case Domain.Symbols => Entity.Symbol(name)
    }

    // ----------------------------------------------------------- descriptors

    /// One positive binary atom pattern over role slots. The relation carries its
    /// own nominal domain signature, so the domains are never restated here.
    pub type alias AtomPattern = { relation = Atom, subject = Int32, object = Int32 }

    /// One candidate description: an ordered conjunction of positive binary atom
    /// patterns, the bound inequalities between role slots, and the ordered
    /// projected output slots. The descriptor has no head name; its identity is
    /// exactly its structure.
    pub type alias Descriptor = {
        atoms   = List[AtomPattern],
        denied  = List[(Int32, Int32)],
        outputs = List[Int32]
    }

    /// One named candidate: a stable id and the descriptor it names.
    pub type alias Candidate = { id = String, descriptor = Descriptor }

    /// The declared bound on positive binary atoms.
    pub def maxAtoms(): Int32 = 3

    /// The declared bound on typed role slots.
    pub def maxRoles(): Int32 = 4

    /// The declared bound on projected output slots.
    pub def maxOutputs(): Int32 = 2

    /// The declared bound on bound inequalities.
    pub def maxInequalities(): Int32 = 1

    /// The declared bound on consistent role renamings canonicalization may use.
    pub def maxRenamings(): Int32 = 24

    /// The declared bound on canonical candidates in one deterministic population.
    pub def maxCandidates(): Int32 = 256

    /// The declared starting shard granularity.
    pub def shardSize(): Int32 = 32

    /// The declared bound on theory shards per world.
    pub def maxShards(): Int32 = 8

    // ------------------------------------------------------- record decoding

    /// Decode one declared descriptor record
    /// (`id rel0 subj0 obj0 rel1 subj1 obj1 out0 out1 …`) into a candidate. `-`
    /// is the declared empty slot for an absent second atom or output. A record
    /// with an unknown relation name or a short arity yields nothing rather than
    /// a guessed descriptor, so a malformed panel row can never become an
    /// admitted candidate.
    pub def decodeCandidate(row: List[String]): Option[Candidate] = match row {
        case id :: rel0 :: subj0 :: obj0 :: rel1 :: subj1 :: obj1 :: out0 :: out1 :: _ =>
            match patternOf(rel0, subj0, obj0) {
                case Some(first) =>
                    let atoms = first :: (match patternOf(rel1, subj1, obj1) {
                        case Some(second) => second :: Nil
                        case None         => Nil
                    });
                    Some({ id = id, descriptor = { atoms = atoms, denied = Nil, outputs = outputsOf(out0, out1) } })
                case None => None
            }
        case _ => None
    }

    /// One declared atom pattern from its relation name and role slots, or
    /// nothing when the relation name is unknown or the slot is the empty `-`.
    def patternOf(rel: String, subj: String, obj: String): Option[AtomPattern] =
        if (rel == "-") None
        else match List.find(atom -> Attune.atomName(atom) == rel, Attune.atoms()) {
            case Some(atom) => Some({ relation = atom, subject = intOf(subj), object = intOf(obj) })
            case None       => None
        }

    /// The declared output slots, dropping an absent second output.
    def outputsOf(out0: String, out1: String): List[Int32] =
        (if (out0 == "-") Nil else intOf(out0) :: Nil) ::: (if (out1 == "-") Nil else intOf(out1) :: Nil)

    def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

    // -------------------------------------------------------------- admission

    /// True exactly when the descriptor is inside the admitted grammar.
    pub def safe(candidate: Descriptor): Bool = {
        let atoms = candidate#atoms;
        let count = List.length(atoms);
        count >= 1 and count <= maxAtoms()
            and List.forAll(slotInRange, roleList(atoms))
            and List.forAll(atom -> atom#subject != atom#object, atoms)
            and connected(atoms)
            and domainsConsistent(atoms)
            and List.length(candidate#outputs) >= 1
            and List.length(candidate#outputs) <= maxOutputs()
            and List.length(List.distinct(candidate#outputs)) == List.length(candidate#outputs)
            and List.forAll(output -> bound(output, atoms), candidate#outputs)
            and List.length(candidate#denied) <= maxInequalities()
            and List.forAll(pair -> match pair {
                case (left, right) => left != right and bound(left, atoms) and bound(right, atoms)
            }, candidate#denied)
    }

    def slotInRange(slot: Int32): Bool = slot >= 0 and slot < maxRoles()

    /// True when some positive atom names this role slot.
    pub def bound(role: Int32, atoms: List[AtomPattern]): Bool =
        List.exists(atom -> atom#subject == role or atom#object == role, atoms)

    /// The role slots a conjunction names, in first-appearance order.
    def roleList(atoms: List[AtomPattern]): List[Int32] =
        List.flatMap(atom -> atom#subject :: atom#object :: Nil, atoms)

    /// Every named role is reachable from every other along the conjunction, so
    /// the pattern is one connected structure rather than two disjoint ones.
    def connected(atoms: List[AtomPattern]): Bool = {
        let roles = List.distinct(roleList(atoms));
        match roles {
            case Nil        => false
            case start :: _ => List.length(reachable(atoms, start :: Nil, Nil)) == List.length(roles)
        }
    }

    def reachable(atoms: List[AtomPattern], pending: List[Int32], seen: List[Int32]): List[Int32] = match pending {
        case Nil => seen
        case role :: rest =>
            let neighbours = List.filterMap(atom -> {
                if (atom#subject == role and not List.memberOf(atom#object, seen)) Some(atom#object)
                else if (atom#object == role and not List.memberOf(atom#subject, seen)) Some(atom#subject)
                else None
            }, atoms);
            let fresh = List.filter(neighbour -> not List.memberOf(neighbour, rest), List.distinct(neighbours));
            reachable(atoms, rest ::: fresh, role :: seen)
    }

    /// One role slot must mean one nominal domain. The domains come from the core
    /// signature table, so an atom that reads a role as a file and an atom that
    /// writes it as a symbol cannot be composed into one conjunction.
    def domainsConsistent(atoms: List[AtomPattern]): Bool =
        List.forAll(role -> List.length(List.distinct(domainsOf(role, atoms))) <= 1, List.distinct(roleList(atoms)))

    def domainsOf(role: Int32, atoms: List[AtomPattern]): List[Domain] =
        List.flatMap(atom ->
            (if (atom#subject == role) Attune.atomSource(atom#relation) :: Nil else Nil)
                ::: (if (atom#object == role) Attune.atomTarget(atom#relation) :: Nil else Nil),
            atoms)

    // ---------------------------------------------------- canonical identity

    /// Every consistent renaming of the four role slots: exactly
    /// `maxRenamings()` orderings, so canonicalization is bounded by the declared
    /// 24 renamings and never becomes a search.
    pub def renamings(): List[List[Int32]] = permutations(0 :: 1 :: 2 :: 3 :: Nil)

    def permutations(values: List[Int32]): List[List[Int32]] = match values {
        case Nil => Nil :: Nil
        case _   => List.flatMap(value -> List.map(tail -> value :: tail, permutations(without(value, values))), values)
    }

    def without(value: Int32, values: List[Int32]): List[Int32] =
        List.filter(other -> other != value, values)

    /// The canonical descriptor: the least of the consistent renamings, with the
    /// atoms sorted and de-duplicated and the roles renumbered by first
    /// appearance.
    pub def canonical(candidate: Descriptor): Descriptor =
        match bestOption(candidate, renamings(), None) {
            case None         => emptyDescriptor()
            case Some(option) => renumber(renamed(candidate, option))
        }

    /// The canonical identity key. Two descriptors share it exactly when they are
    /// the same candidate up to a consistent renaming of their role slots.
    pub def identityKey(candidate: Descriptor): String = render(canonical(candidate))

    /// The comparable canonical key of one descriptor form: its sorted atom body,
    /// its ordered bound inequalities and its ordered output slots.
    pub def render(candidate: Descriptor): String =
        "atoms[" + List.join(";", List.map(renderAtom, candidate#atoms))
            + "] denied[" + List.join(";", List.map(renderPair, candidate#denied))
            + "] outputs[" + List.join(",", List.map(output -> "v" + Int32.toString(output), candidate#outputs)) + "]"

    /// The connected shape of a descriptor's positive atoms, as its ordered role
    /// pairs. The fixed rules do not select on the canonical form directly but on
    /// `loweringKey`, which minimizes this role wiring with the relation names
    /// ignored.
    pub def shapeKey(candidate: Descriptor): String =
        List.join(";", List.map(atom -> Int32.toString(atom#subject) + ">" + Int32.toString(atom#object), candidate#atoms))

    /// The one empty descriptor, used only when a descriptor has no form at all.
    pub def emptyDescriptor(): Descriptor = { atoms = Nil, denied = Nil, outputs = Nil }

    // ------------------------------------------------ relation-independent lowering

    /// The internal lowering key the fixed rules select on: the descriptor's role
    /// wiring minimized over the at most `maxRenamings()` consistent renamings
    /// with the relation names ignored. It is deliberately separate from
    /// `identityKey`: descriptor identity keeps its public canonical form, while
    /// lowering lands every relation spelling of one structural wiring on one
    /// compiled rule family, so an admitted conjunction can never select no rule
    /// and answer empty.
    pub def loweringKey(candidate: Descriptor): String = shapeKey(lowering(candidate))

    /// One descriptor normalized for lowering. The role renaming is chosen by the
    /// least role wiring first and the least full form second, then renumbered by
    /// first appearance. Every relation, projected output and bound-inequality
    /// slot is carried through the same renaming, so the `Desc` row and the rule
    /// family it selects stay consistent.
    pub def lowering(candidate: Descriptor): Descriptor =
        match bestWireOption(candidate, renamings(), None) {
            case None         => emptyDescriptor()
            case Some(option) => renumber(renamed(candidate, option))
        }

    def bestWireOption(candidate: Descriptor, options: List[List[Int32]], best: Option[List[Int32]]): Option[List[Int32]] =
        match options {
            case Nil => best
            case option :: rest => match best {
                case None => bestWireOption(candidate, rest, Some(option))
                case Some(current) =>
                    if (wiringPrecedes(candidate, option, current)) bestWireOption(candidate, rest, Some(option))
                    else bestWireOption(candidate, rest, best)
            }
        }

    /// True when one consistent renaming's role wiring precedes another's. The
    /// wiring is compared first, so the minimization is relation-independent; the
    /// full canonical form breaks a remaining tie, so the choice stays
    /// deterministic and independent of the input's role names.
    def wiringPrecedes(candidate: Descriptor, option: List[Int32], current: List[Int32]): Bool = {
        let left = renamed(candidate, option);
        let right = renamed(candidate, current);
        let leftShape = shapeKey(left);
        let rightShape = shapeKey(right);
        if (leftShape != rightShape) leftShape < rightShape else render(left) < render(right)
    }

    def bestOption(candidate: Descriptor, options: List[List[Int32]], best: Option[List[Int32]]): Option[List[Int32]] =
        match options {
            case Nil => best
            case option :: rest => match best {
                case None => bestOption(candidate, rest, Some(option))
                case Some(current) =>
                    if (render(renamed(candidate, option)) < render(renamed(candidate, current)))
                        bestOption(candidate, rest, Some(option))
                    else bestOption(candidate, rest, best)
            }
        }

    /// One descriptor under one consistent renaming: every role is rewritten, the
    /// atoms are sorted and de-duplicated, each symmetric inequality is ordered,
    /// and the output slots keep their declared order.
    def renamed(candidate: Descriptor, option: List[Int32]): Descriptor = {
        let atoms = List.sortBy(atomKey, List.map(atom -> {
            relation = atom#relation,
            subject = permuted(option, atom#subject),
            object = permuted(option, atom#object)
        }, candidate#atoms));
        {
            atoms = dedupPatterns(atoms, Nil),
            denied = List.sort(List.distinct(List.map(pair -> match pair {
                case (left, right) => ordered(permuted(option, left), permuted(option, right))
            }, candidate#denied))),
            outputs = List.map(output -> permuted(option, output), candidate#outputs)
        }
    }

    /// The role slot one renaming assigns to a role index.
    def permuted(option: List[Int32], index: Int32): Int32 = match List.drop(index, option) {
        case head :: _ => head
        case Nil       => index
    }

    /// Renumber the roles by first appearance in the already sorted atom list, so
    /// every equivalent spelling lands on the same compact numbering.
    def renumber(candidate: Descriptor): Descriptor = {
        let mapping = numbering(roleList(candidate#atoms), Nil);
        {
            atoms = List.map(atom -> {
                relation = atom#relation,
                subject = mapped(mapping, atom#subject),
                object = mapped(mapping, atom#object)
            }, candidate#atoms),
            denied = List.map(pair -> match pair {
                case (left, right) => (mapped(mapping, left), mapped(mapping, right))
            }, candidate#denied),
            outputs = List.map(output -> mapped(mapping, output), candidate#outputs)
        }
    }

    def numbering(roles: List[Int32], mapping: List[(Int32, Int32)]): List[(Int32, Int32)] = match roles {
        case Nil => mapping
        case role :: rest =>
            if (List.exists(pair -> match pair { case (original, _) => original == role }, mapping))
                numbering(rest, mapping)
            else numbering(rest, mapping ::: ((role, List.length(mapping)) :: Nil))
    }

    def mapped(mapping: List[(Int32, Int32)], role: Int32): Int32 =
        match List.find(pair -> match pair { case (original, _) => original == role }, mapping) {
            case Some((_, canonical)) => canonical
            case None                 => role
        }

    def dedupPatterns(atoms: List[AtomPattern], kept: List[AtomPattern]): List[AtomPattern] = match atoms {
        case Nil => List.reverse(kept)
        case atom :: rest =>
            if (List.exists(other -> samePattern(other, atom), kept)) dedupPatterns(rest, kept)
            else dedupPatterns(rest, atom :: kept)
    }

    def samePattern(left: AtomPattern, right: AtomPattern): Bool =
        left#relation == right#relation and left#subject == right#subject and left#object == right#object

    def ordered(left: Int32, right: Int32): (Int32, Int32) = if (left <= right) (left, right) else (right, left)

    def atomKey(atom: AtomPattern): String =
        Int32.toString(atom#subject) + "," + Int32.toString(atom#object) + " " + Attune.atomName(atom#relation)

    def renderAtom(atom: AtomPattern): String =
        Attune.atomName(atom#relation) + "(v" + Int32.toString(atom#subject) + ",v" + Int32.toString(atom#object) + ")"

    def renderPair(pair: (Int32, Int32)): String = match pair {
        case (left, right) => "v" + Int32.toString(left) + "!=v" + Int32.toString(right)
    }

    // ------------------------------------------------------------- population

    /// The deterministic bounded candidate population and the bounded work it
    /// refuses to hide: how many inputs were dropped, which candidate ids named
    /// more than one distinct descriptor, and whether the declared
    /// `maxCandidates()` bound truncated the population.
    pub type alias Population = {
        kept      = List[Candidate],
        dropped   = Int32,
        conflicts = List[String],
        truncated = Bool
    }

    /// The deterministic bounded population: unsafe descriptors and duplicates
    /// removed, one descriptor per candidate id, sorted by canonical identity.
    pub def population(candidates: List[Candidate]): Population = {
        let ordered = List.sortBy(candidate -> candidate#id, candidates);
        let (conflicts, unique) = resolveIds(ordered, Nil, Nil, Nil);
        let canonicalCandidates = List.map(candidate ->
            { id = candidate#id, descriptor = canonical(candidate#descriptor) }, unique);
        let admitted = List.filter(candidate -> safe(candidate#descriptor), canonicalCandidates);
        let distinct = dedupIdentities(admitted, Nil, Nil);
        let kept = List.sortBy(candidate -> identityKey(candidate#descriptor), distinct);
        let bounded = List.take(maxCandidates(), kept);
        {
            kept = bounded,
            dropped = List.length(candidates) - List.length(bounded),
            conflicts = List.reverse(conflicts),
            truncated = List.length(kept) > maxCandidates()
        }
    }

    /// One candidate id names exactly one descriptor. A second candidate with the
    /// same id and a different canonical identity is refused by name rather than
    /// allowed to union two descriptors into one row set.
    def resolveIds(
        candidates: List[Candidate],
        seen: List[(String, String)],
        conflicts: List[String],
        acc: List[Candidate]
    ): (List[String], List[Candidate]) = match candidates {
        case Nil => (conflicts, List.reverse(acc))
        case candidate :: rest =>
            let key = identityKey(candidate#descriptor);
            match List.find(pair -> match pair { case (id, _) => id == candidate#id }, seen) {
                case None => resolveIds(rest, (candidate#id, key) :: seen, conflicts, candidate :: acc)
                case Some((_, existing)) =>
                    if (existing == key) resolveIds(rest, seen, conflicts, acc)
                    else resolveIds(rest, seen, candidate#id :: conflicts, acc)
            }
    }

    def dedupIdentities(candidates: List[Candidate], seen: List[String], acc: List[Candidate]): List[Candidate] =
        match candidates {
            case Nil => List.reverse(acc)
            case candidate :: rest =>
                let key = identityKey(candidate#descriptor);
                if (List.memberOf(key, seen)) dedupIdentities(rest, seen, acc)
                else dedupIdentities(rest, key :: seen, candidate :: acc)
        }

    /// The bounded world-level shards of one population: at most `maxShards()`
    /// shards of at most `shardSize()` descriptors each, with the excess recorded
    /// rather than hidden.
    pub type alias Shards = { shards = List[List[Candidate]], dropped = Int32, truncated = Bool }

    /// Split one population into world-level shards at the declared granularity.
    pub def shards(population: Population): Shards = {
        let all = if (List.isEmpty(population#kept)) Nil else chunks(shardSize(), population#kept);
        let bounded = List.take(maxShards(), all);
        let total = List.foldLeft((count, shard) -> count + List.length(shard), 0, bounded);
        { shards = bounded, dropped = List.length(population#kept) - total, truncated = List.length(all) > maxShards() }
    }

    def chunks(size: Int32, values: List[a]): List[List[a]] =
        if (List.length(values) <= size) values :: Nil
        else List.take(size, values) :: chunks(size, List.drop(size, values))

    /// The declared shard at one index of a bounded shard list, or the empty
    /// slice when the index is outside it. A declared per-index node
    /// (`theory_shard_<world>_<index>`) materializes exactly its own declared
    /// slice: the index is carried explicitly, so the node lowers its own
    /// bounded candidates rather than guessing a label or falling back to the
    /// first chunk. An index beyond the bounded shard list is an empty slice,
    /// which a legal empty witness slice materializes as a typed empty artifact.
    pub def shardAt(index: Int32, sharded: Shards): List[Candidate] =
        match sliceAt(index, sharded#shards) {
            case Some(slice) => slice
            case None        => Nil
        }

    def sliceAt(index: Int32, bounded: List[List[Candidate]]): Option[List[Candidate]] = match bounded {
        case Nil           => None
        case slice :: rest => if (index <= 0) Some(slice) else sliceAt(index - 1, rest)
    }

    // --------------------------------------------------------------- lowering

    /// The fixed native schema every world shard shares. `Edge` is the world's
    /// nominal facts, `Desc` one lowering-keyed descriptor row per candidate,
    /// `Binding` and `Output` the anchor-free structural rows, `Anchor` the
    /// application anchors and `Task` the anchored join. Nothing here is a
    /// runtime rule string.
    pub type alias Schema = #{
        Edge(World, Atom, Entity, Entity),
        Desc(String, String, Atom, Atom, Atom, Bool, Int32, Int32, Int32, Int32),
        Binding(String, World, Entity, Entity, Entity, Entity),
        Output(String, World, Entity, Entity),
        Anchor(World, Entity),
        Task(String, World, Entity, Entity)
    }

    /// The world edges of one scope's nominal facts, each endpoint tagged by the
    /// core atom signature table.
    pub def edges(facts: List[Fact]): List[(World, Atom, Entity, Entity)] =
        List.map(fact -> (
            fact#world,
            fact#atom,
            entityOf(fact#source, Attune.atomSource(fact#atom)),
            entityOf(fact#target, Attune.atomTarget(fact#atom))), facts)

    /// One `Desc` row per candidate: the id, the relation-independent lowering
    /// key, the three relation slots, the one optional bound inequality and the
    /// two output slots. A descriptor with no inequality carries `distinct =
    /// false`, and an unused relation or output slot is padded; `safe` guarantees
    /// the padded slots are never read.
    pub def descriptors(candidates: List[Candidate]): List[(String, String, Atom, Atom, Atom, Bool, Int32, Int32, Int32, Int32)] =
        List.map(descriptorRow, candidates)

    /// The `Desc` row for one candidate: its identity id and lowering key, and the
    /// relation, inequality and output slots taken from the same lowering
    /// normalization as the key, so the row and the rule it selects agree.
    def descriptorRow(candidate: Candidate): (String, String, Atom, Atom, Atom, Bool, Int32, Int32, Int32, Int32) = {
        let descriptor = lowering(candidate#descriptor);
        let relations = List.map(atom -> atom#relation, descriptor#atoms);
        let (distinct, neq0, neq1) = match descriptor#denied {
            case pair :: _ => match pair { case (left, right) => (true, left, right) }
            case Nil       => (false, 0, 0)
        };
        (candidate#id, shapeKey(descriptor), at(0, relations), at(1, relations), at(2, relations),
            distinct, neq0, neq1, outputAt(0, descriptor#outputs), outputAt(1, descriptor#outputs))
    }

    def at(index: Int32, relations: List[Atom]): Atom = match List.drop(index, relations) {
        case head :: _ => head
        case Nil       => Atom.Defines
    }

    /// The `index`-th projected output slot. A one-slot descriptor pads its
    /// second slot with its first, so `Output` is always the pair the descriptor
    /// declared and never an accidental reversed pair.
    def outputAt(index: Int32, outputs: List[Int32]): Int32 = match List.drop(index, outputs) {
        case head :: _ => head
        case Nil       => match outputs {
            case first :: _ => first
            case Nil        => 0
        }
    }

    /// Assemble one world shard's lowering: the scope's world-bearing facts, one
    /// lowering-keyed descriptor row per candidate, and the application anchors.
    pub def lower(world: WorldFacts, candidates: List[Candidate], anchors: List[(World, Entity)]): Schema =
        inject edges(world#facts), descriptors(candidates), anchors into Edge/4, Desc/10, Anchor/2

    /// The entity one role slot holds in a native binding. A slot no positive atom
    /// occupies is padded with the binding's first entity; `safe` guarantees no
    /// output or inequality role ever reads a padded slot.
    pub def role(index: Int32, e0: Entity, e1: Entity, e2: Entity, e3: Entity): Entity = match index {
        case 0 => e0
        case 1 => e1
        case 2 => e2
        case _ => e3
    }

    /// The complete fixed lowering over the admitted family: one compiler-checked
    /// rule per connected structural wiring of one to three positive binary atoms
    /// over four role slots (twenty-three families), plus the projection and the
    /// anchored task rule. The wiring is data in `Desc`; each rule selects one
    /// relation-independent lowering key, joins generic `Edge` facts by relation
    /// value, and enforces the one bound inequality as a per-role-pair guard whose
    /// free variables stay inside the compiler's lifted-guard budget. There is no
    /// runtime rule text and no second evaluator.
    pub def rules(): Schema = #{
        // shape 0>1
        Binding(c, w, e0, e1, e0, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            if (shape == "0>1"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1).

        // shape 0>1;0>1
        Binding(c, w, e0, e1, e0, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e1),
            if (shape == "0>1;0>1"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1).

        // shape 0>1;0>2
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e2),
            if (shape == "0>1;0>2"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;1>0
        Binding(c, w, e0, e1, e0, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e1, e0),
            if (shape == "0>1;1>0"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1).

        // shape 0>1;1>2
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e1, e2),
            if (shape == "0>1;1>2"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;2>1
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e2, e1),
            if (shape == "0>1;2>1"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;0>1;0>2
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e1),
            Edge(w, r2, e0, e2),
            if (shape == "0>1;0>1;0>2"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;0>1;1>0
        Binding(c, w, e0, e1, e0, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e1),
            Edge(w, r2, e1, e0),
            if (shape == "0>1;0>1;1>0"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1).

        // shape 0>1;0>1;1>2
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e1),
            Edge(w, r2, e1, e2),
            if (shape == "0>1;0>1;1>2"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;0>1;2>0
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e1),
            Edge(w, r2, e2, e0),
            if (shape == "0>1;0>1;2>0"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;0>1;2>1
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e1),
            Edge(w, r2, e2, e1),
            if (shape == "0>1;0>1;2>1"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;0>2;0>3
        Binding(c, w, e0, e1, e2, e3) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e2),
            Edge(w, r2, e0, e3),
            if (shape == "0>1;0>2;0>3"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 0 or neq1 != 3 or e0 != e3),
            if (neq0 != 1 or neq1 != 2 or e1 != e2),
            if (neq0 != 1 or neq1 != 3 or e1 != e3),
            if (neq0 != 2 or neq1 != 3 or e2 != e3).

        // shape 0>1;0>2;1>0
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e2),
            Edge(w, r2, e1, e0),
            if (shape == "0>1;0>2;1>0"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;0>2;1>2
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e2),
            Edge(w, r2, e1, e2),
            if (shape == "0>1;0>2;1>2"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;0>2;1>3
        Binding(c, w, e0, e1, e2, e3) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e2),
            Edge(w, r2, e1, e3),
            if (shape == "0>1;0>2;1>3"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 0 or neq1 != 3 or e0 != e3),
            if (neq0 != 1 or neq1 != 2 or e1 != e2),
            if (neq0 != 1 or neq1 != 3 or e1 != e3),
            if (neq0 != 2 or neq1 != 3 or e2 != e3).

        // shape 0>1;0>2;3>0
        Binding(c, w, e0, e1, e2, e3) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e2),
            Edge(w, r2, e3, e0),
            if (shape == "0>1;0>2;3>0"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 0 or neq1 != 3 or e0 != e3),
            if (neq0 != 1 or neq1 != 2 or e1 != e2),
            if (neq0 != 1 or neq1 != 3 or e1 != e3),
            if (neq0 != 2 or neq1 != 3 or e2 != e3).

        // shape 0>1;0>2;3>1
        Binding(c, w, e0, e1, e2, e3) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e0, e2),
            Edge(w, r2, e3, e1),
            if (shape == "0>1;0>2;3>1"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 0 or neq1 != 3 or e0 != e3),
            if (neq0 != 1 or neq1 != 2 or e1 != e2),
            if (neq0 != 1 or neq1 != 3 or e1 != e3),
            if (neq0 != 2 or neq1 != 3 or e2 != e3).

        // shape 0>1;1>0;2>0
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e1, e0),
            Edge(w, r2, e2, e0),
            if (shape == "0>1;1>0;2>0"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;1>2;2>0
        Binding(c, w, e0, e1, e2, e0) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e1, e2),
            Edge(w, r2, e2, e0),
            if (shape == "0>1;1>2;2>0"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 1 or neq1 != 2 or e1 != e2).

        // shape 0>1;1>2;2>3
        Binding(c, w, e0, e1, e2, e3) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e1, e2),
            Edge(w, r2, e2, e3),
            if (shape == "0>1;1>2;2>3"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 0 or neq1 != 3 or e0 != e3),
            if (neq0 != 1 or neq1 != 2 or e1 != e2),
            if (neq0 != 1 or neq1 != 3 or e1 != e3),
            if (neq0 != 2 or neq1 != 3 or e2 != e3).

        // shape 0>1;1>2;3>1
        Binding(c, w, e0, e1, e2, e3) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e1, e2),
            Edge(w, r2, e3, e1),
            if (shape == "0>1;1>2;3>1"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 0 or neq1 != 3 or e0 != e3),
            if (neq0 != 1 or neq1 != 2 or e1 != e2),
            if (neq0 != 1 or neq1 != 3 or e1 != e3),
            if (neq0 != 2 or neq1 != 3 or e2 != e3).

        // shape 0>1;1>2;3>2
        Binding(c, w, e0, e1, e2, e3) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e1, e2),
            Edge(w, r2, e3, e2),
            if (shape == "0>1;1>2;3>2"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 0 or neq1 != 3 or e0 != e3),
            if (neq0 != 1 or neq1 != 2 or e1 != e2),
            if (neq0 != 1 or neq1 != 3 or e1 != e3),
            if (neq0 != 2 or neq1 != 3 or e2 != e3).

        // shape 0>1;2>1;3>1
        Binding(c, w, e0, e1, e2, e3) :-
            Desc(c, shape, r0, r1, r2, _, neq0, neq1, _, _),
            Edge(w, r0, e0, e1),
            Edge(w, r1, e2, e1),
            Edge(w, r2, e3, e1),
            if (shape == "0>1;2>1;3>1"),
            if (neq0 != 0 or neq1 != 1 or e0 != e1),
            if (neq0 != 0 or neq1 != 2 or e0 != e2),
            if (neq0 != 0 or neq1 != 3 or e0 != e3),
            if (neq0 != 1 or neq1 != 2 or e1 != e2),
            if (neq0 != 1 or neq1 != 3 or e1 != e3),
            if (neq0 != 2 or neq1 != 3 or e2 != e3).

        // shape projection: the two declared output slots of one binding.
        Output(c, w, role(out0, e0, e1, e2, e3), role(out1, e0, e1, e2, e3)) :-
            Binding(c, w, e0, e1, e2, e3),
            Desc(c, _, _, _, _, _, _, _, out0, out1).

        // anchored application join: a task or pair context joins an anchor to an
        // already materialized structural row and never re-evaluates the structure.
        Task(c, w, x, y) :- Output(c, w, x, y), Anchor(w, x).
    }

    // ------------------------------------------------------------- accessors

    /// One materialized structural binding: the candidate, the world and the four
    /// role entities. Candidate and world are part of the row, so no witness
    /// crosses a candidate, world or scope partition.
    pub type alias Binding = {
        candidate = String,
        world     = World,
        r0        = Entity,
        r1        = Entity,
        r2        = Entity,
        r3        = Entity
    }

    /// One materialized projection row. A one-slot descriptor pads its second
    /// projection slot with its first, so the descriptor's own output count stays
    /// the authority on how many slots were projected.
    pub type alias Witness = { candidate = String, world = World, x = Entity, y = Entity }

    /// The anchor-free structural bindings of one world shard.
    pub def bindings(world: WorldFacts, candidates: List[Candidate]): List[Binding] = {
        let rows = query lower(world, candidates, Nil), rules()
            select (c, w, a, b, d, e) from Binding(c, w, a, b, d, e);
        List.map(row -> match row {
            case (c, w, a, b, d, e) => { candidate = c, world = w, r0 = a, r1 = b, r2 = d, r3 = e }
        }, Set.toList(Vector.toSet(rows)))
    }

    /// The anchor-free projected witnesses of one world shard.
    pub def witnesses(world: WorldFacts, candidates: List[Candidate]): List[Witness] = {
        let rows = query lower(world, candidates, Nil), rules()
            select (c, w, x, y) from Output(c, w, x, y);
        List.map(row -> match row {
            case (c, w, x, y) => { candidate = c, world = w, x = x, y = y }
        }, Set.toList(Vector.toSet(rows)))
    }

    /// The anchored task rows of one world shard: the same materialized structural
    /// rows, joined to one application's anchors.
    pub def tasks(world: WorldFacts, candidates: List[Candidate], anchors: List[(World, Entity)]): List[Witness] = {
        let rows = query lower(world, candidates, anchors), rules()
            select (c, w, x, y) from Task(c, w, x, y);
        List.map(row -> match row {
            case (c, w, x, y) => { candidate = c, world = w, x = x, y = y }
        }, Set.toList(Vector.toSet(rows)))
    }

    /// One witness as a stable text line, for evidence and independent assertions.
    pub def witnessText(witness: Witness): String =
        witness#candidate + " " + worldText(witness#world) + " "
            + entityText(witness#x) + " -> " + entityText(witness#y)

    def worldText(world: World): String = match world {
        case World.World(name) => name
    }
}
