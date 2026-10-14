/// One bounded search state per method/seed. Only revealed feedback enters known.
pub mod Search {
    use Attune.Decisions
    pub type alias Trace = List[(String,String)]
    pub type alias Pending = (String,Language.Program,Trace)
    pub type alias Cursor = (Language.Program,Int32,Trace)
    pub type alias Node = (Language.Program,Int32,List[Language.Action],Map[String,Float64],Map[String,(Int32,Float64)],Int32)
    pub type alias State = (String,Int64,Int32,Map[String,Float64],Map[String,Node],List[Pending],Option[Cursor],List[String],Int32)
    pub type alias Event = (String,String,List[Language.Action],Language.Program,Int32)

    pub def initial(method: String, seed: Int64, common: List[(String,Float64)]): State = {
        let actions=List.map(match(name,p) -> (name,Language.render(p),p),Language.controls());
        let root: Node=(Nil,7,actions,Decisions.uniform(List.map(match(id,_,_) -> id,actions)),Map.empty(),0);
        (method,seed,0,List.toMap(common),Map.singleton("ROOT",root),Nil,None,Nil,0)
    }
    pub def nodeKey(p: Language.Program, remaining: Int32): String = "${remaining}|${Language.key(p)}"
    def draw(rng: Int64, count: Int32): (Int32,Int64) = {
        let next=Int64.remainder(rng*48271i64,2147483647i64);
        (Int64.truncateToInt32(Int64.remainder(next,Int32.toInt64(count))),next)
    }
    def selectAction(node: Node): Language.Action = {
        let(_,_,actions,priors,statistics,n)=node;
        def score(action)={
            let(id,_,_)=action;
            let(visits,total)=Map.getWithDefault(id,(0,0.0f64),statistics);
            (if(visits == 0)0.0f64 else total/Int32.toFloat64(visits))+1.5f64*Map.getWithDefault(id,0.0f64,priors)*Float64.pow(base=Int32.toFloat64(1+n),0.5f64)/Int32.toFloat64(1+visits)
        };
        List.foldLeft((best,a) -> if(score(a) > score(best))a else best,List.get(0,actions),List.drop(1,actions))
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
    def rollout(p: Language.Program, left: Int32, rng: Int64, trace: Trace): (Language.Program,Int64,Trace) =
        if(left <= 0)(p,rng,trace)else {
            let actions=Language.mutations(p);
            let(index,next)=draw(rng,List.length(actions));
            let(id,_,q)=List.get(index,actions);
            let path=("rollout:"+nodeKey(p,left),id)::trace;
            if(id == "STOP")(p,next,path)else rollout(q,left-1,next,path)
        }

    /// Replay a batch's feedback only into this trial's pending paths.
    pub def feedback(state: State, revealed: List[(String,Float64)]): State =
        List.foldLeft((s,entry) -> {
            let(method,rng,sim,known,tree,pending,cursor,order,requests)=s;
            let(id,reward)=entry;
            let matching=List.filter(match(key,_,_) -> key == id,pending);
            if(List.isEmpty(matching))s else {
                let updated=List.foldLeft((t,v) -> {let(_,_,trace)=v;visit(t,trace,(reward+3.0f64)/4.0f64,false)},tree,matching);
                (method,rng,sim,Map.insert(id,reward,known),updated,List.filter(match(key,_,_) -> key != id,pending),cursor,if(Map.memberOf(id,known))order else order ::: List#{id},requests)
            }
        },state,revealed)

    /// Stop at an explicit external boundary: prior acquisition or native evaluation.
    pub def advance(state: State, priors: List[(String,String)]): (State,Event) = {
        let(method,rng,sim,known,tree,pending,cursor,order,requests)=state;
        let uniquePending=List.map(match(id,_,_) -> id,pending) |> List.distinct;
        if(List.length(order) >= 128 or sim >= 4096) (state,(if(List.isEmpty(pending))"Done"else "Evaluate","",Nil,Nil,0))
        else if(List.length(uniquePending) >= 8 or List.length(order)+List.length(uniquePending) >= 128)(state,("Evaluate","",Nil,Nil,0))
        else if(method == "random") {
            let controls=Language.controls();
            let(index,r1)=draw(rng,List.length(controls));
            let(length,r2)=draw(r1,6);
            let(_,start)=List.get(index,controls);
            let(p,next,trace)=rollout(start,length+1,r2,Nil);
            terminal((method,next,sim+1,known,tree,pending,None,order,requests),p,trace,priors)
        } else {
            match cursor {
                case None => {
                    let root=Map.getWithDefault("ROOT",(Nil,0,Nil,Map.empty(),Map.empty(),0),tree);
                    let(id,_,p)=selectAction(root);
                    advance((method,rng,sim+1,known,tree,pending,Some((p,6,List#{("ROOT",id)})),order,requests),priors)
                }
                case Some((p,left,trace)) => if(left <= 0)terminal((method,rng,sim,known,tree,pending,None,order,requests),p,trace,priors)else {
                    let key=nodeKey(p,left);
                    let actions=match Map.get(key,tree) {
                        case Some((_,_,savedActions,_,_,_)) => savedActions
                        case None => Language.mutations(p)
                    };
                    let isNew=not Map.memberOf(key,tree);
                    let saved=List.find(match(id,_) -> id == key,priors);
                    if(isNew and method == "jev-puct" and requests < 256 and Option.isEmpty(saved))
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
                        let(id,_,q)=selectAction(node);
                        let path=(key,id)::trace;
                        let count=requests+(if(isNew and method == "jev-puct" and requests < 256)1 else 0);
                        let before=(method,rng,sim,known,updated,pending,None,order,count);
                        if(id == "STOP")terminal(before,p,path,priors)
                        else if(isNew) {
                            let(final,next,full)=rollout(q,left-1,rng,path);
                            terminal((method,next,sim,known,updated,pending,None,order,count),final,full,priors)
                        } else advance((method,rng,sim,known,updated,pending,Some((q,left-1,path)),order,count),priors)
                    }
                }
            }
        }
    }
    def terminal(state: State, p: Language.Program, trace: Trace, priors: List[(String,String)]): (State,Event) = {
        let(method,rng,sim,known,tree,pending,_,order,requests)=state;
        let id=Language.key(p);
        match Map.get(id,known) {
            case Some(reward) => advance((method,rng,sim,known,visit(tree,trace,(reward+3.0f64)/4.0f64,true),pending,None,order,requests),priors)
            case None => advance((method,rng,sim,known,visit(tree,trace,0.0f64,true),pending ::: List#{(id,p,trace)},None,order,requests),priors)
        }
    }
}
