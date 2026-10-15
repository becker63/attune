// Laws for family guidance at 10/32/100 cadence and the shared $10 campaign ledger.
def valid(): String = "{\"model\":\"typesafe/jev-1.13\",\"answers\":{\"prior\":{\"type\":\"choice\",\"probabilities\":{\"STOP\":0.3,\"add\":0.3,\"remove\":0.1,\"reverse\":0.1,\"identify\":0.05,\"separate\":0.05,\"intermediate\":0.05,\"second-target\":0.05},\"confidence\":0.5}}}"

/// Deterministic stand-in rewards; every seventh-length key is a failed panel (-4).
def reward(id: String): Float64 = if(Int32.remainder(String.length(id),7) == 0)-4.0f64 else -0.5f64-0.01f64*Int32.toFloat64(String.length(id))

def unique(pending: List[Search.Pending]): Int32 = List.map(match(id,_,_) -> id,pending) |> List.distinct |> List.length

/// Drives one branch to completion; logs (epoch, completed) at each Prior and whether a
/// proposal ever crossed the next refresh boundary.
def drive(limit: Int32, body: String, reversed: Bool, fuel: Int32, s: Search.State, priors: List[(String,String)], log: List[(Int32,Int32)], crossed: Bool): (List[(Int32,Int32)],Search.State,Bool) =
    if(fuel <= 0)(List.reverse(log),s,crossed)else {
        let(next,(kind,id,_,_,_))=Search.advanceBound(s,priors,(limit,20000,false,7i64,1000));
        let(method,_,_,known,_,pending,_,order,requests)=next;
        let n=Option.getWithDefault(0,Search.cadence(method));
        let over=crossed or (n > 0 and requests > 0 and Search.completed(known,order)+unique(pending) > n*requests);
        if(kind == "Prior")drive(limit,body,reversed,fuel-1,next,(id,body)::priors,(requests,Search.completed(known,order))::log,over)
        else if(kind == "Evaluate") {
            let ids=List.map(match(k,_,_) -> k,pending) |> List.distinct;
            let ordered=if(reversed)List.reverse(ids)else ids;
            drive(limit,body,reversed,fuel-1,Search.feedback(next,List.map(k -> (k,reward(k)),ordered)),priors,log,over)
        } else (List.reverse(log),next,over)
    }

def trial(method: String, body: String, reversed: Bool): (List[(Int32,Int32)],Search.State,Bool) =
    drive(60,body,reversed,4000,Search.initial(method,11i64,Nil),Nil,Nil,false)

def trialTo(limit: Int32, method: String): (List[(Int32,Int32)],Search.State,Bool) =
    drive(limit,valid(),false,8000,Search.initial(method,11i64,Nil),Nil,Nil,false)

@Test
def cadenceParsesOnlyFamilyMethods(): Unit \ Assert = {
    Assert.assertEq(expected=Some(10),Search.cadence("jev-family-10"));
    Assert.assertEq(expected=Some(32),Search.cadence("jev-family-32"));
    Assert.assertEq(expected=Some(100),Search.cadence("jev-family-100"));
    Assert.assertEq(expected=None,Search.cadence("uniform-puct"));
    Assert.assertEq(expected=None,Search.cadence("jev-puct"))
}

@Test
def refreshesExactlyAtEachBoundary(): Unit \ Assert = {
    let(log10,s10,crossed10)=trial("jev-family-10",valid(),false);
    let(log32,_,crossed32)=trial("jev-family-32",valid(),false);
    Assert.assertEq(expected=false,crossed10);
    Assert.assertEq(expected=false,crossed32);
    Assert.assertEq(expected=true,List.length(log10) >= 4);
    Assert.assertEq(expected=true,List.forAll(match(epoch,done) -> done == 10*epoch,log10));
    Assert.assertEq(expected=List#{(0,0),(1,32)},List.take(2,log32));
    let(epochs,at,usable)=Search.guidance(s10);
    Assert.assertEq(expected=(List.length(log10),true),(epochs,usable));
    Assert.assertEq(expected=true,at == 10*(epochs-1))
}

@Test
def failedPanelsAreNotCompletedPrograms(): Unit \ Assert = {
    let(_,s,_)=trial("jev-family-10",valid(),false);
    let(_,_,_,known,_,_,_,order,_)=s;
    let failures=List.count(id -> Map.get(id,known) == Some(-4.0f64),order);
    Assert.assertEq(expected=true,failures > 0);
    Assert.assertEq(expected=List.length(order)-failures,Search.completed(known,order))
}

@Test
def uniformControlNeverRequestsGuidance(): Unit \ Assert = {
    let(log,s,_)=trial("uniform-puct",valid(),false);
    Assert.assertEq(expected=Nil,log);
    Assert.assertEq(expected=(0,0,false),Search.guidance(s))
}

@Test
def failedGuidanceFallsBackToUniform(): Unit \ Assert = {
    let(log,s,crossed)=trial("jev-family-10","{\"error\":\"BudgetExhausted\"}",false);
    Assert.assertEq(expected=false,crossed);
    Assert.assertEq(expected=true,List.forAll(match(epoch,done) -> done == 10*epoch,log));
    let(_,_,usable)=Search.guidance(s);
    Assert.assertEq(expected=false,usable);
    let legal=List#{"STOP","add:001","add:002","remove:000"};
    Assert.assertEq(expected=Attune.Decisions.uniform(legal),Search.familyPriors(legal,Map.empty()))
}

@Test
def familyMassMapsOntoLegalActions(): Unit \ Assert = {
    let guidance=Map#{"STOP" => 0.2f64, "add" => 0.4f64, "remove" => 0.2f64, "identify" => 0.2f64};
    // identify is absent from this menu: its mass is renormalized over present families.
    let legal=List#{"STOP","add:a","add:b","remove:c"};
    let p=Search.familyPriors(legal,guidance);
    let total=List.foldLeft((s,a) -> s+Map.getWithDefault(a,0.0f64,p),0.0f64,legal);
    Assert.assertEq(expected=true,Float64.abs(total-1.0f64) < 0.000001f64);
    Assert.assertEq(expected=List.toSet(legal),Map.keysOf(p));
    Assert.assertEq(expected=Map.get("add:a",p),Map.get("add:b",p));
    // 0.8 * (0.4/0.8)/2 + 0.2/4 = 0.25 ; 0.8 * (0.2/0.8) + 0.05 = 0.25
    Assert.assertEq(expected=true,Float64.abs(Map.getWithDefault("add:a",0.0f64,p)-0.25f64) < 0.000001f64);
    Assert.assertEq(expected=true,Float64.abs(Map.getWithDefault("STOP",0.0f64,p)-0.25f64) < 0.000001f64);
    Assert.assertEq(expected="second-target",Search.family("second-target:001;103"));
    Assert.assertEq(expected="",Search.family("ROOT-control"))
}

@Test
def replayAndOutOfOrderCompletionAreDeterministic(): Unit \ Assert = {
    let(a,sa,_)=trial("jev-family-10",valid(),false);
    let(b,sb,_)=trial("jev-family-10",valid(),false);
    Assert.assertEq(expected=a,b);
    Assert.assertEq(expected=true,sa == sb);
    // Feedback released in reverse completion order reaches the same boundaries.
    let(c,_,_)=trial("jev-family-10",valid(),true);
    Assert.assertEq(expected=true,List.forAll(match(epoch,done) -> done == 10*epoch,c))
}

@Test
def foreignResultsDoNotTeachABranch(): Unit \ Assert = {
    let(_,s,_)=trial("jev-family-32",valid(),false);
    // A result computed for another arm is not in this branch's pending set.
    let after=Search.feedback(s,List#{("999;999",1.0f64)});
    Assert.assertEq(expected=true,after == s)
}

@Test
def campaignLedgerNeverExceedsTenDollars(): Unit \ Assert = {
    def fill(ledger: Budget.Ledger, n: Int32): (Budget.Ledger,Int32) = match Budget.reserveCadence(ledger) {
        case Ok(next) => fill(next,n+1)
        case Err(_) => (ledger,n)
    };
    let((committed,attempts),granted)=fill((0,0),0);
    Assert.assertEq(expected=true,committed <= Budget.cadenceCapMicros());
    Assert.assertEq(expected=3000,granted);
    Assert.assertEq(expected=3000,attempts);
    // Near the cap, a reservation that could overrun is refused outright.
    Assert.assertEq(expected=true,Result.isErr(Budget.reserveCadence((Budget.cadenceCapMicros()-2687,0))));
    // Unknown charge (crash, timeout, missing usage) keeps the whole reservation.
    let reserved=(5376,2);
    Assert.assertEq(expected=reserved,Budget.releaseScale(reserved,None));
    Assert.assertEq(expected=(5376-2688+210,2),Budget.releaseScale(reserved,Some(5000)))
}

@Test
def initialOnlyMatchesHundredUntilItsFirstRefresh(): Unit \ Assert = {
    let(log0,s0,crossed0)=trialTo(140,"jev-family-0");
    let(log100,s100,_)=trialTo(140,"jev-family-100");
    Assert.assertEq(expected=false,crossed0);
    Assert.assertEq(expected=List#{(0,0)},log0);
    Assert.assertEq(expected=List#{(0,0)},List.take(1,log100));
    let(_,_,_,_,_,_,_,order0,_)=s0;
    let(_,_,_,_,_,_,_,order100,_)=s100;
    // Identical prior, seed and feedback: identical revelations through the last batch before 100.
    Assert.assertEq(expected=List.take(96,order100),List.take(96,order0));
    Assert.assertEq(expected=true,List.length(order0) >= 96)
}
