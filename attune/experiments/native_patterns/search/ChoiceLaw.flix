use Attune.Decisions
use Attune.Decisions.{Request, Choice}

@Test
def exactReplay(): Unit \ Assert = {
 let request=Request.Request("endpoint","model","recipe","payload");
 Assert.assertEq(expected=Ok("body"),Decisions.withSaved(() -> Choice.decide(request),List#{(request,"body")}));
 Assert.assertEq(expected=Err("Missing native Choice replay."),Decisions.withSaved(() -> Choice.decide(Request.Request("endpoint","model","recipe","changed")),List#{(request,"body")}));
 Assert.assertEq(expected=Err("Conflicting native Choice replay."),Decisions.withSaved(() -> Choice.decide(request),List#{(request,"body"),(request,"other")}))
}
@Test
def completeProbabilityMap(): Unit \ Assert = {
 let legal=List#{"a","b"};
 Assert.assertEq(expected=true,Decisions.validDistribution(legal,Map#{"a"=>0.5f64,"b"=>0.5f64}));
 Assert.assertEq(expected=false,Decisions.validDistribution(legal,Map#{"a"=>1.0f64}));
 Assert.assertEq(expected=false,Decisions.validDistribution(legal,Map#{"a"=>1.1f64,"b"=> -0.1f64}));
 Assert.assertEq(expected=Map#{"a"=>0.9f64,"b"=>0.1f64},Decisions.smoothed(legal,Map#{"a"=>1.0f64,"b"=>0.0f64}));
 Assert.assertEq(expected=Ok(("resolved",Map#{"a"=>0.5f64,"b"=>0.5f64},0.7f64)),Decisions.decode("{\"model\":\"resolved\",\"answers\":{\"prior\":{\"type\":\"choice\",\"probabilities\":{\"a\":0.5,\"b\":0.5},\"confidence\":0.7}}}",legal))
}

@Test
def conservativeBudget(): Unit \ Assert = {
 Assert.assertEq(expected=Ok((2688,1)),Budget.reserve((0,0)));
 Assert.assertEq(expected=Err("Jev budget exhausted."),Budget.reserve((0,800)));
 Assert.assertEq(expected=Err("Jev budget exhausted."),Budget.reserve((3000000,0)));
 Assert.assertEq(expected=(2688,1),Budget.reconcile((0,0),(2688,1),None));
 Assert.assertEq(expected=(84,1),Budget.reconcile((0,0),(2688,1),Some(2000)));
 Assert.assertEq(expected=Ok((2150400,800)),Budget.reserve((2147712,799)))
}
