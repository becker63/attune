/// Ordinary bounded construction values. Fragments owns every production join.
pub mod Language {
    pub type alias Atom = (Int32, Int32, Int32)
    pub type alias Program = List[Atom]
    pub type alias Action = (String, String, Program)
    pub def key(p: Program): String = List.map(match (k,a,b) -> "${k}${a}${b}",p) |> List.join(";")
    pub def sorted(p: Program): Program = List.distinct(p) |> List.sort
    // Fixed typed carrier; assemble these once per mutation inventory.
    def symbolPermutations(): List[List[Int32]] = List#{
        List#{3,4,5,6},
        List#{3,4,6,5},
        List#{3,5,4,6},
        List#{3,5,6,4},
        List#{3,6,4,5},
        List#{3,6,5,4},
        List#{4,3,5,6},
        List#{4,3,6,5},
        List#{4,5,3,6},
        List#{4,5,6,3},
        List#{4,6,3,5},
        List#{4,6,5,3},
        List#{5,3,4,6},
        List#{5,3,6,4},
        List#{5,4,3,6},
        List#{5,4,6,3},
        List#{5,6,3,4},
        List#{5,6,4,3},
        List#{6,3,4,5},
        List#{6,3,5,4},
        List#{6,4,3,5},
        List#{6,4,5,3},
        List#{6,5,3,4},
        List#{6,5,4,3}
    }
    pub def canonical(p: Program): Program = canonicalWith(p,symbolPermutations())
    def canonicalWith(p: Program, permutations: List[List[Int32]]): Program = {
        let variants = List.map(m -> sorted(List.map(match(k,a,b) -> {
            def rename(v)=if(v < 3)v else List.head(List.drop(v-3,m)) |> Option.getWithDefault(v);
            let x=rename(a);let y=rename(b);(k,if(k == 3)Int32.min(x,y)else x,if(k == 3)Int32.max(x,y)else y)
        },p)),permutations);
        List.foldLeft((best,q) -> if(key(q) < key(best))q else best,sorted(p),variants)
    }
    pub def atoms(p: Program): Int32 = List.length(List.filter(match(k,_,_) -> k != 3,p))
    pub def render(p: Program): String = {
        def entity(v)=if(v == 0)"anchor" else if(v == 1)"candidate" else if(v == 2)"helper" else "symbol${v-3}";
        List.map(match(k,a,b) -> match k {
            case 0 => "Imports(${entity(a)}, ${entity(b)})"
            case 1 => "Defines(${entity(a)}, ${entity(b)})"
            case 2 => "Calls(${entity(a)}, ${entity(b)})"
            case _ => "${entity(a)} != ${entity(b)}"
        },p) |> List.join(" AND ")
    }
    def typed(p: Program): Bool = {
        List.forAll(match(k,a,b) -> match k {
            case 0 => a >= 0 and a < 3 and b >= 0 and b < 3
            case 1 => a >= 0 and a < 3 and b >= 3 and b < 7
            case 2 => a >= 3 and a < 7 and b >= 3 and b < 7
            case 3 => a >= 0 and b >= 0 and a < 7 and b < 7 and (a < 3) == (b < 3)
            case _ => false
        },p)
    }
    pub def valid(p: Program): Bool = {
        let vars=List.flatMap(match(_,a,b) -> List#{a,b},p) |> List.toSet;
        let wellTyped=typed(p);
        let primitive=List.filter(match(k,_,_) -> k != 3,p);
        def close(reached: Set[Int32], left: Int32): Set[Int32] = if(left == 0)reached else {
            let next=List.foldLeft((s,atom) -> {let(_,a,b)=atom;if(Set.memberOf(a,s) or Set.memberOf(b,s))Set.insert(a,Set.insert(b,s))else s},reached,primitive);
            close(next,left-1)
        };
        let reached=close(Set.singleton(0),8);
        List.isEmpty(p) or (wellTyped and atoms(p) <= 8 and atoms(p) > 0 and Set.size(vars) <= 6 and Set.memberOf(0,vars) and Set.memberOf(1,vars) and List.length(p)-atoms(p) <= 2 and List.forAll(v -> Set.memberOf(v,reached),Set.toList(vars)))
    }
    pub def execution(p: Program): List[(Atom, Int32)] = {
        def loop(left: Program, bound: Set[Int32], acc: List[(Atom,Int32)]): List[(Atom,Int32)] = match left {
            case Nil => List.reverse(acc)
            case _ => match List.head(List.filter(match(_,a,b) -> Set.memberOf(a,bound) or Set.memberOf(b,bound),left) |> List.sortWith((x,y) -> {
                def priority(atom)={let(k,a,b)=atom; (-(if(Set.memberOf(a,bound))1 else 0)-(if(Set.memberOf(b,bound))1 else 0),if(k == 2)0 else if(k == 0)1 else 2,atom)};
                Order.compare(priority(x),priority(y))
            })) {
                case None => Nil
                case Some(atom) => {let(_,a,b)=atom;let mask=(if(Set.memberOf(a,bound))List.get(a,List#{1,2,4,8,16,32,64})else 0)+(if(b != a and Set.memberOf(b,bound))List.get(b,List#{1,2,4,8,16,32,64})else 0);loop(remove(atom,left),Set.insert(a,Set.insert(b,bound)),(atom,mask)::acc)}
            }
        };
        loop(List.filter(match(k,_,_) -> k != 3,p),Set.singleton(0),Nil) ::: List.map(a -> (a,0),List.filter(match(k,_,_) -> k == 3,p))
    }
    pub def controls(): List[(String,Program)] = List.map(match(n,p) -> (n,canonical(p)),List#{
        ("Import",List#{(0,0,1),(3,0,1)}),("Importer",List#{(0,1,0),(3,0,1)}),
        ("Call",List#{(1,0,3),(2,3,4),(1,1,4),(3,0,1)}),("Caller",List#{(1,1,3),(2,3,4),(1,0,4),(3,0,1)}),
        ("Agreement",List#{(0,0,1),(1,0,3),(2,3,4),(1,1,4),(3,0,1)}),
        ("ReverseAgreement",List#{(0,1,0),(1,1,3),(2,3,4),(1,0,4),(3,0,1)}),
        ("Chain",List#{(0,0,2),(0,2,1),(3,0,1)}),
        ("SameCaller",List#{(0,0,1),(1,0,3),(2,3,4),(2,3,5),(1,1,4),(1,1,5),(3,0,1),(3,4,5)}),
        ("SameFile",List#{(0,0,1),(1,0,3),(1,0,6),(2,3,4),(2,6,5),(1,1,4),(1,1,5),(3,0,1),(3,4,5)})})
    pub def mutationInventory(p: Program): List[Action] = {
        let vars=List.flatMap(match(_,a,b) -> List#{a,b},p) |> List.toSet;
        let vocabulary=List.flatMap(k -> List.flatMap(a -> List.map(b -> (k,a,b),List.range(0,7)),List.range(0,7)),List.range(0,4));
        let additions=List.map(a -> ("add",a::p),vocabulary);
        let removals=List.map(a -> ("remove",remove(a,p)),p);
        let reversals=List.filterMap(match(k,a,b) -> if(k == 0 or k == 2)Some(("reverse",(k,b,a)::remove((k,a,b),p)))else None,p);
        let ids=List.flatMap(a -> List.filterMap(b -> if(a != b and (a < 3) == (b < 3) and a != 0 and a != 1 and Set.memberOf(a,vars) and Set.memberOf(b,vars))Some(("identify",List.map(match(k,x,y) -> (k,if(x == a)b else x,if(y == a)b else y),p)))else None,List.range(0,7)),List.range(2,7));
        let separation=List.flatMap(atom -> {let(k,a,b)=atom;List.filterMap(v -> if(not Set.memberOf(v,vars) and (v < 3) == (b < 3))Some(("separate",(k,a,v)::remove(atom,p)))else None,List.range(2,7))},p);
        let intermediate=List.filterMap(match(k,a,b) -> if(k == 0 and not Set.memberOf(2,vars))Some(("intermediate",List#{(0,a,2),(0,2,b)} ::: remove((k,a,b),p)))else None,p);
        let second=List.flatMap(atom -> {let(k,a,b)=atom; if(k != 2)Nil else List.filterMap(v -> if(v >= 3 and not Set.memberOf(v,vars)){
            let owners=List.filterMap(match(op,f,s) -> if(op == 1 and s == b)Some((1,f,v))else None,p);
            Some(("second-target",(2,a,v)::(3,Int32.min(b,v),Int32.max(b,v))::(owners ::: p)))
        }else None,List.range(3,7))},p);
        let all=additions ::: removals ::: reversals ::: ids ::: separation ::: intermediate ::: second;
        let permutations=symbolPermutations();
        let values=List.filterMap(match(kind,q) -> if(not typed(q))None else {let c=canonicalWith(q,permutations);let id=key(c);if(valid(c) and id != key(p))Some((kind+":"+id,"${kind}; resulting conjunction: ${render(c)}",c))else None},all) |> List.toSet |> Set.toList |> List.sortWith((a,b) -> Order.compare(fst3(a),fst3(b)));
        let kinds=List#{"add","remove","reverse","identify","separate","intermediate","second-target"};
        let balanced=List.flatMap(i -> List.filterMap(kind -> List.head(List.drop(i,List.filter(match(id,_,_) -> String.startsWith(prefix=kind+":",id),values))),kinds),List.range(0,List.length(values)));
        ("STOP","Stop construction and evaluate this complete rule",p)::balanced
    }
    pub def mutations(p: Program): List[Action] = List.take(32,mutationInventory(p))
    pub def importOnly(p: Program): Bool = List.forAll(match(k,_,_) -> k == 0 or k == 3,p)

    // ---- Proven identity (language core-v1). Existing keys and valid() are unchanged. ----
    //
    // Atom kinds, named once for the code below (serialized keys keep the integers).
    def imports(): Int32 = 0
    def defines(): Int32 = 1
    def calls(): Int32 = 2
    def different(): Int32 = 3

    /// `x != x` can never hold: Fragments.different has no reflexive case, so the
    /// native query is empty. v1 mutation inventories still propose these guards.
    pub def satisfiable(p: Program): Bool = List.forAll(match(k,a,b) -> k != different() or a != b,p)

    /// Containment witness. If some typed map h fixes anchor and candidate and sends
    /// every atom and guard of `source` onto one of `target`, then every answer of
    /// `target` is an answer of `source`. Guards count as an ordinary relation, so a
    /// witness is sound but, under `!=`, not complete: no witness proves nothing.
    ///
    //   source: anchor ──Imports──▶ candidate,  anchor ──Imports──▶ helper
    //   target: anchor ──Imports──▶ candidate
    //   h(helper) = candidate folds the second atom onto the first.
    pub def maps(source: Program, target: Program): Bool = {
        def bind(h: Map[Int32,Int32], v: Int32, w: Int32): Option[Map[Int32,Int32]] = match Map.get(v,h) {
            case Some(x) => if(x == w)Some(h)else None
            case None => Some(Map.insert(v,w,h))
        };
        let guards=List.filter(match(k,_,_) -> k == different(),source);
        def guarded(h: Map[Int32,Int32]): Bool = List.forAll(match(_,a,b) -> match (Map.get(a,h),Map.get(b,h)) {
            case (Some(x),Some(y)) => List.memberOf((different(),Int32.min(x,y),Int32.max(x,y)),target)
            case _ => true
        },guards);
        def go(left: Program, h: Map[Int32,Int32]): Bool = match left {
            case Nil => guarded(h)
            case (k,a,b)::rest => List.exists(match(tk,x,y) -> tk == k and (match Option.flatMap(g -> bind(g,b,y),bind(h,a,x)) {
                case Some(g) => guarded(g) and go(rest,g)
                case None => false
            }),target)
        };
        go(List.filter(match(k,_,_) -> k != different(),source),Map#{0 => 0, 1 => 1})
    }

    /// Smallest equivalent conjunction, then canonical renaming. Drop one atom or guard
    /// whenever the whole program still maps into what remains; guards whose variables
    /// disappear go with it. Cores of the same query are isomorphic, so two programs
    /// with one core key are proven to return identical (anchor, candidate) answers.
    pub def core(p: Program): Program = {
        let q=sorted(p);
        def used(r: Program): Set[Int32] = List.flatMap(match(k,a,b) -> if(k == different())Nil else List#{a,b},r) |> List.toSet;
        def drop(a: Atom): Program = {
            let rest=remove(a,q);let u=used(rest);
            List.filter(match(k,x,y) -> k != different() or (Set.memberOf(x,u) and Set.memberOf(y,u)),rest)
        };
        let smaller=List.find(a -> {let r=drop(a);let u=used(r);Set.memberOf(0,u) and Set.memberOf(1,u) and maps(q,r)},q);
        match smaller {
            case Some(a) => core(drop(a))
            case None => canonical(q)
        }
    }
    pub def coreKey(p: Program): String = key(core(p))

    /// Static preflight for one runtime program (no world consulted). Three identities stay
    /// apart: key(p) is the search state, the Compute key is the semantic computation, and
    /// evaluation evidence is stored under the computation key by callers.
    ///
    //   candidate ─▶ typed / bounded / connected? ── no ──▶ Invalid(reason)   never evaluated
    //                 │ yes
    //                 ▼
    //              satisfiable? ── no ──▶ Unsatisfiable                     empty everywhere
    //                 │ yes
    //                 ▼
    //              Compute(coreKey)                         shared only by proven-equal programs
    pub enum Verdict with Eq, ToString {
        case Invalid(String),
        case Unsatisfiable,
        case Compute(String)
    }
    pub def preflight(p: Program): Verdict = {
        let vars=List.flatMap(match(_,a,b) -> List#{a,b},p) |> List.toSet;
        if(List.isEmpty(p))Verdict.Compute("")
        else if(not typed(p))Verdict.Invalid("ill-typed")
        else if(atoms(p) > 8 or Set.size(vars) > 6 or List.length(p)-atoms(p) > 2)Verdict.Invalid("outside-bounds")
        else if(not (Set.memberOf(0,vars) and Set.memberOf(1,vars)))Verdict.Invalid("missing-anchor-or-candidate")
        else if(not valid(p))Verdict.Invalid("disconnected")
        else if(not satisfiable(p))Verdict.Unsatisfiable
        else Verdict.Compute(coreKey(p))
    }

    /// Every satisfiable, valid program whose core has exactly n relation atoms, once
    /// per proven identity, in key order. Built from anchor-connected relation sets:
    ///
    //   layer 1 seeds:  anchor ──R──▶ x   or   x ──R──▶ anchor
    //   grow:           add one typed atom touching an existing variable
    //   finish:         require candidate, add 0..2 typed guards, keep proven cores
    pub def layer(n: Int32): List[Program] = {
        let vocabulary=List.flatMap(k -> List.flatMap(a -> List.map(b -> (k,a,b),List.range(0,7)),List.range(0,7)),List#{imports(),defines(),calls()}) |> List.filter(atom -> typed(atom::Nil));
        def vars(p: Program): Set[Int32] = List.flatMap(match(_,a,b) -> List#{a,b},p) |> List.toSet;
        def room(p: Program): Bool = {let v=vars(p);Set.size(v) <= (if(Set.memberOf(1,v))6 else 5)};
        def grow(level: List[Program]): List[Program] = List.flatMap(p -> {
            let v=vars(p);
            List.filterMap(atom -> {let(_,a,b)=atom;if(List.memberOf(atom,p) or not (Set.memberOf(a,v) or Set.memberOf(b,v)))None else {let q=canonical(atom::p);if(room(q))Some(q)else None}},vocabulary)
        },level) |> List.distinct;
        let seeds=List.filter(match(_,a,b) -> a == 0 or b == 0,vocabulary) |> List.map(atom -> canonical(atom::Nil)) |> List.filter(room) |> List.distinct;
        let relations=List.foldLeft((level,_) -> grow(level),seeds,List.range(1,n));
        let guarded=List.flatMap(p -> {
            let v=Set.toList(vars(p));
            let options=List.flatMap(a -> List.filterMap(b -> if(a < b and (a < 3) == (b < 3))Some((different(),a,b))else None,v),v);
            let pairs=List.flatMap(g -> List.filterMap(h -> if(g < h)Some(List#{g,h})else None,options),options);
            List.map(gs -> gs ::: p,Nil::List.map(g -> g::Nil,options) ::: pairs)
        },List.filter(p -> Set.memberOf(1,vars(p)),relations));
        List.filter(p -> valid(p) and satisfiable(p),guarded) |> List.map(core) |> List.filter(p -> atoms(p) == n) |> List.map(p -> (key(p),p)) |> List.toMap |> Map.toList |> List.map(snd)
    }
    def remove(a: Atom, p: Program): Program = List.filter(v -> v != a,p)
    def fst3(t: Action): String = let(a,_,_)=t;a
}
