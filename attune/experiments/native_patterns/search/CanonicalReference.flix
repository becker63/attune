// Test-only exact pre-cleanup construction snapshot; owns no production matching.
/// Ordinary bounded construction values. Fragments owns every production join.
pub mod CanonicalReference {
    pub type alias Atom = (Int32, Int32, Int32)
    pub type alias Program = List[Atom]
    pub type alias Action = (String, String, Program)
    pub def key(p: Program): String = List.map(match (k,a,b) -> "${k}${a}${b}",p) |> List.join(";")
    pub def sorted(p: Program): Program = List.distinct(p) |> List.sort
    pub def canonical(p: Program): Program = {
        let permutations = List.flatMap(a -> List.flatMap(b -> List.flatMap(c -> List.filterMap(d -> if(List.length(List.distinct(List#{a,b,c,d})) == 4)Some(List#{a,b,c,d})else None,List.range(3,7)),List.range(3,7)),List.range(3,7)),List.range(3,7));
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
    pub def valid(p: Program): Bool = {
        let vars=List.flatMap(match(_,a,b) -> List#{a,b},p) |> List.toSet;
        let typed=List.forAll(match(k,a,b) -> match k {
            case 0 => a >= 0 and a < 3 and b >= 0 and b < 3
            case 1 => a >= 0 and a < 3 and b >= 3 and b < 7
            case 2 => a >= 3 and a < 7 and b >= 3 and b < 7
            case 3 => a >= 0 and b >= 0 and a < 7 and b < 7 and (a < 3) == (b < 3)
            case _ => false
        },p);
        let primitive=List.filter(match(k,_,_) -> k != 3,p);
        def close(reached: Set[Int32], left: Int32): Set[Int32] = if(left == 0)reached else {
            let next=List.foldLeft((s,atom) -> {let(_,a,b)=atom;if(Set.memberOf(a,s) or Set.memberOf(b,s))Set.insert(a,Set.insert(b,s))else s},reached,primitive);
            close(next,left-1)
        };
        let reached=close(Set.singleton(0),8);
        List.isEmpty(p) or (typed and atoms(p) <= 8 and atoms(p) > 0 and Set.size(vars) <= 6 and Set.memberOf(0,vars) and Set.memberOf(1,vars) and List.length(p)-atoms(p) <= 2 and List.forAll(v -> Set.memberOf(v,reached),Set.toList(vars)))
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
        let values=List.filterMap(match(kind,q) -> {let c=canonical(q);let id=key(c);if(valid(c) and id != key(p))Some((kind+":"+id,"${kind}; resulting conjunction: ${render(c)}",c))else None},all) |> List.toSet |> Set.toList |> List.sortWith((a,b) -> Order.compare(fst3(a),fst3(b)));
        let kinds=List#{"add","remove","reverse","identify","separate","intermediate","second-target"};
        let balanced=List.flatMap(i -> List.filterMap(kind -> List.head(List.drop(i,List.filter(match(id,_,_) -> String.startsWith(prefix=kind+":",id),values))),kinds),List.range(0,List.length(values)));
        ("STOP","Stop construction and evaluate this complete rule",p)::balanced
    }
    pub def mutations(p: Program): List[Action] = List.take(32,mutationInventory(p))
    pub def importOnly(p: Program): Bool = List.forAll(match(k,_,_) -> k == 0 or k == 3,p)
    def remove(a: Atom, p: Program): Program = List.filter(v -> v != a,p)
    def fst3(t: Action): String = let(a,_,_)=t;a
}
