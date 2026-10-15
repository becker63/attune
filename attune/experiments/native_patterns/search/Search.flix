/// One bounded search state per method/seed. Only revealed feedback enters known.
pub mod Search {
    use Attune.Decisions
    pub type alias Trace = List[(String,String)]
    pub type alias Pending = (String,Language.Program,Trace)
    pub type alias Cursor = (Language.Program,Int32,Trace)
    pub type alias Node = (Language.Program,Int32,List[Language.Action],Map[String,Float64],Map[String,(Int32,Float64)],Int32)
    pub type alias State = (String,Int64,Int32,Map[String,Float64],Map[String,Node],List[Pending],Option[Cursor],List[String],Int32)
    pub type alias Config = (Int32,Int32,Bool,Int64,Int32)
    pub type alias Event = (String,String,List[Language.Action],Language.Program,Int32)

    pub def initial(method: String, seed: Int64, common: List[(String,Float64)]): State = {
        initialWith(method,seed,common,Language.controls())
    }
    pub def initialWith(method: String, seed: Int64, common: List[(String,Float64)], starts: List[(String,Language.Program)]): State = {
        let actions=List.map(match(name,p) -> (name,Language.render(p),p),starts);
        let root: Node=(Nil,7,actions,Decisions.uniform(List.map(match(id,_,_) -> id,actions)),Map.empty(),0);
        (method,seed,0,List.toMap(common),Map.singleton("ROOT",root),Nil,None,Nil,0)
    }
    pub def nodeKey(p: Language.Program, remaining: Int32): String = "${remaining}|${Language.key(p)}"
    def draw(rng: Int64, count: Int32): (Int32,Int64) = {
        let next=Int64.remainder(rng*48271i64,2147483647i64);
        (Int64.truncateToInt32(Int64.remainder(next,Int32.toInt64(count))),next)
    }
    pub def selectAction(node: Node, rng: Int64): (Language.Action,Int64) = {
        let(_,_,actions,priors,statistics,n)=node;
        def score(action)={
            let(id,_,_)=action;
            let(visits,total)=Map.getWithDefault(id,(0,0.0f64),statistics);
            (if(visits == 0)0.0f64 else total/Int32.toFloat64(visits))+1.5f64*Map.getWithDefault(id,0.0f64,priors)*Float64.pow(base=Int32.toFloat64(1+n),0.5f64)/Int32.toFloat64(1+visits)
        };
        let best=List.foldLeft((best,a) -> if(score(a) > score(best))a else best,List.get(0,actions),List.drop(1,actions));
        let ties=List.filter(a -> score(a) == score(best),actions);
        let(index,next)=draw(rng,List.length(ties));
        (List.get(index,ties),next)
    }
    /// Temporarily reserve terminal choices already awaiting one exact outcome.
    pub def available(node: Node, pending: List[Pending]): Node = {
        let(p,depth,actions,priors,statistics,n)=node;
        let choices=List.filter(match(id,_,q) -> not ((id == "STOP" or depth <= 1) and List.exists(match(key,_,_) -> key == Language.key(q),pending)),actions);
        (p,depth,if(List.isEmpty(choices))actions else choices,priors,statistics,n)
    }
    def visit(tree: Map[String,Node], trace: Trace, reward: Float64, increment: Bool): Map[String,Node] =
        List.foldLeft((acc,entry) -> {
            let(key,action)=entry;
            match Map.get(key,acc) {
                case None => acc // Rollout steps are retained, not treated as expanded nodes.
                case Some((p,depth,actions,priors,statistics,n)) => {
                    let(count,total)=Map.getWithDefault(action,(0,0.0f64),statistics);
                    let add=if(increment)1 else 0;
                    Map.insert(key,(p,depth,actions,priors,Map.insert(action,(count+add,total+reward),statistics),n+add),acc)
                }
            }
        },tree,trace)
    pub def menu(p: Language.Program, config: Config): List[Language.Action] = {
        let(_,_,imports,seed,_)=config;
        let salt=List.foldLeft((n,a) -> {let(k,x,y)=a;Int64.remainder(n*31i64+Int32.toInt64(100*k+10*x+y+1),2147483647i64)},seed,p);
        let values=List.filter(match(id,_,q) -> id != "STOP" and (not imports or Language.importOnly(q)),Language.mutationInventory(p));
        def shuffle(left, rng, remaining) = if(remaining <= 0 or List.isEmpty(left))Nil else {
            let(i,next)=draw(rng,List.length(left));let chosen=List.get(i,left);
            chosen::shuffle(List.filter(a -> a != chosen,left),next,remaining-1)
        };
        ("STOP","Stop construction and evaluate this complete rule",p)::shuffle(values,Int64.max(1i64,salt),31)
    }
    def rollout(p: Language.Program, left: Int32, rng: Int64, trace: Trace, config: Config): (Language.Program,Int64,Trace) =
        if(left <= 0)(p,rng,trace)else {
            let actions=menu(p,config);
            let(index,next)=draw(rng,List.length(actions));
            let(id,_,q)=List.get(index,actions);
            let path=("rollout:"+nodeKey(p,left),id)::trace;
            if(id == "STOP")(p,next,path)else rollout(q,left-1,next,path,config)
        }

    /// Replay a batch's feedback only into this trial's pending paths.
    pub def feedback(state: State, revealed: List[(String,Float64)]): State =
        List.foldLeft((s,entry) -> {
            let(method,rng,sim,known,tree,pending,cursor,order,requests)=s;
            let(id,reward)=entry;
            let matching=List.filter(match(key,_,_) -> key == id,pending);
            if(List.isEmpty(matching))s else {
                let updated=List.foldLeft((t,v) -> {let(_,_,trace)=v;visit(t,trace,(reward+4.0f64)/5.0f64,false)},tree,matching);
                (method,rng,sim,Map.insert(id,reward,known),updated,List.filter(match(key,_,_) -> key != id,pending),cursor,if(Map.memberOf(id,known))order else order ::: List#{id},requests)
            }
        },state,revealed)

    /// Stop at an explicit external boundary: prior acquisition or native evaluation.
    pub def advance(state: State, priors: List[(String,String)]): (State,Event) = advanceBound(state,priors,(128,4096,false,101i64,256))
    pub def advanceBound(state: State, priors: List[(String,String)], config: Config): (State,Event) = {
        let(limit,simulationLimit,imports,_,requestLimit)=config;
        let(method,rng,sim,known,tree,pending,cursor,order,requests)=state;
        let uniquePending=List.map(match(id,_,_) -> id,pending) |> List.distinct;
        if(List.length(order) >= limit or sim >= simulationLimit) (state,(if(List.isEmpty(pending))"Done"else "Evaluate","",Nil,Nil,0))
        else if(guidanceDue(state,requestLimit))consumeGuidance(state,priors,config)
        else if(List.length(uniquePending) >= 8 or List.length(order)+List.length(uniquePending) >= limit or atBoundary(state,List.length(uniquePending),requestLimit))(state,("Evaluate","",Nil,Nil,0))
        else if(method == "random") {
            let(_,_,starts,_,_,_)=Map.getWithDefault("ROOT",(Nil,0,Nil,Map.empty(),Map.empty(),0),tree);
            let controls=List.filterMap(match(id,_,p) -> if(not imports or Language.importOnly(p))Some((id,p))else None,starts);
            let(index,r1)=draw(rng,List.length(controls));
            let(length,r2)=draw(r1,6);
            let(_,start)=List.get(index,controls);
            let(p,next,trace)=rollout(start,length+1,r2,Nil,config);
            terminal((method,next,sim+1,known,tree,pending,None,order,requests),p,trace,priors,config)
        } else {
            match cursor {
                case None => {
                    let root=Map.getWithDefault("ROOT",(Nil,0,Nil,Map.empty(),Map.empty(),0),tree);
                    let((id,_,p),nextRng)=selectAction(available(root,pending),rng);
                    advanceBound((method,nextRng,sim+1,known,tree,pending,Some((p,6,List#{("ROOT",id)})),order,requests),priors,config)
                }
                case Some((p,left,trace)) => if(left <= 0)terminal((method,rng,sim,known,tree,pending,None,order,requests),p,trace,priors,config)else {
                    let key=nodeKey(p,left);
                    let actions=match Map.get(key,tree) {
                        case Some((_,_,savedActions,_,_,_)) => savedActions
                        case None => menu(p,config)
                    };
                    let isNew=not Map.memberOf(key,tree);
                    let saved=List.find(match(id,_) -> id == key,priors);
                    if(isNew and method == "jev-puct" and requests < requestLimit and Option.isEmpty(saved))
                        (state,("Prior",key,actions,p,left))
                    else {
                        let probabilities=match saved {
                            case Some((_,body)) => match Decisions.decode(body,List.map(match(id,_,_) -> id,actions)) {
                                case Ok((_,values,_)) => Decisions.smoothed(List.map(match(id,_,_) -> id,actions),values)
                                case Err(_) => Decisions.uniform(List.map(match(id,_,_) -> id,actions))
                            }
                            case None => Decisions.uniform(List.map(match(id,_,_) -> id,actions))
                        };
                        let node=Map.getWithDefault(key,(p,left,actions,probabilities,Map.empty(),0),tree);
                        let updated=Map.insert(key,node,tree);
                        let((id,_,q),nextRng)=selectAction(guide(method,tree,available(node,pending)),rng);
                        let path=(key,id)::trace;
                        let count=requests+(if(isNew and method == "jev-puct" and requests < requestLimit)1 else 0);
                        let before=(method,nextRng,sim,known,updated,pending,None,order,count);
                        if(id == "STOP")terminal(before,p,path,priors,config)
                        else if(isNew) {
                            let(final,next,full)=rollout(q,left-1,nextRng,path,config);
                            terminal((method,next,sim,known,updated,pending,None,order,count),final,full,priors,config)
                        } else advanceBound((method,nextRng,sim,known,updated,pending,Some((q,left-1,path)),order,count),priors,config)
                    }
                }
            }
        }
    }
    // ---- Family guidance (cadence-v1) ----
    //
    // Method "jev-family-N" acquires one distribution over mutation families at zero
    // completed programs and again after every N. Epoch e is consumed when exactly
    // N*e programs carry a valid reward, and the branch never proposes past the next
    // boundary, so N is exact rather than rounded to the eight-program batch. The
    // distribution lives in the pseudo-node "FAMILY" (requests = epochs consumed)
    // and is overlaid on every non-root node at selection time; stored node priors
    // stay uniform, so replay and the uniform control are unchanged.
    pub def families(): List[String] = List#{"STOP","add","remove","reverse","identify","separate","intermediate","second-target"}
    /// "jev-family-0" (J0) consumes only the initial distribution and never refreshes.
    pub def cadence(method: String): Option[Int32] =
        if(method == "jev-family-0")Some(Int32.maxValue())
        else if(String.startsWith(prefix="jev-family-",method))Int32.fromString(String.drop(11,method)) else None
    pub def family(id: String): String = List.find(f -> id == f or String.startsWith(prefix=f+":",id),families()) |> Option.getWithDefault("")
    /// Carrier -4 is the failed-panel envelope (R3 = -2); it never counts as completed.
    pub def completed(known: Map[String,Float64], order: List[String]): Int32 =
        List.count(id -> Map.getWithDefault(id,-4.0f64,known) > -3.999f64,order)
    /// Family mass is renormalized over families present in the menu and split evenly
    /// among that family's legal actions; Decisions.smoothed then mixes in 20% uniform.
    /// No usable mass (failed, stale, or absent guidance) means the uniform prior.
    pub def familyPriors(actions: List[String], guidance: Map[String,Float64]): Map[String,Float64] = {
        let present=List.filter(f -> List.exists(a -> family(a) == f,actions),families());
        let mass=List.foldLeft((s,f) -> s+Map.getWithDefault(f,0.0f64,guidance),0.0f64,present);
        if(List.isEmpty(actions) or not (mass > 0.0f64))Decisions.uniform(actions) else {
            let raw=List.map(a -> {let f=family(a);let n=List.count(b -> family(b) == f,actions);(a,Map.getWithDefault(f,0.0f64,guidance)/mass/Int32.toFloat64(n))},actions) |> List.toMap;
            Decisions.smoothed(actions,raw)
        }
    }
    pub def familyActions(): List[Language.Action] = List.map(f -> (f,if(f == "STOP")"Stop construction early and evaluate the current rule" else "Mutation family: ${f}",Nil),families())
    /// (epochs consumed, completed programs when the current distribution was consumed, usable)
    pub def guidance(state: State): (Int32,Int32,Bool) = {
        let(_,_,_,_,tree,_,_,_,requests)=state;
        match Map.get("FAMILY",tree) {
            case Some((_,_,_,values,_,at)) => (requests,at,not Map.isEmpty(values))
            case None => (requests,0,false)
        }
    }
    def guidanceDue(state: State, requestLimit: Int32): Bool = {
        let(method,_,_,known,_,pending,cursor,order,requests)=state;
        match cadence(method) {
            case Some(n) => n > 0 and Option.isEmpty(cursor) and List.isEmpty(pending) and requests < requestLimit and completed(known,order) >= n*requests
            case None => false
        }
    }
    def atBoundary(state: State, unique: Int32, requestLimit: Int32): Bool = {
        let(method,_,_,known,_,_,_,order,requests)=state;
        match cadence(method) {
            case Some(n) => requests > 0 and requests < requestLimit and completed(known,order)+unique >= n*requests
            case None => false
        }
    }
    def consumeGuidance(state: State, priors: List[(String,String)], config: Config): (State,Event) = {
        let(method,rng,sim,known,tree,pending,cursor,order,requests)=state;
        let id="FAMILY:${requests}";
        match List.find(match(k,_) -> k == id,priors) {
            case None => (state,("Prior",id,familyActions(),Nil,0))
            case Some((_,body)) => {
                let values=match Decisions.decode(body,families()) {
                    case Ok((_,probabilities,_)) => probabilities
                    case Err(_) => Map.empty()
                };
                let record: Node=(Nil,requests+1,Nil,values,Map.empty(),completed(known,order));
                advanceBound((method,rng,sim,known,Map.insert("FAMILY",record,tree),pending,cursor,order,requests+1),priors,config)
            }
        }
    }
    def guide(method: String, tree: Map[String,Node], node: Node): Node = match (cadence(method),Map.get("FAMILY",tree)) {
        case (Some(_),Some((_,_,_,values,_,_))) => {
            let(p,depth,actions,_,statistics,n)=node;
            (p,depth,actions,familyPriors(List.map(match(id,_,_) -> id,actions),values),statistics,n)
        }
        case _ => node
    }
    def terminal(state: State, p: Language.Program, trace: Trace, priors: List[(String,String)], config: Config): (State,Event) = {
        let(method,rng,sim,known,tree,pending,_,order,requests)=state;
        let id=Language.key(p);
        match Map.get(id,known) {
            case Some(reward) => advanceBound((method,rng,sim,known,visit(tree,trace,(reward+4.0f64)/5.0f64,true),pending,None,order,requests),priors,config)
            case None => if(List.exists(match(key,_,_) -> key == id,pending))
                advanceBound((method,rng,sim,known,visit(tree,trace,0.0f64,true),pending ::: List#{(id,p,trace)},None,order,requests),priors,config)
            else advanceBound((method,rng,sim,known,visit(tree,trace,0.0f64,true),pending ::: List#{(id,p,trace)},None,order,requests),priors,config)
        }
    }
}
