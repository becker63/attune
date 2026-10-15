// Property-signature fuzzing prototype. A program's signature is kept as five separate
// coverage kinds; they are never folded into one score, because each answers a
// different question about what a candidate rule can distinguish:
//   answers   behaviour: the (anchor,candidate) answer set on every fuzz world
//   relations syntax: which relation kinds and directions occur
//   roles     syntax: which entity roles (helper file, symbol variables) are bound
//   guards    syntax: which inequality guards constrain the join
//   triggers  behaviour: which world shapes (self-loop, cycle, shared owner, empty
//             relation) occur in some world where the program answers
// Proven-core identity must imply equal answers; answers may merge distinct cores,
// which is the measured redundancy the fuzzer exposes before any native execution.

type alias Signature = (List[Set[(String,String)]], Set[String], Set[String], Set[String], Set[String])

def facts(): List[(String,String,String)] = List#{("imports","a","b"),("imports","b","c"),("imports","c","a"),("imports","a","a"),("imports","b","a"),
    ("defines","a","s"),("defines","b","t"),("defines","c","t"),("defines","c","u"),("calls","s","t"),("calls","t","u"),("calls","s","u"),
    ("calls","u","u"),("defines","a","u")}

/// Deterministic fuzz worlds: multiplicative-hash bitmasks over the 14 candidate facts.
def worlds(n: Int32): List[List[(String,String,String)]] =
    List.range(0,n) |> List.map(i -> {
        let m=Int32.bitwiseAnd(Int32.bitwiseXor(i*40503,Int32.rightShift(i*40503,7)),16383);
        List.filter(j -> Int32.bitwiseAnd(Int32.leftShift(1,j),m) != 0,List.range(0,14)) |> List.map(j -> List.get(j,facts()))
    })

def shapes(world: List[(String,String,String)]): Set[String] = {
    let s=List.toSet(world);
    let owners=List.filterMap(match(k,f,x) -> if(k == "defines")Some((x,f))else None,world);
    Set#{} |> (acc -> if(List.exists(match(k,a,b) -> k != "defines" and a == b,world))Set.insert("self-loop",acc)else acc)
        |> (acc -> if(Set.memberOf(("imports","a","b"),s) and Set.memberOf(("imports","b","a"),s) or Set.memberOf(("imports","a","b"),s) and Set.memberOf(("imports","b","c"),s) and Set.memberOf(("imports","c","a"),s))Set.insert("import-cycle",acc)else acc)
        |> (acc -> if(List.exists(match(x,f) -> List.exists(match(y,g) -> x == y and f != g,owners),owners))Set.insert("shared-owner",acc)else acc)
        |> (acc -> List.foldLeft((a,k) -> if(List.exists(match(r,_,_) -> r == k,world))a else Set.insert("no-"+k,a),acc,List#{"imports","defines","calls"}))
}

def syntax(p: Language.Program): (Set[String], Set[String], Set[String]) = {
    def role(v)=if(v == 0)"anchor" else if(v == 1)"candidate" else if(v == 2)"helper" else "symbol";
    let relations=List.filter(match(k,_,_) -> k != 3,p) |> List.map(match(k,a,b) -> "${k}:${role(a)}>${role(b)}") |> List.toSet;
    let roles=List.flatMap(match(_,a,b) -> List#{a,b},p) |> List.filter(v -> v >= 2) |> List.map(v -> if(v == 2)"helper" else "symbol${v-3}") |> List.toSet;
    let guards=List.filter(match(k,_,_) -> k == 3,p) |> List.map(match(_,a,b) -> "${role(a)}!=${role(b)}") |> List.toSet;
    (relations,roles,guards)
}

def signatures(programs: List[Language.Program], n: Int32): List[(Language.Program,Signature)] = {
    let prepared=List.filterMap(world -> {
        let graph: Campaign.Admitted=("fuzz",world,Nil,Nil,Nil,"Completed",Nil);
        match Kernel.prepare("fuzz",graph,List#{List#{("a",None),("b",None),("c",None)}}) {
            case Ok(ready) => Some((ready,shapes(world)))
            case Err(_) => None
        }
    },worlds(n));
    List.map(p -> {
        let answers=List.map(match(ready,_) -> Kernel.pairs(ready,List#{("p",p)},List#{"a"}) |> List.map(match(_,x,y) -> (x,y)) |> List.toSet,prepared);
        let triggers=List.zip(answers,prepared) |> List.foldLeft((acc,row) -> {let(a,(_,s))=row;if(Set.isEmpty(a))acc else Set.union(acc,s)},Set#{});
        let(relations,roles,guards)=syntax(p);
        (p,(answers,relations,roles,guards,triggers))
    },programs)
}

/// Behaviour classes by native Datalog: Same(p,q) when every fuzz answer agrees.
def classes(rows: List[(String,String)]): Int32 = {
    let sig: #{Sig(String,String), Same(String,String), Smaller(String)} = inject rows into Sig/2;
    let rules=#{
        Same(p,q) :- Sig(p,s), Sig(q,s).
        Smaller(p) :- Same(p,q), if (q < p).
    };
    let all=query sig,rules select p from Sig(p,_);
    let merged=query sig,rules select p from Smaller(p);
    Set.size(Vector.toSet(all))-Set.size(Vector.toSet(merged))
}

def answerKey(s: Signature): String = {let(a,_,_,_,_)=s;ToString.toString(List.map(x -> Set.toList(x),a))}

@Test
def fuzzSignaturesRespectProvenCoresAndKeepKindsSeparate(): Unit \ {Assert, IO} = {
    let programs=Language.layer(1) ::: Language.layer(2) ::: List.map(snd,Language.controls()) |> List.filter(Language.valid);
    let rows=signatures(programs,48);
    // Soundness: equal proven core => equal answer signature.
    let byCore=List.map(match(p,s) -> (Language.coreKey(p),answerKey(s)),rows) |> List.toSet;
    let cores=List.map(match(p,_) -> Language.coreKey(p),rows) |> List.toSet;
    Assert.assertEq(expected=Set.size(cores),Set.size(Set.map(fst,byCore)));
    Assert.assertEq(expected=Set.size(byCore),Set.size(cores));
    // Answer classes never exceed cores; the gap is fuzz-indistinguishable redundancy.
    let behaviour=classes(List.map(match(p,s) -> (Language.coreKey(p),answerKey(s)),rows));
    Assert.assertEq(expected=true,behaviour <= Set.size(cores) and behaviour >= 1);
    // The kinds are independent: syntax-identical relation sets can differ in answers.
    let kinds=List.map(match(_,(a,r,o,g,t)) -> (Set.size(r),Set.size(o),Set.size(g),Set.size(t),List.length(a)),rows);
    Assert.assertEq(expected=true,List.forAll(match(_,_,_,_,n) -> n > 0,kinds));
    println("property-signature: programs=${List.length(rows)} cores=${Set.size(cores)} answer-classes=${behaviour} " +
        "relation-sets=${List.map(match(_,(_,r,_,_,_)) -> ToString.toString(Set.toList(r)),rows) |> List.toSet |> Set.size} " +
        "role-sets=${List.map(match(_,(_,_,o,_,_)) -> ToString.toString(Set.toList(o)),rows) |> List.toSet |> Set.size} " +
        "guard-sets=${List.map(match(_,(_,_,_,g,_)) -> ToString.toString(Set.toList(g)),rows) |> List.toSet |> Set.size} " +
        "trigger-sets=${List.map(match(_,(_,_,_,_,t)) -> ToString.toString(Set.toList(t)),rows) |> List.toSet |> Set.size}")
}
